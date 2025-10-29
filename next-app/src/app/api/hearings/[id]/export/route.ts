/**
 * GET /api/hearings/[id]/export
 * ヒアリング回答データをExcel形式でエクスポート
 * 
 * グローバルルール準拠:
 * - サーバーサイドのみで実行
 * - Prismaトランザクション
 * - 型安全なデータ処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  try {
    const { id: hearingId } = params

    // ヒアリング情報を取得
    let hearing
    try {
      hearing = await prisma.hearings.findUnique({
        where: { id: hearingId },
        include: {
          organizations: { select: { name: true } },
          hearing_targets: {
            include: {
              collectors: { select: { company_name: true } },
              hearing_responses: {
                orderBy: { target_date: 'asc' },
              },
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/export] Prisma検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(hearing.org_id)) {
      return NextResponse.json({ error: 'このヒアリングにアクセスする権限がありません' }, { status: 403 });
    }

    // Excelワークブック作成
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BABA Waste Management System'
    workbook.created = new Date()

    // ============================================================================
    // シート1: サマリー
    // ============================================================================
    const summarySheet = workbook.addWorksheet('サマリー')

    // ヘッダー設定
    summarySheet.getRow(1).font = { bold: true, size: 14 }
    summarySheet.getRow(1).height = 25

    // タイトル
    summarySheet.getCell('A1').value = 'ヒアリング回答集計'
    summarySheet.mergeCells('A1:D1')

    // 基本情報
    summarySheet.getCell('A3').value = 'ヒアリング名'
    summarySheet.getCell('B3').value = hearing.title
    summarySheet.getCell('A4').value = '組織'
    summarySheet.getCell('B4').value = hearing.organizations.name
    summarySheet.getCell('A5').value = '対象期間'
    summarySheet.getCell('B5').value = `${hearing.target_period_from.toLocaleDateString('ja-JP')} ～ ${hearing.target_period_to.toLocaleDateString('ja-JP')}`
    summarySheet.getCell('A6').value = '回答期限'
    summarySheet.getCell('B6').value = hearing.response_deadline.toLocaleDateString('ja-JP')
    summarySheet.getCell('A7').value = 'ステータス'
    summarySheet.getCell('B7').value = hearing.status

    // 集計
    const totalTargets = hearing.hearing_targets.length
    const respondedTargets = hearing.hearing_targets.filter(
      (t) => t.response_status === 'RESPONDED'
    ).length
    const responseRate =
      totalTargets > 0 ? ((respondedTargets / totalTargets) * 100).toFixed(1) : '0.0'

    summarySheet.getCell('A9').value = '総ターゲット数'
    summarySheet.getCell('B9').value = totalTargets
    summarySheet.getCell('A10').value = '回答済み'
    summarySheet.getCell('B10').value = respondedTargets
    summarySheet.getCell('A11').value = '回答率'
    summarySheet.getCell('B11').value = `${responseRate}%`

    // カラム幅調整
    summarySheet.getColumn('A').width = 20
    summarySheet.getColumn('B').width = 40

    // ============================================================================
    // シート2: 回答詳細
    // ============================================================================
    const detailSheet = workbook.addWorksheet('回答詳細')

    // ヘッダー行
    const headerRow = detailSheet.addRow([
      '業者名',
      '企業名',
      '店舗名',
      '品目名',
      '回答ステータス',
      '回答日時',
      '対象日',
      '回収可否',
    ])

    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    // データ行
    for (const target of hearing.hearing_targets) {
      if (target.hearing_responses.length === 0) {
        // 未回答の場合
        detailSheet.addRow([
          target.collectors.company_name,
          target.company_name,
          target.store_name,
          target.item_name,
          target.response_status,
          target.responded_at?.toLocaleString('ja-JP') || '-',
          '-',
          '-',
        ])
      } else {
        // 回答がある場合、日付ごとに行を追加
        for (const response of target.hearing_responses) {
          detailSheet.addRow([
            target.collectors.company_name,
            target.company_name,
            target.store_name,
            target.item_name,
            target.response_status,
            target.responded_at?.toLocaleString('ja-JP') || '-',
            response.target_date.toLocaleDateString('ja-JP'),
            response.is_available ? '○' : '×',
          ])
        }
      }
    }

    // カラム幅自動調整
    detailSheet.columns = [
      { width: 25 }, // 業者名
      { width: 20 }, // 企業名
      { width: 30 }, // 店舗名
      { width: 20 }, // 品目名
      { width: 15 }, // ステータス
      { width: 20 }, // 回答日時
      { width: 15 }, // 対象日
      { width: 12 }, // 可否
    ]

    // ============================================================================
    // シート3: 業者別集計
    // ============================================================================
    const collectorSheet = workbook.addWorksheet('業者別集計')

    // ヘッダー行
    const collectorHeaderRow = collectorSheet.addRow([
      '業者名',
      '総ターゲット数',
      '回答済み',
      '未回答',
      'ロック済み',
      '回答率',
    ])

    collectorHeaderRow.font = { bold: true }
    collectorHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    // 業者ごとに集計
    const collectorMap = new Map<
      string,
      {
        name: string
        total: number
        responded: number
        notResponded: number
        locked: number
      }
    >()

    for (const target of hearing.hearing_targets) {
      const collectorId = target.collector_id
      const collectorName = target.collectors.company_name

      if (!collectorMap.has(collectorId)) {
        collectorMap.set(collectorId, {
          name: collectorName,
          total: 0,
          responded: 0,
          notResponded: 0,
          locked: 0,
        })
      }

      const summary = collectorMap.get(collectorId)!
      summary.total++

      if (target.response_status === 'RESPONDED') summary.responded++
      else if (target.response_status === 'NOT_RESPONDED') summary.notResponded++
      else if (target.response_status === 'LOCKED') summary.locked++
    }

    // データ行追加
    for (const summary of collectorMap.values()) {
      const responseRate =
        summary.total > 0 ? ((summary.responded / summary.total) * 100).toFixed(1) : '0.0'

      collectorSheet.addRow([
        summary.name,
        summary.total,
        summary.responded,
        summary.notResponded,
        summary.locked,
        `${responseRate}%`,
      ])
    }

    // カラム幅調整
    collectorSheet.columns = [
      { width: 25 }, // 業者名
      { width: 15 }, // 総数
      { width: 12 }, // 回答済み
      { width: 12 }, // 未回答
      { width: 12 }, // ロック済み
      { width: 12 }, // 回答率
    ]

    // ============================================================================
    // Excel出力
    // ============================================================================
    const buffer = await workbook.xlsx.writeBuffer()

    const filename = `hearing_${hearing.id}_${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Failed to export hearing data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

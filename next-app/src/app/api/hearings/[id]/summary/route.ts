/**
 * GET /api/hearings/[id]/summary
 * ヒアリングの回答状況サマリーを取得
 * 
 * グローバルルール準拠:
 * - Prismaトランザクション
 * - 型安全な集計処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

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
          organizations: {
            select: { name: true },
          },
        },
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/summary] Prismaヒアリング検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (!hearing) {
      return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
    }

    // 権限チェック
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(hearing.org_id)) {
      return NextResponse.json({ error: 'このヒアリングにアクセスする権限がありません' }, { status: 403 });
    }

    // ターゲット情報を取得
    let targets
    try {
      targets = await prisma.hearing_targets.findMany({
        where: { hearing_id: hearingId },
        include: {
          collectors: {
            select: {
              company_name: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[GET /api/hearings/[id]/summary] Prismaターゲット検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    // 全体サマリー
    const totalTargets = targets.length
    const respondedTargets = targets.filter((t) => t.response_status === 'RESPONDED').length
    const lockedTargets = targets.filter((t) => t.response_status === 'LOCKED').length
    const notRespondedTargets = targets.filter((t) => t.response_status === 'NOT_RESPONDED')
      .length

    const responseRate =
      totalTargets > 0 ? ((respondedTargets / totalTargets) * 100).toFixed(1) : '0.0'

    // 業者別サマリー
    const collectorSummary = targets.reduce(
      (acc, target) => {
        const collectorId = target.collector_id
        const collectorName = target.collectors.company_name

        if (!acc[collectorId]) {
          acc[collectorId] = {
            collectorId,
            collectorName,
            total: 0,
            responded: 0,
            notResponded: 0,
            locked: 0,
            responseRate: '0.0',
          }
        }

        acc[collectorId].total++
        if (target.response_status === 'RESPONDED') {
          acc[collectorId].responded++
        } else if (target.response_status === 'NOT_RESPONDED') {
          acc[collectorId].notResponded++
        } else if (target.response_status === 'LOCKED') {
          acc[collectorId].locked++
        }

        return acc
      },
      {} as Record<
        string,
        {
          collectorId: string
          collectorName: string
          total: number
          responded: number
          notResponded: number
          locked: number
          responseRate: string
        }
      >
    )

    // 業者別回答率を計算
    Object.values(collectorSummary).forEach((summary) => {
      summary.responseRate =
        summary.total > 0 ? ((summary.responded / summary.total) * 100).toFixed(1) : '0.0'
    })

    // 店舗別サマリー（外部店舗 + 内部店舗）
    const storeSummary = targets.reduce(
      (acc, target) => {
        const storeName = target.store_name

        if (!acc[storeName]) {
          acc[storeName] = {
            storeName,
            companyName: target.company_name,
            total: 0,
            responded: 0,
            notResponded: 0,
            locked: 0,
            responseRate: '0.0',
          }
        }

        acc[storeName].total++
        if (target.response_status === 'RESPONDED') {
          acc[storeName].responded++
        } else if (target.response_status === 'NOT_RESPONDED') {
          acc[storeName].notResponded++
        } else if (target.response_status === 'LOCKED') {
          acc[storeName].locked++
        }

        return acc
      },
      {} as Record<
        string,
        {
          storeName: string
          companyName: string
          total: number
          responded: number
          notResponded: number
          locked: number
          responseRate: string
        }
      >
    )

    // 店舗別回答率を計算
    Object.values(storeSummary).forEach((summary) => {
      summary.responseRate =
        summary.total > 0 ? ((summary.responded / summary.total) * 100).toFixed(1) : '0.0'
    })

    // レスポンス
    return NextResponse.json({
      hearing: {
        id: hearing.id,
        title: hearing.title,
        description: hearing.description,
        targetPeriodFrom: hearing.target_period_from,
        targetPeriodTo: hearing.target_period_to,
        responseDeadline: hearing.response_deadline,
        status: hearing.status,
        orgName: hearing.organizations.name,
      },
      summary: {
        total: totalTargets,
        responded: respondedTargets,
        notResponded: notRespondedTargets,
        locked: lockedTargets,
        responseRate: `${responseRate}%`,
      },
      collectorSummary: Object.values(collectorSummary).sort(
        (a, b) => parseFloat(b.responseRate) - parseFloat(a.responseRate)
      ),
      storeSummary: Object.values(storeSummary).sort(
        (a, b) => parseFloat(b.responseRate) - parseFloat(a.responseRate)
      ),
    })
  } catch (error) {
    console.error('Failed to get hearing summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

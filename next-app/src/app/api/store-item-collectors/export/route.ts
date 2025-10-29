import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import ExcelJS from 'exceljs'

/**
 * 店舗×品目×業者マトリクス - 登録済みデータエクスポート
 * 
 * 機能:
 * - 現在の設定をExcelにエクスポート
 * - 編集・再インポート可能な形式
 * - 廃棄品目列にドロップダウンリストを設定
 * - 品目コード列はVLOOKUP関数で自動入力
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 1. 登録済みデータ取得
    let items;
    try {
      items = await prisma.store_item_collectors.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
        },
        include: {
          stores: { select: { store_code: true, name: true } },
          collectors: { select: { company_name: true } },
        },
        orderBy: [
          { stores: { store_code: 'asc' } },
          { item_name: 'asc' },
          { priority: 'asc' },
        ],
      });
    } catch (dbError) {
      console.error('[Export Current] Database error - items fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 2. マトリクス形式に変換
    const matrix: Record<string, any> = {}

    for (const item of items) {
      const key = `${item.store_id}_${item.item_name}`
      if (!matrix[key]) {
        matrix[key] = {
          店舗コード: item.stores.store_code,
          店舗名: item.stores.name,
          廃棄品目: item.item_name,
          品目コード: item.item_code || '',
          業者1: '',
          業者2: '',
          業者3: '',
          業者4: '',
          業者5: '',
          業者6: '',
          業者7: '',
          業者8: '',
          業者9: '',
          業者10: '',
        }
      }
      matrix[key][`業者${item.priority}`] = item.collectors.company_name
    }

    // 3. 品目マスター取得
    let itemMaps;
    try {
      itemMaps = await prisma.item_maps.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
        },
        orderBy: { item_label: 'asc' },
        select: {
          item_label: true,
          jwnet_code: true,
        },
      });
    } catch (dbError) {
      console.error('[Export Current] Database error - item_maps fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 4. 業者マスター取得
    let collectors;
    try {
      collectors = await prisma.collectors.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
        },
        orderBy: { company_name: 'asc' },
        select: {
          company_name: true,
          phone: true,
          email: true,
          contact_person: true,
        },
      });
    } catch (dbError) {
      console.error('[Export Current] Database error - collectors fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 5. Excelワークブック作成
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BABAICHI 廃棄物管理システム'
    workbook.created = new Date()

    // ===================
    // シート1: 登録済みデータ
    // ===================
    const dataSheet = workbook.addWorksheet('登録済みデータ', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    })

    const headers = [
      '店舗コード',
      '店舗名',
      '廃棄品目',
      '品目コード',
      '業者1',
      '業者2',
      '業者3',
      '業者4',
      '業者5',
      '業者6',
      '業者7',
      '業者8',
      '業者9',
      '業者10',
    ]
    dataSheet.addRow(headers)

    const headerRow = dataSheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 20

    dataSheet.columns = [
      { width: 15 },
      { width: 25 },
      { width: 20 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
    ]

    // データ追加
    Object.values(matrix).forEach((row: any) => {
      dataSheet.addRow([
        row.店舗コード,
        row.店舗名,
        row.廃棄品目,
        row.品目コード,
        row.業者1,
        row.業者2,
        row.業者3,
        row.業者4,
        row.業者5,
        row.業者6,
        row.業者7,
        row.業者8,
        row.業者9,
        row.業者10,
      ])
    })

    // データの入力規則: 廃棄品目列にドロップダウン（範囲参照）
    if (itemMaps.length > 0) {
      for (let i = 2; i <= Object.keys(matrix).length + 1; i++) {
        const cell = dataSheet.getCell(`C${i}`)
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`品目マスター!$A$2:$A$${itemMaps.length + 1}`], // 範囲参照に変更
          showErrorMessage: true,
          errorTitle: '入力エラー',
          error: '品目マスターから選択してください',
        }
      }
    }

    // VLOOKUP関数: 品目コード列
    for (let i = 2; i <= Object.keys(matrix).length + 1; i++) {
      const cell = dataSheet.getCell(`D${i}`)
      const existingValue = typeof cell.value === 'string' ? cell.value : ''
      cell.value = {
        formula: `IFERROR(VLOOKUP(C${i},品目マスター!$A$2:$B$${itemMaps.length + 1},2,FALSE),"")`,
        result: existingValue,
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      }
    }

    // 業者列にドロップダウン（範囲参照）
    if (collectors.length > 0) {
      for (let i = 2; i <= Object.keys(matrix).length + 1; i++) {
        for (let col = 5; col <= 14; col++) {
          const cell = dataSheet.getCell(i, col)
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`業者マスター!$A$2:$A$${collectors.length + 1}`], // 範囲参照に変更
            showErrorMessage: true,
            errorTitle: '入力エラー',
            error: '業者マスターから選択してください',
          }
        }
      }
    }

    // ===================
    // シート2: 品目マスター
    // ===================
    const itemSheet = workbook.addWorksheet('品目マスター', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    })

    itemSheet.addRow(['廃棄品目', '品目コード'])
    const itemHeaderRow = itemSheet.getRow(1)
    itemHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    itemHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    }
    itemHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }
    itemHeaderRow.height = 20

    itemSheet.columns = [{ width: 25 }, { width: 15 }]

    itemMaps.forEach((item) => {
      itemSheet.addRow([item.item_label, item.jwnet_code || ''])
    })

    // ===================
    // シート3: 業者マスター
    // ===================
    const collectorSheet = workbook.addWorksheet('業者マスター', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    })

    collectorSheet.addRow(['業者名', '電話番号', 'メールアドレス', '担当者'])
    const collectorHeaderRow = collectorSheet.getRow(1)
    collectorHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    collectorHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' },
    }
    collectorHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' }
    collectorHeaderRow.height = 20

    collectorSheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 30 },
      { width: 15 },
    ]

    collectors.forEach((collector) => {
      collectorSheet.addRow([
        collector.company_name,
        collector.phone || '',
        collector.email || '',
        collector.contact_person || '',
      ])
    })

    // 6. Excelファイル生成
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="current_store_item_collectors_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[Export Current] エラー:', error)
    return NextResponse.json(
      {
        error: '登録済みデータのエクスポートに失敗しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}


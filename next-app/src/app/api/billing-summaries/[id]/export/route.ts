/**
 * GET /api/billing-summaries/[id]/export
 * 請求書をExcel形式でエクスポートするAPI
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. サマリーとその明細を取得
  try {
    const summary = await prisma.billing_summaries.findUnique({
      where: { id: params.id },
      include: {
        collectors: {
          select: {
            company_name: true,
            email: true,
            phone: true,
          },
        },
        organizations: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!summary) {
      return NextResponse.json({ error: 'Summary not found' }, { status: 404 })
    }

    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(summary.org_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 明細を取得
    const items = await prisma.app_billing_items.findMany({
      where: {
        org_id: summary.org_id,
        collector_id: summary.collector_id,
        billing_month: summary.billing_month,
        deleted_at: null,
      },
      include: {
        stores: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { billing_type: 'asc' },
        { item_name: 'asc' },
      ],
    })

    // 3. Excelファイル生成
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('請求明細')

    // ヘッダー情報
    worksheet.mergeCells('A1:M1')
    worksheet.getCell('A1').value = '請求書'
    worksheet.getCell('A1').font = { size: 18, bold: true }
    worksheet.getCell('A1').alignment = { horizontal: 'center' }

    worksheet.getCell('A3').value = '請求先:'
    worksheet.getCell('B3').value = summary.collectors.company_name
    worksheet.getCell('A4').value = '請求月:'
    worksheet.getCell('B4').value = new Date(summary.billing_month).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    })
    worksheet.getCell('A5').value = '発行元:'
    worksheet.getCell('B5').value = summary.organizations.name

    // テーブルヘッダー
    const headerRow = worksheet.getRow(7)
    headerRow.values = [
      '店舗名',
      '品目名',
      '品目コード',
      '請求タイプ',
      '単価',
      '数量',
      '単位',
      '金額',
      '手数料タイプ',
      '手数料率',
      '手数料額',
      '純額',
      '消費税',
      '合計金額',
    ]
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' },
    }

    // データ行
    items.forEach((item, index) => {
      const row = worksheet.getRow(8 + index)
      row.values = [
        item.stores?.name || '-',
        item.item_name,
        item.item_code || '-',
        item.billing_type,
        item.unit_price || '-',
        item.quantity || '-',
        item.unit || '-',
        item.amount,
        item.commission_type || '-',
        item.commission_rate !== null ? `${item.commission_rate.toFixed(2)}%` : '-',
        item.commission_amount || '-',
        item.net_amount || '-',
        item.tax_amount,
        item.total_amount,
      ]
    })

    // サマリー行
    const summaryRowIndex = 8 + items.length + 1
    worksheet.getCell(`A${summaryRowIndex}`).value = '合計'
    worksheet.getCell(`A${summaryRowIndex}`).font = { bold: true }
    worksheet.getCell(`H${summaryRowIndex}`).value = summary.subtotal_amount
    worksheet.getCell(`K${summaryRowIndex}`).value = summary.total_fixed_amount + summary.total_metered_amount + summary.total_other_amount - summary.subtotal_amount
    worksheet.getCell(`M${summaryRowIndex}`).value = summary.tax_amount
    worksheet.getCell(`N${summaryRowIndex}`).value = summary.total_amount
    worksheet.getCell(`N${summaryRowIndex}`).font = { bold: true, size: 14 }

    // 列幅調整
    worksheet.columns = [
      { width: 20 }, // 店舗名
      { width: 30 }, // 品目名
      { width: 15 }, // 品目コード
      { width: 12 }, // 請求タイプ
      { width: 12 }, // 単価
      { width: 10 }, // 数量
      { width: 8 },  // 単位
      { width: 15 }, // 金額
      { width: 15 }, // 手数料タイプ
      { width: 12 }, // 手数料率
      { width: 15 }, // 手数料額
      { width: 15 }, // 純額
      { width: 12 }, // 消費税
      { width: 15 }, // 合計金額
    ]

    // 4. バッファに書き込み
    const buffer = await workbook.xlsx.writeBuffer()

    // 5. レスポンス返却
    const filename = `billing_${summary.billing_month.toISOString().slice(0, 7)}_${summary.collectors.company_name}.xlsx`
      .replace(/[^a-zA-Z0-9_.-]/g, '_')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (dbError) {
    console.error('[Export API] Error:', dbError)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}



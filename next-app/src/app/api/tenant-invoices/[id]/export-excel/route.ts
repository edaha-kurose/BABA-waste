import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import dayjs from 'dayjs'

/**
 * テナント請求書をExcel出力
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 請求書データを取得
    let invoice;
    try {
      invoice = await prisma.tenant_invoices.findUnique({
        where: { id: params.id },
        include: {
          organizations: true,
          tenant_invoice_items: {
            include: {
              collectors: true,
            },
            orderBy: { display_order: 'asc' },
          },
        },
      });
    } catch (dbError) {
      console.error('[Tenant Invoice Export] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Excelワークブック作成
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('請求書')

    // ヘッダー設定
    worksheet.columns = [
      { key: 'item_type', header: '項目種別', width: 15 },
      { key: 'item_name', header: '項目名', width: 30 },
      { key: 'collector_name', header: '収集業者', width: 25 },
      { key: 'base_amount', header: '元の金額', width: 15 },
      { key: 'commission_amount', header: '手数料額', width: 15 },
      { key: 'subtotal', header: '小計', width: 15 },
      { key: 'tax_rate', header: '税率(%)', width: 10 },
      { key: 'tax_amount', header: '消費税', width: 15 },
      { key: 'total_amount', header: '合計', width: 15 },
      { key: 'notes', header: '備考', width: 30 },
    ]

    // タイトル行
    worksheet.insertRow(1, [''])
    worksheet.insertRow(1, [''])
    worksheet.insertRow(1, [
      `請求書番号: ${invoice.invoice_number}`,
    ])
    worksheet.insertRow(1, [
      `【${invoice.organizations.name}】 御中`,
    ])
    worksheet.insertRow(1, [
      `請求月: ${dayjs(invoice.billing_month).format('YYYY年MM月')}`,
    ])

    // タイトル行のスタイル
    for (let i = 1; i <= 5; i++) {
      worksheet.getRow(i).font = { bold: true, size: 14 }
      worksheet.getRow(i).alignment = { vertical: 'middle', horizontal: 'left' }
    }

    // ヘッダー行のスタイル
    const headerRow = worksheet.getRow(7)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    // データ行
    invoice.tenant_invoice_items.forEach((item) => {
      const typeMap: Record<string, string> = {
        COLLECTOR_BILLING: '収集業者請求',
        COMMISSION: '手数料',
        MANAGEMENT_FEE: '管理費',
        OTHER: 'その他',
      }

      worksheet.addRow({
        item_type: typeMap[item.item_type] || item.item_type,
        item_name: item.item_name,
        collector_name: item.collectors?.company_name || '-',
        base_amount: Number(item.base_amount),
        commission_amount: Number(item.commission_amount),
        subtotal: Number(item.subtotal),
        tax_rate: Number(item.tax_rate),
        tax_amount: Number(item.tax_amount),
        total_amount: Number(item.total_amount),
        notes: item.notes || '',
      })
    })

    // 数値セルの書式設定
    const numColumns = ['base_amount', 'commission_amount', 'subtotal', 'tax_amount', 'total_amount']
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 7) {
        numColumns.forEach((col) => {
          const cell = row.getCell(col)
          cell.numFmt = '¥#,##0'
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
        })

        const taxCell = row.getCell('tax_rate')
        taxCell.numFmt = '0.0"%"'
        taxCell.alignment = { vertical: 'middle', horizontal: 'center' }
      }
    })

    // 合計行を追加
    const summaryStartRow = worksheet.rowCount + 2

    worksheet.addRow([''])
    worksheet.addRow(['', '', '', '', '', '収集業者請求額 小計', '', '', Number(invoice.collectors_subtotal)])
    worksheet.addRow(['', '', '', '', '', '収集業者請求額 消費税', '', '', Number(invoice.collectors_tax)])
    worksheet.addRow(['', '', '', '', '', '収集業者請求額 合計', '', '', Number(invoice.collectors_total)])
    worksheet.addRow([''])
    worksheet.addRow(['', '', '', '', '', '手数料・管理費 小計', '', '', Number(invoice.commission_subtotal)])
    worksheet.addRow(['', '', '', '', '', '手数料・管理費 消費税', '', '', Number(invoice.commission_tax)])
    worksheet.addRow(['', '', '', '', '', '手数料・管理費 合計', '', '', Number(invoice.commission_total)])
    worksheet.addRow([''])
    worksheet.addRow(['', '', '', '', '', '総 小 計', '', '', Number(invoice.grand_subtotal)])
    worksheet.addRow(['', '', '', '', '', '総 消 費 税', '', '', Number(invoice.grand_tax)])
    worksheet.addRow(['', '', '', '', '', '総 合 計 (テナント請求額)', '', '', Number(invoice.grand_total)])

    // 合計行のスタイル
    for (let i = summaryStartRow; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i)
      row.font = { bold: true, size: 12 }
      row.getCell(6).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE0B2' },
      }
      row.getCell(9).numFmt = '¥#,##0'
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' }
    }

    // 最終行（総合計）を強調
    const finalRow = worksheet.getRow(worksheet.rowCount)
    finalRow.font = { bold: true, size: 14, color: { argb: 'FFFF0000' } }
    finalRow.getCell(6).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' },
    }

    // Excelバッファ生成
    const buffer = await workbook.xlsx.writeBuffer()

    // レスポンス
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tenant_invoice_${invoice.invoice_number}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('[API] Failed to export tenant invoice:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}



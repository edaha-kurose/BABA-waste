import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import ExcelJS from 'exceljs'

/**
 * 店舗×品目×業者マトリクス - テンプレートエクスポート
 * 
 * 機能:
 * - 店舗リスト（店舗コード + 店舗名）を出力
 * - 廃棄品目列にドロップダウンリストを設定
 * - 品目選択時に品目コードが自動入力（VLOOKUP関数）
 * - 業者列（1〜10列）は手入力またはドロップダウン
 * 
 * シート構成:
 * 1. テンプレート: 店舗リスト + 空白の品目・業者列
 * 2. 品目マスター: ドロップダウン用データ
 * 3. 業者マスター: 参照用データ
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 1. 店舗リスト取得
    let stores;
    try {
      stores = await prisma.stores.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
        },
        orderBy: { store_code: 'asc' },
        select: {
          id: true,
          store_code: true,
          name: true,
        },
      });
    } catch (dbError) {
      console.error('[Export Template] Database error - stores fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 2. 品目マスター取得
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
      console.error('[Export Template] Database error - item_maps fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 3. 業者マスター取得
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
      console.error('[Export Template] Database error - collectors fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 4. Excelワークブック作成
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'BABAICHI 廃棄物管理システム'
    workbook.created = new Date()

    // ===================
    // シート1: テンプレート
    // ===================
    const templateSheet = workbook.addWorksheet('テンプレート', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }], // ヘッダー行固定
    })

    // ヘッダー行
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
    templateSheet.addRow(headers)

    // ヘッダー行のスタイル
    const headerRow = templateSheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 20

    // 列幅設定
    templateSheet.columns = [
      { width: 15 }, // 店舗コード
      { width: 25 }, // 店舗名
      { width: 20 }, // 廃棄品目
      { width: 15 }, // 品目コード
      { width: 20 }, // 業者1
      { width: 20 }, // 業者2
      { width: 20 }, // 業者3
      { width: 20 }, // 業者4
      { width: 20 }, // 業者5
      { width: 20 }, // 業者6
      { width: 20 }, // 業者7
      { width: 20 }, // 業者8
      { width: 20 }, // 業者9
      { width: 20 }, // 業者10
    ]

    // 店舗データ追加（1店舗あたり3行）
    stores.forEach((store) => {
      for (let rowNum = 1; rowNum <= 3; rowNum++) {
        templateSheet.addRow([
          store.store_code,
          store.name,
          '', // 廃棄品目（ドロップダウンで選択）
          '', // 品目コード（VLOOKUP関数で自動入力）
          '', '', '', '', '', '', '', '', '', '', // 業者1〜10（空白）
        ])
      }
    })

    const totalRows = stores.length * 3 // 1店舗あたり3行

    // データの入力規則: 廃棄品目列にドロップダウン（範囲参照）
    if (itemMaps.length > 0) {
      for (let i = 2; i <= totalRows + 1; i++) {
        const cell = templateSheet.getCell(`C${i}`) // C列 = 廃棄品目
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

    // VLOOKUP関数: 品目コード列に自動入力
    for (let i = 2; i <= totalRows + 1; i++) {
      const cell = templateSheet.getCell(`D${i}`) // D列 = 品目コード
      cell.value = {
        formula: `IFERROR(VLOOKUP(C${i},品目マスター!$A$2:$B$${itemMaps.length + 1},2,FALSE),"")`,
        result: '',
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }, // グレー背景（自動入力列）
      }
    }

    // 業者列にドロップダウン（範囲参照）
    if (collectors.length > 0) {
      for (let i = 2; i <= totalRows + 1; i++) {
        for (let col = 5; col <= 14; col++) {
          // E〜N列 = 業者1〜10
          const cell = templateSheet.getCell(i, col)
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

    itemSheet.columns = [
      { width: 25 }, // 廃棄品目
      { width: 15 }, // 品目コード
    ]

    itemMaps.forEach((item) => {
      itemSheet.addRow([item.item_label, item.jwnet_code || ''])
    })

    // ===================
    // シート3: 業者マスター（50音順）
    // ===================
    const collectorSheet = workbook.addWorksheet('業者マスター', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
    })

    collectorSheet.addRow(['業者名', '電話番号', 'メールアドレス', '担当者', '読み仮名'])
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
      { width: 30 }, // 業者名
      { width: 15 }, // 電話番号
      { width: 30 }, // メールアドレス
      { width: 15 }, // 担当者
      { width: 20 }, // 読み仮名（検索用）
    ]

    // 業者は既に company_name で ASC ソート済み
    collectors.forEach((collector, index) => {
      collectorSheet.addRow([
        collector.company_name,
        collector.phone || '',
        collector.email || '',
        collector.contact_person || '',
        collector.company_name, // 読み仮名（検索用）
      ])
    })

    // ===================
    // シート4: 使い方ガイド
    // ===================
    const guideSheet = workbook.addWorksheet('使い方ガイド', {
      views: [{ state: 'normal' }],
    })

    guideSheet.columns = [{ width: 80 }]

    const guideContent = [
      { text: '📄 店舗×品目×業者マトリクス - 使い方ガイド', style: 'title' },
      { text: '', style: 'normal' },
      { text: '■ 基本的な使い方', style: 'heading' },
      {
        text: '1. 「テンプレート」シートで、店舗ごとに廃棄品目を入力します',
        style: 'normal',
      },
      {
        text: '2. 廃棄品目列（C列）はドロップダウンから選択してください',
        style: 'normal',
      },
      { text: '3. 品目コード列（D列）は自動入力されます（変更不要）', style: 'normal' },
      { text: '4. 業者列（E〜N列）は以下の方法で入力してください:', style: 'normal' },
      { text: '', style: 'normal' },
      { text: '■ 業者の入力方法（推奨）', style: 'heading' },
      { text: '【方法1】ドロップダウンから選択', style: 'subheading' },
      { text: '  - 業者列をクリック → ドロップダウンから選択', style: 'normal' },
      { text: '  - ※200社以上ある場合はスクロールが大変です', style: 'normal' },
      { text: '', style: 'normal' },
      { text: '【方法2】業者マスターから検索してコピペ（推奨）', style: 'subheading' },
      { text: '  - 「業者マスター」シートを開く', style: 'normal' },
      { text: '  - Ctrl+F で業者名を検索', style: 'normal' },
      { text: '  - 業者名をコピー → テンプレートシートに貼り付け', style: 'normal' },
      { text: '', style: 'normal' },
      { text: '■ 複数品目の登録', style: 'heading' },
      {
        text: '- 1店舗につき3行用意されています（デフォルト）',
        style: 'normal',
      },
      { text: '- 4品目以上登録する場合は、行をコピーして追加してください', style: 'normal' },
      {
        text: '- 店舗コードが同じ行は、同じ店舗として認識されます',
        style: 'normal',
      },
      { text: '', style: 'normal' },
      { text: '■ 注意事項', style: 'heading' },
      { text: '⚠️ 店舗コードと店舗名は変更しないでください', style: 'warning' },
      { text: '⚠️ 品目コード列（D列）は自動入力のため編集不要です', style: 'warning' },
      {
        text: '⚠️ 業者名は「業者マスター」シートに登録されているものを使用してください',
        style: 'warning',
      },
      { text: '', style: 'normal' },
      {
        text: '■ 完了後',
        style: 'heading',
      },
      {
        text: 'このファイルを保存して、システムの「インポート」ボタンからアップロードしてください',
        style: 'normal',
      },
    ]

    guideContent.forEach((item, index) => {
      const row = guideSheet.addRow([item.text])
      const cell = row.getCell(1)

      switch (item.style) {
        case 'title':
          cell.font = { bold: true, size: 16, color: { argb: 'FF1890FF' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F7FF' },
          }
          row.height = 30
          break
        case 'heading':
          cell.font = { bold: true, size: 14, color: { argb: 'FF262626' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' },
          }
          row.height = 25
          break
        case 'subheading':
          cell.font = { bold: true, size: 12, color: { argb: 'FF1890FF' } }
          break
        case 'warning':
          cell.font = { bold: true, size: 11, color: { argb: 'FFCF1322' } }
          break
        default:
          cell.font = { size: 11 }
          break
      }

      cell.alignment = { vertical: 'middle', wrapText: true }
    })

    // 5. Excelファイル生成
    const buffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template_store_item_collectors_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[Export Template] エラー:', error)
    return NextResponse.json(
      {
        error: 'テンプレートのエクスポートに失敗しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}


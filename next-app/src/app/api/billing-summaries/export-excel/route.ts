/**
 * 請求書 Excel 出力 API
 * 
 * POST /api/billing-summaries/export-excel
 * 
 * BABA請求書フォーマットに準拠した Excel 出力
 * ✅ 廃棄物マスターの billing_category に基づいて分類
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import ExcelJS from 'exceljs';

// バリデーションスキーマ
const ExportExcelSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  collector_id: z.string().uuid('Invalid collector ID'),
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month (YYYY-MM-01)',
  }),
});

// 請求種別とExcel列のマッピング
interface StoreBillingData {
  store_code: string;
  store_name: string;
  system_fee: number;              // F列: システム管理会社の管理手数料
  general_waste: number;           // G列: 一般廃棄物請求金額
  industrial_waste: number;        // H列: 産業廃棄物請求金額
  bottle_can: number;              // I列: 瓶・缶請求金額
  temporary_collection: number;    // J列: 臨時回収請求金額
  subtotal: number;                // K列: 小計
  tax: number;                     // L列: 消費税
  cardboard_buyback: number;       // M列: 段ボール（有価買取分 - マイナス値）
}

// POST /api/billing-summaries/export-excel - Excel出力
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = ExportExcelSchema.parse(body);

    const billingMonth = new Date(validatedData.billing_month);
    const monthStr = billingMonth.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
    });

    // ✅ 修正: 請求明細を取得（廃棄物マスター情報を含む）
    const billingItems = await prisma.billingItem.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        billing_month: billingMonth,
        status: {
          not: 'CANCELLED',
        },
        deleted_at: null,
      },
      include: {
        wasteTypeMaster: true,  // ✅ 廃棄物マスター情報を取得
      },
      orderBy: {
        store_id: 'asc',
      },
    });

    if (billingItems.length === 0) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: 'No billing items found for the specified month',
        },
        { status: 404 }
      );
    }

    // 店舗情報を取得
    const storeIds = Array.from(
      new Set(
        billingItems
          .map((item) => item.store_id)
          .filter((id): id is string => id !== null && id !== undefined)
      )
    );
    const stores = await prisma.store.findMany({
      where: {
        id: {
          in: storeIds,
        },
      },
    });

    const storeMap = new Map(stores.map((store) => [store.id, store]));

    // 店舗ごとに請求データを集計
    const storeBillingMap = new Map<string, StoreBillingData>();

    billingItems.forEach((item) => {
      const storeId = item.store_id || 'unknown';
      const store = storeMap.get(storeId);

      if (!storeBillingMap.has(storeId)) {
        storeBillingMap.set(storeId, {
          store_code: store?.store_code || 'N/A',
          store_name: store?.name || '店舗名不明',
          system_fee: 0,
          general_waste: 0,
          industrial_waste: 0,
          bottle_can: 0,
          temporary_collection: 0,
          subtotal: 0,
          tax: 0,
          cardboard_buyback: 0,
        });
      }

      const storeData = storeBillingMap.get(storeId)!;

      // ✅ 修正: 廃棄物マスターの billing_category に基づいて振り分け
      const billingCategory = item.wasteTypeMaster?.billing_category || 'OTHER';

      switch (billingCategory) {
        case 'F':
          // F列: システム管理会社の管理手数料
          storeData.system_fee += item.amount;
          break;
        case 'G':
          // G列: 一般廃棄物請求金額
          storeData.general_waste += item.amount;
          break;
        case 'H':
          // H列: 産業廃棄物請求金額
          storeData.industrial_waste += item.amount;
          break;
        case 'I':
          // I列: 瓶・缶請求金額
          storeData.bottle_can += item.amount;
          break;
        case 'J':
          // J列: 臨時回収請求金額（実績回収分）
          storeData.temporary_collection += item.amount;
          break;
        case 'M':
          // M列: 段ボール（有価買取分）- マイナス値
          storeData.cardboard_buyback += Math.abs(item.amount) * -1;
          break;
        case 'OTHER':
        default:
          // その他は F列（システム手数料）に含める
          storeData.system_fee += item.amount;
          break;
      }

      storeData.tax += item.tax_amount;
    });

    // 各店舗の小計を計算
    storeBillingMap.forEach((storeData) => {
      storeData.subtotal =
        storeData.system_fee +
        storeData.general_waste +
        storeData.industrial_waste +
        storeData.bottle_can +
        storeData.temporary_collection;
    });

    // Excel ワークブック作成
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('請求書');

    // ヘッダー行（1行目）
    worksheet.addRow([
      '', '', '', // A, B, C列（不要）
      '店舗コード',                        // D
      '店舗名',                            // E
      'システム管理会社の管理手数料',      // F
      '一般廃棄物請求金額（月額固定請求分）', // G
      '産業廃棄物請求金額',                // H
      '瓶・缶請求金額',                    // I
      '臨時回収請求金額（実績回収分）',    // J
      '小計',                              // K
      '消費税',                            // L
      '段ボール（有価買取分）',            // M
      '小計総額',                          // N
      '消費税総額',                        // O
      '差し引き計',                        // P
      '最終消費税',                        // Q
      '最終差し引き合計',                  // R
    ]);

    // ヘッダー行のスタイル設定
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // 店舗ごとのデータ行を追加
    let totalSubtotal = 0;
    let totalTax = 0;
    let totalCardboardBuyback = 0;

    const storesArray = Array.from(storeBillingMap.values()).sort((a, b) =>
      a.store_code.localeCompare(b.store_code)
    );

    storesArray.forEach((storeData) => {
      const subtotalBeforeBuyback = storeData.subtotal;
      const netAmount = subtotalBeforeBuyback + storeData.cardboard_buyback; // 段ボールはマイナス値
      const finalTax = storeData.tax;
      const finalTotal = netAmount + finalTax;

      totalSubtotal += subtotalBeforeBuyback;
      totalTax += storeData.tax;
      totalCardboardBuyback += storeData.cardboard_buyback;

      worksheet.addRow([
        '', '', '', // A, B, C列（不要）
        storeData.store_code,                  // D
        storeData.store_name,                  // E
        storeData.system_fee,                  // F
        storeData.general_waste,               // G
        storeData.industrial_waste,            // H
        storeData.bottle_can,                  // I
        storeData.temporary_collection,        // J
        subtotalBeforeBuyback,                 // K
        storeData.tax,                         // L
        storeData.cardboard_buyback,           // M
        '', // N (後で計算)
        '', // O (後で計算)
        netAmount,                             // P = K - M
        finalTax,                              // Q
        finalTotal,                            // R
      ]);
    });

    // 合計行を追加
    const totalNetAmount = totalSubtotal + totalCardboardBuyback;
    const finalTotalTax = totalTax;
    const grandTotal = totalNetAmount + finalTotalTax;

    worksheet.addRow([
      '', '', '', // A, B, C列
      '合計', // D
      '', '', '', '', '', '', // E-J
      totalSubtotal, // K
      totalTax, // L
      totalCardboardBuyback, // M
      totalSubtotal, // N
      totalTax, // O
      totalNetAmount, // P
      finalTotalTax, // Q
      grandTotal, // R
    ]);

    // 合計行のスタイル設定
    const totalRow = worksheet.lastRow;
    if (totalRow) {
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    }

    // 列幅の設定
    worksheet.getColumn('D').width = 15; // 店舗コード
    worksheet.getColumn('E').width = 30; // 店舗名
    worksheet.getColumn('F').width = 20; // システム管理手数料
    worksheet.getColumn('G').width = 25; // 一般廃棄物
    worksheet.getColumn('H').width = 20; // 産業廃棄物
    worksheet.getColumn('I').width = 15; // 瓶・缶
    worksheet.getColumn('J').width = 25; // 臨時回収
    worksheet.getColumn('K').width = 15; // 小計
    worksheet.getColumn('L').width = 15; // 消費税
    worksheet.getColumn('M').width = 20; // 段ボール
    worksheet.getColumn('N').width = 15; // 小計総額
    worksheet.getColumn('O').width = 15; // 消費税総額
    worksheet.getColumn('P').width = 15; // 差し引き計
    worksheet.getColumn('Q').width = 15; // 最終消費税
    worksheet.getColumn('R').width = 20; // 最終合計

    // 数値列の書式設定
    ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'].forEach((col) => {
      worksheet.getColumn(col).numFmt = '¥#,##0';
    });

    // Excel ファイルをバッファに書き込み
    const buffer = await workbook.xlsx.writeBuffer();

    // ファイル名生成
    const fileName = `請求書_${monthStr}.xlsx`;

    // レスポンスヘッダー設定
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Billing Export Excel] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


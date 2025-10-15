/**
 * 請求サマリー API（月次集計）
 * 
 * GET  /api/billing-summaries - 一覧取得
 * POST /api/billing-summaries/calculate - 請求サマリーを計算・更新
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ
const BillingSummaryCalculateSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  collector_id: z.string().uuid('Invalid collector ID'),
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month (YYYY-MM-01)',
  }),
  created_by: z.string().uuid().optional(),
});

// GET /api/billing-summaries - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const collector_id = searchParams.get('collector_id');
    const billing_month = searchParams.get('billing_month');
    const status = searchParams.get('status');

    // フィルター条件構築
    const where: any = {};

    if (org_id) {
      where.org_id = org_id;
    }

    if (collector_id) {
      where.collector_id = collector_id;
    }

    if (billing_month) {
      where.billing_month = new Date(billing_month);
    }

    if (status) {
      where.status = status;
    }

    const billingSummaries = await prisma.billingSummary.findMany({
      where,
      orderBy: {
        billing_month: 'desc',
      },
    });

    return NextResponse.json(billingSummaries, { status: 200 });
  } catch (error) {
    console.error('[Billing Summaries] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/billing-summaries/calculate - 請求サマリーを計算・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = BillingSummaryCalculateSchema.parse(body);

    const billingMonth = new Date(validatedData.billing_month);

    // 指定された org_id, collector_id, billing_month の請求明細を集計
    const billingItems = await prisma.billingItem.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        billing_month: billingMonth,
        status: {
          not: 'CANCELLED', // キャンセルされた明細は除外
        },
      },
    });

    if (billingItems.length === 0) {
      return NextResponse.json(
        {
          message: 'No billing items found for the specified month',
          summary: null,
        },
        { status: 404 }
      );
    }

    // 請求種別ごとに集計
    let total_fixed_amount = 0;
    let total_metered_amount = 0;
    let total_other_amount = 0;
    let fixed_items_count = 0;
    let metered_items_count = 0;
    let other_items_count = 0;

    billingItems.forEach((item) => {
      switch (item.billing_type) {
        case 'FIXED':
          total_fixed_amount += item.amount;
          fixed_items_count++;
          break;
        case 'METERED':
          total_metered_amount += item.amount;
          metered_items_count++;
          break;
        case 'OTHER':
          total_other_amount += item.amount;
          other_items_count++;
          break;
      }
    });

    const subtotal_amount = total_fixed_amount + total_metered_amount + total_other_amount;
    
    // 税額を計算（全明細の tax_amount を合計）
    const tax_amount = billingItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const total_amount = subtotal_amount + tax_amount;

    // 既存のサマリーをチェック
    const existingSummary = await prisma.billingSummary.findUnique({
      where: {
        unique_billing_summary: {
          org_id: validatedData.org_id,
          collector_id: validatedData.collector_id,
          billing_month: billingMonth,
        },
      },
    });

    let summary;

    if (existingSummary) {
      // 既存のサマリーを更新
      summary = await prisma.billingSummary.update({
        where: {
          id: existingSummary.id,
        },
        data: {
          total_fixed_amount,
          total_metered_amount,
          total_other_amount,
          subtotal_amount,
          tax_amount,
          total_amount,
          total_items_count: billingItems.length,
          fixed_items_count,
          metered_items_count,
          other_items_count,
          updated_by: validatedData.created_by,
        },
      });
    } else {
      // 新規作成
      summary = await prisma.billingSummary.create({
        data: {
          org_id: validatedData.org_id,
          collector_id: validatedData.collector_id,
          billing_month: billingMonth,
          total_fixed_amount,
          total_metered_amount,
          total_other_amount,
          subtotal_amount,
          tax_amount,
          total_amount,
          total_items_count: billingItems.length,
          fixed_items_count,
          metered_items_count,
          other_items_count,
          status: 'DRAFT',
          created_by: validatedData.created_by,
          updated_by: validatedData.created_by,
        },
      });
    }

    return NextResponse.json(
      {
        message: existingSummary
          ? 'Billing summary updated successfully'
          : 'Billing summary created successfully',
        summary,
        billing_items_count: billingItems.length,
      },
      { status: existingSummary ? 200 : 201 }
    );
  } catch (error) {
    console.error('[Billing Summaries] Calculate error:', error);

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


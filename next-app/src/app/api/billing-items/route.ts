/**
 * 請求明細 API（Collection ベース）
 * 
 * GET  /api/billing-items - 一覧取得
 * POST /api/billing-items - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// 請求種別
enum BillingType {
  FIXED = 'FIXED',       // 固定金額
  METERED = 'METERED',   // 従量請求
  OTHER = 'OTHER',       // その他費用
}

// 請求ステータス
enum BillingStatus {
  DRAFT = 'DRAFT',           // 下書き
  SUBMITTED = 'SUBMITTED',   // 提出済み
  APPROVED = 'APPROVED',     // 承認済み
  PAID = 'PAID',             // 入金済み
  CANCELLED = 'CANCELLED',   // キャンセル
}

// バリデーションスキーマ
const BillingItemCreateSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  collector_id: z.string().uuid('Invalid collector ID'),
  store_id: z.string().uuid().optional().nullable(),
  collection_id: z.string().uuid().optional().nullable(),
  
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month',
  }),
  billing_period_from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_period_from',
  }),
  billing_period_to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_period_to',
  }),
  
  billing_type: z.enum([BillingType.FIXED, BillingType.METERED, BillingType.OTHER]),
  
  item_name: z.string().min(1).max(255),
  item_code: z.string().max(50).optional().nullable(),
  waste_type_id: z.string().uuid().optional().nullable(),
  
  unit_price: z.number().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unit: z.string().max(10).optional().nullable(),
  amount: z.number().nonnegative('Amount must be non-negative'),
  tax_rate: z.number().default(0.10),
  
  jwnet_registration_id: z.string().max(255).optional().nullable(),
  jwnet_manifest_no: z.string().max(50).optional().nullable(),
  
  status: z.enum([
    BillingStatus.DRAFT,
    BillingStatus.SUBMITTED,
    BillingStatus.APPROVED,
    BillingStatus.PAID,
    BillingStatus.CANCELLED,
  ]).default(BillingStatus.DRAFT),
  
  notes: z.string().optional().nullable(),
  created_by: z.string().uuid().optional(),
});

// GET /api/billing-items - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const collector_id = searchParams.get('collector_id');
    const store_id = searchParams.get('store_id');
    const billing_month = searchParams.get('billing_month');
    const billing_type = searchParams.get('billing_type');
    const status = searchParams.get('status');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    // フィルター条件構築
    const where: any = {};

    if (org_id) {
      where.org_id = org_id;
    }

    if (collector_id) {
      where.collector_id = collector_id;
    }

    if (store_id) {
      where.store_id = store_id;
    }

    if (billing_month) {
      where.billing_month = new Date(billing_month);
    }

    if (billing_type) {
      where.billing_type = billing_type;
    }

    if (status) {
      where.status = status;
    }

    if (from_date && to_date) {
      where.billing_period_from = {
        gte: new Date(from_date),
      };
      where.billing_period_to = {
        lte: new Date(to_date),
      };
    }

    // 論理削除されていないレコードのみ取得
    where.deleted_at = null;

    const billingItems = await prisma.billingItem.findMany({
      where,
      orderBy: {
        billing_month: 'desc',
      },
    });

    // 税額・合計額を計算
    const itemsWithCalculations = billingItems.map((item) => {
      const tax_amount = item.amount * item.tax_rate;
      const total_amount = item.amount + tax_amount;
      
      return {
        ...item,
        tax_amount,
        total_amount,
      };
    });

    return NextResponse.json(itemsWithCalculations, { status: 200 });
  } catch (error) {
    console.error('[Billing Items] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/billing-items - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = BillingItemCreateSchema.parse(body);

    // 税額・合計額の計算
    const tax_amount = validatedData.amount * validatedData.tax_rate;
    const total_amount = validatedData.amount + tax_amount;

    // 新規作成
    const billingItem = await prisma.billingItem.create({
      data: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        store_id: validatedData.store_id,
        collection_id: validatedData.collection_id,
        billing_month: new Date(validatedData.billing_month),
        billing_period_from: new Date(validatedData.billing_period_from),
        billing_period_to: new Date(validatedData.billing_period_to),
        billing_type: validatedData.billing_type,
        item_name: validatedData.item_name,
        item_code: validatedData.item_code,
        waste_type_id: validatedData.waste_type_id,
        unit_price: validatedData.unit_price,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        amount: validatedData.amount,
        tax_rate: validatedData.tax_rate,
        tax_amount,
        total_amount,
        jwnet_registration_id: validatedData.jwnet_registration_id,
        jwnet_manifest_no: validatedData.jwnet_manifest_no,
        status: validatedData.status,
        notes: validatedData.notes,
        created_by: validatedData.created_by,
        updated_by: validatedData.created_by,
      },
    });

    return NextResponse.json(billingItem, { status: 201 });
  } catch (error) {
    console.error('[Billing Items] POST error:', error);

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


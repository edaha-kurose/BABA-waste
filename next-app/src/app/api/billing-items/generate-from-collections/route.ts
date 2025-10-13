/**
 * Collection（回収実績）から請求データを自動生成 API
 * 
 * POST /api/billing-items/generate-from-collections
 * 
 * ユーザー要件: JWNET登録不要、回収実績報告さえできていれば請求データとして請求できる
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ
const GenerateBillingItemsSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  collector_id: z.string().uuid('Invalid collector ID'),
  billing_month: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_month (YYYY-MM-01)',
  }),
  billing_period_from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_period_from',
  }),
  billing_period_to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for billing_period_to',
  }),
  tax_rate: z.number().default(0.10),
  created_by: z.string().uuid().optional(),
});

// POST /api/billing-items/generate-from-collections - 回収実績から請求データ自動生成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = GenerateBillingItemsSchema.parse(body);

    const billingMonth = new Date(validatedData.billing_month);
    const periodFrom = new Date(validatedData.billing_period_from);
    const periodTo = new Date(validatedData.billing_period_to);

    // 指定期間内の回収実績を取得（まだ請求に含まれていないもの）
    const collections = await prisma.collection.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        actual_pickup_date: {
          gte: periodFrom,
          lte: periodTo,
        },
        status: {
          in: ['COMPLETED', 'VERIFIED'], // 完了・検証済みのみ
        },
        deleted_at: null,
        // まだ請求に含まれていないCollectionのみ
        // （billing_items との既存の紐付けがないもの）
      },
    });

    if (collections.length === 0) {
      return NextResponse.json(
        {
          message: 'No collections found for the specified period',
          generated_count: 0,
          collections_processed: 0,
        },
        { status: 200 }
      );
    }

    // 既に請求済みのcollection_idを取得
    const existingBillingItems = await prisma.billingItem.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        collection_id: {
          in: collections.map((c) => c.id),
        },
        deleted_at: null,
      },
      select: {
        collection_id: true,
      },
    });

    const alreadyBilledCollectionIds = new Set(
      existingBillingItems.map((item) => item.collection_id).filter(Boolean)
    );

    // まだ請求されていないCollectionをフィルタリング
    const unbilledCollections = collections.filter(
      (c) => !alreadyBilledCollectionIds.has(c.id)
    );

    if (unbilledCollections.length === 0) {
      return NextResponse.json(
        {
          message: 'All collections in the specified period have already been billed',
          generated_count: 0,
          collections_processed: collections.length,
          already_billed: alreadyBilledCollectionIds.size,
        },
        { status: 200 }
      );
    }

    // 廃棄物種別マスターから単価を取得（collector_id と waste_type_id の紐付け）
    const wasteTypeIds = unbilledCollections
      .map((c) => c.waste_type_id)
      .filter(Boolean);

    const wasteTypeMasters = await prisma.wasteTypeMaster.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        id: {
          in: wasteTypeIds,
        },
        is_active: true,
        deleted_at: null,
      },
    });

    // waste_type_id → unit_price のマップ作成
    const wasteTypePriceMap = new Map(
      wasteTypeMasters.map((wt) => [wt.id, wt.unit_price || 0])
    );

    // Collection ごとに請求明細を生成
    const billingItemsToCreate = unbilledCollections.map((collection) => {
      const unit_price = collection.waste_type_id
        ? wasteTypePriceMap.get(collection.waste_type_id) || 0
        : 0;

      const quantity = collection.actual_quantity || collection.quantity;
      const amount = unit_price * quantity;
      const tax_amount = amount * validatedData.tax_rate;
      const total_amount = amount + tax_amount;

      return {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        store_id: collection.store_id,
        collection_id: collection.id,
        billing_month: billingMonth,
        billing_period_from: periodFrom,
        billing_period_to: periodTo,
        billing_type: 'METERED', // 従量請求
        item_name: `回収実績 - ${collection.id.substring(0, 8)}`,
        item_code: collection.waste_type_id || null,
        waste_type_id: collection.waste_type_id,
        unit_price,
        quantity,
        unit: collection.unit,
        amount,
        tax_rate: validatedData.tax_rate,
        tax_amount,
        total_amount,
        jwnet_registration_id: collection.jwnet_registration_id,
        status: 'DRAFT', // 下書きとして作成
        notes: `回収日: ${collection.actual_pickup_date.toISOString().split('T')[0]}`,
        created_by: validatedData.created_by,
        updated_by: validatedData.created_by,
      };
    });

    // 一括作成
    const createdBillingItems = await prisma.billingItem.createMany({
      data: billingItemsToCreate,
    });

    // 作成された請求明細を取得（レスポンス用）
    const createdItems = await prisma.billingItem.findMany({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        billing_month: billingMonth,
        collection_id: {
          in: unbilledCollections.map((c) => c.id),
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(
      {
        message: 'Billing items generated successfully',
        generated_count: createdBillingItems.count,
        collections_processed: collections.length,
        already_billed: alreadyBilledCollectionIds.size,
        unbilled_collections: unbilledCollections.length,
        billing_items: createdItems,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Generate Billing Items] POST error:', error);

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


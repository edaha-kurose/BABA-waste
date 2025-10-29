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
import { getAuthenticatedUser } from '@/lib/auth/session-server';

// バリデーションスキーマ（org_id削除、認証ユーザーから取得）
const UserInputSchema = z.object({
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
});

// POST /api/billing-items/generate-from-collections - 回収実績から請求データ自動生成
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // JSON パースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Generate Billing Items] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // バリデーション
    const validatedData = UserInputSchema.parse(body);

    const billingMonth = new Date(validatedData.billing_month);
    const periodFrom = new Date(validatedData.billing_period_from);
    const periodTo = new Date(validatedData.billing_period_to);

    // 指定期間内の回収実績を取得（まだ請求に含まれていないもの）
    let collections;
    try {
      collections = await prisma.collections.findMany({
        where: {
          org_id: authUser.org_id,
          collection_requests: {
            collector_id: validatedData.collector_id,
          },
          collected_at: {
            gte: periodFrom,
            lte: periodTo,
          },
          // まだ請求に含まれていないCollectionのみ
          // （billing_items との既存の紐付けがないもの）
        },
        include: {
          collection_requests: {
            select: {
              waste_type_id: true,
              collector_id: true,
              store_id: true,
            },
          },
        },
      });
    } catch (dbError) {
      console.error('[Generate Billing Items] Database error - collections fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

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
    let existingBillingItems;
    try {
      existingBillingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: authUser.org_id,
          collector_id: validatedData.collector_id,
          collection_id: {
            in: collections.map((c) => c.id),
          },
        },
        select: {
          collection_id: true,
        },
      });
    } catch (dbError) {
      console.error('[Generate Billing Items] Database error - existing items check:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

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
      .map((c) => c.collection_requests.waste_type_id)
      .filter((id): id is string => id !== null && id !== undefined);

    let wasteTypeMasters;
    try {
      wasteTypeMasters = await prisma.waste_type_masters.findMany({
        where: {
          org_id: authUser.org_id,
          id: {
            in: wasteTypeIds,
          },
          is_active: true,
        },
      });
    } catch (dbError) {
      console.error('[Generate Billing Items] Database error - waste type masters fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // waste_type_id → unit_price のマップ作成
    const wasteTypePriceMap = new Map(
      wasteTypeMasters.map((wt) => [wt.id, wt.unit_price || 0])
    );

    // Collection ごとに請求明細を生成
    const billingItemsToCreate = unbilledCollections
      .filter((collection) => collection.collection_requests.collector_id !== null)
      .map((collection) => {
        const wasteTypeId = collection.collection_requests.waste_type_id;
        const unit_price = wasteTypeId
          ? wasteTypePriceMap.get(wasteTypeId) || 0
          : 0;

        const quantity = collection.actual_qty.toNumber();
        const amount = unit_price * quantity;
        const tax_amount = amount * validatedData.tax_rate;
        const total_amount = amount + tax_amount;

        return {
          org_id: authUser.org_id,
          collector_id: collection.collection_requests.collector_id!,
          store_id: collection.collection_requests.store_id,
          collection_id: collection.id,
        billing_month: billingMonth,
        billing_period_from: periodFrom,
        billing_period_to: periodTo,
        billing_type: 'METERED', // 従量請求
        item_name: `回収実績 - ${collection.id.substring(0, 8)}`,
        item_code: wasteTypeId || null,
        waste_type_id: wasteTypeId,
        unit_price,
        quantity,
        unit: collection.actual_unit,
        amount,
        tax_rate: validatedData.tax_rate,
        tax_amount,
        total_amount,
        jwnet_registration_id: collection.jwnet_registration_id,
        status: 'DRAFT', // 下書きとして作成
        notes: `回収日: ${collection.collected_at.toISOString().split('T')[0]}`,
        created_by: authUser.id,
        updated_by: authUser.id,
      };
    });

    // 一括作成
    let createdBillingItems;
    try {
      createdBillingItems = await prisma.app_billing_items.createMany({
        data: billingItemsToCreate,
      });
    } catch (dbError) {
      console.error('[Generate Billing Items] Database error - createMany:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred during billing items creation' },
        { status: 500 }
      );
    }

    // 作成された請求明細を取得（レスポンス用）
    let createdItems;
    try {
      createdItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: authUser.org_id,
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
    } catch (dbError) {
      console.error('[Generate Billing Items] Database error - created items fetch:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

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


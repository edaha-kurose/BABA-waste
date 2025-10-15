/**
 * 廃棄物種別マスター API
 * 
 * GET  /api/waste-type-masters - 一覧取得
 * POST /api/waste-type-masters - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ
const WasteTypeMasterCreateSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  collector_id: z.string().uuid('Invalid collector ID'),
  waste_type_code: z.string().min(1).max(50),
  waste_type_name: z.string().min(1).max(255),
  waste_category: z.string().min(1).max(100),
  waste_classification: z.string().min(1).max(100),
  jwnet_waste_code_id: z.string().uuid('Invalid JWNET waste code ID'),
  jwnet_waste_code: z.string().length(7, 'JWNET waste code must be 7 digits'),
  unit_code: z.string().min(1).max(10),
  unit_price: z.number().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional(),
});

// GET /api/waste-type-masters - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const collector_id = searchParams.get('collector_id');
    const jwnet_waste_code = searchParams.get('jwnet_waste_code');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');

    // フィルター条件構築
    const where: any = {};

    if (org_id) {
      where.org_id = org_id;
    }

    if (collector_id) {
      where.collector_id = collector_id;
    }

    if (jwnet_waste_code) {
      where.jwnet_waste_code = jwnet_waste_code;
    }

    if (is_active !== null) {
      where.is_active = is_active === 'true';
    }

    if (search) {
      where.OR = [
        { waste_type_code: { contains: search, mode: 'insensitive' } },
        { waste_type_name: { contains: search, mode: 'insensitive' } },
        { waste_category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 論理削除されていないレコードのみ取得

    const wasteTypeMasters = await prisma.waste_type_masters.findMany({
      where,
      include: {
        jwnet_waste_codes: {
          select: {
            id: true,
            waste_code: true,
            waste_name: true,
            waste_category: true,
            unit_code: true,
            unit_name: true,
          },
        },
      },
      orderBy: {
        waste_type_code: 'asc',
      },
    });

    return NextResponse.json(wasteTypeMasters, { status: 200 });
  } catch (error) {
    console.error('[Waste Type Masters] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/waste-type-masters - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = WasteTypeMasterCreateSchema.parse(body);

    // JWNET 廃棄物コードの存在確認
    const jwnetWasteCode = await prisma.jwnet_waste_codes.findUnique({
      where: { id: validatedData.jwnet_waste_code_id },
    });

    if (!jwnetWasteCode) {
      return NextResponse.json(
        { error: 'Not Found', message: 'JWNET waste code not found' },
        { status: 404 }
      );
    }

    // JWNET 廃棄物コードの一致確認
    if (jwnetWasteCode.waste_code !== validatedData.jwnet_waste_code) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'JWNET waste code mismatch',
        },
        { status: 400 }
      );
    }

    // 重複チェック（同じ組織・収集業者・廃棄物コード）
    const existingMaster = await prisma.waste_type_masters.findFirst({
      where: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        waste_type_code: validatedData.waste_type_code,
      },
    });

    if (existingMaster) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This waste type already exists for this collector',
          existing_id: existingMaster.id,
        },
        { status: 409 }
      );
    }

    // 新規作成
    const wasteTypeMaster = await prisma.waste_type_masters.create({
      data: {
        org_id: validatedData.org_id,
        collector_id: validatedData.collector_id,
        waste_type_code: validatedData.waste_type_code,
        waste_type_name: validatedData.waste_type_name,
        waste_category: validatedData.waste_category,
        waste_classification: validatedData.waste_classification,
        jwnet_waste_code_id: validatedData.jwnet_waste_code_id,
        jwnet_waste_code: validatedData.jwnet_waste_code,
        unit_code: validatedData.unit_code,
        unit_price: validatedData.unit_price,
        description: validatedData.description,
        is_active: validatedData.is_active,
        created_by: validatedData.created_by,
        updated_by: validatedData.created_by,
      },
      include: {
        jwnet_waste_codes: {
          select: {
            id: true,
            waste_code: true,
            waste_name: true,
            waste_category: true,
            unit_code: true,
            unit_name: true,
          },
        },
      },
    });

    return NextResponse.json(wasteTypeMaster, { status: 201 });
  } catch (error) {
    console.error('[Waste Type Masters] POST error:', error);

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


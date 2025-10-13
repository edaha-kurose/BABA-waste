/**
 * JWNET 廃棄物コードマスター API
 * 
 * GET  /api/jwnet-waste-codes - 一覧取得
 * POST /api/jwnet-waste-codes - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ
const JwnetWasteCodeCreateSchema = z.object({
  waste_code: z.string().length(7, 'Waste code must be 7 digits'),
  waste_name: z.string().min(1).max(255),
  waste_category: z.string().min(1).max(100),
  waste_type: z.string().min(1).max(100),
  unit_code: z.string().min(1).max(10),
  unit_name: z.string().min(1).max(50),
  is_active: z.boolean().default(true),
});

// GET /api/jwnet-waste-codes - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const waste_code = searchParams.get('waste_code');
    const waste_category = searchParams.get('waste_category');
    const is_active = searchParams.get('is_active');
    const search = searchParams.get('search');

    // フィルター条件構築
    const where: any = {};

    if (waste_code) {
      where.waste_code = waste_code;
    }

    if (waste_category) {
      where.waste_category = {
        contains: waste_category,
        mode: 'insensitive',
      };
    }

    if (is_active !== null) {
      where.is_active = is_active === 'true';
    }

    if (search) {
      where.OR = [
        { waste_code: { contains: search, mode: 'insensitive' } },
        { waste_name: { contains: search, mode: 'insensitive' } },
        { waste_category: { contains: search, mode: 'insensitive' } },
        { waste_type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const wasteCodes = await prisma.jwnetWasteCode.findMany({
      where,
      orderBy: {
        waste_code: 'asc',
      },
    });

    return NextResponse.json(wasteCodes, { status: 200 });
  } catch (error) {
    console.error('[JWNET Waste Codes] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/jwnet-waste-codes - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = JwnetWasteCodeCreateSchema.parse(body);

    // 重複チェック
    const existingCode = await prisma.jwnetWasteCode.findUnique({
      where: { waste_code: validatedData.waste_code },
    });

    if (existingCode) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This waste code already exists',
          existing_id: existingCode.id,
        },
        { status: 409 }
      );
    }

    // 新規作成
    const wasteCode = await prisma.jwnetWasteCode.create({
      data: validatedData,
    });

    return NextResponse.json(wasteCode, { status: 201 });
  } catch (error) {
    console.error('[JWNET Waste Codes] POST error:', error);

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


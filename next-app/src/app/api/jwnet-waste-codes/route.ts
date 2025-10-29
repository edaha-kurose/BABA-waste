/**
 * JWNET 廃棄物コードマスター API
 * 
 * GET  /api/jwnet-waste-codes - 一覧取得
 * POST /api/jwnet-waste-codes - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

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
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

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

  let wasteCodes
  try {
    wasteCodes = await prisma.jwnet_waste_codes.findMany({
      where,
      orderBy: {
        waste_code: 'asc',
      },
    });
  } catch (dbError) {
    console.error('[GET /api/jwnet-waste-codes] Prisma検索エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(wasteCodes, { status: 200 });
}

// POST /api/jwnet-waste-codes - 新規作成
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // システム管理者のみ
  if (!authUser.isSystemAdmin) {
    return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 });
  }

  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  let validatedData
  try {
    validatedData = JwnetWasteCodeCreateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: '不正なリクエストデータです' }, { status: 400 });
  }

  // 重複チェック
  let existingCode
  try {
    existingCode = await prisma.jwnet_waste_codes.findUnique({
      where: { waste_code: validatedData.waste_code },
    });
  } catch (dbError) {
    console.error('[POST /api/jwnet-waste-codes] Prisma重複チェックエラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  if (existingCode) {
    return NextResponse.json(
      {
        error: 'この廃棄物コードは既に存在します',
        existing_id: existingCode.id,
      },
      { status: 409 }
    );
  }

  // 新規作成
  let wasteCode
  try {
    wasteCode = await prisma.jwnet_waste_codes.create({
      data: validatedData,
    });
  } catch (dbError) {
    console.error('[POST /api/jwnet-waste-codes] Prisma作成エラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  return NextResponse.json(wasteCode, { status: 201 });
}


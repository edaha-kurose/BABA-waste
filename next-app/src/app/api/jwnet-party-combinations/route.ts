/**
 * JWNET 事業者組み合わせマスター API
 * 
 * GET  /api/jwnet-party-combinations - 一覧取得
 * POST /api/jwnet-party-combinations - 新規作成
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ
const JwnetPartyCombinationCreateSchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
  emitter_org_id: z.string().uuid('Invalid emitter organization ID'),
  emitter_subscriber_no: z.string().length(7, 'Emitter subscriber number must be 7 digits'),
  emitter_public_confirm_no: z.string().length(6, 'Emitter public confirmation number must be 6 digits'),
  emitter_name: z.string().min(1).max(255),
  emitter_address: z.string().min(1).max(500),
  emitter_postal_code: z.string().min(1).max(20),
  
  transporter_org_id: z.string().uuid('Invalid transporter organization ID'),
  transporter_subscriber_no: z.string().length(7, 'Transporter subscriber number must be 7 digits'),
  transporter_public_confirm_no: z.string().length(6, 'Transporter public confirmation number must be 6 digits'),
  transporter_name: z.string().min(1).max(255),
  transporter_address: z.string().min(1).max(500),
  transporter_postal_code: z.string().min(1).max(20),
  transporter_phone: z.string().max(50).optional(),
  
  disposer_org_id: z.string().uuid('Invalid disposer organization ID'),
  disposer_subscriber_no: z.string().length(7, 'Disposer subscriber number must be 7 digits'),
  disposer_public_confirm_no: z.string().length(6, 'Disposer public confirmation number must be 6 digits'),
  disposer_name: z.string().min(1).max(255),
  disposer_address: z.string().min(1).max(500),
  disposer_postal_code: z.string().min(1).max(20),
  disposer_phone: z.string().max(50).optional(),
  
  is_active: z.boolean().default(true),
  valid_from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for valid_from',
  }),
  valid_to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for valid_to',
  }).optional().nullable(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
});

// GET /api/jwnet-party-combinations - 一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const org_id = searchParams.get('org_id');
    const is_active = searchParams.get('is_active');
    const emitter_org_id = searchParams.get('emitter_org_id');
    const transporter_org_id = searchParams.get('transporter_org_id');
    const disposer_org_id = searchParams.get('disposer_org_id');

    // フィルター条件構築
    const where: any = {};

    if (org_id) {
      where.org_id = org_id;
    }

    if (is_active !== null) {
      where.is_active = is_active === 'true';
    }

    if (emitter_org_id) {
      where.emitter_org_id = emitter_org_id;
    }

    if (transporter_org_id) {
      where.transporter_org_id = transporter_org_id;
    }

    if (disposer_org_id) {
      where.disposer_org_id = disposer_org_id;
    }

    // 論理削除されていないレコードのみ取得
    where.deleted_at = null;

    const combinations = await prisma.jwnetPartyCombination.findMany({
      where,
      include: {
        emitter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        transporter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        disposer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json(combinations, { status: 200 });
  } catch (error) {
    console.error('[JWNET Party Combinations] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/jwnet-party-combinations - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = JwnetPartyCombinationCreateSchema.parse(body);

    // 組織の存在確認
    const [emitterOrg, transporterOrg, disposerOrg] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: validatedData.emitter_org_id },
      }),
      prisma.organization.findUnique({
        where: { id: validatedData.transporter_org_id },
      }),
      prisma.organization.findUnique({
        where: { id: validatedData.disposer_org_id },
      }),
    ]);

    if (!emitterOrg || emitterOrg.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Emitter organization not found' },
        { status: 404 }
      );
    }

    if (!transporterOrg || transporterOrg.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Transporter organization not found' },
        { status: 404 }
      );
    }

    if (!disposerOrg || disposerOrg.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Disposer organization not found' },
        { status: 404 }
      );
    }

    // 重複チェック（同じ組み合わせが既に存在しないか）
    const existingCombination = await prisma.jwnetPartyCombination.findFirst({
      where: {
        emitter_subscriber_no: validatedData.emitter_subscriber_no,
        emitter_public_confirm_no: validatedData.emitter_public_confirm_no,
        transporter_subscriber_no: validatedData.transporter_subscriber_no,
        transporter_public_confirm_no: validatedData.transporter_public_confirm_no,
        disposer_subscriber_no: validatedData.disposer_subscriber_no,
        disposer_public_confirm_no: validatedData.disposer_public_confirm_no,
        deleted_at: null,
      },
    });

    if (existingCombination) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This party combination already exists',
          existing_id: existingCombination.id,
        },
        { status: 409 }
      );
    }

    // 新規作成
    const combination = await prisma.jwnetPartyCombination.create({
      data: {
        org_id: validatedData.org_id,
        emitter_org_id: validatedData.emitter_org_id,
        emitter_subscriber_no: validatedData.emitter_subscriber_no,
        emitter_public_confirm_no: validatedData.emitter_public_confirm_no,
        emitter_name: validatedData.emitter_name,
        emitter_address: validatedData.emitter_address,
        emitter_postal_code: validatedData.emitter_postal_code,
        transporter_org_id: validatedData.transporter_org_id,
        transporter_subscriber_no: validatedData.transporter_subscriber_no,
        transporter_public_confirm_no: validatedData.transporter_public_confirm_no,
        transporter_name: validatedData.transporter_name,
        transporter_address: validatedData.transporter_address,
        transporter_postal_code: validatedData.transporter_postal_code,
        transporter_phone: validatedData.transporter_phone,
        disposer_org_id: validatedData.disposer_org_id,
        disposer_subscriber_no: validatedData.disposer_subscriber_no,
        disposer_public_confirm_no: validatedData.disposer_public_confirm_no,
        disposer_name: validatedData.disposer_name,
        disposer_address: validatedData.disposer_address,
        disposer_postal_code: validatedData.disposer_postal_code,
        disposer_phone: validatedData.disposer_phone,
        is_active: validatedData.is_active,
        valid_from: new Date(validatedData.valid_from),
        valid_to: validatedData.valid_to ? new Date(validatedData.valid_to) : null,
        notes: validatedData.notes,
        created_by: validatedData.created_by,
        updated_by: validatedData.created_by,
      },
      include: {
        emitter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        transporter: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        disposer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json(combination, { status: 201 });
  } catch (error) {
    console.error('[JWNET Party Combinations] POST error:', error);

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


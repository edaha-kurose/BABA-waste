/**
 * JWNET 事業者組み合わせマスター 個別 API
 * 
 * GET    /api/jwnet-party-combinations/[id] - 詳細取得
 * PATCH  /api/jwnet-party-combinations/[id] - 更新
 * DELETE /api/jwnet-party-combinations/[id] - 論理削除
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// バリデーションスキーマ（更新用）
const JwnetPartyCombinationUpdateSchema = z.object({
  emitter_name: z.string().min(1).max(255).optional(),
  emitter_address: z.string().min(1).max(500).optional(),
  emitter_postal_code: z.string().min(1).max(20).optional(),
  
  transporter_name: z.string().min(1).max(255).optional(),
  transporter_address: z.string().min(1).max(500).optional(),
  transporter_postal_code: z.string().min(1).max(20).optional(),
  transporter_phone: z.string().max(50).optional().nullable(),
  
  disposer_name: z.string().min(1).max(255).optional(),
  disposer_address: z.string().min(1).max(500).optional(),
  disposer_postal_code: z.string().min(1).max(20).optional(),
  disposer_phone: z.string().max(50).optional().nullable(),
  
  is_active: z.boolean().optional(),
  valid_from: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for valid_from',
  }).optional(),
  valid_to: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format for valid_to',
  }).optional().nullable(),
  notes: z.string().optional().nullable(),
  updated_by: z.string().uuid().optional(),
});

// GET /api/jwnet-party-combinations/[id] - 詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const combination = await prisma.jwnetPartyCombination.findUnique({
      where: { id },
      include: {
        emitter: {
          select: {
            id: true,
            name: true,
            code: true,
            jwnet_subscriber_id: true,
            jwnet_public_confirmation_id: true,
          },
        },
        transporter: {
          select: {
            id: true,
            name: true,
            code: true,
            jwnet_subscriber_id: true,
            jwnet_public_confirmation_id: true,
          },
        },
        disposer: {
          select: {
            id: true,
            name: true,
            code: true,
            jwnet_subscriber_id: true,
            jwnet_public_confirmation_id: true,
          },
        },
      },
    });

    if (!combination || combination.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'JWNET party combination not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(combination, { status: 200 });
  } catch (error) {
    console.error('[JWNET Party Combination] GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/jwnet-party-combinations/[id] - 更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // バリデーション
    const validatedData = JwnetPartyCombinationUpdateSchema.parse(body);

    // 存在確認
    const existingCombination = await prisma.jwnetPartyCombination.findUnique({
      where: { id },
    });

    if (!existingCombination || existingCombination.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'JWNET party combination not found' },
        { status: 404 }
      );
    }

    // 更新データ準備
    const updateData: any = {
      updated_by: validatedData.updated_by,
    };

    if (validatedData.emitter_name !== undefined) {
      updateData.emitter_name = validatedData.emitter_name;
    }
    if (validatedData.emitter_address !== undefined) {
      updateData.emitter_address = validatedData.emitter_address;
    }
    if (validatedData.emitter_postal_code !== undefined) {
      updateData.emitter_postal_code = validatedData.emitter_postal_code;
    }

    if (validatedData.transporter_name !== undefined) {
      updateData.transporter_name = validatedData.transporter_name;
    }
    if (validatedData.transporter_address !== undefined) {
      updateData.transporter_address = validatedData.transporter_address;
    }
    if (validatedData.transporter_postal_code !== undefined) {
      updateData.transporter_postal_code = validatedData.transporter_postal_code;
    }
    if (validatedData.transporter_phone !== undefined) {
      updateData.transporter_phone = validatedData.transporter_phone;
    }

    if (validatedData.disposer_name !== undefined) {
      updateData.disposer_name = validatedData.disposer_name;
    }
    if (validatedData.disposer_address !== undefined) {
      updateData.disposer_address = validatedData.disposer_address;
    }
    if (validatedData.disposer_postal_code !== undefined) {
      updateData.disposer_postal_code = validatedData.disposer_postal_code;
    }
    if (validatedData.disposer_phone !== undefined) {
      updateData.disposer_phone = validatedData.disposer_phone;
    }

    if (validatedData.is_active !== undefined) {
      updateData.is_active = validatedData.is_active;
    }
    if (validatedData.valid_from !== undefined) {
      updateData.valid_from = new Date(validatedData.valid_from);
    }
    if (validatedData.valid_to !== undefined) {
      updateData.valid_to = validatedData.valid_to ? new Date(validatedData.valid_to) : null;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // 更新
    const combination = await prisma.jwnetPartyCombination.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(combination, { status: 200 });
  } catch (error) {
    console.error('[JWNET Party Combination] PATCH error:', error);

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

// DELETE /api/jwnet-party-combinations/[id] - 論理削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const updated_by = searchParams.get('updated_by');

    // 存在確認
    const existingCombination = await prisma.jwnetPartyCombination.findUnique({
      where: { id },
    });

    if (!existingCombination || existingCombination.deleted_at) {
      return NextResponse.json(
        { error: 'Not Found', message: 'JWNET party combination not found' },
        { status: 404 }
      );
    }

    // 論理削除
    await prisma.jwnetPartyCombination.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_by: updated_by || undefined,
      },
    });

    return NextResponse.json(
      { message: 'JWNET party combination deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('[JWNET Party Combination] DELETE error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


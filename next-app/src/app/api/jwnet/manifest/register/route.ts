/**
 * JWNET マニフェスト登録 API
 * 
 * POST /api/jwnet/manifest/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJwnetClient } from '@/lib/jwnet/client';
import { ManifestRegisterRequest, JwnetApiError } from '@/types/jwnet';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: ManifestRegisterRequest = await request.json();

    // 基本バリデーション
    if (!body.emitter || !body.transporter || !body.disposer) {
      return NextResponse.json(
        { error: 'Missing required fields: emitter, transporter, or disposer' },
        { status: 400 }
      );
    }

    if (!body.wastes || body.wastes.length === 0) {
      return NextResponse.json(
        { error: 'At least one waste item is required' },
        { status: 400 }
      );
    }

    // === Phase 4-B.5: JWNET WebEDI 検証強化 ===

    // 1. 事業者組み合わせマスターの検証
    const partyCombination = await prisma.jwnetPartyCombination.findFirst({
      where: {
        emitter_subscriber_no: body.emitter.subscriberNo,
        emitter_public_confirm_no: body.emitter.publicConfirmNo,
        transporter_subscriber_no: body.transporter.subscriberNo,
        transporter_public_confirm_no: body.transporter.publicConfirmNo,
        disposer_subscriber_no: body.disposer.subscriberNo,
        disposer_public_confirm_no: body.disposer.publicConfirmNo,
        is_active: true,
        deleted_at: null,
      },
    });

    if (!partyCombination) {
      return NextResponse.json(
        {
          error: 'Invalid party combination',
          message:
            '排出事業者・収集業者・処分業者の組み合わせが事業者組み合わせマスターに登録されていません。',
          hint: '事業者組み合わせマスターで組み合わせを登録してください。',
        },
        { status: 400 }
      );
    }

    // 2. JWNET 廃棄物コードの検証
    const wasteCodeValidations = await Promise.all(
      body.wastes.map(async (waste) => {
        const jwnetWasteCode = await prisma.jwnetWasteCode.findUnique({
          where: { waste_code: waste.wasteCode },
        });

        if (!jwnetWasteCode || !jwnetWasteCode.is_active) {
          return {
            valid: false,
            wasteCode: waste.wasteCode,
            message: `JWNET廃棄物コード「${waste.wasteCode}」が無効または登録されていません。`,
          };
        }

        return { valid: true };
      })
    );

    const invalidWasteCodes = wasteCodeValidations.filter((v) => !v.valid);
    if (invalidWasteCodes.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid waste codes',
          message: 'JWNET廃棄物コードが無効です。',
          details: invalidWasteCodes,
        },
        { status: 400 }
      );
    }

    // 3. 廃棄物種別マスターの検証（収集業者のマスターに登録済みか）
    const wasteTypeMasterValidations = await Promise.all(
      body.wastes.map(async (waste) => {
        const wasteTypeMaster = await prisma.wasteTypeMaster.findFirst({
          where: {
            jwnet_waste_code: waste.wasteCode,
            is_active: true,
            deleted_at: null,
          },
        });

        if (!wasteTypeMaster) {
          return {
            valid: false,
            wasteCode: waste.wasteCode,
            message: `廃棄物コード「${waste.wasteCode}」が廃棄物種別マスターに登録されていません。`,
            hint: '廃棄物マスター管理で廃棄物種別を登録してください。',
          };
        }

        return { valid: true };
      })
    );

    const invalidWasteTypeMasters = wasteTypeMasterValidations.filter((v) => !v.valid);
    if (invalidWasteTypeMasters.length > 0) {
      return NextResponse.json(
        {
          error: 'Waste type not registered',
          message: '廃棄物種別マスターに未登録の廃棄物があります。',
          details: invalidWasteTypeMasters,
        },
        { status: 400 }
      );
    }

    // === 検証完了 ===

    // JWNET API クライアントを取得
    const jwnetClient = getJwnetClient();

    // マニフェストを登録
    const response = await jwnetClient.registerManifest(body);

    if (!response.success) {
      return NextResponse.json(
        {
          error: 'JWNET manifest registration failed',
          message: response.errorMessage,
          errorCode: response.errorCode,
        },
        { status: 500 }
      );
    }

    // データベースに登録情報を保存
    await prisma.jwnetRegistration.create({
      data: {
        org_id: request.headers.get('x-org-id') || '',
        manifest_no: response.manifestNo!,
        receipt_no: response.receiptNo!,
        status: 'REGISTERED',
        manifest_data: body as any,
        response_data: response as any,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[JWNET] Manifest registration error:', error);

    if (error instanceof JwnetApiError) {
      return NextResponse.json(
        {
          error: 'JWNET API error',
          message: error.message,
          errorCode: error.errorCode,
          statusCode: error.statusCode,
        },
        { status: error.statusCode || 500 }
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


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

    // バリデーション
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


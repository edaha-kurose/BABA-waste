/**
 * JWNET マニフェスト照会 API
 * 
 * POST /api/jwnet/manifest/inquiry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJwnetClient } from '@/lib/jwnet/client';
import { ManifestInquiryRequest, JwnetApiError } from '@/types/jwnet';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: ManifestInquiryRequest = await request.json();

    // バリデーション
    if (!body.manifestNo || !body.subscriberNo) {
      return NextResponse.json(
        { error: 'Missing required fields: manifestNo or subscriberNo' },
        { status: 400 }
      );
    }

    // JWNET API クライアントを取得
    const jwnetClient = getJwnetClient();

    // マニフェストを照会
    const response = await jwnetClient.inquireManifest(body);

    if (!response.success) {
      return NextResponse.json(
        {
          error: 'JWNET manifest inquiry failed',
          message: response.errorMessage,
          errorCode: response.errorCode,
        },
        { status: 500 }
      );
    }

    // データベースの登録情報を更新
    const orgId = request.headers.get('x-org-id') || '';
    
    if (response.manifestNo) {
      await prisma.jwnetRegistration.updateMany({
        where: {
          org_id: orgId,
          manifest_no: response.manifestNo,
        },
        data: {
          status: response.status as any,
          response_data: response as any,
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[JWNET] Manifest inquiry error:', error);

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


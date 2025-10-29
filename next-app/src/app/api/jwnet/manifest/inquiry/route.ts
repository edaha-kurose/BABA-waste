/**
 * JWNET マニフェスト照会 API
 * 
 * POST /api/jwnet/manifest/inquiry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJwnetClient } from '@/lib/jwnet/client';
import { ManifestInquiryRequest, JwnetApiError } from '@/types/jwnet';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body: ManifestInquiryRequest
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  // バリデーション
  if (!body.manifestNo || !body.subscriberNo) {
    return NextResponse.json(
      { error: 'Missing required fields: manifestNo or subscriberNo' },
      { status: 400 }
    );
  }

  try {

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
    if (response.manifestNo) {
      try {
        await prisma.registrations.updateMany({
          where: {
            org_id: authUser.org_id,
            manifest_no: response.manifestNo,
          },
          data: {
            status: response.status as any,
            updated_at: new Date(),
          },
        });
      } catch (dbError) {
        console.error('[JWNET] DB更新エラー:', dbError);
        // DB更新失敗してもJWNET照会結果は返す
      }
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


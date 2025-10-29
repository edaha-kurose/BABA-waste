/**
 * JWNET 予約番号取得 API
 * 
 * POST /api/jwnet/reservation/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { getJwnetClient } from '@/lib/jwnet/client';
import { ReservationRequest, JwnetApiError } from '@/types/jwnet';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  // リクエストボディを取得
  let body: ReservationRequest
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // バリデーション
    if (!body.subscriberNo || !body.publicConfirmNo) {
      return NextResponse.json(
        { error: 'Missing required fields: subscriberNo or publicConfirmNo' },
        { status: 400 }
      );
    }

    if (!body.count || body.count < 1 || body.count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      );
    }

    // JWNET API クライアントを取得
    const jwnetClient = getJwnetClient();

    // 予約番号を取得
    const response = await jwnetClient.reserveNumbers(body);

    if (!response.success) {
      return NextResponse.json(
        {
          error: 'JWNET reservation failed',
          message: response.errorMessage,
          errorCode: response.errorCode,
        },
        { status: 500 }
      );
    }

    // データベースに予約情報を保存
    // TODO: plan_id を正しく設定する
    /*
    if (response.reservationNos && response.reservationNos.length > 0 && authUser.org_id) {
      try {
        await Promise.all(
          response.reservationNos.map((reservationNo) =>
            prisma.reservations.create({
              data: {
                org_id: authUser.org_id,
                plan_id: '', // TODO: 正しい plan_id を設定
                reservation_no: reservationNo,
                status: 'RESERVED',
              },
            })
          )
        );
      } catch (dbError) {
        console.error('[POST /api/jwnet/reservation/create] Prisma予約保存エラー:', dbError);
        // 予約番号取得は成功したので警告のみ
      }
    }
    */

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[JWNET] Reservation error:', error);

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

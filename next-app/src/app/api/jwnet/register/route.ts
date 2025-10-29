// ============================================================================
// JWNET登録API
// POST /api/jwnet/register
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { jwnetClient } from '@/lib/clients/jwnet/client'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

const registerSchema = z.object({
  plan_id: z.string().uuid(),
  manifest_number: z.string().optional(),
  waste_items: z.array(
    z.object({
      waste_type: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    // ✅ 認証チェック
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // JSON パースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[JWNET Register] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // ✅ バリデーション
    const data = registerSchema.parse(body)

    // ✅ トランザクション処理
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
      // 1. Plan情報を取得
      const plan = await tx.plans.findUnique({
        where: { id: data.plan_id },
        include: {
          stores: true,
          item_maps: true,
        },
      })

      if (!plan) {
        throw new Error('Plan not found')
      }

      // 2. Reservation作成または更新
      const reservation = await tx.reservations.upsert({
        where: {
          org_id_plan_id: {
            org_id: user.org_id,
            plan_id: data.plan_id,
          },
        },
        create: {
          org_id: user.org_id,
          plan_id: data.plan_id,
          payload_hash: `hash-${Date.now()}`,
          status: 'PENDING',
          jwnet_temp_id: `TEMP-${Date.now()}`,
          created_by: user.id,
          updated_by: user.id,
        },
        update: {
          status: 'PENDING',
          updated_at: new Date(),
          updated_by: user.id,
        },
      })

      // 3. JWNET送信
      try {
        const jwnetResult = await jwnetClient.registerManifest({
          manifestNumber: data.manifest_number || `MF-${Date.now()}`,
          wasteName: plan.item_maps.item_label,
          wasteType: plan.item_maps.jwnet_code || '',
          quantity: Number(plan.planned_qty),
          unit: plan.unit,
          constructionSlipNumber: '',
          hCode: '',
        })

        if (jwnetResult.result === 'SUCCESS') {
          // 4. 成功: ステータス更新
          await tx.reservations.update({
            where: { id: reservation.id },
            data: {
              status: 'RESERVED',
              last_sent_at: new Date(),
              updated_at: new Date(),
            },
          })

          // 5. Registration作成
          await tx.registrations.upsert({
            where: {
              plan_id: data.plan_id,
            },
            create: {
              org_id: user.org_id,
              plan_id: data.plan_id,
              manifest_no: jwnetResult.manifest_number,
              status: 'REGISTERED',
              last_sent_at: new Date(),
              created_by: user.id,
              updated_by: user.id,
            },
            update: {
              manifest_no: jwnetResult.manifest_number,
              status: 'REGISTERED',
              last_sent_at: new Date(),
              updated_at: new Date(),
              updated_by: user.id,
            },
          })

          return {
            success: true,
            manifest_number: jwnetResult.manifest_number,
            status: 'REGISTERED',
          }
        } else {
          // 6. JWNET側エラー
          await tx.reservations.update({
            where: { id: reservation.id },
            data: {
              status: 'ERROR',
              error_code: jwnetResult.error_code,
              updated_at: new Date(),
            },
          })

          throw new Error(`JWNET registration failed: ${jwnetResult.error_message}`)
        }
      } catch (error) {
        // 7. 通信エラー
        await tx.reservations.update({
          where: { id: reservation.id },
          data: {
            status: 'FAILED',
            error_code: 'COMMUNICATION_ERROR',
            updated_at: new Date(),
          },
        })

        throw error
      }
      });
    } catch (dbError) {
      console.error('[JWNET Register] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[JWNET Register API] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to register manifest',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}






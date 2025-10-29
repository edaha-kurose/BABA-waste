import { NextRequest, NextResponse } from 'next/server'
import { resend, DEFAULT_FROM, RESEND_FROM_STRING } from '@/lib/email/resend-client'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/email/rate-limiter'
import { z } from 'zod'

const sendEmailSchema = z.object({
  queue_id: z.string().uuid().optional(),
  to: z.string().email(),
  to_name: z.string().optional(),
  subject: z.string(),
  html: z.string(),
  text: z.string().optional(),
  tags: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate Limit チェック
    const { allowed, remaining } = await checkRateLimit(user.org_id)
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: '1時間あたりの送信上限（100通）に達しました',
          remaining: 0,
        },
        { status: 429 }
      )
    }

    // JSON パースエラーハンドリング
    let json;
    try {
      json = await request.json();
    } catch (parseError) {
      console.error('[Email Send] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = sendEmailSchema.parse(json)

    console.log('[Email Send] 送信開始:', {
      to: validatedData.to,
      subject: validatedData.subject,
      remaining_limit: remaining,
    })

    // Resend API経由で送信
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM_STRING,
      to: validatedData.to,
      subject: validatedData.subject,
      html: validatedData.html,
      text: validatedData.text,
      // タグ付け（管理画面でフィルタ可能）
      tags: [
        { name: 'org_id', value: user.org_id },
        { name: 'type', value: 'notification' },
        ...(validatedData.tags || []),
      ],
    })

    if (error) {
      console.error('[Email Send] Resendエラー:', error)
      
      // エラーログに記録
      if (validatedData.queue_id) {
        try {
          await prisma.email_logs.create({
            data: {
              queue_id: validatedData.queue_id,
              org_id: user.org_id,
              to_email: validatedData.to,
              subject: validatedData.subject,
              status: 'FAILED',
              error_message: error.message,
              sent_at: new Date(),
            },
          });
        } catch (dbError) {
          console.error('[Email Send] Database error - email log creation:', dbError);
        }
      }

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('[Email Send] ✅ Resend送信成功:', data?.id)

    // 送信履歴に記録
    if (validatedData.queue_id) {
      try {
        await prisma.email_logs.create({
          data: {
            queue_id: validatedData.queue_id,
            org_id: user.org_id,
            to_email: validatedData.to,
            subject: validatedData.subject,
            status: 'SUCCESS',
            resend_id: data?.id || null,
            resend_status: 'queued', // Webhook経由で更新
            sent_at: new Date(),
          },
        });

        // キューのステータスを更新
        await prisma.email_queue.update({
          where: { id: validatedData.queue_id },
          data: {
            status: 'SENT',
            sent_at: new Date(),
          },
        });
      } catch (dbError) {
        console.error('[Email Send] Database error - email log/queue update:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      resend_id: data?.id,
      message: 'メール送信成功',
      remaining_limit: remaining - 1,
    })
  } catch (error) {
    console.error('[Email Send API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    )
  }
}


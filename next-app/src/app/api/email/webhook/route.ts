import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Resend Webhookイベントスキーマ
const resendWebhookSchema = z.object({
  type: z.enum([
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.complained',
    'email.bounced',
    'email.opened',
    'email.clicked',
  ]),
  created_at: z.string(),
  data: z.object({
    email_id: z.string(),
    from: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    created_at: z.string().optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    // Webhook署名検証（本番環境では必須）
    const signature = request.headers.get('svix-signature')
    const timestamp = request.headers.get('svix-timestamp')
    const webhookId = request.headers.get('svix-id')

    console.log('[Resend Webhook] 受信:', {
      signature: signature?.substring(0, 20) + '...',
      timestamp,
      webhookId,
    })

    // JSON パースエラーハンドリング
    let json;
    try {
      json = await request.json();
    } catch (parseError) {
      console.error('[Resend Webhook] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validatedData = resendWebhookSchema.parse(json)

    console.log('[Resend Webhook] イベント:', {
      type: validatedData.type,
      email_id: validatedData.data.email_id,
      to: validatedData.data.to,
    })

    // Resend IDでemail_logsを検索
    let emailLog;
    try {
      emailLog = await prisma.email_logs.findFirst({
        where: {
          resend_id: validatedData.data.email_id,
        },
      });
    } catch (dbError) {
      console.error('[Resend Webhook] Database error - email log fetch:', dbError);
      // 404を返すとResendが再送してしまうので、200を返す
      return NextResponse.json({ message: 'Database error, but acknowledged' });
    }

    if (!emailLog) {
      console.warn('[Resend Webhook] ⚠️ email_logsにレコードが見つかりません:', validatedData.data.email_id)
      // 404を返すとResendが再送してしまうので、200を返す
      return NextResponse.json({ message: 'Email log not found, but acknowledged' })
    }

    // イベントタイプに応じてステータスを更新
    const updates: any = {
      resend_status: mapResendStatus(validatedData.type),
    }

    switch (validatedData.type) {
      case 'email.delivered':
        // 配信成功
        break
      case 'email.bounced':
        // バウンス（エラー）
        updates.status = 'FAILED'
        updates.error_message = 'メールがバウンスしました'
        break
      case 'email.complained':
        // スパム報告
        updates.error_message = 'スパム報告されました'
        break
      case 'email.opened':
        // 開封
        updates.opened_at = new Date(validatedData.created_at)
        break
      case 'email.clicked':
        // クリック
        updates.clicked_at = new Date(validatedData.created_at)
        break
      default:
        // その他のイベントはログのみ
        console.log('[Resend Webhook] その他のイベント:', validatedData.type)
    }

    // email_logsを更新
    try {
      await prisma.email_logs.update({
        where: { id: emailLog.id },
        data: updates,
      });
    } catch (dbError) {
      console.error('[Resend Webhook] Database error - email log update:', dbError);
      // Webhookは200を返さないとResendが再送するので、エラーログだけ出して200を返す
      return NextResponse.json({ success: true, message: 'Error logged, but acknowledged' });
    }

    console.log('[Resend Webhook] ✅ email_logs更新完了:', emailLog.id)

    return NextResponse.json({ success: true, message: 'Webhook processed' })
  } catch (error) {
    console.error('[Resend Webhook API] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    // Webhookは200を返さないとResendが再送するので、エラーログだけ出して200を返す
    console.error('[Resend Webhook] エラーが発生しましたが200を返します:', (error as Error).message)
    return NextResponse.json({ success: true, message: 'Error logged, but acknowledged' })
  }
}

// ResendイベントタイプをDBのenumにマッピング
function mapResendStatus(eventType: string): string {
  const mapping: Record<string, string> = {
    'email.sent': 'queued',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'queued',
    'email.complained': 'complained',
    'email.bounced': 'bounced',
    'email.opened': 'delivered',
    'email.clicked': 'delivered',
  }
  return mapping[eventType] || 'sent'
}




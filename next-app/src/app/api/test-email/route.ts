/**
 * GET /api/test-email
 * メール送信テスト用エンドポイント
 * 
 * 使い方: http://localhost:3000/api/test-email?to=your-email@example.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendReminderEmail } from '@/lib/email/email-service'
import { isEmailEnabled } from '@/lib/email/resend-client'

export async function GET(request: NextRequest) {
  try {
    // メール機能が有効かチェック
    if (!isEmailEnabled) {
      return NextResponse.json({
        error: 'メール送信が無効です',
        message: 'RESEND_API_KEYを.env.localに設定してください',
      }, { status: 400 })
    }

    // クエリパラメータからメールアドレス取得（未指定の場合は環境変数から）
    const { searchParams } = new URL(request.url)
    const toEmail = searchParams.get('to') || process.env.EMAIL_TEST_RECIPIENT

    if (!toEmail) {
      return NextResponse.json({
        error: 'パラメータ不足',
        message: '?to=your-email@example.com を指定するか、.env.local に EMAIL_TEST_RECIPIENT を設定してください',
      }, { status: 400 })
    }

    // テストメール送信（DBに保存せず直接送信）
    console.log(`📧 テストメールを ${toEmail} に送信中...`)

    const { resend, EMAIL_CONFIG, RESEND_FROM_STRING } = await import('@/lib/email/resend-client')
    const { ReminderEmail } = await import('@/lib/email/templates')

    if (!resend) {
      return NextResponse.json({
        error: 'Resend未設定',
        message: 'RESEND_API_KEYを.env.localに設定してください',
      }, { status: 400 })
    }

    const html = ReminderEmail({
      hearingTitle: '【テスト】ヒアリング回答依頼',
      responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP'),
      daysRemaining: 7,
      targetCount: 5,
      hearingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/collector-hearings/test`,
      collectorName: 'テスト業者',
    })

    const result = await resend.emails.send({
      from: RESEND_FROM_STRING,
      to: toEmail,
      subject: '【テスト】ヒアリング回答リマインダー',
      html,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (result.data?.id) {
      return NextResponse.json({
        success: true,
        message: `✅ テストメールを ${toEmail} に送信しました！`,
        messageId: result.data.id,
        hint: 'メールボックスを確認してください（スパムフォルダも確認）',
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'メール送信失敗',
        details: result.error?.message || 'Unknown error',
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}


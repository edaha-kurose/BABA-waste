/**
 * Email Service
 * グローバルルール準拠:
 * - リトライポリシー（指数バックオフ、最大3回）
 * - DLQ（失敗ログをhearing_remindersに記録）
 * - Zodバリデーション
 * - Prismaトランザクション
 */

import { z } from 'zod'
import { resend, EMAIL_CONFIG, isEmailEnabled, RESEND_FROM_STRING } from './resend-client'
import { prisma } from '@/lib/prisma'
import {
  HearingNotificationEmail,
  ReminderEmail,
  UnlockRequestEmail,
  CommentNotificationEmail,
  getPlainTextVersion,
  type HearingNotificationEmailProps,
  type ReminderEmailProps,
  type UnlockRequestEmailProps,
  type CommentNotificationEmailProps,
} from './templates'

// ============================================================================
// Zodバリデーション
// ============================================================================

const EmailAddressSchema = z.string().email('有効なメールアドレスを指定してください')

const SendEmailSchema = z.object({
  to: EmailAddressSchema,
  subject: z.string().min(1, '件名は必須です'),
  html: z.string().min(1, 'HTML本文は必須です'),
  text: z.string().optional(),
})

type SendEmailInput = z.infer<typeof SendEmailSchema>

// ============================================================================
// メール送信（リトライ機能付き）
// ============================================================================

interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

async function sendEmailWithRetry(input: SendEmailInput): Promise<SendEmailResult> {
  const validated = SendEmailSchema.parse(input)

  // メール送信が無効な場合はスキップ
  if (!isEmailEnabled) {
    console.warn('⚠️ メール送信が無効です。RESEND_API_KEYを設定してください。')
    return { success: false, error: 'Email service not configured' }
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < EMAIL_CONFIG.maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: RESEND_FROM_STRING,
        to: validated.to,
        subject: validated.subject,
        html: validated.html,
        text: validated.text || getPlainTextVersion(validated.html),
        replyTo: EMAIL_CONFIG.replyTo,
      })

      if (result.data?.id) {
        return { success: true, messageId: result.data.id }
      }

      throw new Error('メール送信に失敗しました（IDなし）')
    } catch (error) {
      lastError = error as Error
      console.error(`メール送信失敗（試行${attempt + 1}/${EMAIL_CONFIG.maxRetries}）:`, error)

      // 最後の試行でなければリトライ
      if (attempt < EMAIL_CONFIG.maxRetries - 1) {
        const delay = EMAIL_CONFIG.retryDelayMs * Math.pow(2, attempt) // 指数バックオフ
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  return { success: false, error: lastError?.message || 'Unknown error' }
}

// ============================================================================
// ヒアリング通知メール送信
// ============================================================================

export async function sendHearingNotification(props: {
  hearing_id: string
  collector_id: string
  collectorEmail: string
  collectorName: string
  props: HearingNotificationEmailProps
}): Promise<SendEmailResult> {
  const html = HearingNotificationEmail(props.props)

  const result = await sendEmailWithRetry({
    to: props.collectorEmail,
    subject: `【ヒアリング依頼】${props.props.hearingTitle}`,
    html,
  })

  // 送信ログを記録（hearing_remindersに保存）
  // Note: reminder_typeを'NOTIFICATION'として記録
  await prisma.hearing_reminders.create({
    data: {
      hearing_id: props.hearing_id,
      collector_id: props.collector_id,
      reminder_type: 'NOTIFICATION',
      sent_at: result.success ? new Date() : null,
      status: result.success ? 'SENT' : 'FAILED',
      error_message: result.error || null,
    },
  })

  return result
}

// ============================================================================
// リマインダーメール送信
// ============================================================================

export async function sendReminderEmail(props: {
  hearing_id: string
  collector_id: string
  collectorEmail: string
  collectorName: string
  reminderType: '7_DAYS' | '3_DAYS' | '1_DAY'
  props: ReminderEmailProps
}): Promise<SendEmailResult> {
  const html = ReminderEmail(props.props)

  const result = await sendEmailWithRetry({
    to: props.collectorEmail,
    subject: `【リマインダー】${props.props.hearingTitle} - 回答期限まで残り${props.props.daysRemaining}日`,
    html,
  })

  // 送信ログを記録
  await prisma.hearing_reminders.create({
    data: {
      hearing_id: props.hearing_id,
      collector_id: props.collector_id,
      reminder_type: props.reminderType,
      sent_at: result.success ? new Date() : null,
      status: result.success ? 'SENT' : 'FAILED',
      error_message: result.error || null,
    },
  })

  return result
}

// ============================================================================
// ロック解除申請通知メール送信（管理者向け）
// ============================================================================

export async function sendUnlockRequestNotification(props: {
  adminEmails: string[]
  props: UnlockRequestEmailProps
}): Promise<SendEmailResult[]> {
  const html = UnlockRequestEmail(props.props)

  const results: SendEmailResult[] = []

  for (const email of props.adminEmails) {
    const result = await sendEmailWithRetry({
      to: email,
      subject: `【ロック解除申請】${props.props.hearingTitle}`,
      html,
    })
    results.push(result)
  }

  return results
}

// ============================================================================
// コメント追加通知メール送信
// ============================================================================

export async function sendCommentNotification(props: {
  recipientEmail: string
  props: CommentNotificationEmailProps
}): Promise<SendEmailResult> {
  const html = CommentNotificationEmail(props.props)

  return await sendEmailWithRetry({
    to: props.recipientEmail,
    subject: `【新しいコメント】${props.props.hearingTitle}`,
    html,
  })
}

// ============================================================================
// バッチ処理：リマインダー一括送信
// ============================================================================

export async function sendBatchReminders(params: {
  hearing_id: string
  reminderType: '7_DAYS' | '3_DAYS' | '1_DAY'
}): Promise<{
  total: number
  sent: number
  failed: number
  errors: string[]
}> {
  // ヒアリング情報を取得
  const hearing = await prisma.hearings.findUnique({
    where: { id: params.hearing_id },
    include: {
      hearing_targets: {
        where: {
          response_status: 'NOT_RESPONDED',
        },
        include: {
          collectors: {
            include: {
              users: true,
            },
          },
        },
      },
    },
  })

  if (!hearing) {
    throw new Error(`Hearing not found: ${params.hearing_id}`)
  }

  // 業者ごとにグループ化
  const collectorMap = new Map<string, { email: string; name: string; targetCount: number }>()

  for (const target of hearing.hearing_targets) {
    const collectorId = target.collector_id
    const email = (target.collectors.users as any).email
    const name = target.collectors.company_name

    if (!email) continue

    if (collectorMap.has(collectorId)) {
      collectorMap.get(collectorId)!.targetCount++
    } else {
      collectorMap.set(collectorId, { email, name, targetCount: 1 })
    }
  }

  // リマインダーを送信
  const results = {
    total: collectorMap.size,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  const daysRemaining =
    params.reminderType === '7_DAYS' ? 7 : params.reminderType === '3_DAYS' ? 3 : 1

  for (const [collectorId, info] of collectorMap.entries()) {
    const result = await sendReminderEmail({
      hearing_id: params.hearing_id,
      collector_id: collectorId,
      collectorEmail: info.email,
      collectorName: info.name,
      reminderType: params.reminderType,
      props: {
        hearingTitle: hearing.title,
        responseDeadline: hearing.response_deadline.toLocaleDateString('ja-JP'),
        daysRemaining,
        targetCount: info.targetCount,
        hearingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/collector-hearings/${params.hearing_id}/respond`,
        collectorName: info.name,
      },
    })

    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${info.name}: ${result.error}`)
    }
  }

  return results
}




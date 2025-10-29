import { prisma } from '@/lib/prisma'
import { RATE_LIMIT } from './resend-client'

/**
 * メール送信のRate Limit チェック
 * @param orgId 組織ID
 * @returns 送信可否と残り送信可能数
 */
export async function checkRateLimit(orgId: string): Promise<{
  allowed: boolean
  remaining: number
}> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // 過去1時間の送信数を取得
  const sentCount = await prisma.email_logs.count({
    where: {
      org_id: orgId,
      sent_at: {
        gte: oneHourAgo,
      },
    },
  })

  const remaining = RATE_LIMIT.MAX_EMAILS_PER_HOUR - sentCount
  const allowed = remaining > 0

  console.log('[Rate Limiter]', {
    orgId,
    sentCount,
    remaining,
    allowed,
    maxPerHour: RATE_LIMIT.MAX_EMAILS_PER_HOUR,
  })

  return { allowed, remaining }
}

/**
 * 日次Rate Limit チェック
 * @param orgId 組織ID
 * @returns 送信可否と残り送信可能数
 */
export async function checkDailyRateLimit(orgId: string): Promise<{
  allowed: boolean
  remaining: number
}> {
  const now = new Date()
  const startOfDay = new Date(now.setHours(0, 0, 0, 0))

  // 本日の送信数を取得
  const sentCount = await prisma.email_logs.count({
    where: {
      org_id: orgId,
      sent_at: {
        gte: startOfDay,
      },
    },
  })

  const remaining = RATE_LIMIT.MAX_EMAILS_PER_DAY - sentCount
  const allowed = remaining > 0

  console.log('[Daily Rate Limiter]', {
    orgId,
    sentCount,
    remaining,
    allowed,
    maxPerDay: RATE_LIMIT.MAX_EMAILS_PER_DAY,
  })

  return { allowed, remaining }
}

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not set - email sending will be disabled')
}

export const isEmailEnabled = !!process.env.RESEND_API_KEY

export const resend = isEmailEnabled
  ? new Resend(process.env.RESEND_API_KEY!)
  : null as any // 型エラー回避

export const DEFAULT_FROM = {
  name: 'BABA廃棄物管理システム',
  email: process.env.RESEND_FROM_EMAIL || 'noreply@baba-waste.com',
}

// Resend用のfrom文字列（"Name <email>"形式）
export const RESEND_FROM_STRING = `${DEFAULT_FROM.name} <${DEFAULT_FROM.email}>`

export const RATE_LIMIT = {
  MAX_EMAILS_PER_HOUR: 100,
  MAX_EMAILS_PER_DAY: 500,
}

export const EMAIL_CONFIG = {
  from: DEFAULT_FROM,
  replyTo: process.env.RESEND_REPLY_TO_EMAIL || 'support@baba-waste.com',
  rateLimit: RATE_LIMIT,
  maxRetries: 3,
  retryDelayMs: 60000, // 1分
  enabled: isEmailEnabled,
}

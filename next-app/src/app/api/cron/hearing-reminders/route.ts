import { NextRequest, NextResponse } from 'next/server'
import { sendHearingReminders } from '@/utils/hearing-batch-service'

/**
 * POST /api/cron/hearing-reminders
 * ヒアリングリマインダーを送信
 * 
 * Cronジョブとして定期実行（例: 毎日9:00）
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronの場合）
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting hearing reminders job')

    const result = await sendHearingReminders()

    console.log('[CRON] Hearing reminders job completed', result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Hearing reminders job failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}






import { NextRequest, NextResponse } from 'next/server'
import { autoLockExpiredTargets } from '@/utils/hearing-batch-service'

/**
 * POST /api/cron/hearing-auto-lock
 * 回答期限を過ぎたヒアリングを自動ロック
 * 
 * Cronジョブとして定期実行（例: 毎時0分）
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

    console.log('[CRON] Starting hearing auto-lock job')

    const result = await autoLockExpiredTargets()

    console.log('[CRON] Hearing auto-lock job completed', result)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Hearing auto-lock job failed:', error)
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






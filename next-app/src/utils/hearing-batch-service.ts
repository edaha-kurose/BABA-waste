import { prisma } from '@/lib/prisma'
import { sendBatchReminders } from '@/lib/email/email-service'

/**
 * 自動ロック処理
 * 回答期限を過ぎたヒアリングターゲットをLOCKED状態にする
 */
export async function autoLockExpiredTargets() {
  try {
    const now = new Date()

    // 回答期限を過ぎたACTIVE状態のヒアリングを取得
    const expiredHearings = await prisma.hearings.findMany({
      where: {
        status: 'ACTIVE',
        response_deadline: {
          lt: now,
        },
        // Note: deleted_at filtering handled by RLS
      },
      select: {
        id: true,
      },
    })

    if (expiredHearings.length === 0) {
      console.log('No expired hearings found')
      return { locked_count: 0 }
    }

    const hearingIds = expiredHearings.map((h) => h.id)

    // トランザクション
    const result = await prisma.$transaction(async (tx) => {
      // ターゲットをLOCKED状態に変更
      const updatedTargets = await tx.hearing_targets.updateMany({
        where: {
          hearing_id: {
            in: hearingIds,
          },
          response_status: {
            in: ['NOT_RESPONDED', 'RESPONDED'],
          },
        },
        data: {
          response_status: 'LOCKED',
        },
      })

      // ヒアリングをLOCKED状態に変更
      await tx.hearings.updateMany({
        where: {
          id: {
            in: hearingIds,
          },
        },
        data: {
          status: 'LOCKED',
        },
      })

      return updatedTargets
    })

    console.log(`Auto-locked ${result.count} targets`)
    return { locked_count: result.count }
  } catch (error) {
    console.error('Failed to auto-lock expired targets:', error)
    throw error
  }
}

/**
 * リマインダー送信処理
 * 期限の7日前、3日前、1日前に未回答者にリマインダーを送信
 */
export async function sendHearingReminders() {
  try {
    const now = new Date()

    // 7日後、3日後、1日後の日時を計算
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

    const reminderTypes: Array<{
      type: 'WEEK_BEFORE' | 'THREE_DAYS_BEFORE' | 'ONE_DAY_BEFORE'
      targetDate: Date
    }> = [
      { type: 'WEEK_BEFORE', targetDate: sevenDaysLater },
      { type: 'THREE_DAYS_BEFORE', targetDate: threeDaysLater },
      { type: 'ONE_DAY_BEFORE', targetDate: oneDayLater },
    ]

    let totalSent = 0

    for (const { type, targetDate } of reminderTypes) {
      // 対象のヒアリングを取得（回答期限がtargetDateの範囲内）
      const targetHearings = await prisma.hearings.findMany({
        where: {
          status: 'ACTIVE',
          response_deadline: {
            gte: new Date(targetDate.getTime() - 1 * 60 * 60 * 1000), // -1時間
            lte: new Date(targetDate.getTime() + 1 * 60 * 60 * 1000), // +1時間
          },
          // Note: deleted_at filtering handled by RLS
        },
        select: {
          id: true,
          title: true,
          response_deadline: true,
        },
      })

      for (const hearing of targetHearings) {
        // 未回答のターゲットを取得
        const notRespondedTargets = await prisma.hearing_targets.findMany({
          where: {
            hearing_id: hearing.id,
            response_status: 'NOT_RESPONDED',
          },
          select: {
            id: true,
            collector_id: true,
          },
        })

        // 業者ごとにグループ化
        const collectorTargetsMap = notRespondedTargets.reduce((acc, target) => {
          if (!acc[target.collector_id]) {
            acc[target.collector_id] = []
          }
          acc[target.collector_id].push(target.id)
          return acc
        }, {} as Record<string, string[]>)

        // 業者ごとにリマインダーを作成
        for (const collectorId of Object.keys(collectorTargetsMap)) {
          // 既に送信済みか確認
          const existingReminder = await prisma.hearing_reminders.findFirst({
            where: {
              hearing_id: hearing.id,
              collector_id: collectorId,
              reminder_type: type,
            },
          })

          if (existingReminder) {
            console.log(
              `Reminder already sent for hearing ${hearing.id}, collector ${collectorId}, type ${type}`
            )
            continue
          }

          // メール送信（リマインダーレコードは email-service 内で作成される）
          const reminderTypeMap: Record<string, '7_DAYS' | '3_DAYS' | '1_DAY'> = {
            WEEK_BEFORE: '7_DAYS',
            THREE_DAYS_BEFORE: '3_DAYS',
            ONE_DAY_BEFORE: '1_DAY',
          }

          try {
            await sendBatchReminders({
              hearing_id: hearing.id,
              reminderType: reminderTypeMap[type],
            })
            totalSent++
          } catch (error) {
            console.error(`Failed to send reminder for hearing ${hearing.id}:`, error)
            // エラーログを記録
            await prisma.hearing_reminders.create({
              data: {
                hearing_id: hearing.id,
                collector_id: collectorId,
                reminder_type: type,
                status: 'FAILED',
                error_message: error instanceof Error ? error.message : 'Unknown error',
              },
            })
          }
        }
      }
    }

    console.log(`Sent ${totalSent} reminders`)
    return { sent_count: totalSent }
  } catch (error) {
    console.error('Failed to send hearing reminders:', error)
    throw error
  }
}

// メール送信機能は @/lib/email/email-service に統合されました


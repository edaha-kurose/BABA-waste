// ============================================================================
// 通知サービス
// 作成日: 2025-09-16
// 目的: 廃棄依頼割当通知の送信管理（設定化対応）
// ============================================================================

import { getAppConfig } from '@/config/app-config'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { UserRepository } from '@/modules/users/repository'
import type { CollectionRequest, StoreCollectorAssignment, User } from '@contracts/v0/schema'

export interface NotificationData {
  collectorId: string
  collectorName: string
  collectorEmail: string
  requests: CollectionRequest[]
  storeNames: string[]
}

export class NotificationService {
  private static instance: NotificationService
  private config = getAppConfig()

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // 通知設定の有効性チェック
  isNotificationEnabled(): boolean {
    return this.config.notification.enabled
  }

  // デモ収集業者のメールアドレス判定
  private isDemoCollector(email: string): boolean {
    return email === this.config.notification.testEmail
  }

  // 通知データの準備
  async prepareNotificationData(requests: CollectionRequest[]): Promise<NotificationData[]> {
    if (!this.isNotificationEnabled()) {
      return []
    }

    const assignmentRepo = StoreCollectorAssignmentRepository
    const userRepo = UserRepository

    // 収集業者ごとにグループ化
    const collectorGroups = new Map<string, CollectionRequest[]>()
    
    for (const request of requests) {
      if (!request.collector_id) continue

      const assignments = await assignmentRepo.findMany({ 
        collector_id: request.collector_id,
        store_id: request.store_id 
      })
      
      if (assignments.length === 0) continue

      const collectorId = request.collector_id
      if (!collectorGroups.has(collectorId)) {
        collectorGroups.set(collectorId, [])
      }
      collectorGroups.get(collectorId)!.push(request)
    }

    // 通知データの構築
    const notificationData: NotificationData[] = []
    
    for (const [collectorId, collectorRequests] of collectorGroups) {
      const collector = await userRepo.findById(collectorId)
      if (!collector) continue

      // 店舗名の取得
      const storeNames = await Promise.all(
        collectorRequests.map(async (req) => {
          const assignments = await assignmentRepo.findMany({ 
            collector_id: collectorId,
            store_id: req.store_id 
          })
          return assignments[0]?.store_name || '不明な店舗'
        })
      )

      notificationData.push({
        collectorId,
        collectorName: collector.name || collector.company_name || '不明な業者',
        collectorEmail: this.isDemoCollector(collector.email || '') 
          ? this.config.notification.testEmail 
          : collector.email || '',
        requests: collectorRequests,
        storeNames: [...new Set(storeNames)] // 重複除去
      })
    }

    return notificationData
  }

  // 通知メールの送信（モック実装）
  async sendNotification(data: NotificationData): Promise<boolean> {
    if (!this.isNotificationEnabled()) {
      console.log('通知が無効化されています')
      return false
    }

    try {
      // 実際の実装では、ここでメール送信APIを呼び出し
      console.log('=== 通知メール送信 ===')
      console.log(`送信先: ${data.collectorEmail}`)
      console.log(`業者名: ${data.collectorName}`)
      console.log(`対象店舗: ${data.storeNames.join(', ')}`)
      console.log(`依頼件数: ${data.requests.length}件`)
      console.log(`システムURL: ${this.config.notification.baseUrl}`)
      console.log('==================')

      // モック成功
      return true
    } catch (error) {
      console.error('通知送信エラー:', error)
      return false
    }
  }

  // 一括通知送信
  async sendBulkNotifications(requests: CollectionRequest[]): Promise<{
    success: number
    failed: number
    total: number
  }> {
    const notificationData = await this.prepareNotificationData(requests)
    let success = 0
    let failed = 0

    for (const data of notificationData) {
      const result = await this.sendNotification(data)
      if (result) {
        success++
      } else {
        failed++
      }
    }

    return {
      success,
      failed,
      total: notificationData.length
    }
  }

  // スケジュール送信（22:00 JST）
  scheduleDailyNotifications(): void {
    if (!this.isNotificationEnabled()) {
      return
    }

    const now = new Date()
    const sendHour = this.config.notification.dailySendHourJST
    const timezone = this.config.timezone

    // 東京時間での22:00を計算
    const today = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const scheduledTime = new Date(today)
    scheduledTime.setHours(sendHour, 0, 0, 0)

    // 既に22:00を過ぎている場合は翌日
    if (now > scheduledTime) {
      scheduledTime.setDate(scheduledTime.getDate() + 1)
    }

    const delay = scheduledTime.getTime() - now.getTime()

    console.log(`通知送信をスケジュール: ${scheduledTime.toLocaleString('ja-JP', { timeZone: timezone })}`)

    setTimeout(async () => {
      await this.processDailyNotifications()
    }, delay)
  }

  // 日次通知処理
  private async processDailyNotifications(): Promise<void> {
    try {
      // 当日の割当決定済み依頼を取得
      const today = new Date().toISOString().split('T')[0]
      const requests = await CollectionRequestRepository.findMany({
        status: 'CONFIRMED',
        // 実際の実装では、割当決定日でフィルタリング
      })

      if (requests.length === 0) {
        console.log('送信対象の依頼がありません')
        return
      }

      const result = await this.sendBulkNotifications(requests)
      console.log(`日次通知送信完了: 成功${result.success}件, 失敗${result.failed}件`)

      // 翌日のスケジュールを設定
      this.scheduleDailyNotifications()
    } catch (error) {
      console.error('日次通知処理エラー:', error)
    }
  }

  // テスト送信
  async sendTestNotification(): Promise<boolean> {
    const testData: NotificationData = {
      collectorId: 'test-collector',
      collectorName: 'テスト収集業者',
      collectorEmail: this.config.notification.testEmail,
      requests: [],
      storeNames: ['テスト店舗1', 'テスト店舗2']
    }

    return await this.sendNotification(testData)
  }
}

// シングルトンインスタンスのエクスポート
export const notificationService = NotificationService.getInstance()

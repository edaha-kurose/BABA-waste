import { CollectorRepository } from '@/modules/collectors/repository'
import { StoreRepository } from '@/modules/stores/repository'
import type { Collector, Store } from '@contracts/v0/schema'

export interface TempRegistrationAlert {
  id: string
  type: 'collector' | 'store'
  name: string
  code: string
  reason: string
  created_at: string
  priority: 'high' | 'medium' | 'low'
}

export interface TempRegistrationStats {
  totalTemporary: number
  temporaryCollectors: number
  temporaryStores: number
  highPriorityAlerts: number
  mediumPriorityAlerts: number
  lowPriorityAlerts: number
}

export class TempRegistrationAlertService {
  // 仮登録業者・店舗のアラート一覧を取得
  async getTempRegistrationAlerts(): Promise<TempRegistrationAlert[]> {
    try {
      const [collectors, stores] = await Promise.all([
        CollectorRepository.findMany(),
        StoreRepository.findMany()
      ])

      const alerts: TempRegistrationAlert[] = []

      // 仮登録業者のアラート
      collectors
        .filter(c => c.is_temporary)
        .forEach(collector => {
          alerts.push({
            id: collector.id,
            type: 'collector',
            name: collector.name,
            code: collector.company_name,
            reason: collector.temp_created_reason || 'CSV取り込み時に自動作成',
            created_at: collector.created_at,
            priority: this.getPriority(collector.created_at)
          })
        })

      // 仮登録店舗のアラート
      stores
        .filter(s => s.is_temporary)
        .forEach(store => {
          alerts.push({
            id: store.id,
            type: 'store',
            name: store.name,
            code: store.store_code,
            reason: store.temp_created_reason || 'CSV取り込み時に自動作成',
            created_at: store.created_at,
            priority: this.getPriority(store.created_at)
          })
        })

      // 作成日時でソート（新しい順）
      return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (error) {
      console.error('仮登録アラート取得エラー:', error)
      return []
    }
  }

  // 仮登録統計を取得
  async getTempRegistrationStats(): Promise<TempRegistrationStats> {
    try {
      const [collectors, stores] = await Promise.all([
        CollectorRepository.findMany(),
        StoreRepository.findMany()
      ])

      const tempCollectors = collectors.filter(c => c.is_temporary)
      const tempStores = stores.filter(s => s.is_temporary)
      const allTemp = [...tempCollectors, ...tempStores]

      const priorityCounts = allTemp.reduce((acc, item) => {
        const priority = this.getPriority(item.created_at)
        acc[priority] = (acc[priority] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalTemporary: allTemp.length,
        temporaryCollectors: tempCollectors.length,
        temporaryStores: tempStores.length,
        highPriorityAlerts: priorityCounts.high || 0,
        mediumPriorityAlerts: priorityCounts.medium || 0,
        lowPriorityAlerts: priorityCounts.low || 0
      }
    } catch (error) {
      console.error('仮登録統計取得エラー:', error)
      return {
        totalTemporary: 0,
        temporaryCollectors: 0,
        temporaryStores: 0,
        highPriorityAlerts: 0,
        mediumPriorityAlerts: 0,
        lowPriorityAlerts: 0
      }
    }
  }

  // 仮登録を正式登録に変換
  async convertToPermanent(
    id: string, 
    type: 'collector' | 'store', 
    updateData: Partial<Collector> | Partial<Store>
  ): Promise<boolean> {
    try {
      if (type === 'collector') {
        await CollectorRepository.update(id, {
          ...updateData as Partial<Collector>,
          is_temporary: false,
          temp_created_reason: undefined
        })
      } else if (type === 'store') {
        await StoreRepository.update(id, {
          ...updateData as Partial<Store>,
          is_temporary: false,
          temp_created_reason: undefined
        })
      }
      return true
    } catch (error) {
      console.error('正式登録変換エラー:', error)
      return false
    }
  }

  // 仮登録を削除
  async deleteTemporary(id: string, type: 'collector' | 'store'): Promise<boolean> {
    try {
      if (type === 'collector') {
        await CollectorRepository.delete(id)
      } else if (type === 'store') {
        await StoreRepository.delete(id)
      }
      return true
    } catch (error) {
      console.error('仮登録削除エラー:', error)
      return false
    }
  }

  // 作成日時から優先度を決定
  private getPriority(createdAt: string): 'high' | 'medium' | 'low' {
    const created = new Date(createdAt)
    const now = new Date()
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff >= 7) return 'high'      // 7日以上前
    if (daysDiff >= 3) return 'medium'    // 3-6日前
    return 'low'                          // 3日未満
  }

  // 優先度に応じた色を取得
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '#ff4d4f'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }

  // 優先度に応じたテキストを取得
  getPriorityText(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return '不明'
    }
  }
}

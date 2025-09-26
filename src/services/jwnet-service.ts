// ============================================================================
// JWNET連携サービス
// 作成日: 2025-09-16
// 目的: JWNET WebEDIとの連携処理（モック実装）
// ============================================================================

import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { CollectionRepository } from '@/modules/collections/repository'
import { JwnetReservationRepository } from '@/modules/jwnet-reservations/repository'
import { JwnetRegistrationRepository } from '@/modules/jwnet-registrations/repository'
import { getAppConfig } from '@/config/app-config'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import type { CollectionRequest, Collection, JwnetReservation, JwnetRegistration } from '@contracts/v0/schema'

export interface JwnetSubmissionResult {
  success: boolean
  jwnetId: string
  status: string
  message: string
  manifestNo?: string
  submittedAt: string
}

export class JwnetService {
  private static instance: JwnetService
  private baseUrl: string

  constructor() {
    // モック用のJWNETサーバーURL（実際の実装では環境変数から取得）
    this.baseUrl = getAppConfig().notification.baseUrl + '/api/jwnet'
  }

  static getInstance(): JwnetService {
    if (!JwnetService.instance) {
      JwnetService.instance = new JwnetService()
    }
    return JwnetService.instance
  }

  /**
   * 予約登録をJWNETに送信
   */
  async submitReservation(collectionRequestId: string): Promise<JwnetSubmissionResult> {
    try {
      // 依頼データを取得
      const request = await CollectionRequestRepository.findById(collectionRequestId)
      if (!request) {
        throw new Error('Collection request not found')
      }

      // 関連データを取得
      const [store, collector, plan] = await Promise.all([
        StoreRepository.findById(request.store_id),
        CollectorRepository.findById(request.collector_id),
        PlanRepository.findById(request.plan_id)
      ])

      if (!store || !collector || !plan) {
        throw new Error('Required data not found')
      }

      // JWNET予約データを準備
      const jwnetData = {
        emitter: {
          name: store.name,
          address: store.address,
          emitter_no: store.emitter_no,
        },
        transporter: {
          name: collector.company_name,
          license_no: collector.license_number,
        },
        waste: {
          kind: plan.item_name,
          quantity: plan.planned_quantity,
          unit: plan.unit,
        },
        pickup_date: request.confirmed_pickup_date || request.requested_pickup_date,
        pickup_time: request.confirmed_pickup_time,
      }

      // モック送信（実際の実装ではHTTPリクエスト）
      const mockResult = await this.mockJwnetSubmission('reservation', jwnetData)

      // 予約登録レコードを作成
      const jwnetReservation = await JwnetReservationRepository.create({
        org_id: request.org_id,
        collection_request_id: collectionRequestId,
        jwnet_reservation_id: mockResult.jwnetId,
        status: mockResult.status as any,
        submitted_at: mockResult.submittedAt,
        manifest_no: mockResult.manifestNo,
        jwnet_response: mockResult,
      })

      // 依頼のステータスを更新
      await CollectionRequestRepository.update(collectionRequestId, {
        jwnet_reservation_id: mockResult.jwnetId,
      })

      return mockResult

    } catch (error) {
      console.error('JWNET reservation submission failed:', error)
      throw error
    }
  }

  /**
   * 本登録をJWNETに送信
   */
  async submitRegistration(collectionId: string): Promise<JwnetSubmissionResult> {
    try {
      // 収集実績データを取得
      const collection = await CollectionRepository.findById(collectionId)
      if (!collection) {
        throw new Error('Collection not found')
      }

      // 依頼データを取得
      const request = await CollectionRequestRepository.findById(collection.collection_request_id)
      if (!request) {
        throw new Error('Collection request not found')
      }

      // 関連データを取得
      const [store, collector, plan] = await Promise.all([
        StoreRepository.findById(request.store_id),
        CollectorRepository.findById(request.collector_id),
        PlanRepository.findById(request.plan_id)
      ])

      if (!store || !collector || !plan) {
        throw new Error('Required data not found')
      }

      // JWNET本登録データを準備
      const jwnetData = {
        emitter: {
          name: store.name,
          address: store.address,
          emitter_no: store.emitter_no,
        },
        transporter: {
          name: collector.company_name,
          license_no: collector.license_number,
        },
        waste: {
          kind: plan.item_name,
          quantity: collection.actual_quantity,
          unit: collection.unit,
        },
        actual_pickup_date: collection.actual_pickup_date,
        actual_pickup_time: collection.actual_pickup_time,
        driver_name: collection.driver_name,
        vehicle_number: collection.vehicle_number,
      }

      // モック送信（実際の実装ではHTTPリクエスト）
      const mockResult = await this.mockJwnetSubmission('registration', jwnetData)

      // 本登録レコードを作成
      const jwnetRegistration = await JwnetRegistrationRepository.create({
        org_id: collection.org_id,
        collection_id: collectionId,
        jwnet_registration_id: mockResult.jwnetId,
        status: mockResult.status as any,
        submitted_at: mockResult.submittedAt,
        manifest_no: mockResult.manifestNo,
        jwnet_response: mockResult,
      })

      // 収集実績のステータスを更新
      await CollectionRepository.update(collectionId, {
        jwnet_registration_id: mockResult.jwnetId,
      })

      return mockResult

    } catch (error) {
      console.error('JWNET registration submission failed:', error)
      throw error
    }
  }

  /**
   * JWNETステータスを確認
   */
  async checkStatus(jwnetId: string, type: 'reservation' | 'registration'): Promise<JwnetSubmissionResult> {
    try {
      // モック確認（実際の実装ではHTTPリクエスト）
      const mockResult = await this.mockJwnetStatusCheck(jwnetId, type)

      // データベースを更新
      if (type === 'reservation') {
        const reservation = await JwnetReservationRepository.findAll()
        const targetReservation = reservation.find(r => r.jwnet_reservation_id === jwnetId)
        if (targetReservation) {
          await JwnetReservationRepository.update(targetReservation.id, {
            status: mockResult.status as any,
            accepted_at: mockResult.status === 'ACCEPTED' ? mockResult.submittedAt : undefined,
            rejected_at: mockResult.status === 'REJECTED' ? mockResult.submittedAt : undefined,
            error_message: mockResult.status === 'ERROR' ? mockResult.message : undefined,
            manifest_no: mockResult.manifestNo,
          })
        }
      } else {
        const registration = await JwnetRegistrationRepository.findAll()
        const targetRegistration = registration.find(r => r.jwnet_registration_id === jwnetId)
        if (targetRegistration) {
          await JwnetRegistrationRepository.update(targetRegistration.id, {
            status: mockResult.status as any,
            accepted_at: mockResult.status === 'ACCEPTED' ? mockResult.submittedAt : undefined,
            rejected_at: mockResult.status === 'REJECTED' ? mockResult.submittedAt : undefined,
            error_message: mockResult.status === 'ERROR' ? mockResult.message : undefined,
            manifest_no: mockResult.manifestNo,
          })
        }
      }

      return mockResult

    } catch (error) {
      console.error('JWNET status check failed:', error)
      throw error
    }
  }

  /**
   * モック送信処理
   */
  private async mockJwnetSubmission(type: 'reservation' | 'registration', data: any): Promise<JwnetSubmissionResult> {
    // モック処理（実際の実装ではHTTPリクエスト）
    await new Promise(resolve => setTimeout(resolve, 1000)) // 1秒待機

    const jwnetId = `JWN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    const manifestNo = `MF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 90%の確率で成功、10%の確率でエラー
    const isSuccess = Math.random() > 0.1

    return {
      success: isSuccess,
      jwnetId,
      status: isSuccess ? 'ACCEPTED' : 'ERROR',
      message: isSuccess ? `${type} submitted successfully` : 'Mock error occurred',
      manifestNo: isSuccess ? manifestNo : undefined,
      submittedAt: new Date().toISOString(),
    }
  }

  /**
   * モックステータス確認
   */
  private async mockJwnetStatusCheck(jwnetId: string, type: 'reservation' | 'registration'): Promise<JwnetSubmissionResult> {
    // モック処理（実際の実装ではHTTPリクエスト）
    await new Promise(resolve => setTimeout(resolve, 500)) // 0.5秒待機

    const statuses = ['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'ERROR']
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]

    return {
      success: randomStatus !== 'ERROR',
      jwnetId,
      status: randomStatus,
      message: `Status check completed: ${randomStatus}`,
      manifestNo: randomStatus === 'ACCEPTED' || randomStatus === 'COMPLETED' ? `MF${Date.now()}` : undefined,
      submittedAt: new Date().toISOString(),
    }
  }
}

export const jwnetService = JwnetService.getInstance()




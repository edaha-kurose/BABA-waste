// ============================================================================
// JWNETクライアント
// 目的: JWNET API連携（予約・本登録）
// ============================================================================

import { z } from 'zod'

// ✅ JWNET APIレスポンススキーマ
const JWNETRegisterResponseSchema = z.object({
  result: z.enum(['SUCCESS', 'ERROR']),
  manifest_number: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
})

export type JWNETRegisterResponse = z.infer<typeof JWNETRegisterResponseSchema>

export interface ManifestData {
  manifestNumber: string
  wasteName: string
  wasteType: string
  quantity: number
  unit: string
  constructionSlipNumber?: string
  hCode?: string
}

export interface ManifestRegisterResult {
  result: 'SUCCESS' | 'ERROR'
  manifest_number?: string
  error_code?: string
  error_message?: string
}

export class JWNETClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly subscriberNo: string

  constructor() {
    // ✅ 環境変数から秘密情報を取得（サーバーサイドのみ）
    this.apiKey = process.env.JWNET_API_KEY || ''
    this.baseUrl = process.env.JWNET_API_URL || ''
    this.subscriberNo = process.env.JWNET_SUBSCRIBER_NO || ''

    if (!this.apiKey || !this.baseUrl || !this.subscriberNo) {
      console.warn('⚠️ JWNET credentials not fully configured')
    }
  }

  /**
   * マニフェスト登録（1501）
   */
  async registerManifest(data: ManifestData): Promise<ManifestRegisterResult> {
    const payload = {
      function_code: '1501',
      subscriber_no: this.subscriberNo,
      ...this.transformToJWNETFormat(data),
    }

    // ✅ リトライロジック付き
    const response = await this.request('/manifest/register', payload, {
      retries: 3,
      backoff: 'exponential',
    })

    // ✅ レスポンスバリデーション
    return JWNETRegisterResponseSchema.parse(response)
  }

  /**
   * マニフェストステータス確認（2001）
   */
  async getManifestStatus(manifestNumber: string): Promise<{
    status: string
    manifest_number: string
  }> {
    const payload = {
      function_code: '2001',
      subscriber_no: this.subscriberNo,
      manifest_number: manifestNumber,
    }

    const response = await this.request('/manifest/status', payload, {
      retries: 2,
      backoff: 'linear',
    })

    return {
      status: response.status || 'UNKNOWN',
      manifest_number: manifestNumber,
    }
  }

  /**
   * JWNETフォーマットへの変換
   */
  private transformToJWNETFormat(data: ManifestData) {
    return {
      manifest_number: data.manifestNumber,
      waste_name: data.wasteName,
      waste_type: data.wasteType,
      quantity: data.quantity,
      unit: data.unit,
      // 備考1: 工事伝票番号
      remarks_1: data.constructionSlipNumber || '',
      // 連絡2: Hコード
      contact_2: data.hCode || '',
      // 連絡3: 固定値 'ED01'
      contact_3: 'ED01',
    }
  }

  /**
   * HTTP リクエスト（リトライ付き）
   */
  private async request(
    endpoint: string,
    payload: unknown,
    options: { retries: number; backoff: 'exponential' | 'linear' }
  ): Promise<any> {
    let lastError: Error | null = null

    for (let i = 0; i < options.retries; i++) {
      try {
        // ✅ 開発環境ではモックレスポンスを返す
        if (process.env.NODE_ENV === 'development' || !this.apiKey) {
          console.log('📝 [JWNET Mock] Request:', endpoint, payload)
          return this.getMockResponse(endpoint)
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-Subscriber-No': this.subscriberNo,
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`JWNET API error: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error

        // 最後の試行でなければ待機
        if (i < options.retries - 1) {
          const delay =
            options.backoff === 'exponential' ? Math.pow(2, i) * 1000 : (i + 1) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw new Error(`JWNET API failed after ${options.retries} retries: ${lastError?.message}`)
  }

  /**
   * モックレスポンス（開発用）
   */
  private getMockResponse(endpoint: string): any {
    if (endpoint.includes('register')) {
      return {
        result: 'SUCCESS',
        manifest_number: `MF-${Date.now()}`,
      }
    }

    if (endpoint.includes('status')) {
      return {
        status: 'REGISTERED',
        manifest_number: 'MF-12345678901',
      }
    }

    return {
      result: 'SUCCESS',
    }
  }
}

// ✅ シングルトンインスタンス
export const jwnetClient = new JWNETClient()








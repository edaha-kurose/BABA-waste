/**
 * JWNET API クライアント
 * 
 * 日本の産業廃棄物情報ネットワーク (JWNET) API との通信を行うクライアント
 */

import {
  JwnetConfig,
  JwnetApiError,
  ManifestRegisterRequest,
  ManifestRegisterResponse,
  ReservationRequest,
  ReservationResponse,
  ManifestInquiryRequest,
  ManifestInquiryResponse,
} from '@/types/jwnet';

/**
 * JWNET API クライアント
 */
export class JwnetClient {
  private config: Required<JwnetConfig>;

  constructor(config: JwnetConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000, // デフォルト 30秒
      maxRetries: config.maxRetries ?? 3, // デフォルト 3回
    };
  }

  /**
   * マニフェストを登録
   */
  async registerManifest(
    request: ManifestRegisterRequest
  ): Promise<ManifestRegisterResponse> {
    return this.request<ManifestRegisterResponse>('/manifest/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 予約番号を取得
   */
  async reserveNumbers(
    request: ReservationRequest
  ): Promise<ReservationResponse> {
    return this.request<ReservationResponse>('/reservation/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * マニフェストを照会
   */
  async inquireManifest(
    request: ManifestInquiryRequest
  ): Promise<ManifestInquiryResponse> {
    return this.request<ManifestInquiryResponse>('/manifest/inquiry', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * JWNET API にリクエストを送信
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-JWNET-API-Key': this.config.apiKey,
          'X-JWNET-Subscriber-No': this.config.subscriberNo,
          'X-JWNET-Public-Confirm-No': this.config.publicConfirmNo,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData: any;

        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { message: errorBody };
        }

        throw new JwnetApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.errorCode,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      // タイムアウトまたはネットワークエラーの場合、リトライ
      if (
        retryCount < this.config.maxRetries &&
        this.isRetryableError(error)
      ) {
        const delay = this.calculateRetryDelay(retryCount);
        console.warn(
          `[JWNET] Retrying request to ${endpoint} (attempt ${retryCount + 1}/${this.config.maxRetries}) after ${delay}ms`
        );
        await this.sleep(delay);
        return this.request<T>(endpoint, options, retryCount + 1);
      }

      // リトライ上限到達またはリトライ不可能なエラー
      if (error instanceof JwnetApiError) {
        throw error;
      }

      throw new JwnetApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'NETWORK_ERROR',
        undefined,
        error
      );
    }
  }

  /**
   * エラーがリトライ可能かチェック
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof JwnetApiError) {
      // 500番台のエラーまたはタイムアウトはリトライ可能
      return (
        (error.statusCode !== undefined && error.statusCode >= 500) ||
        error.errorCode === 'NETWORK_ERROR' ||
        error.message.includes('timeout') ||
        error.message.includes('abort')
      );
    }

    // その他のエラーもネットワーク関連であればリトライ
    return (
      error instanceof Error &&
      (error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout'))
    );
  }

  /**
   * リトライ遅延時間を計算（指数バックオフ）
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1秒
    const maxDelay = 10000; // 10秒
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    // ジッターを追加（0〜20%のランダムな遅延）
    const jitter = delay * 0.2 * Math.random();
    return delay + jitter;
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * API 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      // ヘルスチェックエンドポイントを呼び出し
      await this.request('/health', { method: 'GET' });
      return true;
    } catch (error) {
      console.error('[JWNET] Connection test failed:', error);
      return false;
    }
  }
}

/**
 * JWNET クライアントのシングルトンインスタンス
 */
let jwnetClientInstance: JwnetClient | null = null;

/**
 * JWNET クライアントを取得
 */
export function getJwnetClient(): JwnetClient {
  if (!jwnetClientInstance) {
    // 環境変数から設定を読み込み
    const config: JwnetConfig = {
      apiUrl: process.env.JWNET_API_URL || '',
      apiKey: process.env.JWNET_API_KEY || '',
      subscriberNo: process.env.JWNET_SUBSCRIBER_NO || '',
      publicConfirmNo: process.env.JWNET_PUBLIC_CONFIRM_NO || '',
    };

    // 必須パラメータのバリデーション
    if (!config.apiUrl) {
      throw new Error('JWNET_API_URL environment variable is not set');
    }
    if (!config.apiKey) {
      throw new Error('JWNET_API_KEY environment variable is not set');
    }
    if (!config.subscriberNo) {
      throw new Error('JWNET_SUBSCRIBER_NO environment variable is not set');
    }
    if (!config.publicConfirmNo) {
      throw new Error('JWNET_PUBLIC_CONFIRM_NO environment variable is not set');
    }

    jwnetClientInstance = new JwnetClient(config);
  }

  return jwnetClientInstance;
}

/**
 * JWNET クライアントのモックを設定（テスト用）
 */
export function setJwnetClientMock(client: JwnetClient | null): void {
  jwnetClientInstance = client;
}


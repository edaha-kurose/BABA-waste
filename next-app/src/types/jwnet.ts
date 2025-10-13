/**
 * JWNET API 型定義
 * 
 * 日本の産業廃棄物情報ネットワーク (JWNET) API の型定義
 * 参考: https://www.jwnet.or.jp/
 */

/**
 * マニフェスト種別
 */
export enum ManifestType {
  /** 産業廃棄物 */
  INDUSTRIAL = 'INDUSTRIAL',
  /** 特別管理産業廃棄物 */
  SPECIAL = 'SPECIAL',
}

/**
 * マニフェスト状態
 */
export enum ManifestStatus {
  /** 下書き */
  DRAFT = 'DRAFT',
  /** 登録済み */
  REGISTERED = 'REGISTERED',
  /** 運搬中 */
  IN_TRANSIT = 'IN_TRANSIT',
  /** 処分場到着 */
  ARRIVED = 'ARRIVED',
  /** 処分完了 */
  DISPOSED = 'DISPOSED',
  /** キャンセル */
  CANCELLED = 'CANCELLED',
  /** エラー */
  ERROR = 'ERROR',
}

/**
 * JWNET 事業者情報
 */
export interface JwnetCompany {
  /** 加入者番号 (7桁) */
  subscriberNo: string;
  /** 公開確認番号 (6桁) */
  publicConfirmNo: string;
  /** 事業者名 */
  name: string;
  /** 郵便番号 */
  postalCode: string;
  /** 住所 */
  address: string;
  /** 電話番号 */
  phoneNumber?: string;
  /** FAX番号 */
  faxNumber?: string;
}

/**
 * 廃棄物情報
 */
export interface WasteInfo {
  /** 廃棄物コード */
  wasteCode: string;
  /** 廃棄物名称 */
  wasteName: string;
  /** 数量 */
  quantity: number;
  /** 単位 (kg, L, m3, etc.) */
  unit: string;
  /** 荷姿 */
  packagingType?: string;
}

/**
 * マニフェスト登録リクエスト
 */
export interface ManifestRegisterRequest {
  /** マニフェスト種別 */
  manifestType: ManifestType;
  /** 交付年月日 */
  issuedDate: string; // ISO 8601 format
  /** 排出事業者 */
  emitter: JwnetCompany;
  /** 運搬受託者 */
  transporter: JwnetCompany;
  /** 処分受託者 */
  disposer: JwnetCompany;
  /** 廃棄物情報 */
  wastes: WasteInfo[];
  /** 運搬終了年月日 (予定) */
  transportEndDate?: string;
  /** 処分終了年月日 (予定) */
  disposalEndDate?: string;
  /** 備考 */
  remarks?: string;
}

/**
 * マニフェスト登録レスポンス
 */
export interface ManifestRegisterResponse {
  /** 成功フラグ */
  success: boolean;
  /** マニフェスト番号 */
  manifestNo?: string;
  /** JWNET受付番号 */
  receiptNo?: string;
  /** エラーメッセージ */
  errorMessage?: string;
  /** エラーコード */
  errorCode?: string;
}

/**
 * 予約番号取得リクエスト
 */
export interface ReservationRequest {
  /** 加入者番号 */
  subscriberNo: string;
  /** 公開確認番号 */
  publicConfirmNo: string;
  /** 予約数 */
  count: number;
}

/**
 * 予約番号取得レスポンス
 */
export interface ReservationResponse {
  /** 成功フラグ */
  success: boolean;
  /** 予約番号リスト */
  reservationNos?: string[];
  /** エラーメッセージ */
  errorMessage?: string;
  /** エラーコード */
  errorCode?: string;
}

/**
 * マニフェスト照会リクエスト
 */
export interface ManifestInquiryRequest {
  /** マニフェスト番号 */
  manifestNo: string;
  /** 加入者番号 */
  subscriberNo: string;
}

/**
 * マニフェスト照会レスポンス
 */
export interface ManifestInquiryResponse {
  /** 成功フラグ */
  success: boolean;
  /** マニフェスト番号 */
  manifestNo?: string;
  /** マニフェスト状態 */
  status?: ManifestStatus;
  /** 交付年月日 */
  issuedDate?: string;
  /** 運搬終了年月日 */
  transportEndDate?: string;
  /** 処分終了年月日 */
  disposalEndDate?: string;
  /** 排出事業者 */
  emitter?: JwnetCompany;
  /** 運搬受託者 */
  transporter?: JwnetCompany;
  /** 処分受託者 */
  disposer?: JwnetCompany;
  /** 廃棄物情報 */
  wastes?: WasteInfo[];
  /** エラーメッセージ */
  errorMessage?: string;
  /** エラーコード */
  errorCode?: string;
}

/**
 * JWNET API エラー
 */
export class JwnetApiError extends Error {
  constructor(
    message: string,
    public errorCode?: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'JwnetApiError';
  }
}

/**
 * JWNET API 設定
 */
export interface JwnetConfig {
  /** API ベース URL */
  apiUrl: string;
  /** API キー */
  apiKey: string;
  /** 加入者番号 */
  subscriberNo: string;
  /** 公開確認番号 */
  publicConfirmNo: string;
  /** タイムアウト (ms) */
  timeout?: number;
  /** リトライ回数 */
  maxRetries?: number;
}


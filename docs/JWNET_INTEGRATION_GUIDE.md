# 🚛 JWNET 統合ガイド

**Phase 4-B 完了**

日本の産業廃棄物情報ネットワーク (JWNET) API との統合ガイド

---

## 📋 目次

1. [概要](#概要)
2. [環境設定](#環境設定)
3. [API エンドポイント](#api-エンドポイント)
4. [使用方法](#使用方法)
5. [エラーハンドリング](#エラーハンドリング)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

JWNET (Japan Waste Information Network) は、日本の産業廃棄物の適正処理を支援する情報ネットワークシステムです。このシステムは、マニフェスト（産業廃棄物管理票）の電子管理を可能にします。

### 主な機能

- **マニフェスト登録**: 産業廃棄物のマニフェストを電子登録
- **予約番号取得**: マニフェスト番号を事前に予約
- **マニフェスト照会**: 既存のマニフェストの状態を照会

---

## 環境設定

### 1. 環境変数の設定

`.env.local` ファイルに以下を追加:

```env
# JWNET API 設定
JWNET_API_URL="https://api.jwnet.or.jp"
JWNET_API_KEY="your-api-key-here"
JWNET_SUBSCRIBER_NO="1234567"
JWNET_PUBLIC_CONFIRM_NO="123456"
```

### 2. JWNET 認証情報の取得

1. JWNET 管理画面にログイン: https://www.jwnet.or.jp/
2. **API設定** > **認証情報** から以下を取得:
   - **API キー**: API アクセス用のキー
   - **加入者番号**: 7桁の事業者番号
   - **公開確認番号**: 6桁の確認番号

### 3. Prisma スキーマの確認

JWNET データを保存するテーブルが `prisma/schema.prisma` に定義されていることを確認:

```prisma
model JwnetRegistration {
  id            String   @id @default(uuid())
  org_id        String
  manifest_no   String
  receipt_no    String
  status        String
  manifest_data Json
  response_data Json
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  @@schema("app")
}

model JwnetReservation {
  id             String   @id @default(uuid())
  org_id         String
  reservation_no String
  status         String
  request_data   Json
  response_data  Json
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@schema("app")
}
```

---

## API エンドポイント

### 1. マニフェスト登録

**POST** `/api/jwnet/manifest/register`

#### リクエストボディ

```json
{
  "manifestType": "INDUSTRIAL",
  "issuedDate": "2025-10-13T00:00:00.000Z",
  "emitter": {
    "subscriberNo": "1234567",
    "publicConfirmNo": "123456",
    "name": "排出事業者株式会社",
    "postalCode": "100-0001",
    "address": "東京都千代田区千代田1-1",
    "phoneNumber": "03-1234-5678"
  },
  "transporter": {
    "subscriberNo": "2345678",
    "publicConfirmNo": "234567",
    "name": "運搬業者株式会社",
    "postalCode": "100-0002",
    "address": "東京都千代田区千代田2-2",
    "phoneNumber": "03-2345-6789"
  },
  "disposer": {
    "subscriberNo": "3456789",
    "publicConfirmNo": "345678",
    "name": "処分業者株式会社",
    "postalCode": "100-0003",
    "address": "東京都千代田区千代田3-3",
    "phoneNumber": "03-3456-7890"
  },
  "wastes": [
    {
      "wasteCode": "01010",
      "wasteName": "廃プラスチック類",
      "quantity": 100,
      "unit": "KG"
    }
  ],
  "remarks": "備考欄"
}
```

#### レスポンス

```json
{
  "success": true,
  "manifestNo": "M20251013001",
  "receiptNo": "R20251013001"
}
```

### 2. 予約番号取得

**POST** `/api/jwnet/reservation/create`

#### リクエストボディ

```json
{
  "subscriberNo": "1234567",
  "publicConfirmNo": "123456",
  "count": 10
}
```

#### レスポンス

```json
{
  "success": true,
  "reservationNos": [
    "R20251013001",
    "R20251013002",
    ...
  ]
}
```

### 3. マニフェスト照会

**POST** `/api/jwnet/manifest/inquiry`

#### リクエストボディ

```json
{
  "manifestNo": "M20251013001",
  "subscriberNo": "1234567"
}
```

#### レスポンス

```json
{
  "success": true,
  "manifestNo": "M20251013001",
  "status": "REGISTERED",
  "issuedDate": "2025-10-13T00:00:00.000Z",
  "emitter": { ... },
  "transporter": { ... },
  "disposer": { ... },
  "wastes": [ ... ]
}
```

---

## 使用方法

### UI からの操作

1. **ダッシュボード** > **JWNET 連携** にアクセス
2. タブから操作を選択:
   - **マニフェスト登録**: 新規マニフェストを登録
   - **マニフェスト照会**: 既存マニフェストの状態を確認
   - **予約番号取得**: マニフェスト番号を事前予約

### プログラムからの利用

#### JWNET クライアントの初期化

```typescript
import { getJwnetClient } from '@/lib/jwnet/client';

const jwnetClient = getJwnetClient();
```

#### マニフェスト登録

```typescript
const response = await jwnetClient.registerManifest({
  manifestType: ManifestType.INDUSTRIAL,
  issuedDate: new Date().toISOString(),
  emitter: { /* ... */ },
  transporter: { /* ... */ },
  disposer: { /* ... */ },
  wastes: [{ /* ... */ }],
});

console.log('Manifest No:', response.manifestNo);
```

#### 予約番号取得

```typescript
const response = await jwnetClient.reserveNumbers({
  subscriberNo: '1234567',
  publicConfirmNo: '123456',
  count: 10,
});

console.log('Reserved Numbers:', response.reservationNos);
```

---

## エラーハンドリング

### 自動リトライ

JWNET クライアントは、以下の場合に自動的にリトライします：

- **5xx サーバーエラー**: 最大 3回リトライ
- **ネットワークエラー**: 最大 3回リトライ
- **タイムアウト**: 最大 3回リトライ

リトライ間隔は指数バックオフ (exponential backoff) を使用:
- 1回目: 1秒 + ジッター
- 2回目: 2秒 + ジッター
- 3回目: 4秒 + ジッター

### エラーコード

| エラーコード | 説明 | 対処方法 |
|-------------|------|---------|
| `NETWORK_ERROR` | ネットワーク接続エラー | 接続を確認 |
| `AUTH_ERROR` | 認証エラー | API キーを確認 |
| `INVALID_REQUEST` | リクエストが不正 | パラメータを確認 |
| `MANIFEST_NOT_FOUND` | マニフェストが見つからない | マニフェスト番号を確認 |
| `DUPLICATE_MANIFEST` | マニフェストが重複 | 既存マニフェストを確認 |

---

## トラブルシューティング

### Q1. 「Environment variable not found: JWNET_API_URL」エラー

**原因**: 環境変数が設定されていません。

**解決策**:
1. `.env.local` ファイルに JWNET 関連の環境変数を追加
2. Next.js を再起動: `pnpm dev`

### Q2. 「JWNET API error: 認証エラー」

**原因**: API キーまたは加入者番号が正しくありません。

**解決策**:
1. JWNET 管理画面で認証情報を確認
2. `.env.local` の値を正しい値に更新
3. Next.js を再起動

### Q3. タイムアウトエラーが頻発

**原因**: JWNET API のレスポンスが遅いか、ネットワークが不安定です。

**解決策**:
1. ネットワーク接続を確認
2. タイムアウト時間を延長（デフォルト: 30秒）
3. リトライ回数を増やす（デフォルト: 3回）

カスタム設定:
```typescript
const jwnetClient = new JwnetClient({
  apiUrl: process.env.JWNET_API_URL!,
  apiKey: process.env.JWNET_API_KEY!,
  subscriberNo: process.env.JWNET_SUBSCRIBER_NO!,
  publicConfirmNo: process.env.JWNET_PUBLIC_CONFIRM_NO!,
  timeout: 60000, // 60秒
  maxRetries: 5,  // 5回
});
```

### Q4. マニフェスト登録後、データベースに保存されない

**原因**: Prisma スキーマが正しくないか、データベースマイグレーションが実行されていません。

**解決策**:
1. Prisma スキーマを確認: `prisma/schema.prisma`
2. マイグレーションを実行: `pnpm prisma migrate dev`
3. Prisma Client を再生成: `pnpm prisma generate`

---

## テスト

### API テスト

```bash
# マニフェスト登録のテスト
curl -X POST http://localhost:3000/api/jwnet/manifest/register \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# 予約番号取得のテスト
curl -X POST http://localhost:3000/api/jwnet/reservation/create \
  -H "Content-Type: application/json" \
  -d '{ "subscriberNo": "1234567", "publicConfirmNo": "123456", "count": 1 }'
```

### 接続テスト

```typescript
const jwnetClient = getJwnetClient();
const isConnected = await jwnetClient.testConnection();
console.log('JWNET Connection:', isConnected ? 'OK' : 'NG');
```

---

## 参考資料

- [JWNET 公式サイト](https://www.jwnet.or.jp/)
- [JWNET API ドキュメント](https://www.jwnet.or.jp/api-docs)
- [産業廃棄物管理票制度について（環境省）](https://www.env.go.jp/recycle/waste/manifesto/)

---

**Last Updated**: 2025-10-13  
**Phase**: 4-B (JWNET Integration)  
**Status**: ✅ 完了


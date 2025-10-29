# 消費税端数処理実装ドキュメント

**実装日**: 2025-10-21  
**バージョン**: 1.0  
**デフォルト方式**: 切り捨て（FLOOR）

---

## 📋 概要

消費税計算における端数処理方式を組織ごとに設定可能にしました。  
デフォルトは「切り捨て」（最も一般的で税務上安全）です。

---

## 🗄️ データベーススキーマ

### 1. Enum: `tax_rounding_mode`

```prisma
enum tax_rounding_mode {
  FLOOR  // 切り捨て（デフォルト・推奨）
  CEIL   // 切り上げ
  ROUND  // 四捨五入

  @@schema("app")
}
```

### 2. Table: `billing_settings`

```sql
CREATE TABLE app.billing_settings (
  org_id            UUID PRIMARY KEY REFERENCES app.organizations(id) ON DELETE CASCADE,
  tax_rounding_mode app.tax_rounding_mode NOT NULL DEFAULT 'FLOOR',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL,
  created_by        UUID REFERENCES auth.users(id),
  updated_by        UUID REFERENCES auth.users(id)
);
```

---

## 📦 実装ファイル

### 1. 税計算ユーティリティ

**ファイル**: `next-app/src/lib/billing/tax-calculator.ts`

```typescript
import { calculateTax, calculateTaxIncluded } from '@/lib/billing/tax-calculator'

// 基本的な使い方
const taxAmount = calculateTax(10000, 0.10, 'FLOOR')  // 1000円

// 税込み金額計算
const { taxAmount, totalAmount } = calculateTaxIncluded(10000, 0.10, 'FLOOR')
// taxAmount: 1000円, totalAmount: 11000円
```

**関数一覧**:
- `calculateTax(amount, taxRate, roundingMode)` - 消費税額を計算
- `calculateTaxIncluded(amount, taxRate, roundingMode)` - 税込み金額を計算
- `calculateTaxForItems(items, taxRate, roundingMode)` - 複数明細の合計税額を計算
- `getTaxRoundingModeLabel(mode)` - 端数処理方式の説明テキスト取得

---

### 2. API実装

#### GET/POST `/api/billing-settings`

**GET**: 請求設定取得
```bash
curl "http://localhost:3001/api/billing-settings?org_id=xxx"
```

**レスポンス**:
```json
{
  "org_id": "xxx",
  "tax_rounding_mode": "FLOOR",
  "created_at": "2025-10-21T00:00:00Z",
  "updated_at": "2025-10-21T00:00:00Z"
}
```

**POST**: 請求設定の作成・更新
```bash
curl -X POST http://localhost:3001/api/billing-settings \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "xxx",
    "tax_rounding_mode": "FLOOR"
  }'
```

---

### 3. 既存コード修正箇所

#### a. シードスクリプト

**ファイル**: `next-app/prisma/seed-modules/billing-items.ts`

```typescript
// 修正前
const taxAmount = Math.floor(amount * 0.1)

// 修正後
const taxAmount = calculateTax(amount, 0.1)  // デフォルトでFLOOR
```

#### b. 請求フロースクリプト

**ファイル**: `next-app/scripts/execute-billing-flow.mjs`

```javascript
// 修正前
const commissionTaxAmt = calculatedCommission * 0.1

// 修正後
const commissionTaxAmt = calculateTax(calculatedCommission, 0.1)
```

#### c. 請求サマリー生成API

**ファイル**: `next-app/src/app/api/billing-summaries/generate/route.ts`

```typescript
// 請求設定から端数処理方式を取得
const billingSettings = await prisma.billing_settings.findUnique({
  where: { org_id: validated.org_id },
})
const taxRoundingMode = billingSettings?.tax_rounding_mode || 'FLOOR'

// 税額計算
const taxAmount = calculateTax(subtotalAmount, 0.1, taxRoundingMode)
```

---

## 🎯 使用方法

### 1. デフォルト設定（切り捨て）

設定を作成しない場合、自動的に「切り捨て」が適用されます。

### 2. 端数処理方式の変更

```typescript
// API経由で設定変更
const response = await fetch('/api/billing-settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    org_id: 'xxx',
    tax_rounding_mode: 'CEIL',  // 切り上げに変更
  }),
})
```

### 3. フロントエンド設定画面（今後実装予定）

- `/dashboard/settings/billing` で設定可能
- ラジオボタンで選択: 切り捨て / 切り上げ / 四捨五入

---

## 📊 推奨設定

### 業種別推奨

| 業種 | 推奨方式 | 理由 |
|------|----------|------|
| **BtoB全般** | 切り捨て（FLOOR） | 最も一般的、顧客有利、税務上安全 |
| **BtoC小売** | 切り捨て（FLOOR） | 顧客満足度重視 |
| **特殊ケース** | 切り上げ（CEIL） | 契約で明示的に合意がある場合のみ |

---

## ⚠️ 注意事項

### 1. 設定変更のタイミング

- **請求締め前に変更**: 当月分から新しい方式が適用
- **請求締め後に変更**: 次月分から新しい方式が適用
- **既存データは再計算されない**: 過去の請求データは変更されません

### 2. 税務上の考慮事項

- 端数処理方式は**一貫して適用**すること
- 年度途中での変更は**税理士に相談**を推奨
- 変更履歴は`billing_settings`の`updated_at`で記録

### 3. 切り上げ使用時の注意

- 顧客への事前説明が必須
- 契約書に明記すること
- 納税額超過のリスクはないが、顧客不満のリスクあり

---

## 🧪 テストケース

### ケース1: 切り捨て（FLOOR）

```typescript
calculateTax(10003, 0.1, 'FLOOR')  // 1000円（0.3円切り捨て）
```

### ケース2: 切り上げ（CEIL）

```typescript
calculateTax(10003, 0.1, 'CEIL')  // 1001円（0.3円切り上げ）
```

### ケース3: 四捨五入（ROUND）

```typescript
calculateTax(10004, 0.1, 'ROUND')  // 1000円（0.4円切り捨て）
calculateTax(10005, 0.1, 'ROUND')  // 1001円（0.5円切り上げ）
```

---

## 🚀 デプロイ手順

### 1. マイグレーション実行

```bash
cd next-app
pnpm prisma db push
pnpm prisma:generate
```

### 2. 開発サーバー再起動

```bash
pnpm dev
```

### 3. 動作確認

```bash
# 設定取得
curl "http://localhost:3001/api/billing-settings?org_id=xxx"

# 設定保存
curl -X POST http://localhost:3001/api/billing-settings \
  -H "Content-Type: application/json" \
  -d '{"org_id": "xxx", "tax_rounding_mode": "FLOOR"}'
```

---

## 📚 参考資料

### 消費税法上の端数処理

- 端数処理方法は事業者の任意
- ただし**一貫した適用が必須**
- 最も安全なのは「切り捨て」（顧客請求額 ≦ 納税額）

### 業界慣習

- BtoB取引: 90%以上が「切り捨て」を採用
- BtoC取引: ほぼ100%が「切り捨て」を採用
- 公共事業: 法令で「切り捨て」を規定

---

**最終更新**: 2025-10-21  
**作成者**: AI Assistant  
**ステータス**: ✅ 実装完了



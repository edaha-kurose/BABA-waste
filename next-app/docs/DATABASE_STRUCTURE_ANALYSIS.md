# データベース構造分析レポート

## 🎯 目的
E2Eテスト用のテストデータ作成のため、データベースの複雑な構造を整理し、依存関係を明確化する。

---

## 📊 主要テーブル一覧と依存関係

### 【レベル0: 基盤テーブル（依存なし）】

#### 1. `organizations` - 組織マスター
- **役割**: 全データの大元となる組織
- **依存**: なし
- **必須フィールド**: `name`, `code`
- **備考**: テスト組織が既に存在している可能性が高い

#### 2. `auth_users` (Supabase Auth)
- **役割**: 認証ユーザー
- **依存**: なし
- **備考**: Supabase Authで管理

#### 3. `jwnet_waste_codes` - JWNETコードマスター
- **役割**: JWNET廃棄物コード
- **依存**: なし
- **必須フィールド**: `code`, `name`

---

### 【レベル1: 基本マスターテーブル】

#### 4. `app_users` - アプリケーションユーザー
- **依存**: `organizations`, `auth_users`
- **外部キー**: 
  - `org_id` → `organizations.id`
  - `auth_user_id` → `auth_users.id`

#### 5. `stores` - 店舗マスター
- **依存**: `organizations`
- **外部キー**: 
  - `org_id` → `organizations.id`
- **必須フィールド**: `store_code`, `name`
- **ユニーク制約**: `(org_id, store_code)`

#### 6. `item_maps` - 品目マップ
- **依存**: `organizations`
- **外部キー**: 
  - `org_id` → `organizations.id`
- **必須フィールド**: `item_label`, `jwnet_code`, `default_unit`

---

### 【レベル2: 複雑なマスターテーブル】

#### 7. `waste_type_masters` - 廃棄物種別マスター ⚠️ **複雑**
- **依存**: `organizations`, `jwnet_waste_codes`, **`collector_id`**
- **外部キー**: 
  - `org_id` → `organizations.id`
  - **`collector_id` → ??? (未特定)**
  - `jwnet_waste_code_id` → `jwnet_waste_codes.id`
- **必須フィールド**: 
  - `org_id`
  - **`collector_id` (必須!)**
  - `waste_type_code`
  - `waste_type_name`
  - `waste_category`
  - `waste_classification`
  - `jwnet_waste_code_id`
  - `unit_code`
- **ユニーク制約**: `(org_id, collector_id, waste_type_code)`
- **問題点**: `collector_id` が必須だが、`collectors` テーブルが不明

---

### 【レベル3: トランザクションテーブル】

#### 8. `plans` - 収集予定
- **依存**: `organizations`, `stores`, `item_maps`
- **外部キー**: 
  - `org_id` → `organizations.id`
  - `store_id` → `stores.id`
  - `item_map_id` → `item_maps.id`
- **必須フィールド**: `planned_date`, `planned_qty`, `unit`
- **ユニーク制約**: `(org_id, store_id, planned_date, item_map_id)`

#### 9. `reservations` - JWNET予約
- **依存**: `organizations`, `plans`
- **外部キー**: 
  - `org_id` → `organizations.id`
  - `plan_id` → `plans.id`
- **必須フィールド**: `jwnet_temp_id`, `payload_hash`, `status`

#### 10. `registrations` - JWNET登録
- **依存**: `organizations`, `plans`
- **外部キー**: 
  - `org_id` → `organizations.id`
  - `plan_id` → `plans.id` (UNIQUE)
- **必須フィールド**: `manifest_no`, `status`

#### 11. `actuals` - 実績
- **依存**: `organizations`, `plans`
- **外部キー**: 
  - `org_id` → `organizations.id`
  - `plan_id` → `plans.id` (UNIQUE)
- **必須フィールド**: `actual_qty`, `unit`

#### 12. `billing_summaries` - 請求サマリー
- **依存**: `organizations`
- **外部キー**: 
  - `org_id` → `organizations.id`
- **必須フィールド**: `billing_month`, `total_amount`

---

## 🚨 発見された問題点

### 1. `waste_type_masters` の `collector_id` 問題
```prisma
model waste_type_masters {
  id             String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  org_id         String  @db.Uuid
  collector_id   String  @db.Uuid  // ← 必須だがリレーション先が不明
  // ...
  @@unique([org_id, collector_id, waste_type_code])
}
```

**推測される原因:**
- `collectors` テーブルが存在しない、または別スキーマに存在
- `collector_id` が実は `companies` テーブルの `id` を参照している可能性
- データベース設計の途中段階でスキーマ更新が未完了

**対策案:**
1. **Option A**: `collector_id` に既存の組織IDを入れる（暫定対応）
2. **Option B**: `waste_type_masters` を使用せず、シンプルな品目マップのみ使用
3. **Option C**: `collectors` テーブルを作成する

### 2. `companies` テーブルの用途不明
```prisma
model companies {
  id             String  @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name           String
  // ... フィールドが少ない
  @@schema("public")  // ← public スキーマ
}
```

**問題点:**
- `public` スキーマに配置されている
- `app` スキーマの他のテーブルとの関連が不明
- `collector_id` との関連が明示されていない

---

## ✅ テストデータ作成戦略（推奨）

### 【戦略1: 既存マスターデータ活用 + 最小限のトランザクションデータ】

#### Step 1: 既存データ確認（Prisma Studio）
```
✅ organizations に既存の組織が存在するか？
✅ app_users に既存のユーザーが存在するか？
✅ jwnet_waste_codes にデータが存在するか？
✅ stores に既存の店舗が存在するか？
✅ item_maps に既存の品目が存在するか？
```

#### Step 2: 不足データの最小限作成
```typescript
// 1. 店舗が0件なら10店舗作成
if (storesCount === 0) {
  await createStores(10)
}

// 2. 品目マップが0件なら5品目作成
if (itemMapsCount === 0) {
  await createItemMaps(5)
}

// 3. Plans作成（既存の店舗 × 既存の品目 × 12ヶ月）
await createPlans()

// 4. Reservations/Registrations/Actuals作成
await createTransactionData()

// 5. 請求サマリー作成
await createBillingSummaries()
```

#### Step 3: 複雑なマスター（waste_type_masters）をスキップ
```
❌ waste_type_masters は使用しない
✅ 代わりに item_maps で品目情報を管理
✅ 単価情報は item_maps.notes にJSON形式で格納
```

---

## 📋 次のアクション

### 1. Prisma Studio で現在のデータを確認
```bash
# 既に起動済み: http://localhost:5555
```

**確認項目:**
- [ ] `organizations` テーブルにテスト組織（`org_id: 00000000-0000-0000-0000-000000000001`）が存在するか？
- [ ] `app_users` テーブルにテストユーザーが存在するか？
- [ ] `stores` テーブルに店舗データが存在するか？
- [ ] `item_maps` テーブルに品目データが存在するか？
- [ ] `jwnet_waste_codes` テーブルにJWNETコードが存在するか？

### 2. シンプル版シードスクリプトv2を作成
```typescript
// 戦略:
// - waste_type_masters をスキップ
// - 既存マスターデータを活用
// - Plans/Reservations/Registrations/Actuals/Billing のみ作成
```

### 3. E2Eテスト実行
```bash
pnpm test:e2e
```

---

## 📊 データ依存関係図

```
organizations (既存)
 ├─ app_users (既存)
 ├─ stores (作成対象)
 ├─ item_maps (作成対象)
 └─ plans (作成対象)
     ├─ reservations (作成対象)
     ├─ registrations (作成対象)
     ├─ actuals (作成対象)
     └─ billing_summaries (作成対象)

jwnet_waste_codes (既存)
 └─ (item_maps で参照)

❌ waste_type_masters (スキップ)
   - collector_id の依存関係が不明確
   - E2Eテストには不要
```

---

## 🎯 結論

### 採用する戦略
**「既存マスターデータ活用 + トランザクションデータのみ作成」**

### 理由
1. **複雑なマスター（waste_type_masters）は回避**
   - `collector_id` の依存関係が不明確
   - E2Eテストには必須ではない

2. **既存データを最大限活用**
   - `organizations`, `app_users`, `jwnet_waste_codes` は既存
   - `stores`, `item_maps` が不足していれば最小限作成

3. **トランザクションデータに集中**
   - `plans` → `reservations` → `registrations` → `actuals` → `billing_summaries`
   - これらがE2Eテストの主要対象

4. **シンプルで安全**
   - 複雑なリレーションを避ける
   - 既存データを壊さない
   - 何度でも再実行可能

---

**次のステップ**: Prisma Studio でデータを確認し、シンプル版シードスクリプトv2を作成します。








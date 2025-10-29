# waste_type_masters テーブルの collector_id 問題 - 完全分析

## 🎯 目的
`waste_type_masters` テーブルの `collector_id` フィールドの依存関係を明確化し、ガードレールに準拠した解決策を実装する。

---

## 📊 現状分析

### 1. `waste_type_masters` テーブルの定義

```prisma
model waste_type_masters {
  id                   String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  org_id               String            @db.Uuid
  collector_id         String            @db.Uuid  // ← 問題のフィールド
  waste_type_code      String            @db.VarChar(50)
  waste_type_name      String            @db.VarChar(255)
  waste_category       String            @db.VarChar(100)
  waste_classification String            @db.VarChar(100)
  jwnet_waste_code_id  String            @db.Uuid
  jwnet_waste_code     String            @db.VarChar(10)
  unit_code            String            @db.VarChar(10)
  unit_price           Float?            @db.Real
  description          String?
  is_active            Boolean           @default(true)
  created_at           DateTime          @default(now()) @db.Timestamptz(6)
  updated_at           DateTime          @default(now()) @db.Timestamptz(6)
  created_by           String?           @db.Uuid
  updated_by           String?           @db.Uuid
  deleted_at           DateTime?         @db.Timestamptz(6)
  billing_category     String?           @db.VarChar(20)
  billing_type_default String?           @db.VarChar(20)
  jwnet_waste_codes    jwnet_waste_codes @relation(fields: [jwnet_waste_code_id], references: [id], onUpdate: NoAction, map: "fk_waste_type_jwnet_code")

  @@unique([org_id, collector_id, waste_type_code], map: "unique_waste_type_per_collector")
  @@index([is_active], map: "idx_waste_type_active")
  @@index([collector_id], map: "idx_waste_type_collector")
  @@index([jwnet_waste_code], map: "idx_waste_type_jwnet_code")
  @@index([billing_category], map: "idx_waste_type_masters_billing_category")
  @@index([org_id], map: "idx_waste_type_org")
  @@schema("app")
}
```

### 2. `collectors` テーブルの定義

```prisma
model collectors {
  id              String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id         String      @unique @db.Uuid
  company_name    String      @db.VarChar(255)
  contact_person  String?     @db.VarChar(255)
  phone           String?     @db.VarChar(50)
  address         String?
  license_number  String?     @db.VarChar(100)
  service_areas   String[]
  is_active       Boolean     @default(true)
  created_at      DateTime    @default(now()) @db.Timestamptz(6)
  updated_at      DateTime    @default(now()) @db.Timestamptz(6)
  created_by      String?     @db.Uuid
  updated_by      String?     @db.Uuid
  deleted_at      DateTime?   @db.Timestamptz(6)
  users           app_users   @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id], map: "idx_collectors_user_id")
  @@index([is_active], map: "idx_collectors_is_active")
  @@index([company_name], map: "idx_collectors_company_name")
  @@schema("app")
}
```

---

## 🚨 問題点の特定

### 問題1: 外部キー制約が欠落
```prisma
// waste_type_masters.prisma (現状)
collector_id         String            @db.Uuid  // ← リレーション未定義

// 期待される定義
collector_id         String            @db.Uuid
collectors           collectors        @relation(fields: [collector_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
```

**影響:**
- データベースレベルでの参照整合性が保証されない
- 存在しない `collector_id` でレコード作成が可能（孤立データ発生）
- Prismaクライアントが自動生成する型情報にリレーションが含まれない

### 問題2: `collectors` テーブル側にリレーション未定義
```prisma
// collectors.prisma (現状)
model collectors {
  // ...
  users           app_users   @relation(fields: [user_id], references: [id], ...)
  // ← waste_type_masters とのリレーションがない
}

// 期待される定義
model collectors {
  // ...
  waste_type_masters waste_type_masters[]  // ← 追加
}
```

**影響:**
- 双方向のナビゲーションができない
- `collectors` から関連する `waste_type_masters` を取得できない

### 問題3: データベース実態との不整合
```sql
-- データベースに外部キー制約が存在するか確認が必要
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'app'
  AND tc.table_name = 'waste_type_masters'
  AND kcu.column_name = 'collector_id';
```

---

## 📋 解決策の設計

### Option A: スキーマにリレーションを追加（推奨）

#### Step 1: Prisma スキーマ更新

```prisma
// waste_type_masters
model waste_type_masters {
  id                   String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  org_id               String            @db.Uuid
  collector_id         String            @db.Uuid
  waste_type_code      String            @db.VarChar(50)
  waste_type_name      String            @db.VarChar(255)
  waste_category       String            @db.VarChar(100)
  waste_classification String            @db.VarChar(100)
  jwnet_waste_code_id  String            @db.Uuid
  jwnet_waste_code     String            @db.VarChar(10)
  unit_code            String            @db.VarChar(10)
  unit_price           Float?            @db.Real
  description          String?
  is_active            Boolean           @default(true)
  created_at           DateTime          @default(now()) @db.Timestamptz(6)
  updated_at           DateTime          @default(now()) @db.Timestamptz(6)
  created_by           String?           @db.Uuid
  updated_by           String?           @db.Uuid
  deleted_at           DateTime?         @db.Timestamptz(6)
  billing_category     String?           @db.VarChar(20)
  billing_type_default String?           @db.VarChar(20)
  
  // リレーション定義
  jwnet_waste_codes    jwnet_waste_codes @relation(fields: [jwnet_waste_code_id], references: [id], onUpdate: NoAction, map: "fk_waste_type_jwnet_code")
  collectors           collectors        @relation(fields: [collector_id], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "fk_waste_type_collector")  // ← 追加

  @@unique([org_id, collector_id, waste_type_code], map: "unique_waste_type_per_collector")
  @@index([is_active], map: "idx_waste_type_active")
  @@index([collector_id], map: "idx_waste_type_collector")
  @@index([jwnet_waste_code], map: "idx_waste_type_jwnet_code")
  @@index([billing_category], map: "idx_waste_type_masters_billing_category")
  @@index([org_id], map: "idx_waste_type_org")
  @@schema("app")
}

// collectors
model collectors {
  id                 String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id            String               @unique @db.Uuid
  company_name       String               @db.VarChar(255)
  contact_person     String?              @db.VarChar(255)
  phone              String?              @db.VarChar(50)
  address            String?
  license_number     String?              @db.VarChar(100)
  service_areas      String[]
  is_active          Boolean              @default(true)
  created_at         DateTime             @default(now()) @db.Timestamptz(6)
  updated_at         DateTime             @default(now()) @db.Timestamptz(6)
  created_by         String?              @db.Uuid
  updated_by         String?              @db.Uuid
  deleted_at         DateTime?            @db.Timestamptz(6)
  
  // リレーション定義
  users              app_users            @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  waste_type_masters waste_type_masters[] // ← 追加

  @@index([user_id], map: "idx_collectors_user_id")
  @@index([is_active], map: "idx_collectors_is_active")
  @@index([company_name], map: "idx_collectors_company_name")
  @@schema("app")
}
```

#### Step 2: データベース外部キー制約の確認と追加

```sql
-- 既存の外部キー制約を確認
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_type = 'FOREIGN KEY';

-- 外部キー制約が存在しない場合、追加
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
FOREIGN KEY (collector_id)
REFERENCES app.collectors (id)
ON DELETE CASCADE
ON UPDATE NO ACTION;
```

#### Step 3: データ整合性チェック

```sql
-- 孤立レコードの確認（存在しない collector_id を持つレコード）
SELECT w.id, w.collector_id, w.waste_type_name
FROM app.waste_type_masters w
LEFT JOIN app.collectors c ON w.collector_id = c.id
WHERE c.id IS NULL
  AND w.deleted_at IS NULL;

-- 孤立レコードが存在する場合の対応
-- Option 1: 論理削除
UPDATE app.waste_type_masters
SET deleted_at = NOW(), updated_at = NOW()
WHERE collector_id NOT IN (SELECT id FROM app.collectors);

-- Option 2: 既存のcollectorに割り当て直す
UPDATE app.waste_type_masters
SET collector_id = (SELECT id FROM app.collectors WHERE is_active = true LIMIT 1),
    updated_at = NOW()
WHERE collector_id NOT IN (SELECT id FROM app.collectors);
```

#### Step 4: Prisma生成と検証

```bash
# Prismaクライアント再生成
pnpm prisma:generate

# スキーマ検証
pnpm prisma validate

# スキーマ差分確認（データベースと比較）
pnpm prisma db pull --force
```

---

### Option B: `collector_id` をオプショナルにする

**非推奨理由:**
- UNIQUE制約 `unique_waste_type_per_collector` が `collector_id` を含んでいる
- ビジネスロジック上、収集業者ごとに異なる単価設定が前提
- データ整合性が損なわれる

---

### Option C: `waste_type_masters` を使用せず `item_maps` のみ使用

**メリット:**
- シンプルな構造
- 短期的には実装が容易

**デメリット:**
- 本番運用では不十分
- 収集業者ごとの単価管理ができない
- ビジネス要件を満たせない

---

## 🎯 推奨アプローチ: Option A

### 理由
1. **データ整合性の確保**
   - 外部キー制約により孤立データを防止
   - データベースレベルで参照整合性を保証

2. **ビジネスロジックとの整合性**
   - 収集業者ごとに異なる単価設定が可能
   - UNIQUE制約の意図を尊重

3. **長期的なメンテナンス性**
   - Prismaの型システムが正しく機能
   - リレーションナビゲーションが可能

4. **ガードレール準拠**
   - スキーマ変更ガイドラインに従った追加式の変更
   - 既存データへの影響を最小化

---

## 📝 実装手順（ガードレール準拠）

### Phase 1: 事前確認
```bash
# 1. ガードレール確認
cat docs/guardrails/SCHEMA_CHANGE_GUIDELINES.md

# 2. 影響範囲分析
pnpm schema:impact -- --table waste_type_masters

# 3. データベース外部キー確認
psql $DATABASE_URL -c "
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_type = 'FOREIGN KEY';
"
```

### Phase 2: スキーマ更新
```bash
# 1. schema.prismaバックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. リレーション追加（手動編集）
# → waste_type_masters に collectors リレーション追加
# → collectors に waste_type_masters リレーション追加

# 3. Prisma生成
pnpm prisma:generate

# 4. 差分確認
git diff prisma/schema.prisma
```

### Phase 3: データベース外部キー追加
```sql
-- DDL新規作成: db/migrations/XXX_add_fk_waste_type_collector.sql
BEGIN;

-- Step 1: 孤立レコード確認
SELECT COUNT(*) as orphaned_count
FROM app.waste_type_masters w
LEFT JOIN app.collectors c ON w.collector_id = c.id
WHERE c.id IS NULL
  AND w.deleted_at IS NULL;

-- Step 2: 孤立レコードを論理削除
UPDATE app.waste_type_masters
SET deleted_at = NOW(), updated_at = NOW()
WHERE collector_id NOT IN (SELECT id FROM app.collectors)
  AND deleted_at IS NULL;

-- Step 3: 外部キー制約追加
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
FOREIGN KEY (collector_id)
REFERENCES app.collectors (id)
ON DELETE CASCADE
ON UPDATE NO ACTION;

-- Step 4: 検証
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_name = 'fk_waste_type_collector';

COMMIT;
```

### Phase 4: 検証とテスト
```bash
# 1. スキーマ検証
pnpm prisma validate

# 2. テストデータ作成
pnpm prisma:seed

# 3. E2Eテスト
pnpm test:e2e

# 4. ロールバック手順確認
cat db/migrations/XXX_add_fk_waste_type_collector_rollback.sql
```

---

## 🔄 ロールバック手順

```sql
-- db/migrations/XXX_add_fk_waste_type_collector_rollback.sql
BEGIN;

-- 外部キー制約削除
ALTER TABLE app.waste_type_masters
DROP CONSTRAINT IF EXISTS fk_waste_type_collector;

-- 検証
SELECT COUNT(*) as constraint_count
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_name = 'fk_waste_type_collector';

COMMIT;
```

---

## 📊 影響範囲分析

### 影響を受けるテーブル
1. **waste_type_masters** (主対象)
   - リレーション追加
   - 外部キー制約追加

2. **collectors** (関連)
   - リレーション追加（逆方向）

### 影響を受けるコード
- Prismaクライアントの型定義
- `waste_type_masters` を使用するAPI（存在する場合）
- シードスクリプト

### リスクレベル: **MEDIUM**
- **理由:**
  - スキーマ変更あり
  - 外部キー制約追加（孤立データがある場合は事前処理必要）
  - Prismaクライアント再生成必須

- **軽減策:**
  - 事前にデータ整合性チェック
  - 孤立レコードは論理削除
  - トランザクション内で実行
  - ロールバック手順を用意

---

## ✅ 成功基準

### 1. スキーマ
- [ ] `waste_type_masters.collector_id` に外部キー制約が設定されている
- [ ] `collectors` に `waste_type_masters` リレーションが定義されている
- [ ] `pnpm prisma validate` が成功する

### 2. データ
- [ ] 孤立レコードが存在しない
- [ ] 既存の有効なレコードに影響がない

### 3. コード
- [ ] Prismaクライアントが正しく生成される
- [ ] シードスクリプトが正常に動作する
- [ ] E2Eテストが通過する

---

## 📅 次のアクション

1. **今すぐ実行**: データベース外部キー制約の確認
2. **承認後実行**: スキーマ更新とマイグレーション
3. **検証**: テストデータ作成とE2Eテスト

---

**作成日**: 2025-10-16  
**リスクレベル**: MEDIUM  
**推奨アプローチ**: Option A（リレーション追加）








# collectors テーブル追加の影響範囲分析

## 📊 基本情報

- **変更日**: 2025-10-16
- **変更種別**: 新規テーブル作成 + 外部キー制約追加
- **リスクレベル**: MEDIUM
- **影響テーブル**: `collectors` (新規), `waste_type_masters` (FK追加)

---

## 🎯 変更の目的

### 問題
1. `collectors` テーブルが schema.prisma に定義されているが、データベースに存在しない
2. `waste_type_masters.collector_id` に外部キー制約が設定されていない
3. データ整合性が保証されない（孤立レコードの可能性）

### 解決策
1. `collectors` テーブルをデータベースに作成
2. `waste_type_masters.collector_id` に外部キー制約を追加
3. schema.prisma にリレーション定義を追加

---

## 📋 影響を受けるテーブル

### 1. `collectors` (新規作成)

```sql
CREATE TABLE app.collectors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL,
  company_name    VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  license_number  VARCHAR(100),
  service_areas   TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_by      UUID,
  deleted_at      TIMESTAMPTZ,
  
  CONSTRAINT fk_collector_user
    FOREIGN KEY (user_id)
    REFERENCES app.users (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);
```

**インデックス:**
- `idx_collectors_user_id` ON `user_id`
- `idx_collectors_is_active` ON `is_active`
- `idx_collectors_company_name` ON `company_name`

### 2. `waste_type_masters` (外部キー制約追加)

```sql
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
```

---

## 📊 データへの影響

### 既存データ
```sql
-- waste_type_masters の既存レコード数確認
SELECT COUNT(*) FROM app.waste_type_masters WHERE deleted_at IS NULL;
-- 結果: 0件（テーブルは存在するがデータなし）

-- 孤立レコード確認（存在しない collector_id を持つレコード）
SELECT COUNT(*) FROM app.waste_type_masters w
LEFT JOIN app.collectors c ON w.collector_id = c.id
WHERE c.id IS NULL AND w.deleted_at IS NULL;
-- 結果: 確認不要（collectors テーブルが存在しないためエラー）
```

**結論:**
- ✅ 既存データへの影響: **なし**
- ✅ 孤立レコードのリスク: **なし**（waste_type_masters にデータが存在しない）

---

## 🔗 リレーションへの影響

### Before (現状)
```
app_users (1) ←→ (0..1) collectors (存在しない)
                            ↓
                    waste_type_masters.collector_id (外部キー制約なし)
```

### After (変更後)
```
app_users (1) ←→ (0..1) collectors (新規作成)
                            ↓ (ON DELETE CASCADE)
                    waste_type_masters.collector_id (外部キー制約あり)
```

**変更点:**
1. `collectors` テーブルが作成される
2. `app_users` と `collectors` が 1:0..1 の関係になる
3. `collectors` と `waste_type_masters` が 1:N の関係になる
4. `collectors` 削除時、関連する `waste_type_masters` も自動削除される（CASCADE）

---

## 💻 コードへの影響

### 1. Prisma スキーマ

#### Before
```prisma
model collectors {
  // ... フィールド定義
  users           app_users   @relation(fields: [user_id], references: [id], ...)
  // waste_type_masters とのリレーションなし
}

model waste_type_masters {
  // ... フィールド定義
  collector_id         String            @db.Uuid
  // collectors とのリレーションなし
}
```

#### After
```prisma
model collectors {
  // ... フィールド定義
  users              app_users            @relation(fields: [user_id], references: [id], ...)
  waste_type_masters waste_type_masters[] // ← 追加
}

model waste_type_masters {
  // ... フィールド定義
  collector_id         String            @db.Uuid
  collectors           collectors        @relation(fields: [collector_id], references: [id], ...) // ← 追加
}
```

### 2. 型定義（自動生成）

```typescript
// Prisma生成後の型
type Collectors = {
  id: string
  user_id: string
  company_name: string
  // ...
  waste_type_masters?: WasteTypeMasters[] // ← 追加
}

type WasteTypeMasters = {
  // ...
  collector_id: string
  collectors?: Collectors // ← 追加
}
```

### 3. API への影響

**現状:** `waste_type_masters` を使用するAPIは存在しない（未実装）

**将来:** `waste_type_masters` CRUD API 実装時に、以下が必要
- `collector_id` の存在チェック（外部キー制約により自動保証）
- `collectors` とのリレーションを含むクエリ

```typescript
// 例: waste_type_masters 取得時に collector 情報も取得
const wasteType = await prisma.waste_type_masters.findMany({
  include: {
    collectors: {
      select: {
        company_name: true,
        license_number: true,
      },
    },
  },
})
```

---

## 🧪 テストへの影響

### 必要なテストデータ
1. `app_users` に collector 用ユーザー（既存でOK）
2. `collectors` テーブルにサンプルデータ（5件程度）
3. `waste_type_masters` にサンプルデータ（10件程度）

### シードスクリプトの修正
```typescript
// collectors 作成
const collectors = await prisma.collectors.createMany({
  data: [
    { user_id: '...', company_name: 'エコ回収株式会社', ... },
    // ...
  ],
})

// waste_type_masters 作成（collectors 存在前提）
const wasteTypes = await prisma.waste_type_masters.createMany({
  data: [
    { collector_id: collectors[0].id, waste_type_code: '01', ... },
    // ...
  ],
})
```

---

## 📈 パフォーマンスへの影響

### インデックス
```sql
-- 自動作成されるインデックス
CREATE INDEX idx_waste_type_collector ON app.waste_type_masters (collector_id);
```

**影響:**
- ✅ `waste_type_masters` の `collector_id` によるクエリが高速化
- ✅ JOIN 性能が向上
- ⚠️ わずかに INSERT/UPDATE が遅くなる（インデックス更新のため）

### 外部キー制約チェック
```sql
-- INSERT 時の制約チェック
INSERT INTO app.waste_type_masters (collector_id, ...)
VALUES ('invalid-uuid', ...);
-- エラー: FOREIGN KEY constraint violated
```

**影響:**
- ✅ データ整合性が保証される
- ⚠️ わずかに INSERT 処理が遅くなる（制約チェックのため）

---

## 🚨 リスク分析

### リスクレベル: MEDIUM

#### 高リスク要因
- ❌ なし（既存データなし、新規テーブル作成のみ）

#### 中リスク要因
1. ⚠️ schema.prisma とデータベースの不整合
   - **軽減策**: DDL実行後、即座に `prisma db pull` で検証

2. ⚠️ 依存関係の複雑化
   - **軽減策**: リレーションを明示的にドキュメント化

#### 低リスク要因
1. ℹ️ 将来の `waste_type_masters` API 実装時に考慮が必要
   - **軽減策**: API実装ガイドをドキュメントに記載

---

## ✅ 検証手順

### 1. DDL実行前の確認
```sql
-- collectors テーブルが存在しないことを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'app' AND table_name = 'collectors';
-- 結果: 0件

-- waste_type_masters.collector_id の外部キー制約を確認
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE '%collector%';
-- 結果: 0件
```

### 2. DDL実行後の検証
```sql
-- collectors テーブルが作成されたことを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'app' AND table_name = 'collectors';
-- 期待結果: 1件

-- 外部キー制約が追加されたことを確認
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND table_name = 'waste_type_masters'
  AND constraint_name = 'fk_waste_type_collector';
-- 期待結果: 1件（FOREIGN KEY）

-- インデックスが作成されたことを確認
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'app'
  AND tablename = 'collectors'
ORDER BY indexname;
-- 期待結果: 4件（PRIMARY KEY + 3つのインデックス）
```

### 3. データ整合性検証
```sql
-- サンプルデータ挿入テスト
BEGIN;
  -- collectors 作成
  INSERT INTO app.collectors (user_id, company_name)
  VALUES ('existing-user-id', 'テスト収集業者')
  RETURNING id;
  
  -- waste_type_masters 作成（上記のidを使用）
  INSERT INTO app.waste_type_masters (
    org_id, collector_id, waste_type_code, waste_type_name,
    waste_category, waste_classification, jwnet_waste_code_id,
    jwnet_waste_code, unit_code
  )
  VALUES (
    'existing-org-id', 'collector-id-from-above', '01', '燃え殻',
    '一般', '産業廃棄物', 'existing-jwnet-code-id',
    '01', 'T'
  );
  
  -- 外部キー制約が機能するかテスト
  -- 存在しない collector_id で挿入を試みる
  INSERT INTO app.waste_type_masters (
    org_id, collector_id, waste_type_code, waste_type_name,
    waste_category, waste_classification, jwnet_waste_code_id,
    jwnet_waste_code, unit_code
  )
  VALUES (
    'existing-org-id', 'invalid-uuid', '02', '汚泥',
    '一般', '産業廃棄物', 'existing-jwnet-code-id',
    '02', 'T'
  );
  -- 期待結果: エラー（FOREIGN KEY constraint violated）
ROLLBACK;
```

### 4. Prisma 検証
```bash
# schema.prisma 更新後
pnpm prisma:generate
# 期待結果: エラーなし

pnpm prisma validate
# 期待結果: エラーなし

# データベーススキーマとの同期確認
pnpm prisma db pull --force
# 期待結果: 差分なし、またはリレーション追加のみ
```

---

## 🔄 ロールバック手順

```sql
-- ロールバックDDL: 001_rollback_collectors_table.sql
BEGIN;

-- Step 1: 外部キー制約削除
ALTER TABLE app.waste_type_masters
DROP CONSTRAINT IF EXISTS fk_waste_type_collector;

-- Step 2: collectors テーブル削除
DROP TABLE IF EXISTS app.collectors CASCADE;

-- Step 3: 検証
SELECT COUNT(*) as remaining_constraints
FROM information_schema.table_constraints
WHERE table_schema = 'app'
  AND constraint_name = 'fk_waste_type_collector';
-- 期待結果: 0

SELECT COUNT(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'app' AND table_name = 'collectors';
-- 期待結果: 0

COMMIT;
```

---

## 📝 変更後の必須作業

1. ✅ Prisma生成: `pnpm prisma:generate`
2. ✅ 型チェック: `pnpm typecheck`
3. ✅ シードスクリプト更新
4. ✅ ドキュメント更新
   - `DATABASE_STRUCTURE_ANALYSIS.md`
   - `WASTE_TYPE_MASTERS_ISSUE_ANALYSIS.md`

---

## 📊 サマリー

| 項目 | 評価 |
|------|------|
| **リスクレベル** | MEDIUM |
| **既存データへの影響** | なし ✅ |
| **コード変更** | 最小限（schema.prismaのみ） ✅ |
| **パフォーマンス影響** | 軽微（インデックス追加により改善） ✅ |
| **ロールバック容易性** | 容易（DROP TABLEのみ） ✅ |
| **推奨実施タイミング** | 即座に実施可能 ✅ |

---

**作成日**: 2025-10-16  
**承認者**: -  
**実施日**: 2025-10-16（予定）








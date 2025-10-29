# Foreign Key Management Runbook

**最終更新**: 2025年10月19日  
**対象**: 開発者全員  
**目的**: 外部キー制約の管理と検証

---

## 🎯 目的

データベースの外部キー制約を適切に管理し、データ整合性を保証する。

---

## 📋 外部キー制約の原則

### 必須ルール
1. **`*_id` カラムには必ず外部キー制約を追加**
2. **`ON DELETE` / `ON UPDATE` の動作を明示**
3. **schema.prisma で `@relation` を必ず定義**
4. **命名規則に従う**: `fk_テーブル名_参照先`

### 例外（外部キー不要）
- `id`: 主キー
- `org_id`, `tenant_id`: ルートレベルの組織ID
- `created_by`, `updated_by`, `approved_by`: 監査用ユーザーID（オプション）

---

## 🚀 実行手順

### Step 1: 外部キー制約チェック実行

```bash
cd next-app
pnpm check:foreign-keys
```

### Step 2: 結果の確認

#### パターン1: 制約OK ✅

```
🔍 外部キー制約チェック開始...
✅ 外部キー制約チェック完了
```

**対応**: 何もしない（次の作業に進む）

---

#### パターン2: 制約不足 ⚠️

```
⚠️ app.child_table.parent_id に外部キー制約がありません
⚠️ app.another_table.reference_id (fk_another_reference): ON DELETE/UPDATE の動作を明示してください
```

**対応**: [外部キー制約の追加](#外部キー制約の追加) に進む

---

## 🔧 外部キー制約の追加

### ケース1: 新しい外部キー追加

#### Step 1: schema.prisma にリレーション定義

```prisma
model child_table {
  id        String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parent_id String       @db.Uuid
  
  // リレーション定義（必須）
  parent    parent_table @relation(
    fields: [parent_id],
    references: [id],
    onDelete: Cascade,    // 親削除時に子も削除
    onUpdate: NoAction    // 親更新時は何もしない
  )
  
  @@index([parent_id])
  @@schema("app")
}

model parent_table {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  child_tables  child_table[]  // 逆リレーション
  
  @@schema("app")
}
```

#### Step 2: マイグレーション作成

```bash
pnpm prisma migrate dev --name add_fk_child_to_parent
```

#### Step 3: 検証

```bash
pnpm check:foreign-keys
```

---

### ケース2: ON DELETE / ON UPDATE の動作を明示

#### 現状（不適切）

```prisma
model child_table {
  parent_id String       @db.Uuid
  parent    parent_table @relation(fields: [parent_id], references: [id])
  // ← ON DELETE/UPDATE が省略されている
}
```

#### 修正後（適切）

```prisma
model child_table {
  parent_id String       @db.Uuid
  parent    parent_table @relation(
    fields: [parent_id],
    references: [id],
    onDelete: Cascade,     // 明示
    onUpdate: NoAction     // 明示
  )
}
```

#### マイグレーション作成

```bash
pnpm prisma migrate dev --name update_fk_on_delete_cascade
```

---

## 📊 ON DELETE / ON UPDATE の選択基準

### ON DELETE

| 動作 | 説明 | 使用ケース |
|------|------|------------|
| **Cascade** | 親削除時に子も削除 | 強い依存関係（例: 注文→注文明細） |
| **SetNull** | 親削除時に子のFKをNULLに | 弱い依存関係（例: ユーザー→投稿） |
| **Restrict** | 子が存在する場合、親削除を拒否 | データ保護が必要（例: カテゴリ→商品） |
| **NoAction** | 何もしない（エラー） | 使用非推奨 |

### ON UPDATE

| 動作 | 説明 | 使用ケース |
|------|------|------------|
| **Cascade** | 親更新時に子のFKも更新 | PKが更新される可能性がある |
| **NoAction** | 何もしない | **推奨**（UUID PKは更新されない） |
| **Restrict** | 子が存在する場合、親更新を拒否 | データ保護が必要 |

### 推奨設定

```prisma
// 標準的な設定（推奨）
@relation(
  fields: [parent_id],
  references: [id],
  onDelete: Cascade,    // 親削除時に子も削除
  onUpdate: NoAction    // UUID PKは更新されないため
)
```

---

## 🗄️ テーブル別の推奨設定

### 組織階層

```prisma
// 組織 → 店舗
model stores {
  org_id        String        @db.Uuid
  organizations organizations @relation(
    fields: [org_id],
    references: [id],
    onDelete: Cascade,    // 組織削除時に店舗も削除
    onUpdate: NoAction
  )
}
```

### トランザクションデータ

```prisma
// 収集予定 → 収集実績
model actuals {
  plan_id String @db.Uuid
  plans   plans  @relation(
    fields: [plan_id],
    references: [id],
    onDelete: Cascade,    // 予定削除時に実績も削除
    onUpdate: NoAction
  )
}
```

### マスターデータ参照

```prisma
// 収集予定 → 品目マップ
model plans {
  item_map_id String    @db.Uuid
  item_maps   item_maps @relation(
    fields: [item_map_id],
    references: [id],
    onDelete: Restrict,   // 品目マップが使われている場合は削除を拒否
    onUpdate: NoAction
  )
}
```

---

## 🚨 既存テーブルへの外部キー追加

### ⚠️ 注意事項
- 既存データに孤立レコードがある場合、外部キー追加は失敗する
- 本番環境では慎重に実施

### 手順

#### Step 1: 孤立データの確認

```sql
-- 孤立データを検索
SELECT ct.id, ct.parent_id
FROM app.child_table ct
LEFT JOIN app.parent_table pt ON ct.parent_id = pt.id
WHERE pt.id IS NULL;
```

#### Step 2: 孤立データの修正

**選択肢A**: 孤立データを削除

```sql
BEGIN;

DELETE FROM app.child_table
WHERE parent_id NOT IN (SELECT id FROM app.parent_table);

COMMIT;
```

**選択肢B**: 孤立データを修正

```sql
BEGIN;

-- デフォルトの親レコードに紐付け
UPDATE app.child_table
SET parent_id = '00000000-0000-0000-0000-000000000001'  -- デフォルトID
WHERE parent_id NOT IN (SELECT id FROM app.parent_table);

COMMIT;
```

#### Step 3: 外部キー制約追加

```bash
# schema.prisma に @relation 追加
# （前述の手順を参照）

# マイグレーション作成
pnpm prisma migrate dev --name add_fk_to_existing_table

# 検証
pnpm check:foreign-keys
```

---

## 🔍 トラブルシューティング

### 問題1: 外部キー制約違反でマイグレーション失敗

**エラー**: 
```
Foreign key constraint failed on the field: `parent_id`
```

**原因**: 孤立データが存在する

**解決方法**:
1. 孤立データを確認（[Step 1](#step-1-孤立データの確認)）
2. 孤立データを修正（[Step 2](#step-2-孤立データの修正)）
3. マイグレーションを再実行

---

### 問題2: ON DELETE Cascade で意図しないデータが削除される

**エラー**: データが予期せず削除された

**原因**: ON DELETE Cascade が不適切

**解決方法**:

```prisma
// 修正前（不適切）
@relation(
  fields: [master_id],
  references: [id],
  onDelete: Cascade  // ← マスターデータに不適切
)

// 修正後（適切）
@relation(
  fields: [master_id],
  references: [id],
  onDelete: Restrict  // ← マスターデータ削除を防ぐ
)
```

```bash
# マイグレーション作成
pnpm prisma migrate dev --name change_on_delete_to_restrict

# 検証
pnpm check:foreign-keys
```

---

### 問題3: 複数の外部キー制約が競合

**エラー**: 
```
Multiple foreign key constraints found for the same column
```

**原因**: 同じカラムに複数の外部キー制約が定義されている

**解決方法**:

```sql
-- 既存の外部キー制約を確認
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'your_table_name';

-- 不要な制約を削除
ALTER TABLE app.your_table_name
DROP CONSTRAINT unwanted_fk_constraint;

-- 正しい制約を追加（Prisma Migrate経由）
pnpm prisma migrate dev --name fix_duplicate_fk
```

---

## 📚 参考資料

### プロジェクト内ドキュメント
- [Prisma Migration Guide](../guardrails/PRISMA_MIGRATION_GUIDE.md)
- [Global Rules](../../.cursor/rules/global-rules.md)
- [Schema Sync Check](schema-sync-check.md)

### PostgreSQL公式ドキュメント
- [Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)

### Prisma公式ドキュメント
- [Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Referential Actions](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/referential-actions)

---

**最終更新**: 2025年10月19日  
**作成者**: AI Assistant  
**ステータス**: ✅ 使用可能






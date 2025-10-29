# Prisma Migration Guide

**最終更新**: 2025年10月19日  
**対象**: 開発者全員  
**目的**: Prismaマイグレーションの安全な実行

---

## 🎯 基本原則

### SSOT（Single Source of Truth）
- **Prisma Schema** (`prisma/schema.prisma`) が唯一の真実
- データベースとPrisma Schemaは常に同期
- 手動SQLは最小限に抑える

---

## 📋 マイグレーション前のチェックリスト

### Step 1: 現状確認
```bash
# スキーマ同期確認
pnpm check:schema-sync

# 外部キー制約確認
pnpm check:foreign-keys

# 型チェック
pnpm typecheck
```

### Step 2: バックアップ
```bash
# schema.prismaをバックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# データベースダンプ（本番環境のみ）
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🚀 マイグレーション実行手順

### パターン1: 新しいテーブル追加

#### 1. schema.prismaに定義追加
```prisma
model new_table {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  org_id     String   @db.Uuid
  name       String   @db.VarChar(255)
  created_at DateTime @default(now()) @db.Timestamptz(6)
  updated_at DateTime @default(now()) @db.Timestamptz(6)
  deleted_at DateTime? @db.Timestamptz(6)
  
  organizations organizations @relation(fields: [org_id], references: [id], onDelete: Cascade)
  
  @@index([org_id])
  @@schema("app")
}
```

#### 2. マイグレーション作成
```bash
pnpm prisma migrate dev --name add_new_table
```

#### 3. 型生成
```bash
pnpm prisma:generate
```

#### 4. 検証
```bash
pnpm check:schema-sync
pnpm check:foreign-keys
pnpm typecheck
```

---

### パターン2: カラム追加

#### 1. schema.prismaにカラム追加
```prisma
model existing_table {
  // ... existing fields ...
  new_column String? @db.VarChar(100)  // NULL許可で追加
}
```

#### 2. マイグレーション作成
```bash
pnpm prisma migrate dev --name add_column_to_existing_table
```

#### 3. データ移行（必要な場合）
```sql
-- マイグレーション後、手動で実行
UPDATE app.existing_table
SET new_column = 'default_value'
WHERE new_column IS NULL;
```

#### 4. NOT NULL制約追加（データ移行後）
```prisma
model existing_table {
  // ... existing fields ...
  new_column String @db.VarChar(100)  // NOT NULL
}
```

```bash
pnpm prisma migrate dev --name make_new_column_not_null
```

---

### パターン3: 外部キー追加

#### 1. schema.prismaにリレーション定義
```prisma
model child_table {
  id        String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parent_id String       @db.Uuid
  
  parent    parent_table @relation(fields: [parent_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  
  @@index([parent_id])
  @@schema("app")
}

model parent_table {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  child_tables  child_table[]
  
  @@schema("app")
}
```

#### 2. マイグレーション作成
```bash
pnpm prisma migrate dev --name add_foreign_key_child_to_parent
```

#### 3. 外部キー制約確認
```bash
pnpm check:foreign-keys
```

---

## 🚫 禁止事項

### ❌ やってはいけないこと

#### 1. 既存マイグレーションの編集
```bash
# ❌ NG
vim prisma/migrations/20241001_initial_schema/migration.sql
```

#### 2. `prisma db pull` をバックアップなしで実行
```bash
# ❌ NG
pnpm prisma db pull

# ✅ OK
cp prisma/schema.prisma prisma/schema.prisma.backup
pnpm prisma db pull
git diff prisma/schema.prisma  # 差分確認
```

#### 3. 手動SQLとPrisma Migrateの混在
```bash
# ❌ NG
psql $DATABASE_URL -f custom.sql  # 手動SQL実行
# その後、何もせずに開発を続ける

# ✅ OK
psql $DATABASE_URL -f custom.sql  # 手動SQL実行
pnpm check:schema-sync          # 同期確認
pnpm prisma db pull             # スキーマ更新
pnpm prisma:generate            # 型生成
```

#### 4. ON DELETE / ON UPDATE の省略
```prisma
# ❌ NG
model child_table {
  parent_id String       @db.Uuid
  parent    parent_table @relation(fields: [parent_id], references: [id])
}

# ✅ OK
model child_table {
  parent_id String       @db.Uuid
  parent    parent_table @relation(fields: [parent_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
}
```

---

## 🔧 トラブルシューティング

### 問題1: マイグレーションが失敗する

**エラー**: `P3006: Migration failed to apply`

**原因**: 既存データと新しい制約が矛盾

**解決方法**:
```bash
# 1. マイグレーションをリセット（開発環境のみ）
pnpm prisma migrate reset

# 2. マイグレーションを再実行
pnpm prisma migrate dev

# 3. シードデータを再投入
pnpm prisma:seed
```

---

### 問題2: スキーマと型が同期していない

**エラー**: `Type 'X' is not assignable to type 'Y'`

**解決方法**:
```bash
# 1. Prisma Clientを再生成
pnpm prisma:generate

# 2. 開発サーバーを再起動
# Ctrl+C で停止
pnpm dev
```

---

### 問題3: 外部キー制約違反

**エラー**: `Foreign key constraint failed`

**原因**: 親レコードが存在しない、または削除されている

**解決方法**:
```sql
-- 1. 孤立データを確認
SELECT * FROM app.child_table ct
LEFT JOIN app.parent_table pt ON ct.parent_id = pt.id
WHERE pt.id IS NULL;

-- 2. 孤立データを削除
DELETE FROM app.child_table
WHERE parent_id NOT IN (SELECT id FROM app.parent_table);

-- 3. 外部キー制約を再追加
-- （マイグレーションを再実行）
```

---

## 📚 参考資料

### Prisma公式ドキュメント
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)

### プロジェクト内ドキュメント
- [Global Rules](../../.cursor/rules/global-rules.md)
- [Schema Change Guidelines](../specifications/SCHEMA_CHANGE_GUIDELINES.md)
- [Infrastructure Setup Checklist](INFRASTRUCTURE_SETUP_CHECKLIST.md)

---

**最終更新**: 2025年10月19日  
**作成者**: AI Assistant  
**ステータス**: ✅ 使用可能






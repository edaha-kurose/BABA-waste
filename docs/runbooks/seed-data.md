# Seed Data 実行ガイド

## クイックスタート

### Supabase SQL Editor で実行

```sql
-- 1. SQL Editorを開く
-- Supabase Dashboard → SQL Editor → New Query

-- 2. Seedスクリプトをコピペして実行
-- db/seed/001_organizations.sql から順番に実行
```

### ローカルCLIで実行（psql）

```bash
# DATABASE_URLを設定
export DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"

# Seed実行
psql $DATABASE_URL -f db/seed/001_organizations.sql
psql $DATABASE_URL -f db/seed/002_users.sql
psql $DATABASE_URL -f db/seed/003_stores.sql
psql $DATABASE_URL -f db/seed/004_item_maps.sql
```

### 一括実行スクリプト

```bash
# すべてのSeedを順番に実行
for file in db/seed/00*.sql; do
  echo "実行中: $file"
  psql $DATABASE_URL -f $file
done
```

## pnpm スクリプト追加

`package.json` に追加（推奨）:

```json
{
  "scripts": {
    "seed:reset": "psql $DATABASE_URL -f db/seed/999_cleanup.sql",
    "seed:orgs": "psql $DATABASE_URL -f db/seed/001_organizations.sql",
    "seed:users": "psql $DATABASE_URL -f db/seed/002_users.sql",
    "seed:stores": "psql $DATABASE_URL -f db/seed/003_stores.sql",
    "seed:items": "psql $DATABASE_URL -f db/seed/004_item_maps.sql",
    "seed:all": "pnpm seed:reset && pnpm seed:orgs && pnpm seed:users && pnpm seed:stores && pnpm seed:items"
  }
}
```

使用例:

```bash
# 全Seed実行
pnpm seed:all

# 個別実行
pnpm seed:stores
```

## 環境別の実行

### 開発環境

```bash
# ローカルDexieからSupabaseへ移行
VITE_DATA_BACKEND_MODE=supabase pnpm dev

# Seedデータ投入
pnpm seed:all
```

### テスト環境

```bash
# テスト前にクリーンアップ
pnpm seed:reset

# Seed再投入
pnpm seed:all

# E2Eテスト実行
pnpm test:e2e
```

## データ確認

### Supabase Dashboard

```sql
-- 組織確認
SELECT * FROM app.organizations 
WHERE id LIKE 'org-test-%' 
ORDER BY created_at DESC;

-- 店舗確認
SELECT * FROM app.stores 
WHERE org_id = 'org-test-001'::uuid 
ORDER BY store_code;

-- 品目マッピング確認
SELECT * FROM app.item_maps 
WHERE org_id = 'org-test-001'::uuid 
ORDER BY item_label;
```

### psql

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM app.stores WHERE org_id = 'org-test-001'::uuid;"
```

## トラブルシューティング

### Seed実行がエラーになる

**症状**:
```
ERROR:  insert or update on table violates foreign key constraint
```

**対策**:
1. 実行順序を確認（001 → 002 → 003 → 004）
2. 親テーブルのデータが存在するか確認
3. クリーンアップ後に再実行

### 重複エラー

**症状**:
```
ERROR:  duplicate key value violates unique constraint
```

**対策**:
```bash
# クリーンアップ後に再実行
pnpm seed:reset
pnpm seed:all
```

### RLSエラー

**症状**:
```
ERROR:  new row violates row-level security policy
```

**対策**:
Seedスクリプト内で `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` が実行されているか確認。
Supabase Service Role キーを使用しているか確認。

### 権限エラー

**症状**:
```
ERROR:  permission denied for table
```

**対策**:
Supabase Service Role キーを使用（Anon Keyでは実行不可）。

```bash
# Service Role KeyをDATABASE_URLに含める
export DATABASE_URL="postgresql://postgres.xxx:[service-role-key]@..."
```

## セキュリティ

### 本番環境での注意

- ❌ 本番環境でSeedスクリプトを実行しない
- ❌ テスト用の固定IDを本番で使用しない
- ✅ 本番データは別途マスタデータ投入フローで管理

### 環境チェック

Seedスクリプトに環境チェックを追加（推奨）:

```sql
-- 本番環境チェック
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION '本番環境での実行は禁止';
  END IF;
END $$;
```

## 次のステップ

1. ✅ Seed SQL作成完了
2. ⏭️ モックデータ削除
3. ⏭️ `VITE_DATA_BACKEND_MODE=supabase` に切り替え
4. ⏭️ 動作確認

関連ドキュメント:
- [db/seed/README.md](../../db/seed/README.md)
- [ARCHITECTURE_MIGRATION_ANALYSIS.md](../ARCHITECTURE_MIGRATION_ANALYSIS.md)


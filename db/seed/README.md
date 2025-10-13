# Seed SQL - テストデータ管理

## 概要

開発・テスト環境用のテストデータを管理するSeedスクリプト群。

## 実行順序

**必ず以下の順序で実行してください（外部キー制約のため）:**

```bash
# Supabase SQL Editor で実行

# 1. 組織（親テーブル）
psql -f db/seed/001_organizations.sql

# 2. ユーザー組織ロール
psql -f db/seed/002_users.sql

# 3. 店舗（排出事業場）
psql -f db/seed/003_stores.sql

# 4. 品目マッピング
psql -f db/seed/004_item_maps.sql

# クリーンアップ（必要時のみ）
psql -f db/seed/999_cleanup.sql
```

## 一括実行

```bash
# 全Seed実行
cat db/seed/001_organizations.sql \
    db/seed/002_users.sql \
    db/seed/003_stores.sql \
    db/seed/004_item_maps.sql \
  | psql $DATABASE_URL

# クリーンアップ後、再実行
psql $DATABASE_URL -f db/seed/999_cleanup.sql
psql $DATABASE_URL -f db/seed/001_organizations.sql
# ...
```

## Seed SQL の設計原則

### 1. 冪等性（Idempotency）

```sql
-- ✅ ON CONFLICT で重複時の動作を定義
INSERT INTO app.organizations (id, name) 
VALUES ('org-001'::uuid, 'Test Org')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ❌ 単純なINSERTは重複エラーになる
INSERT INTO app.organizations (id, name) 
VALUES ('org-001'::uuid, 'Test Org');
```

### 2. トランザクション必須

```sql
BEGIN;
  -- 全操作をトランザクション内で実行
  DELETE FROM app.stores WHERE id = 'test-001'::uuid;
  INSERT INTO app.stores (...) VALUES (...);
COMMIT;
```

### 3. RLS の一時的な無効化

```sql
-- 処理前: RLS OFF
ALTER TABLE app.stores DISABLE ROW LEVEL SECURITY;

-- 処理
INSERT INTO app.stores (...) VALUES (...);

-- 処理後: RLS ON（必ず戻す）
ALTER TABLE app.stores ENABLE ROW LEVEL SECURITY;
```

### 4. 事後検証

```sql
-- データ整合性を検証
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app.stores;
  IF v_count < 5 THEN
    RAISE EXCEPTION 'Validation failed: expected >= 5, got %', v_count;
  END IF;
END $$;
```

### 5. 外部キー順序

```
親 → 子 の順で挿入
子 → 親 の順で削除

例:
  挿入: organizations → stores → plans
  削除: plans → stores → organizations
```

## テストデータ構成

### 組織（001_organizations.sql）

| ID | 名前 | 役割 |
|----|------|------|
| `org-test-001` | テスト組織A | 排出事業者 |
| `org-test-002` | テスト組織B | 収集運搬業者 |
| `org-test-003` | テスト組織C | 処分業者 |

### ユーザー（002_users.sql）

| User ID | Org ID | Role |
|---------|--------|------|
| `user-test-admin-001` | `org-test-001` | ADMIN |
| `user-test-emitter-001` | `org-test-001` | EMITTER |
| `user-test-transporter-001` | `org-test-002` | TRANSPORTER |
| `user-test-disposer-001` | `org-test-003` | DISPOSER |

### 店舗（003_stores.sql）

| Store Code | 名前 | エリア |
|------------|------|--------|
| S001 | 東京本店 | 関東 |
| S002 | 大阪支店 | 関西 |
| S003 | 名古屋支店 | 中部 |
| S004 | 福岡支店 | 九州 |
| S005 | 札幌支店 | 北海道 |

### 品目マッピング（004_item_maps.sql）

| 品目ラベル | JWNETコード | 単位 | 比重 |
|-----------|------------|------|------|
| 廃プラスチック類 | 0702 | T | 0.5 |
| 金属くず | 0802 | T | 7.8 |
| ガラスくず | 0902 | T | 2.5 |
| 木くず | 0504 | M3 | 0.4 |
| 紙くず | 0303 | T | 0.3 |

## トラブルシューティング

### 外部キー制約エラー

```sql
ERROR:  insert or update on table "stores" violates foreign key constraint
```

**原因**: 親テーブル（organizations）のデータが存在しない  
**対策**: 001_organizations.sql を先に実行

### 重複キーエラー

```sql
ERROR:  duplicate key value violates unique constraint
```

**原因**: すでに同じIDのデータが存在  
**対策**: `ON CONFLICT` を使用するか、999_cleanup.sql で削除後に再実行

### RLS制約エラー

```sql
ERROR:  new row violates row-level security policy
```

**原因**: RLSが有効なまま挿入しようとした  
**対策**: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` を実行

## 本番環境での注意

**⚠️ 本番環境ではこれらのSeedスクリプトを実行しないでください**

- テスト用の固定IDを使用
- データ整合性チェックが簡易的
- クリーンアップスクリプトは全削除する

本番環境では：
- マイグレーションスクリプト（`db/migrations/`）を使用
- 手動でのマスタデータ投入
- バックアップ後の慎重な操作

## 関連ドキュメント

- [ARCHITECTURE_MIGRATION_ANALYSIS.md](../../docs/ARCHITECTURE_MIGRATION_ANALYSIS.md)
- [seed-reset.md](../../docs/runbooks/seed-reset.md)
- [db-preflight.md](../../docs/runbooks/db-preflight.md)


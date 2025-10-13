# Seed Data Scripts

このディレクトリには、Supabaseデータベースに初期データを投入するためのSQLスクリプトが格納されています。

## 📋 Seed スクリプト一覧

| ファイル名 | 説明 | 依存関係 |
|----------|------|---------|
| `001_organizations.sql` | 組織データ | なし |
| `002_users.sql` | ユーザーデータ | 001 |
| `003_stores.sql` | 店舗データ | 001 |
| `004_item_maps.sql` | 品目マッピングデータ | 001 |
| `005_jwnet_waste_codes.sql` | JWNET廃棄物コードマスター | なし |
| `006_waste_type_masters.sql` | 廃棄物種別マスター | 001, 005 |
| `007_jwnet_party_combinations.sql` | JWNET事業者組み合わせマスター | 001 |
| `999_cleanup.sql` | 全データクリーンアップ | - |

## 🚀 使用方法

### 1. 初回セットアップ（全データ投入）

```bash
# Supabase SQL Editorで順番に実行
# 1. 組織データ
001_organizations.sql

# 2. ユーザーデータ
002_users.sql

# 3. 店舗データ
003_stores.sql

# 4. 品目マッピング
004_item_maps.sql

# 5. JWNET廃棄物コードマスター
005_jwnet_waste_codes.sql

# 6. 廃棄物種別マスター
006_waste_type_masters.sql

# 7. JWNET事業者組み合わせマスター
007_jwnet_party_combinations.sql
```

### 2. データリセット

```bash
# 全データを削除
999_cleanup.sql

# その後、再度001から順番に実行
```

### 3. pnpm コマンド経由（推奨）

```bash
# package.json に定義されたスクリプトを使用
pnpm seed:all        # 全Seedデータ投入
pnpm seed:cleanup    # 全データクリーンアップ
```

## ⚠️ 注意事項

### 実行順序

**必ず依存関係に従って順番に実行してください。**

1. `001_organizations.sql` - 他の全てのテーブルが依存
2. `002_users.sql` - 組織IDに依存
3. `003_stores.sql` - 組織IDに依存
4. `004_item_maps.sql` - 組織IDに依存
5. `005_jwnet_waste_codes.sql` - 独立（他と依存なし）
6. `006_waste_type_masters.sql` - 組織ID + JWNET廃棄物コードIDに依存
7. `007_jwnet_party_combinations.sql` - 組織IDに依存

### RLS (Row Level Security)

- 各スクリプトはRLSを一時的に無効化してデータを投入します
- スクリプト実行後、自動的にRLSが再有効化されます

### 重複実行の防止

各スクリプトは既存データをチェックし、データが存在する場合はスキップします。

```sql
IF EXISTS (SELECT 1 FROM app.organizations LIMIT 1) THEN
  RAISE NOTICE 'organizations already has data. Skipping seed.';
  ...
END IF;
```

### パスワードのハッシュ化

`002_users.sql` では、Supabaseの `extensions.crypt()` 関数を使用してパスワードをハッシュ化しています。

```sql
-- パスワード: password123
extensions.crypt('password123', extensions.gen_salt('bf'))
```

## 🔐 デフォルトユーザー

`002_users.sql` で作成されるデフォルトユーザー：

| メールアドレス | パスワード | ロール |
|-------------|----------|--------|
| admin@example.com | password123 | ADMIN |
| user@example.com | password123 | USER |

**⚠️ 本番環境では必ずパスワードを変更してください！**

## 📊 データ統計

各スクリプト実行後、投入されたレコード数が表示されます：

```
✅ Seeded 1 organizations
✅ Seeded 2 users
✅ Seeded 3 stores
✅ Seeded 5 item_maps
✅ Seeded 45 jwnet_waste_codes
✅ Seeded 11 waste_type_masters
✅ Seeded 2 jwnet_party_combinations
```

## 🛠️ トラブルシューティング

### エラー: "relation does not exist"

→ マイグレーションが実行されていません。先に `prisma migrate deploy` を実行してください。

### エラー: "foreign key constraint violation"

→ 依存関係のあるテーブルのデータが投入されていません。実行順序を確認してください。

### エラー: "permission denied"

→ RLSポリシーが有効になっています。スクリプト内でRLSを無効化する処理が含まれていることを確認してください。

## 📚 関連ドキュメント

- [Supabase SQL Editor](https://app.supabase.com/project/_/sql)
- [Prisma Migrations](../prisma/migrations/)
- [Database Schema](../docs/SCHEMA_CHANGE_GUIDELINES.md)

# Supabase データベース接続設定

## 問題: 断続的な接続エラー

```
Can't reach database server at aws-1-us-east-1.pooler.supabase.com:5432
```

## 原因

1. **接続プールの枯渇**: 同時接続数が上限に達している
2. **タイムアウト設定**: デフォルトのタイムアウトが短すぎる
3. **接続文字列の最適化不足**: 接続プールパラメータが設定されていない

---

## 解決策

### 1. 環境変数の設定

`next-app/.env.local` ファイルを作成（存在しない場合）:

```bash
# Supabase接続設定
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# データベース直接接続（Prisma用）
# 接続プールパラメータを追加
DATABASE_URL="postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=10"
```

### 2. 接続プールパラメータの説明

| パラメータ | 推奨値 | 説明 |
|-----------|--------|------|
| `pgbouncer=true` | 必須 | Supabase Poolerを使用 |
| `connection_limit` | 5-10 | アプリケーションあたりの最大接続数 |
| `pool_timeout` | 10 | 接続取得のタイムアウト（秒） |
| `connect_timeout` | 10 | 接続確立のタイムアウト（秒） |

### 3. 推奨設定（開発環境）

```bash
DATABASE_URL="postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=5&pool_timeout=10&connect_timeout=10"
```

### 4. 推奨設定（本番環境）

```bash
DATABASE_URL="postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=10&pool_timeout=15&connect_timeout=15"
```

---

## Supabaseダッシュボードでの確認

1. **Supabaseダッシュボード** → **Settings** → **Database**
2. **Connection string** セクションで以下を確認:
   - **Transaction Mode**: `Session mode` または `Transaction mode`
   - **Pooler**: 有効化されているか

---

## トラブルシューティング

### エラー: `Can't reach database server`

**原因**: 接続プールが満杯、またはネットワークエラー

**対策**:
1. Prismaクライアントを再起動: `pnpm prisma generate`
2. 開発サーバーを再起動
3. Supabaseプロジェクトの状態を確認（ダッシュボード）

### エラー: `Too many connections`

**原因**: `connection_limit` が高すぎる、または接続が正しくクローズされていない

**対策**:
1. `connection_limit` を下げる（5に設定）
2. アプリケーションで接続のクローズを確認
3. Supabaseの同時接続数制限を確認（Freeプランは最大60接続）

---

## 検証方法

### 1. 接続テスト

```bash
cd next-app
pnpm prisma db pull
```

成功すれば接続OK。

### 2. ログ確認

開発サーバーのログで以下を確認:
```
✅ Dashboard Stats API データ取得成功
```

エラーが出る場合:
```
❌ Can't reach database server
```

---

## 参考リンク

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [PostgreSQL Connection Parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)

---

## 自動化スクリプト（オプション）

接続設定の検証スクリプト:

```bash
#!/bin/bash
# next-app/scripts/verify-db-connection.sh

echo "🔍 データベース接続テスト..."

# Prisma接続テスト
pnpm prisma db pull --force

if [ $? -eq 0 ]; then
  echo "✅ データベース接続成功"
else
  echo "❌ データベース接続失敗"
  echo "⚠️ .env.local の DATABASE_URL を確認してください"
  exit 1
fi
```








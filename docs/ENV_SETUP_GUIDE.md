# 🔧 環境変数セットアップガイド

## 📋 必要な環境変数

### 1. データベース接続 (必須)

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:6543/postgres?pgbouncer=true&connection_limit=1"
```

**取得方法**:
1. Supabase ダッシュボードにログイン
2. プロジェクト設定 → Database → Connection string
3. "Transaction" モードの接続文字列をコピー
4. パスワードを実際のものに置き換え

**注意**: 
- Vercel デプロイ時は `pgbouncer=true` を使用
- ローカル開発では `?pgbouncer=true&connection_limit=1` を追加

### 2. Supabase 認証 (必須)

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**取得方法**:
1. Supabase ダッシュボード → Settings → API
2. `Project URL` を `NEXT_PUBLIC_SUPABASE_URL` にコピー
3. `anon public` キーを `NEXT_PUBLIC_SUPABASE_ANON_KEY` にコピー
4. `service_role` キーを `SUPABASE_SERVICE_ROLE_KEY` にコピー

**セキュリティ**:
- `NEXT_PUBLIC_*` はクライアント側に公開される
- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側のみで使用（絶対に公開しない）

### 3. アプリケーション設定

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

**本番環境**: `NEXT_PUBLIC_APP_URL` を実際のデプロイURLに変更

### 4. JWNET 連携 (オプション - 将来実装)

```bash
JWNET_API_KEY="your-jwnet-api-key"
JWNET_API_URL="https://api.jwnet.or.jp"
JWNET_SUBSCRIBER_NO="1234567"
JWNET_PUBLIC_CONFIRM_NO="123456"
```

---

## 🛠️ セットアップ手順

### ステップ 1: `.env.local` ファイルを作成

```bash
cd next-app
cp .env.local.example .env.local
```

### ステップ 2: 環境変数を編集

`.env.local` ファイルを開き、以下の値を実際のものに置き換えます:

1. `[YOUR-PASSWORD]` → Supabase データベースパスワード
2. `[YOUR-HOST]` → Supabase ホスト名
3. `your-project` → あなたの Supabase プロジェクトID
4. `your-anon-key` → Supabase anon キー
5. `your-service-role-key` → Supabase service role キー

### ステップ 3: 環境変数を検証

```bash
cd next-app
pnpm prisma generate
pnpm prisma db pull  # スキーマを確認
```

**エラーが出ない場合**: 接続成功 ✅  
**エラーが出る場合**: `DATABASE_URL` を再確認

### ステップ 4: Next.js サーバーを再起動

```bash
cd next-app
pnpm dev
```

ブラウザで `http://localhost:3000/api/health` を開き、APIが動作することを確認。

---

## 🔒 セキュリティベストプラクティス

### ❌ 絶対にやってはいけないこと

1. **`.env.local` をGitにコミットしない**
   - `.gitignore` に含まれていることを確認
   - 既にコミットしてしまった場合は、すぐにキーをローテーション

2. **Service Role キーをクライアント側で使用しない**
   - `SUPABASE_SERVICE_ROLE_KEY` は必ず `NEXT_PUBLIC_` なしで命名
   - API Route でのみ使用

3. **本番環境の `.env.local` をコピーしない**
   - 本番と開発で異なる環境変数を使用
   - Vercel などのホスティングサービスで環境変数を管理

### ✅ 推奨事項

1. **環境変数のバリデーション**
   - 起動時に必須変数をチェック
   - Zod などで型安全性を確保（既に実装済み）

2. **`.env.local.example` を更新**
   - 新しい環境変数を追加したら、サンプルファイルも更新
   - チームメンバーが簡単にセットアップできるようにする

3. **キーのローテーション**
   - 定期的にAPIキーを更新
   - 漏洩の疑いがある場合は即座にローテーション

---

## 🐛 トラブルシューティング

### エラー: "Environment variable not found: DATABASE_URL"

**原因**: `.env.local` ファイルが存在しないか、読み込まれていない

**解決策**:
1. `next-app/.env.local` ファイルが存在するか確認
2. ファイル内に `DATABASE_URL=...` があるか確認
3. Next.js サーバーを再起動 (`Ctrl+C` → `pnpm dev`)

### エラー: "Failed to connect to database"

**原因**: `DATABASE_URL` の形式が間違っている、またはデータベースに接続できない

**解決策**:
1. Supabase ダッシュボードで接続文字列を再確認
2. パスワードに特殊文字が含まれる場合はURLエンコード
3. ファイアウォールでポート 6543 が開いているか確認

### エラー: "Invalid API key"

**原因**: Supabase キーが間違っているか、プロジェクトが異なる

**解決策**:
1. Supabase ダッシュボードで正しいキーをコピー
2. `NEXT_PUBLIC_SUPABASE_URL` とキーのプロジェクトIDが一致しているか確認

---

## 📚 関連ドキュメント

- [Supabase 認証ドキュメント](https://supabase.com/docs/guides/auth)
- [Next.js 環境変数](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Prisma 接続文字列](https://www.prisma.io/docs/reference/database-reference/connection-urls)

---

**作成日**: 2025-10-13  
**更新日**: 2025-10-13  
**バージョン**: 1.0.0


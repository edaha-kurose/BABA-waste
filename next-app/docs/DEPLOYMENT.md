# Deployment Guide - Next.js App

## 📋 目次

1. [Vercelへのデプロイ](#vercelへのデプロイ)
2. [環境変数の設定](#環境変数の設定)
3. [Supabaseの準備](#supabaseの準備)
4. [デプロイ前チェックリスト](#デプロイ前チェックリスト)
5. [トラブルシューティング](#トラブルシューティング)

## Vercelへのデプロイ

### 1. Vercelアカウント準備

1. [Vercel](https://vercel.com)にサインアップ
2. GitHubアカウントと連携

### 2. プロジェクトのインポート

```bash
# Vercel CLIのインストール（オプション）
npm i -g vercel

# プロジェクトのデプロイ
cd next-app
vercel
```

または、Vercel Dashboardから：
1. "Add New Project" をクリック
2. GitHubリポジトリを選択
3. `next-app` ディレクトリを Root Directory に設定
4. "Deploy" をクリック

### 3. ビルド設定

**Root Directory**: `next-app`

**Build Command**: 
```bash
pnpm prisma:generate && pnpm build
```

**Install Command**:
```bash
pnpm install
```

**Output Directory**: `.next`

## 環境変数の設定

### Vercel Dashboard での設定

1. Project Settings → Environment Variables
2. 以下の環境変数を追加：

#### 必須環境変数

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?pgbouncer=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 環境別設定

- **Development**: ローカル開発用
- **Preview**: プルリクエスト用
- **Production**: 本番環境用

各環境に適切な値を設定してください。

## Supabaseの準備

### 1. Supabaseプロジェクト作成

1. [Supabase Dashboard](https://app.supabase.com)にアクセス
2. 新しいプロジェクトを作成
3. データベースパスワードを設定（記録しておく）

### 2. データベーススキーマの適用

```bash
# ローカルでマイグレーション作成（初回のみ）
cd next-app
pnpm prisma:migrate dev --name init

# Prisma Studioでデータ確認
pnpm prisma:studio
```

### 3. Row Level Security (RLS) の設定

Supabase Dashboard → Database → Policies で以下を設定：

```sql
-- organizations テーブルのRLSポリシー例
CREATE POLICY "Users can view their own organizations"
ON app.organizations
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM app.user_org_roles
    WHERE org_id = organizations.id
  )
);
```

### 4. 接続文字列の取得

Supabase Dashboard → Settings → Database:

- **Connection String**: `DATABASE_URL` に設定
- **Connection Pooling**: 推奨（Vercelの場合）

## デプロイ前チェックリスト

### コード品質

- [ ] TypeScript エラーなし (`pnpm typecheck`)
- [ ] Lintエラーなし (`pnpm lint`)
- [ ] ビルド成功 (`pnpm build`)
- [ ] テスト通過 (`pnpm test`)

### セキュリティ

- [ ] `.env.local` が `.gitignore` に含まれている
- [ ] `SUPABASE_SERVICE_ROLE_KEY` が環境変数に設定
- [ ] RLSポリシーが適切に設定
- [ ] CORS設定が適切

### パフォーマンス

- [ ] 画像最適化設定
- [ ] キャッシュ戦略の確認
- [ ] バンドルサイズの確認

### データベース

- [ ] マイグレーションが適用済み
- [ ] Prismaクライアントが生成済み
- [ ] Seed データが投入済み（必要に応じて）

## デプロイ手順

### 1. 初回デプロイ

```bash
# Vercel CLIでデプロイ
cd next-app
vercel --prod

# または、GitHubにプッシュして自動デプロイ
git add .
git commit -m "feat: prepare for deployment"
git push origin main
```

### 2. 環境変数の確認

Vercel Dashboard で環境変数が正しく設定されているか確認

### 3. デプロイログの確認

デプロイが完了したら、ログを確認してエラーがないかチェック

### 4. 動作確認

デプロイされたURLにアクセスして動作確認：

- [ ] `/` - トップページ
- [ ] `/api/health` - Health Check
- [ ] `/api/test` - Prisma接続テスト
- [ ] `/dashboard` - ダッシュボード
- [ ] `/login` - ログインページ

## トラブルシューティング

### Prismaクライアントのエラー

```
Error: Cannot find module '.prisma/client'
```

**解決方法**:
```bash
# Build Commandに追加
pnpm prisma:generate && pnpm build
```

### データベース接続エラー

```
Error: P1001: Can't reach database server
```

**確認事項**:
1. `DATABASE_URL` が正しく設定されているか
2. Supabaseプロジェクトが起動しているか
3. IPアドレスがホワイトリストに登録されているか
4. Connection Pooling が有効になっているか

### ビルドタイムアウト

**解決方法**:
```bash
# Vercel Settings → Functions → Max Duration を延長
# または、ビルド最適化を実施
```

### 環境変数が反映されない

**解決方法**:
1. Vercel Dashboard で環境変数を再設定
2. Redeploy を実行
3. キャッシュをクリア

## パフォーマンス最適化

### 1. Edge Functions の活用

```typescript
// middleware.ts
export const config = {
  matcher: ['/api/:path*'],
  runtime: 'edge', // Edge Runtimeを使用
}
```

### 2. ISR (Incremental Static Regeneration)

```typescript
// app/dashboard/page.tsx
export const revalidate = 60 // 60秒ごとに再生成
```

### 3. 画像最適化

```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

## モニタリング

### Vercel Analytics

Vercel Dashboard → Analytics で以下を確認：
- ページビュー
- パフォーマンス
- エラー率

### Sentry統合（推奨）

```bash
# Sentryのインストール
pnpm add @sentry/nextjs

# 初期化
npx @sentry/wizard -i nextjs
```

## 継続的デプロイメント

### GitHub Actions設定

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: pnpm install
      - run: pnpm build
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## サポート

問題が解決しない場合：
1. [Next.js Documentation](https://nextjs.org/docs)
2. [Vercel Support](https://vercel.com/support)
3. [Supabase Docs](https://supabase.com/docs)

---

**Last Updated**: 2025-10-13


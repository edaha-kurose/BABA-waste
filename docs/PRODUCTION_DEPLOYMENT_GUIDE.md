# 本番環境デプロイメントガイド 🚀

**プロジェクト**: BABA Waste Management System  
**バージョン**: 1.0.0  
**最終更新日**: 2025-10-13

---

## 📋 概要

このガイドでは、BABA Waste Management System を本番環境にデプロイする手順を説明します。

### デプロイ先

- **Frontend/BFF**: Vercel
- **Database**: Supabase (Production)
- **File Storage**: Supabase Storage

---

## 🔧 前提条件

### 必要なアカウント

1. **Vercel アカウント**: https://vercel.com/
2. **Supabase アカウント**: https://supabase.com/
3. **GitHub アカウント**: リポジトリ連携用

### 必要なツール

- Node.js 18+ / npm / pnpm
- Git
- Supabase CLI（推奨）

---

## 📦 Phase 1: Supabase 本番環境セットアップ

### 1.1 新規プロジェクト作成

1. Supabase にログイン: https://app.supabase.com/
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Project Name**: `baba-waste-production`
   - **Database Password**: 強力なパスワードを生成（必ず保存）
   - **Region**: `Northeast Asia (Tokyo)`（推奨）
   - **Pricing Plan**: Pro（本番環境推奨）

4. プロジェクトが作成されるまで待機（約2分）

### 1.2 データベース接続情報の取得

プロジェクトが作成されたら、以下の情報を取得：

1. **Settings** → **Database** に移動
2. **Connection string** セクションで以下を取得：
   - `DATABASE_URL`: Prisma 用（Transaction モード）
   - `DIRECT_URL`: マイグレーション用（Session モード）

**例**:
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### 1.3 API キーの取得

1. **Settings** → **API** に移動
2. 以下のキーを取得：
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: service_role secret key（⚠️ 厳重管理）

### 1.4 データベーススキーマのマイグレーション

#### ローカルから本番へマイグレーション実行

```bash
# 1. next-app ディレクトリに移動
cd next-app

# 2. 本番環境の DATABASE_URL を一時的に設定
export DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# 3. Prisma マイグレーション実行
pnpm prisma migrate deploy

# 4. Prisma Client 生成
pnpm prisma generate
```

#### マイグレーション確認

```bash
# マイグレーション履歴確認
pnpm prisma migrate status
```

**期待される出力**:
```
Database schema is up to date!
```

### 1.5 RLS (Row Level Security) ポリシーの適用

```bash
# db/policies/rls_policies.sql を実行
psql "$DATABASE_URL" -f ../db/policies/rls_policies.sql
```

### 1.6 Seed データの投入（オプション）

```bash
# テスト用の初期データを投入
psql "$DATABASE_URL" -f ../db/seed/001_organizations.sql
psql "$DATABASE_URL" -f ../db/seed/002_users.sql
psql "$DATABASE_URL" -f ../db/seed/003_stores.sql
psql "$DATABASE_URL" -f ../db/seed/004_item_maps.sql
```

---

## 🚀 Phase 2: Vercel デプロイメント

### 2.1 GitHub リポジトリの準備

1. プロジェクトを GitHub にプッシュ（まだの場合）

```bash
git remote add origin https://github.com/YOUR_USERNAME/BABA-waste.git
git push -u origin main
```

### 2.2 Vercel プロジェクト作成

1. Vercel にログイン: https://vercel.com/
2. 「Add New...」→「Project」をクリック
3. GitHub リポジトリを選択: `BABA-waste`
4. 「Import」をクリック

### 2.3 プロジェクト設定

#### Framework Preset
- **Framework Preset**: Next.js

#### Root Directory
- **Root Directory**: `next-app`（⚠️ 重要）

#### Build Settings
- **Build Command**: `pnpm run build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

### 2.4 環境変数の設定

Vercel の「Environment Variables」セクションで以下を設定：

#### Database

```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
```

#### Supabase

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（⚠️ 厳重管理）
```

#### Application

```
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

#### JWNET API（本番環境用）

```
JWNET_API_URL=https://api.jwnet.or.jp（実際のJWNET API URL）
JWNET_API_KEY=your-production-jwnet-api-key
JWNET_SUBSCRIBER_NO=1234567
JWNET_PUBLIC_CONFIRM_NO=123456
```

#### 環境変数の適用範囲

すべての環境変数に以下を選択：
- ✅ Production
- ✅ Preview
- ✅ Development

### 2.5 デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドログを確認
3. デプロイ完了を待機（約2-3分）

### 2.6 デプロイ確認

1. Vercel が提供する URL にアクセス: `https://your-app-name.vercel.app`
2. ダッシュボードページが表示されることを確認
3. ログイン機能の動作確認

---

## ✅ Phase 3: 動作確認チェックリスト

### 3.1 基本機能

- [ ] トップページが表示される
- [ ] ログインページが表示される
- [ ] ログイン機能が動作する
- [ ] ダッシュボードが表示される
- [ ] ナビゲーションが機能する

### 3.2 データベース接続

- [ ] 組織一覧が表示される
- [ ] 店舗一覧が表示される
- [ ] 収集予定が表示される
- [ ] 収集実績が表示される
- [ ] 請求管理が表示される

### 3.3 API エンドポイント

- [ ] `/api/health` が正常に応答する
- [ ] `/api/organizations` が正常に応答する
- [ ] `/api/stores` が正常に応答する
- [ ] `/api/plans` が正常に応答する
- [ ] `/api/collections` が正常に応答する
- [ ] `/api/billing-items` が正常に応答する
- [ ] `/api/statistics/dashboard` が正常に応答する

### 3.4 JWNET 連携

- [ ] JWNET 連携ページが表示される
- [ ] マニフェスト登録フォームが表示される
- [ ] 事業者組み合わせマスターが表示される
- [ ] 廃棄物マスターが表示される

### 3.5 データ可視化

- [ ] ダッシュボードの KPI カードが表示される
- [ ] 月次推移グラフが表示される
- [ ] 店舗別比較グラフが表示される
- [ ] 廃棄物種別内訳グラフが表示される

### 3.6 Excel 出力

- [ ] 請求書 Excel 出力が動作する
- [ ] ファイルがダウンロードされる
- [ ] Excel ファイルが正しく開ける

---

## 🔒 Phase 4: セキュリティ設定

### 4.1 Supabase セキュリティ

#### RLS（Row Level Security）の有効化確認

```sql
-- すべてのテーブルで RLS が有効になっているか確認
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname IN ('app', 'auth') 
ORDER BY tablename;
```

**期待される結果**: すべてのテーブルで `rowsecurity = true`

#### RLS ポリシーの確認

```sql
-- RLS ポリシーの一覧確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('app', 'auth')
ORDER BY schemaname, tablename;
```

### 4.2 環境変数のセキュリティ

#### ✅ DO（推奨）

- `SUPABASE_SERVICE_ROLE_KEY` は Vercel の環境変数のみに保存
- Git にコミットしない（`.env.local` は `.gitignore` に含める）
- 定期的にキーをローテーション

#### ❌ DON'T（禁止）

- `SUPABASE_SERVICE_ROLE_KEY` を GitHub にコミット
- `SUPABASE_SERVICE_ROLE_KEY` をクライアントサイドで使用
- パスワードや秘密鍵を平文で保存

### 4.3 Vercel セキュリティ設定

1. **Custom Domain** の設定（推奨）
   - Vercel Dashboard → Settings → Domains
   - カスタムドメインを追加（例: `baba-waste.example.com`）
   - SSL 証明書が自動で発行される

2. **Environment Protection**
   - Production 環境への直接プッシュを制限
   - Preview デプロイで動作確認してから本番マージ

3. **Access Control**
   - Vercel の Access Control で IP 制限（オプション）

---

## 📊 Phase 5: モニタリング設定

### 5.1 Vercel Analytics（推奨）

1. Vercel Dashboard → Analytics に移動
2. Analytics を有効化
3. 以下のメトリクスを監視：
   - Page Views
   - Unique Visitors
   - Top Pages
   - Performance Metrics

### 5.2 Supabase Monitoring

1. Supabase Dashboard → Reports に移動
2. 以下のメトリクスを監視：
   - Database Size
   - Active Connections
   - API Requests
   - Storage Usage

### 5.3 エラー監視（推奨: Sentry）

#### Sentry セットアップ（オプション）

```bash
# Sentry インストール
cd next-app
pnpm add @sentry/nextjs
```

#### Sentry 設定

```typescript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  {
    // Next.js config
  },
  {
    // Sentry config
    silent: true,
    org: 'your-org',
    project: 'baba-waste',
  }
);
```

---

## 🔄 Phase 6: CI/CD パイプライン

### 6.1 GitHub Actions（既に設定済み）

`.github/workflows/ci.yml` が以下を自動実行：

- ✅ Type Check
- ✅ Lint
- ✅ Unit Tests
- ✅ Integration Tests
- ✅ Build
- ✅ E2E Tests

### 6.2 Vercel 自動デプロイ

- `main` ブランチへのプッシュ → **Production デプロイ**
- Pull Request → **Preview デプロイ**

---

## 📝 Phase 7: バックアップ戦略

### 7.1 Supabase 自動バックアップ

**Pro プラン以上**: 自動バックアップが有効

- **日次バックアップ**: 7日間保持
- **週次バックアップ**: 4週間保持
- **月次バックアップ**: 3ヶ月保持

### 7.2 手動バックアップ

#### データベース全体のバックアップ

```bash
# pg_dump でバックアップ
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

#### 特定テーブルのバックアップ

```bash
# 特定のスキーマのみバックアップ
pg_dump "$DATABASE_URL" --schema=app > backup_app_$(date +%Y%m%d).sql
```

### 7.3 バックアップからの復元

```bash
# バックアップから復元
psql "$DATABASE_URL" < backup_20251013.sql
```

---

## 🚨 トラブルシューティング

### Issue 1: ビルドエラー

**症状**: Vercel でビルドが失敗する

**解決方法**:
1. ローカルで `pnpm run build` を実行して確認
2. TypeScript エラーを修正
3. 環境変数が正しく設定されているか確認

### Issue 2: データベース接続エラー

**症状**: `Error: connect ETIMEDOUT` が発生

**解決方法**:
1. `DATABASE_URL` が正しいか確認
2. Supabase のネットワーク制限を確認
3. Vercel の環境変数が正しく設定されているか確認

### Issue 3: Prisma Client エラー

**症状**: `PrismaClientInitializationError` が発生

**解決方法**:
1. `pnpm prisma generate` を実行
2. Vercel のビルド設定で `prisma generate` が実行されているか確認
3. `package.json` の `postinstall` スクリプトを追加：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Issue 4: 環境変数が反映されない

**症状**: 環境変数が `undefined` になる

**解決方法**:
1. Vercel の環境変数設定を確認
2. `NEXT_PUBLIC_` プレフィックスが必要な変数か確認
3. Vercel を再デプロイ

---

## 📞 サポート

### 公式ドキュメント

- **Next.js**: https://nextjs.org/docs
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Prisma**: https://www.prisma.io/docs

### コミュニティ

- **Next.js Discord**: https://discord.gg/nextjs
- **Supabase Discord**: https://discord.supabase.com/

---

## ✅ デプロイメント完了チェックリスト

- [ ] Supabase 本番プロジェクト作成完了
- [ ] データベーススキーママイグレーション完了
- [ ] RLS ポリシー適用完了
- [ ] Vercel プロジェクト作成完了
- [ ] 環境変数設定完了
- [ ] 初回デプロイ成功
- [ ] 動作確認チェックリスト完了
- [ ] セキュリティ設定完了
- [ ] モニタリング設定完了
- [ ] バックアップ戦略確立
- [ ] カスタムドメイン設定完了（オプション）

---

**本番環境デプロイメント完了！** 🎉

**次のステップ**: ユーザー受け入れテスト（UAT）の実施

---

**作成日**: 2025-10-13  
**作成者**: BABA Waste Management System Development Team  


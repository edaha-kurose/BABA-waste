# BABA Waste Management System 🗑️

**バージョン**: 1.0.0  
**最終更新日**: 2025-10-13

廃棄物管理を効率化する統合管理システム

---

## 📋 概要

BABA Waste Management System は、産業廃棄物・一般廃棄物の収集・運搬・処分を一元管理するためのWebアプリケーションです。

### 主要機能

- ✅ **認証・認可**: Supabase Auth + RBAC（6ロール、32権限）
- ✅ **ダッシュボード**: KPIカード、月次推移グラフ、店舗別比較、廃棄物種別内訳
- ✅ **組織・店舗管理**: 組織・店舗の CRUD 操作
- ✅ **収集予定・実績管理**: 収集予定・依頼・実績の管理
- ✅ **請求管理**: 回収実績ベースの請求データ自動生成、Excel 出力
- ✅ **廃棄物マスター管理**: JWNET 廃棄物コードマスター、廃棄物種別マスター
- ✅ **JWNET 連携**: マニフェスト登録、予約作成、マニフェスト照会、事業者組み合わせマスター
- ✅ **データ可視化**: Recharts による美しいグラフ表示

---

## 🏗️ アーキテクチャ

### Tech Stack

- **Frontend/BFF**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma 5+
- **UI Library**: Ant Design + Tailwind CSS
- **Charts**: Recharts
- **Excel**: ExcelJS
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

### ディレクトリ構造

```
next-app/
├── prisma/
│   ├── schema.prisma          # Prisma スキーマ定義
│   └── migrations/            # マイグレーションファイル
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API Routes
│   │   ├── dashboard/        # ダッシュボード UI
│   │   └── login/            # ログイン UI
│   ├── components/           # 共通コンポーネント
│   ├── lib/                  # ライブラリ・ユーティリティ
│   └── types/                # 型定義
├── tests/                    # テストコード
│   ├── api/                  # API Integration Tests
│   └── e2e/                  # E2E Tests (Playwright)
├── docs/                     # ドキュメント
├── vercel.json               # Vercel 設定
└── package.json              # 依存関係

```

---

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- pnpm 8+
- Supabase アカウント
- Git

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/BABA-waste.git
cd BABA-waste/next-app
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定：

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# JWNET API (Optional)
JWNET_API_URL=https://api.jwnet.or.jp
JWNET_API_KEY=your-api-key
JWNET_SUBSCRIBER_NO=1234567
JWNET_PUBLIC_CONFIRM_NO=123456
```

詳細は `ENV_TEMPLATE.txt` を参照してください。

### 4. Prisma Client の生成

```bash
pnpm prisma generate
```

### 5. データベースマイグレーション（開発環境）

```bash
pnpm prisma migrate dev
```

### 6. 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

---

## 📦 主要コマンド

### 開発

```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# 本番サーバー起動
pnpm start

# Lint
pnpm lint
```

### Prisma

```bash
# Prisma Client 生成
pnpm prisma:generate

# Prisma Studio 起動（GUI）
pnpm prisma:studio

# スキーマを Pull（既存DBから）
pnpm prisma:pull

# スキーマを Push（開発環境）
pnpm prisma:push

# マイグレーション作成
pnpm prisma:migrate
```

### テスト

```bash
# Unit Tests
pnpm test

# API Integration Tests
pnpm test:api

# E2E Tests
pnpm test:e2e

# E2E Tests (UI モード)
pnpm test:e2e:ui
```

---

## 📊 データベーススキーマ

### スキーマ構成

- **`public`**: Supabase デフォルトスキーマ
- **`app`**: アプリケーションデータ（組織、店舗、収集実績、請求など）
- **`auth`**: 認証データ（Supabase Auth）

### 主要テーブル

| テーブル | 説明 |
|---------|------|
| `app.organizations` | 組織 |
| `app.users` | ユーザー |
| `app.stores` | 店舗 |
| `app.plans` | 収集予定 |
| `app.collection_requests` | 収集依頼 |
| `app.collections` | 収集実績 |
| `app.billing_items` | 請求明細 |
| `app.billing_summaries` | 請求サマリー |
| `app.jwnet_party_combinations` | JWNET 事業者組み合わせマスター |
| `app.jwnet_waste_codes` | JWNET 廃棄物コードマスター |
| `app.waste_type_masters` | 廃棄物種別マスター |

### スキーマ変更

スキーマ変更は必ず Prisma マイグレーションを使用してください：

```bash
# マイグレーション作成
pnpm prisma migrate dev --name your_migration_name

# マイグレーション適用（本番）
pnpm prisma migrate deploy
```

---

## 🔐 認証・認可

### ロール

- `ADMIN`: システム管理者
- `COLLECTOR`: 収集業者
- `TRANSPORTER`: 運搬業者
- `DISPOSER`: 処分業者
- `EMITTER`: 排出事業者
- `USER`: 一般ユーザー

### 権限

32種類の権限が定義されています。詳細は `docs/RBAC_SPEC.md` を参照してください。

---

## 📈 本番デプロイ

### Vercel へのデプロイ

詳細な手順は `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` を参照してください。

#### クイックデプロイ

1. **Vercel プロジェクト作成**
   - Vercel にログイン
   - GitHub リポジトリを連携
   - Root Directory を `next-app` に設定

2. **環境変数設定**
   - Vercel Dashboard で環境変数を設定
   - `ENV_TEMPLATE.txt` を参照

3. **デプロイ**
   - `main` ブランチにプッシュで自動デプロイ

---

## 🧪 テスト

### テスト戦略

- **Unit Tests**: Vitest
- **Integration Tests**: Vitest + Prisma
- **E2E Tests**: Playwright

### テスト実行

```bash
# すべてのテストを実行
pnpm test

# API テストのみ実行
pnpm test:api

# E2E テストを実行
pnpm test:e2e

# E2E テストを UI モードで実行
pnpm test:e2e:ui
```

### UAT（ユーザー受け入れテスト）

UATチェックリストは `docs/UAT_CHECKLIST.md` を参照してください。

---

## 📝 ドキュメント

### 開発ドキュメント

- **ガードレール設定**: `.cursor/rules/global-rules.md`
- **スキーマ変更ガイドライン**: `docs/SCHEMA_CHANGE_GUIDELINES.md`
- **アーキテクチャマイグレーション分析**: `docs/ARCHITECTURE_MIGRATION_ANALYSIS.md`

### 運用ドキュメント

- **本番環境デプロイメントガイド**: `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- **運用手順書**: `docs/OPERATION_GUIDE.md`
- **UATチェックリスト**: `docs/UAT_CHECKLIST.md`

### 完了レポート

- **Phase 4-A**: `docs/PHASE4A_COMPLETION_REPORT.md`
- **Phase 4-B**: `docs/PHASE4B_COMPLETION_REPORT.md`
- **Phase 4-B.5**: `docs/PHASE4B5_COMPLETION_REPORT.md`
- **Phase 4-C**: `docs/PHASE4C_COMPLETION_REPORT.md`
- **Phase 5**: `docs/PHASE5_COMPLETION_REPORT.md`

---

## 🛠️ トラブルシューティング

### Issue 1: Prisma Client エラー

**症状**: `PrismaClientInitializationError` が発生

**解決方法**:
```bash
pnpm prisma generate
```

### Issue 2: 環境変数が読み込まれない

**症状**: `DATABASE_URL is undefined`

**解決方法**:
1. `.env.local` が正しく作成されているか確認
2. Next.js を再起動

### Issue 3: ビルドエラー

**症状**: `pnpm build` が失敗する

**解決方法**:
```bash
# 依存関係を再インストール
rm -rf node_modules
pnpm install

# Prisma Client を再生成
pnpm prisma generate

# 再度ビルド
pnpm build
```

---

## 🤝 コントリビューション

### ブランチ戦略

- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド設定など
```

### Pull Request

1. `develop` ブランチから `feature/*` ブランチを作成
2. 実装・テスト
3. Pull Request を作成
4. コードレビュー
5. `develop` にマージ

---

## 📞 サポート

### 問い合わせ

- **Email**: support@baba-waste.example.com
- **GitHub Issues**: https://github.com/YOUR_USERNAME/BABA-waste/issues

### ドキュメント

- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Supabase**: https://supabase.com/docs
- **Ant Design**: https://ant.design/docs/react/introduce

---

## 📄 ライセンス

Proprietary - All Rights Reserved

© 2025 BABA Waste Management System. All rights reserved.

---

## 🙏 謝辞

- **Next.js**: https://nextjs.org/
- **Prisma**: https://www.prisma.io/
- **Supabase**: https://supabase.com/
- **Ant Design**: https://ant.design/
- **Recharts**: https://recharts.org/

---

**Built with ❤️ by BABA Waste Management System Development Team**

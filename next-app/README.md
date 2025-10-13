# BABA Waste Management System - Next.js App

Phase 2-3で構築されたNext.js 14 + Prisma + Supabaseの新しいアーキテクチャ。

## 🚀 Getting Started

### 前提条件
- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (Supabase)

### セットアップ

1. 依存関係のインストール
```bash
cd next-app
pnpm install
```

2. **環境変数の設定（重要）**
```bash
cp .env.local.example .env.local
# .env.localファイルを編集してデータベース接続情報を設定
```

**必須環境変数**:
- `DATABASE_URL`: Supabase接続文字列
- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトURL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

3. Prismaのセットアップ
```bash
# Prismaクライアント生成
pnpm prisma:generate

# Prisma Studioでデータ確認
pnpm prisma:studio
```

4. 開発サーバー起動
```bash
pnpm dev
```

ブラウザで http://localhost:3000 を開く

## ⚠️ 重要: 初回セットアップ

**データベース接続エラーが出る場合**:
```
Environment variable not found: DATABASE_URL
```

→ `.env.local`ファイルに`DATABASE_URL`を設定してください。

## 📁 プロジェクト構造

```
next-app/
├── src/
│   ├── app/                    # App Router
│   │   ├── api/               # BFF API Routes
│   │   │   ├── health/        # ヘルスチェック
│   │   │   ├── test/          # Prisma接続テスト
│   │   │   ├── organizations/ # 組織管理API
│   │   │   ├── stores/        # 店舗管理API
│   │   │   ├── plans/         # 収集予定API
│   │   │   ├── collections/   # 収集実績API
│   │   │   ├── collection-requests/ # 収集依頼API
│   │   │   └── item-maps/     # 品目マッピングAPI
│   │   ├── dashboard/         # ダッシュボード
│   │   │   ├── organizations/ # 組織管理画面
│   │   │   └── layout.tsx     # ダッシュボードレイアウト
│   │   ├── login/             # ログインページ
│   │   ├── layout.tsx         # ルートレイアウト
│   │   ├── page.tsx           # トップページ
│   │   └── globals.css        # グローバルスタイル
│   ├── components/             # Reactコンポーネント
│   └── lib/                   # ユーティリティ
│       ├── prisma.ts          # Prismaクライアント
│       └── auth.ts            # 認証ヘルパー
├── prisma/
│   └── schema.prisma          # Prismaスキーマ
├── tests/
│   ├── api/                   # API統合テスト
│   └── e2e/                   # E2Eテスト
├── middleware.ts              # Next.js Middleware（認証）
└── package.json
```

## 🛠️ 利用可能なスクリプト

- `pnpm dev` - 開発サーバー起動 (http://localhost:3000)
- `pnpm build` - プロダクションビルド
- `pnpm start` - プロダクションサーバー起動
- `pnpm lint` - ESLint実行
- `pnpm test` - Vitestテスト実行
- `pnpm test:api` - APIテスト実行
- `pnpm test:e2e` - E2Eテスト実行
- `pnpm test:e2e:ui` - E2EテストUI起動
- `pnpm prisma:generate` - Prismaクライアント生成
- `pnpm prisma:studio` - Prisma Studio起動
- `pnpm prisma:pull` - DBからスキーマ取得
- `pnpm prisma:push` - スキーマをDBに反映
- `pnpm prisma:migrate` - マイグレーション作成・実行

## 🏗️ アーキテクチャ

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5+
- **ORM**: Prisma 5+
- **Database**: Supabase PostgreSQL
- **Styling**: Tailwind CSS + Ant Design
- **Validation**: Zod
- **Auth**: Supabase Auth
- **Testing**: Vitest + Playwright

### BFF (Backend for Frontend)
Next.js API Routesを使用してBFFレイヤーを実装。

#### 実装済みAPI（Phase 3）
- `GET /api/health` - ヘルスチェック
- `GET /api/test` - Prisma接続テスト
- **Organizations API** (CRUD完備)
- **Stores API** (CRUD + 検索・フィルタ)
- **Plans API** (CRUD + ステータス管理)
- **Collections API** (CRUD + 実績登録)
- **Collection Requests API** (CRUD) ← NEW!
- **Item Maps API** (CRUD + 検索) ← NEW!

### Data Flow
```
UI (React) → API Routes → Prisma → Supabase PostgreSQL
```

## 🔐 認証

### Middleware
`middleware.ts`で認証を管理。

- 開発環境では認証をバイパス
- `/api/*`と`/dashboard/*`は認証必須
- `/api/health`と`/api/test`は認証不要

### 認証フロー
1. ユーザーがログインページでメール/パスワードを入力
2. Supabase Authで認証
3. JWTトークンをCookieに保存
4. Middlewareでトークン検証
5. 認証済みユーザーのみアクセス許可

## 📊 データベーススキーマ

### 実装済みテーブル
- `organizations` - 組織
- `user_org_roles` - ユーザー組織ロール
- `stores` - 店舗
- `item_maps` - 品目マッピング
- `plans` - 収集予定
- `collection_requests` - 収集依頼
- `collections` - 収集実績

## 🧪 テスト

### API テスト
```bash
# 全テスト実行
pnpm test

# APIテストのみ
pnpm test:api

# E2Eテスト
pnpm test:e2e

# E2EテストUI
pnpm test:e2e:ui
```

### 手動APIテスト
```bash
# Health Check
curl http://localhost:3000/api/health

# Prisma接続テスト
curl http://localhost:3000/api/test

# Organizations API
curl http://localhost:3000/api/organizations

# Collection Requests API
curl http://localhost:3000/api/collection-requests

# Item Maps API
curl http://localhost:3000/api/item-maps
```

## 📚 ドキュメント

- [Phase 2 移行計画](../docs/PHASE2_MIGRATION_PLAN.md)
- [Phase 2 完了レポート](../docs/PHASE2_COMPLETION_REPORT.md)
- [デプロイガイド](./docs/DEPLOYMENT.md)
- [技術的負債ステータス](../docs/TECHNICAL_DEBT_STATUS.md)
- [アーキテクチャ分析](../docs/ARCHITECTURE_MIGRATION_ANALYSIS.md)

## 🎯 Phase 3 実装中

### ✅ 完了した機能
1. **Collection Requests API** - 収集依頼管理（CRUD）
2. **Item Maps API** - 品目マッピング管理（CRUD + 検索）
3. **環境変数テンプレート** - `.env.local.example`

### 🔄 進行中の機能
- User Management API
- 店舗管理画面UI
- 収集予定管理画面UI

### 📈 進捗状況
- ✅ Next.js 14 + Prisma セットアップ
- ✅ Organizations API 完成
- ✅ Stores API 完成
- ✅ Plans API 完成
- ✅ Collections API 完成
- ✅ Collection Requests API 完成 ← NEW!
- ✅ Item Maps API 完成 ← NEW!
- ✅ ダッシュボードUI 基盤構築
- ✅ 認証・認可統合
- ✅ テスト基盤（Vitest + Playwright）
- ⏳ User Management API
- ⏳ UI拡充

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Ant Design Documentation](https://ant.design/components/overview/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

**Status**: Phase 3 進行中 🚀  
**Last Updated**: 2025-10-13

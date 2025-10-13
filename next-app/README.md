# BABA Waste Management System - Next.js App

Phase 2で構築されたNext.js 14 + Prisma + Supabaseの新しいアーキテクチャ。

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

2. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集してデータベース接続情報を設定
```

3. Prismaのセットアップ
```bash
# 既存DBからスキーマを取得（初回のみ）
pnpm prisma:pull

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

## 📁 プロジェクト構造

```
next-app/
├── src/
│   ├── app/                    # App Router
│   │   ├── api/               # BFF API Routes
│   │   │   ├── health/        # ヘルスチェック
│   │   │   ├── organizations/ # 組織管理API
│   │   │   ├── stores/        # 店舗管理API
│   │   │   ├── plans/         # 収集予定API
│   │   │   └── collections/   # 収集実績API
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
├── middleware.ts              # Next.js Middleware（認証）
└── package.json
```

## 🛠️ 利用可能なスクリプト

- `pnpm dev` - 開発サーバー起動 (http://localhost:3000)
- `pnpm build` - プロダクションビルド
- `pnpm start` - プロダクションサーバー起動
- `pnpm lint` - ESLint実行
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

### BFF (Backend for Frontend)
Next.js API Routesを使用してBFFレイヤーを実装。

#### 実装済みAPI
- `GET /api/health` - ヘルスチェック
- `GET /api/organizations` - 組織一覧取得
- `POST /api/organizations` - 組織作成
- `GET /api/organizations/[id]` - 組織詳細取得
- `PATCH /api/organizations/[id]` - 組織更新
- `DELETE /api/organizations/[id]` - 組織削除
- `GET /api/stores` - 店舗一覧取得（検索・フィルタ対応）
- `POST /api/stores` - 店舗作成
- `GET /api/stores/[id]` - 店舗詳細取得
- `PATCH /api/stores/[id]` - 店舗更新
- `DELETE /api/stores/[id]` - 店舗削除
- `GET /api/plans` - 収集予定一覧取得
- `POST /api/plans` - 収集予定作成
- `GET /api/plans/[id]` - 収集予定詳細取得
- `PATCH /api/plans/[id]` - 収集予定更新
- `DELETE /api/plans/[id]` - 収集予定削除
- `GET /api/collections` - 収集実績一覧取得
- `POST /api/collections` - 収集実績作成
- `GET /api/collections/[id]` - 収集実績詳細取得
- `PATCH /api/collections/[id]` - 収集実績更新
- `DELETE /api/collections/[id]` - 収集実績削除

### Data Flow
```
UI (React) → API Routes → Prisma → Supabase PostgreSQL
```

## 🔐 認証

### Middleware
`middleware.ts`で認証を管理。

- 開発環境では認証をバイパス
- `/api/*`と`/dashboard/*`は認証必須
- `/api/health`は認証不要

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
# Health Check
curl http://localhost:3000/api/health

# Organizations API
curl http://localhost:3000/api/organizations

# Stores API
curl "http://localhost:3000/api/stores?org_id=xxx"

# Plans API
curl "http://localhost:3000/api/plans?org_id=xxx&from_date=2024-01-01"

# Collections API
curl "http://localhost:3000/api/collections?org_id=xxx"
```

## 📚 ドキュメント

- [Phase 2 移行計画](../docs/PHASE2_MIGRATION_PLAN.md)
- [技術的負債ステータス](../docs/TECHNICAL_DEBT_STATUS.md)
- [アーキテクチャ分析](../docs/ARCHITECTURE_MIGRATION_ANALYSIS.md)

## 🎯 Phase 2-2 実装完了

### ✅ 完了した機能
1. **Stores API** - 店舗管理（CRUD + 検索・フィルタ）
2. **Plans API** - 収集予定管理（CRUD + ステータス管理）
3. **Collections API** - 収集実績管理（CRUD + 実績登録）
4. **ダッシュボードUI** - 統計表示、組織一覧画面
5. **認証システム** - Middleware、ログインページ、認証ヘルパー

### 📈 進捗状況
- ✅ Next.js 14 + Prisma セットアップ
- ✅ Organizations API 完成
- ✅ Stores API 完成
- ✅ Plans API 完成
- ✅ Collections API 完成
- ✅ ダッシュボードUI 基盤構築
- ✅ 認証・認可統合
- ⏳ E2Eテスト
- ⏳ 既存Viteアプリからの段階的移行

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Ant Design Documentation](https://ant.design/components/overview/)

---

**Status**: Phase 2-2 完了 ✅

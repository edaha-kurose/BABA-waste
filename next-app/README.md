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
│   ├── app/              # App Router
│   │   ├── api/         # BFF API Routes
│   │   ├── dashboard/   # ダッシュボード
│   │   └── ...
│   ├── components/       # Reactコンポーネント
│   └── lib/             # ユーティリティ
│       └── prisma.ts    # Prismaクライアント
├── prisma/
│   └── schema.prisma    # Prismaスキーマ
└── public/              # 静的ファイル
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

- **API Routes**: `/app/api/*` - RESTful API
- **Server Actions**: `/app/actions/*` - Form Actions

### Data Flow
```
UI (React) → Server Actions / API Routes → Prisma → Supabase PostgreSQL
```

## 📚 ドキュメント

- [Phase 2 移行計画](../docs/PHASE2_MIGRATION_PLAN.md)
- [技術的負債ステータス](../docs/TECHNICAL_DEBT_STATUS.md)
- [アーキテクチャ分析](../docs/ARCHITECTURE_MIGRATION_ANALYSIS.md)

## 🔗 関連リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Status**: Phase 2 進行中 🚧


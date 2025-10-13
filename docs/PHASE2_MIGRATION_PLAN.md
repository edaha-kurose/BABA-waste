# Phase 2: アーキテクチャ改善 - 詳細移行計画

最終更新: 2025-10-13

## 🎯 目標

Vite + React + Dexie/Supabase直接アクセスから  
→ **Next.js 14+ App Router + Prisma + BFF** への移行

## 📋 前提条件

### 現在のアーキテクチャ
- **フロントエンド**: Vite + React + TypeScript
- **データアクセス**: 
  - Dexie (IndexedDB) - ローカル
  - Supabase直接アクセス - リモート
- **型定義**: Zod schemas (`contracts/v0/schema.ts`)
- **スタイリング**: Tailwind CSS + Ant Design

### 目標アーキテクチャ
- **フロントエンド**: Next.js 14+ App Router (React Server Components)
- **BFFレイヤー**: Next.js API Routes / Server Actions
- **データアクセス**: Prisma ORM → Supabase PostgreSQL
- **型定義**: Prisma + Zod (統合)
- **スタイリング**: Tailwind CSS + Ant Design (維持)

## 🚀 実施戦略

### 戦略: 並行開発 + 段階的移行

既存のViteアプリを動作させたまま、Next.jsアプリを並行構築し、段階的に移行する。

#### メリット
- ✅ 既存機能が壊れない
- ✅ リスクが低い
- ✅ いつでもロールバック可能
- ✅ 段階的なテスト・検証が可能

#### ディレクトリ構造
```
BABA-waste/
├── src/                    # 既存Viteアプリ（維持）
├── next-app/              # 新Next.jsアプリ（新規）
│   ├── app/               # App Router
│   │   ├── api/          # BFF API Routes
│   │   ├── (auth)/       # 認証ルート
│   │   ├── dashboard/    # ダッシュボード
│   │   └── ...
│   ├── components/        # Reactコンポーネント
│   ├── lib/              # ユーティリティ
│   │   ├── prisma.ts    # Prismaクライアント
│   │   └── ...
│   └── prisma/           # Prisma設定
│       └── schema.prisma # スキーマ定義
├── contracts/             # 共有型定義（維持）
├── db/                   # DBスクリプト（維持）
└── ...
```

## 📅 実施スケジュール（4〜6週間）

### Week 1-2: セットアップ & 基盤構築
- [ ] Next.js 14プロジェクトの作成
- [ ] Prismaのセットアップ
- [ ] Prisma Schemaの定義（既存DBから）
- [ ] 基本的なBFF APIルートの作成
- [ ] 認証・認可の移行

### Week 3-4: コア機能の移行
- [ ] Organizations/Users管理
- [ ] Stores管理
- [ ] Plans/Reservations管理
- [ ] Collections管理

### Week 5-6: 高度な機能の移行 & 最適化
- [ ] JWNET連携
- [ ] ファイルアップロード
- [ ] レポート機能
- [ ] パフォーマンス最適化
- [ ] E2Eテスト

## 🔧 技術的詳細

### 1. Next.js 14+ セットアップ

#### インストール
```bash
# next-app ディレクトリを作成
pnpm create next-app@latest next-app --typescript --tailwind --app --src-dir --import-alias "@/*"
```

#### 設定
- **App Router**: 有効
- **TypeScript**: 厳格モード
- **Tailwind CSS**: 有効
- **src/ ディレクトリ**: 有効
- **Import Alias**: `@/*` → `./src/*`

### 2. Prisma セットアップ

#### インストール
```bash
cd next-app
pnpm add prisma @prisma/client
pnpm add -D prisma
```

#### 初期化
```bash
pnpm prisma init
```

#### スキーマ生成（既存DBから）
```bash
# DATABASE_URLを設定
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/db" > .env

# 既存DBからスキーマを自動生成
pnpm prisma db pull

# Prismaクライアント生成
pnpm prisma generate
```

### 3. Prisma Schema 設計

#### 基本方針
1. **既存のSupabaseスキーマを維持**
2. **RLS (Row Level Security) はSupabase側で管理**
3. **Prismaは型安全なクエリインターフェースとして利用**

#### 主要テーブル
```prisma
// prisma/schema.prisma (サンプル)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Organization {
  id         String   @id @default(uuid()) @db.Uuid
  name       String   @db.VarChar(255)
  code       String   @unique @db.VarChar(50)
  created_at DateTime @default(now()) @db.Timestamptz
  updated_at DateTime @default(now()) @updatedAt @db.Timestamptz
  
  // Relations
  stores     Store[]
  users      UserOrgRole[]
  
  @@map("organizations")
  @@schema("app")
}

model Store {
  id             String   @id @default(uuid()) @db.Uuid
  org_id         String   @db.Uuid
  store_code     String   @db.VarChar(50)
  name           String   @db.VarChar(255)
  address        String?  @db.VarChar(500)
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now()) @db.Timestamptz
  updated_at     DateTime @default(now()) @updatedAt @db.Timestamptz
  
  // Relations
  organization   Organization @relation(fields: [org_id], references: [id])
  
  @@unique([org_id, store_code])
  @@map("stores")
  @@schema("app")
}

// ... 他のテーブル
```

### 4. BFF API Routes 設計

#### 基本パターン
```typescript
// next-app/app/api/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/organizations
export async function GET(request: NextRequest) {
  try {
    const organizations = await prisma.organization.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    })
    
    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Failed to fetch organizations:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// POST /api/organizations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Zodでバリデーション
    const schema = z.object({
      name: z.string().min(1),
      code: z.string().min(1),
    })
    
    const data = schema.parse(body)
    
    const organization = await prisma.organization.create({
      data,
    })
    
    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
```

#### Server Actions パターン
```typescript
// next-app/app/actions/organizations.ts
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function createOrganization(formData: FormData) {
  const schema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
  })
  
  const data = schema.parse({
    name: formData.get('name'),
    code: formData.get('code'),
  })
  
  const organization = await prisma.organization.create({
    data,
  })
  
  revalidatePath('/dashboard/organizations')
  
  return organization
}
```

### 5. 認証・認可の移行

#### Supabase Authを継続利用
```typescript
// next-app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### Middleware for Auth
```typescript
// next-app/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Supabase Auth チェック
  const token = request.cookies.get('sb-access-token')
  
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
}
```

## 📊 移行チェックリスト

### Phase 2-1: セットアップ（Week 1）
- [ ] Next.js 14プロジェクト作成
- [ ] Prismaインストール & 初期化
- [ ] DATABASE_URL設定
- [ ] Prisma db pull実行
- [ ] Prisma generate実行
- [ ] 基本的なPrismaクライアントセットアップ
- [ ] Next.js開発サーバー起動確認

### Phase 2-2: Prisma Schema定義（Week 1-2）
- [ ] Organizations スキーマ
- [ ] Users/UserOrgRoles スキーマ
- [ ] Stores スキーマ
- [ ] ItemMaps スキーマ
- [ ] Plans スキーマ
- [ ] Collections スキーマ
- [ ] JWNET関連スキーマ
- [ ] リレーション定義
- [ ] インデックス最適化

### Phase 2-3: BFF API構築（Week 2-3）
- [ ] `/api/organizations` エンドポイント
- [ ] `/api/stores` エンドポイント
- [ ] `/api/plans` エンドポイント
- [ ] `/api/collections` エンドポイント
- [ ] エラーハンドリング統一
- [ ] Zodバリデーション統一
- [ ] ロギング実装

### Phase 2-4: UI移行（Week 3-4）
- [ ] ログインページ
- [ ] ダッシュボード
- [ ] Organizations管理画面
- [ ] Stores管理画面
- [ ] Plans管理画面
- [ ] Collections管理画面

### Phase 2-5: テスト & 最適化（Week 5-6）
- [ ] E2Eテスト（Playwright）
- [ ] APIテスト
- [ ] パフォーマンス測定
- [ ] SEO最適化
- [ ] エラーモニタリング（Sentry）

## 🔒 ガードレール遵守

### 必須事項
- ✅ **DB契約ファースト**: Prisma Schemaは既存DBから生成
- ✅ **Additive DDL**: 既存テーブル・カラムは変更しない
- ✅ **RLS管理**: Supabase側のRLSポリシーを維持
- ✅ **型安全性**: Prisma + Zod で完全な型安全性
- ✅ **段階的移行**: 既存機能を壊さない

### 禁止事項
- ❌ 既存のViteアプリを削除（移行完了まで）
- ❌ 既存のDBスキーマを破壊的に変更
- ❌ Dexieを完全削除（移行完了まで）

## 📚 参考資料

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Prisma with Next.js](https://www.prisma.io/nextjs)

---

**次のステップ**: Next.jsプロジェクトの作成とPrismaのセットアップを開始します。


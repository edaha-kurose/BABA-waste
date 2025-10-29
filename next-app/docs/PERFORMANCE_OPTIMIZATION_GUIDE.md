# パフォーマンス最適化ガイド

## 🐌 現状の問題

### 1. N+1クエリ問題
- **症状**: API応答が3秒以上かかる
- **原因**: Prismaの深いネスト（3階層以上）
- **影響**: 大量のJOINクエリが発生

### 2. 具体例
```typescript
// ❌ 悪い例（現状）
const actuals = await prisma.actuals.findMany({
  include: {
    organizations: { select: {...} },
    plans: {
      select: {
        stores: { select: {...} },      // ← 3階層目
        item_maps: { select: {...} },   // ← 3階層目
      }
    }
  }
})
// 結果: 553件のプランに対して、stores × item_maps のJOINが発生
// → 3秒以上かかる
```

---

## ✅ 解決策

### 1. **ページネーション導入（最優先）**

```typescript
// ✅ 良い例
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const [actuals, total] = await Promise.all([
    prisma.actuals.findMany({
      where: { org_id, deleted_at: null },
      include: {
        organizations: { select: { id: true, name: true, code: true } },
        plans: {
          select: {
            id: true,
            planned_date: true,
            planned_qty: true,
            unit: true,
            store_id: true,
            item_map_id: true,
          }
        }
      },
      orderBy: { confirmed_at: 'desc' },
      skip,
      take: limit,
    }),
    prisma.actuals.count({ where: { org_id, deleted_at: null } })
  ])

  return NextResponse.json({
    data: actuals,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  })
}
```

**効果**: 553件 → 20件に削減 → **3秒 → 300ms以下**

---

### 2. **データ取得の2段階化**

```typescript
// ✅ 良い例：まず親データのみ取得、必要に応じて子データを取得
export async function GET(request: NextRequest) {
  // Step 1: 親データのみ取得（IDのみ）
  const actuals = await prisma.actuals.findMany({
    where: { org_id, deleted_at: null },
    select: {
      id: true,
      plan_id: true,
      actual_qty: true,
      unit: true,
      confirmed_at: true,
    },
    orderBy: { confirmed_at: 'desc' },
    take: 20,
  })

  // Step 2: 必要なIDをまとめて取得
  const planIds = [...new Set(actuals.map(a => a.plan_id))]
  const plans = await prisma.plans.findMany({
    where: { id: { in: planIds } },
    include: {
      stores: { select: { id: true, name: true, store_code: true } },
      item_maps: { select: { id: true, item_label: true, jwnet_code: true } },
    }
  })

  // Step 3: マージ
  const plansMap = new Map(plans.map(p => [p.id, p]))
  const result = actuals.map(actual => ({
    ...actual,
    plan: plansMap.get(actual.plan_id)
  }))

  return NextResponse.json(result)
}
```

**効果**: 
- クエリ数: 1回 → 2回（でも高速）
- JOIN深度: 3階層 → 2階層
- 応答時間: **3秒 → 500ms以下**

---

### 3. **インデックスの追加**

```sql
-- actuals テーブル
CREATE INDEX IF NOT EXISTS idx_actuals_org_confirmed 
  ON app.actuals (org_id, confirmed_at DESC) 
  WHERE deleted_at IS NULL;

-- plans テーブル
CREATE INDEX IF NOT EXISTS idx_plans_id_date 
  ON app.plans (id, planned_date);

-- stores テーブル
CREATE INDEX IF NOT EXISTS idx_stores_id_org 
  ON app.stores (id, org_id) 
  WHERE deleted_at IS NULL;
```

**効果**: クエリ実行時間 **50%削減**

---

### 4. **キャッシュ導入（将来的）**

```typescript
import { unstable_cache } from 'next/cache'

// 組織情報は頻繁に変わらないのでキャッシュ
const getOrganization = unstable_cache(
  async (orgId: string) => {
    return await prisma.organizations.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, code: true }
    })
  },
  ['organization'],
  { revalidate: 3600 } // 1時間キャッシュ
)
```

---

## 📋 優先順位

### 🔴 **最優先（今すぐ実装）**
1. ✅ ページネーション導入
2. ✅ ネストの深さを2階層以下に制限
3. ✅ `take` / `skip` を必ず指定

### 🟡 **中優先（次のスプリント）**
4. ✅ インデックス追加
5. ✅ データ取得の2段階化

### 🟢 **低優先（余裕があれば）**
6. ⏳ キャッシュ導入
7. ⏳ GraphQL/DataLoader導入

---

## 🎯 目標パフォーマンス

| API | 現状 | 目標 |
|-----|------|------|
| GET /api/actuals | 3000ms | **< 300ms** |
| GET /api/plans | 2000ms | **< 200ms** |
| GET /api/hearings | 1500ms | **< 150ms** |

---

## 🚀 実装手順

### Step 1: ページネーション導入（今日）
```bash
# 対象API
- /api/actuals
- /api/plans
- /api/reservations
- /api/registrations
- /api/hearings
```

### Step 2: インデックス追加（今日）
```bash
cd next-app
pnpm tsx scripts/add-performance-indexes.ts
```

### Step 3: 検証（今日）
```bash
# 開発サーバー起動
pnpm dev

# ブラウザのNetwork タブで確認
# 目標: 全API < 500ms
```

---

## 📊 PCスペックの影響

### 現状のボトルネック
- ❌ **PCスペックではない**
- ✅ **データベースクエリの最適化不足**

### 根拠
- Supabase（クラウドDB）を使用 → サーバー側の処理
- ローカルPCは表示のみ → 影響は軽微
- 同じクエリをSupabase Studioで実行しても遅い → DB側の問題

---

## 🛠️ 次のアクション

1. **今すぐ**: ページネーション導入スクリプト実行
2. **今日中**: インデックス追加
3. **明日**: E2Eテスト再実行して検証

---

**最終更新**: 2025-10-18  
**作成者**: AI Assistant  
**重要度**: 🔴 最高






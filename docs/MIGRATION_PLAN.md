# Desktop版 → Next.js版 完全移行計画

**作成日**: 2025-10-16  
**目的**: Vite版（BABA-waste-main）からNext.js版への全機能トレース

---

## 1. 機能ギャップ分析

### ✅ 実装済み（Next.js版）
| 機能 | ページ | API | 状態 |
|------|-------|-----|------|
| ログイン | ✅ `/login` | - | 完了 |
| ダッシュボード | ✅ `/dashboard` | ✅ `/api/statistics/dashboard` | 完了 |
| 組織管理 | ✅ `/dashboard/organizations` | ✅ `/api/organizations` | 完了 |
| 店舗管理 | ✅ `/dashboard/stores` | ✅ `/api/stores` | 完了 |
| 収集依頼 | ✅ `/dashboard/collection-requests` | ✅ `/api/collection-requests` | 完了 |
| 収集実績 | ✅ `/dashboard/collections` | ✅ `/api/collections` | 完了 |
| 請求管理 | ✅ `/dashboard/billing` | ✅ `/api/billing-summaries` | 完了 |

### ❌ 未実装（Next.js版）
| 機能 | Desktop版 | 行数 | 優先度 | 状態 |
|------|-----------|------|--------|------|
| **品目マップ管理** | `ItemMaps.tsx` | 400 | 🔴 HIGH | 未実装 |
| **収集業者管理** | `Collectors.tsx` | 407 | 🔴 HIGH | 未実装 |
| **エクセル取り込み** | `Plans.tsx` (L96-400) | 300+ | 🔴 HIGH | 未実装 |
| **実績管理** | `Actuals.tsx` | 443 | 🟠 MEDIUM | 未実装 |
| **予約管理** | `Reservations.tsx` | 258 | 🟠 MEDIUM | 未実装 |
| **登録管理** | `Registrations.tsx` | 255 | 🟠 MEDIUM | 未実装 |
| **ユーザー管理** | `Users.tsx` | 409 | 🟠 MEDIUM | 未実装 |
| **設定画面** | `Settings.tsx` | 279 | 🟢 LOW | 未実装 |
| **JWNETマスター** | `JwnetWasteCodes.tsx` | 515 | 🟠 MEDIUM | 未実装 |
| **店舗-業者割当** | `StoreCollectorAssignments.tsx` | 706 | 🔴 HIGH | 未実装 |
| **取り込み履歴** | `ImportHistory.tsx` | 415 | 🟢 LOW | 未実装 |
| **仮登録管理** | `TempRegistrationManagement.tsx` | 399 | 🟢 LOW | 未実装 |
| **テストデータ** | `TestDataManagement.tsx` | 401 | 🟢 LOW | 未実装 |
| **収集レポート** | `CollectionReport.tsx` | 445 | 🟠 MEDIUM | 未実装 |
| **廃棄依頼一覧** | `WasteRequestList.tsx` | 1205 | 🔴 HIGH | 未実装 |

---

## 2. 実装優先順位

### フェーズ1: コアマスタ機能（1-3日）
1. **品目マップ管理** (ItemMaps)
   - API: `/api/item-maps` (GET, POST, PUT, DELETE)
   - ページ: `/dashboard/item-maps`
   - テーブル: `item_maps`

2. **収集業者管理** (Collectors)
   - API: `/api/collectors` (GET, POST, PUT, DELETE)
   - ページ: `/dashboard/collectors`
   - テーブル: `users` (role='collector')

3. **店舗-業者割当** (StoreCollectorAssignments)
   - API: `/api/store-assignments` (GET, POST, PUT, DELETE)
   - ページ: `/dashboard/store-assignments`
   - テーブル: `store_collector_assignments`

### フェーズ2: エクセル取り込み（2-3日）
4. **エクセルパーサー実装**
   - ユーティリティ: `/lib/excel/parser.ts`
   - API: `/api/plans/import` (POST)
   - ページ: `/dashboard/plans` に統合

5. **予定データ取り込み**
   - 列マッピング機能
   - プレビュー機能
   - バリデーション

### フェーズ3: 業務フロー（3-5日）
6. **予約管理** (Reservations)
   - API: `/api/reservations`
   - ページ: `/dashboard/reservations`

7. **登録管理** (Registrations)
   - API: `/api/registrations`
   - ページ: `/dashboard/registrations`

8. **実績管理** (Actuals)
   - API: `/api/actuals`
   - ページ: `/dashboard/actuals`

### フェーズ4: 廃棄依頼一覧とヒアリング（3-4日）
9. **廃棄依頼一覧** (WasteRequestList)
   - API: `/api/waste-requests`
   - ページ: `/dashboard/waste-requests`
   - マトリクス表示機能

10. **カレンダー/マトリクス表示**
    - コンポーネント: `/components/ScheduleMatrix.tsx`
    - ヒアリング調整機能

### フェーズ5: 管理機能（2-3日）
11. **ユーザー管理** (Users)
    - API: `/api/users` (既存あり、拡張)
    - ページ: `/dashboard/users`

12. **JWNETマスター** (JwnetWasteCodes)
    - API: `/api/jwnet-waste-codes` (既存あり)
    - ページ: `/dashboard/jwnet-waste-codes`

13. **収集レポート** (CollectionReport)
    - API: `/api/reports/collections`
    - ページ: `/dashboard/collection-report`

### フェーズ6: 補助機能（1-2日）
14. **取り込み履歴** (ImportHistory)
    - API: `/api/import-histories`
    - ページ: `/dashboard/import-history` (既存あり)

15. **仮登録管理** (TempRegistrationManagement)
    - API: `/api/temp-registrations`
    - ページ: `/dashboard/temp-registrations` (既存あり)

16. **設定画面** (Settings)
    - ページ: `/dashboard/settings`

---

## 3. 技術スタック統一

### Desktop版 (Vite)
- **フロントエンド**: React 18 + Vite
- **状態管理**: React Hooks
- **ローカルDB**: Dexie (IndexedDB)
- **データ同期**: Supabase直接クエリ
- **ルーティング**: react-router-dom

### Next.js版 (移行先)
- **フロントエンド**: Next.js 14 App Router + React 18
- **状態管理**: React Hooks + Server Components
- **データベース**: Supabase PostgreSQL + Prisma ORM
- **バリデーション**: Zod
- **ルーティング**: Next.js App Router

---

## 4. データベーススキーマ確認

### 既存テーブル（確認済み）
- ✅ `app.users`
- ✅ `app.organizations`
- ✅ `app.stores`
- ✅ `app.item_maps`
- ✅ `app.plans`
- ✅ `app.collection_requests`
- ✅ `app.collections`
- ✅ `app.billing_summaries`
- ✅ `app.jwnet_waste_codes`
- ✅ `app.store_collector_assignments`

### 不足テーブル（要確認）
- ❓ `app.actuals` (実績テーブル)
- ❓ `app.reservations` (予約テーブル)
- ❓ `app.registrations` (登録テーブル)
- ❓ `app.import_histories` (取り込み履歴)
- ❓ `app.temp_registrations` (仮登録)

---

## 5. メニュー構造の統一

### Desktop版メニュー
```typescript
{
  { key: '/dashboard', label: 'ダッシュボード' },
  { key: '/waste-request-list', label: '廃棄依頼一覧' },
  { key: '/collection-registration', label: '回収情報登録' },
  { key: '/jwnet-registration-data', label: 'JWNET登録データ' },
  { key: '/collection-report', label: '回収実績データ' },
  { key: '/temp-registration-management', label: '仮登録管理' },
  { key: '/import-history', label: '取り込み履歴' },
  { key: '/store-management', label: '店舗管理' },
  { key: '/settings', label: '設定' },
}
```

### Next.js版メニュー（統一後）
```typescript
{
  { key: '/dashboard', label: 'ダッシュボード' },
  { key: '/dashboard/waste-requests', label: '廃棄依頼一覧' },
  { key: '/dashboard/plans', label: '収集予定管理' },
  { key: '/dashboard/collection-requests', label: '収集依頼' },
  { key: '/dashboard/collections', label: '収集実績' },
  { key: '/dashboard/actuals', label: '実績管理' },
  { key: '/dashboard/reservations', label: '予約管理' },
  { key: '/dashboard/registrations', label: '登録管理' },
  { key: '/dashboard/jwnet-data', label: 'JWNET登録データ' },
  { key: '/dashboard/collection-report', label: '回収実績レポート' },
  
  // マスタ管理
  { key: '/dashboard/organizations', label: '組織管理' },
  { key: '/dashboard/stores', label: '店舗管理' },
  { key: '/dashboard/item-maps', label: '品目マップ' },
  { key: '/dashboard/collectors', label: '収集業者' },
  { key: '/dashboard/store-assignments', label: '店舗-業者割当' },
  { key: '/dashboard/users', label: 'ユーザー管理' },
  { key: '/dashboard/jwnet-waste-codes', label: 'JWNETマスター' },
  
  // 履歴・設定
  { key: '/dashboard/import-history', label: '取り込み履歴' },
  { key: '/dashboard/temp-registrations', label: '仮登録管理' },
  { key: '/dashboard/settings', label: '設定' },
}
```

---

## 6. ガードレール遵守事項

### スキーマ変更
- [ ] `docs/guardrails/SCHEMA_CHANGE_GUIDELINES.md` 確認
- [ ] 影響範囲分析 (`pnpm schema:impact`)
- [ ] DDLは新規番号で作成
- [ ] ロールバック手順記載

### BFF実装
- [ ] `docs/guardrails/CURSOR_COMMON_SETTINGS_v3.3_BFF.md` 確認
- [ ] Prisma経由でDB操作
- [ ] Zodバリデーション
- [ ] エラーハンドリング

### インフラ設定
- [ ] `docs/guardrails/INFRASTRUCTURE_SETUP_CHECKLIST.md` 確認
- [ ] RLS設定
- [ ] 権限設定

---

## 7. 実装手順（各機能共通）

### Step 1: 影響範囲分析
```bash
pnpm schema:impact -- --table <table_name>
```

### Step 2: API実装
```typescript
// app/api/<resource>/route.ts
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  // Prisma経由でデータ取得
}

export async function POST(request: NextRequest) {
  // Zodバリデーション
  // Prismaトランザクション
}
```

### Step 3: ページ実装
```typescript
// app/dashboard/<resource>/page.tsx
'use client'

export default function ResourcePage() {
  // Ant Design UI
  // API呼び出し
}
```

### Step 4: テスト
```bash
pnpm typecheck
pnpm lint
pnpm test:e2e
```

---

## 8. 完了条件

- [ ] 全33ページ実装完了
- [ ] 全API実装完了
- [ ] メニュー構造統一
- [ ] E2Eテスト全通過
- [ ] ガードレール遵守確認
- [ ] ドキュメント更新

---

**推定期間**: 15-20日  
**開始日**: 2025-10-16  
**目標完了日**: 2025-11-05








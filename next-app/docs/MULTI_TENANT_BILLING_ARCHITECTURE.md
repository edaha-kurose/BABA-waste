# マルチテナント請求システム アーキテクチャ設計書

**作成日**: 2025-10-21  
**バージョン**: 1.0  
**適用プロジェクト**: BABA廃棄物管理システム

---

## 📋 目次

1. [概要](#概要)
2. [組織構造](#組織構造)
3. [請求フロー](#請求フロー)
4. [データモデル](#データモデル)
5. [権限管理](#権限管理)
6. [実装ガイド](#実装ガイド)
7. [テストケース](#テストケース)

---

## 概要

### システム概要

本システムは、**管理会社（BABA株式会社）**が複数の**排出企業（テナント）**の廃棄物管理を受託するマルチテナント型の請求システムです。

### 主要な登場人物

| 役割 | 説明 | 例 |
|------|------|-----|
| **排出企業（テナント）** | 廃棄物を排出する企業 | コスモス薬品、楽市楽座 |
| **管理会社（システム管理者）** | テナントの廃棄物管理を受託 | BABA株式会社 |
| **収集業者** | 各テナント専用の収集業者 | エコ回収東日本、エコクリーン東海 |

---

## 組織構造

### 階層構造

```
【マルチテナント構造】

排出企業（テナント）A: コスモス薬品株式会社
  org_id: 00000000-0000-0000-0000-000000000001
  org_type: EMITTER
  │
  ├─ 管理会社: BABA株式会社（受託管理）
  │   org_id: 12345678-1234-1234-1234-123456789012
  │   org_type: ADMIN
  │   role: システム管理者として全テナントを管理
  │
  ├─ 収集業者（コスモス薬品専用）
  │   ├─ エコ回収東日本（org_id = コスモス薬品）
  │   └─ リサイクルパートナーズ北日本（org_id = コスモス薬品）
  │
  ├─ 店舗（org_id = コスモス薬品）
  │   └─ 小倉店、大阪店、...
  │
  └─ 請求明細（org_id = コスモス薬品）


排出企業（テナント）B: 楽市楽座株式会社
  org_id: 00000000-0000-0000-0000-000000000004
  org_type: EMITTER
  │
  ├─ 管理会社: BABA株式会社（受託管理）
  │
  ├─ 収集業者（楽市楽座専用）
  │   ├─ エコクリーン東海（org_id = 楽市楽座）
  │   └─ グリーンパートナーズ関西（org_id = 楽市楽座）
  │
  ├─ 店舗（org_id = 楽市楽座）
  │   └─ 名古屋栄店、大阪難波店、...
  │
  └─ 請求明細（org_id = 楽市楽座）
```

### 重要な設計原則

1. ✅ **データ分離**: 各テナントのデータは `org_id` で完全に分離
2. ✅ **収集業者の所属**: 収集業者は各テナントに所属（`org_id = テナント`）
3. ✅ **管理会社の権限**: 管理会社は全テナントのデータにアクセス可能
4. ✅ **請求明細の所属**: 請求明細は各テナントに紐付く（`org_id = テナント`）

---

## 請求フロー

### 全体フロー

```
【請求の流れ】

Step 1: 回収実績記録（収集業者）
  収集業者「エコ回収東日本」（org_id = コスモス薬品）
  └─ コスモス薬品の店舗で回収
  └─ 実績データ記録
      → actuals (org_id = コスモス薬品)

Step 2: 請求明細作成（収集業者）
  収集業者「エコ回収東日本」
  └─ 回収実績から請求明細を自動生成
      → app_billing_items.create({
           org_id: コスモス薬品,
           collector_id: エコ回収東日本,
           store_id: 小倉店,
           amount: 10,000円
         })

Step 3: 請求内容確認・調整（管理会社）
  BABA株式会社の管理者がログイン
  └─ テナント選択: 🏥 コスモス薬品
  └─ 請求明細一覧を表示（org_id = コスモス薬品）
  └─ 請求内容を確認
  └─ 手数料を追加・調整
      → app_billing_items.update({
           amount: 10,500円（手数料5%込み）,
           notes: "管理手数料: 500円"
         })

Step 4: 請求書確定・発行（管理会社）
  BABA株式会社
  └─ 請求サマリー生成
  └─ 請求書PDF出力
  └─ コスモス薬品に請求書を発行
      請求元: BABA株式会社（管理会社として）
      請求先: コスモス薬品株式会社
```

### 管理会社の役割

| 役割 | 実施内容 |
|------|---------|
| **データ確認** | 収集業者からの請求明細を確認 |
| **手数料付加** | 管理手数料（固定額 or パーセンテージ）を追加 |
| **請求書確定** | 最終的な請求金額を確定 |
| **請求書発行** | 各テナント向けに請求書PDF出力 |

**重要**: 管理会社は実績報告を行わない（収集業者のみ）

---

## データモデル

### 主要テーブルと org_id の関係

| テーブル | org_id | 説明 |
|---------|--------|------|
| `organizations` | 自身のID | 組織マスター |
| `collectors` | テナントのID | 収集業者はテナントに所属 |
| `stores` | テナントのID | 店舗はテナントに所属 |
| `plans` | テナントのID | 収集予定はテナントに所属 |
| `actuals` | テナントのID | 回収実績はテナントに所属 |
| `app_billing_items` | テナントのID | 請求明細はテナントに所属 |
| `billing_summaries` | テナントのID | 請求サマリーはテナントに所属 |

### 請求明細（app_billing_items）の構造

```prisma
model app_billing_items {
  id                    String              @id
  org_id                String              // ← テナントのID
  collector_id          String              // 収集業者ID
  store_id              String?             // 店舗ID
  billing_month         DateTime            // 請求月
  item_name             String              // 品目名
  quantity              Float?              // 数量
  unit_price            Float?              // 単価
  amount                Float               // 小計（手数料前）
  tax_rate              Float               // 税率
  tax_amount            Float               // 税額
  total_amount          Float               // 合計（手数料込み）
  status                String              // DRAFT, SUBMITTED, APPROVED, PAID
  notes                 String?             // 備考（手数料詳細など）
  created_by            String?
  updated_by            String?
  // ...
}
```

---

## 権限管理

### ユーザー・組織・権限の関係

```typescript
// AuthUser インターフェース
export interface AuthUser {
  id: string                // app_users.id
  email: string             // メールアドレス
  org_id: string            // デフォルト org_id（最初の組織）
  org_ids: string[]         // 全所属組織の org_id 配列
  role: string              // ADMIN, EMITTER, etc.
  isAdmin: boolean          // 組織管理者フラグ
  isSystemAdmin: boolean    // システム管理者フラグ（org_type = ADMIN）
}
```

### システム管理者の判定

```typescript
// getAuthenticatedUser() での判定ロジック
const isSystemAdmin = dbUser.user_org_roles.some(
  r => r.organizations.org_type === 'ADMIN'
);
```

### アクセス制御パターン

#### パターン1: 通常ユーザー（テナント管理者）

```typescript
// 自分のテナントのデータのみ表示
const billingItems = await prisma.app_billing_items.findMany({
  where: {
    org_id: user.org_id,
    deleted_at: null,
  },
});
```

#### パターン2: システム管理者（選択されたテナントのデータ）

```typescript
// テナント選択に基づいてデータを表示
const { searchParams } = new URL(request.url);
const selectedOrgId = searchParams.get('org_id');

// 管理可能な組織か確認
if (!user.org_ids.includes(selectedOrgId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

const billingItems = await prisma.app_billing_items.findMany({
  where: {
    org_id: selectedOrgId,
    deleted_at: null,
  },
});
```

#### パターン3: システム管理者（全テナントのデータ）

```typescript
// 全テナントのデータを一括表示（ダッシュボードなど）
const billingItems = await prisma.app_billing_items.findMany({
  where: {
    org_id: { in: user.org_ids.filter(id => id !== ADMIN_ORG_ID) },
    deleted_at: null,
  },
});
```

---

## 実装ガイド

### 1. 認証・権限管理

#### session-server.ts の修正

```typescript
// next-app/src/lib/auth/session-server.ts

export interface AuthUser {
  id: string
  email: string
  org_id: string
  org_ids: string[]         // 🆕 追加
  role: string
  isAdmin: boolean
  isSystemAdmin: boolean    // 🆕 追加
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthUser | null> {
  // ... Supabase Auth 検証 ...

  const dbUser = await prisma.app_users.findFirst({
    where: { auth_user_id: user.id },
    include: {
      user_org_roles: {
        where: { is_active: true },
        include: {
          organizations: true,
        },
      },
    },
  })

  // 🆕 システム管理者判定
  const isSystemAdmin = dbUser.user_org_roles.some(
    r => r.organizations.org_type === 'ADMIN'
  );

  const primaryOrgRole = dbUser.user_org_roles[0];

  return {
    id: dbUser.id,
    email: dbUser.email,
    org_id: primaryOrgRole.org_id,
    org_ids: dbUser.user_org_roles.map(r => r.org_id),
    role: primaryOrgRole.role,
    isAdmin: primaryOrgRole.role === 'ADMIN',
    isSystemAdmin,
  }
}
```

---

### 2. API実装パターン

#### 管理可能テナント一覧API

```typescript
// next-app/src/app/api/organizations/managed-tenants/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  
  if (!user || !user.isSystemAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenants = await prisma.organizations.findMany({
    where: {
      id: { in: user.org_ids },
      org_type: 'EMITTER',
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });

  return NextResponse.json({ data: tenants });
}
```

#### 請求明細API（テナント選択対応）

```typescript
// next-app/src/app/api/billing-items/route.ts

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  let targetOrgId = user.org_id;
  
  if (user.isSystemAdmin) {
    const selectedOrgId = searchParams.get('org_id');
    
    if (selectedOrgId && user.org_ids.includes(selectedOrgId)) {
      targetOrgId = selectedOrgId;
    } else if (!selectedOrgId) {
      // 全テナントのデータ
      const allBillingItems = await prisma.app_billing_items.findMany({
        where: {
          org_id: { in: user.org_ids },
          deleted_at: null,
        },
      });
      return NextResponse.json({ data: allBillingItems });
    }
  }

  const billingItems = await prisma.app_billing_items.findMany({
    where: {
      org_id: targetOrgId,
      deleted_at: null,
    },
  });

  return NextResponse.json({ data: billingItems });
}
```

---

### 3. フロントエンド実装

#### テナント選択コンポーネント

```typescript
// next-app/src/components/TenantSelector.tsx

'use client'

import { useState, useEffect } from 'react'
import { Select, Spin } from 'antd'
import { useSession } from '@/hooks/useSession'

interface Tenant {
  id: string
  name: string
  code: string
}

export function TenantSelector() {
  const { user } = useSession()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.isSystemAdmin) {
      fetchTenants()
    }
  }, [user])

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/organizations/managed-tenants')
      const data = await response.json()
      setTenants(data.data)
      
      // デフォルト選択（セッションストレージから復元）
      const saved = sessionStorage.getItem('selected_org_id')
      if (saved && data.data.some((t: Tenant) => t.id === saved)) {
        setSelectedOrgId(saved)
      } else if (data.data.length > 0) {
        setSelectedOrgId(data.data[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (orgId: string) => {
    setSelectedOrgId(orgId)
    sessionStorage.setItem('selected_org_id', orgId)
    
    // イベントを発火して他のコンポーネントに通知
    window.dispatchEvent(new CustomEvent('tenant-changed', { detail: { orgId } }))
  }

  if (!user?.isSystemAdmin) {
    return null
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span>管理対象テナント:</span>
      <Select
        style={{ width: 300 }}
        value={selectedOrgId}
        onChange={handleChange}
        loading={loading}
        options={tenants.map(t => ({
          label: `${t.name} (${t.code})`,
          value: t.id,
        }))}
      />
    </div>
  )
}
```

---

## テストケース

### 1. システム管理者ログインテスト

```typescript
test('システム管理者でログイン - 全テナント表示', async () => {
  // admin@test.com でログイン
  await login('admin@test.com', 'password')
  
  // テナント選択UIが表示される
  await expect(page.locator('text=管理対象テナント:')).toBeVisible()
  
  // テナント一覧が表示される
  const tenantSelect = page.locator('select')
  await expect(tenantSelect).toContainText('コスモス薬品')
  await expect(tenantSelect).toContainText('楽市楽座')
})
```

### 2. テナント切り替えテスト

```typescript
test('テナント切り替え - データ表示確認', async () => {
  // admin@test.com でログイン
  await login('admin@test.com', 'password')
  
  // コスモス薬品を選択
  await page.selectOption('select', { label: 'コスモス薬品株式会社' })
  
  // コスモス薬品のデータが表示される
  await expect(page.locator('text=エコ回収東日本')).toBeVisible()
  
  // 楽市楽座を選択
  await page.selectOption('select', { label: '楽市楽座株式会社' })
  
  // 楽市楽座のデータが表示される
  await expect(page.locator('text=エコクリーン東海')).toBeVisible()
})
```

### 3. 手数料付加テスト

```typescript
test('システム管理者 - 手数料付加', async () => {
  // admin@test.com でログイン
  await login('admin@test.com', 'password')
  
  // コスモス薬品を選択
  await page.selectOption('select', { label: 'コスモス薬品株式会社' })
  
  // 請求明細を選択
  await page.click('text=請求明細を確認')
  
  // 手数料を追加
  await page.click('button:has-text("手数料追加")')
  await page.fill('input[name="fee_amount"]', '5')
  await page.selectOption('select[name="fee_type"]', { label: 'パーセンテージ' })
  await page.click('button:has-text("確定")')
  
  // 手数料が反映される
  await expect(page.locator('text=手数料: 5%')).toBeVisible()
})
```

---

## まとめ

### 設計のポイント

1. ✅ **データ分離の徹底**: `org_id` による完全なデータ分離
2. ✅ **権限の明確化**: `isSystemAdmin` フラグでシステム管理者を識別
3. ✅ **柔軟なアクセス制御**: テナント選択により、管理対象を切り替え
4. ✅ **拡張性**: 新しいテナントを追加しても設計変更不要

### 今後の拡張

- テナントごとの手数料率設定
- テナントごとの請求書テンプレートカスタマイズ
- テナントごとのレポート出力
- テナント間のデータ集計・比較機能

---

**作成者**: AI Assistant  
**レビュー**: 承認済み  
**適用日**: 2025-10-21




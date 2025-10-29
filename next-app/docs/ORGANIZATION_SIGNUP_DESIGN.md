# 新規排出企業登録フロー設計書

**作成日**: 2025-10-20  
**目的**: マルチテナント環境での新規排出企業のセルフサービス登録  
**グローバルルール準拠**: Prisma必須、SSOT原則、RLS境界考慮

---

## 📋 概要

### 目的
- 新規排出企業が自己登録できるフローを提供
- マルチテナント対応（org_id分離）
- 初期管理者ユーザーを自動作成

### スコープ
1. Supabase Authサインアップ
2. 組織情報登録
3. 初期管理者ユーザー作成
4. 組織ロール設定

---

## 🏗️ アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Supabase Auth サインアップ                      │
│   - email + password                                    │
│   - auth.users レコード作成                             │
│   → auth_user_id 取得                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: 組織情報入力フォーム                            │
│   - 会社名                                              │
│   - 組織コード（自動生成 or 手動入力）                  │
│   - 郵便番号、住所、電話番号（任意）                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: API Call - POST /api/auth/signup-organization  │
│   Prismaトランザクション:                               │
│   1. organizations 作成                                 │
│   2. app_users 作成（auth_user_id紐付け）              │
│   3. user_org_roles 作成（role='ADMIN'）               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: ダッシュボードへリダイレクト                    │
│   - RLSポリシーで自組織のデータのみ参照可能             │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 データベース設計

### 関連テーブル

#### 1. `auth.users` (Supabase Auth)
- Supabase Authが自動管理
- `id`: auth_user_id として使用

#### 2. `app.organizations`
```sql
CREATE TABLE app.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,  -- 組織コード（重複禁止）
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
```

#### 3. `app.users` (app_users)
```sql
CREATE TABLE app.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
```

#### 4. `app.user_org_roles`
```sql
CREATE TABLE app.user_org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, org_id)
);
```

---

## 🔧 API実装

### POST /api/auth/signup-organization

**リクエスト**:
```typescript
{
  auth_user_id: string;  // Supabase Auth から取得
  email: string;
  name: string;          // ユーザー名
  organization: {
    name: string;        // 会社名
    code: string;        // 組織コード（重複チェック）
    address?: string;
    phone?: string;
  };
}
```

**レスポンス**:
```typescript
{
  data: {
    user: {
      id: string;
      auth_user_id: string;
      email: string;
      name: string;
    };
    organization: {
      id: string;
      name: string;
      code: string;
    };
    user_org_role: {
      id: string;
      role: 'ADMIN';
      org_id: string;
    };
  };
  message: 'Organization registered successfully';
}
```

**実装例** (グローバルルール100%準拠):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const signupSchema = z.object({
  auth_user_id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  organization: z.object({
    name: z.string().min(1).max(255),
    code: z.string().min(1).max(50),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // 重複チェック
    const existingOrg = await prisma.organizations.findFirst({
      where: { code: validatedData.organization.code },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization code already exists' },
        { status: 409 }
      );
    }

    const existingUser = await prisma.app_users.findFirst({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // ✅ Prismaトランザクション（グローバルルール準拠）
    const result = await prisma.$transaction(async (tx) => {
      // 1. 組織作成
      const organization = await tx.organizations.create({
        data: {
          name: validatedData.organization.name,
          code: validatedData.organization.code,
          address: validatedData.organization.address,
          phone: validatedData.organization.phone,
          // 初期登録時は created_by を null に設定
        },
      });

      // 2. ユーザー作成
      const user = await tx.app_users.create({
        data: {
          auth_user_id: validatedData.auth_user_id,
          email: validatedData.email,
          name: validatedData.name,
          is_active: true,
        },
      });

      // 3. 組織ロール作成（初期管理者）
      const userOrgRole = await tx.user_org_roles.create({
        data: {
          user_id: user.id,
          org_id: organization.id,
          role: 'ADMIN',  // 初期登録者は必ずADMIN
        },
      });

      return {
        user,
        organization,
        user_org_role: userOrgRole,
      };
    });

    return NextResponse.json(
      {
        data: result,
        message: 'Organization registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Signup Organization] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to register organization' },
      { status: 500 }
    );
  }
}
```

---

## 🎨 フロントエンド実装

### 1. サインアップフォーム (`/signup`)

**ステップ1: Supabase Authサインアップ**
```typescript
import { supabase } from '@/lib/supabase-client';

const handleSupabaseSignup = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.user?.id; // auth_user_id
};
```

**ステップ2: 組織情報登録**
```typescript
const handleOrganizationSignup = async (formData: {
  auth_user_id: string;
  email: string;
  name: string;
  organization: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
}) => {
  const response = await fetch('/api/auth/signup-organization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to register organization');
  }

  return response.json();
};
```

**統合フロー**:
```typescript
const handleSignup = async (formData: SignupFormData) => {
  try {
    // Step 1: Supabase Authサインアップ
    const authUserId = await handleSupabaseSignup(formData.email, formData.password);

    // Step 2: 組織 + ユーザー登録
    await handleOrganizationSignup({
      auth_user_id: authUserId,
      email: formData.email,
      name: formData.name,
      organization: {
        name: formData.organization.name,
        code: formData.organization.code,
        address: formData.organization.address,
        phone: formData.organization.phone,
      },
    });

    // Step 3: ダッシュボードへリダイレクト
    router.push('/dashboard');
  } catch (error) {
    console.error('Signup failed:', error);
    setError(error.message);
  }
};
```

---

## 🔐 RLS境界の考慮

### 既存RLS関数の確認

```sql
-- app.current_org_id() 関数の存在確認
CREATE OR REPLACE FUNCTION app.current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 初期登録時のRLS対応

**問題**: 組織作成時、まだ `app.current_org_id()` が設定されていない

**解決策**:
1. **Option A**: 組織作成時のみRLSを一時的にバイパス（管理者権限）
2. **Option B**: サーバーサイドで `SET app.current_org_id = 'new_org_id'` を実行

**推奨**: Option B（セキュアな実装）

```typescript
// トランザクション内でセッション変数を設定
const result = await prisma.$transaction(async (tx) => {
  // 1. 組織作成
  const organization = await tx.organizations.create({ ... });

  // 2. セッション変数設定（RLS対応）
  await tx.$executeRaw`SET app.current_org_id = ${organization.id}`;

  // 3. ユーザー作成（RLSが適用される）
  const user = await tx.app_users.create({ ... });

  // 4. 組織ロール作成
  const userOrgRole = await tx.user_org_roles.create({ ... });

  return { user, organization, user_org_role: userOrgRole };
});
```

---

## ✅ チェックリスト

### 実装前
- [ ] RLS関数 `app.current_org_id()` の存在確認
- [ ] `organizations` テーブルの `code` カラムにUNIQUE制約確認
- [ ] Supabase Auth の Email確認設定確認

### 実装中
- [ ] API実装: `/api/auth/signup-organization`
- [ ] Zodバリデーション実装
- [ ] Prismaトランザクション実装
- [ ] 重複チェック実装（組織コード、メールアドレス）
- [ ] フロントエンド実装: `/signup` ページ

### 実装後
- [ ] TypeCheck: `pnpm typecheck`
- [ ] スキーマ同期確認: `pnpm check:schema-sync`
- [ ] E2Eテスト作成
- [ ] エラーハンドリング確認

---

## 🚨 注意事項

### セキュリティ
1. ✅ **組織コードの重複チェック必須**
2. ✅ **メールアドレスの重複チェック必須**
3. ✅ **初期登録者は必ず ADMIN ロール**
4. ✅ **Supabase Auth の Email確認を有効化推奨**

### マルチテナント
1. ✅ **RLSポリシーが正しく動作するか確認**
2. ✅ **初期登録時のセッション変数設定**
3. ✅ **org_id分離が正しく動作するか確認**

---

## 📚 関連ドキュメント

- グローバルルール: `.cursor/rules/global-rules.md`
- Prisma必須ルール: セクション「🗄️ Prisma 必須ルール（CRITICAL）」
- RLS境界設計: `db/policies/rls_policies.sql`

---

**最終更新**: 2025-10-20  
**ステータス**: ✅ 設計完了（実装待ち）  
**次のアクション**: `/api/auth/signup-organization` 実装 → フロントエンド実装 → E2Eテスト




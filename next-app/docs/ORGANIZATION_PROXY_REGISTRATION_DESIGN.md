# 排出企業代理登録フロー設計書

**作成日**: 2025-10-20  
**目的**: システム管理会社による排出企業の代理登録  
**グローバルルール準拠**: Prisma必須、SSOT原則、RLS境界考慮、マルチテナント対応

---

## 📋 概要

### 背景
排出企業がアカウント開設を面倒に感じるケースがあるため、システム管理会社が代理で登録できるフローを提供。

### 目的
1. システム管理会社（スーパーアドミン）が排出企業を代理登録
2. マスターID（初期管理者）を自動作成
3. 排出企業側で追加ユーザー（一般ユーザー）を登録可能

### スコープ
- **Phase 1**: システム管理会社による代理登録
- **Phase 2**: 排出企業側での追加ユーザー登録

---

## 🏗️ アーキテクチャ

### Phase 1: システム管理会社による代理登録

```
┌─────────────────────────────────────────────────────────────┐
│ システム管理会社（スーパーアドミン）                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 排出企業情報入力（管理画面）                        │
│   - 会社名                                                  │
│   - 組織コード（自動生成 or 手動入力）                      │
│   - 初期管理者情報（氏名、メールアドレス）                  │
│   - 初期パスワード（自動生成 or 手動入力）                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: API Call - POST /api/admin/organizations/register  │
│   Prismaトランザクション:                                   │
│   1. Supabase Auth でユーザー作成（auth.users）            │
│   2. organizations 作成                                     │
│   3. app_users 作成（auth_user_id紐付け）                  │
│   4. user_org_roles 作成（role='ADMIN'）                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 初期パスワード or 招待メール送信                    │
│   - Option A: 初期パスワードを管理会社経由で連絡           │
│   - Option B: Supabase Auth の招待メール送信               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 排出企業（マスターIDでログイン）                            │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: 排出企業側での追加ユーザー登録

```
┌─────────────────────────────────────────────────────────────┐
│ 排出企業（マスターIDでログイン済み）                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: ユーザー管理画面で追加ユーザー登録                  │
│   - 氏名                                                    │
│   - メールアドレス                                          │
│   - ロール（EMITTER、担当者等）                             │
│   - 初期パスワード（自動生成 or 手動入力）                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: API Call - POST /api/users/register-member         │
│   Prismaトランザクション:                                   │
│   1. Supabase Auth でユーザー作成                           │
│   2. app_users 作成                                         │
│   3. user_org_roles 作成（既存組織に紐付け）               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 招待メール送信 or 初期パスワード連絡                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 データベース設計

### 関連テーブル

#### 1. `auth.users` (Supabase Auth)
- Supabase Authが自動管理
- 代理登録時も Supabase Admin API を使用

#### 2. `app.organizations`
```sql
CREATE TABLE app.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,  -- システム管理者のID
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
  created_by UUID,  -- 代理登録時はシステム管理者ID、追加時はマスターID
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

### Phase 1: システム管理会社による代理登録

#### POST /api/admin/organizations/register

**認証**: スーパーアドミンのみ（`role='SUPER_ADMIN'`）

**リクエスト**:
```typescript
{
  organization: {
    name: string;        // 会社名
    code: string;        // 組織コード
    address?: string;
    phone?: string;
  };
  master_user: {
    name: string;        // マスターユーザー名
    email: string;       // メールアドレス
    password?: string;   // 初期パスワード（省略時は自動生成）
    send_email?: boolean; // 招待メール送信（デフォルト: true）
  };
}
```

**レスポンス**:
```typescript
{
  data: {
    organization: {
      id: string;
      name: string;
      code: string;
    };
    master_user: {
      id: string;
      auth_user_id: string;
      email: string;
      name: string;
      initial_password?: string; // send_email=false の場合のみ
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
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { createClient } from '@supabase/supabase-js';

const registerSchema = z.object({
  organization: z.object({
    name: z.string().min(1).max(255),
    code: z.string().min(1).max(50),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
  master_user: z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    password: z.string().min(8).optional(),
    send_email: z.boolean().default(true),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // ✅ 認証チェック（スーパーアドミンのみ）
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // 重複チェック
    const existingOrg = await prisma.organizations.findFirst({
      where: { code: validatedData.organization.code },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Organization code already exists' },
        { status: 409 }
      );
    }

    const existingUser = await prisma.app_users.findFirst({
      where: { email: validatedData.master_user.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists' },
        { status: 409 }
      );
    }

    // 初期パスワード生成（省略時）
    const initialPassword = validatedData.master_user.password || 
      generateSecurePassword();

    // Supabase Admin クライアント（サーバーサイド専用）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // サービスロールキー
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Step 1: Supabase Auth でユーザー作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.master_user.email,
      password: initialPassword,
      email_confirm: !validatedData.master_user.send_email, // メール送信しない場合は自動確認
      user_metadata: {
        name: validatedData.master_user.name,
        role: 'ADMIN',
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    // ✅ Prismaトランザクション（グローバルルール準拠）
    const result = await prisma.$transaction(async (tx) => {
      // 2. 組織作成
      const organization = await tx.organizations.create({
        data: {
          name: validatedData.organization.name,
          code: validatedData.organization.code,
          address: validatedData.organization.address,
          phone: validatedData.organization.phone,
          created_by: user.id, // スーパーアドミンのID
          updated_by: user.id,
        },
      });

      // 3. ユーザー作成
      const appUser = await tx.app_users.create({
        data: {
          auth_user_id: authData.user.id,
          email: validatedData.master_user.email,
          name: validatedData.master_user.name,
          is_active: true,
          created_by: user.id,
          updated_by: user.id,
        },
      });

      // 4. 組織ロール作成（マスターユーザーは必ずADMIN）
      const userOrgRole = await tx.user_org_roles.create({
        data: {
          user_id: appUser.id,
          org_id: organization.id,
          role: 'ADMIN',
          created_by: user.id,
          updated_by: user.id,
        },
      });

      return {
        organization,
        master_user: appUser,
        user_org_role: userOrgRole,
      };
    });

    // 招待メール送信（オプション）
    if (validatedData.master_user.send_email) {
      await supabaseAdmin.auth.admin.inviteUserByEmail(validatedData.master_user.email);
    }

    return NextResponse.json(
      {
        data: {
          ...result,
          master_user: {
            ...result.master_user,
            initial_password: validatedData.master_user.send_email 
              ? undefined 
              : initialPassword, // メール送信しない場合のみ返す
          },
        },
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

    console.error('[Admin Organization Register] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to register organization' },
      { status: 500 }
    );
  }
}

// セキュアなパスワード生成関数
function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}
```

---

### Phase 2: 排出企業側での追加ユーザー登録

#### POST /api/users/register-member

**認証**: 同組織のADMINのみ

**リクエスト**:
```typescript
{
  name: string;
  email: string;
  role: 'EMITTER' | 'TRANSPORTER' | 'DISPOSER';  // ADMINは不可
  password?: string;      // 省略時は自動生成
  send_email?: boolean;   // デフォルト: true
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
      initial_password?: string;
    };
    user_org_role: {
      id: string;
      role: string;
      org_id: string;
    };
  };
  message: 'User registered successfully';
}
```

**実装例** (グローバルルール100%準拠):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { createClient } from '@supabase/supabase-js';

const registerMemberSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(['EMITTER', 'TRANSPORTER', 'DISPOSER']), // ADMINは除外
  password: z.string().min(8).optional(),
  send_email: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // ✅ 認証チェック（同組織のADMINのみ）
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ADMINロール確認
    const userRole = await prisma.user_org_roles.findFirst({
      where: {
        user_id: user.id,
        org_id: user.org_id,
        role: 'ADMIN',
        deleted_at: null,
      },
    });

    if (!userRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = registerMemberSchema.parse(body);

    // 重複チェック
    const existingUser = await prisma.app_users.findFirst({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists' },
        { status: 409 }
      );
    }

    // 初期パスワード生成
    const initialPassword = validatedData.password || generateSecurePassword();

    // Supabase Admin クライアント
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Step 1: Supabase Auth でユーザー作成
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: initialPassword,
      email_confirm: !validatedData.send_email,
      user_metadata: {
        name: validatedData.name,
        role: validatedData.role,
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    // ✅ Prismaトランザクション
    const result = await prisma.$transaction(async (tx) => {
      // 2. ユーザー作成
      const appUser = await tx.app_users.create({
        data: {
          auth_user_id: authData.user.id,
          email: validatedData.email,
          name: validatedData.name,
          is_active: true,
          created_by: user.id, // マスターユーザーのID
          updated_by: user.id,
        },
      });

      // 3. 組織ロール作成（同組織に紐付け）
      const userOrgRole = await tx.user_org_roles.create({
        data: {
          user_id: appUser.id,
          org_id: user.org_id, // ✅ マルチテナント: 同組織に紐付け
          role: validatedData.role,
          created_by: user.id,
          updated_by: user.id,
        },
      });

      return {
        user: appUser,
        user_org_role: userOrgRole,
      };
    });

    // 招待メール送信（オプション）
    if (validatedData.send_email) {
      await supabaseAdmin.auth.admin.inviteUserByEmail(validatedData.email);
    }

    return NextResponse.json(
      {
        data: {
          ...result,
          user: {
            ...result.user,
            initial_password: validatedData.send_email 
              ? undefined 
              : initialPassword,
          },
        },
        message: 'User registered successfully',
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

    console.error('[Register Member] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to register user' },
      { status: 500 }
    );
  }
}

function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}
```

---

## 🔐 セキュリティ考慮事項

### 1. スーパーアドミンの権限管理

**問題**: システム管理会社のユーザーはどう管理する？

**解決策**:
- `user_org_roles` に特別な組織ID（例: `SYSTEM_ORG_ID`）を作成
- その組織のADMINを「スーパーアドミン」として扱う

```sql
-- システム管理会社組織の作成
INSERT INTO app.organizations (id, name, code)
VALUES ('00000000-0000-0000-0000-000000000001', 'System Admin', 'SYSTEM');

-- スーパーアドミンユーザーの作成
INSERT INTO app.user_org_roles (user_id, org_id, role)
VALUES ('your-user-id', '00000000-0000-0000-0000-000000000001', 'ADMIN');
```

### 2. 初期パスワードの取り扱い

**Option A: 招待メール送信（推奨）**
- Supabase Authの招待メール機能を使用
- ユーザーが初回ログイン時にパスワードを設定

**Option B: 初期パスワードを連絡**
- セキュアなパスワードを自動生成
- 管理会社経由で排出企業に連絡
- 初回ログイン時にパスワード変更を強制

### 3. RLS境界の考慮

**問題**: 代理登録時、まだ `app.current_org_id()` が設定されていない

**解決策**:
```typescript
// トランザクション内でセッション変数を設定
const result = await prisma.$transaction(async (tx) => {
  const organization = await tx.organizations.create({ ... });

  // セッション変数設定（RLS対応）
  await tx.$executeRaw`SET app.current_org_id = ${organization.id}`;

  // 以降の操作でRLSが適用される
  const user = await tx.app_users.create({ ... });
  const userOrgRole = await tx.user_org_roles.create({ ... });

  return { organization, user, user_org_role: userOrgRole };
});
```

---

## 🎨 フロントエンド実装

### Phase 1: システム管理会社の管理画面

#### 画面: `/admin/organizations/register`

**機能**:
- 排出企業情報入力フォーム
- マスターユーザー情報入力フォーム
- 初期パスワード自動生成 or 手動入力
- 招待メール送信オプション

**実装例**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      organization: {
        name: formData.get('org_name') as string,
        code: formData.get('org_code') as string,
        address: formData.get('org_address') as string,
        phone: formData.get('org_phone') as string,
      },
      master_user: {
        name: formData.get('user_name') as string,
        email: formData.get('user_email') as string,
        send_email: formData.get('send_email') === 'on',
      },
    };

    try {
      const response = await fetch('/api/admin/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register organization');
      }

      const result = await response.json();

      // 初期パスワードが返された場合（メール送信しない場合）
      if (result.data.master_user.initial_password) {
        alert(`初期パスワード: ${result.data.master_user.initial_password}\n\n※この画面を閉じる前にコピーしてください`);
      }

      router.push('/admin/organizations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">排出企業代理登録</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 組織情報 */}
        <section className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-4">組織情報</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="org_name"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                組織コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="org_code"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">住所</label>
              <input
                type="text"
                name="org_address"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">電話番号</label>
              <input
                type="tel"
                name="org_phone"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </section>

        {/* マスターユーザー情報 */}
        <section className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-4">マスターユーザー情報</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="user_name"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="user_email"
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="send_email"
                id="send_email"
                defaultChecked
                className="mr-2"
              />
              <label htmlFor="send_email" className="text-sm">
                招待メールを送信（チェックを外すと初期パスワードが表示されます）
              </label>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </form>
    </div>
  );
}
```

---

### Phase 2: 排出企業のユーザー管理画面

#### 画面: `/dashboard/users`

**機能**:
- ユーザー一覧表示（同組織のみ）
- 追加ユーザー登録フォーム
- ユーザー編集・削除

**実装例**:
```typescript
'use client';

import { useState } from 'react';

export default function UsersManagementPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      send_email: formData.get('send_email') === 'on',
    };

    try {
      const response = await fetch('/api/users/register-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register user');
      }

      const result = await response.json();

      if (result.data.user.initial_password) {
        alert(`初期パスワード: ${result.data.user.initial_password}\n\n※ユーザーに連絡してください`);
      }

      // ユーザー一覧を再取得
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ユーザー管理</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 追加ユーザー登録フォーム */}
      <section className="border p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-4">ユーザー追加</h2>
        
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              ロール <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              required
              className="w-full border rounded px-3 py-2"
            >
              <option value="EMITTER">排出担当者</option>
              <option value="TRANSPORTER">運搬担当者</option>
              <option value="DISPOSER">処分担当者</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="send_email"
              id="send_email"
              defaultChecked
              className="mr-2"
            />
            <label htmlFor="send_email" className="text-sm">
              招待メールを送信
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '登録中...' : 'ユーザー追加'}
          </button>
        </form>
      </section>

      {/* ユーザー一覧 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">ユーザー一覧</h2>
        {/* TODO: ユーザー一覧の実装 */}
      </section>
    </div>
  );
}
```

---

## ✅ 実装チェックリスト

### Phase 1: システム管理会社による代理登録

#### API実装
- [ ] `/api/admin/organizations/register` 作成
- [ ] Supabase Admin API統合
- [ ] Zodバリデーション実装
- [ ] Prismaトランザクション実装
- [ ] スーパーアドミン権限チェック実装
- [ ] セキュアなパスワード生成関数作成

#### フロントエンド実装
- [ ] `/admin/organizations/register` 画面作成
- [ ] フォーム実装
- [ ] 初期パスワード表示機能実装
- [ ] エラーハンドリング実装

#### セキュリティ
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 環境変数設定
- [ ] スーパーアドミン組織作成
- [ ] スーパーアドミンユーザー作成

---

### Phase 2: 排出企業側での追加ユーザー登録

#### API実装
- [ ] `/api/users/register-member` 作成
- [ ] ADMIN権限チェック実装
- [ ] 同組織への紐付け実装
- [ ] Zodバリデーション実装
- [ ] Prismaトランザクション実装

#### フロントエンド実装
- [ ] `/dashboard/users` 画面作成
- [ ] ユーザー一覧表示実装
- [ ] 追加ユーザー登録フォーム実装
- [ ] ロール選択実装

---

### 品質チェック

- [ ] TypeCheck: `pnpm typecheck`
- [ ] スキーマ同期確認: `pnpm check:schema-sync`
- [ ] 外部キー制約チェック: `pnpm check:foreign-keys`
- [ ] E2Eテスト作成
- [ ] セキュリティレビュー

---

## 🚨 注意事項

### 1. セキュリティ

- ✅ **SUPABASE_SERVICE_ROLE_KEY は絶対にクライアント側に露出しない**
- ✅ **初期パスワードは安全に連絡**
- ✅ **スーパーアドミン権限の厳格な管理**

### 2. マルチテナント

- ✅ **RLSポリシーが正しく動作するか確認**
- ✅ **org_id分離が正しく機能するか確認**
- ✅ **代理登録時のセッション変数設定**

### 3. グローバルルール準拠

- ✅ **Prismaトランザクション必須**
- ✅ **Zodバリデーション必須**
- ✅ **認証チェック必須**
- ✅ **エラーハンドリング実装**

---

## 📚 関連ドキュメント

- グローバルルール: `.cursor/rules/global-rules.md`
- Supabase Admin API: https://supabase.com/docs/reference/javascript/admin-api
- Prisma トランザクション: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

---

**最終更新**: 2025-10-20  
**ステータス**: ✅ 設計完了（実装待ち）  
**次のアクション**: 
1. `SUPABASE_SERVICE_ROLE_KEY` 環境変数設定
2. スーパーアドミン組織 + ユーザー作成
3. Phase 1 API実装
4. Phase 1 フロントエンド実装
5. Phase 2 API実装
6. Phase 2 フロントエンド実装




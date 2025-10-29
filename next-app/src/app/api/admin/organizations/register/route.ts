// ============================================================================
// システム管理会社による排出企業代理登録API
// POST /api/admin/organizations/register
// グローバルルール準拠: Prisma必須、SSOT原則、RLS境界考慮
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const registerSchema = z.object({
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(255),
    code: z.string().min(1, 'Organization code is required').max(50),
  }),
  master_user: z.object({
    name: z.string().min(1, 'User name is required').max(255),
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    send_email: z.boolean().default(true),
  }),
});

// ============================================================================
// セキュアなパスワード生成関数
// ============================================================================

function generateSecurePassword(length: number = 16): string {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length; i++) {
      password += charset[randomValues[i] % charset.length];
    }
  } else {
    // フォールバック（Node.js環境）
    const randomBytes = require('crypto').randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }
  }
  
  return password;
}

// ============================================================================
// POST: 排出企業代理登録
// ============================================================================

export async function POST(request: NextRequest) {
  // ✅ 認証チェック（スーパーアドミンのみ）
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }

  // スーパーアドミン権限確認（SYSTEM組織のADMIN）
  let superAdminRole
  try {
    superAdminRole = await prisma.user_org_roles.findFirst({
      where: {
        user_id: user.id,
        organizations: {
          code: 'SYSTEM',
        },
        role: 'ADMIN',
        deleted_at: null,
      },
    });
  } catch (dbError) {
    console.error('[POST /api/admin/organizations/register] Prismaロール検索エラー:', dbError);
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
  }

  if (!superAdminRole) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Super admin access required' },
      { status: 403 }
    );
  }

  // ✅ リクエストボディ取得
  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  try {
    // ✅ Zodバリデーション
    const validatedData = registerSchema.parse(body);

    // 重複チェック（組織コード）
    let existingOrg
    try {
      existingOrg = await prisma.organizations.findFirst({
        where: { code: validatedData.organization.code },
      });
    } catch (dbError) {
      console.error('[POST /api/admin/organizations/register] Prisma組織検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Organization code already exists' },
        { status: 409 }
      );
    }

    // 重複チェック（メールアドレス）
    let existingUser
    try {
      existingUser = await prisma.app_users.findFirst({
        where: { email: validatedData.master_user.email },
      });
    } catch (dbError) {
      console.error('[POST /api/admin/organizations/register] Prismaユーザー検索エラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists' },
        { status: 409 }
      );
    }

    // 初期パスワード生成（省略時）
    const initialPassword =
      validatedData.master_user.password || generateSecurePassword();

    // ✅ Supabase Admin クライアント（サーバーサイド専用）
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
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: validatedData.master_user.email,
        password: initialPassword,
        email_confirm: !validatedData.master_user.send_email, // メール送信しない場合は自動確認
        user_metadata: {
          name: validatedData.master_user.name,
          role: 'ADMIN',
        },
      });

    if (authError || !authData.user) {
      console.error('[Admin Organization Register] Auth error:', authError);
      return NextResponse.json(
        {
          error: 'Auth Error',
          message: `Failed to create auth user: ${authError?.message}`,
        },
        { status: 500 }
      );
    }

    // ✅ Prismaトランザクション（グローバルルール準拠）
    let result
    try {
      result = await prisma.$transaction(async (tx) => {
        // 2. 組織作成
        const organization = await tx.organizations.create({
          data: {
            name: validatedData.organization.name,
            code: validatedData.organization.code,
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
    } catch (dbError) {
      console.error('[POST /api/admin/organizations/register] Prismaトランザクションエラー:', dbError);
      return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 });
    }

    // 招待メール送信（オプション）
    if (validatedData.master_user.send_email) {
      const { error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(
          validatedData.master_user.email
        );

      if (inviteError) {
        console.warn('[Admin Organization Register] Invite email error:', inviteError);
        // メール送信失敗は警告のみ（登録は成功として扱う）
      }
    }

    return NextResponse.json(
      {
        data: {
          ...result,
          master_user: {
            ...result.master_user,
            // メール送信しない場合のみ初期パスワードを返す
            initial_password: validatedData.master_user.send_email
              ? undefined
              : initialPassword,
          },
        },
        message: 'Organization registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    // ✅ Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    // ✅ その他のエラー
    console.error('[Admin Organization Register] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to register organization',
      },
      { status: 500 }
    );
  }
}

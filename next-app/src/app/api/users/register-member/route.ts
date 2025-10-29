// ============================================================================
// 排出企業側での追加ユーザー登録API
// POST /api/users/register-member
// グローバルルール準拠: Prisma必須、SSOT原則、マルチテナント対応
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Zodバリデーションスキーマ
// ============================================================================

const registerMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format'),
  role: z.enum(['EMITTER', 'TRANSPORTER', 'DISPOSER'], {
    errorMap: () => ({ message: 'Role must be EMITTER, TRANSPORTER, or DISPOSER' }),
  }), // ADMINは除外
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  send_email: z.boolean().default(true),
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
// POST: 追加ユーザー登録
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // ✅ 認証チェック（同組織のADMINのみ）
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // ADMINロール確認
    let userRole;
    try {
      userRole = await prisma.user_org_roles.findFirst({
        where: {
          user_id: user.id,
          org_id: user.org_id,
          role: 'ADMIN',
          deleted_at: null,
        },
      });
    } catch (dbError) {
      console.error('[Register Member] Database error - role check:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!userRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    // ✅ JSONパースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Register Member] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // ✅ Zodバリデーション
    const validatedData = registerMemberSchema.parse(body);

    // 重複チェック（メールアドレス）
    let existingUser;
    try {
      existingUser = await prisma.app_users.findFirst({
        where: { email: validatedData.email },
      });
    } catch (dbError) {
      console.error('[Register Member] Database error - existing user check:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Email already exists' },
        { status: 409 }
      );
    }

    // 初期パスワード生成
    const initialPassword = validatedData.password || generateSecurePassword();

    // ✅ Supabase Admin クライアント
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
        email: validatedData.email,
        password: initialPassword,
        email_confirm: !validatedData.send_email, // メール送信しない場合は自動確認
        user_metadata: {
          name: validatedData.name,
          role: validatedData.role,
        },
      });

    if (authError || !authData.user) {
      console.error('[Register Member] Auth error:', authError);
      return NextResponse.json(
        {
          error: 'Auth Error',
          message: `Failed to create auth user: ${authError?.message}`,
        },
        { status: 500 }
      );
    }

    // ✅ Prismaトランザクション（グローバルルール準拠）
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
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

      // 3. 組織ロール作成（✅ マルチテナント: 同組織に紐付け）
      const userOrgRole = await tx.user_org_roles.create({
        data: {
          user_id: appUser.id,
          org_id: user.org_id, // ✅ 同組織に紐付け
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
    } catch (dbError) {
      console.error('[Register Member] Database error - transaction:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // 招待メール送信（オプション）
    if (validatedData.send_email) {
      const { error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(validatedData.email);

      if (inviteError) {
        console.warn('[Register Member] Invite email error:', inviteError);
        // メール送信失敗は警告のみ
      }
    }

    return NextResponse.json(
      {
        data: {
          ...result,
          user: {
            ...result.user,
            // メール送信しない場合のみ初期パスワードを返す
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
    // ✅ Zodバリデーションエラー
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.errors },
        { status: 400 }
      );
    }

    // ✅ その他のエラー
    console.error('[Register Member] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to register user',
      },
      { status: 500 }
    );
  }
}




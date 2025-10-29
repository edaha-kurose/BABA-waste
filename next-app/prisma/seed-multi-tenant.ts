/**
 * マルチテナント用組織・ユーザー作成
 * - コスモス薬品（既存組織名変更）
 * - 楽市楽座（新規作成）
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const COSMOS_ORG_ID = '00000000-0000-0000-0000-000000000001'; // 既存組織
const RAKUICHI_ORG_ID = '00000000-0000-0000-0000-000000000004'; // 新規組織

async function main() {
  console.log('🏢 マルチテナント環境構築開始\n');
  console.log('='.repeat(80));

  try {
    // ========================================================================
    // Step 1: 不要なデモ組織削除
    // ========================================================================
    console.log('\n📋 Step 1: デモ組織削除');
    console.log('-'.repeat(80));

    const demoOrg = await prisma.organizations.findFirst({
      where: { code: 'DEMO-ORG' },
    });

    if (demoOrg) {
      console.log(`デモ組織を削除: ${demoOrg.name} (${demoOrg.id})`);
      await prisma.organizations.delete({
        where: { id: demoOrg.id },
      });
      console.log('✅ デモ組織削除完了');
    } else {
      console.log('ℹ️  デモ組織は存在しません（スキップ）');
    }

    // ========================================================================
    // Step 2: テスト組織A → コスモス薬品に変更
    // ========================================================================
    console.log('\n📋 Step 2: テスト組織A → コスモス薬品に変更');
    console.log('-'.repeat(80));

    const cosmosOrg = await prisma.organizations.update({
      where: { id: COSMOS_ORG_ID },
      data: {
        name: 'コスモス薬品株式会社',
        code: 'COSMOS-DRUG',
        updated_at: new Date(),
      },
    });
    console.log(`✅ 組織名変更: ${cosmosOrg.name}`);

    // ========================================================================
    // Step 3: 楽市楽座を新規作成
    // ========================================================================
    console.log('\n📋 Step 3: 楽市楽座を新規作成');
    console.log('-'.repeat(80));

    const existingRakuichi = await prisma.organizations.findUnique({
      where: { id: RAKUICHI_ORG_ID },
    });

    let rakuichiOrg;
    if (existingRakuichi) {
      console.log('ℹ️  楽市楽座は既に存在します（スキップ）');
      rakuichiOrg = existingRakuichi;
    } else {
      rakuichiOrg = await prisma.organizations.create({
        data: {
          id: RAKUICHI_ORG_ID,
          name: '楽市楽座株式会社',
          code: 'RAKUICHI-RAKUZA',
          org_type: 'EMITTER',
          is_active: true,
        },
      });
      console.log(`✅ 新規組織作成: ${rakuichiOrg.name}`);
    }

    // ========================================================================
    // Step 4: ユーザー作成（Supabase Auth + app_users）
    // ========================================================================
    console.log('\n📋 Step 4: ユーザー作成');
    console.log('-'.repeat(80));

    const users = [
      {
        email: 'admin@cosmos-drug.test',
        password: 'test123',
        name: 'コスモス薬品 管理者',
        org_id: COSMOS_ORG_ID,
        org_name: 'コスモス薬品',
      },
      {
        email: 'admin@rakuichi.test',
        password: 'test123',
        name: '楽市楽座 管理者',
        org_id: RAKUICHI_ORG_ID,
        org_name: '楽市楽座',
      },
    ];

    for (const userData of users) {
      console.log(`\n処理中: ${userData.email} (${userData.org_name})`);

      // Supabase Authでユーザー存在確認
      const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = existingAuthUser?.users.find(u => u.email === userData.email);

      let authUserId: string;

      if (authUser) {
        console.log(`  ℹ️  auth.users に既存: ${authUser.id}`);
        authUserId = authUser.id;
      } else {
        // Supabase Authにユーザー作成
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            name: userData.name,
          },
        });

        if (authError) {
          console.error(`  ❌ auth.users 作成失敗:`, authError.message);
          continue;
        }

        authUserId = newAuthUser.user!.id;
        console.log(`  ✅ auth.users 作成: ${authUserId}`);
      }

      // app_users存在確認
      const existingAppUser = await prisma.app_users.findFirst({
        where: { auth_user_id: authUserId },
      });

      let appUserId: string;

      if (existingAppUser) {
        console.log(`  ℹ️  app_users に既存: ${existingAppUser.id}`);
        appUserId = existingAppUser.id;

        // メールアドレスを更新
        await prisma.app_users.update({
          where: { id: appUserId },
          data: {
            email: userData.email,
            name: userData.name,
          },
        });
        console.log(`  ✅ app_users 更新完了`);
      } else {
        // app_usersにユーザー作成
        const appUser = await prisma.app_users.create({
          data: {
            auth_user_id: authUserId,
            email: userData.email,
            name: userData.name,
            is_active: true,
          },
        });
        appUserId = appUser.id;
        console.log(`  ✅ app_users 作成: ${appUserId}`);
      }

      // user_org_roles存在確認
      const existingRole = await prisma.user_org_roles.findFirst({
        where: {
          user_id: appUserId,
          org_id: userData.org_id,
        },
      });

      if (existingRole) {
        console.log(`  ℹ️  user_org_roles に既存（スキップ）`);
      } else {
        // user_org_rolesに割り当て
        await prisma.user_org_roles.create({
          data: {
            user_id: appUserId,
            org_id: userData.org_id,
            role: 'ADMIN',
            created_by: authUserId,
            updated_by: authUserId,
          },
        });
        console.log(`  ✅ user_org_roles 作成: ADMIN`);
      }

      console.log(`✅ ${userData.org_name}ユーザー作成完了`);
    }

    // ========================================================================
    // 完了
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🎉 マルチテナント環境構築完了\n');
    console.log('次のステップ:');
    console.log('  1. pnpm prisma:seed:rakuichi - 楽市楽座にテストデータ作成');
    console.log('  2. クイックログイン画面を更新');
    console.log('  3. http://localhost:3001/login でテスト');
    console.log('');
  } catch (error) {
    console.error('❌ エラー発生:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();


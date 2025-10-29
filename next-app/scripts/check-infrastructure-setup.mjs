/**
 * インフラ設定包括的チェックスクリプト
 * グローバルルール準拠: INFRASTRUCTURE_SETUP_CHECKLIST.md
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

let hasErrors = false;
let hasWarnings = false;

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`📋 ${title}`);
  console.log('='.repeat(80));
}

function logError(message) {
  console.log(`❌ ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  hasWarnings = true;
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

async function main() {
  console.log('🔍 インフラ設定包括的チェック\n');
  
  // ============================================================================
  // 1. Next.js App Router 構造チェック
  // ============================================================================
  logSection('1. Next.js App Router 構造チェック');
  
  const rootMiddleware = path.join(__dirname, '../middleware.ts');
  const srcMiddleware = path.join(__dirname, '../src/middleware.ts');
  
  const rootExists = fs.existsSync(rootMiddleware);
  const srcExists = fs.existsSync(srcMiddleware);
  
  if (rootExists && srcExists) {
    logError('middleware.ts が重複しています');
    logInfo('  - next-app/middleware.ts');
    logInfo('  - next-app/src/middleware.ts');
    logInfo('  → next-app/src/middleware.ts を削除してください');
  } else if (!rootExists && !srcExists) {
    logError('middleware.ts が存在しません');
    logInfo('  → next-app/middleware.ts を作成してください');
  } else if (rootExists) {
    logSuccess('middleware.ts の配置: OK (next-app/middleware.ts)');
  } else {
    logWarning('middleware.ts が src/ 配下にあります（非推奨）');
    logInfo('  → next-app/middleware.ts に移動してください');
  }

  // ============================================================================
  // 2. Supabase スキーマ設定チェック
  // ============================================================================
  logSection('2. Supabase スキーマ設定チェック');
  
  try {
    // 2.1 PostgREST スキーマ公開設定
    const schemaResult = await prisma.$queryRaw`SELECT current_setting('pgrst.db_schemas') as schemas`;
    const schemas = schemaResult[0]?.schemas;
    
    if (schemas && schemas.includes('app')) {
      logSuccess(`PostgRESTスキーマ設定: ${schemas}`);
    } else {
      logError(`PostgRESTスキーマ設定不足: ${schemas || 'NULL'}`);
      logInfo('  期待値: public, app');
      logInfo('  修正SQL:');
      logInfo('    ALTER ROLE authenticator SET pgrst.db_schemas = \'public, app\';');
      logInfo('    NOTIFY pgrst, \'reload config\';');
    }
  } catch (error) {
    logWarning('PostgRESTスキーマ設定の確認に失敗');
    logInfo(`  エラー: ${error.message}`);
  }
  
  // 2.2 スキーマ権限設定
  try {
    const permResult = await prisma.$queryRaw`
      SELECT grantee, privilege_type 
      FROM information_schema.role_usage_grants 
      WHERE object_schema = 'app'
    `;
    
    const hasAnon = permResult.some(r => r.grantee === 'anon');
    const hasAuthenticated = permResult.some(r => r.grantee === 'authenticated');
    
    if (hasAnon && hasAuthenticated) {
      logSuccess('app スキーマ権限設定: OK');
    } else {
      logError('app スキーマ権限設定不足');
      if (!hasAnon) logInfo('  - anon ロールに権限なし');
      if (!hasAuthenticated) logInfo('  - authenticated ロールに権限なし');
      logInfo('  修正SQL:');
      logInfo('    GRANT USAGE ON SCHEMA app TO anon, authenticated;');
      logInfo('    GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated;');
    }
  } catch (error) {
    logWarning('スキーマ権限確認に失敗');
  }
  
  // 2.3 Supabase クライアント スキーマ設定
  const supabaseBrowser = path.join(__dirname, '../src/lib/auth/supabase-browser.ts');
  const supabaseServer = path.join(__dirname, '../src/lib/auth/supabase-server.ts');
  
  let browserHasSchema = false;
  let serverHasSchema = false;
  
  if (fs.existsSync(supabaseBrowser)) {
    const content = fs.readFileSync(supabaseBrowser, 'utf-8');
    browserHasSchema = content.includes("schema: 'app'");
  }
  
  if (fs.existsSync(supabaseServer)) {
    const content = fs.readFileSync(supabaseServer, 'utf-8');
    serverHasSchema = content.includes("schema: 'app'");
  }
  
  if (browserHasSchema && serverHasSchema) {
    logSuccess('Supabaseクライアント db.schema 設定: OK');
  } else {
    if (!browserHasSchema) {
      logError('supabase-browser.ts に db.schema: \'app\' が設定されていません');
    }
    if (!serverHasSchema) {
      logError('supabase-server.ts に db.schema: \'app\' が設定されていません');
    }
    logInfo('  修正方法: createClient() の options に db: { schema: \'app\' } を追加');
  }

  // ============================================================================
  // 3. データ整合性チェック
  // ============================================================================
  logSection('3. データ整合性チェック');
  
  // 3.1 auth.users と app.users の同期確認
  try {
    const unsyncedUsers = await prisma.$queryRaw`
      SELECT 
        au.id AS auth_user_id,
        au.email AS auth_email
      FROM auth.users au
      LEFT JOIN app.users u ON au.id = u.auth_user_id
      WHERE u.id IS NULL
    `;
    
    if (unsyncedUsers.length === 0) {
      logSuccess('auth.users と app.users の同期: OK');
    } else {
      logWarning(`同期されていないユーザー: ${unsyncedUsers.length}件`);
      unsyncedUsers.slice(0, 5).forEach(u => {
        logInfo(`  - ${u.auth_email} (${u.auth_user_id})`);
      });
      logInfo('  修正方法: db/quick_setup.sql を再実行');
    }
  } catch (error) {
    logWarning('auth.users と app.users の同期確認に失敗');
    logInfo(`  エラー: ${error.message}`);
  }
  
  // 3.2 user_org_roles の外部キー確認
  try {
    const fkResult = await prisma.$queryRaw`
      SELECT
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_org_roles'
        AND kcu.column_name = 'user_id'
    `;
    
    const correctFK = fkResult.some(r => 
      r.foreign_table_schema === 'app' && 
      r.foreign_table_name === 'users'
    );
    
    if (correctFK) {
      logSuccess('user_org_roles.user_id の外部キー: OK (app.users参照)');
    } else {
      logError('user_org_roles.user_id の外部キー設定が不正');
      logInfo('  期待: app.users(id) を参照');
      logInfo('  実際: ' + JSON.stringify(fkResult, null, 2));
      logInfo('  修正SQL:');
      logInfo('    ALTER TABLE app.user_org_roles DROP CONSTRAINT IF EXISTS user_org_roles_user_id_fkey;');
      logInfo('    ALTER TABLE app.user_org_roles ADD CONSTRAINT user_org_roles_user_id_fkey');
      logInfo('      FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;');
    }
  } catch (error) {
    logWarning('user_org_roles 外部キー確認に失敗');
    logInfo(`  エラー: ${error.message}`);
  }

  // ============================================================================
  // 4. データ品質チェック（追加）
  // ============================================================================
  logSection('4. データ品質チェック');
  
  try {
    // 4.1 UUID形式の検証
    const tables = [
      { schema: 'app', table: 'waste_type_masters', idColumn: 'id' },
      { schema: 'app', table: 'waste_type_masters', idColumn: 'collector_id' },
      { schema: 'app', table: 'store_item_collectors', idColumn: 'id' },
      { schema: 'app', table: 'collectors', idColumn: 'id' },
    ];
    
    for (const { schema, table, idColumn } of tables) {
      try {
        const invalidUUIDs = await prisma.$queryRawUnsafe(`
          SELECT ${idColumn}, substring(${idColumn}::text, 1, 20) as preview
          FROM ${schema}.${table}
          WHERE ${idColumn} IS NOT NULL
            AND ${idColumn}::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          LIMIT 5
        `);
        
        if (invalidUUIDs.length > 0) {
          logError(`${table}.${idColumn} に不正なUUID: ${invalidUUIDs.length}件`);
          invalidUUIDs.forEach(row => {
            logInfo(`  - ${row.preview}...`);
          });
          logInfo('  修正方法: 該当レコードを削除または修正');
        } else {
          logSuccess(`${table}.${idColumn} のUUID形式: OK`);
        }
      } catch (error) {
        if (error.code === '42P01') {
          logWarning(`テーブル ${table} が存在しません`);
        } else {
          logWarning(`${table}.${idColumn} のUUID検証に失敗: ${error.message}`);
        }
      }
    }
  } catch (error) {
    logWarning('データ品質チェックに失敗');
    logInfo(`  エラー: ${error.message}`);
  }

  // ============================================================================
  // 5. 最終結果
  // ============================================================================
  logSection('チェック結果サマリー');
  
  if (hasErrors) {
    console.log('❌ エラーが検出されました。上記の修正SQLを実行してください。');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  警告があります。確認してください。');
  } else {
    console.log('✅ 全てのチェック項目をクリアしました！');
  }
  
  console.log('\n次のステップ:');
  console.log('  1. エラーがある場合: Supabase SQL Editorで修正SQLを実行');
  console.log('  2. pnpm prisma generate - Prisma Clientを再生成');
  console.log('  3. pnpm typecheck - 型チェック');
  console.log('  4. pnpm dev - 開発サーバー起動');
  console.log('');
}

main()
  .catch((e) => {
    console.error('致命的エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


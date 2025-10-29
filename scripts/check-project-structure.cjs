#!/usr/bin/env node

/**
 * プロジェクト構造チェックスクリプト
 * 
 * 目的: Next.js App Router プロジェクトの構造が正しいかを検証
 * 
 * チェック項目:
 * 1. middleware.ts の重複チェック
 * 2. 重要ファイルの存在チェック
 * 3. ガードレールファイルの存在チェック
 */

const fs = require('fs');
const path = require('path');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, icon, message) {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`);
}

function logSuccess(message) {
  log('green', '✅', message);
}

function logError(message) {
  log('red', '❌', message);
}

function logWarning(message) {
  log('yellow', '⚠️', message);
}

function logInfo(message) {
  log('blue', 'ℹ️', message);
}

// チェック結果を保持
const results = {
  errors: [],
  warnings: [],
  success: [],
};

// ==================== チェック1: middleware.ts 重複チェック ====================

function checkMiddlewareDuplication() {
  logInfo('middleware.ts の重複をチェック中...');

  const nextAppDir = path.join(process.cwd(), 'next-app');
  
  if (!fs.existsSync(nextAppDir)) {
    results.warnings.push('next-app ディレクトリが存在しません（スキップ）');
    logWarning('next-app ディレクトリが存在しません（スキップ）');
    return;
  }

  const rootMiddleware = path.join(nextAppDir, 'middleware.ts');
  const srcMiddleware = path.join(nextAppDir, 'src', 'middleware.ts');

  const rootExists = fs.existsSync(rootMiddleware);
  const srcExists = fs.existsSync(srcMiddleware);

  if (rootExists && srcExists) {
    results.errors.push('middleware.ts が重複しています');
    logError('middleware.ts が重複しています');
    console.log('   - next-app/middleware.ts');
    console.log('   - next-app/src/middleware.ts');
    console.log('   → next-app/src/middleware.ts を削除してください');
  } else if (!rootExists && !srcExists) {
    results.warnings.push('middleware.ts が存在しません');
    logWarning('middleware.ts が存在しません');
    console.log('   → next-app/middleware.ts を作成してください');
  } else {
    results.success.push('middleware.ts は正しく配置されています');
    logSuccess(`middleware.ts は正しく配置されています: ${rootExists ? 'next-app/middleware.ts' : 'next-app/src/middleware.ts'}`);
  }
}

// ==================== チェック2: 重要ファイルの存在チェック ====================

function checkEssentialFiles() {
  logInfo('重要ファイルの存在をチェック中...');

  const essentialFiles = [
    {
      path: '.cursorrules',
      name: 'Cursor Rules',
      required: true,
    },
    {
      path: 'docs/specifications/SCHEMA_CHANGE_GUIDELINES.md',
      name: 'スキーマ変更ガイドライン',
      required: true,
    },
    {
      path: 'docs/guardrails/INFRASTRUCTURE_SETUP_CHECKLIST.md',
      name: 'インフラ設定チェックリスト',
      required: true,
    },
    {
      path: 'docs/guardrails/CURSOR_COMMON_SETTINGS_v3.3_BFF.md',
      name: 'BFF共通設定',
      required: true,
    },
    {
      path: 'docs/guardrails/UNIVERSAL_GUARDRAIL_FRAMEWORK.md',
      name: '汎用ガードレールフレームワーク',
      required: true,
    },
    {
      path: 'db/quick_setup.sql',
      name: 'クイックセットアップSQL',
      required: false,
    },
  ];

  essentialFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file.path);
    
    if (fs.existsSync(fullPath)) {
      results.success.push(`${file.name} が存在します`);
      logSuccess(`${file.name} が存在します: ${file.path}`);
    } else {
      if (file.required) {
        results.errors.push(`${file.name} が存在しません: ${file.path}`);
        logError(`${file.name} が存在しません: ${file.path}`);
      } else {
        results.warnings.push(`${file.name} が存在しません: ${file.path}`);
        logWarning(`${file.name} が存在しません: ${file.path}`);
      }
    }
  });
}

// ==================== チェック3: Next.js設定チェック ====================

function checkNextJsConfig() {
  logInfo('Next.js設定をチェック中...');

  const nextAppDir = path.join(process.cwd(), 'next-app');
  
  if (!fs.existsSync(nextAppDir)) {
    results.warnings.push('next-app ディレクトリが存在しません（スキップ）');
    logWarning('next-app ディレクトリが存在しません（スキップ）');
    return;
  }

  const nextConfigPath = path.join(nextAppDir, 'next.config.js');
  
  if (!fs.existsSync(nextConfigPath)) {
    results.warnings.push('next.config.js が存在しません');
    logWarning('next.config.js が存在しません');
    return;
  }

  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');

  // output: 'standalone' のチェック（Windowsでは削除すべき）
  if (nextConfig.includes("output: 'standalone'") && process.platform === 'win32') {
    results.warnings.push("next.config.js に output: 'standalone' が設定されています（Windowsでは削除推奨）");
    logWarning("next.config.js に output: 'standalone' が設定されています（Windowsでは削除推奨）");
  } else {
    results.success.push('Next.js設定は問題ありません');
    logSuccess('Next.js設定は問題ありません');
  }
}

// ==================== チェック4: Supabase クライアント設定チェック ====================

function checkSupabaseClientConfig() {
  logInfo('Supabase クライアント設定をチェック中...');

  const nextAppDir = path.join(process.cwd(), 'next-app');
  
  if (!fs.existsSync(nextAppDir)) {
    results.warnings.push('next-app ディレクトリが存在しません（スキップ）');
    logWarning('next-app ディレクトリが存在しません（スキップ）');
    return;
  }

  const clientFiles = [
    path.join(nextAppDir, 'src', 'lib', 'auth', 'supabase-browser.ts'),
    path.join(nextAppDir, 'src', 'lib', 'auth', 'supabase-server.ts'),
  ];

  clientFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      results.warnings.push(`${path.basename(filePath)} が存在しません（スキップ）`);
      logWarning(`${path.basename(filePath)} が存在しません（スキップ）`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // db.schema: 'app' の存在チェック
    if (!content.includes("schema: 'app'") && !content.includes('schema: "app"')) {
      results.errors.push(`${path.basename(filePath)} に db.schema: 'app' が設定されていません`);
      logError(`${path.basename(filePath)} に db.schema: 'app' が設定されていません`);
      console.log(`   → createClient の options に db: { schema: 'app' } を追加してください`);
    } else {
      results.success.push(`${path.basename(filePath)} に db.schema: 'app' が設定されています`);
      logSuccess(`${path.basename(filePath)} に db.schema: 'app' が設定されています`);
    }
  });
}

// ==================== チェック5: useUser フックの2段階検索チェック ====================

function checkUseUserHook() {
  logInfo('useUser フックの実装をチェック中...');

  const nextAppDir = path.join(process.cwd(), 'next-app');
  
  if (!fs.existsSync(nextAppDir)) {
    results.warnings.push('next-app ディレクトリが存在しません（スキップ）');
    logWarning('next-app ディレクトリが存在しません（スキップ）');
    return;
  }

  const sessionPath = path.join(nextAppDir, 'src', 'lib', 'auth', 'session.ts');

  if (!fs.existsSync(sessionPath)) {
    results.warnings.push('session.ts が存在しません（スキップ）');
    logWarning('session.ts が存在しません（スキップ）');
    return;
  }

  const content = fs.readFileSync(sessionPath, 'utf8');

  // 2段階検索の確認: auth_user_id で検索 → app.users.id で検索
  const hasTwoStepQuery = 
    content.includes('.eq(\'auth_user_id\'') && 
    content.includes('from(\'users\')') &&
    content.includes('from(\'user_org_roles\')');

  if (!hasTwoStepQuery) {
    results.errors.push('useUser フックが2段階検索を実装していません');
    logError('useUser フックが2段階検索を実装していません');
    console.log('   → Step 1: auth_user_id で app.users を検索');
    console.log('   → Step 2: app.users.id で user_org_roles を検索');
  } else {
    results.success.push('useUser フックは2段階検索を実装しています');
    logSuccess('useUser フックは2段階検索を実装しています');
  }
}

// ==================== メイン実行 ====================

function main() {
  console.log('\n📊 プロジェクト構造チェックを開始します...\n');

  checkMiddlewareDuplication();
  console.log('');
  
  checkEssentialFiles();
  console.log('');
  
  checkNextJsConfig();
  console.log('');
  
  checkSupabaseClientConfig();
  console.log('');
  
  checkUseUserHook();
  console.log('');

  // 結果サマリー
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 チェック結果サマリー');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  logSuccess(`成功: ${results.success.length} 件`);
  logWarning(`警告: ${results.warnings.length} 件`);
  logError(`エラー: ${results.errors.length} 件`);

  console.log('');

  if (results.errors.length > 0) {
    console.log('❌ エラーが検出されました。修正してください。\n');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log('⚠️ 警告があります。確認してください。\n');
    process.exit(0);
  } else {
    console.log('✅ すべてのチェックに合格しました！\n');
    process.exit(0);
  }
}

// 実行
main();


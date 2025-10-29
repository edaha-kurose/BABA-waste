#!/bin/bash

# ============================================================================
# セキュリティチェックスクリプト（デプロイ前必須）
# ============================================================================

set -e

echo "🔍 セキュリティチェック開始..."
echo ""

# ============================================================================
# 1. 環境変数チェック
# ============================================================================

echo "📋 Step 1: 環境変数チェック"

if [ "$ENV" = "production" ] || [ "$NODE_ENV" = "production" ]; then
  echo "⚠️  本番環境を検出しました"
  
  DANGEROUS_VARS=(
    "ENABLE_E2E_BYPASS"
    "ENABLE_ADMIN_BYPASS"
    "ENABLE_DEBUG_MODE"
    "SKIP_PAYMENT_VERIFICATION"
    "NEXT_PUBLIC_ENABLE_E2E_BYPASS"
  )
  
  HAS_ERROR=0
  
  for var in "${DANGEROUS_VARS[@]}"; do
    # 環境変数が設定されているかチェック
    if [ -n "${!var}" ]; then
      echo "❌ ERROR: $var is set in production!"
      echo "   Value: ${!var}"
      HAS_ERROR=1
    else
      echo "✅ $var: 未設定（OK）"
    fi
  done
  
  if [ $HAS_ERROR -eq 1 ]; then
    echo ""
    echo "❌ 本番環境で危険な環境変数が設定されています。"
    echo "   デプロイを中止してください。"
    exit 1
  fi
  
  echo "✅ 環境変数チェック: OK"
else
  echo "ℹ️  開発/テスト環境を検出しました（環境変数チェックをスキップ）"
fi

echo ""

# ============================================================================
# 2. コードパターンチェック
# ============================================================================

echo "📋 Step 2: コードパターンチェック"

DANGEROUS_PATTERNS=(
  "searchParams.get\('e2e'\)"
  "searchParams.get\('bypass'\)"
  "query\.force"
  "\.deleteMany\(\)"
)

HAS_WARNING=0

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  echo "🔍 チェック中: $pattern"
  
  # パターンを検索（isTestEnv がない場合は警告）
  MATCHES=$(grep -rn "$pattern" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
  
  if [ -n "$MATCHES" ]; then
    # isTestEnv の有無を確認
    while IFS= read -r line; do
      FILE=$(echo "$line" | cut -d: -f1)
      LINE_NUM=$(echo "$line" | cut -d: -f2)
      
      # 前後5行を取得して isTestEnv があるか確認
      CONTEXT=$(sed -n "$((LINE_NUM-5)),$((LINE_NUM+5))p" "$FILE" 2>/dev/null || true)
      
      if ! echo "$CONTEXT" | grep -q "isTestEnv"; then
        echo "⚠️  WARNING: $FILE:$LINE_NUM"
        echo "   環境判定（isTestEnv）がない可能性があります"
        HAS_WARNING=1
      fi
    done <<< "$MATCHES"
  fi
done

if [ $HAS_WARNING -eq 1 ]; then
  echo ""
  echo "⚠️  警告: 環境判定がないパターンが見つかりました。"
  echo "   手動でレビューしてください。"
  # 警告は exit しない（手動レビューを促す）
else
  echo "✅ コードパターンチェック: OK"
fi

echo ""

# ============================================================================
# 3. 環境変数定義チェック
# ============================================================================

echo "📋 Step 3: 環境変数定義チェック"

if [ ! -f ".env.example" ]; then
  echo "⚠️  WARNING: .env.example が見つかりません"
else
  REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )
  
  for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.example; then
      echo "✅ $var: 定義済み"
    else
      echo "⚠️  WARNING: $var が .env.example に定義されていません"
    fi
  done
fi

echo ""

# ============================================================================
# 4. セキュリティコメントチェック
# ============================================================================

echo "📋 Step 4: セキュリティコメントチェック"

# バイパス処理にセキュリティコメントがあるか確認
BYPASS_FILES=$(grep -rl "isTestEnv" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -n "$BYPASS_FILES" ]; then
  MISSING_COMMENTS=0
  
  while IFS= read -r file; do
    # セキュリティコメントがあるか確認
    if ! grep -q "セキュリティ\|SECURITY\|本番環境" "$file"; then
      echo "⚠️  WARNING: $file"
      echo "   セキュリティコメントがありません"
      MISSING_COMMENTS=1
    fi
  done <<< "$BYPASS_FILES"
  
  if [ $MISSING_COMMENTS -eq 0 ]; then
    echo "✅ セキュリティコメントチェック: OK"
  fi
else
  echo "ℹ️  バイパス処理が見つかりませんでした（OK）"
fi

echo ""

# ============================================================================
# 5. 最終確認
# ============================================================================

echo "🎉 セキュリティチェック完了"
echo ""

if [ "$ENV" = "production" ] || [ "$NODE_ENV" = "production" ]; then
  echo "✅ 本番環境デプロイ: 承認"
  echo ""
  echo "📝 デプロイ前の最終確認:"
  echo "   1. 環境変数が正しく設定されているか"
  echo "   2. バイパス系環境変数が未設定か"
  echo "   3. セキュリティレビューが完了しているか"
  echo ""
else
  echo "✅ 開発/テスト環境デプロイ: 承認"
fi

exit 0






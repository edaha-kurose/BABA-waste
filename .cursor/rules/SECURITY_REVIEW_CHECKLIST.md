# セキュリティレビューチェックリスト（必須）

**このチェックリストは全PR・全デプロイで必須です。**

---

## 🚨 重要: なぜこのチェックリストが必要か

**過去のインシデント**: E2Eバイパスのセキュリティホール（2025-10-18）
- 環境判定なしのバイパス実装
- 本番環境で誰でも認証スキップ可能
- ユーザーの指摘で発覚（デプロイ前に発見できず）

**教訓**: 「動く」≠「セキュア」

---

## ✅ 基本チェック（全PR必須）

### 1. 環境分離
- [ ] バイパス・スキップ処理に環境判定があるか？
- [ ] 環境変数が `.env.example` に記載されているか？
- [ ] 本番環境で無効化される設計か？

### 2. 認証・認可
- [ ] 認証スキップに環境判定があるか？
- [ ] 管理者権限の昇格に環境判定があるか？
- [ ] セッション管理は適切か？

### 3. データアクセス
- [ ] SQLインジェクション対策はあるか？
- [ ] RLS（Row Level Security）は有効か？
- [ ] 削除処理に確認ステップがあるか？

### 4. 外部API
- [ ] APIキーはサーバーサイドのみで使用しているか？
- [ ] テストモードに環境判定があるか？
- [ ] レート制限は実装されているか？

---

## 🔒 高リスク変更（特別チェック）

### 認証・認可の変更

```typescript
// ❌ 危険なパターン
if (searchParams.get('bypass') === '1') {
  return NextResponse.next()
}

// ✅ 安全なパターン
const isTestEnv = process.env.NODE_ENV === 'test' 
  || process.env.ENABLE_BYPASS === 'true'
if (isTestEnv && searchParams.get('bypass') === '1') {
  return NextResponse.next()
}
```

**チェック項目**:
- [ ] 環境判定があるか？
- [ ] 本番環境で無効化されるか？
- [ ] セキュリティコメントがあるか？
- [ ] ログ出力があるか？

---

### 決済・課金の変更

```typescript
// ❌ 危険なパターン
if (request.query.test === '1') {
  return { status: 'paid', amount: 0 }
}

// ✅ 安全なパターン
const isTestEnv = process.env.NODE_ENV === 'test'
if (isTestEnv && request.query.test === '1') {
  return { status: 'paid', amount: 0 }
}
```

**チェック項目**:
- [ ] 環境判定があるか？
- [ ] 本番環境で実際の決済が実行されるか？
- [ ] テストデータと本番データが分離されているか？
- [ ] 金額の検証があるか？

---

### データ削除・変更の変更

```typescript
// ❌ 危険なパターン
if (request.query.force === '1') {
  await prisma.users.deleteMany()
}

// ✅ 安全なパターン
const isTestEnv = process.env.NODE_ENV === 'test'
if (isTestEnv && request.query.force === '1') {
  await prisma.users.deleteMany({
    where: { email: { contains: 'test' } }
  })
}
```

**チェック項目**:
- [ ] 環境判定があるか？
- [ ] 削除対象が限定されているか？
- [ ] トランザクションが使用されているか？
- [ ] ロールバック手順が文書化されているか？

---

### 外部API統合の変更

```typescript
// ❌ 危険なパターン
const apiKey = process.env.API_KEY || 'test_key_123'

// ✅ 安全なパターン
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY is required')
}
```

**チェック項目**:
- [ ] APIキーはサーバーサイドのみか？
- [ ] デフォルト値が設定されていないか？
- [ ] 環境変数が未設定時にエラーになるか？
- [ ] APIキーがログに出力されないか？

---

## 📋 デプロイ前チェック（本番デプロイ必須）

### 環境変数チェック
```bash
# 本番環境で以下が未設定であることを確認
echo $ENABLE_E2E_BYPASS          # → 空
echo $ENABLE_ADMIN_BYPASS        # → 空
echo $ENABLE_DEBUG_MODE          # → 空
echo $SKIP_PAYMENT_VERIFICATION  # → 空
```

**チェック項目**:
- [ ] バイパス系環境変数が未設定
- [ ] デバッグ系環境変数が未設定
- [ ] テスト系環境変数が未設定

---

### コードパターンチェック
```bash
# 危険なパターンがないか確認
grep -r "searchParams.get('e2e')" --include="*.ts" | grep -v "isTestEnv"
grep -r "searchParams.get('bypass')" --include="*.ts" | grep -v "isTestEnv"
grep -r "query.force" --include="*.ts" | grep -v "isTestEnv"
```

**チェック項目**:
- [ ] 環境判定なしのバイパスがない
- [ ] 環境判定なしのスキップがない
- [ ] 環境判定なしの強制処理がない

---

### 手動テスト
```bash
# 本番環境で以下をテスト
curl https://production.com/api/hearings?e2e=1
# → {"error": "Unauthorized", "status": 401} を期待

curl https://production.com/dashboard?bypass=1
# → リダイレクト to /login を期待
```

**チェック項目**:
- [ ] バイパスパラメータで401エラー
- [ ] スキップパラメータでリダイレクト
- [ ] 通常のログインフローが正常動作

---

## 🔍 コードレビュー時の質問例

### 認証・認可
- ❓ このバイパス、本番環境でも動きますか？
- ❓ 環境判定がないですが、意図的ですか？
- ❓ 管理者権限の昇格は適切ですか？

### データアクセス
- ❓ この削除処理、本番データも対象ですか？
- ❓ RLSは有効ですか？
- ❓ トランザクションは使用していますか？

### 外部API
- ❓ このAPIキー、フロントエンドに公開されませんか？
- ❓ テストモードは本番で無効化されますか？
- ❓ レート制限は実装されていますか？

### 環境変数
- ❓ この環境変数、本番で設定されていますか？
- ❓ デフォルト値は安全ですか？
- ❓ `.env.example` に記載されていますか？

---

## 🚫 禁止パターン

### パターン1: 環境判定なしのバイパス
```typescript
// ❌ 絶対禁止
if (searchParams.get('bypass') === '1') {
  return NextResponse.next()
}
```

### パターン2: デフォルト値でのAPIキー設定
```typescript
// ❌ 絶対禁止
const apiKey = process.env.API_KEY || 'default_key'
```

### パターン3: 環境判定なしの全削除
```typescript
// ❌ 絶対禁止
if (request.query.force === '1') {
  await prisma.users.deleteMany()
}
```

### パターン4: フロントエンドでのAPIキー使用
```typescript
// ❌ 絶対禁止
const apiKey = process.env.NEXT_PUBLIC_API_KEY
fetch('https://api.example.com', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
})
```

---

## 📊 リスクレベル判定

### 🔴 CRITICAL（即座に修正必須）
- 環境判定なしの認証バイパス
- フロントエンドでのAPIキー使用
- 環境判定なしの全データ削除

### 🟠 HIGH（デプロイ前に修正必須）
- 環境判定なしの決済スキップ
- RLS未設定のデータアクセス
- SQLインジェクション脆弱性

### 🟡 MEDIUM（1週間以内に修正）
- ログに機密情報が出力
- レート制限なしの外部API呼び出し
- トランザクションなしのデータ変更

### 🟢 LOW（次回スプリントで修正）
- セキュリティコメント不足
- エラーハンドリング不足
- ログ出力不足

---

## 🛠️ 自動チェックスクリプト

### pre-deploy-check.sh
```bash
#!/bin/bash

echo "🔍 セキュリティチェック開始..."

# 環境変数チェック
if [ "$ENV" = "production" ]; then
  DANGEROUS_VARS=(
    "ENABLE_E2E_BYPASS"
    "ENABLE_ADMIN_BYPASS"
    "ENABLE_DEBUG_MODE"
    "SKIP_PAYMENT_VERIFICATION"
  )
  
  for var in "${DANGEROUS_VARS[@]}"; do
    if [ -n "${!var}" ]; then
      echo "❌ ERROR: $var is set in production!"
      exit 1
    fi
  done
  
  echo "✅ 環境変数チェック: OK"
fi

# コードパターンチェック
DANGEROUS_PATTERNS=(
  "searchParams.get('e2e')"
  "searchParams.get('bypass')"
  "query.force"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if grep -r "$pattern" --include="*.ts" --include="*.tsx" | grep -v "isTestEnv"; then
    echo "⚠️ WARNING: Dangerous pattern found: $pattern"
    exit 1
  fi
done

echo "✅ コードパターンチェック: OK"
echo "🎉 セキュリティチェック完了"
```

### package.json
```json
{
  "scripts": {
    "security:check": "bash scripts/pre-deploy-check.sh",
    "predeploy": "npm run security:check"
  }
}
```

---

## 📚 関連ドキュメント

- `docs/ROOT_CAUSE_ANALYSIS_E2E_BYPASS.md`: 根本原因分析
- `docs/E2E_BYPASS_SECURITY_ANALYSIS.md`: セキュリティ分析
- `.cursor/rules/E2E_TEST_GUIDELINES.md`: E2Eテストガイドライン

---

## 🎓 教育資料

### 新規メンバーオンボーディング
1. このチェックリストを読む（30分）
2. 過去のインシデント事例を学ぶ（30分）
3. セキュリティレビューを実践（1時間）

### 定期的な復習
- 月次: セキュリティレビュー会議
- 四半期: インシデント事例の振り返り
- 年次: セキュリティ監査

---

**最終更新**: 2025-10-18  
**ステータス**: ✅ 必須遵守  
**次のアクション**: 全PRでこのチェックリストを使用 → CI/CDに組み込む






# ガードレール ドキュメント

**目的**: AI開発における失敗を防ぐための包括的なガードレールフレームワーク

**更新日**: 2025-10-14

---

## 📚 ドキュメント一覧

### 🔴 必須ガードレール

#### 1. [汎用ガードレールフレームワーク](./UNIVERSAL_GUARDRAIL_FRAMEWORK.md) 🆕
**すべてのプロジェクトに適用可能な3層防御フレームワーク**

- **Layer 1: 事前防御** - コードを書く前に考える
- **Layer 2: 実行中防御** - 実装中に間違いに気づく
- **Layer 3: 事後防御** - 設定が正しいかを自動検証

**適用優先度**: 🔴 **最高**

---

#### 2. [インフラ設定チェックリスト](./INFRASTRUCTURE_SETUP_CHECKLIST.md) 🆕
**Next.js + Supabase 環境での設定ミスを防ぐ**

- middleware.ts 重複チェック
- Supabase スキーマ公開設定
- スキーマ権限設定
- データ整合性チェック

**適用優先度**: 🔴 **最高**

---

#### 3. [Prisma Migration Guide](./PRISMA_MIGRATION_GUIDE.md) 🆕
**Prismaマイグレーション実行時の安全な手順**

- `prisma db pull` の危険性と対策
- バックアップ・ロールバック手順
- モデル名変更時の一括修正方法
- トラブルシューティング

**適用優先度**: 🔴 **最高**

---

#### 4. [スキーマ変更ガイドライン](../specifications/SCHEMA_CHANGE_GUIDELINES.md)
**データベーススキーマ変更時の標準手順**

- 影響範囲分析
- DDL命名規則
- ロールバック手順

**適用優先度**: 🔴 **最高**

---

#### 5. [BFF共通設定](./CURSOR_COMMON_SETTINGS_v3.3_BFF.md)
**BFF（Backend For Frontend）アーキテクチャの実装ガイド**

- API契約駆動開発
- 外部API統合パターン
- セキュリティ強化

**適用優先度**: 🟠 **高**

---

### 🟡 補助ドキュメント

#### 6. [AI開発スキーマ安全対策ガイド](./AI_DEVELOPMENT_SCHEMA_SAFETY_GUIDE.md)
**AI開発特有のリスクと対策**

- 型定義の自動生成
- 影響範囲分析スクリプト
- Pre-commitフック

---

#### 7. [統合ガイド v3.2](./Integration_Guide_v3.2.md)
**システム統合時の注意事項**

---

#### 8. [決定マトリクス v3.2](./Manager_Decision_Matrix_v3.2.md)
**プロジェクト管理者向け意思決定支援**

---

## 🚀 クイックスタート

### 新規プロジェクト

```bash
# 1. ガードレールをコピー
cp -r docs/guardrails/ <new-project>/docs/guardrails/

# 2. 自動チェックスクリプトをセットアップ
npm install --save-dev husky
npx husky init

# 3. 構造チェックを実行
npm run check:structure
```

---

### 既存プロジェクト

```bash
# 1. 構造チェックを実行
npm run check:structure

# 2. エラーがあれば修正
# 例: middleware.ts の重複を削除

# 3. Pre-flightチェックを実行
npm run preflight
```

---

## 📋 使い方

### タスク開始時（必須）

```markdown
1. 関連ガードレールを確認
   - Prismaマイグレーション: `PRISMA_MIGRATION_GUIDE.md`
   - データベース変更: `SCHEMA_CHANGE_GUIDELINES.md`
   - インフラ設定: `INFRASTRUCTURE_SETUP_CHECKLIST.md`
   - BFF実装: `CURSOR_COMMON_SETTINGS_v3.3_BFF.md`

2. 影響範囲を分析
   ```bash
   npm run schema:impact -- --table <table> --column <column>
   ```

3. 設計ドキュメントを作成
   - `docs/design/YYYY-MM-DD_<feature-name>.md`

4. レビューを受ける
```

---

### 実装中

```bash
# 構造チェック
npm run check:structure

# 型チェック
npm run typecheck

# Pre-flightチェック（すべて）
npm run preflight
```

---

### コミット前

```bash
# Git pre-commit フックが自動実行
# - 構造チェック
# - 型チェック
# - Lint
```

---

## 🛡️ 3層防御の詳細

### Layer 1: 事前防御（Before）

**目的**: コードを書く前に考える

- タスク開始時チェックリスト自動表示
- 設計ドキュメント必須化
- Pre-implementation Review

### Layer 2: 実行中防御（During）

**目的**: 実装中に間違いに気づく

- AI Copilot へのガードレール埋め込み (`.cursorrules`)
- IDE プラグイン（リアルタイムチェック）
- コミット前自動警告

### Layer 3: 事後防御（After）

**目的**: 設定が正しいかを自動検証

- 設定ドリフト検知 (`npm run check:structure`)
- CI/CD自動検証
- 定期的な自動検証

---

## 🔍 自動チェックツール

### 1. 構造チェック

```bash
npm run check:structure
```

**チェック項目**:
- middleware.ts の重複
- 重要ファイルの存在
- Next.js設定
- Supabaseクライアント設定
- useUser フックの2段階検索

---

### 2. Pre-flightチェック

```bash
npm run preflight
```

**チェック項目**:
- 構造チェック
- 型チェック

---

### 3. 影響範囲分析

```bash
npm run schema:impact -- --table <table> --column <column>
```

**出力**:
- リスクレベル（LOW / MEDIUM / HIGH / CRITICAL）
- 影響箇所（API、コンポーネント）
- 推奨事項

---

## ⚠️ よくある間違いと対策

### 間違い1: ガードレールを読まずに実装

```
❌ NG: ユーザーの要求 → すぐに実装

✅ OK: ユーザーの要求 → ガードレール確認 → 設計 → 実装
```

**対策**: `.cursorrules` にガードレール確認プロセスを組み込む

---

### 間違い2: middleware.ts の重複

```
❌ NG:
  - next-app/middleware.ts
  - next-app/src/middleware.ts （重複）

✅ OK:
  - next-app/middleware.ts のみ
```

**対策**: `npm run check:structure` で自動検知

---

### 間違い3: Supabaseスキーマ設定忘れ

```
❌ NG: db.schema の設定なし

✅ OK:
  createClient(..., {
    db: { schema: 'app' }
  })
```

**対策**: `npm run check:structure` で自動検知

---

### 間違い4: auth.users.id で直接検索

```
❌ NG:
  supabase
    .from('user_org_roles')
    .eq('user_id', auth.users.id)

✅ OK:
  // Step 1
  supabase.from('users').eq('auth_user_id', auth.users.id)
  // Step 2
  supabase.from('user_org_roles').eq('user_id', app_user_id)
```

**対策**: `npm run check:structure` で自動検知

---

### 間違い5: `prisma db pull` 実行前のバックアップなし

```
❌ NG:
  prisma db pull → すぐに実装 → 全APIが500エラー

✅ OK:
  # バックアップ
  cp prisma/schema.prisma prisma/schema.prisma.backup
  
  # 実行
  prisma db pull
  
  # 差分確認
  git diff prisma/schema.prisma
  
  # 影響範囲分析 → API修正
```

**対策**: 
- `PRISMA_MIGRATION_GUIDE.md` に従う
- バックアップを必ず作成
- 差分を必ず確認

---

## 📊 チェックリスト

### タスク開始時
- [ ] 関連ガードレールを読んだ
- [ ] 影響範囲分析を実施した
- [ ] 設計ドキュメントを作成した

### 実装中
- [ ] ガードレールを遵守している
- [ ] 型安全性を保っている
- [ ] エラーハンドリングを実装している

### コミット前
- [ ] `npm run check:structure` を実行した
- [ ] `npm run typecheck` を実行した
- [ ] テストが通った

---

## 🎯 成功の指標

- [ ] ガードレール違反が **0件/月** になる
- [ ] 設計なしでの実装が **0件/月** になる
- [ ] 設定ドリフトが **0件/月** になる

---

## 🆘 トラブルシューティング

### 問題: `npm run check:structure` でエラー

**原因**: プロジェクト構造に問題がある

**解決方法**:
1. エラーメッセージを確認
2. 該当ファイルを修正
3. 再度 `npm run check:structure` を実行

---

### 問題: AI が設計を提示せずにいきなり実装する

**原因**: `.cursorrules` が読み込まれていない

**解決方法**:
1. `.cursorrules` ファイルが存在するか確認
2. Cursor を再起動
3. 設定を確認

---

### 問題: ガードレールが多すぎて覚えられない

**解決方法**:
- **自動チェックに頼る** - `npm run check:structure` で自動検知
- **AI に任せる** - `.cursorrules` が自動的にチェック
- **重要なものから** - まず `UNIVERSAL_GUARDRAIL_FRAMEWORK.md` だけ読む

---

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-15 | 2.1 | Prisma Migration Guideを追加 |
| 2025-10-15 | 2.1 | インフラ設定チェックリストにPrismaチェックを追加 |
| 2025-10-14 | 2.0 | 汎用ガードレールフレームワーク追加 |
| 2025-10-14 | 2.0 | インフラ設定チェックリスト追加 |
| 2025-10-14 | 2.0 | 自動チェックツール追加 |

---

**最終更新**: 2025-10-15  
**バージョン**: 2.1  
**メンテナー**: AI Assistant



# Prisma Migration Guide

**最終更新**: 2025-10-15  
**重要度**: 🔴 最高

---

## 概要

このガイドは、Prismaマイグレーション実行時の安全な手順とチェックリストを定義します。

**対象操作**:
- `prisma db pull` - データベースからスキーマを取得
- `prisma db push` - スキーマをデータベースに反映
- `prisma migrate dev` - マイグレーション作成・実行

---

## 🚨 緊急: `prisma db pull` の危険性

### 問題
`prisma db pull` は、既存のPrismaスキーマを**データベースの実際の構造で完全に上書き**します。

### 影響
- モデル名が予期せず変更される（camelCase → snake_case）
- リレーション名が自動生成名に変更される
- カスタム設定（`@@map`, `@relation`）が失われる
- **全APIファイルが即座に動作不能になる**

---

## ✅ `prisma db pull` 実行前の必須手順

### 1. バックアップ作成
```bash
# Prismaスキーマをバックアップ
cp next-app/prisma/schema.prisma next-app/prisma/schema.prisma.backup

# Git コミット状態を確認
git status
git diff next-app/prisma/schema.prisma

# 未コミット変更があればコミット
git add .
git commit -m "chore: backup before prisma db pull"
```

### 2. 影響範囲分析
```bash
# Prismaモデル使用箇所を検索
cd next-app
grep -r "prisma\." src/app/api/ | wc -l

# 使用されているモデル名を列挙
grep -roh "prisma\.[a-zA-Z_]*\." src/app/api/ | sort | uniq
```

### 3. ロールバック計画
```bash
# ロールバック手順を準備
echo "ロールバック: git checkout next-app/prisma/schema.prisma.backup"
echo "復元: pnpm prisma generate"
```

---

## 🔧 `prisma db pull` 実行手順

### Step 1: 実行
```bash
cd next-app
pnpm dotenv -e .env.local -- pnpm prisma db pull
```

### Step 2: 差分確認
```bash
# 変更内容を確認
git diff prisma/schema.prisma

# 特に注意: モデル名・リレーション名の変更
```

### Step 3: 変更パターンの特定
以下を確認:
- [ ] モデル名が変更されたか？（例: `User` → `app_users`）
- [ ] リレーション名が変更されたか？（例: `organization` → `organizations`）
- [ ] 新しいフィールドが追加されたか？
- [ ] 削除されたフィールドはあるか？

### Step 4: Prisma Client再生成
```bash
pnpm prisma generate
```

---

## 🛠️ API修正手順（モデル名変更時）

### 1. 一括置換リスト作成
```bash
# 変更されたモデル名をリスト化
cat << 'EOF' > /tmp/prisma-replacements.txt
prisma.user. -> prisma.app_users.
prisma.organization. -> prisma.organizations.
prisma.store. -> prisma.stores.
prisma.plan. -> prisma.plans.
prisma.collection. -> prisma.collections.
prisma.collectionRequest. -> prisma.collection_requests.
EOF
```

### 2. 影響範囲の特定
```bash
# 修正が必要なファイルを列挙
grep -rl "prisma\.(user|organization|store|plan|collection)\." src/app/api/
```

### 3. 一括置換実行
```bash
# 各APIファイルで置換（例）
# sed -i 's/prisma\.user\./prisma.app_users./g' src/app/api/**/*.ts
```

**⚠️ 注意**: エディタの「Find & Replace All」機能を使う方が安全です。

### 4. TypeScriptエラーチェック
```bash
pnpm typecheck
```

### 5. APIテスト
```bash
# ローカルサーバー起動
pnpm dev

# 別ターミナルで全APIテスト
curl http://localhost:3001/api/organizations
curl http://localhost:3001/api/stores
curl http://localhost:3001/api/plans
# ...
```

---

## 📋 `prisma db push` 実行時のチェックリスト

### 実行前
- [ ] スキーマファイルをレビュー済み
- [ ] 破壊的変更（DROP COLUMN）がないことを確認
- [ ] 既存データへの影響を分析
- [ ] バックアップ作成済み

### 実行
```bash
cd next-app
pnpm dotenv -e .env.local -- pnpm prisma db push
```

### 実行後
- [ ] Prisma Client再生成（`pnpm prisma generate`）
- [ ] TypeScriptエラーチェック（`pnpm typecheck`）
- [ ] 全APIテスト実行
- [ ] データ整合性確認

---

## 🚫 禁止事項

### 1. 本番環境で直接 `prisma db pull` を実行
```bash
❌ 本番データベースに接続して prisma db pull
✅ ローカル/ステージング環境で検証後、本番へデプロイ
```

### 2. バックアップなしで実行
```bash
❌ バックアップなしで prisma db pull
✅ 必ず schema.prisma をバックアップ
```

### 3. 差分確認なしでコミット
```bash
❌ prisma db pull → git add . → git commit
✅ prisma db pull → git diff 確認 → 影響範囲分析 → git commit
```

---

## 🔄 ロールバック手順

### Prismaスキーマのみロールバック
```bash
# バックアップから復元
cp next-app/prisma/schema.prisma.backup next-app/prisma/schema.prisma

# Prisma Client再生成
cd next-app
pnpm prisma generate

# サーバー再起動
pnpm dev
```

### Git経由でロールバック
```bash
# 前回のコミットに戻る
git checkout HEAD -- next-app/prisma/schema.prisma

# Prisma Client再生成
cd next-app
pnpm prisma generate
```

---

## 📊 トラブルシューティング

### Q1: `prisma db pull` 後に全APIが500エラー
**原因**: モデル名またはリレーション名が変更された

**対処**:
1. `git diff prisma/schema.prisma` で変更を確認
2. 変更されたモデル名を特定
3. 全APIファイルで一括置換
4. `pnpm typecheck` でエラーチェック

### Q2: TypeScriptエラー: `Property 'xxx' does not exist`
**原因**: フィールド名が変更された（例: `deleted_at` が存在しない）

**対処**:
1. `prisma/schema.prisma` でフィールド名を確認
2. APIクエリから該当フィールドを削除
3. `pnpm typecheck` でエラー解消を確認

### Q3: リレーションエラー: `Unknown field 'xxx' for include statement`
**原因**: リレーション名が変更された

**対処**:
1. `prisma/schema.prisma` でリレーション名を確認
2. 正しいリレーション名に置換
3. 例: `organization:` → `organizations:`

---

## 🎯 ベストプラクティス

### 1. 定期的なスキーマ同期
```bash
# 週次で確認（開発環境）
cd next-app
pnpm dotenv -e .env.local -- pnpm prisma db pull
git diff prisma/schema.prisma

# 差分がなければOK
# 差分があれば影響範囲を分析
```

### 2. マイグレーションファイルの管理
```bash
# prisma migrate を使う場合
pnpm prisma migrate dev --name add_email_column

# マイグレーションファイルをGit管理
git add prisma/migrations/
```

### 3. CI/CDでの自動チェック
```yaml
# .github/workflows/prisma-check.yml
- name: Prisma Schema Check
  run: |
    cd next-app
    pnpm prisma validate
    pnpm prisma format --check
```

---

## 📚 関連ガードレール

- `INFRASTRUCTURE_SETUP_CHECKLIST.md` - Supabase設定
- `UNIVERSAL_GUARDRAIL_FRAMEWORK.md` - 汎用フレームワーク
- `.cursorrules` - AI開発ルール

---

**このガイドを遵守することで、Prismaマイグレーションに伴う大規模障害を防げます。**



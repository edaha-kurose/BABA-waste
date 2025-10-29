# Schema Sync Check Runbook

**最終更新**: 2025年10月19日  
**対象**: 開発者全員  
**目的**: Prisma SchemaとDBの同期確認手順

---

## 🎯 目的

Prisma Schema (`prisma/schema.prisma`) とデータベースの同期を確認し、不整合を検出・修正する。

---

## 📋 実行タイミング

### 必須タイミング
- [ ] マイグレーション実行前
- [ ] Pull Request作成前
- [ ] デプロイ前
- [ ] 週次定期チェック（月曜朝）

### 推奨タイミング
- [ ] 手動SQL実行後
- [ ] データベーススキーマ変更後
- [ ] Prisma Schema編集後

---

## 🚀 実行手順

### Step 1: スキーマ同期チェック実行

```bash
cd next-app
pnpm check:schema-sync
```

### Step 2: 結果の確認

#### パターン1: 同期OK ✅

```
🔍 Prisma スキーマ同期チェック開始...
📥 DBから最新スキーマを取得中...
✅ schema.prisma と DB は同期しています
```

**対応**: 何もしない（次の作業に進む）

---

#### パターン2: 同期NG ❌

```
❌ schema.prisma と DB が乖離しています！
   差分を確認してください:
   
diff --git a/prisma/schema.prisma b/prisma/schema.prisma
index 1234567..89abcdef 100644
--- a/prisma/schema.prisma
+++ b/prisma/schema.prisma
@@ -10,6 +10,7 @@ model users {
   id         String @id
   email      String
+  new_column String?  // ← DBに存在するが、schema.prismaにない
}
```

**対応**: [不整合の解決](#不整合の解決) に進む

---

## 🔧 不整合の解決

### ケース1: DBにカラムが追加されている

**原因**: 手動SQLで追加されたが、schema.prismaが更新されていない

**解決方法**:

```bash
# 1. 現在のschema.prismaをバックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. DBから最新スキーマを取得
pnpm prisma db pull

# 3. 差分を確認
git diff prisma/schema.prisma

# 4. 必要に応じて手動で調整
# （コメントやフォーマットを修正）

# 5. 型を再生成
pnpm prisma:generate

# 6. 再度同期確認
pnpm check:schema-sync
```

---

### ケース2: schema.prismaにカラムが追加されている

**原因**: schema.prismaを編集したが、マイグレーションを実行していない

**解決方法**:

```bash
# マイグレーションを作成・実行
pnpm prisma migrate dev --name add_missing_column

# 同期確認
pnpm check:schema-sync
```

---

### ケース3: カラム型が不一致

**原因**: 手動SQLでALTER TABLEを実行したが、schema.prismaが更新されていない

**解決方法**:

```bash
# 1. バックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. DBから最新スキーマを取得
pnpm prisma db pull

# 3. 差分を確認して手動で調整
git diff prisma/schema.prisma

# 4. マイグレーションを作成（スキーマを正式化）
pnpm prisma migrate dev --name sync_schema_with_db

# 5. 型を再生成
pnpm prisma:generate

# 6. 同期確認
pnpm check:schema-sync
```

---

## 🚨 緊急対応

### 本番環境で不整合が発見された場合

#### Step 1: 影響範囲確認

```bash
# どのテーブル/カラムが不整合か確認
pnpm check:schema-sync

# 影響範囲分析
pnpm schema:impact -- --table affected_table
```

#### Step 2: 緊急修正

**選択肢A**: DBをschema.prismaに合わせる（推奨）

```bash
# 1. マイグレーションを作成
pnpm prisma migrate deploy

# 2. 検証
pnpm check:schema-sync
```

**選択肢B**: schema.prismaをDBに合わせる（一時的）

```bash
# 1. バックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. DBから取得
pnpm prisma db pull

# 3. 型生成
pnpm prisma:generate

# 4. 検証
pnpm check:schema-sync

# 5. 後日、正式なマイグレーションを作成
```

#### Step 3: ポストモーテム作成

不整合が発生した原因を分析し、再発防止策を文書化する。

---

## 📊 定期チェックの自動化

### GitHub Actions（CI/CD）

`.github/workflows/ci.yml` に既に設定済み:

```yaml
- name: Check Schema Sync
  run: pnpm check:schema-sync
```

### Pre-commit Hook

`.husky/pre-commit` に既に設定済み:

```bash
pnpm check:schema-sync || {
  echo "❌ Schema sync check failed"
  exit 1
}
```

### Cron Job（サーバー）

```bash
# crontab -e
0 9 * * 1 cd /path/to/project && pnpm check:schema-sync || echo "Schema sync failed" | mail -s "Alert" team@example.com
```

---

## 🔍 トラブルシューティング

### 問題1: check:schema-sync が存在しない

**エラー**: `Unknown command "check:schema-sync"`

**解決方法**:

```bash
# package.json に追加
"scripts": {
  "check:schema-sync": "tsx scripts/check-schema-sync.ts"
}

# スクリプトが存在するか確認
ls scripts/check-schema-sync.ts
```

---

### 問題2: DATABASE_URL が見つからない

**エラー**: `Environment variable not found: DATABASE_URL`

**解決方法**:

```bash
# .env.local が存在するか確認
ls .env.local

# DATABASE_URL が設定されているか確認
grep DATABASE_URL .env.local

# 設定されていない場合は追加
echo 'DATABASE_URL="postgresql://..."' >> .env.local
```

---

### 問題3: prisma db pull が失敗する

**エラー**: `P1001: Can't reach database server`

**解決方法**:

```bash
# データベース接続確認
psql $DATABASE_URL -c "SELECT 1;"

# DATABASE_URL の形式確認
echo $DATABASE_URL

# Supabaseの場合、Direct URLを使用
# pooler URL ではなく direct URL を使用
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

---

## 📚 参考資料

### プロジェクト内ドキュメント
- [Prisma Migration Guide](../guardrails/PRISMA_MIGRATION_GUIDE.md)
- [Global Rules](../../.cursor/rules/global-rules.md)
- [Foreign Key Management](foreign-key-management.md)

### Prisma公式ドキュメント
- [prisma db pull](https://www.prisma.io/docs/reference/api-reference/command-reference#db-pull)
- [prisma migrate](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate)

---

**最終更新**: 2025年10月19日  
**作成者**: AI Assistant  
**ステータス**: ✅ 使用可能






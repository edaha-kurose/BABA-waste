# 年間廃棄物報告書RLSポリシー 手動適用手順（グローバルルール準拠版）

**作成日**: 2025-10-20  
**対象**: `annual_waste_reports`, `annual_waste_report_items`  
**グローバルルール**: 手動SQL例外規定に準拠

---

## 📋 グローバルルール準拠の手順

### ⚠️ 重要: 手動SQLは原則禁止、例外時のみ許可

**許可される例外**:
1. ✅ **RLS ポリシー追加**（今回のケース）
2. ストアドプロシージャ作成
3. 大量データ移行

**例外時の必須手順**:
1. 手動SQL実行
2. **スキーマ同期確認（必須）**: `pnpm check:schema-sync`
3. **差分があれば**: `pnpm prisma db pull`
4. **型生成**: `pnpm prisma:generate`

---

## Step 1: RLSポリシーSQL実行

### 方法A: Supabase SQL Editor（推奨）

1. Supabase Dashboard にアクセス
   - URL: https://supabase.com/dashboard
2. プロジェクト選択: `db.tnbtnezxwnumgcbhswhn`
3. 左メニュー → **SQL Editor**
4. 以下のファイルの内容をコピー&貼り付け:
   ```
   db/policies/rls_annual_waste_reports.sql
   ```
5. **Run** ボタンをクリック

### 期待される結果

```
ALTER TABLE
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
COMMENT
COMMENT
...
```

---

## Step 2: スキーマ同期確認（必須）

**グローバルルール必須手順**

### 2-1. スキーマ同期チェック

```bash
cd next-app
pnpm check:schema-sync
```

**期待される結果**:
```
✅ schema.prisma と DB は同期しています
```

### 2-2. 差分がある場合

もし差分が検出された場合（RLSポリシーはschema.prismaに影響しないはずですが念のため）:

```bash
# 1. バックアップ
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. DB → schema.prisma 同期
pnpm prisma db pull

# 3. 差分確認
git diff prisma/schema.prisma

# 4. 型生成
pnpm prisma:generate
```

---

## Step 3: 動作確認

### 3-1. RLS有効化確認

```sql
-- RLS有効化確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'app' 
  AND tablename IN ('annual_waste_reports', 'annual_waste_report_items');
```

**期待される結果**:
| schemaname | tablename | rowsecurity |
|------------|-----------|-------------|
| app | annual_waste_reports | t |
| app | annual_waste_report_items | t |

### 3-2. ポリシー一覧確認

```sql
-- ポリシー一覧確認
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'app'
  AND tablename IN ('annual_waste_reports', 'annual_waste_report_items')
ORDER BY tablename, cmd;
```

**期待される結果**: 各テーブルに4つのポリシー（SELECT, INSERT, UPDATE, DELETE）

---

## Step 4: 最終チェック（グローバルルール準拠）

```bash
# TypeCheck
cd next-app
pnpm typecheck

# 外部キー制約チェック
pnpm check:foreign-keys

# （任意）E2Eテスト
pnpm test:e2e
```

---

## ⚠️ トラブルシューティング

### エラー: "policy already exists"

```sql
-- 既存ポリシー削除
DROP POLICY IF EXISTS org_isolation_select_annual_waste_reports ON app.annual_waste_reports;
DROP POLICY IF EXISTS org_isolation_insert_annual_waste_reports ON app.annual_waste_reports;
DROP POLICY IF EXISTS org_isolation_update_annual_waste_reports ON app.annual_waste_reports;
DROP POLICY IF EXISTS org_isolation_delete_annual_waste_reports ON app.annual_waste_reports;

DROP POLICY IF EXISTS org_isolation_select_annual_waste_report_items ON app.annual_waste_report_items;
DROP POLICY IF EXISTS org_isolation_insert_annual_waste_report_items ON app.annual_waste_report_items;
DROP POLICY IF EXISTS org_isolation_update_annual_waste_report_items ON app.annual_waste_report_items;
DROP POLICY IF EXISTS org_isolation_delete_annual_waste_report_items ON app.annual_waste_report_items;
```

### エラー: "function app.current_org_id() does not exist"

```sql
CREATE OR REPLACE FUNCTION app.current_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## ✅ 完了チェックリスト

- [ ] RLSポリシーSQL実行完了
- [ ] `pnpm check:schema-sync` 実行（同期確認）
- [ ] （差分があれば）`pnpm prisma db pull` 実行
- [ ] `pnpm prisma:generate` 実行
- [ ] `pnpm typecheck` → 0エラー
- [ ] RLS有効化確認（rowsecurity = t）
- [ ] ポリシー一覧確認（8個のポリシー）

---

**グローバルルール準拠**: 手動SQL例外規定に従った正しい手順です。




# 年間廃棄物報告書RLSポリシー 手動適用手順

**作成日**: 2025-10-20  
**対象**: `annual_waste_reports`, `annual_waste_report_items`

---

## 📋 手順

### Step 1: Supabase Dashboardにアクセス

1. ブラウザで Supabase Dashboard を開く
   - URL: https://supabase.com/dashboard
2. プロジェクトを選択: `db.tnbtnezxwnumgcbhswhn`
3. 左メニューから **SQL Editor** をクリック

---

### Step 2: SQLファイルを開く

以下のファイルの内容をコピーしてください：

```
db/policies/rls_annual_waste_reports.sql
```

---

### Step 3: SQL Editorに貼り付けて実行

1. SQL Editorの入力エリアに、コピーした内容を貼り付け
2. 右上の **Run** ボタンをクリック
3. 実行結果を確認

---

### Step 4: 実行結果の確認

以下のメッセージが表示されればOK：

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
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

---

### Step 5: 動作確認

以下のSQLで、RLSが正しく動作しているか確認：

```sql
-- RLS有効化確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'app' 
  AND tablename IN ('annual_waste_reports', 'annual_waste_report_items');

-- ポリシー一覧確認
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'app'
  AND tablename IN ('annual_waste_reports', 'annual_waste_report_items')
ORDER BY tablename, cmd;
```

**期待される結果**:
- `rowsecurity` = `t` (true)
- 各テーブルに4つのポリシー（SELECT, INSERT, UPDATE, DELETE）

---

## ⚠️ トラブルシューティング

### エラー: "policy already exists"

既にポリシーが存在する場合、以下で削除してから再実行：

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

`app.current_org_id()` 関数が未定義の場合、以下で作成：

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

## ✅ 完了確認

以下のコマンドで、データが正しく分離されているか確認：

```sql
-- セッション変数をテスト設定
SET app.current_org_id = '【あなたの組織ID】';

-- 自組織のデータのみ取得できることを確認
SELECT id, fiscal_year, report_type, status
FROM app.annual_waste_reports
ORDER BY created_at DESC
LIMIT 5;
```

---

**適用完了後は、このファイルを記録として保管してください。**




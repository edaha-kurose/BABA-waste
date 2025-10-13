-- seed_template.sql — RLS短時間OFF→冪等投入→検証→ON
BEGIN;
  -- 例: 対象テーブルを列挙
  ALTER TABLE invoice_headers DISABLE ROW LEVEL SECURITY;
  ALTER TABLE invoice_details DISABLE ROW LEVEL SECURITY;

  -- 冪等INSERT (ON CONFLICT ...)
  -- 事後検証（重複や金額整合）
  -- エラー時: RAISE EXCEPTION

  ALTER TABLE invoice_headers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;
COMMIT;

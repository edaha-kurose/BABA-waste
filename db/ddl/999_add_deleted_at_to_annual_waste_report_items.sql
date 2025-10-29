-- ============================================================================
-- 年間報告書明細テーブルに deleted_at カラムを追加
-- 理由: 他のテーブルと一貫性を保つため（論理削除対応）
-- ============================================================================

ALTER TABLE app.annual_waste_report_items
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN app.annual_waste_report_items.deleted_at IS '論理削除日時（NULL=有効、値あり=削除済み）';

-- インデックス追加（deleted_at でのフィルタリングを高速化）
CREATE INDEX IF NOT EXISTS idx_annual_report_items_deleted 
ON app.annual_waste_report_items(deleted_at);




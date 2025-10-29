-- ============================================================================
-- 年間廃棄物報告書テーブルのRLSポリシー
-- 作成日: 2025-10-20
-- 目的: 非JWNET廃棄物（事業系ごみ・不燃ごみ）の年間報告書のデータ分離
-- ============================================================================

-- RLS有効化
ALTER TABLE app.annual_waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.annual_waste_report_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- annual_waste_reports のポリシー
-- ============================================================================

-- SELECT: 自組織のデータのみ参照可能
CREATE POLICY org_isolation_select_annual_waste_reports ON app.annual_waste_reports
  FOR SELECT
  USING (org_id = app.current_org_id());

-- INSERT: 自組織のデータのみ作成可能
CREATE POLICY org_isolation_insert_annual_waste_reports ON app.annual_waste_reports
  FOR INSERT
  WITH CHECK (org_id = app.current_org_id());

-- UPDATE: 自組織のデータのみ更新可能
CREATE POLICY org_isolation_update_annual_waste_reports ON app.annual_waste_reports
  FOR UPDATE
  USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());

-- DELETE: 自組織のデータのみ削除可能
CREATE POLICY org_isolation_delete_annual_waste_reports ON app.annual_waste_reports
  FOR DELETE
  USING (org_id = app.current_org_id());

-- ============================================================================
-- annual_waste_report_items のポリシー
-- ============================================================================

-- SELECT: 親レポートの org_id で制御
CREATE POLICY org_isolation_select_annual_waste_report_items ON app.annual_waste_report_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app.annual_waste_reports r
      WHERE r.id = report_id AND r.org_id = app.current_org_id()
    )
  );

-- INSERT: 親レポートの org_id で制御
CREATE POLICY org_isolation_insert_annual_waste_report_items ON app.annual_waste_report_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.annual_waste_reports r
      WHERE r.id = report_id AND r.org_id = app.current_org_id()
    )
  );

-- UPDATE: 親レポートの org_id で制御
CREATE POLICY org_isolation_update_annual_waste_report_items ON app.annual_waste_report_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM app.annual_waste_reports r
      WHERE r.id = report_id AND r.org_id = app.current_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.annual_waste_reports r
      WHERE r.id = report_id AND r.org_id = app.current_org_id()
    )
  );

-- DELETE: 親レポートの org_id で制御
CREATE POLICY org_isolation_delete_annual_waste_report_items ON app.annual_waste_report_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM app.annual_waste_reports r
      WHERE r.id = report_id AND r.org_id = app.current_org_id()
    )
  );

-- ============================================================================
-- コメント
-- ============================================================================

COMMENT ON POLICY org_isolation_select_annual_waste_reports ON app.annual_waste_reports IS '年間報告書：自組織のデータのみ参照可能';
COMMENT ON POLICY org_isolation_insert_annual_waste_reports ON app.annual_waste_reports IS '年間報告書：自組織のデータのみ作成可能';
COMMENT ON POLICY org_isolation_update_annual_waste_reports ON app.annual_waste_reports IS '年間報告書：自組織のデータのみ更新可能';
COMMENT ON POLICY org_isolation_delete_annual_waste_reports ON app.annual_waste_reports IS '年間報告書：自組織のデータのみ削除可能';

COMMENT ON POLICY org_isolation_select_annual_waste_report_items ON app.annual_waste_report_items IS '年間報告書明細：親レポートの org_id で制御';
COMMENT ON POLICY org_isolation_insert_annual_waste_report_items ON app.annual_waste_report_items IS '年間報告書明細：親レポートの org_id で制御';
COMMENT ON POLICY org_isolation_update_annual_waste_report_items ON app.annual_waste_report_items IS '年間報告書明細：親レポートの org_id で制御';
COMMENT ON POLICY org_isolation_delete_annual_waste_report_items ON app.annual_waste_report_items IS '年間報告書明細：親レポートの org_id で制御';




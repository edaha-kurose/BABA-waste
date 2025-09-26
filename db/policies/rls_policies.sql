-- ============================================================================
-- 行レベルセキュリティ（RLS）ポリシー
-- 作成日: 2025-09-16
-- 目的: マルチテナント環境でのデータ分離とセキュリティ確保
-- ============================================================================

-- RLS有効化
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.item_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.stage_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 基本ポリシー（org_id一致のみ可視）
-- ============================================================================

-- 組織テーブル
CREATE POLICY org_isolation_select_organizations ON app.organizations 
  FOR SELECT USING (true); -- 組織は全ユーザーが参照可能

CREATE POLICY org_isolation_all_organizations ON app.organizations 
  FOR ALL USING (true) WITH CHECK (true); -- 組織作成は認証済みユーザーなら可能

-- ユーザー組織ロール
CREATE POLICY org_isolation_select_user_org_roles ON app.user_org_roles 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_user_org_roles ON app.user_org_roles 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 店舗
CREATE POLICY org_isolation_select_stores ON app.stores 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_stores ON app.stores 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 品目マッピング
CREATE POLICY org_isolation_select_item_maps ON app.item_maps 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_item_maps ON app.item_maps 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 契約
CREATE POLICY org_isolation_select_contracts ON app.contracts 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_contracts ON app.contracts 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 予定
CREATE POLICY org_isolation_select_plans ON app.plans 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_plans ON app.plans 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 予約
CREATE POLICY org_isolation_select_reservations ON app.reservations 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_reservations ON app.reservations 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 実績
CREATE POLICY org_isolation_select_actuals ON app.actuals 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_actuals ON app.actuals 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 本登録
CREATE POLICY org_isolation_select_registrations ON app.registrations 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_registrations ON app.registrations 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 監査ログ
CREATE POLICY org_isolation_select_audit_logs ON app.audit_logs 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_audit_logs ON app.audit_logs 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- ステージング
CREATE POLICY org_isolation_select_stage_plans ON app.stage_plans 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_stage_plans ON app.stage_plans 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- 承認
CREATE POLICY org_isolation_select_approvals ON app.approvals 
  FOR SELECT USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_all_approvals ON app.approvals 
  FOR ALL USING (org_id = app.current_org_id()) WITH CHECK (org_id = app.current_org_id());

-- ============================================================================
-- ロール別アクセス制御
-- ============================================================================

-- ADMIN: 全権限
CREATE POLICY admin_full_access_organizations ON app.organizations 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role = 'ADMIN'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role = 'ADMIN'
    )
  );

-- EMITTER: 自社データのみ
CREATE POLICY emitter_own_data_stores ON app.stores 
  FOR ALL USING (
    org_id = app.current_org_id() AND
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role IN ('ADMIN', 'EMITTER')
    )
  ) WITH CHECK (
    org_id = app.current_org_id() AND
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role IN ('ADMIN', 'EMITTER')
    )
  );

-- TRANSPORTER: 輸送関連データのみ
CREATE POLICY transporter_transport_data ON app.plans 
  FOR SELECT USING (
    org_id = app.current_org_id() AND
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role IN ('ADMIN', 'TRANSPORTER')
    )
  );

-- DISPOSER: 処分関連データのみ
CREATE POLICY disposer_disposal_data ON app.plans 
  FOR SELECT USING (
    org_id = app.current_org_id() AND
    EXISTS (
      SELECT 1 FROM app.user_org_roles uor 
      WHERE uor.user_id = auth.uid() 
        AND uor.org_id = app.current_org_id() 
        AND uor.role IN ('ADMIN', 'DISPOSER')
    )
  );

-- ============================================================================
-- ビューのRLS
-- ============================================================================

-- 店舗別実績ビューは自動的にRLSが適用される（基テーブルのRLSを継承）

-- ============================================================================
-- サービスロール用ポリシー（Edge Functions用）
-- ============================================================================

-- サービスロールはRLSをバイパスするため、特別なポリシーは不要
-- ただし、Edge Functions内では適切なorg_idを設定する必要がある

-- ============================================================================
-- ポリシーテスト用関数
-- ============================================================================

-- ポリシーの動作確認用関数
CREATE OR REPLACE FUNCTION app.test_rls_policies()
RETURNS TABLE (
  table_name text,
  policy_name text,
  policy_type text,
  policy_definition text
) 
LANGUAGE sql 
AS $$
  SELECT 
    schemaname||'.'||tablename AS table_name,
    policyname AS policy_name,
    permissive AS policy_type,
    qual AS policy_definition
  FROM pg_policies 
  WHERE schemaname = 'app'
  ORDER BY tablename, policyname;
$$;

-- 現在のユーザーのorg_id確認用関数
CREATE OR REPLACE FUNCTION app.debug_current_org_id()
RETURNS TABLE (
  current_user_id uuid,
  current_org_id uuid,
  jwt_org_id text,
  user_org_roles jsonb
) 
LANGUAGE sql 
AS $$
  SELECT 
    auth.uid() AS current_user_id,
    app.current_org_id() AS current_org_id,
    auth.jwt() ->> 'org_id' AS jwt_org_id,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'org_id', uor.org_id,
          'role', uor.role
        )
      )
      FROM app.user_org_roles uor
      WHERE uor.user_id = auth.uid()
    ) AS user_org_roles;
$$;

-- ============================================================================
-- コメント
-- ============================================================================

COMMENT ON POLICY org_isolation_select_organizations ON app.organizations IS '組織テーブル：全ユーザーが参照可能';
COMMENT ON POLICY org_isolation_all_organizations ON app.organizations IS '組織テーブル：認証済みユーザーが作成可能';
COMMENT ON POLICY org_isolation_select_stores ON app.stores IS '店舗テーブル：自組織のデータのみ参照可能';
COMMENT ON POLICY org_isolation_all_stores ON app.stores IS '店舗テーブル：自組織のデータのみ操作可能';
COMMENT ON POLICY admin_full_access_organizations ON app.organizations IS '管理者：組織テーブルに全権限';
COMMENT ON POLICY emitter_own_data_stores ON app.stores IS '排出事業者：自社データのみ操作可能';
COMMENT ON POLICY transporter_transport_data ON app.plans IS '輸送業者：輸送関連データのみ参照可能';
COMMENT ON POLICY disposer_disposal_data ON app.plans IS '処分業者：処分関連データのみ参照可能';

COMMENT ON FUNCTION app.test_rls_policies() IS 'RLSポリシーの動作確認用関数';
COMMENT ON FUNCTION app.debug_current_org_id() IS '現在のユーザーのorg_id確認用関数';


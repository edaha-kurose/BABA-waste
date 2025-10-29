-- ============================================================================
-- DDL: 収集業者テーブル追加
-- 番号: 001
-- 作成日: 2025-10-16
-- 目的: 収集業者の詳細情報を管理するテーブルを追加
-- 影響範囲: LOW (新規テーブル、既存データに影響なし)
-- ============================================================================

-- 目的:
-- - 収集業者の会社情報・連絡先情報を管理
-- - app.users との1:1関係を確立
-- - サービス提供エリアを配列で管理

-- 影響:
-- - 新規テーブルのため、既存機能への影響なし
-- - user_org_roles で role='collector' のユーザーと紐付け

-- ロールバック:
-- DROP TABLE IF EXISTS app.collectors CASCADE;

-- ============================================================================
-- collectors テーブル作成
-- ============================================================================

CREATE TABLE IF NOT EXISTS app.collectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  license_number VARCHAR(100),
  service_areas TEXT[], -- サービス提供エリア（都道府県・市区町村）
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT collectors_user_id_unique UNIQUE(user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_collectors_user_id ON app.collectors(user_id);
CREATE INDEX IF NOT EXISTS idx_collectors_is_active ON app.collectors(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_collectors_company_name ON app.collectors(company_name);

-- コメント
COMMENT ON TABLE app.collectors IS '収集業者情報テーブル';
COMMENT ON COLUMN app.collectors.id IS '収集業者ID';
COMMENT ON COLUMN app.collectors.user_id IS 'ユーザーID（app.users）';
COMMENT ON COLUMN app.collectors.company_name IS '会社名';
COMMENT ON COLUMN app.collectors.contact_person IS '担当者名';
COMMENT ON COLUMN app.collectors.phone IS '電話番号';
COMMENT ON COLUMN app.collectors.address IS '住所';
COMMENT ON COLUMN app.collectors.license_number IS '許可番号';
COMMENT ON COLUMN app.collectors.service_areas IS 'サービス提供エリア（配列）';
COMMENT ON COLUMN app.collectors.is_active IS 'アクティブフラグ';
COMMENT ON COLUMN app.collectors.deleted_at IS '論理削除日時';

-- RLS有効化
ALTER TABLE app.collectors ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自組織のデータのみ参照可能
CREATE POLICY collectors_select_policy ON app.collectors
  FOR SELECT
  USING (
    user_id IN (
      SELECT u.id 
      FROM app.users u
      INNER JOIN app.user_org_roles uor ON uor.user_id = u.id
      WHERE uor.org_id = (
        SELECT uor2.org_id 
        FROM app.users u2
        INNER JOIN app.user_org_roles uor2 ON uor2.user_id = u2.id
        WHERE u2.auth_user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- RLSポリシー: Admin/Emitterのみ挿入可能
CREATE POLICY collectors_insert_policy ON app.collectors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM app.users u
      INNER JOIN app.user_org_roles uor ON uor.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND uor.role IN ('admin', 'emitter')
    )
  );

-- RLSポリシー: Admin/Emitterのみ更新可能
CREATE POLICY collectors_update_policy ON app.collectors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM app.users u
      INNER JOIN app.user_org_roles uor ON uor.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND uor.role IN ('admin', 'emitter')
    )
  );

-- RLSポリシー: Adminのみ削除可能
CREATE POLICY collectors_delete_policy ON app.collectors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM app.users u
      INNER JOIN app.user_org_roles uor ON uor.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND uor.role = 'admin'
    )
  );

-- ============================================================================
-- 検証クエリ
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_index_count INT;
BEGIN
  -- テーブル存在確認
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'app' 
    AND table_name = 'collectors'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'app.collectors テーブルが作成されていません';
  END IF;
  
  -- インデックス数確認
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'app' 
  AND tablename = 'collectors';
  
  IF v_index_count < 3 THEN
    RAISE WARNING 'インデックスが不足しています: 期待3個、実際%個', v_index_count;
  END IF;
  
  RAISE NOTICE 'app.collectors テーブルが正常に作成されました';
END $$;








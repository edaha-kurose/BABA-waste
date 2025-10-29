-- ============================================================================
-- DDL: 001_create_collectors_table_step1.sql
-- 目的: collectors テーブルの作成のみ（外部キー制約追加は第2段階）
-- 作成日: 2025-10-16
-- ============================================================================
-- 
-- 【2段階アプローチ】
-- Step 1: collectors テーブル作成（このファイル）
-- Step 2: waste_type_masters に外部キー制約追加（別ファイル）
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 事前検証
-- ============================================================================

-- collectors テーブルが既に存在しないことを確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'collectors'
  ) THEN
    RAISE EXCEPTION 'collectors テーブルは既に存在します。';
  END IF;
END $$;

-- app.users テーブルが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'app.users テーブルが存在しません。';
  END IF;
END $$;

-- ============================================================================
-- collectors テーブル作成
-- ============================================================================

CREATE TABLE app.collectors (
  -- 主キー
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本情報
  user_id         UUID UNIQUE NOT NULL,
  company_name    VARCHAR(255) NOT NULL,
  contact_person  VARCHAR(255),
  phone           VARCHAR(50),
  address         TEXT,
  license_number  VARCHAR(100),
  service_areas   TEXT[] NOT NULL DEFAULT '{}',
  
  -- ステータス
  is_active       BOOLEAN NOT NULL DEFAULT true,
  
  -- 監査フィールド
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID,
  updated_by      UUID,
  deleted_at      TIMESTAMPTZ,
  
  -- 外部キー制約
  CONSTRAINT fk_collector_user
    FOREIGN KEY (user_id)
    REFERENCES app.users (id)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
);

-- テーブルコメント
COMMENT ON TABLE app.collectors IS '収集業者マスター';
COMMENT ON COLUMN app.collectors.id IS '収集業者ID（主キー）';
COMMENT ON COLUMN app.collectors.user_id IS 'ユーザーID（app.users.id）';
COMMENT ON COLUMN app.collectors.company_name IS '会社名';
COMMENT ON COLUMN app.collectors.license_number IS '許可番号';
COMMENT ON COLUMN app.collectors.service_areas IS '対応エリア（配列）';

-- ============================================================================
-- インデックス作成
-- ============================================================================

CREATE INDEX idx_collectors_user_id
  ON app.collectors (user_id);

CREATE INDEX idx_collectors_is_active
  ON app.collectors (is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_collectors_company_name
  ON app.collectors (company_name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_collectors_deleted_at
  ON app.collectors (deleted_at);

-- ============================================================================
-- 事後検証
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'collectors'
  ) THEN
    RAISE EXCEPTION 'collectors テーブルの作成に失敗しました。';
  END IF;
  RAISE NOTICE '✅ collectors テーブルが作成されました';
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Step 1 完了: collectors テーブル作成';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. 孤立レコードを修正';
  RAISE NOTICE '     → tsx scripts/fix-orphaned-records.ts';
  RAISE NOTICE '  2. Step 2 を実行（外部キー制約追加）';
  RAISE NOTICE '     → tsx scripts/run-migration.ts db/migrations/001_create_collectors_table_step2.sql';
  RAISE NOTICE '';
END $$;

COMMIT;








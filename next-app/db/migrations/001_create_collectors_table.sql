-- ============================================================================
-- DDL: 001_create_collectors_table.sql
-- 目的: collectors テーブルの作成 + waste_type_masters への外部キー制約追加
-- 作成日: 2025-10-16
-- リスクレベル: MEDIUM
-- ============================================================================
-- 
-- 【目的】
-- - collectors テーブルをデータベースに作成
-- - waste_type_masters.collector_id に外部キー制約を追加
-- - データ整合性を保証
--
-- 【影響範囲】
-- - collectors テーブル: 新規作成
-- - waste_type_masters テーブル: 外部キー制約追加
-- - 既存データへの影響: なし（waste_type_masters にデータが存在しない）
--
-- 【依存関係】
-- - app.users テーブルが存在すること
-- - app.waste_type_masters テーブルが存在すること
-- - app.jwnet_waste_codes テーブルが存在すること
--
-- 【ロールバック】
-- - 001_rollback_collectors_table.sql を参照
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: 事前検証
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
    RAISE EXCEPTION 'collectors テーブルは既に存在します。このマイグレーションは実行できません。';
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
    RAISE EXCEPTION 'app.users テーブルが存在しません。このマイグレーションは実行できません。';
  END IF;
END $$;

-- app.waste_type_masters テーブルが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'waste_type_masters'
  ) THEN
    RAISE EXCEPTION 'app.waste_type_masters テーブルが存在しません。このマイグレーションは実行できません。';
  END IF;
END $$;

-- ============================================================================
-- Step 2: collectors テーブル作成
-- ============================================================================

COMMENT ON SCHEMA app IS 'アプリケーション固有のデータを格納するスキーマ';

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
    ON DELETE CASCADE    -- ユーザー削除時、収集業者も削除
    ON UPDATE NO ACTION
);

-- テーブルコメント
COMMENT ON TABLE app.collectors IS '収集業者マスター';
COMMENT ON COLUMN app.collectors.id IS '収集業者ID（主キー）';
COMMENT ON COLUMN app.collectors.user_id IS 'ユーザーID（app.users.id）';
COMMENT ON COLUMN app.collectors.company_name IS '会社名';
COMMENT ON COLUMN app.collectors.contact_person IS '担当者名';
COMMENT ON COLUMN app.collectors.phone IS '電話番号';
COMMENT ON COLUMN app.collectors.address IS '住所';
COMMENT ON COLUMN app.collectors.license_number IS '許可番号';
COMMENT ON COLUMN app.collectors.service_areas IS '対応エリア（配列）';
COMMENT ON COLUMN app.collectors.is_active IS 'アクティブフラグ';
COMMENT ON COLUMN app.collectors.created_at IS '作成日時';
COMMENT ON COLUMN app.collectors.updated_at IS '更新日時';
COMMENT ON COLUMN app.collectors.created_by IS '作成者ID';
COMMENT ON COLUMN app.collectors.updated_by IS '更新者ID';
COMMENT ON COLUMN app.collectors.deleted_at IS '削除日時（論理削除）';

-- ============================================================================
-- Step 3: インデックス作成
-- ============================================================================

-- user_id のインデックス（外部キー、UNIQUE制約により自動作成されるが明示的に命名）
CREATE INDEX IF NOT EXISTS idx_collectors_user_id
  ON app.collectors (user_id);

-- is_active のインデックス（アクティブな収集業者の検索用）
CREATE INDEX IF NOT EXISTS idx_collectors_is_active
  ON app.collectors (is_active)
  WHERE deleted_at IS NULL;

-- company_name のインデックス（会社名検索用）
CREATE INDEX IF NOT EXISTS idx_collectors_company_name
  ON app.collectors (company_name)
  WHERE deleted_at IS NULL;

-- deleted_at のインデックス（論理削除済みレコード除外用）
CREATE INDEX IF NOT EXISTS idx_collectors_deleted_at
  ON app.collectors (deleted_at);

-- ============================================================================
-- Step 4: waste_type_masters に外部キー制約追加
-- ============================================================================

-- 既存の外部キー制約が存在しないことを確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'app'
      AND table_name = 'waste_type_masters'
      AND constraint_name = 'fk_waste_type_collector'
  ) THEN
    RAISE EXCEPTION 'fk_waste_type_collector 制約は既に存在します。';
  END IF;
END $$;

-- 孤立レコードの確認（本来は存在しないはずだが安全のため確認）
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO orphaned_count
  FROM app.waste_type_masters w
  WHERE w.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM app.collectors c
      WHERE c.id = w.collector_id
    );
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION '孤立レコードが % 件見つかりました。外部キー制約を追加する前にデータを修正してください。', orphaned_count;
  END IF;
  
  RAISE NOTICE '孤立レコードなし: 外部キー制約を追加します';
END $$;

-- 外部キー制約追加
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE    -- collector 削除時、関連する waste_type_masters も削除
  ON UPDATE NO ACTION;

-- collector_id のインデックス作成（外部キーのパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_waste_type_masters_collector_id
  ON app.waste_type_masters (collector_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- Step 5: 事後検証
-- ============================================================================

-- collectors テーブルが作成されたことを確認
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

-- 外部キー制約が追加されたことを確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'app'
      AND table_name = 'waste_type_masters'
      AND constraint_name = 'fk_waste_type_collector'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE EXCEPTION 'fk_waste_type_collector 制約の追加に失敗しました。';
  END IF;
  RAISE NOTICE '✅ 外部キー制約 fk_waste_type_collector が追加されました';
END $$;

-- インデックスが作成されたことを確認
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'app'
    AND tablename = 'collectors'
    AND indexname IN (
      'collectors_pkey',
      'idx_collectors_user_id',
      'idx_collectors_is_active',
      'idx_collectors_company_name',
      'idx_collectors_deleted_at'
    );
  
  IF idx_count < 4 THEN
    RAISE WARNING 'インデックスが不足しています: 期待4件以上、実際%件', idx_count;
  ELSE
    RAISE NOTICE '✅ インデックスが作成されました: %件', idx_count;
  END IF;
END $$;

-- ============================================================================
-- Step 6: 完了メッセージ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ マイグレーション完了: 001_create_collectors_table.sql';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '変更内容:';
  RAISE NOTICE '  1. app.collectors テーブルを作成しました';
  RAISE NOTICE '  2. app.waste_type_masters.collector_id に外部キー制約を追加しました';
  RAISE NOTICE '  3. 必要なインデックスを作成しました';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. schema.prisma にリレーション定義を追加';
  RAISE NOTICE '  2. pnpm prisma:generate を実行';
  RAISE NOTICE '  3. シードスクリプトを更新';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- ロールバック用SQL
-- ============================================================================
-- 
-- ロールバックが必要な場合は、以下のSQLを実行してください:
-- 001_rollback_collectors_table.sql を参照
-- 
-- ============================================================================








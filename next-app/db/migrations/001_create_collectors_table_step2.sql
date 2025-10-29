-- ============================================================================
-- DDL: 001_create_collectors_table_step2.sql
-- 目的: waste_type_masters.collector_id に外部キー制約を追加
-- 作成日: 2025-10-16
-- 前提: 001_create_collectors_table_step1.sql が実行済み
-- ============================================================================
-- 
-- 【2段階アプローチ】
-- Step 1: collectors テーブル作成（前ファイル）
-- Step 2: waste_type_masters に外部キー制約追加（このファイル）
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 事前検証
-- ============================================================================

-- collectors テーブルが存在することを確認
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'collectors'
  ) THEN
    RAISE EXCEPTION 'collectors テーブルが存在しません。Step 1 を先に実行してください。';
  END IF;
END $$;

-- 外部キー制約が既に存在しないことを確認
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

-- ============================================================================
-- 孤立レコードの確認
-- ============================================================================

DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO orphaned_count
  FROM app.waste_type_masters w
  LEFT JOIN app.collectors c ON w.collector_id = c.id
  WHERE c.id IS NULL
    AND w.deleted_at IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION '孤立レコードが % 件見つかりました。外部キー制約を追加する前にデータを修正してください。', orphaned_count;
  END IF;
  
  RAISE NOTICE '✅ 孤立レコードなし: 外部キー制約を追加します';
END $$;

-- ============================================================================
-- 外部キー制約追加
-- ============================================================================

ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- ============================================================================
-- インデックス作成（パフォーマンス向上）
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_waste_type_masters_collector_id
  ON app.waste_type_masters (collector_id)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- 事後検証
-- ============================================================================

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
  RAISE NOTICE '✅ 外部キー制約が正しく追加されたことを確認';
END $$;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Step 2 完了: 外部キー制約追加';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '変更内容:';
  RAISE NOTICE '  - waste_type_masters.collector_id に外部キー制約を追加';
  RAISE NOTICE '  - インデックスを作成';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. pnpm prisma:generate を実行';
  RAISE NOTICE '  2. テストデータ作成';
  RAISE NOTICE '  3. E2Eテスト実行';
  RAISE NOTICE '';
END $$;

COMMIT;


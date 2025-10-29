-- ============================================================================
-- ROLLBACK DDL: 001_rollback_collectors_table.sql
-- 目的: 001_create_collectors_table.sql のロールバック
-- 作成日: 2025-10-16
-- ============================================================================
-- 
-- 【目的】
-- - collectors テーブルを削除
-- - waste_type_masters.collector_id の外部キー制約を削除
-- - マイグレーション前の状態に戻す
--
-- 【注意事項】
-- - このスクリプトを実行すると、collectors テーブルのデータが全て削除されます
-- - waste_type_masters テーブルのデータは削除されませんが、collector_id の整合性チェックが無効化されます
--
-- 【事前確認】
-- - collectors テーブルにデータが存在する場合、バックアップを取得してください
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: 事前確認
-- ============================================================================

-- collectors テーブルのデータ件数を確認
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO row_count
  FROM app.collectors
  WHERE deleted_at IS NULL;
  
  IF row_count > 0 THEN
    RAISE WARNING 'collectors テーブルに % 件のアクティブなデータが存在します', row_count;
    RAISE WARNING 'ロールバックを実行すると、これらのデータは削除されます';
  ELSE
    RAISE NOTICE 'collectors テーブルにアクティブなデータはありません';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'collectors テーブルは存在しません（既にロールバック済み）';
END $$;

-- ============================================================================
-- Step 2: 外部キー制約削除
-- ============================================================================

-- waste_type_masters.collector_id の外部キー制約を削除
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'app'
      AND table_name = 'waste_type_masters'
      AND constraint_name = 'fk_waste_type_collector'
  ) THEN
    ALTER TABLE app.waste_type_masters
    DROP CONSTRAINT fk_waste_type_collector;
    RAISE NOTICE '✅ 外部キー制約 fk_waste_type_collector を削除しました';
  ELSE
    RAISE NOTICE 'ℹ️  外部キー制約 fk_waste_type_collector は存在しません';
  END IF;
END $$;

-- インデックス削除
DROP INDEX IF EXISTS app.idx_waste_type_masters_collector_id;
RAISE NOTICE '✅ インデックス idx_waste_type_masters_collector_id を削除しました';

-- ============================================================================
-- Step 3: collectors テーブル削除
-- ============================================================================

-- collectors テーブルを削除（CASCADE で関連インデックスも削除）
DROP TABLE IF EXISTS app.collectors CASCADE;
RAISE NOTICE '✅ collectors テーブルを削除しました';

-- ============================================================================
-- Step 4: 事後検証
-- ============================================================================

-- collectors テーブルが削除されたことを確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'collectors'
  ) THEN
    RAISE EXCEPTION 'collectors テーブルの削除に失敗しました。';
  END IF;
  RAISE NOTICE '✅ collectors テーブルが削除されたことを確認';
END $$;

-- 外部キー制約が削除されたことを確認
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'app'
      AND table_name = 'waste_type_masters'
      AND constraint_name = 'fk_waste_type_collector'
  ) THEN
    RAISE EXCEPTION 'fk_waste_type_collector 制約の削除に失敗しました。';
  END IF;
  RAISE NOTICE '✅ 外部キー制約が削除されたことを確認';
END $$;

-- ============================================================================
-- Step 5: 完了メッセージ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ ロールバック完了: 001_rollback_collectors_table.sql';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '変更内容:';
  RAISE NOTICE '  1. app.waste_type_masters.collector_id の外部キー制約を削除しました';
  RAISE NOTICE '  2. app.collectors テーブルを削除しました';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '  1. schema.prisma のリレーション定義を削除（必要に応じて）';
  RAISE NOTICE '  2. pnpm prisma:generate を実行';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- ロールバック完了
-- ============================================================================








-- ============================================================================
-- DDL 028: Billing関連の外部キー制約追加
-- ============================================================================
-- 目的: データ整合性保証のため、billing_items と billing_summaries に
--       外部キー制約を追加
-- 
-- 影響度: MEDIUM
-- - billing_items: 既存データへの影響確認必須
-- - billing_summaries: 既存データへの影響確認必須
--
-- ロールバック: 本ファイル末尾の ROLLBACK セクション参照
-- ============================================================================

-- ============================================================================
-- 1. 既存データ整合性チェック + 外部キー制約追加
-- ============================================================================
DO $$
DECLARE
  v_orphaned_count INTEGER;
  v_fk_count INTEGER;
BEGIN
  -- 1.1. 孤立したbilling_items（存在しないcollector_idを参照）
  SELECT COUNT(*) INTO v_orphaned_count
  FROM app.billing_items bi
  WHERE NOT EXISTS (
    SELECT 1 FROM app.collectors c WHERE c.id = bi.collector_id
  );
  
  IF v_orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  Warning: % billing_items records reference non-existent collectors', v_orphaned_count;
  ELSE
    RAISE NOTICE '✅ billing_items.collector_id: No orphaned records';
  END IF;

  -- 1.2. 孤立したbilling_items（存在しないorg_idを参照）
  SELECT COUNT(*) INTO v_orphaned_count
  FROM app.billing_items bi
  WHERE NOT EXISTS (
    SELECT 1 FROM app.organizations o WHERE o.id = bi.org_id
  );
  
  IF v_orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  Warning: % billing_items records reference non-existent organizations', v_orphaned_count;
  ELSE
    RAISE NOTICE '✅ billing_items.org_id: No orphaned records';
  END IF;

  -- 1.3. 孤立したbilling_summaries（存在しないcollector_idを参照）
  SELECT COUNT(*) INTO v_orphaned_count
  FROM app.billing_summaries bs
  WHERE NOT EXISTS (
    SELECT 1 FROM app.collectors c WHERE c.id = bs.collector_id
  );
  
  IF v_orphaned_count > 0 THEN
    RAISE NOTICE '⚠️  Warning: % billing_summaries records reference non-existent collectors', v_orphaned_count;
  ELSE
    RAISE NOTICE '✅ billing_summaries.collector_id: No orphaned records';
  END IF;

  RAISE NOTICE '📝 Adding foreign key constraints...';
END $$;

-- ============================================================================
-- 2. 外部キー制約追加: billing_items
-- ============================================================================

-- 2.1. org_id → organizations
ALTER TABLE app.billing_items
ADD CONSTRAINT IF NOT EXISTS fk_billing_items_org
  FOREIGN KEY (org_id)
  REFERENCES app.organizations (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- 2.2. collector_id → collectors
ALTER TABLE app.billing_items
ADD CONSTRAINT IF NOT EXISTS fk_billing_items_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- 2.3. store_id → stores (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT IF NOT EXISTS fk_billing_items_store
  FOREIGN KEY (store_id)
  REFERENCES app.stores (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- 2.4. collection_id → collections (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT IF NOT EXISTS fk_billing_items_collection
  FOREIGN KEY (collection_id)
  REFERENCES app.collections (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- 2.5. waste_type_id → waste_type_masters (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT IF NOT EXISTS fk_billing_items_waste_type
  FOREIGN KEY (waste_type_id)
  REFERENCES app.waste_type_masters (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- ============================================================================
-- 3. 外部キー制約追加: billing_summaries
-- ============================================================================

-- 3.1. org_id → organizations
ALTER TABLE app.billing_summaries
ADD CONSTRAINT IF NOT EXISTS fk_billing_summary_org
  FOREIGN KEY (org_id)
  REFERENCES app.organizations (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- 3.2. collector_id → collectors
ALTER TABLE app.billing_summaries
ADD CONSTRAINT IF NOT EXISTS fk_billing_summary_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- ============================================================================
-- 4. 検証
-- ============================================================================
DO $$
DECLARE
  v_fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'app'
    AND table_name IN ('billing_items', 'billing_summaries')
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE 'fk_billing%';
  
  RAISE NOTICE '📊 Total foreign keys added: %', v_fk_count;
  
  IF v_fk_count < 7 THEN
    RAISE WARNING 'Expected 7 foreign keys, but found %', v_fk_count;
  ELSE
    RAISE NOTICE '✅ All foreign keys successfully added';
  END IF;
END $$;

-- ============================================================================
-- ROLLBACK（問題発生時）
-- ============================================================================
/*
BEGIN;

-- billing_items の外部キー制約削除
ALTER TABLE app.billing_items DROP CONSTRAINT IF EXISTS fk_billing_items_org;
ALTER TABLE app.billing_items DROP CONSTRAINT IF EXISTS fk_billing_items_collector;
ALTER TABLE app.billing_items DROP CONSTRAINT IF EXISTS fk_billing_items_store;
ALTER TABLE app.billing_items DROP CONSTRAINT IF EXISTS fk_billing_items_collection;
ALTER TABLE app.billing_items DROP CONSTRAINT IF EXISTS fk_billing_items_waste_type;

-- billing_summaries の外部キー制約削除
ALTER TABLE app.billing_summaries DROP CONSTRAINT IF EXISTS fk_billing_summary_org;
ALTER TABLE app.billing_summaries DROP CONSTRAINT IF EXISTS fk_billing_summary_collector;

COMMIT;
*/


-- ============================================================================
-- テストデータクリーンアップ
-- 目的: 全テストデータの削除（リセット用）
-- 警告: 本番環境では実行しないこと
-- ============================================================================

-- 実行前確認
DO $$
BEGIN
  -- 本番環境チェック（環境変数で判定）
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION '❌ 本番環境でのクリーンアップは禁止されています';
  END IF;
  
  RAISE NOTICE '⚠️ テストデータクリーンアップを開始します...';
END $$;

-- RLS OFF（全テーブル）
ALTER TABLE app.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_org_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.item_maps DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.actuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.registrations DISABLE ROW LEVEL SECURITY;

BEGIN;

-- 外部キー順序に従って削除（子→親の順）
-- 1. 登録・実績データ
DELETE FROM app.registrations WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);
DELETE FROM app.actuals WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);
DELETE FROM app.reservations WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 2. 予定データ
DELETE FROM app.plans WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 3. 品目マッピング
DELETE FROM app.item_maps WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 4. 店舗データ
DELETE FROM app.stores WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 5. ユーザー組織ロール
DELETE FROM app.user_org_roles WHERE org_id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 6. 組織（最後）
DELETE FROM app.organizations WHERE id IN (
  'org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid
);

-- 削除結果確認
DO $$
DECLARE 
  v_orgs INT;
  v_stores INT;
  v_items INT;
BEGIN
  SELECT COUNT(*) INTO v_orgs FROM app.organizations 
  WHERE id IN ('org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid);
  
  SELECT COUNT(*) INTO v_stores FROM app.stores 
  WHERE org_id IN ('org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid);
  
  SELECT COUNT(*) INTO v_items FROM app.item_maps 
  WHERE org_id IN ('org-test-001'::uuid, 'org-test-002'::uuid, 'org-test-003'::uuid);
  
  IF v_orgs > 0 OR v_stores > 0 OR v_items > 0 THEN
    RAISE WARNING '⚠️ 一部のデータが削除できませんでした (orgs:%, stores:%, items:%)', v_orgs, v_stores, v_items;
  ELSE
    RAISE NOTICE '✅ テストデータが完全にクリーンアップされました';
  END IF;
END $$;

COMMIT;

-- RLS ON（必ず戻す）
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.item_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.registrations ENABLE ROW LEVEL SECURITY;

SELECT '✅ 999_cleanup.sql completed' AS status;


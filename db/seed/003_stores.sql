-- ============================================================================
-- 店舗（排出事業場）テストデータ
-- 目的: 開発・テスト用の店舗マスタデータ
-- ============================================================================

-- RLS OFF
ALTER TABLE app.stores DISABLE ROW LEVEL SECURITY;

BEGIN;

-- 既存テストデータクリア
DELETE FROM app.stores 
WHERE id IN (
  'store-test-001'::uuid,
  'store-test-002'::uuid,
  'store-test-003'::uuid,
  'store-test-004'::uuid,
  'store-test-005'::uuid
);

-- 店舗テストデータ挿入
INSERT INTO app.stores (
  id, org_id, store_code, name, address, area, emitter_no, 
  created_at, updated_at, created_by, updated_by
)
VALUES
  (
    'store-test-001'::uuid,
    'org-test-001'::uuid,
    'S001',
    '東京本店',
    '東京都千代田区丸の内1-1-1',
    '関東',
    'E001',
    NOW(),
    NOW(),
    'user-test-admin-001'::uuid,
    'user-test-admin-001'::uuid
  ),
  (
    'store-test-002'::uuid,
    'org-test-001'::uuid,
    'S002',
    '大阪支店',
    '大阪府大阪市北区梅田1-1-1',
    '関西',
    'E002',
    NOW(),
    NOW(),
    'user-test-admin-001'::uuid,
    'user-test-admin-001'::uuid
  ),
  (
    'store-test-003'::uuid,
    'org-test-001'::uuid,
    'S003',
    '名古屋支店',
    '愛知県名古屋市中村区名駅1-1-1',
    '中部',
    'E003',
    NOW(),
    NOW(),
    'user-test-admin-001'::uuid,
    'user-test-admin-001'::uuid
  ),
  (
    'store-test-004'::uuid,
    'org-test-001'::uuid,
    'S004',
    '福岡支店',
    '福岡県福岡市博多区博多駅前1-1-1',
    '九州',
    'E004',
    NOW(),
    NOW(),
    'user-test-admin-001'::uuid,
    'user-test-admin-001'::uuid
  ),
  (
    'store-test-005'::uuid,
    'org-test-001'::uuid,
    'S005',
    '札幌支店',
    '北海道札幌市中央区北1条西1-1',
    '北海道',
    'E005',
    NOW(),
    NOW(),
    'user-test-admin-001'::uuid,
    'user-test-admin-001'::uuid
  )
ON CONFLICT (org_id, store_code) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  area = EXCLUDED.area,
  updated_at = EXCLUDED.updated_at;

-- 事後検証
DO $$
DECLARE 
  v_count INT;
  v_dup INT;
BEGIN
  -- 件数チェック
  SELECT COUNT(*) INTO v_count FROM app.stores WHERE org_id = 'org-test-001'::uuid;
  IF v_count < 5 THEN
    RAISE EXCEPTION 'Stores validation failed: expected >= 5, got %', v_count;
  END IF;
  
  -- 重複チェック（org_id + store_code）
  SELECT COUNT(*) INTO v_dup
  FROM (
    SELECT org_id, store_code FROM app.stores 
    GROUP BY org_id, store_code 
    HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'Stores duplicate detected: %', v_dup;
  END IF;
  
  RAISE NOTICE '✅ Stores validated: % records, no duplicates', v_count;
END $$;

COMMIT;

-- RLS ON
ALTER TABLE app.stores ENABLE ROW LEVEL SECURITY;

SELECT '✅ 003_stores.sql completed' AS status;


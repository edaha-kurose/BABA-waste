-- ============================================================================
-- 品目マッピングテストデータ
-- 目的: 自社品目ラベル ⇄ JWNETコードのマッピング
-- ============================================================================

-- RLS OFF
ALTER TABLE app.item_maps DISABLE ROW LEVEL SECURITY;

BEGIN;

-- 既存テストデータクリア
DELETE FROM app.item_maps 
WHERE org_id = 'org-test-001'::uuid;

-- 品目マッピングテストデータ挿入
INSERT INTO app.item_maps (
  id, org_id, item_label, jwnet_code, hazard, default_unit, 
  density_t_per_m3, disposal_method_code, notes, 
  created_at, updated_at
)
VALUES
  (
    'item-map-test-001'::uuid,
    'org-test-001'::uuid,
    '廃プラスチック類',
    '0702',
    false,
    'T'::unit,
    0.5,
    'D14',
    '軟質プラスチック廃材',
    NOW(),
    NOW()
  ),
  (
    'item-map-test-002'::uuid,
    'org-test-001'::uuid,
    '金属くず',
    '0802',
    false,
    'T'::unit,
    7.8,
    'D14',
    '鉄・アルミ等の金属くず',
    NOW(),
    NOW()
  ),
  (
    'item-map-test-003'::uuid,
    'org-test-001'::uuid,
    'ガラスくず',
    '0902',
    false,
    'T'::unit,
    2.5,
    'D14',
    'ガラス・陶磁器くず',
    NOW(),
    NOW()
  ),
  (
    'item-map-test-004'::uuid,
    'org-test-001'::uuid,
    '木くず',
    '0504',
    false,
    'M3'::unit,
    0.4,
    'D05',
    '建築廃材等の木くず',
    NOW(),
    NOW()
  ),
  (
    'item-map-test-005'::uuid,
    'org-test-001'::uuid,
    '紙くず',
    '0303',
    false,
    'T'::unit,
    0.3,
    'D01',
    '段ボール・事務用紙等',
    NOW(),
    NOW()
  )
ON CONFLICT (org_id, item_label) DO UPDATE SET
  jwnet_code = EXCLUDED.jwnet_code,
  hazard = EXCLUDED.hazard,
  default_unit = EXCLUDED.default_unit,
  density_t_per_m3 = EXCLUDED.density_t_per_m3,
  updated_at = EXCLUDED.updated_at;

-- 事後検証
DO $$
DECLARE v_count INT; v_dup INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app.item_maps WHERE org_id = 'org-test-001'::uuid;
  IF v_count < 5 THEN
    RAISE EXCEPTION 'Item maps validation failed: expected >= 5, got %', v_count;
  END IF;
  
  -- 重複チェック
  SELECT COUNT(*) INTO v_dup
  FROM (
    SELECT org_id, item_label FROM app.item_maps 
    GROUP BY org_id, item_label 
    HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'Item maps duplicate detected: %', v_dup;
  END IF;
  
  RAISE NOTICE '✅ Item maps validated: % records', v_count;
END $$;

COMMIT;

-- RLS ON
ALTER TABLE app.item_maps ENABLE ROW LEVEL SECURITY;

SELECT '✅ 004_item_maps.sql completed' AS status;


-- ============================================================================
-- 1年分の完全テストデータ作成スクリプト
-- 目的: 廃棄依頼→請求までの完全フロー（2024年1月～12月）
-- 作成日: 2025-10-16
-- ============================================================================

-- RLS無効化（テストデータ作成のため）
ALTER TABLE app.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.item_maps DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.actuals DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.billing_summaries DISABLE ROW LEVEL SECURITY;

-- 既存のテストデータをクリーン(論理削除)
UPDATE app.plans 
SET deleted_at = NOW() 
WHERE org_id = '00000000-0000-0000-0000-000000000001';

UPDATE app.stores 
SET deleted_at = NOW() 
WHERE org_id = '00000000-0000-0000-0000-000000000001';

UPDATE app.item_maps 
SET deleted_at = NOW() 
WHERE org_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- 1. 組織データ（既存を使用）
-- ============================================================================
-- 00000000-0000-0000-0000-000000000001 はすでに存在している想定

-- ============================================================================
-- 2. 店舗データ作成（10店舗）
-- ============================================================================
INSERT INTO app.stores (
  id, org_id, store_code, name, area, emitter_no,
  address, phone, business_hours, is_active,
  created_at, updated_at, created_by, updated_by
) VALUES
  ('store-001', '00000000-0000-0000-0000-000000000001', 'ST001', '本店', '東京', 'EMIT-001', '東京都渋谷区', '03-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-002', '00000000-0000-0000-0000-000000000001', 'ST002', '支店A', '東京', 'EMIT-002', '東京都新宿区', '03-2222-2222', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-003', '00000000-0000-0000-0000-000000000001', 'ST003', '支店B', '東京', 'EMIT-003', '東京都品川区', '03-3333-3333', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-004', '00000000-0000-0000-0000-000000000001', 'ST004', '支店C', '大阪', 'EMIT-004', '大阪府大阪市', '06-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-005', '00000000-0000-0000-0000-000000000001', 'ST005', '支店D', '大阪', 'EMIT-005', '大阪府堺市', '06-2222-2222', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-006', '00000000-0000-0000-0000-000000000001', 'ST006', '支店E', '名古屋', 'EMIT-006', '愛知県名古屋市', '052-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-007', '00000000-0000-0000-0000-000000000001', 'ST007', '支店F', '福岡', 'EMIT-007', '福岡県福岡市', '092-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-008', '00000000-0000-0000-0000-000000000001', 'ST008', '支店G', '札幌', 'EMIT-008', '北海道札幌市', '011-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-009', '00000000-0000-0000-0000-000000000001', 'ST009', '支店H', '仙台', 'EMIT-009', '宮城県仙台市', '022-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL),
  ('store-010', '00000000-0000-0000-0000-000000000001', 'ST010', '支店I', '広島', 'EMIT-010', '広島県広島市', '082-1111-1111', '9:00-18:00', TRUE, NOW(), NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. 品目マップデータ作成（5種類）
-- ============================================================================
INSERT INTO app.item_maps (
  id, org_id, item_label, jwnet_code, hazard, default_unit, density_t_per_m3,
  disposal_method_code, notes, created_at, updated_at, created_by, updated_by
) VALUES
  ('item-001', '00000000-0000-0000-0000-000000000001', '混合廃棄物', 'W0101', FALSE, 'T', 0.5, 'D13', '一般的な混合廃棄物', NOW(), NOW(), NULL, NULL),
  ('item-002', '00000000-0000-0000-0000-000000000001', '廃プラスチック類', 'W0301', FALSE, 'T', 0.3, 'D13', 'プラスチック類', NOW(), NOW(), NULL, NULL),
  ('item-003', '00000000-0000-0000-0000-000000000001', '蛍光灯', 'W0202', TRUE, 'KG', 1.0, 'D02', '水銀含有廃棄物', NOW(), NOW(), NULL, NULL),
  ('item-004', '00000000-0000-0000-0000-000000000001', '木くず', 'W0402', FALSE, 'M3', 0.4, 'D08', '建設系木材', NOW(), NOW(), NULL, NULL),
  ('item-005', '00000000-0000-0000-0000-000000000001', '金属くず', 'W0901', FALSE, 'T', 2.0, 'D14', '金属スクラップ', NOW(), NOW(), NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. 収集予定データ作成（12ヶ月×10店舗×2回/月 = 240件）
-- ============================================================================
DO $$
DECLARE
  v_month INT;
  v_store_id TEXT;
  v_item_id TEXT;
  v_plan_date DATE;
  v_quantity NUMERIC;
  v_store_ids TEXT[] := ARRAY['store-001', 'store-002', 'store-003', 'store-004', 'store-005', 'store-006', 'store-007', 'store-008', 'store-009', 'store-010'];
  v_item_ids TEXT[] := ARRAY['item-001', 'item-002', 'item-003', 'item-004', 'item-005'];
BEGIN
  -- 2024年1月～12月まで
  FOR v_month IN 1..12 LOOP
    -- 各店舗
    FOREACH v_store_id IN ARRAY v_store_ids LOOP
      -- 月に2回（上旬と下旬）
      FOR i IN 1..2 LOOP
        -- ランダムな品目を選択
        v_item_id := v_item_ids[1 + FLOOR(RANDOM() * 5)::INT];
        
        -- 日付設定（上旬:10日、下旬:25日）
        v_plan_date := ('2024-' || LPAD(v_month::TEXT, 2, '0') || '-' || CASE WHEN i = 1 THEN '10' ELSE '25' END)::DATE;
        
        -- 数量（1.0～5.0トンのランダム）
        v_quantity := 1.0 + (RANDOM() * 4.0);
        
        -- Plans挿入
        INSERT INTO app.plans (
          id, org_id, store_id, planned_date, item_map_id, planned_qty, unit,
          earliest_pickup_date, route_id, split_group,
          created_at, updated_at, created_by, updated_by
        ) VALUES (
          'plan-' || v_month || '-' || v_store_id || '-' || i,
          '00000000-0000-0000-0000-000000000001',
          v_store_id,
          v_plan_date,
          v_item_id,
          v_quantity,
          'T',
          v_plan_date + INTERVAL '3 days',
          'ROUTE-' || v_month,
          NULL,
          NOW(),
          NOW(),
          NULL,
          NULL
        ) ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 5. 予約データ作成（全Plansに対して）
-- ============================================================================
INSERT INTO app.reservations (
  id, org_id, plan_id, jwnet_temp_id, payload_hash, status, last_sent_at,
  error_code, created_at, updated_at, created_by, updated_by
)
SELECT
  'reservation-' || p.id,
  p.org_id,
  p.id,
  'TEMP-' || p.id,
  'hash-' || p.id,
  CASE WHEN RANDOM() > 0.1 THEN 'RESERVED' ELSE 'PENDING' END::app.reg_status,
  CASE WHEN RANDOM() > 0.1 THEN p.created_at + INTERVAL '1 hour' ELSE NULL END,
  NULL,
  p.created_at,
  p.updated_at,
  NULL,
  NULL
FROM app.plans p
WHERE p.org_id = '00000000-0000-0000-0000-000000000001'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. 登録データ作成（予約済みPlansに対して）
-- ============================================================================
INSERT INTO app.registrations (
  id, org_id, plan_id, manifest_no, status, error_code, last_sent_at,
  created_at, updated_at, created_by, updated_by
)
SELECT
  'registration-' || p.id,
  p.org_id,
  p.id,
  'MF-2024-' || LPAD(EXTRACT(MONTH FROM p.planned_date)::TEXT, 2, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY EXTRACT(MONTH FROM p.planned_date) ORDER BY p.planned_date))::TEXT, 5, '0'),
  CASE WHEN RANDOM() > 0.05 THEN 'REGISTERED' ELSE 'PENDING' END::app.reg_status,
  NULL,
  p.created_at + INTERVAL '2 hours',
  p.created_at + INTERVAL '1 hour',
  p.updated_at,
  NULL,
  NULL
FROM app.plans p
INNER JOIN app.reservations r ON r.plan_id = p.id AND r.status = 'RESERVED'
WHERE p.org_id = '00000000-0000-0000-0000-000000000001'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. 実績データ作成（登録済みPlansに対して）
-- ============================================================================
INSERT INTO app.actuals (
  id, org_id, plan_id, actual_qty, unit, vehicle_no, driver_name,
  weighing_ticket_no, photo_urls, confirmed_at,
  created_at, updated_at, created_by, updated_by
)
SELECT
  'actual-' || p.id,
  p.org_id,
  p.id,
  p.planned_qty * (0.9 + RANDOM() * 0.2), -- 実績は計画の90～110%
  p.unit,
  'VEH-' || LPAD((RANDOM() * 9999)::INT::TEXT, 4, '0'),
  CASE 
    WHEN RANDOM() > 0.5 THEN '田中太郎'
    WHEN RANDOM() > 0.5 THEN '佐藤花子'
    ELSE '鈴木一郎'
  END,
  'WT-' || LPAD((RANDOM() * 99999)::INT::TEXT, 5, '0'),
  ARRAY[]::TEXT[],
  p.planned_date + INTERVAL '1 day',
  p.created_at + INTERVAL '1 day',
  p.updated_at + INTERVAL '1 day',
  NULL,
  NULL
FROM app.plans p
INNER JOIN app.registrations r ON r.plan_id = p.id AND r.status = 'REGISTERED'
WHERE p.org_id = '00000000-0000-0000-0000-000000000001'
  AND p.deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. 請求サマリーデータ作成（月次集計）
-- ============================================================================
INSERT INTO app.billing_summaries (
  id, org_id, billing_month, total_quantity, total_amount, total_transport_cost,
  total_disposal_cost, tax_amount, status,
  created_at, updated_at, created_by, updated_by
)
SELECT
  'billing-' || v.year_month,
  '00000000-0000-0000-0000-000000000001',
  (v.year_month || '-01')::DATE,
  v.total_qty,
  v.total_amount,
  v.transport_cost,
  v.disposal_cost,
  v.tax,
  'APPROVED',
  NOW(),
  NOW(),
  NULL,
  NULL
FROM (
  SELECT
    TO_CHAR(p.planned_date, 'YYYY-MM') AS year_month,
    SUM(a.actual_qty) AS total_qty,
    SUM(a.actual_qty * 10000) AS transport_cost,  -- 運搬費: 10,000円/トン
    SUM(a.actual_qty * 15000) AS disposal_cost,   -- 処分費: 15,000円/トン
    ROUND(SUM(a.actual_qty * 25000) * 0.10) AS tax,  -- 消費税10%
    ROUND(SUM(a.actual_qty * 25000) * 1.10) AS total_amount  -- 合計（税込）
  FROM app.plans p
  INNER JOIN app.actuals a ON a.plan_id = p.id
  WHERE p.org_id = '00000000-0000-0000-0000-000000000001'
    AND p.deleted_at IS NULL
  GROUP BY TO_CHAR(p.planned_date, 'YYYY-MM')
) v
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. 検証クエリ
-- ============================================================================
DO $$
DECLARE
  v_plans_count INT;
  v_reservations_count INT;
  v_registrations_count INT;
  v_actuals_count INT;
  v_billing_count INT;
BEGIN
  SELECT COUNT(*) INTO v_plans_count 
  FROM app.plans 
  WHERE org_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_reservations_count 
  FROM app.reservations 
  WHERE org_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_registrations_count 
  FROM app.registrations 
  WHERE org_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_actuals_count 
  FROM app.actuals 
  WHERE org_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_billing_count 
  FROM app.billing_summaries 
  WHERE org_id = '00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;

  RAISE NOTICE '✅ テストデータ作成完了:';
  RAISE NOTICE '  - Plans: % 件', v_plans_count;
  RAISE NOTICE '  - Reservations: % 件', v_reservations_count;
  RAISE NOTICE '  - Registrations: % 件', v_registrations_count;
  RAISE NOTICE '  - Actuals: % 件', v_actuals_count;
  RAISE NOTICE '  - Billing Summaries: % 件', v_billing_count;

  -- 異常チェック
  IF v_plans_count < 200 THEN
    RAISE EXCEPTION 'Plans件数が少なすぎます: %', v_plans_count;
  END IF;
  
  IF v_billing_count != 12 THEN
    RAISE EXCEPTION 'Billing Summaries件数が12ヶ月分ではありません: %', v_billing_count;
  END IF;
END $$;

-- RLS有効化
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.item_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.billing_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 完了
-- ============================================================================
RAISE NOTICE '🎉 1年分の完全テストデータ作成が完了しました！';
RAISE NOTICE '📊 2024年1月～12月の請求データが利用可能です。';








-- ============================================================================
-- データ検証クエリ
-- 作成日: 2025-09-16
-- 目的: データ整合性の検証とKPI算出
-- ============================================================================

-- ============================================================================
-- 基本統計
-- ============================================================================

-- 組織別データ件数
CREATE OR REPLACE VIEW app.v_org_data_counts AS
SELECT 
  o.id AS org_id,
  o.name AS org_name,
  (SELECT COUNT(*) FROM app.stores s WHERE s.org_id = o.id) AS store_count,
  (SELECT COUNT(*) FROM app.item_maps im WHERE im.org_id = o.id) AS item_map_count,
  (SELECT COUNT(*) FROM app.plans p WHERE p.org_id = o.id) AS plan_count,
  (SELECT COUNT(*) FROM app.reservations r WHERE r.org_id = o.id) AS reservation_count,
  (SELECT COUNT(*) FROM app.actuals a WHERE a.org_id = o.id) AS actual_count,
  (SELECT COUNT(*) FROM app.registrations reg WHERE reg.org_id = o.id) AS registration_count
FROM app.organizations o
ORDER BY o.name;

-- 月別予定件数
CREATE OR REPLACE VIEW app.v_monthly_plan_counts AS
SELECT 
  org_id,
  DATE_TRUNC('month', planned_date)::date AS month,
  COUNT(*) AS plan_count,
  SUM(planned_qty) AS total_planned_qty
FROM app.plans
WHERE deleted_at IS NULL
GROUP BY org_id, DATE_TRUNC('month', planned_date)
ORDER BY org_id, month;

-- ============================================================================
-- 整合性チェック
-- ============================================================================

-- 予約と予定の整合性チェック
CREATE OR REPLACE VIEW app.v_reservation_plan_integrity AS
SELECT 
  'reservation_without_plan' AS check_type,
  COUNT(*) AS error_count
FROM app.reservations r
LEFT JOIN app.plans p ON p.id = r.plan_id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'plan_without_reservation' AS check_type,
  COUNT(*) AS error_count
FROM app.plans p
LEFT JOIN app.reservations r ON r.plan_id = p.id
WHERE r.id IS NULL AND p.planned_qty > 0;

-- 実績と予定の整合性チェック
CREATE OR REPLACE VIEW app.v_actual_plan_integrity AS
SELECT 
  'actual_without_plan' AS check_type,
  COUNT(*) AS error_count
FROM app.actuals a
LEFT JOIN app.plans p ON p.id = a.plan_id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'plan_with_multiple_actuals' AS check_type,
  COUNT(*) AS error_count
FROM (
  SELECT plan_id, COUNT(*) as cnt
  FROM app.actuals
  GROUP BY plan_id
  HAVING COUNT(*) > 1
) t;

-- 本登録と実績の整合性チェック
CREATE OR REPLACE VIEW app.v_registration_actual_integrity AS
SELECT 
  'registration_without_actual' AS check_type,
  COUNT(*) AS error_count
FROM app.registrations reg
LEFT JOIN app.actuals a ON a.plan_id = reg.plan_id
WHERE a.id IS NULL

UNION ALL

SELECT 
  'actual_without_registration' AS check_type,
  COUNT(*) AS error_count
FROM app.actuals a
LEFT JOIN app.registrations reg ON reg.plan_id = a.plan_id
WHERE reg.id IS NULL;

-- ============================================================================
-- ビジネスルール検証
-- ============================================================================

-- 予定数量の妥当性チェック
CREATE OR REPLACE VIEW app.v_plan_qty_validation AS
SELECT 
  'negative_planned_qty' AS check_type,
  COUNT(*) AS error_count
FROM app.plans
WHERE planned_qty < 0

UNION ALL

SELECT 
  'zero_planned_qty' AS check_type,
  COUNT(*) AS error_count
FROM app.plans
WHERE planned_qty = 0;

-- 実績数量の妥当性チェック
CREATE OR REPLACE VIEW app.v_actual_qty_validation AS
SELECT 
  'negative_actual_qty' AS check_type,
  COUNT(*) AS error_count
FROM app.actuals
WHERE actual_qty < 0

UNION ALL

SELECT 
  'actual_qty_much_larger_than_planned' AS check_type,
  COUNT(*) AS error_count
FROM app.actuals a
JOIN app.plans p ON p.id = a.plan_id
WHERE a.actual_qty > p.planned_qty * 2; -- 実績が予定の2倍以上

-- 日付の妥当性チェック
CREATE OR REPLACE VIEW app.v_date_validation AS
SELECT 
  'future_planned_date' AS check_type,
  COUNT(*) AS error_count
FROM app.plans
WHERE planned_date > CURRENT_DATE + INTERVAL '1 year'

UNION ALL

SELECT 
  'past_planned_date' AS check_type,
  COUNT(*) AS error_count
FROM app.plans
WHERE planned_date < CURRENT_DATE - INTERVAL '1 year'

UNION ALL

SELECT 
  'invalid_earliest_pickup_date' AS check_type,
  COUNT(*) AS error_count
FROM app.plans
WHERE earliest_pickup_date IS NOT NULL 
  AND earliest_pickup_date < planned_date;

-- ============================================================================
-- KPI算出
-- ============================================================================

-- 予約率（月別）
CREATE OR REPLACE VIEW app.v_reservation_rate_monthly AS
SELECT 
  org_id,
  DATE_TRUNC('month', planned_date)::date AS month,
  COUNT(*) AS total_plans,
  COUNT(r.id) AS reserved_plans,
  ROUND(100.0 * COUNT(r.id) / COUNT(*), 2) AS reservation_rate_pct
FROM app.plans p
LEFT JOIN app.reservations r ON r.plan_id = p.id AND r.status = 'RESERVED'
WHERE p.deleted_at IS NULL
GROUP BY org_id, DATE_TRUNC('month', planned_date)
ORDER BY org_id, month;

-- 本登録率（月別）
CREATE OR REPLACE VIEW app.v_registration_rate_monthly AS
SELECT 
  org_id,
  DATE_TRUNC('month', planned_date)::date AS month,
  COUNT(*) AS total_plans,
  COUNT(reg.id) AS registered_plans,
  ROUND(100.0 * COUNT(reg.id) / COUNT(*), 2) AS registration_rate_pct
FROM app.plans p
LEFT JOIN app.registrations reg ON reg.plan_id = p.id AND reg.status = 'REGISTERED'
WHERE p.deleted_at IS NULL
GROUP BY org_id, DATE_TRUNC('month', planned_date)
ORDER BY org_id, month;

-- 実績入力率（月別）
CREATE OR REPLACE VIEW app.v_actual_input_rate_monthly AS
SELECT 
  org_id,
  DATE_TRUNC('month', planned_date)::date AS month,
  COUNT(*) AS total_plans,
  COUNT(a.id) AS actual_input_plans,
  ROUND(100.0 * COUNT(a.id) / COUNT(*), 2) AS actual_input_rate_pct
FROM app.plans p
LEFT JOIN app.actuals a ON a.plan_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY org_id, DATE_TRUNC('month', planned_date)
ORDER BY org_id, month;

-- エラー率（月別）
CREATE OR REPLACE VIEW app.v_error_rate_monthly AS
SELECT 
  org_id,
  DATE_TRUNC('month', planned_date)::date AS month,
  COUNT(*) AS total_plans,
  COUNT(CASE WHEN r.status = 'FAILED' THEN 1 END) AS reservation_errors,
  COUNT(CASE WHEN reg.status = 'ERROR' THEN 1 END) AS registration_errors,
  ROUND(100.0 * COUNT(CASE WHEN r.status = 'FAILED' OR reg.status = 'ERROR' THEN 1 END) / COUNT(*), 2) AS error_rate_pct
FROM app.plans p
LEFT JOIN app.reservations r ON r.plan_id = p.id
LEFT JOIN app.registrations reg ON reg.plan_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY org_id, DATE_TRUNC('month', planned_date)
ORDER BY org_id, month;

-- ============================================================================
-- データ品質スコア
-- ============================================================================

-- 組織別データ品質スコア
CREATE OR REPLACE VIEW app.v_data_quality_score AS
WITH quality_metrics AS (
  SELECT 
    org_id,
    -- 必須フィールドの完全性
    ROUND(100.0 * COUNT(CASE WHEN store_code IS NOT NULL AND name IS NOT NULL THEN 1 END) / COUNT(*), 2) AS store_completeness,
    ROUND(100.0 * COUNT(CASE WHEN item_label IS NOT NULL AND jwnet_code IS NOT NULL THEN 1 END) / COUNT(*), 2) AS item_map_completeness,
    ROUND(100.0 * COUNT(CASE WHEN planned_date IS NOT NULL AND planned_qty IS NOT NULL THEN 1 END) / COUNT(*), 2) AS plan_completeness,
    -- データ整合性
    ROUND(100.0 * COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END) / COUNT(*), 2) AS reservation_integrity,
    ROUND(100.0 * COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) / COUNT(*), 2) AS actual_integrity
  FROM app.plans p
  LEFT JOIN app.stores s ON s.id = p.store_id
  LEFT JOIN app.item_maps im ON im.id = p.item_map_id
  LEFT JOIN app.reservations r ON r.plan_id = p.id
  LEFT JOIN app.actuals a ON a.plan_id = p.id
  WHERE p.deleted_at IS NULL
  GROUP BY org_id
)
SELECT 
  qm.org_id,
  o.name AS org_name,
  qm.store_completeness,
  qm.item_map_completeness,
  qm.plan_completeness,
  qm.reservation_integrity,
  qm.actual_integrity,
  ROUND((qm.store_completeness + qm.item_map_completeness + qm.plan_completeness + qm.reservation_integrity + qm.actual_integrity) / 5, 2) AS overall_quality_score
FROM quality_metrics qm
JOIN app.organizations o ON o.id = qm.org_id
ORDER BY overall_quality_score DESC;

-- ============================================================================
-- 検証関数
-- ============================================================================

-- 全検証を実行する関数
CREATE OR REPLACE FUNCTION app.run_all_validations()
RETURNS TABLE (
  validation_name text,
  error_count bigint,
  status text
) 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- 整合性チェック
  RETURN QUERY
  SELECT 'reservation_plan_integrity'::text, SUM(error_count), 
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_reservation_plan_integrity;
  
  RETURN QUERY
  SELECT 'actual_plan_integrity'::text, SUM(error_count),
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_actual_plan_integrity;
  
  RETURN QUERY
  SELECT 'registration_actual_integrity'::text, SUM(error_count),
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_registration_actual_integrity;
  
  -- ビジネスルール検証
  RETURN QUERY
  SELECT 'plan_qty_validation'::text, SUM(error_count),
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_plan_qty_validation;
  
  RETURN QUERY
  SELECT 'actual_qty_validation'::text, SUM(error_count),
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_actual_qty_validation;
  
  RETURN QUERY
  SELECT 'date_validation'::text, SUM(error_count),
    CASE WHEN SUM(error_count) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM app.v_date_validation;
END$$;

-- 組織別検証を実行する関数
CREATE OR REPLACE FUNCTION app.run_org_validations(p_org_id uuid)
RETURNS TABLE (
  validation_name text,
  error_count bigint,
  status text
) 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- 組織固有の検証ロジックをここに実装
  -- 現在は全検証を実行
  RETURN QUERY
  SELECT * FROM app.run_all_validations();
END$$;

-- ============================================================================
-- コメント
-- ============================================================================

COMMENT ON VIEW app.v_org_data_counts IS '組織別データ件数統計';
COMMENT ON VIEW app.v_monthly_plan_counts IS '月別予定件数統計';
COMMENT ON VIEW app.v_reservation_plan_integrity IS '予約と予定の整合性チェック';
COMMENT ON VIEW app.v_actual_plan_integrity IS '実績と予定の整合性チェック';
COMMENT ON VIEW app.v_registration_actual_integrity IS '本登録と実績の整合性チェック';
COMMENT ON VIEW app.v_plan_qty_validation IS '予定数量の妥当性チェック';
COMMENT ON VIEW app.v_actual_qty_validation IS '実績数量の妥当性チェック';
COMMENT ON VIEW app.v_date_validation IS '日付の妥当性チェック';
COMMENT ON VIEW app.v_reservation_rate_monthly IS '月別予約率';
COMMENT ON VIEW app.v_registration_rate_monthly IS '月別本登録率';
COMMENT ON VIEW app.v_actual_input_rate_monthly IS '月別実績入力率';
COMMENT ON VIEW app.v_error_rate_monthly IS '月別エラー率';
COMMENT ON VIEW app.v_data_quality_score IS '組織別データ品質スコア';

COMMENT ON FUNCTION app.run_all_validations() IS '全検証を実行する関数';
COMMENT ON FUNCTION app.run_org_validations(uuid) IS '組織別検証を実行する関数';


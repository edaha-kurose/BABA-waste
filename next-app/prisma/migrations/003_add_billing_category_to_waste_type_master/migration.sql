-- Migration: Add billing_category and billing_type_default to WasteTypeMaster
-- Date: 2025-10-13
-- Description: 請求書出力用の分類フィールドを追加

-- Add billing_category column
ALTER TABLE app.waste_type_masters 
ADD COLUMN billing_category VARCHAR(20);

-- Add billing_type_default column
ALTER TABLE app.waste_type_masters 
ADD COLUMN billing_type_default VARCHAR(20);

-- Add index for billing_category
CREATE INDEX idx_waste_type_masters_billing_category 
ON app.waste_type_masters(billing_category);

-- Add comments
COMMENT ON COLUMN app.waste_type_masters.billing_category IS 
'請求書Excel出力時の列分類: D(店舗コード) | E(店舗名) | F(システム手数料) | G(一般廃棄物) | H(産業廃棄物) | I(瓶・缶) | J(臨時回収) | M(段ボール) | OTHER';

COMMENT ON COLUMN app.waste_type_masters.billing_type_default IS 
'デフォルトの請求種別: FIXED(固定) | METERED(従量) | OTHER(その他)';

-- Seed default values (例)
-- 一般廃棄物
UPDATE app.waste_type_masters
SET billing_category = 'G', billing_type_default = 'FIXED'
WHERE waste_type_name LIKE '%一般廃棄物%' OR waste_type_name LIKE '%可燃%' OR waste_type_name LIKE '%不燃%';

-- 産業廃棄物
UPDATE app.waste_type_masters
SET billing_category = 'H', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%産業廃棄物%' OR waste_type_name LIKE '%廃プラ%';

-- 瓶・缶
UPDATE app.waste_type_masters
SET billing_category = 'I', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%瓶%' OR waste_type_name LIKE '%缶%' OR waste_type_name LIKE '%ビン%';

-- 段ボール
UPDATE app.waste_type_masters
SET billing_category = 'M', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%段ボール%' OR waste_type_name LIKE '%ダンボール%';

-- システム手数料
UPDATE app.waste_type_masters
SET billing_category = 'F', billing_type_default = 'OTHER'
WHERE waste_type_name LIKE '%システム%' OR waste_type_name LIKE '%管理手数料%';


-- Add commission fields to billing_items
ALTER TABLE app.billing_items
ADD COLUMN commission_type VARCHAR(20),
ADD COLUMN commission_rate REAL,
ADD COLUMN commission_amount REAL,
ADD COLUMN is_commission_manual BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN commission_note TEXT,
ADD COLUMN net_amount REAL;

-- Add index for commission_manual flag
CREATE INDEX idx_billing_commission_manual ON app.billing_items(is_commission_manual);

-- Add comment
COMMENT ON COLUMN app.billing_items.commission_type IS 'PERCENTAGE | FIXED_AMOUNT | MANUAL';
COMMENT ON COLUMN app.billing_items.commission_rate IS '手数料率（%）';
COMMENT ON COLUMN app.billing_items.commission_amount IS '手数料額（円）';
COMMENT ON COLUMN app.billing_items.is_commission_manual IS '手動調整フラグ';
COMMENT ON COLUMN app.billing_items.commission_note IS '手数料メモ（調整理由など）';
COMMENT ON COLUMN app.billing_items.net_amount IS '純額 = amount - commission_amount';



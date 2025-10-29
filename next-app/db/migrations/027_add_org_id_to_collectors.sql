-- ============================================================================
-- 027_add_org_id_to_collectors.sql
-- collectorsテーブルにorg_idカラムを追加
-- 作成日: 2025-10-18
-- ============================================================================

-- 1. org_idカラムを追加（NULL許可で一旦追加）
ALTER TABLE app.collectors ADD COLUMN IF NOT EXISTS org_id UUID;

-- 2. 既存データにorg_idを設定（user_org_rolesテーブルから取得）
UPDATE app.collectors c
SET org_id = (
  SELECT uor.org_id
  FROM app.user_org_roles uor
  WHERE uor.user_id = c.user_id
    AND uor.deleted_at IS NULL
    AND uor.is_active = true
  LIMIT 1
)
WHERE c.org_id IS NULL;

-- 3. org_idをNOT NULLに変更
ALTER TABLE app.collectors ALTER COLUMN org_id SET NOT NULL;

-- 4. 外部キー制約を追加
ALTER TABLE app.collectors 
ADD CONSTRAINT fk_collectors_org 
FOREIGN KEY (org_id) REFERENCES app.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION;

-- 5. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_collectors_org ON app.collectors(org_id);

-- ============================================================================
-- 検証
-- ============================================================================

SELECT 'collectors.org_id追加完了' AS status,
       COUNT(*) AS total_collectors,
       COUNT(org_id) AS with_org_id
FROM app.collectors;


-- ============================================================================
-- スーパーアドミン組織作成
-- 目的: システム管理会社の組織を作成
-- 実行: Supabase SQL Editor で手動実行
-- ============================================================================

-- システム管理会社組織の作成（固定UUID）
INSERT INTO app.organizations (
  id,
  name,
  code,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'System Administration',
  'SYSTEM',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 確認
SELECT id, name, code, created_at
FROM app.organizations
WHERE code = 'SYSTEM';

COMMENT ON TABLE app.organizations IS 'スーパーアドミン組織（code=SYSTEM）が作成されました';




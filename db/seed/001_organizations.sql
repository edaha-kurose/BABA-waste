-- ============================================================================
-- 組織（テナント）テストデータ
-- 目的: 開発・テスト用の組織マスタデータ
-- ============================================================================

-- RLS OFF（Seed処理のため）
ALTER TABLE app.organizations DISABLE ROW LEVEL SECURITY;

-- トランザクション開始
BEGIN;

-- 既存データクリア（テストデータのみ）
DELETE FROM app.organizations 
WHERE id IN (
  'org-test-001'::uuid,
  'org-test-002'::uuid,
  'org-test-003'::uuid
);

-- 組織テストデータ挿入（冪等性保証：ON CONFLICT）
INSERT INTO app.organizations (id, name, created_at)
VALUES
  ('org-test-001'::uuid, 'テスト組織A（排出事業者）', NOW()),
  ('org-test-002'::uuid, 'テスト組織B（収集運搬業者）', NOW()),
  ('org-test-003'::uuid, 'テスト組織C（処分業者）', NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  created_at = EXCLUDED.created_at;

-- 事後検証：重複チェック
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app.organizations;
  IF v_count < 3 THEN
    RAISE EXCEPTION 'Organizations count validation failed: expected >= 3, got %', v_count;
  END IF;
  RAISE NOTICE '✅ Organizations validated: % records', v_count;
END $$;

-- コミット
COMMIT;

-- RLS ON（必ず戻す）
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;

-- 完了メッセージ
SELECT '✅ 001_organizations.sql completed' AS status;


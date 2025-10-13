-- ============================================================================
-- ユーザーテストデータ
-- 目的: 開発・テスト用のユーザーマスタデータ
-- 注意: auth.users との同期が必要（本番では別途 Supabase Auth で管理）
-- ============================================================================

-- RLS OFF（Seed処理のため）
ALTER TABLE app.user_org_roles DISABLE ROW LEVEL SECURITY;

-- トランザクション開始
BEGIN;

-- 既存データクリア（テストデータのみ）
DELETE FROM app.user_org_roles 
WHERE user_id IN (
  'user-test-admin-001'::uuid,
  'user-test-emitter-001'::uuid,
  'user-test-transporter-001'::uuid
);

-- ユーザー組織ロールテストデータ挿入
-- 注意: auth.users にユーザーが存在している前提
-- 開発環境では、モック認証を使用するため user_id は任意
INSERT INTO app.user_org_roles (id, user_id, org_id, role)
VALUES
  -- 管理者
  (
    'uor-test-admin-001'::uuid,
    'user-test-admin-001'::uuid,
    'org-test-001'::uuid,
    'ADMIN'::app_role
  ),
  -- 排出事業者
  (
    'uor-test-emitter-001'::uuid,
    'user-test-emitter-001'::uuid,
    'org-test-001'::uuid,
    'EMITTER'::app_role
  ),
  -- 収集運搬業者
  (
    'uor-test-transporter-001'::uuid,
    'user-test-transporter-001'::uuid,
    'org-test-002'::uuid,
    'TRANSPORTER'::app_role
  ),
  -- 処分業者
  (
    'uor-test-disposer-001'::uuid,
    'user-test-disposer-001'::uuid,
    'org-test-003'::uuid,
    'DISPOSER'::app_role
  )
ON CONFLICT (user_id, org_id, role) DO UPDATE SET
  id = EXCLUDED.id;

-- 事後検証
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app.user_org_roles;
  IF v_count < 4 THEN
    RAISE EXCEPTION 'User org roles validation failed: expected >= 4, got %', v_count;
  END IF;
  RAISE NOTICE '✅ User org roles validated: % records', v_count;
END $$;

-- コミット
COMMIT;

-- RLS ON
ALTER TABLE app.user_org_roles ENABLE ROW LEVEL SECURITY;

-- 完了メッセージ
SELECT '✅ 002_users.sql completed' AS status;


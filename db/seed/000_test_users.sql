-- ============================================================================
-- テストユーザーデータ
-- 目的: 開発・テスト用のユーザーと組織・ロール割り当て
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: 組織の作成/更新（codeカラムを含む）
-- ============================================================================

-- 組織が存在しない場合は作成、存在する場合は更新
INSERT INTO app.organizations (id, name, code, org_type, is_active, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'テスト組織A（管理者用）',
    'TEST-ORG-A',
    'ADMIN',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'テスト組織B（収集業者用）',
    'TEST-ORG-B',
    'COLLECTOR',
    true,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'テスト組織C（排出事業者用）',
    'TEST-ORG-C',
    'EMITTER',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  org_type = EXCLUDED.org_type,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- Step 2: app.usersにテストユーザーレコードを作成/更新
-- ============================================================================

-- auth.usersからauth_user_idを取得して、app.usersにレコードを作成
DO $$
DECLARE
  v_admin_auth_id UUID;
  v_collector_auth_id UUID;
  v_emitter_auth_id UUID;
  v_admin_user_id UUID;
  v_collector_user_id UUID;
  v_emitter_user_id UUID;
BEGIN
  -- auth.usersからauth_user_idを取得
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = 'admin@test.com';
  SELECT id INTO v_collector_auth_id FROM auth.users WHERE email = 'collector@test.com';
  SELECT id INTO v_emitter_auth_id FROM auth.users WHERE email = 'emitter@test.com';

  IF v_admin_auth_id IS NULL OR v_collector_auth_id IS NULL OR v_emitter_auth_id IS NULL THEN
    RAISE EXCEPTION 'テストユーザーが auth.users に存在しません。先にSupabase Authでユーザーを作成してください。';
  END IF;

  -- app.usersにレコードを作成/更新
  INSERT INTO app.users (auth_user_id, email, name, is_active, created_at, updated_at)
  VALUES
    (v_admin_auth_id, 'admin@test.com', '管理者テストユーザー', true, NOW(), NOW()),
    (v_collector_auth_id, 'collector@test.com', '収集業者テストユーザー', true, NOW(), NOW()),
    (v_emitter_auth_id, 'emitter@test.com', '排出事業者テストユーザー', true, NOW(), NOW())
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at
  RETURNING id INTO v_admin_user_id;

  -- app.usersから各ユーザーのIDを取得
  SELECT id INTO v_admin_user_id FROM app.users WHERE email = 'admin@test.com';
  SELECT id INTO v_collector_user_id FROM app.users WHERE email = 'collector@test.com';
  SELECT id INTO v_emitter_user_id FROM app.users WHERE email = 'emitter@test.com';

  RAISE NOTICE 'app.users レコード作成完了: admin=%, collector=%, emitter=%', 
    v_admin_user_id, v_collector_user_id, v_emitter_user_id;
END $$;

-- ============================================================================
-- Step 3: user_org_rolesにロール割り当てを作成/更新
-- ============================================================================

-- 既存のロール割り当てを削除（テストユーザーのみ）
DELETE FROM app.user_org_roles
WHERE user_id IN (
  SELECT id FROM app.users WHERE email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com')
);

-- 新しいロール割り当てを作成
INSERT INTO app.user_org_roles (user_id, org_id, role, is_active, created_at, updated_at)
SELECT 
  u.id,
  CASE 
    WHEN u.email = 'admin@test.com' THEN '00000000-0000-0000-0000-000000000001'::uuid
    WHEN u.email = 'collector@test.com' THEN '00000000-0000-0000-0000-000000000002'::uuid
    WHEN u.email = 'emitter@test.com' THEN '00000000-0000-0000-0000-000000000003'::uuid
  END,
  CASE 
    WHEN u.email = 'admin@test.com' THEN 'ADMIN'
    WHEN u.email = 'collector@test.com' THEN 'COLLECTOR'
    WHEN u.email = 'emitter@test.com' THEN 'EMITTER'
  END,
  true,
  NOW(),
  NOW()
FROM app.users u
WHERE u.email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com');

-- ============================================================================
-- Step 4: 検証
-- ============================================================================

DO $$
DECLARE
  v_org_count INT;
  v_user_count INT;
  v_role_count INT;
BEGIN
  SELECT COUNT(*) INTO v_org_count FROM app.organizations;
  SELECT COUNT(*) INTO v_user_count FROM app.users 
    WHERE email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com');
  SELECT COUNT(*) INTO v_role_count FROM app.user_org_roles uor
    JOIN app.users u ON uor.user_id = u.id
    WHERE u.email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com');

  IF v_org_count < 3 THEN
    RAISE EXCEPTION '組織数が不足: expected >= 3, got %', v_org_count;
  END IF;

  IF v_user_count < 3 THEN
    RAISE EXCEPTION 'ユーザー数が不足: expected 3, got %', v_user_count;
  END IF;

  IF v_role_count < 3 THEN
    RAISE EXCEPTION 'ロール割り当て数が不足: expected 3, got %', v_role_count;
  END IF;

  RAISE NOTICE '✅ 組織: % 件', v_org_count;
  RAISE NOTICE '✅ ユーザー: % 件', v_user_count;
  RAISE NOTICE '✅ ロール割り当て: % 件', v_role_count;
END $$;

COMMIT;

-- 完了メッセージ
SELECT '✅ 000_test_users.sql completed' AS status;



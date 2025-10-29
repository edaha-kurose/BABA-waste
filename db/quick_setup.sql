-- ============================================================================
-- クイックセットアップSQL（開発環境用）
-- 目的: 最短でクイックログインを動作させる
-- ⚠️ 本番環境では使用しないでください
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: すべてのRLSを無効化
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE IF EXISTS app.organizations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.user_org_roles DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.users DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.stores DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.item_maps DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.contracts DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.plans DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.reservations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.actuals DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.registrations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.audit_logs DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.jwnet_reservations DISABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS app.jwnet_registrations DISABLE ROW LEVEL SECURITY;

  RAISE NOTICE '✅ すべてのRLSを無効化しました';
END $$;

-- ============================================================================
-- Step 2: user_org_rolesテーブルの外部キー制約を修正
-- ============================================================================

DO $$
BEGIN
  -- 既存の外部キー制約を削除
  ALTER TABLE app.user_org_roles DROP CONSTRAINT IF EXISTS user_org_roles_user_id_fkey;
  
  -- 不足しているカラムを追加
  ALTER TABLE app.user_org_roles
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

  RAISE NOTICE '✅ user_org_rolesテーブルを更新しました';
END $$;

-- app.usersテーブルを作成した後に外部キー制約を追加するため、ここでは追加しない

-- ============================================================================
-- Step 3: organizationsテーブルに不足しているカラムを追加
-- ============================================================================

DO $$
BEGIN
  ALTER TABLE app.organizations
    ADD COLUMN IF NOT EXISTS code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS updated_by UUID,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS org_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

  RAISE NOTICE '✅ organizationsテーブルを更新しました';
END $$;

-- ============================================================================
-- Step 4: app.usersテーブルを作成（存在しない場合）
-- ============================================================================

CREATE TABLE IF NOT EXISTS app.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

-- RLSを無効化
ALTER TABLE app.users DISABLE ROW LEVEL SECURITY;

-- 既存の不整合データをクリーンアップしてから外部キー制約を追加
DO $$
BEGIN
  -- 既存の制約を削除
  ALTER TABLE app.user_org_roles DROP CONSTRAINT IF EXISTS user_org_roles_user_id_fkey;
  
  -- 既存の全データを削除（クリーンスタート）
  DELETE FROM app.user_org_roles;
  
  -- 新しい外部キー制約を追加（app.usersを参照）
  ALTER TABLE app.user_org_roles 
    ADD CONSTRAINT user_org_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;

  RAISE NOTICE '✅ app.usersテーブルを作成し、外部キー制約を設定しました';
  RAISE NOTICE '⚠️ user_org_rolesの既存データを削除しました（クリーンスタート）';
END $$;

-- ============================================================================
-- Step 5: テスト組織を作成/更新
-- ============================================================================

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

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ テスト組織を作成/更新しました';
END $$;

-- ============================================================================
-- Step 6: app.usersにテストユーザーレコードを作成/更新
-- ============================================================================

DO $$
DECLARE
  v_admin_auth_id UUID;
  v_collector_auth_id UUID;
  v_emitter_auth_id UUID;
BEGIN
  -- auth.usersからauth_user_idを取得
  SELECT id INTO v_admin_auth_id FROM auth.users WHERE email = 'admin@test.com';
  SELECT id INTO v_collector_auth_id FROM auth.users WHERE email = 'collector@test.com';
  SELECT id INTO v_emitter_auth_id FROM auth.users WHERE email = 'emitter@test.com';

  IF v_admin_auth_id IS NULL OR v_collector_auth_id IS NULL OR v_emitter_auth_id IS NULL THEN
    RAISE EXCEPTION 'テストユーザーが auth.users に存在しません。Supabase Authで先にユーザーを作成してください。';
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
    updated_at = EXCLUDED.updated_at;

  RAISE NOTICE '✅ app.usersレコードを作成/更新しました';
END $$;

-- ============================================================================
-- Step 7: user_org_rolesにロール割り当てを作成/更新
-- ============================================================================

-- 既存のテストユーザーのロール割り当てを削除
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
    WHEN u.email = 'admin@test.com' THEN 'ADMIN'::app_role
    WHEN u.email = 'collector@test.com' THEN 'TRANSPORTER'::app_role
    WHEN u.email = 'emitter@test.com' THEN 'EMITTER'::app_role
  END,
  true,
  NOW(),
  NOW()
FROM app.users u
WHERE u.email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com');

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ ロール割り当てを作成しました';
END $$;

-- ============================================================================
-- Step 8: 最終検証
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

  IF v_user_count < 3 THEN
    RAISE EXCEPTION 'ユーザー数が不足: expected 3, got %', v_user_count;
  END IF;

  IF v_role_count < 3 THEN
    RAISE EXCEPTION 'ロール割り当て数が不足: expected 3, got %', v_role_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ セットアップ完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '組織: % 件', v_org_count;
  RAISE NOTICE 'ユーザー: % 件', v_user_count;
  RAISE NOTICE 'ロール割り当て: % 件', v_role_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '次の手順:';
  RAISE NOTICE '1. https://baba-waste.vercel.app/login にアクセス';
  RAISE NOTICE '2. クイックログインボタンをクリック';
  RAISE NOTICE '3. ダッシュボードが表示されることを確認';
  RAISE NOTICE '';
END $$;

COMMIT;

-- 最終確認クエリ（結果を表示）
SELECT 
  u.email,
  u.name,
  u.is_active as user_is_active,
  uor.role,
  uor.is_active as role_is_active,
  o.name as org_name,
  o.org_type
FROM app.users u
JOIN app.user_org_roles uor ON u.id = uor.user_id
JOIN app.organizations o ON uor.org_id = o.id
WHERE u.email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com')
ORDER BY u.email;


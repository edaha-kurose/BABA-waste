-- ================================================================
-- テストユーザー整合性確認SQL
-- ================================================================
-- 目的: E2Eテストで使用するユーザーのデータ整合性を確認
-- 実行環境: Supabase SQL Editor
-- ================================================================

-- ================================================================
-- 1. auth.users と app.users の同期確認
-- ================================================================
SELECT 
  'Auth vs App Users Sync Check' as check_type,
  au.id as auth_user_id,
  au.email as auth_email,
  u.id as app_user_id,
  u.email as app_email,
  u.auth_user_id,
  CASE 
    WHEN u.id IS NULL THEN '❌ Missing in app.users'
    WHEN u.auth_user_id != au.id THEN '❌ auth_user_id mismatch'
    ELSE '✅ OK'
  END as status
FROM auth.users au
LEFT JOIN app.users u ON u.auth_user_id = au.id
WHERE au.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
ORDER BY au.email;

-- ================================================================
-- 2. app.users と user_org_roles の関連確認
-- ================================================================
SELECT 
  'App Users vs Roles Check' as check_type,
  u.id as app_user_id,
  u.email,
  u.auth_user_id,
  r.id as role_id,
  r.role,
  r.org_id,
  r.is_active,
  o.name as org_name,
  CASE 
    WHEN r.id IS NULL THEN '❌ No role assigned'
    WHEN r.is_active = false THEN '⚠️ Role inactive'
    WHEN o.id IS NULL THEN '❌ Organization not found'
    ELSE '✅ OK'
  END as status
FROM app.users u
LEFT JOIN app.user_org_roles r ON r.user_id = u.id
LEFT JOIN app.organizations o ON o.id = r.org_id
WHERE u.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
ORDER BY u.email;

-- ================================================================
-- 3. 詳細情報の確認
-- ================================================================
SELECT 
  'Detailed User Info' as check_type,
  u.id as app_user_id,
  u.email,
  u.name,
  u.auth_user_id,
  u.is_active as user_is_active,
  u.created_at as user_created_at,
  r.role,
  r.org_id,
  r.is_active as role_is_active,
  o.name as org_name,
  o.code as org_code
FROM app.users u
LEFT JOIN app.user_org_roles r ON r.user_id = u.id
LEFT JOIN app.organizations o ON o.id = r.org_id
WHERE u.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
ORDER BY u.email;

-- ================================================================
-- 4. auth.users の存在確認（基礎データ）
-- ================================================================
SELECT 
  'Auth Users Basic Info' as check_type,
  id,
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '✅ Email confirmed'
  END as email_status
FROM auth.users
WHERE email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
ORDER BY email;

-- ================================================================
-- 5. 孤立レコードの検出
-- ================================================================
-- app.users に存在するが auth.users に存在しない
SELECT 
  'Orphaned App Users' as check_type,
  u.id,
  u.email,
  u.auth_user_id,
  '❌ auth_user_id points to non-existent auth.users' as issue
FROM app.users u
LEFT JOIN auth.users au ON au.id = u.auth_user_id
WHERE au.id IS NULL
  AND u.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com');

-- ================================================================
-- 6. 重複チェック
-- ================================================================
SELECT 
  'Duplicate Check' as check_type,
  email,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 1 THEN '❌ Duplicate email in app.users'
    ELSE '✅ No duplicates'
  END as status
FROM app.users
WHERE email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
GROUP BY email;

-- ================================================================
-- 7. 期待されるロールの確認
-- ================================================================
WITH expected_roles AS (
  SELECT 'admin@test.com' as email, 'ADMIN' as expected_role
  UNION ALL
  SELECT 'emitter@test.com', 'EMITTER'
  UNION ALL
  SELECT 'collector@test.com', 'TRANSPORTER'
)
SELECT 
  'Role Validation' as check_type,
  er.email,
  er.expected_role,
  r.role as actual_role,
  CASE 
    WHEN r.role IS NULL THEN '❌ No role assigned'
    WHEN r.role != er.expected_role THEN '❌ Role mismatch'
    ELSE '✅ OK'
  END as status
FROM expected_roles er
LEFT JOIN app.users u ON u.email = er.email
LEFT JOIN app.user_org_roles r ON r.user_id = u.id
ORDER BY er.email;

-- ================================================================
-- サマリー
-- ================================================================
SELECT 
  '=== SUMMARY ===' as check_type,
  COUNT(DISTINCT CASE WHEN au.id IS NOT NULL THEN au.email END) as auth_users_count,
  COUNT(DISTINCT CASE WHEN u.id IS NOT NULL THEN u.email END) as app_users_count,
  COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN r.user_id END) as users_with_roles,
  COUNT(DISTINCT CASE WHEN r.is_active = true THEN r.user_id END) as active_roles
FROM auth.users au
FULL OUTER JOIN app.users u ON u.auth_user_id = au.id
LEFT JOIN app.user_org_roles r ON r.user_id = u.id
WHERE au.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com')
   OR u.email IN ('admin@test.com', 'emitter@test.com', 'collector@test.com');








-- ============================================================================
-- 追加の行レベルセキュリティ（RLS）ポリシー
-- 作成日: 2025-10-14
-- 目的: app.users, app.jwnet_*, その他の新規テーブルのRLS設定
-- ============================================================================

-- ============================================================================
-- app.usersテーブルのRLS
-- ============================================================================

-- RLS有効化
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;

-- すべての認証済みユーザーがusersテーブルを参照可能
DROP POLICY IF EXISTS "Users are viewable by everyone" ON app.users;
CREATE POLICY "Users are viewable by everyone" 
  ON app.users 
  FOR SELECT 
  USING (true);

-- ユーザーは自分のプロフィールを作成可能
DROP POLICY IF EXISTS "Users can insert their own profile" ON app.users;
CREATE POLICY "Users can insert their own profile" 
  ON app.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = auth_user_id);

-- ユーザーは自分のプロフィールを更新可能
DROP POLICY IF EXISTS "Users can update own profile" ON app.users;
CREATE POLICY "Users can update own profile" 
  ON app.users 
  FOR UPDATE 
  USING (auth.uid() = auth_user_id);

-- ============================================================================
-- app.jwnet_reservationsテーブルのRLS
-- ============================================================================

-- RLS有効化
ALTER TABLE app.jwnet_reservations ENABLE ROW LEVEL SECURITY;

-- 組織メンバーのみが自分の組織のデータを参照可能
DROP POLICY IF EXISTS "JWNET reservations viewable by org members" ON app.jwnet_reservations;
CREATE POLICY "JWNET reservations viewable by org members" 
  ON app.jwnet_reservations 
  FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  );

-- 組織メンバーは自分の組織のデータを作成・更新可能
DROP POLICY IF EXISTS "JWNET reservations modifiable by org members" ON app.jwnet_reservations;
CREATE POLICY "JWNET reservations modifiable by org members" 
  ON app.jwnet_reservations 
  FOR ALL 
  USING (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  );

-- ============================================================================
-- app.jwnet_registrationsテーブルのRLS
-- ============================================================================

-- RLS有効化
ALTER TABLE app.jwnet_registrations ENABLE ROW LEVEL SECURITY;

-- 組織メンバーのみが自分の組織のデータを参照可能
DROP POLICY IF EXISTS "JWNET registrations viewable by org members" ON app.jwnet_registrations;
CREATE POLICY "JWNET registrations viewable by org members" 
  ON app.jwnet_registrations 
  FOR SELECT 
  USING (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  );

-- 組織メンバーは自分の組織のデータを作成・更新可能
DROP POLICY IF EXISTS "JWNET registrations modifiable by org members" ON app.jwnet_registrations;
CREATE POLICY "JWNET registrations modifiable by org members" 
  ON app.jwnet_registrations 
  FOR ALL 
  USING (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM app.user_org_roles 
      WHERE user_id = (SELECT id FROM app.users WHERE auth_user_id = auth.uid())
        AND is_active = true
    )
  );

-- ============================================================================
-- 完了メッセージ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 追加RLSポリシーが適用されました';
  RAISE NOTICE '  - app.users';
  RAISE NOTICE '  - app.jwnet_reservations';
  RAISE NOTICE '  - app.jwnet_registrations';
END $$;

SELECT '✅ rls_policies_additional.sql completed' AS status;



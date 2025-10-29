-- ============================================================================
-- スキーマ更新: Prismaスキーマとの同期
-- 作成日: 2025-10-14
-- 目的: 001_initial_schema.sqlで不足しているカラムを追加
-- ============================================================================

-- user_org_rolesテーブルに不足しているカラムを追加
ALTER TABLE app.user_org_roles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_user_org_roles_is_active ON app.user_org_roles(is_active);

-- organizationsテーブルに不足しているカラムを追加
ALTER TABLE app.organizations
  ADD COLUMN IF NOT EXISTS code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS org_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS jwnet_subscriber_id VARCHAR(10),
  ADD COLUMN IF NOT EXISTS jwnet_public_confirmation_id VARCHAR(10);

-- organizationsのcode列にUNIQUE制約を追加（NULL許容）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organizations_code_key'
  ) THEN
    ALTER TABLE app.organizations 
    ADD CONSTRAINT organizations_code_key UNIQUE (code);
  END IF;
END$$;

-- app.usersテーブルが存在しない場合は作成
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

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_users_email ON app.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON app.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON app.users(auth_user_id);

-- app.jwnet_reservationsテーブルを作成
CREATE TABLE IF NOT EXISTS app.jwnet_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  reservation_no VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'RESERVED' NOT NULL,
  request_data JSONB,
  response_data JSONB,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  UNIQUE(org_id, reservation_no)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_jwnet_reservations_org_id ON app.jwnet_reservations(org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_reservations_status ON app.jwnet_reservations(status);
CREATE INDEX IF NOT EXISTS idx_jwnet_reservations_reservation_no ON app.jwnet_reservations(reservation_no);

-- app.jwnet_registrationsテーブルを作成
CREATE TABLE IF NOT EXISTS app.jwnet_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  collection_id UUID,
  manifest_no VARCHAR(50) NOT NULL,
  receipt_no VARCHAR(50),
  status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  manifest_data JSONB,
  response_data JSONB,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  UNIQUE(org_id, manifest_no)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_jwnet_registrations_org_id ON app.jwnet_registrations(org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_registrations_collection_id ON app.jwnet_registrations(collection_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_registrations_status ON app.jwnet_registrations(status);
CREATE INDEX IF NOT EXISTS idx_jwnet_registrations_manifest_no ON app.jwnet_registrations(manifest_no);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE 'スキーマ更新が完了しました';
END$$;



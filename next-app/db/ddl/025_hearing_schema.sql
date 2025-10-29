-- ============================================================================
-- 025_hearing_schema.sql
-- 一斉ヒアリング機能のスキーマ定義
-- 作成日: 2025-10-18
-- ============================================================================

-- ============================================================================
-- 1. ヒアリングキャンペーン
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- 対象期間
  target_period_from DATE NOT NULL,
  target_period_to DATE NOT NULL,
  
  -- 回答期限
  response_deadline TIMESTAMPTZ NOT NULL,
  
  -- ステータス: DRAFT, ACTIVE, LOCKED, CLOSED
  status TEXT NOT NULL DEFAULT 'DRAFT',
  
  -- 監査
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_hearings_org FOREIGN KEY (org_id) 
    REFERENCES app.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearings_created_by FOREIGN KEY (created_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_hearings_updated_by FOREIGN KEY (updated_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT chk_hearings_period CHECK (target_period_to >= target_period_from),
  CONSTRAINT chk_hearings_status CHECK (status IN ('DRAFT', 'ACTIVE', 'LOCKED', 'CLOSED'))
);

CREATE INDEX idx_hearings_org ON app.hearings(org_id);
CREATE INDEX idx_hearings_status ON app.hearings(status);
CREATE INDEX idx_hearings_deadline ON app.hearings(response_deadline);

COMMENT ON TABLE app.hearings IS '一斉ヒアリングキャンペーン';

-- ============================================================================
-- 2. 外部店舗マスター（B/C/D社の店舗）
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_external_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- 店舗情報
  company_name TEXT NOT NULL,
  store_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  address TEXT,
  
  -- 担当業者
  primary_collector_id UUID,
  
  -- フラグ
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 監査
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_external_stores_org FOREIGN KEY (org_id) 
    REFERENCES app.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_external_stores_collector FOREIGN KEY (primary_collector_id) 
    REFERENCES app.collectors(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT fk_external_stores_created_by FOREIGN KEY (created_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_external_stores_updated_by FOREIGN KEY (updated_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT uk_external_store_code UNIQUE (org_id, company_name, store_code)
);

CREATE INDEX idx_external_stores_org ON app.hearing_external_stores(org_id);
CREATE INDEX idx_external_stores_collector ON app.hearing_external_stores(primary_collector_id);

COMMENT ON TABLE app.hearing_external_stores IS 'ヒアリング専用：外部企業店舗マスター';

-- ============================================================================
-- 2-1. 店舗品目マスター（A社店舗用）
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  store_id UUID NOT NULL,
  
  -- 品目情報
  item_name TEXT NOT NULL,  -- 例: 可燃ゴミ、段ボール、不燃物
  item_code TEXT,
  sort_order INT DEFAULT 0,
  
  -- 担当業者
  assigned_collector_id UUID,
  
  -- フラグ
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 監査
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_store_items_org FOREIGN KEY (org_id) 
    REFERENCES app.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_store_items_store FOREIGN KEY (store_id) 
    REFERENCES app.stores(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_store_items_collector FOREIGN KEY (assigned_collector_id) 
    REFERENCES app.collectors(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT fk_store_items_created_by FOREIGN KEY (created_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_store_items_updated_by FOREIGN KEY (updated_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT uk_store_item_name UNIQUE (org_id, store_id, item_name)
);

CREATE INDEX idx_store_items_org ON app.store_items(org_id);
CREATE INDEX idx_store_items_store ON app.store_items(store_id);
CREATE INDEX idx_store_items_collector ON app.store_items(assigned_collector_id);

COMMENT ON TABLE app.store_items IS '店舗品目マスター（A社店舗用）';

-- ============================================================================
-- 2-2. 外部店舗品目マスター（B/C/D社店舗用）
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_external_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  external_store_id UUID NOT NULL,
  
  -- 品目情報
  item_name TEXT NOT NULL,
  item_code TEXT,
  sort_order INT DEFAULT 0,
  
  -- 担当業者
  assigned_collector_id UUID,
  
  -- フラグ
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 監査
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_external_store_items_org FOREIGN KEY (org_id) 
    REFERENCES app.organizations(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_external_store_items_store FOREIGN KEY (external_store_id) 
    REFERENCES app.hearing_external_stores(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_external_store_items_collector FOREIGN KEY (assigned_collector_id) 
    REFERENCES app.collectors(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT fk_external_store_items_created_by FOREIGN KEY (created_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_external_store_items_updated_by FOREIGN KEY (updated_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT uk_external_store_item_name UNIQUE (org_id, external_store_id, item_name)
);

CREATE INDEX idx_external_store_items_org ON app.hearing_external_store_items(org_id);
CREATE INDEX idx_external_store_items_store ON app.hearing_external_store_items(external_store_id);
CREATE INDEX idx_external_store_items_collector ON app.hearing_external_store_items(assigned_collector_id);

COMMENT ON TABLE app.hearing_external_store_items IS '外部店舗品目マスター（B/C/D社店舗用）';

-- ============================================================================
-- 3. ヒアリング対象（業者×店舗×品目）
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL,
  collector_id UUID NOT NULL,
  
  -- 店舗参照（A社 or 外部）
  store_id UUID,
  external_store_id UUID,
  
  -- 品目参照（A社 or 外部）
  store_item_id UUID,
  external_store_item_id UUID,
  
  -- 表示用（冗長化でパフォーマンス向上）
  company_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  item_name TEXT NOT NULL,  -- 追加: 品目名
  
  -- 通知状況: PENDING, SENT, FAILED
  notified_at TIMESTAMPTZ,
  notification_status TEXT DEFAULT 'PENDING',
  
  -- 回答状況: NOT_RESPONDED, RESPONDED, LOCKED, UNLOCK_REQUESTED
  response_status TEXT DEFAULT 'NOT_RESPONDED',
  responded_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_hearing_targets_hearing FOREIGN KEY (hearing_id) 
    REFERENCES app.hearings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_targets_collector FOREIGN KEY (collector_id) 
    REFERENCES app.collectors(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_targets_store FOREIGN KEY (store_id) 
    REFERENCES app.stores(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_targets_external_store FOREIGN KEY (external_store_id) 
    REFERENCES app.hearing_external_stores(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_targets_store_item FOREIGN KEY (store_item_id) 
    REFERENCES app.store_items(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_targets_external_store_item FOREIGN KEY (external_store_item_id) 
    REFERENCES app.hearing_external_store_items(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT chk_hearing_targets_store_type CHECK (
    (store_id IS NOT NULL AND external_store_id IS NULL) OR
    (store_id IS NULL AND external_store_id IS NOT NULL)
  ),
  CONSTRAINT chk_hearing_targets_item_type CHECK (
    (store_item_id IS NOT NULL AND external_store_item_id IS NULL) OR
    (store_item_id IS NULL AND external_store_item_id IS NOT NULL)
  ),
  CONSTRAINT chk_hearing_targets_notification_status CHECK (
    notification_status IN ('PENDING', 'SENT', 'FAILED')
  ),
  CONSTRAINT chk_hearing_targets_response_status CHECK (
    response_status IN ('NOT_RESPONDED', 'RESPONDED', 'LOCKED', 'UNLOCK_REQUESTED')
  )
);

CREATE INDEX idx_hearing_targets_hearing ON app.hearing_targets(hearing_id);
CREATE INDEX idx_hearing_targets_collector ON app.hearing_targets(collector_id);
CREATE INDEX idx_hearing_targets_response_status ON app.hearing_targets(response_status);
CREATE INDEX idx_hearing_targets_store_item ON app.hearing_targets(store_item_id);
CREATE INDEX idx_hearing_targets_external_store_item ON app.hearing_targets(external_store_item_id);

COMMENT ON TABLE app.hearing_targets IS 'ヒアリング対象（業者×店舗×品目）';

-- ============================================================================
-- 4. 回答データ（日付×店舗のマトリクス）
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_target_id UUID NOT NULL,
  target_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT FALSE,
  
  -- 監査
  responded_by UUID NOT NULL,
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  CONSTRAINT fk_hearing_responses_target FOREIGN KEY (hearing_target_id) 
    REFERENCES app.hearing_targets(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_responses_user FOREIGN KEY (responded_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT uk_hearing_response_date UNIQUE (hearing_target_id, target_date)
);

CREATE INDEX idx_hearing_responses_target ON app.hearing_responses(hearing_target_id);
CREATE INDEX idx_hearing_responses_date ON app.hearing_responses(target_date);
CREATE INDEX idx_hearing_responses_available ON app.hearing_responses(is_available);

COMMENT ON TABLE app.hearing_responses IS 'ヒアリング回答（日付別の可否）';

-- ============================================================================
-- 5. スレッド式コメント
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_target_id UUID NOT NULL,
  
  -- コメント内容
  comment TEXT NOT NULL,
  
  -- 投稿者
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  
  -- スレッド機能（将来拡張用）
  parent_comment_id UUID,
  
  -- 既読管理
  is_read_by_admin BOOLEAN DEFAULT FALSE,
  is_read_by_collector BOOLEAN DEFAULT FALSE,
  
  -- 監査
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fk_hearing_comments_target FOREIGN KEY (hearing_target_id) 
    REFERENCES app.hearing_targets(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_comments_user FOREIGN KEY (user_id) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_comments_parent FOREIGN KEY (parent_comment_id) 
    REFERENCES app.hearing_comments(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT chk_hearing_comments_role CHECK (user_role IN ('ADMIN', 'COLLECTOR'))
);

CREATE INDEX idx_hearing_comments_target ON app.hearing_comments(hearing_target_id);
CREATE INDEX idx_hearing_comments_created ON app.hearing_comments(created_at DESC);

COMMENT ON TABLE app.hearing_comments IS 'ヒアリング用スレッド式コメント';

-- ============================================================================
-- 6. ロック解除申請
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_unlock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_target_id UUID NOT NULL,
  
  -- 申請情報
  requested_by UUID NOT NULL,
  request_reason TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 承認情報: PENDING, APPROVED, REJECTED
  status TEXT DEFAULT 'PENDING',
  reviewed_by UUID,
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  
  CONSTRAINT fk_unlock_requests_target FOREIGN KEY (hearing_target_id) 
    REFERENCES app.hearing_targets(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_unlock_requests_requester FOREIGN KEY (requested_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_unlock_requests_reviewer FOREIGN KEY (reviewed_by) 
    REFERENCES app.users(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT chk_unlock_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX idx_unlock_requests_target ON app.hearing_unlock_requests(hearing_target_id);
CREATE INDEX idx_unlock_requests_status ON app.hearing_unlock_requests(status);

COMMENT ON TABLE app.hearing_unlock_requests IS 'ヒアリングロック解除申請';

-- ============================================================================
-- 7. リマインダー送信履歴
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.hearing_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL,
  collector_id UUID NOT NULL,
  
  -- リマインダー種別: WEEK_BEFORE, THREE_DAYS_BEFORE, ONE_DAY_BEFORE
  reminder_type TEXT NOT NULL,
  
  -- 送信状況: PENDING, SENT, SKIPPED, FAILED
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_hearing_reminders_hearing FOREIGN KEY (hearing_id) 
    REFERENCES app.hearings(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT fk_hearing_reminders_collector FOREIGN KEY (collector_id) 
    REFERENCES app.collectors(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT chk_hearing_reminders_type CHECK (
    reminder_type IN ('WEEK_BEFORE', 'THREE_DAYS_BEFORE', 'ONE_DAY_BEFORE')
  ),
  CONSTRAINT chk_hearing_reminders_status CHECK (
    status IN ('PENDING', 'SENT', 'SKIPPED', 'FAILED')
  )
);

CREATE INDEX idx_hearing_reminders_hearing ON app.hearing_reminders(hearing_id);
CREATE INDEX idx_hearing_reminders_collector ON app.hearing_reminders(collector_id);
CREATE INDEX idx_hearing_reminders_status ON app.hearing_reminders(status);
CREATE INDEX idx_hearing_reminders_type ON app.hearing_reminders(reminder_type);

COMMENT ON TABLE app.hearing_reminders IS 'リマインダー送信履歴';

-- ============================================================================
-- 権限設定
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_external_stores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.store_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_external_store_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_unlock_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.hearing_reminders TO authenticated;

-- ============================================================================
-- 完了
-- ============================================================================


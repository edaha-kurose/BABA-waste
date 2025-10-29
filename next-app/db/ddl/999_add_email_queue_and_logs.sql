-- Email送信キュー・履歴テーブル作成
-- 作成日: 2025-10-21
-- 目的: Resend連携のためのメール送信管理

-- ENUMs作成
CREATE TYPE app.email_queue_status AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'RETRY');
CREATE TYPE app.email_template_type AS ENUM ('NOTIFICATION', 'REMINDER', 'ESCALATION', 'REPORT');
CREATE TYPE app.email_log_status AS ENUM ('SUCCESS', 'FAILED');
CREATE TYPE app.resend_status AS ENUM ('queued', 'sent', 'delivered', 'bounced', 'complained');

-- email_queueテーブル作成
CREATE TABLE IF NOT EXISTS app.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  to_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  template_type app.email_template_type NOT NULL,
  related_entity_type VARCHAR(100),
  related_entity_id UUID,
  status app.email_queue_status NOT NULL DEFAULT 'PENDING',
  priority INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- email_logsテーブル作成
CREATE TABLE IF NOT EXISTS app.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES app.email_queue(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status app.email_log_status NOT NULL,
  resend_id VARCHAR(255),
  resend_status app.resend_status,
  smtp_response TEXT,
  error_message TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_email_queue_org_status_scheduled ON app.email_queue(org_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON app.email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_org_sent ON app.email_logs(org_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON app.email_logs(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_queue_id ON app.email_logs(queue_id);

-- コメント追加
COMMENT ON TABLE app.email_queue IS 'メール送信キュー';
COMMENT ON TABLE app.email_logs IS 'メール送信履歴';

-- RLS有効化
ALTER TABLE app.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.email_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成（org_id境界）
CREATE POLICY org_isolation_select_email_queue ON app.email_queue
  FOR SELECT
  USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_insert_email_queue ON app.email_queue
  FOR INSERT
  WITH CHECK (org_id = app.current_org_id());

CREATE POLICY org_isolation_update_email_queue ON app.email_queue
  FOR UPDATE
  USING (org_id = app.current_org_id())
  WITH CHECK (org_id = app.current_org_id());

CREATE POLICY org_isolation_delete_email_queue ON app.email_queue
  FOR DELETE
  USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_select_email_logs ON app.email_logs
  FOR SELECT
  USING (org_id = app.current_org_id());

CREATE POLICY org_isolation_insert_email_logs ON app.email_logs
  FOR INSERT
  WITH CHECK (org_id = app.current_org_id());

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ Email queue and logs tables created successfully';
END $$;




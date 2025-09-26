-- ============================================================================
-- 廃棄物管理システム 初期スキーマ
-- 作成日: 2025-09-16
-- 目的: JWNET連携を伴う廃棄物管理システムのデータベース初期化
-- ============================================================================

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "http";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- スキーマ作成
CREATE SCHEMA IF NOT EXISTS app;

-- ============================================================================
-- 便利関数
-- ============================================================================

-- JWTのorg_idを取り出す関数（マルチテナント境界）
CREATE OR REPLACE FUNCTION app.current_org_id() 
RETURNS uuid 
LANGUAGE sql 
STABLE 
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'org_id')::uuid, 
    '00000000-0000-0000-0000-000000000000'::uuid
  )
$$;

-- ============================================================================
-- 列挙型の定義
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('ADMIN','EMITTER','TRANSPORTER','DISPOSER');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unit') THEN
    CREATE TYPE unit AS ENUM ('T','KG','M3');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reg_status') THEN
    CREATE TYPE reg_status AS ENUM ('RESERVED','FAILED','PENDING','REGISTERED','ERROR');
  END IF;
END$$;

-- ============================================================================
-- テーブル定義
-- ============================================================================

-- テナント（排出企業などの "組織"）
CREATE TABLE app.organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ユーザー⇄組織⇄ロール（Supabaseのauth.usersと連携）
CREATE TABLE app.user_org_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, org_id, role)
);

-- 店舗（排出事業場）
CREATE TABLE app.stores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  store_code text NOT NULL,
  name text NOT NULL,
  address text,
  area text,
  emitter_no text,              -- 事業場番号など
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE(org_id, store_code)
);

-- 品目マッピング（自社ラベル⇄JWNETコード）
CREATE TABLE app.item_maps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  item_label text NOT NULL,
  jwnet_code text NOT NULL,
  hazard boolean NOT NULL DEFAULT false,
  default_unit unit NOT NULL DEFAULT 'T',
  density_t_per_m3 numeric,              -- 比重（m3→t）
  disposal_method_code text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE(org_id, item_label)
);

-- 契約/許可（簡易：JSONで許可範囲を保持）
CREATE TABLE app.contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  emitter_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  transporter_id uuid,
  disposer_id uuid,
  scope jsonb,                 -- { areas:[], items:[], limits:{...} } など
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- 予定（Plan）: CSV正規化後の1行＝店舗×日×品目
CREATE TABLE app.plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES app.stores(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  item_map_id uuid NOT NULL REFERENCES app.item_maps(id),
  planned_qty numeric NOT NULL CHECK (planned_qty >= 0),
  unit unit NOT NULL DEFAULT 'T',
  earliest_pickup_date date,
  route_id text,
  split_group text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE(org_id, store_id, planned_date, item_map_id)
);

-- 予約（Reservation）
CREATE TABLE app.reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES app.plans(id) ON DELETE CASCADE,
  jwnet_temp_id text,           -- 予約ID（JWNET）
  payload_hash text NOT NULL UNIQUE,
  status reg_status NOT NULL DEFAULT 'PENDING',
  last_sent_at timestamptz,
  error_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE(org_id, plan_id)
);

-- 実績（現場確定）
CREATE TABLE app.actuals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL UNIQUE REFERENCES app.plans(id) ON DELETE CASCADE,
  actual_qty numeric NOT NULL CHECK (actual_qty >= 0),
  unit unit NOT NULL DEFAULT 'T',
  vehicle_no text,
  driver_name text,
  weighing_ticket_no text,
  photo_urls text[],            -- StorageのURL配列
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- 本登録（Registration）
CREATE TABLE app.registrations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL UNIQUE REFERENCES app.plans(id) ON DELETE CASCADE,
  manifest_no text,             -- JWNET登録番号
  status reg_status NOT NULL DEFAULT 'PENDING',
  error_code text,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- 監査ログ
CREATE TABLE app.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  actor_id uuid,                -- auth.users.id
  actor_role app_role,
  action text NOT NULL,         -- 'CREATE_PLAN' など
  entity text NOT NULL,         -- 'plan','reservation' 等
  entity_id uuid NOT NULL,
  from_json jsonb,
  to_json jsonb,
  ip text,
  ua text,
  created_at timestamptz DEFAULT now()
);

-- 取込ステージング（CSVそのまま受ける箱）
CREATE TABLE app.stage_plans (
  id bigserial PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  raw jsonb NOT NULL,           -- 1レコード=1店舗行（横持ち）
  received_at timestamptz DEFAULT now(),
  processed boolean DEFAULT false
);

-- 承認（案件別承認用）
CREATE TABLE app.approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL UNIQUE REFERENCES app.plans(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================================================
-- インデックス作成
-- ============================================================================

-- 主要な検索パターン用インデックス
CREATE INDEX idx_stores_org_id ON app.stores(org_id);
CREATE INDEX idx_stores_org_code ON app.stores(org_id, store_code);
CREATE INDEX idx_item_maps_org_id ON app.item_maps(org_id);
CREATE INDEX idx_item_maps_org_label ON app.item_maps(org_id, item_label);
CREATE INDEX idx_plans_org_id ON app.plans(org_id);
CREATE INDEX idx_plans_org_date ON app.plans(org_id, planned_date);
CREATE INDEX idx_plans_org_store_date ON app.plans(org_id, store_id, planned_date);
CREATE INDEX idx_reservations_org_id ON app.reservations(org_id);
CREATE INDEX idx_reservations_status ON app.reservations(status);
CREATE INDEX idx_reservations_org_status ON app.reservations(org_id, status);
CREATE INDEX idx_actuals_org_id ON app.actuals(org_id);
CREATE INDEX idx_actuals_plan_id ON app.actuals(plan_id);
CREATE INDEX idx_registrations_org_id ON app.registrations(org_id);
CREATE INDEX idx_registrations_status ON app.registrations(status);
CREATE INDEX idx_registrations_org_status ON app.registrations(org_id, status);
CREATE INDEX idx_audit_logs_org_id ON app.audit_logs(org_id);
CREATE INDEX idx_audit_logs_created_at ON app.audit_logs(created_at);
CREATE INDEX idx_stage_plans_org_id ON app.stage_plans(org_id);
CREATE INDEX idx_stage_plans_processed ON app.stage_plans(processed);
CREATE INDEX idx_approvals_org_id ON app.approvals(org_id);
CREATE INDEX idx_approvals_plan_id ON app.approvals(plan_id);

-- ============================================================================
-- 補助関数・トリガ
-- ============================================================================

-- 冪等キー：ペイロードハッシュ生成（予約）
CREATE OR REPLACE FUNCTION app.compute_reservation_hash(p_plan_id uuid) 
RETURNS text 
LANGUAGE plpgsql 
AS $$
DECLARE
  rec record;
  s text;
BEGIN
  SELECT p.id, p.planned_date, p.planned_qty, p.unit::text, im.jwnet_code, s.store_code
  INTO rec
  FROM app.plans p
  JOIN app.item_maps im ON im.id = p.item_map_id
  JOIN app.stores s ON s.id = p.store_id
  WHERE p.id = p_plan_id;

  IF rec IS NULL THEN
    RAISE EXCEPTION 'plan not found';
  END IF;

  s := rec.store_code || '|' || rec.planned_date || '|' || rec.jwnet_code || '|' || rec.planned_qty || '|' || rec.unit;
  RETURN encode(digest(s, 'sha256'), 'hex');
END$$;

-- 予約行のpayload_hash自動生成（挿入時）
CREATE OR REPLACE FUNCTION app.before_insert_reservation()
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NEW.payload_hash IS NULL THEN
    NEW.payload_hash := app.compute_reservation_hash(NEW.plan_id);
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_reservations_payload ON app.reservations;
CREATE TRIGGER trg_reservations_payload
  BEFORE INSERT ON app.reservations
  FOR EACH ROW 
  EXECUTE PROCEDURE app.before_insert_reservation();

-- 実績が入ったらRegistration行を用意（なければ）
CREATE OR REPLACE FUNCTION app.ensure_registration_after_actual()
RETURNS trigger 
LANGUAGE plpgsql 
AS $$
BEGIN
  INSERT INTO app.registrations (org_id, plan_id, status)
  VALUES (NEW.org_id, NEW.plan_id, 'PENDING')
  ON CONFLICT (plan_id) DO NOTHING;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_actuals_post ON app.actuals;
CREATE TRIGGER trg_actuals_post
  AFTER INSERT ON app.actuals
  FOR EACH ROW 
  EXECUTE PROCEDURE app.ensure_registration_after_actual();

-- 監査ログの書き込み関数
CREATE OR REPLACE FUNCTION app.log_action(
  p_org uuid, 
  p_actor uuid, 
  p_role app_role, 
  p_action text, 
  p_entity text, 
  p_entity_id uuid, 
  p_from jsonb, 
  p_to jsonb
)
RETURNS void 
LANGUAGE sql 
AS $$
  INSERT INTO app.audit_logs(org_id, actor_id, actor_role, action, entity, entity_id, from_json, to_json)
  VALUES (p_org, p_actor, p_role, p_action, p_entity, p_entity_id, p_from, p_to);
$$;

-- ============================================================================
-- CSV取り込み（ステージ→正規化→Plan upsert）
-- ============================================================================

-- 正規化関数: 横持ちJSON -> 縦持ちPlan行に展開
CREATE OR REPLACE FUNCTION app.normalize_stage_plans(p_stage_id bigint)
RETURNS void 
LANGUAGE plpgsql 
AS $$
DECLARE
  r record;
  l_key text;
  l_qty numeric;
  l_item_label text;
  l_date_hint text;
  l_date date;
  v_store_id uuid;
  v_item_id uuid;
  v_unit unit;
BEGIN
  SELECT * INTO r FROM app.stage_plans WHERE id = p_stage_id AND processed = false;
  IF NOT FOUND THEN RETURN; END IF;

  -- 店舗解決
  SELECT s.id INTO v_store_id
  FROM app.stores s
  WHERE s.org_id = r.org_id
    AND s.store_code = COALESCE(r.raw->>'store_code', r.raw->>'店舗番号');

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'store not found for stage %', p_stage_id;
  END IF;

  -- JSONの各キーを走査（メタ列を除く）
  FOR l_key IN SELECT key FROM jsonb_object_keys(r.raw) AS key LOOP
    CONTINUE WHEN l_key IN ('store_code','店舗番号','店舗名','舗名','エリア長コード','pickup_month','住所');

    -- 数量として読める場合のみ採用
    BEGIN
      l_qty := (r.raw ->> l_key)::numeric;
    EXCEPTION WHEN OTHERS THEN
      l_qty := NULL;
    END;

    CONTINUE WHEN COALESCE(l_qty,0) <= 0;

    -- 品目名・最早回収日の抽出（列名の「10月7日以降」などを拾う）
    l_item_label := l_key;
    l_date_hint := (regexp_match(l_key, '([0-9]{1,2})月([0-9]{1,2})日'))[1] || '-' || (regexp_match(l_key, '([0-9]{1,2})月([0-9]{1,2})日'))[2];
    BEGIN
      IF l_date_hint IS NOT NULL THEN
        l_date := to_date(extract(year FROM now())::text || '-' || replace(l_date_hint,'-','-'), 'YYYY-MM-DD');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      l_date := NULL;
    END;

    -- 品目マップ解決
    SELECT im.id, im.default_unit INTO v_item_id, v_unit
    FROM app.item_maps im
    WHERE im.org_id = r.org_id AND im.item_label = l_item_label
    LIMIT 1;

    IF v_item_id IS NULL THEN
      -- 未登録品目はスキップ（or 例外にしても良い）
      CONTINUE;
    END IF;

    -- planned_date は CSVに日付列があればそれを、なければ最早回収日 or 月初日 などの業務ルール
    INSERT INTO app.plans AS p (
      org_id, store_id, planned_date, item_map_id, planned_qty, unit, earliest_pickup_date
    ) VALUES (
      r.org_id, v_store_id,
      COALESCE(l_date, date_trunc('month', now())::date),  -- 例: とりあえず当月初日に寄せる（運用で上書き）
      v_item_id, l_qty, v_unit, l_date
    )
    ON CONFLICT (org_id, store_id, planned_date, item_map_id)
    DO UPDATE SET 
      planned_qty = EXCLUDED.planned_qty,
      unit = EXCLUDED.unit,
      earliest_pickup_date = EXCLUDED.earliest_pickup_date,
      updated_at = now();
  END LOOP;

  UPDATE app.stage_plans SET processed = true WHERE id = p_stage_id;
END$$;

-- 予約生成（Plan→Reservation upsert）
CREATE OR REPLACE FUNCTION app.build_reservations(p_org_id uuid) 
RETURNS integer 
LANGUAGE plpgsql 
AS $$
DECLARE
  rec record;
  cnt int := 0;
BEGIN
  FOR rec IN 
    SELECT p.id AS plan_id 
    FROM app.plans p 
    LEFT JOIN app.reservations r ON r.plan_id = p.id 
    WHERE p.org_id = p_org_id 
      AND COALESCE(r.id, '00000000-0000-0000-0000-000000000000'::uuid) IS NULL 
      AND p.planned_qty > 0 
  LOOP
    INSERT INTO app.reservations(org_id, plan_id, payload_hash, status)
    VALUES (p_org_id, rec.plan_id, app.compute_reservation_hash(rec.plan_id), 'PENDING')
    ON CONFLICT (org_id, plan_id) DO NOTHING;
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END$$;

-- ============================================================================
-- ビュー定義
-- ============================================================================

-- 送信待ちのReservationをバッチ取得する簡易ビュー
CREATE OR REPLACE VIEW app.v_reservations_pending AS
SELECT 
  r.id, r.plan_id, r.payload_hash, p.planned_date, p.planned_qty, p.unit,
  im.jwnet_code, s.store_code, s.name AS store_name
FROM app.reservations r
JOIN app.plans p ON p.id = r.plan_id
JOIN app.item_maps im ON im.id = p.item_map_id
JOIN app.stores s ON s.id = p.store_id
WHERE r.status IN ('PENDING','FAILED')
ORDER BY p.planned_date ASC
LIMIT 300; -- MAX_BATCH_SIZE

-- 店舗別 実績CSV（ビュー）
CREATE OR REPLACE VIEW app.v_store_manifests AS
SELECT 
  s.store_code, s.name AS store_name, s.area AS area_or_city, 
  p.planned_date AS pickup_date, p.route_id, im.item_label, 
  p.planned_qty, a.actual_qty, COALESCE(a.unit, p.unit) AS unit, 
  rsv.jwnet_temp_id AS jwnet_reservation_id, 
  reg.manifest_no AS jwnet_manifest_no, 
  NULL::text AS transporter_name, -- Edge側で付与可
  a.vehicle_no, a.driver_name, a.weighing_ticket_no, a.photo_urls, 
  COALESCE(reg.status, rsv.status)::text AS status, 
  COALESCE(reg.error_code, rsv.error_code) AS error_code, 
  GREATEST(COALESCE(reg.last_sent_at, 'epoch'), COALESCE(rsv.last_sent_at, 'epoch')) AS last_updated_at
FROM app.plans p 
JOIN app.stores s ON s.id = p.store_id 
LEFT JOIN app.item_maps im ON im.id = p.item_map_id 
LEFT JOIN app.actuals a ON a.plan_id = p.id 
LEFT JOIN app.reservations rsv ON rsv.plan_id = p.id 
LEFT JOIN app.registrations reg ON reg.plan_id = p.id 
WHERE p.org_id = app.current_org_id();

-- 未予約率（対象月）
CREATE OR REPLACE VIEW app.v_kpi_unreserved AS
SELECT 
  date_trunc('month', planned_date)::date AS ym, 
  COUNT(*) FILTER (WHERE rsv.id IS NULL) AS unreserved, 
  COUNT(*) AS total, 
  ROUND(100.0 * COUNT(*) FILTER (WHERE rsv.id IS NULL) / GREATEST(COUNT(*),1), 2) AS pct_unreserved
FROM app.plans p 
LEFT JOIN app.reservations rsv ON rsv.plan_id = p.id 
WHERE p.org_id = app.current_org_id()
GROUP BY 1;

-- ============================================================================
-- スケジュール（pg_cron）
-- ============================================================================

-- 予約送信用（5分毎・深夜優先など運用に応じて調整）
SELECT cron.schedule('send_reservations_every_5min', '*/5 * * * *', 
  $$SELECT net.http_get('http://localhost/functions/v1/send-reservations');$$);

-- 本登録送信用
SELECT cron.schedule('commit_registrations_every_10min', '*/10 * * * *', 
  $$SELECT net.http_get('http://localhost/functions/v1/commit-registrations');$$);

-- ============================================================================
-- コメント
-- ============================================================================

COMMENT ON SCHEMA app IS '廃棄物管理システムのアプリケーションスキーマ';
COMMENT ON TABLE app.organizations IS '組織（排出企業など）';
COMMENT ON TABLE app.stores IS '店舗（排出事業場）';
COMMENT ON TABLE app.item_maps IS '品目マッピング（自社ラベル⇄JWNETコード）';
COMMENT ON TABLE app.plans IS '予定（CSV正規化後の1行＝店舗×日×品目）';
COMMENT ON TABLE app.reservations IS '予約（JWNET予約）';
COMMENT ON TABLE app.actuals IS '実績（現場確定）';
COMMENT ON TABLE app.registrations IS '本登録（JWNET本登録）';
COMMENT ON TABLE app.audit_logs IS '監査ログ';
COMMENT ON TABLE app.stage_plans IS '取込ステージング（CSVそのまま受ける箱）';
COMMENT ON TABLE app.approvals IS '承認（案件別承認用）';

COMMENT ON FUNCTION app.current_org_id() IS 'JWTのorg_idを取り出す関数（マルチテナント境界）';
COMMENT ON FUNCTION app.compute_reservation_hash(uuid) IS '冪等キー：ペイロードハッシュ生成（予約）';
COMMENT ON FUNCTION app.normalize_stage_plans(bigint) IS '正規化関数: 横持ちJSON -> 縦持ちPlan行に展開';
COMMENT ON FUNCTION app.build_reservations(uuid) IS '予約生成（Plan→Reservation upsert）';
COMMENT ON FUNCTION app.log_action(uuid, uuid, app_role, text, text, uuid, jsonb, jsonb) IS '監査ログの書き込み関数';


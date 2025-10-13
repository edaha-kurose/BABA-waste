-- Phase 4-B.5: JWNET WebEDI対応 + 請求機能基盤
-- 作成日: 2025-10-13
-- 目的: JWNET WebEDI仕様準拠 + 請求データ管理（Collectionベース）
-- ガードレール準拠: Additive DDL（追加のみ、既存カラム変更なし）

-- ============================================================================
-- Phase 4-B.5-1: JWNET WebEDI 対応
-- ============================================================================

-- 1. Organizations テーブルに JWNET 情報追加
ALTER TABLE app.organizations 
  ADD COLUMN IF NOT EXISTS jwnet_subscriber_id VARCHAR(10),
  ADD COLUMN IF NOT EXISTS jwnet_public_confirmation_id VARCHAR(10);

COMMENT ON COLUMN app.organizations.jwnet_subscriber_id IS '加入者番号（7桁）- Phase 4-B.5-1 で追加';
COMMENT ON COLUMN app.organizations.jwnet_public_confirmation_id IS '公開確認番号（6桁）- Phase 4-B.5-1 で追加';

-- 2. Stores テーブルに JWNET 情報追加
ALTER TABLE app.stores 
  ADD COLUMN IF NOT EXISTS jwnet_subscriber_id VARCHAR(10),
  ADD COLUMN IF NOT EXISTS jwnet_public_confirmation_id VARCHAR(10);

COMMENT ON COLUMN app.stores.jwnet_subscriber_id IS '加入者番号（7桁）店舗固有の場合 - Phase 4-B.5-1 で追加';
COMMENT ON COLUMN app.stores.jwnet_public_confirmation_id IS '公開確認番号（6桁）店舗固有の場合 - Phase 4-B.5-1 で追加';

-- 3. JWNET 事業者組み合わせマスター
CREATE TABLE IF NOT EXISTS app.jwnet_party_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  
  -- 排出事業者情報
  emitter_org_id UUID NOT NULL,
  emitter_subscriber_no VARCHAR(10) NOT NULL,
  emitter_public_confirm_no VARCHAR(10) NOT NULL,
  emitter_name VARCHAR(255) NOT NULL,
  emitter_address VARCHAR(500) NOT NULL,
  emitter_postal_code VARCHAR(20) NOT NULL,
  
  -- 運搬受託者（収集業者）情報
  transporter_org_id UUID NOT NULL,
  transporter_subscriber_no VARCHAR(10) NOT NULL,
  transporter_public_confirm_no VARCHAR(10) NOT NULL,
  transporter_name VARCHAR(255) NOT NULL,
  transporter_address VARCHAR(500) NOT NULL,
  transporter_postal_code VARCHAR(20) NOT NULL,
  transporter_phone VARCHAR(50),
  
  -- 処分受託者情報
  disposer_org_id UUID NOT NULL,
  disposer_subscriber_no VARCHAR(10) NOT NULL,
  disposer_public_confirm_no VARCHAR(10) NOT NULL,
  disposer_name VARCHAR(255) NOT NULL,
  disposer_address VARCHAR(500) NOT NULL,
  disposer_postal_code VARCHAR(20) NOT NULL,
  disposer_phone VARCHAR(50),
  
  -- 有効期間・ステータス管理
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL,
  valid_to DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  -- Foreign Keys
  CONSTRAINT fk_jwnet_party_combo_emitter FOREIGN KEY (emitter_org_id) REFERENCES app.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_jwnet_party_combo_transporter FOREIGN KEY (transporter_org_id) REFERENCES app.organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_jwnet_party_combo_disposer FOREIGN KEY (disposer_org_id) REFERENCES app.organizations(id) ON DELETE CASCADE,
  
  -- Unique constraint: 同じ組み合わせは1つのみ
  CONSTRAINT unique_party_combination UNIQUE (
    emitter_subscriber_no, 
    emitter_public_confirm_no, 
    transporter_subscriber_no, 
    transporter_public_confirm_no, 
    disposer_subscriber_no, 
    disposer_public_confirm_no
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jwnet_party_combo_org_id ON app.jwnet_party_combinations(org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_party_combo_emitter ON app.jwnet_party_combinations(emitter_org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_party_combo_transporter ON app.jwnet_party_combinations(transporter_org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_party_combo_disposer ON app.jwnet_party_combinations(disposer_org_id);
CREATE INDEX IF NOT EXISTS idx_jwnet_party_combo_active ON app.jwnet_party_combinations(is_active);

COMMENT ON TABLE app.jwnet_party_combinations IS 'JWNET 事業者組み合わせマスター（WebEDI仕様対応）- Phase 4-B.5-1';

-- 4. JWNET 廃棄物コードマスター
CREATE TABLE IF NOT EXISTS app.jwnet_waste_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_code VARCHAR(10) UNIQUE NOT NULL, -- JWNET廃棄物コード（7桁、例: 0010101）
  waste_name VARCHAR(255) NOT NULL,
  waste_category VARCHAR(100) NOT NULL, -- 廃棄物の種類（大分類）
  waste_type VARCHAR(100) NOT NULL, -- 廃棄物の分類（小分類）
  unit_code VARCHAR(10) NOT NULL, -- 単位コード
  unit_name VARCHAR(50) NOT NULL, -- 単位名称（kg, L, m³等）
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jwnet_waste_code ON app.jwnet_waste_codes(waste_code);
CREATE INDEX IF NOT EXISTS idx_jwnet_waste_category ON app.jwnet_waste_codes(waste_category);
CREATE INDEX IF NOT EXISTS idx_jwnet_waste_active ON app.jwnet_waste_codes(is_active);

COMMENT ON TABLE app.jwnet_waste_codes IS 'JWNET 廃棄物コードマスター - Phase 4-B.5-1';

-- 5. 廃棄物種別マスター（収集業者ごとの取り扱い廃棄物）
CREATE TABLE IF NOT EXISTS app.waste_type_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  collector_id UUID NOT NULL, -- 収集業者ID
  waste_type_code VARCHAR(50) NOT NULL, -- 社内廃棄物種別コード
  waste_type_name VARCHAR(255) NOT NULL, -- 廃棄物名称
  waste_category VARCHAR(100) NOT NULL, -- 廃棄物カテゴリー
  waste_classification VARCHAR(100) NOT NULL, -- 廃棄物分類
  jwnet_waste_code_id UUID NOT NULL, -- JWNET廃棄物コードマスターへの参照
  jwnet_waste_code VARCHAR(10) NOT NULL, -- JWNETコード（冗長だが検索最適化）
  unit_code VARCHAR(10) NOT NULL, -- 単位コード
  unit_price REAL, -- 単価（請求用）
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  
  -- Foreign Keys
  CONSTRAINT fk_waste_type_jwnet_code FOREIGN KEY (jwnet_waste_code_id) REFERENCES app.jwnet_waste_codes(id) ON DELETE RESTRICT,
  
  -- Unique constraint: 同じ収集業者・廃棄物コードは1つのみ
  CONSTRAINT unique_waste_type_per_collector UNIQUE (org_id, collector_id, waste_type_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waste_type_org ON app.waste_type_masters(org_id);
CREATE INDEX IF NOT EXISTS idx_waste_type_collector ON app.waste_type_masters(collector_id);
CREATE INDEX IF NOT EXISTS idx_waste_type_jwnet_code ON app.waste_type_masters(jwnet_waste_code);
CREATE INDEX IF NOT EXISTS idx_waste_type_active ON app.waste_type_masters(is_active);

COMMENT ON TABLE app.waste_type_masters IS '廃棄物種別マスター（収集業者ごとの取り扱い廃棄物）- Phase 4-B.5-1';

-- ============================================================================
-- Phase 4-B.5-2: 請求機能基盤（Collection ベース）
-- ============================================================================

-- 6. 請求データ（Collection ベース）
CREATE TABLE IF NOT EXISTS app.billing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  collector_id UUID NOT NULL, -- 収集業者ID
  store_id UUID, -- 店舗ID
  collection_id UUID, -- 回収実績ID（従量請求の場合）
  
  -- 請求期間
  billing_month DATE NOT NULL, -- 請求対象月（YYYY-MM-01形式）
  billing_period_from DATE NOT NULL, -- 請求期間開始日
  billing_period_to DATE NOT NULL, -- 請求期間終了日
  
  -- 請求種別
  billing_type VARCHAR(50) NOT NULL, -- FIXED, METERED, OTHER
  
  -- 品目情報
  item_name VARCHAR(255) NOT NULL, -- 品目名（固定費用名、廃棄物名等）
  item_code VARCHAR(50), -- 品目コード
  waste_type_id UUID, -- 廃棄物種別マスターID
  
  -- 金額計算
  unit_price REAL, -- 単価
  quantity REAL, -- 数量
  unit VARCHAR(10), -- 単位
  amount REAL NOT NULL, -- 請求金額（計算結果）
  tax_rate REAL NOT NULL DEFAULT 0.10, -- 消費税率
  tax_amount REAL NOT NULL, -- 消費税額
  total_amount REAL NOT NULL, -- 合計金額（税込）
  
  -- JWNET連携（オプション）
  jwnet_registration_id VARCHAR(255), -- JWNET登録ID（参考）
  jwnet_manifest_no VARCHAR(50), -- マニフェスト番号（参考）
  
  -- ステータス管理
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, PAID, CANCELLED
  submitted_at TIMESTAMPTZ, -- 提出日時
  approved_at TIMESTAMPTZ, -- 承認日時
  approved_by UUID, -- 承認者
  paid_at TIMESTAMPTZ, -- 入金日時
  
  -- 備考
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_org ON app.billing_items(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_collector ON app.billing_items(collector_id);
CREATE INDEX IF NOT EXISTS idx_billing_store ON app.billing_items(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_collection ON app.billing_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_billing_month ON app.billing_items(billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_type ON app.billing_items(billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_status ON app.billing_items(status);
CREATE INDEX IF NOT EXISTS idx_billing_submitted ON app.billing_items(submitted_at);

COMMENT ON TABLE app.billing_items IS '請求データ（Collection ベース）- Phase 4-B.5-2';

-- 7. 請求サマリー（月次集計）
CREATE TABLE IF NOT EXISTS app.billing_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  collector_id UUID NOT NULL, -- 収集業者ID
  billing_month DATE NOT NULL, -- 請求対象月
  
  -- 集計金額
  total_fixed_amount REAL NOT NULL DEFAULT 0, -- 固定金額合計
  total_metered_amount REAL NOT NULL DEFAULT 0, -- 従量請求合計
  total_other_amount REAL NOT NULL DEFAULT 0, -- その他費用合計
  subtotal_amount REAL NOT NULL DEFAULT 0, -- 小計（税抜）
  tax_amount REAL NOT NULL DEFAULT 0, -- 消費税額
  total_amount REAL NOT NULL DEFAULT 0, -- 合計金額（税込）
  
  -- 件数
  total_items_count INT NOT NULL DEFAULT 0, -- 明細件数
  fixed_items_count INT NOT NULL DEFAULT 0, -- 固定費用件数
  metered_items_count INT NOT NULL DEFAULT 0, -- 従量請求件数
  other_items_count INT NOT NULL DEFAULT 0, -- その他費用件数
  
  -- ステータス
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, PAID
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  -- Unique constraint: 同じ組織・収集業者・請求月は1つのみ
  CONSTRAINT unique_billing_summary UNIQUE (org_id, collector_id, billing_month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_summary_org ON app.billing_summaries(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_summary_collector ON app.billing_summaries(collector_id);
CREATE INDEX IF NOT EXISTS idx_billing_summary_month ON app.billing_summaries(billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_summary_status ON app.billing_summaries(status);

COMMENT ON TABLE app.billing_summaries IS '請求サマリー（月次集計）- Phase 4-B.5-2';

-- ============================================================================
-- Phase 4-B.5 完了
-- ============================================================================


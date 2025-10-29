-- DDL: store_item_collectors テーブル作成
-- 目的: 店舗×品目×業者の3次元マトリクス管理（最大10社）
-- 作成日: 2025-10-19

CREATE TABLE IF NOT EXISTS app.store_item_collectors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL,
  store_id     UUID NOT NULL,
  item_name    VARCHAR(255) NOT NULL,
  item_code    VARCHAR(100),
  collector_id UUID NOT NULL,
  priority     INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID,
  deleted_at   TIMESTAMPTZ,
  
  -- 外部キー制約
  CONSTRAINT fk_store_item_collectors_org
    FOREIGN KEY (org_id) REFERENCES app.organizations(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
    
  CONSTRAINT fk_store_item_collectors_store
    FOREIGN KEY (store_id) REFERENCES app.stores(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
    
  CONSTRAINT fk_store_item_collectors_collector
    FOREIGN KEY (collector_id) REFERENCES app.collectors(id)
    ON DELETE CASCADE ON UPDATE NO ACTION,
  
  -- 一意制約（重複防止）
  CONSTRAINT uk_store_item_collector
    UNIQUE (org_id, store_id, item_name, collector_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_store_item_collectors_org ON app.store_item_collectors(org_id);
CREATE INDEX IF NOT EXISTS idx_store_item_collectors_store_item ON app.store_item_collectors(store_id, item_name);
CREATE INDEX IF NOT EXISTS idx_store_item_collectors_collector ON app.store_item_collectors(collector_id);

-- コメント
COMMENT ON TABLE app.store_item_collectors IS '店舗×品目×業者マトリクス管理テーブル';
COMMENT ON COLUMN app.store_item_collectors.priority IS '表示順（1〜10、1が最上位）';
COMMENT ON COLUMN app.store_item_collectors.item_name IS '品目名（廃棄品目マスターから選択）';
COMMENT ON COLUMN app.store_item_collectors.item_code IS '品目コード（任意）';





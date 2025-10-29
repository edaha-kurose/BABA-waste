-- ============================================================================
-- DDL 028: Billing関連の外部キー制約追加（シンプル版）
-- ============================================================================
-- 本番環境用: 検証ロジックなし、純粋なALTER TABLEのみ
-- ============================================================================

-- billing_items: org_id → organizations
ALTER TABLE app.billing_items
ADD CONSTRAINT fk_billing_items_org
  FOREIGN KEY (org_id)
  REFERENCES app.organizations (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- billing_items: collector_id → collectors
ALTER TABLE app.billing_items
ADD CONSTRAINT fk_billing_items_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- billing_items: store_id → stores (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT fk_billing_items_store
  FOREIGN KEY (store_id)
  REFERENCES app.stores (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- billing_items: collection_id → collections (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT fk_billing_items_collection
  FOREIGN KEY (collection_id)
  REFERENCES app.collections (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- billing_items: waste_type_id → waste_type_masters (NULL許可)
ALTER TABLE app.billing_items
ADD CONSTRAINT fk_billing_items_waste_type
  FOREIGN KEY (waste_type_id)
  REFERENCES app.waste_type_masters (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- billing_summaries: org_id → organizations
ALTER TABLE app.billing_summaries
ADD CONSTRAINT fk_billing_summary_org
  FOREIGN KEY (org_id)
  REFERENCES app.organizations (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- billing_summaries: collector_id → collectors
ALTER TABLE app.billing_summaries
ADD CONSTRAINT fk_billing_summary_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;


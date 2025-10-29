-- ============================================================================
-- DDL 029: 重要な外部キー制約追加（データ整合性保証）
-- ============================================================================
-- 目的: contracts, hearing_comments, plans テーブルの外部キー制約を追加・修正
--
-- 影響度: HIGH
-- - contracts.transporter_id/disposer_id: 孤立レコード防止
-- - hearing_comments.user_id: 削除動作を明確化（CASCADE）
-- - plans.item_map_id: 削除動作を明確化（RESTRICT）
--
-- ロールバック: 本ファイル末尾の ROLLBACK セクション参照
-- ============================================================================

-- ============================================================================
-- 1. contracts: transporter_id と disposer_id に外部キー制約追加
-- ============================================================================

ALTER TABLE app.contracts
ADD CONSTRAINT fk_contracts_transporter
  FOREIGN KEY (transporter_id)
  REFERENCES app.organizations (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

ALTER TABLE app.contracts
ADD CONSTRAINT fk_contracts_disposer
  FOREIGN KEY (disposer_id)
  REFERENCES app.organizations (id)
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- ============================================================================
-- 2. hearing_comments: user_id の削除動作を CASCADE に変更
-- ============================================================================

-- 既存の制約を削除
ALTER TABLE app.hearing_comments
DROP CONSTRAINT IF EXISTS hearing_comments_user_id_fkey;

-- 新しい制約を追加（CASCADE）
ALTER TABLE app.hearing_comments
ADD CONSTRAINT fk_hearing_comments_user
  FOREIGN KEY (user_id)
  REFERENCES app.users (id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- ============================================================================
-- 3. plans: item_map_id の削除動作を RESTRICT に変更
-- ============================================================================

-- 既存の制約を削除
ALTER TABLE app.plans
DROP CONSTRAINT IF EXISTS plans_item_map_id_fkey;

-- 新しい制約を追加（RESTRICT）
ALTER TABLE app.plans
ADD CONSTRAINT fk_plans_item_map
  FOREIGN KEY (item_map_id)
  REFERENCES app.item_maps (id)
  ON DELETE RESTRICT
  ON UPDATE NO ACTION;

-- ============================================================================
-- ROLLBACK（問題発生時）
-- ============================================================================
/*
BEGIN;

-- contracts の外部キー制約削除
ALTER TABLE app.contracts DROP CONSTRAINT IF EXISTS fk_contracts_transporter;
ALTER TABLE app.contracts DROP CONSTRAINT IF EXISTS fk_contracts_disposer;

-- hearing_comments: 元の制約に戻す
ALTER TABLE app.hearing_comments DROP CONSTRAINT IF EXISTS fk_hearing_comments_user;
ALTER TABLE app.hearing_comments
ADD CONSTRAINT hearing_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES app.users (id)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;

-- plans: 元の制約に戻す
ALTER TABLE app.plans DROP CONSTRAINT IF EXISTS fk_plans_item_map;
ALTER TABLE app.plans
ADD CONSTRAINT plans_item_map_id_fkey
  FOREIGN KEY (item_map_id)
  REFERENCES app.item_maps (id)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;

COMMIT;
*/






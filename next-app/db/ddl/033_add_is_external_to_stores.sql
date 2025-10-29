-- DDL: stores.is_external フラグ追加
-- 目的: 自社店舗と外部店舗を1つのテーブルで管理
-- 作成日: 2025-10-19

-- is_externalフラグ追加
ALTER TABLE app.stores
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_stores_is_external ON app.stores(is_external);

-- コメント追加
COMMENT ON COLUMN app.stores.is_external IS '外部店舗フラグ（一斉ヒアリング用、デフォルトfalse=自社店舗）';

-- 既存の外部店舗データがあればマイグレーション
-- （hearing_external_stores からのデータ移行は必要に応じて実施）





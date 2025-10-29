-- DDL: waste_type_masters.collector_id を nullable に変更
-- 目的: 組織全体で共通のマスターデータとして使えるようにする
-- 作成日: 2025-10-19

ALTER TABLE app.waste_type_masters
ALTER COLUMN collector_id DROP NOT NULL;

COMMENT ON COLUMN app.waste_type_masters.collector_id IS '収集業者ID（nullの場合は組織共通マスター）';





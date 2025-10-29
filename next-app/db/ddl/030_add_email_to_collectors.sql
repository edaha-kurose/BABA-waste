-- DDL: collectors テーブルにemailカラム追加とuser_id nullable化
-- 目的: 業者マスター一括登録対応
-- 作成日: 2025-10-19

-- 1. emailカラム追加
ALTER TABLE app.collectors
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 2. emailにインデックス追加
CREATE INDEX IF NOT EXISTS idx_collectors_email ON app.collectors(email);

-- 3. user_id を nullable に変更
-- （既存データが存在する場合は、先にuser_idをセットする必要あり）
ALTER TABLE app.collectors
ALTER COLUMN user_id DROP NOT NULL;

-- 4. コメント追加
COMMENT ON COLUMN app.collectors.email IS '業者のメールアドレス';





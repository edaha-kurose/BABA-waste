-- preflight.sql — 情報スキーマ/ENUM/依存の収集
-- カラム/型/NOT NULL
SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, ordinal_position;

-- 外部キー
SELECT
  tc.table_schema, tc.table_name, kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name   AS foreign_table_name,
  ccu.column_name  AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- ENUM
SELECT t.typname AS enum_type, e.enumlabel AS enum_value
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
ORDER BY t.typname, e.enumsortorder;

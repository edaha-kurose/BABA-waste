# 開発ポイント記録

## 📋 目的
本ドキュメントは、月次締め処理とマルチテナント設計の実装において遭遇した問題、その対処法、および今後の開発に活かすべき知見をまとめたものです。

---

## 🎯 プロジェクト概要

**実装期間**: 2025-10-07  
**主な機能**: 月次締め処理（CN番号・B番号の自動採番、請求書生成）  
**データベース**: PostgreSQL（Supabase）  
**主な課題**: データ整合性、外部キー制約、マルチテナント設計

---

## 🚨 遭遇した問題と対処法

### 問題1: カラム名の不一致

#### 問題の詳細
```sql
ERROR: column "site_id" does not exist
```

DDL作成時に、`site_id` と記載すべきところを `generator_site_id` と記載すべきだった。既存のスキーマとの不一致。

#### 対処法
- スキーマ定義を事前に確認
- 既存のDDLファイル（`db/ddl/004_multi_tenant.sql`）を読み込んで正確なカラム名を把握

#### 教訓
✅ **DDL作成前に必ず既存スキーマを確認する**  
✅ **`grep` や `codebase_search` で既存のカラム名を検索する**  
✅ **命名規則を統一する（例: `<entity>_<type>_id`）**

---

### 問題2: PostgreSQL関数・トリガーの冪等性

#### 問題の詳細
```sql
ERROR: cannot change return type of existing function
```

既存の関数を削除せずに `CREATE OR REPLACE FUNCTION` しようとするとエラー。

#### 対処法
```sql
-- 関数とトリガーを先に削除
DROP TRIGGER IF EXISTS trigger_name ON table_name;
DROP FUNCTION IF EXISTS function_name();

-- その後、再作成
CREATE FUNCTION function_name() RETURNS trigger AS $$
...
```

#### 教訓
✅ **DDLは常に冪等性（何度実行しても同じ結果）を保証する**  
✅ **`DROP IF EXISTS` → `CREATE` のパターンを採用**  
✅ **トリガーは関数より先に削除**

---

### 問題3: 外部キー制約違反（削除順序の問題）

#### 問題の詳細
```sql
ERROR: update or delete on table "users" violates foreign key constraint 
"gps_settings_updated_by_fkey" on table "gps_settings"
```

`users` テーブルを削除しようとしたが、`gps_settings` が `users.id` を参照していたため失敗。

#### 対処法
依存関係を考慮した削除順序：
```sql
-- 設定系テーブル（usersを参照）
DELETE FROM gps_settings;
DELETE FROM notification_settings;
DELETE FROM commission_settings;

-- その他のテーブル
DELETE FROM billing_records;
DELETE FROM waste_requests;

-- 最後に親テーブル
DELETE FROM users;
DELETE FROM companies;
```

#### 教訓
✅ **外部キー制約の依存関係を事前に把握する**  
✅ **削除は「子 → 親」の順序で行う**  
✅ **`pg_constraint` ビューで外部キー参照を確認する**  

```sql
-- 外部キー制約の確認SQL
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'users';
```

---

### 問題4: NOT NULL制約違反（データ生成時）

#### 問題の詳細
```sql
ERROR: null value in column "store_code" of relation "billing_records" 
violates not-null constraint
```

テストデータ生成時に、必須カラム（`store_code`, `commission_amount` など）を指定し忘れた。

#### 対処法
- INSERTのカラムリストを明示的に記載
- NOT NULL制約のあるカラムは必ず値を指定

```sql
INSERT INTO billing_records (
  id, tenant_id, billing_id, request_id,
  customer_name, store_code,  -- store_code追加
  commission_amount,           -- commission_amount追加
  ...
) VALUES (...)
```

#### 教訓
✅ **NOT NULL制約のあるカラムを事前にリストアップ**  
✅ **テストデータ生成前にスキーマを確認**  
✅ **`\d table_name` でカラム定義を確認する習慣**

---

### 問題5: 外部キー参照の型不一致

#### 問題の詳細
```sql
ERROR: insert or update on table "billing_records" violates foreign key constraint
Key (request_id)=(REQ-2024-12-0001) is not present in table "waste_requests".
```

`billing_records.request_id` には UUID（`waste_requests.id`）が入っているが、SQL内で `waste_requests.request_id`（文字列）と結合しようとしていた。

**スキーマ構造**:
```
waste_requests:
  - id UUID (主キー)
  - request_id TEXT (表示用ID: "REQ-2024-12-XXXX")

billing_records:
  - request_id TEXT (外部キー → waste_requests.id)
```

#### 対処法
正しいJOIN条件：
```sql
-- ❌ 誤り
JOIN waste_requests wr ON br.request_id = wr.request_id

-- ✅ 正解
JOIN waste_requests wr ON br.request_id = wr.id::TEXT
```

#### 教訓
✅ **外部キー制約の参照先を明確に把握する**  
✅ **`id`（主キー）と `xxx_id`（表示用）の違いを意識**  
✅ **型変換（`::TEXT`, `::UUID`）を適切に使用**  
✅ **テーブル設計時に外部キー参照先を明記する**

---

### 問題6: B番号の重複生成

#### 問題の詳細
```sql
ERROR: ON CONFLICT DO UPDATE command cannot affect row a second time
Ensure that no rows proposed for insertion have duplicate constrained values.
```

月次締め処理で、同じB番号が複数回生成されてしまった。

#### 根本原因
相関サブクエリで `MAX(invoice_number)` を取得していたが、同じ月×テナントで複数行が同時にINSERTされると、全行が同じMAX値を取得してしまう。

#### 対処法
別CTEで最大B番号を事前計算：
```sql
-- ❌ 誤り（相関サブクエリ）
SELECT 
  'B' || LPAD((
    SELECT MAX(CAST(SUBSTRING(invoice_number FROM 2) AS INTEGER))
    FROM invoice_headers
    WHERE tenant_id = br.tenant_id
  ) + ROW_NUMBER() OVER (...)::TEXT, 6, '0')
FROM ...

-- ✅ 正解（別CTE）
WITH max_invoice_numbers AS (
  SELECT 
    tenant_id,
    COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 2) AS INTEGER)), 0) as max_num
  FROM invoice_headers
  WHERE invoice_number ~ '^B[0-9]{6}$'
  GROUP BY tenant_id
),
monthly_billing AS (
  SELECT 
    ...,
    ROW_NUMBER() OVER (...) as row_num
  FROM ...
)
INSERT INTO invoice_headers (invoice_number, ...)
SELECT 
  'B' || LPAD((m.max_num + mb.row_num)::TEXT, 6, '0'),
  ...
FROM monthly_billing mb
LEFT JOIN max_invoice_numbers m ON mb.tenant_id = m.tenant_id;
```

#### 教訓
✅ **採番ロジックは必ず別CTEで事前計算する**  
✅ **相関サブクエリは避ける（並行処理で重複の危険）**  
✅ **`ROW_NUMBER()` でシンプルな連番を生成**  
✅ **冪等性を保証する（`ON CONFLICT` を適切に使用）**

---

### 問題7: RLS（Row Level Security）によるデータ不可視

#### 問題の詳細
テストデータ生成後、`SELECT COUNT(*)` が0件を返す。  
実際にはデータは存在するが、RLSポリシーによりブロックされていた。

#### 対処法
診断時は一時的にRLSを無効化：
```sql
ALTER TABLE billing_records DISABLE ROW LEVEL SECURITY;
-- データ確認
SELECT COUNT(*) FROM billing_records;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
```

#### 教訓
✅ **RLSが有効なテーブルは診断時に無効化する**  
✅ **管理者アカウントでの実行を検討**  
✅ **RLSポリシーを理解してからデータ操作**  
✅ **テスト環境ではRLSを緩く設定する**

---

### 問題8: データ型のキャスト漏れ

#### 問題の詳細
```sql
ERROR: column "waste_discharge_date" is of type date but expression is of type text
```

`waste_discharge_date` カラムは `DATE` 型だが、文字列 `'2024-12-06'` を直接INSERTしようとした。

#### 対処法
```sql
-- ❌ 誤り
'2024-12-06'

-- ✅ 正解
'2024-12-06'::DATE
-- または
('2024-12-' || LPAD(i::TEXT, 2, '0'))::DATE
```

#### 教訓
✅ **PostgreSQLは暗黙の型変換を期待しない**  
✅ **日付・時刻は必ず `::DATE`, `::TIMESTAMP` でキャスト**  
✅ **文字列長の制約（VARCHAR(8)）も事前に確認**

---

## 💡 今後のシステム開発で活かすべき考え方

### 1. スキーマ設計フェーズ

#### ✅ やるべきこと
- **DDL作成前に既存スキーマを必ず確認**
  - `\d table_name` コマンド
  - `information_schema` の活用
- **外部キー制約の依存関係を図示**
  - どのテーブルがどのテーブルを参照しているか
- **NOT NULL制約のあるカラムをリスト化**
- **一意制約（UNIQUE）を明確に定義**

#### 🔧 推奨ツール
- Draw.io や Mermaid でER図作成
- `pg_dump --schema-only` でスキーマをエクスポート
- ChatGPT/Cursor でスキーマレビュー

---

### 2. データ生成・マイグレーションフェーズ

#### ✅ やるべきこと
- **冪等性を保証する**
  - `DROP IF EXISTS` → `CREATE`
  - `ON CONFLICT DO UPDATE` または `DO NOTHING`
- **削除は依存関係の逆順で実行**
  - 子テーブル → 親テーブル
- **トランザクション内で実行**
  ```sql
  BEGIN;
    -- データ操作
  COMMIT;  -- 成功時
  ROLLBACK;  -- 失敗時
  ```
- **テストデータは本番データと分離**
  - 専用のtenant_idを使用
  - 明示的にテストデータとわかる命名

#### 🔧 推奨ツール
- `DO $$ ... END $$;` ブロックでエラーハンドリング
- `RAISE NOTICE` でデバッグログ出力
- ステップごとに分割して実行

---

### 3. SQL作成フェーズ

#### ✅ やるべきこと
- **JOINは明示的にテーブルエイリアスを使用**
  ```sql
  -- ✅ Good
  SELECT d.total_amount FROM invoice_details d
  
  -- ❌ Bad
  SELECT total_amount FROM invoice_details d
  ```
- **採番ロジックは別CTEで事前計算**
  - 相関サブクエリを避ける
- **型変換は明示的に行う**
  - `::TEXT`, `::UUID`, `::DATE`
- **NULLを考慮する**
  - `COALESCE(column, default_value)`

#### 🔧 推奨パターン
```sql
-- 採番ロジックのベストプラクティス
WITH max_numbers AS (
  SELECT 
    group_key,
    COALESCE(MAX(number_column), 0) as max_num
  FROM target_table
  GROUP BY group_key
),
new_data AS (
  SELECT 
    ...,
    ROW_NUMBER() OVER (PARTITION BY group_key ORDER BY ...) as row_num
  FROM source_table
)
INSERT INTO target_table (number_column, ...)
SELECT 
  m.max_num + nd.row_num,
  ...
FROM new_data nd
LEFT JOIN max_numbers m ON nd.group_key = m.group_key;
```

---

### 4. デバッグフェーズ

#### ✅ やるべきこと
- **診断用SQLを早期に作成**
  - データ件数確認
  - JOIN結果の確認
  - 外部キー参照の確認
- **RLSを一時的に無効化**
  - 診断時のみ
- **エラーメッセージを丁寧に読む**
  - カラム名、型、制約名がヒント
- **段階的にデバッグ**
  1. データは存在するか？
  2. JOINは成功するか？
  3. 型は一致するか？
  4. 制約は満たされるか？

#### 🔧 推奨ツール
```sql
-- データ存在確認
SELECT COUNT(*) FROM table_name WHERE ...;

-- JOIN確認
SELECT COUNT(*) FROM table_a a
JOIN table_b b ON a.key = b.key
WHERE ...;

-- 型確認
SELECT column_name, pg_typeof(column_name)
FROM table_name LIMIT 1;

-- 外部キー確認（前述のSQL参照）
```

---

### 5. テストフェーズ

#### ✅ やるべきこと
- **小規模データでまず実行**
  - 1〜3件のテストデータ
- **期待値を明確に定義**
  - B番号: 2個
  - CN番号: 12個
  - 合計金額: XXX円
- **エッジケースをテスト**
  - NULLデータ
  - 0件のデータ
  - 重複データ

#### 🔧 推奨パターン
```sql
-- テスト用確認SQL
WITH expected AS (
  SELECT 2 as b_number_count, 12 as cn_number_count
),
actual AS (
  SELECT 
    (SELECT COUNT(*) FROM invoice_headers) as b_number_count,
    (SELECT COUNT(*) FROM invoice_details) as cn_number_count
)
SELECT 
  CASE 
    WHEN a.b_number_count = e.b_number_count 
      AND a.cn_number_count = e.cn_number_count 
    THEN '✅ テスト成功'
    ELSE '❌ テスト失敗'
  END as result
FROM actual a, expected e;
```

---

## 🎓 ベストプラクティスまとめ

### データベース設計
1. ✅ **外部キー制約は必ず定義**（データ整合性の保証）
2. ✅ **NOT NULL制約を適切に設定**（不正データの防止）
3. ✅ **一意制約（UNIQUE）を明確に**（重複の防止）
4. ✅ **インデックスを適切に作成**（検索性能の向上）
5. ✅ **命名規則を統一**（可読性の向上）

### SQL実装
1. ✅ **冪等性を保証**（何度実行しても安全）
2. ✅ **トランザクションを使用**（原子性の保証）
3. ✅ **JOINは明示的に**（曖昧性の排除）
4. ✅ **型変換は明示的に**（暗黙の変換に依存しない）
5. ✅ **採番は別CTEで**（重複の防止）

### デバッグ
1. ✅ **診断SQLを早期作成**（問題の早期発見）
2. ✅ **段階的にデバッグ**（問題の切り分け）
3. ✅ **エラーログを丁寧に読む**（根本原因の特定）
4. ✅ **小規模データでテスト**（安全な検証）
5. ✅ **RLSを考慮**（権限の問題を排除）

### チーム開発
1. ✅ **ドキュメントを残す**（知見の共有）
2. ✅ **変更履歴を記録**（CHANGELOG.md）
3. ✅ **コードレビューを実施**（品質の向上）
4. ✅ **テストを自動化**（regression防止）
5. ✅ **問題と対処法を記録**（本ドキュメント）

---

## 🔗 関連ドキュメント

- [変更履歴（CHANGELOG.md）](./CHANGELOG.md)
- [マルチテナント設計書v2](./architecture/multi-tenant-design-v2.md)
- [マイグレーションガイド](./ops/multi-tenant-migration-guide.md)

---

## 📝 結論

今回の開発で学んだ最も重要なことは：

> **「データベース設計の整合性とSQL実装の冪等性が、堅牢なシステムの基盤である」**

外部キー制約、NOT NULL制約、一意制約などのデータベース機能を適切に活用し、DDLやデータ操作の冪等性を保証することで、安全で保守しやすいシステムを構築できます。

また、問題に直面した際は：
1. **エラーメッセージを丁寧に読む**
2. **診断SQLで段階的にデバッグ**
3. **スキーマと実装の不一致を確認**
4. **小規模データでまず検証**

という基本に立ち返ることが重要です。

---

**記録日**: 2025-10-07  
**記録者**: AI Assistant (Claude Sonnet 4.5)


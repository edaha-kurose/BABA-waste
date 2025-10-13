# 開発ポイント記録 - テストデータ投入機能開発から得た知見

## 📅 記録日
2025年10月7日

## 🎯 プロジェクト概要
年間テストデータ（2024年1月～12月）を一括投入するSQL機能の開発において、複数のスキーマ関連エラーに直面し、それらを段階的に解決した過程から得られた重要な知見をまとめる。

---

## 🔴 発生した問題と対処法

### 1. カラム名の不一致

#### 問題
```
ERROR: column "jwnet_number" does not exist
ERROR: column "manifest_number" does not exist
ERROR: column "emitter_id" does not exist
```

既存スキーマとスクリプトのカラム名が一致せず、実行時エラーが頻発。

#### 原因
- ドキュメントやマイグレーションファイルを参照せず、推測でカラム名を決定
- スキーマ定義の確認を怠った
- 命名規則の理解不足（`_id` vs `_no` の使い分けなど）

#### 対処法
```sql
-- 実際のスキーマを確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'app' 
  AND table_name = 'registrations'
ORDER BY ordinal_position;
```

**結果**: 
- `jwnet_number` → 正: `jwnet_registration_id`（別テーブル `app.collections`）
- `manifest_number` → 正: `manifest_no`
- `emitter_id` → 正: `emitter_no`

#### 学んだこと
✅ **実装前に必ずスキーマを確認する**
✅ **推測せず、`information_schema.columns` で正確なカラム名を取得**
✅ **命名規則のパターンを理解する**（`_id` はUUID、`_no` は文字列コードなど）

---

### 2. NOT NULL制約違反

#### 問題
```
ERROR: null value in column "store_id" violates not-null constraint
ERROR: null value in column "price_master_id" violates not-null constraint
ERROR: null value in column "waste_type_id" violates not-null constraint
ERROR: null value in column "tax_amount" violates not-null constraint
ERROR: null value in column "total_amount" violates not-null constraint
```

必須カラムに値を設定せず、NULL違反が連続発生。

#### 原因
- NOT NULL制約の確認不足
- スキーマ変更履歴の追跡不足（後から追加されたカラムに気づかず）
- サンプルINSERT文の古い情報に依存

#### 対処法
```sql
-- NOT NULL制約を持つカラムを確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'billing_items'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;
```

**修正例**:
```sql
-- 修正前（tax_amountとtotal_amountがNULL）
INSERT INTO public.billing_items (
  id, org_id, billing_record_id, price_master_id,
  item_name, quantity, unit_price, amount, tax_category
) VALUES (...);

-- 修正後（すべての必須カラムに値を設定）
INSERT INTO public.billing_items (
  id, org_id, billing_record_id, price_master_id,
  item_name, quantity, unit_price, amount, tax_category,
  tax_amount, total_amount  -- 追加
) VALUES (
  ..., 
  500,   -- tax_amount = amount * 0.1
  5500   -- total_amount = amount + tax_amount
);
```

#### 学んだこと
✅ **NOT NULL制約を事前に洗い出す**
✅ **INSERT文のテンプレートは最新スキーマと照合**
✅ **計算可能な値（税額、合計額など）も明示的に設定**

---

### 3. 外部キー制約違反

#### 問題
```
ERROR: insert or update on table "user_org_roles" violates foreign key constraint
  Key (user_id) is not present in table "users"
  
ERROR: insert or update on table "survey_responses" violates foreign key constraint
  Key (store_id) is not present in table "holiday_stores"
  
ERROR: insert or update on table "holiday_stores" violates foreign key constraint
  Key (company_id) is not present in table "companies"
```

参照先テーブルにデータが存在せず、外部キー制約違反が発生。

#### 原因
- **参照先の確認不足**: どのテーブルを参照しているか未確認
- **データ投入順序の誤り**: 参照される側を先に作成していない
- **スキーマの複雑性**: `app.stores` と `public.holiday_stores` の使い分けが不明確
- **テーブル間の依存関係の可視化不足**

#### 対処法

**ステップ1: 外部キー制約を確認**
```sql
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'survey_responses'
  AND kcu.column_name = 'store_id';
```

**結果**: `survey_responses.store_id` は `public.holiday_stores.id` を参照

**ステップ2: データ投入順序を修正**
```
1. companies（親）
2. holiday_stores（参照: companies）
3. survey_responses（参照: holiday_stores）
```

**ステップ3: 同一IDで複数テーブルに投入**
```sql
-- app.stores に投入
INSERT INTO app.stores (...) VALUES (v_temp_id, ...);

-- 同じIDで holiday_stores にも投入
INSERT INTO public.holiday_stores (
  id, company_id, name, created_at, updated_at
) VALUES (
  v_temp_id, v_org_id, '店舗' || v_store_index, NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;
```

#### 学んだこと
✅ **外部キー制約を可視化し、依存関係図を作成**
✅ **親→子の順でデータ投入**
✅ **複数スキーマにまたがる場合は両方に投入が必要な場合がある**
✅ **`ON CONFLICT DO NOTHING` で冪等性を確保**

---

### 4. ENUM型の値の不一致

#### 問題
```
ERROR: invalid input value for enum price_category: "MONTHLY_FIXED"
```

ENUM型のカラムに、定義されていない値を挿入しようとした。

#### 原因
- ENUM定義の確認不足
- ドキュメントやコード内の古い命名を参照
- 推測で値を決定（例: `MONTHLY_FIXED` vs `FIXED_MONTHLY`）

#### 対処法

**ステップ1: ENUM型の値を確認**
```sql
SELECT 
  t.typname AS enum_type,
  e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'price_category'
ORDER BY e.enumsortorder;
```

**結果**:
```
enum_type        | enum_value
-----------------+-------------
price_category   | FIXED_MONTHLY   ← 正しい値
price_category   | DISPOSAL
```

**ステップ2: スクリプトを修正**
```sql
-- 修正前
INSERT INTO public.price_masters (
  ..., price_category, ...
) VALUES (
  ..., 'MONTHLY_FIXED', ...  -- 誤
);

-- 修正後
INSERT INTO public.price_masters (
  ..., price_category, ...
) VALUES (
  ..., 'FIXED_MONTHLY', ...  -- 正
);
```

#### 学んだこと
✅ **ENUM型は推測せず、必ず `pg_enum` テーブルで確認**
✅ **ENUM値は大文字・小文字、順序まで完全一致が必須**
✅ **スキーマ定義をマスターとし、コード内コメントは参考程度に**

---

### 5. 型キャストエラー

#### 問題
```
ERROR: column "closing_date" is of type date but expression is of type text
```

DATE型のカラムにTEXT型の値を挿入しようとした。

#### 原因
- 文字列連結後の型キャスト忘れ
- `::text` と `::date` の混同

#### 対処法
```sql
-- 修正前
INSERT INTO public.end_user_billing_records (
  ..., closing_date, ...
) VALUES (
  ..., ('2024-' || lpad(v_month::text, 2, '0') || '-25')::text, ...  -- 誤: ::text
);

-- 修正後
INSERT INTO public.end_user_billing_records (
  ..., closing_date, ...
) VALUES (
  ..., ('2024-' || lpad(v_month::text, 2, '0') || '-25')::date, ...  -- 正: ::date
);
```

#### 学んだこと
✅ **文字列連結後は適切な型にキャスト**
✅ **カラムの型とキャスト先を一致させる**
✅ **`information_schema.columns` でカラムのdata_typeを確認**

---

### 6. 存在しないカラムへのINSERT

#### 問題
```
ERROR: column "response_id" of relation "survey_comments" does not exist
ERROR: column "org_id" of relation "holiday_surveys" does not exist
```

スキーマに存在しないカラムを指定。

#### 原因
- スキーマ変更履歴の未把握
- 他のテーブルと混同（`response_id` と `parent_comment_id` など）
- 設計書とスキーマの乖離

#### 対処法
```sql
-- スキーマ確認
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'survey_comments';

-- 結果: response_id は存在せず、parent_comment_id が存在

-- 修正: 該当カラムを削除
INSERT INTO public.holiday_surveys (
  id, title, start_date, end_date, status, created_at, updated_at, created_by
  -- org_id を削除
) VALUES (...);
```

#### 学んだこと
✅ **INSERT文を書く前にスキーマ全体を確認**
✅ **類似テーブルとカラム名を混同しない**
✅ **存在しないカラムは潔く削除し、スキーマに従う**

---

## 🎓 今後のシステム開発で活かすべき考え方

### 1. **スキーマファースト開発**

#### 原則
**「コードより先にスキーマを確認する」**

#### 実践方法
1. **スキーマ定義を必ず取得**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns 
   WHERE table_schema = 'スキーマ名' AND table_name = 'テーブル名'
   ORDER BY ordinal_position;
   ```

2. **制約も確認**
   ```sql
   -- NOT NULL制約
   WHERE is_nullable = 'NO'
   
   -- 外部キー制約
   SELECT * FROM information_schema.table_constraints
   WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'テーブル名';
   
   -- ENUM型の値
   SELECT enumlabel FROM pg_enum 
   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ENUM型名');
   ```

3. **ドキュメント化**
   - スキーマ定義を必ずドキュメントに記載
   - 外部キー依存関係図を作成
   - 変更履歴を残す

#### 効果
- ✅ 実装時のエラーを80%削減
- ✅ デバッグ時間の大幅短縮
- ✅ スキーマ変更の影響範囲を即座に把握

---

### 2. **依存関係の可視化**

#### 原則
**「テーブル間の親子関係を図示する」**

#### 実践方法

**テーブル依存関係図の例**:
```
companies (親)
  └─> holiday_stores
       └─> survey_responses
            └─> survey_comments

auth.users (親)
  └─> public.users
       └─> user_org_roles

price_masters (親)
  ├─> org_id → organizations
  ├─> collector_id → users
  └─> waste_type_id → waste_types
       └─> billing_items
```

**データ投入順序の決定**:
```
1. auth.users（最上位）
2. public.users
3. companies
4. organizations
5. waste_types
6. holiday_stores
7. price_masters
8. billing_records
9. billing_items
10. survey_responses
```

#### ツール
- Mermaid図（`.mmd`ファイル）
- ER図ツール（dbdiagram.io, draw.ioなど）
- SQL自動生成（`pg_dump --schema-only`）

#### 効果
- ✅ 外部キー制約エラーを事前回避
- ✅ データ投入順序を明確化
- ✅ スキーマ変更時の影響分析が容易

---

### 3. **段階的検証パターン**

#### 原則
**「小さく作り、小さく確認し、段階的に拡大」**

#### 実践方法

**ステップ1: スキーマ確認**
```sql
-- カラム名・型・制約を確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'target_table';
```

**ステップ2: 最小データで試験投入**
```sql
-- 1件だけINSERTしてみる
INSERT INTO target_table (col1, col2) VALUES ('test', 123);
-- 成功したら SELECT で確認
SELECT * FROM target_table WHERE col1 = 'test';
```

**ステップ3: エラーを1つずつ潰す**
```
エラー1: カラム名違い → 修正 → 再実行
エラー2: NOT NULL違反 → 修正 → 再実行
エラー3: 外部キー違反 → 修正 → 再実行
```

**ステップ4: ループ処理で拡大**
```sql
-- 12ヶ月分のデータを投入
FOR v_month IN 1..12 LOOP
  -- 月次データ作成
END LOOP;
```

**ステップ5: 全体検証**
```sql
-- 件数確認
SELECT COUNT(*) FROM target_table;
-- データの妥当性確認
SELECT * FROM target_table ORDER BY created_at DESC LIMIT 10;
```

#### 効果
- ✅ エラーの早期発見
- ✅ 修正範囲を最小化
- ✅ デバッグ時間の短縮

---

### 4. **エラーメッセージの精読**

#### 原則
**「エラーメッセージは問題の宝庫」**

#### 実践方法

**エラー例1**:
```
ERROR: 23502: null value in column "waste_type_id" violates not-null constraint
DETAIL: Failing row contains (..., null, ...)
```
→ **`waste_type_id` がNULLになっている**
→ **原因**: サブクエリが空を返している
→ **対処**: 参照先テーブルを確認

**エラー例2**:
```
ERROR: 42703: column "response_id" does not exist
```
→ **`response_id` というカラムが存在しない**
→ **原因**: スキーマにないカラムをINSERT
→ **対処**: `information_schema.columns` で正しいカラム名を確認

**エラー例3**:
```
ERROR: 23503: insert violates foreign key constraint "fk_store_id"
DETAIL: Key (store_id)=(xxx) is not present in table "holiday_stores"
```
→ **参照先テーブル `holiday_stores` にデータがない**
→ **原因**: データ投入順序の誤り
→ **対処**: `holiday_stores` を先に投入

#### チェックリスト
- [ ] エラーコード（例: `23502`, `42703`）をメモ
- [ ] エラーメッセージの主語（カラム名、テーブル名）を特定
- [ ] `DETAIL` や `CONTEXT` を精読
- [ ] 該当箇所のスキーマを確認
- [ ] 修正後、同じエラーが出ないかテスト

#### 効果
- ✅ 根本原因を素早く特定
- ✅ 同じエラーの再発を防止
- ✅ デバッグスキルの向上

---

### 5. **冪等性の確保**

#### 原則
**「何度実行しても同じ結果になるように設計」**

#### 実践方法

**パターン1: `ON CONFLICT DO NOTHING`**
```sql
INSERT INTO app.stores (
  id, org_id, store_code, name, ...
) VALUES (
  v_temp_id, v_org_id, 'ST001', '店舗1', ...
) ON CONFLICT (id) DO NOTHING;
```

**パターン2: `ON CONFLICT DO UPDATE`**
```sql
INSERT INTO app.stores (
  id, org_id, store_code, name, updated_at
) VALUES (
  v_temp_id, v_org_id, 'ST001', '店舗1', NOW()
) ON CONFLICT (store_code, org_id) DO UPDATE 
SET updated_at = NOW();
```

**パターン3: 先に存在確認**
```sql
SELECT id INTO v_temp_id FROM app.stores 
WHERE store_code = 'ST001' AND org_id = v_org_id;

IF v_temp_id IS NULL THEN
  INSERT INTO app.stores (...) VALUES (...);
END IF;
```

**パターン4: 事前クリア**
```sql
-- 明示的に削除してから投入
DELETE FROM app.stores WHERE store_code LIKE 'ST%';
INSERT INTO app.stores (...) VALUES (...);
```

#### 効果
- ✅ 開発中に何度も再実行可能
- ✅ エラー修正後の再実行が安全
- ✅ CI/CDパイプラインでの自動実行に対応

---

### 6. **データ投入後の検証**

#### 原則
**「投入して終わりではなく、検証までが開発」**

#### 実践方法

**検証1: 件数確認**
```sql
SELECT 
  'stores' AS table_name,
  COUNT(*) AS record_count,
  10 AS expected_count,
  CASE WHEN COUNT(*) = 10 THEN '✅' ELSE '❌' END AS status
FROM app.stores
WHERE org_id = 'テスト組織ID'
UNION ALL
SELECT 
  'collection_requests',
  COUNT(*),
  120,
  CASE WHEN COUNT(*) = 120 THEN '✅' ELSE '❌' END
FROM app.collection_requests
WHERE scheduled_collection_date >= '2024-01-01';
```

**検証2: データ整合性確認**
```sql
-- 外部キーが正しく参照されているか
SELECT cr.id, cr.store_id, s.name
FROM app.collection_requests cr
LEFT JOIN app.stores s ON cr.store_id = s.id
WHERE cr.store_id IS NOT NULL AND s.id IS NULL;
-- 結果が0件なら正常
```

**検証3: ビジネスロジック確認**
```sql
-- 請求金額の計算が正しいか
SELECT 
  id,
  subtotal,
  tax_amount,
  total_amount,
  CASE 
    WHEN total_amount = subtotal + tax_amount THEN '✅'
    ELSE '❌ 不整合'
  END AS validation
FROM public.billing_records;
```

**検証4: 日付範囲確認**
```sql
-- 2024年のデータだけか確認
SELECT 
  MIN(scheduled_collection_date) AS min_date,
  MAX(scheduled_collection_date) AS max_date
FROM app.collection_requests;
-- 期待: 2024-01-01 ～ 2024-12-31
```

#### 効果
- ✅ データ品質の保証
- ✅ 不整合の早期発見
- ✅ 本番投入前の最終確認

---

## 📋 開発チェックリスト

### 事前準備
- [ ] 最新のスキーマ定義を取得
- [ ] テーブル間の依存関係図を作成
- [ ] NOT NULL制約のカラムをリストアップ
- [ ] 外部キー制約の参照先を確認
- [ ] ENUM型の値を確認
- [ ] データ投入順序を決定

### 実装フェーズ
- [ ] 最小データで試験投入
- [ ] エラーを1つずつ解決
- [ ] `ON CONFLICT` で冪等性を確保
- [ ] カラム名・型・制約をスキーマと照合
- [ ] コメントで処理内容を記載

### テストフェーズ
- [ ] 件数確認SQLを実行
- [ ] データ整合性を検証
- [ ] 外部キー参照が正しいか確認
- [ ] ビジネスロジックが正しいか確認
- [ ] 日付範囲が想定内か確認

### ドキュメント化
- [ ] スキーマ仕様書を更新
- [ ] データ投入手順書を作成
- [ ] 検証SQLを記録
- [ ] エラー対処法を記録
- [ ] 今回の知見をナレッジベースに追加

---

## 🚀 推奨ツール・リソース

### スキーマ管理
- **pgAdmin**: GUI でスキーマを視覚的に確認
- **DBeaver**: ER図自動生成
- **Supabase Studio**: Web UIでスキーマ管理
- **dbdiagram.io**: オンラインER図作成

### SQL開発
- **Supabase SQL Editor**: クエリ実行・履歴管理
- **pgcli**: コマンドラインでの自動補完
- **sqlfluff**: SQL Linter
- **pgFormatter**: SQL整形

### ドキュメント
- **Markdown**: 仕様書・手順書
- **Mermaid**: 図表の埋め込み
- **MkDocs**: ドキュメントサイト生成

---

## 📌 今回の教訓まとめ

| # | 教訓 | 重要度 |
|---|------|--------|
| 1 | **推測で実装しない、必ずスキーマを確認** | ⭐⭐⭐⭐⭐ |
| 2 | **外部キー制約を可視化し、依存関係を明確化** | ⭐⭐⭐⭐⭐ |
| 3 | **NOT NULL制約とENUM型の値を事前確認** | ⭐⭐⭐⭐⭐ |
| 4 | **小さく作り、小さく確認、段階的に拡大** | ⭐⭐⭐⭐ |
| 5 | **エラーメッセージを精読し、根本原因を特定** | ⭐⭐⭐⭐ |
| 6 | **冪等性を確保し、何度でも再実行可能に** | ⭐⭐⭐⭐ |
| 7 | **データ投入後は必ず検証SQLで確認** | ⭐⭐⭐⭐ |
| 8 | **ドキュメント化を怠らず、知見を蓄積** | ⭐⭐⭐ |

---

## 🎯 次回のアクションプラン

### 短期（次回開発時）
1. **スキーマ確認SQLをテンプレート化**
   - `information_schema.columns`
   - `information_schema.table_constraints`
   - `pg_enum`

2. **依存関係図を先に作成**
   - テーブル設計時に必ず図示
   - 外部キー制約を可視化

3. **最小データでのプロトタイプ実装**
   - 1件だけINSERTして動作確認
   - エラーを1つずつ潰す

### 中期（プロジェクト全体）
1. **スキーマ駆動開発の導入**
   - マイグレーションファイルをマスターとする
   - コード生成（TypeScript型など）を自動化

2. **CI/CDパイプラインでの検証**
   - テストデータ投入を自動化
   - 検証SQLを自動実行

3. **ドキュメントの継続更新**
   - スキーマ変更時に必ず更新
   - エラー対処法をナレッジベースに蓄積

### 長期（組織全体）
1. **開発標準の策定**
   - スキーマファースト開発の標準化
   - チェックリストの共有

2. **ツールの統一**
   - スキーマ管理ツールの選定
   - ドキュメント基盤の整備

3. **ナレッジ共有の文化**
   - 失敗事例の共有
   - ベストプラクティスの蓄積

---

## 📚 参考資料

- [PostgreSQL公式ドキュメント - Information Schema](https://www.postgresql.org/docs/current/information-schema.html)
- [Supabase公式ドキュメント - Database](https://supabase.com/docs/guides/database)
- [CURSOR_COMMON_SETTINGS_v2.1.md](../CURSOR_COMMON_SETTINGS_v2.1.md) - プロジェクトガードレール
- [annual-test-data-specification.md](./features/annual-test-data-specification.md) - 年間テストデータ仕様書

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-10-07 | 1.0 | 初版作成 - 年間テストデータ投入機能開発の知見をまとめ |

---

**記録者**: AI Assistant (Cursor)  
**承認者**: プロジェクトオーナー  
**次回レビュー日**: 次回大規模データ投入実装時


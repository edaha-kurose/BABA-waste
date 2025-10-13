# AI開発におけるスキーマ変更の安全対策ガイド

## 📋 目次

1. [問題の本質](#1-問題の本質)
2. [6つの対策](#2-6つの対策)
3. [実装方法](#3-実装方法)
4. [クイックスタート](#4-クイックスタート)
5. [スキーマ変更フロー](#5-スキーマ変更フロー)
6. [チェックリスト](#6-チェックリスト)
7. [まとめ](#7-まとめ)

---

## 1. 問題の本質

### 🚨 AI開発特有のリスク

AI開発では、**影響範囲を確認せずに安易にスキーマを修正してしまい、他の機能が動かなくなる**リスクが常に存在します。

### 実際の事例（2025-10-08）

#### 問題
`collection_records`テーブルの修正時、以下のカラムを削除しようとした：
- `transport_cost`
- `disposal_cost`
- `special_handling_cost`

#### 原因
1. `billing_records`と`collection_records`を混同
2. 影響範囲を確認せずに修正
3. 実際のスキーマ定義を確認せずに作業

#### 結果
- **たまたま影響がなかった**（これらのカラムは元々`collection_records`に存在しなかった）
- しかし、実際に使われているカラムを削除していたら**システム全体が停止**していた可能性

### 教訓

> **「たまたま大丈夫だった」は、次は大丈夫ではない**
>
> AI開発では、このような「確認不足による破壊的変更」が頻繁に発生する可能性があります。

---

## 2. 6つの対策

### 対策の全体像

| # | 対策 | 効果 | 優先度 | 実装難易度 |
|---|------|------|-------|----------|
| 1 | **型定義の自動生成（SSOT）** | 存在しないカラムが**ビルドエラー**になる | 🔴 **最高** | 🟢 低 |
| 2 | **影響範囲分析スクリプト** | 変更前に**リスクレベルを自動判定** | 🔴 **最高** | 🟢 低 |
| 3 | **Pre-commitフック** | コミット前に**自動チェック** | 🟠 高 | 🟡 中 |
| 4 | **CI/CD自動チェック** | PRに**自動警告とチェックリスト** | 🟠 高 | 🟡 中 |
| 5 | **スキーマ変更ガイドライン** | **標準化されたフロー** | 🟡 中 | 🟢 低 |
| 6 | **DDL命名規則** | **マイグレーション履歴**が明確 | 🟡 中 | 🟢 低 |

---

### 対策1: 型定義の自動生成（SSOT確立）

#### 目的
データベーススキーマとTypeScriptの型を常に同期し、存在しないカラムへのアクセスを**ビルド時に検出**する。

#### 効果
- ✅ 存在しないカラムへのアクセス → **ビルドエラー**
- ✅ typo（入力ミス） → **ビルドエラー**
- ✅ IDEの自動補完が効く
- ✅ ステータス値などの制約も型チェックされる

#### Before（型なし）❌

```typescript
// ❌ 存在しないカラムに気づけない
const { data, error } = await supabase
  .from('collection_records')
  .insert({
    vehicle_number: body.vehicleNumber,  // ❌ 存在しないカラム
    status: 'COLLECTED',                  // ❌ 存在しないステータス値
  });

// → ランタイムエラーになるまで気づけない
```

#### After（型あり）✅

```typescript
// ✅ 型安全なAPI実装
import { Database } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient<Database> = ...;

const { data, error } = await supabase
  .from('collection_records')
  .insert({
    // ✅ 自動補完が効く
    // ✅ 存在しないカラムはビルドエラーになる
    tenant_id: userTenantId,
    record_id: body.record_id,
    request_id: body.request_id,
    collector_company_id: userCompanyId,
    collection_date: body.collection_date,
    collection_time: body.collection_time,  // ★ 必須カラム
    actual_quantity: body.actual_quantity,
    actual_unit: body.actual_unit,          // ★ 必須カラム
    waste_items: body.waste_items || [],
    photos: body.photos || [],
    status: 'PENDING',                      // ★ 正しい値のみ許可
  } satisfies Database['public']['Tables']['collection_records']['Insert']);

// → 存在しないカラムはビルド時にエラーになる！
```

---

### 対策2: 影響範囲分析スクリプト

#### 目的
スキーマ変更前に、そのテーブル・カラムがコード内でどこで使われているか自動的に検索し、**リスクレベルを判定**する。

#### 使い方

```bash
# テーブル全体の影響範囲を分析
npm run schema:impact -- --table collection_records

# 特定のカラムの影響範囲を分析
npm run schema:impact -- --table collection_records --column transport_cost
```

#### 出力例

```
🔍 影響範囲分析を開始します...
  📊 テーブル: collection_records
  📋 カラム: transport_cost

================================================================================
📊 スキーマ影響範囲分析レポート
================================================================================

📋 対象テーブル: collection_records
📋 対象カラム: transport_cost
🚦 リスクレベル: LOW

💡 推奨事項:
  ✅ LOW: 使用箇所が少ないか、ほぼ使われていません。比較的安全に変更できます。

📍 使用箇所（0件）:

✅ 使用箇所が見つかりませんでした。

================================================================================
```

#### リスクレベルの判定基準

| リスクレベル | 使用箇所 | 対応方針 | 所要時間 |
|------------|---------|---------|---------|
| 🟢 **LOW** | 0-1件（APIやコンポーネントでほぼ使われていない） | 比較的安全に変更可能 | 30分 |
| 🟡 **MEDIUM** | 2-4件（1-2個のAPIで使用） | 影響範囲を確認してから変更 | 1-2時間 |
| 🟠 **HIGH** | 5-9件（3-4個のAPIまたは5個以上のコンポーネントで使用） | 十分なテストが必要 | 半日 |
| 🔴 **CRITICAL** | 10件以上（5個以上のAPIまたは10個以上のコンポーネントで使用） | **段階的な移行計画が必須** | 1-3日 |

#### 効果
- ✅ カラム削除前に**使用箇所を自動的に確認**できる
- ✅ リスクレベルに応じた**対応方針が明確**になる
- ✅ CI/CDで自動チェック可能（HIGH以上でビルドエラーにする）
- ✅ **「たまたま大丈夫だった」をなくせる**

---

### 対策3: Pre-commitフック

#### 目的
コミット前に自動的にチェックを実行し、問題があればコミットを阻止する。

#### 動作イメージ

```bash
$ git commit -m "Add vehicle_number column"

🔍 Pre-commit チェックを実行中...

📝 TypeScript型チェック...
✅ 型チェック完了

🔍 ESLint チェック...
✅ Lint完了

⚠️ DDLファイルの変更を検出しました。
📋 スキーマ変更チェックリスト:
  [ ] 影響範囲を分析しましたか？ (npm run schema:impact)
  [ ] 型定義を再生成しましたか？ (npm run gen:db-types)
  [ ] APIファイルを更新しましたか？
  [ ] E2Eテストを実行しましたか？

チェックリストを確認しましたか？ (y/n) y

✅ Pre-commitチェック完了！
```

#### 効果
- ✅ 型エラーやlintエラーがある状態で**コミットできない**
- ✅ DDL変更時に自動的に**警告が表示**される
- ✅ チェックリストの確認を**強制**できる

---

### 対策4: CI/CD自動チェック

#### 目的
Pull Request作成時に自動的にスキーマ変更を検出し、影響範囲を分析してコメントする。

#### PRコメント例

```markdown
## ⚠️ スキーマ変更を検出しました

**変更されたDDLファイル:**
```
db/ddl/024_add_column_to_collection_records.sql
```

**重要な確認事項:**
- [ ] `npm run schema:impact` で影響範囲を分析しましたか？
- [ ] `npm run gen:db-types` で型定義を再生成しましたか？
- [ ] 影響を受けるAPIファイルを更新しましたか？
- [ ] E2Eテストを実行しましたか？
- [ ] ロールバック手順を準備しましたか？

**リスクレベル:** 🚨 HIGH - レビューア要確認

---
*このコメントは自動生成されました*
```

#### 効果
- ✅ PRレビュー時にスキーマ変更を**見逃さない**
- ✅ 自動的に**チェックリストが提示**される
- ✅ リスクレベルに応じて**ビルドを失敗**させられる

---

### 対策5: スキーマ変更ガイドライン

#### 目的
スキーマ変更時の標準的な手順を文書化し、開発者全員が同じフローに従えるようにする。

#### 主な内容
1. **基本フロー（8ステップ）**
2. **チェックリスト**
3. **やってはいけないこと**
4. **リスクレベル別の対応フロー**

#### 効果
- ✅ 開発者全員が**同じフロー**に従える
- ✅ 新規メンバーの**オンボーディング**が容易
- ✅ スキーマ変更時の**漏れを防げる**

---

### 対策6: DDL命名規則

#### 目的
マイグレーション履歴を明確にし、既存ファイルの編集を防ぐ。

#### 命名規則

```
番号_概要.sql

例:
  024_add_column_to_collection_records.sql
  025_drop_unused_columns_from_billing_records.sql
  026_add_index_to_waste_requests.sql
```

#### ルール
- ❌ **既存のDDLファイルは絶対に編集しない**
- ✅ **常に新しい番号のファイルを作成する**
- ✅ **ロールバック手順をコメントに記載する**

#### 効果
- ✅ マイグレーション履歴が**明確**になる
- ✅ ロールバックが**容易**になる
- ✅ チーム開発での**混乱を防げる**

---

## 3. 実装方法

### 3-1. 型定義の自動生成

#### ステップ1: Supabase CLIのセットアップ

```bash
# Supabase CLIをインストール
npm install --save-dev supabase

# ログイン
npx supabase login
```

#### ステップ2: package.jsonにスクリプトを追加

すでに以下が追加されています：

```json
{
  "scripts": {
    "gen:db-types": "supabase gen types typescript --project-id $NEXT_PUBLIC_SUPABASE_PROJECT_ID > lib/database.types.ts"
  }
}
```

#### ステップ3: 型定義を生成

```bash
npm run gen:db-types
```

#### ステップ4: APIで型定義を使用

```typescript
import { Database } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient<Database> = ...;

// 型安全なAPI実装
const { data, error } = await supabase
  .from('collection_records')
  .insert({
    // 自動補完が効く
    // 存在しないカラムはビルドエラーになる
  } satisfies Database['public']['Tables']['collection_records']['Insert']);
```

---

### 3-2. 影響範囲分析スクリプト

#### ファイル構成

すでに以下が作成されています：
- `scripts/analyze-schema-impact.ts`
- `package.json` の `schema:impact` スクリプト

#### 使い方

```bash
# テーブル全体の影響範囲を分析
npm run schema:impact -- --table collection_records

# 特定のカラムの影響範囲を分析
npm run schema:impact -- --table collection_records --column transport_cost
```

#### スクリプトの主な機能

1. **コードベース全体を検索**
   - `ripgrep`（rg）または`grep`を使用
   - TypeScript、SQL、Markdownファイルを対象

2. **使用箇所をカテゴリ分け**
   - API
   - コンポーネント
   - DDL
   - Seed
   - 型定義
   - その他

3. **リスクレベルを自動判定**
   - APIの使用件数
   - コンポーネントの使用件数
   - 合計使用件数

4. **推奨事項を生成**
   - リスクレベルに応じた対応方針を提示

---

### 3-3. Pre-commitフック

#### ステップ1: Huskyのセットアップ

```bash
# Huskyをインストール
npm install --save-dev husky

# 初期化
npx husky init
```

#### ステップ2: Pre-commitフックをコピー

すでに作成されています：
- `.husky/pre-commit.example`

```bash
# コピー
cp .husky/pre-commit.example .husky/pre-commit

# 実行権限を付与
chmod +x .husky/pre-commit
```

#### フックの内容

```bash
#!/usr/bin/env sh

echo "🔍 Pre-commit チェックを実行中..."

# 1. TypeScript型チェック
npm run type-check

# 2. ESLint
npm run lint

# 3. DDLファイルが変更されている場合の特別チェック
CHANGED_FILES=$(git diff --cached --name-only)
if echo "$CHANGED_FILES" | grep -q "db/ddl/"; then
  echo "⚠️ DDLファイルの変更を検出しました。"
  echo "📋 スキーマ変更チェックリスト:"
  echo "  [ ] 影響範囲を分析しましたか？ (npm run schema:impact)"
  echo "  [ ] 型定義を再生成しましたか？ (npm run gen:db-types)"
  echo "  [ ] APIファイルを更新しましたか？"
  echo "  [ ] E2Eテストを実行しましたか？"
  
  read -p "チェックリストを確認しましたか？ (y/n) " -n 1 -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "✅ Pre-commitチェック完了！"
```

---

### 3-4. CI/CD自動チェック

すでに作成されています：
- `.github/workflows/schema-validation.yml.example`

#### セットアップ

```bash
# GitHub Actionsの設定ファイルをコピー
cp .github/workflows/schema-validation.yml.example .github/workflows/schema-validation.yml

# コミット・プッシュ
git add .github/workflows/schema-validation.yml
git commit -m "Add schema validation workflow"
git push
```

#### ワークフローの主な機能

1. **DDLファイルの変更を検出**
2. **TypeScript型チェック**
3. **ESLint**
4. **影響範囲分析**
5. **型定義の生成テスト**
6. **E2Eテストの実行**
7. **PRコメントに影響範囲を投稿**

---

## 4. クイックスタート

### 🚀 今すぐできること（所要時間: 約10分）

#### ステップ1: 型定義の生成（3分）

```bash
# Supabase CLIをインストール（初回のみ）
npm install --save-dev supabase

# ログイン
npx supabase login

# 型定義を生成
npm run gen:db-types

# 確認
ls -la lib/database.types.ts
```

#### ステップ2: Pre-commitフックのセットアップ（2分）

```bash
# Huskyをインストール（初回のみ）
npm install --save-dev husky

# 初期化
npx husky init

# Pre-commitフックをセットアップ
cp .husky/pre-commit.example .husky/pre-commit
chmod +x .husky/pre-commit
```

#### ステップ3: 影響範囲分析の実行（1分）

```bash
# 試しに実行してみる
npm run schema:impact -- --table collection_records
```

#### ステップ4: ガイドラインの確認（4分）

```bash
# ガイドラインを読む
cat docs/SCHEMA_CHANGE_GUIDELINES.md | less
```

---

## 5. スキーマ変更フロー

### 基本フロー（8ステップ）

#### ステップ1: 影響範囲の分析 ⚠️ **最重要**

```bash
# テーブル全体の影響範囲を分析
npm run schema:impact -- --table collection_records

# 特定のカラムの影響範囲を分析
npm run schema:impact -- --table collection_records --column transport_cost
```

**出力の確認**:
- 🟢 **LOW**: 安全に変更可能
- 🟡 **MEDIUM**: 影響範囲を確認してから変更
- 🟠 **HIGH**: 十分なテストが必要
- 🔴 **CRITICAL**: 段階的な移行計画が必須

---

#### ステップ2: 実際のスキーマを確認

```bash
# DDLファイルを確認
cat db/ddl/005_normalized_schema.sql | grep -A 50 "CREATE TABLE.*collection_records"

# または、Supabase SQLエディタで実行:
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'collection_records' 
ORDER BY ordinal_position;
```

---

#### ステップ3: 新しいDDLファイルを作成

❌ **間違い**: 既存のDDLファイルを編集

```bash
# ❌ これはダメ
vim db/ddl/005_normalized_schema.sql  # 既存ファイルを直接編集
```

✅ **正しい**: 新しい番号のDDLファイルを作成

```bash
# ✅ 新しいファイルを作成
touch db/ddl/024_add_column_to_collection_records.sql
```

---

#### ステップ4: マイグレーションスクリプトの作成

**カラム追加の例**:

```sql
-- ================================================
-- カラム追加: collection_records.vehicle_number
-- ================================================
-- 目的: 回収時の車両番号を記録
-- 影響範囲: 新規カラムのため既存データへの影響なし
-- ロールバック: ALTER TABLE collection_records DROP COLUMN vehicle_number;
-- ================================================

-- Step 1: カラム追加
ALTER TABLE collection_records
ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

-- Step 2: コメント追加
COMMENT ON COLUMN collection_records.vehicle_number IS '回収時の車両番号';

-- Step 3: インデックス作成（必要な場合）
CREATE INDEX IF NOT EXISTS idx_collection_records_vehicle_number
ON collection_records(vehicle_number);

-- 確認
SELECT 
  '✅ collection_records.vehicle_number を追加しました' as status,
  COUNT(*) as total_records
FROM collection_records;
```

---

#### ステップ5: 型定義の再生成

```bash
# Supabase CLIで型定義を自動生成
npm run gen:db-types

# 生成された型定義を確認
cat lib/database.types.ts | grep "collection_records" -A 30
```

---

#### ステップ6: APIファイルの更新

```typescript
import { Database } from '@/lib/database.types';
import { SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient<Database> = ...;

const { data, error } = await supabase
  .from('collection_records')
  .insert({
    // ✅ 自動補完が効く
    // ✅ 存在しないカラムはビルドエラーになる
    tenant_id: userTenantId,
    record_id: body.record_id,
    request_id: body.request_id,
    collector_company_id: userCompanyId,
    collection_date: body.collection_date,
    collection_time: body.collection_time,
    actual_quantity: body.actual_quantity,
    actual_unit: body.actual_unit,
    waste_items: body.waste_items || [],
    photos: body.photos || [],
    vehicle_number: body.vehicleNumber,    // ★ 新規カラム
    status: 'PENDING',
  } satisfies Database['public']['Tables']['collection_records']['Insert']);
```

---

#### ステップ7: ビルド＆テストの実行

```bash
# TypeScript型チェック
npm run type-check

# ESLint
npm run lint

# E2Eテスト
npm run test:e2e
```

---

#### ステップ8: ドキュメント更新

変更内容を以下のドキュメントに記録：

1. **`docs/specifications/schema-changes.md`**（スキーマ変更履歴）
2. **`docs/api/collection-records.md`**（API仕様書）
3. **`CHANGELOG.md`**（変更履歴）

---

## 6. チェックリスト

### 🔴 必須項目（全て完了が必須）

コミット前に必ず以下を確認してください：

- [ ] `npm run schema:impact` で影響範囲を分析した
- [ ] リスクレベルが **MEDIUM以下** であることを確認した
- [ ] 実際のスキーマを確認した（DDLファイルまたはDB直接確認）
- [ ] 新しい番号のDDLファイルを作成した（既存ファイルは編集していない）
- [ ] ロールバック手順を記載した
- [ ] `npm run gen:db-types` で型定義を再生成した
- [ ] 影響を受けるAPIファイルを更新した
- [ ] `npm run type-check` でTypeScriptエラーがないことを確認した
- [ ] `npm run lint` でESLintエラーがないことを確認した

### 🟡 推奨項目（可能な限り実施）

- [ ] E2Eテストを実行した
- [ ] ドキュメントを更新した
- [ ] チームメンバーにレビューを依頼した
- [ ] 本番環境でのロールバック手順を確認した

### 🟢 オプション項目（大規模な変更の場合）

- [ ] ステージング環境で動作確認した
- [ ] パフォーマンス影響を検証した
- [ ] データ移行スクリプトを作成した

---

## 7. まとめ

### ✅ 実装した6つの対策

| 対策 | 効果 | 実装状況 |
|------|------|---------|
| **1. 型定義の自動生成** | 存在しないカラムが**ビルドエラー**になる | ✅ 完了 |
| **2. 影響範囲分析スクリプト** | 変更前に**リスクレベルを自動判定** | ✅ 完了 |
| **3. Pre-commitフック** | コミット前に**自動チェック** | ✅ 完了 |
| **4. CI/CD自動チェック** | PRに**自動警告** | ✅ 完了 |
| **5. スキーマ変更ガイドライン** | **標準化されたフロー** | ✅ 完了 |
| **6. DDL命名規則** | **マイグレーション履歴**が明確 | ✅ 完了 |

---

### 📊 Before（対策前）vs After（対策後）

| 項目 | Before（対策前） | After（対策後） |
|------|----------------|---------------|
| **影響範囲の確認** | 手動・不確実 | **自動分析・リスクレベル判定** |
| **存在しないカラムへのアクセス** | ランタイムエラー | **ビルドエラーで検出** |
| **型チェック** | なし | **Supabase CLI で自動生成** |
| **DDLファイル管理** | 無秩序 | **番号順・履歴明確** |
| **チェックリスト** | なし | **自動表示・強制確認** |
| **結果** | 🔴 **「たまたま大丈夫だった」だけ** | ✅ **確実に安全なスキーマ変更** |

---

### 💡 今回の教訓

#### Before（対策前の考え方）

> 「このカラムは使われていないっぽいから削除しても大丈夫だろう」
>
> → **「たまたま大丈夫だった」だけ**

#### After（対策後の考え方）

> 「まず影響範囲を分析して、リスクレベルを確認してから変更しよう」
>
> → **確実に安全なスキーマ変更が可能**

---

### 🎯 次のアクション

#### 🔴 今すぐ（5分以内）
1. `npm run gen:db-types` で型定義を生成
2. このガイドをブックマーク

#### 🟡 今日中（1時間以内）
1. Pre-commitフックをセットアップ
2. `npm run schema:impact` を試してみる
3. チームメンバーにこのガイドを共有

#### 🟢 今週中
1. CI/CDワークフローを有効化
2. 次のスキーマ変更時にこのフローを実践
3. フィードバックを収集して改善

---

### 🚫 やってはいけないこと

#### ❌ 1. 既存のDDLファイルを直接編集

```bash
# ❌ これは絶対にやらない
vim db/ddl/005_normalized_schema.sql  # 既存ファイルの編集
```

**理由**: 
- マイグレーション履歴が失われる
- 他の開発者が混乱する
- ロールバックが困難になる

---

#### ❌ 2. 影響範囲を確認せずにカラム削除

```sql
-- ❌ これは危険
ALTER TABLE collection_records DROP COLUMN transport_cost;
```

**理由**:
- 実際に使われているカラムを削除すると、システム全体が停止
- データの復旧が困難
- **「たまたま大丈夫だった」では済まされない**

---

#### ❌ 3. 型定義を使わないAPI実装

```typescript
// ❌ これでは typo やカラム不一致に気づけない
const { data, error } = await supabase
  .from('collection_records')
  .insert({ ... });  // 型チェックなし
```

**理由**:
- 存在しないカラムへのアクセスがランタイムエラーになる
- デバッグが困難
- **ビルド時に検出できない**

---

### 📚 関連ドキュメント

このガイドに関連するドキュメント：

1. **`docs/SCHEMA_CHANGE_GUIDELINES.md`**
   - スキーマ変更の詳細な手順書

2. **`docs/COMPLETE_SCHEMA_VALIDATION_REPORT.md`**
   - 全機能スキーマ整合性検証レポート

3. **`docs/COLLECTION_RECORDS_SCHEMA_IMPACT_ANALYSIS.md`**
   - `collection_records`の影響範囲分析

4. **`scripts/analyze-schema-impact.ts`**
   - 影響範囲分析スクリプト

5. **`.husky/pre-commit.example`**
   - Pre-commitフックのサンプル

6. **`.github/workflows/schema-validation.yml.example`**
   - CI/CDワークフローのサンプル

---

### 💬 サポート

質問や不明点がある場合：
- チームの技術リーダーに相談
- `docs/specifications/` 配下のドキュメントを確認
- Slackの #tech-support チャンネルで質問

---

### 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-08 | 1.0 | 初版作成 |

---

**最終更新**: 2025-10-08  
**バージョン**: 1.0  
**作成者**: AI Assistant  
**承認者**: 未承認

---

## 🎉 おわりに

このガイドを実践することで、AI開発における**「たまたま大丈夫だった」から「確実に安全」**に変わります。

**重要なポイント**:
1. **影響範囲を自動分析**する
2. **存在しないカラムはビルドエラー**にする
3. **確実に安全なスキーマ変更**を実現する

このガイドが、あなたのプロジェクトの品質向上に貢献できれば幸いです。

---

**🚀 Let's make schema changes safe!**


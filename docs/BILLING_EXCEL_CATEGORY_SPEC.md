# 請求書Excel出力 - 分類マッピング仕様書

**作成日**: 2025-10-13  
**バージョン**: 1.0.0

---

## 📋 概要

BABA請求書フォーマットに準拠した Excel 出力機能において、廃棄物マスターの分類情報に基づいて請求明細を適切な列に振り分けるための仕様です。

---

## 🎯 目的

- **文字列マッチング依存の排除**: 廃棄物名による脆弱な判定ロジックを廃止
- **マスターデータ駆動**: 廃棄物マスターの `billing_category` フィールドに基づく確実な分類
- **運用性向上**: UI で分類を設定可能にすることで、柔軟な運用を実現
- **拡張性**: 新しい分類の追加が容易

---

## 🗂️ データモデル

### WasteTypeMaster テーブル

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| `billing_category` | VARCHAR(20) | ✅ | Excel出力時の列分類 |
| `billing_type_default` | VARCHAR(20) | ✅ | デフォルトの請求種別 |

### billing_category の値

| 値 | Excel列 | 項目名 | 説明 |
|----|---------|--------|------|
| `G` | G列 | 一般廃棄物請求金額（月額固定請求分） | 一般廃棄物（可燃ゴミ、不燃ゴミなど） |
| `H` | H列 | 産業廃棄物請求金額 | 産業廃棄物（廃プラスチック、金属くずなど） |
| `I` | I列 | 瓶・缶請求金額 | 資源ごみ（瓶、缶） |
| `J` | J列 | 臨時回収請求金額（実績回収分） | スポット回収、臨時回収 |
| `M` | M列 | 段ボール（有価買取分） | 段ボール（マイナス計上） |
| `F` | F列 | システム管理会社の管理手数料 | システム利用料、管理手数料 |
| `OTHER` | - | その他 | 上記以外（F列に含める） |

### billing_type_default の値

| 値 | 説明 | 用途 |
|----|------|------|
| `FIXED` | 固定金額 | 月額固定の請求（例: 可燃ゴミ月額料金） |
| `METERED` | 従量請求 | 実績ベースの請求（例: 産業廃棄物の重量単価） |
| `OTHER` | その他 | 上記以外（例: 管理手数料） |

**重要**: `billing_type_default` はあくまで「デフォルト値」であり、実際の請求明細（`BillingItem`）では `billing_type` フィールドで個別に設定可能です。

---

## 🔄 データフロー

### 1. 廃棄物マスター登録

```
ユーザー操作（UI）
  ↓
廃棄物マスター作成
  ├─ waste_type_name: "一般廃棄物（可燃ゴミ）"
  ├─ billing_category: "G"  ← ✨ 分類を選択
  └─ billing_type_default: "FIXED"  ← ✨ デフォルト請求種別を選択
```

### 2. 回収実績登録

```
回収実績（Collection）
  ├─ waste_type_id: "xxx"  ← 廃棄物マスターへの参照
  ├─ actual_quantity: 150
  └─ unit: "KG"
```

### 3. 請求データ生成

```
Collection → BillingItem
  ├─ waste_type_id: "xxx"  ← 廃棄物マスターへの参照
  ├─ billing_type: "FIXED"  ← デフォルト値 or 個別設定
  ├─ amount: 5000
  └─ tax_amount: 500
```

### 4. Excel 出力

```
GET /api/billing-summaries/export-excel-v2

1. BillingItem を取得（wasteTypeMaster を include）

2. 各 BillingItem について:
   billing_category = item.wasteTypeMaster.billing_category
   
   switch (billing_category) {
     case 'G': general_waste += amount
     case 'H': industrial_waste += amount
     case 'I': bottle_can += amount
     case 'J': temporary_collection += amount
     case 'M': cardboard_buyback += amount (マイナス値)
     case 'F': system_fee += amount
     default: system_fee += amount
   }

3. Excel ファイル生成
```

---

## 📊 Excel 出力フォーマット

### 列定義

| 列 | 項目名 | データソース | 計算ロジック |
|----|--------|-------------|-------------|
| D | 店舗コード | `stores.store_code` | - |
| E | 店舗名 | `stores.name` | - |
| **F** | **システム管理手数料** | `billing_category='F'` の合計 | `SUM(amount)` |
| **G** | **一般廃棄物請求金額** | `billing_category='G'` の合計 | `SUM(amount)` |
| **H** | **産業廃棄物請求金額** | `billing_category='H'` の合計 | `SUM(amount)` |
| **I** | **瓶・缶請求金額** | `billing_category='I'` の合計 | `SUM(amount)` |
| **J** | **臨時回収請求金額** | `billing_category='J'` の合計 | `SUM(amount)` |
| K | 小計 | F + G + H + I + J | `SUM(F:J)` |
| L | 消費税 | `tax_amount` の合計 | `SUM(tax_amount)` |
| **M** | **段ボール（有価買取分）** | `billing_category='M'` の合計 | `SUM(amount) * -1` |
| N | 小計総額 | K | = K |
| O | 消費税総額 | L | = L |
| P | 差し引き計 | K + M | = K - M（M はマイナス値） |
| Q | 最終消費税 | L | = L |
| R | 最終差し引き合計 | P + Q | = P + Q |

---

## 🔧 マイグレーション手順

### 1. マイグレーション実行

```bash
cd next-app
pnpm prisma migrate dev --name add_billing_category_to_waste_type_master
```

### 2. Prisma Client 再生成

```bash
pnpm prisma generate
```

### 3. 既存データの更新（オプション）

既存の廃棄物マスターデータがある場合、以下の SQL で分類を設定：

```sql
-- 一般廃棄物
UPDATE app.waste_type_masters
SET billing_category = 'G', billing_type_default = 'FIXED'
WHERE waste_type_name LIKE '%一般廃棄物%' 
   OR waste_type_name LIKE '%可燃%' 
   OR waste_type_name LIKE '%不燃%';

-- 産業廃棄物
UPDATE app.waste_type_masters
SET billing_category = 'H', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%産業廃棄物%' 
   OR waste_type_name LIKE '%廃プラ%';

-- 瓶・缶
UPDATE app.waste_type_masters
SET billing_category = 'I', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%瓶%' 
   OR waste_type_name LIKE '%缶%' 
   OR waste_type_name LIKE '%ビン%';

-- 段ボール
UPDATE app.waste_type_masters
SET billing_category = 'M', billing_type_default = 'METERED'
WHERE waste_type_name LIKE '%段ボール%' 
   OR waste_type_name LIKE '%ダンボール%';

-- システム手数料
UPDATE app.waste_type_masters
SET billing_category = 'F', billing_type_default = 'OTHER'
WHERE waste_type_name LIKE '%システム%' 
   OR waste_type_name LIKE '%管理手数料%';
```

---

## 🎨 UI 実装

### 廃棄物マスター管理画面

**パス**: `/dashboard/waste-masters`

**新規フィールド**:
1. **請求書出力列分類** (`billing_category`)
   - 選択肢: G, H, I, J, M, F, OTHER
   - 色分け表示: 各分類に対応する色でタグ表示

2. **デフォルト請求種別** (`billing_type_default`)
   - 選択肢: FIXED, METERED, OTHER
   - 色分け表示: 固定=緑、従量=青、その他=グレー

**必須項目**: 両フィールドとも新規作成時に必須

---

## 🧪 テストシナリオ

### 1. 廃棄物マスター登録テスト

```
Given: 廃棄物マスター管理画面を開く
When: 以下の情報で新規作成
  - 廃棄物名称: "一般廃棄物（可燃ゴミ）"
  - billing_category: "G"
  - billing_type_default: "FIXED"
Then: 登録成功、一覧に表示される
```

### 2. 請求データ生成テスト

```
Given: 回収実績が登録されている
  - waste_type_id: "xxx" (billing_category='G')
  - actual_quantity: 150 KG
When: 請求データ自動生成APIを実行
Then: BillingItem が作成される
  - billing_type: "FIXED" (デフォルト値)
  - waste_type_id: "xxx"
```

### 3. Excel 出力テスト

```
Given: 請求明細が存在する
  - Store A: 一般廃棄物（G）¥5,000
  - Store A: 産業廃棄物（H）¥3,000
  - Store A: 瓶・缶（I）¥1,000
When: Excel 出力API を実行
Then: Excel ファイルが生成される
  - Store A の G列: ¥5,000
  - Store A の H列: ¥3,000
  - Store A の I列: ¥1,000
  - Store A の K列: ¥9,000（小計）
```

### 4. 段ボール有価買取テスト

```
Given: 請求明細に段ボール（M）が存在する
  - Store B: 段ボール（M）¥-2,000（マイナス値）
  - Store B: 一般廃棄物（G）¥5,000
When: Excel 出力API を実行
Then: Excel ファイルが生成される
  - Store B の G列: ¥5,000
  - Store B の M列: ¥-2,000
  - Store B の K列: ¥5,000（小計、Mは含まない）
  - Store B の P列: ¥3,000（差し引き計 = K + M）
```

---

## ⚠️ 注意事項

### 1. 既存データの移行

既存の廃棄物マスターデータには `billing_category` が NULL の状態で存在する可能性があります。以下の対応が必要です：

**Option A**: マイグレーション時に一括更新（推奨）
- マイグレーション SQL で名前ベースの判定により初期値を設定

**Option B**: UI で手動設定
- 管理者が廃棄物マスター管理画面で個別に設定

### 2. billing_type の使い分け

- **`billing_type_default`** (WasteTypeMaster): デフォルト値、推奨値
- **`billing_type`** (BillingItem): 実際の請求種別、個別に変更可能

例:
- 廃棄物マスター: `billing_type_default='FIXED'`（通常は固定）
- ある月の請求明細: `billing_type='METERED'`（この月だけ従量）

### 3. NULL 値の扱い

`billing_category` が NULL の場合、Excel 出力時は `'OTHER'` として扱い、F列（システム管理手数料）に含めます。

---

## 📈 今後の拡張

### 1. 分類の追加

新しい Excel 列が必要になった場合:
1. `billing_category` のバリデーションを更新
2. Excel 出力ロジックに case を追加
3. UI の選択肢に追加

### 2. 複数列への振り分け

1つの廃棄物を複数列に振り分ける場合:
- `billing_category` を配列型に変更
- または別テーブルで多対多リレーション

---

## ✅ チェックリスト

実装完了時の確認項目:

- [ ] Prisma スキーマに `billing_category`, `billing_type_default` を追加
- [ ] マイグレーション実行済み
- [ ] Prisma Client 再生成済み
- [ ] Excel 出力 API を `billing_category` ベースに修正
- [ ] 廃棄物マスター管理 UI に新規フィールド追加
- [ ] 既存データの初期値設定済み
- [ ] テストシナリオ実施済み
- [ ] ドキュメント更新済み

---

**作成者**: BABA Waste Management System Development Team  
**最終更新**: 2025-10-13


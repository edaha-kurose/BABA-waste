# 廃棄物種別マスター 使い方ガイド

**作成日**: 2025-10-19  
**目的**: 廃棄物種別マスターの正しい使い方を理解する

---

## 📋 廃棄物種別マスターとは？

**業者ごとの取り扱い廃棄物を管理**するマスターデータです。

### 主な用途

| 用途 | 説明 |
|------|------|
| 🔍 **JWNETコード選択** | JWNET登録済みの廃棄物コードから選択（カテゴリー・単位が自動入力） |
| 📊 **請求書出力列の設定** | Excel出力時の表示列（D列〜AH列）を指定 |
| 💰 **請求種別の設定** | デフォルト請求方法（固定/従量/その他）を設定 |
| 💵 **単価設定** | 業者ごとの取り扱い単価を登録 |

---

## 🔄 正しい登録フロー

### Step 1: JWNETコードマスターを準備

**先に** `JWNET廃棄物コードマスター` でコードを登録します。

```
メニュー: システム管理 > マスター管理 > JWNET廃棄物コードマスター
```

**登録項目**:
- 廃棄物コード（7桁、例: `0010101`）
- 廃棄物名称（例: `燃え殻`）
- カテゴリー（例: `産業廃棄物`）
- 分類（例: `燃え殻`）
- 単位コード（例: `KG`）
- 単位名称（例: `キログラム`）

---

### Step 2: 廃棄物種別マスターを登録

```
メニュー: システム管理 > マスター管理 > 廃棄物マスター管理
```

#### 登録手順

1. **業者を選択**
   - ドロップダウンから対象の収集業者を選択

2. **新規作成ボタン**をクリック

3. **必須項目を入力**:
   - **社内廃棄物コード**: 社内で使うコード（例: `W001`）
   - **廃棄物名称**: わかりやすい名前（例: `一般廃棄物（可燃ゴミ）`）
   - **請求書出力列分類**: Excel出力時の列（D列〜AH列から選択）
   - **デフォルト請求種別**: 固定/従量/その他
   - **🔍 JWNETコード**: マスターから検索・選択
   - **単価**: 業者の取り扱い単価（任意）

4. **JWNETコードを選択すると自動入力される項目**:
   - ✅ カテゴリー
   - ✅ 分類
   - ✅ 単位コード

---

## 📊 請求書出力との関連

### 請求書出力列分類（billing_category）

**Excel請求書出力時にどの列に表示するかを設定**します。

| 列 | 品目例 |
|----|--------|
| D列 | 可燃ゴミ |
| E列 | 不燃ゴミ |
| F列 | ペットボトル |
| G列 | 段ボール |
| ... | ... |
| AH列 | その他 |

**使用例**:
```typescript
// 請求書生成時
const items = await prisma.app_billing_items.findMany({
  where: { billing_summary_id: summaryId },
  include: {
    waste_type_masters: {
      select: {
        billing_category: true,  // ← これで列を決定
      }
    }
  }
})

// Excelのセルに配置
worksheet.getCell(`${billing_category}${rowIndex}`).value = quantity
```

---

### デフォルト請求種別（billing_type_default）

**請求方法のデフォルト値を設定**します。

| 種別 | 説明 | 例 |
|------|------|----|
| `FIXED` | 固定（月額固定） | 月額3万円 |
| `METERED` | 従量（実績ベース） | 1kg あたり 50円 |
| `OTHER` | その他 | スポット対応 |

**使用例**:
```typescript
// 請求明細生成時
const billingItem = {
  billing_type: waste_type_master.billing_type_default,  // ← デフォルト値
  unit_price: waste_type_master.unit_price,
  quantity: actualQuantity,
  amount: actualQuantity * waste_type_master.unit_price,
}
```

---

## ⚠️ よくある間違い

### ❌ 間違い1: JWNETコードを手動入力
```
JWNETコード: 01  ← 手動入力（NG）
```
**正解**: マスターから選択する

---

### ❌ 間違い2: JWNETコードマスターを登録せずに使う
```
エラー: "JWNET waste code not found"
```
**正解**: 先に `JWNET廃棄物コードマスター` を登録

---

### ❌ 間違い3: 請求書出力列を設定しない
```
billing_category: null  ← 請求書出力エラー
```
**正解**: 必ず列を指定（D列〜AH列）

---

## 🔍 データベース構造

### テーブル: `waste_type_masters`

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 主キー |
| `org_id` | UUID | 組織ID |
| `collector_id` | UUID | 収集業者ID（nullable） |
| `waste_type_code` | VARCHAR(50) | 社内廃棄物コード |
| `waste_type_name` | VARCHAR(255) | 廃棄物名称 |
| `jwnet_waste_code_id` | UUID | JWNETコードマスターへの参照 |
| `jwnet_waste_code` | VARCHAR(10) | JWNETコード（冗長だが検索最適化） |
| `unit_code` | VARCHAR(10) | 単位コード |
| `unit_price` | REAL | 単価 |
| `billing_category` | VARCHAR(20) | 請求書出力列分類（D〜AH） |
| `billing_type_default` | VARCHAR(20) | デフォルト請求種別（FIXED/METERED/OTHER） |

### リレーション

```
waste_type_masters
  └─ jwnet_waste_codes (N:1)
      ├─ waste_code: 7桁コード
      ├─ waste_name: 廃棄物名
      ├─ waste_category: カテゴリー
      ├─ waste_type: 分類
      ├─ unit_code: 単位コード
      └─ unit_name: 単位名
```

---

## 📝 まとめ

### 正しい順序

```
1. JWNET廃棄物コードマスター登録
   ↓
2. 廃棄物種別マスター登録（JWNETコードを選択）
   ↓
3. 請求書出力列・請求種別を設定
   ↓
4. 業者ごとの単価を設定
   ↓
5. 請求書自動生成で正しい列に表示される
```

### チェックリスト

- [ ] JWNETコードマスターが登録済みか？
- [ ] 業者を正しく選択しているか？
- [ ] JWNETコードを **マスターから選択** しているか？
- [ ] 請求書出力列を設定したか？
- [ ] デフォルト請求種別を設定したか？

---

**最終更新**: 2025-10-19  
**関連ドキュメント**: `BILLING_EXCEL_EXPORT_SPEC.md`





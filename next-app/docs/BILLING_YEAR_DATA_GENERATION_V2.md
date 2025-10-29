# 📊 1年分請求データ生成（完全版）- v2.0

## 🎯 改善内容

### 以前の実装（v1.0）の問題点
```
❌ ランダムに業者を選択
❌ 固定の単価（10,000円）
❌ マトリクス設定を無視
❌ 実際の業務フローと異なる
→ テストデータとして不適切
```

### 改善後（v2.0）
```
✅ マトリクスに基づいて業者を選択
✅ 廃棄物種別マスターの料金を使用
✅ 実際の業務フローに準拠
✅ 本番と同じロジックでテスト可能
→ 正しいテストデータ
```

---

## 🔧 実装詳細

### Step 0: 前提条件チェック
```typescript
// 必須マスターデータの確認
- 収集業者（collectors）: 200社
- 店舗（stores）: 1,649店舗
- 廃棄品目リスト（item_maps）: 5品目
- 廃棄物種別マスター（waste_type_masters）: 5種別
```

### Step 1: マトリクス・料金設定の自動生成

#### 1.1 廃棄物種別マスターに料金を設定
```typescript
// 未設定の廃棄物種別マスターに料金を設定
for (const wasteType of wasteTypeMasters) {
  if (!wasteType.unit_price || wasteType.unit_price === 0) {
    await prisma.waste_type_masters.update({
      where: { id: wasteType.id },
      data: {
        unit_price: Math.floor(Math.random() * 15000) + 5000, // 5,000〜20,000円/トン
        updated_by: authUser.id,
      },
    });
  }
}
```

**料金範囲**: 5,000円〜20,000円/トン（ランダム）

#### 1.2 店舗×品目×業者マトリクスを自動生成
```typescript
// マトリクスが存在しない場合のみ生成
const existingMatrixCount = await prisma.store_item_collectors.count({
  where: { org_id: authUser.org_id, deleted_at: null },
});

if (existingMatrixCount === 0) {
  // 最初の100店舗のみ対象
  const targetStores = stores.slice(0, 100);

  for (const store of targetStores) {
    for (const itemMap of itemMaps) {
      // ランダムに3〜5業者を選択
      const numCollectors = Math.floor(Math.random() * 3) + 3;
      const selectedCollectors = collectors
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(numCollectors, collectors.length));

      // マトリクスに登録
      for (let i = 0; i < selectedCollectors.length; i++) {
        await prisma.store_item_collectors.create({
          data: {
            org_id: authUser.org_id,
            store_id: store.id,
            collector_id: selectedCollectors[i].id,
            item_name: itemMap.item_label,
            item_code: itemMap.jwnet_code,
            priority: i + 1, // 優先順位: 1が最優先
            created_by: authUser.id,
            updated_by: authUser.id,
          },
        });
      }
    }
  }
}
```

**生成数**: 約1,500〜2,000件（100店舗 × 5品目 × 3〜5業者）

---

### Step 2: マトリクスに基づく運用データ生成

#### 2.1 マトリクスから業者を取得
```typescript
// 各店舗のマトリクスを取得
const storeMatrix = await prisma.store_item_collectors.findMany({
  where: {
    store_id: store.id,
    deleted_at: null,
  },
  orderBy: [
    { item_name: 'asc' },
    { priority: 'asc' }, // 優先順位でソート
  ],
});

// 品目ごとにグループ化
const itemGroups = new Map<string, typeof storeMatrix>();
for (const matrix of storeMatrix) {
  const existing = itemGroups.get(matrix.item_name) || [];
  existing.push(matrix);
  itemGroups.set(matrix.item_name, existing);
}

// 各品目について、最優先の業者を選択
for (const [itemName, matrixRecords] of itemGroups) {
  const primaryMatrix = matrixRecords[0]; // priority = 1
  const collector = collectors.find((c) => c.id === primaryMatrix.collector_id);
  // ... 回収データ生成
}
```

**重要**: ランダム選択ではなく、**マトリクスの優先順位（priority）**に基づいて業者を選択

#### 2.2 料金計算
```typescript
// 廃棄物種別マスターの料金を使用
const unitPrice = wasteType.unit_price || 10000;
const amount = Number(actualQty) * unitPrice;
const taxAmount = amount * 0.1;
const totalAmount = amount + taxAmount;

await prisma.app_billing_items.create({
  data: {
    unit_price: unitPrice, // 廃棄物種別マスターの料金（自動設定済み）
    quantity: Number(actualQty),
    amount,
    tax_rate: 0.1,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    // ...
  },
});
```

**重要**: 固定の10,000円ではなく、**廃棄物種別マスターの料金（5,000〜20,000円）**を使用

---

## 📈 生成データ統計

### マスターデータ
| 項目 | 件数 | 備考 |
|------|------|------|
| 収集業者 | 200社 | 既存データ |
| 店舗 | 1,649店舗 | 既存データ |
| 廃棄品目リスト | 5品目 | 既存データ |
| 廃棄物種別マスター | 5種別 | 既存データ |
| **マトリクス** | **約1,500〜2,000件** | **自動生成** |
| **料金設定** | **5件** | **自動設定** |

### 運用データ（2024年1月〜12月）
| 項目 | 月間件数 | 年間合計 |
|------|----------|----------|
| 回収予定（plans） | 約12,000件 | 約144,000件 |
| 回収依頼（collection_requests） | 約12,000件 | 約144,000件 |
| 回収実績（collections） | 約12,000件 | 約144,000件 |
| 請求明細（app_billing_items） | 約12,000件 | 約144,000件 |
| 請求サマリー（billing_summaries） | 約200件 | 約2,400件 |

**合計**: 約298,000件

---

## 🎯 本番との整合性

### 本番フロー
```
1. 店舗×品目×業者マトリクスを登録
2. 廃棄物種別マスターに料金を設定
3. マトリクスに基づいて業者を選択
4. 料金設定に基づいて請求金額を計算
```

### テストデータ生成フロー（v2.0）
```
1. ✅ 店舗×品目×業者マトリクスを自動生成
2. ✅ 廃棄物種別マスターに料金を自動設定
3. ✅ マトリクスに基づいて業者を選択
4. ✅ 料金設定に基づいて請求金額を計算
```

**→ 本番と完全に同じロジックで生成**

---

## ⚠️ 注意事項

### 前提条件
- 収集業者・店舗・廃棄品目・廃棄物種別マスターが登録されている必要があります

### 実行時間
- **5〜10分かかります**（進捗はサーバーログで確認）
- マトリクス生成: 約1〜2分
- 運用データ生成: 約4〜8分

### マトリクス生成の条件
- **既存のマトリクスがある場合**: 生成をスキップ
- **既存のマトリクスがない場合**: 自動生成（最初の100店舗のみ）

### 料金設定の条件
- **既に料金が設定されている場合**: スキップ
- **料金が未設定（0円 or NULL）の場合**: 自動設定（5,000〜20,000円/トン）

---

## 🔧 使い方

### 1. ダッシュボードから実行
1. `システム管理` → `テストデータ管理` を開く
2. 「1年分の請求データ生成（マトリクス・料金設定含む）」セクションを確認
3. 「💰 1年分の請求データを生成（2024年1月〜12月）」ボタンをクリック
4. 5〜10分待つ（進捗はサーバーログで確認）
5. 実行結果を確認

### 2. APIから実行（開発用）
```bash
curl -X POST http://localhost:3001/api/seed/billing-year-data \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

---

## 📊 実行結果の確認

### ダッシュボードでの表示
```
✅ 実行結果: 請求データ（1年分）

収集業者数: 200社
対象店舗数: 1,649店舗
廃棄品目数: 5品目
マトリクス生成数: 1,500件

✅ 廃棄物種別マスターに料金を設定しました: 5件
✅ 店舗×品目×業者マトリクスを自動生成しました: 1,500件

📅 月別実行結果
1月: 回収予定 12,000件、回収実績 12,000件、請求明細 12,000件
2月: 回収予定 12,000件、回収実績 12,000件、請求明細 12,000件
...
```

### データベースでの確認
```sql
-- マトリクス確認
SELECT COUNT(*) FROM app.store_item_collectors WHERE deleted_at IS NULL;
-- 予想: 約1,500〜2,000件

-- 料金設定確認
SELECT id, item_label, unit_price FROM app.waste_type_masters;
-- 予想: 5件、unit_price が 5,000〜20,000円

-- 請求明細確認
SELECT 
  billing_month, 
  COUNT(*) as count,
  AVG(unit_price) as avg_price,
  SUM(total_amount) as total
FROM app.billing_items
GROUP BY billing_month
ORDER BY billing_month;
-- 予想: 月間12,000件、平均単価 12,500円前後
```

---

## 🚀 グローバルルール準拠

### ✅ Prisma のみ使用
- 直接 SQL 実行なし
- すべての操作を Prisma 経由で実行

### ✅ SSOT（Single Source of Truth）
- マトリクスデータを元に運用データを生成
- 料金設定を元に請求金額を計算
- データの一貫性を保証

### ✅ 外部キー制約
- すべてのリレーションが正しく設定
- `org_id`, `store_id`, `collector_id` などの外部キーが適切に参照

### ✅ トランザクション不要
- 月ごとに独立した処理
- 途中で失敗しても他の月には影響なし

---

## 🎓 学習ポイント

### 1. 本番フローの再現
- テストデータでも本番と同じロジックを使用
- マトリクスと料金設定に基づいた計算

### 2. データ整合性
- マトリクスがない店舗はスキップ
- 料金設定に基づいた正確な金額計算

### 3. パフォーマンス
- 100店舗のみ対象（全1,649店舗だと時間がかかりすぎる）
- 月ごとに処理を分割

---

**更新日**: 2025-10-20  
**バージョン**: 2.0  
**実装者**: AI Assistant  
**レビュー**: ユーザー承認済み





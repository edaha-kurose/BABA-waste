# 店舗×業者登録機能 最終仕様書

**作成日**: 2025-10-19  
**バージョン**: Final 1.0  
**ステータス**: 承認待ち

---

## 📋 概要

### 実装する機能
1. **業者マスター一括登録**（Phase 1）
2. **店舗×品目×業者マトリクス登録**（Phase 2）
   - UI方式: マトリクス形式の画面
   - Excel方式: 同じ形式での入出力

---

## 🎯 Phase 1: 業者マスター一括登録

### 目的
- 300社程度の業者情報を一括登録
- 後の紐付けで使用するマスターデータを準備

### Excel形式
```
業者コード | 業者名   | 電話番号      | メールアドレス | 担当者 | 住所
C001       | A社      | 03-1111-1111 | a@test.com    | 田中   | 東京都...
C002       | B社      | 03-2222-2222 | b@test.com    | 佐藤   | 神奈川県...
C003       | C社      | 03-3333-3333 | c@test.com    | 鈴木   | 埼玉県...
```

### 登録先テーブル
- `collectors`

### API
- **POST** `/api/collectors/import`
- **GET** `/api/collectors/export`

---

## 🎯 Phase 2: 店舗×品目×業者マトリクス登録

### UI設計（マトリクス形式）

#### 画面イメージ
```
┌────────────────────────────────────────────────────────────────┐
│ 店舗×品目×業者 マトリクス登録                                  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ [エクスポート] [インポート] [保存]                             │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │店舗   │品目     │業者1    │業者2    │業者3    │[+列追加]│ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │新宿店 │一般ごみ │[A社 🔍] │[B社 🔍] │[C社 🔍] │         │ │
│ │新宿店 │産廃    │[B社 🔍] │[D社 🔍] │[   🔍] │         │ │
│ │渋谷店 │一般ごみ │[E社 🔍] │[F社 🔍] │[   🔍] │         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                                │
│ 💡 ヒント:                                                     │
│  • 🔍をクリックで業者検索モーダルが開きます                    │
│  • [+列追加]で最大10列まで業者を追加できます                   │
│  • デフォルトは3列表示です                                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 業者選択UI
```
ドロップダウンではなく、検索モーダル:

┌─────────────────────────────────┐
│ 業者を検索                      │
├─────────────────────────────────┤
│ [検索: _____________] 🔍        │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ A社 (03-1111-1111)          │ │ ← クリックで選択
│ │ B社 (03-2222-2222)          │ │
│ │ C社 (03-3333-3333)          │ │
│ │ ...                         │ │
│ └─────────────────────────────┘ │
│                                 │
│ [キャンセル]  [選択]            │
└─────────────────────────────────┘

【検索機能】
- 業者名で部分一致検索
- 業者コードで検索
- 電話番号で検索
```

---

### Excel形式（入出力）

#### フォーマット（横展開マトリクス）
```
店舗コード | 店舗名 | 品目名   | 品目コード | 業者1 | 業者2 | 業者3 | 業者4 | 業者5 | ... | 業者10
S001       | 新宿店 | 一般ごみ | G001       | A社   | B社   | C社   |       |       |     |
S001       | 新宿店 | 産廃     | S001       | B社   | D社   |       |       |       |     |
S001       | 新宿店 | 資源     | R001       | A社   | C社   | E社   |       |       |     |
S002       | 渋谷店 | 一般ごみ | G001       | F社   | G社   |       |       |       |     |
S002       | 渋谷店 | 産廃     | S001       | H社   |       |       |       |       |     |
```

**特徴**:
- ✅ 1行＝1つの店舗×品目の組み合わせ
- ✅ 最大10社まで横展開
- ✅ 空欄OK（必要な分だけ入力）
- ✅ 業者名で指定（システムが業者IDに変換）

#### 参照用シート（別シート、読取専用）
```
シート名: 業者マスター

業者コード | 業者名 | 電話番号      | メールアドレス
C001       | A社    | 03-1111-1111 | a@test.com
C002       | B社    | 03-2222-2222 | b@test.com
C003       | C社    | 03-3333-3333 | c@test.com
```

**用途**:
- 業者名を確認するための参照用
- コピー＆ペーストで入力できる

---

## 🗄️ データモデル

### 使用テーブル

#### store_items（品目レベルの業者割り当て）
```prisma
model store_items {
  id                    String   @id
  org_id                String
  store_id              String   // 店舗
  item_name             String   // 品目名
  item_code             String?  // 品目コード
  assigned_collector_id String?  // 担当業者（1社目）
  sort_order            Int      // 表示順
  // ...
}
```

**問題点**: 1つの品目に1社しか紐付けられない

---

### 新規テーブル案: store_item_collectors

#### スキーマ提案
```prisma
model store_item_collectors {
  id           String   @id @default(uuid())
  org_id       String
  store_id     String
  item_name    String   // 品目名
  item_code    String?  // 品目コード
  collector_id String   // 業者ID
  priority     Int      // 表示順（1〜10）
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  created_by   String
  updated_at   DateTime @default(now())
  updated_by   String
  
  stores       stores       @relation(fields: [store_id], references: [id], onDelete: Cascade)
  collectors   collectors   @relation(fields: [collector_id], references: [id], onDelete: Cascade)
  organizations organizations @relation(fields: [org_id], references: [id], onDelete: Cascade)
  
  @@unique([org_id, store_id, item_name, collector_id], name: "uk_store_item_collector")
  @@index([store_id, item_name])
  @@index([collector_id])
}
```

**特徴**:
- ✅ 店舗 × 品目 × 業者 の3次元マトリクス
- ✅ 1つの品目に最大10社まで登録可能
- ✅ priority で表示順を管理
- ✅ SSOT準拠（一意制約で重複防止）

---

## 🔧 API 仕様

### 1. マトリクスデータ取得

#### `GET /api/store-item-collectors/matrix`

**Query Parameters**:
- `org_id`: 組織ID
- `store_id`: 店舗ID（オプション、指定で絞り込み）

**Response**:
```json
{
  "data": [
    {
      "store_code": "S001",
      "store_name": "新宿店",
      "item_name": "一般ごみ",
      "item_code": "G001",
      "collectors": [
        { "id": "uuid", "name": "A社", "priority": 1 },
        { "id": "uuid", "name": "B社", "priority": 2 },
        { "id": "uuid", "name": "C社", "priority": 3 }
      ]
    }
  ]
}
```

---

### 2. マトリクスデータ保存

#### `POST /api/store-item-collectors/matrix`

**Request Body**:
```json
{
  "org_id": "uuid",
  "user_id": "uuid",
  "data": [
    {
      "store_code": "S001",
      "item_name": "一般ごみ",
      "item_code": "G001",
      "collectors": ["A社", "B社", "C社"]
    }
  ]
}
```

**処理フロー**:
1. 既存の `store_item_collectors` を削除（該当店舗×品目）
2. 新規データを登録
3. priority は配列の順序（1, 2, 3, ...）

---

### 3. Excelエクスポート

#### `GET /api/store-item-collectors/export`

**Query Parameters**:
- `org_id`: 組織ID
- `include_reference`: `true` で業者マスターシートも出力

**Response**:
- Excelファイル（2シート構成）
  - シート1: マトリクスデータ
  - シート2: 業者マスター（参照用）

---

### 4. Excelインポート

#### `POST /api/store-item-collectors/import`

**Request Body**:
```json
{
  "org_id": "uuid",
  "user_id": "uuid",
  "data": [
    {
      "store_code": "S001",
      "store_name": "新宿店",
      "item_name": "一般ごみ",
      "item_code": "G001",
      "collector_1": "A社",
      "collector_2": "B社",
      "collector_3": "C社",
      "collector_4": "",
      ...
      "collector_10": ""
    }
  ]
}
```

**処理フロー**:
1. バリデーション
   - 店舗コード存在チェック
   - 業者名 → 業者ID変換
2. バッチ処理（50件ずつ）
3. トランザクション内で登録

---

## 🎨 UI/UX フロー

### 初期表示
```
1. ページを開く
   ↓
2. 全店舗 × 全品目のマトリクスを表示
   （初期は業者1〜3列のみ）
   ↓
3. データがあればロード、なければ空行
```

### 業者選択
```
1. 🔍アイコンをクリック
   ↓
2. 業者検索モーダルが開く
   ↓
3. 検索ボックスに業者名を入力
   ↓
4. 候補がフィルタされる
   ↓
5. クリックで選択
   ↓
6. マトリクスに反映
```

### 列追加
```
1. [+列追加]ボタンをクリック
   ↓
2. 業者4列目が追加される
   ↓
3. 最大10列まで追加可能
   ↓
4. 10列到達で[+列追加]ボタンが非表示
```

### 保存
```
1. [保存]ボタンをクリック
   ↓
2. バリデーション
   ↓
3. APIコール（POST /api/store-item-collectors/matrix）
   ↓
4. 成功メッセージ表示
```

### Excel操作
```
【エクスポート】
1. [エクスポート]ボタンをクリック
   ↓
2. 現在のマトリクスデータをExcel出力
   ↓
3. ダウンロード

【インポート】
1. [インポート]ボタンをクリック
   ↓
2. Excelファイルを選択
   ↓
3. バリデーション
   ↓
4. プレビュー表示
   ↓
5. [確定]で登録
```

---

## 📊 データ例

### ケース1: 新宿店
```
品目       | 業者1 | 業者2 | 業者3
-----------|-------|-------|------
一般ごみ   | A社   | B社   | C社
産業廃棄物 | B社   | D社   | -
資源ごみ   | A社   | C社   | E社
```

**登録されるレコード**:
```
store_item_collectors:
  { store_id: "新宿店", item_name: "一般ごみ", collector_id: "A社", priority: 1 }
  { store_id: "新宿店", item_name: "一般ごみ", collector_id: "B社", priority: 2 }
  { store_id: "新宿店", item_name: "一般ごみ", collector_id: "C社", priority: 3 }
  { store_id: "新宿店", item_name: "産業廃棄物", collector_id: "B社", priority: 1 }
  { store_id: "新宿店", item_name: "産業廃棄物", collector_id: "D社", priority: 2 }
  { store_id: "新宿店", item_name: "資源ごみ", collector_id: "A社", priority: 1 }
  { store_id: "新宿店", item_name: "資源ごみ", collector_id: "C社", priority: 2 }
  { store_id: "新宿店", item_name: "資源ごみ", collector_id: "E社", priority: 3 }
```

---

## 🚀 実装ステップ

### Phase 1: 業者マスター一括登録（1日）
1. API実装
   - `POST /api/collectors/import`
   - `GET /api/collectors/export`
2. UI実装（シンプル）
   - 業者管理画面
   - エクスポート/インポートボタン
3. テスト

---

### Phase 2: マトリクス登録（3日）

#### Day 1: DDLとAPI
1. DDL作成: `store_item_collectors` テーブル
2. Prismaスキーマ更新
3. マイグレーション実行
4. API実装（CRUD）

#### Day 2: UI実装
1. マトリクスコンポーネント作成
2. 業者検索モーダル
3. 列追加機能
4. 保存機能

#### Day 3: Excel機能
1. エクスポート実装
2. インポート実装
3. テスト

---

## 📈 パフォーマンス見積もり

### データ量
- 2000店舗 × 5品目 × 平均3業者 = 30,000レコード

### 処理時間
- **UI保存**: 1店舗×5品目 = 約1秒
- **Excelインポート**: 2000店舗×5品目 = 約2分（120秒）
  - バッチサイズ: 50件
  - バッチ数: 200バッチ
  - 1バッチあたり: 0.6秒

### タイムアウト設定
- API Route: `maxDuration = 300` (5分)

---

## 🔒 セキュリティ

### 認証
- ✅ `getAuthenticatedUser` で認証チェック
- ✅ `org_id` は認証ユーザーから取得

### バリデーション
- ✅ 店舗存在チェック
- ✅ 業者存在チェック
- ✅ 品目名のサニタイズ
- ✅ priority は1〜10の範囲

---

## 📝 補足事項

### なぜ新規テーブルが必要か？

**既存の `store_items` の制限**:
```prisma
model store_items {
  assigned_collector_id String? // ← 1社しか紐付けられない
}
```

**新規 `store_item_collectors` の利点**:
```prisma
model store_item_collectors {
  collector_id String  // ← 複数レコードで複数業者を紐付け
  priority     Int     // ← 表示順を管理
}
```

### SSOT準拠
- ✅ 一意制約で重複防止
- ✅ 外部キー制約でデータ整合性保証
- ✅ Prisma経由でのみDB操作

---

**最終更新**: 2025-10-19  
**ステータス**: 承認待ち  
**次のアクション**: ユーザー承認 → DDL作成 → 実装開始





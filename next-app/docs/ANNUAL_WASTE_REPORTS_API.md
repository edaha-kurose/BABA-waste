# 年間廃棄物報告書 API仕様書

**作成日**: 2025-10-20  
**バージョン**: 1.0.0

## 📋 概要

非JWNET廃棄物（事業系ごみ・不燃ごみ等）の年間報告書を管理するためのRESTful APIです。

### 対象廃棄物
- **JWNET不要**: `item_maps.jwnet_code` が NULL
- **JWNET不要**: `waste_type_masters.jwnet_waste_code` が NULL
- **例**: 事業系一般ごみ、不燃ごみ、資源ごみ等

### 報告期間
- **年度単位**: 4月1日〜翌年3月31日
- **年次報告**: 行政提出用の年間実績報告

---

## 🎯 グローバルルール遵守

### ✅ 実装済み機能
1. **Prisma必須**: 全データベースアクセスをPrisma経由
2. **org_id分離**: マルチテナント対応（RLS + Prismaクエリ）
3. **Zodバリデーション**: 全入力データを検証
4. **トランザクション**: 親子データの一貫性保証
5. **エラーハンドリング**: 適切なHTTPステータスコード
6. **認証チェック**: `getAuthenticatedUser()`必須

---

## 📡 API エンドポイント

### 1. 年間報告書一覧取得
```
GET /api/annual-waste-reports?fiscal_year={year}&status={status}
```

**Query Parameters**:
- `fiscal_year` (optional): 年度フィルタ
- `status` (optional): ステータスフィルタ（DRAFT | SUBMITTED | APPROVED）

**Response**:
```json
[
  {
    "id": "uuid",
    "org_id": "uuid",
    "fiscal_year": 2024,
    "report_type": "ANNUAL_GENERAL_WASTE",
    "report_period_from": "2024-04-01T00:00:00Z",
    "report_period_to": "2025-03-31T00:00:00Z",
    "status": "DRAFT",
    "items": [ /* 明細配列 */ ],
    "created_at": "2025-10-20T12:00:00Z"
  }
]
```

---

### 2. 年間報告書作成
```
POST /api/annual-waste-reports
```

**Request Body**:
```json
{
  "fiscal_year": 2024,
  "report_type": "ANNUAL_GENERAL_WASTE",
  "report_period_from": "2024-04-01T00:00:00Z",
  "report_period_to": "2025-03-31T00:00:00Z",
  "notes": "備考"
}
```

**Validation**:
- `fiscal_year`: 2000〜2100
- `report_type`: 1〜50文字
- 同一年度・同一タイプの報告書は作成不可

---

### 3. 年間報告書詳細取得
```
GET /api/annual-waste-reports/{id}
```

**Response**:
```json
{
  "id": "uuid",
  "org_id": "uuid",
  "fiscal_year": 2024,
  "report_type": "ANNUAL_GENERAL_WASTE",
  "status": "DRAFT",
  "items": [
    {
      "id": "uuid",
      "store": { "id": "uuid", "store_code": "S001", "name": "店舗A" },
      "collector": { "id": "uuid", "company_name": "業者A" },
      "waste_type": { "id": "uuid", "waste_type_name": "一般ごみ" },
      "item_label": "事業系一般ごみ",
      "total_quantity": 1500.5,
      "unit": "KG",
      "unit_price": 50,
      "total_amount": 75025,
      "collection_count": 12
    }
  ]
}
```

---

### 4. 年間報告書更新
```
PUT /api/annual-waste-reports/{id}
```

**Request Body**:
```json
{
  "status": "SUBMITTED",
  "report_file_url": "https://example.com/report.pdf",
  "notes": "更新後の備考"
}
```

**Validation**:
- `status`: DRAFT | SUBMITTED | APPROVED
- ステータス変更時、自動で日時・ユーザー記録

---

### 5. 年間報告書削除
```
DELETE /api/annual-waste-reports/{id}
```

**制約**:
- DRAFT状態のみ削除可能
- 論理削除（明細もカスケード削除）

---

### 6. 自動集計生成
```
POST /api/annual-waste-reports/generate
```

**Request Body**:
```json
{
  "fiscal_year": 2024,
  "report_type": "ANNUAL_GENERAL_WASTE"
}
```

**処理内容**:
1. 対象期間（4月〜翌年3月）の収集実績を取得
2. 非JWNET廃棄物のみをフィルタ（`jwnet_registration_id = NULL`）
3. 店舗×業者×廃棄物種別で集計
4. 年間報告書＋明細を一括作成

**Response**:
```json
{
  "message": "年間報告書を生成しました",
  "report": { /* 作成された報告書 */ },
  "summary": {
    "total_items": 150,
    "total_collections": 1200,
    "period_from": "2024-04-01T00:00:00Z",
    "period_to": "2025-03-31T00:00:00Z"
  }
}
```

---

### 7. 明細一覧取得
```
GET /api/annual-waste-reports/{id}/items
```

---

### 8. 明細作成
```
POST /api/annual-waste-reports/{id}/items
```

**Request Body**:
```json
{
  "store_id": "uuid",
  "collector_id": "uuid",
  "waste_type_id": "uuid",
  "item_label": "事業系一般ごみ",
  "total_quantity": 1500.5,
  "unit": "KG",
  "unit_price": 50,
  "collection_count": 12,
  "notes": "備考"
}
```

**Validation**:
- DRAFT状態のみ編集可能
- 関連マスタ（店舗・業者・廃棄物種別）の存在確認
- 金額自動計算: `total_amount = total_quantity × unit_price`

---

### 9. 明細更新
```
PUT /api/annual-waste-reports/{id}/items/{itemId}
```

---

### 10. 明細削除
```
DELETE /api/annual-waste-reports/{id}/items/{itemId}
```

---

### 11. 集計サマリー取得
```
GET /api/annual-waste-reports/{id}/summary
```

**Response**:
```json
{
  "report_id": "uuid",
  "fiscal_year": 2024,
  "status": "DRAFT",
  "summary": {
    "total_items": 150,
    "total_quantity": 50000.5,
    "total_amount": 2500000,
    "total_collections": 1200
  },
  "by_store": [ /* 店舗別集計 */ ],
  "by_collector": [ /* 業者別集計 */ ],
  "by_waste_type": [ /* 廃棄物種別集計 */ ]
}
```

---

## 🔐 セキュリティ

### マルチテナント分離
1. **認証**: 全エンドポイントで `getAuthenticatedUser()` 必須
2. **org_id分離**: Prismaクエリで `org_id = user.org_id` フィルタ
3. **RLS**: データベースレベルでも分離保証

### 権限制御
- **編集**: DRAFT状態のみ
- **削除**: DRAFT状態のみ
- **提出**: ステータス変更で記録

---

## 📊 データ構造

### annual_waste_reports
- **org_id**: 組織ID（マルチテナント）
- **fiscal_year**: 年度
- **report_type**: 報告書タイプ
- **report_period_from/to**: 報告期間
- **status**: DRAFT | SUBMITTED | APPROVED
- **submitted_at/by**: 提出日時・ユーザー
- **approved_at/by**: 承認日時・ユーザー
- **report_file_url**: 出力ファイルURL（後日実装）

### annual_waste_report_items
- **report_id**: 親報告書ID
- **store_id**: 店舗ID
- **collector_id**: 収集業者ID
- **waste_type_id**: 廃棄物種別ID
- **item_label**: 品目名
- **total_quantity**: 総数量
- **unit**: 単位
- **unit_price**: 単価
- **total_amount**: 合計金額
- **collection_count**: 収集回数

---

## 🚀 次フェーズ（実装予定）

### Phase 2: 出力機能
1. **Excel雛形出力**: テンプレートへのデータ出力
2. **PDF生成**: 行政提出用の公式フォーマット
3. **印刷・提出機能**: 書類生成とダウンロード

### Phase 3: UI実装
1. **一覧画面**: 年度・ステータスでフィルタ
2. **詳細画面**: 明細の閲覧・編集
3. **自動生成UI**: ボタンクリックで集計
4. **集計ビュー**: 店舗別・業者別グラフ

---

## ⚠️ 注意事項

### Prisma Client再生成
- 開発サーバー再起動時に自動生成されます
- 手動生成: `pnpm prisma generate`

### RLSポリシー適用
以下のSQLを手動で実行してください：
```bash
db/policies/rls_annual_waste_reports.sql
```

Supabase SQL Editorで実行：
1. Supabaseダッシュボードにログイン
2. SQL Editor を開く
3. ファイルの内容をコピー＆ペースト
4. 実行

---

**最終更新**: 2025-10-20  
**作成者**: AI Assistant  
**レビュー**: 承認待ち




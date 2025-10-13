# BABA Waste System - 運用手順書

**バージョン**: 1.0.0  
**最終更新日**: 2025-10-13  
**対象**: システム管理者、運用担当者

---

## 📋 目次

1. [運用概要](#運用概要)
2. [日次運用](#日次運用)
3. [週次運用](#週次運用)
4. [月次運用](#月次運用)
5. [トラブル対応](#トラブル対応)
6. [バックアップとリカバリ](#バックアップとリカバリ)
7. [セキュリティ管理](#セキュリティ管理)
8. [パフォーマンス監視](#パフォーマンス監視)
9. [緊急連絡先](#緊急連絡先)

---

## 1. 運用概要

### 1.1 運用体制

| 役割 | 担当者 | 責任範囲 |
|-----|--------|---------|
| システム管理者 | IT部門 | システム全体の管理・保守 |
| 運用担当者 | 業務部門 | 日常的なデータ管理 |
| セキュリティ担当 | IT部門 | アクセス権限・監査 |
| データ管理者 | 業務部門 | マスターデータ管理 |

### 1.2 運用時間

- **稼働時間**: 24時間365日
- **メンテナンスウィンドウ**: 毎週日曜日 3:00-5:00（システム停止を伴う場合）
- **サポート時間**: 平日 9:00-18:00

### 1.3 システム構成

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js App Router)            │
│  - Frontend UI                          │
│  - API Routes (BFF)                     │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  Supabase PostgreSQL                    │
│  - Database (app, auth, public schemas) │
│  - Row Level Security (RLS)             │
└─────────────────────────────────────────┘
```

---

## 2. 日次運用

### 2.1 システム稼働確認（毎朝 9:00）

#### チェック項目

```bash
# 1. ヘルスチェック
curl https://your-domain.vercel.app/api/health

# 期待される応答
# {"status":"ok","timestamp":"2025-10-13T00:00:00.000Z"}
```

#### 確認手順

1. **アプリケーション稼働確認**
   - ログイン画面にアクセス
   - ダッシュボードが表示されるか確認

2. **データベース接続確認**
   - Supabaseダッシュボードにアクセス
   - Project Statusが "Active" であることを確認

3. **重要機能の動作確認**
   - 回収予定の閲覧
   - 回収実績の登録
   - JWNET連携

#### 異常時の対応

- ❌ **アプリケーションが応答しない**
  → Vercelダッシュボードでデプロイメント状態を確認
  → 必要に応じて再デプロイ

- ❌ **データベース接続エラー**
  → Supabaseプロジェクトが一時停止していないか確認
  → プロジェクトを再開（Resume）

### 2.2 データバックアップ確認

Supabaseの自動バックアップが実行されているか確認：

1. Supabaseダッシュボード → **Settings** → **Backups**
2. 最新のバックアップ日時を確認
3. バックアップステータスが "Successful" であることを確認

---

## 3. 週次運用

### 3.1 データ整合性チェック（毎週月曜日 10:00）

#### SQL実行による確認

```sql
-- 1. 孤立したデータの確認（外部キー参照が失われているデータ）
-- 店舗データで組織IDが存在しないもの
SELECT s.id, s.store_name, s.org_id
FROM app.stores s
LEFT JOIN app.organizations o ON s.org_id = o.id
WHERE o.id IS NULL;

-- 2. 重複データの確認
-- 同じ店舗コードが複数存在しないか
SELECT store_code, COUNT(*) as count
FROM app.stores
GROUP BY store_code
HAVING COUNT(*) > 1;

-- 3. 廃棄物マスターの整合性確認
-- JWNET廃棄物コードが存在しないマスターデータ
SELECT wm.id, wm.waste_type_name, wm.jwnet_waste_code
FROM app.waste_type_masters wm
LEFT JOIN app.jwnet_waste_codes jw ON wm.jwnet_waste_code_id = jw.id
WHERE jw.id IS NULL;
```

#### 対処方法

- **孤立データが検出された場合**
  → 正しい外部キー参照を設定するか、データを削除

- **重複データが検出された場合**
  → どちらか一方を削除、または統合

### 3.2 パフォーマンス確認

#### Vercelダッシュボード

1. **Analytics** → **Performance**
2. 以下の指標を確認：
   - ページ読み込み時間（目標: < 3秒）
   - API応答時間（目標: < 1秒）
   - エラーレート（目標: < 1%）

#### Supabaseダッシュボード

1. **Reports** → **Database**
2. 以下の指標を確認：
   - クエリ実行時間（目標: 平均 < 500ms）
   - 接続数（Free tier: < 60, Pro: < 200）
   - ストレージ使用量

---

## 4. 月次運用

### 4.1 請求データ処理（毎月1日 9:00）

#### 実施手順

##### ステップ1: 前月の回収実績を確定

1. **回収実績**ページにアクセス
2. 前月分（例: 9月1日～9月30日）のデータを確認
3. 未完了の回収があれば完了させる

##### ステップ2: 請求データを生成

1. **請求管理**ページにアクセス
2. 請求対象月を選択（例: 2025年9月）
3. 「請求データ生成」ボタンをクリック
4. 生成完了メッセージを確認

##### ステップ3: 請求データの確認

```sql
-- 請求データの集計確認
SELECT 
  billing_month,
  COUNT(*) as total_items,
  SUM(amount) as total_amount,
  SUM(tax_amount) as total_tax
FROM app.billing_items
WHERE billing_month = '2025-09-01'
GROUP BY billing_month;
```

##### ステップ4: Excel出力

1. 請求サマリー一覧で対象月を選択
2. 「Excel出力」ボタンをクリック
3. ダウンロードされたExcelファイルを開く
4. 各列の金額を確認：
   - D列: 店舗コード
   - E列: 店舗名
   - F列～R列: 請求金額・税額

##### ステップ5: 請求書送付

1. Excelファイルを各収集業者に送付
2. 送付記録を管理シートに記入

#### トラブルシューティング

- ❌ **請求データが生成されない**
  → 回収実績データが存在するか確認
  → エラーログを確認

- ❌ **金額が合わない**
  → 廃棄物マスターの単価を確認
  → 回収実績の数量を確認
  → 請求種別（固定/従量）を確認

### 4.2 マスターデータのメンテナンス

#### 実施内容

1. **非アクティブな組織・店舗の無効化**
   ```sql
   -- 3ヶ月以上活動がない店舗を確認
   SELECT s.id, s.store_name, MAX(c.collection_date) as last_collection
   FROM app.stores s
   LEFT JOIN app.collections c ON s.id = c.store_id
   GROUP BY s.id, s.store_name
   HAVING MAX(c.collection_date) < CURRENT_DATE - INTERVAL '3 months'
   OR MAX(c.collection_date) IS NULL;
   ```

2. **廃棄物マスターの見直し**
   - 使用頻度の低い廃棄物種別を確認
   - 単価の更新が必要な項目を確認

3. **JWNET事業者組み合わせの有効期限確認**
   ```sql
   -- 有効期限が近い組み合わせを確認（30日以内）
   SELECT 
     id,
     emitter_name,
     transporter_name,
     disposer_name,
     valid_to
   FROM app.jwnet_party_combinations
   WHERE valid_to <= CURRENT_DATE + INTERVAL '30 days'
   AND is_active = true;
   ```

### 4.3 セキュリティ監査

#### 実施内容

1. **ユーザーアカウントの棚卸し**
   ```sql
   -- 全ユーザーとロールを確認
   SELECT 
     u.email,
     uor.role,
     o.name as org_name,
     u.created_at,
     u.last_sign_in_at
   FROM auth.users u
   LEFT JOIN app.user_org_roles uor ON u.id = uor.user_id
   LEFT JOIN app.organizations o ON uor.org_id = o.id
   ORDER BY u.last_sign_in_at DESC;
   ```

2. **長期間ログインしていないアカウントの確認**
   ```sql
   -- 6ヶ月以上ログインしていないユーザー
   SELECT email, last_sign_in_at
   FROM auth.users
   WHERE last_sign_in_at < CURRENT_DATE - INTERVAL '6 months'
   OR last_sign_in_at IS NULL;
   ```

3. **異常なアクセスパターンの確認**
   - Vercel Analytics → Security タブ
   - 異常なアクセス数やエラーレートを確認

---

## 5. トラブル対応

### 5.1 障害レベルの定義

| レベル | 影響範囲 | 対応時間 |
|-------|---------|---------|
| **Critical** | 全ユーザーが使用不可 | 即時（1時間以内） |
| **High** | 一部機能が使用不可 | 4時間以内 |
| **Medium** | パフォーマンス低下 | 1営業日以内 |
| **Low** | 軽微な不具合 | 1週間以内 |

### 5.2 障害対応フロー

```
障害検知
   ↓
影響範囲の特定
   ↓
レベル判定
   ↓
┌───────────────────┐
│ Critical / High   │
│  → 即時対応       │
│  → エスカレーション│
└───────────────────┘
   ↓
原因調査
   ↓
応急処置
   ↓
本対処
   ↓
再発防止策
   ↓
報告書作成
```

### 5.3 よくあるトラブルと対処法

#### トラブル1: データベース接続エラー

**症状**: `P1001: Can't reach database server`

**原因**:
1. Supabaseプロジェクトが一時停止
2. 接続文字列が間違っている
3. ネットワーク問題

**対処法**:
```bash
# 1. Supabaseプロジェクトを確認
# → Supabaseダッシュボードで "Resume" をクリック

# 2. 接続文字列を確認
# .env.local の DATABASE_URL を確認

# 3. 接続テスト
pnpm dotenv -e .env.local -- prisma db pull
```

#### トラブル2: マイグレーションエラー

**症状**: `P3018: A migration failed to apply`

**原因**:
1. マイグレーション履歴と実際のスキーマが不一致
2. 外部キー制約違反
3. データ型の不整合

**対処法**:
```bash
# 1. マイグレーション履歴を確認
pnpm dotenv -e .env.local -- prisma migrate status

# 2. 失敗したマイグレーションをロールバック
pnpm dotenv -e .env.local -- prisma migrate resolve --rolled-back "MIGRATION_NAME"

# 3. 再度マイグレーションを適用
pnpm dotenv -e .env.local -- prisma migrate deploy
```

#### トラブル3: パフォーマンス低下

**症状**: ページ読み込みが遅い、APIが応答しない

**原因**:
1. データベースクエリが非効率
2. インデックスが不足
3. 大量のデータ取得

**対処法**:
```sql
-- 1. スロークエリの特定
-- Supabase Dashboard → Reports → Database → Slow Queries

-- 2. EXPLAIN ANALYZEで実行計画を確認
EXPLAIN ANALYZE
SELECT * FROM app.collections WHERE store_id = 'xxx';

-- 3. 必要に応じてインデックスを追加
CREATE INDEX IF NOT EXISTS idx_collections_store_date 
ON app.collections(store_id, collection_date);
```

---

## 6. バックアップとリカバリ

### 6.1 バックアップ戦略

#### Supabase自動バックアップ

| プラン | 頻度 | 保持期間 |
|-------|------|---------|
| Free | 日次 | 7日間 |
| Pro | 日次 | 30日間 |

#### 手動バックアップ

```bash
# 全スキーマのダンプ
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 特定のスキーマのみダンプ
pg_dump $DATABASE_URL -n app -n auth > backup_app_auth_$(date +%Y%m%d).sql
```

### 6.2 リストア手順

#### Supabaseダッシュボードからリストア

1. **Settings** → **Backups**
2. リストアしたいバックアップを選択
3. 「Restore」ボタンをクリック
4. 確認ダイアログで「Restore」を選択

⚠️ **注意**: リストアは現在のデータを上書きします。必ず事前にバックアップを取得してください。

#### SQLファイルからリストア

```bash
# バックアップファイルからリストア
psql $DATABASE_URL < backup_20251013.sql
```

---

## 7. セキュリティ管理

### 7.1 アクセス権限管理

#### ユーザー追加手順

1. Supabaseダッシュボード → **Authentication** → **Users**
2. 「Add user」ボタンをクリック
3. メールアドレスとパスワードを入力
4. ユーザー作成後、`app.user_org_roles` テーブルにロールを追加：

```sql
INSERT INTO app.user_org_roles (user_id, org_id, role)
VALUES ('USER_UUID', 'ORG_UUID', 'USER');
```

#### ロール一覧

| ロール | 権限 |
|-------|------|
| ADMIN | 全機能へのアクセス |
| COLLECTOR | 回収実績登録、請求管理 |
| USER | 閲覧のみ |

### 7.2 パスワードポリシー

- **最小文字数**: 8文字以上
- **有効期限**: 90日（推奨）
- **再利用制限**: 過去5回分は使用不可（推奨）

### 7.3 監査ログ

```sql
-- 最近の監査ログを確認
SELECT 
  table_name,
  action,
  new_data,
  old_data,
  user_id,
  created_at
FROM app.audit_logs
ORDER BY created_at DESC
LIMIT 100;
```

---

## 8. パフォーマンス監視

### 8.1 監視項目

#### アプリケーション

| 項目 | 目標値 | 確認方法 |
|-----|--------|---------|
| ページ読み込み時間 | < 3秒 | Vercel Analytics |
| API応答時間 | < 1秒 | Vercel Analytics |
| エラーレート | < 1% | Vercel Analytics |

#### データベース

| 項目 | 目標値 | 確認方法 |
|-----|--------|---------|
| クエリ実行時間 | < 500ms | Supabase Reports |
| 接続数 | < 80% of limit | Supabase Reports |
| ストレージ使用量 | < 80% of limit | Supabase Reports |

### 8.2 アラート設定

#### Vercel

1. Vercel Dashboard → **Alerts**
2. 以下のアラートを設定：
   - デプロイメント失敗
   - エラーレート > 5%
   - 応答時間 > 5秒

#### Supabase

1. Supabase Dashboard → **Settings** → **Alerts**
2. 以下のアラートを設定：
   - データベース接続数 > 80%
   - ストレージ使用量 > 80%
   - クエリ実行時間 > 1秒

---

## 9. 緊急連絡先

### 9.1 システム管理者

| 役割 | 担当者 | 連絡先 | 対応時間 |
|-----|--------|--------|---------|
| プライマリ管理者 | 山田太郎 | yamada@example.com / 090-XXXX-XXXX | 24時間 |
| セカンダリ管理者 | 佐藤花子 | sato@example.com / 080-XXXX-XXXX | 平日 9:00-18:00 |

### 9.2 エスカレーションフロー

```
Level 1: 運用担当者（日常的なトラブル）
   ↓
Level 2: システム管理者（技術的なトラブル）
   ↓
Level 3: 外部ベンダー（重大な障害）
```

### 9.3 外部サービスのサポート

| サービス | サポート | 連絡先 |
|---------|---------|--------|
| Vercel | 24/7 Support | https://vercel.com/support |
| Supabase | Email Support | support@supabase.io |
| JWNET | 平日 9:00-17:00 | https://www.jwnet.or.jp/ |

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|----------|------|---------|
| 1.0.0 | 2025-10-13 | 初版リリース |

---

**© 2025 BABA Waste System. All rights reserved.**


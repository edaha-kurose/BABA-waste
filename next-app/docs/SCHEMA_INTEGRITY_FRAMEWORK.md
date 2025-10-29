# スキーマ整合性フレームワーク

**作成日**: 2025-10-16  
**バージョン**: 1.0  
**ステータス**: ✅ 実装完了

---

## 📋 概要

このフレームワークは「collectors テーブル不整合問題」から得られた教訓をもとに構築されました。  
Prisma schema.prisma と実際のデータベースの整合性を保ち、外部キー制約を適切に管理するためのツール群とワークフローを提供します。

---

## 🛠️ 提供するツール

### 1. `check-schema-sync.ts`
**目的**: schema.prisma と DB の同期確認

**使い方**:
```bash
pnpm check:schema-sync
```

**動作**:
1. schema.prisma をバックアップ
2. `prisma db pull` で DB から最新スキーマを取得
3. 差分があればエラーを表示し、元に戻す

**出力例**:
```
============================================================
🔍 Prisma スキーマ同期チェック開始
============================================================

📄 Step 1: schema.prisma をバックアップ中...
   ✅ バックアップ完了

📥 Step 2: DBから最新スキーマを取得中...
   コマンド: prisma db pull

🔍 Step 3: 差分確認中...
   ✅ 差分なし - schema.prisma と DB は同期しています

============================================================
✅ スキーマ同期チェック完了！
============================================================
```

---

### 2. `check-foreign-keys.ts`
**目的**: 外部キー制約の存在と動作の確認

**使い方**:
```bash
pnpm check:foreign-keys
```

**動作**:
1. app スキーマの全テーブルを取得
2. `*_id` カラムを検出（外部キー候補）
3. 外部キー制約の存在を確認
4. `ON DELETE` / `ON UPDATE` の動作を確認

**出力例**:
```
============================================================
🔍 外部キー制約チェック開始
============================================================

📋 Step 1: app スキーマのテーブル一覧を取得中...
   ✅ 25 件のテーブルを検出

🔍 Step 2: 外部キー候補（*_id カラム）をチェック中...

   📦 waste_type_masters:
      ✅ collector_id: fk_waste_type_collector (DELETE: CASCADE, UPDATE: NO ACTION)
      ✅ org_id: fk_waste_type_org (DELETE: CASCADE, UPDATE: NO ACTION)

   📦 plans:
      ✅ store_id: fk_plan_store (DELETE: CASCADE, UPDATE: NO ACTION)
      ✅ item_map_id: fk_plan_item_map (DELETE: NO ACTION, UPDATE: NO ACTION)

============================================================
✅ 外部キー制約チェック完了 - 問題なし
============================================================
```

---

### 3. `preflight` コマンド
**目的**: 実装前の総合チェック

**使い方**:
```bash
pnpm preflight
```

**動作**:
1. `pnpm check:schema-sync` 実行
2. `pnpm check:foreign-keys` 実行
3. `pnpm typecheck` 実行

**期待値**: すべて ✅ PASS

---

## 📐 標準ワークフロー

### スキーマ変更時の手順

```bash
# Step 1: プリフライトチェック
pnpm preflight

# Step 2: schema.prisma 編集
# （テーブル、リレーション追加）

# Step 3: マイグレーション実行
pnpm prisma migrate dev --name descriptive_name

# Step 4: 型生成
pnpm prisma:generate

# Step 5: 外部キー制約確認
pnpm check:foreign-keys

# Step 6: 型チェック
pnpm typecheck

# Step 7: テストデータ作成
pnpm prisma:seed

# Step 8: E2Eテスト
pnpm test:e2e
```

---

## 🔐 外部キー制約の設計ガイド

### ON DELETE / ON UPDATE の選択基準

| 親削除時の動作 | ON DELETE | 使用例 |
|----------------|-----------|--------|
| 子も削除 | CASCADE | `plans` → `actuals`（予定削除時、実績も削除） |
| 削除不可 | RESTRICT | `organizations` → `stores`（組織削除時、店舗があれば拒否） |
| 子をNULLに | SET NULL | `collectors` → `waste_type_masters`（収集業者削除時、マスターは残す） |
| 何もしない | NO ACTION | デフォルト（非推奨、明示推奨） |

| 親更新時の動作 | ON UPDATE | 使用例 |
|----------------|-----------|--------|
| 子も更新 | CASCADE | UUID は不変なので通常使用しない |
| 更新不可 | RESTRICT | 同上 |
| 何もしない | NO ACTION | 標準（UUID は不変なので問題ない） |

**推奨設定**:
```prisma
model child_table {
  parent_id String @db.Uuid
  parent_table parent_table @relation(
    fields: [parent_id], 
    references: [id], 
    onDelete: Cascade,    // 親削除時の動作を明示
    onUpdate: NoAction    // 親更新時の動作を明示
  )
}
```

---

## 📚 関連ドキュメント

| ドキュメント | 目的 |
|-------------|------|
| `POST_MORTEM_COLLECTORS_TABLE_ISSUE.md` | 今回の問題の詳細分析 |
| `.cursor/rules/global-rules-update-proposal.md` | グローバルルール更新提案 |
| `.cursor/rules/global-rules.md` | 更新後のグローバルルール |

---

## 🎯 チェックリスト: 新規プロジェクト導入時

### 1. スクリプト配置
- [ ] `scripts/check-schema-sync.ts` を配置
- [ ] `scripts/check-foreign-keys.ts` を配置

### 2. package.json 設定
- [ ] `"check:schema-sync"` コマンド追加
- [ ] `"check:foreign-keys"` コマンド追加
- [ ] `"preflight"` コマンド追加
- [ ] `"prisma:db:pull"` コマンド追加

### 3. CI/CD 設定
- [ ] `.github/workflows/ci.yml` にスキーマチェック追加
- [ ] Pre-commit hook で `pnpm preflight` 実行

### 4. ドキュメント整備
- [ ] `README.md` にマイグレーションコマンド記載
- [ ] チーム向けオンボーディング資料更新

### 5. 定期実行設定
- [ ] `pnpm check:schema-sync` を週1回実行（推奨: 月曜朝）
- [ ] `pnpm check:foreign-keys` を月1回実行（推奨: 月初）

---

## 🚀 今後の拡張案

### Priority 1（短期）
- [ ] CI/CD での自動チェック実装
- [ ] Pre-commit hook の追加
- [ ] エラーメッセージの多言語対応（英語）

### Priority 2（中期）
- [ ] スキーマ変更履歴の自動記録
- [ ] 外部キー制約の可視化ツール（ER図生成）
- [ ] 孤立レコード自動修復機能

### Priority 3（長期）
- [ ] マイグレーションのロールバックテスト自動化
- [ ] スキーマ整合性監視ダッシュボード
- [ ] Slack/Teams への通知連携

---

## 💡 他プロジェクトへの適用

### 汎用化のポイント
1. **環境変数の柔軟化**: `DATABASE_URL` 以外にも対応
2. **スキーマ名の設定**: `app` 以外のスキーマにも対応
3. **除外カラムの設定**: プロジェクト固有の除外カラムを設定可能に
4. **CI/CD テンプレート**: GitHub Actions / GitLab CI / CircleCI など複数対応

### 適用例
```bash
# 別プロジェクトへのコピー
cp scripts/check-schema-sync.ts ../other-project/scripts/
cp scripts/check-foreign-keys.ts ../other-project/scripts/

# package.json コマンド追加
# （上記「2. package.json 設定」を参照）

# 実行確認
cd ../other-project
pnpm check:schema-sync
pnpm check:foreign-keys
```

---

## 🎓 まとめ

### このフレームワークが解決する問題
1. ✅ schema.prisma と DB の乖離
2. ✅ 外部キー制約の不足
3. ✅ 孤立レコードの発生
4. ✅ データ整合性の欠如

### 開発者が得られる価値
1. **安心感**: スキーマ整合性が保証される
2. **効率化**: 手動チェックが不要になる
3. **品質向上**: データ整合性エラーが減少する
4. **学習効果**: 外部キー制約の重要性を理解できる

---

**最終更新**: 2025-10-16  
**メンテナー**: AI Assistant  
**ライセンス**: MIT








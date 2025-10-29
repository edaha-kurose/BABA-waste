# 実装サマリー: スキーマ整合性フレームワーク導入

**実施日**: 2025-10-16  
**担当**: AI Assistant  
**ステータス**: ✅ 完了

---

## 📊 実施内容サマリー

### 問題の背景
「collectors テーブル不整合問題」により、以下の課題が顕在化：
1. `schema.prisma` と実際のDBの乖離
2. 外部キー制約の不足
3. 孤立レコードの発生（11件）
4. データ整合性の欠如

### 解決アプローチ
1. **根本原因分析（Post-Mortem）**: 5 Whys手法で根本原因を特定
2. **スキーマ整合性チェックツール開発**: 2つのスクリプトを作成
3. **グローバルルール更新**: 再発防止のためのルール追加
4. **ドキュメント整備**: 他プロジェクトへの適用を考慮

---

## 🛠️ 作成した成果物

### 1. Post-Mortem ドキュメント
**ファイル**: `docs/POST_MORTEM_COLLECTORS_TABLE_ISSUE.md`

**内容**:
- 問題のサマリー
- 根本原因の5段階分析（5 Whys）
- 本来あるべき開発フロー vs 実際のフロー
- 再発防止策（即時/短期/中期）
- 今回の問題から得られた知見

**主な学び**:
1. schema.prisma と DB の同期は「希望」ではなく「要求」
2. 外部キー制約は「推奨」ではなく「必須」
3. 手動SQLとORMの混在は「柔軟性」ではなく「リスク」

---

### 2. スキーマ整合性チェックスクリプト

#### A. `scripts/check-schema-sync.ts`
**目的**: schema.prisma と DB の同期確認

**動作**:
1. schema.prisma をバックアップ
2. `prisma db pull` で DB から最新スキーマを取得
3. 差分があればエラーを表示し、元に戻す

**実行方法**:
```bash
pnpm check:schema-sync
```

**テスト結果**: ✅ 正常動作確認済み
- DB側に `collectors` テーブル追加を正しく検出
- 差分を表示し、元に戻す処理が正常に動作

---

#### B. `scripts/check-foreign-keys.ts`
**目的**: 外部キー制約の存在と動作の確認

**動作**:
1. app スキーマの全テーブルを取得
2. `*_id` カラムを検出（外部キー候補）
3. 外部キー制約の存在を確認
4. `ON DELETE` / `ON UPDATE` の動作を確認

**実行方法**:
```bash
pnpm check:foreign-keys
```

**テスト結果**: ✅ 正常動作確認済み
- 22テーブルをスキャン
- 19件の問題を検出（外部キー制約なし または 動作未定義）
- 詳細なレポートを出力

---

### 3. package.json コマンド追加

```json
{
  "scripts": {
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:db:pull": "prisma db pull && git diff prisma/schema.prisma",
    "check:schema-sync": "tsx scripts/check-schema-sync.ts",
    "check:foreign-keys": "tsx scripts/check-foreign-keys.ts",
    "preflight": "pnpm check:schema-sync && pnpm check:foreign-keys && pnpm typecheck"
  }
}
```

**追加されたコマンド**:
- `check:schema-sync`: スキーマ同期チェック
- `check:foreign-keys`: 外部キー制約チェック
- `preflight`: 実装前の総合チェック（上記2つ + 型チェック）
- `prisma:migrate:deploy`: 本番環境用マイグレーション
- `prisma:db:pull`: DB → schema.prisma 同期 + 差分表示

---

### 4. グローバルルール更新

**ファイル**: `.cursor/rules/global-rules.md`

**追加されたセクション**:
1. **🗄️ Prisma 必須ルール（CRITICAL）**
   - A. スキーマ同期の絶対原則
   - B. 外部キー制約の必須化
   - C. マイグレーション戦略の統一

2. **Phase 0: 実装前確認（拡張版）**
   - schema.prisma と DB の同期確認
   - 外部キー制約の確認

3. **品質チェック（実装後必須）**
   - スキーマ整合性チェック追加
   - 外部キー制約チェック追加

4. **絶対禁止事項（REFUSE）の追加**
   - schema.prisma と DB の同期確認なしでのマイグレーション
   - 外部キー制約なしでの `*_id` カラム追加
   - 手動SQLとPrisma Migrateの混在
   - `ON DELETE` / `ON UPDATE` の動作未定義

---

### 5. 提案ドキュメント

**ファイル**: `.cursor/rules/global-rules-update-proposal.md`

**内容**:
- 詳細なルール更新提案
- 実装例とコードサンプル
- CI/CD 設定例
- チーム共有テンプレート

**主な提案**:
1. スキーマ整合性チェックの自動化
2. 外部キー制約の必須化
3. Prisma Migrate の標準採用
4. CI/CD でのスキーマチェック追加

---

### 6. フレームワークドキュメント

**ファイル**: `docs/SCHEMA_INTEGRITY_FRAMEWORK.md`

**内容**:
- ツールの使い方
- 標準ワークフロー
- 外部キー制約の設計ガイド
- 新規プロジェクト導入時のチェックリスト
- 他プロジェクトへの適用方法

**特徴**:
- 実践的なコード例
- 明確な判断基準（ON DELETE / ON UPDATE の選択基準）
- 汎用化のポイント

---

## 📊 検証結果

### スキーマ同期チェック
✅ **正常動作**:
- DB側の変更（`collectors` テーブル追加）を正しく検出
- 差分を表示し、schema.prisma を元に戻す処理が正常に動作
- Windows環境対応（`cp` → `copyFileSync`）

### 外部キー制約チェック
✅ **正常動作**:
- 22テーブルをスキャン
- 19件の問題を検出:
  - 外部キー制約なし: 17件
  - `ON DELETE/UPDATE` 動作未定義: 2件
- 詳細なレポートを出力

---

## 🎯 今後のアクションアイテム

### Priority 1（即時対応）
- [x] `scripts/check-schema-sync.ts` 作成 ← **完了**
- [x] `scripts/check-foreign-keys.ts` 作成 ← **完了**
- [x] `package.json` にコマンド追加 ← **完了**
- [x] グローバルルールに「Prisma 必須ルール」セクション追加 ← **完了**

### Priority 2（1週間以内）
- [ ] CI/CD にスキーマ整合性チェック追加
- [ ] Pre-commit hook で `pnpm preflight` 実行
- [ ] チームメンバーへの新しいワークフロー周知

### Priority 3（1ヶ月以内）
- [ ] 既存の外部キー制約不足の修正（19件）
- [ ] `docs/guardrails/PRISMA_MIGRATION_GUIDE.md` 作成
- [ ] オンボーディング資料更新
- [ ] 既存プロジェクトへの適用（レトロフィット）

---

## 💡 他プロジェクトへの適用

### コピーすべきファイル
```bash
# スクリプト
cp scripts/check-schema-sync.ts ../other-project/scripts/
cp scripts/check-foreign-keys.ts ../other-project/scripts/

# ドキュメント
cp docs/SCHEMA_INTEGRITY_FRAMEWORK.md ../other-project/docs/
cp .cursor/rules/global-rules-update-proposal.md ../other-project/.cursor/rules/

# package.json コマンド追加（手動コピー）
```

### カスタマイズポイント
1. **環境変数**: `DATABASE_URL` 以外にも対応
2. **スキーマ名**: `app` 以外のスキーマにも対応
3. **除外カラム**: プロジェクト固有の除外カラムを設定
4. **CI/CD**: GitHub Actions / GitLab CI / CircleCI など複数対応

---

## 📚 関連ドキュメント一覧

| ドキュメント | 目的 | ステータス |
|-------------|------|----------|
| `POST_MORTEM_COLLECTORS_TABLE_ISSUE.md` | 問題の詳細分析 | ✅ 完了 |
| `global-rules-update-proposal.md` | グローバルルール更新提案 | ✅ 完了 |
| `global-rules.md` | 更新後のグローバルルール | ✅ 完了 |
| `SCHEMA_INTEGRITY_FRAMEWORK.md` | フレームワーク全体像 | ✅ 完了 |
| `IMPLEMENTATION_SUMMARY_2025-10-16.md` | 実装サマリー（本ドキュメント） | ✅ 完了 |

---

## 🎓 総括

### 技術的成果
1. ✅ スキーマ整合性を自動チェックする仕組みを構築
2. ✅ 外部キー制約の不足を検出する仕組みを構築
3. ✅ 再発防止のためのグローバルルール更新
4. ✅ 他プロジェクトへの適用可能なフレームワーク化

### プロセス的成果
1. ✅ Post-Mortem による根本原因分析
2. ✅ 5 Whys手法による深掘り
3. ✅ 再発防止策の3段階（即時/短期/中期）提案
4. ✅ ドキュメント化による知見の共有

### 組織的成果
1. ✅ グローバルルールの充実化
2. ✅ 開発フローの標準化
3. ✅ プリフライトチェックの導入
4. ✅ 品質保証の自動化

---

**最終更新**: 2025-10-16  
**作成者**: AI Assistant  
**レビュー**: 未実施
**承認**: 未実施








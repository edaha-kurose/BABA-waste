# SCHEMA_CHANGE_GUIDELINES.md — スキーマ変更ガイドライン v3.2
**更新日**: 2025-10-10

## 0. 目的
破壊的変更を未然に防ぎ、影響範囲を可視化しながら安全にスキーマを進化させる。

## 1. 基本フロー（8ステップ）
1) 影響範囲分析: `pnpm schema:impact -- --table <t> [--column <c>]`  
2) 実スキーマ確認: information_schema / pg_enum / FK  
3) DDLは**番号追加**（既存編集禁止）  
4) DDLに**目的/影響/ロールバック**をコメント  
5) 型定義再生成: `pnpm gen:db-types && pnpm codegen`  
6) 実装（BFF/Prisma・Zod検証）  
7) 検証SQL（件数/重複/金額/参照整合）  
8) Runbook更新（インシデントと手順の差分）

## 2. 命名規則（例）
- `NNN_<verb>_<target>.sql` （例：`024_add_invoice_number_to_headers.sql`）
- 既存DDLは**編集しない**／**常に新しい番号**／ロールバック明記

## 3. 影響度の扱い
- LOW/MEDIUM/HIGH/CRITICAL を自動判定し、**HIGH+ はCIで停止**
- 代替案・段階移行（ビューや互換カラム）を必ず提示

## 4. RLS / Seed / 依存順序
- 診断時のみ RLS OFF（同一Txで即ON、対象明示）
- 親→子でINSERT、削除は子→親
- Seed は範囲（tenant, month）必須、1Tx、検証で異常時は失敗

## 5. ドキュメント
- 変更は **insights** と **runbooks** に記録
- 重大変更は **docs/COMPLETE_SCHEMA_VALIDATION_REPORT.md** を更新

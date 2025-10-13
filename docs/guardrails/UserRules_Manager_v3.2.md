# UserRules_Manager_v3.2 — Cursor用（貼り付け推奨）
**更新日**: 2025-10-10

## 原則（短縮）
- DB契約ファースト / DDLは追加式 / 採番=CTE+ROW_NUMBER / RLS短時間OFF→即ON / BFF+Prisma 経由
- 不明点は **質問** してから実装（テーブル/列/ENUM/JOINキー/RLS境界/影響度）

## タスクの出力型
1) 確認SQL → 2) 影響範囲 → 3) 設計方針 → 4) 変更DDL/SQL → 5) 検証SQL → 6) Runbook更新案 → 7) 実行コマンド

## 自動化の呼び出し
- 影響範囲: `pnpm schema:impact -- --table <t> [--column <c>]`
- Preflight/インシデント: `pnpm -C tools/orchestrator scan`
- 型SSOT: `pnpm gen:db-types && pnpm codegen`

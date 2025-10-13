# CURSOR_COMMON_SETTINGS_MIN.md — 最小原則（憲法） v3.2
**更新日**: 2025-10-10

本書は Cursor の *UserRules* が常時参照する **不変の原則** を最小限にまとめたものです。
詳細手順は Runbook（`docs/runbooks/*`）とガイド（`docs/guardrails/*`）を参照。

## 1. DB契約ファースト
- 実装前に **information_schema / pg_enum / 外部キー** を確認（Preflight）
- JOIN は **PK/FK** のみ（`id(UUID)` と `*_no(TEXT)` は別物）

## 2. 変更は常に冪等・追加式
- 既存DDLは編集せず **番号追加**
- `DROP IF EXISTS` → `CREATE`、関数より先にトリガーをDROP

## 3. 採番は CTE + ROW_NUMBER
- 相関MAX禁止。別CTEで最大値を前計算し、ROW_NUMBERで連番

## 4. 型・制約は明示
- DATE/TIMESTAMP/UUID/ENUM は **明示キャスト**
- NOT NULL は必須指定、暗黙のデフォルトに依存しない

## 5. RLS は短時間 OFF → 即 ON（同一Tx）
- 対象テーブルを列挙し、ログを残す。診断以外は原則 ON のまま

## 6. BFF/Prisma 経由
- 業務DMLは **BFF + Prisma**。フロントから直接DB操作しない

## 7. Seed/Reset の原則
- スコープ必須（tenant / month）、1Tx、事後検証で異常時は例外

## 8. Ask-First（不明点は必ず質問）
- テーブル/列/ENUM 不確実、JOIN キー不明、RLS境界未定義、影響度 HIGH+ は **実装前に質問**

> 実行はスクリプト/CI（`scripts/*`, `.github/workflows/*`）が担保し、UserRulesは“**質問→設計→実行**”を強制します。

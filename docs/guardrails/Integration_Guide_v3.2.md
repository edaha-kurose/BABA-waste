# Integration_Guide_v3.2 — 既存リポジトリへの統合
1) 本ROOT-DROPの**中身**をリポジトリ直下に配置（ネスト禁止）
2) Cursor:
   - UserRules → `docs/guardrails/UserRules_Manager_v3.2.md` を貼付
   - Memories → `docs/guardrails/Memory_Seeds_Manager_v3.2.md` を短文化して登録
   - Kickoff → `docs/runbooks/_prompt-kickoff.md` を会話先頭に
3) CI:
   - `.github/workflows/*` はルートに配置済み
   - Secrets: `TEST_DATABASE_URL` 等を登録
4) コマンド:
   - 影響範囲: `pnpm schema:impact -- --table <t> [--column <c>]`
   - Orchestrator: `pnpm -C tools/orchestrator scan`
   - 型生成: `pnpm gen:db-types && pnpm codegen`

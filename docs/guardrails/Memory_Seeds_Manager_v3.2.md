# Memory_Seeds_Manager_v3.2 — Cursor Memories 用
- スキーマ: `public`, `app`。RLSは原則ON
- JOIN: PK/FK のみ（`id` と `*_no` は別型）
- B番号: 'B'+6桁。月×テナントで CTE+ROW_NUMBER
- 影響範囲: `pnpm schema:impact -- --table <t>`
- Preflight: `pnpm -C tools/orchestrator scan`
- 型生成: `pnpm gen:db-types && pnpm codegen`

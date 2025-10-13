# rls-diagnosis — RLS短時間OFF→即ON（同一Tx）
- 対象テーブルを列挙して DISABLE → 検証 → ENABLE
- 期間は同一トランザクション内に限定。ログを残す

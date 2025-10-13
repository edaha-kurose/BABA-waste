# db-preflight — 情報スキーマ/ENUM/依存診断
## 使い方
- information_schema.columns / table_constraints / pg_enum を取得し、存在・型・制約・ENUM値を確定
- 外部キー依存を洗い出し、親→子の順序で計画

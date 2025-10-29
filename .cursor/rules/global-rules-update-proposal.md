# Global Rules 更新提案

**作成日**: 2025-10-16  
**理由**: collectors テーブル不整合問題からの学び  
**参照**: `next-app/docs/POST_MORTEM_COLLECTORS_TABLE_ISSUE.md`

---

## 📋 追加すべきセクション

以下の内容を `.cursor/rules/global-rules.md` に追加することを提案します。

---

## 🗄️ Prisma 必須ルール（CRITICAL）

### A. スキーマ同期の絶対原則

**❌ 禁止パターン**:
```typescript
// schema.prisma だけ編集してDBに反映しない
model new_table {
  id String @id
  // ... フィールド定義
}
// → pnpm prisma migrate dev を実行せず実装開始 ← 絶対NG
```

**✅ 正しいパターン**:
```bash
# Step 1: スキーマ同期確認（実装前必須）
pnpm check:schema-sync

# Step 2: schema.prisma 編集
# （テーブル、リレーション追加）

# Step 3: マイグレーション実行
pnpm prisma migrate dev --name descriptive_name

# Step 4: 型生成
pnpm prisma:generate

# Step 5: 検証
pnpm typecheck
```

**定期実行必須**:
```bash
# 週1回、月曜朝に実行推奨
pnpm prisma db pull  # DB → schema.prisma 同期
git diff prisma/schema.prisma  # 差分確認
```

---

### B. 外部キー制約の必須化

**ルール**:
- `*_id` カラムには **必ず** 外部キー制約を追加
- `ON DELETE` / `ON UPDATE` の動作を **明示**
- schema.prisma で `@relation` を **必ず** 定義

**❌ 禁止パターン**:
```prisma
model waste_type_masters {
  id           String @id
  collector_id String @db.Uuid  // ← 外部キー制約なし = NG
}
```

**✅ 正しいパターン**:
```prisma
model waste_type_masters {
  id           String     @id
  collector_id String     @db.Uuid
  collectors   collectors @relation(fields: [collector_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  
  @@index([collector_id])
}

model collectors {
  id                 String               @id
  waste_type_masters waste_type_masters[]
}
```

**SQL DDL での明示**:
```sql
-- ✅ 正しい例（動作を明示）
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id)
  ON DELETE CASCADE    -- 親削除時に子も削除
  ON UPDATE NO ACTION; -- 親更新時は何もしない

-- ❌ 悪い例（動作未定義）
ALTER TABLE app.waste_type_masters
ADD CONSTRAINT fk_waste_type_collector
  FOREIGN KEY (collector_id)
  REFERENCES app.collectors (id);  -- ON DELETE/UPDATE なし
```

---

### C. マイグレーション戦略の統一

**標準**: Prisma Migrate を採用

**❌ 禁止**:
```bash
# 手動SQLでテーブル作成
psql $DATABASE_URL -f db/migrations/001_create_table.sql
```

**✅ 正解**:
```bash
# Prisma Migrate を使用
pnpm prisma migrate dev --name create_collectors_table
```

**例外（手動SQL許可）**:
1. **RLS ポリシー追加**
   ```sql
   CREATE POLICY "policy_name" ON table_name FOR SELECT TO authenticated USING (...);
   ```

2. **ストアドプロシージャ作成**
   ```sql
   CREATE OR REPLACE FUNCTION calculate_billing() RETURNS void AS $$ ... $$ LANGUAGE plpgsql;
   ```

3. **大量データ移行**
   ```sql
   UPDATE large_table SET status = 'migrated' WHERE created_at < '2024-01-01';
   ```

**例外時の必須手順**:
```bash
# 1. 手動SQL実行後
psql $DATABASE_URL -f custom.sql

# 2. スキーマ同期確認（必須）
pnpm check:schema-sync

# 3. 差分があれば schema.prisma を更新
pnpm prisma db pull

# 4. 型生成
pnpm prisma:generate
```

---

### D. スキーマ整合性チェックの自動化

**必須スクリプト作成**:

#### 1. `scripts/check-schema-sync.ts`
```typescript
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

async function main() {
  console.log('🔍 Prisma スキーマ同期チェック開始...')
  
  // 1. schema.prisma をバックアップ
  const originalSchema = readFileSync('prisma/schema.prisma', 'utf-8')
  execSync('cp prisma/schema.prisma prisma/schema.prisma.backup')
  
  // 2. DB から最新スキーマを取得
  console.log('📥 DBから最新スキーマを取得中...')
  execSync('pnpm prisma db pull', { stdio: 'inherit' })
  
  // 3. 差分確認
  const newSchema = readFileSync('prisma/schema.prisma', 'utf-8')
  if (originalSchema !== newSchema) {
    console.error('❌ schema.prisma と DB が乖離しています！')
    console.error('   差分を確認してください:')
    execSync('git diff prisma/schema.prisma', { stdio: 'inherit' })
    
    // 元に戻す
    execSync('mv prisma/schema.prisma.backup prisma/schema.prisma')
    process.exit(1)
  }
  
  console.log('✅ schema.prisma と DB は同期しています')
  execSync('rm prisma/schema.prisma.backup')
}

main()
```

#### 2. `scripts/check-foreign-keys.ts`
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 外部キー制約チェック開始...')
  
  let hasIssues = false
  
  // app スキーマの全テーブルを取得
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_type = 'BASE TABLE'
  `
  
  for (const { table_name } of tables) {
    // 外部キー候補（*_id カラム）を取得
    const fkCandidates = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'app'
        AND table_name = ${table_name}
        AND column_name LIKE '%_id'
        AND column_name NOT IN ('id', 'org_id', 'tenant_id', 'created_by', 'updated_by', 'approved_by')
    `
    
    for (const { column_name } of fkCandidates) {
      // 外部キー制約が存在するか確認
      const fkConstraint = await prisma.$queryRaw<any[]>`
        SELECT tc.constraint_name, rc.delete_rule, rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_schema = 'app'
          AND tc.table_name = ${table_name}
          AND tc.constraint_type = 'FOREIGN KEY'
          AND EXISTS (
            SELECT 1 FROM information_schema.key_column_usage kcu
            WHERE kcu.constraint_name = tc.constraint_name
              AND kcu.column_name = ${column_name}
          )
      `
      
      if (fkConstraint.length === 0) {
        console.warn(`⚠️  ${table_name}.${column_name} に外部キー制約がありません`)
        hasIssues = true
      } else {
        const { constraint_name, delete_rule, update_rule } = fkConstraint[0]
        if (delete_rule === 'NO ACTION' && update_rule === 'NO ACTION') {
          console.warn(`⚠️  ${table_name}.${column_name} (${constraint_name}): ON DELETE/UPDATE の動作を明示してください`)
          hasIssues = true
        }
      }
    }
  }
  
  if (hasIssues) {
    console.error('\n❌ 外部キー制約に問題があります')
    process.exit(1)
  }
  
  console.log('✅ 外部キー制約チェック完了')
}

main().finally(() => prisma.$disconnect())
```

#### 3. `package.json` への追加
```json
{
  "scripts": {
    "check:schema-sync": "tsx scripts/check-schema-sync.ts",
    "check:foreign-keys": "tsx scripts/check-foreign-keys.ts",
    "preflight": "pnpm check:schema-sync && pnpm check:foreign-keys && pnpm typecheck",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:db:pull": "prisma db pull && git diff prisma/schema.prisma"
  }
}
```

---

### E. CI/CD 必須チェック

**`.github/workflows/ci.yml` への追加**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  database-integrity:
    name: Database Integrity Check
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Check schema sync
        run: pnpm check:schema-sync
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Check foreign keys
        run: pnpm check:foreign-keys
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run migrations
        run: pnpm prisma:migrate:deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: TypeScript type check
        run: pnpm typecheck
```

---

## 🎯 Phase 0: 実装前確認（拡張版）

実装開始前に以下を確認し、**1つでも不明ならASKで質問**:

- [ ] テーブル/列/ENUM/JOINキーは確定しているか？
- [ ] RLS境界は明確か？
- [ ] 影響度はLOW/MEDIUMか？（HIGH+なら必ずASK）
- [ ] **【NEW】schema.prisma と DB は同期しているか？** (`pnpm check:schema-sync`)
- [ ] **【NEW】外部キー制約は適切か？** (`pnpm check:foreign-keys`)
- [ ] **【NEW】マイグレーション戦略は統一されているか？** (Prisma Migrate vs 手動SQL)

**必須コマンド**:
```bash
# プリフライトチェック（実装前必須）
pnpm preflight

# または個別実行
pnpm check:schema-sync
pnpm check:foreign-keys
pnpm schema:impact -- --table <table_name>
```

---

## 📊 品質チェック（実装後必須）

実装完了後は必ず以下を実行してください:

```bash
# 0. プリフライトチェック（再確認）
pnpm preflight

# 1. TypeScript型チェック
pnpm typecheck

# 2. Lint
pnpm lint

# 3. スキーマ整合性チェック（NEW）
pnpm check:schema-sync

# 4. 外部キー制約チェック（NEW）
pnpm check:foreign-keys

# 5. ユニットテスト
pnpm test:unit

# 6. コンソールエラー検知
pnpm test:console

# 7. E2Eテスト
pnpm test:e2e
```

**期待値:**
- `pnpm preflight` → ✅ PASS
- `pnpm typecheck` → 0 errors
- `pnpm lint` → 0 warnings
- `pnpm check:schema-sync` → ✅ 同期OK
- `pnpm check:foreign-keys` → ✅ 制約OK
- `pnpm test:console` → 0 console errors
- All tests → ✅ PASS

---

## 🚫 絶対禁止事項（REFUSE）の追加

以下の場合は**実装を拒否**し、代替案を提示してください:

8. ❌ **schema.prisma と DB の同期確認なしでのマイグレーション**
   - 対応: 必ず `pnpm check:schema-sync` を実行

9. ❌ **外部キー制約なしでの `*_id` カラム追加**
   - 対応: `@relation` を schema.prisma に定義し、DDL で外部キー制約を追加

10. ❌ **手動SQLとPrisma Migrateの混在**
    - 対応: Prisma Migrate に統一するか、手動SQL実行後に `pnpm check:schema-sync` を実行

11. ❌ **`ON DELETE` / `ON UPDATE` の動作未定義**
    - 対応: DDL で明示的に `ON DELETE CASCADE` または `ON DELETE NO ACTION` を指定

---

## 📚 新しいドキュメント要求

プロジェクト開始時に以下のドキュメントを作成することを推奨:

### 1. `docs/guardrails/PRISMA_MIGRATION_GUIDE.md`
- Prisma Migrate の使い方
- スキーマ同期の手順
- トラブルシューティング

### 2. `docs/runbooks/schema-sync-check.md`
- スキーマ同期チェックの実行手順
- CI/CD での自動化方法
- 乖離発生時の対処法

### 3. `docs/runbooks/foreign-key-management.md`
- 外部キー制約の命名規則
- `ON DELETE` / `ON UPDATE` の選択基準
- 既存テーブルへの外部キー追加手順

---

## 💡 チーム共有テンプレート

新規参画者向けのオンボーディング資料に以下を追加:

### スキーマ変更の基本フロー
```markdown
## スキーマ変更を行う前に

### 1. 事前確認
```bash
# スキーマ同期確認
pnpm check:schema-sync

# 外部キー制約確認
pnpm check:foreign-keys
```

### 2. schema.prisma 編集
- テーブル定義を追加/変更
- `@relation` を必ず定義
- 外部キー制約の動作（`onDelete`, `onUpdate`）を明示

### 3. マイグレーション実行
```bash
# マイグレーション作成
pnpm prisma migrate dev --name descriptive_name

# 型生成
pnpm prisma:generate
```

### 4. 検証
```bash
# 型チェック
pnpm typecheck

# 外部キー制約確認
pnpm check:foreign-keys

# テストデータ作成
pnpm prisma:seed

# E2Eテスト
pnpm test:e2e
```

### 5. レビュー依頼
- マイグレーションファイルを確認
- schema.prisma の差分を確認
- 外部キー制約の動作を確認
```

---

## 🎓 まとめ: 追加すべきルールの優先順位

### 🔴 Priority 1（即時対応）
1. `scripts/check-schema-sync.ts` 作成
2. `scripts/check-foreign-keys.ts` 作成
3. `package.json` にコマンド追加
4. グローバルルールに「Prisma 必須ルール」セクション追加

### 🟡 Priority 2（1週間以内）
1. CI/CD にスキーマ整合性チェック追加
2. Pre-commit hook で `pnpm check:schema-sync` 実行
3. チームメンバーへの新しいワークフロー周知

### 🟢 Priority 3（1ヶ月以内）
1. `docs/guardrails/PRISMA_MIGRATION_GUIDE.md` 作成
2. `docs/runbooks/schema-sync-check.md` 作成
3. オンボーディング資料更新
4. 既存プロジェクトへの適用（レトロフィット）

---

**最終更新**: 2025-10-16  
**提案者**: AI Assistant  
**ステータス**: ✅ レビュー待ち  
**次のアクション**: グローバルルール更新 → チーム承認 → 実装








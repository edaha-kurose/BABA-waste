# Global Development Rules for All Projects

**このファイルはCursorが自動的に読み込みます。全プロジェクト共通のルールです。**

---

## 💰 コスト最適化（最優先ルール）

**出力トークン削減のため、以下を厳守**:

1. **簡潔な応答**
   - 説明は最小限（2〜3文）
   - コード例は必要箇所のみ（5〜10行）
   - 冗長な前置き・まとめは不要

2. **ドキュメント自動生成を制限**
   - ユーザーが明示的に要求した場合のみ
   - 箇条書きで簡潔に

3. **絵文字・装飾を削減**
   - 絵文字は1〜2個まで
   - 罫線・装飾は不要

4. **出力の目安**: 日本語200〜400文字以内

---

## 📋 簡潔ドキュメント戦略（必須）

**ドキュメント生成時は以下の形式で最小化**:

### 基本構造（3セクションのみ）
```markdown
# 機能名

## 概要
- 目的: 1文で
- 使い方: 3ステップ以内

## 設定
| 項目 | 値 | 備考 |
|------|-----|------|
| 環境変数 | XXX | 必須/任意 |

## テスト
- [ ] 基本動作
- [ ] エラーケース
```

### 禁止事項
- ❌ 長文の説明（5行以上）
- ❌ 詳細な背景説明
- ❌ 冗長なコード例（10行以上）
- ❌ スクリーンショット
- ❌ 詳細な技術解説

### 許可事項
- ✅ テーブル形式の情報整理
- ✅ チェックリスト
- ✅ 最小限のコード例（5〜10行）

---

## 🎯 開発開始時の必須チェック

### Phase 0: 実装前確認（ASK判断）

実装開始前に以下を確認し、**1つでも不明ならASKで質問**:

- [ ] テーブル/列/ENUM/JOINキーは確定しているか？
- [ ] RLS境界は明確か？
- [ ] 影響度はLOW/MEDIUMか？（HIGH+なら必ずASK）

### 必須ドキュメント読み込み

新規タスク開始時は以下を順番に読み込んでください:

1. プロジェクトルートの `.cursorrules` を確認
2. `docs/guardrails/` 配下を参照
3. `docs/runbooks/_prompt-kickoff.md` に従う

---

## 🗄️ データベース操作の絶対ルール

### A. テストデータ操作の原則

**❌ 禁止事項**:
1. 関連テーブルへの直接 INSERT/DELETE/UPDATE
2. 複数テーブルに跨るデータの部分的削除（整合性崩壊）
3. 外部キー制約を無視した削除（子→親の順序厳守）
4. 一意制約を無視した重複データ作成

**✅ 必須事項**:
1. 操作前に整合性チェック（重複・孤立データの確認）
2. 専用の安全なスクリプト・関数を使用
3. プロジェクト固有の手順書に従う

### B. 外部キー制約の必須確認

**新しいテーブル作成時**:
```sql
-- ❌ 悪い例（動作未定義）
FOREIGN KEY (parent_id) REFERENCES parent_table(id)

-- ✅ 良い例（カスケード動作を明示）
FOREIGN KEY (parent_id) REFERENCES parent_table(id) 
  ON DELETE CASCADE  -- 親削除時に子も削除
  ON UPDATE CASCADE  -- 親更新時に子も更新
```

**AI実装時のチェックリスト**:
- [ ] 外部キー制約に `ON DELETE`/`ON UPDATE` を明示
- [ ] 一意制約（UNIQUE）の設定を確認
- [ ] 関連テーブル間の整合性を確認

### C. Seed/Reset 操作のトランザクション必須

```sql
-- ✅ 正しいパターン
BEGIN;
  -- Step 1: 子テーブル削除（外部キー順序）
  DELETE FROM child_table WHERE parent_id IN (...);
  
  -- Step 2: 親テーブル削除
  DELETE FROM parent_table WHERE id = '...';
  
  -- Step 3: 関連テーブルも削除
  DELETE FROM related_table WHERE key = '...';
  
  -- Step 4: 再作成
  INSERT INTO ...;
COMMIT;

-- ❌ 間違ったパターン（トランザクション無し）
DELETE FROM users ...;  -- これだけだと整合性が崩れる
```

---

## 📐 技術スタック（必須準拠）

```yaml
required_stack:
  bff: "Next.js 14+ App Router"
  orm: "Prisma 5+"              # ← 必須（Supabase直接クエリ禁止）
  database: "Supabase PostgreSQL"
  validation: "Zod"
  api_spec: "OpenAPI 3.1"
  testing:
    - "Vitest (unit)"
    - "Playwright (e2e)"

prohibited:
  - "Direct Supabase queries from frontend"
  - "Raw SQL without Prisma in BFF layer"
  - "Manual type definitions (use codegen)"
  - "Text type for ID columns (use UUID)"
```

---

## 🔧 必須自動化コマンド

開発時は必ず以下を実行してください:

```bash
# 影響範囲分析（スキーマ変更時）
pnpm schema:impact -- --table <table_name>

# Preflight診断（実装前）
pnpm -C tools/orchestrator scan

# 型生成（スキーマ変更後）
pnpm gen:db-types && pnpm codegen

# Prisma マイグレーション
pnpm prisma:migrate
pnpm prisma:generate
```

---

## 🚫 絶対禁止事項（REFUSE）

以下の場合は**実装を拒否**し、代替案を提示してください:

1. ❌ **既存DDLの直接編集**（ALTER TABLE ... MODIFY等）
   - 対応: 追加式DDL（ALTER TABLE ... ADD COLUMN IF NOT EXISTS）

2. ❌ **RLS OFF長時間**（1トランザクション超過）
   - 対応: 短時間OFF→即ON（同一トランザクション内）

3. ❌ **フロントエンドへの秘密鍵露出**（JWNET_API_KEY等）
   - 対応: 環境変数はサーバーサイドのみ（NEXT_PUBLIC_プレフィックスなし）

4. ❌ **Prisma経由でないDB操作**（BFF層では必須）
   - 対応: `prisma.table_name.findMany()` 等を使用

5. ❌ **型生成なしでのAPI実装**
   - 対応: `pnpm codegen` → OpenAPI Specから型生成

6. ❌ **TEXT型でのID列定義**
   - 対応: 必ずUUID型を使用

---

## 🎯 判断基準（Decision Matrix）

### ASK（質問必須）
以下の場合は**実装前に質問**してください:
- テーブル/列/ENUM不明
- JOINキー未確定（`id`と`xxx_no`の混在等）
- RLS境界未定義
- 影響度HIGH+

### GENERATE（自動生成OK）
以下の場合は実装を進めてください:
- 前提確定済み
- 影響度LOW/MEDIUM
- Runbook付き

### REFUSE（拒否→代替案）
以下の場合は実装を拒否してください:
- 既存DDL編集
- RLS OFF長時間
- 機密露出
- TEXT型ID

---

## 📊 品質チェック（実装後必須）

実装完了後は必ず以下を実行してください:

```bash
# TypeScript型チェック
pnpm typecheck

# Lint
pnpm lint

# ユニットテスト
pnpm test:unit

# コンソールエラー検知
pnpm test:console

# E2Eテスト
pnpm test:e2e
```

**期待値:**
- `pnpm typecheck` → 0 errors
- `pnpm lint` → 0 warnings
- `pnpm test:console` → 0 console errors
- All tests → ✅ PASS

---

## 🔐 セキュリティチェック

実装前に必ず確認してください:

- [ ] 環境変数は`process.env`から取得（クライアント側露出なし）
- [ ] APIキーは`NEXT_PUBLIC_`プレフィックスなし
- [ ] 秘密鍵（JWNET_API_KEY等）はサーバーサイドのみ
- [ ] Zodでリクエストバリデーション実装
- [ ] 認証チェック（`getAuthenticatedUser`）実装
- [ ] Prismaトランザクション使用（複数テーブル更新時）

---

## 📝 開発フロー（7ステップ必須）

タスクを受けたら、**必ず以下の順序で実行**してください:

### Step 1: 前提確認SQL
```sql
-- columns/NOT NULL/FK/ENUMを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = '<target_table>';

-- 外部キー確認
SELECT tc.constraint_name, kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = '<target_table>';

-- ENUM値確認
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = '<enum_type>';
```

### Step 2: 影響範囲分析
```bash
pnpm schema:impact -- --table <table_name> [--column <column_name>]
```

### Step 3: 設計方針
```
設計方針を明示:
- RLS: ON/OFFのタイミングと対象テーブル
- 採番: CTE+ROW_NUMBER / SEQUENCE / 関数
- 依存順序: 親→子の挿入順序
- 冪等性: ON CONFLICT / UPSERT戦略
```

### Step 4: 変更案（DDL/BFF API）

**DDL例（追加式）:**
```sql
ALTER TABLE target_table 
ADD COLUMN IF NOT EXISTS new_column TEXT;
```

**BFF API例:**
```typescript
// app/api/*/route.ts
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Prisma経由でDB操作（必須）
  const result = await prisma.table_name.create({
    data: { /* ... */ }
  });
  
  return NextResponse.json(result);
}
```

### Step 5: 検証手順
```sql
-- 事後検証SQL
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM table_name WHERE condition;
  IF v_count != expected_count THEN
    RAISE EXCEPTION 'Validation failed: expected %, got %', expected_count, v_count;
  END IF;
END $$;
```

### Step 6: 自動化コマンド
```bash
# 型生成
pnpm gen:db-types && pnpm codegen

# Preflight診断
pnpm -C tools/orchestrator scan

# テスト
pnpm test:unit
pnpm test:e2e
```

### Step 7: 不明点確認
```
不明点があれば、Yes/No形式で質問:
- Q1: テーブルXにはカラムYが存在しますか？
- Q2: RLSは既に有効ですか？
- Q3: この変更は既存データに影響しますか？
```

---

## 🗄️ Prisma使用パターン

### ✅ 正しい使い方

```typescript
// 1. 単純なクエリ
const users = await prisma.users.findMany({
  where: { tenant_id: user.tenant_id }
});

// 2. リレーション含むクエリ
const records = await prisma.main_table.findMany({
  where: { tenant_id: user.tenant_id },
  include: {
    related_table: true,
    parent_table: true
  }
});

// 3. トランザクション
await prisma.$transaction(async (tx) => {
  await tx.header_table.create({ data: headerData });
  await tx.detail_table.createMany({ data: detailsData });
});

// 4. Raw SQL（複雑な集計のみ）
const result = await prisma.$queryRaw<ResultType[]>`
  SELECT * FROM view_name WHERE tenant_id = ${tenantId}
`;
```

### ❌ 禁止パターン

```typescript
// ❌ フロントエンドから直接データベースアクセス
const { data } = await supabase.from('table_name').select('*');

// ❌ BFF層で直接クエリ（ORM使用必須）
const { data } = await supabaseAdmin.from('table_name').select('*');

// ✅ 正解: ORM経由（Prisma, TypeORM等）
const data = await prisma.table_name.findMany();
```

---

## 🌐 例外: Supabase直接使用が許可される場合

以下の**3つのケース**のみSupabase直接クエリを許可:

1. **RLS必須のクエリ**（ユーザー権限チェック）
   ```typescript
   const { data } = await supabase.rpc('check_user_permission', {
     user_id: user.id,
     resource: 'resource_name'
   });
   ```

2. **Realtime Subscriptions**
   ```typescript
   const channel = supabase.channel('notifications')
     .on('postgres_changes', { /* ... */ }, callback)
     .subscribe();
   ```

3. **Storage操作**
   ```typescript
   const { data } = await supabase.storage
     .from('collection-photos')
     .upload(path, file);
   ```

---

## 🔐 データベース安全原則

**データ整合性を保つため、以下の原則を遵守**

### 基本原則
1. **直接SQL操作を避ける**
   - 複数テーブルに関連するデータは、トランザクション内で一括処理
   - 安全な関数・プロシージャを経由する

2. **整合性を自動保証**
   - トリガーで制約を強制
   - CHECK制約・外部キー制約を活用

3. **定期チェックを実施**
   - CI/CDでデータ整合性チェックを自動化
   - デプロイ前に検証必須

### プロジェクト固有ルール
詳細は `.cursor/rules/` 配下のプロジェクト固有ファイルを参照

---

## 📚 参考ドキュメント

### プロジェクト固有ルール（存在する場合）
- `.cursor/rules/` ディレクトリ内の専用ルールファイル
- `docs/` ディレクトリ内のガイド・仕様書
- プロジェクトの `README.md`

### ルール優先順位
1. プロジェクト固有ルール（`.cursor/rules/*.md`）
2. このグローバルルール
3. プロジェクトのドキュメント（`docs/`）

---

**このルールは全てのAI開発セッションで自動適用されます。**
**不明点があれば、実装前に必ず質問してください。**


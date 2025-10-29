# インフラ設定チェックリスト v1.0

**目的**: Next.js + Supabase 環境でのインフラ設定ミスを防ぐ

**更新日**: 2025-10-14

---

## 📋 **1. Next.js App Router 構造チェック**

### 1.1 Middleware 重複チェック

**問題**: `next-app/middleware.ts` と `next-app/src/middleware.ts` が両方存在すると、意図しない方が実行される

**チェック方法**:
```bash
# プロジェクトルートで実行
find next-app -name "middleware.ts" -o -name "middleware.js"
```

**期待結果**:
```
next-app/middleware.ts  # ← これだけがあるべき
```

**修正方法**:
```bash
# src/middleware.ts が存在する場合は削除
rm next-app/src/middleware.ts
```

**自動チェック追加**:
```json
// package.json
{
  "scripts": {
    "check:structure": "node scripts/check-project-structure.js"
  }
}
```

```javascript
// scripts/check-project-structure.js
const fs = require('fs');
const path = require('path');

function checkMiddlewareDuplication() {
  const rootMiddleware = path.join(__dirname, '../next-app/middleware.ts');
  const srcMiddleware = path.join(__dirname, '../next-app/src/middleware.ts');

  const rootExists = fs.existsSync(rootMiddleware);
  const srcExists = fs.existsSync(srcMiddleware);

  if (rootExists && srcExists) {
    console.error('❌ エラー: middleware.ts が重複しています');
    console.error('   - next-app/middleware.ts');
    console.error('   - next-app/src/middleware.ts');
    console.error('   → next-app/src/middleware.ts を削除してください');
    process.exit(1);
  }

  if (!rootExists && !srcExists) {
    console.error('❌ エラー: middleware.ts が存在しません');
    console.error('   → next-app/middleware.ts を作成してください');
    process.exit(1);
  }

  console.log('✅ middleware.ts の構造チェック: OK');
}

checkMiddlewareDuplication();
```

---

## 📋 **2. Supabase スキーマ設定チェック**

### 2.1 PostgREST スキーマ公開設定

**問題**: `app` スキーマを使っているのに、PostgREST が `public` しか公開していない

**チェック方法**:
```sql
-- Supabase SQL Editorで実行
SELECT current_setting('pgrst.db_schemas');
```

**期待結果**:
```
public, app
```

**修正方法**:
```sql
-- authenticator ロールに設定
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, app';

-- 設定を反映
NOTIFY pgrst, 'reload config';
```

**確認方法**:
```bash
# ブラウザコンソールで実行
const { data, error } = await supabase
  .from('users')
  .select('*')
  .limit(1);

console.log('Error:', error);
// エラーがなければ OK
```

---

### 2.2 スキーマ権限設定

**問題**: `anon`/`authenticated` ロールに `app` スキーマへの権限がない

**チェック方法**:
```sql
-- Supabase SQL Editorで実行
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_usage_grants 
WHERE object_schema = 'app';
```

**期待結果**:
```
grantee          | privilege_type
-----------------+---------------
anon             | USAGE
authenticated    | USAGE
```

**修正方法**:
```sql
-- 1. スキーマへのアクセス権限
GRANT USAGE ON SCHEMA app TO anon, authenticated;

-- 2. テーブルへのアクセス権限
GRANT ALL ON ALL TABLES IN SCHEMA app TO anon, authenticated;

-- 3. シーケンスへのアクセス権限
GRANT ALL ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated;

-- 4. 関数へのアクセス権限
GRANT ALL ON ALL FUNCTIONS IN SCHEMA app TO anon, authenticated;

-- 5. 将来作成されるオブジェクトにも権限を付与
ALTER DEFAULT PRIVILEGES IN SCHEMA app
GRANT ALL ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
GRANT ALL ON SEQUENCES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA app
GRANT ALL ON FUNCTIONS TO anon, authenticated;
```

**確認方法**:
```bash
# ブラウザコンソールで実行
const { data, error } = await supabase
  .from('users')
  .select('*')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
// error が null なら OK
```

---

### 2.3 Supabase クライアント スキーマ設定

**問題**: Supabaseクライアントで `db.schema` を指定していない

**チェック方法**:
```bash
# next-app/src/lib/auth/ 配下を確認
grep -r "db:" next-app/src/lib/auth/
```

**期待結果**:
```typescript
db: {
  schema: 'app'
}
```

**修正方法**:

```typescript
// next-app/src/lib/auth/supabase-browser.ts
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'app', // ← 必須
      },
    }
  )
}

// next-app/src/lib/auth/supabase-server.ts
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      db: {
        schema: 'app', // ← 必須
      },
    }
  )
}
```

---

## 📋 **3. データ整合性チェック**

### 3.1 auth.users と app.users の同期確認

**問題**: `auth.users` と `app.users` の `auth_user_id` が一致しない

**チェック方法**:
```sql
-- Supabase SQL Editorで実行
SELECT 
  au.id AS auth_user_id,
  au.email AS auth_email,
  u.id AS app_user_id,
  u.email AS app_email,
  u.auth_user_id
FROM auth.users au
LEFT JOIN app.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;
```

**期待結果**:
```
(0 rows)  -- ← auth.users に存在するが app.users に存在しないユーザーがいない
```

**修正方法**:
```bash
# db/quick_setup.sql を再実行
psql $DATABASE_URL -f db/quick_setup.sql
```

---

### 3.2 user_org_roles の外部キー確認

**問題**: `user_org_roles.user_id` が `auth.users(id)` を参照している（正しくは `app.users(id)`）

**チェック方法**:
```sql
-- Supabase SQL Editorで実行
SELECT
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'user_org_roles'
  AND kcu.column_name = 'user_id';
```

**期待結果**:
```
foreign_table_schema | foreign_table_name | foreign_column_name
---------------------+--------------------+--------------------
app                  | users              | id
```

**修正方法**:
```sql
-- 既存の外部キーを削除
ALTER TABLE app.user_org_roles
DROP CONSTRAINT IF EXISTS user_org_roles_user_id_fkey;

-- 正しい外部キーを追加
ALTER TABLE app.user_org_roles
ADD CONSTRAINT user_org_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;
```

---

## 📋 **4. クライアント側認証ロジックチェック**

### 4.1 useUser フックの2段階検索確認

**問題**: `auth.users.id` で直接 `user_org_roles` を検索している

**チェック方法**:
```bash
# next-app/src/lib/auth/session.ts を確認
grep -A 20 "function useUser" next-app/src/lib/auth/session.ts
```

**期待パターン**:
```typescript
// Step 1: auth_user_id で app.users を検索
supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)
  .single()

// Step 2: app.users.id で user_org_roles を検索
supabase
  .from('user_org_roles')
  .select('role, org_id, organization:organizations(*)')
  .eq('user_id', userData.id)
  .single()
```

**修正方法**:
```typescript
// next-app/src/lib/auth/session.ts
export function useUser() {
  const { user, loading } = useSession()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userOrg, setUserOrg] = useState<any>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserRole(null)
      setUserOrg(null)
      setRoleLoading(false)
      return
    }

    const supabase = createBrowserClient()

    // ✅ Step 1: app.usersからユーザーを検索
    supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
      .then(({ data: userData, error: userError }) => {
        if (userError || !userData) {
          console.error('❌ app.usersでユーザーが見つかりません:', userError)
          setRoleLoading(false)
          return
        }

        // ✅ Step 2: user_org_rolesを検索
        return supabase
          .from('user_org_roles')
          .select('role, org_id, organization:organizations(*)')
          .eq('user_id', userData.id)
          .eq('is_active', true)
          .single()
      })
      .then((result) => {
        if (!result) return

        const { data, error } = result
        if (!error && data) {
          setUserRole(data.role)
          setUserOrg(data.organization)
        }
        setRoleLoading(false)
      })
  }, [user])

  return { user, userRole, userOrg, loading: loading || roleLoading }
}
```

---

## 📋 **5. Prisma Migration チェック**

### 5.1 `prisma db pull` 実行前の確認

**問題**: `prisma db pull` は既存のスキーマを完全に上書きし、モデル名・リレーション名が予期せず変更される

**チェック方法**:
```bash
# バックアップの存在確認
ls -la next-app/prisma/schema.prisma.backup

# Git の変更状態を確認
git status next-app/prisma/schema.prisma
```

**実行前の必須手順**:
```bash
# 1. バックアップ作成
cp next-app/prisma/schema.prisma next-app/prisma/schema.prisma.backup

# 2. Git コミット
git add next-app/prisma/schema.prisma
git commit -m "chore: backup before prisma db pull"

# 3. 影響範囲分析
grep -roh "prisma\.[a-zA-Z_]*\." next-app/src/app/api/ | sort | uniq
```

**詳細ガイド**: `docs/guardrails/PRISMA_MIGRATION_GUIDE.md` を参照

---

### 5.2 `prisma db pull` 実行後の確認

**チェック方法**:
```bash
# 差分確認
git diff next-app/prisma/schema.prisma

# モデル名変更の確認
git diff next-app/prisma/schema.prisma | grep "^-model\|^+model"
```

**期待結果**:
- モデル名が変更されていない、または変更内容を把握している
- リレーション名の変更を確認済み

**修正方法（モデル名変更時）**:
```bash
# 1. 影響を受けるファイルを特定
grep -rl "prisma\.(organization|user|store)\." next-app/src/app/api/

# 2. Prisma Client 再生成
cd next-app
pnpm prisma generate

# 3. TypeScript エラーチェック
pnpm typecheck

# 4. 全APIテスト
pnpm dev
# 別ターミナルで
curl http://localhost:3001/api/organizations
```

---

## 📋 **6. Pre-flight チェックリスト（デプロイ前）**

### ✅ **必須チェック項目**

#### **構造チェック**
- [ ] `npm run check:structure` でmiddleware重複がないか確認

#### **Supabase設定チェック**
- [ ] `SELECT current_setting('pgrst.db_schemas');` で `public, app` が設定されているか
- [ ] `GRANT USAGE ON SCHEMA app TO anon, authenticated;` が実行済みか
- [ ] `supabase-browser.ts` と `supabase-server.ts` で `db.schema: 'app'` が設定されているか

#### **データ整合性チェック**
- [ ] `auth.users` と `app.users` の同期が取れているか
- [ ] `user_org_roles.user_id` が `app.users(id)` を参照しているか
- [ ] `useUser()` フックが2段階検索を実装しているか

#### **テストデータチェック**
- [ ] テストユーザーを **Supabase Auth UI で直接操作していないか**
- [ ] `db/quick_setup.sql` を使ってテストデータを作成しているか

#### **Prisma Migration チェック**
- [ ] `prisma db pull` 実行前にバックアップを作成したか
- [ ] `git diff prisma/schema.prisma` で変更内容を確認したか
- [ ] モデル名変更がある場合、全APIファイルを修正したか
- [ ] `pnpm prisma generate` を実行したか
- [ ] `pnpm typecheck` でエラーがないか確認したか

---

## 📋 **6. トラブルシューティング**

### **問題**: 406 Not Acceptable エラー
**原因**: PostgREST が `app` スキーマを公開していない  
**解決**: `ALTER ROLE authenticator SET pgrst.db_schemas = 'public, app';`

### **問題**: 403 Forbidden エラー
**原因**: `anon`/`authenticated` ロールに権限がない  
**解決**: `GRANT USAGE ON SCHEMA app TO anon, authenticated;`

### **問題**: `PGRST116` エラー（0 rows）
**原因**: `useUser()` が `auth.users.id` で直接検索している  
**解決**: 2段階検索に修正（`auth_user_id` → `app.users.id` → `user_org_roles`）

### **問題**: ユーザー再作成後に紐付けが切れる
**原因**: `auth.users.id` が変わった  
**解決**: `db/quick_setup.sql` を再実行

### **問題**: `prisma db pull` 後に全APIが500エラー
**原因**: モデル名またはリレーション名が変更された  
**解決**: 
1. `git diff prisma/schema.prisma` で変更を確認
2. 影響を受けるAPIファイルを特定
3. モデル名・リレーション名を一括置換
4. `pnpm prisma generate` → `pnpm typecheck` で確認

**詳細**: `docs/guardrails/PRISMA_MIGRATION_GUIDE.md` 参照

---

## 📝 **更新履歴**

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-15 | 1.1 | Prisma Migrationチェックを追加 |
| 2025-10-14 | 1.0 | 初版作成 |

---

**最終更新**: 2025-10-15  
**バージョン**: 1.1  
**作成者**: AI Assistant



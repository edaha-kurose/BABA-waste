# 🚀 環境変数クイックセットアップ（5分で完了）

## ステップ 1: .env.local ファイルを作成

```powershell
# PowerShell で実行（next-app ディレクトリで）
cd next-app
Copy-Item .env.local.template .env.local
```

または、手動で `next-app/.env.local` ファイルを作成してください。

---

## ステップ 2: Supabase Dashboard で値を取得

### A. Supabase にログイン
https://supabase.com/dashboard

### B. プロジェクトを選択

### C. 以下の値をコピー

#### 1️⃣ DATABASE_URL
**場所**: Settings > Database > Connection string > **URI**

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

⚠️ `[YOUR-PASSWORD]` を実際のデータベースパスワードに置き換え！

#### 2️⃣ NEXT_PUBLIC_SUPABASE_URL
**場所**: Settings > API > **Project URL**

```
https://xxxxx.supabase.co
```

#### 3️⃣ NEXT_PUBLIC_SUPABASE_ANON_KEY
**場所**: Settings > API > Project API keys > **anon** **public**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4️⃣ SUPABASE_SERVICE_ROLE_KEY
**場所**: Settings > API > Project API keys > **service_role**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **絶対に公開しない！** このキーは RLS をバイパスします！

---

## ステップ 3: .env.local に記入

`.env.local` ファイルを開いて、以下のように記入：

```env
DATABASE_URL="postgresql://postgres:MyActualPassword@db.abcdefghijk.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjMwMDAwMDAsImV4cCI6MTk1MzAwMDAwMH0.ACTUAL-ANON-KEY"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjoxOTUzMDAwMDAwfQ.ACTUAL-SERVICE-KEY"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

💡 **Tips**: 
- `?pgbouncer=true&connection_limit=1` は DATABASE_URL の最後に必ず付けてください
- キーは `eyJ` で始まる長い文字列です

---

## ステップ 4: Prisma Client を生成

```powershell
cd next-app
pnpm prisma generate
```

**期待される出力**:
```
✔ Generated Prisma Client (5.22.0 | library) to ./node_modules/@prisma/client in 123ms
```

---

## ステップ 5: Next.js を起動

```powershell
pnpm dev
```

**期待される出力**:
```
▲ Next.js 14.2.13
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## ステップ 6: 動作確認

### A. ヘルスチェック
ブラウザで開く: http://localhost:3000/api/health

**期待される結果**:
```json
{"status":"ok","message":"Health check passed"}
```

### B. ダッシュボード
ブラウザで開く: http://localhost:3000/dashboard

→ ログイン画面にリダイレクトされれば OK！

### C. ログイン
1. http://localhost:3000/login にアクセス
2. Supabase で作成したユーザーでログイン
3. ダッシュボードにアクセスできれば成功！🎉

---

## 🔍 トラブルシューティング

### ❌ エラー: "Environment variable not found: DATABASE_URL"
**原因**: .env.local ファイルが存在しないか、場所が間違っている

**解決策**:
1. ファイルが `next-app/.env.local` に存在するか確認
2. ファイル名が正確に `.env.local` か確認（`.env.local.template` ではない）
3. Next.js を再起動

### ❌ エラー: "Invalid connection string"
**原因**: DATABASE_URL の形式が間違っている

**解決策**:
1. `[YOUR-PASSWORD]` を実際のパスワードに置き換えたか確認
2. パスワードに特殊文字（`@`, `#`, `$` など）がある場合は URL エンコード
3. 末尾に `?pgbouncer=true&connection_limit=1` が付いているか確認

### ❌ エラー: "Prisma Client could not be found"
**原因**: Prisma Client が生成されていない

**解決策**:
```powershell
cd next-app
pnpm prisma generate
```

### ❌ エラー: "Cannot connect to database"
**原因**: Supabase のデータベースに接続できない

**解決策**:
1. DATABASE_URL が正しいか確認
2. Supabase プロジェクトが起動しているか確認
3. インターネット接続を確認

---

## ✅ セットアップ完了！

環境変数の設定が完了しました！これで Phase 4-A の認証機能が動作します。

**次のステップ**:
- ログイン機能をテスト
- ダッシュボードで CRUD 操作を確認
- Phase 4-B (JWNET Integration) に進む

---

質問があれば、遠慮なく聞いてください！


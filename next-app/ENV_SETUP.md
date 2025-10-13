# 🚀 環境変数セットアップガイド（必須）

## ⚠️ 現在のエラー: DATABASE_URL が設定されていません

Next.js アプリケーションを起動するには、環境変数の設定が必須です。

---

## 📋 セットアップ手順

### 1. `.env.local` ファイルを作成

```powershell
# PowerShell (next-app ディレクトリで実行)
cd next-app
New-Item -Path ".env.local" -ItemType File
```

### 2. 以下の内容を `.env.local` にコピー＆編集

```env
# 🗄️ Database (Prisma) - 必須
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# 🔑 Supabase Auth (公開キー) - 必須
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 🔐 Supabase Service Role (秘密キー) - 必須
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 🌐 App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 🛠️ Development
NODE_ENV="development"
```

### 3. Supabase 情報を取得して置き換え

#### A. DATABASE_URL
1. https://supabase.com/dashboard にアクセス
2. プロジェクト選択 > **Settings** > **Database**
3. **Connection string** > **URI** をコピー
4. `[YOUR-PASSWORD]` を実際のパスワードに置き換え

#### B. NEXT_PUBLIC_SUPABASE_URL
1. **Settings** > **API** > **Project URL** をコピー

#### C. NEXT_PUBLIC_SUPABASE_ANON_KEY
1. **Settings** > **API** > **Project API keys**
2. **anon public** キーをコピー

#### D. SUPABASE_SERVICE_ROLE_KEY
1. **Settings** > **API** > **Project API keys**
2. **service_role** キーをコピー（⚠️ 秘密情報！）

### 4. Prisma Client を生成

```bash
cd next-app
pnpm prisma generate
```

### 5. Next.js を再起動

```bash
pnpm dev
```

### 6. 動作確認

ブラウザで以下の URL にアクセス:
- http://localhost:3000/api/health
- 正常なら: `{"status":"ok","message":"Health check passed"}`

---

## 📝 .env.local ファイルの例（実際の値で置き換えてください）

```env
DATABASE_URL="postgresql://postgres:MySecretPassword123@db.abcdefghijk.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MjMwMDAwMDAsImV4cCI6MTYyMzAwMDAwMH0.1234567890abcdefghijklmnopqrstuvwxyz"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjoxNjIzMDAwMDAwfQ.0987654321zyxwvutsrqponmlkjihgfedcba"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## 🔒 セキュリティ注意事項

1. **`.env.local` は Git にコミットしない**
   - 既に `.gitignore` に含まれています

2. **`SUPABASE_SERVICE_ROLE_KEY` は絶対に公開しない**
   - RLS (Row Level Security) をバイパスするキー
   - サーバーサイド (API Routes) でのみ使用

3. **本番環境では Vercel の環境変数を使用**
   - Vercel Dashboard > Settings > Environment Variables

---

## 🔍 トラブルシューティング

### エラー: "Environment variable not found: DATABASE_URL"
✅ `.env.local` が `next-app` ディレクトリに存在するか確認
✅ ファイル名が正確に `.env.local` か確認
✅ Next.js を再起動

### エラー: "Invalid connection string"
✅ `[YOUR-PASSWORD]` を置き換えたか確認
✅ パスワードに特殊文字がある場合は URL エンコード

### エラー: "Prisma Client could not be found"
✅ `pnpm prisma generate` を実行

---

**詳細**: `docs/ENV_SETUP_GUIDE.md` を参照


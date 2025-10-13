# 環境変数セットアップガイド

## 初回セットアップ

### 1. .env.local ファイルを作成

```bash
# テンプレートをコピー
cp .env.example .env.local
```

### 2. Supabase設定を入力

```bash
# .env.local を編集
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...（実際のキー）
```

**取得方法**:
1. Supabase Dashboard にアクセス
2. Project Settings → API
3. URL と anon/public キーをコピー

## バリデーション

起動時に自動的にバリデーションが実行されます：

```bash
pnpm dev

# 成功時:
# ✅ 環境変数のバリデーション成功

# 失敗時:
# ❌ 環境変数のバリデーションエラー:
#   - VITE_SUPABASE_URL: must be a valid URL
```

## 環境変数一覧

### 必須項目

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `VITE_SUPABASE_URL` | Supabase プロジェクトURL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名キー | `eyJhbGc...` |

### オプション項目

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `VITE_DATA_BACKEND_MODE` | データバックエンド | `dexie` |
| `VITE_JWNET_GATEWAY_BASEURL` | JWNET GatewayのURL | - |
| `VITE_DEBUG` | デバッグモード | `false` |

## データバックエンドモード

### dexie（推奨：開発環境）
```env
VITE_DATA_BACKEND_MODE=dexie
```
- ✅ オフライン開発可能
- ✅ 高速
- ❌ ブラウザ間でデータ共有不可

### supabase（推奨：本番・テスト環境）
```env
VITE_DATA_BACKEND_MODE=supabase
```
- ✅ 本番環境と同一
- ✅ チーム間でデータ共有
- ❌ オンライン必須

### dual（検証用）
```env
VITE_DATA_BACKEND_MODE=dual
```
- ✅ 両方を併用して動作比較
- ❌ パフォーマンスオーバーヘッド

## トラブルシューティング

### バリデーションエラーが出る

```bash
# .env.local の存在確認
ls -la .env.local

# .env.example との比較
diff .env.example .env.local
```

### URLフォーマットエラー

```env
# ❌ 間違い
VITE_SUPABASE_URL=your-project.supabase.co

# ✅ 正しい
VITE_SUPABASE_URL=https://your-project.supabase.co
```

### 環境変数が読み込まれない

Viteは`VITE_`プレフィックスが必須：

```env
# ❌ 読み込まれない
SUPABASE_URL=https://...

# ✅ 読み込まれる
VITE_SUPABASE_URL=https://...
```

## セキュリティ

### .gitignore 確認

`.env.local` がコミットされないことを確認：

```bash
# .gitignore に含まれているか確認
grep ".env.local" .gitignore
```

### 秘密鍵の管理

- ❌ `.env` ファイルをコミットしない
- ✅ `.env.example` のみコミット
- ✅ チームメンバーと別途共有（1Password等）


# ログイン画面トラブルシューティング

**問題**: ログイン画面が真っ白で表示されない

---

## 🔍 確認手順

### 1. ブラウザの開発者ツールを開く

**Windows**: `F12` または `Ctrl+Shift+I`  
**Mac**: `Cmd+Option+I`

### 2. コンソールタブでエラーを確認

以下のようなエラーが表示されていないか確認：
- `Failed to load resource`
- `Cannot read property`
- `Unexpected token`
- `Module not found`

### 3. ネットワークタブで失敗したリクエストを確認

赤くなっているリクエスト（HTTPステータス 4xx, 5xx）を確認

---

## 💡 よくある原因と対処法

### 原因1: サーバーが起動していない

**確認方法**:
```bash
curl http://localhost:3001/api/health
```

**対処法**:
```bash
cd C:\Users\kuros\Documents\GitHub\BABA-waste\next-app
pnpm dev
```

### 原因2: ビルドキャッシュの問題

**対処法**:
```bash
cd C:\Users\kuros\Documents\GitHub\BABA-waste\next-app
rm -rf .next
pnpm dev
```

### 原因3: 環境変数が未設定

**確認方法**:
`.env.local` ファイルを確認

**必須環境変数**:
```env
DATABASE_URL=your_database_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 原因4: Prisma Clientが未生成

**対処法**:
```bash
cd C:\Users\kuros\Documents\GitHub\BABA-waste\next-app
pnpm prisma generate
pnpm dev
```

---

## 🚀 推奨: クリーン再起動

すべてをクリアして再起動：

```bash
cd C:\Users\kuros\Documents\GitHub\BABA-waste\next-app

# 1. プロセス終了
taskkill /F /IM node.exe

# 2. キャッシュクリア
rm -rf .next
rm -rf node_modules/.cache

# 3. Prisma Client再生成
pnpm prisma generate

# 4. サーバー起動
pnpm dev
```

---

## 🌐 アクセス方法

### 通常のログイン画面
```
http://localhost:3001/login
```

### E2Eバイパス（テスト用）
```
http://localhost:3001/login?e2e=1
```

### ダイレクトダッシュボード
```
http://localhost:3001/dashboard
```

---

## 🔎 詳細デバッグ

### ログを確認

開発サーバーのターミナル出力を確認：
- エラーメッセージ
- 警告メッセージ
- スタックトレース

### ブラウザでソースマップを確認

開発者ツールの「Sources」タブで：
1. `webpack://_N_E/` を展開
2. `src/` フォルダを確認
3. エラーが発生しているファイルを特定

---

## 📞 サポート情報

もし上記で解決しない場合、以下を共有してください：

1. **ブラウザのコンソールエラー** (全文)
2. **ネットワークタブのエラー** (HTTPステータスコード)
3. **開発サーバーのログ** (最後の20行)

コマンドでログを取得：
```bash
cd C:\Users\kuros\Documents\GitHub\BABA-waste\next-app
pnpm dev 2>&1 | tee server.log
```

---

**作成日**: 2025-10-20  
**最終更新**: 2025-10-20




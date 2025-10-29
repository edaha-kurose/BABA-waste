# 認証トラブルシューティング

**作成日**: 2025年10月19日  
**対象**: 開発者  
**目的**: 認証関連の問題を解決する

---

## 🚨 **症状: データが表示されない / 401エラー**

### 確認手順

#### Step 1: ブラウザのクッキー確認

1. **Chrome/Edge DevTools を開く**
   - `F12` または `Ctrl + Shift + I`

2. **Application タブを開く**
   - 左側メニューから「Application」をクリック

3. **Cookies を確認**
   - `Storage > Cookies > http://localhost:3001` を選択
   - 以下のクッキーが存在するか確認：
     - `sb-<project-id>-auth-token`
     - `sb-<project-id>-auth-token-code-verifier`

4. **クッキーの内容を確認**
   - `sb-*-auth-token` の値が存在する → ✅ セッション保存OK
   - クッキーが存在しない → ❌ セッション保存NG

---

#### Step 2: ログイン後のクッキー確認

1. **http://localhost:3001/login にアクセス**
2. **DevTools の Console タブを開く**
3. **クイックログインをクリック**
4. **Console に以下が表示されるか確認**:
   ```
   ✅ ログイン成功: admin@test.com
   ✅ セッション取得: あり
   ```

5. **Application タブでクッキーを再確認**
   - クッキーが追加されているか確認

---

## 🔧 **解決策**

### 解決策1: ブラウザのクッキーをクリア

```
1. DevTools > Application > Storage
2. 「Clear site data」をクリック
3. ブラウザをリロード（Ctrl + Shift + R）
4. 再度ログイン
```

### 解決策2: シークレットモードで確認

```
1. Ctrl + Shift + N（Chrome）
2. http://localhost:3001 にアクセス
3. クイックログイン
4. ダッシュボードが表示されるか確認
```

### 解決策3: 開発サーバー完全再起動

```bash
# 全プロセス停止
Get-Process -Name node,cmd | Stop-Process -Force

# 開発サーバー再起動
cd next-app
pnpm dev -p 3001
```

---

## 📊 **問題の根本原因**

### 原因1: Supabase SSRのクッキー実装

**症状**: ログインは成功するが、その後のAPIで401エラー

**原因**:
- ブラウザクライアントがクッキーに書き込んでいない
- サーバーサイドがクッキーを読み取れない

**修正済み**:
- `@supabase/ssr` を使用してクッキー処理を実装
- ブラウザ/サーバー両方で正しいクッキーハンドラーを実装

### 原因2: セッションの伝播

**症状**: ログイン直後はOKだが、ページ遷移後に401エラー

**原因**:
- `window.location.href` でリダイレクトするが、クッキーの保存が間に合わない
- サーバーサイドでセッションが確立される前にAPIリクエストが飛ぶ

**対策**:
- ログイン後に `await new Promise(resolve => setTimeout(resolve, 1500))` で待機
- クッキーの書き込みを待つ

---

## 🐛 **デバッグ方法**

### Console でクッキーを確認

```javascript
// DevTools > Console で実行
document.cookie
  .split('; ')
  .filter(c => c.startsWith('sb-'))
  .forEach(c => console.log(c))
```

### LocalStorage でセッション確認

```javascript
// DevTools > Console で実行
Object.keys(localStorage)
  .filter(k => k.startsWith('sb-'))
  .forEach(k => {
    console.log(k, localStorage.getItem(k))
  })
```

### API直接テスト

```bash
# PowerShell
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/dashboard/stats" -Method GET -UseBasicParsing
$response.StatusCode  # 200 = OK, 401 = Unauthorized
```

---

## 📝 **チェックリスト**

### ログイン時
- [ ] Console に「✅ ログイン成功」が表示される
- [ ] Console に「✅ セッション取得: あり」が表示される
- [ ] Application > Cookies に `sb-*-auth-token` が存在する
- [ ] ダッシュボードにリダイレクトされる

### ダッシュボード表示時
- [ ] Console に401エラーが出ない
- [ ] Network タブで `/api/dashboard/stats` が 200 OK
- [ ] 統計データが表示される
- [ ] メニューがクリックできる

### API確認
- [ ] `/api/dashboard/stats` が 200 OK を返す
- [ ] レスポンスにJSONデータが含まれる

---

## 🆘 **それでも解決しない場合**

### 最終手段: 完全リセット

```bash
# 1. 全プロセス停止
Get-Process -Name node,cmd | Stop-Process -Force

# 2. ビルドキャッシュ削除
Remove-Item -Path "next-app/.next" -Recurse -Force

# 3. ブラウザデータクリア
# DevTools > Application > Clear site data

# 4. 再ビルド
cd next-app
pnpm dev -p 3001

# 5. シークレットモードで確認
# Ctrl + Shift + N → http://localhost:3001
```

---

**最終更新**: 2025年10月19日  
**作成者**: AI Assistant  
**ステータス**: ✅ 使用可能





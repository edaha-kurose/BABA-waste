# Resendに追加のテスト用メールアドレスを登録する方法

## 📧 `environ_kei@yahoo.co.jp` を追加

### ステップ1: Resend Dashboardにアクセス

1. https://resend.com/login にアクセス
2. ログイン（`kurose.edaha@gmail.com` でログイン済みのはず）

### ステップ2: Verified Emailsに追加

1. **左サイドバー** → **Settings** → **Verified Emails**
2. **Add Email** ボタンをクリック
3. `environ_kei@yahoo.co.jp` を入力
4. **Send Verification Email** をクリック

### ステップ3: Yahoo!メールで認証

1. `environ_kei@yahoo.co.jp` のメールボックスを開く
2. Resendから届いた認証メールを開く（件名: "Verify your email address"）
3. **Verify Email Address** ボタンをクリック
4. ブラウザで認証完了ページが表示される

### ステップ4: 認証完了を確認

1. Resend Dashboard → **Settings** → **Verified Emails**
2. `environ_kei@yahoo.co.jp` が **Verified** になっていることを確認

---

## ✅ 認証後の動作

認証完了後は、以下のアドレスにテストメールを送信できます：

- ✅ `kurose.edaha@gmail.com` （元々の登録アドレス）
- ✅ `environ_kei@yahoo.co.jp` （新しく追加したアドレス）

---

## 🔧 環境変数の設定（オプション）

デフォルトのテスト送信先を変更したい場合は、`.env.local` に追加：

```bash
# テスト用デフォルト送信先
EMAIL_TEST_RECIPIENT=environ_kei@yahoo.co.jp
```

---

## 📝 注意事項

### ⚠️ ドメイン未認証の制限

無料プランで**認証済みメールアドレス以外**に送信するには、独自ドメインの認証が必要です：

- ❌ 認証していない任意のアドレス（例: `random@example.com`）
- ✅ 認証済みのアドレス（`kurose.edaha@gmail.com`, `environ_kei@yahoo.co.jp`）
- ✅ 独自ドメイン認証後（例: `noreply@yourdomain.com` → 任意のアドレスに送信可能）

---

**次のアクション**: 上記の手順で `environ_kei@yahoo.co.jp` を認証してください！






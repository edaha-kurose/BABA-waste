# テストデータ作成ガイド

## 📦 安全なテストデータ作成方法

SQLを直接実行する代わりに、Prismaを使った型安全なシードスクリプトを使用します。

---

## 🚀 使い方

### 1. 依存関係のインストール
```bash
cd next-app
pnpm install
```

### 2. Prisma生成
```bash
pnpm prisma:generate
```

### 3. シード実行（テストデータ作成）
```bash
pnpm prisma:seed
```

これで1年分（2024年1月～12月）の完全なテストデータが作成されます！

---

## 📊 作成されるデータ

| データ種別 | 件数 | 説明 |
|------------|------|------|
| **Stores（店舗）** | 10件 | 本店 + 支店A～I |
| **Item Maps（品目）** | 5件 | 混合廃棄物、廃プラスチック、蛍光灯、木くず、金属くず |
| **Plans（収集予定）** | 240件 | 12ヶ月 × 10店舗 × 2回/月 |
| **Reservations（予約）** | 240件 | 全Plans対応（90%がRESERVED） |
| **Registrations（本登録）** | ~220件 | RESERVED Plans対応（95%がREGISTERED） |
| **Actuals（実績）** | ~210件 | REGISTERED Plans対応 |
| **Billing Summaries（請求）** | 12件 | 月次集計（1月～12月） |

---

## ✅ 安全な理由

### 1. 型安全
- TypeScriptで記述
- Prismaの型チェック
- コンパイルエラーで事前に問題検知

### 2. トランザクション管理
- 自動的にトランザクション処理
- エラー時は自動ロールバック
- データ不整合を防止

### 3. 論理削除
- 既存データは物理削除せず`deleted_at`で論理削除
- 必要に応じて復元可能
- 安全なクリーンアップ

### 4. 検証機能
- データ件数の自動チェック
- 異常時は例外をスロー
- 不正なデータを作成しない

---

## 🔄 再実行について

シードスクリプトは何度でも安全に実行できます：

```bash
# 2回目以降も安全に実行可能
pnpm prisma:seed
```

既存のテストデータは自動的にクリーンアップ（論理削除）され、新しいデータが作成されます。

---

## 🛠️ カスタマイズ

### データ量を変更したい場合

`prisma/seed.ts`を編集：

```typescript
// 月数を変更（例: 6ヶ月分）
for (let month = 1; month <= 6; month++) {
  // ...
}

// 週の回数を変更（例: 月4回）
for (let week = 1; week <= 4; week++) {
  // ...
}
```

### 店舗数を変更したい場合

`prisma/seed.ts`の店舗配列を編集：

```typescript
const stores = await prisma.$transaction(
  [
    { id: 'store-001', code: 'ST001', name: '本店', area: '東京' },
    // ここに追加
  ].map((s) => /* ... */)
)
```

---

## 🐛 トラブルシューティング

### エラー: "Cannot find module 'tsx'"

```bash
pnpm install tsx --save-dev
```

### エラー: "Prisma schema not found"

```bash
pnpm prisma:generate
```

### エラー: "Database connection failed"

`.env.local`に正しい`DATABASE_URL`が設定されているか確認：

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1&schema=app"
```

---

## 📝 実行ログの見方

```
🌱 シード開始...
🗑️  既存テストデータをクリーンアップ中...
✅ クリーンアップ完了
🏪 店舗データ作成中...
✅ 店舗データ作成完了: 10件
📦 品目マップデータ作成中...
✅ 品目マップデータ作成完了: 5件
📅 収集予定データ作成中...
  1月のデータ作成中...
  2月のデータ作成中...
  ...
✅ 収集予定データ作成完了: 240件
✅ 予約データ作成完了: 240件
✅ 登録データ作成完了: 216件
✅ 実績データ作成完了: 205件
💰 請求サマリーデータ作成中...
  1月: 42.35トン, 1,163,625円
  2月: 38.21トン, 1,050,305円
  ...
✅ 請求サマリーデータ作成完了: 12件

📊 最終検証...

✅ テストデータ作成完了:
  - 店舗: 10件
  - 品目: 5件
  - 収集予定: 240件
  - 予約: 240件
  - 登録: 216件
  - 実績: 205件
  - 請求サマリー: 12件

🎉 1年分の完全テストデータ作成が完了しました！
📊 2024年1月～12月の請求データが利用可能です。
```

---

## 🎯 次のステップ

テストデータ作成後：

1. **開発サーバー起動**
   ```bash
   pnpm dev
   ```

2. **ブラウザで確認**
   ```
   http://localhost:3001/dashboard
   ```

3. **データベース確認**
   ```bash
   pnpm prisma:studio
   ```

4. **E2Eテスト実行**
   ```bash
   pnpm test:e2e
   ```

---

## 💡 Tips

### データをリセットしたい場合

```bash
# シードを再実行するだけでOK
pnpm prisma:seed
```

### データをすべて削除したい場合

Prisma Studioで手動削除、または：

```bash
# 開発環境のみ！本番では絶対に実行しないこと
pnpm prisma migrate reset
```

---

**作成日**: 2025-10-16  
**更新日**: 2025-10-16  
**バージョン**: 1.0








# メール通知機能セットアップガイド

## 📧 **概要**

このプロジェクトでは、Resendを使用してメール通知を送信します。

## 🔧 **環境変数設定（SSOT準拠）**

`.env.local`に以下の環境変数を追加してください：

```bash
# Resend API設定
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com

# テスト送信先（任意、Resendで認証済みのアドレスのみ）
EMAIL_TEST_RECIPIENT=environ_kei@yahoo.co.jp

# アプリケーションURL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 本番環境では実際のURLに変更
```

## 🚀 **Resendセットアップ手順**

### 1. Resendアカウント作成

1. [Resend](https://resend.com/)にアクセス
2. アカウント作成（無料プランで月3,000通まで）
3. ドメイン認証を設定

### 2. APIキー取得

1. Resendダッシュボード → **API Keys**
2. **Create API Key**をクリック
3. 生成されたキーを`.env.local`の`RESEND_API_KEY`に設定

### 3. 送信元メールアドレス設定

1. Resendダッシュボード → **Domains**
2. ドメイン追加 or `resend.dev`ドメイン使用（開発用）
3. `.env.local`の`EMAIL_FROM`に設定
   - 例: `noreply@yourdomain.com`
   - 開発用: `onboarding@resend.dev`

## 📬 **メール通知の種類**

### 1. ヒアリング依頼通知
- **送信タイミング**: ヒアリング作成時
- **送信先**: 対象収集業者
- **内容**: ヒアリング詳細、回答期限、回答画面URL

### 2. リマインダー通知
- **送信タイミング**: 
  - 回答期限の7日前
  - 回答期限の3日前
  - 回答期限の1日前
- **送信先**: 未回答の収集業者のみ
- **内容**: 回答催促、残り日数、回答画面URL

### 3. ロック解除申請通知
- **送信タイミング**: 業者がロック解除申請を送信時
- **送信先**: システム管理者
- **内容**: 申請者、申請理由、承認画面URL

### 4. コメント追加通知
- **送信タイミング**: コメント追加時
- **送信先**: 関係者（管理者または業者）
- **内容**: コメント内容、対象ヒアリング、詳細画面URL

## 🔄 **Cronジョブ設定**

### Vercel Cron（推奨）

`vercel.json`に以下を追加：

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/hearing-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/hearing-auto-lock",
      "schedule": "0 0 * * *"
    }
  ]
}
\`\`\`

### 外部Cronサービス（代替）

1. [Cron-job.org](https://cron-job.org/)などの外部サービスを使用
2. 以下のエンドポイントを定期実行：
   - `POST https://yourdomain.com/api/cron/hearing-reminders` - 毎日9:00
   - `POST https://yourdomain.com/api/cron/hearing-auto-lock` - 毎日0:00
3. `Authorization: Bearer ${CRON_SECRET}`ヘッダーを追加

## 🧪 **テスト方法**

### 1. ローカルテスト

\`\`\`bash
# リマインダー送信テスト
curl -X POST http://localhost:3000/api/cron/hearing-reminders \
  -H "Content-Type: application/json"

# 自動ロックテスト
curl -X POST http://localhost:3000/api/cron/hearing-auto-lock \
  -H "Content-Type: application/json"
\`\`\`

### 2. メール送信テスト

\`\`\`typescript
// src/app/api/test-email/route.ts を作成してテスト
import { sendReminderEmail } from '@/lib/email/email-service'

export async function GET() {
  const result = await sendReminderEmail({
    hearing_id: 'test-id',
    collector_id: 'test-collector',
    collectorEmail: 'test@example.com',
    collectorName: 'テスト業者',
    reminderType: '7_DAYS',
    props: {
      hearingTitle: 'テストヒアリング',
      responseDeadline: '2025-10-25',
      daysRemaining: 7,
      targetCount: 10,
      hearingUrl: 'http://localhost:3000/dashboard/collector-hearings/test',
      collectorName: 'テスト業者',
    },
  })

  return Response.json(result)
}
\`\`\`

## 📊 **モニタリング**

### 送信状況確認

\`\`\`sql
-- 送信成功率
SELECT 
  status,
  COUNT(*) as count
FROM app.hearing_reminders
GROUP BY status;

-- 最近のエラー
SELECT *
FROM app.hearing_reminders
WHERE status = 'FAILED'
ORDER BY created_at DESC
LIMIT 10;
\`\`\`

## ⚠️ **トラブルシューティング**

### メールが送信されない

1. `RESEND_API_KEY`が正しく設定されているか確認
2. `.env.local`を再読み込み（サーバー再起動）
3. Resendダッシュボードで送信ログを確認

### メールが届かない

1. スパムフォルダを確認
2. ドメイン認証（SPF, DKIM, DMARC）を設定
3. Resendダッシュボードで配信ステータスを確認

### リトライエラー

- `hearing_reminders`テーブルの`error_message`を確認
- 最大3回リトライ後、FAILEDステータスで記録

## 📚 **関連ファイル**

- `/src/lib/email/resend-client.ts` - Resend設定
- `/src/lib/email/templates.tsx` - メールテンプレート
- `/src/lib/email/email-service.ts` - メール送信サービス
- `/src/utils/hearing-batch-service.ts` - バッチ処理
- `/src/app/api/cron/hearing-reminders/route.ts` - リマインダーCron
- `/src/app/api/cron/hearing-auto-lock/route.ts` - 自動ロックCron

---

**最終更新**: 2025-10-18  
**バージョン**: 1.0  
**グローバルルール準拠**: ✅ SSOT, セキュリティ, エラーハンドリング


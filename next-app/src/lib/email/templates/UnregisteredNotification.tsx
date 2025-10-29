import React from 'react'

interface UnregisteredNotificationProps {
  recipientName: string
  unregisteredItems: Array<{
    store_name: string
    item_name: string
    collector_name?: string
  }>
  dashboardUrl: string
}

export function UnregisteredNotification({
  recipientName,
  unregisteredItems,
  dashboardUrl,
}: UnregisteredNotificationProps) {
  return (
    <html>
      <head>
        <style>
          {`
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #2d8659 0%, #52c41a 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #fff;
              padding: 30px;
              border: 1px solid #e8e8e8;
              border-top: none;
            }
            .alert-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .item-list {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .item {
              padding: 10px;
              border-bottom: 1px solid #d9d9d9;
            }
            .item:last-child {
              border-bottom: none;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #2d8659 0%, #52c41a 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              background: #f5f5f5;
              padding: 20px;
              border-radius: 0 0 8px 8px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          `}
        </style>
      </head>
      <body>
        <div className="header">
          <h1 style={{ margin: 0, fontSize: '24px' }}>⚠️ 未登録項目の通知</h1>
        </div>
        <div className="content">
          <p>{ recipientName }様</p>
          
          <div className="alert-box">
            <strong>📋 未登録の項目が検出されました</strong>
            <p style={{ margin: '10px 0 0 0' }}>
              以下の店舗・品目について、収集業者または単価が未登録です。
              請求処理を正常に実行するため、早急にご対応をお願いいたします。
            </p>
          </div>

          <div className="item-list">
            <strong>未登録項目一覧 ({unregisteredItems.length}件)</strong>
            {unregisteredItems.slice(0, 10).map((item, index) => (
              <div key={index} className="item">
                <div><strong>店舗:</strong> {item.store_name}</div>
                <div><strong>品目:</strong> {item.item_name}</div>
                {item.collector_name && (
                  <div><strong>収集業者:</strong> {item.collector_name}</div>
                )}
              </div>
            ))}
            {unregisteredItems.length > 10 && (
              <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
                ※ 他 {unregisteredItems.length - 10}件の未登録項目があります
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={dashboardUrl} className="button">
              ダッシュボードで確認する
            </a>
          </div>

          <p style={{ fontSize: '14px', color: '#666', marginTop: '30px' }}>
            <strong>対応期限:</strong> 1営業日以内にご対応をお願いいたします。<br />
            対応が遅れた場合、システム管理者（BABA株式会社）にエスカレーションされます。
          </p>
        </div>
        <div className="footer">
          <p>このメールは BABA 廃棄物管理システムから自動送信されています</p>
          <p>お問い合わせ: support@baba-waste.com</p>
        </div>
      </body>
    </html>
  )
}

// プレーンテキスト版
export function UnregisteredNotificationPlainText({
  recipientName,
  unregisteredItems,
  dashboardUrl,
}: UnregisteredNotificationProps): string {
  const itemsList = unregisteredItems
    .slice(0, 10)
    .map((item, index) => 
      `${index + 1}. 店舗: ${item.store_name} / 品目: ${item.item_name}${
        item.collector_name ? ` / 収集業者: ${item.collector_name}` : ''
      }`
    )
    .join('\n')

  const remainingCount = unregisteredItems.length > 10 
    ? `\n※ 他 ${unregisteredItems.length - 10}件の未登録項目があります\n` 
    : ''

  return `
【未登録項目の通知】

${recipientName}様

未登録の項目が検出されました。以下の店舗・品目について、収集業者または単価が未登録です。
請求処理を正常に実行するため、早急にご対応をお願いいたします。

■ 未登録項目一覧 (${unregisteredItems.length}件)
${itemsList}
${remainingCount}

■ ダッシュボードで確認
${dashboardUrl}

■ 対応期限
1営業日以内にご対応をお願いいたします。
対応が遅れた場合、システム管理者（BABA株式会社）にエスカレーションされます。

---
このメールは BABA 廃棄物管理システムから自動送信されています
お問い合わせ: support@baba-waste.com
  `.trim()
}




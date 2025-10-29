/**
 * Email Templates
 * React Email形式でメールテンプレートを定義
 */

import * as React from 'react'

// ============================================================================
// 型定義
// ============================================================================

export interface HearingNotificationEmailProps {
  hearingTitle: string
  targetPeriodFrom: string
  targetPeriodTo: string
  responseDeadline: string
  targetCount: number
  hearingUrl: string
  collectorName: string
}

export interface ReminderEmailProps {
  hearingTitle: string
  responseDeadline: string
  daysRemaining: number
  targetCount: number
  hearingUrl: string
  collectorName: string
}

export interface UnlockRequestEmailProps {
  hearingTitle: string
  collectorName: string
  requestReason: string
  reviewUrl: string
}

export interface CommentNotificationEmailProps {
  hearingTitle: string
  storeName: string
  itemName: string
  commenterName: string
  comment: string
  targetUrl: string
}

// ============================================================================
// メールテンプレート（HTML文字列生成）
// ============================================================================

/**
 * ヒアリング依頼通知メール
 */
export function HearingNotificationEmail(props: HearingNotificationEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .info-box { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4F46E5; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">【ヒアリング依頼】${props.hearingTitle}</h1>
  </div>
  
  <div class="content">
    <p>${props.collectorName} 様</p>
    
    <p>新しいヒアリングが作成されました。以下の期間について、回収可能日をご回答ください。</p>
    
    <div class="info-box">
      <p><strong>📅 対象期間：</strong>${props.targetPeriodFrom} ～ ${props.targetPeriodTo}</p>
      <p><strong>⏰ 回答期限：</strong>${props.responseDeadline}</p>
      <p><strong>📊 対象店舗・品目：</strong>${props.targetCount}件</p>
    </div>
    
    <p>下記のボタンから回答画面にアクセスし、各店舗・品目について回収可能日を選択してください。</p>
    
    <a href="${props.hearingUrl}" class="button">回答画面を開く</a>
    
    <p style="font-size: 14px; color: #6b7280;">
      ※ 回答期限を過ぎると自動的にロックされます。<br>
      ※ ロック後に変更が必要な場合は、ロック解除申請を行ってください。
    </p>
  </div>
  
  <div class="footer">
    <p>このメールは自動送信されています。</p>
  </div>
</body>
</html>
`
}

/**
 * リマインダーメール
 */
export function ReminderEmail(props: ReminderEmailProps): string {
  const urgencyColor = props.daysRemaining <= 1 ? '#dc2626' : props.daysRemaining <= 3 ? '#f59e0b' : '#4F46E5'
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert-box { background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid ${urgencyColor}; }
    .button { display: inline-block; background-color: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">【リマインダー】${props.hearingTitle}</h1>
  </div>
  
  <div class="content">
    <p>${props.collectorName} 様</p>
    
    <div class="alert-box">
      <p style="margin: 0; font-weight: bold; font-size: 18px;">
        ⚠️ 回答期限まで残り ${props.daysRemaining}日です
      </p>
    </div>
    
    <p>以下のヒアリングについて、まだ回答が完了していません。</p>
    
    <p><strong>📅 回答期限：</strong>${props.responseDeadline}</p>
    <p><strong>📊 未回答の店舗・品目：</strong>${props.targetCount}件</p>
    
    <p>期限を過ぎると自動的にロックされますので、お早めにご回答ください。</p>
    
    <a href="${props.hearingUrl}" class="button">今すぐ回答する</a>
  </div>
  
  <div class="footer">
    <p>このメールは自動送信されています。</p>
  </div>
</body>
</html>
`
}

/**
 * ロック解除申請通知メール（管理者向け）
 */
export function UnlockRequestEmail(props: UnlockRequestEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .info-box { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .button { display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">【ロック解除申請】${props.hearingTitle}</h1>
  </div>
  
  <div class="content">
    <p>管理者 様</p>
    
    <p>${props.collectorName} から、ヒアリング回答のロック解除申請がありました。</p>
    
    <div class="info-box">
      <p><strong>申請理由：</strong></p>
      <p style="background-color: #f9fafb; padding: 10px; border-radius: 4px;">${props.requestReason}</p>
    </div>
    
    <p>下記のボタンから申請内容を確認し、承認または却下を行ってください。</p>
    
    <a href="${props.reviewUrl}" class="button">申請を確認する</a>
  </div>
  
  <div class="footer">
    <p>このメールは自動送信されています。</p>
  </div>
</body>
</html>
`
}

/**
 * コメント追加通知メール
 */
export function CommentNotificationEmail(props: CommentNotificationEmailProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .comment-box { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #10b981; }
    .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0;">【新しいコメント】${props.hearingTitle}</h1>
  </div>
  
  <div class="content">
    <p>${props.commenterName} から新しいコメントが追加されました。</p>
    
    <p><strong>📍 対象：</strong>${props.storeName} - ${props.itemName}</p>
    
    <div class="comment-box">
      <p style="margin: 0;">${props.comment}</p>
    </div>
    
    <a href="${props.targetUrl}" class="button">詳細を確認する</a>
  </div>
  
  <div class="footer">
    <p>このメールは自動送信されています。</p>
  </div>
</body>
</html>
`
}

// ============================================================================
// プレーンテキスト版（HTML非対応クライアント用）
// ============================================================================

export function getPlainTextVersion(html: string): string {
  // HTMLタグを除去してプレーンテキストに変換
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}


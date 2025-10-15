'use client'

/**
 * 403 Forbidden エラーページ
 * アクセス権限がない場合に表示
 */

import { Result, Button } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

export default function ForbiddenPage() {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <Result
        status="403"
        title="403 - アクセス権限がありません"
        subTitle="このページにアクセスする権限がありません。適切な権限を持つアカウントでログインしてください。"
        icon={<LockOutlined style={{ fontSize: 72, color: '#ff4d4f' }} />}
        extra={[
          <Button type="primary" key="dashboard" onClick={() => router.push('/dashboard')}>
            ダッシュボードに戻る
          </Button>,
          <Button key="login" onClick={() => router.push('/login')}>
            ログインページへ
          </Button>,
        ]}
      />
    </div>
  )
}



'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { signIn } from '@/lib/auth'

const { Title, Paragraph } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      setLoading(true)
      await signIn(values.email, values.password)
      message.success('ログインしました')
      router.push(redirect)
    } catch (error: any) {
      console.error('Login error:', error)
      message.error(error.message || 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card style={{ width: 400 }}>
        <div className="text-center mb-6">
          <Title level={2}>🗑️ BABA Waste</Title>
          <Paragraph>廃棄物管理システム</Paragraph>
        </div>

        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="メールアドレス"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'パスワードを入力してください' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>開発環境:</strong> 認証はバイパスされます
          </p>
        </div>
      </Card>
    </div>
  )
}


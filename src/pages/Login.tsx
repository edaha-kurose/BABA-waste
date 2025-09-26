// ============================================================================
// ログインページ
// 作成日: 2025-09-16
// 目的: ユーザー認証とログイン処理
// ============================================================================

import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons'
import { signIn } from '@/utils/supabase'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

interface LoginProps {
  onLoginSuccess: (user: any) => void
  onShowCollectorLogin?: () => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onShowCollectorLogin }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ログイン処理
  const handleLogin = async (values: LoginFormData) => {
    try {
      setLoading(true)
      setError(null)

      const { user, error } = await signIn(values.email, values.password)
      
      if (error) {
        setError(error.message)
        return
      }

      if (user) {
        message.success('ログインしました')
        onLoginSuccess(user)
      }
    } catch (err) {
      console.error('Login failed:', err)
      setError('ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // デモログイン（開発用）
  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user-id',
      email: 'demo@example.com',
      user_metadata: {
        name: 'デモユーザー',
        org_id: 'demo-org-id'
      }
    }
    message.success('デモユーザーでログインしました')
    onLoginSuccess(demoUser)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Title level={2} className="text-gray-900">
            廃棄物管理システム
          </Title>
          <Text type="secondary">
            ログインしてシステムにアクセスしてください
          </Text>
        </div>

        <Card className="shadow-lg">
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            layout="vertical"
          >
            {error && (
              <Alert
                message="ログインエラー"
                description={error}
                type="error"
                showIcon
                className="mb-4"
              />
            )}

            <Form.Item
              name="email"
              label="メールアドレス"
              rules={[
                { required: true, message: 'メールアドレスを入力してください' },
                { type: 'email', message: '有効なメールアドレスを入力してください' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="user@example.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="パスワード"
              rules={[
                { required: true, message: 'パスワードを入力してください' },
                { min: 6, message: 'パスワードは6文字以上で入力してください' },
              ]}
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
                loading={loading}
                icon={<LoginOutlined />}
                size="large"
                block
              >
                ログイン
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-4">
            <Text type="secondary" className="text-sm">
              開発・テスト用
            </Text>
            <br />
            <Button
              type="link"
              onClick={handleDemoLogin}
              className="p-0"
            >
              デモユーザーでログイン
            </Button>
            <br />
            {onShowCollectorLogin && (
              <Button
                type="link"
                onClick={onShowCollectorLogin}
                className="p-0"
              >
                収集業者ログイン
              </Button>
            )}
          </div>
        </Card>

        <div className="text-center">
          <Text type="secondary" className="text-xs">
            © 2025 廃棄物管理システム. All rights reserved.
          </Text>
        </div>
      </div>
    </div>
  )
}

export default Login

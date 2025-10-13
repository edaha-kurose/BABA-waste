'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Form, Input, Button, message, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { createBrowserClient } from '@/lib/auth/supabase'

const { Title, Text, Link } = Typography

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [form] = Form.useForm()

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (error) {
        message.error(`ログインに失敗しました: ${error.message}`)
        return
      }

      if (data.user) {
        message.success('ログインしました')
        router.push(redirectTo)
      }
    } catch (error: any) {
      message.error(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (values: { email: string; password: string; name: string }) => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
          },
        },
      })

      if (error) {
        message.error(`アカウント作成に失敗しました: ${error.message}`)
        return
      }

      if (data.user) {
        message.success('アカウントを作成しました。確認メールを送信しました。')
        setIsSignUp(false)
        form.resetFields()
      }
    } catch (error: any) {
      message.error(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            🗑️ BABA Waste
          </Title>
          <Text type="secondary">
            {isSignUp ? 'アカウント作成' : '廃棄物管理システム'}
          </Text>
        </div>

        <Form
          form={form}
          name={isSignUp ? 'signup' : 'login'}
          onFinish={isSignUp ? handleSignUp : handleLogin}
          layout="vertical"
          requiredMark={false}
        >
          {isSignUp && (
            <Form.Item
              name="name"
              label="名前"
              rules={[{ required: true, message: '名前を入力してください' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="山田 太郎"
                size="large"
              />
            </Form.Item>
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
              prefix={<MailOutlined />}
              placeholder="user@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="パスワード"
            rules={[
              { required: true, message: 'パスワードを入力してください' },
              { min: 6, message: 'パスワードは6文字以上である必要があります' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
              size="large"
            />
          </Form.Item>

          {isSignUp && (
            <Form.Item
              name="confirmPassword"
              label="パスワード（確認）"
              dependencies={['password']}
              rules={[
                { required: true, message: 'パスワードを再入力してください' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('パスワードが一致しません'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="パスワード（確認）"
                size="large"
              />
            </Form.Item>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              {isSignUp ? 'アカウント作成' : 'ログイン'}
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="small">
              <Button
                type="link"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  form.resetFields()
                }}
              >
                {isSignUp
                  ? 'すでにアカウントをお持ちの方はこちら'
                  : 'アカウントを作成する'}
              </Button>
              
              {!isSignUp && (
                <Link href="/forgot-password">
                  <Text type="secondary">パスワードをお忘れですか？</Text>
                </Link>
              )}
            </Space>
          </div>
        </Form>

        {/* 開発環境用のテストアカウント情報 */}
        {process.env.NODE_ENV === 'development' && (
          <Card
            size="small"
            style={{ marginTop: 16, backgroundColor: '#f0f2f5' }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>テストアカウント:</strong><br />
              Email: test@example.com<br />
              Password: test123
            </Text>
          </Card>
        )}
      </Card>
    </div>
  )
}

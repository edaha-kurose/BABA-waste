'use client'

/**
 * 収集業者ログイン画面
 * デスクトップ版CollectorLoginから移植
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Form, Input, Button, message, Typography, Space, Alert } from 'antd'
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { createBrowserClient } from '@/lib/auth/supabase-browser'

const { Title, Text } = Typography

export default function CollectorLoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      setLoading(true)
      setError(null)

      // Supabase Auth でログイン
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('ログインに失敗しました')
      }

      // app.usersテーブルからユーザー情報取得
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (userError || !userData) {
        throw new Error('ユーザー情報の取得に失敗しました')
      }

      // ロールチェック（TRANSPORTER のみ許可）
      const { data: roleData } = await supabase
        .from('user_org_roles')
        .select('role')
        .eq('user_id', (userData as any).id)
        .single()

      if ((roleData as any)?.role !== 'TRANSPORTER') {
        await supabase.auth.signOut()
        throw new Error('収集業者アカウントでログインしてください')
      }

      message.success('ログインしました')
      router.push('/collector/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToAdmin = () => {
    router.push('/login')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px'
    }}>
      <Card style={{ width: '100%', maxWidth: '450px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8 }}>収集業者ログイン</Title>
            <Text type="secondary">収集業者専用のログイン画面です</Text>
          </div>

          {error && (
            <Alert
              message="ログインエラー"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            name="collector-login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'メールアドレスを入力してください' },
                { type: 'email', message: '正しいメールアドレスを入力してください' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="メールアドレス"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'パスワードを入力してください' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="パスワード"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                ログイン
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="link" 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBackToAdmin}
                block
              >
                管理者ログインに戻る
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}





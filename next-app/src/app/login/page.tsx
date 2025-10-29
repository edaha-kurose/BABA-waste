'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Form, Input, Button, message, Typography, Space, Divider, Spin } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, TruckOutlined } from '@ant-design/icons'
import { createBrowserClient } from '@/lib/auth/supabase-browser'
import NextLink from 'next/link'

const { Title, Text, Link } = Typography

interface Collector {
  id: string
  company_name: string
  email: string
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const redirectTo = redirectParam && redirectParam !== '/' ? redirectParam : '/dashboard'
  
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [form] = Form.useForm()
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [loadingCollectors, setLoadingCollectors] = useState(false)

  // 収集業者一覧を取得
  useEffect(() => {
    const fetchCollectors = async () => {
      setLoadingCollectors(true)
      try {
        const response = await fetch('/api/quick-login/collectors')
        if (response.ok) {
          const data = await response.json()
          setCollectors(data.collectors || [])
        }
      } catch (error) {
        console.error('Failed to fetch collectors:', error)
      } finally {
        setLoadingCollectors(false)
      }
    }

    fetchCollectors()
  }, [])

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
        
        // セッションCookieが保存されるまで待機
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 強制リダイレクト
        window.location.href = redirectTo
      }
    } catch (error: any) {
      message.error(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (email: string, password: string = 'test123') => {
    console.log('🔵 クイックログイン開始:', email)
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      console.log('🔵 Supabaseクライアント作成完了')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('🔵 ログインレスポンス:', { data, error })

      if (error) {
        console.error('❌ ログインエラー:', error)
        message.error(`クイックログインに失敗しました: ${error.message}`)
        return
      }

      if (data.user && data.session) {
        console.log('✅ ログイン成功:', data.user.email)
        console.log('✅ セッション取得:', data.session.access_token ? 'あり' : 'なし')
        
        message.success(`${email} でログインしました`)
        
        // セッション保存を待機（Supabaseがクッキーに書き込むまで）
        console.log('⏳ セッション保存待機中...')
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        console.log('🚀 リダイレクト実行:', redirectTo)
        
        // ページ全体をリロードして、サーバーサイドでセッションを確実に読み込む
        window.location.href = redirectTo
      } else {
        console.warn('⚠️ data.userまたはdata.sessionが存在しません')
      }
    } catch (error: any) {
      console.error('❌ クイックログイン例外:', error)
      message.error(`エラーが発生しました: ${error.message}`)
    } finally {
      console.log('🔵 クイックログイン処理終了')
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
        background: 'linear-gradient(135deg, #1a3d2e 0%, #2d8659 50%, #52c41a 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 24px rgba(45, 134, 89, 0.3)',
          borderRadius: '12px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ 
            marginBottom: 4, 
            color: '#2d8659',
            letterSpacing: '2px',
            fontWeight: 700
          }}>
            BABAICHI
          </Title>
          <Text style={{ 
            fontSize: 16, 
            color: '#666',
            display: 'block',
            marginBottom: 8
          }}>
            廃棄物管理システム
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isSignUp ? 'アカウント作成' : '循環型社会の実現'}
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

        {/* テスト用クイックログイン - 常に表示（テスト環境用） */}
        {!isSignUp && (
          <Card
            size="small"
            style={{ 
              marginTop: 16, 
              backgroundColor: '#f6ffed', 
              borderColor: '#b7eb8f',
              borderRadius: '8px'
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
              <strong>🚀 クイックログイン（テスト用）</strong>
            </Text>
            
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, color: '#666' }}>
              システム管理会社:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                size="small"
                block
                onClick={() => handleQuickLogin('admin@test.com')}
                loading={loading}
                style={{ 
                  backgroundColor: '#d9f7be', 
                  borderColor: '#95de64',
                  color: '#2d8659',
                  fontWeight: 500
                }}
              >
                👤 BABA株式会社でログイン（システム管理会社）
              </Button>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, color: '#666' }}>
              マルチテナントA:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                size="small"
                block
                onClick={() => handleQuickLogin('admin@cosmos-drug.test')}
                loading={loading}
                style={{ 
                  backgroundColor: '#e6f7ff', 
                  borderColor: '#91d5ff',
                  color: '#096dd9',
                  fontWeight: 500
                }}
              >
                🏥 コスモス薬品でログイン
              </Button>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, color: '#666' }}>
              マルチテナントB:
            </Text>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Button
                size="small"
                block
                onClick={() => handleQuickLogin('admin@rakuichi.test')}
                loading={loading}
                style={{ 
                  backgroundColor: '#fff7e6', 
                  borderColor: '#ffd591',
                  color: '#d46b08',
                  fontWeight: 500
                }}
              >
                🏪 楽市楽座でログイン
              </Button>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, color: '#666' }}>
              収集業者:
            </Text>
            {loadingCollectors ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Spin size="small" />
              </div>
            ) : collectors.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {collectors.map((collector) => (
                  <Button
                    key={collector.id}
                    size="small"
                    block
                    onClick={() => handleQuickLogin(collector.email)}
                    loading={loading}
                    style={{ 
                      backgroundColor: '#fff1f0', 
                      borderColor: '#ffccc7',
                      color: '#cf1322',
                      fontWeight: 500,
                      textAlign: 'left'
                    }}
                    icon={<TruckOutlined />}
                  >
                    {collector.company_name}
                  </Button>
                ))}
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', color: '#999' }}>
                収集業者が登録されていません
              </Text>
            )}
          </Card>
        )}
      </Card>
    </div>
  )
}

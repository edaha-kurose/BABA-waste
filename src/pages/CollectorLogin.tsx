import React, { useState } from 'react'
import { Card, Form, Input, Button, message, Typography, Space, Divider } from 'antd'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import { CollectorRepository } from '@/modules/collectors/repository'
import type { Collector } from '@contracts/v0/schema'
import { getOrgId } from '@/utils/data-backend'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

interface CollectorLoginProps {
  onLoginSuccess: (collector: Collector) => void
  onBackToAdmin: () => void
}

const CollectorLogin: React.FC<CollectorLoginProps> = ({ onLoginSuccess, onBackToAdmin }) => {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // ログイン処理
  const handleLogin = async (values: LoginFormData) => {
    try {
      setLoading(true)
      
      // 収集業者をメールアドレスで検索
      const collectors = await CollectorRepository.findMany()
      const collector = collectors.find(c => c.email === values.email && c.is_active)
      
      if (!collector) {
        message.error('メールアドレスまたはパスワードが正しくありません')
        return
      }

      // デモ用の簡単な認証（実際の実装では適切な認証が必要）
      if (values.password !== 'demo123') {
        message.error('メールアドレスまたはパスワードが正しくありません')
        return
      }

      message.success(`${collector.company_name} としてログインしました`)
      onLoginSuccess(collector)
      
    } catch (err) {
      console.error('Login failed:', err)
      message.error('ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // デモ収集業者でログイン
  const handleDemoLogin = async () => {
    try {
      setLoading(true)
      
      // デモ収集業者を作成または取得
      const collectors = await CollectorRepository.findMany()
      let demoCollector = collectors.find(c => c.email === 'demo@collector.com')
      
      if (!demoCollector) {
        demoCollector = await CollectorRepository.create({
          // 重要: 他機能と同一の組織IDを使用
          org_id: getOrgId(),
          // UserベースのCollectorとして必要な属性
          name: 'デモ収集業者',
          role: 'COLLECTOR',
          email: 'demo@collector.com',
          is_active: true,
          // 収集業者属性
          company_name: 'デモ収集業者',
          contact_person: '田中太郎',
          phone: '03-1234-5678',
          address: '東京都渋谷区',
          license_number: 'DEMO001',
          service_areas: ['渋谷区', '新宿区'],
        })
      }

      message.success(`${demoCollector.company_name} としてログインしました`)
      onLoginSuccess(demoCollector)
      
    } catch (err) {
      console.error('Demo login failed:', err)
      message.error('デモログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <TeamOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            収集業者ログイン
          </Title>
          <Text type="secondary">
            収集業者専用のログイン画面です
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleLogin}
          size="large"
        >
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
              placeholder="メールアドレスを入力してください"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="パスワード"
            rules={[
              { required: true, message: 'パスワードを入力してください' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワードを入力してください"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%', height: 48 }}
            >
              ログイン
            </Button>
          </Form.Item>
        </Form>

        <Divider>または</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            onClick={handleDemoLogin}
            loading={loading}
            style={{ width: '100%', height: 48 }}
          >
            デモ収集業者でログイン
          </Button>
          
          <Button
            type="link"
            onClick={onBackToAdmin}
            style={{ width: '100%' }}
          >
            管理者ログインに戻る
          </Button>
        </Space>

        <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>デモ用認証情報:</strong><br />
            メール: demo@collector.com<br />
            パスワード: demo123
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default CollectorLogin

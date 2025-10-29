'use client'

/**
 * 収集業者設定画面
 * プロフィール・通知設定など（影響範囲: LOW）
 */

import { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Switch, message, Typography, Space } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import CollectorLayout from '@/components/CollectorLayout'

const { Title, Text } = Typography

interface Settings {
  company_name?: string
  email?: string
  phone?: string
  address?: string
  notification_email?: boolean
  notification_sms?: boolean
}

export default function CollectorSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    // TODO: ユーザー情報を取得
    form.setFieldsValue({
      company_name: '株式会社サンプル',
      email: 'collector@test.com',
      phone: '03-1234-5678',
      notification_email: true,
      notification_sms: false,
    })
  }, [form])

  const handleSave = async (values: Settings) => {
    try {
      setLoading(true)
      message.info('設定保存機能は未実装です')
      // TODO: API実装
      // await fetch('/api/collector/settings', {
      //   method: 'PATCH',
      //   body: JSON.stringify(values),
      // })
      message.success('設定を保存しました')
    } catch (error) {
      console.error('[Settings] Error:', error)
      message.error('保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CollectorLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>設定</Title>
        <Text type="secondary">アカウント情報と通知設定を管理します</Text>
      </div>

      <Card title="基本情報" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="company_name" label="会社名">
            <Input />
          </Form.Item>

          <Form.Item name="email" label="メールアドレス">
            <Input type="email" />
          </Form.Item>

          <Form.Item name="phone" label="電話番号">
            <Input />
          </Form.Item>

          <Form.Item name="address" label="住所">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="通知設定">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="notification_email" label="メール通知" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="notification_sms" label="SMS通知" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </CollectorLayout>
  )
}











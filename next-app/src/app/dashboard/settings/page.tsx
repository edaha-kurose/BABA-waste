'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Divider,
  Space,
  Switch,
  InputNumber,
  Select,
} from 'antd'
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface Settings {
  org_name: string
  org_code: string
  notification_email: string
  jwnet_api_enabled: boolean
  jwnet_api_url?: string
  auto_backup_enabled: boolean
  backup_retention_days?: number
  default_unit: 'T' | 'KG' | 'M3'
}

export default function SettingsPage() {
  const { user, userOrg } = useUser()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 設定読み込み
  const loadSettings = async () => {
    if (!userOrg?.id) return

    try {
      setLoading(true)

      // 組織情報から設定を取得
      const response = await fetch(`/api/organizations/${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')

      const data = await response.json()

      form.setFieldsValue({
        org_name: data.name,
        org_code: data.code,
        notification_email: data.notification_email || '',
        jwnet_api_enabled: false,
        jwnet_api_url: '',
        auto_backup_enabled: true,
        backup_retention_days: 30,
        default_unit: 'T',
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
      message.error('設定の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [userOrg])

  // 設定保存
  const handleSave = async (values: Settings) => {
    if (!userOrg?.id || !user?.id) {
      message.error('ユーザー情報が取得できません')
      return
    }

    try {
      setSaving(true)

      const response = await fetch(`/api/organizations/${userOrg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.org_name,
          code: values.org_code,
          notification_email: values.notification_email,
          updated_by: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失敗')
      }

      message.success('設定を保存しました')
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      message.error(err.message || '設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      <Card
        title={
          <Title level={2}>
            <SettingOutlined /> 設定
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadSettings}>
              再読み込み
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            jwnet_api_enabled: false,
            auto_backup_enabled: true,
            backup_retention_days: 30,
            default_unit: 'T',
          }}
        >
          {/* 組織設定 */}
          <Divider orientation="left">組織設定</Divider>

          <Form.Item
            name="org_name"
            label="組織名"
            rules={[{ required: true, message: '組織名を入力してください' }]}
          >
            <Input placeholder="例: 株式会社BABA" />
          </Form.Item>

          <Form.Item
            name="org_code"
            label="組織コード"
            rules={[{ required: true, message: '組織コードを入力してください' }]}
          >
            <Input placeholder="例: ORG001" />
          </Form.Item>

          <Form.Item
            name="notification_email"
            label="通知用メールアドレス"
            rules={[{ type: 'email', message: '有効なメールアドレスを入力してください' }]}
          >
            <Input placeholder="例: notifications@example.com" />
          </Form.Item>

          {/* JWNET API設定 */}
          <Divider orientation="left">JWNET API設定</Divider>

          <Form.Item
            name="jwnet_api_enabled"
            label="JWNET API連携"
            valuePropName="checked"
          >
            <Switch checkedChildren="有効" unCheckedChildren="無効" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.jwnet_api_enabled !== currentValues.jwnet_api_enabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('jwnet_api_enabled') ? (
                <Form.Item
                  name="jwnet_api_url"
                  label="JWNET API URL"
                  rules={[
                    { required: true, message: 'API URLを入力してください' },
                    { type: 'url', message: '有効なURLを入力してください' },
                  ]}
                >
                  <Input placeholder="https://api.jwnet.or.jp/..." />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {/* バックアップ設定 */}
          <Divider orientation="left">バックアップ設定</Divider>

          <Form.Item
            name="auto_backup_enabled"
            label="自動バックアップ"
            valuePropName="checked"
          >
            <Switch checkedChildren="有効" unCheckedChildren="無効" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.auto_backup_enabled !== currentValues.auto_backup_enabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('auto_backup_enabled') ? (
                <Form.Item
                  name="backup_retention_days"
                  label="バックアップ保持期間（日数）"
                  rules={[
                    { required: true, message: '保持期間を入力してください' },
                    { type: 'number', min: 1, max: 365, message: '1〜365の範囲で入力してください' },
                  ]}
                >
                  <InputNumber min={1} max={365} style={{ width: '100%' }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          {/* デフォルト設定 */}
          <Divider orientation="left">デフォルト設定</Divider>

          <Form.Item
            name="default_unit"
            label="デフォルト単位"
            rules={[{ required: true, message: 'デフォルト単位を選択してください' }]}
          >
            <Select>
              <Option value="T">トン (T)</Option>
              <Option value="KG">キログラム (KG)</Option>
              <Option value="M3">立方メートル (M3)</Option>
            </Select>
          </Form.Item>

          {/* 保存ボタン */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<SaveOutlined />}
              size="large"
              block
            >
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* システム情報 */}
      <Card title="システム情報" style={{ marginTop: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>バージョン:</Text> <Text>1.0.0</Text>
          </div>
          <div>
            <Text strong>最終更新:</Text> <Text>2025-10-16</Text>
          </div>
          <div>
            <Text strong>環境:</Text>{' '}
            <Text>{process.env.NODE_ENV === 'development' ? '開発' : '本番'}</Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}








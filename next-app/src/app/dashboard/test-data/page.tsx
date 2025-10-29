'use client'

/**
 * テストデータ管理画面
 * 開発・検証用（影響範囲: LOW）
 */

import { useState } from 'react'
import { Card, Button, Space, Alert, Typography, message, Descriptions } from 'antd'
import { DatabaseOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function TestDataPage() {
  const [loading, setLoading] = useState(false)

  const handleGenerateTestData = async () => {
    try {
      setLoading(true)
      message.info('テストデータ生成機能は未実装です')
      // TODO: API実装
      // await fetch('/api/test-data/generate', { method: 'POST' })
    } catch (error) {
      console.error('[TestData] Error:', error)
      message.error('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleClearTestData = async () => {
    try {
      setLoading(true)
      message.info('テストデータ削除機能は未実装です')
      // TODO: API実装
      // await fetch('/api/test-data/clear', { method: 'DELETE' })
    } catch (error) {
      console.error('[TestData] Error:', error)
      message.error('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>テストデータ管理</Title>
        <Text type="secondary">開発・検証用のテストデータを管理します</Text>
      </div>

      <Alert
        message="開発環境専用"
        description="本番環境では使用しないでください"
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="テストデータ操作" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="環境">
              {process.env.NODE_ENV === 'production' ? '本番' : '開発'}
            </Descriptions.Item>
            <Descriptions.Item label="データベース">接続中</Descriptions.Item>
          </Descriptions>

          <Space>
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              onClick={handleGenerateTestData}
              loading={loading}
            >
              テストデータ生成
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={handleClearTestData}
              loading={loading}
            >
              テストデータ削除
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="生成されるデータ">
        <ul>
          <li>組織: 3件</li>
          <li>店舗: 10件</li>
          <li>収集予定: 30件</li>
          <li>収集依頼: 20件</li>
          <li>収集実績: 15件</li>
        </ul>
      </Card>
    </div>
  )
}











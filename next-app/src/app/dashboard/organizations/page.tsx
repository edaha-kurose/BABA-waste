'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Typography, Space, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

const { Title } = Typography

interface Organization {
  id: string
  name: string
  code: string
  created_at: string
  _count?: {
    stores: number
    userOrgRoles: number
  }
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')
      const result = await response.json()

      if (response.ok) {
        setOrganizations(result.data)
      } else {
        message.error('組織一覧の取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      message.error('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '組織名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: '組織コード',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '店舗数',
      key: 'stores',
      render: (record: Organization) => record._count?.stores || 0,
    },
    {
      title: 'ユーザー数',
      key: 'users',
      render: (record: Organization) => record._count?.userOrgRoles || 0,
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Organization) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => message.info('編集機能は準備中です')}
          >
            編集
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => message.warning('削除機能は準備中です')}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>組織管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.info('新規作成機能は準備中です')}
        >
          新規作成
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={organizations}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `全 ${total} 件`,
        }}
      />
    </div>
  )
}


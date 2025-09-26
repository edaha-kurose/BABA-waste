import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Typography, Modal, Form, Input, 
  Select, message, Tag, Badge, Alert, Row, Col, Statistic,
  Popconfirm, Tooltip
} from 'antd'
import { 
  WarningOutlined, UserOutlined, ShopOutlined, EditOutlined, 
  DeleteOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { TempRegistrationAlertService, type TempRegistrationAlert, type TempRegistrationStats } from '@/utils/temp-registration-alert'
import { CollectorRepository } from '@/modules/collectors/repository'
import { StoreRepository } from '@/modules/stores/repository'
import type { Collector, Store } from '@contracts/v0/schema'

const { Title, Text } = Typography
const { Option } = Select

const TempRegistrationManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<TempRegistrationAlert[]>([])
  const [stats, setStats] = useState<TempRegistrationStats>({
    totalTemporary: 0,
    temporaryCollectors: 0,
    temporaryStores: 0,
    highPriorityAlerts: 0,
    mediumPriorityAlerts: 0,
    lowPriorityAlerts: 0
  })
  const [loading, setLoading] = useState(false)
  const [editingAlert, setEditingAlert] = useState<TempRegistrationAlert | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const alertService = new TempRegistrationAlertService()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      const [alertsData, statsData] = await Promise.all([
        alertService.getTempRegistrationAlerts(),
        alertService.getTempRegistrationStats()
      ])
      setAlerts(alertsData)
      setStats(statsData)
    } catch (error) {
      console.error('データ取得エラー:', error)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 仮登録を正式登録に変換
  const handleConvertToPermanent = async (alert: TempRegistrationAlert) => {
    try {
      const values = await form.validateFields()
      
      if (alert.type === 'collector') {
        await alertService.convertToPermanent(alert.id, 'collector', {
          name: values.name,
          company_name: values.company_name,
          contact_person: values.contact_person,
          phone: values.phone,
          email: values.email,
          address: values.address,
          license_number: values.license_number,
          jwnet_subscriber_id: values.jwnet_subscriber_id,
          jwnet_public_confirmation_id: values.jwnet_public_confirmation_id,
        })
      } else if (alert.type === 'store') {
        await alertService.convertToPermanent(alert.id, 'store', {
          name: values.name,
          store_code: values.store_code,
          area_name: values.area_name,
          address: values.address,
          area_manager_code: values.area_manager_code,
        })
      }
      
      message.success('正式登録に変換しました')
      setIsModalVisible(false)
      setEditingAlert(null)
      form.resetFields()
      fetchData()
    } catch (error) {
      console.error('変換エラー:', error)
      message.error('変換に失敗しました')
    }
  }

  // 仮登録を削除
  const handleDelete = async (alert: TempRegistrationAlert) => {
    try {
      await alertService.deleteTemporary(alert.id, alert.type)
      message.success('削除しました')
      fetchData()
    } catch (error) {
      console.error('削除エラー:', error)
      message.error('削除に失敗しました')
    }
  }

  // 編集モーダルを開く
  const handleEdit = (alert: TempRegistrationAlert) => {
    setEditingAlert(alert)
    form.setFieldsValue({
      name: alert.name,
      code: alert.code,
    })
    setIsModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { icon: React.ReactNode; text: string; color: string }> = {
          collector: { icon: <UserOutlined />, text: '収集業者', color: '#1890ff' },
          store: { icon: <ShopOutlined />, text: '店舗', color: '#52c41a' },
        }
        const config = typeMap[type] || { icon: null, text: type, color: '#d9d9d9' }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      },
    },
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'コード',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '理由',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const color = alertService.getPriorityColor(priority as 'high' | 'medium' | 'low')
        const text = alertService.getPriorityText(priority as 'high' | 'medium' | 'low')
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: TempRegistrationAlert) => (
        <Space>
          <Tooltip title="正式登録に変換">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="この仮登録を削除しますか？"
            onConfirm={() => handleDelete(record)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Tooltip title="削除">
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          仮登録管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            更新
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="仮登録総数"
              value={stats.totalTemporary}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="仮収集業者"
              value={stats.temporaryCollectors}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="仮店舗"
              value={stats.temporaryStores}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="高優先度"
              value={stats.highPriorityAlerts}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* アラート表示 */}
      {stats.totalTemporary > 0 && (
        <Alert
          message="仮登録データの確認が必要です"
          description={`${stats.totalTemporary}件の仮登録データがあります。詳細情報を入力して正式登録に変換してください。`}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          className="mb-6"
        />
      )}

      {/* 仮登録一覧テーブル */}
      <Card title="仮登録一覧">
        <Table
          columns={columns}
          dataSource={alerts}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 編集モーダル */}
      <Modal
        title={`${editingAlert?.type === 'collector' ? '収集業者' : '店舗'}の正式登録変換`}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingAlert(null)
          form.resetFields()
        }}
        onOk={handleConvertToPermanent}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名前"
            rules={[{ required: true, message: '名前を入力してください' }]}
          >
            <Input />
          </Form.Item>

          {editingAlert?.type === 'collector' && (
            <>
              <Form.Item
                name="company_name"
                label="会社名"
                rules={[{ required: true, message: '会社名を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="contact_person"
                label="担当者名"
                rules={[{ required: true, message: '担当者名を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="phone"
                label="電話番号"
                rules={[{ required: true, message: '電話番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="メールアドレス"
                rules={[
                  { required: true, message: 'メールアドレスを入力してください' },
                  { type: 'email', message: '有効なメールアドレスを入力してください' }
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="address"
                label="住所"
                rules={[{ required: true, message: '住所を入力してください' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item
                name="license_number"
                label="許可番号"
                rules={[{ required: true, message: '許可番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="jwnet_subscriber_id"
                label="JWNET加入者番号"
                rules={[{ required: true, message: 'JWNET加入者番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="jwnet_public_confirmation_id"
                label="JWNET公開確認番号"
                rules={[{ required: true, message: 'JWNET公開確認番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
            </>
          )}

          {editingAlert?.type === 'store' && (
            <>
              <Form.Item
                name="store_code"
                label="店舗番号"
                rules={[{ required: true, message: '店舗番号を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="area_name"
                label="エリア名"
                rules={[{ required: true, message: 'エリア名を入力してください' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="address"
                label="住所"
                rules={[{ required: true, message: '住所を入力してください' }]}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item
                name="area_manager_code"
                label="エリア長コード"
              >
                <Input />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}

export default TempRegistrationManagement

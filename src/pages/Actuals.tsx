// ============================================================================
// 実績管理ページ
// 作成日: 2025-09-16
// 目的: 実績の一覧表示、作成、編集、削除
// ============================================================================

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Upload,
  Image,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  UploadOutlined,
} from '@ant-design/icons'

const { Title } = Typography
const { Option } = Select

interface ActualFormData {
  plan_id: string
  actual_qty: number
  unit: 'T' | 'KG' | 'M3'
  vehicle_no?: string
  driver_name?: string
  weighing_ticket_no?: string
  photo_urls?: string[]
}

const Actuals: React.FC = () => {
  const [actuals, setActuals] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingActual, setEditingActual] = useState<any>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // モックデータ
      const mockPlans = [
        { id: '1', store_name: '本店', item_label: '混載物', planned_date: '2025-09-20' },
        { id: '2', store_name: '支店A', item_label: '蛍光灯', planned_date: '2025-09-21' },
      ]
      setPlans(mockPlans)

      const mockActuals = [
        {
          id: '1',
          plan_id: '1',
          actual_qty: 2.3,
          unit: 'T',
          vehicle_no: 'ABC-123',
          driver_name: '田中太郎',
          weighing_ticket_no: 'WT001',
          photo_urls: [`${getAppConfig().notification.baseUrl}/photos/photo1.jpg`],
          confirmed_at: '2025-09-16T14:00:00Z',
          created_at: '2025-09-16T14:00:00Z',
        },
        {
          id: '2',
          plan_id: '2',
          actual_qty: 45,
          unit: 'KG',
          vehicle_no: 'DEF-456',
          driver_name: '佐藤花子',
          weighing_ticket_no: 'WT002',
          photo_urls: [],
          confirmed_at: '2025-09-16T15:00:00Z',
          created_at: '2025-09-16T15:00:00Z',
        },
      ]
      setActuals(mockActuals)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 実績作成・更新
  const handleSubmit = async (values: ActualFormData) => {
    try {
      // モック実装
      message.success(editingActual ? '実績を更新しました' : '実績を作成しました')
      setModalVisible(false)
      setEditingActual(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save actual:', err)
      message.error('実績の保存に失敗しました')
    }
  }

  // 実績削除
  const handleDelete = async (id: string) => {
    try {
      // モック実装
      message.success('実績を削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete actual:', err)
      message.error('実績の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (actual: any) => {
    setEditingActual(actual)
    form.setFieldsValue(actual)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingActual(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingActual(null)
    form.resetFields()
  }

  // 写真アップロード
  const handlePhotoUpload = async (file: File) => {
    try {
      // モック実装
      message.success('写真をアップロードしました')
      return false // アップロードを防ぐ
    } catch (err) {
      console.error('Failed to upload photo:', err)
      message.error('写真のアップロードに失敗しました')
      return false
    }
  }

  // テーブル列定義
  const columns = [
    {
      title: '予定',
      dataIndex: 'plan_id',
      key: 'plan_id',
      render: (planId: string) => {
        const plan = plans.find(p => p.id === planId)
        return plan ? `${plan.store_name} - ${plan.item_label}` : planId
      },
    },
    {
      title: '実績数量',
      dataIndex: 'actual_qty',
      key: 'actual_qty',
      render: (qty: number, record: any) => `${qty} ${record.unit}`,
    },
    {
      title: '車両番号',
      dataIndex: 'vehicle_no',
      key: 'vehicle_no',
      render: (no: string) => no || '-',
    },
    {
      title: '運転手名',
      dataIndex: 'driver_name',
      key: 'driver_name',
      render: (name: string) => name || '-',
    },
    {
      title: '計量票番号',
      dataIndex: 'weighing_ticket_no',
      key: 'weighing_ticket_no',
      render: (no: string) => no || '-',
    },
    {
      title: '写真',
      dataIndex: 'photo_urls',
      key: 'photo_urls',
      render: (urls: string[]) => (
        <Space>
          {urls.map((url, index) => (
            <Image
              key={index}
              width={40}
              height={40}
              src={url}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
            />
          ))}
        </Space>
      ),
    },
    {
      title: '確定日時',
      dataIndex: 'confirmed_at',
      key: 'confirmed_at',
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="この実績を削除しますか？"
            description="削除した実績は復元できません。"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="center" style={{ height: '400px' }}>
        <Spin size="large" />
        <span className="ml-2">データを読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        message="エラー"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={fetchData}>
            再試行
          </Button>
        }
      />
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          実績管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            更新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新規作成
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="総実績数"
              value={actuals.length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今月の実績"
              value={actuals.filter(a => a.confirmed_at.startsWith('2025-09')).length}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 実績一覧テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={actuals}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 実績作成・編集モーダル */}
      <Modal
        title={editingActual ? '実績編集' : '新規実績作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="plan_id"
                label="予定"
                rules={[
                  { required: true, message: '予定を選択してください' },
                ]}
              >
                <Select placeholder="予定を選択してください">
                  {plans.map(plan => (
                    <Option key={plan.id} value={plan.id}>
                      {plan.store_name} - {plan.item_label} ({plan.planned_date})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="actual_qty"
                label="実績数量"
                rules={[
                  { required: true, message: '実績数量を入力してください' },
                  { type: 'number', min: 0, message: '実績数量は0以上で入力してください' },
                ]}
              >
                <InputNumber
                  placeholder="数量"
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="unit"
                label="単位"
                rules={[
                  { required: true, message: '単位を選択してください' },
                ]}
              >
                <Select placeholder="単位">
                  <Option value="T">T</Option>
                  <Option value="KG">KG</Option>
                  <Option value="M3">M3</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="vehicle_no"
                label="車両番号"
              >
                <Input placeholder="車両番号を入力してください" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="driver_name"
                label="運転手名"
              >
                <Input placeholder="運転手名を入力してください" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="weighing_ticket_no"
                label="計量票番号"
              >
                <Input placeholder="計量票番号を入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="photo_urls"
            label="写真"
          >
            <Upload
              listType="picture-card"
              beforeUpload={handlePhotoUpload}
              multiple
            >
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 8 }}>アップロード</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingActual ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Actuals




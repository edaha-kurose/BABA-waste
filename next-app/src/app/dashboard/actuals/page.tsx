'use client'

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
  Tag,
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
import { useUser } from '@/lib/auth/session'

const { Title } = Typography
const { Option } = Select

interface ActualFormData {
  plan_id: string
  actual_qty: number
  unit: 'T' | 'KG' | 'M3'
  vehicle_no?: string
  driver_name?: string
  weighing_ticket_no?: string
}

export default function ActualsPage() {
  const { user, userOrg } = useUser()
  const [actuals, setActuals] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingActual, setEditingActual] = useState<any>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchActuals = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const response = await fetch(`/api/actuals?org_id=${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')

      const data = await response.json()
      // ページネーション対応: data.data を使用
      setActuals(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error('Failed to fetch actuals:', err)
      message.error('実績の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 予定一覧取得（新規作成時）
  const fetchPlans = async () => {
    if (!userOrg?.id) return

    try {
      const response = await fetch(`/api/plans?org_id=${userOrg.id}`)
      if (!response.ok) throw new Error('取得失敗')

      const data = await response.json()
      // 実績未登録の予定のみ
      const unregisteredPlans = data.filter(
        (plan: any) => !actuals.some((actual) => actual.plan_id === plan.id)
      )
      setPlans(unregisteredPlans)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  useEffect(() => {
    fetchActuals()
  }, [userOrg])

  useEffect(() => {
    if (modalVisible && !editingActual) {
      fetchPlans()
    }
  }, [modalVisible, actuals])

  // フォーム送信
  const handleSubmit = async (values: ActualFormData) => {
    if (!userOrg?.id || !user?.id) {
      message.error('ユーザー情報が取得できません')
      return
    }

    try {
      const url = editingActual
        ? `/api/actuals/${editingActual.id}`
        : '/api/actuals'

      const method = editingActual ? 'PUT' : 'POST'

      const body = {
        ...values,
        org_id: userOrg.id,
        created_by: user.id,
        updated_by: user.id,
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '保存失敗')
      }

      message.success(editingActual ? '実績を更新しました' : '実績を登録しました')
      setModalVisible(false)
      setEditingActual(null)
      form.resetFields()
      fetchActuals()
    } catch (err: any) {
      console.error('Failed to save actual:', err)
      message.error(err.message || '実績の保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/actuals/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '削除失敗')
      }

      message.success('実績を削除しました')
      fetchActuals()
    } catch (err: any) {
      console.error('Failed to delete actual:', err)
      message.error(err.message || '実績の削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (actual: any) => {
    setEditingActual(actual)
    form.setFieldsValue({
      plan_id: actual.plan_id,
      actual_qty: parseFloat(actual.actual_qty),
      unit: actual.unit,
      vehicle_no: actual.vehicle_no,
      driver_name: actual.driver_name,
      weighing_ticket_no: actual.weighing_ticket_no,
    })
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingActual(null)
    form.resetFields()
    form.setFieldsValue({
      unit: 'T',
    })
    setModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: '確定日時',
      dataIndex: 'confirmed_at',
      key: 'confirmed_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
    {
      title: '店舗',
      key: 'store',
      width: 200,
      render: (_: any, record: any) => record.plans?.stores?.name || '-',
    },
    {
      title: '品目',
      key: 'item',
      width: 150,
      render: (_: any, record: any) => record.plans?.item_maps?.item_label || '-',
    },
    {
      title: '予定数量',
      key: 'planned_qty',
      width: 120,
      render: (_: any, record: any) =>
        `${parseFloat(record.plans?.planned_qty || 0).toFixed(2)} ${record.plans?.unit || ''}`,
    },
    {
      title: '実績数量',
      key: 'actual_qty',
      width: 120,
      render: (_: any, record: any) =>
        `${parseFloat(record.actual_qty).toFixed(2)} ${record.unit}`,
    },
    {
      title: '差異',
      key: 'diff',
      width: 100,
      render: (_: any, record: any) => {
        const planned = parseFloat(record.plans?.planned_qty || 0)
        const actual = parseFloat(record.actual_qty)
        const diff = actual - planned
        const color = diff >= 0 ? 'green' : 'red'
        return <Tag color={color}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</Tag>
      },
    },
    {
      title: '車両番号',
      dataIndex: 'vehicle_no',
      key: 'vehicle_no',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: 'ドライバー',
      dataIndex: 'driver_name',
      key: 'driver_name',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '計量票番号',
      dataIndex: 'weighing_ticket_no',
      key: 'weighing_ticket_no',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="実績を削除しますか？"
            description="この操作は取り消せません。"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const stats = {
    total: actuals.length,
    totalQty: actuals.reduce((sum, a) => sum + parseFloat(a.actual_qty), 0),
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <CheckCircleOutlined /> 実績管理
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchActuals}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規登録
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card>
            <Statistic title="登録実績数" value={stats.total} suffix="件" />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="合計実績数量"
              value={stats.totalQty.toFixed(2)}
              suffix="トン"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={actuals}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
          scroll={{ x: 1600 }}
        />
      </Card>

      <Modal
        title={editingActual ? '実績編集' : '実績登録'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingActual(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="キャンセル"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingActual && (
            <Form.Item
              name="plan_id"
              label="予定"
              rules={[{ required: true, message: '予定を選択してください' }]}
            >
              <Select placeholder="予定を選択" showSearch optionFilterProp="children">
                {plans.map((p) => (
                  <Option key={p.id} value={p.id}>
                    {p.stores?.name} - {p.item_maps?.item_label} ({new Date(p.planned_date).toLocaleDateString('ja-JP')})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="actual_qty"
                label="実績数量"
                rules={[
                  { required: true, message: '実績数量を入力してください' },
                  { type: 'number', min: 0.01, message: '0より大きい数値を入力してください' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="例: 2.5" step={0.1} precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="単位"
                rules={[{ required: true, message: '単位を選択してください' }]}
              >
                <Select>
                  <Option value="T">トン (T)</Option>
                  <Option value="KG">キログラム (KG)</Option>
                  <Option value="M3">立方メートル (M3)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="vehicle_no" label="車両番号">
            <Input placeholder="例: ABC-123" />
          </Form.Item>

          <Form.Item name="driver_name" label="ドライバー名">
            <Input placeholder="例: 田中太郎" />
          </Form.Item>

          <Form.Item name="weighing_ticket_no" label="計量票番号">
            <Input placeholder="例: WT001" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}





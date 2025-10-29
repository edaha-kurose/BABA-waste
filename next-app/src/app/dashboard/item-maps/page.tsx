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
  Switch,
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
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TagsOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title } = Typography
const { Option } = Select

interface ItemMapFormData {
  item_label: string
  jwnet_code: string
  hazard: boolean
  default_unit: 'T' | 'KG' | 'M3'
  density_t_per_m3?: number
  disposal_method_code?: string
  notes?: string
}

interface ItemMap {
  id: string
  org_id: string
  item_label: string
  jwnet_code: string
  hazard: boolean
  default_unit: string
  density_t_per_m3?: number
  disposal_method_code?: string
  notes?: string
  created_at: string
  updated_at?: string
  organizations?: {
    id: string
    name: string
    code: string
  }
  _count?: {
    plans: number
  }
}

export default function ItemMapsPage() {
  const { user, userOrg } = useUser()
  const [itemMaps, setItemMaps] = useState<ItemMap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItemMap, setEditingItemMap] = useState<ItemMap | null>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchItemMaps = async () => {
    if (!userOrg?.id) {
      setError('組織情報が取得できません')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/item-maps?org_id=${userOrg.id}`)
      if (!response.ok) {
        throw new Error('品目マップの取得に失敗しました')
      }

      const data = await response.json()
      setItemMaps(data)
    } catch (err) {
      console.error('Failed to fetch item maps:', err)
      setError('品目マップの取得に失敗しました')
      message.error('品目マップの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItemMaps()
  }, [userOrg])

  // 品目マップ作成・更新
  const handleSubmit = async (values: ItemMapFormData) => {
    if (!userOrg?.id || !user?.id) {
      message.error('ユーザー情報が取得できません')
      return
    }

    try {
      const url = editingItemMap
        ? `/api/item-maps/${editingItemMap.id}`
        : '/api/item-maps'
      
      const method = editingItemMap ? 'PUT' : 'POST'
      
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
        throw new Error(errorData.error || '品目マップの保存に失敗しました')
      }

      message.success(
        editingItemMap ? '品目マップを更新しました' : '品目マップを作成しました'
      )
      setModalVisible(false)
      setEditingItemMap(null)
      form.resetFields()
      fetchItemMaps()
    } catch (err: any) {
      console.error('Failed to save item map:', err)
      message.error(err.message || '品目マップの保存に失敗しました')
    }
  }

  // 品目マップ削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/item-maps/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '品目マップの削除に失敗しました')
      }

      message.success('品目マップを削除しました')
      fetchItemMaps()
    } catch (err: any) {
      console.error('Failed to delete item map:', err)
      message.error(err.message || '品目マップの削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (itemMap: ItemMap) => {
    setEditingItemMap(itemMap)
    form.setFieldsValue({
      item_label: itemMap.item_label,
      jwnet_code: itemMap.jwnet_code,
      hazard: itemMap.hazard,
      default_unit: itemMap.default_unit,
      density_t_per_m3: itemMap.density_t_per_m3,
      disposal_method_code: itemMap.disposal_method_code,
      notes: itemMap.notes,
    })
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingItemMap(null)
    form.resetFields()
    form.setFieldsValue({
      hazard: false,
      default_unit: 'T',
    })
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingItemMap(null)
    form.resetFields()
  }

  // テーブル列定義
  const columns = [
    {
      title: '品目ラベル',
      dataIndex: 'item_label',
      key: 'item_label',
      width: 200,
    },
    {
      title: 'JWNETコード',
      dataIndex: 'jwnet_code',
      key: 'jwnet_code',
      width: 150,
    },
    {
      title: '有害性',
      dataIndex: 'hazard',
      key: 'hazard',
      width: 100,
      render: (hazard: boolean) => (
        <Tag color={hazard ? 'red' : 'green'}>{hazard ? '有害' : '一般'}</Tag>
      ),
    },
    {
      title: '単位',
      dataIndex: 'default_unit',
      key: 'default_unit',
      width: 80,
    },
    {
      title: '比重',
      dataIndex: 'density_t_per_m3',
      key: 'density_t_per_m3',
      width: 120,
      render: (density: number) => (density ? `${density} t/m³` : '-'),
    },
    {
      title: '処分方法コード',
      dataIndex: 'disposal_method_code',
      key: 'disposal_method_code',
      width: 150,
      render: (code: string) => code || '-',
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ItemMap) => (
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
            title="この廃棄品目を削除しますか？"
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

  // 統計情報
  const stats = {
    total: itemMaps.length,
    hazardous: itemMaps.filter((item) => item.hazard).length,
    general: itemMaps.filter((item) => !item.hazard).length,
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* ヘッダー */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2}>
            <TagsOutlined /> 廃棄品目リスト
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchItemMaps}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="全品目数" value={stats.total} suffix="件" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="有害廃棄物"
              value={stats.hazardous}
              suffix="件"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="一般廃棄物"
              value={stats.general}
              suffix="件"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      {/* エラー表示 */}
      {error && (
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={itemMaps}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
          scroll={{ x: 1300 }}
        />
      </Card>

      {/* モーダル */}
      <Modal
        title={editingItemMap ? '廃棄品目編集' : '廃棄品目作成'}
        open={modalVisible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="キャンセル"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            hazard: false,
            default_unit: 'T',
          }}
        >
          <Form.Item
            name="item_label"
            label="品目ラベル"
            rules={[{ required: true, message: '品目ラベルを入力してください' }]}
          >
            <Input placeholder="例: 混載物" />
          </Form.Item>

          <Form.Item
            name="jwnet_code"
            label="JWNETコード"
            rules={[{ required: true, message: 'JWNETコードを入力してください' }]}
          >
            <Input placeholder="例: MIX001" />
          </Form.Item>

          <Form.Item name="hazard" label="有害性" valuePropName="checked">
            <Switch checkedChildren="有害" unCheckedChildren="一般" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="default_unit"
                label="デフォルト単位"
                rules={[{ required: true, message: '単位を選択してください' }]}
              >
                <Select>
                  <Option value="T">トン (T)</Option>
                  <Option value="KG">キログラム (KG)</Option>
                  <Option value="M3">立方メートル (M3)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="density_t_per_m3"
                label="比重 (t/m³)"
                rules={[
                  {
                    type: 'number',
                    min: 0,
                    message: '0以上の数値を入力してください',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="例: 1.0"
                  step={0.1}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="disposal_method_code" label="処分方法コード">
            <Input placeholder="例: DM001" />
          </Form.Item>

          <Form.Item name="notes" label="備考">
            <Input.TextArea rows={3} placeholder="備考を入力してください" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}





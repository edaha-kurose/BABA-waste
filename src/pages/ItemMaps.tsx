// ============================================================================
// 品目マッピング管理ページ
// 作成日: 2025-09-16
// 目的: 品目マッピングの一覧表示、作成、編集、削除
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
  Switch,
  InputNumber,
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

const { Title } = Typography

interface ItemMapFormData {
  item_label: string
  jwnet_code: string
  hazard: boolean
  default_unit: 'T' | 'KG' | 'M3'
  density_t_per_m3?: number
  disposal_method_code?: string
  notes?: string
}

const ItemMaps: React.FC = () => {
  const [itemMaps, setItemMaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItemMap, setEditingItemMap] = useState<any>(null)
  const [form] = Form.useForm()

  // データ取得
  const fetchItemMaps = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // モック品目マッピングデータ
      const mockItemMaps = [
        {
          id: '1',
          item_label: '混載物',
          jwnet_code: 'MIX001',
          hazard: false,
          default_unit: 'T',
          density_t_per_m3: 1.0,
          disposal_method_code: 'DM001',
          notes: '一般廃棄物',
          created_at: '2025-09-16T00:00:00Z',
        },
        {
          id: '2',
          item_label: '蛍光灯',
          jwnet_code: 'FLU002',
          hazard: true,
          default_unit: 'KG',
          density_t_per_m3: 0.5,
          disposal_method_code: 'DM002',
          notes: '有害廃棄物',
          created_at: '2025-09-16T00:00:00Z',
        },
      ]
      setItemMaps(mockItemMaps)
    } catch (err) {
      console.error('Failed to fetch item maps:', err)
      setError('品目マッピングデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItemMaps()
  }, [])

  // 品目マッピング作成・更新
  const handleSubmit = async (values: ItemMapFormData) => {
    try {
      // モック実装
      message.success(editingItemMap ? '品目マッピングを更新しました' : '品目マッピングを作成しました')
      setModalVisible(false)
      setEditingItemMap(null)
      form.resetFields()
      fetchItemMaps()
    } catch (err) {
      console.error('Failed to save item map:', err)
      message.error('品目マッピングの保存に失敗しました')
    }
  }

  // 品目マッピング削除
  const handleDelete = async (id: string) => {
    try {
      // モック実装
      message.success('品目マッピングを削除しました')
      fetchItemMaps()
    } catch (err) {
      console.error('Failed to delete item map:', err)
      message.error('品目マッピングの削除に失敗しました')
    }
  }

  // 編集開始
  const handleEdit = (itemMap: any) => {
    setEditingItemMap(itemMap)
    form.setFieldsValue(itemMap)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingItemMap(null)
    form.resetFields()
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
    },
    {
      title: 'JWNETコード',
      dataIndex: 'jwnet_code',
      key: 'jwnet_code',
    },
    {
      title: '有害性',
      dataIndex: 'hazard',
      key: 'hazard',
      render: (hazard: boolean) => (
        <Tag color={hazard ? 'red' : 'green'}>
          {hazard ? '有害' : '一般'}
        </Tag>
      ),
    },
    {
      title: '単位',
      dataIndex: 'default_unit',
      key: 'default_unit',
    },
    {
      title: '比重',
      dataIndex: 'density_t_per_m3',
      key: 'density_t_per_m3',
      render: (density: number) => density ? `${density} t/m³` : '-',
    },
    {
      title: '処分方法コード',
      dataIndex: 'disposal_method_code',
      key: 'disposal_method_code',
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
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
            title="この品目マッピングを削除しますか？"
            description="削除した品目マッピングは復元できません。"
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
          <Button size="small" onClick={fetchItemMaps}>
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
          品目マッピング管理
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchItemMaps}>
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
              title="総品目数"
              value={itemMaps.length}
              prefix={<TagsOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="有害品目数"
              value={itemMaps.filter(item => item.hazard).length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 品目マッピング一覧テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={itemMaps}
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

      {/* 品目マッピング作成・編集モーダル */}
      <Modal
        title={editingItemMap ? '品目マッピング編集' : '新規品目マッピング作成'}
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
                name="item_label"
                label="品目ラベル"
                rules={[
                  { required: true, message: '品目ラベルを入力してください' },
                  { max: 255, message: '品目ラベルは255文字以内で入力してください' },
                ]}
              >
                <Input placeholder="品目ラベルを入力してください" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="jwnet_code"
                label="JWNETコード"
                rules={[
                  { required: true, message: 'JWNETコードを入力してください' },
                  { max: 50, message: 'JWNETコードは50文字以内で入力してください' },
                ]}
              >
                <Input placeholder="JWNETコードを入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="hazard"
                label="有害性"
                valuePropName="checked"
              >
                <Switch checkedChildren="有害" unCheckedChildren="一般" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="default_unit"
                label="デフォルト単位"
                rules={[
                  { required: true, message: 'デフォルト単位を選択してください' },
                ]}
              >
                <Input placeholder="T, KG, M3" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="density_t_per_m3"
                label="比重 (t/m³)"
              >
                <InputNumber
                  placeholder="比重を入力"
                  min={0}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="disposal_method_code"
                label="処分方法コード"
                rules={[
                  { max: 50, message: '処分方法コードは50文字以内で入力してください' },
                ]}
              >
                <Input placeholder="処分方法コードを入力してください" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="notes"
            label="備考"
            rules={[
              { max: 1000, message: '備考は1000文字以内で入力してください' },
            ]}
          >
            <Input.TextArea
              placeholder="備考を入力してください"
              rows={3}
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingItemMap ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ItemMaps




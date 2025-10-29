'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Typography,
  Tag,
  Alert,
  Transfer,
  Progress,
  Steps,
  Spin,
} from 'antd'
import {
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  RightCircleOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'

const { Title, Text, Paragraph } = Typography
const { Option } = Select

interface StoreCollectorAssignment {
  id: string
  store_id: string
  collector_id: string
  is_primary: boolean
  created_at: string
  store?: {
    name: string
    store_code: string
  }
  collector?: {
    company_name: string
    phone?: string
  }
}

export default function StoreCollectorAssignmentsPage() {
  const searchParams = useSearchParams()
  const { userOrg } = useUser()
  const [assignments, setAssignments] = useState<StoreCollectorAssignment[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [collectors, setCollectors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<StoreCollectorAssignment | null>(
    null
  )
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false) // 一括保存中フラグ

  // URLパラメータから遷移元情報を取得
  const fromDashboard = searchParams?.get('from') === 'dashboard'
  const issueType = searchParams?.get('issue') // 'matrix' or 'price'
  const storeId = searchParams?.get('store_id')
  
  // 進捗状況
  const [completionStats, setCompletionStats] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
  })

  // 未設定店舗リスト
  const [unassignedStores, setUnassignedStores] = useState<any[]>([])
  
  // 未設定店舗の選択状態（店舗ID → 収集業者ID）
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({})

  // データ取得
  const fetchData = async () => {
    console.log('[Store Assignments] ========== fetchData 開始 ==========')
    
    if (!userOrg?.id) {
      console.log('[Store Assignments] userOrg.id が未定義')
      setLoading(false)
      return
    }

    console.log('[Store Assignments] userOrg.id:', userOrg.id)

    try {
      setLoading(true)
      
      // 店舗一覧取得
      const storesRes = await fetch(`/api/stores?org_id=${userOrg.id}`)
      const storesData = await storesRes.json()
      setStores(storesData.data || [])

      // 収集業者一覧取得
      const collectorsRes = await fetch(`/api/collectors?org_id=${userOrg.id}`)
      const collectorsData = await collectorsRes.json()
      setCollectors(collectorsData.data || [])

      // 割り当て一覧取得
      const assignmentsRes = await fetch(`/api/store-collector-assignments?org_id=${userOrg.id}`)
      const assignmentsData = await assignmentsRes.json()
      
      console.log('[Store Assignments] API Response Status:', assignmentsRes.status)
      console.log('[Store Assignments] API Response Data:', JSON.stringify(assignmentsData, null, 2))
      
      if (!assignmentsRes.ok) {
        console.error('[Store Assignments] API Error Status:', assignmentsRes.status)
        console.error('[Store Assignments] API Error Message:', assignmentsData.error)
        console.error('[Store Assignments] API Error Details:', JSON.stringify(assignmentsData.details, null, 2))
        message.error(`割り当てデータの取得に失敗しました: ${assignmentsData.error || 'Unknown error'}`)
      }
      
      setAssignments(assignmentsData.data || [])

      // 進捗状況を計算
      const totalStores = storesData.data?.length || 0
      const assignedStores = new Set(assignmentsData.data?.map((a: any) => a.store_id) || []).size
      const percentage = totalStores > 0 ? Math.round((assignedStores / totalStores) * 100) : 0
      
      setCompletionStats({
        total: totalStores,
        completed: assignedStores,
        percentage,
      })

      // 未設定店舗リストを計算（論理削除されていない割り当てのみをカウント）
      const assignedStoreIds = new Set(
        (assignmentsData.data || [])
          .filter((a: any) => a.deleted_at === null)
          .map((a: any) => a.store_id)
      )
      const unassigned = (storesData.data || []).filter((store: any) => !assignedStoreIds.has(store.id))
      setUnassignedStores(unassigned)
      
      console.log('[Store Assignments] 割り当て済み店舗数:', assignedStoreIds.size)
      console.log('[Store Assignments] 未設定店舗数:', unassigned.length)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      message.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userOrg?.id) {
      fetchData()
    }
  }, [userOrg?.id])

  // 作成・編集
  const handleSubmit = async (values: any) => {
    try {
      // TODO: 実際のAPI呼び出し
      if (editingAssignment) {
        message.success('割り当てを更新しました')
      } else {
        message.success('割り当てを作成しました')
      }
      setModalVisible(false)
      setEditingAssignment(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save assignment:', err)
      message.error('割り当ての保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      // TODO: 実際の削除API呼び出し
      message.success('割り当てを削除しました')
      fetchData()
    } catch (err) {
      console.error('Failed to delete assignment:', err)
      message.error('割り当ての削除に失敗しました')
    }
  }

  // 編集
  const handleEdit = (assignment: StoreCollectorAssignment) => {
    setEditingAssignment(assignment)
    form.setFieldsValue({
      store_id: assignment.store_id,
      collector_id: assignment.collector_id,
      is_primary: assignment.is_primary,
    })
    setModalVisible(true)
  }

  // 新規作成
  const handleCreate = () => {
    setEditingAssignment(null)
    form.resetFields()
    setModalVisible(true)
  }

  // 未設定店舗の選択を更新（即保存ではなく、状態のみ更新）
  const handleCollectorSelect = (storeId: string, collectorId: string) => {
    setPendingAssignments((prev) => ({
      ...prev,
      [storeId]: collectorId,
    }))
  }

  // 一括保存（変更を保存ボタン）
  const handleSaveAssignments = async () => {
    const entries = Object.entries(pendingAssignments)
    if (entries.length === 0) {
      message.warning('保存する変更がありません')
      return
    }

    setSaving(true)
    try {
      let successCount = 0
      let errorCount = 0

      for (const [storeId, collectorId] of entries) {
        try {
          const response = await fetch('/api/store-collector-assignments/quick-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              store_id: storeId,
              collector_id: collectorId,
              is_primary: true,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error(`Failed to assign store ${storeId}:`, errorData.error)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          console.error(`Failed to assign store ${storeId}:`, err)
          errorCount++
        }
      }

      if (successCount > 0) {
        message.success(`${successCount}件の割り当てを保存しました`)
        setPendingAssignments({}) // 保存後にクリア
        fetchData() // データ再取得
      }

      if (errorCount > 0) {
        message.error(`${errorCount}件の割り当てに失敗しました`)
      }
    } catch (err: any) {
      console.error('Failed to save assignments:', err)
      message.error('割り当ての保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 未設定店舗テーブルのカラム定義
  const unassignedColumns = [
    {
      title: '店舗コード',
      dataIndex: 'store_code',
      key: 'store_code',
      width: 120,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '店舗名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '住所',
      dataIndex: 'address',
      key: 'address',
      width: 300,
      ellipsis: true,
    },
    {
      title: '収集業者を選択',
      key: 'collector_select',
      width: 250,
      render: (_: any, store: any) => (
        <Select
          placeholder="収集業者を選択"
          style={{ width: '100%' }}
          value={pendingAssignments[store.id] || undefined}
          onChange={(collectorId) => handleCollectorSelect(store.id, collectorId)}
          disabled={saving}
          showSearch
          filterOption={(input, option) => {
            const label = option?.label || option?.children
            if (typeof label === 'string') {
              return label.toLowerCase().includes(input.toLowerCase())
            }
            return false
          }}
        >
          {collectors.map((collector) => (
            <Option key={collector.id} value={collector.id}>
              {collector.company_name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'ステータス',
      key: 'status',
      width: 120,
      render: (_: any, store: any) => {
        if (pendingAssignments[store.id]) {
          return <Tag color="blue">変更あり</Tag>
        }
        return <Tag color="orange">未設定</Tag>
      },
    },
  ]

  // テーブル列定義
  const columns = [
    {
      title: '店舗',
      key: 'store',
      width: 250,
      render: (_: any, record: StoreCollectorAssignment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{(record as any).stores?.name || record.store?.name}</Text>
          <Text type="secondary">{(record as any).stores?.store_code || record.store?.store_code}</Text>
        </Space>
      ),
    },
    {
      title: '収集業者',
      key: 'collector',
      width: 250,
      render: (_: any, record: StoreCollectorAssignment) => (
        <Space direction="vertical" size={0}>
          <Text strong>{(record as any).collectors?.company_name || record.collector?.company_name}</Text>
          {((record as any).collectors?.phone || record.collector?.phone) && (
            <Text type="secondary">{(record as any).collectors?.phone || record.collector?.phone}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '主担当',
      dataIndex: 'is_primary',
      key: 'is_primary',
      width: 100,
      render: (is_primary: boolean) => (
        <Tag color={is_primary ? 'blue' : 'default'}>{is_primary ? '主担当' : '副担当'}</Tag>
      ),
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: StoreCollectorAssignment) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">
            編集
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            size="small"
          >
            削除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* コンテキストバナー（ダッシュボードから遷移時のみ表示） */}
      {fromDashboard && (
        <Alert
          message={
            <Space>
              <WarningOutlined style={{ fontSize: 18, color: '#faad14' }} />
              <Text strong style={{ fontSize: 16 }}>
                {issueType === 'matrix' 
                  ? '🚨 店舗の品目・収集業者マトリクスが未設定です' 
                  : '⚠️ 設定が不足しています'}
              </Text>
            </Space>
          }
          description={
            <div style={{ marginTop: 12 }}>
              <Paragraph style={{ marginBottom: 8 }}>
                {issueType === 'matrix' ? (
                  <>
                    一部の店舗で、品目と収集業者の対応関係（マトリクス）が設定されていません。
                    <br />
                    請求データを正しく生成するため、以下の手順で設定を完了してください。
                  </>
                ) : (
                  <>
                    請求処理を開始する前に、以下の設定を完了してください。
                  </>
                )}
              </Paragraph>
              
              <Steps
                size="small"
                current={-1}
                direction="horizontal"
                style={{ marginTop: 16, marginBottom: 16 }}
                items={[
                  {
                    title: 'Step 1',
                    description: '店舗を確認',
                    icon: <InfoCircleOutlined />,
                  },
                  {
                    title: 'Step 2',
                    description: '収集業者を割り当て',
                    icon: <RightCircleOutlined />,
                  },
                  {
                    title: 'Step 3',
                    description: '品目マトリクスを設定',
                    icon: <CheckCircleOutlined />,
                  },
                ]}
              />

              <Space size="middle">
                <Button 
                  type="primary" 
                  icon={<RightCircleOutlined />} 
                  onClick={() => {
                    // 未設定店舗テーブルにスクロール
                    const unassignedSection = document.getElementById('unassigned-stores-section')
                    if (unassignedSection) {
                      unassignedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  size="large"
                >
                  未設定店舗を確認
                </Button>
                <Button 
                  onClick={() => window.location.href = '/dashboard'}
                  size="large"
                >
                  ダッシュボードに戻る
                </Button>
              </Space>
            </div>
          }
          type="warning"
          showIcon={false}
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 進捗状況カード */}
      {loading ? (
        <Card
          style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Spin size="small" style={{ color: '#fff' }} />
                <Text strong style={{ fontSize: 16, color: '#fff' }}>
                  📊 設定進捗状況を確認中...
                </Text>
              </Space>
            </div>
            <Progress 
              percent={0} 
              strokeColor="#52c41a"
              trailColor="rgba(255,255,255,0.3)"
              style={{ marginBottom: 0 }}
              showInfo={false}
            />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              店舗と収集業者の割り当て状況を読み込んでいます...
            </Text>
          </Space>
        </Card>
      ) : completionStats.total > 0 ? (
        <Card
          style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 16, color: '#fff' }}>
                📊 設定進捗状況
              </Text>
              <Text style={{ fontSize: 14, color: '#fff' }}>
                {completionStats.completed} / {completionStats.total} 店舗
              </Text>
            </div>
            <Progress 
              percent={completionStats.percentage} 
              strokeColor="#52c41a"
              trailColor="rgba(255,255,255,0.3)"
              style={{ marginBottom: 0 }}
            />
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
              {completionStats.percentage === 100 
                ? '✅ 全ての店舗に収集業者が割り当てられています' 
                : `⚠️ ${completionStats.total - completionStats.completed}店舗が未設定です`}
            </Text>
          </Space>
        </Card>
      ) : null}

      {/* 未設定店舗テーブル（ハイブリッドUX） */}
      <div id="unassigned-stores-section">
        {loading ? (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Space direction="vertical" size="middle">
                <Spin size="large" />
                <Text strong style={{ fontSize: 16 }}>
                  データを読み込んでいます...
                </Text>
                <Text type="secondary">
                  店舗情報と収集業者情報を取得しています
                </Text>
              </Space>
            </div>
          </Card>
        ) : unassignedStores.length > 0 ? (
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16 }}>
                  未設定の店舗（{unassignedStores.length}件）
                </Text>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            {saving && (
              <Alert
                message={
                  <Space>
                    <Spin size="small" />
                    <Text strong>保存中です...</Text>
                  </Space>
                }
                description={`${Object.keys(pendingAssignments).length}件の割り当てを保存しています。しばらくお待ちください。`}
                type="info"
                showIcon={false}
                style={{ marginBottom: 16 }}
              />
            )}
            <Alert
              message="💡 設定方法"
              description="各店舗の「収集業者を選択」ドロップダウンから業者を選び、下の緑色の「変更を保存」ボタンをクリックしてください。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Space size="large">
                {Object.keys(pendingAssignments).length > 0 && (
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    📝 {Object.keys(pendingAssignments).length}件の変更があります
                  </Text>
                )}
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSaveAssignments}
                  disabled={Object.keys(pendingAssignments).length === 0 || saving}
                  loading={saving}
                  size="large"
                  style={{ minWidth: 160 }}
                >
                  変更を保存
                </Button>
              </Space>
            </div>
            <Table
              columns={unassignedColumns}
              dataSource={unassignedStores}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `全${total}件`,
              }}
              scroll={{ x: 1000 }}
              loading={saving}
            />
          </Card>
        ) : null}
      </div>

      <Card
        title={
          <Title level={2}>
            <SwapOutlined /> 店舗・収集業者割り当て
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              更新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規作成
            </Button>
          </Space>
        }
      >
        {!fromDashboard && (
          <Alert
            message="店舗・収集業者割り当てについて"
            description="各店舗に対して担当する収集業者を割り当てます。主担当と副担当を設定できます。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Table
          columns={columns}
          dataSource={assignments}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingAssignment ? '割り当て編集' : '新規割り当て作成'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingAssignment(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        okText={editingAssignment ? '更新' : '作成'}
        cancelText="キャンセル"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="店舗"
            name="store_id"
            rules={[{ required: true, message: '店舗を選択してください' }]}
          >
            <Select placeholder="店舗を選択">
              {stores.map((store) => (
                <Option key={store.id} value={store.id}>
                  {store.name} ({store.store_code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="収集業者"
            name="collector_id"
            rules={[{ required: true, message: '収集業者を選択してください' }]}
          >
            <Select placeholder="収集業者を選択">
              {collectors.map((collector) => (
                <Option key={collector.id} value={collector.id}>
                  {collector.company_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="主担当"
            name="is_primary"
            valuePropName="checked"
            initialValue={true}
          >
            <Select>
              <Option value={true}>主担当</Option>
              <Option value={false}>副担当</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}







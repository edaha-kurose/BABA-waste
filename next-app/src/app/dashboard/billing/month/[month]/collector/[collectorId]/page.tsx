'use client'

/**
 * 請求明細詳細画面（インライン編集版）
 * URL: /dashboard/billing/month/[month]/collector/[collectorId]
 * 
 * 機能:
 * - 明細一覧表示（テーブル内でインライン編集）
 * - 手数料の一括保存
 * - ステータス変更
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  InputNumber,
  Select,
  App,
  Checkbox,
  Modal,
} from 'antd'
import {
  ReloadOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

// 型定義
interface BillingItem {
  id: string
  org_id: string
  collector_id: string
  store_id: string | null
  billing_month: Date
  billing_type: string
  item_name: string
  item_code: string | null
  unit_price: number | null
  quantity: number | null
  unit: string | null
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  commission_type: string | null
  commission_rate: number | null
  commission_amount: number | null
  is_commission_manual: boolean
  commission_note: string | null
  net_amount: number | null
  status: string
  stores: { name: string } | null
  collectors: { company_name: string }
}

interface Summary {
  total_fixed: number
  total_metered: number
  total_other: number
  subtotal: number
  total_commission: number
  net_subtotal: number
  tax: number
  grand_total: number
  item_count: number
}

// 編集中のデータを保持する型
interface EditedCommission {
  commission_type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'MANUAL' | 'NONE'
  commission_rate: number | null
  commission_amount: number | null
}

export default function BillingItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { message } = App.useApp()
  
  const month = params.month as string
  const collectorId = params.collectorId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<BillingItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 編集中のデータを保持（itemId -> EditedCommission）
  const [editedData, setEditedData] = useState<Record<string, EditedCommission>>({})

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/billing-items?billing_month=${month}&collector_id=${collectorId}&limit=1000`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const fetchedItems = result.data || []
      setItems(fetchedItems)

      // サマリー計算
      calculateSummary(fetchedItems)

      // 手数料が未設定の明細にデフォルト値を適用
      await applyCommissionDefaults(fetchedItems)
    } catch (err) {
      console.error('Failed to fetch billing items:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [month, collectorId])

  // 手数料デフォルト値を適用
  const applyCommissionDefaults = async (items: BillingItem[]) => {
    if (items.length === 0) return

    const orgId = items[0].org_id

    try {
      // デフォルト値を取得
      const response = await fetch(
        `/api/commission-rules/defaults?org_id=${orgId}&collector_id=${collectorId}&billing_month=${month}`
      )

      if (!response.ok) {
        console.warn('Failed to fetch commission defaults')
        return
      }

      const result = await response.json()
      if (!result.has_default) {
        console.info('No commission defaults found')
        return
      }

      // 手数料が未設定の明細にデフォルト値を設定
      const newEditedData: Record<string, EditedCommission> = {}

      items.forEach((item) => {
        // 既に手数料が設定されている場合はスキップ
        if (item.commission_type) return

        // 請求タイプに対応するデフォルト値を取得
        const defaultRule = result.defaults[item.billing_type]
        if (!defaultRule) return

        newEditedData[item.id] = {
          commission_type: defaultRule.commission_type,
          commission_rate: defaultRule.commission_rate,
          commission_amount: defaultRule.commission_amount,
        }
      })

      if (Object.keys(newEditedData).length > 0) {
        setEditedData(newEditedData)
        message.info(`${Object.keys(newEditedData).length}件の明細に手数料デフォルト値を適用しました`)
      }
    } catch (err) {
      console.error('Failed to apply commission defaults:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // サマリー計算
  const calculateSummary = (data: BillingItem[]) => {
    const summary: Summary = {
      total_fixed: 0,
      total_metered: 0,
      total_other: 0,
      subtotal: 0,
      total_commission: 0,
      net_subtotal: 0,
      tax: 0,
      grand_total: 0,
      item_count: data.length,
    }

    data.forEach((item) => {
      if (item.billing_type === 'FIXED') {
        summary.total_fixed += item.amount
      } else if (item.billing_type === 'METERED') {
        summary.total_metered += item.amount
      } else {
        summary.total_other += item.amount
      }

      summary.subtotal += item.amount
      summary.total_commission += item.commission_amount || 0
      summary.net_subtotal += item.net_amount || item.amount
      summary.tax += item.tax_amount
      summary.grand_total += item.total_amount
    })

    setSummary(summary)
  }

  // 編集データの更新
  const handleEditChange = (itemId: string, field: keyof EditedCommission, value: any) => {
    setEditedData((prev) => {
      const current = prev[itemId] || {
        commission_type: 'PERCENTAGE',
        commission_rate: null,
        commission_amount: null,
      }
      
      const updated = {
        ...current,
        [field]: value,
      }
      
      // 手数料タイプを自動判定
      if (field === 'commission_rate' && value !== null && value !== undefined) {
        // 手数料率が入力された → PERCENTAGE
        updated.commission_type = 'PERCENTAGE'
      } else if (field === 'commission_amount' && value !== null && value !== undefined) {
        // 手数料額が入力された → FIXED_AMOUNT
        updated.commission_type = 'FIXED_AMOUNT'
      }
      
      return {
        ...prev,
        [itemId]: updated,
      }
    })
  }

  // 一括保存
  const handleSaveAll = async () => {
    const changedItems = Object.entries(editedData)
    if (changedItems.length === 0) {
      message.warning('変更がありません')
      return
    }

    setSaving(true)
    try {
      const updates = changedItems.map(([itemId, data]) => ({
        id: itemId,
        ...data,
      }))

      const response = await fetch('/api/billing-items/batch-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      message.success(`${changedItems.length}件の手数料を更新しました`)
      setEditedData({}) // 編集データをクリア
      await fetchData() // データ再取得
    } catch (err: any) {
      console.error('Failed to save:', err)
      message.error(err.message || '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // リアルタイム計算（編集中のデータを反映）
  const calculateCommissionForItem = (item: BillingItem): { amount: number; net: number } => {
    const edited = editedData[item.id]
    if (!edited) {
      return {
        amount: item.commission_amount || 0,
        net: item.net_amount || item.amount,
      }
    }

    let commissionAmount = 0
    
    if (edited.commission_type === 'NONE') {
      // 手数料なし
      commissionAmount = 0
    } else if (edited.commission_type === 'PERCENTAGE' && edited.commission_rate !== null) {
      // 手数料は切り捨て（消費税と同様）
      commissionAmount = Math.floor(item.amount * (edited.commission_rate / 100))
    } else if (edited.commission_amount !== null) {
      commissionAmount = edited.commission_amount
    }

    const netAmount = item.amount - commissionAmount
    return { amount: commissionAmount, net: netAmount }
  }

  // テーブルカラム定義
  const columns: ColumnsType<BillingItem> = [
    {
      title: '店舗名',
      dataIndex: ['stores', 'name'],
      key: 'store_name',
      width: 150,
      fixed: 'left',
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '品目名',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 200,
    },
    {
      title: '請求タイプ',
      dataIndex: 'billing_type',
      key: 'billing_type',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          METERED: { text: '従量請求', color: 'green' },
          FIXED: { text: '月額固定請求', color: 'blue' },
          OTHER: { text: 'その他請求', color: 'orange' },
        }
        const config = typeMap[type] || { text: type, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '収集業者からの請求額',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      align: 'right',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '収集業者編集中', color: 'default' },
          SUBMITTED: { text: '提出済み', color: 'processing' },
          APPROVED: { text: '管理会社承認済', color: 'success' },
          REJECTED: { text: '差し戻し', color: 'error' },
          FINALIZED: { text: '排出企業へ請求確定', color: 'cyan' },
          CANCELLED: { text: 'キャンセル', color: 'error' },
        }
        const config = statusMap[status] || { text: status, color: 'default' }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '手数料なし',
      className: 'commission-column',
      key: 'commission_none',
      width: 100,
      align: 'center',
      render: (_: any, record: BillingItem) => {
        const isEditable = !['APPROVED', 'FINALIZED'].includes(record.status)
        const currentType = editedData[record.id]?.commission_type || record.commission_type
        const isNone = currentType === 'NONE'
        
        if (!isEditable) {
          return isNone ? <Tag color="default">手数料なし</Tag> : '-'
        }

        return (
          <Checkbox
            checked={isNone}
            onChange={(e) => {
              if (e.target.checked) {
                // 手数料マスターから設定されているかチェック
                const hasDefaultCommission = 
                  (record.commission_rate !== null && record.commission_rate > 0) ||
                  (record.commission_amount !== null && record.commission_amount > 0)
                
                if (hasDefaultCommission) {
                  // 確認ダイアログを表示
                  Modal.confirm({
                    title: '⚠️ 手数料設定の確認',
                    content: (
                      <div>
                        <p style={{ marginBottom: '12px' }}>
                          <strong>事前に手数料設定がされていますが、本当に手数料なしで問題ないですか？</strong>
                        </p>
                        <p style={{ marginBottom: '8px', color: '#666' }}>
                          現在の設定:
                        </p>
                        <ul style={{ paddingLeft: '20px', color: '#666' }}>
                          {record.commission_rate && (
                            <li>手数料率: {record.commission_rate}%</li>
                          )}
                          {record.commission_amount && (
                            <li>手数料額: ¥{record.commission_amount.toLocaleString()}</li>
                          )}
                        </ul>
                        <p style={{ marginTop: '12px', color: '#cf1322', fontWeight: 'bold' }}>
                          ⚠️ ここでの決定が最終請求金額になりますので、慎重にご確認ください。
                        </p>
                      </div>
                    ),
                    okText: 'はい、手数料なしにします',
                    cancelText: 'キャンセル',
                    okButtonProps: { danger: true },
                    onOk: () => {
                      // 手数料なしにチェック → NONE
                      setEditedData((prev) => ({
                        ...prev,
                        [record.id]: {
                          commission_type: 'NONE',
                          commission_rate: null,
                          commission_amount: null,
                        },
                      }))
                    },
                  })
                } else {
                  // デフォルト設定がない場合は直接NONE
                  setEditedData((prev) => ({
                    ...prev,
                    [record.id]: {
                      commission_type: 'NONE',
                      commission_rate: null,
                      commission_amount: null,
                    },
                  }))
                }
              } else {
                // チェック解除 → PERCENTAGE（デフォルト）
                setEditedData((prev) => ({
                  ...prev,
                  [record.id]: {
                    commission_type: 'PERCENTAGE',
                    commission_rate: record.commission_rate,
                    commission_amount: null,
                  },
                }))
              }
            }}
          />
        )
      },
    },
    {
      title: '手数料率（%）',
      className: 'commission-column',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      width: 120,
      align: 'right',
      render: (_: any, record: BillingItem) => {
        const isEditable = !['APPROVED', 'FINALIZED'].includes(record.status)
        const currentType = editedData[record.id]?.commission_type || record.commission_type
        const isNone = currentType === 'NONE'
        const currentRate = editedData[record.id]?.commission_rate ?? record.commission_rate
        
        if (!isEditable) {
          return currentRate !== null ? `${currentRate.toFixed(2)}%` : '-'
        }

        return (
          <InputNumber
            style={{ width: '100%' }}
            min={-100}
            max={100}
            step={0.1}
            precision={2}
            value={currentRate}
            onChange={(value) => handleEditChange(record.id, 'commission_rate', value)}
            size="small"
            addonAfter="%"
            placeholder="率"
            disabled={isNone}
          />
        )
      },
    },
    {
      title: '手数料額（円）',
      className: 'commission-column',
      dataIndex: 'commission_amount',
      key: 'commission_amount',
      width: 120,
      align: 'right',
      render: (_: any, record: BillingItem) => {
        const isEditable = !['APPROVED', 'FINALIZED'].includes(record.status)
        const currentType = editedData[record.id]?.commission_type || record.commission_type
        const isNone = currentType === 'NONE'
        const currentAmount = editedData[record.id]?.commission_amount ?? record.commission_amount
        
        if (!isEditable) {
          const calculated = calculateCommissionForItem(record)
          return `¥${calculated.amount.toLocaleString()}`
        }

        return (
          <InputNumber
            style={{ width: '100%' }}
            step={100}
            precision={0}
            value={currentAmount}
            onChange={(value) => handleEditChange(record.id, 'commission_amount', value)}
            size="small"
            formatter={(value) => `¥${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => parseFloat(value!.replace(/¥\s?|(,*)/g, '')) || 0}
            placeholder="固定額"
            disabled={isNone}
          />
        )
      },
    },
    {
      title: '手数料総額（円）',
      className: 'commission-column',
      key: 'commission_total',
      width: 130,
      align: 'right',
      render: (_: any, record: BillingItem) => {
        const calculated = calculateCommissionForItem(record)
        return <strong style={{ color: '#cf1322' }}>¥{calculated.amount.toLocaleString()}</strong>
      },
    },
    {
      title: '請求総額',
      className: 'commission-column',
      dataIndex: 'net_amount',
      key: 'net_amount',
      width: 150,
      align: 'right',
      render: (_: any, record: BillingItem) => {
        const calculated = calculateCommissionForItem(record)
        return <strong style={{ color: '#3f8600' }}>¥{calculated.net.toLocaleString()}</strong>
      },
    },
  ]

  const hasChanges = Object.keys(editedData).length > 0

  return (
    <App>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <Card>
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(`/dashboard/billing/month/${month}`)}
            >
              戻る
            </Button>
            <h2 style={{ margin: 0 }}>
              請求明細詳細 - {month}
            </h2>
          </Space>
        </Card>

        {error && <Alert type="error" message={error} showIcon />}

        {/* サマリー */}
        {summary && (
          <Card title="サマリー情報">
            {/* 請求金額セクション */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={6}>
                <Statistic
                  title="固定請求"
                  value={summary.total_fixed}
                  prefix="¥"
                  precision={0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="従量請求"
                  value={summary.total_metered}
                  prefix="¥"
                  precision={0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="その他請求"
                  value={summary.total_other}
                  prefix="¥"
                  precision={0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="小計"
                  value={summary.subtotal}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ fontWeight: 'bold', fontSize: '20px' }}
                />
              </Col>
            </Row>

            {/* 手数料セクション（黄色背景） */}
            <div
              style={{
                backgroundColor: '#fffbe6',
                padding: '16px',
                borderRadius: '4px',
                border: '1px solid #ffe58f',
              }}
            >
              <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#ad6800' }}>
                💰 手数料設定（BABA社収益）
              </div>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="手数料合計"
                    value={summary.total_commission}
                    prefix="¥"
                    precision={0}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="請求総額"
                    value={summary.net_subtotal}
                    prefix="¥"
                    precision={0}
                    valueStyle={{ color: '#3f8600', fontWeight: 'bold', fontSize: '20px' }}
                  />
                </Col>
              </Row>
            </div>
          </Card>
        )}

        {/* アクションボタン */}
        <Card>
          <Space size="middle" wrap>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              loading={saving}
              disabled={!hasChanges}
            >
              変更を保存 {hasChanges && `(${Object.keys(editedData).length}件)`}
            </Button>
            {hasChanges && (
              <Tag color="orange">未保存の変更があります</Tag>
            )}
          </Space>
        </Card>

        {/* 明細一覧テーブル */}
        <Card title={`明細一覧 (${items.length}件)`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>読み込み中...</div>
            </div>
          ) : (
            <>
              <style jsx global>{`
                .commission-column {
                  background-color: #fffbe6 !important;
                }
                .ant-table-cell.commission-column {
                  background-color: #fffbe6 !important;
                }
              `}</style>
              <Table
                columns={columns}
                dataSource={items}
                rowKey="id"
                scroll={{ x: 1500 }}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (total) => `全 ${total} 件`,
                }}
              />
            </>
          )}
        </Card>
      </Space>
    </App>
  )
}

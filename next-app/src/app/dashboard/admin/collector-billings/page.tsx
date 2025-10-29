'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Select, DatePicker, Card, Space, message, Modal, Tag, Input } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useSelectedTenant } from '@/hooks/useSelectedTenant'

const { Option } = Select
const { TextArea } = Input

interface CollectorBilling {
  id: string
  org_id: string
  collector_id: string
  billing_month: string
  total_fixed_amount: number
  total_metered_amount: number
  total_other_amount: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  total_items_count: number
  status: string
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
  collectors?: {
    id: string
    company_name: string
  }
}

export default function CollectorBillingsPage() {
  const { selectedTenantId } = useSelectedTenant()
  const [messageApi, contextHolder] = message.useMessage()

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs())
  const [selectedStatus, setSelectedStatus] = useState<string>('SUBMITTED')
  const [billings, setBillings] = useState<CollectorBilling[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // 請求書一覧を取得
  const fetchBillings = useCallback(async () => {
    if (!selectedTenantId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        org_id: selectedTenantId,
        billing_month: selectedMonth.format('YYYY-MM-DD'),
      })

      if (selectedStatus) {
        params.append('status', selectedStatus)
      }

      const response = await fetch(`/api/billing-summaries?${params}`)
      if (!response.ok) throw new Error('Failed to fetch billings')
      const result = await response.json()
      setBillings(result.data || [])
    } catch (error) {
      console.error('Error fetching billings:', error)
      messageApi.error('請求書一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedTenantId, selectedMonth, selectedStatus, messageApi])

  useEffect(() => {
    if (selectedTenantId) {
      fetchBillings()
    }
  }, [selectedTenantId, selectedMonth, selectedStatus, fetchBillings])

  // 承認
  const handleApprove = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('承認する請求書を選択してください')
      return
    }

    Modal.confirm({
      title: '請求書を承認しますか？',
      content: `${selectedRowKeys.length}件の請求書を承認します。`,
      okText: '承認',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch('/api/billing-summaries/approve-summaries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              billing_summary_ids: selectedRowKeys,
            }),
          })

          if (!response.ok) throw new Error('Failed to approve')

          const result = await response.json()
          messageApi.success(result.message || '承認しました')
          setSelectedRowKeys([])
          fetchBillings()
        } catch (error) {
          console.error('Error approving billings:', error)
          messageApi.error('承認に失敗しました')
        }
      },
    })
  }

  // 差し戻し
  const handleReject = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('差し戻す請求書を選択してください')
      return
    }

    setRejectModalVisible(true)
  }

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      messageApi.warning('差し戻し理由を入力してください')
      return
    }

    try {
      const response = await fetch('/api/billing-summaries/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_summary_ids: selectedRowKeys,
          rejection_reason: rejectionReason,
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')

      const result = await response.json()
      messageApi.success(result.message || '差し戻しました')
      setRejectModalVisible(false)
      setRejectionReason('')
      setSelectedRowKeys([])
      fetchBillings()
    } catch (error) {
      console.error('Error rejecting billings:', error)
      messageApi.error('差し戻しに失敗しました')
    }
  }

  const columns = [
    {
      title: '収集業者',
      dataIndex: ['collectors', 'company_name'],
      key: 'collector_name',
      width: 200,
    },
    {
      title: '請求月',
      dataIndex: 'billing_month',
      key: 'billing_month',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY年MM月'),
    },
    {
      title: '固定費',
      dataIndex: 'total_fixed_amount',
      key: 'total_fixed_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '従量費',
      dataIndex: 'total_metered_amount',
      key: 'total_metered_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '小計',
      dataIndex: 'subtotal_amount',
      key: 'subtotal_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '税額',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '合計',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => <strong>¥{amount.toLocaleString()}</strong>,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
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
      title: '提出日時',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 180,
      render: (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ]

  return (
    <>
      {contextHolder}
      <div style={{ padding: '24px' }}>
        <h1>収集業者請求一覧</h1>

        {/* フィルタ */}
        <Card style={{ marginBottom: '24px' }}>
          <Space wrap>
            <DatePicker
              picker="month"
              value={selectedMonth}
              onChange={(date) => date && setSelectedMonth(date)}
              format="YYYY年MM月"
              style={{ width: 200 }}
            />
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              style={{ width: 200 }}
              placeholder="ステータス"
            >
              <Option value="">全て</Option>
              <Option value="DRAFT">下書き</Option>
              <Option value="SUBMITTED">提出済み</Option>
              <Option value="APPROVED">承認済み</Option>
              <Option value="REJECTED">差し戻し</Option>
              <Option value="PAID">支払済み</Option>
            </Select>
          </Space>
        </Card>

        {/* アクション */}
        <Space wrap style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={handleApprove}
            disabled={selectedRowKeys.length === 0}
          >
            ✅ 承認 ({selectedRowKeys.length})
          </Button>
          <Button
            danger
            size="large"
            icon={<CloseOutlined />}
            onClick={handleReject}
            disabled={selectedRowKeys.length === 0}
          >
            ❌ 差し戻し ({selectedRowKeys.length})
          </Button>
        </Space>

        {/* 請求書一覧 */}
        <Table
          columns={columns}
          dataSource={billings}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1400 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
            getCheckboxProps: (record) => ({
              disabled: record.status !== 'SUBMITTED',
            }),
          }}
        />

        {/* 差し戻しモーダル */}
        <Modal
          title="請求書を差し戻し"
          open={rejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={() => {
            setRejectModalVisible(false)
            setRejectionReason('')
          }}
          okText="差し戻し"
          cancelText="キャンセル"
        >
          <p>差し戻し理由を入力してください：</p>
          <TextArea
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="例：金額に誤りがあります。再確認をお願いします。"
          />
        </Modal>
      </div>
    </>
  )
}



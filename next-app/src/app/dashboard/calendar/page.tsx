'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Calendar as AntCalendar,
  Badge,
  Typography,
  Space,
  Select,
  Modal,
  List,
  Tag,
  Spin,
  Alert,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'

dayjs.locale('ja')

const { Title, Text } = Typography
const { Option } = Select

interface Plan {
  id: string
  planned_date: string
  planned_qty: number
  unit: string
  stores: {
    id: string
    store_code: string
    name: string
  }
  item_maps: {
    id: string
    item_label: string
  }
}

interface CollectionRequest {
  id: string
  requested_at: string
  status: string
  scheduled_collection_date?: string
  stores: {
    id: string
    store_code: string
    name: string
  }
}

export default function CalendarPage() {
  const { userOrg } = useUser()
  const [plans, setPlans] = useState<Plan[]>([])
  const [collectionRequests, setCollectionRequests] = useState<CollectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewMode, setViewMode] = useState<'plans' | 'requests' | 'both'>('both')

  // データ取得
  const fetchData = async () => {
    if (!userOrg?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const [plansResponse, requestsResponse] = await Promise.all([
        fetch(`/api/plans?org_id=${userOrg.id}`),
        fetch(`/api/collection-requests?org_id=${userOrg.id}`),
      ])

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(Array.isArray(plansData) ? plansData : plansData.data || [])
      }

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json()
        setCollectionRequests(Array.isArray(requestsData) ? requestsData : requestsData.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userOrg])

  // 日付ごとのイベント取得
  const getEventsForDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')

    const plansForDate = plans.filter((p) => dayjs(p.planned_date).format('YYYY-MM-DD') === dateStr)
    const requestsForDate = collectionRequests.filter(
      (r) =>
        (r.scheduled_collection_date &&
          dayjs(r.scheduled_collection_date).format('YYYY-MM-DD') === dateStr) ||
        dayjs(r.requested_at).format('YYYY-MM-DD') === dateStr
    )

    return { plans: plansForDate, requests: requestsForDate }
  }

  // カレンダーセルのレンダリング
  const dateCellRender = (value: Dayjs) => {
    const { plans: dailyPlans, requests: dailyRequests } = getEventsForDate(value)

    const items: React.ReactNode[] = []

    if (viewMode === 'plans' || viewMode === 'both') {
      if (dailyPlans.length > 0) {
        items.push(
          <Badge key="plans" status="success" text={`予定: ${dailyPlans.length}件`} />
        )
      }
    }

    if (viewMode === 'requests' || viewMode === 'both') {
      if (dailyRequests.length > 0) {
        items.push(
          <Badge key="requests" status="processing" text={`依頼: ${dailyRequests.length}件`} />
        )
      }
    }

    return <div>{items}</div>
  }

  // 日付クリック
  const onDateSelect = (value: Dayjs) => {
    setSelectedDate(value)
    setModalVisible(true)
  }

  // 選択日のイベント
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : { plans: [], requests: [] }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <CalendarOutlined /> カレンダー
          </Title>
        }
        extra={
          <Select value={viewMode} onChange={setViewMode} style={{ width: 150 }}>
            <Option value="both">すべて表示</Option>
            <Option value="plans">予定のみ</Option>
            <Option value="requests">依頼のみ</Option>
          </Select>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : (
          <AntCalendar
            dateCellRender={dateCellRender}
            onSelect={onDateSelect}
          />
        )}
      </Card>

      {/* 日付詳細モーダル */}
      <Modal
        title={selectedDate ? selectedDate.format('YYYY年MM月DD日（ddd）') : ''}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedDateEvents.plans.length === 0 && selectedDateEvents.requests.length === 0 ? (
          <Alert
            message="この日のイベントはありません"
            type="info"
            showIcon
          />
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {(viewMode === 'plans' || viewMode === 'both') && selectedDateEvents.plans.length > 0 && (
              <div>
                <Title level={4}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> 予定
                </Title>
                <List
                  dataSource={selectedDateEvents.plans}
                  renderItem={(plan) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{plan.stores.name}</Text>
                            <Tag>{plan.item_maps.item_label}</Tag>
                          </Space>
                        }
                        description={`${plan.planned_qty} ${plan.unit}`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}

            {(viewMode === 'requests' || viewMode === 'both') && selectedDateEvents.requests.length > 0 && (
              <div>
                <Title level={4}>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} /> 収集依頼
                </Title>
                <List
                  dataSource={selectedDateEvents.requests}
                  renderItem={(request) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>{request.stores.name}</Text>
                            <Tag color="blue">{request.status}</Tag>
                          </Space>
                        }
                        description={
                          request.scheduled_collection_date
                            ? `予定収集日: ${dayjs(request.scheduled_collection_date).format('YYYY-MM-DD')}`
                            : `依頼日: ${dayjs(request.requested_at).format('YYYY-MM-DD')}`
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}





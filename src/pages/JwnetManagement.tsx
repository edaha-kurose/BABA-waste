import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  message,
  Tag,
  Row,
  Col,
  Typography,
  Tabs,
  Statistic,
  Alert,
  Modal,
  Descriptions,
  Badge,
} from 'antd'
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { JwnetReservationRepository } from '@/modules/jwnet-reservations/repository'
import { JwnetRegistrationRepository } from '@/modules/jwnet-registrations/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { CollectionRepository } from '@/modules/collections/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { jwnetService } from '@/services/jwnet-service'
import type { JwnetReservation, JwnetRegistration, CollectionRequest, Collection, Store, Collector, Plan } from '@contracts/v0/schema'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TabPane } = Tabs

const JwnetManagement: React.FC = () => {
  const [reservations, setReservations] = useState<JwnetReservation[]>([])
  const [registrations, setRegistrations] = useState<JwnetRegistration[]>([])
  const [requests, setRequests] = useState<CollectionRequest[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [recordType, setRecordType] = useState<'reservation' | 'registration' | null>(null)

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [
        reservationsData,
        registrationsData,
        requestsData,
        collectionsData,
        storesData,
        collectorsData,
        plansData
      ] = await Promise.all([
        JwnetReservationRepository.findMany(),
        JwnetRegistrationRepository.findMany(),
        CollectionRequestRepository.findMany(),
        CollectionRepository.findMany(),
        StoreRepository.findMany(),
        CollectorRepository.findMany(),
        PlanRepository.findMany()
      ])
      
      setReservations(reservationsData)
      setRegistrations(registrationsData)
      setRequests(requestsData)
      setCollections(collectionsData)
      setStores(storesData)
      setCollectors(collectorsData)
      setPlans(plansData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ステータス確認
  const handleCheckStatus = async (jwnetId: string, type: 'reservation' | 'registration') => {
    try {
      await jwnetService.checkStatus(jwnetId, type)
      message.success('ステータスを確認しました')
      fetchData()
    } catch (err) {
      console.error('Status check failed:', err)
      message.error('ステータス確認に失敗しました')
    }
  }

  // 詳細表示
  const handleShowDetail = (record: any, type: 'reservation' | 'registration') => {
    setSelectedRecord(record)
    setRecordType(type)
    setDetailModalVisible(true)
  }

  // ステータス別の色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'orange'
      case 'SUBMITTED': return 'blue'
      case 'ACCEPTED': return 'green'
      case 'REJECTED': return 'red'
      case 'COMPLETED': return 'green'
      case 'ERROR': return 'red'
      default: return 'default'
    }
  }

  // ステータス別のラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '待機中'
      case 'SUBMITTED': return '送信済み'
      case 'ACCEPTED': return '承認済み'
      case 'REJECTED': return '拒否'
      case 'COMPLETED': return '完了'
      case 'ERROR': return 'エラー'
      default: return status
    }
  }

  // 統計データ
  const reservationStats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    submitted: reservations.filter(r => r.status === 'SUBMITTED').length,
    accepted: reservations.filter(r => r.status === 'ACCEPTED').length,
    rejected: reservations.filter(r => r.status === 'REJECTED').length,
    completed: reservations.filter(r => r.status === 'COMPLETED').length,
    error: reservations.filter(r => r.status === 'ERROR').length,
  }

  const registrationStats = {
    total: registrations.length,
    pending: registrations.filter(r => r.status === 'PENDING').length,
    submitted: registrations.filter(r => r.status === 'SUBMITTED').length,
    accepted: registrations.filter(r => r.status === 'ACCEPTED').length,
    rejected: registrations.filter(r => r.status === 'REJECTED').length,
    completed: registrations.filter(r => r.status === 'COMPLETED').length,
    error: registrations.filter(r => r.status === 'ERROR').length,
  }

  // 予約登録テーブル列定義
  const reservationColumns = [
    {
      title: 'JWNET ID',
      dataIndex: 'jwnet_reservation_id',
      key: 'jwnet_reservation_id',
      render: (id: string) => (
        <Text code>{id}</Text>
      ),
    },
    {
      title: '店舗',
      key: 'store',
      render: (_: any, record: JwnetReservation) => {
        const request = requests.find(r => r.id === record.collection_request_id)
        const store = request ? stores.find(s => s.id === request.store_id) : null
        return store ? store.name : '-'
      },
    },
    {
      title: '収集業者',
      key: 'collector',
      render: (_: any, record: JwnetReservation) => {
        const request = requests.find(r => r.id === record.collection_request_id)
        const collector = request ? collectors.find(c => c.id === request.collector_id) : null
        return collector ? collector.company_name : '-'
      },
    },
    {
      title: '送信日時',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      render: (no: string) => no ? <Text code>{no}</Text> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: JwnetReservation) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleShowDetail(record, 'reservation')}
          >
            詳細
          </Button>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => handleCheckStatus(record.jwnet_reservation_id, 'reservation')}
          >
            確認
          </Button>
        </Space>
      ),
    },
  ]

  // 本登録テーブル列定義
  const registrationColumns = [
    {
      title: 'JWNET ID',
      dataIndex: 'jwnet_registration_id',
      key: 'jwnet_registration_id',
      render: (id: string) => (
        <Text code>{id}</Text>
      ),
    },
    {
      title: '店舗',
      key: 'store',
      render: (_: any, record: JwnetRegistration) => {
        const collection = collections.find(c => c.id === record.collection_id)
        const request = collection ? requests.find(r => r.id === collection.collection_request_id) : null
        const store = request ? stores.find(s => s.id === request.store_id) : null
        return store ? store.name : '-'
      },
    },
    {
      title: '収集業者',
      key: 'collector',
      render: (_: any, record: JwnetRegistration) => {
        const collection = collections.find(c => c.id === record.collection_id)
        const request = collection ? requests.find(r => r.id === collection.collection_request_id) : null
        const collector = request ? collectors.find(c => c.id === request.collector_id) : null
        return collector ? collector.company_name : '-'
      },
    },
    {
      title: '送信日時',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: 'マニフェスト番号',
      dataIndex: 'manifest_no',
      key: 'manifest_no',
      render: (no: string) => no ? <Text code>{no}</Text> : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: JwnetRegistration) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleShowDetail(record, 'registration')}
          >
            詳細
          </Button>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => handleCheckStatus(record.jwnet_registration_id, 'registration')}
          >
            確認
          </Button>
        </Space>
      ),
    },
  ]

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4} type="danger">エラーが発生しました</Title>
          <p>{error}</p>
          <Button onClick={fetchData}>再試行</Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      {/* ヘッダー */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <SendOutlined /> JWNET登録管理
            </Title>
            <Text type="secondary">
              JWNET WebEDIとの連携状況を確認・管理します
            </Text>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              更新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Title level={4}>予約登録</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="総数" value={reservationStats.total} />
              </Col>
              <Col span={6}>
                <Statistic title="承認済み" value={reservationStats.accepted} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="待機中" value={reservationStats.pending} valueStyle={{ color: '#fa8c16' }} />
              </Col>
              <Col span={6}>
                <Statistic title="エラー" value={reservationStats.error} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Title level={4}>本登録</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="総数" value={registrationStats.total} />
              </Col>
              <Col span={6}>
                <Statistic title="完了" value={registrationStats.completed} valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="送信済み" value={registrationStats.submitted} valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col span={6}>
                <Statistic title="エラー" value={registrationStats.error} valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* タブ */}
      <Card>
        <Tabs defaultActiveKey="reservations">
          <TabPane tab={`予約登録 (${reservations.length})`} key="reservations">
            <Table
              columns={reservationColumns}
              dataSource={reservations}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
          <TabPane tab={`本登録 (${registrations.length})`} key="registrations">
            <Table
              columns={registrationColumns}
              dataSource={registrations}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="JWNET登録詳細"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRecord && recordType && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="JWNET ID" span={2}>
              <Text code>{recordType === 'reservation' ? selectedRecord.jwnet_reservation_id : selectedRecord.jwnet_registration_id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="ステータス">
              <Tag color={getStatusColor(selectedRecord.status)}>
                {getStatusLabel(selectedRecord.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="マニフェスト番号">
              {selectedRecord.manifest_no ? <Text code>{selectedRecord.manifest_no}</Text> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="送信日時">
              {selectedRecord.submitted_at ? dayjs(selectedRecord.submitted_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="承認日時">
              {selectedRecord.accepted_at ? dayjs(selectedRecord.accepted_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            {selectedRecord.error_message && (
              <Descriptions.Item label="エラーメッセージ" span={2}>
                <Text type="danger">{selectedRecord.error_message}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="JWNETレスポンス" span={2}>
              <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                {JSON.stringify(selectedRecord.jwnet_response, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default JwnetManagement

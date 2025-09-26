// ============================================================================
// ダッシュボードページ
// 作成日: 2025-09-16
// 目的: システムの概要とKPIを表示
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Button, Space, Typography, Spin, Alert, Badge, Tag, Tooltip, Switch } from 'antd'
import {
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  UserOutlined,
  ShopOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'

// データ取得
import { organizationRepository } from '@/modules/organizations/repository'
import { TempRegistrationAlertService, type TempRegistrationStats, type TempRegistrationAlert } from '@/utils/temp-registration-alert'

const { Title, Text } = Typography

interface DashboardStats {
  totalOrganizations: number
  totalStores: number
  totalPlans: number
  totalReservations: number
  totalActuals: number
  totalRegistrations: number
  pendingReservations: number
  pendingRegistrations: number
  errorReservations: number
  errorRegistrations: number
  // 追加KPI
  unsetPickupCount: number
  unreportedAfterDueCount: number
  unlinkedJwnetCount: number
}

interface RecentActivity {
  id: string
  type: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error'
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizations: 0,
    totalStores: 0,
    totalPlans: 0,
    totalReservations: 0,
    totalActuals: 0,
    totalRegistrations: 0,
    pendingReservations: 0,
    pendingRegistrations: 0,
    errorReservations: 0,
    errorRegistrations: 0,
    unsetPickupCount: 0,
    unreportedAfterDueCount: 0,
    unlinkedJwnetCount: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [tempStats, setTempStats] = useState<TempRegistrationStats>({
    totalTemporary: 0,
    temporaryCollectors: 0,
    temporaryStores: 0,
    highPriorityAlerts: 0,
    mediumPriorityAlerts: 0,
    lowPriorityAlerts: 0
  })
  const [tempAlerts, setTempAlerts] = useState<TempRegistrationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // ダッシュボードKPIの表示設定（localStorage永続化）
  const [showPickupKpis, setShowPickupKpis] = useState<boolean>(localStorage.getItem('kpi.pickup') !== 'false')

  // データ取得
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 組織数を取得
      const orgCount = await organizationRepository.count()
      
      // モックデータ（実際の実装では各Repositoryから取得）
      const mockStats: DashboardStats = {
        totalOrganizations: orgCount,
        totalStores: 15,
        totalPlans: 245,
        totalReservations: 198,
        totalActuals: 156,
        totalRegistrations: 142,
        pendingReservations: 12,
        pendingRegistrations: 8,
        errorReservations: 3,
        errorRegistrations: 2,
        // 追加KPI（モック）
        unsetPickupCount: 7,
        unreportedAfterDueCount: 4,
        unlinkedJwnetCount: 5,
      }

      setStats(mockStats)

      // 仮登録アラートデータを取得
      const alertService = new TempRegistrationAlertService()
      const [tempStatsData, tempAlertsData] = await Promise.all([
        alertService.getTempRegistrationStats(),
        alertService.getTempRegistrationAlerts()
      ])
      setTempStats(tempStatsData)
      setTempAlerts(tempAlertsData.slice(0, 5)) // 最新5件のみ表示

      // 最近のアクティビティ（モックデータ）
      const mockActivities: RecentActivity[] = [
        {
          id: '1',
          type: 'plan',
          description: '新規予定が作成されました',
          timestamp: '2025-09-16 14:30:00',
          status: 'success',
        },
        {
          id: '2',
          type: 'reservation',
          description: '予約がJWNETに送信されました',
          timestamp: '2025-09-16 14:25:00',
          status: 'success',
        },
        {
          id: '3',
          type: 'actual',
          description: '実績が入力されました',
          timestamp: '2025-09-16 14:20:00',
          status: 'success',
        },
        {
          id: '4',
          type: 'registration',
          description: '本登録でエラーが発生しました',
          timestamp: '2025-09-16 14:15:00',
          status: 'error',
        },
        {
          id: '5',
          type: 'reservation',
          description: '予約の送信が失敗しました',
          timestamp: '2025-09-16 14:10:00',
          status: 'error',
        },
      ]

      setRecentActivities(mockActivities)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('ダッシュボードデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleTogglePickupKpis = (v: boolean) => {
    setShowPickupKpis(v)
    localStorage.setItem('kpi.pickup', String(v))
  }

  // 仮登録アラートテーブル列定義
  const tempAlertColumns = [
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, { icon: React.ReactNode; text: string }> = {
          collector: { icon: <UserOutlined />, text: '収集業者' },
          store: { icon: <ShopOutlined />, text: '店舗' },
        }
        const config = typeMap[type] || { icon: null, text: type }
        return (
          <Space>
            {config.icon}
            {config.text}
          </Space>
        )
      },
    },
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'コード',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '理由',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => {
        const alertService = new TempRegistrationAlertService()
        const color = alertService.getPriorityColor(priority as 'high' | 'medium' | 'low')
        const text = alertService.getPriorityText(priority as 'high' | 'medium' | 'low')
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('ja-JP'),
    },
  ]

  // テーブル列定義
  const activityColumns = [
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          plan: '予定',
          reservation: '予約',
          actual: '実績',
          registration: '本登録',
        }
        return typeMap[type] || type
      },
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '時刻',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          success: { color: 'green', text: '成功' },
          warning: { color: 'orange', text: '警告' },
          error: { color: 'red', text: 'エラー' },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'gray', text: status }
        return <Text style={{ color: config.color }}>{config.text}</Text>
      },
    },
  ]

  if (loading) {
    return (
      <div className="center" style={{ height: '400px' }}>
        <Spin size="large" />
        <Text className="ml-2">データを読み込み中...</Text>
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
          <Button size="small" onClick={fetchDashboardData}>
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
          ダッシュボード
        </Title>
        <Space>
          <span>
            収集・JWNET KPI表示
            <Switch className="ml-2" checked={showPickupKpis} onChange={handleTogglePickupKpis} />
          </span>
          <Button icon={<ReloadOutlined />} onClick={fetchDashboardData}>
            更新
          </Button>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="組織数"
              value={stats.totalOrganizations}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="店舗数"
              value={stats.totalStores}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="予定数"
              value={stats.totalPlans}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="実績数"
              value={stats.totalActuals}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {showPickupKpis && (
        <Row gutter={[16,16]} className="mb-6">
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title={<Space><span>回収日時未決定数</span><Tooltip title="回収依頼で収集業者を割り当てたが回収日時が決定していない数"><InfoCircleOutlined /></Tooltip></Space>}
                value={stats.unsetPickupCount}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title={<Space><span>回収情報未登録数</span><Tooltip title="回収日時を1日過ぎたが回収情報が登録されていない数"><InfoCircleOutlined /></Tooltip></Space>}
                value={stats.unreportedAfterDueCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title={<Space><span>JWNET未連携数</span><Tooltip title="回収情報が登録されたがJWNETに連携が完了していない依頼件数"><InfoCircleOutlined /></Tooltip></Space>}
                value={stats.unlinkedJwnetCount}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 仮登録アラートカード */}
      {tempStats.totalTemporary > 0 && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24}>
            <Alert
              message="仮登録アラート"
              description={`${tempStats.totalTemporary}件の仮登録データがあります。詳細情報の入力が必要です。`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              action={
                <Space>
                  <Badge count={tempStats.highPriorityAlerts} color="#ff4d4f">
                    <Tag color="red">高優先度: {tempStats.highPriorityAlerts}</Tag>
                  </Badge>
                  <Badge count={tempStats.mediumPriorityAlerts} color="#faad14">
                    <Tag color="orange">中優先度: {tempStats.mediumPriorityAlerts}</Tag>
                  </Badge>
                  <Badge count={tempStats.lowPriorityAlerts} color="#52c41a">
                    <Tag color="green">低優先度: {tempStats.lowPriorityAlerts}</Tag>
                  </Badge>
                </Space>
              }
            />
          </Col>
        </Row>
      )}

      {/* 仮登録統計カード */}
      {tempStats.totalTemporary > 0 && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="仮登録総数"
                value={tempStats.totalTemporary}
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="仮収集業者"
                value={tempStats.temporaryCollectors}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="仮店舗"
                value={tempStats.temporaryStores}
                prefix={<ShopOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="高優先度"
                value={tempStats.highPriorityAlerts}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* ステータスカード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="予約待ち"
              value={stats.pendingReservations}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本登録待ち"
              value={stats.pendingRegistrations}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="予約エラー"
              value={stats.errorReservations}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本登録エラー"
              value={stats.errorRegistrations}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 仮登録アラート一覧 */}
      {tempAlerts.length > 0 && (
        <Card 
          title={
            <Space>
              <WarningOutlined />
              仮登録アラート一覧
              <Badge count={tempAlerts.length} color="#faad14" />
            </Space>
          } 
          className="mb-6"
        >
          <Table
            columns={tempAlertColumns}
            dataSource={tempAlerts}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 最近のアクティビティ */}
      <Card title="最近のアクティビティ" className="mb-6">
        <Table
          columns={activityColumns}
          dataSource={recentActivities}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* クイックアクション */}
      <Card title="クイックアクション">
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />}>
            新規予定作成
          </Button>
          <Button icon={<FileTextOutlined />}>
            予定一括取り込み
          </Button>
          <Button icon={<CheckCircleOutlined />}>
            実績入力
          </Button>
          <Button icon={<FileTextOutlined />}>
            レポート出力
          </Button>
        </Space>
      </Card>
    </div>
  )
}

export default Dashboard

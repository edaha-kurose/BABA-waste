import React, { useState, useEffect } from 'react'
import {
  Card,
  Tabs,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  message,
  Form,
  Input,
} from 'antd'
import {
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  TagsOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  UserOutlined,
  CrownOutlined,
  DatabaseOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import { UserRepository } from '@/modules/users/repository'
import { DisposalSiteRepository } from '@/modules/disposal-sites/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import type { User, DisposalSite, WasteTypeMaster } from '@contracts/v0/schema'

// 各タブのコンポーネントを直接定義（統合された設定ページ内で実装）

const { Title, Text } = Typography
const { TabPane } = Tabs

interface CollectorSettingsProps {
  collector: User
  onUpdate: (updatedCollector: User) => void
}

const CollectorSettings: React.FC<CollectorSettingsProps> = ({ collector, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    masterUsers: 0,
    generalUsers: 0,
    wasteTypes: 0,
    disposalSites: 0,
  })

  // 統計データを取得
  const fetchStats = async () => {
    try {
      setLoading(true)
      const [users, wasteTypes, disposalSites] = await Promise.all([
        UserRepository.findMany({ org_id: collector.org_id }),
        WasteTypeMasterRepository.findByCollectorId(collector.id),
        DisposalSiteRepository.findByCollectorId(collector.id),
      ])

      const activeUsers = users.filter(user => user.is_active)
      const masterUsers = activeUsers.filter(user => user.role === 'ADMIN')
      const generalUsers = activeUsers.filter(user => user.role === 'USER')

      setStats({
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        masterUsers: masterUsers.length,
        generalUsers: generalUsers.length,
        wasteTypes: wasteTypes.length,
        disposalSites: disposalSites.length,
      })
    } catch (error) {
      console.error('統計データ取得エラー:', error)
      message.error('統計データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // コンポーネントマウント時に統計データを取得
  useEffect(() => {
    fetchStats()
  }, [collector])

  // 会社情報タブのコンポーネント
  const CompanyInfoTab = () => {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
      form.setFieldsValue({
        company_name: collector.company_name,
        contact_person: collector.contact_person,
        phone: collector.phone,
        address: collector.address,
        license_number: collector.license_number,
        jwnet_subscriber_id: collector.jwnet_subscriber_id,
        jwnet_public_confirmation_id: collector.jwnet_public_confirmation_id,
      })
    }, [collector, form])

    const handleSave = async (values: any) => {
      try {
        setLoading(true)
        const updatedCollector = await UserRepository.update(collector.id, values)
        onUpdate(updatedCollector)
        message.success('会社情報を更新しました')
        setHasChanges(false)
      } catch (error) {
        console.error('会社情報更新エラー:', error)
        message.error('会社情報の更新に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={() => setHasChanges(true)}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="company_name"
              label="会社名"
              rules={[{ required: true, message: '会社名を入力してください' }]}
            >
              <Input prefix={<ShopOutlined />} placeholder="会社名を入力" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="contact_person"
              label="担当者名"
              rules={[{ required: true, message: '担当者名を入力してください' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="担当者名を入力" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="電話番号"
            >
              <Input prefix={<PhoneOutlined />} placeholder="電話番号を入力" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="license_number"
              label="ライセンス番号"
            >
              <Input prefix={<IdcardOutlined />} placeholder="ライセンス番号を入力" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="address"
          label="住所"
        >
          <Input.TextArea prefix={<EnvironmentOutlined />} placeholder="住所を入力" rows={3} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="jwnet_subscriber_id"
              label="JWNET加入者番号"
            >
              <Input placeholder="JWNET加入者番号を入力" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="jwnet_public_confirmation_id"
              label="JWNET公開確認番号"
            >
              <Input placeholder="JWNET公開確認番号を入力" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!hasChanges}>
              保存
            </Button>
            <Button onClick={() => form.resetFields()}>
              リセット
            </Button>
          </Space>
        </Form.Item>
      </Form>
    )
  }

  // タブの定義
  const tabItems = [
    {
      key: 'company-info',
      label: '会社情報',
      icon: <ShopOutlined />,
      children: <CompanyInfoTab />,
    },
    {
      key: 'user-master',
      label: 'ユーザーマスター',
      icon: <TeamOutlined />,
      children: <div>ユーザーマスター機能は実装中です</div>,
    },
    {
      key: 'waste-type-master',
      label: '廃棄物種別マスター',
      icon: <TagsOutlined />,
      children: <div>廃棄物種別マスター機能は実装中です</div>,
    },
    {
      key: 'disposal-site-master',
      label: '処分場マスター',
      icon: <EnvironmentOutlined />,
      children: <div>処分場マスター機能は実装中です</div>,
    },
  ]

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <SettingOutlined className="text-blue-500 text-2xl mr-3" />
          <div>
            <Title level={2} className="mb-0">
              収集業者設定
            </Title>
            <Text type="secondary" className="text-sm">
              マスター管理・アカウント設定・システム管理
            </Text>
          </div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchStats}
            loading={loading}
          >
            更新
          </Button>
        </Space>
      </div>

      {/* 情報ボックス */}
      <Alert
        message="収集業者設定"
        description="収集業者に関する各種設定を行います。会社情報、ユーザー管理、廃棄物種別、処分場情報を管理できます。"
        type="info"
        showIcon
        className="mb-6"
      />

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="総ユーザー数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="アクティブユーザー"
              value={stats.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="マスター権限"
              value={stats.masterUsers}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="一般ユーザー"
              value={stats.generalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 追加統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="廃棄物種別数"
              value={stats.wasteTypes}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="処分場数"
              value={stats.disposalSites}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      {/* タブコンテンツ */}
      <Card>
        <Tabs
          defaultActiveKey="company-info"
          items={tabItems.map(item => ({
            key: item.key,
            label: (
              <span>
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </span>
            ),
            children: item.children,
          }))}
          className="collector-settings-tabs"
          tabBarStyle={{
            marginBottom: 24,
            borderBottom: '1px solid #f0f0f0',
          }}
        />
      </Card>
    </div>
  )
}

export default CollectorSettings

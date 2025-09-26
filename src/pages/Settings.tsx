import React, { useState } from 'react'
import { 
  Card, Tabs, Typography, Space, Button, 
  Row, Col, Statistic, Divider, Alert, Switch, Input, message
} from 'antd'
import { 
  SettingOutlined, UserOutlined, ShopOutlined, 
  TeamOutlined, DatabaseOutlined, CodeOutlined,
  LogoutOutlined, ReloadOutlined, MailOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { getAppConfig } from '@/config/app-config'
import { notificationService } from '@/services/notification-service'

// 各マスター管理コンポーネントのインポート
import Users from './Users'
import StoreManagement from './StoreManagement'
import Collectors from './Collectors'
import StoreCollectorAssignments from './StoreCollectorAssignments'
import JwnetWasteCodes from './JwnetWasteCodes'
import TestDataManagement from './TestDataManagement'

const { Title, Text } = Typography
const { TabPane } = Tabs

// =============================================================================
// 設定画面
// =============================================================================

const Settings: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')
  // 通知設定（簡易保存：localStorage）
  const [notifEnabled, setNotifEnabled] = useState<boolean>(localStorage.getItem('notif.enabled') === 'true')
  const [notifBaseUrl, setNotifBaseUrl] = useState<string>(localStorage.getItem('notif.baseUrl') || getAppConfig().notification.baseUrl)

  const persistNotif = (enabled: boolean, baseUrl: string) => {
    localStorage.setItem('notif.enabled', String(enabled))
    localStorage.setItem('notif.baseUrl', baseUrl)
  }

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mockUser')
      navigate('/login')
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  // メイン画面に戻る
  const handleBackToMain = () => {
    navigate('/dashboard')
  }

  const handleTestSend = async () => {
    try {
      persistNotif(notifEnabled, notifBaseUrl)
      const result = await notificationService.sendTestNotification()
      if (result) {
        message.success('テスト送信が完了しました')
      } else {
        message.error('テスト送信に失敗しました')
      }
    } catch (e) {
      console.error(e)
      message.error('テスト送信に失敗しました')
    }
  }

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <SettingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  システム設定
                </Title>
                <Text type="secondary">
                  マスター管理・アカウント設定・システム管理
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => window.location.reload()}
              >
                更新
              </Button>
              <Button 
                icon={<LogoutOutlined />} 
                danger
                onClick={handleLogout}
              >
                ログアウト
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 設定タブ */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          tabPosition="top"
        >
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                アカウント管理
              </span>
            } 
            key="users"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="ユーザーアカウント管理"
                description="システム利用者のアカウント作成・編集・削除を行います。マスター権限が必要です。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <Users />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <ShopOutlined />
                店舗マスター
              </span>
            } 
            key="stores"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="店舗マスター管理"
                description="廃棄物回収対象店舗の基本情報を管理します。CSV取り込み機能で一括更新が可能です。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <StoreManagement />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TeamOutlined />
                収集業者マスター
              </span>
            } 
            key="collectors"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="収集業者マスター管理"
                description="廃棄物収集業者の基本情報とJWNET設定を管理します。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <Collectors />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TeamOutlined />
                回収業者設定
              </span>
            } 
            key="assignments"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="回収業者設定"
                description="店舗と収集業者の割り当て関係を管理します。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <StoreCollectorAssignments />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <CodeOutlined />
                JWNET廃棄物コード
              </span>
            } 
            key="jwnet-codes"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="JWNET廃棄物コード管理"
                description="JWNET連携に必要な廃棄物コードのマスターを管理します。"
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <JwnetWasteCodes />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <DatabaseOutlined />
                テストデータ管理
              </span>
            } 
            key="test-data"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="テストデータ管理"
                description="デモ用のテストデータの生成・削除を行います。"
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />
              <TestDataManagement />
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <MailOutlined />
                通知設定
              </span>
            } 
            key="notifications"
          >
            <div style={{ padding: '16px 0' }}>
              <Alert
                message="廃棄依頼の割当通知"
                description={`当日割り当てが決定した案件を収集業者ごとにまとめ、${getAppConfig().notification.dailySendHourJST}:00(${getAppConfig().timezone})に1通で通知します。デモ収集業者の送信先は ${getAppConfig().notification.testEmail} に上書きします。`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col span={8}>
                  <Space>
                    <Text>通知を有効化</Text>
                    <Switch checked={notifEnabled} onChange={(v)=>{ setNotifEnabled(v); persistNotif(v, notifBaseUrl) }} />
                  </Space>
                </Col>
                <Col span={16}>
                  <Space style={{ width: '100%' }}>
                    <Text>システムURL</Text>
                    <Input value={notifBaseUrl} onChange={(e)=> setNotifBaseUrl(e.target.value)} onBlur={()=> persistNotif(notifEnabled, notifBaseUrl)} placeholder="http://example.com" />
                    <Button type="primary" onClick={handleTestSend}>テスト送信</Button>
                  </Space>
                </Col>
              </Row>
              <Divider />
              <div>
                <Text strong>通知内容（件名/本文）</Text>
                <div className="mt-2">
                  <Text>件名: 株式会社BABAより廃棄回収のご依頼通知</Text>
                </div>
                <div>
                  <Text>本文: 株式会社BABAからの廃棄回収がありました。詳細はURL（システムの該当URL）でご確認ください。</Text>
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default Settings
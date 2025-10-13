import { Card, Col, Row, Statistic, Typography } from 'antd'
import {
  ShopOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function DashboardPage() {
  // TODO: APIからデータを取得（Server Componentsで）
  const stats = {
    organizations: 5,
    stores: 42,
    plans: 128,
    collections: 89,
  }

  return (
    <div className="p-6">
      <Title level={2}>ダッシュボード</Title>
      <Paragraph>廃棄物管理システムの概要</Paragraph>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="組織数"
              value={stats.organizations}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="店舗数"
              value={stats.stores}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="収集予定"
              value={stats.plans}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="収集実績"
              value={stats.collections}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={12}>
          <Card title="最近の活動">
            <ul className="space-y-2">
              <li>✅ 組織「テスト株式会社」を作成しました</li>
              <li>📍 店舗「渋谷店」を登録しました</li>
              <li>📝 収集予定を5件登録しました</li>
              <li>🚚 収集実績を3件記録しました</li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="システム情報">
            <dl className="space-y-2">
              <div>
                <dt className="font-semibold">バージョン</dt>
                <dd className="text-gray-600">0.1.0</dd>
              </div>
              <div>
                <dt className="font-semibold">環境</dt>
                <dd className="text-gray-600">開発環境</dd>
              </div>
              <div>
                <dt className="font-semibold">データベース</dt>
                <dd className="text-gray-600">Supabase PostgreSQL</dd>
              </div>
              <div>
                <dt className="font-semibold">API</dt>
                <dd className="text-green-600">✓ 正常稼働中</dd>
              </div>
            </dl>
          </Card>
        </Col>
      </Row>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <Title level={4}>🚀 Phase 2 進行中</Title>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>✅ Next.js 14 + Prisma セットアップ完了</li>
          <li>✅ Organizations API 完成</li>
          <li>✅ Stores API 完成</li>
          <li>✅ Plans API 完成</li>
          <li>✅ Collections API 完成</li>
          <li>🔄 ダッシュボードUI 構築中</li>
          <li>⏳ 認証・認可統合</li>
        </ul>
      </div>
    </div>
  )
}


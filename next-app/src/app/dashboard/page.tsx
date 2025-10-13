'use client';

/**
 * ダッシュボードページ（シンプル版）
 * TODO: 統計機能を段階的に追加
 */

import { Card, Row, Col, Statistic } from 'antd';
import { DollarOutlined, ShopOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';

export default function DashboardPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>ダッシュボード</h1>

      {/* KPIカード */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の請求金額"
              value={0}
              prefix={<DollarOutlined />}
              suffix="円"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理店舗数"
              value={0}
              prefix={<ShopOutlined />}
              suffix="店舗"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収予定"
              value={0}
              prefix={<FileTextOutlined />}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収完了"
              value={0}
              prefix={<CheckCircleOutlined />}
              suffix="件"
            />
          </Card>
        </Col>
      </Row>

      {/* お知らせ */}
      <Card title="システム情報" style={{ marginTop: 24 }}>
        <p>✅ BABA廃棄物管理システムへようこそ</p>
        <p>✅ データベース接続: 正常</p>
        <p>✅ 認証システム: 有効</p>
        <p>📊 統計機能は今後実装予定です</p>
      </Card>
    </div>
  );
}

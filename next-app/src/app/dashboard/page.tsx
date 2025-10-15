'use client';

/**
 * ダッシュボードページ
 * リアルタイム統計データを表示
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Typography } from 'antd';
import { DollarOutlined, ShopOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface DashboardStats {
  totalBillingAmount: number;
  managedStoresCount: number;
  pendingCollectionsCount: number;
  completedCollectionsCount: number;
  currentMonth: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Dashboard] 統計データ取得開始...');
        const response = await fetch('/api/dashboard/stats');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'データの取得に失敗しました');
        }

        const data = await response.json();
        console.log('[Dashboard] 統計データ取得成功:', data);
        setStats(data);
      } catch (err) {
        console.error('[Dashboard] 統計データ取得エラー:', err);
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="統計データを読み込み中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="エラー"
          description={error}
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>ダッシュボード</h1>
      {stats && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          集計期間: {stats.currentMonth}
        </Text>
      )}

      {/* KPIカード */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の請求金額"
              value={stats?.totalBillingAmount ?? 0}
              prefix={<DollarOutlined />}
              suffix="円"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="管理店舗数"
              value={stats?.managedStoresCount ?? 0}
              prefix={<ShopOutlined />}
              suffix="店舗"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収予定"
              value={stats?.pendingCollectionsCount ?? 0}
              prefix={<FileTextOutlined />}
              suffix="件"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="回収完了"
              value={stats?.completedCollectionsCount ?? 0}
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
        <p>✅ 統計機能: 稼働中</p>
      </Card>
    </div>
  );
}

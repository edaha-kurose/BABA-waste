'use client';

/**
 * ダッシュボードページ
 * リアルタイム統計データを表示
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert, Typography, Button } from 'antd';
import { DollarOutlined, ShopOutlined, FileTextOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useSelectedTenant } from '@/components/TenantSelector';
import { useUser } from '@/lib/auth/session';

const { Text, Link } = Typography;

interface DashboardStats {
  totalBillingAmount: number;
  managedStoresCount: number;
  pendingCollectionsCount: number;
  completedCollectionsCount: number;
  currentMonth: string;
  collectorsCount: number;
  itemMapsCount: number;
  matrixCount: number;
  billingItemsCount: number;
  jwnetConfigured: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const selectedTenantId = useSelectedTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[Dashboard] 統計データ取得開始...');
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: abortController.signal, // キャンセル可能にする
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('[Dashboard] APIエラー:', {
            status: response.status,
            error: data.error,
            message: data.message,
            details: data.details,
          });
          throw new Error(data.details || data.message || 'データの取得に失敗しました');
        }

        if (isMounted) {
          console.log('[Dashboard] 統計データ取得成功:', data);
          setStats(data);
        }
      } catch (err) {
        // AbortError は無視（意図的なキャンセル）
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[Dashboard] リクエストがキャンセルされました（正常）');
          return;
        }
        
        console.error('[Dashboard] 統計データ取得エラー:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    // クリーンアップ: リクエストをキャンセル
    return () => {
      abortController.abort();
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" spinning tip="統計データを読み込み中...">
          <div style={{ padding: 50 }} />
        </Spin>
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

  // 初期設定の完了状況をチェック
  const isSetupIncomplete = stats && (
    stats.managedStoresCount === 0 ||
    stats.collectorsCount === 0 ||
    stats.itemMapsCount === 0 ||
    stats.matrixCount === 0 ||
    stats.billingItemsCount === 0 ||
    !stats.jwnetConfigured
  );

  const missingSetupItems: string[] = [];
  if (stats) {
    if (stats.managedStoresCount === 0) missingSetupItems.push('店舗マスター');
    if (stats.collectorsCount === 0) missingSetupItems.push('収集業者マスター');
    if (stats.itemMapsCount === 0) missingSetupItems.push('廃棄品目リスト');
    if (stats.matrixCount === 0) missingSetupItems.push('店舗×品目×業者マトリクス登録');
    if (stats.billingItemsCount === 0) missingSetupItems.push('請求単価設定');
    if (!stats.jwnetConfigured) missingSetupItems.push('JWNET設定');
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

      {/* 未完了セットアップアラート（軽量） */}
      {missingSetupItems.length > 0 && (
        <Alert
          message="⚠️ セットアップが未完了です"
          description={
            <div>
              <Text>以下の項目が未設定です：</Text>
              <ul style={{ marginTop: 8, marginBottom: 12 }}>
                {missingSetupItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <Button 
                type="primary" 
                icon={<CheckCircleOutlined />}
                onClick={() => router.push('/dashboard/system-guide')}
              >
                システムガイドで詳細を確認
              </Button>
            </div>
          }
          type="warning"
          showIcon
          closable
          style={{ marginTop: 24 }}
        />
      )}

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

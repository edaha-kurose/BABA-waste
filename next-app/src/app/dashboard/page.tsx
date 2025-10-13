'use client';

/**
 * ダッシュボードページ（データ可視化強化版）
 * 
 * - KPI カード（請求・回収実績）
 * - 月次推移グラフ（請求金額）
 * - 店舗別比較グラフ
 * - 廃棄物種別内訳グラフ
 */

import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, message, Select, DatePicker } from 'antd';
import {
  ShopOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  TrendingUpOutlined,
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

// カラーパレット
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface DashboardStats {
  kpi: {
    current_month_billing: {
      total_amount: number;
      total_items: number;
      fixed_amount: number;
      metered_amount: number;
      other_amount: number;
    };
    current_month_collections: {
      count: number;
      total_quantity: number;
    };
    active_stores: number;
    current_month_requests: number;
  };
  monthly_trends: Array<{
    month: string;
    total_amount: number;
    fixed_amount: number;
    metered_amount: number;
    other_amount: number;
    items_count: number;
  }>;
  store_stats: Array<{
    store_id: string;
    store_name: string;
    collection_count: number;
    total_quantity: number;
    total_amount: number;
  }>;
  waste_type_breakdown: Array<{
    waste_type_name: string;
    collection_count: number;
    total_quantity: number;
    total_amount: number;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, 'months').startOf('month'),
    dayjs().endOf('month'),
  ]);

  // Mock: 組織ID（実際はログインユーザーから取得）
  const orgId = 'mock-org-id';

  // 統計データを取得
  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        org_id: orgId,
        from_date: dateRange[0].format('YYYY-MM-DD'),
        to_date: dateRange[1].format('YYYY-MM-DD'),
      });

      if (selectedCollectorId) {
        params.append('collector_id', selectedCollectorId);
      }

      const response = await fetch(`/api/statistics/dashboard?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      message.error('ダッシュボード統計の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    fetchStats();
  }, [dateRange, selectedCollectorId]);

  // 数値フォーマット
  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>統計データを読み込んでいます...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>ダッシュボード</h1>
        <p>統計データを取得できませんでした。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>
        <TrendingUpOutlined /> ダッシュボード
      </h1>

      {/* フィルター */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <label style={{ marginRight: 8 }}>期間:</label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => dates && setDateRange(dates as [Dayjs, Dayjs])}
              format="YYYY/MM/DD"
            />
          </Col>
          <Col span={12}>
            <label style={{ marginRight: 8 }}>収集業者:</label>
            <Select
              style={{ width: 200 }}
              placeholder="すべて"
              allowClear
              value={selectedCollectorId || undefined}
              onChange={setSelectedCollectorId}
            >
              <Select.Option value="collector-1">収集業者A</Select.Option>
              <Select.Option value="collector-2">収集業者B</Select.Option>
              <Select.Option value="collector-3">収集業者C</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* KPI カード */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の請求金額（税込）"
              value={stats.kpi.current_month_billing.total_amount}
              prefix={<DollarOutlined />}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ color: '#3f8600', fontSize: 20 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              {stats.kpi.current_month_billing.total_items}件の請求明細
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の回収実績"
              value={stats.kpi.current_month_collections.count}
              suffix="件"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              総回収量: {formatNumber(stats.kpi.current_month_collections.total_quantity)} kg
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="アクティブ店舗数"
              value={stats.kpi.active_stores}
              suffix="店舗"
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今月の収集依頼"
              value={stats.kpi.current_month_requests}
              suffix="件"
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14', fontSize: 20 }}
            />
          </Card>
        </Row>

      {/* 請求種別内訳 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="固定金額"
              value={stats.kpi.current_month_billing.fixed_amount}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="従量請求"
              value={stats.kpi.current_month_billing.metered_amount}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="その他費用"
              value={stats.kpi.current_month_billing.other_amount}
              formatter={(value) => formatCurrency(Number(value))}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 月次推移グラフ */}
      <Card title="請求金額 月次推移" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.monthly_trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_amount"
              stroke="#8884d8"
              strokeWidth={2}
              name="合計金額"
            />
            <Line
              type="monotone"
              dataKey="fixed_amount"
              stroke="#82ca9d"
              strokeWidth={2}
              name="固定金額"
            />
            <Line
              type="monotone"
              dataKey="metered_amount"
              stroke="#ffc658"
              strokeWidth={2}
              name="従量請求"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 店舗別統計 & 廃棄物種別内訳 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 店舗別比較 */}
        <Col span={12}>
          <Card title="店舗別 請求金額 TOP10">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.store_stats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="store_name" width={100} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total_amount" fill="#8884d8" name="請求金額" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 廃棄物種別内訳 */}
        <Col span={12}>
          <Card title="廃棄物種別内訳（請求金額）">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.waste_type_breakdown}
                  dataKey="total_amount"
                  nameKey="waste_type_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) =>
                    `${entry.waste_type_name}: ${formatCurrency(entry.total_amount)}`
                  }
                >
                  {stats.waste_type_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 回収実績統計 */}
      <Card title="回収実績統計（回収回数）" style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.store_stats.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="store_name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="collection_count" fill="#82ca9d" name="回収回数" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

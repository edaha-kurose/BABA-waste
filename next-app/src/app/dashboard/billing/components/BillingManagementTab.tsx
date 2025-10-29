'use client';

/**
 * 請求管理ページ
 * 
 * - 請求明細一覧表示
 * - Collection から請求データ自動生成
 * - 請求サマリー表示
 * - Excel 出力
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  DatePicker,
  Select,
  message,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
  Tag,
  Descriptions,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  CalculatorOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

// 請求種別
enum BillingType {
  FIXED = 'FIXED',
  METERED = 'METERED',
  OTHER = 'OTHER',
}

// 請求ステータス
enum BillingStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

interface BillingItem {
  id: string;
  org_id: string;
  collector_id: string;
  store_id: string | null;
  collection_id: string | null;
  billing_month: string;
  billing_period_from: string;
  billing_period_to: string;
  billing_type: BillingType;
  item_name: string;
  item_code: string | null;
  waste_type_id: string | null;
  unit_price: number | null;
  quantity: number | null;
  unit: string | null;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  jwnet_registration_id: string | null;
  jwnet_manifest_no: string | null;
  status: BillingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface BillingSummary {
  id: string;
  org_id: string;
  collector_id: string;
  billing_month: string;
  total_fixed_amount: number;
  total_metered_amount: number;
  total_other_amount: number;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  total_items_count: number;
  fixed_items_count: number;
  metered_items_count: number;
  other_items_count: number;
  status: BillingStatus;
  created_at: string;
  updated_at: string;
}

export default function BillingManagementTab() {
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Mock: 組織ID（実際はログインユーザーから取得）
  const orgId = 'mock-org-id';

  // 請求明細を取得
  const fetchBillingItems = async () => {
    if (!selectedCollectorId) {
      message.warning('収集業者を選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/billing-items?org_id=${orgId}&collector_id=${selectedCollectorId}&billing_month=${selectedMonth.format('YYYY-MM-DD')}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch billing items');
      }

      const data = await response.json();
      setBillingItems(data);
    } catch (error) {
      console.error('Error fetching billing items:', error);
      message.error('請求明細の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 請求サマリーを取得
  const fetchBillingSummary = async () => {
    if (!selectedCollectorId) return;

    try {
      const response = await fetch(
        `/api/billing-summaries?org_id=${orgId}&collector_id=${selectedCollectorId}&billing_month=${selectedMonth.format('YYYY-MM-DD')}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch billing summary');
      }

      const data = await response.json();
      if (data.length > 0) {
        setBillingSummary(data[0]);
      } else {
        setBillingSummary(null);
      }
    } catch (error) {
      console.error('Error fetching billing summary:', error);
    }
  };

  // 初期読み込み
  useEffect(() => {
    if (selectedCollectorId) {
      fetchBillingItems();
      fetchBillingSummary();
    }
  }, [selectedMonth, selectedCollectorId]);

  // Collection から請求データ自動生成
  const handleGenerateFromCollections = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing-items/generate-from-collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          collector_id: selectedCollectorId,
          billing_month: selectedMonth.format('YYYY-MM-DD'),
          billing_period_from: values.period[0].format('YYYY-MM-DD'),
          billing_period_to: values.period[1].format('YYYY-MM-DD'),
          tax_rate: values.tax_rate || 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate billing items');
      }

      const data = await response.json();
      message.success(`${data.generated_count}件の請求明細を生成しました`);
      
      // 再取得
      fetchBillingItems();
      fetchBillingSummary();
      setIsGenerateModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Error generating billing items:', error);
      message.error('請求データの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 請求サマリーを計算
  const handleCalculateSummary = async () => {
    if (!selectedCollectorId) {
      message.warning('収集業者を選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/billing-summaries/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          collector_id: selectedCollectorId,
          billing_month: selectedMonth.format('YYYY-MM-DD'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate billing summary');
      }

      const data = await response.json();
      message.success(data.message);
      
      // 再取得
      fetchBillingSummary();
    } catch (error) {
      console.error('Error calculating billing summary:', error);
      message.error('請求サマリーの計算に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Excel 出力
  const handleExportExcel = async () => {
    if (!selectedCollectorId) {
      message.warning('収集業者を選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/billing-summaries/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          collector_id: selectedCollectorId,
          billing_month: selectedMonth.format('YYYY-MM-DD'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export Excel');
      }

      // Blob として取得
      const blob = await response.blob();
      
      // ダウンロード
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `請求書_${selectedMonth.format('YYYY年MM月')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Excelファイルをダウンロードしました');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      message.error('Excel出力に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // テーブルカラム定義
  const columns: ColumnsType<BillingItem> = [
    {
      title: '請求種別',
      dataIndex: 'billing_type',
      key: 'billing_type',
      width: 120,
      render: (type: BillingType) => {
        const typeMap = {
          FIXED: { text: '固定', color: 'blue' },
          METERED: { text: '従量', color: 'green' },
          OTHER: { text: 'その他', color: 'orange' },
        };
        const config = typeMap[type];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '項目名',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 200,
    },
    {
      title: '単価',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 100,
      align: 'right',
      render: (price: number | null) => (price ? `¥${price.toLocaleString()}` : '-'),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
      render: (quantity: number | null, record) =>
        quantity ? `${quantity} ${record.unit || ''}` : '-',
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount: number) => `¥${amount.toLocaleString()}`,
    },
    {
      title: '税額',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 100,
      align: 'right',
      render: (tax: number) => `¥${tax.toLocaleString()}`,
    },
    {
      title: '合計',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      render: (total: number) => <strong>¥{total.toLocaleString()}</strong>,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: BillingStatus) => {
        const statusMap = {
          DRAFT: { text: '収集業者編集中', color: 'default' },
          SUBMITTED: { text: '提出済み', color: 'processing' },
          APPROVED: { text: '管理会社承認済', color: 'success' },
          REJECTED: { text: '差し戻し', color: 'error' },
          FINALIZED: { text: '排出企業へ請求確定', color: 'cyan' },
          PAID: { text: '支払済', color: 'success' },
          CANCELLED: { text: 'キャンセル', color: 'error' },
        };
        const config = statusMap[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      {/* フィルター */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <div>
            <label style={{ marginRight: 8 }}>請求月:</label>
            <DatePicker
              value={selectedMonth}
              onChange={(date) => date && setSelectedMonth(date)}
              picker="month"
              format="YYYY年MM月"
            />
          </div>
          <div>
            <label style={{ marginRight: 8 }}>収集業者:</label>
            <Select
              style={{ width: 200 }}
              placeholder="収集業者を選択"
              value={selectedCollectorId || undefined}
              onChange={setSelectedCollectorId}
            >
              <Select.Option value="collector-1">収集業者A</Select.Option>
              <Select.Option value="collector-2">収集業者B</Select.Option>
              <Select.Option value="collector-3">収集業者C</Select.Option>
            </Select>
          </div>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchBillingItems();
              fetchBillingSummary();
            }}
            loading={loading}
          >
            更新
          </Button>
        </Space>
      </Card>

      {/* 請求サマリー */}
      {billingSummary && (
        <Card
          title="請求サマリー"
          style={{ marginBottom: 16 }}
          extra={
            <Space>
              <Button icon={<CalculatorOutlined />} onClick={handleCalculateSummary}>
                再計算
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportExcel}
                loading={loading}
              >
                Excel出力
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="固定金額"
                value={billingSummary.total_fixed_amount}
                prefix="¥"
                precision={0}
              />
              <div style={{ fontSize: 12, color: '#999' }}>
                {billingSummary.fixed_items_count}件
              </div>
            </Col>
            <Col span={6}>
              <Statistic
                title="従量請求"
                value={billingSummary.total_metered_amount}
                prefix="¥"
                precision={0}
              />
              <div style={{ fontSize: 12, color: '#999' }}>
                {billingSummary.metered_items_count}件
              </div>
            </Col>
            <Col span={6}>
              <Statistic
                title="その他費用"
                value={billingSummary.total_other_amount}
                prefix="¥"
                precision={0}
              />
              <div style={{ fontSize: 12, color: '#999' }}>
                {billingSummary.other_items_count}件
              </div>
            </Col>
            <Col span={6}>
              <Statistic
                title="合計（税込）"
                value={billingSummary.total_amount}
                prefix="¥"
                precision={0}
                valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
              />
              <div style={{ fontSize: 12, color: '#999' }}>
                税額: ¥{billingSummary.tax_amount.toLocaleString()}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* アクション */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            onClick={() => setIsGenerateModalOpen(true)}
            disabled={!selectedCollectorId}
          >
            回収実績から請求データを生成
          </Button>
        </Space>
      </Card>

      {/* 請求明細一覧 */}
      <Card title={`請求明細一覧 (${billingItems.length}件)`}>
        <Table
          columns={columns}
          dataSource={billingItems}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 請求データ生成モーダル */}
      <Modal
        title="回収実績から請求データを生成"
        open={isGenerateModalOpen}
        onCancel={() => setIsGenerateModalOpen(false)}
        onOk={() => form.submit()}
        okText="生成"
        cancelText="キャンセル"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGenerateFromCollections}
          initialValues={{
            period: [selectedMonth.startOf('month'), selectedMonth.endOf('month')],
            tax_rate: 0.1,
          }}
        >
          <Form.Item
            label="請求期間"
            name="period"
            rules={[{ required: true, message: '請求期間を選択してください' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="消費税率"
            name="tax_rate"
            rules={[{ required: true, message: '消費税率を入力してください' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={1}
              step={0.01}
              formatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
              parser={(value) => (Number(value?.replace('%', '')) / 100) as number & (0 | 1)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


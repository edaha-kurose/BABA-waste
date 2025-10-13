'use client';

/**
 * 廃棄物マスター管理ページ
 * 
 * - JWNET 廃棄物コード一覧
 * - 廃棄物種別マスター管理（収集業者ごと）
 */

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Tabs,
  Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TabPane } = Tabs;

interface JwnetWasteCode {
  id: string;
  waste_code: string;
  waste_name: string;
  waste_category: string;
  waste_type: string;
  unit_code: string;
  unit_name: string;
  is_active: boolean;
  created_at: string;
}

interface WasteTypeMaster {
  id: string;
  org_id: string;
  collector_id: string;
  waste_type_code: string;
  waste_type_name: string;
  waste_category: string;
  waste_classification: string;
  jwnet_waste_code_id: string;
  jwnet_waste_code: string;
  unit_code: string;
  unit_price: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  jwnetWasteCode?: {
    id: string;
    waste_code: string;
    waste_name: string;
    waste_category: string;
    unit_code: string;
    unit_name: string;
  };
}

export default function WasteMastersPage() {
  const [jwnetWasteCodes, setJwnetWasteCodes] = useState<JwnetWasteCode[]>([]);
  const [wasteTypeMasters, setWasteTypeMasters] = useState<WasteTypeMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>('');
  const [form] = Form.useForm();

  // Mock: 組織ID（実際はログインユーザーから取得）
  const orgId = 'mock-org-id';

  // JWNET 廃棄物コードを取得
  const fetchJwnetWasteCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/jwnet-waste-codes');
      if (!response.ok) {
        throw new Error('Failed to fetch JWNET waste codes');
      }
      const data = await response.json();
      setJwnetWasteCodes(data);
    } catch (error) {
      console.error('Error fetching JWNET waste codes:', error);
      message.error('JWNET廃棄物コードの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 廃棄物種別マスターを取得
  const fetchWasteTypeMasters = async () => {
    if (!selectedCollectorId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/waste-type-masters?org_id=${orgId}&collector_id=${selectedCollectorId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch waste type masters');
      }
      const data = await response.json();
      setWasteTypeMasters(data);
    } catch (error) {
      console.error('Error fetching waste type masters:', error);
      message.error('廃棄物種別マスターの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    fetchJwnetWasteCodes();
  }, []);

  useEffect(() => {
    if (selectedCollectorId) {
      fetchWasteTypeMasters();
    }
  }, [selectedCollectorId]);

  // 廃棄物種別マスター新規作成
  const handleCreateWasteTypeMaster = () => {
    if (!selectedCollectorId) {
      message.warning('収集業者を選択してください');
      return;
    }
    setModalMode('create');
    form.resetFields();
    setIsModalOpen(true);
  };

  // フォーム送信
  const handleFormSubmit = async (values: any) => {
    setLoading(true);
    try {
      const selectedJwnetCode = jwnetWasteCodes.find((code) => code.id === values.jwnet_waste_code_id);

      const response = await fetch('/api/waste-type-masters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          collector_id: selectedCollectorId,
          waste_type_code: values.waste_type_code,
          waste_type_name: values.waste_type_name,
          waste_category: values.waste_category,
          waste_classification: values.waste_classification,
          jwnet_waste_code_id: values.jwnet_waste_code_id,
          jwnet_waste_code: selectedJwnetCode?.waste_code || '',
          unit_code: selectedJwnetCode?.unit_code || '',
          unit_price: values.unit_price,
          description: values.description,
          is_active: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create waste type master');
      }

      message.success('廃棄物種別マスターを作成しました');
      setIsModalOpen(false);
      form.resetFields();
      fetchWasteTypeMasters();
    } catch (error) {
      console.error('Error creating waste type master:', error);
      message.error('廃棄物種別マスターの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // JWNET 廃棄物コードのカラム
  const jwnetColumns: ColumnsType<JwnetWasteCode> = [
    {
      title: '廃棄物コード',
      dataIndex: 'waste_code',
      key: 'waste_code',
      width: 120,
    },
    {
      title: '廃棄物名',
      dataIndex: 'waste_name',
      key: 'waste_name',
      width: 200,
    },
    {
      title: '分類',
      dataIndex: 'waste_category',
      key: 'waste_category',
      width: 150,
    },
    {
      title: '種類',
      dataIndex: 'waste_type',
      key: 'waste_type',
      width: 150,
    },
    {
      title: '単位',
      dataIndex: 'unit_name',
      key: 'unit_name',
      width: 80,
      render: (text: string, record) => `${text} (${record.unit_code})`,
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '有効' : '無効'}</Tag>
      ),
    },
  ];

  // 廃棄物種別マスターのカラム
  const wasteTypeMasterColumns: ColumnsType<WasteTypeMaster> = [
    {
      title: '廃棄物コード',
      dataIndex: 'waste_type_code',
      key: 'waste_type_code',
      width: 120,
    },
    {
      title: '廃棄物名',
      dataIndex: 'waste_type_name',
      key: 'waste_type_name',
      width: 200,
    },
    {
      title: 'JWNET廃棄物コード',
      dataIndex: ['jwnetWasteCode', 'waste_code'],
      key: 'jwnet_waste_code',
      width: 150,
    },
    {
      title: 'JWNET廃棄物名',
      dataIndex: ['jwnetWasteCode', 'waste_name'],
      key: 'jwnet_waste_name',
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
      title: '単位',
      dataIndex: 'unit_code',
      key: 'unit_code',
      width: 80,
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '有効' : '無効'}</Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>
        <SearchOutlined /> 廃棄物マスター管理
      </h1>

      <Tabs defaultActiveKey="jwnet">
        {/* JWNET 廃棄物コード */}
        <TabPane tab="JWNET 廃棄物コード" key="jwnet">
          <Card>
            <Table
              columns={jwnetColumns}
              dataSource={jwnetWasteCodes}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </TabPane>

        {/* 廃棄物種別マスター */}
        <TabPane tab="廃棄物種別マスター（収集業者用）" key="waste-type">
          <Card
            extra={
              <Space>
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
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateWasteTypeMaster}
                  disabled={!selectedCollectorId}
                >
                  新規作成
                </Button>
              </Space>
            }
          >
            <Table
              columns={wasteTypeMasterColumns}
              dataSource={wasteTypeMasters}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* 新規作成モーダル */}
      <Modal
        title="廃棄物種別マスター新規作成"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="作成"
        cancelText="キャンセル"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            label="廃棄物コード"
            name="waste_type_code"
            rules={[{ required: true, message: '廃棄物コードを入力してください' }]}
          >
            <Input placeholder="例: W001" />
          </Form.Item>

          <Form.Item
            label="廃棄物名"
            name="waste_type_name"
            rules={[{ required: true, message: '廃棄物名を入力してください' }]}
          >
            <Input placeholder="例: 一般廃棄物（可燃）" />
          </Form.Item>

          <Form.Item
            label="JWNET廃棄物コード"
            name="jwnet_waste_code_id"
            rules={[{ required: true, message: 'JWNET廃棄物コードを選択してください' }]}
          >
            <Select
              placeholder="JWNET廃棄物コードを選択"
              showSearch
              optionFilterProp="children"
            >
              {jwnetWasteCodes.map((code) => (
                <Select.Option key={code.id} value={code.id}>
                  {code.waste_code} - {code.waste_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="廃棄物分類"
            name="waste_category"
            rules={[{ required: true, message: '廃棄物分類を入力してください' }]}
          >
            <Input placeholder="例: 一般廃棄物" />
          </Form.Item>

          <Form.Item
            label="廃棄物区分"
            name="waste_classification"
            rules={[{ required: true, message: '廃棄物区分を入力してください' }]}
          >
            <Input placeholder="例: 可燃ごみ" />
          </Form.Item>

          <Form.Item label="単価（円）" name="unit_price">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="例: 5000"
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item label="説明" name="description">
            <Input.TextArea rows={3} placeholder="廃棄物の説明（任意）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


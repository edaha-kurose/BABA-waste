'use client';

/**
 * JWNET 事業者組み合わせマスター管理ページ
 * 
 * - 排出事業者・収集業者・処分業者の組み合わせ管理
 * - JWNET WebEDI 準拠
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
  DatePicker,
  message,
  Tag,
  Descriptions,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface JwnetPartyCombination {
  id: string;
  org_id: string;
  emitter_org_id: string;
  emitter_subscriber_no: string;
  emitter_public_confirm_no: string;
  emitter_name: string;
  emitter_address: string;
  emitter_postal_code: string;
  transporter_org_id: string;
  transporter_subscriber_no: string;
  transporter_public_confirm_no: string;
  transporter_name: string;
  transporter_address: string;
  transporter_postal_code: string;
  transporter_phone: string | null;
  disposer_org_id: string;
  disposer_subscriber_no: string;
  disposer_public_confirm_no: string;
  disposer_name: string;
  disposer_address: string;
  disposer_postal_code: string;
  disposer_phone: string | null;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
  emitter?: Organization;
  transporter?: Organization;
  disposer?: Organization;
}

export default function JwnetPartyCombinationsPage() {
  const [combinations, setCombinations] = useState<JwnetPartyCombination[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<JwnetPartyCombination | null>(null);
  const [form] = Form.useForm();

  // Mock: 組織ID（実際はログインユーザーから取得）
  const orgId = 'mock-org-id';

  // 組み合わせ一覧を取得
  const fetchCombinations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jwnet-party-combinations?org_id=${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch combinations');
      }
      const data = await response.json();
      setCombinations(data);
    } catch (error) {
      console.error('Error fetching combinations:', error);
      message.error('事業者組み合わせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初期読み込み
  useEffect(() => {
    fetchCombinations();
  }, []);

  // 新規作成
  const handleCreate = () => {
    form.resetFields();
    setIsModalOpen(true);
  };

  // フォーム送信
  const handleFormSubmit = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/jwnet-party-combinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          emitter_org_id: values.emitter_org_id,
          emitter_subscriber_no: values.emitter_subscriber_no,
          emitter_public_confirm_no: values.emitter_public_confirm_no,
          emitter_name: values.emitter_name,
          emitter_address: values.emitter_address,
          emitter_postal_code: values.emitter_postal_code,
          transporter_org_id: values.transporter_org_id,
          transporter_subscriber_no: values.transporter_subscriber_no,
          transporter_public_confirm_no: values.transporter_public_confirm_no,
          transporter_name: values.transporter_name,
          transporter_address: values.transporter_address,
          transporter_postal_code: values.transporter_postal_code,
          transporter_phone: values.transporter_phone,
          disposer_org_id: values.disposer_org_id,
          disposer_subscriber_no: values.disposer_subscriber_no,
          disposer_public_confirm_no: values.disposer_public_confirm_no,
          disposer_name: values.disposer_name,
          disposer_address: values.disposer_address,
          disposer_postal_code: values.disposer_postal_code,
          disposer_phone: values.disposer_phone,
          is_active: true,
          valid_from: values.valid_from.format('YYYY-MM-DD'),
          valid_to: values.valid_to ? values.valid_to.format('YYYY-MM-DD') : null,
          notes: values.notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create combination');
      }

      message.success('事業者組み合わせを作成しました');
      setIsModalOpen(false);
      form.resetFields();
      fetchCombinations();
    } catch (error) {
      console.error('Error creating combination:', error);
      message.error('事業者組み合わせの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 詳細表示
  const handleViewDetail = (combination: JwnetPartyCombination) => {
    setSelectedCombination(combination);
    setIsDetailModalOpen(true);
  };

  // テーブルカラム
  const columns: ColumnsType<JwnetPartyCombination> = [
    {
      title: '排出事業者',
      dataIndex: 'emitter_name',
      key: 'emitter_name',
      width: 200,
      render: (text: string, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            加入者番号: {record.emitter_subscriber_no}
          </div>
        </div>
      ),
    },
    {
      title: '収集業者',
      dataIndex: 'transporter_name',
      key: 'transporter_name',
      width: 200,
      render: (text: string, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            加入者番号: {record.transporter_subscriber_no}
          </div>
        </div>
      ),
    },
    {
      title: '処分業者',
      dataIndex: 'disposer_name',
      key: 'disposer_name',
      width: 200,
      render: (text: string, record) => (
        <div>
          <div>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            加入者番号: {record.disposer_subscriber_no}
          </div>
        </div>
      ),
    },
    {
      title: '有効期間',
      key: 'valid_period',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{dayjs(record.valid_from).format('YYYY/MM/DD')} 〜</div>
          <div>{record.valid_to ? dayjs(record.valid_to).format('YYYY/MM/DD') : '無期限'}</div>
        </div>
      ),
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
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
          >
            詳細
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>
        <TeamOutlined /> JWNET 事業者組み合わせマスター
      </h1>

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新規作成
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={combinations}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新規作成モーダル */}
      <Modal
        title="事業者組み合わせ新規作成"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="作成"
        cancelText="キャンセル"
        width={900}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          {/* 排出事業者情報 */}
          <h3 style={{ marginTop: 16, marginBottom: 16, borderBottom: '1px solid #e8e8e8' }}>
            排出事業者情報
          </h3>
          <Form.Item
            label="排出事業者組織"
            name="emitter_org_id"
            rules={[{ required: true, message: '排出事業者組織を選択してください' }]}
          >
            <Select placeholder="排出事業者組織を選択">
              <Select.Option value="org-1">組織A</Select.Option>
              <Select.Option value="org-2">組織B</Select.Option>
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="加入者番号（7桁）"
              name="emitter_subscriber_no"
              rules={[
                { required: true, message: '加入者番号を入力してください' },
                { len: 7, message: '7桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 1234567" maxLength={7} />
            </Form.Item>
            <Form.Item
              label="公開確認番号（6桁）"
              name="emitter_public_confirm_no"
              rules={[
                { required: true, message: '公開確認番号を入力してください' },
                { len: 6, message: '6桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 123456" maxLength={6} />
            </Form.Item>
          </Space>
          <Form.Item
            label="事業者名"
            name="emitter_name"
            rules={[{ required: true, message: '事業者名を入力してください' }]}
          >
            <Input placeholder="例: 株式会社○○" />
          </Form.Item>
          <Form.Item
            label="郵便番号"
            name="emitter_postal_code"
            rules={[{ required: true, message: '郵便番号を入力してください' }]}
          >
            <Input placeholder="例: 123-4567" />
          </Form.Item>
          <Form.Item
            label="住所"
            name="emitter_address"
            rules={[{ required: true, message: '住所を入力してください' }]}
          >
            <Input.TextArea rows={2} placeholder="例: 東京都..." />
          </Form.Item>

          {/* 収集業者情報 */}
          <h3 style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #e8e8e8' }}>
            収集業者情報
          </h3>
          <Form.Item
            label="収集業者組織"
            name="transporter_org_id"
            rules={[{ required: true, message: '収集業者組織を選択してください' }]}
          >
            <Select placeholder="収集業者組織を選択">
              <Select.Option value="org-1">収集業者A</Select.Option>
              <Select.Option value="org-2">収集業者B</Select.Option>
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="加入者番号（7桁）"
              name="transporter_subscriber_no"
              rules={[
                { required: true, message: '加入者番号を入力してください' },
                { len: 7, message: '7桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 7654321" maxLength={7} />
            </Form.Item>
            <Form.Item
              label="公開確認番号（6桁）"
              name="transporter_public_confirm_no"
              rules={[
                { required: true, message: '公開確認番号を入力してください' },
                { len: 6, message: '6桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 654321" maxLength={6} />
            </Form.Item>
          </Space>
          <Form.Item
            label="事業者名"
            name="transporter_name"
            rules={[{ required: true, message: '事業者名を入力してください' }]}
          >
            <Input placeholder="例: 株式会社△△" />
          </Form.Item>
          <Form.Item
            label="郵便番号"
            name="transporter_postal_code"
            rules={[{ required: true, message: '郵便番号を入力してください' }]}
          >
            <Input placeholder="例: 123-4567" />
          </Form.Item>
          <Form.Item
            label="住所"
            name="transporter_address"
            rules={[{ required: true, message: '住所を入力してください' }]}
          >
            <Input.TextArea rows={2} placeholder="例: 東京都..." />
          </Form.Item>
          <Form.Item label="電話番号" name="transporter_phone">
            <Input placeholder="例: 03-1234-5678" />
          </Form.Item>

          {/* 処分業者情報 */}
          <h3 style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #e8e8e8' }}>
            処分業者情報
          </h3>
          <Form.Item
            label="処分業者組織"
            name="disposer_org_id"
            rules={[{ required: true, message: '処分業者組織を選択してください' }]}
          >
            <Select placeholder="処分業者組織を選択">
              <Select.Option value="org-3">処分業者A</Select.Option>
              <Select.Option value="org-4">処分業者B</Select.Option>
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="加入者番号（7桁）"
              name="disposer_subscriber_no"
              rules={[
                { required: true, message: '加入者番号を入力してください' },
                { len: 7, message: '7桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 9876543" maxLength={7} />
            </Form.Item>
            <Form.Item
              label="公開確認番号（6桁）"
              name="disposer_public_confirm_no"
              rules={[
                { required: true, message: '公開確認番号を入力してください' },
                { len: 6, message: '6桁で入力してください' },
              ]}
            >
              <Input placeholder="例: 987654" maxLength={6} />
            </Form.Item>
          </Space>
          <Form.Item
            label="事業者名"
            name="disposer_name"
            rules={[{ required: true, message: '事業者名を入力してください' }]}
          >
            <Input placeholder="例: 株式会社□□" />
          </Form.Item>
          <Form.Item
            label="郵便番号"
            name="disposer_postal_code"
            rules={[{ required: true, message: '郵便番号を入力してください' }]}
          >
            <Input placeholder="例: 123-4567" />
          </Form.Item>
          <Form.Item
            label="住所"
            name="disposer_address"
            rules={[{ required: true, message: '住所を入力してください' }]}
          >
            <Input.TextArea rows={2} placeholder="例: 東京都..." />
          </Form.Item>
          <Form.Item label="電話番号" name="disposer_phone">
            <Input placeholder="例: 03-1234-5678" />
          </Form.Item>

          {/* 有効期間 */}
          <h3 style={{ marginTop: 24, marginBottom: 16, borderBottom: '1px solid #e8e8e8' }}>
            有効期間
          </h3>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item
              label="有効期間開始"
              name="valid_from"
              rules={[{ required: true, message: '有効期間開始日を選択してください' }]}
            >
              <DatePicker />
            </Form.Item>
            <Form.Item label="有効期間終了" name="valid_to">
              <DatePicker />
            </Form.Item>
          </Space>

          <Form.Item label="備考" name="notes">
            <Input.TextArea rows={3} placeholder="備考（任意）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 詳細表示モーダル */}
      <Modal
        title="事業者組み合わせ詳細"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            閉じる
          </Button>,
        ]}
        width={800}
      >
        {selectedCombination && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="排出事業者">
              {selectedCombination.emitter_name}
            </Descriptions.Item>
            <Descriptions.Item label="排出事業者加入者番号">
              {selectedCombination.emitter_subscriber_no}
            </Descriptions.Item>
            <Descriptions.Item label="排出事業者公開確認番号">
              {selectedCombination.emitter_public_confirm_no}
            </Descriptions.Item>
            <Descriptions.Item label="排出事業者住所">
              〒{selectedCombination.emitter_postal_code} {selectedCombination.emitter_address}
            </Descriptions.Item>

            <Descriptions.Item label="収集業者">
              {selectedCombination.transporter_name}
            </Descriptions.Item>
            <Descriptions.Item label="収集業者加入者番号">
              {selectedCombination.transporter_subscriber_no}
            </Descriptions.Item>
            <Descriptions.Item label="収集業者公開確認番号">
              {selectedCombination.transporter_public_confirm_no}
            </Descriptions.Item>
            <Descriptions.Item label="収集業者住所">
              〒{selectedCombination.transporter_postal_code}{' '}
              {selectedCombination.transporter_address}
            </Descriptions.Item>

            <Descriptions.Item label="処分業者">
              {selectedCombination.disposer_name}
            </Descriptions.Item>
            <Descriptions.Item label="処分業者加入者番号">
              {selectedCombination.disposer_subscriber_no}
            </Descriptions.Item>
            <Descriptions.Item label="処分業者公開確認番号">
              {selectedCombination.disposer_public_confirm_no}
            </Descriptions.Item>
            <Descriptions.Item label="処分業者住所">
              〒{selectedCombination.disposer_postal_code} {selectedCombination.disposer_address}
            </Descriptions.Item>

            <Descriptions.Item label="有効期間">
              {dayjs(selectedCombination.valid_from).format('YYYY/MM/DD')} 〜{' '}
              {selectedCombination.valid_to
                ? dayjs(selectedCombination.valid_to).format('YYYY/MM/DD')
                : '無期限'}
            </Descriptions.Item>

            <Descriptions.Item label="ステータス">
              <Tag color={selectedCombination.is_active ? 'green' : 'default'}>
                {selectedCombination.is_active ? '有効' : '無効'}
              </Tag>
            </Descriptions.Item>

            {selectedCombination.notes && (
              <Descriptions.Item label="備考">{selectedCombination.notes}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}


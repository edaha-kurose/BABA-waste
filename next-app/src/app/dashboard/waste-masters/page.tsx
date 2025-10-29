'use client';

/**
 * 廃棄物マスター管理ページ（修正版）
 * 
 * ✅ billing_category（Excel出力列分類）フィールド追加
 * ✅ billing_type_default（デフォルト請求種別）フィールド追加
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
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUser } from '@/lib/auth/session';

const { TabPane } = Tabs;

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
  billing_category: string | null;        // ✨ 新規
  billing_type_default: string | null;    // ✨ 新規
  description: string | null;
  is_active: boolean;
  created_at: string;
}

// 請求書出力列分類のオプション (ABC列は不使用、D列から)
const BILLING_CATEGORY_OPTIONS = [
  { value: 'F', label: 'F列: システム管理手数料', color: 'gold' },
  { value: 'G', label: 'G列: 一般廃棄物請求金額', color: 'green' },
  { value: 'H', label: 'H列: 産業廃棄物請求金額', color: 'orange' },
  { value: 'I', label: 'I列: 瓶・缶請求金額', color: 'blue' },
  { value: 'J', label: 'J列: 臨時回収請求金額', color: 'purple' },
  { value: 'M', label: 'M列: 段ボール（有価買取分）', color: 'cyan' },
  { value: 'OTHER', label: 'その他（F列に含める）', color: 'default' },
];

// 請求種別のオプション
const BILLING_TYPE_OPTIONS = [
  { value: 'FIXED', label: '固定（月額固定）' },
  { value: 'METERED', label: '従量（実績ベース）' },
  { value: 'OTHER', label: 'その他' },
];

export default function WasteMastersPage() {
  const { user, userOrg } = useUser();
  const [wasteTypeMasters, setWasteTypeMasters] = useState<WasteTypeMaster[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [jwnetWasteCodes, setJwnetWasteCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRecord, setEditingRecord] = useState<WasteTypeMaster | null>(null);
  const [selectedCollectorId, setSelectedCollectorId] = useState<string>('');
  const [form] = Form.useForm();

  const orgId = userOrg?.id;

  // 業者リストを取得
  useEffect(() => {
    const fetchCollectors = async () => {
      if (!orgId) return;
      try {
        const response = await fetch('/api/collectors');
        if (!response.ok) throw new Error('Failed to fetch collectors');
        const data = await response.json();
        setCollectors(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedCollectorId(data.data[0].id);
        }
      } catch (error) {
        console.error('Error fetching collectors:', error);
        message.error('業者リストの取得に失敗しました');
      }
    };
    fetchCollectors();
  }, [orgId]);

  // JWNETコードマスターを取得
  useEffect(() => {
    const fetchJwnetWasteCodes = async () => {
      try {
        const response = await fetch('/api/jwnet-waste-codes');
        if (!response.ok) throw new Error('Failed to fetch JWNET waste codes');
        const data = await response.json();
        setJwnetWasteCodes(data || []);
      } catch (error) {
        console.error('Error fetching JWNET waste codes:', error);
        message.error('JWNETコードマスターの取得に失敗しました');
      }
    };
    fetchJwnetWasteCodes();
  }, []);

  // 廃棄物種別マスターを取得
  const fetchWasteTypeMasters = async () => {
    if (!selectedCollectorId || !orgId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/waste-type-masters?collector_id=${selectedCollectorId}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch waste type masters');
      }
      const result = await response.json();
      setWasteTypeMasters(result.data || []);
    } catch (error) {
      console.error('Error fetching waste type masters:', error);
      message.error('廃棄物種別マスターの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteTypeMasters();
  }, [selectedCollectorId]);

  // モーダルを開く
  const openModal = (mode: 'create' | 'edit', record?: WasteTypeMaster) => {
    setModalMode(mode);
    setIsModalOpen(true);

    if (mode === 'edit' && record) {
      setEditingRecord(record);
      form.setFieldsValue({
        waste_type_code: record.waste_type_code,
        waste_type_name: record.waste_type_name,
        jwnet_waste_code_id: record.jwnet_waste_code_id,     // ✨ ID追加
        jwnet_waste_code: record.jwnet_waste_code,
        waste_category: record.waste_category,
        waste_classification: record.waste_classification,
        unit_code: record.unit_code,
        unit_price: record.unit_price,
        billing_category: record.billing_category,
        billing_type_default: record.billing_type_default,
        description: record.description,
        is_active: record.is_active,
      });
    } else {
      form.resetFields();
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingRecord(null);
  };

  // JWNETコード選択時の処理
  const handleJwnetCodeChange = (jwnetWasteCodeId: string) => {
    const selectedCode = jwnetWasteCodes.find((code) => code.id === jwnetWasteCodeId);
    if (selectedCode) {
      // 関連情報を自動セット
      form.setFieldsValue({
        jwnet_waste_code_id: selectedCode.id,
        jwnet_waste_code: selectedCode.waste_code,
        waste_category: selectedCode.waste_category,
        waste_classification: selectedCode.waste_type,
        unit_code: selectedCode.unit_code,
      });
    }
  };

  // 作成・更新
  const handleSubmit = async (values: any) => {
    try {
      const url =
        modalMode === 'create'
          ? '/api/waste-type-masters'
          : `/api/waste-type-masters/${editingRecord?.id}`;

      const method = modalMode === 'create' ? 'POST' : 'PATCH';

      const payload = {
        ...values,
        org_id: orgId,
        collector_id: selectedCollectorId,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${modalMode} waste type master`);
      }

      message.success(
        modalMode === 'create'
          ? '廃棄物種別マスターを作成しました'
          : '廃棄物種別マスターを更新しました'
      );
      closeModal();
      fetchWasteTypeMasters();
    } catch (error) {
      console.error(`Error ${modalMode} waste type master:`, error);
      message.error(
        modalMode === 'create'
          ? '廃棄物種別マスターの作成に失敗しました'
          : '廃棄物種別マスターの更新に失敗しました'
      );
    }
  };

  // 削除
  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '削除確認',
      content: 'この廃棄物種別マスターを削除してもよろしいですか？',
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/waste-type-masters/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete waste type master');
          }

          message.success('廃棄物種別マスターを削除しました');
          fetchWasteTypeMasters();
        } catch (error) {
          console.error('Error deleting waste type master:', error);
          message.error('廃棄物種別マスターの削除に失敗しました');
        }
      },
    });
  };

  // テーブル列定義
  const columns: ColumnsType<WasteTypeMaster> = [
    {
      title: '社内コード',
      dataIndex: 'waste_type_code',
      key: 'waste_type_code',
      width: 120,
    },
    {
      title: '廃棄物名称',
      dataIndex: 'waste_type_name',
      key: 'waste_type_name',
      width: 200,
    },
    {
      title: '✨ 請求書分類',
      dataIndex: 'billing_category',
      key: 'billing_category',
      width: 150,
      render: (value: string | null) => {
        const option = BILLING_CATEGORY_OPTIONS.find((opt) => opt.value === value);
        if (!option) return <Tag>未設定</Tag>;
        return <Tag color={option.color}>{option.value}列</Tag>;
      },
    },
    {
      title: '✨ デフォルト請求種別',
      dataIndex: 'billing_type_default',
      key: 'billing_type_default',
      width: 150,
      render: (value: string | null) => {
        if (!value) return <Tag>未設定</Tag>;
        const color =
          value === 'FIXED' ? 'green' : value === 'METERED' ? 'blue' : 'default';
        const label = value === 'FIXED' ? '固定' : value === 'METERED' ? '従量' : 'その他';
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'カテゴリー',
      dataIndex: 'waste_category',
      key: 'waste_category',
      width: 120,
    },
    {
      title: 'JWNETコード',
      dataIndex: 'jwnet_waste_code',
      key: 'jwnet_waste_code',
      width: 120,
    },
    {
      title: '単価',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (value: number | null) => (value ? `¥${value.toLocaleString()}` : '-'),
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'red'}>{value ? '有効' : '無効'}</Tag>
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
            icon={<EditOutlined />}
            onClick={() => openModal('edit', record)}
          >
            編集
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            削除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>廃棄物マスター管理</h1>

      {/* ✨ 説明 */}
      <Alert
        message="📋 廃棄物種別マスター：業者ごとの取り扱い廃棄物を管理"
        description={
          <div>
            <p><strong>このマスターの用途:</strong></p>
            <ul style={{ marginLeft: 20, marginBottom: 8 }}>
              <li>🔍 <strong>JWNETコード選択</strong>: JWNET登録済みの廃棄物コードから選択（カテゴリー・単位が自動入力）</li>
              <li>📊 <strong>請求書出力列の設定</strong>: Excel出力時の表示列（D列〜AH列）を指定</li>
              <li>💰 <strong>請求種別の設定</strong>: デフォルト請求方法（固定/従量/その他）を設定</li>
              <li>💵 <strong>単価設定</strong>: 業者ごとの取り扱い単価を登録</li>
            </ul>
            <p style={{ marginTop: 8 }}>※ 先に「<a href="/dashboard/jwnet-waste-codes" target="_blank">JWNET廃棄物コードマスター</a>」でコードを登録してください</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 収集業者選択 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <label>収集業者:</label>
          <Select
            style={{ width: 300 }}
            value={selectedCollectorId}
            onChange={setSelectedCollectorId}
            placeholder="業者を選択してください"
          >
            {collectors.map((collector) => (
              <Select.Option key={collector.id} value={collector.id}>
                {collector.company_name}
              </Select.Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal('create')}
          >
            新規作成
          </Button>
        </Space>
      </Card>

      {/* テーブル */}
      <Card>
        <Table
          columns={columns}
          dataSource={wasteTypeMasters}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1500 }}
        />
      </Card>

      {/* モーダル */}
      <Modal
        title={modalMode === 'create' ? '廃棄物種別マスター新規作成' : '廃棄物種別マスター編集'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        width={800}
        okText={modalMode === 'create' ? '作成' : '更新'}
        cancelText="キャンセル"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="waste_type_code"
            label="社内廃棄物コード"
            rules={[{ required: true, message: '社内廃棄物コードを入力してください' }]}
          >
            <Input placeholder="例: W001" />
          </Form.Item>

          <Form.Item
            name="waste_type_name"
            label="廃棄物名称"
            rules={[{ required: true, message: '廃棄物名称を入力してください' }]}
          >
            <Input placeholder="例: 一般廃棄物（可燃ゴミ）" />
          </Form.Item>

          {/* ✨ 新規: 請求書分類 */}
          <Form.Item
            name="billing_category"
            label="✨ 請求書出力列分類"
            rules={[{ required: true, message: '請求書出力列分類を選択してください' }]}
            tooltip="Excel出力時にどの列に表示するかを設定します"
          >
            <Select placeholder="分類を選択">
              {BILLING_CATEGORY_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  <Tag color={option.color}>{option.label}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* ✨ 新規: デフォルト請求種別 */}
          <Form.Item
            name="billing_type_default"
            label="✨ デフォルト請求種別"
            rules={[{ required: true, message: 'デフォルト請求種別を選択してください' }]}
            tooltip="この廃棄物の通常の請求方法を設定します（固定/従量/その他）"
          >
            <Select placeholder="請求種別を選択">
              {BILLING_TYPE_OPTIONS.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* ✨ JWNETコードをマスターから選択 */}
          <Form.Item
            name="jwnet_waste_code_id"
            label="🔍 JWNETコード（マスターから選択）"
            rules={[{ required: true, message: 'JWNETコードを選択してください' }]}
            tooltip="JWNETに登録されている廃棄物コードを選択します。選択すると関連情報が自動入力されます"
          >
            <Select
              placeholder="JWNETコードを検索・選択"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleJwnetCodeChange}
              options={jwnetWasteCodes.map((code) => ({
                value: code.id,
                label: `${code.waste_code} - ${code.waste_name} (${code.waste_category})`,
              }))}
            />
          </Form.Item>

          {/* 以下は自動入力（読み取り専用） */}
          <Form.Item name="jwnet_waste_code" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name="waste_category"
            label="カテゴリー（自動入力）"
          >
            <Input disabled placeholder="JWNETコード選択後に自動入力" />
          </Form.Item>

          <Form.Item
            name="waste_classification"
            label="分類（自動入力）"
          >
            <Input disabled placeholder="JWNETコード選択後に自動入力" />
          </Form.Item>

          <Form.Item
            name="unit_code"
            label="単位コード（自動入力）"
          >
            <Input disabled placeholder="JWNETコード選択後に自動入力" />
          </Form.Item>

          <Form.Item name="unit_price" label="単価（円）">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              placeholder="例: 500"
              formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            />
          </Form.Item>

          <Form.Item name="description" label="説明">
            <Input.TextArea rows={3} placeholder="備考・説明を入力" />
          </Form.Item>

          <Form.Item name="is_active" label="ステータス" initialValue={true}>
            <Select>
              <Select.Option value={true}>有効</Select.Option>
              <Select.Option value={false}>無効</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Typography,
  Tag,
  Alert,
  Modal,
  Descriptions,
  message,
  App,
} from 'antd'
import {
  DatabaseOutlined,
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Search } = Input

interface JwnetWasteCode {
  code: string
  name: string
  category: string
  hazard: boolean
  description?: string
}

export default function JwnetWasteCodesPage() {
  const { modal } = App.useApp();
  const [wasteCodes, setWasteCodes] = useState<JwnetWasteCode[]>([])
  const [filteredCodes, setFilteredCodes] = useState<JwnetWasteCode[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedCode, setSelectedCode] = useState<JwnetWasteCode | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)

  // JWNET公式コード一括取り込み
  const handleImportOfficial = () => {
    modal.confirm({
      title: '🔄 JWNET公式コードを一括取り込みますか？',
      content: '約70件のJWNET公式コードをマスターに登録します。既存のコードは更新されます。',
      okText: '取り込む',
      cancelText: 'キャンセル',
      onOk: async () => {
        setImporting(true);
        try {
          const response = await fetch('/api/jwnet-waste-codes/import-official', {
            method: 'POST',
          });
          if (response.ok) {
            const data = await response.json();
            message.success(`JWNET公式コードを取り込みました（${data.count}件）`);
            fetchWasteCodes(); // 再読み込み
          } else {
            const error = await response.json();
            message.error(`取り込みに失敗しました: ${error.message || '不明なエラー'}`);
          }
        } catch (error) {
          message.error('取り込み中にエラーが発生しました');
          console.error('Import error:', error);
        } finally {
          setImporting(false);
        }
      },
    });
  };

  // データ取得
  const fetchWasteCodes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/jwnet-waste-codes');
      if (response.ok) {
        const data = await response.json();
        // APIレスポンスをマッピング
        const mappedData = data.map((code: any) => ({
          code: code.waste_code,
          name: code.waste_name,
          category: code.waste_category,
          hazard: false, // APIから取得する場合は適切にマッピング
          description: `${code.waste_category} - ${code.waste_type}`,
        }));
        setWasteCodes(mappedData);
        setFilteredCodes(mappedData);
      } else {
        // フォールバック: モックデータ
        const mockData: JwnetWasteCode[] = [
        {
          code: 'W0101',
          name: '燃え殻',
          category: '産業廃棄物',
          hazard: false,
          description: '物の燃焼により生じた燃え殻',
        },
        {
          code: 'W0102',
          name: '汚泥',
          category: '産業廃棄物',
          hazard: false,
          description: '有機性または無機性の汚泥',
        },
        {
          code: 'W0201',
          name: '廃油',
          category: '産業廃棄物',
          hazard: true,
          description: '鉱物性油、動植物性油脂に係る廃油',
        },
        {
          code: 'W0202',
          name: '廃酸',
          category: '産業廃棄物',
          hazard: true,
          description: '酸性の廃液',
        },
        {
          code: 'W0203',
          name: '廃アルカリ',
          category: '産業廃棄物',
          hazard: true,
          description: 'アルカリ性の廃液',
        },
        {
          code: 'W0301',
          name: '廃プラスチック類',
          category: '産業廃棄物',
          hazard: false,
          description: '固形状及び液状のすべての合成高分子系化合物',
        },
        {
          code: 'W0401',
          name: '紙くず',
          category: '産業廃棄物',
          hazard: false,
          description: '建設業、製紙業等から排出される紙くず',
        },
        {
          code: 'W0402',
          name: '木くず',
          category: '産業廃棄物',
          hazard: false,
          description: '建設業、製材業等から排出される木くず',
        },
        {
          code: 'W0501',
          name: '繊維くず',
          category: '産業廃棄物',
          hazard: false,
          description: '建設業、繊維工業等から排出される繊維くず',
        },
        {
          code: 'W0601',
          name: '動植物性残さ',
          category: '産業廃棄物',
          hazard: false,
          description: '食料品製造業等から排出される動植物性残さ',
        },
        {
          code: 'W0701',
          name: '動物系固形不要物',
          category: '産業廃棄物',
          hazard: false,
          description: 'と畜場等から排出される動物の不要物',
        },
        {
          code: 'W0801',
          name: 'ゴムくず',
          category: '産業廃棄物',
          hazard: false,
          description: '天然ゴムくず',
        },
        {
          code: 'W0901',
          name: '金属くず',
          category: '産業廃棄物',
          hazard: false,
          description: '鉄くず、非鉄金属くず',
        },
        {
          code: 'W1001',
          name: 'ガラスくず、コンクリートくず及び陶磁器くず',
          category: '産業廃棄物',
          hazard: false,
          description: 'ガラス、コンクリート、陶磁器くず',
        },
        {
          code: 'W1101',
          name: '鉱さい',
          category: '産業廃棄物',
          hazard: false,
          description: '高炉、転炉、電気炉等から生じる鉱さい',
        },
        {
          code: 'W1201',
          name: 'がれき類',
          category: '産業廃棄物',
          hazard: false,
          description: '工作物の新築、改築又は除去により生じたコンクリート破片等',
        },
        {
          code: 'W1301',
          name: 'ばいじん',
          category: '産業廃棄物',
          hazard: false,
          description: '大気汚染防止法に規定するばいじん発生施設等から発生するばいじん',
        },
        {
          code: 'W9901',
          name: '混合廃棄物',
          category: '産業廃棄物',
          hazard: false,
          description: '複数の産業廃棄物が混在したもの',
        },
        ];
        setWasteCodes(mockData);
        setFilteredCodes(mockData);
      }
    } catch (err) {
      console.error('Failed to fetch waste codes:', err);
      // エラー時もモックデータを表示
      const mockData: JwnetWasteCode[] = [
        { code: 'W0101', name: '燃え殻', category: '産業廃棄物', hazard: false },
        { code: 'W0102', name: '汚泥', category: '産業廃棄物', hazard: false },
      ];
      setWasteCodes(mockData);
      setFilteredCodes(mockData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWasteCodes()
  }, [])

  // 検索
  const handleSearch = (value: string) => {
    if (!value) {
      setFilteredCodes(wasteCodes)
      return
    }

    const filtered = wasteCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(value.toLowerCase()) ||
        code.name.toLowerCase().includes(value.toLowerCase()) ||
        code.category.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredCodes(filtered)
  }

  // 詳細表示
  const showDetail = (code: JwnetWasteCode) => {
    setSelectedCode(code)
    setDetailModalVisible(true)
  }

  // テーブル列定義
  const columns = [
    {
      title: 'コード',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: 'カテゴリ',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '有害性',
      dataIndex: 'hazard',
      key: 'hazard',
      width: 100,
      render: (hazard: boolean) => (
        <Tag color={hazard ? 'red' : 'green'}>{hazard ? '有害' : '一般'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: JwnetWasteCode) => (
        <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} size="small">
          詳細
        </Button>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <DatabaseOutlined /> JWNETコードマスタ
          </Title>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleImportOfficial}
              loading={importing}
            >
              🔄 JWNET公式コードを一括取り込み
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchWasteCodes} loading={loading}>
              更新
            </Button>
          </Space>
        }
      >
        <Alert
          message="📋 JWNETコードマスタについて"
          description={
            <div>
              <p>JWNET（電子マニフェストシステム）の公式廃棄物コード一覧です。</p>
              <p><strong>使い方:</strong></p>
              <ul style={{ marginLeft: 20 }}>
                <li>🔄 <strong>一括取り込み</strong>: JWNET公式の約70件のコードを一括登録</li>
                <li>🔍 <strong>検索</strong>: コードまたは名称で検索</li>
                <li>📊 <strong>連携</strong>: 廃棄物種別マスターで使用</li>
              </ul>
              <p style={{ marginTop: 8 }}>※ 参照: <a href="https://www.jwnet.or.jp/jwnet/manual/assets/files/jwnet_code_ver3_1.pdf" target="_blank" rel="noopener noreferrer">JWNET コード表 v3.1 (PDF)</a></p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Search
          placeholder="コード、名称、カテゴリで検索"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          onSearch={handleSearch}
          onChange={(e) => !e.target.value && handleSearch('')}
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={filteredCodes}
          rowKey="code"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
        />
      </Card>

      {/* 詳細モーダル */}
      <Modal
        title="JWNETコード詳細"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedCode(null)
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setSelectedCode(null)
            }}
          >
            閉じる
          </Button>,
        ]}
        width={700}
      >
        {selectedCode && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="コード">
              <Text strong>{selectedCode.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="名称">{selectedCode.name}</Descriptions.Item>
            <Descriptions.Item label="カテゴリ">
              <Tag color="blue">{selectedCode.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="有害性">
              <Tag color={selectedCode.hazard ? 'red' : 'green'}>
                {selectedCode.hazard ? '有害' : '一般'}
              </Tag>
            </Descriptions.Item>
            {selectedCode.description && (
              <Descriptions.Item label="説明">{selectedCode.description}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}





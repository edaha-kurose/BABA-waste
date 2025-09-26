import React, { useState, useEffect } from 'react'
import { 
  Card, Table, Button, Space, Typography, Input, Select, 
  Tag, Alert, Row, Col, Divider, Tooltip, message
} from 'antd'
import { InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

interface ExcelColumnMappingProps {
  excelData: any[][]
  onMappingComplete: (mapping: ColumnMapping) => void
  onCancel: () => void
}

export interface ColumnMapping {
  storeCodeColumn: string
  storeNameColumn: string
  areaColumn: string
  mainItemColumns: string[]
  otherItemColumn: string
  dataStartRow: number
}

const ExcelColumnMapping: React.FC<ExcelColumnMappingProps> = ({
  excelData,
  onMappingComplete,
  onCancel
}) => {
  const MAX_PREVIEW_ROWS = 20
  const MAX_PREVIEW_COLS = 20
  const [mapping, setMapping] = useState<ColumnMapping>({
    storeCodeColumn: '',
    storeNameColumn: '',
    areaColumn: '',
    mainItemColumns: [],
    otherItemColumn: '',
    dataStartRow: 3
  })

  const [previewData, setPreviewData] = useState<any[]>([])

  // 利用可能な列を取得
  const headerRow = excelData[0] || []
  const colCount = MAX_PREVIEW_COLS
  const availableColumns = Array.from({ length: colCount }).map((_, index) => {
    const columnLetter = String.fromCharCode(65 + index) // A, B, C, ...
    return {
      value: columnLetter,
      label: `${columnLetter}列`,
      content: headerRow[index] || ''
    }
  })

  // デフォルト列の自動設定: A=店舗番号, B=エリア, C=店舗名
  useEffect(() => {
    setMapping(prev => ({
      ...prev,
      storeCodeColumn: prev.storeCodeColumn || 'A',
      areaColumn: prev.areaColumn || 'B',
      storeNameColumn: prev.storeNameColumn || 'C',
    }))
  }, [excelData])

  // プレビューデータを生成
  useEffect(() => {
    if (excelData.length > 0) {
      const rows = excelData.slice(0, MAX_PREVIEW_ROWS)
      const preview = rows.map((row, idx) => ({
        key: idx,
        rowNumber: idx + 1,
        data: Array.from({ length: colCount }).map((__, i) => (row || [])[i])
      }))
      setPreviewData(preview)
    }
  }, [excelData])

  // 列マッピングの更新
  const updateMapping = (field: keyof ColumnMapping, value: any) => {
    setMapping(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // メイン物品列の追加/削除
  const handleMainItemColumnChange = (value: string[]) => {
    updateMapping('mainItemColumns', value)
  }

  // バリデーション
  const validateMapping = (): boolean => {
    if (!mapping.storeCodeColumn) {
      message.error('店舗番号列を選択してください')
      return false
    }
    if (!mapping.storeNameColumn) {
      message.error('店舗名列を選択してください')
      return false
    }
    if (mapping.mainItemColumns.length === 0) {
      message.error('メイン物品列を1つ以上選択してください')
      return false
    }
    if (mapping.dataStartRow < 2) {
      message.error('データ開始行は2以上である必要があります')
      return false
    }
    return true
  }

  // マッピング完了
  const handleComplete = () => {
    if (validateMapping()) {
      onMappingComplete(mapping)
    }
  }

  // プレビューテーブルの列定義（20列上限・安全生成）
  const previewColumns = [
    {
      title: '行番号',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
      fixed: 'left' as const,
    },
    ...availableColumns
      .filter(Boolean)
      .map((col, index) => ({
        title: (
          <div className="text-center">
            <div className="font-bold">{col.label}</div>
            <div className="text-xs text-gray-500">{col.content}</div>
          </div>
        ),
        // ネストデータは配列形式のdataIndexで指定
        dataIndex: ['data', index] as any,
        key: `col_${index}`,
        width: 120,
        render: (value: any) => (
          <div className="text-center">
            {value ?? '-'}
          </div>
        ),
      }))
  ]

  return (
    <div className="p-6">
      <Title level={3}>列マッピング設定</Title>
      <Alert
        message="列マッピングの設定"
        description="上から順に『データ開始行』を指定 → プレビューを確認 → 列マッピングを設定してください。"
        type="info"
        showIcon
        className="mb-6"
      />

      {/* データ開始行（最上部） */}
      <Card title="データ開始行の指定" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>データ開始行 <Text type="danger">*</Text></Text>
            </div>
            <Input
              type="number"
              value={mapping.dataStartRow}
              onChange={(e) => updateMapping('dataStartRow', Math.max(2, parseInt(e.target.value) || 3))}
              placeholder="3"
              min={2}
            />
          </Col>
        </Row>
      </Card>

      {/* プレビューテーブル */}
      <Card title="データプレビュー" className="mb-6">
        <div className="mb-4">
          <Text>以下のデータを確認して、適切な列を選択してください。</Text>
        </div>
        <Table
          dataSource={previewData}
          columns={previewColumns}
          pagination={false}
          scroll={{ x: colCount * 120, y: 400 }}
          size="small"
        />
      </Card>

      {/* 列マッピング設定 */}
      <Card title="列マッピング設定" className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>店舗番号列 <Text type="danger">*</Text></Text>
            </div>
            <Select
              value={mapping.storeCodeColumn}
              onChange={(value) => updateMapping('storeCodeColumn', value)}
              placeholder="店舗番号が入っている列を選択"
              style={{ width: '100%' }}
            >
              {availableColumns.map(col => (
                <Option key={col.value} value={col.value}>
                  {col.label} - {col.content}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>エリア列</Text>
            </div>
            <Select
              value={mapping.areaColumn}
              onChange={(value) => updateMapping('areaColumn', value)}
              placeholder="エリアが入っている列を選択（任意）"
              style={{ width: '100%' }}
              allowClear
            >
              {availableColumns.map(col => (
                <Option key={col.value} value={col.value}>
                  {col.label} - {col.content}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>店舗名列 <Text type="danger">*</Text></Text>
            </div>
            <Select
              value={mapping.storeNameColumn}
              onChange={(value) => updateMapping('storeNameColumn', value)}
              placeholder="店舗名が入っている列を選択"
              style={{ width: '100%' }}
            >
              {availableColumns.map(col => (
                <Option key={col.value} value={col.value}>
                  {col.label} - {col.content}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>メイン物品列 <Text type="danger">*</Text></Text>
              <Tooltip title="数値データが入っている列を複数選択">
                <InfoCircleOutlined className="ml-1" />
              </Tooltip>
            </div>
            <Select
              mode="multiple"
              value={mapping.mainItemColumns}
              onChange={handleMainItemColumnChange}
              placeholder="数値データの列を複数選択"
              style={{ width: '100%' }}
            >
              {availableColumns.map(col => (
                <Option key={col.value} value={col.value}>
                  {col.label} - {col.content}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div className="mb-2">
              <Text strong>その他物品列</Text>
              <Tooltip title="テキストデータが入っている列を選択">
                <InfoCircleOutlined className="ml-1" />
              </Tooltip>
            </div>
            <Select
              value={mapping.otherItemColumn}
              onChange={(value) => updateMapping('otherItemColumn', value)}
              placeholder="テキストデータの列を選択（任意）"
              style={{ width: '100%' }}
              allowClear
            >
              {availableColumns.map(col => (
                <Option key={col.value} value={col.value}>
                  {col.label} - {col.content}
                </Option>
              ))}
            </Select>
          </Col>

          {/* 開始行は上部へ移動済み */}
        </Row>

        <Divider />

        {/* 選択されたマッピングの確認 */}
        <div className="mb-4">
          <Text strong>選択されたマッピング:</Text>
        </div>
        <div className="space-y-2">
          <div>
            <Tag color="blue">店舗番号: {mapping.storeCodeColumn || '未選択'}</Tag>
            <Tag color="green">店舗名: {mapping.storeNameColumn || '未選択'}</Tag>
            <Tag color="orange">エリア: {mapping.areaColumn || '未選択'}</Tag>
          </div>
          <div>
            <Tag color="purple">
              メイン物品: {mapping.mainItemColumns.length > 0 ? mapping.mainItemColumns.join(', ') : '未選択'}
            </Tag>
            <Tag color="cyan">
              その他物品: {mapping.otherItemColumn || '未選択'}
            </Tag>
          </div>
          <div>
            <Tag color="red">データ開始行: {mapping.dataStartRow}行目</Tag>
          </div>
        </div>
      </Card>

      {/* ボタン */}
      <div className="text-center">
        <Space>
          <Button onClick={onCancel}>
            キャンセル
          </Button>
          <Button 
            type="primary" 
            onClick={handleComplete}
            icon={<CheckCircleOutlined />}
          >
            マッピング完了
          </Button>
        </Space>
      </div>
    </div>
  )
}

export default ExcelColumnMapping

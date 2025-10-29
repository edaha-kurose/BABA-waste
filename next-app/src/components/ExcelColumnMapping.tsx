'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Alert,
  Row,
  Col,
  message,
} from 'antd'
import { InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select

interface ExcelColumnMappingProps {
  excelData: any[][]
  onMappingComplete: (mapping: ColumnMapping) => void
  onCancel: () => void
  loading?: boolean
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
  onCancel,
  loading = false,
}) => {
  const MAX_PREVIEW_ROWS = 20
  const MAX_PREVIEW_COLS = 20

  console.log('[ExcelColumnMapping] Rendering...')
  console.log('[ExcelColumnMapping] excelData rows:', excelData?.length)
  console.log('[ExcelColumnMapping] excelData sample:', excelData?.slice(0, 3))

  const [mapping, setMapping] = useState<ColumnMapping>({
    storeCodeColumn: '',
    storeNameColumn: '',
    areaColumn: '',
    mainItemColumns: [],
    otherItemColumn: '',
    dataStartRow: 3,
  })

  const [previewData, setPreviewData] = useState<any[]>([])

  // 利用可能な列を取得
  const headerRow = excelData[0] || []
  const colCount = Math.min(headerRow.length, MAX_PREVIEW_COLS)
  console.log('[ExcelColumnMapping] headerRow:', headerRow)
  console.log('[ExcelColumnMapping] colCount:', colCount)
  
  const availableColumns = Array.from({ length: colCount }).map((_, index) => {
    const columnLetter = String.fromCharCode(65 + index) // A, B, C, ...
    return {
      value: columnLetter,
      label: `${columnLetter}列`,
      content: headerRow[index] || '',
    }
  })
  
  console.log('[ExcelColumnMapping] availableColumns:', availableColumns.length)

  // デフォルト列の自動設定: A=店舗番号, B=エリア, C=店舗名
  useEffect(() => {
    setMapping((prev) => ({
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
        data: Array.from({ length: colCount }).map((__, i) => (row || [])[i]),
      }))
      setPreviewData(preview)
    }
  }, [excelData, colCount])

  // 列マッピングの更新
  const updateMapping = (field: keyof ColumnMapping, value: any) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value,
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

  // プレビューテーブルの列定義
  const previewColumns = [
    {
      title: '行番号',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
      fixed: 'left' as const,
    },
    ...availableColumns.map((col, index) => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 'bold' }}>{col.label}</div>
          <div style={{ fontSize: 12, color: 'gray' }}>{col.content}</div>
        </div>
      ),
      dataIndex: ['data', index] as any,
      key: `col_${index}`,
      width: 120,
      render: (value: any) => <div style={{ textAlign: 'center' }}>{value ?? '-'}</div>,
    })),
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>列マッピング設定</Title>
      <Alert
        message="列マッピングの設定"
        description="上から順に『データ開始行』を指定 → プレビューを確認 → 列マッピングを設定してください。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* データ開始行 */}
      <Card title="データ開始行の指定" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                データ開始行 <Text type="danger">*</Text>
              </Text>
            </div>
            <Input
              type="number"
              value={mapping.dataStartRow}
              onChange={(e) =>
                updateMapping('dataStartRow', Math.max(2, parseInt(e.target.value) || 3))
              }
              placeholder="3"
              min={2}
            />
          </Col>
        </Row>
      </Card>

      {/* プレビューテーブル */}
      <Card title="データプレビュー" style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
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
      <Card title="列マッピング設定" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                店舗番号列 <Text type="danger">*</Text>
              </Text>
            </div>
            <Select
              value={mapping.storeCodeColumn}
              onChange={(value) => updateMapping('storeCodeColumn', value)}
              style={{ width: '100%' }}
              placeholder="列を選択"
            >
              {availableColumns.map((col) => (
                <Option key={col.value} value={col.value}>
                  {col.label} ({col.content})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                店舗名列 <Text type="danger">*</Text>
              </Text>
            </div>
            <Select
              value={mapping.storeNameColumn}
              onChange={(value) => updateMapping('storeNameColumn', value)}
              style={{ width: '100%' }}
              placeholder="列を選択"
            >
              {availableColumns.map((col) => (
                <Option key={col.value} value={col.value}>
                  {col.label} ({col.content})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>エリア列</Text>
            </div>
            <Select
              value={mapping.areaColumn}
              onChange={(value) => updateMapping('areaColumn', value)}
              style={{ width: '100%' }}
              placeholder="列を選択"
              allowClear
            >
              {availableColumns.map((col) => (
                <Option key={col.value} value={col.value}>
                  {col.label} ({col.content})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                メイン物品列 <Text type="danger">*</Text>
              </Text>
            </div>
            <Select
              mode="multiple"
              value={mapping.mainItemColumns}
              onChange={handleMainItemColumnChange}
              style={{ width: '100%' }}
              placeholder="列を選択（複数可）"
            >
              {availableColumns.map((col) => (
                <Option key={col.value} value={col.value}>
                  {col.label} ({col.content})
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>その他物品列</Text>
            </div>
            <Select
              value={mapping.otherItemColumn}
              onChange={(value) => updateMapping('otherItemColumn', value)}
              style={{ width: '100%' }}
              placeholder="列を選択"
              allowClear
            >
              {availableColumns.map((col) => (
                <Option key={col.value} value={col.value}>
                  {col.label} ({col.content})
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* アクションボタン */}
      <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel} disabled={loading}>
          キャンセル
        </Button>
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleComplete}
          loading={loading}
          disabled={loading}
        >
          {loading ? '取り込み中...' : 'マッピング確定'}
        </Button>
      </Space>
    </div>
  )
}

export default ExcelColumnMapping





'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Upload,
  message,
  Typography,
  Tag,
  Alert,
  Progress,
  App,
} from 'antd'
import {
  FileTextOutlined,
  UploadOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useUser } from '@/lib/auth/session'
import type { UploadFile } from 'antd/es/upload/interface'
import ExcelColumnMapping, { type ColumnMapping } from '@/components/ExcelColumnMapping'

const { Title, Text } = Typography

interface WasteRequest {
  id: string
  store_code: string
  store_name: string
  area?: string
  main_items: Record<string, number>
  other_items?: string
  status: string
  created_at: string
}

export default function WasteRequestsPage() {
  const { user, userOrg } = useUser()
  const { modal } = App.useApp()
  const [requests, setRequests] = useState<WasteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadModalVisible, setUploadModalVisible] = useState(false)
  const [mappingModalVisible, setMappingModalVisible] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [excelData, setExcelData] = useState<any[][]>([])
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadProgressModalVisible, setUploadProgressModalVisible] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // データ取得
  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collection-requests')
      if (!response.ok) throw new Error('取得失敗')

      const result = await response.json()
      // APIレスポンスがdata配列を持っている場合
      const data = result.data || result
      if (Array.isArray(data)) {
        setRequests(data)
      } else {
        console.error('API response is not an array:', result)
        setRequests([])
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err)
      message.error('廃棄依頼の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // エクセルファイル読み込み
  const handleFileUpload = async (file: File) => {
    try {
      // xlsxを動的インポート（クライアントサイドのみ）
      const XLSX = await import('xlsx')
      
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // シート全体を2次元配列に変換
      const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        raw: false,
      })

      console.log('Excel data loaded:', jsonData.length, 'rows')
      setExcelData(jsonData)
      setUploadModalVisible(false)
      setMappingModalVisible(true)
    } catch (error) {
      console.error('Failed to read Excel file:', error)
      message.error(`エクセルファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
    }
  }

  // マッピング完了時の処理（事前チェック）
  const handleMappingComplete = async (mapping: ColumnMapping) => {
    if (!userOrg?.id || !user?.id) {
      modal.error({
        title: 'エラー',
        content: 'ユーザー情報が取得できません。再ログインしてください。',
      })
      return
    }

    try {
      setUploading(true)
      setCurrentMapping(mapping)

      // マッピングに基づいてデータを解析
      const parsedData = parseExcelData(excelData, mapping)

      console.log(`[Import] データ解析完了: ${parsedData.length}件`)

      // 新規店舗の事前チェック
      const storeCodes = [...new Set(parsedData.map((row) => row.store_code))]
      console.log(`[Import] 店舗コード数: ${storeCodes.length}件`)

      const checkResponse = await fetch(
        `/api/import/waste-requests?org_id=${userOrg.id}&store_codes=${storeCodes.join(',')}`,
        { method: 'GET' }
      )

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json().catch(() => ({}))
        console.error('[Import] 店舗チェックエラー:', errorData)
        console.error('[Import] ステータス:', checkResponse.status)
        
        // 詳細なエラーメッセージを表示
        modal.error({
          title: '店舗チェックに失敗しました',
          width: 700,
          content: (
            <div>
              <p><strong>エラー:</strong> {errorData.error || '不明なエラー'}</p>
              <p><strong>HTTPステータス:</strong> {checkResponse.status}</p>
              {errorData.details && (
                <div style={{ marginTop: 12 }}>
                  <p><strong>詳細:</strong></p>
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap' }}>
                    {errorData.details}
                  </pre>
                </div>
              )}
              {errorData.stack && (
                <div style={{ marginTop: 12 }}>
                  <p><strong>スタックトレース:</strong></p>
                  <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 10, maxHeight: 200, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {errorData.stack}
                  </pre>
                </div>
              )}
              <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 6 }}>
                <p style={{ margin: 0, fontSize: 12 }}>
                  <strong>💡 対処方法:</strong>
                </p>
                <ul style={{ marginTop: 8, fontSize: 12 }}>
                  <li>ブラウザのコンソール（F12）を開いてエラーログを確認</li>
                  <li>サーバーのターミナルで [Store Check API] のログを確認</li>
                  <li>データベース接続を確認</li>
                  <li>ページをリロードして再試行</li>
                </ul>
              </div>
            </div>
          ),
        })
        setUploading(false)
        return
      }

      const checkResult = await checkResponse.json()
      console.log('[Import] 店舗チェック結果:', checkResult)

      // 新規店舗がある場合は確認モーダルを表示
      if (checkResult.hasNewStores && checkResult.newStores.length > 0) {
        // 先にマッピングモーダルを閉じる
        setMappingModalVisible(false)
        
        modal.confirm({
          title: '新規店舗の登録確認',
          width: 600,
          content: (
            <div>
              <p>
                以下の <strong>{checkResult.newStores.length}件</strong> の店舗がマスターに登録されていません。
              </p>
              <p style={{ marginTop: 8 }}>
                これらの店舗を新規登録して取り込みを続行しますか？
              </p>
              <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                <strong style={{ color: '#52c41a' }}>📋 新規登録される店舗:</strong>
                <ul style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {Array.from(
                    new Map(
                      parsedData
                        .filter((row) => checkResult.newStores.includes(row.store_code))
                        .map((row) => [row.store_code, row])
                    ).values()
                  ).map((row, idx) => (
                    <li key={idx} style={{ fontSize: 12 }}>
                      {row.store_code} - {row.store_name}
                      {row.area && <span style={{ color: '#666' }}> ({row.area})</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <Alert
                message="注意"
                description="新規店舗には収集業者が割り当てられていません。取り込み後、「店舗管理」から業者を設定してください。"
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            </div>
          ),
          okText: '登録して取り込む',
          cancelText: 'キャンセル',
          onOk: () => {
            // Modal.confirm が完全に閉じてから executeImport を実行
            return new Promise<void>((resolve) => {
              resolve()
              // モーダルが閉じるまで少し待つ
              setTimeout(async () => {
                await executeImport(parsedData, true)
              }, 300)
            })
          },
          onCancel: () => {
            // キャンセル時はマッピング画面に留まる
            setUploading(false)
          },
        })
      } else {
        // 新規店舗がない場合は直接取り込み
        // 先にマッピングモーダルを閉じる
        setMappingModalVisible(false)
        
        // モーダルが閉じるまで少し待つ
        setTimeout(async () => {
          await executeImport(parsedData, true)
        }, 300)
      }
    } catch (err: any) {
      console.error('[Import] エラー:', err)
      modal.error({
        title: 'データの確認に失敗しました',
        width: 600,
        content: (
          <div>
            <p>{err.message || 'サーバーとの通信に失敗しました'}</p>
            <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
              ネットワーク接続を確認してから、再度お試しください。
            </p>
          </div>
        ),
      })
      setUploading(false)
    }
  }

  // 取り込みキャンセル処理
  const handleCancelImport = () => {
    modal.confirm({
      title: '取り込みをキャンセルしますか？',
      content: '処理が中断され、取り込まれたデータは保存されません。本当にキャンセルしますか？',
      okText: 'キャンセルする',
      okType: 'danger',
      cancelText: '続ける',
      onOk: () => {
        if (abortController) {
          console.log('[Import] ユーザーによりキャンセルされました')
          abortController.abort()
          setAbortController(null)
        }
      },
    })
  }

  // 実際の取り込み処理
  const executeImport = async (parsedData: any[], auto_create_stores: boolean) => {
    let progressInterval: NodeJS.Timeout | null = null
    const controller = new AbortController()
    setAbortController(controller)
    
    try {
      console.log(`[Import] データ送信開始: ${parsedData.length}件`)
      console.log('[Import] プログレスモーダルを表示します')

      // 推定時間を計算（1件あたり0.15秒、バッチ処理のオーバーヘッド込み）
      const estimatedSeconds = Math.ceil(parsedData.length * 0.15)
      setEstimatedTime(estimatedSeconds)
      setElapsedTime(0)
      setUploadProgress(0)
      setUploadProgressModalVisible(true)
      
      console.log('[Import] プログレスモーダル表示を設定しました:', {
        estimatedSeconds,
        uploadProgressModalVisible: true
      })

      // プログレス更新タイマー（1秒ごと）
      const startTime = Date.now()
      progressInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedTime(elapsed)
        
        // 推定進捗を計算（最大95%まで）
        const progress = Math.min(95, (elapsed / estimatedSeconds) * 100)
        setUploadProgress(progress)
      }, 1000)

      // サーバーにデータを送信
      const response = await fetch('/api/import/waste-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: userOrg?.id,
          user_id: user?.id,
          data: parsedData,
          auto_create_stores,
        }),
        signal: controller.signal, // AbortController のシグナルを追加
      })

      const result = await response.json()

      console.log('[Import] API応答:', result)

      if (!response.ok || !result.success) {
        // エラー詳細をモーダルで表示
        modal.error({
          title: '取り込みに失敗しました',
          width: 600,
          content: (
            <div>
              <p>{result.error || 'データの取り込みに失敗しました'}</p>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>エラー詳細:</strong>
                  <ul style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}>
                    {result.errors.map((err: string, idx: number) => (
                      <li key={idx} style={{ color: '#ff4d4f', fontSize: 12 }}>
                        {err}
                      </li>
                    ))}
                  </ul>
                  {result.hasMoreErrors && (
                    <p style={{ color: '#faad14', marginTop: 8 }}>
                      ※ エラーが多数あるため、最初の50件のみ表示しています
                    </p>
                  )}
                </div>
              )}
            </div>
          ),
          onOk: () => {
            // エラー時はマッピング画面に戻すため、モーダルは閉じない
          },
        })
        return
      }

      // 成功またはパーシャル成功
      const successInfo = (
        <div>
          <p>
            <strong>取り込み結果</strong>
          </p>
          <ul style={{ marginTop: 8 }}>
            <li>✅ 成功: {result.successRows}件</li>
            {result.errorRows > 0 && <li>❌ 失敗: {result.errorRows}件</li>}
            {result.newStores && result.newStores.length > 0 && (
              <li style={{ color: '#52c41a' }}>🆕 新規店舗: {result.newStores.length}件</li>
            )}
          </ul>

          {result.newStores && result.newStores.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
              <strong style={{ color: '#52c41a' }}>📋 新規作成された店舗:</strong>
              <ul style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                {result.newStores.slice(0, 10).map((store: string, idx: number) => (
                  <li key={idx} style={{ fontSize: 12 }}>
                    {store}
                  </li>
                ))}
                {result.newStores.length > 10 && (
                  <li style={{ fontSize: 12, color: '#666' }}>...他 {result.newStores.length - 10}件</li>
                )}
              </ul>
            </div>
          )}

          {result.missingCollectorStores && result.missingCollectorStores.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 6 }}>
              <strong style={{ color: '#fa8c16' }}>⚠️ 収集業者が未割当の店舗:</strong>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                以下の店舗には収集業者が割り当てられていません。
                <br />
                「店舗管理」から業者を設定してください。
              </p>
              <ul style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                {result.missingCollectorStores.slice(0, 10).map((store: string, idx: number) => (
                  <li key={idx} style={{ fontSize: 12 }}>
                    {store}
                  </li>
                ))}
                {result.missingCollectorStores.length > 10 && (
                  <li style={{ fontSize: 12, color: '#666' }}>
                    ...他 {result.missingCollectorStores.length - 10}件
                  </li>
                )}
              </ul>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#fff2f0', borderRadius: 6 }}>
              <strong style={{ color: '#ff4d4f' }}>エラー詳細:</strong>
              <ul style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto' }}>
                {result.errors.slice(0, 10).map((err: string, idx: number) => (
                  <li key={idx} style={{ fontSize: 12, color: '#ff4d4f' }}>
                    {err}
                  </li>
                ))}
                {result.errors.length > 10 && (
                  <li style={{ fontSize: 12, color: '#666' }}>...他 {result.errors.length - 10}件</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )

      if (result.status === 'SUCCESS') {
        modal.success({
          title: '取り込みが完了しました',
          width: 600,
          content: successInfo,
        })
      } else if (result.status === 'PARTIAL') {
        modal.warning({
          title: '取り込みが完了しました（一部エラーあり）',
          width: 600,
          content: successInfo,
        })
      }

      // モーダルを閉じてリフレッシュ
      setMappingModalVisible(false)
      setFileList([])
      setExcelData([])
      fetchRequests()
    } catch (err: any) {
      console.error('[Import] エラー:', err)

      // キャンセルの場合は通知を表示
      if (err.name === 'AbortError') {
        message.info('取り込みがキャンセルされました')
        console.log('[Import] 取り込みがキャンセルされました')
      } else {
        // ネットワークエラーなどの場合
        modal.error({
          title: 'データの取り込みに失敗しました',
          width: 600,
          content: (
            <div>
              <p>{err.message || 'サーバーとの通信に失敗しました'}</p>
              <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                ネットワーク接続を確認してから、再度お試しください。
              </p>
            </div>
          ),
        })
      }
    } finally {
      // プログレスタイマーをクリア
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // AbortControllerをクリア
      setAbortController(null)
      
      // プログレスを100%にして少し待ってから閉じる
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgressModalVisible(false)
        setUploadProgress(0)
        setElapsedTime(0)
      }, 1000)
      
      setUploading(false)
    }
  }

  // エクセルデータの解析
  const parseExcelData = (data: any[][], mapping: ColumnMapping) => {
    const { storeCodeColumn, storeNameColumn, areaColumn, mainItemColumns, otherItemColumn, dataStartRow } = mapping

    const colIndex = (letter: string) => letter.charCodeAt(0) - 65 // A=0, B=1, ...

    const parsed: any[] = []

    for (let i = dataStartRow - 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const storeCode = row[colIndex(storeCodeColumn)]
      const storeName = row[colIndex(storeNameColumn)]
      const area = areaColumn ? row[colIndex(areaColumn)] : undefined
      const otherItems = otherItemColumn ? row[colIndex(otherItemColumn)] : undefined

      if (!storeCode || !storeName) continue

      const mainItems: Record<string, number> = {}
      mainItemColumns.forEach((col) => {
        const value = row[colIndex(col)]
        if (value && !isNaN(parseFloat(value))) {
          mainItems[col] = parseFloat(value)
        }
      })

      parsed.push({
        store_code: String(storeCode),
        store_name: String(storeName),
        area: area ? String(area) : undefined,
        main_items: mainItems,
        other_items: otherItems ? String(otherItems) : undefined,
      })
    }

    return parsed
  }

  // テーブル列定義
  const columns = [
    {
      title: '店舗コード',
      dataIndex: ['stores', 'store_code'],
      key: 'store_code',
      width: 120,
    },
    {
      title: '店舗名',
      dataIndex: ['stores', 'name'],
      key: 'store_name',
      width: 200,
    },
    {
      title: 'メイン品目',
      dataIndex: 'main_items',
      key: 'main_items',
      width: 250,
      render: (items: any) => {
        try {
          const parsed = typeof items === 'string' ? JSON.parse(items) : items
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any, i: number) => {
              if (typeof item === 'object' && item.item_name) {
                return (
                  <Tag key={i} color="blue">
                    {item.item_name}: {item.quantity} {item.unit}
                  </Tag>
                )
              }
              return <Tag key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</Tag>
            })
          }
          return '-'
        } catch {
          return '-'
        }
      },
    },
    {
      title: 'その他品目',
      dataIndex: 'other_items',
      key: 'other_items',
      width: 200,
      render: (items: any) => {
        try {
          const parsed = typeof items === 'string' ? JSON.parse(items) : items
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any, i: number) => {
              if (typeof item === 'object' && item.item_name) {
                return (
                  <Tag key={i} color="orange">
                    {item.item_name}: {item.quantity} {item.unit}
                  </Tag>
                )
              }
              if (typeof item === 'string') {
                return <Tag key={i} color="orange">{item}</Tag>
              }
              return <Tag key={i}>{JSON.stringify(item)}</Tag>
            })
          }
          return '-'
        } catch {
          return '-'
        }
      },
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'orange', text: '保留' },
          ASSIGNED: { color: 'blue', text: '割当済' },
          CONFIRMED: { color: 'cyan', text: '確定' },
          COLLECTED: { color: 'purple', text: '回収済' },
          COMPLETED: { color: 'green', text: '完了' },
        }
        const { color, text } = config[status] || { color: 'gray', text: status }
        return <Tag color={color}>{text}</Tag>
      },
    },
    {
      title: '依頼日時',
      dataIndex: 'requested_at',
      key: 'requested_at',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('ja-JP') : '-',
    },
    {
      title: '回収予定日',
      dataIndex: 'scheduled_collection_date',
      key: 'scheduled_collection_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('ja-JP') : '-',
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Title level={2}>
            <FileTextOutlined /> 廃棄依頼一覧
          </Title>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRequests}>
              更新
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              エクセル取り込み
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `全${total}件`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* ファイルアップロードモーダル */}
      <Modal
        title="エクセルファイルアップロード"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false)
          setFileList([])
        }}
        footer={null}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="廃棄依頼のエクセル取り込み"
            description="店舗情報と廃棄物の数量データが含まれるエクセルファイルをアップロードしてください。次のステップで列マッピングを設定できます。"
            type="info"
            showIcon
          />

          <Upload
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            beforeUpload={(file) => {
              handleFileUpload(file)
              return false
            }}
            maxCount={1}
            accept=".xlsx,.xls"
          >
            <Button icon={<UploadOutlined />} size="large" block>
              ファイルを選択
            </Button>
          </Upload>
        </Space>
      </Modal>

      {/* 列マッピングモーダル */}
      <Modal
        title={null}
        open={mappingModalVisible}
        onCancel={() => {
          setMappingModalVisible(false)
          setExcelData([])
        }}
        footer={null}
        width="90%"
        style={{ maxWidth: 1400, top: 20 }}
        styles={{ body: { maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' } }}
      >
        {excelData.length > 0 ? (
          <ExcelColumnMapping
            excelData={excelData}
            onMappingComplete={handleMappingComplete}
            onCancel={() => {
              setMappingModalVisible(false)
              setExcelData([])
            }}
            loading={uploading}
          />
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p>データを読み込んでいます...</p>
          </div>
        )}
      </Modal>

      {/* プログレス表示モーダル */}
      <Modal
        title="データ取り込み中"
        open={uploadProgressModalVisible}
        closable={false}
        footer={
          uploadProgress < 100 ? (
            <Button danger onClick={handleCancelImport} disabled={!abortController}>
              取り込みをキャンセル
            </Button>
          ) : null
        }
        width={500}
        zIndex={1100}
        centered
        maskClosable={false}
        getContainer={false}
        destroyOnClose={false}
      >
        <div style={{ padding: '20px 0' }}>
          <Progress
            percent={Math.round(uploadProgress)}
            status={uploadProgress < 100 ? 'active' : 'success'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>
              {uploadProgress < 100 ? '処理中です。しばらくお待ちください...' : '完了しました！'}
            </p>
            <div style={{ fontSize: 14, color: '#666' }}>
              <p>経過時間: {elapsedTime}秒</p>
              <p>
                推定残り時間:{' '}
                {uploadProgress < 100
                  ? `約 ${Math.max(0, estimatedTime - elapsedTime)}秒`
                  : '0秒'}
              </p>
            </div>
          </div>
          <Alert
            message="注意"
            description={
              uploadProgress < 100
                ? 'この画面を閉じたり、ブラウザをリロードしないでください。処理が中断される可能性があります。処理を中止する場合は下の「取り込みをキャンセル」ボタンをクリックしてください。'
                : 'データの取り込みが完了しました。'
            }
            type={uploadProgress < 100 ? 'warning' : 'success'}
            showIcon
            style={{ marginTop: 20 }}
          />
        </div>
      </Modal>
    </div>
  )
}

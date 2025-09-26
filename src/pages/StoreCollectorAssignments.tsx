import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Popconfirm,
  message,
  Tag,
  Row,
  Col,
  Typography,
  InputNumber,
  Switch,
  Tooltip,
  Alert,
  Upload,
  Steps,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import type { StoreCollectorAssignment, Store, User } from '@contracts/v0/schema'
import * as XLSX from 'xlsx'
import { getOrgId } from '@/utils/data-backend'

const { Title } = Typography
const { Option } = Select

interface AssignmentFormData {
  store_id: string
  collector_id: string
  priority: number
  is_active: boolean
}

const StoreCollectorAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<StoreCollectorAssignment[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [collectors, setCollectors] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<StoreCollectorAssignment | null>(null)
  const [form] = Form.useForm()
  const [showContact, setShowContact] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [addSelectionByStore, setAddSelectionByStore] = useState<Record<string, string | undefined>>({})
  const [reorderVisible, setReorderVisible] = useState(false)
  const [reorderStoreId, setReorderStoreId] = useState<string | null>(null)
  const [reorderItems, setReorderItems] = useState<Array<{ id: string; name: string }>>([])
  const [excelVisible, setExcelVisible] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [mapping, setMapping] = useState({ storeCol: 'A', areaCol: 'B', startRow: 2, rankStartCol: 'C', rankEndCol: 'E' })
  const [excelStep, setExcelStep] = useState<number>(0)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [excelPreview, setExcelPreview] = useState<any[]>([])

  // CSVエクスポート（テストデータ用）
  const handleExportCsv = async () => {
    try {
      // 店舗ごとに優先度順の業者を抽出
      const grouped: Record<string, { store: Store; ass: StoreCollectorAssignment[] }> = {}
      for (const store of stores) {
        const ass = assignments
          .filter(a => a.store_id === store.id)
          .sort((a, b) => (a.priority || 999) - (b.priority || 999))
        grouped[store.id] = { store, ass }
      }

      // CSVヘッダ（A:店舗番号, B:舗名, C〜:順位）
      const headers = ['店舗番号', '舗名', '収集業者1位', '収集業者2位', '収集業者3位', '収集業者4位', '収集業者5位']
      const rows: string[][] = [headers]
      for (const key of Object.keys(grouped)) {
        const { store, ass } = grouped[key]
        const cols: string[] = [store.store_code || '', store.area_name || '']
        // 上位5社までを出力（不足は空欄）
        for (let i = 0; i < 5; i++) {
          const a = ass[i]
          if (a) {
            const company = getCompanyName(a.collector_id)
            cols.push(company)
          } else {
            cols.push('')
          }
        }
        rows.push(cols)
      }

      const escape = (s: string) => '"' + (s || '').replace(/"/g, '""') + '"'
      const csv = rows.map(r => r.map(escape).join(',')).join('\r\n')
      // Excel での文字化け防止のため UTF-8 BOM を付与
      const bom = '\uFEFF'
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `店舗収集業者テストデータ_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('テスト用CSVを出力しました')
    } catch (e) {
      console.error(e)
      message.error('CSV出力に失敗しました')
    }
  }

  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [assignmentsData, storesData, usersData] = await Promise.all([
        StoreCollectorAssignmentRepository.findMany(),
        StoreRepository.findMany(),
        UserRepository.findMany()
      ])
      
      setAssignments(assignmentsData)
      setStores(storesData)
      setCollectors(usersData.filter(u => u.role === 'COLLECTOR'))
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // フォーム送信
  const handleSubmit = async (values: AssignmentFormData) => {
    try {
      const assignmentData = {
        org_id: 'demo-org-id',
        ...values,
      }

      if (editingAssignment) {
        await StoreCollectorAssignmentRepository.update(editingAssignment.id, assignmentData)
        message.success('割り当てを更新しました')
      } else {
        await StoreCollectorAssignmentRepository.create(assignmentData)
        message.success('割り当てを作成しました')
      }
      
      setModalVisible(false)
      setEditingAssignment(null)
      form.resetFields()
      fetchData()
    } catch (err) {
      console.error('Failed to save assignment:', err)
      message.error('割り当ての保存に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: string) => {
    try {
      await StoreCollectorAssignmentRepository.delete(id)
    } catch (err) {
      console.error('Failed to delete assignment:', err)
      message.error('割り当ての削除に失敗しました')
      return
    }
    message.success('割り当てを削除しました')
    fetchData()
  }

  // 編集開始
  const handleEdit = (assignment: StoreCollectorAssignment) => {
    setEditingAssignment(assignment)
    form.setFieldsValue(assignment)
    setModalVisible(true)
  }

  // 新規作成開始
  const handleCreate = () => {
    setEditingAssignment(null)
    form.resetFields()
    setModalVisible(true)
  }

  // モーダルキャンセル
  const handleCancel = () => {
    setModalVisible(false)
    setEditingAssignment(null)
    form.resetFields()
  }

  // 会社名取得
  const getCompanyName = (collectorId: string) => {
    const c = collectors.find(x => x.id === collectorId)
    return c ? (c.company_name || c.name || '-') : '-'
  }

  // 店舗ごとに集約した表示データ（上位3社、最大10件まで）
  const aggregatedData = stores.map(store => {
    const list = assignments
      .filter(a => a.store_id === store.id)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
    const top3 = list.slice(0, 3)
    return {
      key: store.id,
      store_id: store.id,
      store_name: store.name,
      area_name: store.area_name || '-',
      top3,
      total: list.length,
    }
  })

  // 一覧テーブル列定義（店舗単位）
  const columns = [
    {
      title: '店舗',
      dataIndex: 'store_name',
      key: 'store_name',
    },
    {
      title: '舗名',
      dataIndex: 'area_name',
      key: 'area_name',
    },
    {
      title: '上位3社（優先度順）',
      key: 'top3',
      render: (_: any, record: any) => (
        record.top3.length === 0
          ? <span>未設定</span>
          : <span>{record.top3.map((a: any) => getCompanyName(a.collector_id)).join('、 ')}</span>
      ),
    },
    {
      title: '追加（最大10社）',
      key: 'add',
      render: (_: any, record: any) => {
        const assignedIds = assignments.filter(a => a.store_id === record.store_id).map(a => a.collector_id)
        const options = collectors
          .filter(c => !assignedIds.includes(c.id))
          .map(c => ({ label: c.company_name || c.name, value: c.id }))
        const selected = addSelectionByStore[record.store_id]
        const disabled = (assignedIds.length >= 10) || options.length === 0
        return (
          <Space>
            <Select
              style={{ width: 240 }}
              placeholder={disabled ? '上限到達/候補なし' : '収集業者を選択'}
              value={selected}
              onChange={(val) => setAddSelectionByStore(prev => ({ ...prev, [record.store_id]: val }))}
              options={options}
              disabled={disabled}
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
            <Button
              type="primary"
              disabled={disabled || !selected}
              onClick={async () => {
                try {
                  const current = assignments.filter(a => a.store_id === record.store_id)
                  if (current.length >= 10) {
                    message.warning('この店舗には既に10社が割り当てられています')
                    return
                  }
                  const nextPriority = (current.reduce((m, a) => Math.max(m, a.priority || 0), 0) || 0) + 1
                  await StoreCollectorAssignmentRepository.create({
                    org_id: getOrgId(),
                    store_id: record.store_id,
                    collector_id: selected as string,
                    priority: nextPriority,
                    is_active: true,
                  } as any)
                  message.success('収集業者を追加しました')
                  setAddSelectionByStore(prev => ({ ...prev, [record.store_id]: undefined }))
                  fetchData()
                } catch (e) {
                  console.error(e)
                  message.error('追加に失敗しました')
                }
              }}
            >
              追加
            </Button>
          </Space>
        )
      }
    },
    {
      title: '順序編集',
      key: 'reorder',
      render: (_: any, record: any) => (
        <Button
          onClick={() => {
            const list = assignments
              .filter(a => a.store_id === record.store_id)
              .sort((a, b) => (a.priority || 999) - (b.priority || 999))
            setReorderItems(list.map(a => ({ id: a.id, name: getCompanyName(a.collector_id) })))
            setReorderStoreId(record.store_id)
            setReorderVisible(true)
          }}
          disabled={assignments.filter(a => a.store_id === record.store_id).length === 0}
        >
          並び替え
        </Button>
      ),
      width: 120,
    },
    {
      title: '合計',
      dataIndex: 'total',
      key: 'total',
      render: (v: number) => `${v}/10`,
      width: 100,
    },
  ]

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Title level={4} type="danger">エラーが発生しました</Title>
          <p>{error}</p>
          <Button onClick={fetchData}>再試行</Button>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3} style={{ margin: 0 }}>
            <ShopOutlined /> 店舗-収集業者割り当て管理
          </Title>
          <Space>
            <Button onClick={() => setExcelVisible(true)} loading={excelLoading}>Excel取込</Button>
            <Button onClick={handleExportCsv}>CSV出力（テスト用）</Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              新規作成
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={aggregatedData}
          rowKey="key"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}件`,
          }}
        />
      </Card>

      {/* 作成・編集モーダル */}
      <Modal
        title={editingAssignment ? '割り当て編集' : '割り当て作成'}
        open={modalVisible}
        onCancel={handleCancel}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={(changedValues) => {
            if (changedValues.store_id) {
              setSelectedStoreId(changedValues.store_id)
            }
          }}
        >
          <Form.Item
            name="store_id"
            label="店舗"
            rules={[
              { required: true, message: '店舗を選択してください' },
            ]}
          >
            <Select placeholder="店舗を選択してください">
              {stores.map(store => (
                <Option key={store.id} value={store.id}>
                  {store.name} ({store.store_code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="collector_id"
            label="収集業者（舗名の右に配置想定）"
            rules={[
              { required: true, message: '収集業者を選択してください' },
            ]}
          >
            <Select placeholder="収集業者を選択してください" showSearch optionFilterProp="label" filterOption={(input, option)=> (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}>
              {collectors.map(collector => (
                <Option key={collector.id} value={collector.id} label={collector.company_name || collector.name}>
                  {collector.company_name || collector.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Switch checked={showContact} onChange={setShowContact} />
                <span>店舗連絡情報（電話・郵便・住所）を表示</span>
              </div>
            </Col>
          </Row>

          {showContact && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="店舗電話番号">
                    <Input disabled placeholder="（参照のみ）" value={stores.find(s => s.id === (selectedStoreId || form.getFieldValue('store_id')))?.phone || ''} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="店舗郵便番号">
                    <Input disabled placeholder="（参照のみ）" value={stores.find(s => s.id === (selectedStoreId || form.getFieldValue('store_id')))?.postal_code || ''} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="店舗住所">
                <Input.TextArea disabled rows={2} placeholder="（参照のみ）" 
                  value={(() => {
                    const st = stores.find(s => s.id === (selectedStoreId || form.getFieldValue('store_id')))
                    if (!st) return ''
                    const a1 = st.address1 || ''
                    const a2 = st.address2 ? ` ${st.address2}` : ''
                    return `${a1}${a2}`.trim()
                  })()}
                />
              </Form.Item>
            </>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="優先度"
                rules={[]}
              >
                <InputNumber
                  min={1}
                  max={10}
                  placeholder="未入力の場合は自動採番"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="ステータス"
                rules={[
                  { required: true, message: 'ステータスを選択してください' },
                ]}
                initialValue={true}
              >
                <Select placeholder="ステータスを選択してください">
                  <Option value={true}>アクティブ</Option>
                  <Option value={false}>非アクティブ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={handleCancel}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit">
                {editingAssignment ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Excel取り込みモーダル */}
      <Modal
        title="店舗-収集業者割り当て Excel取込"
        open={excelVisible}
        onCancel={() => {
          setExcelVisible(false)
          setExcelStep(0)
          setExcelFile(null)
          setExcelPreview([])
        }}
        footer={null}
        width={720}
      >
        <Steps current={excelStep} style={{ marginBottom: 16 }}>
          <Steps.Step title="ファイル選択" />
          <Steps.Step title="プレビュー" />
          <Steps.Step title="完了" />
        </Steps>
        <Alert type="info" showIcon message="A:店舗, B:舗名, C以降: 1位→n位の収集業者名" className="mb-4" />
        {/* 開始行を一番上に配置 */}
        <Form layout="inline" style={{ marginBottom: 8 }}>
          <Form.Item label="開始行"><InputNumber min={1} value={mapping.startRow} onChange={(v)=>setMapping({ ...mapping, startRow: Number(v||2) })} /></Form.Item>
        </Form>
        <div style={{ height: 8 }} />
        <Form layout="inline" style={{ marginBottom: 12 }}>
          <Form.Item label="店舗列"><Input style={{ width: 64 }} value={mapping.storeCol} onChange={e=>setMapping({ ...mapping, storeCol: e.target.value.toUpperCase() })} /></Form.Item>
          <Form.Item label="舗名列"><Input style={{ width: 64 }} value={mapping.areaCol} onChange={e=>setMapping({ ...mapping, areaCol: e.target.value.toUpperCase() })} /></Form.Item>
          <Form.Item label="開始列"><Input style={{ width: 64 }} value={mapping.rankStartCol} onChange={e=>setMapping({ ...mapping, rankStartCol: e.target.value.toUpperCase() })} /></Form.Item>
          <Form.Item label="終了列"><Input style={{ width: 64 }} value={mapping.rankEndCol} onChange={e=>setMapping({ ...mapping, rankEndCol: e.target.value.toUpperCase() })} /></Form.Item>
        </Form>
        {excelStep === 0 && (
          <Upload.Dragger
            accept=".xlsx,.xls"
            multiple={false}
            disabled={excelLoading}
            beforeUpload={async (file) => {
              try {
                setExcelLoading(true)
                const buf = await file.arrayBuffer()
                const wb = XLSX.read(buf, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }) as any[][]
                setExcelFile(file)

                const letterToIdx = (ch: string) => ch ? (ch.trim().toUpperCase().charCodeAt(0) - 65) : 0
                const storeIdx = letterToIdx(mapping.storeCol)
                const areaIdx = letterToIdx(mapping.areaCol)
                const start = Math.max(1, mapping.startRow) - 1
                const startRankIdx = letterToIdx(mapping.rankStartCol)
                const endRankIdx = letterToIdx(mapping.rankEndCol)

                const preview: any[] = []
                for (let r = start; r < rows.length; r++) {
                  const row = rows[r]
                  if (!row) continue
                  const storeKeyRaw = row[storeIdx]
                  if (!storeKeyRaw) continue
                  const storeKey = String(storeKeyRaw).trim()
                  const areaName = row[areaIdx] ? String(row[areaIdx]).trim() : undefined
                  const store = stores.find(s => s.store_code === storeKey) || stores.find(s => s.name === storeKey && (!areaName || s.area_name === areaName))
                  const rankLabels: string[] = []
                  const unknown: string[] = []
                  for (let c = startRankIdx; c <= endRankIdx && c < row.length; c++) {
                    const name = row[c]
                    if (!name) continue
                    const label = String(name).trim()
                    const col = collectors.find(col => (col.company_name || col.name) === label)
                    if (col) rankLabels.push(label)
                    else unknown.push(label)
                  }
                  preview.push({ key: r, store_key: storeKey, area: areaName || '', store_found: !!store, ranks: rankLabels, unknown })
                }
                setExcelPreview(preview)
                setExcelStep(1)
              } catch (e) {
                console.error(e)
                message.error('Excel解析に失敗しました')
              } finally {
                setExcelLoading(false)
              }
              return false
            }}
            showUploadList={false}
          >
            <p>ここにExcelファイルをドラッグ&ドロップ、またはクリックして選択</p>
          </Upload.Dragger>
        )}

        {excelStep === 1 && (
          <>
            <Table
              size="small"
              rowKey="key"
              dataSource={excelPreview}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '店舗キー', dataIndex: 'store_key' },
                { title: '舗名', dataIndex: 'area' },
                { title: '店舗一致', dataIndex: 'store_found', render: (v: boolean) => v ? '○' : '×' },
                { title: '割当(プレビュー)', dataIndex: 'ranks', render: (arr: string[]) => (arr || []).join('、 ') },
                { title: '未解決', dataIndex: 'unknown', render: (arr: string[]) => (arr || []).join('、 ') },
              ]}
            />
            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <Space>
                <Button onClick={() => { setExcelStep(0); setExcelPreview([]); setExcelFile(null) }}>戻る</Button>
                <Button type="primary" loading={excelLoading} onClick={async () => {
                  try {
                    setExcelLoading(true)
                    const letterToIdx = (ch: string) => ch ? (ch.trim().toUpperCase().charCodeAt(0) - 65) : 0
                    const storeIdx = letterToIdx(mapping.storeCol)
                    const areaIdx = letterToIdx(mapping.areaCol)
                    const start = Math.max(1, mapping.startRow) - 1
                    const startRankIdx = letterToIdx(mapping.rankStartCol)
                    const endRankIdx = letterToIdx(mapping.rankEndCol)

                    if (!excelFile) return
                    const buf = await excelFile.arrayBuffer()
                    const wb = XLSX.read(buf, { type: 'array' })
                    const ws = wb.Sheets[wb.SheetNames[0]]
                    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 }) as any[][]

                    for (let r = start; r < rows.length; r++) {
                      const row = rows[r]
                      if (!row) continue
                      const storeKeyRaw = row[storeIdx]
                      if (!storeKeyRaw) continue
                      const storeKey = String(storeKeyRaw).trim()
                      const areaName = row[areaIdx] ? String(row[areaIdx]).trim() : undefined
                      const store = stores.find(s => s.store_code === storeKey) || stores.find(s => s.name === storeKey && (!areaName || s.area_name === areaName))
                      if (!store) continue
                      const current = assignments.filter(a => a.store_id === store.id)
                      const idMap = new Map(current.map(a => [a.collector_id, a]))
                      for (let c = startRankIdx; c <= endRankIdx && c < row.length; c++) {
                        const name = row[c]
                        if (!name) continue
                        const label = String(name).trim()
                        const col = collectors.find(col => (col.company_name || col.name) === label)
                        if (!col) continue
                        const rank = (c - startRankIdx) + 1
                        const existing = idMap.get(col.id)
                        if (existing) {
                          if ((existing.priority || 999) !== rank) {
                            await StoreCollectorAssignmentRepository.update(existing.id, { priority: rank } as any)
                          }
                        } else {
                          await StoreCollectorAssignmentRepository.create({ org_id: getOrgId(), store_id: store.id, collector_id: col.id, priority: rank, is_active: true } as any)
                        }
                      }
                    }
                    setExcelStep(2)
                    message.success('取り込みが完了しました')
                    fetchData()
                  } catch (e) {
                    console.error(e)
                    message.error('取り込みに失敗しました')
                  } finally {
                    setExcelLoading(false)
                  }
                }}>取り込み実行</Button>
              </Space>
            </div>
          </>
        )}

        {excelStep === 2 && (
          <Alert type="success" showIcon message="Excel取り込みが完了しました" />
        )}
      </Modal>

      {/* 優先順位 並び替えモーダル */}
      <Modal
        title="優先順位の並び替え"
        open={reorderVisible}
        onCancel={() => setReorderVisible(false)}
        onOk={async () => {
          try {
            if (!reorderStoreId) return
            // 保存: 上から1..nのpriorityを付与
            for (let i = 0; i < reorderItems.length; i++) {
              const assignmentId = reorderItems[i].id
              await StoreCollectorAssignmentRepository.update(assignmentId, { priority: i + 1 } as any)
            }
            message.success('優先順位を更新しました')
            setReorderVisible(false)
            await fetchData()
          } catch (e) {
            console.error(e)
            message.error('優先順位の更新に失敗しました')
          }
        }}
        okText="保存"
        width={500}
      >
        {reorderItems.length === 0 ? (
          <Alert type="info" message="この店舗には割り当てがありません" />
        ) : (
          <div>
            {reorderItems.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ width: 24, textAlign: 'right' }}>{idx + 1}</span>
                <Input value={item.name} disabled />
                <Space>
                  <Button size="small" disabled={idx === 0} onClick={() => {
                    if (idx === 0) return
                    const next = [...reorderItems]
                    const tmp = next[idx - 1]
                    next[idx - 1] = next[idx]
                    next[idx] = tmp
                    setReorderItems(next)
                  }}>↑</Button>
                  <Button size="small" disabled={idx === reorderItems.length - 1} onClick={() => {
                    if (idx === reorderItems.length - 1) return
                    const next = [...reorderItems]
                    const tmp = next[idx + 1]
                    next[idx + 1] = next[idx]
                    next[idx] = tmp
                    setReorderItems(next)
                  }}>↓</Button>
                </Space>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default StoreCollectorAssignments

import React, { useState, useEffect } from 'react'
import { 
  Card, Button, Space, Typography, Alert, Row, Col, 
  Statistic, message, Popconfirm, Table, Upload
} from 'antd'
import { 
  PlusOutlined, DeleteOutlined, DatabaseOutlined, UploadOutlined
} from '@ant-design/icons'
import { BulkStoreCollectorImporter } from '@/utils/bulk-store-collector-importer'
import { TestDataManager } from '@/utils/test-data-manager'
import { StoreRepository } from '@/modules/stores/repository'
import { UserRepository } from '@/modules/users/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import * as XLSX from 'xlsx'
import { getOrgId } from '@/utils/data-backend'

const { Title, Text } = Typography

const TestDataManagement: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    stores: 0,
    collectors: 0,
    assignments: 0,
    requests: 0
  })
  const [recentCreated, setRecentCreated] = useState<any[]>([])
  const [excelStores, setExcelStores] = useState<Array<{ store_code: string; area_manager_code?: string; name: string; area_name?: string }>>([])

  const importer = new BulkStoreCollectorImporter()

  // 統計データを取得
  const fetchStats = async () => {
    try {
      const [allStores, allUsers, assignments, requests] = await Promise.all([
        StoreRepository.findMany(),
        UserRepository.findMany(),
        StoreCollectorAssignmentRepository.findMany(),
        CollectionRequestRepository.findMany()
      ])
      
      // 管理店舗マスター（is_managed=true）のみをカウント
      const managedStores = allStores.filter(store => store.is_managed)
      // 収集業者（role=COLLECTOR）のみをカウント
      const collectors = allUsers.filter(user => user.role === 'COLLECTOR')
      
      setStats({
        stores: managedStores.length,
        collectors: collectors.length,
        assignments: assignments.length,
        requests: requests.length
      })
    } catch (error) {
      console.error('統計データ取得エラー:', error)
    }
  }

  // コンポーネントマウント時に統計データを取得
  useEffect(() => {
    fetchStats()
  }, [])

  // 一括データ作成
  const handleCreateTestData = async () => {
    try {
      setLoading(true)
      
      const testDataManager = new TestDataManager()
      await testDataManager.createBulkTestData(excelStores)
      
      message.success('テストデータを作成しました。店舗: 30件、収集業者: 30件、アサインメント: 30件、廃棄依頼案件: 30件')
      await fetchStats()
    } catch (error) {
      console.error('テストデータ作成エラー:', error)
      message.error(`テストデータの作成に失敗しました: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // Excel(A:D) から拠点（店舗）基本情報を読み込み
  const beforeUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1, raw: false }) as any[][]
      // 1行目: 見出し想定 -> 2行目以降
      const rows = json.slice(1)
      const stores = rows
        .filter(r => r && (r[0] || r[2]))
        .map(r => ({
          store_code: String(r[0] ?? '').trim(),
          area_manager_code: r[1] ? String(r[1]).trim() : undefined,
          name: String(r[2] ?? '').trim(),
          area_name: r[3] ? String(r[3]).trim() : undefined,
        }))
        .filter(s => s.store_code && s.name)
      setExcelStores(stores)
      message.success(`拠点Excelを読み込みました（${stores.length}件）`)
    } catch (e) {
      console.error(e)
      message.error('拠点Excelの読み込みに失敗しました')
    }
    return false // アップロードは行わない（ローカル解析のみ）
  }

  // デモ収集業者用廃棄依頼案件作成
  const handleCreateDemoRequests = async () => {
    try {
      setLoading(true)
      
      // 既存の廃棄依頼案件を削除
      const existingRequests = await CollectionRequestRepository.findMany()
      for (const request of existingRequests) {
        await CollectionRequestRepository.delete(request.id)
      }
      
      // 収集業者を取得し、デモ収集業者を優先選択（なければ作成）
      const allUsers = await UserRepository.findMany()
      const collectors = allUsers.filter(u => u.role === 'COLLECTOR')
      let demoCollector = collectors.find(c => c.email === 'demo@collector.com' || c.name === 'デモ収集業者' || c.company_name === 'デモ収集業者')
      if (!demoCollector) {
        demoCollector = await UserRepository.create({
          org_id: getOrgId(),
          email: 'demo@collector.com',
          name: 'デモ収集業者',
          role: 'COLLECTOR',
          is_active: true,
          company_name: 'デモ収集業者',
          contact_person: 'デモ担当',
          phone: '000-0000-0000',
          address: '東京都',
          license_number: 'DEMO001',
          service_areas: [],
        } as any)
      }
      if (collectors.length === 0 && !demoCollector) {
        message.error('収集業者が見つかりません。先にテストデータを作成してください。')
        return
      }
      
      // 店舗を取得
      const stores = await StoreRepository.findMany()
      if (stores.length === 0) {
        message.error('店舗データが見つかりません。先にテストデータを作成してください。')
        return
      }
      
      // 廃棄物種別マスターを取得
      const wasteTypes = await WasteTypeMasterRepository.findMany()
      if (wasteTypes.length === 0) {
        message.error('廃棄物種別マスターが見つかりません。先にテストデータを作成してください。')
        return
      }
      
      console.log('Using demo collector for request creation:', demoCollector)
      const requests = []
      const statuses = ['PENDING', 'APPROVED', 'IN_PROGRESS']
      const priorities = ['HIGH', 'MEDIUM', 'LOW']
      
      // デモ収集業者の担当割り当て（なければ作成）
      const existingAssignments = await StoreCollectorAssignmentRepository.findMany()
      for (let i = 1; i <= 10; i++) {
        const store = stores[i - 1]
        const wasteType = wasteTypes[i % wasteTypes.length]
        const hasAssignment = existingAssignments.some(a => a.store_id === store.id && a.collector_id === demoCollector.id)
        if (!hasAssignment) {
          await StoreCollectorAssignmentRepository.create({
            org_id: getOrgId(),
            store_id: store.id,
            collector_id: demoCollector.id,
            priority: 1,
            is_active: true,
            created_by: 'system',
            updated_by: 'system',
          } as any)
        }
        
        const request = {
          org_id: getOrgId(),
          store_id: store.id,
          collector_id: demoCollector.id,
          waste_type_id: wasteType.id,
          main_items: [
            {
              item_name: '混載物',
              quantity: Math.floor(Math.random() * 10) + 1,
              unit: '袋'
            },
            {
              item_name: '蛍光灯',
              quantity: Math.floor(Math.random() * 5) + 1,
              unit: '本'
            }
          ],
          other_items: [
            {
              item_name: 'その他廃棄物',
              description: `デモ収集業者用テスト廃棄物 ${i}`
            }
          ],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          notes: `デモ収集業者用テスト案件 ${i}`,
          requested_at: new Date().toISOString(),
          scheduled_collection_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_by: 'system',
          updated_by: 'system'
        }
        requests.push(request)
      }
      
      // 廃棄依頼案件を保存
      const created: any[] = []
      for (const request of requests) {
        const r = await CollectionRequestRepository.create(request)
        created.push(r)
      }
      
      message.success(`デモ収集業者用廃棄依頼案件 ${requests.length} 件を作成しました`)
      // 直近作成一覧（画面表示用）
      const [storeList, userList] = await Promise.all([
        StoreRepository.findMany(),
        UserRepository.findMany(),
      ])
      const list = created.map(r => {
        const store = storeList.find(s => s.id === r.store_id)
        const collector = userList.find(u => u.id === r.collector_id)
        return {
          id: r.id,
          store_name: store ? `${store.name} (${store.store_code})` : r.store_id,
          collector_name: collector ? (collector.company_name || collector.name) : r.collector_id,
          status: r.status,
          requested_at: r.requested_at || r.created_at,
        }
      })
      console.table(list)
      setRecentCreated(list)
      await fetchStats()
    } catch (error) {
      console.error('デモ収集業者用廃棄依頼案件作成エラー:', error)
      message.error(`デモ収集業者用廃棄依頼案件の作成に失敗しました: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  // データベースリセット
  const handleReset = async () => {
    try {
      setLoading(true)
      await importer.resetDatabase()
      message.success('テストデータを削除しました')
      await fetchStats()
    } catch (error) {
      console.error('リセットエラー:', error)
      message.error(`リセットに失敗しました: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="mb-0">
          テストデータ管理
        </Title>
      </div>

      {/* 統計カード */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="登録店舗数"
              value={stats.stores}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="登録収集業者数"
              value={stats.collectors}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="アサインメント数"
              value={stats.assignments}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="廃棄依頼案件数"
              value={stats.requests}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作ボタン */}
      <Card title="テストデータ操作" className="mb-6">
        <Space size="large" wrap>
          <Upload beforeUpload={beforeUpload} showUploadList={false} accept=".xlsx,.xls">
            <Button icon={<UploadOutlined />}>
              管理店舗（A:D）Excel読み込み
            </Button>
          </Upload>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateTestData}
            loading={loading}
            size="large"
          >
            一括データ作成
          </Button>
          
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={handleCreateDemoRequests}
            loading={loading}
            size="large"
          >
            デモ収集業者用廃棄依頼案件作成
          </Button>
          
          <Popconfirm
            title="テストデータ削除"
            description="すべてのテストデータを削除します。よろしいですか？"
            onConfirm={handleReset}
            okText="はい"
            cancelText="いいえ"
          >
            <Button 
              danger
              icon={<DeleteOutlined />}
              loading={loading}
              size="large"
            >
              一括データ削除
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      {/* 直近作成リスト */}
      {recentCreated.length > 0 && (
        <Card title="直近作成（デモ収集業者用・最新10件）" className="mb-6">
          <Table
            size="small"
            rowKey="id"
            dataSource={recentCreated}
            pagination={false}
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id' },
              { title: '店舗', dataIndex: 'store_name', key: 'store_name' },
              { title: '収集業者', dataIndex: 'collector_name', key: 'collector_name' },
              { title: 'Status', dataIndex: 'status', key: 'status' },
              { title: 'Requested At', dataIndex: 'requested_at', key: 'requested_at' },
            ]}
          />
        </Card>
      )}

      {/* 説明 */}
      <Card title="使用方法" size="small">
        <Alert
          message="テストデータ管理"
          description="この機能は開発・テスト用のサンプルデータを一括で作成・削除する機能です。実際の業務データの取り込みには「廃棄依頼管理一覧」のエクセル取り込み機能を使用してください。"
          type="info"
          showIcon
          className="mb-4"
        />
        
        <div>
          <Text strong>作成されるテストデータ:</Text>
          <ul className="mt-2">
            <li>30店舗（東京都、神奈川県、埼玉県、千葉県、茨城県、栃木県、群馬県、山梨県）</li>
            <li>30収集業者（様々な業種名と会社名）</li>
            <li>30アサインメント（店舗と収集業者の組み合わせ）</li>
            <li>30廃棄依頼案件（各店舗に1件ずつ）</li>
            <li>店舗番号: ST001〜ST030</li>
            <li>エリア長コード: 10000001〜10000030</li>
            <li>優先度: 1〜10（ランダム割り当て）</li>
          </ul>
          
          <Text strong className="mt-4 block">デモ収集業者用廃棄依頼案件作成:</Text>
          <ul className="mt-2">
            <li>既存の廃棄依頼案件を削除</li>
            <li>最初の収集業者（デモ収集業者）に10件の案件を割り当て</li>
            <li>様々なステータス（PENDING、APPROVED、IN_PROGRESS）</li>
            <li>様々な優先度（HIGH、MEDIUM、LOW）</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}

export default TestDataManagement
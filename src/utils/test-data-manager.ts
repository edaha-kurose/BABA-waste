import { TestDataGenerator } from './test-data-generator'
import { organizationRepository as OrganizationRepository } from '@/modules/organizations/repository'
import { UserRepository } from '@/modules/users/repository'
import { StoreRepository } from '@/modules/stores/repository'
import { CollectorRepository } from '@/modules/collectors/repository'
import { StoreCollectorAssignmentRepository } from '@/modules/store-collector-assignments/repository'
import { CollectionRequestRepository } from '@/modules/collection-requests/repository'
import { CollectionRepository } from '@/modules/collections/repository'
import { PlanRepository } from '@/modules/plans/repository'
import { ItemMapRepository } from '@/modules/item-maps/repository'
import { JwnetWasteCodeRepository } from '@/modules/jwnet-waste-codes/repository'
import { WasteTypeMasterRepository } from '@/modules/waste-type-masters/repository'
import { JwnetReservationRepository } from '@/modules/jwnet-reservations/repository'
import { JwnetRegistrationRepository } from '@/modules/jwnet-registrations/repository'
import { db } from './dexie-db'

// ============================================================================
// テストデータ管理クラス
// ============================================================================

export class TestDataManager {
  private generator: TestDataGenerator
  private orgId: string

  constructor(orgId: string = 'default-org') {
    this.orgId = orgId
    this.generator = new TestDataGenerator(orgId)
  }

  // ============================================================================
  // データリセット
  // ============================================================================

  async clearAllData(): Promise<void> {
    console.log('すべてのテストデータを削除しています...')
    
    try {
      // 各リポジトリからデータを削除（依存関係の逆順）
      await this.clearJwnetRegistrations()
      await this.clearJwnetReservations()
      await this.clearCollections()
      await this.clearCollectionRequests()
      await this.clearPlans()
      await this.clearWasteTypeMasters()
      await this.clearJwnetWasteCodes()
      await this.clearItemMaps()
      await this.clearStoreCollectorAssignments()
      await this.clearStores()
      await this.clearCollectors()
      await this.clearUsers()
      await this.clearOrganization()
      
      // データベースを完全にクリア
      await this.clearDatabase()
      
      console.log('すべてのテストデータを削除しました')
    } catch (error) {
      console.error('データ削除中にエラーが発生しました:', error)
      throw error
    }
  }

  private async clearJwnetRegistrations(): Promise<void> {
    const registrations = await JwnetRegistrationRepository.findMany()
    for (const registration of registrations) {
      await JwnetRegistrationRepository.delete(registration.id)
    }
  }

  private async clearJwnetReservations(): Promise<void> {
    const reservations = await JwnetReservationRepository.findMany()
    for (const reservation of reservations) {
      await JwnetReservationRepository.delete(reservation.id)
    }
  }

  private async clearCollections(): Promise<void> {
    const collections = await CollectionRepository.findMany()
    for (const collection of collections) {
      await CollectionRepository.delete(collection.id)
    }
  }

  private async clearCollectionRequests(): Promise<void> {
    const requests = await CollectionRequestRepository.findMany()
    for (const request of requests) {
      await CollectionRequestRepository.delete(request.id)
    }
  }

  private async clearPlans(): Promise<void> {
    const plans = await PlanRepository.findMany()
    for (const plan of plans) {
      await PlanRepository.delete(plan.id)
    }
  }

  private async clearWasteTypeMasters(): Promise<void> {
    const wasteTypeMasters = await WasteTypeMasterRepository.findMany()
    for (const wasteTypeMaster of wasteTypeMasters) {
      await WasteTypeMasterRepository.delete(wasteTypeMaster.id)
    }
  }

  private async clearJwnetWasteCodes(): Promise<void> {
    const wasteCodes = await JwnetWasteCodeRepository.findMany()
    for (const wasteCode of wasteCodes) {
      await JwnetWasteCodeRepository.delete(wasteCode.id)
    }
  }

  private async clearItemMaps(): Promise<void> {
    const itemMaps = await ItemMapRepository.findMany()
    for (const itemMap of itemMaps) {
      await ItemMapRepository.delete(itemMap.id)
    }
  }

  private async clearStoreCollectorAssignments(): Promise<void> {
    const assignments = await StoreCollectorAssignmentRepository.findMany()
    for (const assignment of assignments) {
      await StoreCollectorAssignmentRepository.delete(assignment.id)
    }
  }

  private async clearStores(): Promise<void> {
    const stores = await StoreRepository.findMany()
    for (const store of stores) {
      await StoreRepository.delete(store.id)
    }
  }

  private async clearCollectors(): Promise<void> {
    const collectors = await CollectorRepository.findMany()
    for (const collector of collectors) {
      await CollectorRepository.delete(collector.id)
    }
  }

  private async clearUsers(): Promise<void> {
    const users = await UserRepository.findMany()
    for (const user of users) {
      await UserRepository.delete(user.id)
    }
  }

  private async clearOrganization(): Promise<void> {
    const organizations = await OrganizationRepository.findMany()
    for (const organization of organizations) {
      await OrganizationRepository.delete(organization.id)
    }
  }

  private async clearDatabase(): Promise<void> {
    try {
      // Dexieデータベースを完全にクリア
      await db.transaction('rw', db.users, db.stores, db.collectionRequests, db.storeCollectorAssignments, db.wasteTypeMasters, db.organizations, async () => {
        await db.users.clear()
        await db.stores.clear()
        await db.collectionRequests.clear()
        await db.storeCollectorAssignments.clear()
        await db.wasteTypeMasters.clear()
        await db.organizations.clear()
      })
    } catch (error) {
      console.warn('データベースクリアでエラーが発生しました:', error)
    }
  }

  // ============================================================================
  // データ登録
  // ============================================================================

  async generateAndSaveTestData(): Promise<void> {
    console.log('テストデータを生成・保存しています...')
    
    try {
      // 既存データをクリア
      await this.clearAllData()
      
      // 新しいテストデータを生成（非同期対応）
      const testData = await this.generator.generateAllTestData()
      
      // データを保存（依存関係の順序で）
      await this.saveOrganization(testData.organization)
      await this.saveUsers(testData.users)
      await this.saveStores(testData.stores)
      await this.saveCollectors(testData.collectors)
      await this.saveStoreCollectorAssignments(testData.assignments)
      await this.saveJwnetWasteCodes(testData.jwnetWasteCodes)
      await this.saveWasteTypeMasters(testData.wasteTypeMasters)
      await this.saveItemMaps(testData.itemMaps)
      await this.savePlans(testData.plans)
      await this.saveCollectionRequests(testData.requests)
      await this.saveCollections(testData.collections)
      await this.saveJwnetReservations(testData.jwnetReservations)
      await this.saveJwnetRegistrations(testData.jwnetRegistrations)
      
      console.log('テストデータの生成・保存が完了しました')
    } catch (error) {
      console.error('テストデータ生成中にエラーが発生しました:', error)
      throw error
    }
  }

  private async saveOrganization(organization: any): Promise<void> {
    if (organization) {
      try {
        // 既存データをチェックしてから作成
        const existing = await OrganizationRepository.findById(organization.id)
        if (!existing) {
          await OrganizationRepository.create(organization)
        }
      } catch (error) {
        console.warn(`組織の作成をスキップしました (ID: ${organization.id}):`, error)
      }
    }
  }

  private async saveUsers(users: any[]): Promise<void> {
    for (const user of users) {
      try {
        // 既存データをチェックしてから作成
        const existing = await UserRepository.findById(user.id)
        if (!existing) {
          await UserRepository.create(user)
        }
      } catch (error) {
        console.warn(`ユーザーの作成をスキップしました (ID: ${user.id}):`, error)
      }
    }
  }

  private async saveStores(stores: any[]): Promise<void> {
    for (const store of stores) {
      try {
        // 既存データをチェックしてから作成
        const existing = await StoreRepository.findById(store.id)
        if (!existing) {
          await StoreRepository.create(store)
        }
      } catch (error) {
        console.warn(`店舗の作成をスキップしました (ID: ${store.id}):`, error)
      }
    }
  }

  private async saveCollectors(collectors: any[]): Promise<void> {
    for (const collector of collectors) {
      try {
        // 既存データをチェックしてから作成
        const existing = await UserRepository.findById(collector.id)
        if (!existing) {
          await UserRepository.create(collector)
        }
      } catch (error) {
        console.warn(`収集業者の作成をスキップしました (ID: ${collector.id}):`, error)
      }
    }
  }

  private async saveStoreCollectorAssignments(assignments: any[]): Promise<void> {
    for (const assignment of assignments) {
      try {
        // 既存データをチェックしてから作成
        const existing = await StoreCollectorAssignmentRepository.findById(assignment.id)
        if (!existing) {
          await StoreCollectorAssignmentRepository.create(assignment)
        }
      } catch (error) {
        console.warn(`店舗収集業者割り当ての作成をスキップしました (ID: ${assignment.id}):`, error)
      }
    }
  }

  private async saveJwnetWasteCodes(wasteCodes: any[]): Promise<void> {
    for (const wasteCode of wasteCodes) {
      await JwnetWasteCodeRepository.create(wasteCode)
    }
  }

  private async saveWasteTypeMasters(wasteTypeMasters: any[]): Promise<void> {
    for (const wasteTypeMaster of wasteTypeMasters) {
      try {
        // 既存データをチェックしてから作成
        const existing = await WasteTypeMasterRepository.findById(wasteTypeMaster.id)
        if (!existing) {
          await WasteTypeMasterRepository.create(wasteTypeMaster)
        }
      } catch (error) {
        console.warn(`廃棄物種別マスターの作成をスキップしました (ID: ${wasteTypeMaster.id}):`, error)
      }
    }
  }

  private async saveItemMaps(itemMaps: any[]): Promise<void> {
    for (const itemMap of itemMaps) {
      await ItemMapRepository.create(itemMap)
    }
  }

  private async savePlans(plans: any[]): Promise<void> {
    for (const plan of plans) {
      await PlanRepository.create(plan)
    }
  }

  private async saveCollectionRequests(requests: any[]): Promise<void> {
    for (const request of requests) {
      try {
        // 既存データをチェックしてから作成
        const existing = await CollectionRequestRepository.findById(request.id)
        if (!existing) {
          await CollectionRequestRepository.create(request)
        }
      } catch (error) {
        console.warn(`廃棄依頼案件の作成をスキップしました (ID: ${request.id}):`, error)
      }
    }
  }

  private async saveCollections(collections: any[]): Promise<void> {
    for (const collection of collections) {
      await CollectionRepository.create(collection)
    }
  }

  private async saveJwnetReservations(reservations: any[]): Promise<void> {
    for (const reservation of reservations) {
      await JwnetReservationRepository.create(reservation)
    }
  }

  private async saveJwnetRegistrations(registrations: any[]): Promise<void> {
    for (const registration of registrations) {
      await JwnetRegistrationRepository.create(registration)
    }
  }

  // ============================================================================
  // デモ収集業者用廃棄依頼案件作成
  // ============================================================================

  async createDemoCollectorRequests(): Promise<void> {
    console.log('デモ収集業者用廃棄依頼案件を作成しています...')
    
    try {
      // デモ収集業者を取得
      const collectors = await UserRepository.findMany({ role: 'COLLECTOR' })
      if (collectors.length === 0) {
        throw new Error('デモ収集業者が見つかりません。先にテストデータを作成してください。')
      }

      // 店舗を取得
      const stores = await StoreRepository.findMany()
      if (stores.length === 0) {
        throw new Error('店舗データが見つかりません。先にテストデータを作成してください。')
      }

      // 廃棄物種別マスターを取得
      const wasteTypes = await WasteTypeMasterRepository.findMany()
      if (wasteTypes.length === 0) {
        throw new Error('廃棄物種別マスターが見つかりません。先にテストデータを作成してください。')
      }

      // 店舗-収集業者割り当てを取得
      const assignments = await StoreCollectorAssignmentRepository.findMany()
      if (assignments.length === 0) {
        throw new Error('店舗-収集業者割り当てが見つかりません。先にテストデータを作成してください。')
      }

      // デモ収集業者に割り当てられた店舗を取得（メール/名前一致を優先）
      const demoCollector =
        collectors.find(c => c.email === 'demo@collector.com' || c.name === 'デモ収集業者')
        || collectors[0]
      const assignedStores = assignments
        .filter(assignment => assignment.collector_id === demoCollector.id)
        .map(assignment => stores.find(store => store.id === assignment.store_id))
        .filter(store => store !== undefined)

      if (assignedStores.length === 0) {
        throw new Error('デモ収集業者に割り当てられた店舗が見つかりません。')
      }

      // 10件の廃棄依頼案件を作成
      const requests = []
      for (let i = 0; i < 10; i++) {
        const store = assignedStores[i % assignedStores.length]
        const wasteType = wasteTypes[i % wasteTypes.length]
        
        const request = {
          org_id: this.orgId,
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
              description: `テスト用廃棄物 ${i + 1}`
            }
          ],
          status: 'PENDING',
          priority: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
          notes: `デモ収集業者用テスト案件 ${i + 1}`,
          requested_at: new Date().toISOString(),
          scheduled_collection_date: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
        requests.push(request)
      }

      // 廃棄依頼案件を保存
      await this.saveCollectionRequests(requests)
      
      console.log(`デモ収集業者用廃棄依頼案件 ${requests.length} 件を作成しました。`)
    } catch (error) {
      console.error('デモ収集業者用廃棄依頼案件の作成に失敗しました:', error)
      throw error
    }
  }

  // ============================================================================
  // 一括データ作成（店舗・収集業者・依頼案件を含む）
  // ============================================================================

  async createBulkTestData(overrideStores?: Array<{ store_code: string; area_manager_code?: string; name: string; area_name?: string }>): Promise<void> {
    console.log('一括テストデータを作成しています...')
    
    try {
      // 既存データをクリア
      await this.clearAllData()
      
      // 組織を作成
      const organization = {
        id: this.orgId,
        name: 'テスト組織',
        description: 'テスト用の組織',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'system',
        updated_by: 'system'
      }
      await this.saveOrganization(organization)

      // 住所等で利用する都県一覧（収集業者の住所作成にも利用）
      const prefectures = ['東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県', '山梨県']

      // 店舗を作成（Excel指定があればそれを優先）
      const stores: any[] = []
      if (overrideStores && overrideStores.length > 0) {
        // ExcelのA:D列からの取り込み（A:店舗番号, B:エリア長コード, C:店舗名, D:舗名）
        for (let i = 0; i < overrideStores.length; i++) {
          const row = overrideStores[i]
          const storeCreate = {
            org_id: this.orgId,
            store_code: String(row.store_code).trim(),
            area_manager_code: row.area_manager_code ? String(row.area_manager_code).trim() : undefined,
            name: String(row.name).trim(),
            area_name: row.area_name ? String(row.area_name).trim() : undefined,
            is_managed: true,
            is_active: true,
          }
          const created = await StoreRepository.create(storeCreate as any)
          stores.push(created)
        }
      } else {
        // 既存のダミー30店舗を生成
        const storeTypes = ['店舗', '支店', '営業所', '工場', '倉庫', 'オフィス']
        
        for (let i = 1; i <= 30; i++) {
          const prefecture = prefectures[i % prefectures.length]
          const storeType = storeTypes[i % storeTypes.length]
          const storeNum = String(i).padStart(3, '0')
          
          const store = {
            id: `store-${i}`,
            org_id: this.orgId,
            store_code: `ST${storeNum}`,
            area_manager_code: String(10000000 + i).padStart(8, '0'),
            name: `テスト${storeType}${i}`,
            area_name: prefecture,
            phone: `0${3 + (i % 7)}-${String(1000 + i).slice(-4)}-${String(1000 + i * 2).slice(-4)}`,
            postal_code: `${100 + (i % 900)}-${String(1000 + i).slice(-4)}`,
            address1: `${prefecture}${['区', '市', '町'][i % 3]}${['中央', '西', '東', '南', '北'][i % 5]}${i}丁目`,
            address2: `${i}-${i}-${i}`,
            is_managed: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'system',
            updated_by: 'system'
          }
          stores.push(store)
        }
        await this.saveStores(stores)
      }

      // 30収集業者を作成
      const collectors = []
      const collectorTypes = ['収集', 'リサイクル', '廃棄物', '環境', 'クリーン', 'エコ']
      const lastNames = ['田中', '佐藤', '鈴木', '高橋', '渡辺', '伊藤', '山田', '中村', '小林', '加藤']
      
      for (let i = 1; i <= 30; i++) {
        const collectorType = collectorTypes[i % collectorTypes.length]
        const lastName = lastNames[i % lastNames.length]
        const collectorNum = String(i).padStart(3, '0')
        
        const collector = {
          id: `collector-${i}`,
          org_id: this.orgId,
          email: `collector${collectorNum}@example.com`,
          name: `${lastName}${collectorType}`,
          role: 'COLLECTOR',
          company_name: `${lastName}${collectorType}株式会社`,
          contact_person: `${lastName}${collectorType}`,
          phone: `0${3 + (i % 7)}-${String(2000 + i).slice(-4)}-${String(2000 + i * 3).slice(-4)}`,
          address: `${prefectures[i % prefectures.length]}${['区', '市', '町'][i % 3]}${['中央', '西', '東', '南', '北'][i % 5]}${i + 10}丁目${i + 10}-${i + 10}-${i + 10}`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          updated_by: 'system'
        }
        collectors.push(collector)
      }
      await this.saveCollectors(collectors)

      // 店舗-収集業者割り当てを作成（収集業者が少ない場合はローテーション）
      const assignments = []
      for (let i = 0; i < stores.length; i++) {
        const targetCollector = collectors[i % collectors.length]
        const assignment = {
          id: `assignment-${i + 1}`,
          org_id: this.orgId,
          store_id: stores[i].id,
          collector_id: targetCollector.id,
          priority: (i % 10) + 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          updated_by: 'system'
        }
        assignments.push(assignment)
      }
      await this.saveStoreCollectorAssignments(assignments)

      // 廃棄物種別マスターを作成
      const wasteTypes = [
        { name: '一般廃棄物', description: '一般廃棄物の種別' },
        { name: '産業廃棄物', description: '産業廃棄物の種別' },
        { name: '有害廃棄物', description: '有害廃棄物の種別' },
        { name: 'リサイクル可能物', description: 'リサイクル可能な廃棄物' },
        { name: '大型廃棄物', description: '大型廃棄物の種別' }
      ]
      
      const wasteTypeMasters = []
      for (let i = 0; i < wasteTypes.length; i++) {
        const wasteType = {
          id: `waste-type-bulk-${i + 1}-${Date.now()}`,
          org_id: this.orgId,
          name: wasteTypes[i].name,
          description: wasteTypes[i].description,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          updated_by: 'system'
        }
        wasteTypeMasters.push(wasteType)
      }
      await this.saveWasteTypeMasters(wasteTypeMasters)

      // 廃棄依頼案件を作成（最大30件。最初の10件はデモ収集業者に割り当て）
      const requests = []
      const statuses = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED']
      const priorities = ['HIGH', 'MEDIUM', 'LOW']
      const demoCollector = collectors[0] // デモ収集業者
      const requestCount = Math.min(30, stores.length)
      
      for (let i = 1; i <= requestCount; i++) {
        const store = stores[i - 1]
        // 最初の10件はデモ収集業者に割り当て、それ以外はローテーション
        const collector = i <= 10 ? demoCollector : collectors[(i - 1) % collectors.length]
        const wasteType = wasteTypeMasters[i % wasteTypeMasters.length]
        
        const request = {
          id: `request-${i}`,
          org_id: this.orgId,
          store_id: store.id,
          collector_id: collector.id,
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
              description: `テスト用廃棄物 ${i}`
            }
          ],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          notes: i <= 10 ? `デモ収集業者用テスト案件 ${i}` : `テスト案件 ${i}`,
          requested_at: new Date().toISOString(),
          scheduled_collection_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          updated_by: 'system'
        }
        requests.push(request)
      }
      await this.saveCollectionRequests(requests)

      console.log('一括テストデータの作成が完了しました')
      console.log(`- 店舗: ${stores.length}件`)
      console.log(`- 収集業者: ${collectors.length}件`)
      console.log(`- 割り当て: ${assignments.length}件`)
      console.log(`- 廃棄依頼案件: ${requests.length}件`)
      
    } catch (error) {
      console.error('一括テストデータの作成に失敗しました:', error)
      throw error
    }
  }

  // ============================================================================
  // データ統計
  // ============================================================================

  async getDataStatistics(): Promise<Record<string, number>> {
    try {
      const [
        organizations,
        users,
        stores,
        // collectorsは統合されたusersテーブルで管理
        assignments,
        wasteCodes,
        wasteTypeMasters,
        itemMaps,
        plans,
        requests,
        collections,
        reservations,
        registrations
      ] = await Promise.all([
        OrganizationRepository.findMany(),
        UserRepository.findMany(),
        StoreRepository.findMany(),
        // CollectorRepository.findMany(), // 統合されたusersテーブルで管理
        StoreCollectorAssignmentRepository.findMany(),
        JwnetWasteCodeRepository.findMany(),
        WasteTypeMasterRepository.findMany(),
        ItemMapRepository.findMany(),
        PlanRepository.findMany(),
        CollectionRequestRepository.findMany(),
        CollectionRepository.findMany(),
        JwnetReservationRepository.findMany(),
        JwnetRegistrationRepository.findMany()
      ])

      return {
        organizations: organizations.length,
        users: users.length,
        stores: stores.length,
        collectors: users.filter(u => u.role === 'COLLECTOR').length,
        assignments: assignments.length,
        wasteCodes: wasteCodes.length,
        wasteTypeMasters: wasteTypeMasters.length,
        itemMaps: itemMaps.length,
        plans: plans.length,
        requests: requests.length,
        collections: collections.length,
        reservations: reservations.length,
        registrations: registrations.length
      }
    } catch (error) {
      console.error('データ統計取得中にエラーが発生しました:', error)
      throw error
    }
  }

  // ============================================================================
  // デモシナリオ
  // ============================================================================

  async generateDemoScenario(): Promise<void> {
    console.log('デモシナリオ用のテストデータを生成しています...')
    
    // 基本的なテストデータを生成
    await this.generateAndSaveTestData()
    
    // デモ用の追加設定
    await this.setupDemoScenario()
    
    console.log('デモシナリオの準備が完了しました')
  }

  private async setupDemoScenario(): Promise<void> {
    // デモ用の特別な設定をここに追加
    // 例：特定の店舗に特定の収集業者を割り当てるなど
    console.log('デモシナリオの設定を適用しています...')
  }
}

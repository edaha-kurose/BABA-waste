import { 
  Organization, User, Store, StoreCollectorAssignment, 
  CollectionRequest, Collection, Plan, ItemMap, JwnetWasteCode, 
  WasteTypeMaster, JwnetReservation, JwnetRegistration,
  AppRole, Unit, CollectionRequestStatus, CollectionStatus, JwnetStatus
} from '@contracts/v0/schema'
import CsvStoreParser from './csv-store-parser'

// ============================================================================
// テストデータ生成器
// ============================================================================

export class TestDataGenerator {
  private orgId: string
  private currentDate: Date
  private csvStoreParser: CsvStoreParser

  constructor(orgId: string = 'demo-org-id') {
    this.orgId = orgId
    this.currentDate = new Date()
    this.csvStoreParser = new CsvStoreParser()
  }

  // ============================================================================
  // 基本データ生成
  // ============================================================================

  generateOrganization(): Organization {
    return {
      id: this.orgId,
      name: 'デモ廃棄物管理システム株式会社',
      created_at: this.currentDate.toISOString(),
    }
  }

  generateUsers(): User[] {
    const users: User[] = [
      {
        id: 'user-admin-1',
        org_id: this.orgId,
        email: 'admin@demo.com',
        name: 'システム管理者',
        role: 'ADMIN',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
      {
        id: 'user-emitter-1',
        org_id: this.orgId,
        email: 'emitter@demo.com',
        name: '排出事業者担当',
        role: 'EMITTER',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
      {
        id: 'user-transporter-1',
        org_id: this.orgId,
        email: 'transporter@demo.com',
        name: '運搬業者担当',
        role: 'TRANSPORTER',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
    ]

    // 収集業者ユーザー（10名）
    for (let i = 1; i <= 10; i++) {
      users.push({
        id: `user-collector-${i}`,
        org_id: this.orgId,
        email: `collector${i}@demo.com`,
        name: `収集業者${i}担当`,
        role: 'COLLECTOR',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      })
    }

    return users
  }

  async generateStores(): Promise<Store[]> {
    try {
      // CSVファイルから店舗情報を読み込み
      const csvPath = 'C:\\Users\\kuros\\Desktop\\実績報告一覧CSV_テンプレート.csv'
      const parsedData = await this.csvStoreParser.parseCsvFile(csvPath)
      
      if (parsedData.length > 0) {
        console.log(`CSVファイルから${parsedData.length}件の店舗情報を読み込みました`)
        return this.csvStoreParser.convertToStoreSchema(parsedData, this.orgId)
      }
    } catch (error) {
      console.warn('CSVファイルの読み込みに失敗しました。デフォルトの店舗データを生成します:', error)
    }

    // CSVファイルが読み込めない場合はデフォルトの店舗データを生成
    return this.generateDefaultStores()
  }

  generateDefaultStores(): Store[] {
    const stores: Store[] = []
    const areas = ['東京都', '神奈川県', '埼玉県', '千葉県', '茨城県']
    const cities = [
      '新宿区', '渋谷区', '港区', '品川区', '目黒区',
      '横浜市', '川崎市', '相模原市', '藤沢市', '茅ヶ崎市',
      'さいたま市', '川越市', '所沢市', '越谷市', '川口市',
      '千葉市', '船橋市', '松戸市', '柏市', '市川市',
      '水戸市', 'つくば市', '日立市', '土浦市', '古河市'
    ]

    for (let i = 1; i <= 50; i++) {
      const area = areas[i % areas.length]
      const city = cities[i % cities.length]
      
      stores.push({
        id: `store-${i}`,
        org_id: this.orgId,
        store_code: `ST${String(i).padStart(3, '0')}`,
        area_manager_code: `AM${String(i).padStart(8, '0')}`,
        name: `${city}店舗${i}`,
        area_name: area,
        address: `${area}${city}サンプル町${i}-${i}`,
        area: city,
        emitter_no: `E${String(i).padStart(3, '0')}`,
        opening_date: undefined,
        closing_date: undefined,
        is_active: true,
        is_managed: true, // 管理店舗マスターとしてマーク
        is_temporary: false,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      })
    }

    return stores
  }

  generateCollectorUsers(): User[] {
    const collectorUsers: User[] = []
    const companyNames = [
      'エコリサイクル株式会社', 'グリーン環境サービス', 'クリーンアップ事業',
      'リサイクルセンター', '環境保全株式会社', 'エコシステム',
      'グリーンリサイクル', 'クリーンエコ', '環境ソリューション',
      'エコマネジメント', 'リサイクルプロ', 'エコクリーン', '環境リサイクル',
      'グリーンプロ', 'エコサービス', 'リサイクルエコ'
    ]
    const contactPersons = [
      '田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '伊藤健太',
      '山田由美', '中村正雄', '小林真理', '加藤大輔', '吉田恵子',
      '佐々木健', '山本美咲', '田村正雄', '木村真理', '森田大輔',
      '林恵子', '石川健太'
    ]
    
    // 都道府県別の収集業者設定
    const prefectureCollectors = [
      { prefecture: '東京都', companies: ['エコリサイクル株式会社', 'グリーン環境サービス', 'クリーンアップ事業', 'リサイクルセンター'] },
      { prefecture: '神奈川県', companies: ['環境保全株式会社', 'エコシステム', 'グリーンリサイクル', 'クリーンエコ'] },
      { prefecture: '埼玉県', companies: ['環境ソリューション', 'エコマネジメント', 'リサイクルプロ', 'エコクリーン'] },
      { prefecture: '千葉県', companies: ['環境リサイクル', 'グリーンプロ', 'エコサービス', 'リサイクルエコ'] },
      { prefecture: '茨城県', companies: ['エコリサイクル株式会社', '環境保全株式会社', 'リサイクルプロ', 'エコクリーン'] },
      { prefecture: '栃木県', companies: ['グリーン環境サービス', 'エコシステム', '環境リサイクル', 'グリーンプロ'] },
      { prefecture: '群馬県', companies: ['クリーンアップ事業', 'グリーンリサイクル', 'エコサービス', 'リサイクルエコ'] }
    ]

    let collectorIndex = 1
    prefectureCollectors.forEach(({ prefecture, companies }) => {
      companies.forEach((companyName, index) => {
        collectorUsers.push({
          id: `collector-${collectorIndex}`,
          org_id: this.orgId,
          email: `collector${collectorIndex}@demo.com`,
          name: contactPersons[collectorIndex - 1],
          role: 'COLLECTOR',
          is_active: true,
          // 収集業者関連のフィールド
          company_name: companyName,
          contact_person: contactPersons[collectorIndex - 1],
          phone: `03-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          address: `${prefecture}サンプル区テスト町${collectorIndex}-${collectorIndex}`,
          license_number: `L${String(collectorIndex).padStart(6, '0')}`,
          service_areas: [prefecture],
          jwnet_subscriber_id: `SUB${String(collectorIndex).padStart(7, '0')}`,
          jwnet_public_confirmation_id: `PUB${String(collectorIndex).padStart(7, '0')}`,
          is_temporary: false,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
        collectorIndex++
      })
    })

    return collectorUsers
  }

  generateStoreCollectorAssignments(stores: Store[], collectorUsers: User[]): StoreCollectorAssignment[] {
    const assignments: StoreCollectorAssignment[] = []

    // 店舗の都道府県に基づいて収集業者を割り当て
    stores.forEach((store, storeIndex) => {
      // 店舗の都道府県を取得（area_nameまたはareaから推定）
      const storePrefecture = store.area_name || this.extractPrefectureFromArea(store.area) || '東京都'
      
      // 該当都道府県の収集業者を取得
      const availableCollectors = collectorUsers.filter(collector => 
        collector.service_areas.includes(storePrefecture)
      )
      
      // 利用可能な収集業者がいない場合は全収集業者から選択
      const targetCollectors = availableCollectors.length > 0 ? availableCollectors : collectorUsers
      
      // 各店舗に1-2社の収集業者を割り当て（優先度付き）
      const numCollectors = Math.min(2, targetCollectors.length)
      const shuffledCollectors = [...targetCollectors].sort(() => Math.random() - 0.5)
      
      for (let i = 0; i < numCollectors; i++) {
        assignments.push({
          id: `assignment-${storeIndex}-${i}`,
          org_id: this.orgId,
          store_id: store.id,
          collector_id: shuffledCollectors[i].id,
          priority: i + 1,
          is_active: true,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
      }
    })

    return assignments
  }

  // エリア名から都道府県を抽出
  private extractPrefectureFromArea(area: string | undefined): string | null {
    if (!area) return null
    
    const prefectureMap: Record<string, string> = {
      '新宿区': '東京都', '渋谷区': '東京都', '港区': '東京都', '品川区': '東京都', '目黒区': '東京都',
      '横浜市': '神奈川県', '川崎市': '神奈川県', '相模原市': '神奈川県', '藤沢市': '神奈川県', '茅ヶ崎市': '神奈川県',
      'さいたま市': '埼玉県', '川越市': '埼玉県', '所沢市': '埼玉県', '越谷市': '埼玉県', '川口市': '埼玉県',
      '千葉市': '千葉県', '船橋市': '千葉県', '松戸市': '千葉県', '柏市': '千葉県', '市川市': '千葉県',
      '水戸市': '茨城県', 'つくば市': '茨城県', '日立市': '茨城県', '土浦市': '茨城県', '古河市': '茨城県'
    }
    
    return prefectureMap[area] || null
  }

  generateJwnetWasteCodes(): JwnetWasteCode[] {
    const wasteCodes: JwnetWasteCode[] = [
      {
        id: 'waste-code-001',
        waste_code: '001-01',
        waste_name: '木くず（建設工事に伴うもの）',
        waste_category: '木くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-002',
        waste_code: '001-02',
        waste_name: '木くず（パルプ製造業に伴うもの）',
        waste_category: '木くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-003',
        waste_code: '002-01',
        waste_name: '紙くず（建設工事に伴うもの）',
        waste_category: '紙くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-004',
        waste_code: '003-01',
        waste_name: '繊維くず（建設工事に伴うもの）',
        waste_category: '繊維くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-005',
        waste_code: '004-01',
        waste_name: '金属くず（建設工事に伴うもの）',
        waste_category: '金属くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-006',
        waste_code: '005-01',
        waste_name: 'ガラスくず・コンクリートくず',
        waste_category: 'ガラスくず・コンクリートくず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-007',
        waste_code: '006-01',
        waste_name: '陶磁器くず',
        waste_category: '陶磁器くず',
        waste_type: '産業廃棄物',
        unit_code: 'T',
        unit_name: 'トン',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-008',
        waste_code: '007-01',
        waste_name: '汚泥（建設工事に伴うもの）',
        waste_category: '汚泥',
        waste_type: '産業廃棄物',
        unit_code: 'M3',
        unit_name: '立方メートル',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-009',
        waste_code: '008-01',
        waste_name: '廃油',
        waste_category: '廃油',
        waste_type: '産業廃棄物',
        unit_code: 'L',
        unit_name: 'リットル',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
      {
        id: 'waste-code-010',
        waste_code: '009-01',
        waste_name: '廃酸',
        waste_category: '廃酸',
        waste_type: '産業廃棄物',
        unit_code: 'L',
        unit_name: 'リットル',
        is_active: true,
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
      },
    ]

    return wasteCodes
  }

  generateWasteTypeMasters(collectors: Collector[], jwnetWasteCodes: JwnetWasteCode[]): WasteTypeMaster[] {
    const wasteTypeMasters: WasteTypeMaster[] = []

    collectors.forEach((collector, collectorIndex) => {
      // 各収集業者に3-5種類の廃棄物種別を設定
      const numTypes = Math.floor(Math.random() * 3) + 3
      const shuffledCodes = [...jwnetWasteCodes].sort(() => Math.random() - 0.5)
      
      for (let i = 0; i < numTypes; i++) {
        const jwnetCode = shuffledCodes[i]
        wasteTypeMasters.push({
          id: `waste-type-${collectorIndex}-${i}`,
          org_id: this.orgId,
          collector_id: collector.id,
          waste_type_code: `WT${String(collectorIndex + 1).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
          waste_type_name: `${collector.company_name}専用${jwnetCode.waste_name}`,
          waste_category: jwnetCode.waste_category,
          waste_classification: jwnetCode.waste_type,
          jwnet_waste_code: jwnetCode.waste_code,
          jwnet_waste_name: jwnetCode.waste_name,
          unit_code: jwnetCode.unit_code,
          unit_name: jwnetCode.unit_name,
          description: `${collector.company_name}で処理可能な${jwnetCode.waste_name}`,
          is_active: true,
          created_by_collector: collector.id,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
      }
    })

    return wasteTypeMasters
  }

  generateItemMaps(): ItemMap[] {
    const itemMaps: ItemMap[] = [
      {
        id: 'item-map-001',
        org_id: this.orgId,
        item_label: '混載物',
        jwnet_code: 'MIX001',
        hazard: false,
        default_unit: 'T',
        density_t_per_m3: 1.5,
        disposal_method_code: 'DM001',
        notes: '複数種類の廃棄物を混合したもの',
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
      {
        id: 'item-map-002',
        org_id: this.orgId,
        item_label: '紙くず',
        jwnet_code: '002-01',
        hazard: false,
        default_unit: 'T',
        density_t_per_m3: 0.8,
        disposal_method_code: 'DM002',
        notes: '建設工事に伴う紙くず',
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
      {
        id: 'item-map-003',
        org_id: this.orgId,
        item_label: '木くず',
        jwnet_code: '001-01',
        hazard: false,
        default_unit: 'T',
        density_t_per_m3: 0.6,
        disposal_method_code: 'DM003',
        notes: '建設工事に伴う木くず',
        created_at: this.currentDate.toISOString(),
        updated_at: this.currentDate.toISOString(),
        created_by: 'system',
        updated_by: 'system',
        deleted_at: null,
      },
    ]

    return itemMaps
  }

  generatePlans(stores: Store[], itemMaps: ItemMap[]): Plan[] {
    const plans: Plan[] = []
    const currentMonth = this.currentDate.getMonth()
    const currentYear = this.currentDate.getFullYear()

    // 過去3ヶ月から未来3ヶ月までの予定を生成
    for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
      const targetDate = new Date(currentYear, currentMonth + monthOffset, 1)
      const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
      
      stores.forEach((store, storeIndex) => {
        // 各店舗に2-5件の予定を生成
        const numPlans = Math.floor(Math.random() * 4) + 2
        
        for (let i = 0; i < numPlans; i++) {
          const itemMap = itemMaps[Math.floor(Math.random() * itemMaps.length)]
          const plannedDate = new Date(targetDate)
          plannedDate.setDate(Math.floor(Math.random() * 28) + 1)
          
          plans.push({
            id: `plan-${yearMonth}-${storeIndex}-${i}`,
            org_id: this.orgId,
            store_id: store.id,
            planned_pickup_date: plannedDate.toISOString().split('T')[0],
            item_name: itemMap.item_label,
            planned_quantity: Math.floor(Math.random() * 10) + 1,
            unit: itemMap.default_unit as Unit,
            area_or_city: store.area || '',
            notes: `${store.name}の${itemMap.item_label}収集予定`,
            status: 'DRAFT',
            created_at: this.currentDate.toISOString(),
            updated_at: this.currentDate.toISOString(),
            created_by: 'system',
            updated_by: 'system',
            deleted_at: null,
          })
        }
      })
    }

    return plans
  }

  generateCollectionRequests(plans: Plan[], assignments: StoreCollectorAssignment[]): CollectionRequest[] {
    const requests: CollectionRequest[] = []
    const statuses: CollectionRequestStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

    plans.forEach((plan, planIndex) => {
      // 各予定に対して収集依頼を生成（70%の確率）
      if (Math.random() < 0.7) {
        const storeAssignments = assignments.filter(a => a.store_id === plan.store_id)
        if (storeAssignments.length > 0) {
          const assignment = storeAssignments[0] // 優先度1の業者を選択
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          
          const requestDate = new Date(plan.planned_pickup_date)
          requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 7) + 1)
          
          let confirmedPickupDate: string | undefined
          let confirmedPickupTime: string | undefined
          
          if (status === 'CONFIRMED' || status === 'COMPLETED') {
            confirmedPickupDate = plan.planned_pickup_date
            confirmedPickupTime = `${String(Math.floor(Math.random() * 12) + 8).padStart(2, '0')}:00`
          }

          requests.push({
            id: `request-${planIndex}`,
            org_id: this.orgId,
            store_id: plan.store_id,
            collector_id: assignment.collector_id,
            plan_id: plan.id,
            request_date: requestDate.toISOString(),
            status,
            requested_pickup_date: plan.planned_pickup_date,
            confirmed_pickup_date: confirmedPickupDate,
            confirmed_pickup_time: confirmedPickupTime,
            notes: `${plan.item_name}の収集依頼`,
            jwnet_reservation_id: status === 'CONFIRMED' || status === 'COMPLETED' ? `JWN-RES-${planIndex}` : undefined,
            created_at: this.currentDate.toISOString(),
            updated_at: this.currentDate.toISOString(),
            created_by: 'system',
            updated_by: 'system',
            deleted_at: null,
          })
        }
      }
    })

    return requests
  }

  generateCollections(requests: CollectionRequest[]): Collection[] {
    const collections: Collection[] = []
    const statuses: CollectionStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

    requests.forEach((request, requestIndex) => {
      // 確認済みまたは完了の依頼に対して実績を生成
      if (request.status === 'CONFIRMED' || request.status === 'COMPLETED') {
        const status = request.status === 'COMPLETED' ? 'COMPLETED' : 
                     (Math.random() < 0.3 ? 'IN_PROGRESS' : 'SCHEDULED')
        
        const actualPickupDate = request.confirmed_pickup_date || request.requested_pickup_date
        const actualPickupTime = request.confirmed_pickup_time || '09:00'
        
        collections.push({
          id: `collection-${requestIndex}`,
          org_id: this.orgId,
          collection_request_id: request.id,
          actual_pickup_date: actualPickupDate,
          actual_pickup_time: actualPickupTime,
          status,
          actual_quantity: Math.floor(Math.random() * 10) + 1,
          unit: 'T',
          driver_name: `ドライバー${requestIndex}`,
          vehicle_number: `車両${String(requestIndex).padStart(3, '0')}`,
          photo_urls: [],
          notes: `${request.notes}の実績`,
          jwnet_registration_id: status === 'COMPLETED' ? `JWN-REG-${requestIndex}` : undefined,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
      }
    })

    return collections
  }

  generateJwnetReservations(requests: CollectionRequest[]): JwnetReservation[] {
    const reservations: JwnetReservation[] = []
    const statuses: JwnetStatus[] = ['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'ERROR']

    requests.forEach((request, requestIndex) => {
      if (request.jwnet_reservation_id) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const submittedAt = status !== 'PENDING' ? 
          new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined
        
        reservations.push({
          id: `jwnet-reservation-${requestIndex}`,
          org_id: this.orgId,
          collection_request_id: request.id,
          jwnet_reservation_id: request.jwnet_reservation_id,
          status,
          submitted_at: submittedAt,
          accepted_at: status === 'ACCEPTED' || status === 'COMPLETED' ? 
            new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          rejected_at: status === 'REJECTED' ? 
            new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          error_message: status === 'ERROR' ? 'JWNET接続エラー' : undefined,
          manifest_no: status === 'ACCEPTED' || status === 'COMPLETED' ? 
            `MF${String(requestIndex).padStart(11, '0')}` : undefined,
          jwnet_response: status !== 'PENDING' ? { status, timestamp: submittedAt } : undefined,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
      }
    })

    return reservations
  }

  generateJwnetRegistrations(collections: Collection[]): JwnetRegistration[] {
    const registrations: JwnetRegistration[] = []
    const statuses: JwnetStatus[] = ['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'ERROR']

    collections.forEach((collection, collectionIndex) => {
      if (collection.jwnet_registration_id) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const submittedAt = status !== 'PENDING' ? 
          new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString() : undefined
        
        registrations.push({
          id: `jwnet-registration-${collectionIndex}`,
          org_id: this.orgId,
          collection_id: collection.id,
          jwnet_registration_id: collection.jwnet_registration_id,
          status,
          submitted_at: submittedAt,
          accepted_at: status === 'ACCEPTED' || status === 'COMPLETED' ? 
            new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          rejected_at: status === 'REJECTED' ? 
            new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          error_message: status === 'ERROR' ? 'JWNET登録エラー' : undefined,
          manifest_no: status === 'ACCEPTED' || status === 'COMPLETED' ? 
            `MF${String(collectionIndex).padStart(11, '0')}` : undefined,
          jwnet_response: status !== 'PENDING' ? { status, timestamp: submittedAt } : undefined,
          created_at: this.currentDate.toISOString(),
          updated_at: this.currentDate.toISOString(),
          created_by: 'system',
          updated_by: 'system',
          deleted_at: null,
        })
      }
    })

    return registrations
  }

  // ============================================================================
  // 全データ生成
  // ============================================================================

  async generateAllTestData() {
    console.log('テストデータ生成を開始します...')
    
    const organization = this.generateOrganization()
    const users = this.generateUsers()
    const stores = await this.generateStores() // 非同期対応
    const collectors = this.generateCollectors()
    const assignments = this.generateStoreCollectorAssignments(stores, collectors)
    const jwnetWasteCodes = this.generateJwnetWasteCodes()
    const wasteTypeMasters = this.generateWasteTypeMasters(collectors, jwnetWasteCodes)
    const itemMaps = this.generateItemMaps()
    const plans = this.generatePlans(stores, itemMaps)
    const requests = this.generateCollectionRequests(plans, assignments)
    const collections = this.generateCollections(requests)
    const jwnetReservations = this.generateJwnetReservations(requests)
    const jwnetRegistrations = this.generateJwnetRegistrations(collections)

    console.log('テストデータ生成完了:')
    console.log(`- 組織: ${organization ? 1 : 0}件`)
    console.log(`- ユーザー: ${users.length}件`)
    console.log(`- 店舗: ${stores.length}件`)
    console.log(`- 収集業者: ${collectors.length}件`)
    console.log(`- 店舗-収集業者割り当て: ${assignments.length}件`)
    console.log(`- JWNET廃棄物コード: ${jwnetWasteCodes.length}件`)
    console.log(`- 廃棄物種別マスター: ${wasteTypeMasters.length}件`)
    console.log(`- 品目マッピング: ${itemMaps.length}件`)
    console.log(`- 予定: ${plans.length}件`)
    console.log(`- 収集依頼: ${requests.length}件`)
    console.log(`- 収集実績: ${collections.length}件`)
    console.log(`- JWNET予約: ${jwnetReservations.length}件`)
    console.log(`- JWNET登録: ${jwnetRegistrations.length}件`)

    return {
      organization,
      users,
      stores,
      collectors,
      assignments,
      jwnetWasteCodes,
      wasteTypeMasters,
      itemMaps,
      plans,
      requests,
      collections,
      jwnetReservations,
      jwnetRegistrations,
    }
  }
}

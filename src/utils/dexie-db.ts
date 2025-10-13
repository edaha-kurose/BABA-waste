// ============================================================================
// Dexieデータベース設定
// 作成日: 2025-09-16
// 目的: IndexedDBを使用したローカルデータベース
// ============================================================================

import Dexie, { Table } from 'dexie'
import type {
  Organization,
  UserOrgRole,
  Store,
  ItemMap,
  Contract,
  Plan,
  Reservation,
  Actual,
  Registration,
  AuditLog,
  StagePlan,
  Approval,
  ManagedStore,
  ImportHistory,
  Collector,
  StoreCollectorAssignment,
  CollectionRequest,
  Collection,
  JwnetReservation,
  JwnetRegistration,
  JwnetWasteCode,
  WasteTypeMaster,
  User,
  DisposalSite,
} from '@contracts/v0/schema'

// ============================================================================
// データベース定義
// ============================================================================

export class WasteManagementDB extends Dexie {
  // テーブル定義
  organizations!: Table<Organization>
  userOrgRoles!: Table<UserOrgRole>
  stores!: Table<Store>
  importHistories!: Table<ImportHistory>
  itemMaps!: Table<ItemMap>
  contracts!: Table<Contract>
  plans!: Table<Plan>
  reservations!: Table<Reservation>
  actuals!: Table<Actual>
  registrations!: Table<Registration>
  auditLogs!: Table<AuditLog>
  stagePlans!: Table<StagePlan>
  approvals!: Table<Approval>
  collectors!: Table<Collector>
  managedStores!: Table<ManagedStore>
  storeCollectorAssignments!: Table<StoreCollectorAssignment>
  collectionRequests!: Table<CollectionRequest>
  collections!: Table<Collection>
  jwnetReservations!: Table<JwnetReservation>
  jwnetRegistrations!: Table<JwnetRegistration>
  jwnetWasteCodes!: Table<JwnetWasteCode>
  wasteTypeMasters!: Table<WasteTypeMaster>
  users!: Table<User>
  disposalSites!: Table<DisposalSite>

  constructor() {
    super('WasteManagementDB')
    
    this.version(7).stores({
      // 組織関連
      organizations: 'id, name, created_at',
      userOrgRoles: 'id, user_id, org_id, role, [user_id+org_id+role]',
      
      // 店舗関連（統合済み）
      stores: 'id, org_id, store_code, name, area_name, phone, postal_code, address1, address2, address, area, emitter_no, opening_date, closing_date, is_active, is_temporary, is_managed, [org_id+store_code], [org_id+area_manager_code]',
      
      // 取り込み履歴関連
      importHistories: 'id, org_id, import_type, file_name, started_at, [org_id+import_type], [org_id+started_at]',
      
      // 品目マッピング関連
      itemMaps: 'id, org_id, item_label, jwnet_code, [org_id+item_label]',
      
      // 契約関連
      contracts: 'id, org_id, emitter_id, valid_from, valid_to',
      
      // 予定関連
      plans: 'id, org_id, store_id, planned_date, item_map_id, [org_id+planned_date], [org_id+store_id+planned_date]',
      
      // 予約関連
      reservations: 'id, org_id, plan_id, status, payload_hash, [org_id+plan_id]',
      
      // 実績関連
      actuals: 'id, org_id, plan_id, confirmed_at',
      
      // 本登録関連
      registrations: 'id, org_id, plan_id, status, manifest_no',
      
      // 監査ログ関連
      auditLogs: 'id, org_id, entity, entity_id, created_at, [org_id+created_at]',
      
      // ステージング関連
      stagePlans: 'id, org_id, processed, received_at',
      
      // 承認関連
      approvals: 'id, org_id, plan_id, approved_by, approved_at',
      
      // 収集業者関連
      collectors: 'id, org_id, email, name, company_name, phone, address, license_number, jwnet_subscriber_id, jwnet_public_confirmation_id, is_active, [org_id+email], [org_id+is_active]',
      
      // 管理店舗関連
      managedStores: 'id, org_id, store_code, name, area_name, area_manager_code, phone, postal_code, address1, address2, is_managed, is_active, [org_id+store_code], [org_id+area_manager_code]',
      
      // 店舗-収集業者割り当て関連
      storeCollectorAssignments: 'id, org_id, store_id, collector_id, priority, is_active, [org_id+store_id], [org_id+collector_id]',
      
      // 廃棄依頼関連
      collectionRequests: 'id, org_id, store_id, collector_id, plan_id, status, request_date, [org_id+store_id], [org_id+collector_id], [org_id+status]',
      
      // 収集実績関連
      collections: 'id, org_id, collection_request_id, actual_pickup_date, status, [org_id+collection_request_id], [org_id+actual_pickup_date]',
      
      // JWNET連携関連
      jwnetReservations: 'id, org_id, collection_request_id, jwnet_reservation_id, status, submitted_at, [org_id+status], [org_id+collection_request_id]',
      jwnetRegistrations: 'id, org_id, collection_id, jwnet_registration_id, status, submitted_at, [org_id+status], [org_id+collection_id]',
      jwnetWasteCodes: 'id, waste_code, waste_name, waste_category, waste_type, unit_code, unit_name, is_active, [waste_code], [waste_category], [is_active]',
      wasteTypeMasters: 'id, org_id, collector_id, waste_type_code, waste_type_name, waste_category, waste_classification, jwnet_waste_code, is_active, [org_id+collector_id], [collector_id+is_active], [waste_type_code]',
      users: 'id, org_id, email, name, role, is_active, last_login_at, created_by, company_name, phone, license_number, jwnet_subscriber_id, is_temporary, [org_id+email], [org_id+is_active], [email]',
      disposalSites: 'id, org_id, collector_id, company_name, contact_person, address, phone, email, jwnet_subscriber_id, jwnet_public_confirmation_id, is_active, [org_id+collector_id], [collector_id+is_active], [company_name]',
    })
  }
}

// ============================================================================
// データベースインスタンス
// ============================================================================

export const db = new WasteManagementDB()

// ============================================================================
// データベース初期化
// ============================================================================

let isInitialized = false

export async function initializeDatabase(): Promise<void> {
  try {
    if (!isInitialized) {
      console.log('Initializing Dexie database...')
      
      // データベースを開く
      await db.open()
      
      // すべてのテーブルが存在することを確認
      const expectedTables = [
        'organizations', 'userOrgRoles', 'stores', 'importHistories',
        'itemMaps', 'contracts', 'plans', 'reservations', 'actuals', 'registrations', 
        'auditLogs', 'stagePlans', 'approvals', 'storeCollectorAssignments',
        'collectionRequests', 'collections', 'jwnetReservations',
        'jwnetRegistrations', 'jwnetWasteCodes', 'wasteTypeMasters', 'users', 'disposalSites'
      ]
      
      const availableTables = Object.keys(db)
      console.log('Available tables:', availableTables)
      
      // 不足しているテーブルをチェック
      const missingTables = expectedTables.filter(table => !availableTables.includes(table))
      if (missingTables.length > 0) {
        console.warn('Missing tables:', missingTables)
        // データベースを再作成
        console.log('Recreating database...')
        await db.close()
        await db.delete()
        await db.open()
        console.log('Database recreated successfully')
      }
      
      isInitialized = true
      console.log('Dexie database initialized successfully')
    }
  } catch (error) {
    console.error('Failed to initialize Dexie database:', error)
    // エラーが発生した場合はデータベースを削除して再作成
    try {
      console.log('Attempting to recreate database...')
      await db.close()
      await db.delete()
      await db.open()
      isInitialized = true
      console.log('Database recreated successfully')
    } catch (recreateError) {
      console.error('Failed to recreate database:', recreateError)
      throw error
    }
  }
}

export async function ensureDatabaseInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeDatabase()
  }
}

// ============================================================================
// データベース完全リセット
// ============================================================================

export async function resetDatabase(): Promise<void> {
  try {
    console.log('Resetting database completely...')
    
    // データベースを閉じる
    if (db.isOpen()) {
      await db.close()
    }
    
    // データベースを削除
    await db.delete()
    
    // 新しいインスタンスを作成
    const newDb = new WasteManagementDB()
    Object.assign(db, newDb)
    
    // データベースを開く
    await db.open()
    
    // 初期化フラグをリセット
    isInitialized = false
    
    // 再初期化
    await initializeDatabase()
    
    console.log('Database reset completed successfully')
  } catch (error) {
    console.error('Database reset failed:', error)
    throw error
  }
}

// ============================================================================
// データベースクリーンアップ
// ============================================================================

export async function clearDatabase(): Promise<void> {
  try {
    await db.transaction('rw', db.organizations, db.userOrgRoles, db.stores, 
      db.itemMaps, db.contracts, db.plans, db.reservations, db.actuals, 
      db.registrations, db.auditLogs, db.stagePlans, db.approvals, async () => {
      await db.organizations.clear()
      await db.userOrgRoles.clear()
      await db.stores.clear()
      await db.itemMaps.clear()
      await db.contracts.clear()
      await db.plans.clear()
      await db.reservations.clear()
      await db.actuals.clear()
      await db.registrations.clear()
      await db.auditLogs.clear()
      await db.stagePlans.clear()
      await db.approvals.clear()
    })
    console.log('Database cleared successfully')
  } catch (error) {
    console.error('Failed to clear database:', error)
    throw error
  }
}

// ============================================================================
// データベース統計
// ============================================================================

export async function getDatabaseStats(): Promise<Record<string, number>> {
  try {
    const stats = await db.transaction('r', db.organizations, db.userOrgRoles, db.stores, 
      db.itemMaps, db.contracts, db.plans, db.reservations, db.actuals, 
      db.registrations, db.auditLogs, db.stagePlans, db.approvals, async () => {
      return {
        organizations: await db.organizations.count(),
        userOrgRoles: await db.userOrgRoles.count(),
        stores: await db.stores.count(),
        itemMaps: await db.itemMaps.count(),
        contracts: await db.contracts.count(),
        plans: await db.plans.count(),
        reservations: await db.reservations.count(),
        actuals: await db.actuals.count(),
        registrations: await db.registrations.count(),
        auditLogs: await db.auditLogs.count(),
        stagePlans: await db.stagePlans.count(),
        approvals: await db.approvals.count(),
      }
    })
    return stats
  } catch (error) {
    console.error('Failed to get database stats:', error)
    throw error
  }
}

// ============================================================================
// データベースエクスポート
// ============================================================================

export async function exportDatabase(): Promise<Record<string, any[]>> {
  try {
    const data = await db.transaction('r', db.organizations, db.userOrgRoles, db.stores, 
      db.itemMaps, db.contracts, db.plans, db.reservations, db.actuals, 
      db.registrations, db.auditLogs, db.stagePlans, db.approvals, async () => {
      return {
        organizations: await db.organizations.toArray(),
        userOrgRoles: await db.userOrgRoles.toArray(),
        stores: await db.stores.toArray(),
        itemMaps: await db.itemMaps.toArray(),
        contracts: await db.contracts.toArray(),
        plans: await db.plans.toArray(),
        reservations: await db.reservations.toArray(),
        actuals: await db.actuals.toArray(),
        registrations: await db.registrations.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        stagePlans: await db.stagePlans.toArray(),
        approvals: await db.approvals.toArray(),
      }
    })
    return data
  } catch (error) {
    console.error('Failed to export database:', error)
    throw error
  }
}

// ============================================================================
// データベースインポート
// ============================================================================

export async function importDatabase(data: Record<string, any[]>): Promise<void> {
  try {
    await db.transaction('rw', db.organizations, db.userOrgRoles, db.stores, 
      db.itemMaps, db.contracts, db.plans, db.reservations, db.actuals, 
      db.registrations, db.auditLogs, db.stagePlans, db.approvals, async () => {
      // 既存データをクリア
      await clearDatabase()
      
      // 新しいデータをインポート
      if (data.organizations) await db.organizations.bulkAdd(data.organizations)
      if (data.userOrgRoles) await db.userOrgRoles.bulkAdd(data.userOrgRoles)
      if (data.stores) await db.stores.bulkAdd(data.stores)
      if (data.itemMaps) await db.itemMaps.bulkAdd(data.itemMaps)
      if (data.contracts) await db.contracts.bulkAdd(data.contracts)
      if (data.plans) await db.plans.bulkAdd(data.plans)
      if (data.reservations) await db.reservations.bulkAdd(data.reservations)
      if (data.actuals) await db.actuals.bulkAdd(data.actuals)
      if (data.registrations) await db.registrations.bulkAdd(data.registrations)
      if (data.auditLogs) await db.auditLogs.bulkAdd(data.auditLogs)
      if (data.stagePlans) await db.stagePlans.bulkAdd(data.stagePlans)
      if (data.approvals) await db.approvals.bulkAdd(data.approvals)
    })
    console.log('Database imported successfully')
  } catch (error) {
    console.error('Failed to import database:', error)
    throw error
  }
}

// ============================================================================
// データベース同期
// ============================================================================

export async function syncWithSupabase(supabaseData: Record<string, any[]>): Promise<void> {
  try {
    await db.transaction('rw', db.organizations, db.userOrgRoles, db.stores, 
      db.itemMaps, db.contracts, db.plans, db.reservations, db.actuals, 
      db.registrations, db.auditLogs, db.stagePlans, db.approvals, async () => {
      // 各テーブルを同期
      for (const [tableName, records] of Object.entries(supabaseData)) {
        if (records && records.length > 0) {
          const table = (db as any)[tableName] as Table<any>
          if (table) {
            // 既存データをクリア
            await table.clear()
            // 新しいデータを追加
            await table.bulkAdd(records)
          }
        }
      }
    })
    console.log('Database synced with Supabase successfully')
  } catch (error) {
    console.error('Failed to sync with Supabase:', error)
    throw error
  }
}

// ============================================================================
// エラーハンドリング
// ============================================================================

export function handleDexieError(error: any): Error {
  if (error.name === 'ConstraintError') {
    return new Error(`データベース制約エラー: ${error.message}`)
  }
  if (error.name === 'DataError') {
    return new Error(`データエラー: ${error.message}`)
  }
  if (error.name === 'TransactionInactiveError') {
    return new Error(`トランザクションエラー: ${error.message}`)
  }
  if (error.name === 'InvalidStateError') {
    return new Error(`無効な状態エラー: ${error.message}`)
  }
  if (error.name === 'AbortError') {
    return new Error(`操作が中断されました: ${error.message}`)
  }
  if (error.name === 'QuotaExceededError') {
    return new Error(`ストレージ容量不足: ${error.message}`)
  }
  if (error.name === 'VersionChangeError') {
    return new Error(`データベースバージョン変更エラー: ${error.message}`)
  }
  if (error.name === 'SchemaError') {
    return new Error(`スキーマエラー: ${error.message}`)
  }
  if (error.name === 'UpgradeError') {
    return new Error(`アップグレードエラー: ${error.message}`)
  }
  if (error.name === 'InvalidTableError') {
    return new Error(`無効なテーブルエラー: ${error.message}`)
  }
  if (error.name === 'MissingAPIError') {
    return new Error(`API不足エラー: ${error.message}`)
  }
  if (error.name === 'NoSuchDatabaseError') {
    return new Error(`データベースが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchTableError') {
    return new Error(`テーブルが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchIndexError') {
    return new Error(`インデックスが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchPrimaryKeyError') {
    return new Error(`主キーが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchColumnError') {
    return new Error(`カラムが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchDatabaseError') {
    return new Error(`データベースが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchTableError') {
    return new Error(`テーブルが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchIndexError') {
    return new Error(`インデックスが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchPrimaryKeyError') {
    return new Error(`主キーが見つかりません: ${error.message}`)
  }
  if (error.name === 'NoSuchColumnError') {
    return new Error(`カラムが見つかりません: ${error.message}`)
  }
  
  return new Error(`データベースエラー: ${error.message}`)
}

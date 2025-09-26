import { z } from 'zod'

// ============================================================================
// 基本型定義
// ============================================================================

export const AppRoleSchema = z.enum(['ADMIN', 'EMITTER', 'TRANSPORTER', 'DISPOSER', 'COLLECTOR', 'USER'])
export type AppRole = z.infer<typeof AppRoleSchema>

export const UnitSchema = z.enum(['T', 'KG', 'M3', 'L', 'PCS'])
export type Unit = z.infer<typeof UnitSchema>

export const RegStatusSchema = z.enum(['RESERVED', 'FAILED', 'PENDING', 'REGISTERED', 'ERROR'])
export type RegStatus = z.infer<typeof RegStatusSchema>

export const CollectionRequestStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'COLLECTED'])
export type CollectionRequestStatus = z.infer<typeof CollectionRequestStatusSchema>

export const CollectionStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PENDING', 'COLLECTED', 'VERIFIED'])
export type CollectionStatus = z.infer<typeof CollectionStatusSchema>

export const JwnetStatusSchema = z.enum(['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'ERROR'])
export type JwnetStatus = z.infer<typeof JwnetStatusSchema>

// ============================================================================
// 共通フィールド
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  deleted_at: z.string().datetime().optional(),
})

export const OrgScopedSchema = BaseEntitySchema.extend({
  org_id: z.string().uuid(),
})

// ============================================================================
// 組織・ユーザー関連
// ============================================================================

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  created_at: z.string().datetime(),
})

export const UserOrgRoleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  role: AppRoleSchema,
})

// ============================================================================
// 店舗関連
// ============================================================================

export const StoreSchema = OrgScopedSchema.extend({
  store_code: z.string().min(1).max(50), // 店舗番号
  area_manager_code: z.string().min(8).max(8).optional(), // エリア長コード（8桁数字）
  name: z.string().min(1).max(255), // 店舗名
  area_name: z.string().max(100).optional(), // 舗名（エリア＝県単位表示）
  phone: z.string().max(50).optional(), // 電話番号
  postal_code: z.string().max(10).optional(), // 郵便番号
  address1: z.string().max(255).optional(), // 住所1（郵便番号までで表示される部分）
  address2: z.string().max(255).optional(), // 住所2（住所1以降の住所）
  address: z.string().max(500).optional(), // 旧住所フィールド（後方互換性のため保持）
  area: z.string().max(100).optional(), // 旧エリアフィールド（後方互換性のため保持）
  emitter_no: z.string().max(50).optional(),
  opening_date: z.string().date().optional(), // 開店予定日
  closing_date: z.string().date().optional(), // 閉店予定日
  is_active: z.boolean().default(true), // アクティブ状態
  // 仮登録管理
  is_temporary: z.boolean().default(false), // 仮登録フラグ
  temp_created_reason: z.string().optional(), // 仮登録理由
  // 管理店舗マスター用フラグ
  is_managed: z.boolean().default(false), // 管理店舗マスターに登録されているか
})

export const StoreCreateSchema = StoreSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const StoreUpdateSchema = StoreCreateSchema.partial()

// ============================================================================
// 品目マッピング関連
// ============================================================================

export const ItemMapSchema = OrgScopedSchema.extend({
  item_label: z.string().min(1).max(255),
  jwnet_code: z.string().min(1).max(50),
  hazard: z.boolean().default(false),
  default_unit: UnitSchema.default('T'),
  density_t_per_m3: z.number().positive().optional(),
  disposal_method_code: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
})

export const ItemMapCreateSchema = ItemMapSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const ItemMapUpdateSchema = ItemMapCreateSchema.partial()

// ============================================================================
// 契約関連
// ============================================================================

export const ContractScopeSchema = z.object({
  areas: z.array(z.string()).optional(),
  items: z.array(z.string()).optional(),
  limits: z.record(z.any()).optional(),
})

export const ContractSchema = OrgScopedSchema.extend({
  emitter_id: z.string().uuid(),
  transporter_id: z.string().uuid().optional(),
  disposer_id: z.string().uuid().optional(),
  scope: ContractScopeSchema.optional(),
  valid_from: z.string().date(),
  valid_to: z.string().date().optional(),
})

// ============================================================================
// 予定関連
// ============================================================================

export const PlanSchema = OrgScopedSchema.extend({
  store_id: z.string().uuid(),
  planned_pickup_date: z.string().datetime(),
  item_name: z.string(),
  planned_quantity: z.number().positive(),
  unit: UnitSchema.default('T'),
  area_or_city: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default('ACTIVE'),
})

export const PlanCreateSchema = PlanSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const PlanUpdateSchema = PlanCreateSchema.partial()

// ============================================================================
// 予約関連
// ============================================================================

export const ReservationSchema = OrgScopedSchema.extend({
  plan_id: z.string().uuid(),
  jwnet_temp_id: z.string().max(100).optional(),
  payload_hash: z.string().min(1),
  status: RegStatusSchema.default('PENDING'),
  last_sent_at: z.string().datetime().optional(),
  error_code: z.string().max(100).optional(),
})

// ============================================================================
// 実績関連
// ============================================================================

export const ActualSchema = OrgScopedSchema.extend({
  plan_id: z.string().uuid(),
  actual_qty: z.number().nonnegative(),
  unit: UnitSchema.default('T'),
  vehicle_no: z.string().max(50).optional(),
  driver_name: z.string().max(100).optional(),
  weighing_ticket_no: z.string().max(100).optional(),
  photo_urls: z.array(z.string().url()).optional(),
  confirmed_at: z.string().datetime(),
})

// ============================================================================
// 本登録関連
// ============================================================================

export const RegistrationSchema = OrgScopedSchema.extend({
  plan_id: z.string().uuid(),
  manifest_no: z.string().max(50).optional(),
  status: RegStatusSchema.default('PENDING'),
  error_code: z.string().max(100).optional(),
  last_sent_at: z.string().datetime().optional(),
})

// ============================================================================
// 監査ログ関連
// ============================================================================

export const AuditLogSchema = OrgScopedSchema.extend({
  actor_id: z.string().uuid().optional(),
  actor_role: AppRoleSchema.optional(),
  action: z.string().min(1).max(100),
  entity: z.string().min(1).max(100),
  entity_id: z.string().uuid(),
  from_json: z.record(z.any()).optional(),
  to_json: z.record(z.any()).optional(),
  ip: z.string().max(45).optional(),
  ua: z.string().max(500).optional(),
})

// ============================================================================
// ステージング関連
// ============================================================================

export const StagePlanSchema = z.object({
  id: z.number().int().positive(),
  org_id: z.string().uuid(),
  raw: z.record(z.any()),
  received_at: z.string().datetime(),
  processed: z.boolean().default(false),
})

// ============================================================================
// 承認関連
// ============================================================================

export const ApprovalSchema = OrgScopedSchema.extend({
  plan_id: z.string().uuid(),
  approved_by: z.string().uuid(),
  approved_at: z.string().datetime(),
})

// ============================================================================
// 管理店舗マスター関連（統合済み - Storeテーブルを使用）
// ============================================================================

// ManagedStoreは統合されたStoreテーブルを使用
// is_managedフラグで管理店舗マスターかどうかを判別
export const ManagedStoreSchema = StoreSchema
export const ManagedStoreCreateSchema = StoreCreateSchema
export const ManagedStoreUpdateSchema = StoreUpdateSchema

// ============================================================================
// 一斉登録関連
// ============================================================================

export const BulkImportStoreSchema = z.object({
  store_code: z.string().min(1).max(50),
  area_manager_code: z.string().min(8).max(8),
  store_name: z.string().min(1).max(255),
  area_name: z.string().max(100),
  phone: z.string().max(50).optional(),
  postal_code: z.string().max(10).optional(),
  address1: z.string().max(255).optional(),
  address2: z.string().max(255).optional(),
  // 担当収集業者情報
  collector_name: z.string().min(1).max(255),
  collector_company_name: z.string().min(1).max(255),
  collector_phone: z.string().max(50).optional(),
  collector_email: z.string().email().optional(),
  collector_address: z.string().max(500).optional(),
  priority: z.number().int().min(1).max(10).default(1),
})

export const BulkImportResultSchema = z.object({
  success: z.boolean(),
  total_records: z.number().int().min(0),
  success_stores: z.number().int().min(0),
  success_collectors: z.number().int().min(0),
  success_assignments: z.number().int().min(0),
  errors: z.array(z.object({
    row_index: z.number().int().min(0),
    store_code: z.string(),
    error_type: z.enum(['validation_error', 'duplicate_error', 'database_error']),
    message: z.string(),
  })).default([]),
  warnings: z.array(z.object({
    row_index: z.number().int().min(0),
    store_code: z.string(),
    warning_type: z.enum(['duplicate_collector', 'missing_data']),
    message: z.string(),
  })).default([]),
})

// ============================================================================
// 取り込み履歴関連
// ============================================================================

export const ImportHistorySchema = OrgScopedSchema.extend({
  import_type: z.enum(['csv', 'excel']),
  file_name: z.string().min(1).max(255),
  file_size: z.number().int().positive(),
  total_records: z.number().int().min(0),
  success_records: z.number().int().min(0),
  error_records: z.number().int().min(0),
  duplicate_records: z.number().int().min(0),
  new_stores_created: z.number().int().min(0),
  new_collectors_created: z.number().int().min(0),
  store_changes: z.array(z.object({
    store_code: z.string(),
    store_name: z.string(),
    change_type: z.enum(['created', 'updated', 'deleted']),
    old_data: z.record(z.any()).optional(),
    new_data: z.record(z.any()).optional(),
  })).default([]),
  collector_changes: z.array(z.object({
    collector_name: z.string(),
    change_type: z.enum(['created', 'updated', 'deleted']),
    old_data: z.record(z.any()).optional(),
    new_data: z.record(z.any()).optional(),
  })).default([]),
  warnings: z.array(z.object({
    type: z.enum(['duplicate', 'missing_data', 'validation_error', 'store_change', 'collector_change']),
    message: z.string(),
    record_index: z.number().optional(),
    field: z.string().optional(),
  })).default([]),
  errors: z.array(z.object({
    type: z.enum(['validation_error', 'database_error', 'file_error']),
    message: z.string(),
    record_index: z.number().optional(),
    field: z.string().optional(),
  })).default([]),
  import_status: z.enum(['success', 'partial_success', 'failed']),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  processing_time_ms: z.number().int().min(0).optional(),
})

export const ImportHistoryCreateSchema = ImportHistorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const ImportHistoryUpdateSchema = ImportHistoryCreateSchema.partial()

// ============================================================================
// ビュー関連
// ============================================================================

export const StoreManifestViewSchema = z.object({
  store_code: z.string(),
  store_name: z.string(),
  area_or_city: z.string().optional(),
  pickup_date: z.string().date(),
  route_id: z.string().optional(),
  item_label: z.string().optional(),
  planned_qty: z.number().optional(),
  actual_qty: z.number().optional(),
  unit: UnitSchema.optional(),
  jwnet_reservation_id: z.string().optional(),
  jwnet_manifest_no: z.string().optional(),
  transporter_name: z.string().optional(),
  vehicle_no: z.string().optional(),
  driver_name: z.string().optional(),
  weighing_ticket_no: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
  status: z.string().optional(),
  error_code: z.string().optional(),
  last_updated_at: z.string().datetime().optional(),
})

// ============================================================================
// KPI関連
// ============================================================================

export const KpiUnreservedSchema = z.object({
  ym: z.string().date(),
  unreserved: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  pct_unreserved: z.number().nonnegative().max(100),
})

// ============================================================================
// API リクエスト/レスポンス
// ============================================================================

export const IngestPlansRequestSchema = z.object({
  rows: z.array(z.record(z.any())),
})

export const IngestPlansResponseSchema = z.object({
  ok: z.boolean(),
  processed: z.number().int().nonnegative(),
})

export const SendReservationsResponseSchema = z.object({
  ok: z.boolean(),
  sent: z.number().int().nonnegative(),
})

export const CommitRegistrationsResponseSchema = z.object({
  ok: z.boolean(),
  sent: z.number().int().nonnegative(),
})

// ============================================================================
// 収集業者関連（統合済み - Userテーブルを使用）
// ============================================================================

// Collectorは統合されたUserテーブルを使用
// roleがCOLLECTORのユーザーを収集業者として扱う
export const CollectorSchema = UserSchema
export const CollectorCreateSchema = UserCreateSchema
export const CollectorUpdateSchema = UserUpdateSchema

export const StoreCollectorAssignmentSchema = OrgScopedSchema.extend({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  priority: z.number().int().min(1).max(10).default(1),
  is_active: z.boolean().default(true),
})

export const StoreCollectorAssignmentCreateSchema = StoreCollectorAssignmentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const StoreCollectorAssignmentUpdateSchema = StoreCollectorAssignmentCreateSchema.partial()

// ============================================================================
// 処分場マスター
// ============================================================================

export const DisposalSiteSchema = OrgScopedSchema.extend({
  collector_id: z.string().uuid(), // 収集業者ID
  company_name: z.string().min(1).max(255), // 会社名
  contact_person: z.string().max(255).optional(), // 担当者名
  address: z.string().min(1).max(500), // 住所
  phone: z.string().max(50).optional(), // 電話番号
  email: z.string().email().optional(), // メールアドレス
  jwnet_subscriber_id: z.string().max(50).optional(), // JWNET加入者番号
  jwnet_public_confirmation_id: z.string().max(50).optional(), // JWNET公開確認番号
  description: z.string().max(1000).optional(), // 説明
  is_active: z.boolean().default(true), // アクティブ状態
})

export const DisposalSiteCreateSchema = DisposalSiteSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const DisposalSiteUpdateSchema = DisposalSiteCreateSchema.partial()

export const CollectionRequestSchema = OrgScopedSchema.extend({
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  request_date: z.string().datetime(),
  status: CollectionRequestStatusSchema,
  requested_pickup_date: z.string().datetime().optional(),
  preferred_pickup_date: z.string().datetime().optional(),
  confirmed_pickup_date: z.string().datetime().optional(),
  confirmed_pickup_time: z.string().optional(),
  notes: z.string().optional(),
  jwnet_reservation_id: z.string().optional(),
  // 物品情報
  main_items: z.array(z.object({
    item_name: z.string().min(1).max(255),
    quantity: z.number().min(0),
    unit: z.string().min(1).max(50),
  })).default([]),
  other_items: z.array(z.object({
    item_name: z.string().min(1).max(255),
    quantity: z.number().min(0),
    unit: z.string().min(1).max(50),
  })).default([]),
})

export const CollectionRequestCreateSchema = CollectionRequestSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const CollectionRequestUpdateSchema = CollectionRequestCreateSchema.partial()

export const CollectionSchema = OrgScopedSchema.extend({
  collection_request_id: z.string().uuid(),
  store_id: z.string().uuid(),
  collector_id: z.string().uuid(),
  waste_type_id: z.string().uuid(),
  actual_pickup_date: z.string().datetime(),
  actual_pickup_time: z.string(),
  status: CollectionStatusSchema,
  actual_quantity: z.number().positive(),
  quantity: z.number().positive(),
  unit: UnitSchema,
  driver_name: z.string().optional(),
  vehicle_number: z.string().optional(),
  photo_urls: z.array(z.string().url()).default([]),
  notes: z.string().optional(),
  jwnet_registration_id: z.string().optional(),
  collected_at: z.string().datetime().optional(),
})

export const CollectionCreateSchema = CollectionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const CollectionUpdateSchema = CollectionCreateSchema.partial()

// ============================================================================
// JWNET連携関連
// ============================================================================

export const JwnetReservationSchema = OrgScopedSchema.extend({
  collection_request_id: z.string().uuid(),
  jwnet_reservation_id: z.string(),
  status: JwnetStatusSchema,
  jwnet_status: JwnetStatusSchema.optional(),
  submitted_at: z.string().datetime().optional(),
  accepted_at: z.string().datetime().optional(),
  rejected_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  manifest_no: z.string().optional(),
  jwnet_response: z.record(z.any()).optional(),
})

export const JwnetReservationCreateSchema = JwnetReservationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const JwnetReservationUpdateSchema = JwnetReservationCreateSchema.partial()

export const JwnetRegistrationSchema = OrgScopedSchema.extend({
  collection_id: z.string().uuid(),
  jwnet_registration_id: z.string(),
  status: JwnetStatusSchema,
  submitted_at: z.string().datetime().optional(),
  accepted_at: z.string().datetime().optional(),
  rejected_at: z.string().datetime().optional(),
  error_message: z.string().optional(),
  manifest_no: z.string().optional(),
  jwnet_response: z.record(z.any()).optional(),
})

export const JwnetRegistrationCreateSchema = JwnetRegistrationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
})

export const JwnetRegistrationUpdateSchema = JwnetRegistrationCreateSchema.partial()

// JWNET廃棄物コード関連のスキーマ
export const JwnetWasteCodeSchema = z.object({
  id: z.string().uuid(),
  waste_code: z.string(), // 廃棄物コード（例：001-01）
  waste_name: z.string(), // 廃棄物名称
  waste_category: z.string(), // 廃棄物の種類
  waste_type: z.string(), // 廃棄物の分類
  unit_code: z.string(), // 単位コード
  unit_name: z.string(), // 単位名称
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const JwnetWasteCodeCreateSchema = JwnetWasteCodeSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const JwnetWasteCodeUpdateSchema = JwnetWasteCodeCreateSchema.partial()

export type JwnetWasteCode = z.infer<typeof JwnetWasteCodeSchema>
export type JwnetWasteCodeCreate = z.infer<typeof JwnetWasteCodeCreateSchema>
export type JwnetWasteCodeUpdate = z.infer<typeof JwnetWasteCodeUpdateSchema>

// 廃棄物種別マスター（収集業者用）
export const WasteTypeMasterSchema = OrgScopedSchema.extend({
  collector_id: z.string().uuid(), // 収集業者ID
  waste_type_code: z.string().min(1).max(20), // 廃棄物種別コード（業者独自）
  waste_type_name: z.string().min(1).max(255), // 廃棄物種別名称
  name: z.string().min(1).max(255), // 廃棄物種別名称（エイリアス）
  waste_category: z.string().min(1).max(100), // 廃棄物の種類
  waste_classification: z.string().min(1).max(50), // 廃棄物の分類（産業廃棄物等）
  jwnet_waste_code: z.string().min(1).max(20), // JWNET廃棄物コード
  jwnet_waste_name: z.string().min(1).max(255), // JWNET廃棄物名称
  unit_code: z.string().min(1).max(10), // 単位コード
  unit_name: z.string().min(1).max(20), // 単位名称
  description: z.string().optional(), // 説明
  is_active: z.boolean().default(true), // アクティブ状態
  created_by_collector: z.string().uuid(), // 作成者（収集業者）
})

export const WasteTypeMasterCreateSchema = WasteTypeMasterSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

export const WasteTypeMasterUpdateSchema = WasteTypeMasterCreateSchema.partial()

export type WasteTypeMaster = z.infer<typeof WasteTypeMasterSchema>
export type WasteTypeMasterCreate = z.infer<typeof WasteTypeMasterCreateSchema>
export type WasteTypeMasterUpdate = z.infer<typeof WasteTypeMasterUpdateSchema>

// ユーザー管理スキーマ（収集業者も含む）
export const UserSchema = OrgScopedSchema.extend({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: AppRoleSchema,
  is_active: z.boolean().default(true),
  last_login_at: z.string().datetime().optional(),
  password_hash: z.string().optional(), // 実際のパスワードハッシュ
  created_by: z.string().uuid().optional(), // 作成者
  // 収集業者関連のフィールド（roleがCOLLECTORの場合のみ使用）
  company_name: z.string().max(255).optional(), // 会社名
  contact_person: z.string().max(255).optional(), // 担当者名
  phone: z.string().max(50).optional(), // 電話番号
  address: z.string().max(500).optional(), // 住所
  license_number: z.string().max(100).optional(), // ライセンス番号
  service_areas: z.array(z.string()).default([]), // サービスエリア
  // JWNET連携に必要な項目
  jwnet_subscriber_id: z.string().max(50).optional(), // 加入者番号
  jwnet_public_confirmation_id: z.string().max(50).optional(), // 公開確認番号
  // 仮登録管理
  is_temporary: z.boolean().default(false), // 仮登録フラグ
  temp_created_reason: z.string().optional(), // 仮登録理由
})

export const UserCreateSchema = UserSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  last_login_at: true,
  password_hash: true,
})

export const UserUpdateSchema = UserCreateSchema.partial().omit({
  email: true, // メールアドレスは変更不可
})

export const UserPasswordChangeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "パスワードが一致しません",
  path: ["confirm_password"],
})

export type User = z.infer<typeof UserSchema>
export type UserCreate = z.infer<typeof UserCreateSchema>
export type UserUpdate = z.infer<typeof UserUpdateSchema>
export type UserPasswordChange = z.infer<typeof UserPasswordChangeSchema>

// ============================================================================
// 型エクスポート
// ============================================================================

export type Organization = z.infer<typeof OrganizationSchema>
export type UserOrgRole = z.infer<typeof UserOrgRoleSchema>
export type Store = z.infer<typeof StoreSchema>
export type StoreCreate = z.infer<typeof StoreCreateSchema>
export type StoreUpdate = z.infer<typeof StoreUpdateSchema>
export type ItemMap = z.infer<typeof ItemMapSchema>
export type ItemMapCreate = z.infer<typeof ItemMapCreateSchema>
export type ItemMapUpdate = z.infer<typeof ItemMapUpdateSchema>
export type Contract = z.infer<typeof ContractSchema>
export type Plan = z.infer<typeof PlanSchema>
export type PlanCreate = z.infer<typeof PlanCreateSchema>
export type PlanUpdate = z.infer<typeof PlanUpdateSchema>
export type Reservation = z.infer<typeof ReservationSchema>
export type Actual = z.infer<typeof ActualSchema>
export type Registration = z.infer<typeof RegistrationSchema>
export type AuditLog = z.infer<typeof AuditLogSchema>
export type StagePlan = z.infer<typeof StagePlanSchema>
export type Approval = z.infer<typeof ApprovalSchema>
export type ManagedStore = z.infer<typeof ManagedStoreSchema>
export type ManagedStoreCreate = z.infer<typeof ManagedStoreCreateSchema>
export type ManagedStoreUpdate = z.infer<typeof ManagedStoreUpdateSchema>

export type BulkImportStore = z.infer<typeof BulkImportStoreSchema>
export type BulkImportResult = z.infer<typeof BulkImportResultSchema>
export type ImportHistory = z.infer<typeof ImportHistorySchema>
export type ImportHistoryCreate = z.infer<typeof ImportHistoryCreateSchema>
export type ImportHistoryUpdate = z.infer<typeof ImportHistoryUpdateSchema>
export type StoreManifestView = z.infer<typeof StoreManifestViewSchema>
export type KpiUnreserved = z.infer<typeof KpiUnreservedSchema>

export type Collector = z.infer<typeof CollectorSchema>
export type CollectorCreate = z.infer<typeof CollectorCreateSchema>
export type CollectorUpdate = z.infer<typeof CollectorUpdateSchema>
export type StoreCollectorAssignment = z.infer<typeof StoreCollectorAssignmentSchema>
export type StoreCollectorAssignmentCreate = z.infer<typeof StoreCollectorAssignmentCreateSchema>
export type StoreCollectorAssignmentUpdate = z.infer<typeof StoreCollectorAssignmentUpdateSchema>
export type CollectionRequest = z.infer<typeof CollectionRequestSchema>
export type CollectionRequestCreate = z.infer<typeof CollectionRequestCreateSchema>
export type CollectionRequestUpdate = z.infer<typeof CollectionRequestUpdateSchema>
export type Collection = z.infer<typeof CollectionSchema>
export type CollectionCreate = z.infer<typeof CollectionCreateSchema>
export type CollectionUpdate = z.infer<typeof CollectionUpdateSchema>
export type JwnetReservation = z.infer<typeof JwnetReservationSchema>
export type JwnetReservationCreate = z.infer<typeof JwnetReservationCreateSchema>
export type JwnetReservationUpdate = z.infer<typeof JwnetReservationUpdateSchema>
export type JwnetRegistration = z.infer<typeof JwnetRegistrationSchema>
export type JwnetRegistrationCreate = z.infer<typeof JwnetRegistrationCreateSchema>
export type JwnetRegistrationUpdate = z.infer<typeof JwnetRegistrationUpdateSchema>

export type IngestPlansRequest = z.infer<typeof IngestPlansRequestSchema>
export type IngestPlansResponse = z.infer<typeof IngestPlansResponseSchema>
export type SendReservationsResponse = z.infer<typeof SendReservationsResponseSchema>
export type CommitRegistrationsResponse = z.infer<typeof CommitRegistrationsResponseSchema>

// ============================================================================
// バリデーション関数
// ============================================================================

export function validateOrganization(data: unknown): Organization {
  return OrganizationSchema.parse(data)
}

export function validateStore(data: unknown): Store {
  return StoreSchema.parse(data)
}

export function validatePlan(data: unknown): Plan {
  return PlanSchema.parse(data)
}

export function validateReservation(data: unknown): Reservation {
  return ReservationSchema.parse(data)
}

export function validateActual(data: unknown): Actual {
  return ActualSchema.parse(data)
}

export function validateRegistration(data: unknown): Registration {
  return RegistrationSchema.parse(data)
}

// ============================================================================
// スキーマ一覧（開発・テスト用）
// ============================================================================

export const ALL_SCHEMAS = {
  AppRole: AppRoleSchema,
  Unit: UnitSchema,
  RegStatus: RegStatusSchema,
  CollectionRequestStatus: CollectionRequestStatusSchema,
  CollectionStatus: CollectionStatusSchema,
  JwnetStatus: JwnetStatusSchema,
  BaseEntity: BaseEntitySchema,
  OrgScoped: OrgScopedSchema,
  Organization: OrganizationSchema,
  UserOrgRole: UserOrgRoleSchema,
  Store: StoreSchema,
  ItemMap: ItemMapSchema,
  Contract: ContractSchema,
  Plan: PlanSchema,
  Reservation: ReservationSchema,
  Actual: ActualSchema,
  Registration: RegistrationSchema,
  AuditLog: AuditLogSchema,
  StagePlan: StagePlanSchema,
  Approval: ApprovalSchema,
  ManagedStore: ManagedStoreSchema,
  ImportHistory: ImportHistorySchema,
  StoreManifestView: StoreManifestViewSchema,
  KpiUnreserved: KpiUnreservedSchema,
  Collector: CollectorSchema,
  StoreCollectorAssignment: StoreCollectorAssignmentSchema,
  CollectionRequest: CollectionRequestSchema,
  Collection: CollectionSchema,
  JwnetReservation: JwnetReservationSchema,
  JwnetRegistration: JwnetRegistrationSchema,
  IngestPlansRequest: IngestPlansRequestSchema,
  IngestPlansResponse: IngestPlansResponseSchema,
  SendReservationsResponse: SendReservationsResponseSchema,
  CommitRegistrationsResponse: CommitRegistrationsResponseSchema,
} as const

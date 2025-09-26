// ============================================================================
// Repository共通インターフェース
// 作成日: 2025-09-16
// 目的: Dexie(IndexedDB)とSupabaseの統一インターフェース
// ============================================================================

export interface Repository<T, CreateInput, UpdateInput, FilterInput = Partial<T>> {
  // 基本CRUD操作
  findById(id: string): Promise<T | null>
  findMany(filter?: FilterInput): Promise<T[]>
  create(input: CreateInput): Promise<T>
  update(id: string, input: UpdateInput): Promise<T>
  delete(id: string): Promise<void>
  
  // 検索・ページネーション
  search(query: string, filter?: FilterInput): Promise<T[]>
  findWithPagination(
    page: number, 
    limit: number, 
    filter?: FilterInput
  ): Promise<{ data: T[]; total: number; page: number; limit: number }>
  
  // バッチ操作
  createMany(inputs: CreateInput[]): Promise<T[]>
  updateMany(updates: Array<{ id: string; data: UpdateInput }>): Promise<T[]>
  deleteMany(ids: string[]): Promise<void>
  
  // 集計・統計
  count(filter?: FilterInput): Promise<number>
  exists(id: string): Promise<boolean>
}

export interface OrgScopedRepository<T, CreateInput, UpdateInput, FilterInput = Partial<T>> 
  extends Repository<T, CreateInput, UpdateInput, FilterInput> {
  // 組織スコープ付きの操作
  findByOrgId(orgId: string, filter?: FilterInput): Promise<T[]>
  createForOrg(orgId: string, input: CreateInput): Promise<T>
  updateForOrg(orgId: string, id: string, input: UpdateInput): Promise<T>
  deleteForOrg(orgId: string, id: string): Promise<void>
}

// ============================================================================
// エラーハンドリング
// ============================================================================

export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class ValidationError extends RepositoryError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends RepositoryError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class DuplicateError extends RepositoryError {
  constructor(resource: string, field: string, value: string) {
    super(`${resource} with ${field} '${value}' already exists`, 'DUPLICATE')
    this.name = 'DuplicateError'
  }
}

// ============================================================================
// ページネーション
// ============================================================================

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// ============================================================================
// 検索・フィルタリング
// ============================================================================

export interface SearchParams {
  query: string
  fields: string[]
  filter?: Record<string, any>
}

export interface FilterOptions {
  [key: string]: any
}

// ============================================================================
// バッチ操作
// ============================================================================

export interface BatchCreateInput<T> {
  data: T[]
  validate?: boolean
}

export interface BatchUpdateInput<T> {
  updates: Array<{ id: string; data: Partial<T> }>
  validate?: boolean
}

export interface BatchDeleteInput {
  ids: string[]
  soft?: boolean
}

// ============================================================================
// トランザクション
// ============================================================================

export interface Transaction {
  commit(): Promise<void>
  rollback(): Promise<void>
}

export interface TransactionalRepository<T, CreateInput, UpdateInput, FilterInput = Partial<T>> 
  extends Repository<T, CreateInput, UpdateInput, FilterInput> {
  withTransaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>
}

// ============================================================================
// キャッシュ
// ============================================================================

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string
  tags?: string[]
}

export interface CachedRepository<T, CreateInput, UpdateInput, FilterInput = Partial<T>> 
  extends Repository<T, CreateInput, UpdateInput, FilterInput> {
  getCached(id: string, options?: CacheOptions): Promise<T | null>
  setCache(id: string, data: T, options?: CacheOptions): Promise<void>
  invalidateCache(id: string): Promise<void>
  invalidateCacheByTag(tag: string): Promise<void>
}

// ============================================================================
// 監査ログ
// ============================================================================

export interface AuditLog {
  id: string
  orgId: string
  actorId?: string
  actorRole?: string
  action: string
  entity: string
  entityId: string
  fromJson?: Record<string, any>
  toJson?: Record<string, any>
  ip?: string
  ua?: string
  createdAt: string
}

export interface AuditableRepository<T, CreateInput, UpdateInput, FilterInput = Partial<T>> 
  extends Repository<T, CreateInput, UpdateInput, FilterInput> {
  logAction(
    action: string,
    entity: string,
    entityId: string,
    fromJson?: Record<string, any>,
    toJson?: Record<string, any>
  ): Promise<void>
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit)
  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export function validatePaginationParams(params: PaginationParams): void {
  if (params.page < 1) {
    throw new ValidationError('Page must be greater than 0', 'page')
  }
  if (params.limit < 1 || params.limit > 1000) {
    throw new ValidationError('Limit must be between 1 and 1000', 'limit')
  }
}

export function buildSearchQuery(query: string, fields: string[]): string {
  return fields.map(field => `${field} ILIKE '%${query}%'`).join(' OR ')
}

// ============================================================================
// 型ガード
// ============================================================================

export function isRepositoryError(error: unknown): error is RepositoryError {
  return error instanceof RepositoryError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError
}

export function isDuplicateError(error: unknown): error is DuplicateError {
  return error instanceof DuplicateError
}

// ============================================================================
// 基底リポジトリクラス
// ============================================================================

export abstract class DexieRepository<T, CreateInput, UpdateInput> {
  protected db: any
  protected tableName: string

  constructor(db: any) {
    this.db = db
  }

  // データベース初期化の確認
  protected async ensureDatabaseInitialized(): Promise<void> {
    // データベースが初期化されていることを確認
    if (!this.db) {
      throw new Error('Database not initialized')
    }
  }

  // 基本CRUD操作
  async findById(id: string): Promise<T | null> {
    await this.ensureDatabaseInitialized()
    return await this.db.get(id)
  }

  async findMany(filter?: Partial<T>): Promise<T[]> {
    await this.ensureDatabaseInitialized()
    if (filter) {
      return await this.db.where(filter).toArray()
    }
    return await this.db.toArray()
  }

  async create(input: CreateInput): Promise<T> {
    await this.ensureDatabaseInitialized()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const data = {
      ...input,
      id,
      created_at: now,
      updated_at: now,
    }
    await this.db.add(data)
    return data as T
  }

  async update(id: string, input: UpdateInput): Promise<T> {
    await this.ensureDatabaseInitialized()
    const existing = await this.db.get(id)
    if (!existing) {
      throw new NotFoundError('Record', id)
    }
    const updated = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    }
    await this.db.put(updated)
    return updated as T
  }

  async delete(id: string): Promise<void> {
    await this.ensureDatabaseInitialized()
    const existing = await this.db.get(id)
    if (!existing) {
      throw new NotFoundError('Record', id)
    }
    await this.db.delete(id)
  }

  // 検索
  async search(query: string): Promise<T[]> {
    await this.ensureDatabaseInitialized()
    // 基本的な検索実装（サブクラスでオーバーライド可能）
    return await this.db.filter((record: T) => {
      return JSON.stringify(record).toLowerCase().includes(query.toLowerCase())
    }).toArray()
  }

  // ページネーション
  async findWithPagination(
    page: number,
    limit: number,
    filter?: Partial<T>
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    await this.ensureDatabaseInitialized()
    const offset = (page - 1) * limit
    let query = this.db
    if (filter) {
      query = query.where(filter)
    }
    const [data, total] = await Promise.all([
      query.offset(offset).limit(limit).toArray(),
      query.count()
    ])
    return { data, total, page, limit }
  }

  // バッチ操作
  async createMany(inputs: CreateInput[]): Promise<T[]> {
    await this.ensureDatabaseInitialized()
    const now = new Date().toISOString()
    const data = inputs.map(input => ({
      ...input,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }))
    await this.db.bulkAdd(data)
    return data as T[]
  }

  async updateMany(updates: Array<{ id: string; data: UpdateInput }>): Promise<T[]> {
    await this.ensureDatabaseInitialized()
    const results = []
    for (const { id, data } of updates) {
      const result = await this.update(id, data)
      results.push(result)
    }
    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.ensureDatabaseInitialized()
    await this.db.bulkDelete(ids)
  }

  // 集計・統計
  async count(filter?: Partial<T>): Promise<number> {
    await this.ensureDatabaseInitialized()
    if (filter) {
      return await this.db.where(filter).count()
    }
    return await this.db.count()
  }

  async exists(id: string): Promise<boolean> {
    await this.ensureDatabaseInitialized()
    const record = await this.db.get(id)
    return !!record
  }
}

export abstract class SqlRepository<T, CreateInput, UpdateInput> {
  protected supabase: any
  protected tableName: string

  constructor(supabase: any, tableName: string) {
    this.supabase = supabase
    this.tableName = tableName
  }

  // 基本CRUD操作
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch record: ${error.message}`)
    }

    return data
  }

  async findMany(filter?: Partial<T>): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .is('deleted_at', null)

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch records: ${error.message}`)
    }

    return data || []
  }

  async create(input: CreateInput): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(input)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create record: ${error.message}`)
    }

    return data
  }

  async update(id: string, input: UpdateInput): Promise<T> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(input)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update record: ${error.message}`)
    }

    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete record: ${error.message}`)
    }
  }

  // 検索
  async search(query: string): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to search records: ${error.message}`)
    }

    return data || []
  }

  // ページネーション
  async findWithPagination(
    page: number,
    limit: number,
    filter?: Partial<T>
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit

    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch paginated records: ${error.message}`)
    }

    return { data: data || [], total: count || 0, page, limit }
  }

  // バッチ操作
  async createMany(inputs: CreateInput[]): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(inputs)
      .select()

    if (error) {
      throw new Error(`Failed to create records: ${error.message}`)
    }

    return data || []
  }

  async updateMany(updates: Array<{ id: string; data: UpdateInput }>): Promise<T[]> {
    const results = []
    for (const { id, data } of updates) {
      const result = await this.update(id, data)
      results.push(result)
    }
    return results
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      throw new Error(`Failed to delete records: ${error.message}`)
    }
  }

  // 集計・統計
  async count(filter?: Partial<T>): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { count, error } = await query

    if (error) {
      throw new Error(`Failed to count records: ${error.message}`)
    }

    return count || 0
  }

  async exists(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    return !error && !!data
  }
}

// ============================================================================
// リポジトリファクトリー
// ============================================================================

export function getRepository<T, CreateInput, UpdateInput>(
  dexieRepo: DexieRepository<T, CreateInput, UpdateInput>,
  sqlRepo: SqlRepository<T, CreateInput, UpdateInput>
) {
  // 環境に応じてリポジトリを選択
  const useDexie = true // 現在はDexieを使用
  return useDexie ? dexieRepo : sqlRepo
}




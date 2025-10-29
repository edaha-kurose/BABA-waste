// ============================================================================
// 共通バリデーションスキーマ
// 目的: Zodスキーマの共通定義
// ============================================================================

import { z } from 'zod'

// UUID
export const uuidSchema = z.string().uuid()

// 日付
export const dateSchema = z.string().datetime().or(z.date())
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// ページネーション
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
})

// ステータス
export const regStatusSchema = z.enum(['PENDING', 'RESERVED', 'REGISTERED', 'FAILED', 'ERROR'])
export const unitSchema = z.enum(['T', 'KG', 'M3'])

// Plans
export const planCreateSchema = z.object({
  org_id: uuidSchema,
  store_id: uuidSchema,
  planned_date: dateOnlySchema,
  item_map_id: uuidSchema,
  planned_qty: z.number().positive(),
  unit: unitSchema,
  earliest_pickup_date: dateOnlySchema.optional(),
  route_id: z.string().optional(),
  created_by: uuidSchema.optional(),
})

export const planUpdateSchema = planCreateSchema.partial().omit({ org_id: true })

// Reservations
export const reservationCreateSchema = z.object({
  org_id: uuidSchema,
  plan_id: uuidSchema,
  jwnet_temp_id: z.string().optional(),
  payload_hash: z.string(),
  status: regStatusSchema.default('PENDING'),
  last_sent_at: dateSchema.optional(),
  error_code: z.string().optional(),
  created_by: uuidSchema.optional(),
})

export const reservationUpdateSchema = reservationCreateSchema
  .partial()
  .omit({ org_id: true, plan_id: true })

// Registrations
export const registrationCreateSchema = z.object({
  org_id: uuidSchema,
  plan_id: uuidSchema,
  manifest_no: z.string().optional(),
  status: regStatusSchema.default('PENDING'),
  error_code: z.string().optional(),
  last_sent_at: dateSchema.optional(),
  created_by: uuidSchema.optional(),
})

export const registrationUpdateSchema = registrationCreateSchema
  .partial()
  .omit({ org_id: true, plan_id: true })

// Actuals
export const actualCreateSchema = z.object({
  org_id: uuidSchema,
  plan_id: uuidSchema,
  actual_qty: z.number().positive(),
  unit: unitSchema,
  vehicle_no: z.string().optional(),
  driver_name: z.string().optional(),
  weighing_ticket_no: z.string().optional(),
  photo_urls: z.array(z.string().url()).optional(),
  created_by: uuidSchema.optional(),
})

export const actualUpdateSchema = actualCreateSchema.partial().omit({ org_id: true, plan_id: true })








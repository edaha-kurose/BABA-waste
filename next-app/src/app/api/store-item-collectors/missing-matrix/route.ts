import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

const QuerySchema = z.object({
  org_id: z.string().uuid().optional(),
  store_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(200),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.parse(Object.fromEntries(searchParams))

    const targetOrgId = parsed.org_id ?? authUser.org_id

    // 権限チェック: システム管理者 or 自組織
    if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 未設定の 店舗×品目 を抽出
    type MissingRow = { store_id: string; store_code: string; store_name: string; item_name: string; item_code: string | null }
    let rows: MissingRow[]
    try {
      rows = await prisma.$queryRaw<MissingRow[]>`
        SELECT
          s.id AS store_id,
          s.store_code AS store_code,
          s.name AS store_name,
          im.item_label AS item_name,
          im.jwnet_code AS item_code
        FROM app.stores s
        CROSS JOIN app.item_maps im
        WHERE s.org_id = ${targetOrgId}::uuid
          AND s.deleted_at IS NULL
          AND im.org_id = ${targetOrgId}::uuid
          AND im.deleted_at IS NULL
          ${parsed.store_id ? Prisma.sql`AND s.id = ${parsed.store_id}` : Prisma.empty}
          AND NOT EXISTS (
            SELECT 1 FROM app.store_item_collectors sic
            WHERE sic.store_id = s.id
              AND sic.item_name = im.item_label
              AND sic.deleted_at IS NULL
          )
        ORDER BY s.store_code ASC, im.item_label ASC
        LIMIT ${parsed.limit} OFFSET ${parsed.offset}
      `
    } catch (dbError) {
      console.error('[Missing Matrix GET] Database error - query:', dbError)
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
    }

    // 業者候補（全件）
    let collectors
    try {
      collectors = await prisma.collectors.findMany({
        where: { org_id: targetOrgId, deleted_at: null },
        orderBy: { company_name: 'asc' },
        select: { id: true, company_name: true },
      })
    } catch (dbError) {
      console.error('[Missing Matrix GET] Database error - collectors fetch:', dbError)
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
    }

    // 既存（理論上無いが、同時編集で存在し得る）をまとめて取得
    const compositeKeys = rows.map(r => ({ store_id: r.store_id, item_name: r.item_name }))
    let existing: Array<{ store_id: string; item_name: string; priority: number; collector_id: string; collectors: { company_name: string } }> = []
    if (compositeKeys.length > 0) {
      try {
        existing = await prisma.store_item_collectors.findMany({
          where: {
            OR: compositeKeys.map(k => ({ store_id: k.store_id, item_name: k.item_name, org_id: targetOrgId, deleted_at: null })),
          },
          orderBy: [{ store_id: 'asc' }, { item_name: 'asc' }, { priority: 'asc' }],
          include: { collectors: { select: { company_name: true } } },
        })
      } catch (dbError) {
        console.error('[Missing Matrix GET] Database error - existing assignments fetch:', dbError)
        return NextResponse.json({ error: 'Database error occurred' }, { status: 500 })
      }
    }

    const existingMap = new Map<string, any[]>(
      Object.entries(
        existing.reduce((acc: Record<string, any[]>, cur) => {
          const key = `${cur.store_id}__${cur.item_name}`
          acc[key] = acc[key] || []
          acc[key].push({ priority: cur.priority, collector_id: cur.collector_id, collector_name: cur.collectors.company_name })
          return acc
        }, {})
      )
    )

    const data = rows.map(r => ({
      store_id: r.store_id,
      store_code: r.store_code,
      store_name: r.store_name,
      item_name: r.item_name,
      item_code: r.item_code,
      current_assignments: existingMap.get(`${r.store_id}__${r.item_name}`) || [],
      collector_candidates: collectors,
    }))

    return NextResponse.json({ data, page_info: { offset: parsed.offset, limit: parsed.limit } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Missing Matrix GET] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}



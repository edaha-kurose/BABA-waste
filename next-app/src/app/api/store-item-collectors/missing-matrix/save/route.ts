import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

const SaveSchema = z.object({
  data: z.array(
    z.object({
      store_id: z.string().uuid(),
      item_name: z.string().min(1),
      item_code: z.string().optional().nullable(),
      assignments: z
        .array(
          z.object({
            priority: z.number().int().min(1).max(10),
            collector_id: z.string().uuid(),
          })
        )
        .max(10),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // JSON parse
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Missing Matrix SAVE] JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
    }

    // validate
    const { data } = SaveSchema.parse(body)

    // 権限: システム管理者 or 自組織（storeのorgを都度確認）
    const BATCH_SIZE = 100
    let updated = 0
    let failed: Array<{ key: string; error: string }> = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)

      try {
        await prisma.$transaction(async (tx) => {
          for (const row of batch) {
            // storeのorg確認
            const store = await tx.stores.findUnique({ where: { id: row.store_id }, select: { org_id: true } })
            if (!store) {
              throw new Error(`Store not found: ${row.store_id}`)
            }
            if (!authUser.isSystemAdmin && !authUser.org_ids.includes(store.org_id)) {
              throw new Error('Forbidden')
            }

            // item_codeをitem_mapsから取得
            let itemCode: string | null = null
            try {
              const itemMap = await tx.item_maps.findFirst({
                where: {
                  org_id: store.org_id,
                  item_label: row.item_name,
                  deleted_at: null,
                },
                select: { jwnet_code: true },
              })
              itemCode = itemMap?.jwnet_code || null
            } catch (itemMapError) {
              console.warn(`[Missing Matrix SAVE] item_maps検索エラー: ${row.item_name}`, itemMapError)
              // item_codeが取得できなくても処理は継続
            }

            // 既存削除
            await tx.store_item_collectors.deleteMany({
              where: { org_id: store.org_id, store_id: row.store_id, item_name: row.item_name },
            })

            // 新規作成（assignmentsが空ならスキップ）
            for (const a of row.assignments) {
              await tx.store_item_collectors.create({
                data: {
                  org_id: store.org_id,
                  store_id: row.store_id,
                  item_name: row.item_name,
                  item_code: itemCode, // item_mapsから自動取得
                  collector_id: a.collector_id,
                  priority: a.priority,
                  is_active: true,
                  created_by: authUser.id,
                  updated_by: authUser.id,
                },
              })
            }
            updated++
          }
        }, { maxWait: 120000, timeout: 180000 })
      } catch (dbError: any) {
        console.error('[Missing Matrix SAVE] transaction error:', dbError)
        failed = failed.concat(
          batch.map((r) => ({ key: `${r.store_id}:${r.item_name}`, error: dbError?.message || 'Unknown error' }))
        )
      }
    }

    return NextResponse.json({ success: true, updated, failed })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Missing Matrix SAVE] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}




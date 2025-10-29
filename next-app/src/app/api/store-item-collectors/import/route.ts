import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

const ImportRowSchema = z.object({
  store_code: z.string(),
  store_name: z.string().optional(),
  item_name: z.string(),
  item_code: z.string().optional(),
  collector_1: z.string().optional(),
  collector_2: z.string().optional(),
  collector_3: z.string().optional(),
  collector_4: z.string().optional(),
  collector_5: z.string().optional(),
  collector_6: z.string().optional(),
  collector_7: z.string().optional(),
  collector_8: z.string().optional(),
  collector_9: z.string().optional(),
  collector_10: z.string().optional(),
})

const ImportRequestSchema = z.object({
  data: z.array(ImportRowSchema).min(1, 'データが空です'),
})

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // JSON パースエラーハンドリング
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[Import] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = ImportRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data } = validation.data

    console.log(`[Import] 開始: ${data.length}件`)

    const BATCH_SIZE = 50
    let imported = 0
    const errors = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`[Import] バッチ ${i / BATCH_SIZE + 1}/${Math.ceil(data.length / BATCH_SIZE)}`)

      try {
        await prisma.$transaction(
          async (tx) => {
            for (const row of batch) {
              // 店舗ID取得
              const store = await tx.stores.findFirst({
                where: {
                  org_id: authUser.org_id,
                  store_code: row.store_code,
                  deleted_at: null,
                },
              })

              if (!store) {
                errors.push({ store_code: row.store_code, error: '店舗が見つかりません' })
                continue
              }

              // 業者リスト作成
              const collectors = []
              for (let j = 1; j <= 10; j++) {
                const collectorName = (row as any)[`collector_${j}`]
                if (collectorName && collectorName.trim() !== '') {
                  collectors.push(collectorName.trim())
                }
              }

              if (collectors.length === 0) continue

              // 既存データ削除
              await tx.store_item_collectors.deleteMany({
                where: {
                  org_id: authUser.org_id,
                  store_id: store.id,
                  item_name: row.item_name,
                },
              })

              // 新規データ登録
              for (let j = 0; j < collectors.length; j++) {
                const collectorName = collectors[j]

                // 業者ID取得
                const collector = await tx.collectors.findFirst({
                  where: {
                    org_id: authUser.org_id,
                    company_name: collectorName,
                    deleted_at: null,
                  },
                })

                if (!collector) {
                  errors.push({
                    store_code: row.store_code,
                    item_name: row.item_name,
                    collector: collectorName,
                    error: '業者が見つかりません',
                  })
                  continue
                }

                await tx.store_item_collectors.create({
                  data: {
                    org_id: authUser.org_id,
                    store_id: store.id,
                    item_name: row.item_name,
                    item_code: row.item_code || null,
                    collector_id: collector.id,
                    priority: j + 1,
                    is_active: true,
                    created_by: authUser.id,
                    updated_by: authUser.id,
                  },
                })

                imported++
              }
            }
          },
          {
            maxWait: 120000,
            timeout: 180000,
          }
        )
      } catch (error: any) {
        console.error(`[Import] バッチエラー:`, error)
        errors.push({ batch: i / BATCH_SIZE + 1, error: error.message })
      }
    }

    console.log(`[Import] 完了: ${imported}件, エラー: ${errors.length}件`)

    return NextResponse.json({
      success: true,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[Import] エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const maxDuration = 300 // 5分


import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// バリデーションスキーマ
const MatrixItemSchema = z.object({
  store_code: z.string(),
  item_name: z.string(),
  item_code: z.string().optional(),
  collectors: z.array(z.string()).max(10, '業者は最大10社まで登録できます'),
})

const MatrixRequestSchema = z.object({
  data: z.array(MatrixItemSchema),
})

// GET: マトリクスデータ取得
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser || !authUser.org_id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')

    const where: any = {
      org_id: authUser.org_id,
      deleted_at: null,
    }

    if (storeId) {
      where.store_id = storeId
    }

    // データ取得
    let items;
    try {
      items = await prisma.store_item_collectors.findMany({
        where,
        include: {
          stores: { select: { store_code: true, name: true } },
          collectors: { select: { id: true, company_name: true } },
        },
        orderBy: [
          { stores: { store_code: 'asc' } },
          { item_name: 'asc' },
          { priority: 'asc' },
        ],
      });
    } catch (dbError) {
      console.error('[Matrix GET] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // マトリクス形式に変換
    const matrix: Record<string, any> = {}

    for (const item of items) {
      const key = `${item.store_id}_${item.item_name}`
      if (!matrix[key]) {
        matrix[key] = {
          store_code: item.stores.store_code,
          store_name: item.stores.name,
          item_name: item.item_name,
          item_code: item.item_code || '',
          collectors: [],
        }
      }
      matrix[key].collectors.push({
        id: item.collector_id,
        name: item.collectors.company_name,
        priority: item.priority,
      })
    }

    return NextResponse.json({ data: Object.values(matrix) })
  } catch (error: any) {
    console.error('[Matrix GET] エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: マトリクスデータ保存
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
      console.error('[Matrix POST] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = MatrixRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data } = validation.data

    console.log(`[Matrix POST] 開始: ${data.length}件`)

    // トランザクション処理
    try {
      await prisma.$transaction(
        async (tx) => {
          for (const item of data) {
            // 店舗ID取得
            const store = await tx.stores.findFirst({
              where: {
                org_id: authUser.org_id,
                store_code: item.store_code,
                deleted_at: null,
              },
            })

            if (!store) {
              throw new Error(`店舗が見つかりません: ${item.store_code}`)
            }

            // 既存データ削除
            await tx.store_item_collectors.deleteMany({
              where: {
                org_id: authUser.org_id,
                store_id: store.id,
                item_name: item.item_name,
              },
            })

            // item_codeをitem_mapsから取得
            let itemCode: string | null = null
            try {
              const itemMap = await tx.item_maps.findFirst({
                where: {
                  org_id: authUser.org_id,
                  item_label: item.item_name,
                  deleted_at: null,
                },
                select: { jwnet_code: true },
              })
              itemCode = itemMap?.jwnet_code || null
            } catch (itemMapError) {
              console.warn(`[Matrix POST] item_maps検索エラー: ${item.item_name}`, itemMapError)
              // item_codeが取得できなくても処理は継続
            }

            // 新規データ登録
            for (let i = 0; i < item.collectors.length; i++) {
              const collectorName = item.collectors[i]

              // 業者ID取得
              const collector = await tx.collectors.findFirst({
                where: {
                  org_id: authUser.org_id,
                  company_name: collectorName,
                  deleted_at: null,
                },
              })

              if (!collector) {
                throw new Error(`業者が見つかりません: ${collectorName}`)
              }

              await tx.store_item_collectors.create({
                data: {
                  org_id: authUser.org_id,
                  store_id: store.id,
                  item_name: item.item_name,
                  item_code: itemCode, // item_mapsから自動取得
                  collector_id: collector.id,
                  priority: i + 1,
                  is_active: true,
                  created_by: authUser.id,
                  updated_by: authUser.id,
                },
              })
            }
          }
        },
        {
          maxWait: 120000, // 120秒
          timeout: 180000, // 180秒
        }
      );
    } catch (dbError) {
      console.error('[Matrix POST] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    console.log(`[Matrix POST] 完了`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Matrix POST] エラー:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const maxDuration = 300 // 5分


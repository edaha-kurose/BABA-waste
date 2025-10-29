import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

/**
 * 店舗×品目×業者マトリクス - インポート差分検出
 * 
 * 機能:
 * - アップロードされたExcelデータと既存データを比較
 * - 新規・更新・削除を検出
 * - ユーザーに確認を求めるための差分情報を返す
 */

const ImportRowSchema = z.object({
  店舗コード: z.string(),
  店舗名: z.string().optional(),
  廃棄品目: z.string(),
  品目コード: z.string().optional(),
  業者1: z.string().optional(),
  業者2: z.string().optional(),
  業者3: z.string().optional(),
  業者4: z.string().optional(),
  業者5: z.string().optional(),
  業者6: z.string().optional(),
  業者7: z.string().optional(),
  業者8: z.string().optional(),
  業者9: z.string().optional(),
  業者10: z.string().optional(),
})

const CheckDiffRequestSchema = z.object({
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
      console.error('[Check Diff] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = CheckDiffRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data } = validation.data

    console.log(`[Check Diff] 開始: ${data.length}件`)

    // 既存データ取得
    let existingData;
    try {
      existingData = await prisma.store_item_collectors.findMany({
        where: {
          org_id: authUser.org_id,
          deleted_at: null,
        },
        include: {
          stores: { select: { store_code: true, name: true } },
          collectors: { select: { company_name: true } },
        },
        orderBy: [
          { stores: { store_code: 'asc' } },
          { item_name: 'asc' },
          { priority: 'asc' },
        ],
      });
    } catch (dbError) {
      console.error('[Check Diff] Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      );
    }

    // 既存データをマトリクス形式に変換
    const existingMatrix: Record<
      string,
      { store_code: string; store_name: string; item_name: string; collectors: string[] }
    > = {}

    for (const item of existingData) {
      const key = `${item.stores.store_code}_${item.item_name}`
      if (!existingMatrix[key]) {
        existingMatrix[key] = {
          store_code: item.stores.store_code,
          store_name: item.stores.name,
          item_name: item.item_name,
          collectors: [],
        }
      }
      existingMatrix[key].collectors[item.priority - 1] = item.collectors.company_name
    }

    // 新規データをマトリクス形式に変換
    const newMatrix: Record<
      string,
      { store_code: string; store_name: string; item_name: string; collectors: string[] }
    > = {}

    for (const row of data) {
      const key = `${row.店舗コード}_${row.廃棄品目}`
      const collectors = []
      for (let i = 1; i <= 10; i++) {
        const collectorName = (row as any)[`業者${i}`]
        if (collectorName && collectorName.trim() !== '') {
          collectors.push(collectorName.trim())
        }
      }
      if (collectors.length > 0) {
        newMatrix[key] = {
          store_code: row.店舗コード,
          store_name: row.店舗名 || '',
          item_name: row.廃棄品目,
          collectors,
        }
      }
    }

    // 差分検出
    const diffs: Array<{
      type: 'new' | 'update' | 'unchanged'
      store_code: string
      store_name: string
      item_name: string
      old_collectors?: string[]
      new_collectors: string[]
    }> = []

    // 新規・更新を検出
    for (const [key, newData] of Object.entries(newMatrix)) {
      const existing = existingMatrix[key]

      if (!existing) {
        // 新規
        diffs.push({
          type: 'new',
          store_code: newData.store_code,
          store_name: newData.store_name,
          item_name: newData.item_name,
          new_collectors: newData.collectors,
        })
      } else {
        // 既存データと比較
        const oldCollectorsStr = existing.collectors.filter((c) => c).join(',')
        const newCollectorsStr = newData.collectors.join(',')

        if (oldCollectorsStr !== newCollectorsStr) {
          // 更新
          diffs.push({
            type: 'update',
            store_code: newData.store_code,
            store_name: newData.store_name,
            item_name: newData.item_name,
            old_collectors: existing.collectors.filter((c) => c),
            new_collectors: newData.collectors,
          })
        } else {
          // 変更なし
          diffs.push({
            type: 'unchanged',
            store_code: newData.store_code,
            store_name: newData.store_name,
            item_name: newData.item_name,
            new_collectors: newData.collectors,
          })
        }
      }
    }

    // 統計情報
    const newCount = diffs.filter((d) => d.type === 'new').length
    const updateCount = diffs.filter((d) => d.type === 'update').length
    const unchangedCount = diffs.filter((d) => d.type === 'unchanged').length

    console.log(
      `[Check Diff] 完了: 新規 ${newCount}件, 更新 ${updateCount}件, 変更なし ${unchangedCount}件`
    )

    return NextResponse.json({
      success: true,
      summary: {
        new: newCount,
        update: updateCount,
        unchanged: unchangedCount,
        total: diffs.length,
      },
      diffs: diffs.filter((d) => d.type !== 'unchanged'), // 変更ありのみ返す
    })
  } catch (error: any) {
    console.error('[Check Diff] エラー:', error)
    return NextResponse.json(
      {
        error: '差分検出に失敗しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}





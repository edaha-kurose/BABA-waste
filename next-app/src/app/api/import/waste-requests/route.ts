import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// Next.js API Route の最大実行時間を5分に設定
export const maxDuration = 300 // 300秒 = 5分

// 新規店舗の事前確認API
export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url)
  const org_id = authUser.org_id
  const store_codes = searchParams.get('store_codes')

  try {

    console.log('[Store Check API] リクエスト:', { org_id, store_codes })

    if (!store_codes) {
      console.error('[Store Check API] パラメータ不足:', { store_codes })
      return NextResponse.json(
        { error: '店舗コードは必須です', details: `store_codes: ${store_codes}` },
        { status: 400 }
      )
    }

    const codes = store_codes.split(',').filter((code) => code && code.trim())
    
    if (codes.length === 0) {
      console.error('[Store Check API] 店舗コードが空です')
      return NextResponse.json(
        { error: '店舗コードが空です', details: `元の文字列: "${store_codes}"` },
        { status: 400 }
      )
    }

    console.log('[Store Check API] チェック対象店舗コード:', codes)

    const existingStores = await prisma.stores.findMany({
      where: {
        org_id,
        store_code: { in: codes },
        deleted_at: null,
      },
      select: { store_code: true, name: true },
    })

    console.log('[Store Check API] 既存店舗:', existingStores.length, '件')

    const existingCodes = new Set(existingStores.map((s) => s.store_code))
    const newStores = codes.filter((code) => !existingCodes.has(code))

    console.log('[Store Check API] 新規店舗:', newStores.length, '件')

    return NextResponse.json({
      existingStores,
      newStores,
      hasNewStores: newStores.length > 0,
    })
  } catch (error: any) {
    console.error('[Store Check API] 致命的エラー:', error)
    console.error('[Store Check API] エラースタック:', error.stack)
    return NextResponse.json(
      { 
        error: '店舗確認に失敗しました',
        details: error.message || '不明なエラー',
        stack: error.stack
      },
      { status: 500 }
    )
  }
}

// 廃棄依頼のエクセル取り込みAPI（バッチ処理+トランザクション）
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let body
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: '不正なJSONフォーマットです' }, { status: 400 });
  }

  const { data, auto_create_stores = true } = body
  const org_id = authUser.org_id
  const user_id = authUser.id

  if (!data || !Array.isArray(data)) {
    return NextResponse.json(
      { error: 'データは必須です' },
      { status: 400 }
    )
  }

  try {

    console.log(
      `[Import API] 開始: ${data.length}件のデータを取り込みます (auto_create_stores: ${auto_create_stores})`
    )

    const BATCH_SIZE = 50  // 50件ずつ処理（より細かく）
    let successRows = 0
    let errorRows = 0
    const errors: string[] = []
    const newStores: string[] = []
    const missingCollectorStores: string[] = []

    // バッチ処理（50件ずつ）
    for (let batchStart = 0; batchStart < data.length; batchStart += BATCH_SIZE) {
      const batch = data.slice(batchStart, batchStart + BATCH_SIZE)
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(data.length / BATCH_SIZE)
      
      console.log(
        `[Import API] バッチ ${batchNum}/${totalBatches} 処理中... (${batchStart + 1}〜${Math.min(batchStart + BATCH_SIZE, data.length)}件目)`
      )

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const rowIndex = batchStart + i
          const row = batch[i]

          try {
            const { store_code, store_name, area, main_items, other_items } = row

            if (!store_code || !store_name) {
              throw new Error(
                `店舗コード(${store_code || '未設定'})または店舗名(${store_name || '未設定'})が不足しています`
              )
            }

            // 店舗を検索または作成
            let store = await tx.stores.findFirst({
              where: {
                org_id,
                store_code: String(store_code),
                deleted_at: null,
              },
              include: {
                store_collector_assignments: {
                  where: { is_active: true },
                },
              },
            })

            if (!store) {
              if (!auto_create_stores) {
                throw new Error(
                  `店舗コード「${store_code}」が登録されていません。先に店舗マスターに登録してください。`
                )
              }

              // 店舗が存在しない場合は新規作成
              store = await tx.stores.create({
                data: {
                  org_id,
                  store_code: String(store_code),
                  name: String(store_name),
                  area: area ? String(area) : null,
                  created_by: user_id,
                  updated_by: user_id,
                },
                include: {
                  store_collector_assignments: {
                    where: { is_active: true },
                  },
                },
              })

              newStores.push(`${store_code} (${store_name})`)
            }

            // 収集業者の割当チェック
            if (!store.store_collector_assignments || store.store_collector_assignments.length === 0) {
              missingCollectorStores.push(`${store.store_code} (${store.name})`)
            }

            // 収集依頼を作成
            await tx.collection_requests.create({
              data: {
                org_id,
                store_id: store.id,
                main_items: JSON.stringify(main_items || []),
                other_items: JSON.stringify(other_items || []),
                status: 'PENDING',
                requested_at: new Date(),
                created_by: user_id,
                updated_by: user_id,
              },
            })

            successRows++
          } catch (err: any) {
            errorRows++
            errors.push(`行${rowIndex + 1}: ${err.message}`)
            console.error(`[Import API] 行${rowIndex + 1} エラー:`, err.message)
          }
        }
      }, {
        timeout: 120000, // 120秒のタイムアウト（大量データ対応）
        maxWait: 150000, // 最大待機時間: 150秒
      })
    }

    // 結果判定
    const status = errorRows === 0 ? 'SUCCESS' : successRows === 0 ? 'FAILED' : 'PARTIAL'

    console.log(
      `[Import API] 完了: ${successRows}件成功、${errorRows}件失敗、${newStores.length}件新規店舗作成`
    )

    return NextResponse.json({
      success: status !== 'FAILED',
      totalRows: data.length,
      successRows,
      errorRows,
      status,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined, // 最大50件まで
      newStores: newStores.length > 0 ? newStores : undefined,
      missingCollectorStores:
        missingCollectorStores.length > 0 ? missingCollectorStores : undefined,
      hasMoreErrors: errors.length > 50,
    })
  } catch (error: any) {
    console.error('[Import API] 致命的エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '廃棄依頼の取り込みに失敗しました',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}


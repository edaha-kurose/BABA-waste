import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// エクセル取り込みAPI（サーバーサイド処理）
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let formData
  try {
    formData = await request.formData();
  } catch (error) {
    return NextResponse.json({ error: 'フォームデータの解析に失敗しました' }, { status: 400 });
  }

  const file = formData.get('file') as File
  const import_type = formData.get('import_type') as 'PLANS' | 'STORES' | 'ITEMS'

  if (!file || !import_type) {
    return NextResponse.json(
      { error: 'ファイルと取り込み種別は必須です' },
      { status: 400 }
    )
  }

  const org_id = authUser.org_id
  const user_id = authUser.id

  try {

    // ファイル読み込み
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

    let successRows = 0
    let errorRows = 0
    const errors: string[] = []

    // 取り込み種別に応じた処理
    switch (import_type) {
      case 'PLANS':
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index]
          try {
            // バリデーション
            if (!row['店舗コード'] || !row['品目名'] || !row['予定数量']) {
              throw new Error(`行${index + 2}: 必須項目が不足しています`)
            }

            // 店舗検索
            const store = await prisma.stores.findFirst({
              where: {
                org_id,
                store_code: String(row['店舗コード']),
                deleted_at: null,
              },
            })

            if (!store) {
              throw new Error(`行${index + 2}: 店舗コード「${row['店舗コード']}」が見つかりません`)
            }

            // 品目マップ検索
            const itemMap = await prisma.item_maps.findFirst({
              where: {
                org_id,
                item_label: String(row['品目名']),
                deleted_at: null,
              },
            })

            if (!itemMap) {
              throw new Error(`行${index + 2}: 品目「${row['品目名']}」が見つかりません`)
            }

            // 予定作成
            await prisma.plans.create({
              data: {
                org_id,
                store_id: store.id,
                item_map_id: itemMap.id,
                planned_date: new Date(row['予定日']),
                planned_qty: parseFloat(String(row['予定数量'])),
                unit: (row['単位'] as 'T' | 'KG' | 'M3') || 'T',
                created_by: user_id || null,
                updated_by: user_id || null,
              },
            })

            successRows++
          } catch (err: any) {
            errorRows++
            errors.push(err.message)
          }
        }
        break

      case 'STORES':
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index]
          try {
            if (!row['店舗コード'] || !row['店舗名']) {
              throw new Error(`行${index + 2}: 必須項目が不足しています`)
            }

            await prisma.stores.upsert({
              where: {
                org_id_store_code: {
                  org_id,
                  store_code: String(row['店舗コード']),
                },
              },
              update: {
                name: String(row['店舗名']),
                address: row['住所'] ? String(row['住所']) : null,
                area: row['エリア'] ? String(row['エリア']) : null,
                updated_by: user_id || null,
              },
              create: {
                org_id,
                store_code: String(row['店舗コード']),
                name: String(row['店舗名']),
                address: row['住所'] ? String(row['住所']) : null,
                area: row['エリア'] ? String(row['エリア']) : null,
                created_by: user_id || null,
                updated_by: user_id || null,
              },
            })

            successRows++
          } catch (err: any) {
            errorRows++
            errors.push(err.message)
          }
        }
        break

      case 'ITEMS':
        for (let index = 0; index < jsonData.length; index++) {
          const row = jsonData[index]
          try {
            if (!row['品目ラベル'] || !row['JWNETコード']) {
              throw new Error(`行${index + 2}: 必須項目が不足しています`)
            }

            await prisma.item_maps.create({
              data: {
                org_id,
                item_label: String(row['品目ラベル']),
                jwnet_code: String(row['JWNETコード']),
                hazard: row['有害性'] === '有害' || row['有害性'] === true,
                default_unit: (row['デフォルト単位'] as 'T' | 'KG' | 'M3') || 'T',
                created_by: user_id || null,
                updated_by: user_id || null,
              },
            })

            successRows++
          } catch (err: any) {
            errorRows++
            errors.push(err.message)
          }
        }
        break

      default:
        return NextResponse.json(
          { error: '不正な取り込み種別です' },
          { status: 400 }
        )
    }

    // 結果返却
    const status = errorRows === 0 ? 'SUCCESS' : successRows === 0 ? 'FAILED' : 'PARTIAL'

    return NextResponse.json({
      success: true,
      fileName: file.name,
      importType: import_type,
      totalRows: jsonData.length,
      successRows,
      errorRows,
      status,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Excel Import API] エラー:', error)
    return NextResponse.json(
      { error: 'エクセル取り込みに失敗しました' },
      { status: 500 }
    )
  }
}

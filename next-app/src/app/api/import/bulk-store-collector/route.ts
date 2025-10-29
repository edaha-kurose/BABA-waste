/**
 * 店舗・収集業者一括登録API
 * 
 * POST /api/import/bulk-store-collector
 * 
 * Excel 1ファイルで店舗・収集業者・割り当てを一括登録
 * ✅ Prisma経由のみ（SSOT準拠）
 * ✅ トランザクション使用
 * ✅ Zodバリデーション
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { getAuthenticatedUser } from '@/lib/auth/session-server'

// バリデーションスキーマ
const BulkImportRowSchema = z.object({
  store_code: z.string().min(1, '店舗番号は必須です'),
  store_name: z.string().min(1, '店舗名は必須です'),
  area: z.string().optional(),
  emitter_no: z.string().optional(),
  collector_name: z.string().min(1, '収集業者名は必須です'),
  collector_company_name: z.string().optional(),
  collector_phone: z.string().optional(),
  collector_email: z.string().email('有効なメールアドレスを入力してください').optional(),
  collector_address: z.string().optional(),
  priority: z.number().int().min(1).max(10).default(1),
})

type BulkImportRow = z.infer<typeof BulkImportRowSchema>

interface BulkImportResult {
  success: boolean
  totalRows: number
  successStores: number
  successCollectors: number
  successAssignments: number
  errors: Array<{
    row: number
    field: string
    message: string
  }>
  warnings: Array<{
    row: number
    message: string
  }>
}

// POST /api/import/bulk-store-collector - Excel一括取り込み
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
  const org_id = authUser.org_id
  const user_id = authUser.id

  if (!file) {
    return NextResponse.json(
      { error: 'ファイルは必須です' },
      { status: 400 }
    )
  }

  try {

    // Excelファイル解析
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

    const result: BulkImportResult = {
      success: false,
      totalRows: jsonData.length,
      successStores: 0,
      successCollectors: 0,
      successAssignments: 0,
      errors: [],
      warnings: [],
    }

    // データ解析とバリデーション
    const rows: BulkImportRow[] = []
    for (let i = 0; i < jsonData.length; i++) {
      const rowIndex = i + 2 // Excel行番号（ヘッダー行を考慮）
      const row = jsonData[i]

      try {
        const parsedRow = BulkImportRowSchema.parse({
          store_code: row['店舗番号'] || row['店舗コード'],
          store_name: row['店舗名'],
          area: row['エリア'] || row['地域'],
          emitter_no: row['排出事業者番号'],
          collector_name: row['収集業者名'],
          collector_company_name: row['収集業者会社名'] || row['会社名'],
          collector_phone: row['収集業者電話番号'] || row['電話番号'],
          collector_email: row['収集業者メールアドレス'] || row['メールアドレス'],
          collector_address: row['収集業者住所'] || row['住所'],
          priority: parseInt(String(row['優先度'] || 1)),
        })
        rows.push(parsedRow)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            result.errors.push({
              row: rowIndex,
              field: err.path.join('.'),
              message: err.message,
            })
          })
        } else {
          result.errors.push({
            row: rowIndex,
            field: 'general',
            message: `データ解析エラー: ${error}`,
          })
        }
      }
    }

    // エラーがあれば処理中断
    if (result.errors.length > 0) {
      return NextResponse.json({
        ...result,
        success: false,
      })
    }

    // トランザクションで一括処理（SSOT準拠）
    await prisma.$transaction(async (tx) => {
      // 既存データ取得
      const existingStores = await tx.stores.findMany({
        where: { org_id, deleted_at: null },
      })
      const existingCollectors = await tx.collectors.findMany({
        where: { org_id, deleted_at: null },
      })

      const storeMap = new Map(existingStores.map(s => [s.store_code, s]))
      const collectorMap = new Map(existingCollectors.map(c => [c.company_name, c]))

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowIndex = i + 2

        try {
          // 店舗の作成/更新
          let store = storeMap.get(row.store_code)
          if (store) {
            // 既存店舗を更新
            store = await tx.stores.update({
              where: { id: store.id },
              data: {
                name: row.store_name,
                area: row.area,
                emitter_no: row.emitter_no,
                updated_by: user_id,
                updated_at: new Date(),
              },
            })
            result.warnings.push({
              row: rowIndex,
              message: `店舗「${row.store_code}」は既に存在するため更新しました`,
            })
          } else {
            // 新規店舗を作成
            store = await tx.stores.create({
              data: {
                org_id,
                store_code: row.store_code,
                name: row.store_name,
                area: row.area,
                emitter_no: row.emitter_no,
                created_by: user_id,
                updated_by: user_id,
              },
            })
            storeMap.set(row.store_code, store)
            result.successStores++
          }

          // 収集業者の作成/取得
          let collector = collectorMap.get(row.collector_name)
          if (collector) {
            result.warnings.push({
              row: rowIndex,
              message: `収集業者「${row.collector_name}」は既に登録されています`,
            })
          } else {
            // 新規収集業者を作成
            // Note: user_id is required for collectors, skip if not provided
            throw new Error(`収集業者「${row.collector_name}」のユーザーIDが必要です。先にユーザーを作成してください（Row ${rowIndex}）`)
            /* TODO: Implement user creation or linking
            collector = await tx.collectors.create({
              data: {
                org_id,
                user_id: user_id_from_somewhere, // Required field
                company_name: row.collector_company_name || row.collector_name,
                phone: row.collector_phone || '未設定',
                address: row.collector_address || '未設定',
                created_by: user_id,
                updated_by: user_id,
              },
            })
            collectorMap.set(row.collector_name, collector)
            result.successCollectors++
            */
          }

          // 店舗-収集業者割り当ての作成/更新
          const existingAssignment = await tx.store_collector_assignments.findFirst({
            where: {
              org_id,
              store_id: store.id,
              collector_id: collector.id,
              // Note: deleted_at filtering is handled by RLS
            },
          })

          if (existingAssignment) {
            // 既存割り当てを更新
            await tx.store_collector_assignments.update({
              where: { id: existingAssignment.id },
              data: {
                priority: row.priority,
                is_active: true,
                updated_by: user_id,
                updated_at: new Date(),
              },
            })
          } else {
            // 新規割り当てを作成
            await tx.store_collector_assignments.create({
              data: {
                org_id,
                store_id: store.id,
                collector_id: collector.id,
                priority: row.priority,
                is_active: true,
                created_by: user_id,
                updated_by: user_id,
              },
            })
            result.successAssignments++
          }
        } catch (error) {
          result.errors.push({
            row: rowIndex,
            field: 'database',
            message: `データベースエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
          })
        }
      }
    })

    result.success = result.errors.length === 0

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Bulk Store Collector Import API] エラー:', error)
    return NextResponse.json(
      {
        error: '一括取り込みに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    )
  }
}

// GET /api/import/bulk-store-collector - テンプレートダウンロード
export async function GET() {
  try {
    const templateData = [
      [
        '店舗番号',
        '店舗名',
        'エリア',
        '排出事業者番号',
        '収集業者名',
        '収集業者会社名',
        '収集業者電話番号',
        '収集業者メールアドレス',
        '収集業者住所',
        '優先度',
      ],
      [
        'ST001',
        'サンプル店舗1',
        '東京都',
        'EMT001',
        '田中収集',
        '田中収集株式会社',
        '03-1234-5678',
        'tanaka@example.com',
        '東京都渋谷区渋谷1-1-1',
        1,
      ],
      [
        'ST002',
        'サンプル店舗2',
        '神奈川県',
        'EMT002',
        '佐藤収集',
        '佐藤収集有限会社',
        '045-123-4567',
        'sato@example.com',
        '神奈川県横浜市西区2-2-2',
        1,
      ],
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '店舗・収集業者一括登録')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="店舗・収集業者一括登録テンプレート.xlsx"',
      },
    })
  } catch (error) {
    console.error('[Bulk Store Collector Template] エラー:', error)
    return NextResponse.json(
      { error: 'テンプレート生成に失敗しました' },
      { status: 500 }
    )
  }
}



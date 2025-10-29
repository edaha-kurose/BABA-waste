import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { z } from 'zod'

// バリデーションスキーマ
const CollectorImportSchema = z.object({
  company_name: z.string().min(1, '業者名は必須です'),
  phone: z.string().optional(),
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  contact_person: z.string().optional(),
  address: z.string().optional(),
  license_number: z.string().optional(),
})

const ImportRequestSchema = z.object({
  data: z.array(CollectorImportSchema).min(1, 'データが空です'),
})

export async function POST(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser || !authUser.org_id) {
    return NextResponse.json(
      { success: false, error: '認証が必要です' },
      { status: 401 }
    )
  }

  // リクエストボディ取得
  let body
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json(
      { success: false, error: '不正なJSONフォーマットです' },
      { status: 400 }
    );
  }

  try {
    // バリデーション
    const validation = ImportRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'バリデーションエラー', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data } = validation.data

    console.log(`[Collector Import] 開始: ${data.length}件`)

    // バッチ処理
    const BATCH_SIZE = 50
    const results = []
    const errors = []

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      console.log(`[Collector Import] バッチ ${i / BATCH_SIZE + 1}/${Math.ceil(data.length / BATCH_SIZE)}: ${batch.length}件`)

      try {
        // トランザクション内で処理
        await prisma.$transaction(
          async (tx) => {
            for (const item of batch) {
              // 重複チェック（同じ組織内で同じ業者名）
              const existing = await tx.collectors.findFirst({
                where: {
                  org_id: authUser.org_id,
                  company_name: item.company_name,
                  deleted_at: null,
                },
              })

              if (existing) {
                // 既存の場合はスキップ（またはエラー）
                errors.push({
                  company_name: item.company_name,
                  error: '既に登録されています',
                })
                continue
              }

              // 新規作成
              const newCollector = await tx.collectors.create({
                data: {
                  org_id: authUser.org_id,
                  company_name: item.company_name,
                  phone: item.phone || null,
                  email: item.email || null,
                  contact_person: item.contact_person || null,
                  address: item.address || null,
                  license_number: item.license_number || null,
                  is_active: true,
                  created_by: authUser.id,
                  updated_by: authUser.id,
                },
              })

              results.push(newCollector)
            }
          },
          {
            maxWait: 60000, // 60秒
            timeout: 120000, // 120秒
          }
        )
      } catch (error: any) {
        console.error(`[Collector Import] バッチエラー:`, error)
        errors.push({
          batch: i / BATCH_SIZE + 1,
          error: error.message,
        })
      }
    }

    console.log(`[Collector Import] 完了: 成功 ${results.length}件, エラー ${errors.length}件`)

    return NextResponse.json({
      success: true,
      imported: results.length,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('[Collector Import] エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'インポートに失敗しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// タイムアウト設定
export const maxDuration = 300 // 5分

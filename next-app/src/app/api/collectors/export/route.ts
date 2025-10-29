import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  // 認証チェック
  const authUser = await getAuthenticatedUser(request)
  if (!authUser || !authUser.org_id) {
    return NextResponse.json(
      { success: false, error: '認証が必要です' },
      { status: 401 }
    )
  }

  console.log(`[Collector Export] 開始: org_id=${authUser.org_id}`)

  // 業者データ取得
  let collectors
  try {
    collectors = await prisma.collectors.findMany({
      where: {
        org_id: authUser.org_id,
        deleted_at: null,
      },
      orderBy: {
        company_name: 'asc',
      },
      select: {
        company_name: true,
        phone: true,
        email: true,
        contact_person: true,
        address: true,
        license_number: true,
      },
    });
  } catch (dbError) {
    console.error('[GET /api/collectors/export] Prisma検索エラー:', dbError);
    return NextResponse.json(
      {
        success: false,
        error: 'データベースエラーが発生しました',
      },
      { status: 500 }
    );
  }

  console.log(`[Collector Export] 取得: ${collectors.length}件`)

  try {
    // Excelデータ作成
    const excelData = collectors.map((c) => ({
      業者名: c.company_name,
      電話番号: c.phone || '',
      メールアドレス: c.email || '',
      担当者: c.contact_person || '',
      住所: c.address || '',
      許可番号: c.license_number || '',
    }))

    // ワークブック作成
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // 列幅設定
    ws['!cols'] = [
      { wch: 30 }, // 業者名
      { wch: 15 }, // 電話番号
      { wch: 30 }, // メールアドレス
      { wch: 15 }, // 担当者
      { wch: 40 }, // 住所
      { wch: 20 }, // 許可番号
    ]

    XLSX.utils.book_append_sheet(wb, ws, '業者マスター')

    // Excelファイルをバッファに変換
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // レスポンス返却
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="collectors_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    console.error('[Collector Export] Excelエラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'エクスポートに失敗しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

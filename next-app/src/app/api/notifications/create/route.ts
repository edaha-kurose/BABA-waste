import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/session-server'
import { 
  UnregisteredNotification, 
  UnregisteredNotificationPlainText 
} from '@/lib/email/templates/UnregisteredNotification'
import React from 'react'

export async function POST(request: NextRequest) {
  // 1. 認証チェック
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Notification Create] 未登録検出開始...')

  // 2. 店舗×品目で収集業者が未割り当ての組み合わせを検出
  let unassignedMatrix
  try {
    unassignedMatrix = await prisma.$queryRaw<Array<{
      store_id: string
      store_name: string
      item_name: string
    }>>`
      SELECT 
        s.id as store_id,
        s.name as store_name,
        im.item_label as item_name
      FROM app.stores s
      CROSS JOIN app.item_maps im
      WHERE s.org_id = ${user.org_id}::uuid
        AND s.deleted_at IS NULL
        AND im.org_id = ${user.org_id}::uuid
        AND im.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM app.store_item_collectors sic
          WHERE sic.store_id = s.id
            AND sic.item_name = im.item_label
            AND sic.deleted_at IS NULL
        )
    `
  } catch (dbError) {
    console.error('[POST /api/notifications/create] 未割り当て検出エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

    // 3. 収集業者に単価が未設定の項目を検出
  let unpricedWasteTypes
  try {
    unpricedWasteTypes = await prisma.waste_type_masters.findMany({
      where: {
        org_id: user.org_id,
        deleted_at: null,
        OR: [
          { unit_price: null },
          { unit_price: 0 },
        ],
      },
      include: {
        collectors: {
          select: {
            company_name: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/notifications/create] 未単価検出エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  const unregisteredItems = [
    ...unassignedMatrix.map(item => ({
      store_name: item.store_name,
      item_name: item.item_name,
      collector_name: undefined,
    })),
    ...unpricedWasteTypes.map(wt => ({
      store_name: '（全店舗）',
      item_name: wt.waste_type_name,
      collector_name: wt.collectors?.company_name || '不明',
    })),
  ]

  console.log('[Notification Create] 未登録項目:', unregisteredItems.length, '件')

  if (unregisteredItems.length === 0) {
    return NextResponse.json({
      success: true,
      message: '未登録項目はありません',
      count: 0,
    })
  }

  // 4. 組織の管理者を取得
  let adminUsers
  try {
    adminUsers = await prisma.user_org_roles.findMany({
      where: {
        org_id: user.org_id,
        role: 'ADMIN',
        is_active: true,
        deleted_at: null,
      },
      include: {
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })
  } catch (dbError) {
    console.error('[POST /api/notifications/create] 管理者取得エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  console.log('[Notification Create] 管理者:', adminUsers.length, '人')

  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/dashboard`

  // 5. メールキューに登録
  let queueItems
  try {
    // 動的インポートでreact-dom/serverをインポート（ビルドエラー回避）
    const { renderToStaticMarkup } = await import('react-dom/server')
    
    queueItems = await Promise.all(
      adminUsers.map(async (admin) => {
        const html = renderToStaticMarkup(
          React.createElement(UnregisteredNotification, {
            recipientName: admin.users.name,
            unregisteredItems,
            dashboardUrl,
          })
        )

        const text = UnregisteredNotificationPlainText({
          recipientName: admin.users.name,
          unregisteredItems,
          dashboardUrl,
        })

        return prisma.email_queue.create({
          data: {
            org_id: user.org_id,
            to_email: admin.users.email,
            to_name: admin.users.name,
            subject: `【重要】未登録項目の通知 (${unregisteredItems.length}件)`,
            body_html: html,
            body_text: text,
            template_type: 'NOTIFICATION',
            related_entity_type: 'unregistered_items',
            related_entity_id: null,
            status: 'PENDING',
            priority: 2, // 高優先度
            scheduled_at: new Date(),
          },
        })
      })
    )
  } catch (dbError) {
    console.error('[POST /api/notifications/create] メールキュー登録エラー:', dbError)
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    )
  }

  console.log('[Notification Create] ✅ メールキュー登録完了:', queueItems.length, '件')

  return NextResponse.json({
    success: true,
    message: `未登録項目の通知を${queueItems.length}件送信しました`,
    count: unregisteredItems.length,
    queue_ids: queueItems.map(q => q.id),
  })
}


import { PrismaClient } from '@prisma/client'

export async function seedItemMatrix(prisma: PrismaClient | any) {
  const matrix = []

  // テナント一覧取得
  const tenants = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      deleted_at: null,
    },
  })

  for (const tenant of tenants) {
    console.log(`   処理中: ${tenant.name}`)

    // 品目一覧取得
    const itemMaps = await prisma.item_maps.findMany({
      where: {
        org_id: tenant.id,
        deleted_at: null,
      },
    })

    // 店舗割り当て一覧取得
    const assignments = await prisma.store_collector_assignments.findMany({
      where: {
        org_id: tenant.id,
        is_primary: true, // 主担当のみ
        deleted_at: null,
      },
      include: {
        stores: true,
        collectors: true,
      },
    })

    if (itemMaps.length === 0 || assignments.length === 0) {
      console.log(`   ⚠️  スキップ: ${tenant.name} (品目または割り当てなし)`)
      continue
    }

    // 各店舗×品目の組み合わせで、約70%をカバー
    for (const assignment of assignments) {
      for (const itemMap of itemMaps) {
        // 70%の確率で品目を割り当て
        if (Math.random() < 0.7) {
          // 既存チェック（冪等性）
          const existing = await prisma.store_item_collectors.findFirst({
            where: {
              store_id: assignment.store_id,
              item_name: itemMap.item_label,
              deleted_at: null,
            },
          })

          if (!existing) {
            const matrixItem = await prisma.store_item_collectors.create({
              data: {
                org_id: tenant.id,
                store_id: assignment.store_id,
                collector_id: assignment.collector_id,
                item_name: itemMap.item_label,
                priority: 1,
                is_active: true,
              },
            })
            matrix.push(matrixItem)
          }
        }
      }
    }
  }

  return matrix
}


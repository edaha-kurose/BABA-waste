import { PrismaClient } from '@prisma/client'

export async function seedStoreAssignments(prisma: PrismaClient | any) {
  const assignments = []

  // テナント一覧取得
  const tenants = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      deleted_at: null,
    },
  })

  for (const tenant of tenants) {
    console.log(`   処理中: ${tenant.name}`)

    // 店舗一覧取得
    const stores = await prisma.stores.findMany({
      where: {
        org_id: tenant.id,
        deleted_at: null,
      },
    })

    // 収集業者一覧取得
    const collectors = await prisma.collectors.findMany({
      where: {
        org_id: tenant.id,
        deleted_at: null,
      },
      take: 5, // 最大5社
    })

    if (collectors.length === 0) {
      console.log(`   ⚠️  収集業者なし: ${tenant.name}`)
      continue
    }

    // 各店舗に主担当と副担当を割り当て
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i]

      // 既存の割り当てをチェック（冪等性）
      const existing = await prisma.store_collector_assignments.findFirst({
        where: {
          store_id: store.id,
          deleted_at: null,
        },
      })

      if (existing) {
        console.log(`   スキップ: ${store.name} (既に割り当て済み)`)
        continue
      }

      // 主担当（ローテーション）
      const primaryCollector = collectors[i % collectors.length]
      const primaryAssignment = await prisma.store_collector_assignments.create({
        data: {
          org_id: tenant.id,
          store_id: store.id,
          collector_id: primaryCollector.id,
          is_primary: true,
          priority: 1,
          is_active: true,
          created_by: 'system',
          updated_by: 'system',
        },
      })
      assignments.push(primaryAssignment)

      // 副担当（30%の確率で割り当て）
      if (Math.random() < 0.3 && collectors.length > 1) {
        const secondaryCollector = collectors[(i + 1) % collectors.length]
        if (secondaryCollector.id !== primaryCollector.id) {
          const secondaryAssignment = await prisma.store_collector_assignments.create({
            data: {
              org_id: tenant.id,
              store_id: store.id,
              collector_id: secondaryCollector.id,
              is_primary: false,
              priority: 2,
              is_active: true,
              created_by: 'system',
              updated_by: 'system',
            },
          })
          assignments.push(secondaryAssignment)
        }
      }
    }
  }

  return assignments
}



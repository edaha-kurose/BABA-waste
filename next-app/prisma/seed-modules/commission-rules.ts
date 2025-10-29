import { PrismaClient } from '@prisma/client'

export async function seedCommissionRules(prisma: PrismaClient) {
  console.log('📊 手数料ルールマスタを作成中...')

  const tenants = await prisma.organizations.findMany({
    where: { org_type: 'EMITTER', deleted_at: null },
  })

  const rules = []

  for (const tenant of tenants) {
    const collectors = await prisma.collectors.findMany({
      where: { org_id: tenant.id, deleted_at: null },
      take: 3, // 各テナントの最初の3社に対してルール作成
    })

    for (const collector of collectors) {
      // 従量課金に対する手数料（率）
      rules.push(
        await prisma.commission_rules.create({
          data: {
            org_id: tenant.id,
            collector_id: collector.id,
            billing_type: 'METERED',
            commission_type: 'PERCENTAGE',
            commission_value: 10.00, // 10%
            is_active: true,
            notes: `${collector.company_name} 従量課金手数料`,
            created_by: 'system',
            updated_by: 'system',
          },
        })
      )

      // 固定費に対する手数料（固定額）
      rules.push(
        await prisma.commission_rules.create({
          data: {
            org_id: tenant.id,
            collector_id: collector.id,
            billing_type: 'FIXED',
            commission_type: 'FIXED_AMOUNT',
            commission_value: 5000.00, // ¥5,000
            is_active: true,
            notes: `${collector.company_name} 固定費手数料`,
            created_by: 'system',
            updated_by: 'system',
          },
        })
      )
    }

    // テナント共通の管理費（全収集業者共通）
    rules.push(
      await prisma.commission_rules.create({
        data: {
          org_id: tenant.id,
          collector_id: null, // 全収集業者共通
          billing_type: 'OTHER',
          commission_type: 'FIXED_AMOUNT',
          commission_value: 30000.00, // ¥30,000/月
          is_active: true,
          notes: `${tenant.name} システム管理費`,
          created_by: 'system',
          updated_by: 'system',
        },
      })
    )
  }

  console.log(`   ✅ ${rules.length}件の手数料ルールを作成しました`)
  return rules
}



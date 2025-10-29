import { PrismaClient } from '@prisma/client'

/**
 * 消費税計算（切り捨て）
 */
function calculateTax(amount: number, taxRate: number = 0.1): number {
  return Math.floor(amount * taxRate)
}

export async function seedBillingItems(prisma: PrismaClient | any) {
  const items = []

  // テナント一覧取得
  const tenants = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      deleted_at: null,
    },
  })

  // 過去3ヶ月分のデータを作成
  const today = new Date()
  const months = [
    new Date(today.getFullYear(), today.getMonth() - 2, 1), // 2ヶ月前
    new Date(today.getFullYear(), today.getMonth() - 1, 1), // 1ヶ月前
    new Date(today.getFullYear(), today.getMonth(), 1),    // 今月
  ]

  for (const tenant of tenants) {
    console.log(`   処理中: ${tenant.name}`)

    // 店舗割り当て取得
    const assignments = await prisma.store_collector_assignments.findMany({
      where: {
        org_id: tenant.id,
        is_primary: true,
        deleted_at: null,
      },
      include: {
        stores: true,
        collectors: true,
      },
    })

    // 廃棄物単価取得
    const wastePrices = await prisma.waste_type_masters.findMany({
      where: {
        org_id: tenant.id,
        deleted_at: null,
        unit_price: { not: null },
      },
    })

    if (assignments.length === 0 || wastePrices.length === 0) {
      console.log(`   ⚠️  スキップ: ${tenant.name} (割り当てまたは単価なし)`)
      continue
    }

    // 各月ごとにデータ生成
    for (const month of months) {
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      for (const assignment of assignments) {
        // 各店舗で月5-10件の請求明細を作成
        const recordCount = Math.floor(Math.random() * 6) + 5 // 5-10件

        for (let i = 0; i < recordCount; i++) {
          // 収集業者の廃棄物単価からランダムに選択
          const collectorWastePrices = wastePrices.filter(
            (wp) => wp.collector_id === assignment.collector_id
          )

          if (collectorWastePrices.length === 0) continue

          const wastePrice =
            collectorWastePrices[
              Math.floor(Math.random() * collectorWastePrices.length)
            ]

          // ランダムな数量（10-100kg）
          const quantity = Math.floor(Math.random() * 91) + 10 // 10-100
          const unitPrice = wastePrice.unit_price || 0
          const amount = quantity * unitPrice
          const taxAmount = calculateTax(amount, 0.1) // 切り捨て
          const totalAmount = amount + taxAmount

          // 既存チェック（冪等性）
          const existing = await prisma.app_billing_items.findFirst({
            where: {
              org_id: tenant.id,
              store_id: assignment.store_id,
              collector_id: assignment.collector_id,
              waste_type_id: wastePrice.id,
              billing_month: month,
            },
          })

          if (!existing) {
            const billingItem = await prisma.app_billing_items.create({
              data: {
                org_id: tenant.id,
                store_id: assignment.store_id,
                collector_id: assignment.collector_id,
                waste_type_id: wastePrice.id,
                billing_month: month,
                billing_period_from: month,
                billing_period_to: monthEnd,
                billing_type: 'METERED',
                item_name: wastePrice.waste_type_name,
                item_code: wastePrice.waste_type_code,
                quantity: quantity,
                unit: wastePrice.unit_code || 'kg',
                unit_price: unitPrice,
                amount: amount,
                tax_rate: 0.1,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                status: 'APPROVED',
                jwnet_manifest_no: `JWNET-${tenant.id.substring(0, 8)}-${month.getFullYear()}${String(month.getMonth() + 1).padStart(2, '0')}-${i + 1}`,
              },
            })
            items.push(billingItem)
          }
        }
      }
    }
  }

  return items
}


import { PrismaClient } from '@prisma/client'

// 廃棄物種別のサンプルデータ
const wasteTypes = [
  { code: 'W001', name: '燃えるゴミ', category: '一般廃棄物', unit: 'kg', price: 1500 },
  { code: 'W002', name: 'プラスチック', category: '産業廃棄物', unit: 'kg', price: 2000 },
  { code: 'W003', name: 'ペットボトル', category: '資源ゴミ', unit: 'kg', price: 1000 },
  { code: 'W004', name: '缶類', category: '資源ゴミ', unit: 'kg', price: 800 },
  { code: 'W005', name: 'ビン類', category: '資源ゴミ', unit: 'kg', price: 900 },
  { code: 'W006', name: '段ボール', category: '資源ゴミ', unit: 'kg', price: 500 },
  { code: 'W007', name: '新聞紙', category: '資源ゴミ', unit: 'kg', price: 600 },
  { code: 'W008', name: '雑誌', category: '資源ゴミ', unit: 'kg', price: 550 },
  { code: 'W009', name: '食品残渣', category: '一般廃棄物', unit: 'kg', price: 1800 },
  { code: 'W010', name: '木くず', category: '産業廃棄物', unit: 'kg', price: 1200 },
  { code: 'W011', name: '金属くず', category: '産業廃棄物', unit: 'kg', price: 2500 },
  { code: 'W012', name: 'ガラス陶磁器くず', category: '産業廃棄物', unit: 'kg', price: 1400 },
  { code: 'W013', name: '廃油', category: '産業廃棄物', unit: 'L', price: 3000 },
  { code: 'W014', name: '汚泥', category: '産業廃棄物', unit: 'kg', price: 2200 },
  { code: 'W015', name: 'その他', category: '一般廃棄物', unit: 'kg', price: 1600 },
]

export async function seedWastePrices(prisma: PrismaClient | any) {
  const prices = []

  // テナント一覧取得
  const tenants = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      deleted_at: null,
    },
  })

  for (const tenant of tenants) {
    console.log(`   処理中: ${tenant.name}`)

    // 収集業者一覧取得
    const collectors = await prisma.collectors.findMany({
      where: {
        org_id: tenant.id,
        deleted_at: null,
      },
    })

    if (collectors.length === 0) {
      console.log(`   ⚠️  収集業者なし: ${tenant.name}`)
      continue
    }

    // 各収集業者に対して、10-15種類の廃棄物単価を設定
    for (const collector of collectors) {
      // ランダムに10-15種類を選択
      const count = Math.floor(Math.random() * 6) + 10 // 10-15
      const selectedTypes = wasteTypes
        .sort(() => Math.random() - 0.5)
        .slice(0, count)

      for (const wasteType of selectedTypes) {
        // 既存チェック（冪等性）
        const existing = await prisma.waste_type_masters.findFirst({
          where: {
            org_id: tenant.id,
            collector_id: collector.id,
            waste_type_code: wasteType.code,
            deleted_at: null,
          },
        })

        if (!existing) {
          // 価格に±20%のバラツキを追加
          const priceVariation = 0.8 + Math.random() * 0.4 // 0.8-1.2
          const finalPrice = Math.floor(wasteType.price * priceVariation)

          const wasteMaster = await prisma.waste_type_masters.create({
            data: {
              org_id: tenant.id,
              collector_id: collector.id,
              waste_type_code: wasteType.code,
              waste_type_name: wasteType.name,
              waste_category: wasteType.category,
              waste_classification: '普通',
              unit_code: wasteType.unit,
              unit_price: finalPrice,
              billing_category: '従量',
              billing_type_default: 'actual_quantity',
              is_active: true,
            },
          })
          prices.push(wasteMaster)
        }
      }
    }
  }

  return prices
}


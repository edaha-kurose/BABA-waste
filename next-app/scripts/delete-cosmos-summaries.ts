/**
 * コスモス薬品のサマリーを削除するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🗑️  コスモス薬品のサマリーを削除中...\n')

  const cosmosOrgId = '00000000-0000-0000-0000-000000000001'

  const result = await prisma.billing_summaries.deleteMany({
    where: {
      org_id: cosmosOrgId,
    },
  })

  console.log(`✅ ${result.count}件を削除しました`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



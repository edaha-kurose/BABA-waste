import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 請求明細のステータスをDRAFTに戻します...\n')

  try {
    const result = await prisma.app_billing_items.updateMany({
      where: {
        status: 'APPROVED',
        deleted_at: null,
      },
      data: {
        status: 'DRAFT',
        approved_at: null,
        approved_by: null,
      },
    })

    console.log(`✅ ${result.count}件の請求明細をDRAFTに戻しました`)

    // サマリーも削除
    const summaryResult = await prisma.billing_summaries.deleteMany({})
    console.log(`✅ ${summaryResult.count}件の請求サマリーを削除しました`)

    console.log('\n✅ 完了')
  } catch (error) {
    console.error('❌ エラー:', error)
    throw error
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



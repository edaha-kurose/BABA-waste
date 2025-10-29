import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 廃棄依頼データ確認')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  const total = await prisma.collection_requests.count()
  console.log(`✅ 総件数: ${total}件`)
  console.log('')

  const requests = await prisma.collection_requests.findMany({
    take: 5,
    include: {
      stores: true,
      organizations: true,
    },
  })

  console.log('📋 サンプルデータ (最初の5件):')
  console.log('')
  requests.forEach((r, i) => {
    console.log(`${i + 1}. ID: ${r.id}`)
    console.log(`   店舗ID: ${r.store_id}`)
    console.log(`   店舗名: ${r.stores?.name || 'N/A'}`)
    console.log(`   組織ID: ${r.org_id}`)
    console.log(`   組織名: ${r.organizations?.name || 'N/A'}`)
    console.log(`   ステータス: ${r.status}`)
    console.log('')
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())





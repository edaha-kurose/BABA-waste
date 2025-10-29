import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  const req = await prisma.collection_requests.findFirst({
    select: {
      id: true,
      main_items: true,
      other_items: true,
    },
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 main_items データ構造確認')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  console.log('Type:', typeof req?.main_items)
  console.log('Is Array:', Array.isArray(req?.main_items))
  console.log('\nData:')
  console.log(JSON.stringify(req?.main_items, null, 2))
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())





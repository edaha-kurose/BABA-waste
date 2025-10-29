import { prisma } from '../src/lib/prisma'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(__dirname, '../.env.local') })

async function main() {
  console.log('📊 waste_type_masters チェック開始...\n')

  try {
    // waste_type_masters の件数
    const count = await prisma.waste_type_masters.count()
    console.log(`waste_type_masters: ${count}件`)

    if (count > 0) {
      // サンプルデータ取得
      const samples = await prisma.waste_type_masters.findMany({
        take: 5,
        select: {
          id: true,
          collector_id: true,
          waste_type_code: true,
          waste_type_name: true,
        },
      })

      console.log('\nサンプルデータ:')
      console.table(samples)

      // collector_idの存在チェック
      console.log('\ncollector_id存在チェック...')
      for (const sample of samples) {
        const collector = await prisma.collectors.findUnique({
          where: { id: sample.collector_id },
        })
        if (!collector) {
          console.log(`❌ collector_id=${sample.collector_id} は存在しません`)
        } else {
          console.log(`✅ collector_id=${sample.collector_id} 存在`)
        }
      }
    }

    // collectors の件数
    const collectorCount = await prisma.collectors.count()
    console.log(`\ncollectors: ${collectorCount}件`)
  } catch (error: any) {
    console.error('❌ エラー:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()





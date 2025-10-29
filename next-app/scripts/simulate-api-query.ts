import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'], // SQLクエリをログ出力
})

async function main() {
  const orgId = '00000000-0000-0000-0000-000000000004'

  console.log('🔍 APIと同じクエリを実行中...\n')

  // APIと全く同じWHERE条件
  const where: any = {
    org_id: orgId,
    deleted_at: null,
  }

  console.log('WHERE条件:', JSON.stringify(where, null, 2))
  console.log('')

  try {
    // countクエリ
    console.log('📊 COUNT クエリ実行中...')
    const total = await prisma.store_collector_assignments.count({ where })
    console.log('   結果:', total, '件\n')

    // findManyクエリ
    console.log('📊 FIND_MANY クエリ実行中...')
    const assignments = await prisma.store_collector_assignments.findMany({
      where,
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            store_code: true,
          },
        },
        collectors: {
          select: {
            id: true,
            company_name: true,
            phone: true,
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
      take: 100,
      skip: 0,
    })
    console.log('   結果:', assignments.length, '件\n')

    if (assignments.length > 0) {
      console.log('✅ 取得したデータ:')
      assignments.forEach((a, i) => {
        console.log(`${i + 1}. ${a.stores?.name} - ${a.collectors?.company_name}`)
      })
    }

    console.log('\n🔍 分析:')
    if (total === 2 && assignments.length === 2) {
      console.log('❌ COUNTもFIND_MANYも2件を返しています')
      console.log('   → WHERE条件が正しくないか、データが実際に2件しかない')
      console.log('   → しかし、別のスクリプトでは10件確認できている...')
      console.log('   → 何か条件が違う可能性があります')
    } else if (total === 10 && assignments.length === 10) {
      console.log('✅ 正常：10件取得できています')
      console.log('   → APIのコードに問題がある可能性')
    }

  } catch (error) {
    console.error('❌ エラー:', error)
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



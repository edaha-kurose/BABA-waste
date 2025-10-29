import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n📅 存在する請求月を確認中...\n')

  const months = await prisma.$queryRaw<Array<{ month: string }>>`
    SELECT DISTINCT TO_CHAR(billing_month, 'YYYY-MM') as month
    FROM app.billing_summaries
    ORDER BY month DESC
    LIMIT 12
  `

  console.log('✅ 存在する請求月:')
  months.forEach((m) => {
    console.log(`  - ${m.month}`)
  })

  console.log(`\n合計: ${months.length}ヶ月`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



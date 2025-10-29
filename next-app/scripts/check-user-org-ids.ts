/**
 * ユーザーの組織IDを確認するスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n👤 ユーザー組織ID確認\n')

  // 1. 全ユーザーの組織情報
  const userOrgs = await prisma.user_org_roles.findMany({
    include: {
      users: {
        select: {
          email: true,
        },
      },
      organizations: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 10,
  })

  console.log('📋 ユーザーと組織の関連:')
  userOrgs.forEach((uo) => {
    console.log(`  - ${uo.users.email} → ${uo.organizations.name} (${uo.organizations.id})`)
  })

  // 2. 請求サマリーの組織ID
  const summaryOrgs = await prisma.$queryRaw<Array<{ org_id: string; org_name: string; count: number }>>`
    SELECT 
      bs.org_id,
      o.name as org_name,
      COUNT(*)::int as count
    FROM app.billing_summaries bs
    LEFT JOIN app.organizations o ON bs.org_id = o.id
    GROUP BY bs.org_id, o.name
    ORDER BY count DESC
  `

  console.log('\n📊 請求サマリーの組織:')
  summaryOrgs.forEach((so) => {
    console.log(`  - ${so.org_name || 'Unknown'} (${so.org_id}) → ${so.count}件`)
  })

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ エラー:', err)
  process.exit(1)
})



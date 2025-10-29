/**
 * 収集業者の取引先設定スクリプト
 * 
 * 収集業者が複数の排出企業（コスモス薬品、楽市楽座）と取引できるように
 * store_collector_assignments を作成
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 収集業者の取引先設定開始\n')
  console.log('='.repeat(80))

  // 1. 収集業者を取得
  const collector = await prisma.collectors.findFirst({
    where: {
      deleted_at: null,
      is_active: true,
      user_id: { not: null },
    },
    include: {
      users: true,
    },
  })

  if (!collector) {
    console.error('❌ 収集業者が見つかりません')
    return
  }

  console.log(`✅ 収集業者: ${collector.company_name}`)
  console.log(`   ID: ${collector.id}`)
  console.log(`   Email: ${collector.users?.email}\n`)

  // 2. 排出企業（コスモス薬品、楽市楽座）を取得
  const emitterOrgs = await prisma.organizations.findMany({
    where: {
      org_type: 'EMITTER',
      code: { in: ['COSMOS-DRUG', 'RAKUICHI'] },
      deleted_at: null,
    },
    include: {
      stores: {
        where: {
          deleted_at: null,
        },
        take: 3, // 各企業から3店舗ずつ
      },
    },
  })

  console.log(`✅ 排出企業: ${emitterOrgs.length}社\n`)

  let assignmentCount = 0

  for (const org of emitterOrgs) {
    console.log('─'.repeat(80))
    console.log(`📦 排出企業: ${org.name} (${org.code})`)
    console.log(`   店舗数: ${org.stores.length}店舗`)

    for (const store of org.stores) {
      // 既存の割り当てをチェック
      const existing = await prisma.store_collector_assignments.findFirst({
        where: {
          store_id: store.id,
          collector_id: collector.id,
          deleted_at: null,
        },
      })

      if (existing) {
        console.log(`   ⏭️  ${store.name}: 既に割り当て済み`)
        continue
      }

      // 新規割り当て作成
      await prisma.store_collector_assignments.create({
        data: {
          org_id: org.id,
          store_id: store.id,
          collector_id: collector.id,
          priority: 1,
          is_active: true,
          created_by: collector.users?.id || undefined,
          updated_by: collector.users?.id || undefined,
        },
      })

      console.log(`   ✅ ${store.name}: 割り当て完了`)
      assignmentCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`\n✅ 設定完了: ${assignmentCount}件の割り当てを作成しました`)
  console.log('\n💡 次のステップ:')
  console.log('   1. ブラウザで収集業者としてログイン')
  console.log('   2. テナント切り替えセレクターが表示されることを確認')
  console.log('   3. コスモス薬品と楽市楽座を切り替えられることを確認')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



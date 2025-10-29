/**
 * 収集業者の組織紐づけ修正スクリプト
 * 
 * 修正内容:
 * 1. collectors.org_id を収集業者専用組織（TEST-ORG-B）に変更
 * 2. 取引先企業との関係は store_collector_assignments で管理
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 収集業者の組織紐づけ修正開始\n')
  console.log('='.repeat(80))

  // 1. 収集業者専用組織を取得
  const collectorOrg = await prisma.organizations.findFirst({
    where: {
      code: 'TEST-ORG-B',
      org_type: 'COLLECTOR',
    },
  })

  if (!collectorOrg) {
    console.error('❌ 収集業者専用組織（TEST-ORG-B）が見つかりません')
    console.log('\n💡 組織を作成しますか？')
    
    // 収集業者専用組織を作成
    const newCollectorOrg = await prisma.organizations.create({
      data: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'テスト組織B（収集業者用）',
        code: 'TEST-ORG-B',
        org_type: 'COLLECTOR',
        is_active: true,
      },
    })
    
    console.log(`✅ 収集業者専用組織を作成しました: ${newCollectorOrg.name}`)
    return
  }

  console.log(`✅ 収集業者専用組織: ${collectorOrg.name} (${collectorOrg.code})`)
  console.log(`   組織ID: ${collectorOrg.id}\n`)

  // 2. 修正が必要な収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      deleted_at: null,
      is_active: true,
      user_id: { not: null },
      org_id: { not: collectorOrg.id }, // 収集業者専用組織以外
    },
    include: {
      users: {
        include: {
          user_org_roles: true,
        },
      },
      organizations: true,
    },
  })

  console.log(`📋 修正対象の収集業者: ${collectors.length}社\n`)

  if (collectors.length === 0) {
    console.log('✅ 修正が必要な収集業者はありません')
    return
  }

  let updatedCount = 0

  for (const collector of collectors) {
    console.log('─'.repeat(80))
    console.log(`📦 収集業者: ${collector.company_name}`)
    console.log(`   現在の組織: ${collector.organizations.name} (${collector.organizations.code})`)
    console.log(`   現在のorg_id: ${collector.org_id}`)
    console.log(`   新しいorg_id: ${collectorOrg.id}`)

    try {
      // collectors.org_id を更新
      await prisma.collectors.update({
        where: { id: collector.id },
        data: {
          org_id: collectorOrg.id,
          updated_at: new Date(),
        },
      })

      console.log(`   ✅ collectors.org_id を更新しました`)

      // user_org_roles の確認と更新
      if (collector.users) {
        const userOrgRole = collector.users.user_org_roles.find(
          r => r.org_id === collectorOrg.id
        )

        if (!userOrgRole) {
          console.log(`   ⚠️ user_org_roles に収集業者専用組織のロールがありません`)
          console.log(`   💡 user_org_roles を追加します`)

          await prisma.user_org_roles.create({
            data: {
              user_id: collector.users.id,
              org_id: collectorOrg.id,
              role: 'TRANSPORTER',
              is_active: true,
            },
          })

          console.log(`   ✅ user_org_roles を追加しました`)
        } else {
          console.log(`   ✅ user_org_roles は既に正しく設定されています`)
        }
      }

      updatedCount++
    } catch (error) {
      console.error(`   ❌ 更新エラー:`, error)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`\n✅ 修正完了: ${updatedCount}/${collectors.length}社`)
  console.log('\n💡 次のステップ:')
  console.log('   1. pnpm tsx scripts/check-collector-org-mapping.ts で確認')
  console.log('   2. ブラウザでログインして動作確認')
  console.log('   3. テナント切り替え機能の実装')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



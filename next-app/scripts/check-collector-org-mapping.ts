/**
 * 収集業者の組織紐づけ確認スクリプト
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 収集業者の組織紐づけ確認\n')
  console.log('='.repeat(80))

  // 1. 収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      deleted_at: null,
      is_active: true,
      user_id: { not: null },
    },
    include: {
      users: {
        include: {
          user_org_roles: {
            include: {
              organizations: true,
            },
          },
        },
      },
      organizations: true,
    },
    orderBy: {
      company_name: 'asc',
    },
  })

  console.log(`\n✅ 収集業者数: ${collectors.length}社\n`)

  for (const collector of collectors) {
    console.log('─'.repeat(80))
    console.log(`📦 収集業者: ${collector.company_name}`)
    console.log(`   ID: ${collector.id}`)
    console.log(`   Email: ${collector.email || 'なし'}`)
    console.log(`   組織ID (collectors.org_id): ${collector.org_id}`)
    console.log(`   組織名: ${collector.organizations.name} (${collector.organizations.code})`)
    console.log(`   組織タイプ: ${collector.organizations.org_type}`)

    if (collector.users) {
      console.log(`\n   👤 ユーザー情報:`)
      console.log(`      User ID: ${collector.users.id}`)
      console.log(`      Email: ${collector.users.email}`)
      console.log(`      Auth User ID: ${collector.users.auth_user_id}`)

      if (collector.users.user_org_roles.length > 0) {
        console.log(`\n   🔐 ロール情報 (${collector.users.user_org_roles.length}件):`)
        collector.users.user_org_roles.forEach((role, index) => {
          console.log(`      [${index + 1}] 組織: ${role.organizations.name} (${role.organizations.code})`)
          console.log(`          組織ID: ${role.org_id}`)
          console.log(`          ロール: ${role.role}`)
          console.log(`          アクティブ: ${role.is_active}`)
          
          // 収集業者の組織IDとuser_org_rolesの組織IDが一致するかチェック
          if (role.org_id === collector.org_id) {
            console.log(`          ✅ collectors.org_id と一致`)
          } else {
            console.log(`          ⚠️ collectors.org_id (${collector.org_id}) と不一致`)
          }
        })
      } else {
        console.log(`\n   ❌ user_org_roles にデータがありません！`)
      }
    } else {
      console.log(`\n   ❌ users にデータがありません！`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n📊 サマリー:')
  
  const collectorsWithoutUserOrgRoles = collectors.filter(
    c => !c.users || c.users.user_org_roles.length === 0
  )
  
  const collectorsWithMismatchedOrg = collectors.filter(
    c => c.users && c.users.user_org_roles.length > 0 && 
         !c.users.user_org_roles.some(r => r.org_id === c.org_id)
  )

  console.log(`   - 収集業者総数: ${collectors.length}社`)
  console.log(`   - user_org_roles なし: ${collectorsWithoutUserOrgRoles.length}社`)
  console.log(`   - org_id 不一致: ${collectorsWithMismatchedOrg.length}社`)

  if (collectorsWithoutUserOrgRoles.length > 0) {
    console.log('\n⚠️ user_org_roles がない収集業者:')
    collectorsWithoutUserOrgRoles.forEach(c => {
      console.log(`   - ${c.company_name} (${c.email})`)
    })
  }

  if (collectorsWithMismatchedOrg.length > 0) {
    console.log('\n⚠️ org_id が不一致の収集業者:')
    collectorsWithMismatchedOrg.forEach(c => {
      console.log(`   - ${c.company_name}`)
      console.log(`     collectors.org_id: ${c.org_id}`)
      console.log(`     user_org_roles.org_id: ${c.users?.user_org_roles.map(r => r.org_id).join(', ')}`)
    })
  }

  console.log('\n' + '='.repeat(80))
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



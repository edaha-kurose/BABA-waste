// ============================================================================
// ユーザー確認スクリプト
// 目的: app_users テーブルのユーザーを確認
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ORG_ID = '00000000-0000-0000-0000-000000000001'

async function main() {
  console.log('🔍 app_users テーブルを確認中...\n')

  try {
    const users = await prisma.app_users.findMany({
      include: {
        user_org_roles: {
          where: { org_id: ORG_ID },
        },
      },
      take: 20,
    })

    console.log(`app_users 総数: ${users.length}件\n`)

    users.forEach((u, idx) => {
      const roles = u.user_org_roles.filter(r => r.org_id === ORG_ID)
      console.log(`${idx + 1}. ${u.email}`)
      console.log(`   ID: ${u.id}`)
      console.log(`   auth_user_id: ${u.auth_user_id}`)
      if (roles.length > 0) {
        console.log(`   ロール: ${roles.map(r => r.role).join(', ')}`)
      } else {
        console.log(`   ロール: なし（org_id=${ORG_ID}）`)
      }
      console.log('')
    })

    const usersInOrg = users.filter(u => u.user_org_roles.some(r => r.org_id === ORG_ID))
    console.log(`org_id=${ORG_ID} のユーザー: ${usersInOrg.length}件`)
    console.log('')

  } catch (error) {
    console.error('❌ エラー発生:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })








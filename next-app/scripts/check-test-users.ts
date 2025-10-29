// テストユーザー確認スクリプト
import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 テストユーザー確認...\n')

  // auth.users から確認
  const authUsers = await prisma.$queryRaw`
    SELECT email, id FROM auth.users 
    WHERE email IN ('admin@test.com', 'collector@test.com', 'emitter@test.com')
    ORDER BY email
  `

  console.log('📧 auth.users:')
  console.log(authUsers)
  console.log()

  // app.users から確認
  const appUsers = await prisma.app_users.findMany({
    where: {
      email: {
        in: ['admin@test.com', 'collector@test.com', 'emitter@test.com'],
      },
    },
    select: {
      id: true,
      email: true,
      auth_user_id: true,
    },
    orderBy: {
      email: 'asc',
    },
  })

  console.log('👤 app.users:')
  console.log(appUsers)
  console.log()

  // user_org_roles から確認
  for (const appUser of appUsers) {
    const roles = await prisma.user_org_roles.findMany({
      where: {
        user_id: appUser.id,
      },
      select: {
        role: true,
        is_active: true,
        org_id: true,
      },
    })
    console.log(`${appUser.email} のロール:`, roles)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })








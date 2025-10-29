import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔧 admin@test.com の所属組織を切り替え')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const admin = await prisma.app_users.findFirst({ where: { email: 'admin@test.com' } })
  if (!admin) {
    console.error('❌ admin@test.com が見つかりません')
    process.exit(1)
  }

  // データがある組織（デモ組織）を取得
  const demoOrg = await prisma.organizations.findFirst({ where: { name: 'デモ組織' } })
  if (!demoOrg) {
    console.error('❌ デモ組織が見つかりません')
    process.exit(1)
  }

  await prisma.$transaction(async (tx) => {
    // 既存ロールを全て is_active=false に
    await tx.user_org_roles.updateMany({
      where: { user_id: admin.id },
      data: { is_active: false },
    })

    // デモ組織のロールを upsert（ADMIN）で is_active=true
    await tx.user_org_roles.upsert({
      where: {
        user_id_org_id_role: {
          user_id: admin.id,
          org_id: demoOrg.id,
          role: 'ADMIN',
        },
      },
      create: {
        user_id: admin.id,
        org_id: demoOrg.id,
        role: 'ADMIN',
        is_active: true,
      },
      update: {
        role: 'ADMIN',
        is_active: true,
      },
    })
  })

  console.log('✅ 切り替え完了: admin@test.com →', demoOrg.name, demoOrg.id)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

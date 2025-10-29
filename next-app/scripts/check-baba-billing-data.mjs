import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 BABA株式会社の請求データ調査開始...\n')

  // 1. BABA株式会社の情報取得
  const babaOrg = await prisma.organizations.findFirst({
    where: { 
      OR: [
        { name: { contains: 'BABA' } },
        { org_type: 'ADMIN' }
      ],
      deleted_at: null 
    }
  })

  if (!babaOrg) {
    console.error('❌ BABA株式会社が見つかりません')
    return
  }

  console.log('✅ BABA株式会社:')
  console.log(`   ID: ${babaOrg.id}`)
  console.log(`   名前: ${babaOrg.name}`)
  console.log(`   タイプ: ${babaOrg.org_type}\n`)

  // 2. 管理対象テナントを取得
  console.log('📋 管理対象テナント:')
  const tenants = await prisma.organizations.findMany({
    where: { 
      org_type: 'EMITTER',
      deleted_at: null 
    }
  })

  for (const tenant of tenants) {
    console.log(`   - ${tenant.name} (${tenant.id})`)
  }
  console.log()

  // 3. BABA株式会社に紐づく収集業者
  console.log('🚛 BABA株式会社に紐づく収集業者:')
  const babaCollectors = await prisma.collectors.findMany({
    where: { 
      org_id: babaOrg.id,
      deleted_at: null 
    }
  })
  console.log(`   ${babaCollectors.length}件\n`)

  // 4. 各テナントの請求データ状況
  console.log('💰 請求データ状況:')
  
  for (const tenant of tenants) {
    console.log(`\n   【${tenant.name}】`)
    
    // 収集業者数
    const collectors = await prisma.collectors.findMany({
      where: { 
        org_id: tenant.id,
        deleted_at: null 
      }
    })
    console.log(`   - 収集業者: ${collectors.length}件`)

    // 店舗数
    const stores = await prisma.stores.findMany({
      where: { 
        org_id: tenant.id,
        deleted_at: null 
      }
    })
    console.log(`   - 店舗: ${stores.length}件`)

    // 実績データ
    const actuals = await prisma.actuals.findMany({
      where: { 
        org_id: tenant.id,
        deleted_at: null 
      }
    })
    console.log(`   - 実績データ: ${actuals.length}件`)

    // 承認済み請求データ
    const approvals = await prisma.approvals.findMany({
      where: { 
        org_id: tenant.id,
        deleted_at: null 
      }
    })
    console.log(`   - 承認済み請求: ${approvals.length}件`)

    // 請求明細
    const billingItems = await prisma.app_billing_items.findMany({
      where: { 
        org_id: tenant.id,
        deleted_at: null 
      }
    })
    console.log(`   - 請求明細: ${billingItems.length}件`)
  }

  // 5. BABA株式会社自体の請求データ
  console.log('\n\n   【BABA株式会社（システム管理会社）】')
  
  const babaActuals = await prisma.actuals.findMany({
    where: { 
      org_id: babaOrg.id,
      deleted_at: null 
    }
  })
  console.log(`   - 実績データ: ${babaActuals.length}件`)

  const babaApprovals = await prisma.approvals.findMany({
    where: { 
      org_id: babaOrg.id,
      deleted_at: null 
    }
  })
  console.log(`   - 承認済み請求: ${babaApprovals.length}件`)

  const babaBillingItems = await prisma.app_billing_items.findMany({
    where: { 
      org_id: babaOrg.id,
      deleted_at: null 
    }
  })
  console.log(`   - 請求明細: ${babaBillingItems.length}件`)

  // 6. 問題診断
  console.log('\n\n🔍 問題診断:')
  if (babaBillingItems.length === 0) {
    console.log('   ⚠️  BABA株式会社に請求明細データがありません')
    console.log('   → テナントの請求データを集約して作成する必要があります')
  }

  let hasTenantsWithNoData = false
  for (const tenant of tenants) {
    const items = await prisma.app_billing_items.count({
      where: { org_id: tenant.id, deleted_at: null }
    })
    if (items === 0) {
      console.log(`   ⚠️  ${tenant.name}に請求データがありません`)
      hasTenantsWithNoData = true
    }
  }

  if (hasTenantsWithNoData) {
    console.log('   → テナントに基礎データ（収集実績）を作成する必要があります')
  }

  console.log('\n✅ 調査完了')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())



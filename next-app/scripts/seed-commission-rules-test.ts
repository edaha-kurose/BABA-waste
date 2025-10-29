/**
 * テスト用の手数料設定マスターデータを作成するスクリプト
 * グローバルルール準拠
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 テスト用手数料設定マスター作成開始...\n')

  // コスモス薬品のorg_id
  const orgId = '00000000-0000-0000-0000-000000000001'

  // 組織情報を取得（created_by用）
  const org = await prisma.organizations.findUnique({
    where: { id: orgId },
    select: { created_by: true },
  })

  if (!org) {
    console.log('❌ 組織が見つかりません')
    return
  }

  // created_byがnullの場合は、user_org_rolesから取得
  let createdBy = org.created_by
  if (!createdBy) {
    const userOrg = await prisma.user_org_roles.findFirst({
      where: { org_id: orgId, deleted_at: null },
      select: { user_id: true },
    })
    if (!userOrg) {
      console.log('❌ 組織に紐づくユーザーが見つかりません。created_byをnullで作成します。')
      // created_byをnullで許容する場合は、スキーマを確認
      createdBy = null
    } else {
      createdBy = userOrg.user_id
      console.log(`ℹ️  created_byがnullのため、組織ユーザー(${createdBy})を使用します\n`)
    }
  }

  // アクティブな収集業者を取得
  const collectors = await prisma.collectors.findMany({
    where: {
      org_id: orgId,
      deleted_at: null,
    },
    select: {
      id: true,
      company_name: true,
    },
  })

  if (collectors.length === 0) {
    console.log('❌ 収集業者が見つかりません')
    return
  }

  console.log(`✅ 収集業者: ${collectors.length}社\n`)

  let createdCount = 0
  let skippedCount = 0

  for (const collector of collectors) {
    // 既存のルールをチェック（冪等性）
    const existingRules = await prisma.commission_rules.count({
      where: {
        org_id: orgId,
        collector_id: collector.id,
        deleted_at: null,
      },
    })

    if (existingRules > 0) {
      console.log(`  ⏭️  ${collector.company_name}: 既存ルールあり (${existingRules}件) - スキップ`)
      skippedCount++
      continue
    }

    // 収集業者ごとに異なる手数料設定を作成
    const rules = []

    // パターン1: 全請求タイプに10%の手数料
    if (createdCount % 3 === 0) {
      rules.push({
        org_id: orgId,
        collector_id: collector.id,
        billing_type: 'ALL',
        commission_type: 'PERCENTAGE',
        commission_value: 10.0,
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    // パターン2: 請求タイプごとに異なる手数料率
    else if (createdCount % 3 === 1) {
      rules.push(
        {
          org_id: orgId,
          collector_id: collector.id,
          billing_type: 'FIXED',
          commission_type: 'PERCENTAGE',
          commission_value: 5.0, // 固定請求: 5%
          effective_from: new Date('2025-01-01'),
          effective_to: null,
          is_active: true,
          created_by: createdBy,
          updated_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          org_id: orgId,
          collector_id: collector.id,
          billing_type: 'METERED',
          commission_type: 'PERCENTAGE',
          commission_value: 8.0, // 従量請求: 8%
          effective_from: new Date('2025-01-01'),
          effective_to: null,
          is_active: true,
          created_by: createdBy,
          updated_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          org_id: orgId,
          collector_id: collector.id,
          billing_type: 'OTHER',
          commission_type: 'PERCENTAGE',
          commission_value: 12.0, // その他請求: 12%
          effective_from: new Date('2025-01-01'),
          effective_to: null,
          is_active: true,
          created_by: createdBy,
          updated_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        }
      )
    }
    // パターン3: 固定金額の手数料
    else {
      rules.push({
        org_id: orgId,
        collector_id: collector.id,
        billing_type: 'ALL',
        commission_type: 'FIXED_AMOUNT',
        commission_value: 5000, // 全請求タイプに5,000円
        effective_from: new Date('2025-01-01'),
        effective_to: null,
        is_active: true,
        created_by: createdBy,
        updated_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }

    // ルールを一括作成
    await prisma.commission_rules.createMany({
      data: rules,
    })

    console.log(`  ✅ ${collector.company_name}: ${rules.length}件のルールを作成`)
    createdCount++
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ 作成完了`)
  console.log(`   - 新規作成: ${createdCount}社`)
  console.log(`   - スキップ: ${skippedCount}社`)
  console.log('='.repeat(60))
  console.log('\n💡 作成された手数料設定パターン:')
  console.log('   1. 全請求タイプに10%')
  console.log('   2. 固定請求5% / 従量請求8% / その他請求12%')
  console.log('   3. 全請求タイプに固定5,000円')
  console.log('\n🎯 次のステップ:')
  console.log('   1. ブラウザで http://localhost:3001/dashboard/billing をリロード')
  console.log('   2. 2025年8月または9月を選択')
  console.log('   3. 収集業者をクリックして明細詳細画面へ')
  console.log('   4. 手数料デフォルト値が自動適用されることを確認！')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


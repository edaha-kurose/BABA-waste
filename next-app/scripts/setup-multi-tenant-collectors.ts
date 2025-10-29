/**
 * マルチテナント対応の収集業者とテストデータ作成スクリプト
 * 
 * 作成内容:
 * 1. 楽市楽座の組織とテストデータ
 * 2. 3社の収集業者（両テナントに対応）
 * 3. 各収集業者のユーザーアカウント（Supabase Auth）
 * 4. 店舗と収集業者の割り当て
 * 5. 請求テストデータ
 */

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

// Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const DEFAULT_PASSWORD = 'test123'

// 収集業者情報
const COLLECTORS = [
  {
    company_name: 'エコ回収株式会社',
    email: 'collector1@test.com',
    contact_person: '田中 太郎',
    phone: '03-1234-5678',
    address: '東京都千代田区エコビル1-2-3',
    license_number: '東京都-産廃-001',
    service_areas: ['東京', '神奈川', '埼玉'],
  },
  {
    company_name: 'グリーンリサイクル株式会社',
    email: 'collector2@test.com',
    contact_person: '佐藤 花子',
    phone: '03-2345-6789',
    address: '東京都港区グリーンタワー2-3-4',
    license_number: '東京都-産廃-002',
    service_areas: ['東京', '千葉', '茨城'],
  },
  {
    company_name: 'クリーン環境サービス株式会社',
    email: 'collector3@test.com',
    contact_person: '鈴木 一郎',
    phone: '03-3456-7890',
    address: '東京都新宿区クリーンビル3-4-5',
    license_number: '東京都-産廃-003',
    service_areas: ['東京', '神奈川', '千葉'],
  },
]

async function main() {
  console.log('🚀 マルチテナント対応の収集業者とテストデータ作成開始\n')
  console.log('='.repeat(80))

  // ============================================================================
  // Step 1: 楽市楽座の組織を確認・作成
  // ============================================================================
  console.log('\n📋 Step 1: 楽市楽座の組織確認\n')

  let rakuichiOrg = await prisma.organizations.findFirst({
    where: { code: 'RAKUICHI' },
  })

  if (!rakuichiOrg) {
    console.log('⚠️ 楽市楽座が見つかりません。作成します...')
    
    // 楽市楽座の管理者ユーザーを作成（または既存取得）
    let authData
    const createResult = await supabase.auth.admin.createUser({
      email: 'admin@rakuichi.test',
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    })

    if (createResult.error) {
      if (createResult.error.status === 422 && createResult.error.code === 'email_exists') {
        console.log('⚠️ Authユーザーは既に存在します。既存ユーザーを取得します...')
        // 既存ユーザーをメールアドレスで検索
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          console.error('❌ ユーザー一覧取得エラー:', listError)
          throw listError
        }
        const existingUser = users.find(u => u.email === 'admin@rakuichi.test')
        if (!existingUser) {
          throw new Error('既存Authユーザーが見つかりませんでした')
        }
        authData = { user: existingUser }
        console.log(`✅ 既存Supabase Authユーザーを使用: ${existingUser.email}`)
      } else {
        console.error('❌ Supabase Authユーザー作成エラー:', createResult.error)
        throw createResult.error
      }
    } else {
      authData = createResult.data
      console.log(`✅ Supabase Authユーザー作成: ${authData.user.email}`)
    }

    // app.usersにレコード作成（または既存取得）
    let rakuichiUser = await prisma.app_users.findUnique({
      where: { auth_user_id: authData.user.id },
    })

    if (!rakuichiUser) {
      rakuichiUser = await prisma.app_users.create({
        data: {
          auth_user_id: authData.user.id,
          email: 'admin@rakuichi.test',
          name: '楽市楽座管理者',
          is_active: true,
        },
      })
      console.log(`✅ app.usersレコード作成: ${rakuichiUser.id}`)
    } else {
      console.log(`✅ 既存app.usersレコードを使用: ${rakuichiUser.id}`)
    }

    // 組織作成
    rakuichiOrg = await prisma.organizations.create({
      data: {
        name: '楽市楽座株式会社',
        code: 'RAKUICHI',
        org_type: 'EMITTER',
        is_active: true,
        created_by: rakuichiUser.id,
        updated_by: rakuichiUser.id,
      },
    })

    console.log(`✅ 組織作成: ${rakuichiOrg.name} (${rakuichiOrg.code})`)

    // user_org_roles作成
    await prisma.user_org_roles.create({
      data: {
        user_id: rakuichiUser.id,
        org_id: rakuichiOrg.id,
        role: 'ADMIN',
        is_active: true,
      },
    })

    console.log(`✅ user_org_roles作成: ADMIN`)
  } else {
    console.log(`✅ 楽市楽座は既に存在します: ${rakuichiOrg.name}`)
  }

  // 楽市楽座の店舗を作成（既存チェック付き）
  const existingRakuichiStores = await prisma.stores.count({
    where: {
      org_id: rakuichiOrg.id,
      deleted_at: null,
    },
  })

  if (existingRakuichiStores === 0) {
    console.log('⚠️ 楽市楽座の店舗が見つかりません。作成します...')
    
    // 楽市楽座のユーザーを取得
    const rakuichiUser = await prisma.app_users.findFirst({
      where: {
        email: 'admin@rakuichi.test',
      },
    })

    if (!rakuichiUser) {
      console.error('❌ 楽市楽座の管理者ユーザーが見つかりません')
      return
    }

    // 店舗を5店舗作成
    const storeNames = ['本店', '支店A', '支店B', '支店C', '支店D']
    for (let i = 0; i < storeNames.length; i++) {
      await prisma.stores.create({
        data: {
          org_id: rakuichiOrg.id,
          store_code: `RAKU-${String(i + 1).padStart(3, '0')}`,
          name: storeNames[i],
          address: `大阪府大阪市中央区${i + 1}-${i + 1}-${i + 1}`,
          created_by: rakuichiUser.auth_user_id,
          updated_by: rakuichiUser.auth_user_id,
        },
      })
    }

    console.log(`✅ 店舗作成: ${storeNames.length}店舗`)
  } else {
    console.log(`✅ 楽市楽座の店舗は既に存在します: ${existingRakuichiStores}店舗`)
  }

  // ============================================================================
  // Step 2: コスモス薬品を取得
  // ============================================================================
  console.log('\n📋 Step 2: コスモス薬品の組織確認\n')

  const cosmosOrg = await prisma.organizations.findFirst({
    where: { code: 'COSMOS-DRUG' },
  })

  if (!cosmosOrg) {
    console.error('❌ コスモス薬品が見つかりません')
    return
  }

  console.log(`✅ コスモス薬品: ${cosmosOrg.name}`)

  // ============================================================================
  // Step 3: 収集業者専用組織を取得
  // ============================================================================
  console.log('\n📋 Step 3: 収集業者専用組織確認\n')

  const collectorOrg = await prisma.organizations.findFirst({
    where: {
      code: 'TEST-ORG-B',
      org_type: 'COLLECTOR',
    },
  })

  if (!collectorOrg) {
    console.error('❌ 収集業者専用組織が見つかりません')
    return
  }

  console.log(`✅ 収集業者専用組織: ${collectorOrg.name}`)

  // ============================================================================
  // Step 4: 収集業者を作成
  // ============================================================================
  console.log('\n📋 Step 4: 収集業者作成\n')

  const createdCollectors = []

  for (const collectorData of COLLECTORS) {
    console.log('─'.repeat(80))
    console.log(`📦 ${collectorData.company_name}`)

    // 既存チェック
    const existing = await prisma.collectors.findFirst({
      where: {
        email: collectorData.email,
        deleted_at: null,
      },
    })

    if (existing) {
      console.log(`   ⏭️  既に存在します`)
      createdCollectors.push(existing)
      continue
    }

    // Supabase Authユーザー作成（または既存取得）
    let authData
    const createResult = await supabase.auth.admin.createUser({
      email: collectorData.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    })

    if (createResult.error) {
      if (createResult.error.status === 422 && createResult.error.code === 'email_exists') {
        console.log(`   ⚠️ Authユーザーは既に存在します。既存ユーザーを取得します...`)
        // 既存ユーザーをメールアドレスで検索
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          console.error(`   ❌ ユーザー一覧取得エラー:`, listError)
          continue
        }
        const existingUser = users.find(u => u.email === collectorData.email)
        if (!existingUser) {
          console.error(`   ❌ 既存Authユーザーが見つかりません`)
          continue
        }
        authData = { user: existingUser }
        console.log(`   ✅ 既存Supabase Authユーザーを使用`)
      } else {
        console.error(`   ❌ Supabase Authエラー:`, createResult.error)
        continue
      }
    } else {
      authData = createResult.data
      console.log(`   ✅ Supabase Authユーザー作成`)
    }

    // app.usersにレコード作成（または既存取得）
    let user = await prisma.app_users.findUnique({
      where: { auth_user_id: authData.user.id },
    })

    if (!user) {
      user = await prisma.app_users.create({
        data: {
          auth_user_id: authData.user.id,
          email: collectorData.email,
          name: collectorData.contact_person,
          is_active: true,
        },
      })
      console.log(`   ✅ app.usersレコード作成`)
    } else {
      console.log(`   ✅ 既存app.usersレコードを使用`)
    }

    // user_org_roles作成（収集業者専用組織）
    await prisma.user_org_roles.create({
      data: {
        user_id: user.id,
        org_id: collectorOrg.id,
        role: 'TRANSPORTER',
        is_active: true,
      },
    })

    console.log(`   ✅ user_org_roles作成: TRANSPORTER`)

    // collectors作成
    const collector = await prisma.collectors.create({
      data: {
        org_id: collectorOrg.id,
        user_id: user.id,
        company_name: collectorData.company_name,
        email: collectorData.email,
        contact_person: collectorData.contact_person,
        phone: collectorData.phone,
        address: collectorData.address,
        license_number: collectorData.license_number,
        service_areas: collectorData.service_areas,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      },
    })

    console.log(`   ✅ collectors作成: ${collector.id}`)
    createdCollectors.push(collector)
  }

  console.log(`\n✅ 収集業者作成完了: ${createdCollectors.length}社`)

  // ============================================================================
  // Step 5: 店舗と収集業者の割り当て
  // ============================================================================
  console.log('\n📋 Step 5: 店舗と収集業者の割り当て\n')

  const orgs = [cosmosOrg, rakuichiOrg]
  let assignmentCount = 0

  for (const org of orgs) {
    console.log('─'.repeat(80))
    console.log(`📦 ${org.name}`)

    const stores = await prisma.stores.findMany({
      where: {
        org_id: org.id,
        deleted_at: null,
      },
      take: 5,
    })

    console.log(`   店舗数: ${stores.length}店舗`)

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i]
      const collector = createdCollectors[i % createdCollectors.length]

      // 既存チェック
      const existing = await prisma.store_collector_assignments.findFirst({
        where: {
          store_id: store.id,
          collector_id: collector.id,
          deleted_at: null,
        },
      })

      if (existing) {
        console.log(`   ⏭️  ${store.name} → ${collector.company_name}: 既に割り当て済み`)
        continue
      }

      await prisma.store_collector_assignments.create({
        data: {
          org_id: org.id,
          store_id: store.id,
          collector_id: collector.id,
          priority: 1,
          is_active: true,
          created_by: collector.user_id!,
          updated_by: collector.user_id!,
        },
      })

      console.log(`   ✅ ${store.name} → ${collector.company_name}`)
      assignmentCount++
    }
  }

  console.log(`\n✅ 割り当て完了: ${assignmentCount}件`)

  // ============================================================================
  // Step 6: 請求テストデータ作成
  // ============================================================================
  console.log('\n📋 Step 6: 請求テストデータ作成\n')

  const billingMonth = new Date('2025-10-01')
  let billingItemCount = 0

  for (const org of orgs) {
    console.log('─'.repeat(80))
    console.log(`📦 ${org.name} - 2025-10`)

    const stores = await prisma.stores.findMany({
      where: {
        org_id: org.id,
        deleted_at: null,
      },
      take: 3,
    })

    for (const store of stores) {
      const assignments = await prisma.store_collector_assignments.findMany({
        where: {
          store_id: store.id,
          deleted_at: null,
          is_active: true,
        },
        include: {
          collectors: true,
        },
      })

      for (const assignment of assignments) {
        // 既存の請求データをチェック
        const existingCount = await prisma.app_billing_items.count({
          where: {
            org_id: org.id,
            store_id: store.id,
            collector_id: assignment.collector_id,
            billing_month: billingMonth,
          },
        })

        if (existingCount > 0) {
          console.log(`   ⏭️  ${store.name} × ${assignment.collectors.company_name}: 既存データあり`)
          continue
        }

        // 請求明細を3件作成
        const billingTypes = ['FIXED', 'METERED', 'OTHER']
        const amounts = [50000, 30000, 20000]

        for (let i = 0; i < 3; i++) {
          await prisma.app_billing_items.create({
            data: {
              org_id: org.id,
              store_id: store.id,
              collector_id: assignment.collector_id,
              billing_month: billingMonth,
              billing_period_from: new Date('2025-10-01'),
              billing_period_to: new Date('2025-10-31'),
              billing_type: billingTypes[i],
              item_name: `テスト品目${i + 1}`,
              amount: amounts[i],
              tax_amount: amounts[i] * 0.1,
              total_amount: amounts[i] * 1.1,
              status: 'DRAFT',
              created_by: assignment.collectors.user_id!,
              updated_by: assignment.collectors.user_id!,
            },
          })
        }

        console.log(`   ✅ ${store.name} × ${assignment.collectors.company_name}: 3件作成`)
        billingItemCount += 3
      }
    }
  }

  console.log(`\n✅ 請求データ作成完了: ${billingItemCount}件`)

  // ============================================================================
  // 最終サマリー
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('\n✅ すべての作成完了！\n')
  console.log('📊 サマリー:')
  console.log(`   - 組織: 2社（コスモス薬品、楽市楽座）`)
  console.log(`   - 収集業者: ${createdCollectors.length}社`)
  console.log(`   - 店舗割り当て: ${assignmentCount}件`)
  console.log(`   - 請求データ: ${billingItemCount}件`)
  console.log('\n🔐 ログイン情報:')
  console.log('   パスワード: test123')
  console.log('\n   収集業者:')
  COLLECTORS.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.email} - ${c.company_name}`)
  })
  console.log('\n💡 次のステップ:')
  console.log('   1. ブラウザで http://localhost:3001/login にアクセス')
  console.log('   2. クイックログインで収集業者を選択')
  console.log('   3. テナント切り替えで「コスモス薬品」「楽市楽座」を確認')
  console.log('   4. 請求画面で両社のデータを確認')
  console.log('='.repeat(80))
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



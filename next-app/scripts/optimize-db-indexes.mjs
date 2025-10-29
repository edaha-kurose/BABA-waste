import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 データベースインデックス最適化開始...\n')

  // 現在のインデックスを確認
  console.log('📊 現在のインデックスを確認中...')
  const indexes = await prisma.$queryRaw`
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'app'
    AND tablename IN ('app_billing_items', 'actuals', 'approvals', 'collections', 'stores', 'collectors')
    ORDER BY tablename, indexname
  `

  console.log(`   見つかったインデックス: ${indexes.length}件\n`)

  // テーブルごとにグループ化
  const groupedIndexes = {}
  for (const index of indexes) {
    if (!groupedIndexes[index.tablename]) {
      groupedIndexes[index.tablename] = []
    }
    groupedIndexes[index.tablename].push(index.indexname)
  }

  for (const [table, indexList] of Object.entries(groupedIndexes)) {
    console.log(`   ${table}: ${indexList.length}個`)
  }

  console.log('\n\n🔍 最適化が必要なクエリパターンを分析中...')

  // よく使われるクエリパターンのインデックスを確認
  const recommendedIndexes = [
    {
      table: 'app_billing_items',
      columns: ['org_id', 'deleted_at'],
      name: 'idx_billing_items_org_deleted',
      reason: '組織別フィルタリング（最頻出）'
    },
    {
      table: 'app_billing_items',
      columns: ['collector_id', 'billing_month', 'deleted_at'],
      name: 'idx_billing_items_collector_month',
      reason: '収集業者 x 請求月フィルタリング'
    },
    {
      table: 'app_billing_items',
      columns: ['store_id', 'deleted_at'],
      name: 'idx_billing_items_store_deleted',
      reason: '店舗別フィルタリング'
    },
    {
      table: 'actuals',
      columns: ['org_id', 'deleted_at'],
      name: 'idx_actuals_org_deleted',
      reason: '組織別フィルタリング'
    },
    {
      table: 'actuals',
      columns: ['collector_id', 'collection_date', 'deleted_at'],
      name: 'idx_actuals_collector_date',
      reason: '収集業者 x 日付フィルタリング'
    },
    {
      table: 'collections',
      columns: ['org_id', 'deleted_at'],
      name: 'idx_collections_org_deleted',
      reason: '組織別フィルタリング'
    },
    {
      table: 'stores',
      columns: ['org_id', 'deleted_at'],
      name: 'idx_stores_org_deleted',
      reason: '組織別フィルタリング'
    },
    {
      table: 'collectors',
      columns: ['org_id', 'deleted_at'],
      name: 'idx_collectors_org_deleted',
      reason: '組織別フィルタリング'
    },
  ]

  console.log('\n📝 推奨インデックス:')
  for (const rec of recommendedIndexes) {
    console.log(`   - ${rec.table}.${rec.columns.join(', ')}`)
    console.log(`     理由: ${rec.reason}`)
  }

  console.log('\n\n⚠️  注意: インデックス追加はマイグレーションで行うことを推奨します')
  console.log('   以下のDDLをマイグレーションファイルに追加してください:\n')

  for (const rec of recommendedIndexes) {
    const columnsStr = rec.columns.join(', ')
    console.log(`-- ${rec.reason}`)
    console.log(`CREATE INDEX IF NOT EXISTS ${rec.name}`)
    console.log(`  ON app.${rec.table} (${columnsStr});`)
    console.log()
  }

  // 遅いクエリを検出（実行計画を確認）
  console.log('\n🐢 遅いクエリを検出中...')
  
  try {
    const slowQuery = await prisma.$queryRaw`
      EXPLAIN (ANALYZE, BUFFERS)
      SELECT *
      FROM app.app_billing_items
      WHERE org_id = '12345678-1234-1234-1234-123456789012'
        AND deleted_at IS NULL
      ORDER BY billing_month DESC, created_at DESC
      LIMIT 100
    `
    
    console.log('   実行計画:')
    for (const line of slowQuery) {
      console.log(`   ${line['QUERY PLAN']}`)
    }
  } catch (error) {
    console.error('   ⚠️  実行計画取得エラー:', error.message)
  }

  console.log('\n✅ 最適化分析完了')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())



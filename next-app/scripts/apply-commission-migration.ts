/**
 * 手数料カラムを追加するマイグレーションスクリプト
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n🔧 billing_items に手数料カラムを追加中...\n')

  try {
    await prisma.$executeRawUnsafe(`
      -- Add commission fields to billing_items
      ALTER TABLE app.billing_items
      ADD COLUMN IF NOT EXISTS commission_type VARCHAR(20),
      ADD COLUMN IF NOT EXISTS commission_rate REAL,
      ADD COLUMN IF NOT EXISTS commission_amount REAL,
      ADD COLUMN IF NOT EXISTS is_commission_manual BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS commission_note TEXT,
      ADD COLUMN IF NOT EXISTS net_amount REAL;
    `)

    console.log('✅ カラム追加完了')

    await prisma.$executeRawUnsafe(`
      -- Add index for commission_manual flag
      CREATE INDEX IF NOT EXISTS idx_billing_commission_manual ON app.billing_items(is_commission_manual);
    `)

    console.log('✅ インデックス追加完了')

    // Add comments individually
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.commission_type IS 'PERCENTAGE | FIXED_AMOUNT | MANUAL';`)
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.commission_rate IS '手数料率（%）';`)
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.commission_amount IS '手数料額（円）';`)
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.is_commission_manual IS '手動調整フラグ';`)
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.commission_note IS '手数料メモ（調整理由など）';`)
    await prisma.$executeRawUnsafe(`COMMENT ON COLUMN app.billing_items.net_amount IS '純額 = amount - commission_amount';`)

    console.log('✅ コメント追加完了')

    console.log('\n🎉 マイグレーション完了！\n')
  } catch (error) {
    console.error('❌ エラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('❌ マイグレーション失敗:', err)
  process.exit(1)
})


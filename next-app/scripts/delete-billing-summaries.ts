/**
 * 既存の請求サマリーを削除するスクリプト
 * 
 * 背景:
 * - DRAFT 状態の明細で生成されたサマリーは不正確
 * - 明細を APPROVED に更新した後、サマリーを再生成する必要がある
 * - このスクリプトで既存サマリーをクリアする
 * 
 * 実行: pnpm tsx scripts/delete-billing-summaries.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n========== 請求サマリー削除 ==========')

  // 1. 現在のサマリー件数を確認
  const summaryCount = await prisma.billing_summaries.count()

  console.log(`📊 現在のサマリー件数: ${summaryCount}`)

  if (summaryCount === 0) {
    console.log('✅ 削除対象なし')
    return
  }

  // 2. 確認メッセージ
  console.log(`⚠️  ${summaryCount} 件のサマリーを削除します...`)

  // 3. 全サマリーを削除
  const result = await prisma.billing_summaries.deleteMany({})

  console.log(`✅ ${result.count} 件のサマリーを削除しました`)
  console.log('========== 完了 ==========')
  console.log('次のステップ: pnpm gen:billing-summaries-range で正しいサマリーを再生成してください。')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



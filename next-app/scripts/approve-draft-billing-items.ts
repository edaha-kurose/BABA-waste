/**
 * 既存の DRAFT 状態の請求明細を APPROVED に更新するスクリプト
 * 
 * 背景:
 * - 過去に作成されたテストデータが DRAFT 状態のまま
 * - DRAFT 状態では請求サマリーの集計対象外
 * - テスト用途のため、一括で APPROVED に変更
 * 
 * 実行: pnpm tsx scripts/approve-draft-billing-items.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\n========== DRAFT → APPROVED 一括更新 ==========')

  // 1. 現在の DRAFT 件数を確認
  const draftCount = await prisma.app_billing_items.count({
    where: {
      status: 'DRAFT',
      deleted_at: null,
    },
  })

  console.log(`📊 現在の DRAFT 件数: ${draftCount}`)

  if (draftCount === 0) {
    console.log('✅ 更新対象なし（全て承認済み）')
    return
  }

  // 2. DRAFT → APPROVED に一括更新
  const result = await prisma.app_billing_items.updateMany({
    where: {
      status: 'DRAFT',
      deleted_at: null,
    },
    data: {
      status: 'APPROVED',
      notes: 'Auto-approved for testing (converted from DRAFT)',
      updated_at: new Date(),
    },
  })

  console.log(`✅ ${result.count} 件を APPROVED に更新しました`)

  // 3. 更新後の状態を確認
  const approvedCount = await prisma.app_billing_items.count({
    where: {
      status: 'APPROVED',
      deleted_at: null,
    },
  })

  console.log(`📊 更新後の APPROVED 件数: ${approvedCount}`)
  console.log('========== 完了 ==========')
  console.log('次のステップ: 既存のサマリーを削除してから再生成してください。')
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



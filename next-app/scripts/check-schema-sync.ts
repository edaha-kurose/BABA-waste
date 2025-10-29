// ============================================================================
// スクリプト: check-schema-sync.ts
// 目的: Prisma schema.prisma と実際のDBが同期しているか確認
// 使い方: pnpm exec tsx scripts/check-schema-sync.ts
// ============================================================================

import { execSync } from 'child_process'
import { readFileSync, existsSync, unlinkSync, copyFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

async function main() {
  console.log('============================================================')
  console.log('🔍 Prisma スキーマ同期チェック開始')
  console.log('============================================================')
  console.log('')

  const schemaPath = resolve(__dirname, '../prisma/schema.prisma')
  const backupPath = resolve(__dirname, '../prisma/schema.prisma.backup')

  if (!existsSync(schemaPath)) {
    console.error('❌ prisma/schema.prisma が見つかりません')
    process.exit(1)
  }

  try {
    // 1. schema.prisma をバックアップ
    console.log('📄 Step 1: schema.prisma をバックアップ中...')
    const originalSchema = readFileSync(schemaPath, 'utf-8')
    copyFileSync(schemaPath, backupPath)
    console.log('   ✅ バックアップ完了')
    console.log('')

    // 2. DB から最新スキーマを取得
    console.log('📥 Step 2: DBから最新スキーマを取得中...')
    console.log('   コマンド: prisma db pull')
    console.log('')

    try {
      execSync('pnpm prisma db pull', {
        stdio: 'inherit',
        cwd: resolve(__dirname, '..'),
      })
    } catch (error) {
      console.error('❌ prisma db pull に失敗しました')
      console.error('   DATABASE_URL を確認してください')

      // バックアップを復元
      if (existsSync(backupPath)) {
        copyFileSync(backupPath, schemaPath)
        unlinkSync(backupPath)
      }
      process.exit(1)
    }

    console.log('')

    // 3. 差分確認
    console.log('🔍 Step 3: 差分確認中...')
    const newSchema = readFileSync(schemaPath, 'utf-8')

    if (originalSchema !== newSchema) {
      console.error('')
      console.error('============================================================')
      console.error('❌ schema.prisma と DB が乖離しています！')
      console.error('============================================================')
      console.error('')
      console.error('以下のコマンドで差分を確認してください:')
      console.error('  git diff prisma/schema.prisma')
      console.error('')

      try {
        console.error('【差分内容】')
        execSync('git diff prisma/schema.prisma', {
          stdio: 'inherit',
          cwd: resolve(__dirname, '..'),
        })
      } catch {
        // git がない環境では差分表示をスキップ
      }

      console.error('')
      console.error('【対処方法】')
      console.error('1. DB側が正しい場合: prisma db pull を実行して schema.prisma を更新')
      console.error('2. schema.prisma が正しい場合: prisma migrate dev を実行してDBに反映')
      console.error('')

      // 元に戻す
      copyFileSync(backupPath, schemaPath)
      unlinkSync(backupPath)
      process.exit(1)
    }

    console.log('   ✅ 差分なし - schema.prisma と DB は同期しています')
    console.log('')

    // バックアップを削除
    if (existsSync(backupPath)) {
      unlinkSync(backupPath)
    }

    console.log('============================================================')
    console.log('✅ スキーマ同期チェック完了！')
    console.log('============================================================')
    console.log('')
  } catch (error: any) {
    console.error('')
    console.error('❌ エラー発生:', error.message)
    console.error('')

    // バックアップがあれば復元
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, schemaPath)
      unlinkSync(backupPath)
      console.log('🔄 schema.prisma を元に戻しました')
    }

    process.exit(1)
  }
}

main()


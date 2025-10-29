/**
 * Prisma Migrate 実行スクリプト
 * .env.localを読み込んでからマイグレーションを実行
 * 
 * Usage: tsx scripts/run-prisma-migrate.ts <migration_name>
 */

import { execSync } from 'child_process'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.localを読み込み
const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

// 引用符を削除
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '')
}

console.log('🔧 Prisma Migrate 実行')
console.log(`📁 .env.local: ${envPath}`)
console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL ? '✅ 設定済み' : '❌ 未設定'}`)
console.log(`🔍 URL scheme: ${process.env.DATABASE_URL?.substring(0, 15)}...`)

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URLが設定されていません')
  process.exit(1)
}

// コマンドライン引数からマイグレーション名を取得
const migrationName = process.argv[2] || 'unnamed_migration'
const createOnly = process.argv.includes('--create-only')

try {
  console.log(`\n🚀 マイグレーション作成: ${migrationName}`)
  
  const command = createOnly
    ? `npx prisma migrate dev --name ${migrationName} --create-only`
    : `npx prisma migrate dev --name ${migrationName}`
  
  console.log(`📝 実行コマンド: ${command}\n`)
  
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  })
  
  console.log('\n✅ マイグレーション完了')
} catch (error) {
  console.error('\n❌ マイグレーション失敗:', error)
  process.exit(1)
}


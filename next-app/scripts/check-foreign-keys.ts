// ============================================================================
// スクリプト: check-foreign-keys.ts
// 目的: 外部キー制約が適切に設定されているか確認
// 使い方: pnpm exec tsx scripts/check-foreign-keys.ts
// ============================================================================

import { config } from 'dotenv'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

// .env.local を読み込む
config({ path: resolve(__dirname, '../.env.local') })

// 引用符を削除
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '')
}

const prisma = new PrismaClient()

interface TableInfo {
  table_name: string
}

interface ColumnInfo {
  column_name: string
}

interface FKConstraint {
  constraint_name: string
  delete_rule: string
  update_rule: string
}

async function main() {
  console.log('============================================================')
  console.log('🔍 外部キー制約チェック開始')
  console.log('============================================================')
  console.log('')

  let hasIssues = false
  const issues: string[] = []

  try {
    // app スキーマの全テーブルを取得
    console.log('📋 Step 1: app スキーマのテーブル一覧を取得中...')
    const tables = await prisma.$queryRaw<TableInfo[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'app'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    console.log(`   ✅ ${tables.length} 件のテーブルを検出`)
    console.log('')

    console.log('🔍 Step 2: 外部キー候補（*_id カラム）をチェック中...')
    console.log('')

    for (const { table_name } of tables) {
      // 外部キー候補（*_id カラム）を取得
      const fkCandidates = await prisma.$queryRaw<ColumnInfo[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'app'
          AND table_name = ${table_name}
          AND column_name LIKE '%_id'
          AND column_name NOT IN (
            'id', 
            'org_id', 
            'tenant_id', 
            'created_by', 
            'updated_by', 
            'approved_by',
            'auth_user_id'
          )
        ORDER BY column_name
      `

      if (fkCandidates.length === 0) {
        continue
      }

      console.log(`   📦 ${table_name}:`)

      for (const { column_name } of fkCandidates) {
        // 外部キー制約が存在するか確認
        const fkConstraint = await prisma.$queryRaw<FKConstraint[]>`
          SELECT tc.constraint_name, rc.delete_rule, rc.update_rule
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          WHERE tc.table_schema = 'app'
            AND tc.table_name = ${table_name}
            AND tc.constraint_type = 'FOREIGN KEY'
            AND EXISTS (
              SELECT 1 FROM information_schema.key_column_usage kcu
              WHERE kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = 'app'
                AND kcu.table_name = ${table_name}
                AND kcu.column_name = ${column_name}
            )
        `

        if (fkConstraint.length === 0) {
          const issue = `${table_name}.${column_name}: 外部キー制約なし`
          console.log(`      ⚠️  ${column_name}: 外部キー制約なし`)
          issues.push(issue)
          hasIssues = true
        } else {
          const { constraint_name, delete_rule, update_rule } = fkConstraint[0]

          // ON DELETE / ON UPDATE が明示されているか確認
          if (delete_rule === 'NO ACTION' && update_rule === 'NO ACTION') {
            const issue = `${table_name}.${column_name}: ON DELETE/UPDATE の動作が未定義 (${constraint_name})`
            console.log(
              `      ⚠️  ${column_name}: ON DELETE/UPDATE が NO ACTION (${constraint_name})`
            )
            issues.push(issue)
            hasIssues = true
          } else {
            console.log(
              `      ✅ ${column_name}: ${constraint_name} (DELETE: ${delete_rule}, UPDATE: ${update_rule})`
            )
          }
        }
      }

      console.log('')
    }

    console.log('============================================================')
    if (hasIssues) {
      console.log('❌ 外部キー制約に問題があります')
      console.log('============================================================')
      console.log('')
      console.log('【検出された問題】')
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`)
      })
      console.log('')
      console.log('【対処方法】')
      console.log('1. schema.prisma で @relation を定義')
      console.log('   例:')
      console.log('   ```prisma')
      console.log('   model table_name {')
      console.log('     id           String @id')
      console.log('     parent_id    String @db.Uuid')
      console.log('     parent_table parent_table @relation(fields: [parent_id], references: [id], onDelete: Cascade, onUpdate: NoAction)')
      console.log('   }')
      console.log('   ```')
      console.log('')
      console.log('2. マイグレーション作成')
      console.log('   pnpm prisma migrate dev --name add_foreign_keys')
      console.log('')
      process.exit(1)
    } else {
      console.log('✅ 外部キー制約チェック完了 - 問題なし')
      console.log('============================================================')
      console.log('')
    }
  } catch (error: any) {
    console.error('')
    console.error('❌ エラー発生:', error.message)
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()




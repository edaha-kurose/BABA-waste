/**
 * 不正なUUIDを持つレコードを削除
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 不正UUID削除\n');
  console.log('='.repeat(80));
  
  const tables = [
    { schema: 'app', table: 'waste_type_masters', idColumn: 'id' },
    { schema: 'app', table: 'waste_type_masters', idColumn: 'collector_id' },
    { schema: 'app', table: 'store_item_collectors', idColumn: 'id' },
    { schema: 'app', table: 'collectors', idColumn: 'id' },
  ];
  
  for (const { schema, table, idColumn } of tables) {
    try {
      const invalidUUIDs = await prisma.$queryRawUnsafe(`
        SELECT ${idColumn}
        FROM ${schema}.${table}
        WHERE ${idColumn} IS NOT NULL
          AND ${idColumn}::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      `);
      
      if (invalidUUIDs.length > 0) {
        console.log(`❌ ${table}.${idColumn}: ${invalidUUIDs.length}件の不正UUID検出`);
        
        // 削除
        const deleteResult = await prisma.$queryRawUnsafe(`
          DELETE FROM ${schema}.${table}
          WHERE ${idColumn} IS NOT NULL
            AND ${idColumn}::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `);
        
        console.log(`  ✅ ${deleteResult}件削除完了`);
      } else {
        console.log(`✅ ${table}.${idColumn}: 正常`);
      }
    } catch (error) {
      if (error.code === '42P01') {
        console.log(`⚠️  ${table} テーブルが存在しません`);
      } else {
        console.error(`❌ ${table}.${idColumn} 処理エラー:`, error.message);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 不正UUID削除完了');
}

main()
  .catch((e) => {
    console.error('致命的エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());




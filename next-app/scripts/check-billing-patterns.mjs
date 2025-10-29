import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_ID = '12345678-1234-1234-1234-123456789012';

async function main() {
  console.log('📊 請求パターンデータ確認\n');

  // billing_type別の集計
  const billingTypes = await prisma.app_billing_items.groupBy({
    by: ['billing_type'],
    where: {
      org_id: ORG_ID,
      deleted_at: null,
    },
    _count: {
      id: true,
    },
  });

  console.log('【請求タイプ別件数】');
  billingTypes.forEach((type) => {
    console.log(`  ${type.billing_type}: ${type._count.id}件`);
  });

  // 特別料金項目の詳細
  const otherItems = await prisma.app_billing_items.findMany({
    where: {
      org_id: ORG_ID,
      billing_type: 'other',
      deleted_at: null,
    },
    select: {
      id: true,
      item_name: true,
      item_code: true,
      amount: true,
      status: true,
      notes: true,
    },
  });

  console.log('\n【特別料金項目（other）の詳細】');
  if (otherItems.length === 0) {
    console.log('  ❌ データが存在しません');
  } else {
    otherItems.forEach((item) => {
      console.log(`  ✅ ${item.item_name}`);
      console.log(`     コード: ${item.item_code}`);
      console.log(`     金額: ¥${item.amount.toLocaleString()}`);
      console.log(`     ステータス: ${item.status}`);
      console.log(`     備考: ${item.notes || 'なし'}`);
      console.log('');
    });
  }

  // マイナス金額の確認
  const negativeItems = await prisma.app_billing_items.findMany({
    where: {
      org_id: ORG_ID,
      amount: {
        lt: 0,
      },
      deleted_at: null,
    },
    select: {
      item_name: true,
      amount: true,
      billing_type: true,
    },
  });

  console.log('【マイナス金額（返金）】');
  if (negativeItems.length === 0) {
    console.log('  ❌ データが存在しません');
  } else {
    negativeItems.forEach((item) => {
      console.log(`  ✅ ${item.item_name}: ¥${item.amount.toLocaleString()} (${item.billing_type})`);
    });
  }

  // 総合集計
  const total = await prisma.app_billing_items.count({
    where: { org_id: ORG_ID, deleted_at: null },
  });

  console.log(`\n【総件数】: ${total}件`);

  if (total === 0) {
    console.log('\n⚠️ 警告: テストデータが存在しません');
    console.log('   以下のコマンドで作成してください:');
    console.log('   pnpm prisma:seed:billing');
  }
}

main()
  .catch((e) => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

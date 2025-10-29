import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// .env.localファイルをロード
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// テナントごとに収集業者を5社作成
const TENANTS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'コスモス薬品株式会社',
    code: 'COSMOS',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: '楽市楽座株式会社',
    code: 'RAKUICHI',
  },
];

const COLLECTOR_TEMPLATES = [
  {
    name_suffix: 'エコ回収',
    region: '東日本',
    areas: ['東京都', '埼玉県', '千葉県', '神奈川県'],
    license_prefix: '東京都',
  },
  {
    name_suffix: 'リサイクルパートナーズ',
    region: '北日本',
    areas: ['北海道', '青森県', '岩手県', '宮城県'],
    license_prefix: '北海道',
  },
  {
    name_suffix: 'エコクリーン',
    region: '東海',
    areas: ['愛知県', '岐阜県', '三重県', '静岡県'],
    license_prefix: '愛知県',
  },
  {
    name_suffix: 'グリーンパートナーズ',
    region: '関西',
    areas: ['大阪府', '京都府', '兵庫県', '奈良県'],
    license_prefix: '大阪府',
  },
  {
    name_suffix: 'クリーンネット',
    region: '九州',
    areas: ['福岡県', '佐賀県', '長崎県', '熊本県'],
    license_prefix: '福岡県',
  },
];

const ADMIN_USER_ID = '1a9eb299-e83a-49fe-bf3c-48aa37646d6d';

async function main() {
  console.log('🚀 収集業者テストデータ拡張開始\n');
  console.log('='.repeat(80));

  for (const tenant of TENANTS) {
    console.log(`\n📋 テナント: ${tenant.name} (${tenant.code})`);
    console.log('-'.repeat(80));

    // 既存の収集業者数を確認
    const existingCount = await prisma.collectors.count({
      where: { org_id: tenant.id, deleted_at: null },
    });

    console.log(`既存の収集業者数: ${existingCount}社`);

    // 5社になるように追加
    const collectorsToCreate = COLLECTOR_TEMPLATES.slice(0, 5 - existingCount);

    if (collectorsToCreate.length === 0) {
      console.log('✅ すでに5社登録されています。スキップします。');
      continue;
    }

    console.log(`追加する収集業者数: ${collectorsToCreate.length}社\n`);

    for (const template of collectorsToCreate) {
      const companyName = `${template.name_suffix}${template.region}株式会社`;
      
      // 既に存在するか確認
      const existing = await prisma.collectors.findFirst({
        where: {
          org_id: tenant.id,
          company_name: companyName,
          deleted_at: null,
        },
      });

      if (existing) {
        console.log(`  ⏭️  ${companyName} は既に登録されています。スキップ。`);
        continue;
      }

      const collector = await prisma.collectors.create({
        data: {
          org_id: tenant.id,
          company_name: companyName,
          contact_person: `${template.region}営業部 担当者`,
          address: `${template.areas[0]}○○区△△1-2-3`,
          phone: `0${Math.floor(Math.random() * 10)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          email: `contact@${template.name_suffix.toLowerCase()}-${template.region.toLowerCase()}.example.com`,
          license_number: `${template.license_prefix}-産廃-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          service_areas: template.areas,
          is_active: true,
          created_by: ADMIN_USER_ID,
          updated_by: ADMIN_USER_ID,
        },
      });

      console.log(`  ✅ ${collector.company_name}`);
      console.log(`     ID: ${collector.id}`);
      console.log(`     ライセンス: ${collector.license_number}`);
      console.log(`     サービスエリア: ${template.areas.join(', ')}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 収集業者テストデータ拡張完了\n');

  // 最終確認
  for (const tenant of TENANTS) {
    const count = await prisma.collectors.count({
      where: { org_id: tenant.id, deleted_at: null },
    });
    console.log(`${tenant.name}: ${count}社登録済み`);
  }
}

main()
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


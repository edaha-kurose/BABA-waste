/**
 * テナント分離検証スクリプト
 * 
 * 目的:
 * - マルチテナント環境でデータ分離が正しく機能しているか検証
 * - 他組織のデータが誤って見えていないか確認
 * - RLSポリシーが正しく適用されているか確認
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  tableName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifyTenantIsolation() {
  console.log('🔍 テナント分離検証開始...\n');

  try {
    // Step 1: 組織を2つ取得
    const orgs = await prisma.organizations.findMany({
      take: 2,
      where: { is_active: true },
    });

    if (orgs.length < 2) {
      console.error('❌ 検証には最低2つの組織が必要です');
      process.exit(1);
    }

    const [org1, org2] = orgs;
    console.log(`📊 検証対象組織:`);
    console.log(`  - 組織1: ${org1.name} (${org1.id})`);
    console.log(`  - 組織2: ${org2.name} (${org2.id})\n`);

    // Step 2: 各テーブルでテナント分離を検証
    const tablesToVerify = [
      'stores',
      'collectors',
      'item_maps',
      'plans',
      'collection_requests',
      'collections',
      'app_billing_items',
      'billing_summaries',
      'waste_type_masters',
      'store_item_collectors',
    ] as const;

    for (const tableName of tablesToVerify) {
      await verifyTable(tableName, org1.id, org2.id);
    }

    // Step 3: 結果レポート
    console.log('\n' + '='.repeat(80));
    console.log('📋 検証結果サマリー');
    console.log('='.repeat(80));

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`\n✅ 成功: ${passed}件`);
    console.log(`❌ 失敗: ${failed}件\n`);

    if (failed > 0) {
      console.error('⚠️  失敗したテーブル:\n');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.error(`  - ${r.tableName}: ${r.message}`);
          if (r.details) {
            console.error(`    詳細: ${JSON.stringify(r.details, null, 2)}`);
          }
        });
      process.exit(1);
    }

    console.log('✅ 全てのテナント分離検証に成功しました！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyTable(
  tableName: string,
  org1Id: string,
  org2Id: string
) {
  const modelClient = (prisma as any)[tableName];
  if (!modelClient) {
    results.push({
      tableName,
      passed: false,
      message: 'モデルが存在しません',
    });
    return;
  }

  try {
    // org1 のデータを取得
    const org1Data = await modelClient.findMany({
      where: { org_id: org1Id, deleted_at: null },
    });

    // org2 のデータを取得
    const org2Data = await modelClient.findMany({
      where: { org_id: org2Id, deleted_at: null },
    });

    // org1 のコンテキストで org2 のデータが混入していないか確認
    const org2InOrg1 = org1Data.filter((d: any) => d.org_id === org2Id);
    const org1InOrg2 = org2Data.filter((d: any) => d.org_id === org1Id);

    if (org2InOrg1.length > 0 || org1InOrg2.length > 0) {
      results.push({
        tableName,
        passed: false,
        message: `テナント分離が破られています (org1→org2: ${org2InOrg1.length}件, org2→org1: ${org1InOrg2.length}件)`,
        details: {
          org1Count: org1Data.length,
          org2Count: org2Data.length,
          crossContamination: org2InOrg1.length + org1InOrg2.length,
        },
      });
      console.log(`❌ ${tableName}: テナント分離失敗`);
    } else {
      results.push({
        tableName,
        passed: true,
        message: `テナント分離OK (org1: ${org1Data.length}件, org2: ${org2Data.length}件)`,
      });
      console.log(`✅ ${tableName}: テナント分離OK`);
    }
  } catch (error: any) {
    results.push({
      tableName,
      passed: false,
      message: `エラー: ${error.message}`,
    });
    console.log(`⚠️  ${tableName}: 検証エラー (${error.message})`);
  }
}

// 実行
verifyTenantIsolation();




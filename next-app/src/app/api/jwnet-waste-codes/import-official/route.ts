/**
 * JWNET公式コード一括取り込みAPI
 * 
 * ✅ グローバルルール準拠: Prisma経由でのバルクインサート
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/session-server';
import { z } from 'zod';

// JWNET公式コード（約70件の代表的なコード）
const JWNET_OFFICIAL_CODES = [
  // 01: 燃え殻
  { waste_code: '0010101', waste_name: '燃え殻（石炭火力発電所）', waste_category: '燃え殻', waste_type: '石炭火力発電所', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0010102', waste_name: '燃え殻（産業廃棄物焼却施設）', waste_category: '燃え殻', waste_type: '産業廃棄物焼却施設', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0010103', waste_name: '燃え殻（その他）', waste_category: '燃え殻', waste_type: 'その他', unit_code: 'KG', unit_name: 'キログラム' },

  // 02: 汚泥
  { waste_code: '0020101', waste_name: '汚泥（有機性汚泥）', waste_category: '汚泥', waste_type: '有機性汚泥', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0020102', waste_name: '汚泥（無機性汚泥）', waste_category: '汚泥', waste_type: '無機性汚泥', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0020103', waste_name: '汚泥（建設汚泥）', waste_category: '汚泥', waste_type: '建設汚泥', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0020104', waste_name: '汚泥（その他）', waste_category: '汚泥', waste_type: 'その他', unit_code: 'KG', unit_name: 'キログラム' },

  // 03: 廃油
  { waste_code: '0030101', waste_name: '廃油（鉱物性油）', waste_category: '廃油', waste_type: '鉱物性油', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0030102', waste_name: '廃油（動植物性油）', waste_category: '廃油', waste_type: '動植物性油', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0030103', waste_name: '廃油（潤滑油）', waste_category: '廃油', waste_type: '潤滑油', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0030104', waste_name: '廃油（切削油）', waste_category: '廃油', waste_type: '切削油', unit_code: 'L', unit_name: 'リットル' },

  // 04: 廃酸
  { waste_code: '0040101', waste_name: '廃酸（有機酸）', waste_category: '廃酸', waste_type: '有機酸', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0040102', waste_name: '廃酸（無機酸）', waste_category: '廃酸', waste_type: '無機酸', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0040103', waste_name: '廃酸（その他）', waste_category: '廃酸', waste_type: 'その他', unit_code: 'L', unit_name: 'リットル' },

  // 05: 廃アルカリ
  { waste_code: '0050101', waste_name: '廃アルカリ（有機アルカリ）', waste_category: '廃アルカリ', waste_type: '有機アルカリ', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0050102', waste_name: '廃アルカリ（無機アルカリ）', waste_category: '廃アルカリ', waste_type: '無機アルカリ', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '0050103', waste_name: '廃アルカリ（その他）', waste_category: '廃アルカリ', waste_type: 'その他', unit_code: 'L', unit_name: 'リットル' },

  // 06: 廃プラスチック類
  { waste_code: '0060101', waste_name: '廃プラスチック類（合成樹脂くず）', waste_category: '廃プラスチック類', waste_type: '合成樹脂くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0060102', waste_name: '廃プラスチック類（合成繊維くず）', waste_category: '廃プラスチック類', waste_type: '合成繊維くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0060103', waste_name: '廃プラスチック類（合成ゴムくず）', waste_category: '廃プラスチック類', waste_type: '合成ゴムくず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0060104', waste_name: '廃プラスチック類（廃タイヤ）', waste_category: '廃プラスチック類', waste_type: '廃タイヤ', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0060105', waste_name: '廃プラスチック類（発泡スチロール）', waste_category: '廃プラスチック類', waste_type: '発泡スチロール', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0060106', waste_name: '廃プラスチック類（プラスチック製品）', waste_category: '廃プラスチック類', waste_type: 'プラスチック製品', unit_code: 'KG', unit_name: 'キログラム' },

  // 07: 紙くず
  { waste_code: '0070101', waste_name: '紙くず', waste_category: '紙くず', waste_type: '紙くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0070102', waste_name: '紙くず（段ボール）', waste_category: '紙くず', waste_type: '段ボール', unit_code: 'KG', unit_name: 'キログラム' },

  // 08: 木くず
  { waste_code: '0080101', waste_name: '木くず', waste_category: '木くず', waste_type: '木くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0080102', waste_name: '木くず（建設廃木材）', waste_category: '木くず', waste_type: '建設廃木材', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0080103', waste_name: '木くず（おがくず）', waste_category: '木くず', waste_type: 'おがくず', unit_code: 'KG', unit_name: 'キログラム' },

  // 09: 繊維くず
  { waste_code: '0090101', waste_name: '繊維くず（天然繊維くず）', waste_category: '繊維くず', waste_type: '天然繊維くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '0090102', waste_name: '繊維くず（その他）', waste_category: '繊維くず', waste_type: 'その他', unit_code: 'KG', unit_name: 'キログラム' },

  // 10: 動植物性残さ
  { waste_code: '1000101', waste_name: '動植物性残さ（食品残さ）', waste_category: '動植物性残さ', waste_type: '食品残さ', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1000102', waste_name: '動植物性残さ（厨芥）', waste_category: '動植物性残さ', waste_type: '厨芥', unit_code: 'KG', unit_name: 'キログラム' },

  // 11: 動物系固形不要物
  { waste_code: '1100101', waste_name: '動物系固形不要物', waste_category: '動物系固形不要物', waste_type: '動物系固形不要物', unit_code: 'KG', unit_name: 'キログラム' },

  // 12: ゴムくず
  { waste_code: '1200101', waste_name: 'ゴムくず（天然ゴムくず）', waste_category: 'ゴムくず', waste_type: '天然ゴムくず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1200102', waste_name: 'ゴムくず（その他）', waste_category: 'ゴムくず', waste_type: 'その他', unit_code: 'KG', unit_name: 'キログラム' },

  // 13: 金属くず
  { waste_code: '1300101', waste_name: '金属くず（鉄くず）', waste_category: '金属くず', waste_type: '鉄くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1300102', waste_name: '金属くず（非鉄金属くず）', waste_category: '金属くず', waste_type: '非鉄金属くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1300103', waste_name: '金属くず（アルミニウムくず）', waste_category: '金属くず', waste_type: 'アルミニウムくず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1300104', waste_name: '金属くず（銅くず）', waste_category: '金属くず', waste_type: '銅くず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1300105', waste_name: '金属くず（鉛くず）', waste_category: '金属くず', waste_type: '鉛くず', unit_code: 'KG', unit_name: 'キログラム' },

  // 14: ガラスくず、コンクリートくず及び陶磁器くず
  { waste_code: '1400101', waste_name: 'ガラスくず', waste_category: 'ガラスくず、コンクリートくず及び陶磁器くず', waste_type: 'ガラスくず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1400102', waste_name: 'コンクリートくず', waste_category: 'ガラスくず、コンクリートくず及び陶磁器くず', waste_type: 'コンクリートくず', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1400103', waste_name: '陶磁器くず', waste_category: 'ガラスくず、コンクリートくず及び陶磁器くず', waste_type: '陶磁器くず', unit_code: 'KG', unit_name: 'キログラム' },

  // 15: 鉱さい
  { waste_code: '1500101', waste_name: '鉱さい（高炉スラグ）', waste_category: '鉱さい', waste_type: '高炉スラグ', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1500102', waste_name: '鉱さい（その他）', waste_category: '鉱さい', waste_type: 'その他', unit_code: 'KG', unit_name: 'キログラム' },

  // 16: がれき類
  { waste_code: '1600101', waste_name: 'がれき類（コンクリート破片）', waste_category: 'がれき類', waste_type: 'コンクリート破片', unit_code: 'T', unit_name: 'トン' },
  { waste_code: '1600102', waste_name: 'がれき類（アスファルト破片）', waste_category: 'がれき類', waste_type: 'アスファルト破片', unit_code: 'T', unit_name: 'トン' },
  { waste_code: '1600103', waste_name: 'がれき類（レンガくず）', waste_category: 'がれき類', waste_type: 'レンガくず', unit_code: 'T', unit_name: 'トン' },

  // 17: ばいじん
  { waste_code: '1700101', waste_name: 'ばいじん', waste_category: 'ばいじん', waste_type: 'ばいじん', unit_code: 'KG', unit_name: 'キログラム' },

  // 18: 13号廃棄物
  { waste_code: '1800101', waste_name: '13号廃棄物（動物のふん尿）', waste_category: '13号廃棄物', waste_type: '動物のふん尿', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '1800102', waste_name: '13号廃棄物（動物の死体）', waste_category: '13号廃棄物', waste_type: '動物の死体', unit_code: 'KG', unit_name: 'キログラム' },

  // 19: 建設混合廃棄物
  { waste_code: '1900101', waste_name: '建設混合廃棄物', waste_category: '建設混合廃棄物', waste_type: '建設混合廃棄物', unit_code: 'KG', unit_name: 'キログラム' },

  // 20: 安定型混合廃棄物
  { waste_code: '2000101', waste_name: '安定型混合廃棄物', waste_category: '安定型混合廃棄物', waste_type: '安定型混合廃棄物', unit_code: 'KG', unit_name: 'キログラム' },

  // 特別管理産業廃棄物
  { waste_code: '7010101', waste_name: '廃油（特別管理）', waste_category: '特別管理産業廃棄物', waste_type: '廃油', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '7020101', waste_name: '廃酸（特別管理）', waste_category: '特別管理産業廃棄物', waste_type: '廃酸', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '7030101', waste_name: '廃アルカリ（特別管理）', waste_category: '特別管理産業廃棄物', waste_type: '廃アルカリ', unit_code: 'L', unit_name: 'リットル' },
  { waste_code: '7040101', waste_name: '感染性産業廃棄物', waste_category: '特別管理産業廃棄物', waste_type: '感染性', unit_code: 'KG', unit_name: 'キログラム' },

  // 事業系一般廃棄物
  { waste_code: '9010101', waste_name: '事業系一般廃棄物（可燃ごみ）', waste_category: '事業系一般廃棄物', waste_type: '可燃ごみ', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '9010102', waste_name: '事業系一般廃棄物（不燃ごみ）', waste_category: '事業系一般廃棄物', waste_type: '不燃ごみ', unit_code: 'KG', unit_name: 'キログラム' },
  { waste_code: '9010103', waste_name: '事業系一般廃棄物（資源ごみ）', waste_category: '事業系一般廃棄物', waste_type: '資源ごみ', unit_code: 'KG', unit_name: 'キログラム' },
];

// POST /api/jwnet-waste-codes/import-official - JWNET公式コード一括取り込み
export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser || !authUser.isSystemAdmin) {
    return NextResponse.json({ error: 'Forbidden: System admin only' }, { status: 403 });
  }

  console.log('[JWNET Import] 一括取り込み開始...');

  // ✅ Prisma経由でバルクインサート（グローバルルール準拠）
  let results
  try {
    results = await prisma.$transaction(
      JWNET_OFFICIAL_CODES.map((code) =>
        prisma.jwnet_waste_codes.upsert({
          where: { waste_code: code.waste_code },
          update: {
            waste_name: code.waste_name,
            waste_category: code.waste_category,
            waste_type: code.waste_type,
            unit_code: code.unit_code,
            unit_name: code.unit_name,
            is_active: true,
            updated_at: new Date(),
          },
          create: {
            waste_code: code.waste_code,
            waste_name: code.waste_name,
            waste_category: code.waste_category,
            waste_type: code.waste_type,
            unit_code: code.unit_code,
            unit_name: code.unit_name,
            is_active: true,
          },
        })
      )
    );
  } catch (dbError) {
    console.error('[POST /api/jwnet-waste-codes/import-official] Prismaトランザクションエラー:', dbError);
    return NextResponse.json(
      { error: 'データベースエラーが発生しました' },
      { status: 500 }
    );
  }

  console.log(`[JWNET Import] 完了: ${results.length}件登録`);

  return NextResponse.json(
    {
      message: 'JWNET公式コードを取り込みました',
      count: results.length,
      codes: results.map((r) => r.waste_code),
    },
    { status: 200 }
  );
}

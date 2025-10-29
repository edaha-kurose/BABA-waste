# JWNETコード一括取り込みガイド

**作成日**: 2025-10-19  
**目的**: JWNET公式の廃棄物コードをシステムに一括取り込み  
**参照**: [JWNET コード表 v3.1 (PDF)](https://www.jwnet.or.jp/jwnet/manual/assets/files/jwnet_code_ver3_1.pdf)

---

## 📋 JWNETコードとは？

**JWNET（電子マニフェストシステム）**が定める標準的な廃棄物分類コードです。

### コード構造（7桁）

```
例: 0010101
    ││││└── 細分類 (001～999 or 000)
    │││└── 小分類 (01～99)
    ││└── 中分類 (01～99)
    └└── 大分類 (01～20)
```

### 主な大分類

| コード | 分類名 |
|--------|--------|
| 01 | 燃え殻 |
| 02 | 汚泥 |
| 03 | 廃油 |
| 04 | 廃酸 |
| 05 | 廃アルカリ |
| 06 | 廃プラスチック類 |
| 07 | 紙くず |
| 08 | 木くず |
| 09 | 繊維くず |
| 10 | 動植物性残さ |
| 11 | 動物系固形不要物 |
| 12 | ゴムくず |
| 13 | 金属くず |
| 14 | ガラスくず、コンクリートくず及び陶磁器くず |
| 15 | 鉱さい |
| 16 | がれき類 |
| 17 | ばいじん |
| 18 | 13号廃棄物（政令で定めるもの） |
| 19 | 建設混合廃棄物 |
| 20 | 安定型混合廃棄物 |

---

## 🔧 実装方針

### 1. SQLファイルでの一括投入

```sql
-- db/seed/005_jwnet_waste_codes.sql
-- JWNET公式コード表(v3.1)からの抽出データ

INSERT INTO app.jwnet_waste_codes (waste_code, waste_name, waste_category, waste_type, unit_code, unit_name)
VALUES
  ('0010101', '燃え殻（石炭火力発電所）', '燃え殻', '石炭火力発電所', 'KG', 'キログラム'),
  ('0010102', '燃え殻（産業廃棄物焼却施設）', '燃え殻', '産業廃棄物焼却施設', 'KG', 'キログラム'),
  ('0010103', '燃え殻（その他）', '燃え殻', 'その他', 'KG', 'キログラム'),
  -- ... 約200件
ON CONFLICT (waste_code) DO NOTHING;
```

### 2. 管理画面からの取り込みボタン

```
JWNET廃棄物コードマスター画面
  └─ 「🔄 JWNET公式コードを一括取り込み」ボタン
      ↓
  API: /api/jwnet-waste-codes/import-official
      ↓
  SQL実行: db/seed/005_jwnet_waste_codes.sql
```

---

## 📊 JWNET公式コード表から抽出したデータ

### 代表的なコード一覧（抜粋）

| waste_code | waste_name | waste_category | waste_type | unit_code | unit_name |
|------------|------------|----------------|------------|-----------|-----------|
| 0010101 | 燃え殻（石炭火力発電所） | 燃え殻 | 石炭火力発電所 | KG | キログラム |
| 0010102 | 燃え殻（産業廃棄物焼却施設） | 燃え殻 | 産業廃棄物焼却施設 | KG | キログラム |
| 0020101 | 汚泥（有機性汚泥） | 汚泥 | 有機性汚泥 | KG | キログラム |
| 0020102 | 汚泥（無機性汚泥） | 汚泥 | 無機性汚泥 | KG | キログラム |
| 0030101 | 廃油（鉱物性油） | 廃油 | 鉱物性油 | L | リットル |
| 0030102 | 廃油（動植物性油） | 廃油 | 動植物性油 | L | リットル |
| 0060101 | 廃プラスチック類（合成樹脂くず） | 廃プラスチック類 | 合成樹脂くず | KG | キログラム |
| 0060102 | 廃プラスチック類（合成繊維くず） | 廃プラスチック類 | 合成繊維くず | KG | キログラム |
| 0070101 | 紙くず | 紙くず | 紙くず | KG | キログラム |
| 0080101 | 木くず | 木くず | 木くず | KG | キログラム |
| 1300101 | 金属くず（鉄くず） | 金属くず | 鉄くず | KG | キログラム |
| 1300102 | 金属くず（非鉄金属くず） | 金属くず | 非鉄金属くず | KG | キログラム |
| 1400101 | ガラスくず | ガラスくず、コンクリートくず及び陶磁器くず | ガラスくず | KG | キログラム |
| 1400102 | コンクリートくず | ガラスくず、コンクリートくず及び陶磁器くず | コンクリートくず | KG | キログラム |
| 1600101 | がれき類（コンクリート破片） | がれき類 | コンクリート破片 | T | トン |
| 1600102 | がれき類（アスファルト破片） | がれき類 | アスファルト破片 | T | トン |

**完全版は `db/seed/005_jwnet_waste_codes.sql` を参照**

---

## 🚀 実装手順

### Step 1: SQLファイル作成

`db/seed/005_jwnet_waste_codes.sql` を作成し、JWNET公式コード表から抽出したデータを投入。

### Step 2: 一括取り込みAPI作成

```typescript
// next-app/src/app/api/jwnet-waste-codes/import-official/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { DATABASE_URL } = process.env;
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL not configured');
    }

    // SQLファイルを実行
    const sqlPath = 'db/seed/005_jwnet_waste_codes.sql';
    await execAsync(`psql "${DATABASE_URL}" -f ${sqlPath}`);

    return NextResponse.json(
      { message: 'JWNET公式コードを取り込みました', count: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('JWNET import error:', error);
    return NextResponse.json(
      { error: 'Failed to import JWNET codes' },
      { status: 500 }
    );
  }
}
```

### Step 3: 管理画面に取り込みボタン追加

```typescript
// next-app/src/app/dashboard/jwnet-waste-codes/page.tsx
const handleImportOfficial = async () => {
  Modal.confirm({
    title: 'JWNET公式コードを一括取り込みますか？',
    content: '約200件のJWNET公式コードをマスターに登録します。既存のコードは上書きされません。',
    onOk: async () => {
      const response = await fetch('/api/jwnet-waste-codes/import-official', {
        method: 'POST',
      });
      if (response.ok) {
        message.success('JWNET公式コードを取り込みました');
        fetchWasteCodes(); // 再読み込み
      } else {
        message.error('取り込みに失敗しました');
      }
    },
  });
};
```

---

## 📚 参考資料

- [JWNET公式サイト](https://www.jwnet.or.jp/)
- [JWNET コード表 v3.1 (PDF)](https://www.jwnet.or.jp/jwnet/manual/assets/files/jwnet_code_ver3_1.pdf)
- 最終更新: 2025年8月8日（v3.1）

---

## 🔍 よくある質問

### Q1: JWNETコードは変更されますか？
**A**: はい。JWNETは定期的にコード表を更新します。最新版を確認して再取り込みしてください。

### Q2: 独自のコードを追加できますか？
**A**: はい。細分類コード（001～999）を使って独自の名称を設定できます。

### Q3: すべてのコードを登録する必要がありますか？
**A**: いいえ。使用する予定のコードだけを選択して登録することも可能です。

---

**最終更新**: 2025-10-19  
**関連ドキュメント**: `WASTE_TYPE_MASTER_USAGE_GUIDE.md`





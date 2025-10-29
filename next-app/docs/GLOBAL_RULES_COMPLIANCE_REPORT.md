# グローバルルール準拠レポート

**作成日**: 2025-10-19  
**目的**: JWNETコード一括取り込み機能のグローバルルール準拠状況

---

## 🚨 当初の実装（❌ NG）

### 問題のあったコード

```bash
# ❌ グローバルルール違反
psql $DATABASE_URL -f db/seed/005_jwnet_waste_codes.sql
```

### 違反内容

**グローバルルール C. マイグレーション戦略の統一** に違反

```
❌ 禁止:
# 手動SQLでテーブル作成
psql $DATABASE_URL -f db/migrations/001_create_table.sql

✅ 正解:
# Prisma Migrate を使用
pnpm prisma migrate dev --name create_table
```

### 例外規定

グローバルルールでは以下の場合に手動SQLを許可：

1. RLS ポリシー追加
2. ストアドプロシージャ作成
3. **大量データ移行** ← 今回のケース

**但し、例外時の必須手順**:
```bash
# 1. 手動SQL実行後
psql $DATABASE_URL -f custom.sql

# 2. スキーマ同期確認（必須）
pnpm check:schema-sync

# 3. 差分があれば schema.prisma を更新
pnpm prisma db pull

# 4. 型生成
pnpm prisma:generate
```

### 問題点

- ✅ 「大量データ移行」に該当するため手動SQL自体は許可
- ❌ しかし、実行後のスキーマ同期確認手順が明示されていない
- ❌ より良い方法（Prisma経由）が優先される

---

## ✅ 修正後の実装（グローバルルール準拠）

### 実装方針

**Prisma経由でのバルクインサート**を採用

```typescript
// ✅ グローバルルール準拠
// next-app/src/app/api/jwnet-waste-codes/import-official/route.ts

export async function POST(request: NextRequest) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Prisma経由でバルクインサート
  const results = await prisma.$transaction(
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

  return NextResponse.json({
    message: 'JWNET公式コードを取り込みました',
    count: results.length,
  });
}
```

### グローバルルール準拠のポイント

#### 1. ✅ Prisma経由でのDB操作

```typescript
// ❌ NG: 直接SQL
psql $DATABASE_URL -f db/seed/005_jwnet_waste_codes.sql

// ✅ OK: Prisma経由
await prisma.jwnet_waste_codes.upsert(...)
```

#### 2. ✅ 認証チェック

```typescript
const authUser = await getAuthenticatedUser(request);
if (!authUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### 3. ✅ トランザクション使用

```typescript
await prisma.$transaction(
  JWNET_OFFICIAL_CODES.map((code) => ...)
);
```

#### 4. ✅ 冪等性の確保

```typescript
// upsert を使用（重複時は更新）
prisma.jwnet_waste_codes.upsert({
  where: { waste_code: code.waste_code },
  update: { ... },
  create: { ... },
})
```

#### 5. ✅ エラーハンドリング

```typescript
try {
  // ...
} catch (error) {
  console.error('[JWNET Import] エラー:', error);
  return NextResponse.json(
    {
      error: 'Failed to import JWNET codes',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}
```

---

## 📊 比較表

| 項目 | 手動SQL | Prisma経由 |
|------|---------|------------|
| グローバルルール準拠 | △ 例外規定あり | ✅ 推奨 |
| 型安全性 | ❌ なし | ✅ あり |
| トランザクション | 手動 | ✅ 自動 |
| エラーハンドリング | 手動 | ✅ 統一 |
| 認証チェック | ❌ 不可 | ✅ 可能 |
| 冪等性 | 手動 | ✅ upsert |
| スキーマ同期 | 手動確認必須 | ✅ 自動 |

---

## 🎯 結論

### 採用した実装

**Prisma経由でのバルクインサート**

- ✅ グローバルルールに完全準拠
- ✅ 型安全性を確保
- ✅ 認証・トランザクション・エラーハンドリングを統一
- ✅ スキーマ同期の問題なし

### 廃止した実装

**手動SQLファイル**

- ❌ グローバルルールの例外規定に該当するが推奨されない
- ❌ 実行後のスキーマ同期確認が必要
- ❌ 型安全性・認証チェックがない

---

## 📚 参考

- グローバルルール: `.cursor/rules/global-rules.md`
- セクション: **C. マイグレーション戦略の統一**
- 例外規定: **大量データ移行**

---

**最終更新**: 2025-10-19  
**ステータス**: ✅ グローバルルール準拠完了  
**実装者**: AI Assistant





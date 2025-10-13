# 共通設定ガードレール（V3.0 - BFF統合版）

**目的**: BFF（Backend For Frontend）アーキテクチャを前提とした、エンタープライズグレードの開発ガードレール

> V2.1の基盤に **BFFアーキテクチャ・外部API統合・セキュリティ強化** を統合した V3.0 版

---

## 更新履歴
- **2025-XX-XX V3.0**: BFFアーキテクチャ必須化、API契約駆動開発、外部API統合パターン、セキュリティ層強化、Prisma必須化
- **2025-09-29 V2.1**: 早期発見・根本原因分析・継続改善・AI特化
- **2025-09-28 V2.0**: RCA自動化・セキュリティ・観測性・再現性

---

## 0. 運用方針（V3.0 BFF版）

### 基本原則（継承＋強化）
- **BFF必須**: すべての外部API・ビジネスロジックはBFF層で処理
- **SSOT & 段階ゲート**: Plan→Check→Execute→Verify→Log を徹底
- **API契約駆動**: OpenAPI Spec → 型生成 → 実装の順で開発
- **Prisma必須**: すべてのDB操作はPrisma経由（型安全保証）
- **セキュリティ第一**: 秘密鍵はBFF層のみ、フロントエンドに露出禁止

### V3.0 新規追加原則
- 🔐 **APIキー隔離**: すべての外部APIキーはサーバーサイド管理
- 🎯 **ビジネスロジック集約**: 計算・検証・集約はBFF層
- 📊 **データ最適化**: フロントエンドには最適化されたデータのみ返却
- 🔄 **トランザクション保証**: 複数テーブル更新はPrismaトランザクション
- 🤖 **AI品質管理**: 引き続きプロンプト・コード検証を実施

---

## 1. BFFアーキテクチャ（新規・必須）

### 1.1 アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│ フロントエンド（React/Vite）                      │
│ - UI/UXのみ担当                                  │
│ - ビジネスロジックなし                            │
│ - APIキー保持禁止                                │
└────────────┬────────────────────────────────────┘
             │ REST API (JSON)
             ↓
┌─────────────────────────────────────────────────┐
│ BFF層（Next.js App Router API Routes）          │
│ ===== 責務 =====                                 │
│ ✅ 外部API統合（JWNET等）                        │
│ ✅ ビジネスロジック集約                          │
│ ✅ データ集約・変換                              │
│ ✅ 認証認可チェック                              │
│ ✅ エラーハンドリング・リトライ                  │
│ ✅ 監査ログ・テレメトリー                        │
└────────────┬────────────────────────────────────┘
             │
      ┌──────┴──────┐
      ↓             ↓
┌──────────┐  ┌──────────────┐
│ Supabase │  │ 外部API      │
│ Postgres │  │ - JWNET      │
│ + Prisma │  │ - 他サービス │
└──────────┘  └──────────────┘
```

### 1.2 技術スタック（必須）

```yaml
required_stack:
  bff_framework: "Next.js 14+ App Router"
  orm: "Prisma 5+"
  database: "Supabase PostgreSQL"
  auth: "Supabase Auth"
  api_spec: "OpenAPI 3.1"
  validation: "Zod"
  testing:
    - "Vitest (unit)"
    - "Playwright (e2e)"
  monitoring:
    - "OpenTelemetry"
    - "Sentry (errors)"
```

### 1.3 プロジェクト構造（必須）

```
project-root/
├── app/                          # Next.js App Router
│   ├── (frontend)/               # フロントエンド（クライアントサイド）
│   │   ├── dashboard/
│   │   ├── requests/
│   │   ├── billing/
│   │   └── layout.tsx
│   └── api/                      # BFF層（サーバーサイド）
│       ├── waste-requests/       # 廃棄物依頼API
│       │   ├── route.ts          # GET /api/waste-requests
│       │   ├── [id]/route.ts     # GET/PUT/DELETE /api/waste-requests/:id
│       │   └── calculate/route.ts
│       ├── billing/              # 請求API
│       │   ├── route.ts
│       │   ├── calculate/route.ts
│       │   ├── summary/route.ts
│       │   └── lock/route.ts
│       ├── jwnet/                # JWNET統合API
│       │   ├── register/route.ts
│       │   ├── status/route.ts
│       │   └── cancel/route.ts
│       └── health/route.ts       # ヘルスチェック
├── lib/                          # 共通ライブラリ
│   ├── prisma.ts                 # Prisma Client（シングルトン）
│   ├── auth.ts                   # 認証ヘルパー
│   ├── errors.ts                 # エラークラス
│   └── clients/                  # 外部APIクライアント
│       ├── jwnet/
│       │   ├── client.ts
│       │   ├── types.ts
│       │   └── retry.ts
│       └── supabase.ts
├── services/                     # ビジネスロジック層
│   ├── waste-request/
│   │   ├── calculate.ts
│   │   ├── validate.ts
│   │   └── workflow.ts
│   ├── billing/
│   │   ├── calculate.ts
│   │   ├── commission.ts
│   │   └── lock.ts
│   └── jwnet/
│       ├── manifest.ts
│       └── transform.ts
├── prisma/
│   ├── schema.prisma             # Prismaスキーマ（SSOT）
│   └── migrations/
├── contracts/                    # API契約（OpenAPI）
│   ├── openapi.yaml              # OpenAPI Spec
│   └── generated/                # 自動生成された型
├── tests/
│   ├── unit/                     # ユニットテスト
│   ├── integration/              # 統合テスト
│   └── e2e/                      # E2Eテスト
└── docs/
    ├── api/                      # API仕様書
    └── architecture/             # アーキテクチャドキュメント
```

---

## 2. API契約駆動開発（新規・必須）

### 2.1 OpenAPI Specファースト

```yaml
# contracts/openapi.yaml
openapi: 3.1.0
info:
  title: Edaha Waste Management API
  version: 3.0.0
  description: BFF API for waste management system

paths:
  /api/waste-requests:
    get:
      summary: 廃棄物依頼一覧取得
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [REQUESTING, TENTATIVE, MANIFEST_REGISTERED]
        - name: from_date
          in: query
          schema:
            type: string
            format: date
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/WasteRequest'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
                required: [data, meta]

components:
  schemas:
    WasteRequest:
      type: object
      required:
        - id
        - request_id
        - generator_company_name
        - generator_site_name
        - customer_name
        - waste_discharge_date
        - status
      properties:
        id: { type: string, format: uuid }
        request_id: { type: string }
        generator_company_name: { type: string }
        generator_site_name: { type: string }
        customer_name: { type: string }
        waste_discharge_date: { type: string, format: date }
        estimated_quantity: { type: number }
        status: 
          type: string
          enum: [REQUESTING, TENTATIVE, MANIFEST_REGISTERED]
```

### 2.2 型自動生成（必須）

```json
// package.json
{
  "scripts": {
    "openapi:generate": "openapi-typescript contracts/openapi.yaml -o contracts/generated/api-types.ts",
    "openapi:validate": "spectral lint contracts/openapi.yaml",
    "prisma:generate": "prisma generate",
    "codegen": "pnpm openapi:generate && pnpm prisma:generate",
    "preflight": "pnpm openapi:validate && pnpm codegen && pnpm typecheck"
  }
}
```

### 2.3 型安全なAPI実装

```typescript
// app/api/waste-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';
import type { components } from '@/contracts/generated/api-types';

// ✅ OpenAPI Specから自動生成された型を使用
type WasteRequest = components['schemas']['WasteRequest'];
type PaginationMeta = components['schemas']['PaginationMeta'];

// ✅ クエリパラメータのバリデーション
const querySchema = z.object({
  status: z.enum(['REQUESTING', 'TENTATIVE', 'MANIFEST_REGISTERED']).optional(),
  from_date: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20)
});

export async function GET(request: NextRequest) {
  try {
    // ✅ 認証チェック
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ バリデーション
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.parse(searchParams);

    // ✅ Prismaでデータ取得（型安全）
    const [data, total] = await Promise.all([
      prisma.$queryRaw<WasteRequest[]>`
        SELECT * FROM vw_waste_requests
        WHERE tenant_id = ${user.tenant_id}
        ${query.status ? Prisma.sql`AND status = ${query.status}` : Prisma.empty}
        ${query.from_date ? Prisma.sql`AND waste_discharge_date >= ${query.from_date}` : Prisma.empty}
        ORDER BY waste_discharge_date DESC
        LIMIT ${query.per_page}
        OFFSET ${(query.page - 1) * query.per_page}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM waste_requests
        WHERE tenant_id = ${user.tenant_id}
      `
    ]);

    // ✅ レスポンス（OpenAPI Spec準拠）
    const meta: PaginationMeta = {
      page: query.page,
      per_page: query.per_page,
      total: Number(total[0].count),
      total_pages: Math.ceil(Number(total[0].count) / query.per_page)
    };

    return NextResponse.json({ data, meta });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.4 SQL Seed/Resetポリシー（必須）

- 一貫手順（テンプレ）
  1) 対象テーブルのRLSをOFF
  2) 対象月/テナントを限定して完全クリア（原則 TRUNCATE CASCADE。不可ならDELETE）
  3) 冪等INSERT（主キー/ユニーク衝突に耐性）
  4) 事後検証（重複・件数・金額）。異常時は例外で失敗
  5) RLSをON

### 2.5 データ整合性の必須原則（新規追加）

**B. 絶対原則に追加**:

9) **データ整合性ファースト**: 
   - `users` テーブルの email は必ず一意（UNIQUE制約必須）
   - `auth.users` と `users` は必ず同期（片方だけの操作禁止）
   - 外部キー制約には `ON DELETE CASCADE` を明示
   - Seed/Reset は単一トランザクション内で完結

10) **テストデータ操作の標準化**:
   - 作成: `db/seed/FINAL_ALL_IN_ONE_setup.sql` のみ使用
   - 修正: `db/seed/CHECK_and_FIX_users.sql` のみ使用
   - 直接的な DELETE/INSERT は禁止（スクリプト経由必須）

```sql
-- 1) RLS OFF
ALTER TABLE invoice_headers DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_detail_items DISABLE ROW LEVEL SECURITY;

-- 2) 完全クリア（対象限定）
TRUNCATE TABLE invoice_headers CASCADE;  -- 子テーブルも同時にクリア

-- 3) 冪等INSERT（例）
INSERT INTO invoice_headers (
  id, tenant_id, billing_month, collector_company_id, generator_company_id,
  generator_site_id, invoice_number, total_transport_cost, total_disposal_cost,
  subtotal, tax_amount, total_amount, status, locked, created_at, updated_at
)
SELECT
  -- 合成IDは衝突しないキーで構成し、短縮（SUBSTRING等）を禁止
  'inv-header-test-' || billing_month || '-' || generator_site_id || '-' || collector_company_id,
  tenant_id, billing_month, collector_company_id, generator_company_id,
  generator_site_id, 'B' || LPAD(row_num::TEXT, 6, '0'),
  total_transport_cost, total_disposal_cost, total_subtotal, total_tax_amount,
  total_amount, 'PENDING', FALSE, NOW(), NOW()
FROM next_numbers;

-- 4) 事後検証（重複検知）
DO $$
DECLARE v_dup int;
BEGIN
  SELECT COUNT(*) INTO v_dup
  FROM (
    SELECT invoice_number FROM invoice_headers GROUP BY 1 HAVING COUNT(*) > 1
  ) d;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'invoice_number duplicated: %', v_dup;
  END IF;
END $$;

-- 5) RLS ON
ALTER TABLE invoice_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_detail_items ENABLE ROW LEVEL SECURITY;
```

- 規約
  - 物理主キーはUUID/ULID推奨。可読ID（B/CN番号）は別カラムで管理
  - 合成IDは「月 + 拠点 + 収集業者」等の衝突しない鍵で構成し、短縮しない
  - B/CN番号はSEQUENCE/関数で採番し、競合時は`pg_advisory_xact_lock`等で排他
  - シードは1トランザクションで実行し、`RAISE NOTICE`で段階ログを出力
  - リセットは「対象テナント/対象月」スコープの関数化を推奨

---

## 3. 外部API統合パターン（新規・必須）

### 3.1 JWNET統合（必須実装）

```typescript
// lib/clients/jwnet/client.ts
import { z } from 'zod';

// ✅ JWNET APIレスポンスのスキーマ
const JWNETRegisterResponseSchema = z.object({
  result: z.enum(['SUCCESS', 'ERROR']),
  manifest_number: z.string().length(11).optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional()
});

export class JWNETClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly subscriberNo: string;

  constructor() {
    // ✅ 環境変数から秘密情報を取得（サーバーサイドのみ）
    this.apiKey = process.env.JWNET_API_KEY!;
    this.baseUrl = process.env.JWNET_API_URL!;
    this.subscriberNo = process.env.JWNET_SUBSCRIBER_NO!;

    if (!this.apiKey || !this.baseUrl || !this.subscriberNo) {
      throw new Error('JWNET credentials not configured');
    }
  }

  /**
   * マニフェスト登録（1501）
   */
  async registerManifest(data: ManifestData): Promise<ManifestRegisterResult> {
    const payload = {
      function_code: '1501',
      subscriber_no: this.subscriberNo,
      ...this.transformToJWNETFormat(data)
    };

    // ✅ リトライロジック付き
    const response = await this.request('/manifest/register', payload, {
      retries: 3,
      backoff: 'exponential'
    });

    // ✅ レスポンスバリデーション
    return JWNETRegisterResponseSchema.parse(response);
  }

  /**
   * マニフェストステータス確認（2001）
   */
  async getManifestStatus(manifestNumber: string) {
    // 実装...
  }

  /**
   * JWNETフォーマットへの変換
   */
  private transformToJWNETFormat(data: ManifestData) {
    return {
      manifest_number: data.manifestNumber,
      waste_name: data.wasteName,
      waste_type: data.wasteType,
      quantity: data.quantity,
      unit: data.unit,
      // 備考1: 工事伝票番号
      remarks_1: data.constructionSlipNumber,
      // 連絡2: Hコード
      contact_2: data.hCode,
      // 連絡3: 固定値 'ED01'
      contact_3: 'ED01'
    };
  }

  /**
   * HTTP リクエスト（リトライ付き）
   */
  private async request(
    endpoint: string,
    payload: unknown,
    options: { retries: number; backoff: 'exponential' | 'linear' }
  ) {
    let lastError: Error | null = null;

    for (let i = 0; i < options.retries; i++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Subscriber-No': this.subscriberNo
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`JWNET API error: ${response.statusText}`);
        }

        return await response.json();

      } catch (error) {
        lastError = error as Error;
        
        // 最後の試行でなければ待機
        if (i < options.retries - 1) {
          const delay = options.backoff === 'exponential'
            ? Math.pow(2, i) * 1000
            : (i + 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`JWNET API failed after ${options.retries} retries: ${lastError?.message}`);
  }
}

// ✅ シングルトンインスタンス
export const jwnetClient = new JWNETClient();
```

### 3.2 JWNET統合API Routes

```typescript
// app/api/jwnet/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwnetClient } from '@/lib/clients/jwnet/client';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  request_id: z.string().uuid(),
  manifest_number: z.string().length(11),
  waste_items: z.array(z.object({
    waste_type: z.string(),
    quantity: z.number().positive(),
    unit: z.string()
  }))
});

export async function POST(request: NextRequest) {
  try {
    // ✅ 認証チェック
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'COLLECTOR') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // ✅ バリデーション
    const body = await request.json();
    const data = registerSchema.parse(body);

    // ✅ トランザクション処理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 依頼情報を取得
      const wasteRequest = await tx.waste_requests.findUnique({
        where: { id: data.request_id },
        include: {
          generator_company: true,
          generator_site: true,
          collector_company: true
        }
      });

      if (!wasteRequest) {
        throw new Error('Waste request not found');
      }

      // 2. JWNET登録キューに追加
      const outbox = await tx.jwnet_outbox.create({
        data: {
          payload: {
            function_code: '1501',
            manifest_number: data.manifest_number,
            waste_items: data.waste_items,
            subscriber_no: wasteRequest.collector_company.jwnet_subscriber_no,
            public_confirm_no: wasteRequest.collector_company.jwnet_public_confirm_no
          },
          status: 'QUEUED',
          created_at: new Date()
        }
      });

      // 3. JWNETへ送信
      try {
        const jwnetResult = await jwnetClient.registerManifest({
          manifestNumber: data.manifest_number,
          wasteName: data.waste_items[0].waste_type,
          wasteType: '0702',
          quantity: data.waste_items[0].quantity,
          unit: data.waste_items[0].unit,
          constructionSlipNumber: wasteRequest.contractor_info?.h_code || '',
          hCode: wasteRequest.contractor_info?.h_code || ''
        });

        if (jwnetResult.result === 'SUCCESS') {
          // 4. 成功: ステータス更新
          await tx.jwnet_outbox.update({
            where: { id: outbox.id },
            data: {
              status: 'SENT',
              sent_at: new Date(),
              response_body: JSON.stringify(jwnetResult)
            }
          });

          await tx.waste_requests.update({
            where: { id: data.request_id },
            data: {
              status: 'MANIFEST_REGISTERED',
              manifest_number: data.manifest_number,
              updated_at: new Date()
            }
          });

          return { success: true, manifest_number: data.manifest_number };

        } else {
          // 5. JWNET側エラー
          await tx.jwnet_outbox.update({
            where: { id: outbox.id },
            data: {
              status: 'FAILED',
              error_message: jwnetResult.error_message,
              response_body: JSON.stringify(jwnetResult)
            }
          });

          throw new Error(`JWNET registration failed: ${jwnetResult.error_message}`);
        }

      } catch (error) {
        // 6. 通信エラー: DLQへ
        await tx.jwnet_outbox.update({
          where: { id: outbox.id },
          data: {
            status: 'FAILED',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        throw error;
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('JWNET register error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to register manifest', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## 4. ビジネスロジック層（新規・必須）

### 4.1 請求計算サービス

```typescript
// services/billing/calculate.ts
import { prisma } from '@/lib/prisma';

export interface BillingCalculation {
  transport_cost: number;
  disposal_cost: number;
  subtotal: number;
  commission_amount: number;
  tax_amount: number;
  total_amount: number;
}

export class BillingCalculator {
  /**
   * 請求額を計算
   */
  async calculate(params: {
    tenant_id: string;
    collector_company_id: string;
    quantity: number;
    waste_type: string;
  }): Promise<BillingCalculation> {
    // ✅ 設定を取得
    const [collectorSettings, commissionSettings, wasteItem] = await Promise.all([
      prisma.companies.findUnique({
        where: { id: params.collector_company_id }
      }),
      prisma.commission_settings.findUnique({
        where: { tenant_id: params.tenant_id }
      }),
      prisma.waste_items.findFirst({
        where: {
          tenant_id: params.tenant_id,
          waste_type: params.waste_type
        }
      })
    ]);

    if (!commissionSettings) {
      throw new Error('Commission settings not found');
    }

    // ✅ 運搬費・処分費を計算
    const transport_cost = Math.round(params.quantity * 10000); // 仮の単価
    const disposal_cost = Math.round(params.quantity * (wasteItem?.disposal_cost_per_unit || 15000));
    const subtotal = transport_cost + disposal_cost;

    // ✅ 手数料を計算
    const commission_rate = commissionSettings.transport_commission_rate;
    const commission_amount = Math.max(
      Math.round(subtotal * commission_rate),
      commissionSettings.minimum_commission
    );

    // ✅ 消費税を計算
    const tax_amount = Math.round((subtotal + commission_amount) * 0.10);

    // ✅ 合計
    const total_amount = subtotal + commission_amount + tax_amount;

    return {
      transport_cost,
      disposal_cost,
      subtotal,
      commission_amount,
      tax_amount,
      total_amount
    };
  }

  /**
   * 請求をロック（締日処理）
   */
  async lockBillings(params: {
    tenant_id: string;
    billing_month: string;
    user_id: string;
  }): Promise<{ locked_count: number }> {
    const result = await prisma.$transaction(async (tx) => {
      // ✅ ロック対象の請求を取得
      const billings = await tx.billing_records.findMany({
        where: {
          tenant_id: params.tenant_id,
          billing_month: params.billing_month,
          locked: false,
          status: 'APPROVED'
        }
      });

      // ✅ 一括ロック
      const updated = await tx.billing_records.updateMany({
        where: {
          id: { in: billings.map(b => b.id) }
        },
        data: {
          locked: true,
          lock_reason: '締日を過ぎたため自動ロック',
          updated_at: new Date(),
          updated_by: params.user_id
        }
      });

      return { locked_count: updated.count };
    });

    return result;
  }
}

export const billingCalculator = new BillingCalculator();
```

### 4.2 請求計算API

```typescript
// app/api/billing/calculate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { billingCalculator } from '@/services/billing/calculate';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

const calculateSchema = z.object({
  collector_company_id: z.string().uuid(),
  quantity: z.number().positive(),
  waste_type: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const params = calculateSchema.parse(body);

    // ✅ ビジネスロジック層を呼び出し
    const result = await billingCalculator.calculate({
      tenant_id: user.tenant_id,
      ...params
    });

    return NextResponse.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Billing calculation error:', error);
    return NextResponse.json(
      { error: 'Calculation failed' },
      { status: 500 }
    );
  }
}
```

---

## 5. セキュリティ強化（V3.0必須）

### 5.1 環境変数管理

```bash
# .env.local（ローカル開発用）
# ⚠️ このファイルは .gitignore に追加必須

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tnbtnezxwnumgcbhswhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（公開可）
SUPABASE_SERVICE_ROLE_KEY=eyJ...（秘密）

# Database
DATABASE_URL=postgresql://postgres:password@db.tnbtnezxwnumgcbhswhn.supabase.co:5432/postgres?sslmode=require

# JWNET（絶対秘密）
JWNET_API_KEY=secret_key_here
JWNET_API_URL=https://api.jwnet.or.jp
JWNET_SUBSCRIBER_NO=1234567
JWNET_PUBLIC_CONFIRM_NO=123456

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 5.2 環境変数バリデーション（必須）

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public（フロントエンドでも使用可）
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Private（サーバーサイドのみ）
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  JWNET_API_KEY: z.string().min(1),
  JWNET_API_URL: z.string().url(),
  JWNET_SUBSCRIBER_NO: z.string().length(7),
  JWNET_PUBLIC_CONFIRM_NO: z.string().length(6),

  NODE_ENV: z.enum(['development', 'test', 'production'])
});

// ✅ 起動時にバリデーション
export const env = envSchema.parse(process.env);

// ✅ 型安全なアクセス
// env.JWNET_API_KEY は string 型として保証される
```

### 5.3 認証ミドルウェア

```typescript
// lib/auth.ts
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from './prisma';

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  company_id: string;
  role: string;
  permission_level: string | null;
  isAdmin: boolean;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    // ✅ Supabase Authでトークン検証
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value;
          }
        }
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // ✅ DBからユーザー情報を取得
    const dbUser = await prisma.users.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return null;
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      tenant_id: dbUser.tenant_id,
      company_id: dbUser.company_id,
      role: dbUser.role,
      permission_level: dbUser.permission_level,
      isAdmin: dbUser.role === 'ADMIN' && dbUser.admin_scope === 'ALL'
    };

  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * 認証必須ラッパー
 */
export function withAuth<T>(
  handler: (request: NextRequest, user: AuthUser) => Promise<T>
) {
  return async (request: NextRequest): Promise<T> => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    return handler(request, user);
  };
}
```

### 5.4 RLS対応DML規約（必須）

- 原則
  - 通常業務のDMLはBFF/Prisma経由でRLSを有効のまま実行する
  - シード・移行・一括修正など管理系ジョブのみ、必要最小限の時間でRLSを一時的にOFFにする
  - RLSのOFF/ON対象テーブルは明示列挙し、処理の前後で必ず元に戻す

- 実装指針
  - 管理SQLはサービスロール（サーバー側のみ）で実行し、クライアントキーでは実行不能にする
  - 必要に応じて SECURITY DEFINER のストアド関数で封じ込め、引数でスコープ（tenant_id, month 等）を必須化
  - クリア動作は原則 TRUNCATE CASCADE（テスト/初期データ用途）。本番データは月次・テナント限定のDELETEで安全に
  - RLS OFF 期間は短く、1トランザクション内に限定する

- テンプレ
```sql
-- OFF（対象を列挙）
ALTER TABLE invoice_headers DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_detail_items DISABLE ROW LEVEL SECURITY;

-- … DML / DDL …

-- ON（必ず元に戻す）
ALTER TABLE invoice_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_detail_items ENABLE ROW LEVEL SECURITY;
```

- 運用チェックリスト
  - RLSのOFF/ONログ（RAISE NOTICE 等）を必ず出力する
  - スコープがテナント/対象月に限定されていること
  - 事後検証（重複・件数・合計金額）で異常時は RAISE EXCEPTION で失敗させる
  - 実行手順はRunbookに従い、再実行しても冪等となることを確認

---

## 6. テスト戦略（V3.0強化）

### 6.1 テストピラミッド

```
           ╱╲
          ╱E2E╲         少数・重要フロー（Playwright）
         ╱──────╲
        ╱ 統合   ╲        中程度・API契約（Vitest）
       ╱──────────╲
      ╱  ユニット  ╲      多数・ロジック（Vitest）
     ╱──────────────╲
```

### 6.2 BFF層のテスト

```typescript
// tests/api/billing/calculate.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/billing/calculate/route';

describe('POST /api/billing/calculate', () => {
  beforeAll(async () => {
    // テストデータ作成
  });

  afterAll(async () => {
    // クリーンアップ
  });

  it('正常な請求計算', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        collector_company_id: 'company-collector-a',
        quantity: 3.5,
        waste_type: '廃プラスチック類'
      }
    });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      transport_cost: expect.any(Number),
      disposal_cost: expect.any(Number),
      commission_amount: expect.any(Number),
      tax_amount: expect.any(Number),
      total_amount: expect.any(Number)
    });

    // ✅ ビジネスルール検証
    expect(data.commission_amount).toBeGreaterThan(0);
    expect(data.total_amount).toBeGreaterThan(data.subtotal);
  });

  it('バリデーションエラー', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        quantity: -1 // ❌ 負の値
      }
    });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });
});
```

### 6.3 JWNET統合テスト（モック）

```typescript
// tests/integration/jwnet.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jwnetClient } from '@/lib/clients/jwnet/client';

// ✅ JWNETクライアントをモック
vi.mock('@/lib/clients/jwnet/client', () => ({
  jwnetClient: {
    registerManifest: vi.fn(),
    getManifestStatus: vi.fn()
  }
}));

describe('JWNET Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('マニフェスト登録成功', async () => {
    // ✅ モックレスポンス
    vi.mocked(jwnetClient.registerManifest).mockResolvedValue({
      result: 'SUCCESS',
      manifest_number: '24000000001'
    });

    const result = await jwnetClient.registerManifest({
      manifestNumber: '24000000001',
      wasteName: '廃プラスチック類',
      wasteType: '0702',
      quantity: 3.5,
      unit: 'm3',
      constructionSlipNumber: 'K-2024-001',
      hCode: 'H-1001'
    });

    expect(result.result).toBe('SUCCESS');
    expect(result.manifest_number).toBe('24000000001');
  });
});
```

---

## 7. CI/CDパイプライン（V3.0必須）

### 7.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate code
        run: pnpm codegen

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: OpenAPI validation
        run: pnpm openapi:validate

      - name: Unit tests
        run: pnpm test:unit

      - name: Integration tests
        run: pnpm test:integration

      - name: Build
        run: pnpm build

      - name: E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          JWNET_API_KEY: ${{ secrets.TEST_JWNET_API_KEY }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto

      - name: Dependency audit
        run: pnpm audit --audit-level=high
```

---

## 8. ドキュメント要件（V3.0必須）

### 8.1 API仕様書（自動生成）

```json
// package.json
{
  "scripts": {
    "docs:api": "redoc-cli build contracts/openapi.yaml -o docs/api/index.html",
    "docs:serve": "redoc-cli serve contracts/openapi.yaml"
  }
}
```

### 8.2 アーキテクチャ図（Mermaid）

```markdown
<!-- docs/architecture/bff-flow.md -->
# BFFデータフロー

\`\`\`mermaid
sequenceDiagram
    participant F as Frontend
    participant B as BFF (Next.js)
    participant P as Prisma
    participant DB as Supabase
    participant J as JWNET

    F->>B: POST /api/jwnet/register
    B->>B: 認証チェック
    B->>B: バリデーション
    B->>P: トランザクション開始
    P->>DB: waste_requests取得
    DB-->>P: データ返却
    P->>DB: jwnet_outbox作成
    B->>J: マニフェスト登録API
    J-->>B: 登録結果
    B->>P: ステータス更新
    P->>DB: COMMIT
    B-->>F: 成功レスポンス
\`\`\`
```

---

## 9. 運用・監視（V3.0必須）

### 9.1 ヘルスチェックエンドポイント

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // ✅ DB接続チェック
    await prisma.$queryRaw`SELECT 1`;

    // ✅ 外部API接続チェック（オプション）
    // const jwnetStatus = await jwnetClient.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        // jwnet: jwnetStatus ? 'ok' : 'degraded'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
```

### 9.2 エラートラッキング（Sentry）

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // ✅ 機密情報をフィルタリング
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['x-api-key'];
    }
    return event;
  }
});
```

---

## 9. コンソールエラー自動検知システム（Browser Automation）

### 9.1 概要

Playwrightを使用してブラウザのコンソールエラーを自動的に検知し、CI/CDパイプラインで早期発見を実現します。

### 9.2 システム構成

```
tests/
  ├── helpers/
  │   └── console-monitor.ts       # コンソール監視ヘルパー
  ├── e2e/
  │   └── console-errors.spec.ts   # E2Eテストスイート
  └── test-plan.md

scripts/
  ├── run-console-check.ps1        # Windows自動実行スクリプト
  └── run-console-check.sh         # Mac/Linux自動実行スクリプト

docs/
  └── automation/
      └── console-error-detection.md  # 詳細ドキュメント
```

### 9.3 ConsoleMonitorヘルパー

**実装: `tests/helpers/console-monitor.ts`**

```typescript
import { Page, ConsoleMessage } from '@playwright/test';

export interface ConsoleError {
  type: string;
  text: string;
  location: string;
  timestamp: string;
  args: string[];
}

export class ConsoleMonitor {
  private errors: ConsoleError[] = [];
  private warnings: ConsoleError[] = [];
  private page: Page;
  private testName: string;

  constructor(page: Page, testName: string = 'Unknown Test') {
    this.page = page;
    this.testName = testName;
    this.setupListeners();
  }

  private setupListeners() {
    // コンソールメッセージを監視
    this.page.on('console', (msg: ConsoleMessage) => {
      const error: ConsoleError = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location().url || 'unknown',
        timestamp: new Date().toISOString(),
        args: msg.args().map(arg => String(arg))
      };

      if (msg.type() === 'error') {
        this.errors.push(error);
        console.error(`❌ Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        this.warnings.push(error);
      }
    });

    // ページエラーを監視
    this.page.on('pageerror', (error: Error) => {
      const consoleError: ConsoleError = {
        type: 'pageerror',
        text: error.message,
        location: error.stack || 'unknown',
        timestamp: new Date().toISOString(),
        args: [error.stack || '']
      };
      this.errors.push(consoleError);
      console.error(`❌ Page Error: ${error.message}`);
    });
  }

  getErrorCount(): number { return this.errors.length; }
  getWarningCount(): number { return this.warnings.length; }
  clear() { this.errors = []; this.warnings = []; }
  
  // 既知の無害なエラーを除外
  ignorePattern(pattern: RegExp) {
    this.errors = this.errors.filter(err => !pattern.test(err.text));
    this.warnings = this.warnings.filter(warn => !pattern.test(warn.text));
  }

  // レポート生成・保存
  async saveReport(outputPath: string) {
    const report = await this.generateReport();
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  }

  printSummary() {
    console.log('\n📊 Console Monitor Summary');
    console.log(`Test: ${this.testName}`);
    console.log(`Errors: ${this.getErrorCount()}`);
    console.log(`Warnings: ${this.getWarningCount()}`);
  }
}

export function createConsoleMonitor(page: Page, testName: string = 'Unknown Test'): ConsoleMonitor {
  return new ConsoleMonitor(page, testName);
}
```

### 9.4 E2Eテストスイート

**実装: `tests/e2e/console-errors.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { createConsoleMonitor } from '../helpers/console-monitor';

test.describe('コンソールエラー検知', () => {
  test('ログイン画面でコンソールエラーがないこと', async ({ page }) => {
    const monitor = createConsoleMonitor(page, 'Login Page');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    monitor.ignorePattern(/React Router Future Flag Warning/);
    const errorCount = monitor.getErrorCount();
    monitor.printSummary();

    expect(errorCount, `コンソールエラーが ${errorCount} 件検出されました`).toBe(0);
  });

  test('ダッシュボードでコンソールエラーがないこと', async ({ page }) => {
    const monitor = createConsoleMonitor(page, 'Dashboard');

    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.waitForLoadState('networkidle');

    monitor.ignorePattern(/React Router Future Flag Warning/);
    const errorCount = monitor.getErrorCount();
    monitor.printSummary();

    expect(errorCount).toBe(0);
  });

  test('テストデータ読み込み時にコンソールエラーがないこと', async ({ page }) => {
    const monitor = createConsoleMonitor(page, 'Test Data Load');

    // ログイン後、テストデータ読み込み
    await page.goto('/login');
    // ... ログイン処理 ...
    
    monitor.clear(); // ページロードまでのエラーは除外
    
    const testDataButton = page.locator('button:has-text("テストデータ読込")');
    if (await testDataButton.isVisible()) {
      await testDataButton.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
    }

    monitor.ignorePattern(/React Router Future Flag Warning/);
    const errorCount = monitor.getErrorCount();
    monitor.printSummary();
    await monitor.saveReport('./test-results/console-errors-test-data-load.json');

    expect(errorCount).toBe(0);
  });
});
```

### 9.5 npmスクリプト設定

**`package.json`に追加:**

```json
{
  "scripts": {
    "test:console": "playwright test tests/e2e/console-errors.spec.ts",
    "test:console:ui": "playwright test tests/e2e/console-errors.spec.ts --ui",
    "check:console": "node -e \"require('child_process').execSync('powershell -ExecutionPolicy Bypass -File ./scripts/run-console-check.ps1', {stdio: 'inherit'})\""
  }
}
```

### 9.6 使用方法

```bash
# コンソールエラー検知テストを実行
npm run test:console

# UIモードで実行（デバッグに便利）
npm run test:console:ui

# 自動チェック（サーバー自動起動付き）
npm run check:console

# PowerShellスクリプト直接実行
.\scripts\run-console-check.ps1
.\scripts\run-console-check.ps1 --open  # HTMLレポートを自動で開く
```

### 9.7 CI/CD統合

**GitHub Actions例:**

```yaml
name: Console Error Check

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  console-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      
      - name: Run Console Error Check
        run: npm run test:console
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: console-error-report
          path: |
            playwright-report/
            test-results/
```

### 9.8 レポート形式

**JSON出力例:**

```json
{
  "url": "http://localhost:5173/collections",
  "testName": "Test Data Load",
  "errors": [
    {
      "type": "error",
      "text": "useAuth must be used within an AuthProvider",
      "location": "http://localhost:5173/src/contexts/AuthContext.tsx",
      "timestamp": "2025-10-05T00:13:46.000Z",
      "args": ["..."]
    }
  ],
  "warnings": [],
  "pageTitle": "回収情報登録",
  "timestamp": "2025-10-05T00:13:46.000Z"
}
```

### 9.9 検知対象

- **Console Error**: `console.error()`
- **Console Warning**: `console.warn()` (オプション)
- **Page Error**: 未処理のJavaScriptエラー
- **Request Failed**: ネットワークリクエストの失敗

### 9.10 カスタマイズ

**除外パターンの追加:**

```typescript
// 既知の無害なエラーを除外
monitor.ignorePattern(/React Router Future Flag Warning/);
monitor.ignorePattern(/Dexie/);
monitor.ignorePattern(/your-pattern-here/);
```

**新しいテストケースの追加:**

```typescript
test('カスタム画面でコンソールエラーがないこと', async ({ page }) => {
  const monitor = createConsoleMonitor(page, 'Custom Page');
  
  // カスタム画面に移動
  await page.goto('/custom-page');
  await page.waitForLoadState('networkidle');
  
  monitor.ignorePattern(/React Router Future Flag Warning/);
  expect(monitor.getErrorCount()).toBe(0);
});
```

### 9.11 ベストプラクティス

1. **定期的な実行**: CI/CDパイプラインで毎プルリクエスト時に実行
2. **既知の警告を除外**: React Router等のフレームワーク警告は除外
3. **レポート保存**: エラー発生時はJSONレポートを保存し、履歴管理
4. **段階的な導入**: まず主要画面から始め、徐々に拡大
5. **監視対象の拡大**: ユーザーフローに沿った画面遷移を全てカバー

### 9.12 トラブルシューティング

**Q: テストが失敗する**
- Viteサーバーが起動しているか確認: `npm run dev:vite`
- Playwrightブラウザがインストールされているか確認: `npx playwright install`

**Q: エラーが多すぎる**
- 既知のエラーを`ignorePattern()`で除外

**Q: レポートが生成されない**
- `test-results`ディレクトリの書き込み権限を確認

---

## 10. マイグレーション計画

### 10.1 段階的移行ステップ

```
Phase 1: BFF基盤構築（Week 1-2）
  ✅ Next.js App Routerセットアップ
  ✅ Prisma統合
  ✅ 認証ミドルウェア
  ✅ 基本的なAPI Routes

Phase 2: JWNET統合（Week 3-4）
  ✅ JWNETクライアント実装
  ✅ マニフェスト登録API
  ✅ エラーハンドリング・リトライ
  ✅ テスト

Phase 3: ビジネスロジック移行（Week 5-6）
  ✅ 請求計算ロジック
  ✅ 手数料計算ロジック
  ✅ ロック処理

Phase 4: フロントエンド更新（Week 7-8）
  ✅ BFF APIに切り替え
  ✅ Direct Supabase呼び出しを削除
  ✅ E2Eテスト

Phase 5: 本番展開（Week 9-10）
  ✅ パフォーマンステスト
  ✅ セキュリティ監査
  ✅ 段階的ロールアウト
```

---

## ✅ V3.0チェックリスト

### 必須項目
- [ ] Next.js App Routerでプロジェクト構築
- [ ] すべてのDB操作をPrisma経由に移行
- [ ] OpenAPI Specを作成し型自動生成
- [ ] JWNET統合をBFF層で実装
- [ ] 環境変数バリデーション実装
- [ ] 認証ミドルウェア実装
- [ ] ユニットテスト・統合テストカバレッジ80%以上
- [ ] API仕様書自動生成
- [ ] CI/CDパイプライン構築
- [ ] ヘルスチェックエンドポイント実装
- [ ] コンソールエラー自動検知システム実装（Playwright）

### 推奨項目
- [ ] エラートラッキング（Sentry）導入
- [ ] OpenTelemetry統合
- [ ] API Rate Limiting実装
- [ ] キャッシュ戦略実装
- [ ] パフォーマンス監視ダッシュボード
- [ ] コンソールエラー自動検知のCI/CD統合

---

**次のステップ**: BFF実装の具体的なコード作成に進みます。


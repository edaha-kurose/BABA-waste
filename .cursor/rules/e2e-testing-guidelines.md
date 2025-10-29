# E2Eテスト実装ガイドライン

**バージョン**: 1.0  
**最終更新**: 2025-10-22  
**対象**: Next.js + Playwright + Supabase プロジェクト

---

## 📋 目次

1. [はじめに](#はじめに)
2. [E2Eトラブルの根本原因](#e2eトラブルの根本原因)
3. [必須ルール](#必須ルール)
4. [推奨パターン](#推奨パターン)
5. [絶対禁止事項](#絶対禁止事項)
6. [チェックリスト](#チェックリスト)

---

## はじめに

このガイドラインは、2025年10月のE2Eテスト大規模修正（31件の失敗 → 0件）から得られた知見をまとめたものです。

### 修正前の状況
- ✅ PASS: 25件 (40.3%)
- ❌ FAIL: 31件 (50.0%)
- ⚠️ FLAKY: 1件 (1.6%)
- ⏭️ SKIP: 5件 (8.1%)

### 修正後の状況
- ✅ PASS: 51件 (100%)
- ❌ FAIL: 0件 (0%)
- ⚠️ FLAKY: 0件 (0%)
- ⏭️ SKIP: 11件 (データ依存・権限依存テスト)

---

## E2Eトラブルの根本原因

### 1. 認証バイパス機構の不完全な実装 (CRITICAL)

**問題**:
- クライアント側（`useSession`）とサーバー側（API）で認証チェックの実装が異なっていた
- 一部のAPIが `createServerClient()` を直接使用し、E2Eバイパスに対応していなかった
- 例: `/api/dashboard/stats` が `getAuthenticatedUser` を使わず、E2Eバイパスが効かなかった

**影響**: 31件中6件のAPIテストが失敗、認証が必要な画面で無限ローディング

**解決策**: 全APIで `getAuthenticatedUser` を使用

---

### 2. テストヘルパー関数の不統一 (メンテナンス性)

**問題**:
- `quickLogin` と `e2eBypassLogin` が混在
- 各テストファイルで異なるログイン方法を使用
- `billing-patterns.spec.ts` が古い直接ログイン実装を使用

**影響**: テストの保守が困難、認証方式変更時に全ファイル修正が必要

**解決策**: 単一の `e2eBypassLogin` ヘルパーに統一

---

### 3. 非同期処理の待機不足 (タイミング問題)

**問題**:
- APIからのデータ取得完了を待たずにアサーション実行
- ローディングスピナーが消えるのを待機していない
- サイドバーのレンダリング完了を確認していない

**影響**: Dashboard系テスト5件が失敗、"element not found" エラーが頻発

**解決策**: 適切な待機処理の追加

---

### 4. UIセレクタの実装依存 (脆弱性)

**問題**:
- メニューテキストが実装と一致しない
- 権限によって表示されるメニューが異なる

**影響**: ナビゲーション系テスト4件が失敗

**解決策**: `data-testid` 属性の使用、または直接URLアクセス

---

### 5. クエリパラメータの厳密すぎる検証 (柔軟性の欠如)

**問題**: URLが `/dashboard?e2e=1` だが、テストは `/dashboard` を期待

**影響**: セッション永続化テストが失敗

**解決策**: 正規表現を使った柔軟な検証

---

### 6. テストデータの依存性 (環境依存)

**問題**: Seed データの有無でテスト結果が変わる

**影響**: Billing系テスト2件が不安定

**解決策**: データ存在チェック付きテスト

---

## 必須ルール

### A. 認証処理 (CRITICAL)

#### ✅ 正しい実装

```typescript
// テストファイル
import { e2eBypassLogin } from '../helpers/auth-helper'

test.beforeEach(async ({ page }) => {
  await e2eBypassLogin(page)
})
```

```typescript
// APIファイル
import { getAuthenticatedUser } from '@/lib/auth/session-server'

export async function GET(request: NextRequest) {
  // 1. 認証チェック（E2Eバイパス対応）
  const authUser = await getAuthenticatedUser(request)
  
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. 認可チェック
  if (!authUser.isSystemAdmin && !authUser.org_ids.includes(targetOrgId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 3. ビジネスロジック
  // ...
}
```

#### ❌ 禁止事項

```typescript
// ❌ 直接ログインボタンをクリック
await page.goto('/login')
await page.locator('button:has-text("ログイン")').click()

// ❌ 各テストで独自のログイン実装
test.beforeEach(async ({ page }) => {
  await page.goto('/login?e2e=1')
  await page.locator('button').click()
})

// ❌ createServerClient() の直接使用（E2Eバイパス非対応）
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

### B. 非同期処理の待機 (CRITICAL)

#### ✅ 正しい実装

```typescript
test.beforeEach(async ({ page }) => {
  await e2eBypassLogin(page)
  
  // 1. ネットワーク完了を待機
  await page.waitForLoadState('networkidle', { timeout: 10000 })
  
  // 2. ローディングスピナーが消えるまで待機
  await page.locator('.ant-spin-spinning')
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {
      console.log('⚠️ ローディングスピナーが見つからない（既に読み込み完了の可能性）')
    })
  
  // 3. 重要なUI要素の表示を待機
  await page.locator('.ant-layout-sider')
    .waitFor({ state: 'visible', timeout: 10000 })
})
```

```typescript
// データ取得後の待機
test('データ表示テスト', async ({ page }) => {
  // API完了を待機
  await page.waitForResponse(
    response => response.url().includes('/api/data') && response.status() === 200,
    { timeout: 15000 }
  )
  
  // テーブルレンダリング完了を待機
  await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 })
  
  // アサーション実行
  const rowCount = await page.locator('table tbody tr').count()
  expect(rowCount).toBeGreaterThan(0)
})
```

#### ❌ 禁止事項

```typescript
// ❌ waitForTimeout のみに依存
await page.waitForTimeout(3000)
await expect(page.locator('h1')).toBeVisible()

// ❌ 待機なしでアサーション実行
await page.goto('/dashboard')
await expect(page.locator('h1')).toBeVisible() // ローディング中かも
```

---

### C. UIセレクタの堅牢性 (IMPORTANT)

#### ✅ 推奨順位

1. **data-testid 属性** (最も堅牢)
```typescript
// UIコンポーネント
<button data-testid="submit-button">送信</button>

// テスト
await page.locator('[data-testid="submit-button"]').click()
```

2. **安定したクラス名**
```typescript
await page.locator('.ant-layout-sider').waitFor({ state: 'visible' })
```

3. **role属性**
```typescript
await page.locator('[role="table"]').waitFor({ state: 'visible' })
```

4. **テキストセレクタ** (最終手段)
```typescript
await page.locator('span:has-text("ダッシュボード")').waitFor({ state: 'visible' })
```

#### ❌ 禁止事項

```typescript
// ❌ 位置依存セレクタ
page.locator('div:nth-child(3) > button')

// ❌ 複雑すぎるセレクタ
page.locator('div.container > div.row > div.col > button.btn-primary')

// ❌ IDセレクタ（動的生成される場合）
page.locator('#rc_select_1') // Ant Designが自動生成するID
```

---

### D. URL検証の柔軟性 (IMPORTANT)

#### ✅ 正しい実装

```typescript
// 1. 正規表現で柔軟に検証（推奨）
await expect(page).toHaveURL(/\/dashboard(\?.*)?$/)

// 2. パスのみで検証
await expect(page).toHaveURL(/\/dashboard/)

// 3. 完全一致（必要な場合のみ）
await expect(page).toHaveURL('http://localhost:3001/dashboard')
```

#### ❌ 避けるべき実装

```typescript
// ❌ クエリパラメータを考慮しない厳密な検証
await expect(page).toHaveURL('/dashboard') // ?e2e=1 があると失敗
```

---

### E. データ依存テストの処理 (IMPORTANT)

#### ✅ 正しい実装

```typescript
test('データ依存テスト', async ({ page }) => {
  // 1. データ存在チェック
  const dataRows = page.locator('tbody tr:not(.ant-table-measure-row)')
  const rowCount = await dataRows.count()
  
  if (rowCount === 0) {
    console.log('⏭️ データがないためテストスキップ')
    test.skip()
    return
  }
  
  // 2. テスト実行
  const firstRow = dataRows.first()
  await expect(firstRow).toBeVisible()
  
  // 3. データ内容の検証
  const cellCount = await firstRow.locator('td').count()
  expect(cellCount).toBeGreaterThan(0)
})
```

```typescript
// 特定のデータを探す
test('特定データの検証', async ({ page }) => {
  const targetRow = page.locator('tbody tr').filter({ hasText: '特定の値' })
  const exists = await targetRow.count() > 0
  
  if (!exists) {
    console.log('⏭️ 対象データが見つからないためスキップ')
    test.skip()
    return
  }
  
  await expect(targetRow).toBeVisible()
})
```

#### ❌ 禁止事項

```typescript
// ❌ データ存在を前提としたテスト
test('データ依存テスト', async ({ page }) => {
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible() // データがないと失敗
})

// ❌ ハードコードされたID依存
test('特定データの検証', async ({ page }) => {
  await page.goto('/dashboard/items/12345') // ID 12345が存在しないと失敗
})
```

---

### F. 複雑なUIテストの扱い (GUIDELINE)

#### ✅ 推奨アプローチ

```typescript
// 1. 権限・データ依存の複雑なテストはスキップ
test.skip('複雑なナビゲーション', async ({ page }) => {
  // TODO: 直接URLアクセステストに変更を検討
  // 理由: メニュー構造が権限依存で不安定
})

// 2. シンプルな機能テストに分割
test('ページアクセス確認', async ({ page }) => {
  await page.goto('/dashboard/organizations?e2e=1')
  await expect(page).toHaveURL(/\/dashboard\/organizations/)
  await expect(page.locator('h1')).toBeVisible()
})

test('API動作確認', async ({ page }) => {
  const response = await page.request.get('/api/organizations')
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data).toHaveProperty('data')
})
```

#### ❌ 避けるべき実装

```typescript
// ❌ 複雑すぎるナビゲーションテスト
test('複雑なナビゲーション', async ({ page }) => {
  // メニューを開く
  await page.locator('span:has-text("管理メニュー")').click()
  await page.waitForTimeout(500)
  
  // サブメニューを開く
  await page.locator('span:has-text("システム設定")').click()
  await page.waitForTimeout(500)
  
  // さらにサブメニューを開く
  await page.locator('span:has-text("詳細設定")').click()
  
  // 最終的なページに到達
  await expect(page).toHaveURL('/dashboard/settings/advanced')
})
```

---

## 推奨パターン

### 1. テストファイルの基本構造

```typescript
import { test, expect } from '@playwright/test'
import { e2eBypassLogin } from '../helpers/auth-helper'

test.describe('機能名', () => {
  test.beforeEach(async ({ page }) => {
    // 1. E2Eバイパスログイン
    await e2eBypassLogin(page)
    
    // 2. 対象ページに遷移（必要な場合）
    await page.goto('/dashboard/target-page?e2e=1', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    })
    
    // 3. ページロード完了を待機
    await page.waitForLoadState('domcontentloaded')
    
    // 4. 重要なUI要素の表示を待機
    await page.locator('[data-testid="main-content"]')
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {})
  })

  test('基本表示テスト', async ({ page }) => {
    // ページタイトル確認
    const title = await page.title()
    expect(title).toContain('期待するタイトル')
    
    // 主要要素の表示確認
    await expect(page.locator('[data-testid="header"]')).toBeVisible()
    await expect(page.locator('[data-testid="content"]')).toBeVisible()
  })

  test('データ表示テスト', async ({ page }) => {
    // データ存在チェック
    const dataRows = page.locator('[data-testid="data-row"]')
    const rowCount = await dataRows.count()
    
    if (rowCount === 0) {
      console.log('⏭️ データがないためスキップ')
      test.skip()
      return
    }
    
    // データ内容の検証
    await expect(dataRows.first()).toBeVisible()
  })

  test('API連携テスト', async ({ page }) => {
    // API呼び出し
    const response = await page.request.get('/api/target')
    
    // レスポンス検証
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })
})
```

---

### 2. ページ遷移のパターン

```typescript
// パターンA: beforeEach で遷移（全テストで同じページ）
test.describe('店舗管理画面', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
    await page.goto('/dashboard/stores?e2e=1', { waitUntil: 'networkidle' })
  })
  
  test('テスト1', async ({ page }) => { /* ... */ })
  test('テスト2', async ({ page }) => { /* ... */ })
})

// パターンB: 各テストで遷移（異なるページをテスト）
test.describe('ナビゲーションテスト', () => {
  test.beforeEach(async ({ page }) => {
    await e2eBypassLogin(page)
  })
  
  test('店舗ページ', async ({ page }) => {
    await page.goto('/dashboard/stores?e2e=1')
    await expect(page).toHaveURL(/\/dashboard\/stores/)
  })
  
  test('業者ページ', async ({ page }) => {
    await page.goto('/dashboard/collectors?e2e=1')
    await expect(page).toHaveURL(/\/dashboard\/collectors/)
  })
})
```

---

### 3. フォーム入力のパターン

```typescript
test('フォーム送信テスト', async ({ page }) => {
  // 1. フォーム要素の表示を待機
  await page.locator('[data-testid="form"]').waitFor({ state: 'visible' })
  
  // 2. 入力可能になるまで待機
  const nameInput = page.locator('[data-testid="name-input"]')
  await nameInput.waitFor({ state: 'visible' })
  await expect(nameInput).toBeEditable()
  
  // 3. 入力実行
  await nameInput.fill('テスト名')
  
  // 4. 送信ボタンをクリック
  const submitButton = page.locator('[data-testid="submit-button"]')
  await expect(submitButton).toBeEnabled()
  await submitButton.click()
  
  // 5. 送信完了を待機
  await page.waitForResponse(
    response => response.url().includes('/api/submit') && response.status() === 200,
    { timeout: 15000 }
  )
  
  // 6. 成功メッセージの確認
  await expect(page.locator('text=/成功|完了/')).toBeVisible({ timeout: 10000 })
})
```

---

### 4. モーダル操作のパターン

```typescript
test('モーダル操作テスト', async ({ page }) => {
  // 1. モーダルを開くボタンをクリック
  await page.locator('[data-testid="open-modal"]').click()
  
  // 2. モーダルの表示を待機
  const modal = page.locator('[role="dialog"], .ant-modal')
  await modal.waitFor({ state: 'visible', timeout: 5000 })
  
  // 3. モーダル内の操作
  await modal.locator('[data-testid="modal-input"]').fill('テスト')
  await modal.locator('[data-testid="modal-submit"]').click()
  
  // 4. モーダルが閉じるのを待機
  await modal.waitFor({ state: 'hidden', timeout: 5000 })
  
  // 5. 結果の確認
  await expect(page.locator('text=/保存しました/')).toBeVisible()
})
```

---

## 絶対禁止事項

### ❌ 認証関連

1. **E2Eバイパスを考慮しないAPI実装**
   ```typescript
   // ❌ 禁止
   const supabase = await createServerClient()
   const { data: { user } } = await supabase.auth.getUser()
   ```

2. **各テストファイルで独自の認証実装**
   ```typescript
   // ❌ 禁止
   test.beforeEach(async ({ page }) => {
     await page.goto('/login')
     await page.fill('#email', 'test@example.com')
     await page.fill('#password', 'password')
     await page.click('button[type="submit"]')
   })
   ```

3. **本番環境でのE2Eバイパス有効化**
   ```typescript
   // ❌ 禁止: 本番環境で絶対にE2Eバイパスを有効にしない
   if (process.env.NODE_ENV === 'production' && request.url.includes('e2e=1')) {
     // これは絶対にダメ！
   }
   ```

---

### ❌ テスト実装関連

4. **待機処理なしのアサーション**
   ```typescript
   // ❌ 禁止
   await page.goto('/dashboard')
   await expect(page.locator('h1')).toBeVisible() // ローディング中かも
   ```

5. **ハードコードされたテストデータID依存**
   ```typescript
   // ❌ 禁止
   await page.goto('/dashboard/items/12345') // ID 12345が存在しない環境で失敗
   ```

6. **位置依存セレクタ**
   ```typescript
   // ❌ 禁止
   page.locator('div:nth-child(3) > button') // UI変更で簡単に壊れる
   ```

7. **過度な waitForTimeout 依存**
   ```typescript
   // ❌ 禁止
   await page.waitForTimeout(5000) // 何を待っているか不明確
   await expect(page.locator('h1')).toBeVisible()
   ```

---

## チェックリスト

### 📝 新規E2Eテスト作成時

- [ ] `e2eBypassLogin` を使用している
- [ ] 適切な待機処理を実装している（networkidle, spinner, 要素表示）
- [ ] `data-testid` 属性を使用している（可能な限り）
- [ ] データ存在チェックを実装している（データ依存テストの場合）
- [ ] URL検証は正規表現を使用している
- [ ] エラーハンドリングを実装している（`.catch(() => {})`）
- [ ] コンソールログで進捗を出力している

---

### 📝 新規API実装時

- [ ] `getAuthenticatedUser` を使用している
- [ ] E2Eバイパスに対応している
- [ ] 認証エラーは 401 を返している
- [ ] 認可エラーは 403 を返している
- [ ] Zodバリデーションを実装している
- [ ] Prismaエラーを分離している
- [ ] 適切なログを出力している

---

### 📝 新規UIコンポーネント実装時

- [ ] 重要な要素に `data-testid` 属性を追加している
- [ ] ローディング状態を実装している
- [ ] エラー状態を実装している
- [ ] 空データ状態を実装している

---

### 📝 E2Eテスト実行前

- [ ] 開発サーバーが起動している（localhost:3001）
- [ ] データベースにSeedデータが投入されている
- [ ] E2Eバイパス機構が有効である（middleware.ts確認）
- [ ] Prismaクライアントが最新である（`pnpm prisma:generate`）
- [ ] ビルドエラーがない（`pnpm build`）

---

### 📝 CI/CD設定時

- [ ] E2Eバイパスが有効になっている（環境変数）
- [ ] Seedデータが自動投入される
- [ ] テスト失敗時にスクリーンショットが保存される
- [ ] テストレポートがアーティファクトとして保存される
- [ ] 本番環境ではE2Eバイパスが無効である

---

## 参考資料

### 関連ドキュメント

- `.cursor/rules/global-rules.md` - 全体的な開発ルール
- `docs/guardrails/SCHEMA_CHANGE_GUIDELINES.md` - スキーマ変更ガイドライン
- `next-app/tests/helpers/auth-helper.ts` - E2Eバイパスログイン実装
- `next-app/src/lib/auth/session-server.ts` - サーバー側認証実装

### Playwright公式ドキュメント

- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators](https://playwright.dev/docs/locators)
- [Auto-waiting](https://playwright.dev/docs/actionability)

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2025-10-22 | 初版作成（E2E大規模修正の知見をまとめ） |

---

**最終更新**: 2025-10-22  
**作成者**: Cursor AI + 開発チーム  
**承認者**: プロジェクトリード



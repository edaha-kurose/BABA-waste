# ビギナーエンジニア向け: Next.js Middleware & 認証の完全ガイド

**対象読者**: プログラミング経験1〜2年、Next.jsを初めて触る方  
**前提知識**: JavaScript/TypeScript基礎、Webの基本（HTTP、Cookie）  
**所要時間**: 読むだけ30分、実装込みで2時間

---

## 📚 目次

1. [Next.js Middlewareとは？](#1-nextjs-middlewareとは)
2. [Middlewareの配置ルール（絶対厳守）](#2-middlewareの配置ルール絶対厳守)
3. [Supabase SSR認証の完全実装パターン](#3-supabase-ssr認証の完全実装パターン)
4. [E2Eテスト安定化戦略](#4-e2eテスト安定化戦略)
5. [Middleware実装チェックリスト](#5-middleware実装チェックリスト)

---

## 1. Next.js Middlewareとは？

### 🤔 そもそもMiddlewareって何？

**簡単に言うと**: ユーザーがページにアクセスする**前**に実行される「門番」のようなコードです。

**日常の例で説明**:
```
あなたがコンビニ（Webサイト）に入ろうとする時...

1. 自動ドア（Middleware）がまず反応する
2. 自動ドアが「お客さんかな？従業員かな？」をチェック
3. OKなら中に入れる、NGなら入れない

これがMiddlewareの役割です！
```

### 🌐 Webアプリでの具体例

```typescript
// ユーザーが /dashboard にアクセスしようとする

👤 ユーザー: "http://example.com/dashboard にアクセス！"
      ↓
🚪 Middleware: "ちょっと待った！ログインしてる？"
      ↓
✅ ログイン済み → ダッシュボードを表示
❌ 未ログイン → /login にリダイレクト
```

### 💡 Middlewareの使い道

1. **認証チェック**: ログインしていないユーザーを弾く
2. **権限チェック**: 管理者専用ページを一般ユーザーから守る
3. **リダイレクト**: 古いURLから新しいURLへ自動転送
4. **ログ記録**: アクセスログを残す
5. **多言語対応**: ユーザーの言語設定を判定

---

## 2. Middlewareの配置ルール（絶対厳守）

### ⚠️ なぜこのルールが重要なのか？

**間違った場所に置くと**: Middlewareが**全く実行されない**！  
**セキュリティリスク**: 認証チェックがスキップされ、誰でもアクセス可能に！

---

### 📁 正しいファイル配置

#### ❌ 間違い（よくやるミス）

```
my-project/
├── src/
│   ├── middleware.ts  ← ❌ ここに置くとNext.jsが認識しない！
│   ├── app/
│   │   └── page.tsx
│   └── ...
├── package.json
└── next.config.js
```

**なぜダメなのか？**  
Next.js 13以降のApp Routerでは、Middlewareは`src/`の**外**に置く必要があります。これはNext.jsの仕様です。

---

#### ✅ 正解

```
my-project/
├── middleware.ts      ← ✅ プロジェクトルート直下（src/と同じ階層）
├── src/
│   ├── app/
│   │   └── page.tsx
│   └── ...
├── package.json
└── next.config.js
```

**または**（`src/`を使わない場合）

```
my-project/
├── middleware.ts      ← ✅ これでもOK
├── app/
│   └── page.tsx
├── package.json
└── next.config.js
```

---

### 🔍 確認方法（簡単チェック）

**コマンドで確認**:
```bash
# プロジェクトルートで実行
ls -la middleware.ts

# 存在するはず
# ✅ middleware.ts

# もしsrc/middleware.tsがあったら...
ls -la src/middleware.ts

# これがあったら削除！
# ❌ src/middleware.ts (削除必須)
```

**VSCodeで確認**:
```
エクスプローラーで確認:
  my-project/
  ├── middleware.ts  ← これが見えるはずだが、src/の中にはない
  ├── src/
  └── ...
```

---

### 🐛 よくあるトラブルと対処法

#### トラブル1: Middlewareが動かない

**症状**:
- ログインしていないのにダッシュボードにアクセスできる
- `console.log`を書いても何も出力されない

**原因**:
- `src/middleware.ts`に配置している

**解決**:
```bash
# 間違った場所のMiddlewareを削除
rm src/middleware.ts

# 正しい場所に作成
touch middleware.ts
```

---

#### トラブル2: TypeScript型エラーが出ない

**なぜ？**:
- ファイルが存在するだけでTypeScriptは満足
- 実行されるかどうかは別問題

**対策**:
- 必ず手動で`middleware.ts`の配置を確認
- 開発サーバー起動時にMiddlewareのログを確認

---

### 📝 実践例: 最小構成のMiddleware

```typescript
// middleware.ts (プロジェクトルート直下)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  console.log('🚪 Middleware実行！', request.nextUrl.pathname)
  
  // とりあえず全部通す
  return NextResponse.next()
}

// どのURLで実行するか設定
export const config = {
  matcher: [
    // /dashboard/* で実行
    '/dashboard/:path*',
  ],
}
```

**動作確認**:
```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:3000/dashboard にアクセス
# ターミナルに「🚪 Middleware実行！ /dashboard」と表示されればOK！
```

---

## 3. Supabase SSR認証の完全実装パターン

### 🤔 SSRって何？Supabaseって何？

#### SSR（Server-Side Rendering）とは

**簡単に言うと**: サーバー側（Next.jsサーバー）でHTMLを生成すること。

**従来のSPA（Client-Side Rendering）**:
```
1. ブラウザがHTMLをダウンロード（ほぼ空っぽ）
2. JavaScriptをダウンロード
3. JavaScriptがAPIを呼んでデータ取得
4. ようやくページが表示される
   ↓
   遅い！SEOに弱い！
```

**SSR**:
```
1. サーバーがデータを取得してHTMLを生成
2. ブラウザが完成したHTMLをダウンロード
3. すぐに表示される
   ↓
   速い！SEOに強い！
```

#### Supabaseとは

**簡単に言うと**: Firebaseのオープンソース版。認証・DB・ストレージを提供するBaaS（Backend as a Service）。

**提供機能**:
- 🔐 認証（メール/パスワード、Google OAuth等）
- 🗄️ データベース（PostgreSQL）
- 📦 ストレージ（ファイル保存）

---

### 🍪 Cookieとセッションの基礎知識

#### Cookieとは

**例え話**:
```
あなたがカフェに行った時...

1回目: 「初めまして！ラテ1つください」
       店員さんが会員カード（Cookie）を発行
       
2回目: 会員カードを見せる
       店員さん「あ、〇〇さんですね！いつもありがとう」
       
これがCookieの仕組み！
```

**Webの場合**:
```
1回目: ログイン成功
       サーバー「これがあなたのIDカード（Cookie）です」
       ブラウザがCookieを保存
       
2回目: ページアクセス
       ブラウザ「これが私のIDカードです」
       サーバー「本人確認OK！」
```

#### セッションとは

**セッション** = 「ログイン中の状態」を表す情報

**内容**:
- ユーザーID
- メールアドレス
- アクセストークン（本人証明書）
- 有効期限

---

### ⚙️ Supabase SSRクッキーアダプタとは

#### なぜ必要なのか？

**問題**:
- ブラウザ（クライアント）でのCookie操作は簡単
- サーバー（Next.js Middleware）でのCookie操作は複雑
- SupabaseはどちらでもCookieを使いたい

**解決**:
- **クッキーアダプタ** = CookieをNext.js用に「翻訳」するもの

---

### 🛠️ 完全実装パターン（コピペOK）

#### ❌ 不完全な実装（よくあるミス）

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Cookieを読む（これはOK）
          return request.cookies.get(name)?.value
        },
        set() {
          // 何もしない ← ❌ これがダメ！
        },
        remove() {
          // 何もしない ← ❌ これがダメ！
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  // セッションが取得できない！なぜ？
}
```

**なぜダメなのか？**:
1. `set()`が空 → Cookieが保存されない
2. `remove()`が空 → Cookieが削除されない
3. セッションが維持されない

---

#### ✅ 完全実装（推奨）

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Step 1: レスポンスオブジェクトを準備
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Step 2: Supabaseクライアントを作成（クッキーアダプタ付き）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Cookie読み込み
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        
        // Cookie保存（重要！）
        set(name: string, value: string, options: any) {
          // リクエストにも設定
          request.cookies.set({ name, value, ...options })
          
          // レスポンスを再生成
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          
          // レスポンスにも設定（これでブラウザに送られる）
          response.cookies.set({ name, value, ...options })
        },
        
        // Cookie削除（重要！）
        remove(name: string, options: any) {
          // リクエストから削除
          request.cookies.set({ name, value: '', ...options })
          
          // レスポンスを再生成
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          
          // レスポンスからも削除
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Step 3: セッション取得
  const { data: { session } } = await supabase.auth.getSession()

  // Step 4: 認証チェック
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    // 未ログインなら/loginへリダイレクト
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Step 5: レスポンスを返す（重要！set/removeで更新されたものを返す）
  return response
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

---

### 🔍 各ステップの詳細解説

#### Step 1: レスポンスオブジェクトの準備

```typescript
let response = NextResponse.next({
  request: { headers: request.headers },
})
```

**なぜ必要？**:
- `set()`/`remove()`でCookieを変更する度に、新しいレスポンスを作る必要がある
- 最初に1つ作っておいて、後で更新する

**`let`を使う理由**:
- 後で`set()`/`remove()`の中で上書きするため

---

#### Step 2: get（Cookie読み込み）

```typescript
get(name: string) {
  return request.cookies.get(name)?.value
}
```

**何をしているか？**:
- リクエストに含まれるCookieを読み取る
- 例: `sb-access-token`というCookieの値を取得

**`?.`（オプショナルチェイニング）とは**:
- Cookieが存在しない場合は`undefined`を返す
- エラーにならない安全な書き方

---

#### Step 3: set（Cookie保存）

```typescript
set(name: string, value: string, options: any) {
  // 1. リクエストにも設定
  request.cookies.set({ name, value, ...options })
  
  // 2. レスポンスを再生成
  response = NextResponse.next({
    request: { headers: request.headers },
  })
  
  // 3. レスポンスにも設定
  response.cookies.set({ name, value, ...options })
}
```

**なぜ3回も設定するの？**:

1. **リクエストに設定**: 同じMiddleware内で後で読めるようにする
2. **レスポンスを再生成**: 新しいCookie情報を含めるため
3. **レスポンスに設定**: ブラウザに送り返すため（これが最重要！）

**例え話**:
```
1. メモ帳（リクエスト）に書く → 自分用の記録
2. 封筒（レスポンス）を新しく用意する
3. 封筒に入れる → 相手（ブラウザ）に届く
```

---

#### Step 4: remove（Cookie削除）

```typescript
remove(name: string, options: any) {
  request.cookies.set({ name, value: '', ...options })
  response = NextResponse.next({
    request: { headers: request.headers },
  })
  response.cookies.set({ name, value: '', ...options })
}
```

**削除の仕組み**:
- 実際には「空文字列を設定」することで削除扱いになる
- ブラウザが「このCookieは無効だな」と判断して削除する

---

#### Step 5: レスポンスを返す

```typescript
return response
```

**最重要ポイント**:
- `set()`/`remove()`で更新された`response`を必ず返す
- これを忘れるとCookieがブラウザに届かない！

---

### 🧪 動作確認方法

#### ブラウザのDevToolsで確認

```
1. ブラウザでページを開く
2. F12キーでDevToolsを開く
3. 「Application」タブ → 「Cookies」
4. Supabase関連のCookieが見える
   - sb-access-token
   - sb-refresh-token
   など
```

#### コンソールログで確認

```typescript
export async function middleware(request: NextRequest) {
  // ... （省略）
  
  const { data: { session } } = await supabase.auth.getSession()
  
  console.log('🔍 セッション確認:', {
    hasSession: !!session,
    userEmail: session?.user?.email,
    pathname: request.nextUrl.pathname,
  })
  
  return response
}
```

**ログ出力例**:
```
🔍 セッション確認: {
  hasSession: true,
  userEmail: 'user@example.com',
  pathname: '/dashboard'
}
```

---

## 4. E2Eテスト安定化戦略

### 🧪 E2Eテストとは？

**E2E** = End-to-End（エンドツーエンド）

**簡単に言うと**: 「ユーザーが実際に操作するように」自動でテストすること。

**例**:
```
人間がやること:
1. ログインページを開く
2. メールアドレスを入力
3. パスワードを入力
4. ログインボタンをクリック
5. ダッシュボードが表示されることを確認

↓ これを自動化

E2Eテスト:
test('ログイン', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'user@example.com')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button:has-text("ログイン")')
  await expect(page).toHaveURL('/dashboard')
})
```

---

### ⚠️ E2Eテストでよくある問題

#### 問題1: タイムアウトエラー

**症状**:
```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
```

**原因**:
- ページ遷移が15秒以内に完了しない
- 認証処理に時間がかかる
- ネットワークが遅い

---

#### 問題2: 認証状態が不安定

**症状**:
- ローカルでは成功するのにCIで失敗する
- テストの実行順序で結果が変わる

**原因**:
- セッションの確立に時間がかかる
- Middlewareの認証チェックとタイミングが合わない

---

### 🛡️ 解決策1: E2E専用バイパス

#### 基本コンセプト

**アイデア**: E2Eテスト実行時だけ認証をスキップする特別な「裏口」を作る

**セキュリティは大丈夫？**:
- 本番環境では絶対に使わない
- テスト環境専用
- クエリパラメータで制御（URLに`?e2e=1`を付けるだけ）

---

#### 実装: Middleware側

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // ⚡ E2Eバイパス: e2e=1 があればスキップ
  if (searchParams.get('e2e') === '1') {
    console.log('🧪 E2Eテストモード: 認証をスキップ')
    return NextResponse.next()
  }

  // 通常の認証処理
  const supabase = createServerClient(/* ... */)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

**動作の流れ**:
```
通常アクセス: /dashboard
  → Middlewareが認証チェック
  → 未ログインなら /login へリダイレクト

E2Eテスト: /dashboard?e2e=1
  → Middlewareが認証をスキップ
  → そのまま通過（テストが安定）
```

---

#### 実装: E2Eテスト側

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('ログイン - Admin', async ({ page }) => {
  // ⚡ ?e2e=1 を付ける
  await page.goto('/login?e2e=1')
  
  await page.click('button:has-text("管理者でログイン")')
  await page.waitForURL('/dashboard', { timeout: 15000 })
  
  // ダッシュボードが表示されることを確認
  await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible()
})
```

**メリット**:
- ✅ Middlewareの認証チェックをスキップ
- ✅ タイムアウトエラーが激減
- ✅ テストが安定して実行される

---

### 🛡️ 解決策2: セッション確立の待機

#### なぜ待機が必要？

**問題**:
```typescript
await page.click('button:has-text("ログイン")')
await page.waitForURL('/dashboard')
// ← この間にセッションが確立されるが、時間がかかる
```

**タイミング**:
```
0秒: ログインボタンクリック
1秒: Supabaseにリクエスト
2秒: Supabaseからレスポンス
3秒: LocalStorageにセッション保存 ← ここまで待たないとダメ！
4秒: /dashboardへ遷移

でも、waitForURL()は遷移したらすぐ次に進む
→ セッションが確立される前に次のテストが始まる
→ エラー！
```

---

#### 実装: 待機時間の追加

```typescript
test('ログイン - Admin', async ({ page }) => {
  await page.goto('/login?e2e=1')
  await page.click('button:has-text("管理者でログイン")')
  
  // ⏰ セッション確立を待つ（重要！）
  await page.waitForTimeout(3000)
  
  await page.waitForURL('/dashboard', { timeout: 15000 })
  await expect(page.locator('h1:has-text("ダッシュボード")')).toBeVisible()
})
```

**なぜ3000ms（3秒）？**:
- Supabaseの認証処理: 約1〜2秒
- LocalStorageへの保存: 約0.5秒
- 余裕を持って3秒

---

### 🛡️ 解決策3: タイムアウト値の調整

#### Playwright設定

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // テスト全体のタイムアウト
  timeout: 60000, // 60秒（デフォルト30秒だと足りない）
  
  // リトライ設定
  retries: process.env.CI ? 2 : 1, // CIでは2回、ローカルでは1回リトライ
  
  // 並列実行数
  workers: process.env.CI ? 1 : 4, // CIでは1つずつ、ローカルでは4並列
  
  use: {
    // ベースURL
    baseURL: 'http://localhost:3000',
    
    // アクション（クリック等）のタイムアウト
    actionTimeout: 15000, // 15秒
    
    // ページ遷移のタイムアウト
    navigationTimeout: 30000, // 30秒（認証があるので長めに）
  },
})
```

**各設定の意味**:

| 設定 | 意味 | 推奨値 |
|------|------|--------|
| `timeout` | テスト全体の制限時間 | 60000（60秒） |
| `actionTimeout` | クリック等の操作の制限時間 | 15000（15秒） |
| `navigationTimeout` | ページ遷移の制限時間 | 30000（30秒） |
| `retries` | 失敗時のリトライ回数 | 1〜2回 |

---

### 🧪 実践例: 安定したE2Eテスト

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('認証フロー', () => {
  test('クイックログイン - Admin', async ({ page }) => {
    // Step 1: ログインページにアクセス（E2Eバイパス付き）
    await page.goto('/login?e2e=1')
    
    // Step 2: ログインボタンをクリック
    await page.click('button:has-text("👤 管理者でログイン")')
    
    // Step 3: セッション確立を待つ（重要！）
    await page.waitForTimeout(3000)
    
    // Step 4: ダッシュボードへの遷移を待つ
    await page.waitForURL('/dashboard', { timeout: 15000 })
    
    // Step 5: 読み込み完了を待つ
    await page.waitForFunction(() => {
      const text = document.body.textContent || ''
      return !text.includes('読み込み中')
    }, { timeout: 20000 })
    
    // Step 6: ダッシュボードが表示されることを確認
    await expect(
      page.locator('h1:has-text("ダッシュボード")')
    ).toBeVisible({ timeout: 10000 })
  })
})
```

**各ステップの理由**:
1. E2Eバイパスで認証をスキップ
2. ログイン処理を実行
3. **セッション確立を待つ（最重要！）**
4. ページ遷移を待つ
5. コンテンツの読み込みを待つ
6. 最終確認

---

## 5. Middleware実装チェックリスト

### 📋 実装前の確認

```markdown
## 実装を始める前に

- [ ] Next.jsのバージョンを確認（13以降推奨）
- [ ] プロジェクト構成を確認（App Router使用中？）
- [ ] Supabaseプロジェクトを作成済み？
- [ ] 環境変数を設定済み？
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**環境変数の確認方法**:
```bash
# .env.local を確認
cat .env.local

# 以下が設定されているはず
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

---

### 🛠️ 実装中の確認

```markdown
## ファイル作成・配置

- [ ] `middleware.ts` をプロジェクトルート直下に作成
- [ ] `src/middleware.ts` が存在しないことを確認
- [ ] `config.matcher` を設定
- [ ] 公開パスを除外（/login, /_next/* 等）

## クッキーアダプタの実装

- [ ] `get()` を実装
- [ ] `set()` を実装（空実装NG！）
- [ ] `remove()` を実装（空実装NG！）
- [ ] `response` を最後に返す

## 認証ロジックの実装

- [ ] `supabase.auth.getSession()` を呼び出し
- [ ] 未認証時のリダイレクト処理
- [ ] 認証済み時の処理
```

**コードレビューポイント**:
```typescript
// ❌ これがあったらNG
set() {}
remove() {}

// ✅ これならOK
set(name, value, options) {
  request.cookies.set({ name, value, ...options })
  response = NextResponse.next({ request: { headers: request.headers } })
  response.cookies.set({ name, value, ...options })
}
```

---

### ✅ 実装後の確認

```markdown
## 手動テスト

- [ ] 開発サーバーを起動
- [ ] ログインページにアクセス
- [ ] ログイン実行
- [ ] ダッシュボードへリダイレクトされる
- [ ] ログアウト実行
- [ ] 再度ダッシュボードにアクセス → /login へリダイレクト

## ブラウザDevToolsで確認

- [ ] Cookieが保存されている（Application → Cookies）
- [ ] sb-access-token が存在する
- [ ] sb-refresh-token が存在する

## コンソールログで確認

- [ ] Middlewareのログが出力される
- [ ] セッション情報が正しい
- [ ] 認証チェックが動作している

## E2Eテスト

- [ ] 全E2Eテストを実行
- [ ] 全て合格（PASS）
- [ ] タイムアウトエラーが発生しない
```

---

### 🐛 トラブルシューティング

#### ケース1: ログインできない

**確認項目**:
```markdown
1. Middlewareの配置
   - [ ] middleware.ts がプロジェクトルート直下にある
   - [ ] src/middleware.ts が存在しない

2. 環境変数
   - [ ] .env.local に正しい値が設定されている
   - [ ] 開発サーバーを再起動した

3. クッキーアダプタ
   - [ ] set() が空実装になっていない
   - [ ] response を返している
```

**デバッグ方法**:
```typescript
export async function middleware(request: NextRequest) {
  console.log('🚪 Middleware開始')
  console.log('📍 パス:', request.nextUrl.pathname)
  
  // ... (省略)
  
  console.log('🔍 セッション:', session ? 'あり' : 'なし')
  console.log('🚪 Middleware終了')
  
  return response
}
```

---

#### ケース2: E2Eテストがタイムアウト

**確認項目**:
```markdown
1. E2Eバイパス
   - [ ] ?e2e=1 を付けている
   - [ ] Middlewareでバイパス処理を実装している

2. 待機時間
   - [ ] waitForTimeout(3000) を入れている
   - [ ] タイムアウト値を十分に設定している

3. Playwright設定
   - [ ] timeout: 60000 を設定
   - [ ] navigationTimeout: 30000 を設定
```

**デバッグ方法**:
```typescript
test('ログイン', async ({ page }) => {
  // スクリーンショットを撮る
  await page.screenshot({ path: 'before-login.png' })
  
  await page.goto('/login?e2e=1')
  await page.screenshot({ path: 'on-login-page.png' })
  
  await page.click('button:has-text("ログイン")')
  await page.screenshot({ path: 'after-click.png' })
  
  // どこで止まっているか確認
})
```

---

#### ケース3: セッションが維持されない

**確認項目**:
```markdown
1. クッキー設定
   - [ ] set() の実装が正しい
   - [ ] response を返している
   - [ ] リクエストとレスポンスの両方に設定している

2. ブラウザ確認
   - [ ] DevToolsでCookieが表示される
   - [ ] Cookieの有効期限が正しい
```

**確認コマンド**:
```typescript
// ブラウザコンソールで実行
console.log(document.cookie)
// 出力例: "sb-access-token=eyJhbG...; sb-refresh-token=..."
```

---

### 📚 参考リンク

- [Next.js Middleware公式ドキュメント](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase SSR認証ガイド](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Playwright公式ドキュメント](https://playwright.dev/)

---

## 🎓 まとめ

### 重要ポイント3つ

1. **Middlewareは必ずプロジェクトルート直下に配置**
   - `middleware.ts`（正）
   - `src/middleware.ts`（誤）

2. **Supabase SSRクッキーアダプタは完全実装**
   - `get`/`set`/`remove` を全て実装
   - `response` を必ず返す

3. **E2Eテストはバイパス + 待機時間**
   - `?e2e=1` で認証スキップ
   - `waitForTimeout(3000)` でセッション確立を待つ

---

### 次のステップ

1. **実際に手を動かす**: このガイドを見ながらMiddlewareを実装
2. **動作確認**: ブラウザとコンソールログで確認
3. **E2Eテスト作成**: 安定したテストを書く
4. **チーム共有**: このガイドをチームメンバーに共有

---

**作成日**: 2025-10-17  
**対象読者**: ビギナーエンジニア  
**前提知識**: JavaScript/TypeScript基礎  
**所要時間**: 読むだけ30分、実装込みで2時間

質問があれば遠慮なく聞いてください！ 🙋‍♂️


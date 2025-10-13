import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 認証不要なパス
const publicPaths = [
  '/login',
  '/api/health',
  '/api/test',
  '/_next',
  '/favicon.ico',
]

// APIルートのパターン
const apiRoutePattern = /^\/api\//

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 開発環境では認証をスキップ（オプション）
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    return NextResponse.next()
  }

  // 公開パスは認証チェックをスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Supabase クライアントを作成
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      },
    }
  )

  // ユーザー認証を確認
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // 認証エラーまたはユーザーが存在しない場合
  if (error || !user) {
    // APIルートの場合は401を返す
    if (apiRoutePattern.test(pathname)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '認証が必要です' },
        { status: 401 }
      )
    }

    // UIルートの場合はログインページにリダイレクト
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みユーザーの場合、リクエストを続行
  const response = NextResponse.next()

  // ユーザー情報をヘッダーに追加（オプション）
  response.headers.set('X-User-Id', user.id)
  response.headers.set('X-User-Email', user.email || '')

  return response
}

// Middlewareを適用するパスを設定
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


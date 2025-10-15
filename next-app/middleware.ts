import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証が必要なパスのパターン
const protectedPaths = ['/dashboard', '/api']

// 認証不要なAPIパス
const publicApiPaths = ['/api/health']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('[Middleware] 🚦 Request:', pathname)

  // 公開APIは認証不要
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    console.log('[Middleware] ✅ Public API - allowing:', pathname)
    return NextResponse.next()
  }

  // 保護されたパスかチェック
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )

  if (!isProtectedPath) {
    console.log('[Middleware] ✅ Not protected - allowing:', pathname)
    return NextResponse.next()
  }

  // 開発環境またはローカル実行時は認証を完全にバイパス
  const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1')
  if (process.env.NODE_ENV === 'development' || isLocal) {
    console.log('[Middleware] 🚀 Local/Dev mode - bypassing ALL auth for:', pathname)
    return NextResponse.next()
  }

  // TODO: Supabase Authトークンの検証
  // 本番環境用の実装（Phase 2-3で本格実装）
  const token = request.cookies.get('sb-access-token') || 
                request.cookies.get('sb-tnbtnezxwnumgcbhswhn-auth-token')

  console.log('[Middleware] Checking auth for:', pathname, 'token:', token ? '✓' : '✗')

  if (!token) {
    console.log('[Middleware] No token - redirecting to login')
    // APIリクエストの場合は401を返す
    if (pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // ダッシュボードの場合はログインページへリダイレクト
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log('[Middleware] Auth OK - allowing:', pathname)

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


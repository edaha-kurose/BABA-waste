import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証が必要なパスのパターン
const protectedPaths = ['/dashboard', '/api']

// 認証不要なAPIパス
const publicApiPaths = ['/api/health']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 公開APIは認証不要
  if (publicApiPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 保護されたパスかチェック
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )

  if (!isProtectedPath) {
    return NextResponse.next()
  }

  // TODO: Supabase Authトークンの検証
  // 現在は簡易的な実装（Phase 2-3で本格実装）
  const token = request.cookies.get('sb-access-token')

  // 開発環境では認証をバイパス
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Development mode - bypassing auth')
    return NextResponse.next()
  }

  if (!token) {
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


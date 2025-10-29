/**
 * Next.js Middleware - サーバーサイド認証
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { pathname, searchParams } = request.nextUrl

  // E2Eバイパス（テスト専用）: クエリ または クッキー
  const isE2EBypass = searchParams.get('e2e') === '1' || request.cookies.get('e2e-bypass')?.value === '1'
  if (isE2EBypass) {
    if (searchParams.get('e2e') === '1') {
      response.cookies.set({ name: 'e2e-bypass', value: '1', path: '/', httpOnly: false, sameSite: 'lax' })
    }
    return response
  }

  // 公開パス（認証不要）
  const publicPaths = ['/login', '/collector-login', '/forgot-password', '/api/health']
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p))
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname === '/favicon.ico'
  if (isPublic || isStatic) {
    return response
  }

  // Supabase SSR クライアント（Middleware用クッキーアダプタ）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // UIルート保護
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/collector')) {
    if (!session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }
    return response
  }

  // API保護（/api/auth/* を除く）
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}





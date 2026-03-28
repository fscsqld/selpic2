import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware - SSO 토큰 검증 및 리다이렉트 처리
 * 
 * 1. URL에서 SSO 토큰 추출 및 검증
 * 2. 토큰을 쿠키에 저장 (서버 사이드 접근 가능)
 * 3. Clean URL로 리다이렉트 (토큰 파라미터 제거)
 * 4. staff 토큰으로 /admin/* 접근 차단
 */

interface SSOToken {
  username: string
  role: 'admin' | 'super_admin' | 'staff'
  permissions: string[]
  timestamp: number
  accessType?: 'admin' | 'staff'
}

function extractSSOTokenFromURL(request: NextRequest): SSOToken | null {
  const url = new URL(request.url)
  const tokenParam = url.searchParams.get('token')

  if (!tokenParam) return null

  try {
    // Base64 디코딩
    const decoded = atob(tokenParam)
    const token: SSOToken = JSON.parse(decoded)

    // 토큰 유효성 검증 (5분 이내)
    const now = Date.now()
    const tokenAge = now - token.timestamp
    const maxAge = 5 * 60 * 1000 // 5분

    if (tokenAge > maxAge) {
      console.warn('[Middleware] SSO token expired')
      return null
    }

    return token
  } catch (error) {
    console.error('[Middleware] Failed to parse SSO token:', error)
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // SSO 토큰이 URL에 있는 경우 처리
  const token = extractSSOTokenFromURL(request)
  
  if (token) {
    console.log('[Middleware] SSO token found:', {
      username: token.username,
      role: token.role,
      accessType: token.accessType,
      pathname
    })

    // staff 토큰 처리
    if (token.role === 'staff' || token.accessType === 'staff') {
      // staff 토큰으로 /admin/* 접근 차단
      if (pathname.startsWith('/admin')) {
        console.log('[Middleware] Staff user attempting to access admin route, redirecting to /employee/payroll')
        // 토큰을 URL 파라미터로 유지하여 리다이렉트
        const tokenParam = request.nextUrl.searchParams.get('token')
        const redirectUrl = new URL('/employee/payroll', request.url)
        if (tokenParam) {
          redirectUrl.searchParams.set('token', tokenParam) // 토큰을 URL에 유지
        }
        const response = NextResponse.redirect(redirectUrl)
        // 토큰을 쿠키에도 저장 (httpOnly: false로 설정하여 클라이언트에서도 읽을 수 있도록)
        response.cookies.set('selpic_sso_token', JSON.stringify({
          ...token,
          savedAt: Date.now()
        }), {
          httpOnly: false, // 클라이언트에서 읽을 수 있도록
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 // 1시간
        })
        return response
      }
      
      // /employee/payroll 경로로 직접 접근 시 토큰을 쿠키에 저장
      if (pathname === '/employee/payroll') {
        const tokenParam = request.nextUrl.searchParams.get('token')
        if (tokenParam) {
          const response = NextResponse.next()
          // 토큰을 쿠키에 저장 (httpOnly: false로 설정하여 클라이언트에서도 읽을 수 있도록)
          response.cookies.set('selpic_sso_token', JSON.stringify({
            ...token,
            savedAt: Date.now()
          }), {
            httpOnly: false, // 클라이언트에서 읽을 수 있도록
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 // 1시간
          })
          return response
        }
      }
    }

    // 관리자 토큰 처리
    if (token.role === 'admin' || token.role === 'super_admin' || token.accessType === 'admin') {
      // Clean URL로 리다이렉트 (토큰 파라미터 제거)
      const cleanUrl = new URL(request.url)
      cleanUrl.searchParams.delete('token')
      
      const response = NextResponse.redirect(cleanUrl)
      
      // 토큰을 쿠키에 저장 (httpOnly: false로 설정하여 클라이언트에서도 읽을 수 있도록)
      response.cookies.set('selpic_sso_token', JSON.stringify({
        ...token,
        savedAt: Date.now()
      }), {
        httpOnly: false, // 클라이언트에서 읽을 수 있도록
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 // 1시간
      })
      
      return response
    }
  }

  // 기존 쿠키에서 토큰 확인 (직원 페이지 접근 시)
  const cookieToken = request.cookies.get('selpic_sso_token')
  if (cookieToken) {
    try {
      const tokenData = JSON.parse(cookieToken.value) as SSOToken & { savedAt?: number }
      
      // 토큰 만료 확인 (1시간)
      if (tokenData.savedAt) {
        const now = Date.now()
        const tokenAge = now - tokenData.savedAt
        const maxAge = 60 * 60 * 1000 // 1시간
        
        if (tokenAge > maxAge) {
          // 만료된 토큰 삭제
          const response = NextResponse.next()
          response.cookies.delete('selpic_sso_token')
          return response
        }
      }
    } catch (error) {
      console.error('[Middleware] Failed to parse cookie token:', error)
    }
  }

  return NextResponse.next()
}

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 매칭:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

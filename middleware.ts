import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { hasUsableSupabaseBrowserEnv } from '@/lib/supabase/publicEnv'

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function applyProductionSecurityHeaders(response: NextResponse, isLocal: boolean) {
  if (process.env.NODE_ENV === 'production' && !isLocal) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    // connect-src required: without it, some browsers restrict fetch() to Supabase/Stripe from this origin.
    // Explicit media/img/font allowlists help iOS Safari load hero & CMS assets (some builds infer stricter defaults).
    response.headers.set(
      'Content-Security-Policy',
      "upgrade-insecure-requests; block-all-mixed-content; connect-src 'self' https: wss:; media-src 'self' https: data: blob:; img-src 'self' https: data: blob:; font-src 'self' https: data:"
    )
  }
  return response
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const protoHeader = request.headers.get('x-forwarded-proto')
  const hostHeader = request.headers.get('host') || ''
  const isHttps = url.protocol === 'https:' || protoHeader === 'https'
  const isLocal = isLocalHost(url.hostname) || hostHeader.includes('localhost')

  if (!isHttps && !isLocal && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:'
    return applyProductionSecurityHeaders(NextResponse.redirect(url, 308), isLocal)
  }

  const path = request.nextUrl.pathname

  /** PKCE / recovery: never run admin checks or extra redirects on auth return URLs (tokens live in query or hash). */
  if (
    path === '/auth/callback' ||
    path.startsWith('/auth/callback/') ||
    path === '/auth/reset-password' ||
    path.startsWith('/auth/reset-password/') ||
    path === '/auth/forgot-password' ||
    path.startsWith('/auth/forgot-password/')
  ) {
    return applyProductionSecurityHeaders(NextResponse.next(), isLocal)
  }

  const isAdminLogin = path === '/admin/login' || path.startsWith('/admin/login/')
  const isAdminArea = path === '/admin' || path.startsWith('/admin/')

  const hasPublicSupabase = hasUsableSupabaseBrowserEnv()

  if (isAdminArea && !isAdminLogin && hasPublicSupabase) {
    try {
      const { supabase, response } = createSupabaseMiddlewareClient(request)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !userHasAdminAccess(user)) {
        const home = new URL('/', request.url)
        return applyProductionSecurityHeaders(NextResponse.redirect(home), isLocal)
      }

      return applyProductionSecurityHeaders(response, isLocal)
    } catch (e) {
      console.error('[middleware] admin Supabase check failed', e)
      const home = new URL('/', request.url)
      return applyProductionSecurityHeaders(NextResponse.redirect(home), isLocal)
    }
  }

  const response = NextResponse.next()

  // iPad Safari can keep an old HTML/RSC shell longer than Chrome; avoid CDN/browser document cache.
  const isStaticAsset =
    path.startsWith('/_next/') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path.startsWith('/uploads/') ||
    path.startsWith('/images/') ||
    path.startsWith('/videos/')
  if (!isStaticAsset && !path.startsWith('/api')) {
    const accept = request.headers.get('accept') || ''
    const rsc = (request.headers.get('rsc') || '').toLowerCase()
    const secFetchDest = request.headers.get('sec-fetch-dest')
    const looksLikeDocumentOrFlight =
      secFetchDest === 'document' || accept.includes('text/html') || rsc === '1' || rsc === 'true'
    if (looksLikeDocumentOrFlight) {
      response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
    }
  }

  return applyProductionSecurityHeaders(response, isLocal)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

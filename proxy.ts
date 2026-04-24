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
    response.headers.set(
      'Content-Security-Policy',
      "upgrade-insecure-requests; block-all-mixed-content; connect-src 'self' https: wss:; media-src 'self' https: data: blob:; img-src 'self' https: data: blob:; font-src 'self' https: data:"
    )
  }
  return response
}

/** Strong no-cache for HTML/RSC navigations (iPad Safari); skip APIs and static asset paths. */
function applyDocumentCacheBust(response: NextResponse, request: NextRequest) {
  const path = request.nextUrl.pathname
  const skipDocumentCacheBust =
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path === '/favicon.ico' ||
    path === '/robots.txt' ||
    path.startsWith('/uploads/') ||
    path.startsWith('/images/') ||
    path.startsWith('/videos/') ||
    /\.[a-zA-Z0-9]{1,12}$/.test(path)

  if (skipDocumentCacheBust) return

  const accept = request.headers.get('accept') || ''
  const rsc = (request.headers.get('rsc') || '').toLowerCase()
  const secFetchDest = request.headers.get('sec-fetch-dest')
  const secFetchMode = request.headers.get('sec-fetch-mode')
  const looksLikeDocumentOrFlight =
    secFetchDest === 'document' || accept.includes('text/html') || rsc === '1' || rsc === 'true'
  const looksLikeTopLevelNavigation = secFetchMode === 'navigate'
  if (looksLikeDocumentOrFlight || looksLikeTopLevelNavigation) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
  }
}

export async function proxy(request: NextRequest) {
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

      applyDocumentCacheBust(response, request)
      return applyProductionSecurityHeaders(response, isLocal)
    } catch (e) {
      console.error('[proxy] admin Supabase check failed', e)
      const home = new URL('/', request.url)
      return applyProductionSecurityHeaders(NextResponse.redirect(home), isLocal)
    }
  }

  if (hasPublicSupabase) {
    try {
      const { supabase, response } = createSupabaseMiddlewareClient(request)
      await supabase.auth.getUser()
      applyDocumentCacheBust(response, request)
      return applyProductionSecurityHeaders(response, isLocal)
    } catch (e) {
      console.error('[proxy] storefront Supabase session refresh failed', e)
    }
  }

  const response = NextResponse.next()
  applyDocumentCacheBust(response, request)
  return applyProductionSecurityHeaders(response, isLocal)
}

/** Next.js 16: `proxy.ts` is the middleware entry; alias for framework convention. */
export const middleware = proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

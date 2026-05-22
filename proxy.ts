import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { userHasAdminAccess } from '@/lib/supabase/adminClaims'
import { hasUsableSupabaseBrowserEnv } from '@/lib/supabase/publicEnv'

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

/** Dev / LAN storefront: never force-redirect to production domain. */
function isLanOrDevHost(hostname: string): boolean {
  if (isLocalHost(hostname)) return true
  if (hostname.startsWith('192.168.')) return true
  if (hostname.startsWith('10.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true
  return false
}

const CANONICAL_HOST = 'selpic.com.au'

/**
 * Send Vercel deployment host traffic to the apex production domain so crawlers never treat
 * *.vercel.app as canonical.
 *
 * Do NOT redirect `www` here: Vercel Domains often already enforce www ↔ apex; a second
 * redirect layer causes ERR_TOO_MANY_REDIRECTS. Configure www → apex once in Vercel project Domains.
 */
function maybeCanonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = (request.headers.get('host') || request.nextUrl.hostname || '').split(':')[0].toLowerCase()
  if (!host || isLanOrDevHost(host)) return null
  if (host === CANONICAL_HOST) return null

  const needsRedirect = host.endsWith('.vercel.app')

  if (!needsRedirect) return null

  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`)
  const res = NextResponse.redirect(target, 308)
  res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  return res
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

/** One-shot emergency cache/storage wipe for stubborn tablet browsers. */
function applyEmergencyResetHeaders(response: NextResponse, request: NextRequest) {
  const resetParam = request.nextUrl.searchParams.get('resetCache')
  const wantsReset =
    resetParam === '1' ||
    resetParam === '' ||
    request.nextUrl.pathname === '/resetCache' ||
    request.nextUrl.pathname.startsWith('/resetCache/')
  if (!wantsReset) return response
  response.headers.set('Clear-Site-Data', '"cache", "storage"')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
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

/** Routes that POST multipart bodies — must not run Supabase proxy (breaks req.formData in App Router). */
function isMultipartUploadApi(path: string, method: string): boolean {
  if (method !== 'POST') return false
  return (
    path === '/api/admin/selpic-contents/upload' ||
    path.startsWith('/api/bespoke-requests/')
  )
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const path = request.nextUrl.pathname
  const protoHeader = request.headers.get('x-forwarded-proto')
  const hostHeader = request.headers.get('host') || ''
  const isHttps = url.protocol === 'https:' || protoHeader === 'https'
  const isLocal = isLocalHost(url.hostname) || hostHeader.includes('localhost')

  if (isMultipartUploadApi(path, request.method)) {
    const response = NextResponse.next()
    return applyProductionSecurityHeaders(response, isLocal)
  }

  const canonicalRedirect = maybeCanonicalHostRedirect(request)
  if (canonicalRedirect) {
    return applyProductionSecurityHeaders(canonicalRedirect, isLocal)
  }

  if (!isHttps && !isLocal && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:'
    return applyProductionSecurityHeaders(NextResponse.redirect(url, 308), isLocal)
  }

  const resetParam = request.nextUrl.searchParams.get('resetCache')
  const wantsReset =
    resetParam === '1' ||
    resetParam === '' ||
    path === '/resetCache' ||
    path.startsWith('/resetCache/')

  if (wantsReset) {
    const next = request.nextUrl.clone()
    if (next.pathname === '/resetCache' || next.pathname.startsWith('/resetCache/')) {
      next.pathname = '/'
    }
    next.searchParams.delete('resetCache')
    // iPad Safari can reuse a stale navigation entry after redirect;
    // add a one-shot cache-buster so reset always lands on a fresh document request.
    next.searchParams.set('rc', Date.now().toString())
    const resetRedirect = NextResponse.redirect(next, 302)
    applyEmergencyResetHeaders(resetRedirect, request)
    applyDocumentCacheBust(resetRedirect, request)
    return applyProductionSecurityHeaders(resetRedirect, isLocal)
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

      applyDocumentCacheBust(response, request)
      applyEmergencyResetHeaders(response, request)
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
      applyEmergencyResetHeaders(response, request)
      return applyProductionSecurityHeaders(response, isLocal)
    } catch (e) {
      console.error('[proxy] storefront Supabase session refresh failed', e)
    }
  }

  const response = NextResponse.next()
  applyDocumentCacheBust(response, request)
  applyEmergencyResetHeaders(response, request)
  return applyProductionSecurityHeaders(response, isLocal)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/admin/selpic-contents/upload).*)',
  ],
}

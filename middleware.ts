import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const protoHeader = request.headers.get('x-forwarded-proto')
  const hostHeader = request.headers.get('host') || ''
  const isHttps = url.protocol === 'https:' || protoHeader === 'https'
  const isLocal = isLocalHost(url.hostname) || hostHeader.includes('localhost')

  // Enforce HTTPS in production environments.
  if (!isHttps && !isLocal && process.env.NODE_ENV === 'production') {
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }

  const response = NextResponse.next()

  // Security headers for production traffic.
  if (process.env.NODE_ENV === 'production') {
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
      "upgrade-insecure-requests; block-all-mixed-content"
    )
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}


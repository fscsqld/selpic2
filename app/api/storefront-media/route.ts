import { NextResponse } from 'next/server'
import { resolveUpstreamStorefrontMediaUrl } from '@/lib/storefrontMediaProxy'

export const runtime = 'nodejs'

const FETCH_TIMEOUT_MS = 25_000

/**
 * Same-origin media proxy for storefront `<img>` / `<video>` when customer networks
 * block `*.supabase.co`. Only allowlisted public Storage URLs are fetched.
 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u')
  const upstream = resolveUpstreamStorefrontMediaUrl(u)
  if (!upstream) {
    return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(upstream, {
      signal: controller.signal,
      headers: {
        Accept: 'image/*,video/*,application/octet-stream,*/*',
      },
      // CDN may cache; allow Next fetch cache for repeated LCP assets.
      next: { revalidate: 86_400 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream media failed', status: res.status },
        { status: res.status === 404 ? 404 : 502 }
      )
    }

    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const okType =
      !contentType ||
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType === 'application/octet-stream'
    if (!okType) {
      return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType || 'application/octet-stream')
    headers.set(
      'Cache-Control',
      'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
    )
    headers.set('X-Content-Type-Options', 'nosniff')
    const len = res.headers.get('content-length')
    if (len) headers.set('Content-Length', len)

    return new NextResponse(res.body, { status: 200, headers })
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError'
    return NextResponse.json(
      { error: aborted ? 'Upstream timeout' : 'Upstream fetch failed' },
      { status: aborted ? 504 : 502 }
    )
  } finally {
    clearTimeout(timer)
  }
}

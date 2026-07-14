import { NextResponse } from 'next/server'

import { toSydneyDay } from '@/lib/analytics/sydney-day'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 120
const VISITOR_RE = /^[a-zA-Z0-9_-]{8,64}$/
const PATH_RE = /^\/[A-Za-z0-9/_?=&.%-]{0,200}$/

type RateEntry = { count: number; windowStart: number }
const rateByIp = new Map<string, RateEntry>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 64)
  return '0.0.0.0'
}

function allowRate(ip: string): boolean {
  const now = Date.now()
  const e = rateByIp.get(ip)
  if (!e) {
    rateByIp.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (now - e.windowStart > RATE_WINDOW_MS) {
    rateByIp.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (e.count >= RATE_MAX) return false
  e.count += 1
  return true
}

function looksLikeBot(ua: string): boolean {
  if (!ua) return true
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|wget|curl|python-requests|uptime|monitor/i.test(
    ua
  )
}

function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('/admin') || trimmed.startsWith('/api') || trimmed.startsWith('/_next')) {
    return null
  }
  const pathOnly = trimmed.split('?')[0].split('#')[0]
  if (!PATH_RE.test(pathOnly)) return null
  return pathOnly.slice(0, 200) || '/'
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (!allowRate(ip)) {
      return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
    }

    const ua = req.headers.get('user-agent') || ''
    if (looksLikeBot(ua)) {
      return NextResponse.json({ ok: true, skipped: 'bot' })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
    }

    const visitorId =
      typeof body === 'object' && body !== null && 'visitorId' in body
        ? String((body as { visitorId?: unknown }).visitorId || '').trim()
        : ''
    if (!VISITOR_RE.test(visitorId)) {
      return NextResponse.json({ ok: false, error: 'INVALID_VISITOR' }, { status: 400 })
    }

    const path = normalizePath(
      typeof body === 'object' && body !== null && 'path' in body
        ? (body as { path?: unknown }).path
        : '/'
    )
    if (!path) {
      return NextResponse.json({ ok: false, error: 'INVALID_PATH' }, { status: 400 })
    }

    let referrer: string | null = null
    if (typeof body === 'object' && body !== null && 'referrer' in body) {
      const r = String((body as { referrer?: unknown }).referrer || '').trim()
      if (r && r.length <= 500 && /^https?:\/\//i.test(r)) {
        referrer = r.slice(0, 500)
      }
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, skipped: 'supabase_not_configured' })
    }

    const day = toSydneyDay(new Date())
    if (!day) {
      return NextResponse.json({ ok: false, error: 'INVALID_DAY' }, { status: 500 })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('site_pageviews').insert({
      visitor_id: visitorId,
      day,
      path,
      referrer,
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json(
          {
            ok: false,
            error: 'TABLE_MISSING',
            details: 'Run docs/site-pageviews-supabase.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        )
      }
      console.error('[analytics/pageview]', error)
      return NextResponse.json({ ok: false, error: 'INSERT_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, day })
  } catch (e) {
    console.error('[analytics/pageview]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

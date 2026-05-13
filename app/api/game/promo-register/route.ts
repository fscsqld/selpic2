import { NextResponse } from 'next/server'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const CODE_RE = /^SELPIC-GAME-[A-Z0-9]{6}$/i

const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_MAX = 40

type RateEntry = { count: number; windowStart: number }
const rateByIp = new Map<string, RateEntry>()

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
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

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (!allowRate(ip)) {
      return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
    }

    const codeRaw = typeof body === 'object' && body !== null && 'code' in body ? String((body as { code?: unknown }).code || '') : ''
    const code = codeRaw.trim().toUpperCase()
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ ok: false, error: 'INVALID_CODE' }, { status: 400 })
    }

    const source =
      typeof body === 'object' && body !== null && 'source' in body
        ? String((body as { source?: unknown }).source || 'game_level_5').slice(0, 64)
        : 'game_level_5'
    const score =
      typeof body === 'object' && body !== null && typeof (body as { score?: unknown }).score === 'number'
        ? Math.round((body as { score: number }).score)
        : null
    const level =
      typeof body === 'object' && body !== null && typeof (body as { level?: unknown }).level === 'number'
        ? Math.round((body as { level: number }).level)
        : null

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true, skipped: 'supabase_not_configured' })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('game_promo_registrations').insert({
      code,
      source: source || 'game_level_5',
      score: score ?? null,
      level: level ?? null,
      client_ip: ip.slice(0, 64),
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('duplicate') || msg.includes('unique') || error.code === '23505') {
        return NextResponse.json({ ok: true, duplicate: true })
      }
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        return NextResponse.json(
          {
            ok: false,
            error: 'TABLE_MISSING',
            details: 'Run docs/game-promo-codes-supabase.sql in the Supabase SQL editor.',
          },
          { status: 503 }
        )
      }
      console.error('[game/promo-register]', error)
      return NextResponse.json({ ok: false, error: 'INSERT_FAILED', details: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[game/promo-register]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

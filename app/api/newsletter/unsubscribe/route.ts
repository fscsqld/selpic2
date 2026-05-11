import { NextResponse } from 'next/server'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 10

type RateEntry = { count: number; windowStart: number }
const rateLimitMap = new Map<string, RateEntry>()

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getClientIp = (req: Request): string => {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return '127.0.0.1'
}

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  rateLimitMap.set(ip, { count: entry.count + 1, windowStart: entry.windowStart })
  return true
}

/** Public unsubscribe (link from newsletter emails). */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ success: false, message: 'Too many requests.' }, { status: 429 })
    }

    const body = (await req.json().catch(() => null)) as { email?: string } | null
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email.' }, { status: 400 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Newsletter service is temporarily unavailable.' },
        { status: 503 }
      )
    }

    const admin = getSupabaseAdmin()
    const now = new Date().toISOString()
    const { data: row, error: selErr } = await admin
      .from('newsletter_subscribers')
      .select('id,is_active')
      .eq('email', email)
      .maybeSingle()

    if (selErr) {
      console.error('[newsletter/unsubscribe]', selErr.message)
      return NextResponse.json({ success: false, message: 'Something went wrong.' }, { status: 500 })
    }

    if (!row) {
      return NextResponse.json({ success: true, message: 'You are not on our list.' })
    }

    if (!row.is_active) {
      return NextResponse.json({ success: true, message: 'You are already unsubscribed.' })
    }

    const { error: upErr } = await admin
      .from('newsletter_subscribers')
      .update({ is_active: false, unsubscribed_at: now })
      .eq('id', row.id)

    if (upErr) {
      console.error('[newsletter/unsubscribe update]', upErr.message)
      return NextResponse.json({ success: false, message: 'Something went wrong.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'You have been unsubscribed.' })
  } catch (e) {
    console.error('[newsletter/unsubscribe]', e)
    return NextResponse.json({ success: false, message: 'Something went wrong.' }, { status: 500 })
  }
}

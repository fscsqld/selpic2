import { NextResponse } from 'next/server'

import { listSydneyDaysInclusive, toSydneyDay } from '@/lib/analytics/sydney-day'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function defaultRange(daysBack: number): { from: string; to: string } {
  const to = toSydneyDay(new Date())
  const todayNoon = new Date(`${to}T12:00:00.000Z`)
  const fromNoon = new Date(todayNoon.getTime() - (Math.max(1, daysBack) - 1) * 24 * 60 * 60 * 1000)
  const from = toSydneyDay(fromNoon) || to
  return { from, to }
}

export async function GET(req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  const url = new URL(req.url)
  const daysParam = Number(url.searchParams.get('days') || 30)
  const daysBack = Math.min(90, Math.max(1, Number.isFinite(daysParam) ? daysParam : 30))

  let from = (url.searchParams.get('from') || '').trim()
  let to = (url.searchParams.get('to') || '').trim()
  if (!DAY_RE.test(from) || !DAY_RE.test(to)) {
    const range = defaultRange(daysBack)
    from = range.from
    to = range.to
  }
  if (from > to) {
    return NextResponse.json({ ok: false, error: 'INVALID_RANGE' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('site_pageviews')
      .select('day,visitor_id,path')
      .gte('day', from)
      .lte('day', to)
      .limit(50_000)

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
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: msg },
        { status: 500 }
      )
    }

    const rows = Array.isArray(data) ? data : []
    const byDay = new Map<string, { pageviews: number; visitors: Set<string> }>()
    for (const day of listSydneyDaysInclusive(from, to)) {
      byDay.set(day, { pageviews: 0, visitors: new Set() })
    }

    for (const row of rows) {
      const day = typeof row.day === 'string' ? row.day.slice(0, 10) : ''
      if (!day || !byDay.has(day)) {
        if (day && DAY_RE.test(day)) {
          byDay.set(day, { pageviews: 0, visitors: new Set() })
        } else {
          continue
        }
      }
      const bucket = byDay.get(day)!
      bucket.pageviews += 1
      if (typeof row.visitor_id === 'string' && row.visitor_id) {
        bucket.visitors.add(row.visitor_id)
      }
    }

    const daily = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, bucket]) => ({
        day,
        pageviews: bucket.pageviews,
        uniqueVisitors: bucket.visitors.size,
      }))

    const today = toSydneyDay(new Date())
    const todayRow = daily.find((d) => d.day === today)
    const yesterdayDate = new Date(`${today}T12:00:00.000Z`)
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
    const yesterday = toSydneyDay(yesterdayDate)
    const yesterdayRow = daily.find((d) => d.day === yesterday)

    return NextResponse.json({
      ok: true,
      timezone: 'Australia/Sydney',
      from,
      to,
      today: todayRow || { day: today, pageviews: 0, uniqueVisitors: 0 },
      yesterday: yesterdayRow || { day: yesterday, pageviews: 0, uniqueVisitors: 0 },
      daily,
    })
  } catch (e) {
    console.error('[admin/analytics/traffic]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

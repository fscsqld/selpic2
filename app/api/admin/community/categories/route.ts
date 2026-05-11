import { NextResponse } from 'next/server'

import { categoryRowToClient } from '@/lib/community/serialize'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

type IncomingCategory = {
  id?: unknown
  name?: unknown
  emoji?: unknown
  bgColor?: unknown
  textColor?: unknown
  borderColor?: unknown
  order?: unknown
  isActive?: unknown
  isDefault?: unknown
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function PUT(req: Request) {
  const adminUser = await requireSupabaseAdminUser()
  if (!adminUser) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  let body: { categories?: IncomingCategory[] }
  try {
    body = (await req.json()) as { categories?: IncomingCategory[] }
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const list = body.categories
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const rows: {
    slug: string
    name: string
    emoji: string
    bg_color: string
    text_color: string
    border_color: string
    sort_order: number
    is_active: boolean
    is_default: boolean
  }[] = []

  for (const c of list) {
    const rawSlug = typeof c.id === 'string' ? c.id.trim().toLowerCase() : ''
    const name = typeof c.name === 'string' ? c.name.trim() : ''
    const slug = normalizeSlug(rawSlug || name.replace(/\s+/g, '-'))
    if (!slug || !name || slug.length > 64) {
      return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const emoji = typeof c.emoji === 'string' && c.emoji.trim() ? c.emoji.trim().slice(0, 8) : '💬'
    const bgColor =
      typeof c.bgColor === 'string' && c.bgColor.startsWith('bg-') ? c.bgColor.slice(0, 64) : 'bg-blue-100'
    const textColor =
      typeof c.textColor === 'string' && c.textColor.startsWith('text-')
        ? c.textColor.slice(0, 64)
        : 'text-blue-800'
    const borderColor =
      typeof c.borderColor === 'string' && c.borderColor.startsWith('border-')
        ? c.borderColor.slice(0, 64)
        : 'border-blue-300'
    const sortOrder =
      typeof c.order === 'number' && Number.isFinite(c.order) ? Math.floor(c.order) : rows.length
    const isActive = c.isActive !== false
    const isDefault = c.isDefault === true

    rows.push({
      slug,
      name,
      emoji,
      bg_color: bgColor,
      text_color: textColor,
      border_color: borderColor,
      sort_order: sortOrder,
      is_active: isActive,
      is_default: isDefault,
    })
  }

  const activeSlugs = new Set(rows.map((r) => r.slug))

  try {
    const admin = getSupabaseAdmin()

    const { data: existing, error: exErr } = await admin.from('community_categories').select('slug,is_default')

    if (exErr) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: exErr.message },
        { status: 500 }
      )
    }

    for (const row of existing ?? []) {
      // Never auto-disable the umbrella "All" filter row
      if (!activeSlugs.has(row.slug) && row.slug !== 'all') {
        await admin.from('community_categories').update({ is_active: false }).eq('slug', row.slug)
      }
    }

    const { error: upErr } = await admin.from('community_categories').upsert(rows, { onConflict: 'slug' })

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: 'UPSERT_FAILED', details: upErr.message },
        { status: 500 }
      )
    }

    const { data: catRows, error: catErr } = await admin
      .from('community_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (catErr) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: catErr.message },
        { status: 500 }
      )
    }

    const categories = (catRows ?? []).map(categoryRowToClient)
    return NextResponse.json({ ok: true, categories })
  } catch (e) {
    console.error('[admin/community/categories]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

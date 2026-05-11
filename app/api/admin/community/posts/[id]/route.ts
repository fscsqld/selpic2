import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

function parseId(param: string): number | null {
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminSession = await requireSupabaseAdminUser()
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const { id: raw } = await ctx.params
  const id = parseId(raw)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.title !== undefined) {
    const t = sanitizeCommunityText(body.title, 500)
    if (!t) return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
    if (hasBannedCommunityContent(t))
      return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
    patch.title = t
  }

  if (body.content !== undefined) {
    const c = sanitizeCommunityText(body.content, 50000)
    if (!c) return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
    if (hasBannedCommunityContent(c))
      return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
    patch.content = c
  }

  if (body.category !== undefined) {
    const cat = sanitizeCommunityText(body.category, 120)
    if (!cat) return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
    patch.category = cat
  }

  if (typeof body.pinned === 'boolean') patch.pinned = body.pinned
  if (typeof body.hidden === 'boolean') patch.hidden = body.hidden
  if (typeof body.reported === 'boolean') patch.reported = body.reported

  if (body.likes !== undefined) {
    const likes = typeof body.likes === 'number' ? body.likes : Number(body.likes)
    if (Number.isFinite(likes)) patch.likes = Math.max(0, Math.floor(likes))
  }

  const contentKeys = Object.keys(patch).filter((k) => k !== 'updated_at')
  if (contentKeys.length === 0) {
    return NextResponse.json({ ok: false, error: 'NO_FIELDS' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: updated, error: updErr } = await admin
      .from('community_posts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (updErr || !updated) {
      return NextResponse.json(
        { ok: false, error: 'UPDATE_FAILED', details: updErr?.message },
        { status: updErr?.code === 'PGRST116' ? 404 : 500 }
      )
    }

    const { data: commentRows } = await admin.from('community_comments').select('*').eq('post_id', id)

    const [postOut] = buildPostsWithComments([updated], commentRows ?? [], { includeModeration: true })
    return NextResponse.json({ ok: true, post: postOut })
  } catch (e) {
    console.error('[admin/community/posts PATCH]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminSession = await requireSupabaseAdminUser()
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const { id: raw } = await ctx.params
  const id = parseId(raw)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  try {
    const admin = getSupabaseAdmin()
    const { error: delErr } = await admin.from('community_posts').delete().eq('id', id)
    if (delErr) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', details: delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/community/posts DELETE]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { canMutateAsPostAuthor, type ActorPayload } from '@/lib/community/ownership'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import { getRequestClientIp } from '@/lib/server/requestIp'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const WINDOW_MS = 10 * 60 * 1000
const MAX_WRITES_PER_WINDOW = 60

function parseId(param: string): number | null {
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

function readActor(body: Record<string, unknown>): ActorPayload {
  return {
    actorUserId: typeof body.actorUserId === 'string' ? body.actorUserId : null,
    actorEmail: typeof body.actorEmail === 'string' ? body.actorEmail : null,
    actorName: typeof body.actorName === 'string' ? body.actorName : null,
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`community:patch:${ip}`, MAX_WRITES_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
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

  const actor = readActor(body)
  const title = body.title !== undefined ? sanitizeCommunityText(body.title, 500) : undefined
  const content = body.content !== undefined ? sanitizeCommunityText(body.content, 50000) : undefined
  const category = body.category !== undefined ? sanitizeCommunityText(body.category, 120) : undefined

  if (title === null || content === null || category === null) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if ((title && hasBannedCommunityContent(title)) || (content && hasBannedCommunityContent(content))) {
    return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
  }

  if (title === undefined && content === undefined && category === undefined) {
    return NextResponse.json({ ok: false, error: 'NO_FIELDS' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: row, error: selErr } = await admin
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (selErr || !row) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    if (!canMutateAsPostAuthor(row, actor)) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (title !== undefined) patch.title = title
    if (content !== undefined) patch.content = content
    if (category !== undefined) patch.category = category

    const { data: updated, error: updErr } = await admin
      .from('community_posts')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (updErr || !updated) {
      return NextResponse.json(
        { ok: false, error: 'UPDATE_FAILED', details: updErr?.message },
        { status: 500 }
      )
    }

    const { data: comments } = await admin.from('community_comments').select('*').eq('post_id', id)

    const [postOut] = buildPostsWithComments([updated], comments ?? [], { includeModeration: false })
    return NextResponse.json({ ok: true, post: postOut })
  } catch (e) {
    console.error('[community/posts PATCH]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`community:delete:${ip}`, MAX_WRITES_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
  }

  const { id: raw } = await ctx.params
  const id = parseId(raw)
  if (!id) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  let actor: ActorPayload = {}
  try {
    const body = (await req.json()) as Record<string, unknown>
    actor = readActor(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: row, error: selErr } = await admin
      .from('community_posts')
      .select('id,author_display,author_user_id')
      .eq('id', id)
      .maybeSingle()

    if (selErr || !row) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    if (!canMutateAsPostAuthor(row, actor)) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const { error: delErr } = await admin.from('community_posts').delete().eq('id', id)
    if (delErr) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', details: delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/posts DELETE]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

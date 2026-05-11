import { NextResponse } from 'next/server'

import { canMutateAsCommentAuthor, type ActorPayload } from '@/lib/community/ownership'
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

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`community:delc:${ip}`, MAX_WRITES_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
  }

  const { id: postRaw, commentId: cRaw } = await ctx.params
  const postId = parseId(postRaw)
  const commentId = parseId(cRaw)
  if (!postId || !commentId) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  let actor: ActorPayload
  try {
    const body = (await req.json()) as Record<string, unknown>
    actor = readActor(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: comment, error: cErr } = await admin
      .from('community_comments')
      .select('*')
      .eq('id', commentId)
      .eq('post_id', postId)
      .maybeSingle()

    if (cErr || !comment) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    if (!canMutateAsCommentAuthor(comment, actor)) {
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    const { error: delErr } = await admin.from('community_comments').delete().eq('id', commentId)
    if (delErr) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', details: delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[community/comments DELETE]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

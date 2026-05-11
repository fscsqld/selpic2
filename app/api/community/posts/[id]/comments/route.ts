import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import { getRequestClientIp } from '@/lib/server/requestIp'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const WINDOW_MS = 10 * 60 * 1000
const MAX_COMMENTS_PER_WINDOW = 40

function parseId(param: string): number | null {
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`community:comment:${ip}`, MAX_COMMENTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
  }

  const { id: raw } = await ctx.params
  const postId = parseId(raw)
  if (!postId) return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const content = sanitizeCommunityText(body.content, 20000)
  const authorDisplay = sanitizeCommunityText(body.author, 200)
  const authorUserId =
    typeof body.authorUserId === 'string' && body.authorUserId.trim().length > 0
      ? body.authorUserId.trim().slice(0, 128)
      : null

  if (!content || !authorDisplay) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (hasBannedCommunityContent(content)) {
    return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: postRow, error: pErr } = await admin
      .from('community_posts')
      .select('id,hidden')
      .eq('id', postId)
      .maybeSingle()

    if (pErr || !postRow || postRow.hidden) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const { data: inserted, error: insErr } = await admin
      .from('community_comments')
      .insert({
        post_id: postId,
        content,
        author_display: authorDisplay,
        author_user_id: authorUserId,
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      return NextResponse.json(
        { ok: false, error: 'INSERT_FAILED', details: insErr?.message },
        { status: 500 }
      )
    }

    const { data: postFull } = await admin.from('community_posts').select('*').eq('id', postId).single()

    const { data: commentRows } = await admin
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!postFull) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const [postOut] = buildPostsWithComments([postFull], commentRows ?? [], { includeModeration: false })
    return NextResponse.json({ ok: true, comment: inserted, post: postOut })
  } catch (e) {
    console.error('[community/comments POST]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

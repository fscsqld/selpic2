import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { allowRateLimit } from '@/lib/server/simpleRateLimit'
import { getRequestClientIp } from '@/lib/server/requestIp'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

const WINDOW_MS = 10 * 60 * 1000
const MAX_POSTS_PER_WINDOW = 12

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const ip = getRequestClientIp(req)
  if (!allowRateLimit(`community:post:${ip}`, MAX_POSTS_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: 'RATE_LIMIT' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const title = sanitizeCommunityText(body.title, 500)
  const content = sanitizeCommunityText(body.content, 50000)
  const category = sanitizeCommunityText(body.category, 120)
  const authorDisplay = sanitizeCommunityText(body.author, 200)
  const authorUserId =
    typeof body.authorUserId === 'string' && body.authorUserId.trim().length > 0
      ? body.authorUserId.trim().slice(0, 128)
      : null

  if (!title || !content || !category || !authorDisplay) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (hasBannedCommunityContent(title) || hasBannedCommunityContent(content)) {
    return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: inserted, error: insErr } = await admin
      .from('community_posts')
      .insert({
        title,
        content,
        category,
        author_display: authorDisplay,
        author_user_id: authorUserId,
        likes: 0,
        pinned: false,
        hidden: false,
        reported: false,
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      console.error('[community/posts]', insErr?.message)
      return NextResponse.json(
        { ok: false, error: 'INSERT_FAILED', details: insErr?.message },
        { status: 500 }
      )
    }

    const [postOut] = buildPostsWithComments([inserted], [], { includeModeration: false })
    return NextResponse.json({ ok: true, post: postOut })
  } catch (e) {
    console.error('[community/posts]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

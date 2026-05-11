import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

function parseId(param: string): number | null {
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const adminSession = await requireSupabaseAdminUser()
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
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

  const metaName =
    adminSession.user_metadata &&
    typeof adminSession.user_metadata.username === 'string' &&
    adminSession.user_metadata.username.trim()
      ? adminSession.user_metadata.username.trim()
      : null

  const author =
    authorDisplay || `Admin (${metaName || adminSession.email || 'staff'})`

  if (!content) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (hasBannedCommunityContent(content)) {
    return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data: postRow, error: pErr } = await admin
      .from('community_posts')
      .select('id')
      .eq('id', postId)
      .maybeSingle()

    if (pErr || !postRow) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }

    const { error: insErr } = await admin.from('community_comments').insert({
      post_id: postId,
      content,
      author_display: author,
      author_user_id: null,
    })

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: 'INSERT_FAILED', details: insErr.message },
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

    const [postOut] = buildPostsWithComments([postFull], commentRows ?? [], { includeModeration: true })
    return NextResponse.json({ ok: true, post: postOut })
  } catch (e) {
    console.error('[admin/community/comments POST]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

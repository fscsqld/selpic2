import { NextResponse } from 'next/server'

import { buildPostsWithComments } from '@/lib/community/serialize'
import { hasBannedCommunityContent, sanitizeCommunityText } from '@/lib/community/moderation'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  adminPermissionDeniedOkEnvelope,
  adminPermissionDeniedPlain,
  requireAdminPermission,
} from '@/lib/supabase/requireAdminPermission'

export async function POST(req: Request) {
  const gate = await requireAdminPermission('community:write')
  if (!gate.ok) return adminPermissionDeniedOkEnvelope(gate)!
  const user = gate.user

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
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
  const authorRaw = sanitizeCommunityText(body.author, 200)
  const metaName =
    user.user_metadata &&
    typeof user.user_metadata.username === 'string' &&
    user.user_metadata.username.trim()
      ? user.user_metadata.username.trim()
      : null
  const authorDisplay = authorRaw || `Admin (${metaName || user.email || 'staff'})`

  if (!title || !content || !category) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 400 })
  }

  if (hasBannedCommunityContent(title) || hasBannedCommunityContent(content)) {
    return NextResponse.json({ ok: false, error: 'MODERATION_REJECT' }, { status: 422 })
  }

  const pinned = Boolean(body.pinned)
  const hidden = Boolean(body.hidden)
  const reported = Boolean(body.reported)
  const likesRaw = body.likes
  const likes =
    typeof likesRaw === 'number' && Number.isFinite(likesRaw) ? Math.max(0, Math.floor(likesRaw)) : 0

  try {
    const admin = getSupabaseAdmin()
    const { data: inserted, error: insErr } = await admin
      .from('community_posts')
      .insert({
        title,
        content,
        category,
        author_display: authorDisplay,
        author_user_id: null,
        likes,
        pinned,
        hidden,
        reported,
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      return NextResponse.json(
        { ok: false, error: 'INSERT_FAILED', details: insErr?.message },
        { status: 500 }
      )
    }

    const [postOut] = buildPostsWithComments([inserted], [], { includeModeration: true })
    return NextResponse.json({ ok: true, post: postOut })
  } catch (e) {
    console.error('[admin/community/posts POST]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

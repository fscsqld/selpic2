import { NextResponse } from 'next/server'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'

function parseId(param: string): number | null {
  const n = Number(param)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; commentId: string }> }) {
  const adminSession = await requireSupabaseAdminUser()
  if (!adminSession) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  const { id: postRaw, commentId: cRaw } = await ctx.params
  const postId = parseId(postRaw)
  const commentId = parseId(cRaw)
  if (!postId || !commentId) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { error: delErr } = await admin
      .from('community_comments')
      .delete()
      .eq('id', commentId)
      .eq('post_id', postId)

    if (delErr) {
      return NextResponse.json(
        { ok: false, error: 'DELETE_FAILED', details: delErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin/community/comments DELETE]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

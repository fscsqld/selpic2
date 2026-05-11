import { NextResponse } from 'next/server'

import { buildPostsWithComments, categoryRowToClient } from '@/lib/community/serialize'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  try {
    const admin = getSupabaseAdmin()

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

    const { data: postRows, error: postErr } = await admin
      .from('community_posts')
      .select('*')
      .eq('hidden', false)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (postErr) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_QUERY_FAILED', details: postErr.message },
        { status: 500 }
      )
    }

    const posts = postRows ?? []
    const postIds = posts.map((p) => p.id)

    let commentRows: Parameters<typeof buildPostsWithComments>[1] = []
    if (postIds.length > 0) {
      const { data: crs, error: cErr } = await admin
        .from('community_comments')
        .select('*')
        .in('post_id', postIds)
        .order('created_at', { ascending: true })

      if (cErr) {
        return NextResponse.json(
          { ok: false, error: 'SUPABASE_QUERY_FAILED', details: cErr.message },
          { status: 500 }
        )
      }
      commentRows = crs ?? []
    }

    const categories = (catRows ?? []).map(categoryRowToClient)
    const postsOut = buildPostsWithComments(posts, commentRows, { includeModeration: false })

    return NextResponse.json({
      ok: true,
      categories,
      posts: postsOut,
    })
  } catch (e) {
    console.error('[community/public]', e)
    return NextResponse.json({ ok: false, error: 'UNKNOWN' }, { status: 500 })
  }
}

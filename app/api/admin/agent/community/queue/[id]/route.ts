import { NextResponse } from 'next/server'

import {
  adminPermissionDeniedPlain,
  requireAdminAnyPermission,
} from '@/lib/supabase/requireAdminPermission'
import {
  getQueuedCommunityDraft,
  patchQueuedCommunityDraft,
  removeQueuedCommunityDraft,
} from '@/lib/server/communityDraftQueueStore'

export const dynamic = 'force-dynamic'

type PatchBody = {
  title?: string
  content?: string
  category?: string
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const { id } = await ctx.params
  const item = await getQueuedCommunityDraft(String(id || ''))
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, item })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const { id } = await ctx.params
  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const item = await patchQueuedCommunityDraft(String(id || ''), {
    title: body.title,
    content: body.content,
    category: body.category,
  })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, item })
}

/** Discard — remove from queue only (does not touch community_posts). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdminAnyPermission(['community:read', 'agent:read'])
  const denied = adminPermissionDeniedPlain(gate)
  if (denied) return denied

  const { id } = await ctx.params
  const ok = await removeQueuedCommunityDraft(String(id || ''))
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

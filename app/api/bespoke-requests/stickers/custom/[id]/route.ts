import { NextResponse } from 'next/server'
import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import {
  deleteBespokeStickerRequest,
  readBespokeStickerRequests,
  updateBespokeStickerRequestStatus,
  type BespokeStickerRequestStatus,
} from '@/lib/server/bespokeStickerRequests'

const ALLOWED: BespokeStickerRequestStatus[] = ['new', 'reviewed', 'replied', 'approved', 'rejected']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params
  try {
    const records = await readBespokeStickerRequests()
    const record = records.find((r) => r.id === requestId)
    if (!record) {
      return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, record })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Load failed'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params
  const body = await req.json().catch(() => null)

  const status = body?.status as BespokeStickerRequestStatus
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 })
  }

  try {
    const record = await updateBespokeStickerRequestStatus(requestId, status)
    return NextResponse.json({ success: true, record })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    const statusCode = message === 'Request not found' ? 404 : 500
    return NextResponse.json({ success: false, message }, { status: statusCode })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSupabaseAdminUser()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  const { id: requestId } = await params

  try {
    await deleteBespokeStickerRequest(requestId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    const statusCode = message === 'Request not found' ? 404 : 500
    return NextResponse.json({ success: false, message }, { status: statusCode })
  }
}

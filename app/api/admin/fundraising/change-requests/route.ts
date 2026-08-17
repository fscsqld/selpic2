import { NextResponse } from 'next/server'

import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import {
  getFundraisingChangeRequestById,
  listFundraisingChangeRequestsFromDb,
  listFundraisingPartnersFromDb,
  upsertFundraisingChangeRequest,
} from '@/lib/fundraising/persistence'
import type { FundraisingChangeRequestStatus } from '@/lib/fundraising/types'
import {
  notifyAdminsOfFundraisingChangeRequest,
  sendPartnerChangeRequestPack,
} from '@/lib/server/adminInboundNotify'

const ALLOWED: FundraisingChangeRequestStatus[] = [
  'submitted',
  'under_review',
  'awaiting_partner',
  'partner_replied',
  'applied',
  'declined',
  'closed',
]

export async function GET(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    const openOnly = url.searchParams.get('openOnly') !== '0'
    const requests = await listFundraisingChangeRequestsFromDb({
      openOnly,
      limit: 200,
    })
    return NextResponse.json({ ok: true, requests })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load change requests' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json().catch(() => null)) as {
      requestId?: string
      status?: FundraisingChangeRequestStatus
      adminNotes?: string
      action?: 'send_pack' | 'set_status'
      packNote?: string
    } | null

    const requestId = String(body?.requestId || '').trim()
    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const existing = await getFundraisingChangeRequestById(requestId)
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const partners = await listFundraisingPartnersFromDb()
    const partner = partners.find((p) => p.id === existing.partnerId)
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found for this request' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const actor = user.email || user.id || 'admin'
    let next = { ...existing, updatedAt: now }

    if (body?.action === 'send_pack') {
      const pack = await sendPartnerChangeRequestPack({
        partner,
        request: existing,
        adminNote: body.packNote || body.adminNotes,
      })
      if (!pack.ok) {
        return NextResponse.json(
          { error: pack.logMessage || 'Failed to email partner pack' },
          { status: 502 }
        )
      }
      next = {
        ...next,
        status: 'awaiting_partner',
        packSentAt: now,
        adminNotes: String(body.adminNotes || existing.adminNotes || '').trim() || existing.adminNotes,
        documentIds: pack.documentId
          ? Array.from(new Set([...(existing.documentIds || []), pack.documentId]))
          : existing.documentIds,
      }
    } else {
      const status = body?.status
      if (!status || !ALLOWED.includes(status)) {
        return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
      }
      next = {
        ...next,
        status,
        adminNotes:
          body?.adminNotes !== undefined
            ? String(body.adminNotes || '').trim().slice(0, 4000)
            : existing.adminNotes,
      }
      if (status === 'applied' || status === 'declined' || status === 'closed') {
        next.closedAt = now
        next.closedBy = actor
      }
    }

    const saved = await upsertFundraisingChangeRequest(next)
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 500 })
    }

    if (body?.action === 'send_pack') {
      void notifyAdminsOfFundraisingChangeRequest({ partner, request: next }).catch(() => undefined)
    }

    const message =
      body?.action === 'send_pack'
        ? `D22 notice emailed to ${partner.contactEmail || 'partner'} (instructions only — no PDF attachment). Form is in Lookup Documents; partner status is awaiting reply.`
        : `Change request status updated to ${next.status}.`

    return NextResponse.json({
      ok: true,
      request: next,
      partnerId: partner.id,
      message,
      emailedTo: body?.action === 'send_pack' ? partner.contactEmail || null : undefined,
      documentId:
        body?.action === 'send_pack' && next.documentIds?.length
          ? next.documentIds[next.documentIds.length - 1]
          : undefined,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update change request' },
      { status: 500 }
    )
  }
}

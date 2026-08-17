import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { LOOKUP_SESSION_COOKIE, resolveLookupSession } from '@/lib/fundraising/lookupAuth'
import {
  getFundraisingChangeRequestById,
  listFundraisingChangeRequestsFromDb,
  upsertFundraisingChangeRequest,
} from '@/lib/fundraising/persistence'
import { isOpenFundraisingChangeRequestStatus } from '@/lib/fundraising/changeRequests'
import { submitPartnerChangeRequest } from '@/lib/fundraising/submitChangeRequest'
import { uploadChangeRequestAttachments } from '@/lib/fundraising/uploadChangeRequestAttachments'
import type {
  FundraisingChangeRequest,
  FundraisingChangeRequestKind,
} from '@/lib/fundraising/types'
import { notifyAdminsOfFundraisingChangeRequest } from '@/lib/server/adminInboundNotify'

/** Create a change request (intake: kind + message only). */
export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as {
      kind?: FundraisingChangeRequestKind
      note?: string
      message?: string
    } | null

    const result = await submitPartnerChangeRequest({
      partner: resolved.partner,
      kind: body?.kind,
      message: body?.message || body?.note,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      ok: true,
      request: result.request,
      notified: result.notified,
      message: result.message,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to submit change request' },
      { status: 500 }
    )
  }
}

/**
 * Partner reply after admin sent a pack.
 * Accepts JSON `{ requestId, reply }` or multipart with `requestId`, `reply`, and `files`.
 */
export async function PATCH(req: Request) {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    let requestId = ''
    let reply = ''
    let files: File[] = []

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      requestId = String(form.get('requestId') || '').trim()
      reply = String(form.get('reply') || '').trim().slice(0, 4000)
      files = form
        .getAll('files')
        .filter((v): v is File => typeof File !== 'undefined' && v instanceof File && v.size > 0)
    } else {
      const body = (await req.json().catch(() => null)) as {
        requestId?: string
        reply?: string
      } | null
      requestId = String(body?.requestId || '').trim()
      reply = String(body?.reply || '').trim().slice(0, 4000)
    }

    if (!requestId) {
      return NextResponse.json({ ok: false, error: 'Request id is required.' }, { status: 400 })
    }
    if (!reply && files.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Add a reply message and/or attach completed form files.' },
        { status: 400 }
      )
    }

    const existing = await getFundraisingChangeRequestById(requestId)
    if (!existing || existing.partnerId !== resolved.partner.id) {
      return NextResponse.json({ ok: false, error: 'Request not found.' }, { status: 404 })
    }
    if (existing.status !== 'awaiting_partner' && existing.status !== 'under_review') {
      return NextResponse.json(
        { ok: false, error: 'This request is not waiting for a partner reply.' },
        { status: 400 }
      )
    }

    let uploaded = existing.attachments || []
    if (files.length > 0) {
      const newFiles = await uploadChangeRequestAttachments({
        partnerId: resolved.partner.id,
        requestId,
        files,
      })
      uploaded = [...uploaded, ...newFiles].slice(-10)
    }

    const now = new Date().toISOString()
    const updated: FundraisingChangeRequest = {
      ...existing,
      partnerReply: reply || existing.partnerReply || '(Files attached — see attachments)',
      attachments: uploaded,
      status: 'partner_replied',
      updatedAt: now,
    }
    const saved = await upsertFundraisingChangeRequest(updated)
    if (!saved.ok) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 500 })
    }

    await notifyAdminsOfFundraisingChangeRequest({
      partner: resolved.partner,
      request: updated,
      isReply: true,
    })

    return NextResponse.json({
      ok: true,
      request: updated,
      message:
        files.length > 0
          ? 'Reply and files sent to SELPIC. Thank you.'
          : 'Reply sent to SELPIC. Thank you.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to send reply' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }
    const requests = await listFundraisingChangeRequestsFromDb({
      partnerId: resolved.partner.id,
      limit: 40,
    })
    return NextResponse.json({
      ok: true,
      requests,
      openCount: requests.filter((r) => isOpenFundraisingChangeRequestStatus(r.status)).length,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Failed to load change requests' },
      { status: 500 }
    )
  }
}

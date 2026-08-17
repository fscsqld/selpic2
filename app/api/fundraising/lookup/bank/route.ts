import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { LOOKUP_SESSION_COOKIE, resolveLookupSession } from '@/lib/fundraising/lookupAuth'
import { submitPartnerChangeRequest } from '@/lib/fundraising/submitChangeRequest'

/**
 * Partners cannot save Official Grant Account from Lookup.
 * Use POST /api/fundraising/lookup/change-requests for intake tickets.
 */
export async function PUT() {
  return NextResponse.json(
    {
      ok: false,
      error:
        'Official Grant Account details can only be updated by SELPIC. Submit a change request from your dashboard, or reply to your partnership email.',
    },
    { status: 405 }
  )
}

/** Alias → creates a grant_account change request (message only). */
export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, string> | null
    const result = await submitPartnerChangeRequest({
      partner: resolved.partner,
      kind: 'grant_account',
      message: body?.note || body?.message,
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

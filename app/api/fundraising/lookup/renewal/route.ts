import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import {
  LOOKUP_SESSION_COOKIE,
  resolveLookupSession,
  buildPartnerLookupUrl,
  ensurePartnerLookupToken,
} from '@/lib/fundraising/lookupAuth'
import { upsertFundraisingPartnerRow, loadFundraisingSettingsFromDb } from '@/lib/fundraising/persistence'
import { extendPartnershipTerm, formatTermDate } from '@/lib/fundraising/partnershipTerm'
import { issueFundraisingDocuments } from '@/lib/fundraising/issueDocuments'

/**
 * Partner Lookup: confirm or decline annual partnership renewal.
 * wants_renew → extend term +1 year automatically and email D20 confirmation.
 * declines → record intent and email D21 non-renewal acknowledgement (incl. AU data handling).
 */
export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { intent?: string } | null
    const intent = body?.intent === 'declines' ? 'declines' : body?.intent === 'wants_renew' ? 'wants_renew' : null
    if (!intent) {
      return NextResponse.json({ ok: false, error: 'intent must be wants_renew or declines' }, { status: 400 })
    }

    let partner = resolved.partner
    if (partner.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'Partnership is not active.' }, { status: 400 })
    }

    const settings = await loadFundraisingSettingsFromDb()
    const now = new Date().toISOString()

    if (intent === 'wants_renew') {
      const patch = extendPartnershipTerm(partner, settings, now)
      partner = ensurePartnerLookupToken({
        ...partner,
        ...patch,
        renewalIntent: 'wants_renew',
        updatedAt: now,
      })
    } else {
      partner = {
        ...partner,
        renewalIntent: 'declines',
        updatedAt: now,
      }
    }

    const saved = await upsertFundraisingPartnerRow(partner)
    if (!saved.ok) {
      return NextResponse.json({ ok: false, error: saved.error }, { status: 500 })
    }

    if (partner.contactEmail) {
      const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
      const termEndsAt = partner.termEndsAt || ''
      try {
        if (intent === 'wants_renew') {
          await issueFundraisingDocuments({
            types: ['D20'],
            partner,
            settings,
            extra: {
              termEndsAt,
              termEndsAtDisplay: formatTermDate(termEndsAt),
              lookupUrl,
              promoCode: partner.linkedPromoCode,
            },
            email: true,
          })
        } else {
          await issueFundraisingDocuments({
            types: ['D21'],
            partner,
            settings,
            extra: {
              termEndsAt,
              termEndsAtDisplay: formatTermDate(termEndsAt),
              lookupUrl,
              promoCode: partner.linkedPromoCode,
            },
            email: true,
          })
        }
      } catch (e) {
        console.error(
          `[lookup/renewal] ${intent === 'wants_renew' ? 'D20' : 'D21'} email failed`,
          e
        )
      }
    }

    return NextResponse.json({
      ok: true,
      intent,
      termEndsAt: partner.termEndsAt || null,
      message:
        intent === 'wants_renew'
          ? 'Thank you — your partnership term has been extended for another year. A confirmation email is on its way.'
          : 'We have recorded that you prefer not to renew. An acknowledgement email explaining access and record handling is on its way. SELPIC may contact you before suspending your code.',
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Renewal update failed' },
      { status: 500 }
    )
  }
}

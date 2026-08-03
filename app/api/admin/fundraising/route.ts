import { NextResponse } from 'next/server'

import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import {
  listFundraisingDocumentsFromDb,
  listFundraisingPartnersFromDb,
  listFundraisingSettlementsFromDb,
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
  upsertFundraisingDocumentRow,
  upsertFundraisingPartnerRow,
  upsertFundraisingSettlementRow,
  newFundraisingId,
} from '@/lib/fundraising/persistence'
import type {
  FundraisingDocument,
  FundraisingPartner,
  FundraisingSettlement,
  FundraisingSettings,
} from '@/lib/fundraising/types'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { FUNDRAISING_DOCUMENT_LABELS } from '@/lib/fundraising/types'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import {
  buildPartnerLookupUrl,
  ensurePartnerLookupToken,
  rotatePartnerLookupToken,
} from '@/lib/fundraising/lookupAuth'

export async function GET() {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [partners, documents, settlements, settings] = await Promise.all([
      listFundraisingPartnersFromDb(),
      listFundraisingDocumentsFromDb(),
      listFundraisingSettlementsFromDb(),
      loadFundraisingSettingsFromDb(),
    ])
    return NextResponse.json({ partners, documents, settlements, settings })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load fundraising data' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json().catch(() => null)) as
      | {
          partner?: FundraisingPartner
          document?: FundraisingDocument
          settlement?: FundraisingSettlement
          settings?: FundraisingSettings
          sendWelcomePack?: boolean
          resetLookupToken?: boolean
          emailAccessLink?: boolean
        }
      | null

    const results: Record<string, unknown> = {}

    if (body?.settings) {
      await saveFundraisingSettingsToDb(body.settings)
      results.settings = true
    }

    let partner = body?.partner
    if (partner) {
      if (body?.resetLookupToken) {
        partner = rotatePartnerLookupToken(partner)
      } else if (partner.status === 'active') {
        partner = ensurePartnerLookupToken(partner)
      }
      const r = await upsertFundraisingPartnerRow(partner)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      results.partner = partner
      if (partner.lookupToken) {
        results.lookupUrl = buildPartnerLookupUrl(partner.lookupToken)
      }
    }

    if (body?.document) {
      const r = await upsertFundraisingDocumentRow(body.document)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      results.document = body.document
    }
    if (body?.settlement) {
      const r = await upsertFundraisingSettlementRow(body.settlement)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      results.settlement = body.settlement
    }

    const shouldSendWelcome = Boolean(body?.sendWelcomePack && partner)
    const shouldEmailAccess = Boolean(body?.emailAccessLink && partner)
    if ((shouldSendWelcome || shouldEmailAccess) && partner) {
      if (!partner.linkedPromoCode) {
        return NextResponse.json({ error: 'Assign a promo code before sending partner emails.' }, { status: 400 })
      }
      partner = ensurePartnerLookupToken(partner)
      await upsertFundraisingPartnerRow(partner)
      results.partner = partner
      const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
      results.lookupUrl = lookupUrl
      const settings = body?.settings || (await loadFundraisingSettingsFromDb())
      const now = new Date().toISOString()
      const types = shouldSendWelcome ? (['D2', 'D3', 'D4'] as const) : (['D2'] as const)
      const sentDocs: FundraisingDocument[] = []
      for (const type of types) {
        const html = buildFundraisingDocumentHtml({
          type,
          partner,
          settings,
          extra: { lookupUrl },
        })
        const doc: FundraisingDocument = {
          id: newFundraisingId('fdoc'),
          type,
          partnerId: partner.id,
          status: 'Generated',
          title: FUNDRAISING_DOCUMENT_LABELS[type],
          htmlBody: html,
          createdAt: now,
          updatedAt: now,
        }
        const email = await sendEmailViaResendServer({
          to: partner.contactEmail,
          subject: `SELPIC Fundraising — ${doc.title} (${partner.organizationName})`,
          html,
        })
        doc.status = email.ok ? 'Sent' : 'Failed'
        doc.sentAt = email.ok ? new Date().toISOString() : undefined
        doc.updatedAt = new Date().toISOString()
        await upsertFundraisingDocumentRow(doc)
        sentDocs.push(doc)
      }
      results.welcomePack = sentDocs
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save fundraising data' },
      { status: 500 }
    )
  }
}

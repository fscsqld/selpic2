import { NextResponse } from 'next/server'

import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import {
  loadFundraisingSettingsFromDb,
  markFundraisingOutreachTargetConverted,
  newFundraisingId,
  newPartnerId,
  upsertFundraisingDocumentRow,
  upsertFundraisingPartnerRow,
} from '@/lib/fundraising/persistence'
import { normalizeFundraisingAcquisition } from '@/lib/fundraising/acquisition'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  FUNDRAISING_ORG_TYPE_LABELS,
  type FundraisingOrganizationType,
  type FundraisingPartner,
  type FundraisingDocument,
} from '@/lib/fundraising/types'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { notifyAdminsOfFundraisingApplication } from '@/lib/server/adminInboundNotify'
import { isSupabaseConfigured } from '@/lib/supabase/admin'
import { normalizeSampleKitRequest } from '@/lib/fundraising/sampleKitRequest'

const ORG_TYPES = new Set<string>(Object.keys(FUNDRAISING_ORG_TYPE_LABELS))

type ApplyBody = {
  organizationName?: string
  organizationType?: string
  contactName?: string
  contactEmail?: string
  phone?: string
  streetAddress?: string
  suburb?: string
  state?: string
  postcode?: string
  sampleKitRequested?: boolean
  sampleKitPrintName?: string
  /** Optional AI agent / UTM attribution — omit for organic apply */
  acquisition?: {
    ref?: string
    targetId?: string
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    capturedAt?: string
  }
}

function formatPostal(b: ApplyBody): string {
  return [b.streetAddress, b.suburb, b.state, b.postcode]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ')
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ApplyBody | null
    const organizationName = String(body?.organizationName || '').trim()
    const organizationType = String(body?.organizationType || '').trim() as FundraisingOrganizationType
    const contactName = String(body?.contactName || '').trim()
    const contactEmail = String(body?.contactEmail || '').trim().toLowerCase()
    const phone = String(body?.phone || '').trim()
    const streetAddress = String(body?.streetAddress || '').trim()
    const suburb = String(body?.suburb || '').trim()
    const state = String(body?.state || '').trim()
    const postcode = String(body?.postcode || '').trim()
    const sampleKit = normalizeSampleKitRequest({
      requested: body?.sampleKitRequested,
      printName: body?.sampleKitPrintName,
    })
    if (!sampleKit.ok) {
      return NextResponse.json({ ok: false, error: sampleKit.error }, { status: 400 })
    }

    const acquisition = normalizeFundraisingAcquisition(body?.acquisition)

    if (!organizationName || !contactName || !contactEmail || !phone) {
      return NextResponse.json({ ok: false, error: 'Please complete all required fields.' }, { status: 400 })
    }
    if (!contactEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!ORG_TYPES.has(organizationType)) {
      return NextResponse.json({ ok: false, error: 'Please select an organization type.' }, { status: 400 })
    }
    if (!streetAddress || !suburb || !state || !postcode) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a complete postal / delivery address.' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const settings = await loadFundraisingSettingsFromDb()
    const partnerId = newPartnerId(organizationName)
    const postalAddress = formatPostal({
      streetAddress,
      suburb,
      state,
      postcode,
    })

    const partner: FundraisingPartner = {
      id: partnerId,
      organizationName,
      organizationType,
      contactName,
      contactEmail,
      phone,
      streetAddress,
      suburb,
      state,
      postcode,
      postalAddress,
      sampleKitRequested: sampleKit.sampleKitRequested,
      sampleKitPrintName: sampleKit.sampleKitPrintName,
      sampleKitStatus: sampleKit.sampleKitStatus,
      linkedPromoCode: '',
      status: 'pending',
      ...(acquisition ? { acquisition } : {}),
      createdAt: now,
      updatedAt: now,
    }

    const html = buildFundraisingDocumentHtml({
      type: 'D1',
      partner,
      settings,
      extra: {
        organizationName,
        contactName,
        sampleKitRequested: sampleKit.sampleKitRequested ? 'yes' : 'no',
        sampleKitPrintName: sampleKit.sampleKitPrintName,
        postalAddress,
        organizationType: FUNDRAISING_ORG_TYPE_LABELS[organizationType],
      },
    })

    const docId = newFundraisingId('fdoc')
    const document: FundraisingDocument = {
      id: docId,
      type: 'D1',
      partnerId,
      status: 'Generated',
      title: FUNDRAISING_DOCUMENT_LABELS.D1,
      htmlBody: html,
      snapshotData: {
        organizationType,
        sampleKitRequested: sampleKit.sampleKitRequested,
        sampleKitPrintName: sampleKit.sampleKitPrintName,
      },
      createdAt: now,
      updatedAt: now,
    }

    let dbError: string | undefined
    if (isSupabaseConfigured()) {
      const p = await upsertFundraisingPartnerRow(partner)
      const d = await upsertFundraisingDocumentRow(document)
      if (!p.ok) dbError = p.error
      else if (!d.ok) dbError = d.error
      else if (acquisition?.targetId) {
        // Soft: missing target or table not migrated must not fail the application
        const conv = await markFundraisingOutreachTargetConverted({
          targetId: acquisition.targetId,
          partnerId,
        })
        if (!conv.ok) {
          console.warn('[fundraising/apply] outreach convert soft-fail:', conv.error)
        }
      }
    } else {
      dbError = 'Supabase not configured — partner saved for email only; run fundraising SQL migration for persistence.'
    }

    const emailSubject = `SELPIC Community Fundraising — Application Received (${organizationName})`
    // Registration acknowledgement: full HTML body, no PDF (same as original apply email).
    const emailResult = await sendEmailViaResendServer({
      to: contactEmail,
      subject: emailSubject,
      html,
      replyTo: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
    })

    if (emailResult.ok) {
      document.status = 'Sent'
      document.sentAt = new Date().toISOString()
      document.updatedAt = document.sentAt
      if (isSupabaseConfigured()) {
        await upsertFundraisingDocumentRow(document)
      }
    } else {
      document.status = 'Failed'
      document.updatedAt = new Date().toISOString()
      if (isSupabaseConfigured()) {
        await upsertFundraisingDocumentRow(document)
      }
    }

    const emailError = emailResult.ok ? undefined : emailResult.logMessage

    void notifyAdminsOfFundraisingApplication({
      id: partnerId,
      organizationName,
      organizationTypeLabel: FUNDRAISING_ORG_TYPE_LABELS[organizationType],
      contactName,
      contactEmail,
      phone,
      postalAddress,
      sampleKitRequested: sampleKit.sampleKitRequested,
      sampleKitPrintName: sampleKit.sampleKitPrintName,
    })

    return NextResponse.json({
      ok: true,
      partner,
      document,
      emailSent: emailResult.ok,
      emailError,
      dbPersisted: !dbError,
      dbError,
      message: emailResult.ok
        ? `Thank you for applying! We've sent a confirmation email to ${contactEmail}. Our team will review your application and send your code shortly.${
            sampleKit.sampleKitRequested
              ? ' We noted your personalised name-sticker sample request and will print it after review — it is not posted automatically with the application.'
              : ''
          }`
        : `Thank you for applying! We received your application, but the confirmation email could not be sent yet${emailError ? ` (${emailError})` : ''}. Our team will still review and contact you.`,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Application failed' },
      { status: 500 }
    )
  }
}

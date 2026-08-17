import { NextResponse } from 'next/server'

import { requireSupabaseAdminUser } from '@/lib/supabase/requireSupabaseAdmin'
import {
  listFundraisingDocumentsFromDb,
  listFundraisingGrantAccountEventsFromDb,
  listFundraisingChangeRequestsFromDb,
  listFundraisingPartnersFromDb,
  listFundraisingSettlementsFromDb,
  loadFundraisingSettingsFromDb,
  saveFundraisingSettingsToDb,
  upsertFundraisingDocumentRow,
  upsertFundraisingPartnerRow,
  upsertFundraisingSettlementRow,
  deleteFundraisingPartnerAndRelated,
  insertFundraisingGrantAccountEvent,
} from '@/lib/fundraising/persistence'
import {
  FUNDRAISING_WELCOME_PACK_ORDER,
  type FundraisingDocument,
  type FundraisingDocumentType,
  type FundraisingGrantAccountEvent,
  type FundraisingPartner,
  type FundraisingSettlement,
  type FundraisingSettings,
} from '@/lib/fundraising/types'
import {
  buildPartnerLookupUrl,
  ensurePartnerLookupToken,
  rotatePartnerLookupToken,
} from '@/lib/fundraising/lookupAuth'
import { issueFundraisingDocuments } from '@/lib/fundraising/issueDocuments'
import { buildFundraisingDocCoverHtml } from '@/lib/fundraising/documents'
import { fundraisingDocNeedsPdfAttachment } from '@/lib/fundraising/pdfAttachmentPolicy'
import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import {
  applyStatusWithLegalRetention,
  clearLegalRetention,
  ensureLegalRetention,
  isEndedPartnershipStatus,
} from '@/lib/fundraising/legalRetention'
import { digitsOnlyAbn, formatAbnDisplay } from '@/lib/fundraising/abn'
import { newFundraisingId } from '@/lib/fundraising/ids'
import {
  notifyAdminsOfGrantAccountUpdate,
  sendPartnerGrantAccountConfirmation,
} from '@/lib/server/adminInboundNotify'

function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '')
}

function normalizePartnerBank(p: {
  bankName?: string
  accountName?: string
  bsb?: string
  accountNumber?: string
  abn?: string
}) {
  const bsbDigits = digitsOnly(p.bsb || '')
  const accountDigits = digitsOnly(p.accountNumber || '')
  const abnDigits = digitsOnlyAbn(p.abn || '')
  return {
    bankName: String(p.bankName || '').trim(),
    accountName: String(p.accountName || '').trim(),
    bsb: bsbDigits.length === 6 ? `${bsbDigits.slice(0, 3)}-${bsbDigits.slice(3)}` : String(p.bsb || '').trim(),
    accountNumber: accountDigits || String(p.accountNumber || '').trim(),
    abn: abnDigits.length === 11 ? formatAbnDisplay(abnDigits) : String(p.abn || '').trim(),
  }
}

function bankSnapshotKey(p: ReturnType<typeof normalizePartnerBank>): string {
  return [
    p.bankName,
    p.accountName,
    digitsOnly(p.bsb),
    digitsOnly(p.accountNumber),
    digitsOnlyAbn(p.abn),
  ].join('|')
}

function hadCompleteGrantAccount(p: ReturnType<typeof normalizePartnerBank>): boolean {
  return Boolean(
    p.accountName &&
      digitsOnly(p.bsb).length === 6 &&
      digitsOnly(p.accountNumber).length >= 6 &&
      digitsOnlyAbn(p.abn).length === 11
  )
}

type LifecycleAction =
  | {
      kind:
        | 'welcome_pack'
        | 'access_link'
        | 'd5_dispatch'
        | 'd7_mid'
        | 'd8_rate'
        | 'd12_status'
        | 'd11_rcti'
        | 'd18_code'
        | 'd19_renewal'
        | 'd20_renewed'
        | 'd21_declined'
      period?: string
      oldDonationRate?: number
      oldPromoCode?: string
      netSales?: number
      commission?: number
      orderCount?: number
      email?: boolean
    }
  | { kind: 'resend'; documentId: string }
  | { kind: 'd14_d15_pack'; period?: string; netSales?: number; commission?: number; email?: boolean }

export async function GET() {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [partners, documents, settlements, settings, grantAccountEvents, changeRequests] =
      await Promise.all([
        listFundraisingPartnersFromDb(),
        listFundraisingDocumentsFromDb(),
        listFundraisingSettlementsFromDb(),
        loadFundraisingSettingsFromDb(),
        listFundraisingGrantAccountEventsFromDb(),
        listFundraisingChangeRequestsFromDb({ limit: 200 }),
      ])
    return NextResponse.json({
      partners,
      documents,
      settlements,
      settings,
      grantAccountEvents,
      changeRequests,
    })
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
          lifecycle?: LifecycleAction
          /** When admin changes Official Grant Account via Partner Registry */
          changeReason?: string
          changedByLabel?: string
        }
      | null

    const results: Record<string, unknown> = {}

    if (body?.settings) {
      await saveFundraisingSettingsToDb(body.settings)
      results.settings = true
    }

    let partner = body?.partner
    if (partner) {
      const existingRows = await listFundraisingPartnersFromDb()
      const existingDb = existingRows.find((p) => p.id === partner!.id)
      const incomingHasBank =
        Boolean(String(partner.accountName || '').trim()) ||
        Boolean(String(partner.bsb || '').replace(/\D/g, '')) ||
        Boolean(String(partner.accountNumber || '').replace(/\D/g, '')) ||
        Boolean(String(partner.abn || '').replace(/\D/g, ''))
      if (existingDb && !incomingHasBank) {
        partner = {
          ...partner,
          bankName: existingDb.bankName || partner.bankName,
          accountName: existingDb.accountName || partner.accountName,
          bsb: existingDb.bsb || partner.bsb,
          accountNumber: existingDb.accountNumber || partner.accountNumber,
          abn: existingDb.abn || partner.abn,
        }
      }

      const previousBank = normalizePartnerBank(existingDb || {})
      const nextBank = normalizePartnerBank(partner)
      const bankChanged = bankSnapshotKey(previousBank) !== bankSnapshotKey(nextBank)
      if (bankChanged && (nextBank.accountName || nextBank.bsb || nextBank.accountNumber || nextBank.abn)) {
        partner = {
          ...partner,
          bankName: nextBank.bankName,
          accountName: nextBank.accountName,
          bsb: nextBank.bsb,
          accountNumber: nextBank.accountNumber,
          abn: nextBank.abn,
        }
      }

      // Preserve Lookup token unless Reset Access Link was requested
      if (existingDb?.lookupToken && !body?.resetLookupToken) {
        partner = {
          ...partner,
          lookupToken: existingDb.lookupToken,
          lookupTokenCreatedAt: existingDb.lookupTokenCreatedAt || partner.lookupTokenCreatedAt,
        }
      }
      if (body?.resetLookupToken) {
        partner = rotatePartnerLookupToken(partner)
      } else if (partner.status === 'active') {
        partner = ensurePartnerLookupToken(partner)
      }
      if (partner.sampleKitRequested && !partner.sampleKitStatus) {
        partner = { ...partner, sampleKitStatus: 'requested' }
      }

      const settingsForRetention =
        body?.settings || (await loadFundraisingSettingsFromDb())
      if (isEndedPartnershipStatus(partner.status)) {
        const newlyEnding = Boolean(existingDb && !isEndedPartnershipStatus(existingDb.status))
        partner = newlyEnding
          ? applyStatusWithLegalRetention(
              { ...partner, status: existingDb!.status },
              partner.status,
              settingsForRetention
            )
          : ensureLegalRetention(partner, settingsForRetention)
      } else if (partner.retentionArchiveClass || partner.retentionUntil || partner.partnershipEndedAt) {
        partner = { ...partner, ...clearLegalRetention() }
      }

      const r = await upsertFundraisingPartnerRow(partner)
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
      results.partner = partner
      if (partner.lookupToken) {
        results.lookupUrl = buildPartnerLookupUrl(partner.lookupToken)
      }

      // Official Grant Account: only admins mutate; write durable audit + D16/D17
      if (bankChanged) {
        const updatedAt = new Date().toISOString()
        const kind = hadCompleteGrantAccount(previousBank) ? 'updated' : 'registered'
        const settingsForMail = body?.settings || (await loadFundraisingSettingsFromDb())
        const emails: FundraisingGrantAccountEvent['emails'] = []

        const partnerMail = await sendPartnerGrantAccountConfirmation({
          partner,
          settings: settingsForMail,
          kind,
          updatedAt,
        })
        emails.push({
          channel: 'partner_grant_account_confirm',
          to: partner.contactEmail,
          subject: partnerMail.subject,
          status: partnerMail.ok ? 'sent' : 'failed',
          error: partnerMail.ok ? undefined : partnerMail.logMessage,
          sentAt: new Date().toISOString(),
        })

        const adminMail = await notifyAdminsOfGrantAccountUpdate({
          partner,
          settings: settingsForMail,
          kind,
          updatedAt,
        })
        emails.push({
          channel: 'admin_grant_account_alert',
          to: adminMail.to.join(', '),
          subject: adminMail.subject,
          status: adminMail.ok ? 'sent' : 'failed',
          error: adminMail.ok ? undefined : adminMail.logMessage,
          sentAt: new Date().toISOString(),
        })

        const event: FundraisingGrantAccountEvent = {
          id: newFundraisingId('fgae'),
          partnerId: partner.id,
          organizationName: partner.organizationName,
          kind,
          changedBy: 'admin',
          changedAt: updatedAt,
          previous: previousBank,
          next: {
            bankName: partner.bankName,
            accountName: partner.accountName,
            bsb: partner.bsb,
            accountNumber: partner.accountNumber,
            abn: partner.abn,
          },
          emails,
        }
        const audit = await insertFundraisingGrantAccountEvent(event)
        if (!audit.ok) {
          console.warn('[fundraising] admin grant account audit insert failed:', audit.error)
        }
        results.grantAccountEvent = {
          id: event.id,
          kind,
          auditSaved: audit.ok,
          changeReason: String(body?.changeReason || '').trim() || undefined,
          changedByLabel: String(body?.changedByLabel || '').trim() || undefined,
        }
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

    const settings = body?.settings || (await loadFundraisingSettingsFromDb())

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
      const types = (
        shouldSendWelcome ? [...FUNDRAISING_WELCOME_PACK_ORDER] : (['D2'] as FundraisingDocumentType[])
      ) as FundraisingDocumentType[]
      // issueFundraisingDocuments emails sequentially in `types` order (D2 → D3 → D4).
      const sentDocs = await issueFundraisingDocuments({
        types,
        partner,
        settings,
        extra: { lookupUrl },
        email: true,
      })
      results.welcomePack = sentDocs
    }

    // Explicit lifecycle actions (D5 / D7 / D8 / D12 / D14-D15 / resend)
    if (body?.lifecycle) {
      const life = body.lifecycle
      if (life.kind === 'resend') {
        const docs = await listFundraisingDocumentsFromDb()
        const doc = docs.find((d) => d.id === life.documentId)
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        const partners = await listFundraisingPartnersFromDb()
        const p = doc.partnerId ? partners.find((x) => x.id === doc.partnerId) : partner
        if (!p?.contactEmail) return NextResponse.json({ error: 'Partner email required' }, { status: 400 })
        const htmlBody =
          typeof body?.document?.htmlBody === 'string' && body.document.htmlBody.trim()
            ? body.document.htmlBody
            : doc.htmlBody
        doc.htmlBody = htmlBody
        let attachments: { filename: string; content: string; contentType: string }[] | undefined
        const needsPdf = fundraisingDocNeedsPdfAttachment(doc.type)
        if (needsPdf) {
          try {
            const { buildFundraisingDocPdfBase64, fundraisingPdfFilename } = await import(
              '@/lib/fundraising/htmlToSimplePdfServer'
            )
            attachments = [
              {
                filename: fundraisingPdfFilename(doc.type, p.organizationName, doc.period),
                content: buildFundraisingDocPdfBase64({
                  title: doc.title,
                  type: doc.type,
                  organizationName: p.organizationName,
                  html: htmlBody,
                }),
                contentType: 'application/pdf',
              },
            ]
          } catch (e) {
            console.error('[fundraising resend] PDF attachment failed:', e)
          }
        }
        const email = await sendEmailViaResendServer({
          to: p.contactEmail,
          subject: `SELPIC Fundraising — ${doc.title} (${p.organizationName})`,
          html: needsPdf
            ? buildFundraisingDocCoverHtml({
                contactName: p.contactName,
                organizationName: p.organizationName,
                documentTitle: doc.title,
                documentType: doc.type,
                period: doc.period,
              })
            : htmlBody,
          ...(attachments ? { attachments } : {}),
        })
        doc.status = email.ok ? 'Sent' : 'Failed'
        doc.sentAt = email.ok ? new Date().toISOString() : doc.sentAt
        doc.updatedAt = new Date().toISOString()
        await upsertFundraisingDocumentRow(doc)
        results.resend = doc
      } else if (partner) {
        if (life.kind === 'd5_dispatch') {
          partner = { ...partner, sampleKitStatus: 'dispatched', updatedAt: new Date().toISOString() }
          await upsertFundraisingPartnerRow(partner)
          results.partner = partner
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D5'],
            partner,
            settings,
            email: life.email !== false,
          })
        } else if (life.kind === 'd7_mid') {
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D7'],
            partner,
            settings,
            period: life.period,
            extra: {
              netSales: life.netSales,
              commission: life.commission,
              orderCount: life.orderCount,
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd8_rate') {
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D8'],
            partner,
            settings,
            extra: {
              oldDonationRate: life.oldDonationRate,
              effectiveFrom: new Date().toISOString().slice(0, 10),
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd18_code') {
          if (!partner.linkedPromoCode) {
            return NextResponse.json({ error: 'New Partner Community Code is required.' }, { status: 400 })
          }
          const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D18'],
            partner,
            settings,
            extra: {
              oldPromoCode: life.oldPromoCode,
              promoCode: partner.linkedPromoCode,
              lookupUrl,
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd19_renewal') {
          const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
          const termEndsAt = partner.termEndsAt || ''
          const termEndsAtDisplay = termEndsAt
            ? new Date(termEndsAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D19'],
            partner,
            settings,
            extra: {
              termEndsAt,
              termEndsAtDisplay,
              lookupUrl,
            },
            email: life.email !== false,
          })
          partner = {
            ...partner,
            renewalNoticeSentAt: new Date().toISOString(),
            renewalIntent: partner.renewalIntent || 'pending',
            updatedAt: new Date().toISOString(),
          }
          await upsertFundraisingPartnerRow(partner)
          results.partner = partner
        } else if (life.kind === 'd20_renewed') {
          const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
          const termEndsAt = partner.termEndsAt || ''
          const termEndsAtDisplay = termEndsAt
            ? new Date(termEndsAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D20'],
            partner,
            settings,
            extra: {
              termEndsAt,
              termEndsAtDisplay,
              lookupUrl,
              promoCode: partner.linkedPromoCode,
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd21_declined') {
          const lookupUrl = partner.lookupToken ? buildPartnerLookupUrl(partner.lookupToken) : ''
          const termEndsAt = partner.termEndsAt || ''
          const termEndsAtDisplay = termEndsAt
            ? new Date(termEndsAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : '—'
          partner = {
            ...partner,
            renewalIntent: 'declines',
            updatedAt: new Date().toISOString(),
          }
          await upsertFundraisingPartnerRow(partner)
          results.partner = partner
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D21'],
            partner,
            settings,
            extra: {
              termEndsAt,
              termEndsAtDisplay,
              lookupUrl,
              promoCode: partner.linkedPromoCode,
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd12_status') {
          const types: FundraisingDocumentType[] =
            partner.status === 'terminated' ? ['D12', 'D13'] : ['D12']
          results.lifecycleDocs = await issueFundraisingDocuments({
            types,
            partner,
            settings,
            period: life.period,
            extra: {
              netSales: life.netSales,
              commission: life.commission,
            },
            email: life.email !== false,
          })
        } else if (life.kind === 'd11_rcti') {
          if (!partner.enableRcti) {
            return NextResponse.json({ error: 'RCTI (D11) is disabled for this partner.' }, { status: 400 })
          }
          results.lifecycleDocs = await issueFundraisingDocuments({
            types: ['D11'],
            partner,
            settings,
            period: life.period,
            extra: { commission: life.commission, netSales: life.netSales },
            email: life.email !== false,
          })
        } else if (life.kind === 'd14_d15_pack') {
          const docs = await issueFundraisingDocuments({
            types: ['D14', 'D15'],
            partner,
            settings,
            period: life.period,
            extra: {
              netSales: life.netSales,
              commission: life.commission,
              paymentReference: life.period
                ? `SELPIC-${partner.linkedPromoCode}-${life.period}`
                : undefined,
            },
            email: Boolean(life.email),
          })
          results.lifecycleDocs = docs
          results.downloadPack = docs.map((d) => ({ id: d.id, type: d.type, title: d.title, htmlBody: d.htmlBody }))
        } else if (life.kind === 'welcome_pack' || life.kind === 'access_link') {
          // handled above via legacy flags; ignore duplicate
        }
      } else {
        return NextResponse.json({ error: 'Partner required for lifecycle action' }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save fundraising data' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const user = await requireSupabaseAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(req.url)
    let partnerId = url.searchParams.get('partnerId') || ''
    if (!partnerId) {
      const body = (await req.json().catch(() => null)) as { partnerId?: string } | null
      partnerId = String(body?.partnerId || '').trim()
    }
    if (!partnerId) {
      return NextResponse.json({ error: 'partnerId is required' }, { status: 400 })
    }

    const r = await deleteFundraisingPartnerAndRelated(partnerId)
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 })
    return NextResponse.json({ ok: true, deletedPartnerId: partnerId })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete partner' },
      { status: 500 }
    )
  }
}

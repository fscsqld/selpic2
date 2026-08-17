import 'server-only'

import { sendEmailViaResendServer } from '@/lib/email/resendServer'
import { buildFundraisingDocCoverHtml } from '@/lib/fundraising/documents'
import { generateFundraisingDoc } from '@/lib/fundraising/generateDoc'
import {
  buildFundraisingDocPdfBase64,
  fundraisingPdfFilename,
} from '@/lib/fundraising/htmlToSimplePdfServer'
import { buildD22FillablePdfBase64 } from '@/lib/fundraising/d22FillablePdf'
import { fundraisingDocNeedsPdfAttachment } from '@/lib/fundraising/pdfAttachmentPolicy'
import { upsertFundraisingDocumentRow } from '@/lib/fundraising/persistence'
import { formatAbnDisplay, digitsOnlyAbn } from '@/lib/fundraising/abn'
import { resolvePartnerAbn } from '@/lib/fundraising/documents'
import { maskedAccountValue, maskedBsbValue } from '@/lib/fundraising/mask'
import { COMPANY_CONTACT, COMPANY_LEGAL } from '@/lib/companyLegal'
import type {
  FundraisingDocument,
  FundraisingDocumentType,
  FundraisingPartner,
  FundraisingSettings,
  FundraisingSettlement,
} from '@/lib/fundraising/types'

function pdfAttachmentForDoc(
  doc: FundraisingDocument,
  partner: FundraisingPartner,
  extra?: Record<string, string | number | undefined>
) {
  try {
    let content: string
    if (doc.type === 'D22') {
      const abnRaw = resolvePartnerAbn(partner, extra)
      const abnDigits = digitsOnlyAbn(abnRaw)
      content = buildD22FillablePdfBase64({
        organizationName: partner.organizationName,
        contactName: partner.contactName,
        partnerId: partner.id,
        promoCode: partner.linkedPromoCode,
        changeRequestId: extra?.changeRequestId !== undefined ? String(extra.changeRequestId) : undefined,
        kindLabel:
          extra?.changeRequestKindLabel !== undefined
            ? String(extra.changeRequestKindLabel)
            : undefined,
        partnerMessage:
          extra?.partnerMessage !== undefined ? String(extra.partnerMessage) : undefined,
        maskedAbn: abnDigits.length === 11 ? formatAbnDisplay(abnDigits) : abnRaw || undefined,
        maskedBsb: partner.bsb ? maskedBsbValue(partner.bsb) : undefined,
        maskedAccount: partner.accountNumber
          ? maskedAccountValue(partner.accountNumber)
          : undefined,
        payeeAccountName: partner.accountName,
        companyName: COMPANY_LEGAL.companyName,
        supportEmail: COMPANY_CONTACT.email,
      })
    } else {
      content = buildFundraisingDocPdfBase64({
        title: doc.title,
        type: doc.type,
        organizationName: partner.organizationName,
        html: doc.htmlBody,
      })
    }
    return {
      filename: fundraisingPdfFilename(doc.type, partner.organizationName, doc.period),
      content,
      contentType: 'application/pdf' as const,
    }
  } catch (e) {
    console.error('[issueFundraisingDocuments] PDF attachment failed:', e)
    return null
  }
}

/** Create, optionally email, and persist one or more fundraising documents. */
export async function issueFundraisingDocuments(input: {
  types: FundraisingDocumentType[]
  partner: FundraisingPartner
  settings: FundraisingSettings
  settlement?: FundraisingSettlement | null
  period?: string
  extra?: Record<string, string | number | undefined>
  email?: boolean
}): Promise<FundraisingDocument[]> {
  const out: FundraisingDocument[] = []
  for (const type of input.types) {
    const doc = generateFundraisingDoc(type, {
      partner: input.partner,
      settings: input.settings,
      settlement: input.settlement,
      period: input.period,
      extra: input.extra,
      status: 'Generated',
    })
    if (input.email !== false && input.partner.contactEmail) {
      const needsPdf = fundraisingDocNeedsPdfAttachment(doc.type)
      const useCoverEmail = needsPdf || doc.type === 'D22'
      const pdf = needsPdf ? pdfAttachmentForDoc(doc, input.partner, input.extra) : null
      const html = useCoverEmail
        ? buildFundraisingDocCoverHtml({
            contactName: input.partner.contactName,
            organizationName: input.partner.organizationName,
            documentTitle: doc.title,
            documentType: doc.type,
            period: doc.period,
            partnerMessage:
              input.extra?.partnerMessage !== undefined
                ? String(input.extra.partnerMessage)
                : undefined,
            changeRequestId:
              input.extra?.changeRequestId !== undefined
                ? String(input.extra.changeRequestId)
                : undefined,
          })
        : doc.htmlBody
      const email = await sendEmailViaResendServer({
        to: input.partner.contactEmail,
        subject: `SELPIC Fundraising — ${doc.title} (${input.partner.organizationName})`,
        html,
        ...(pdf ? { attachments: [pdf] } : {}),
      })
      doc.status = email.ok ? 'Sent' : 'Failed'
      doc.sentAt = email.ok ? new Date().toISOString() : undefined
      doc.updatedAt = new Date().toISOString()
    }
    await upsertFundraisingDocumentRow(doc)
    out.push(doc)
  }
  return out
}

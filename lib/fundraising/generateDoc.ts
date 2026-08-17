import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { newFundraisingId } from '@/lib/fundraising/ids'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  type FundraisingDocument,
  type FundraisingDocumentStatus,
  type FundraisingDocumentType,
  type FundraisingPartner,
  type FundraisingSettings,
  type FundraisingSettlement,
} from '@/lib/fundraising/types'
import { resolvePartnerGrantRates } from '@/lib/fundraising/partnerRates'

export type GenerateFundraisingDocInput = {
  partner?: FundraisingPartner | null
  settings: FundraisingSettings
  settlement?: FundraisingSettlement | null
  period?: string
  extra?: Record<string, string | number | undefined>
  id?: string
  status?: FundraisingDocumentStatus
}

/**
 * Unified D1–D22 document builder. Keeps camelCase FundraisingDocument + htmlBody
 * (jsonb payload shape). Does not email or persist — callers do that.
 */
export function generateFundraisingDoc(
  docCode: FundraisingDocumentType,
  input: GenerateFundraisingDocInput
): FundraisingDocument {
  const partner = input.partner
  const settlement = input.settlement
  const period = input.period || settlement?.period
  const rates = resolvePartnerGrantRates(partner, input.settings)
  const extra: Record<string, string | number | undefined> = {
    promoCode: partner?.linkedPromoCode,
    donationRate: rates.donationRate,
    parentDisplayRate: rates.parentDisplayRate,
    postalAddress: partner?.postalAddress,
    sampleKitRequested: partner?.sampleKitRequested ? 'yes' : undefined,
    netSales: settlement?.netSales,
    commission: settlement?.commissionAmount,
    orderCount: settlement?.orderCount,
    paymentReference: settlement?.paymentReference,
    paidAt: settlement?.paidAt,
    period: period || undefined,
    ...input.extra,
  }

  const htmlBody = buildFundraisingDocumentHtml({
    type: docCode,
    partner,
    settings: input.settings,
    period: period || undefined,
    extra,
  })

  const now = new Date().toISOString()
  return {
    id: input.id || newFundraisingId('fdoc'),
    type: docCode,
    partnerId: partner?.id,
    period: period || undefined,
    status: input.status || 'Generated',
    title: FUNDRAISING_DOCUMENT_LABELS[docCode],
    htmlBody,
    snapshotData: {
      recipientEmail: partner?.contactEmail,
      partnerName: partner?.contactName,
      orgName: partner?.organizationName,
      promoCode: partner?.linkedPromoCode,
      period: period || undefined,
      netSales: extra.netSales,
      commission: extra.commission,
      bankReference: extra.paymentReference,
      settlementId: settlement?.id,
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function downloadFundraisingHtml(filename: string, html: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`
  a.click()
  URL.revokeObjectURL(url)
}

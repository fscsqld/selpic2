import type { FundraisingPartner, FundraisingSettings } from '@/lib/fundraising/types'
import { DEFAULT_FUNDRAISING_SETTINGS } from '@/lib/fundraising/types'

/** Stable id — never persisted as a real partner; Documents preview only. */
export const SAMPLE_PARTNER_ID = '__sample_partner__'

export function createSampleFundraisingPartner(): FundraisingPartner {
  const now = new Date().toISOString()
  return {
    id: SAMPLE_PARTNER_ID,
    organizationName: 'Sample Primary School P&C',
    organizationType: 'primary_school',
    contactName: 'Alex Partner',
    contactEmail: 'partner.sample@example.com',
    phone: '0400 000 000',
    streetAddress: '1 Example Street',
    suburb: 'Melbourne',
    state: 'VIC',
    postcode: '3000',
    postalAddress: '1 Example Street, Melbourne VIC 3000',
    sampleKitRequested: true,
    linkedPromoCode: 'SAMPLE-CODE',
    status: 'active',
    lookupToken: 'samplepreviewtoken00000000000000000001',
    lookupTokenCreatedAt: now,
    bankName: 'Sample Bank',
    accountName: 'Sample Primary School P&C',
    bsb: '000-000',
    accountNumber: '12345678',
    abn: '51 824 753 556',
    notes: 'Preview-only sample partner (not saved to Supabase).',
    createdAt: now,
    updatedAt: now,
  }
}

/** Extra fields so D1–D15 templates render with realistic placeholder numbers. */
export function sampleDocumentExtras(
  partner: FundraisingPartner,
  settings: FundraisingSettings,
  period?: string
): Record<string, string | number | undefined> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://www.selpic.com.au'
  const token = partner.lookupToken || 'samplepreviewtoken'
  const net = 1250
  const rate = settings.donationRate ?? DEFAULT_FUNDRAISING_SETTINGS.donationRate
  return {
    organizationName: partner.organizationName,
    contactName: partner.contactName,
    promoCode: partner.linkedPromoCode,
    postalAddress: partner.postalAddress,
    donationRate: rate,
    parentDisplayRate: settings.parentDisplayRate,
    sampleKitRequested: partner.sampleKitRequested ? 'yes' : undefined,
    lookupUrl: `${base}/fundraising/lookup?token=${encodeURIComponent(token)}`,
    period: period || undefined,
    netSales: net.toFixed(2),
    commission: ((net * rate) / 100).toFixed(2),
    orderCount: 18,
    oldDonationRate: String(Math.max(5, rate - 5)),
    effectiveFrom: new Date().toISOString().slice(0, 10),
    paymentReference: `SELPIC-${partner.linkedPromoCode || 'CODE'}-${period || 'FY2025-26-Q1'}`,
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'updated',
    partnersUrl: `${base}/admin/fundraising/partners`,
    payoutUrl: `${base}/admin/fundraising/payout`,
  }
}

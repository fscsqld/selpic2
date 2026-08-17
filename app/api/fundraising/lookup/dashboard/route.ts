import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  LOOKUP_SESSION_COOKIE,
  resolveLookupSession,
} from '@/lib/fundraising/lookupAuth'
import {
  listFundraisingChangeRequestsFromDb,
  listFundraisingDocumentsFromDb,
  listFundraisingSettlementsFromDb,
  loadFundraisingSettingsFromDb,
} from '@/lib/fundraising/persistence'
import { computeFundraisingNetSales, periodBounds } from '@/lib/fundraising/netSales'
import {
  currentAuFyQuarterPeriodId,
  displayFundraisingPeriod,
  getNextGrantTransferInfo,
  payoutDueDisplayForPeriod,
} from '@/lib/fundraising/auFinancialQuarter'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { buildFamilyFlyerHtml } from '@/lib/fundraising/familyFlyer'
import { maskAccount, maskBsb } from '@/lib/fundraising/mask'
import { resolvePartnerGrantRates } from '@/lib/fundraising/partnerRates'
import type { OrderRecord } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const jar = await cookies()
    const sessionId = jar.get(LOOKUP_SESSION_COOKIE)?.value || ''
    const resolved = await resolveLookupSession(sessionId)
    if (!resolved) {
      return NextResponse.json({ ok: false, error: 'Session expired. Please verify again.' }, { status: 401 })
    }

    const { partner } = resolved
    const settings = await loadFundraisingSettingsFromDb()
    const rates = resolvePartnerGrantRates(partner, settings)
    // Prefer persisted partner fields (Admin Save writes these); never fall back to global
    // settings when the partner row already has an explicit grant %.
    const rate =
      partner.donationRate != null && Number.isFinite(Number(partner.donationRate))
        ? Number(partner.donationRate)
        : rates.donationRate
    const parentDisplayRate =
      partner.parentDisplayRate != null && Number.isFinite(Number(partner.parentDisplayRate))
        ? Number(partner.parentDisplayRate)
        : rates.parentDisplayRate

    if (process.env.NODE_ENV === 'development') {
      console.info('[lookup/dashboard] grant rates', {
        partnerId: partner.id,
        partnerDonationRate: partner.donationRate,
        partnerParentDisplayRate: partner.parentDisplayRate,
        resolved: rates,
        serving: { rate, parentDisplayRate },
        settingsDonation: settings.donationRate,
      })
    }

    let orders: OrderRecord[] = []
    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdmin()
      const { data } = await admin
        .from('orders')
        .select('payload')
        .order('created_at', { ascending: false })
        .limit(2000)
      orders = (data || [])
        .map((r) => r.payload as OrderRecord)
        .filter(Boolean)
    }

    const allTime = computeFundraisingNetSales({
      orders,
      promoCode: partner.linkedPromoCode,
      periodStartIso: '2000-01-01T00:00:00.000Z',
      periodEndIso: new Date().toISOString(),
      donationRatePercent: rate,
    })

    const currentPeriodId = currentAuFyQuarterPeriodId()
    const currentBounds = periodBounds(currentPeriodId)
    const currentQuarter = computeFundraisingNetSales({
      orders,
      promoCode: partner.linkedPromoCode,
      periodStartIso: currentBounds.startIso,
      periodEndIso: currentBounds.endIso,
      donationRatePercent: rate,
    })

    const settlements = (await listFundraisingSettlementsFromDb()).filter((s) => s.partnerId === partner.id)
    const changeRequests = await listFundraisingChangeRequestsFromDb({
      partnerId: partner.id,
      limit: 40,
    })
    const documents = (await listFundraisingDocumentsFromDb()).filter(
      (d) =>
        d.partnerId === partner.id &&
        d.status !== 'Archived' &&
        (d.type === 'D2' ||
          d.type === 'D3' ||
          d.type === 'D6' ||
          d.type === 'D8' ||
          d.type === 'D9' ||
          d.type === 'D10' ||
          d.type === 'D12' ||
          d.type === 'D13' ||
          d.type === 'D16' ||
          d.type === 'D18' ||
          d.type === 'D19' ||
          d.type === 'D20' ||
          d.type === 'D21' ||
          d.type === 'D22')
    )

    const shareCopy = buildFundraisingDocumentHtml({
      type: 'D6',
      partner,
      settings,
      extra: {
        donationRate: rate,
        parentDisplayRate,
      },
    })

    const flyerHtml = buildFamilyFlyerHtml({
      organizationName: partner.organizationName,
      promoCode: partner.linkedPromoCode,
      parentDisplayRate,
      donationRate: rate,
    })

    return NextResponse.json({
      ok: true,
      partner: {
        id: partner.id,
        organizationName: partner.organizationName,
        linkedPromoCode: partner.linkedPromoCode,
        status: partner.status,
        contactName: partner.contactName,
        bankMasked: `${maskBsb(partner.bsb)} / ${maskAccount(partner.accountNumber)}`,
        hasOfficialGrantAccount: Boolean(
          partner.accountName?.trim() &&
            partner.abn &&
            partner.bsb &&
            partner.accountNumber &&
            String(partner.abn).replace(/\D/g, '').length === 11 &&
            String(partner.bsb).replace(/\D/g, '').length >= 6 &&
            String(partner.accountNumber).replace(/\D/g, '').length >= 6
        ),
        bankName: partner.bankName || '',
        accountName: partner.accountName || '',
        bsb: partner.bsb || '',
        accountNumber: partner.accountNumber || '',
        abn: partner.abn || '',
        termStartsAt: partner.termStartsAt || null,
        termEndsAt: partner.termEndsAt || null,
        renewalIntent: partner.renewalIntent ?? null,
        renewalNoticeSentAt: partner.renewalNoticeSentAt || null,
      },
      partnership: {
        termMonths: settings.partnershipTermMonths ?? 12,
        renewalNoticeDays: settings.renewalNoticeDays ?? 45,
      },
      performance: {
        orderCount: allTime.orderCount,
        netSales: allTime.netSales,
        cashbackEarned: allTime.commissionAmount,
        donationRate: rate,
        parentDisplayRate,
      },
      currentQuarter: {
        periodId: currentPeriodId,
        periodLabel: displayFundraisingPeriod(currentPeriodId),
        orderCount: currentQuarter.orderCount,
        netSales: currentQuarter.netSales,
        cashbackEarned: currentQuarter.commissionAmount,
      },
      nextGrantTransfer: getNextGrantTransferInfo(),
      settlements: settlements.map((s) => ({
        id: s.id,
        period: s.period,
        grossSales: s.grossSales,
        netSales: s.netSales,
        commissionAmount: s.commissionAmount,
        status: s.status,
        paidAt: s.paidAt,
        paymentReference: s.paymentReference,
        targetPayoutDisplay: payoutDueDisplayForPeriod(s.period),
      })),
      documents: documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        period: d.period,
        status: d.status,
        htmlBody: d.htmlBody,
        sentAt: d.sentAt,
      })),
      marketing: {
        shareCopyHtml: shareCopy,
        shareCopyText: `Use code ${partner.linkedPromoCode} at selpic.com.au checkout for ${parentDisplayRate}% OFF on custom name labels — and help raise Fundraising Cashback Grants for ${partner.organizationName}. Sign in or create your own SELPIC customer account to place your order (the code is only for the community discount).`,
        flyerHtml,
      },
      changeRequests: changeRequests.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        message: r.message,
        proposed: r.proposed,
        partnerReply: r.partnerReply,
        attachments: r.attachments,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        packSentAt: r.packSentAt,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Dashboard load failed' },
      { status: 500 }
    )
  }
}

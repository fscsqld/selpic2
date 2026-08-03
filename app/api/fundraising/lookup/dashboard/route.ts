import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/admin'
import {
  LOOKUP_SESSION_COOKIE,
  resolveLookupSession,
} from '@/lib/fundraising/lookupAuth'
import {
  listFundraisingDocumentsFromDb,
  listFundraisingSettlementsFromDb,
  loadFundraisingSettingsFromDb,
} from '@/lib/fundraising/persistence'
import { computeFundraisingNetSales } from '@/lib/fundraising/netSales'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { maskAccount, maskBsb } from '@/lib/fundraising/mask'
import type { OrderRecord } from '@/lib/store'

function anonymizeCustomerName(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Customer'
  const first = parts[0]
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : ''
  return lastInitial ? `${first} ${lastInitial}` : first
}

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
    const rate = settings.donationRate

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

    const settlements = (await listFundraisingSettlementsFromDb()).filter((s) => s.partnerId === partner.id)
    const documents = (await listFundraisingDocumentsFromDb()).filter(
      (d) => d.partnerId === partner.id && (d.type === 'D9' || d.type === 'D10' || d.type === 'D6')
    )

    const shareCopy = buildFundraisingDocumentHtml({
      type: 'D6',
      partner,
      settings,
    })

    const flyerHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Fundraising Flyer — ${partner.organizationName}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:24px;color:#111}
  h1{font-size:28px;margin:0 0 8px}
  .code{font-size:36px;font-weight:800;letter-spacing:0.06em;margin:24px 0}
  .muted{color:#555}
</style></head><body>
  <h1>Support ${partner.organizationName}</h1>
  <p class="muted">Use this code at selpic.com.au checkout for ${settings.parentDisplayRate}% OFF on custom name labels.</p>
  <div class="code">${partner.linkedPromoCode}</div>
  <p>Your purchase helps raise funds — ${settings.donationRate}% cashback goes to our organisation.</p>
  <p class="muted">Printed with SELPIC · Waterproof name labels</p>
</body></html>`

    const recentOrders = allTime.orderRows
      .filter((r) => !r.excluded)
      .slice(0, 25)
      .map((r) => ({
        label: `Order #${r.orderId.slice(-4)} — ${anonymizeCustomerName(r.customerName)} — $${r.subtotal.toFixed(2)}`,
        date: r.date,
        subtotal: r.subtotal,
      }))

    return NextResponse.json({
      ok: true,
      partner: {
        id: partner.id,
        organizationName: partner.organizationName,
        linkedPromoCode: partner.linkedPromoCode,
        status: partner.status,
        contactName: partner.contactName,
        bankMasked: `${maskBsb(partner.bsb)} / ${maskAccount(partner.accountNumber)}`,
      },
      performance: {
        orderCount: allTime.orderCount,
        netSales: allTime.netSales,
        cashbackEarned: allTime.commissionAmount,
        donationRate: rate,
        parentDisplayRate: settings.parentDisplayRate,
      },
      recentOrders,
      settlements: settlements.map((s) => ({
        id: s.id,
        period: s.period,
        grossSales: s.grossSales,
        netSales: s.netSales,
        commissionAmount: s.commissionAmount,
        status: s.status,
        paidAt: s.paidAt,
        paymentReference: s.paymentReference,
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
        shareCopyText: `Use code ${partner.linkedPromoCode} at selpic.com.au checkout for ${settings.parentDisplayRate}% OFF on custom name labels — and help us raise funds for ${partner.organizationName}.`,
        flyerHtml,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Dashboard load failed' },
      { status: 500 }
    )
  }
}

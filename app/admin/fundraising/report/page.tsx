'use client'

import { useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useStore } from '@/lib/store'
import { useFundraisingStore } from '@/lib/fundraising/store'
import { computeFundraisingNetSales, currentPeriodYYYYMM, periodBounds } from '@/lib/fundraising/netSales'
import { HeartHandshake } from 'lucide-react'

export default function FundraisingReportPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <ReportContent />
    </AdminRoute>
  )
}

function ReportContent() {
  const orders = useStore((s) => s.orders)
  const partners = useFundraisingStore((s) => s.partners)
  const [period, setPeriod] = useState(currentPeriodYYYYMM())
  const [codeFilter, setCodeFilter] = useState('')

  const partnerOptions = useMemo(() => {
    const codes = Array.from(new Set(partners.map((p) => p.linkedPromoCode).filter(Boolean)))
    return codes.sort()
  }, [partners])

  const selectedCode = (codeFilter || partnerOptions[0] || '').toUpperCase()
  const settings = useFundraisingStore((s) => s.settings)
  const getActiveRateForPartner = useFundraisingStore((s) => s.getActiveRateForPartner)

  const rate = useMemo(() => {
    const partner = partners.find((p) => p.linkedPromoCode === selectedCode)
    if (!partner) {
      return { donationRate: settings.donationRate, parentDisplayRate: settings.parentDisplayRate }
    }
    return getActiveRateForPartner(partner.id, `${period}-15`)
  }, [partners, selectedCode, period, settings.donationRate, settings.parentDisplayRate, getActiveRateForPartner])

  const { startIso, endIso } = periodBounds(period)
  const stats = useMemo(
    () =>
      computeFundraisingNetSales({
        orders,
        promoCode: selectedCode,
        periodStartIso: startIso,
        periodEndIso: endIso,
        donationRatePercent: rate.donationRate,
      }),
    [orders, selectedCode, startIso, endIso, rate.donationRate]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Report"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Read-only fundraising report"
        subtitle="Orders are read by promoCode. Net Sales = product subtotals (shipping excluded; cancelled/refunded excluded)."
        current="/admin/fundraising/report"
      >
        <div className="flex flex-wrap gap-3 mb-6">
          <input type="month" className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm min-w-[12rem]" value={selectedCode} onChange={(e) => setCodeFilter(e.target.value)}>
            {partnerOptions.length === 0 && <option value="">No partner codes</option>}
            {partnerOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Or type promo code"
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value.toUpperCase())}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card label="Total Orders" value={String(stats.orderCount)} />
          <Card label="Total Sales Revenue (Net)" value={`$${stats.netSales.toFixed(2)}`} />
          <Card label={`School Commission Due (${rate.donationRate}%)`} value={`$${stats.commissionAmount.toFixed(2)}`} />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Subtotal</th>
                <th className="px-3 py-2">15% line</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.orderRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No matching orders for this period/code.</td></tr>
              )}
              {stats.orderRows.map((r) => (
                <tr key={r.orderId} className={r.excluded ? 'bg-red-50/40' : ''}>
                  <td className="px-3 py-2 font-mono text-xs">{r.orderId}</td>
                  <td className="px-3 py-2">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">{r.customerName}</td>
                  <td className="px-3 py-2">{r.promoCode}</td>
                  <td className="px-3 py-2">${r.subtotal.toFixed(2)}</td>
                  <td className="px-3 py-2">${r.commission.toFixed(2)}</td>
                  <td className="px-3 py-2">{r.excluded ? r.excludeReason : 'Included'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FundraisingAdminShell>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useStore } from '@/lib/store'
import { useFundraisingStore } from '@/lib/fundraising/store'
import { computeFundraisingNetSales, currentPeriodYYYYMM, periodBounds } from '@/lib/fundraising/netSales'
import { displayFundraisingPeriod } from '@/lib/fundraising/auFinancialQuarter'
import { AuFyQuarterSelect } from '@/components/admin/AuFyQuarterSelect'
import { FUNDRAISING_COPY } from '@/lib/fundraising/copy'
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
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)
  const [period, setPeriod] = useState(currentPeriodYYYYMM())
  const [codeFilter, setCodeFilter] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const partnerOptions = useMemo(() => {
    const codes = Array.from(new Set(partners.map((p) => p.linkedPromoCode).filter(Boolean)))
    return codes.sort()
  }, [partners])

  const selectedCode = (codeFilter || partnerOptions[0] || '').toUpperCase()
  const settings = useFundraisingStore((s) => s.settings)
  const getActiveRateForPartner = useFundraisingStore((s) => s.getActiveRateForPartner)

  const selectedPartner = useMemo(
    () => partners.find((p) => p.linkedPromoCode === selectedCode) || null,
    [partners, selectedCode]
  )

  const rate = useMemo(() => {
    if (!selectedPartner) {
      return { donationRate: settings.donationRate, parentDisplayRate: settings.parentDisplayRate }
    }
    return getActiveRateForPartner(selectedPartner.id, `${period}-15`)
  }, [selectedPartner, period, settings.donationRate, settings.parentDisplayRate, getActiveRateForPartner])

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

  const sendMidPeriod = async () => {
    if (!selectedPartner) {
      setMessage('Select a partner promo code first.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner: selectedPartner,
          lifecycle: {
            kind: 'd7_mid',
            period,
            netSales: stats.netSales,
            commission: stats.commissionAmount,
            orderCount: stats.orderCount,
          },
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to send D7')
      if (json.lifecycleDocs?.length) mergeRemote({ documents: json.lifecycleDocs })
      setMessage(`D7 Mid-period snapshot emailed to ${selectedPartner.contactEmail}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'D7 send failed')
    } finally {
      setBusy(false)
    }
  }

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
        title="Community Impact"
        subtitle={FUNDRAISING_COPY.adminReportSubtitle}
        current="/admin/fundraising/report"
      >
        {message && (
          <div className="mb-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">{message}</div>
        )}
        <div className="flex flex-wrap gap-3 mb-6 items-end">
          <AuFyQuarterSelect value={period} onChange={setPeriod} />
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
          <button
            type="button"
            disabled={busy || !selectedPartner}
            onClick={() => void sendMidPeriod()}
            className="rounded-lg bg-slate-800 text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Send D7 mid-period snapshot
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card label="Community orders" value={String(stats.orderCount)} />
          <Card label={FUNDRAISING_COPY.totalCommunitySupport} value={`$${stats.netSales.toFixed(2)}`} />
          <Card
            label={`${FUNDRAISING_COPY.fundraisingCashbackGrant} (${rate.donationRate}%)`}
            value={`$${stats.commissionAmount.toFixed(2)}`}
          />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">After {rate.parentDisplayRate}% OFF</th>
                <th className="px-3 py-2">{rate.donationRate}% grant</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.orderRows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No matching orders for this period/code.</td></tr>
              )}
              {stats.orderRows.map((r) => (
                <tr key={r.orderId} className={r.excluded ? 'bg-red-50/40' : ''}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link
                      href={`/admin/orders/${encodeURIComponent(r.orderId)}`}
                      className="text-indigo-700 hover:underline"
                      title="Open order detail"
                    >
                      {r.orderId}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2">{r.customerName}</td>
                  <td className="px-3 py-2">{r.promoCode}</td>
                  <td className="px-3 py-2">${r.eligibleSales.toFixed(2)}</td>
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

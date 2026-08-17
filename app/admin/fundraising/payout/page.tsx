'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { useStore } from '@/lib/store'
import {
  createDraftDocument,
  maskAccount,
  maskBsb,
  useFundraisingStore,
} from '@/lib/fundraising/store'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { downloadFundraisingHtml, generateFundraisingDoc } from '@/lib/fundraising/generateDoc'
import { FUNDRAISING_COPY } from '@/lib/fundraising/copy'
import { computeFundraisingNetSales, currentPeriodYYYYMM, periodBounds, periodRateAnchorIso } from '@/lib/fundraising/netSales'
import {
  displayFundraisingPeriod,
  FUNDRAISING_GRANT_PAYOUT_POLICY,
  getNextGrantTransferInfo,
  getSettlementActionsGate,
  payoutDueDisplayForPeriod,
} from '@/lib/fundraising/auFinancialQuarter'
import { AuFyQuarterSelect } from '@/components/admin/AuFyQuarterSelect'
import { CalendarClock, HeartHandshake } from 'lucide-react'
import { emailService } from '@/lib/emailService'
import { useDocumentSendLogStore } from '@/lib/documentSendLogStore'
import { fundraisingHtmlToPdfFile } from '@/lib/fundraising/htmlToPdfClient'
import { buildFundraisingSettlementCoverPlainText } from '@/lib/fundraising/documents'

export default function FundraisingPayoutPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <PayoutContent />
    </AdminRoute>
  )
}

function PayoutContent() {
  const { adminUser } = useAdminAuth()
  const orders = useStore((s) => s.orders)
  const mergeOrdersFromServer = useStore((s) => s.mergeOrdersFromServer)
  const partners = useFundraisingStore((s) => s.partners)
  const settlements = useFundraisingStore((s) => s.settlements)
  const settings = useFundraisingStore((s) => s.settings)
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)
  const upsertSettlement = useFundraisingStore((s) => s.upsertSettlement)
  const markSettlementPaid = useFundraisingStore((s) => s.markSettlementPaid)
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)

  const [period, setPeriod] = useState(currentPeriodYYYYMM())
  const [message, setMessage] = useState('')
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const syncFromServer = async () => {
    setSyncing(true)
    try {
      const [frRes, ordersRes] = await Promise.all([
        fetch('/api/admin/fundraising'),
        fetch('/api/orders', { cache: 'no-store', credentials: 'same-origin' }),
      ])
      const frJson = await frRes.json().catch(() => null)
      if (!frRes.ok) throw new Error(frJson?.error || 'Fundraising sync failed')
      mergeRemote({
        partners: frJson.partners,
        documents: frJson.documents,
        settlements: frJson.settlements,
        settings: frJson.settings,
      })
      let orderCount = orders.length
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json().catch(() => null)
        if (Array.isArray(ordersJson?.orders) && ordersJson.orders.length > 0) {
          mergeOrdersFromServer(ordersJson.orders)
          orderCount = ordersJson.orders.length
        }
      }
      setMessage(
        `Synced · ${frJson.partners?.length || 0} partners · ${orderCount} orders · ${frJson.settlements?.length || 0} settlements`
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed (local data still available)')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void syncFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const { startIso, endIso } = periodBounds(period)
    return partners
      .filter((p) => p.status === 'active' || p.status === 'pending')
      .map((p) => {
        const rate = useFundraisingStore.getState().getActiveRateForPartner(p.id, periodRateAnchorIso(period))
        const stats = computeFundraisingNetSales({
          orders,
          promoCode: p.linkedPromoCode,
          periodStartIso: startIso,
          periodEndIso: endIso,
          donationRatePercent: rate.donationRate,
        })
        const existing = settlements.find((s) => s.partnerId === p.id && s.period === period)
        return { partner: p, rate, stats, existing }
      })
      .sort((a, b) => a.partner.organizationName.localeCompare(b.partner.organizationName))
  }, [partners, orders, period, settlements])

  useEffect(() => {
    setSelectedPartnerId((prev) => {
      if (rows.length === 0) return null
      if (prev && rows.some((r) => r.partner.id === prev)) return prev
      return rows[0].partner.id
    })
  }, [rows])

  const summary = useMemo(() => {
    let totalCashback = 0
    let ready = 0
    let paid = 0
    let notGenerated = 0
    let bankMissing = 0
    for (const row of rows) {
      totalCashback += row.existing?.commissionAmount ?? row.stats.commissionAmount
      const status = row.existing?.status
      if (status === 'Paid') paid += 1
      else if (status === 'Ready') ready += 1
      else notGenerated += 1
      if (!hasOfficialGrantAccount(row.partner)) bankMissing += 1
    }
    return {
      partnerCount: rows.length,
      totalCashback,
      ready,
      paid,
      notGenerated,
      bankMissing,
    }
  }, [rows])

  const selectedRow = useMemo(
    () => rows.find((r) => r.partner.id === selectedPartnerId) || null,
    [rows, selectedPartnerId]
  )

  const settlementGate = useMemo(() => getSettlementActionsGate(period), [period])

  const generate = (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
    if (row.existing?.status === 'Paid') {
      setMessage('This period is already Paid and frozen.')
      return
    }
    if (!settlementGate.allowed) {
      setMessage(settlementGate.message)
      return
    }
    const now = new Date().toISOString()
    upsertSettlement({
      id: row.existing?.id || `fs-${partnerId}-${period}`,
      partnerId,
      promoCode: row.partner.linkedPromoCode,
      period,
      grossSales: row.stats.grossSales,
      netSales: row.stats.netSales,
      commissionAmount: row.stats.commissionAmount,
      rateApplied: row.rate.donationRate,
      orderCount: row.stats.orderCount,
      status: 'Ready',
      createdAt: row.existing?.createdAt || now,
      updatedAt: now,
    })
    void fetch('/api/admin/fundraising', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settlement: {
          id: row.existing?.id || `fs-${partnerId}-${period}`,
          partnerId,
          promoCode: row.partner.linkedPromoCode,
          period,
          grossSales: row.stats.grossSales,
          netSales: row.stats.netSales,
          commissionAmount: row.stats.commissionAmount,
          rateApplied: row.rate.donationRate,
          orderCount: row.stats.orderCount,
          status: 'Ready',
          createdAt: row.existing?.createdAt || now,
          updatedAt: now,
        },
      }),
    })
    setMessage(`Settlement Ready for ${row.partner.organizationName} (${period}).`)
  }

  const copyBank = async (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
    if (!hasOfficialGrantAccount(row.partner)) {
      setMessage(FUNDRAISING_COPY.grantAccountRequired)
      return
    }
    const ref = `SELPIC-${row.partner.linkedPromoCode}-${period}`
    const amount = row.existing?.commissionAmount ?? row.stats.commissionAmount
    const text = [
      `Payee: ${row.partner.accountName || row.partner.organizationName}`,
      `ABN: ${row.partner.abn || ''}`,
      `Bank: ${row.partner.bankName || ''}`,
      `BSB: ${row.partner.bsb || ''}`,
      `Account: ${row.partner.accountNumber || ''}`,
      `Amount: $${amount.toFixed(2)} AUD`,
      `Reference: ${ref}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setMessage('Official Grant Account transfer details copied to clipboard.')
  }

  const exportCsv = () => {
    const lines = ['Organization,ABN,PromoCode,Period,NetSales,Commission,BSB,Account,Reference,Status']
    for (const row of rows) {
      const ref = `SELPIC-${row.partner.linkedPromoCode}-${period}`
      const amount = row.existing?.commissionAmount ?? row.stats.commissionAmount
      lines.push(
        [
          csv(row.partner.organizationName),
          csv(row.partner.abn || ''),
          row.partner.linkedPromoCode,
          period,
          row.stats.netSales.toFixed(2),
          amount.toFixed(2),
          row.partner.bsb || '',
          row.partner.accountNumber || '',
          ref,
          row.existing?.status || 'Ungenerated',
        ].join(',')
      )
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fundraising-payout-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadInternalPack = async (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
    try {
      const res = await fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner: row.partner,
          lifecycle: {
            kind: 'd14_d15_pack',
            period,
            netSales: row.existing?.netSales ?? row.stats.netSales,
            commission: row.existing?.commissionAmount ?? row.stats.commissionAmount,
            email: false,
          },
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Failed to generate D14/D15')
      if (json.lifecycleDocs?.length) mergeRemote({ documents: json.lifecycleDocs })
      for (const d of json.downloadPack || json.lifecycleDocs || []) {
        downloadFundraisingHtml(`${d.type}-${row.partner.linkedPromoCode}-${period}`, d.htmlBody)
      }
      setMessage(`Downloaded D14 + D15 for ${row.partner.organizationName}`)
    } catch (e) {
      // Offline fallback: generate locally
      const d14 = generateFundraisingDoc('D14', {
        partner: row.partner,
        settings,
        period,
        settlement: row.existing || undefined,
        extra: { netSales: row.stats.netSales, commission: row.stats.commissionAmount },
      })
      const d15 = generateFundraisingDoc('D15', {
        partner: row.partner,
        settings,
        period,
        settlement: row.existing || undefined,
        extra: {
          netSales: row.stats.netSales,
          commission: row.stats.commissionAmount,
          paymentReference: `SELPIC-${row.partner.linkedPromoCode}-${period}`,
        },
      })
      downloadFundraisingHtml(`${d14.type}-${period}`, d14.htmlBody)
      downloadFundraisingHtml(`${d15.type}-${period}`, d15.htmlBody)
      setMessage(
        e instanceof Error
          ? `Local D14/D15 download (${e.message})`
          : 'Downloaded D14 + D15 locally'
      )
    }
  }

  const markPaid = async (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
    if (!settlementGate.allowed) {
      setMessage(settlementGate.message)
      return
    }
    if (!hasOfficialGrantAccount(row.partner)) {
      setMessage(FUNDRAISING_COPY.grantAccountMissingAdmin)
      return
    }
    if (row.existing?.status === 'Paid') {
      setMessage('Already paid.')
      return
    }
    if (!row.existing || row.existing.status !== 'Ready') {
      setMessage('Generate settlement to Ready before marking Paid.')
      return
    }
    const paidBy = adminUser?.username || adminUser?.email || 'Admin'
    const paymentReference = `SELPIC-${row.partner.linkedPromoCode}-${period}`
    const bankSnapshot = `${row.partner.abn || ''} | ${row.partner.bankName || ''} | ${maskBsb(row.partner.bsb)} | ${maskAccount(row.partner.accountNumber)}`
    markSettlementPaid(row.existing.id, { paidBy, paymentReference, bankSnapshot })
    logAdminActivity({
      action: 'fundraising_settlement_paid',
      target: partnerId,
      field: 'settlement',
      oldValue: row.existing.status,
      newValue: 'Paid',
      description: `${paidBy} marked settlement Paid · ${row.partner.organizationName} (${partnerId}) · ${period} · ${paymentReference} · $${Number(row.existing.commissionAmount || 0).toFixed(2)}`,
    })
    const paidSettlement = {
      ...row.existing,
      status: 'Paid' as const,
      paidAt: new Date().toISOString(),
      paidBy,
      paymentReference,
      bankSnapshot,
      updatedAt: new Date().toISOString(),
    }
    void fetch('/api/admin/fundraising', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlement: paidSettlement }),
    })

    const paidAt = paidSettlement.paidAt
    const d9 = buildFundraisingDocumentHtml({
      type: 'D9',
      partner: row.partner,
      settings,
      period,
      extra: {
        orderCount: row.existing.orderCount,
        netSales: row.existing.netSales,
        commission: row.existing.commissionAmount,
        donationRate: row.existing.rateApplied,
      },
    })
    const d10 = buildFundraisingDocumentHtml({
      type: 'D10',
      partner: row.partner,
      settings,
      period,
      extra: {
        commission: row.existing.commissionAmount,
        paymentReference,
        paidAt,
      },
    })
    const doc9 = createDraftDocument({ type: 'D9', partnerId, period, htmlBody: d9 })
    const doc10 = createDraftDocument({ type: 'D10', partnerId, period, htmlBody: d10 })
    void fetch('/api/admin/fundraising', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: { ...doc9, status: 'Generated' } }),
    })
    void fetch('/api/admin/fundraising', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: { ...doc10, status: 'Generated' } }),
    })

    try {
      setMessage('Preparing D9/D10 PDF attachments…')
      const code = row.partner.linkedPromoCode || 'partner'
      const pdf9 = await fundraisingHtmlToPdfFile(d9, `SELPIC-D9-${code}-${period}.pdf`)
      const pdf10 = await fundraisingHtmlToPdfFile(d10, `SELPIC-D10-${code}-${period}.pdf`)
      // Invoice-style: short cover only — full D9/D10 live in PDF attachments.
      const cover = buildFundraisingSettlementCoverPlainText({
        contactName: row.partner.contactName,
        organizationName: row.partner.organizationName,
        period,
        paymentReference,
        grantAmount: row.existing.commissionAmount,
      })
      const emailRes = await emailService.sendResponse({
        customerEmail: row.partner.contactEmail,
        customerName: row.partner.contactName,
        subject: `SELPIC Fundraising Settlement ${period} — ${row.partner.organizationName}`,
        message: cover,
        adminName: paidBy,
        attachments: [pdf9, pdf10],
      })
      const log = addSendLog({
        documentType: 'other',
        documentNumber: paymentReference,
        recipientEmail: row.partner.contactEmail,
        recipientName: row.partner.contactName,
        subject: `SELPIC Fundraising Settlement ${period}`,
        content: 'Cover + D9/D10 PDF attachments',
        sentBy: paidBy,
        status: emailRes.success ? 'sent' : 'failed',
        source: 'other',
        errorMessage: emailRes.success ? undefined : emailRes.message,
      })
      useFundraisingStore.getState().updateDocumentStatus(doc9.id, emailRes.success ? 'Sent' : 'Failed', { sendLogId: log.id })
      useFundraisingStore.getState().updateDocumentStatus(doc10.id, emailRes.success ? 'Sent' : 'Failed', { sendLogId: log.id })
      const sent9 = { ...doc9, status: emailRes.success ? 'Sent' : 'Failed', sendLogId: log.id, sentAt: new Date().toISOString() }
      const sent10 = { ...doc10, status: emailRes.success ? 'Sent' : 'Failed', sendLogId: log.id, sentAt: new Date().toISOString() }
      void fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: sent9 }),
      })
      void fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: sent10 }),
      })
      setMessage(
        emailRes.success
          ? 'Marked Paid and emailed D9/D10 with PDF attachments.'
          : `Marked Paid but email failed: ${emailRes.message}`
      )
    } catch (e) {
      setMessage(`Marked Paid. Email error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title={FUNDRAISING_COPY.adminGrantTracker}
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title={FUNDRAISING_COPY.adminGrantTracker}
        subtitle={FUNDRAISING_COPY.adminPayoutSubtitle}
        current="/admin/fundraising/payout"
      >
        {(() => {
          const next = getNextGrantTransferInfo()
          const selectedDue = payoutDueDisplayForPeriod(period)
          return (
            <div
              className={`mb-4 rounded-xl border px-4 py-3 ${
                next.phase === 'transfer_due_soon' || next.phase === 'transfer_overdue'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-indigo-200 bg-indigo-50/70'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-900">
                    <CalendarClock className="w-4 h-4 shrink-0" />
                    Grant transfer calendar
                  </div>
                  <p className="mt-1.5 text-sm text-slate-800 leading-relaxed">{next.adminDetail}</p>
                  <p className="mt-1 text-xs text-slate-500">{FUNDRAISING_GRANT_PAYOUT_POLICY.summary}</p>
                </div>
                <div className="rounded-lg border border-white/80 bg-white px-4 py-2.5 text-right min-w-[11rem] shadow-sm">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">Next target</div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums">{next.targetPayoutDisplay}</div>
                  <div className="text-xs text-indigo-800 font-medium mt-0.5">
                    {next.daysUntilPayout > 1
                      ? `In ${next.daysUntilPayout} days`
                      : next.daysUntilPayout === 1
                        ? 'Tomorrow'
                        : next.daysUntilPayout === 0
                          ? 'Today'
                          : `${Math.abs(next.daysUntilPayout)} days past target`}
                  </div>
                  {selectedDue && selectedDue !== next.targetPayoutDisplay && (
                    <div className="text-[11px] text-slate-500 mt-1">Selected quarter: {selectedDue}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <AuFyQuarterSelect value={period} onChange={setPeriod} />
          <p className="text-xs text-gray-500 max-w-xl pb-2 leading-relaxed">
            {payoutDueDisplayForPeriod(period)
              ? `Selected quarter target payout: ${payoutDueDisplayForPeriod(period)}.`
              : ''}
            {!settlementGate.allowed ? ` ${settlementGate.message}` : ''}
          </p>
          <button
            type="button"
            onClick={() => void syncFromServer()}
            disabled={syncing}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync partners & orders'}
          </button>
          <button type="button" onClick={exportCsv} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
            {FUNDRAISING_COPY.exportCsv}
          </button>
        </div>
        {message && <div className="mb-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">{message}</div>}

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">No partners yet. Add partners first.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <KpiCard
                label={`${FUNDRAISING_COPY.fundraisingCashbackGrant}`}
                value={`$${summary.totalCashback.toFixed(2)}`}
                hint={displayFundraisingPeriod(period)}
              />
              <KpiCard
                label="Settlement status"
                value={`${summary.ready} Ready · ${summary.paid} Paid`}
                hint={`${summary.notGenerated} not generated`}
              />
              <KpiCard
                label="Grant Account missing"
                value={String(summary.bankMissing)}
                hint={summary.bankMissing > 0 ? 'Mark Paid blocked until registered' : 'All accounts registered'}
              />
              <KpiCard
                label="Period partners"
                value={String(summary.partnerCount)}
                hint="Active + pending only"
              />
            </div>

            <div className="bg-white border rounded-xl overflow-hidden mb-6">
              <div className="px-4 py-3 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-sm text-gray-900">Period overview</div>
                <p className="text-xs text-gray-500">Select a row to open transfer actions below.</p>
              </div>
              <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Organisation</th>
                      <th className="px-3 py-2">Code</th>
                      <th className="px-3 py-2 text-right">Orders</th>
                      <th className="px-3 py-2 text-right">{FUNDRAISING_COPY.totalCommunitySupport}</th>
                      <th className="px-3 py-2 text-right">Cashback</th>
                      <th className="px-3 py-2">Bank</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map(({ partner, stats, existing, rate }) => {
                      const bankOk = hasOfficialGrantAccount(partner)
                      const communitySupport = existing?.netSales ?? stats.netSales
                      const cashback = existing?.commissionAmount ?? stats.commissionAmount
                      const status = existing?.status || 'Not generated'
                      const selected = partner.id === selectedPartnerId
                      return (
                        <tr
                          key={partner.id}
                          className={`cursor-pointer hover:bg-emerald-50/60 ${selected ? 'bg-emerald-50' : ''}`}
                          onClick={() => setSelectedPartnerId(partner.id)}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{partner.organizationName}</div>
                            <div className="text-xs text-gray-500">grant {rate.donationRate}%</div>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{partner.linkedPromoCode || '—'}</td>
                          <td className="px-3 py-2 text-right">{stats.orderCount}</td>
                          <td className="px-3 py-2 text-right">${communitySupport.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-semibold">${cashback.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            {bankOk ? (
                              <span className="text-emerald-700 text-xs font-medium">OK</span>
                            ) : (
                              <span className="text-amber-700 text-xs font-medium">Missing</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill status={status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedRow && (
              <div className="bg-white border rounded-xl p-4 border-emerald-200 shadow-sm">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">
                      Transfer actions
                    </div>
                    <div className="font-semibold text-gray-900">{selectedRow.partner.organizationName}</div>
                    <div className="text-sm text-gray-600">
                      {selectedRow.partner.linkedPromoCode} · grant rate {selectedRow.rate.donationRate}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {hasOfficialGrantAccount(selectedRow.partner)
                        ? `ABN ${selectedRow.partner.abn || '—'} · ${maskBsb(selectedRow.partner.bsb)} / ${maskAccount(selectedRow.partner.accountNumber)}`
                        : FUNDRAISING_COPY.grantAccountRequired}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{FUNDRAISING_COPY.fundraisingCashbackGrant}</div>
                    <div className="text-xl font-bold">
                      $
                      {(
                        selectedRow.existing?.commissionAmount ?? selectedRow.stats.commissionAmount
                      ).toFixed(2)}
                    </div>
                    <div className="text-xs mt-1">
                      Status: {selectedRow.existing?.status || 'Not generated'} · Orders{' '}
                      {selectedRow.stats.orderCount}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!settlementGate.allowed && (
                    <p className="w-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {settlementGate.message}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={!settlementGate.allowed}
                    title={!settlementGate.allowed ? settlementGate.message : undefined}
                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => generate(selectedRow.partner.id)}
                  >
                    {FUNDRAISING_COPY.generateSettlement}
                  </button>
                  <button
                    type="button"
                    disabled={!hasOfficialGrantAccount(selectedRow.partner)}
                    className="text-sm px-3 py-1.5 rounded-lg border disabled:opacity-40"
                    onClick={() => void copyBank(selectedRow.partner.id)}
                  >
                    {FUNDRAISING_COPY.copyBankTransfer}
                  </button>
                  <button
                    type="button"
                    className="text-sm px-3 py-1.5 rounded-lg border"
                    onClick={() => void downloadInternalPack(selectedRow.partner.id)}
                  >
                    Download D14/D15
                  </button>
                  <button
                    type="button"
                    disabled={
                      !settlementGate.allowed || !hasOfficialGrantAccount(selectedRow.partner)
                    }
                    title={
                      !settlementGate.allowed
                        ? settlementGate.message
                        : !hasOfficialGrantAccount(selectedRow.partner)
                          ? FUNDRAISING_COPY.grantAccountMissingAdmin
                          : undefined
                    }
                    className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={() => void markPaid(selectedRow.partner.id)}
                  >
                    {FUNDRAISING_COPY.markPaid}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </FundraisingAdminShell>
    </div>
  )
}

function hasOfficialGrantAccount(partner: {
  bsb?: string
  accountNumber?: string
  accountName?: string
  abn?: string
}) {
  const bsb = String(partner.bsb || '').replace(/\D/g, '')
  const acc = String(partner.accountNumber || '').replace(/\D/g, '')
  const abn = String(partner.abn || '').replace(/\D/g, '')
  return Boolean(partner.accountName?.trim() && abn.length === 11 && bsb.length === 6 && acc.length >= 6)
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{hint}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'Paid'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Ready'
        ? 'bg-sky-100 text-sky-800'
        : status === 'Void'
          ? 'bg-rose-100 text-rose-800'
          : 'bg-gray-100 text-gray-700'
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tone}`}>{status}</span>
}

function csv(v: string): string {
  if (v.includes(',') || v.includes('"')) return `"${v.replace(/"/g, '""')}"`
  return v
}

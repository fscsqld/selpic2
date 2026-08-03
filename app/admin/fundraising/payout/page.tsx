'use client'

import { useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import { useStore } from '@/lib/store'
import {
  createDraftDocument,
  maskAccount,
  maskBsb,
  useFundraisingStore,
} from '@/lib/fundraising/store'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
import { computeFundraisingNetSales, currentPeriodYYYYMM, periodBounds } from '@/lib/fundraising/netSales'
import { HeartHandshake } from 'lucide-react'
import { emailService } from '@/lib/emailService'
import { useDocumentSendLogStore } from '@/lib/documentSendLogStore'

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
  const partners = useFundraisingStore((s) => s.partners)
  const settlements = useFundraisingStore((s) => s.settlements)
  const settings = useFundraisingStore((s) => s.settings)
  const upsertSettlement = useFundraisingStore((s) => s.upsertSettlement)
  const markSettlementPaid = useFundraisingStore((s) => s.markSettlementPaid)
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)

  const [period, setPeriod] = useState(currentPeriodYYYYMM())
  const [message, setMessage] = useState('')

  const rows = useMemo(() => {
    const { startIso, endIso } = periodBounds(period)
    return partners
      .filter((p) => p.status === 'active' || p.status === 'pending')
      .map((p) => {
        const rate = useFundraisingStore.getState().getActiveRateForPartner(p.id, `${period}-15`)
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
  }, [partners, orders, period, settlements])

  const generate = (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
    if (row.existing?.status === 'Paid') {
      setMessage('This period is already Paid and frozen.')
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
    const ref = `SELPIC-${row.partner.linkedPromoCode}-${period}`
    const amount = row.existing?.commissionAmount ?? row.stats.commissionAmount
    const text = [
      `Payee: ${row.partner.accountName || row.partner.organizationName}`,
      `Bank: ${row.partner.bankName || ''}`,
      `BSB: ${row.partner.bsb || ''}`,
      `Account: ${row.partner.accountNumber || ''}`,
      `Amount: $${amount.toFixed(2)} AUD`,
      `Reference: ${ref}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setMessage('Bank transfer details copied to clipboard.')
  }

  const exportCsv = () => {
    const lines = ['Organization,PromoCode,Period,NetSales,Commission,BSB,Account,Reference,Status']
    for (const row of rows) {
      const ref = `SELPIC-${row.partner.linkedPromoCode}-${period}`
      const amount = row.existing?.commissionAmount ?? row.stats.commissionAmount
      lines.push(
        [
          csv(row.partner.organizationName),
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

  const markPaid = async (partnerId: string) => {
    const row = rows.find((r) => r.partner.id === partnerId)
    if (!row) return
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
    const bankSnapshot = `${row.partner.bankName || ''} | ${maskBsb(row.partner.bsb)} | ${maskAccount(row.partner.accountNumber)}`
    markSettlementPaid(row.existing.id, { paidBy, paymentReference, bankSnapshot })
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
      const emailRes = await emailService.sendResponse({
        customerEmail: row.partner.contactEmail,
        customerName: row.partner.contactName,
        subject: `SELPIC Fundraising Settlement ${period} — ${row.partner.organizationName}`,
        message: `Please find your monthly statement and remittance advice for ${period}.\n\nPayment reference: ${paymentReference}\nAmount: $${row.existing.commissionAmount.toFixed(2)}`,
        adminName: paidBy,
        html: `${d9}<hr/>${d10}`,
      })
      const log = addSendLog({
        documentType: 'other',
        documentNumber: paymentReference,
        recipientEmail: row.partner.contactEmail,
        recipientName: row.partner.contactName,
        subject: `SELPIC Fundraising Settlement ${period}`,
        content: 'D9 + D10',
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
      setMessage(emailRes.success ? 'Marked Paid and emailed D9/D10.' : `Marked Paid but email failed: ${emailRes.message}`)
    } catch (e) {
      setMessage(`Marked Paid. Email error: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Payout"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Monthly payout"
        subtitle="Generate frozen settlements, copy bank details, export CSV, then Mark as Paid (creates D9/D10)."
        current="/admin/fundraising/payout"
      >
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="month" className="border rounded-lg px-3 py-2 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <button type="button" onClick={exportCsv} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Export CSV</button>
        </div>
        {message && <div className="mb-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">{message}</div>}

        <div className="space-y-4">
          {rows.length === 0 && <p className="text-sm text-gray-500">No partners yet. Add partners first.</p>}
          {rows.map(({ partner, stats, existing, rate }) => (
            <div key={partner.id} className="bg-white border rounded-xl p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold text-gray-900">{partner.organizationName}</div>
                  <div className="text-sm text-gray-600">{partner.linkedPromoCode} · rate {rate.donationRate}%</div>
                  <div className="text-xs text-gray-500 mt-1">{maskBsb(partner.bsb)} / {maskAccount(partner.accountNumber)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Commission due</div>
                  <div className="text-xl font-bold">${(existing?.commissionAmount ?? stats.commissionAmount).toFixed(2)}</div>
                  <div className="text-xs mt-1">Status: {existing?.status || 'Not generated'}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-white" onClick={() => generate(partner.id)}>Generate Settlement</button>
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg border" onClick={() => void copyBank(partner.id)}>Copy Bank Transfer Info</button>
                <button type="button" className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white" onClick={() => void markPaid(partner.id)}>Mark as Paid</button>
              </div>
            </div>
          ))}
        </div>
      </FundraisingAdminShell>
    </div>
  )
}

function csv(v: string): string {
  if (v.includes(',') || v.includes('"')) return `"${v.replace(/"/g, '""')}"`
  return v
}

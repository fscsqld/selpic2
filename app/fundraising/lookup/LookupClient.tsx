'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { CheckCircle, Copy, Download, HeartHandshake, Loader2 } from 'lucide-react'

type DashboardPayload = {
  partner: {
    organizationName: string
    linkedPromoCode: string
    status: string
    bankMasked: string
  }
  performance: {
    orderCount: number
    netSales: number
    cashbackEarned: number
    donationRate: number
    parentDisplayRate: number
  }
  recentOrders: Array<{ label: string; date: string }>
  settlements: Array<{
    id: string
    period: string
    grossSales: number
    netSales: number
    commissionAmount: number
    status: string
  }>
  documents: Array<{
    id: string
    type: string
    title: string
    period?: string
    htmlBody: string
  }>
  marketing: {
    shareCopyText: string
    flyerHtml: string
  }
}

export default function FundraisingLookupClient() {
  const params = useSearchParams()
  const token = (params.get('token') || '').trim()

  const [phase, setPhase] = useState<'boot' | 'otp' | 'dash'>('boot')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [orgHint, setOrgHint] = useState('')
  const [otp, setOtp] = useState('')
  const [dash, setDash] = useState<DashboardPayload | null>(null)

  const loadDashboard = async () => {
    const res = await fetch('/api/fundraising/lookup/dashboard')
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setPhase('otp')
      setMessage(json?.error || 'Please verify your email to continue.')
      return false
    }
    setDash(json as DashboardPayload)
    setPhase('dash')
    setMessage('')
    return true
  }

  const requestOtp = async () => {
    if (!token) {
      setMessage('Missing access token. Please use the link from your welcome email.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/fundraising/lookup/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not send verification code')
      setOrgHint(json.organizationName || '')
      setPhase('otp')
      setMessage(json.message || 'Verification code sent.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setPhase('otp')
      setMessage('Missing access token. Please use the link from your welcome email.')
      return
    }
    void (async () => {
      const ok = await loadDashboard()
      if (!ok) await requestOtp()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/fundraising/lookup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Verification failed')
      await loadDashboard()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard.')
  }

  const downloadFlyer = () => {
    if (!dash) return
    const blob = new Blob([dash.marketing.flyerHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selpic-fundraising-flyer-${dash.partner.linkedPromoCode}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadDoc = (title: string, html: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cards = useMemo(() => {
    if (!dash) return []
    return [
      { label: 'Total Orders', value: String(dash.performance.orderCount) },
      { label: 'Total Net Sales', value: `$${dash.performance.netSales.toFixed(2)}` },
      {
        label: `Total Cashback (${dash.performance.donationRate}%)`,
        value: `$${dash.performance.cashbackEarned.toFixed(2)}`,
      },
    ]
  }, [dash])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-3">
          <HeartHandshake className="w-4 h-4" />
          Partner lookup portal
        </div>

        {phase !== 'dash' && phase !== 'boot' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-lg">
            <h1 className="text-2xl font-bold text-slate-900">Verify your access</h1>
            <p className="mt-2 text-sm text-slate-600">
              {orgHint
                ? `We sent a 6-digit code to the email on file for ${orgHint}.`
                : 'Enter the 6-digit code sent to your organisation contact email.'}
            </p>
            {message && <p className="mt-3 text-sm rounded-lg border px-3 py-2 bg-slate-50 text-slate-700">{message}</p>}
            <form onSubmit={onVerify} className="mt-5 space-y-3">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-full border rounded-lg px-3 py-2 tracking-[0.35em] text-center text-lg font-semibold"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-semibold disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Verify & continue'}
              </button>
            </form>
            <button
              type="button"
              disabled={busy || !token}
              onClick={() => void requestOtp()}
              className="mt-3 text-sm text-emerald-700 hover:underline disabled:opacity-50"
            >
              Resend verification code
            </button>
          </section>
        )}

        {phase === 'dash' && dash && (
          <div className="space-y-8">
            {message && (
              <p className="text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
                {message}
              </p>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{dash.partner.organizationName}</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Status: <span className="font-medium capitalize">{dash.partner.status}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Payout account: {dash.partner.bankMasked}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Promo code</div>
                  <div className="font-mono text-xl font-bold">{dash.partner.linkedPromoCode}</div>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
                    onClick={() => void copyText(dash.partner.linkedPromoCode)}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy code
                  </button>
                </div>
              </div>
            </section>

            <section className="grid sm:grid-cols-3 gap-3">
              {cards.map((c) => (
                <div key={c.label} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{c.value}</div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-3">Marketing Asset Hub</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => void copyText(dash.marketing.shareCopyText)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4" /> Copy newsletter text
                </button>
                <button
                  type="button"
                  onClick={downloadFlyer}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 text-white px-3 py-2 text-sm"
                >
                  <Download className="w-4 h-4" /> Download Parent Flyer
                </button>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 border rounded-lg p-3">{dash.marketing.shareCopyText}</p>
              <p className="text-xs text-slate-500 mt-2">
                Flyer downloads as print-ready HTML — open it and use Print → Save as PDF if needed.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <h2 className="font-semibold text-slate-900 mb-3">Settlement archive</h2>
              <table className="min-w-full text-sm">
                <thead className="text-left bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Gross</th>
                    <th className="px-3 py-2">Net</th>
                    <th className="px-3 py-2">Commission</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dash.settlements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No settlements yet. After SELPIC marks a month as paid, it will appear here.
                      </td>
                    </tr>
                  )}
                  {dash.settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.period}</td>
                      <td className="px-3 py-2">${s.grossSales.toFixed(2)}</td>
                      <td className="px-3 py-2">${s.netSales.toFixed(2)}</td>
                      <td className="px-3 py-2">${s.commissionAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-3">Documents (D9 / D10)</h2>
              <div className="space-y-2">
                {dash.documents.filter((d) => d.type === 'D9' || d.type === 'D10').length === 0 && (
                  <p className="text-sm text-slate-500">No statements yet.</p>
                )}
                {dash.documents
                  .filter((d) => d.type === 'D9' || d.type === 'D10')
                  .map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm"
                    >
                      <span>
                        {d.type} — {d.title}
                        {d.period ? ` (${d.period})` : ''}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                        onClick={() => downloadDoc(`${d.type}-${d.period || d.id}`, d.htmlBody)}
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-3">Recent orders (anonymised)</h2>
              <ul className="space-y-1 text-sm text-slate-700">
                {dash.recentOrders.length === 0 && <li className="text-slate-500">No matching orders yet.</li>}
                {dash.recentOrders.map((o) => (
                  <li key={o.label + o.date} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {o.label}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {phase === 'boot' && (
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
      </main>
    </div>
  )
}

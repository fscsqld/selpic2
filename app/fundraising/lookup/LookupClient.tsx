'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CalendarClock,
  Copy,
  Download,
  HeartHandshake,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { FUNDRAISING_COPY, grantSettlementStatusLabel } from '@/lib/fundraising/copy'
import { LOOKUP_SESSION_HOURS } from '@/lib/fundraising/lookupConstants'
import { maskAccount, maskBsb } from '@/lib/fundraising/mask'
import { maskAbn } from '@/lib/fundraising/abn'
import { downloadFamilyFlyerA4Pdf } from '@/lib/fundraising/familyFlyer'
import { downloadFundraisingPdf } from '@/lib/fundraising/htmlToPdfClient'
import { downloadD22FillablePdf } from '@/lib/fundraising/d22FillablePdf'
import { formatAbnDisplay, digitsOnlyAbn } from '@/lib/fundraising/abn'
import { maskedAccountValue, maskedBsbValue } from '@/lib/fundraising/mask'
import {
  formatChangeRequestKind,
  formatChangeRequestStatus,
  partnerFacingChangeRequestHint,
} from '@/lib/fundraising/changeRequests'
import type { FundraisingChangeRequestKind } from '@/lib/fundraising/types'

/** Resolve lookup token; recovers from pasted URLs like ?token%3D<hex> (equals double-encoded). */
function resolveLookupToken(params: URLSearchParams): string {
  const direct = (params.get('token') || '').trim()
  if (direct && /^[a-f0-9]{16,}$/i.test(direct)) return direct

  for (const key of params.keys()) {
    // Browser may parse ?token%3Dabc as a key named "token=abc"
    const m = key.match(/^token=(.+)$/i)
    if (m?.[1] && /^[a-f0-9]{16,}/i.test(m[1])) return m[1].trim()
  }

  if (typeof window !== 'undefined') {
    const raw = window.location.search.replace(/^\?/, '')
    const enc = raw.match(/(?:^|&)token%3D([a-f0-9]+)/i)
    if (enc?.[1]) return enc[1].trim()
    const plain = raw.match(/(?:^|&)token=([a-f0-9]+)/i)
    if (plain?.[1]) return plain[1].trim()
  }

  return direct
}

type DashboardPayload = {
  partner: {
    id?: string
    organizationName: string
    linkedPromoCode: string
    status: string
    contactName?: string
    bankMasked: string
    hasOfficialGrantAccount?: boolean
    bankName?: string
    accountName?: string
    bsb?: string
    accountNumber?: string
    abn?: string
    termStartsAt?: string | null
    termEndsAt?: string | null
    renewalIntent?: 'pending' | 'wants_renew' | 'declines' | null
    renewalNoticeSentAt?: string | null
  }
  partnership?: {
    termMonths: number
    renewalNoticeDays: number
  }
  performance: {
    orderCount: number
    netSales: number
    cashbackEarned: number
    donationRate: number
    parentDisplayRate: number
  }
  currentQuarter?: {
    periodId: string
    periodLabel: string
    orderCount: number
    netSales: number
    cashbackEarned: number
  }
  nextGrantTransfer?: {
    periodId: string
    periodLabel: string
    quarterEndDisplay: string
    freezeEndDisplay?: string
    targetPayoutDisplay: string
    daysUntilPayout: number
    daysUntilQuarterEnd: number | null
    daysUntilFreezeEnd?: number | null
    phase: 'earning' | 'settlement_freeze' | 'quarter_closed' | 'transfer_due_soon' | 'transfer_overdue'
    partnerHeadline: string
    partnerDetail: string
  }
  settlements: Array<{
    id: string
    period: string
    grossSales: number
    netSales: number
    commissionAmount: number
    status: string
    paidAt?: string
    paymentReference?: string
    targetPayoutDisplay?: string | null
  }>
  documents: Array<{
    id: string
    type: string
    title: string
    period?: string
    status?: string
    htmlBody: string
    sentAt?: string
  }>
  marketing: {
    shareCopyText: string
    flyerHtml: string
  }
  changeRequests?: Array<{
    id: string
    kind: FundraisingChangeRequestKind
    status: string
    message: string
    proposed?: Record<string, string | undefined>
    partnerReply?: string
    attachments?: Array<{ id: string; fileName: string; fileUrl?: string }>
    adminNotes?: string
    createdAt: string
    updatedAt: string
    packSentAt?: string
  }>
}

/** Partner-facing pack only — exclude admin/internal (D1, D5, D7, D11, D14, D15, D17). */
const LOOKUP_PARTNERSHIP_DOC_TYPES = new Set([
  'D2',
  'D3',
  'D6',
  'D8',
  'D9',
  'D10',
  'D12',
  'D13',
  'D16',
  'D18',
  'D19',
  'D20',
  'D21',
  'D22',
])
/** Initial visible rows before “Show more” — keeps the portal scannable as quarterly D9/D10 accumulate. */
const LOOKUP_DOCS_PREVIEW_COUNT = 6

const DASH_NAV = [
  { id: 'impact', label: FUNDRAISING_COPY.lookupNavImpact },
  { id: 'grant-account', label: FUNDRAISING_COPY.lookupNavAccount },
  { id: 'share', label: FUNDRAISING_COPY.lookupNavShare },
  { id: 'transfers', label: FUNDRAISING_COPY.lookupNavTransfers },
  { id: 'documents', label: FUNDRAISING_COPY.lookupNavDocuments },
] as const

function isErrorMessage(message: string): boolean {
  return /missing|invalid|fail|could not|error|inactive|expired|limit/i.test(message)
}

function isWarningMessage(message: string): boolean {
  return /already sent recently|just requested|check your inbox/i.test(message)
}

function LookupPortalChrome({
  orgName,
  showEndSession,
  onEndSession,
  ending,
}: {
  orgName?: string
  showEndSession?: boolean
  onEndSession?: () => void
  ending?: boolean
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-wide text-slate-900">SELPIC</div>
            <div className="text-[11px] text-slate-500 truncate">
              {FUNDRAISING_COPY.lookupPortalEyebrow}
              {orgName ? ` · ${orgName}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 text-[11px] font-medium">
            <Lock className="w-3 h-3" />
            {FUNDRAISING_COPY.lookupPortalSecureBadge}
          </span>
          <Link
            href="/"
            className="text-xs sm:text-sm text-slate-600 hover:text-slate-900 hover:underline"
          >
            {FUNDRAISING_COPY.lookupVisitWebsite}
          </Link>
          {showEndSession && onEndSession && (
            <button
              type="button"
              disabled={ending}
              onClick={onEndSession}
              className="text-xs sm:text-sm rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {ending ? 'Ending…' : FUNDRAISING_COPY.lookupEndSession}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default function FundraisingLookupClient() {
  const params = useSearchParams()
  const token = resolveLookupToken(params)

  const [phase, setPhase] = useState<'boot' | 'otp' | 'dash'>('boot')
  const [busy, setBusy] = useState(false)
  const [ending, setEnding] = useState(false)
  const [message, setMessage] = useState('')
  const [orgHint, setOrgHint] = useState('')
  const [otp, setOtp] = useState('')
  const [dash, setDash] = useState<DashboardPayload | null>(null)
  const [requestingAccount, setRequestingAccount] = useState(false)
  const [showAllDocs, setShowAllDocs] = useState(false)
  const [flyerBusy, setFlyerBusy] = useState(false)
  const [docDownloadId, setDocDownloadId] = useState<string | null>(null)
  const [renewalBusy, setRenewalBusy] = useState(false)
  const [requestKind, setRequestKind] = useState<FundraisingChangeRequestKind>('grant_account')
  const [accountRequestNote, setAccountRequestNote] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replyFiles, setReplyFiles] = useState<Record<string, File[]>>({})
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null)
  const [replyFileInputKey, setReplyFileInputKey] = useState<Record<string, number>>({})

  const loadDashboard = async (opts?: { soft?: boolean }) => {
    const soft = Boolean(opts?.soft)
    const res = await fetch(`/api/fundraising/lookup/dashboard?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.ok) {
      setPhase('otp')
      setMessage(json?.error || 'Please verify your email to continue.')
      return false
    }
    const payload = json as DashboardPayload
    setDash(payload)
    // Soft refresh (tab focus) must NOT wipe reply drafts/files — partners often attach a
    // file, open the PDF elsewhere, then return; clearing state left a ghost filename in the
    // native input while Send had nothing to upload.
    if (!soft) {
      setRequestingAccount(false)
      setAccountRequestNote('')
      setRequestKind('grant_account')
      setReplyDrafts({})
      setReplyFiles({})
      setReplyFileInputKey({})
      setMessage('')
    }
    setPhase('dash')
    return true
  }

  const submitRenewal = async (intent: 'wants_renew' | 'declines') => {
    if (intent === 'declines') {
      const ok = window.confirm(FUNDRAISING_COPY.partnershipEndDeclineConfirm)
      if (!ok) return
    }
    setRenewalBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/fundraising/lookup/renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not save renewal response')
      setMessage(json.message || 'Renewal response saved.')
      await loadDashboard()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Renewal update failed')
    } finally {
      setRenewalBusy(false)
    }
  }

  const otpAutoSentKey = token ? `fr_lookup_otp_auto_${token}` : ''

  const requestOtp = async (opts?: { reason?: 'auto' | 'manual' }) => {
    if (!token) {
      setMessage('Missing access token. Please use the link from your welcome email.')
      return
    }
    const reason = opts?.reason || 'manual'
    // Refresh / remount must not spam verification emails (also mitigated by server cooldown).
    if (reason === 'auto' && typeof window !== 'undefined' && otpAutoSentKey) {
      try {
        const prev = Number(sessionStorage.getItem(otpAutoSentKey) || '0')
        if (prev && Date.now() - prev < 9 * 60 * 1000) {
          setPhase('otp')
          setMessage(
            'Enter the verification code from your email. Use Resend only if you need a new code.'
          )
          return
        }
      } catch {
        // sessionStorage unavailable — server cooldown still applies
      }
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/fundraising/lookup/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not send verification code')
      setOrgHint(json.organizationName || '')
      setPhase('otp')
      setMessage(json.message || FUNDRAISING_COPY.otpSentTrust)
      if (typeof window !== 'undefined' && otpAutoSentKey && json.emailed !== false) {
        try {
          sessionStorage.setItem(otpAutoSentKey, String(Date.now()))
        } catch {
          // ignore
        }
      }
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
      if (!ok) await requestOtp({ reason: 'auto' })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Admin can change grant % while Lookup stays open — refetch when the tab is focused again.
  useEffect(() => {
    if (phase !== 'dash' || !token) return
    let lastFetch = Date.now()
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetch < 5_000) return
      lastFetch = Date.now()
      void loadDashboard({ soft: true })
    }
    const onFocus = () => refreshIfStale()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', refreshIfStale)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', refreshIfStale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, token])

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

  const endSession = async () => {
    setEnding(true)
    try {
      await fetch('/api/fundraising/lookup/logout', { method: 'POST' })
    } catch {
      // Still return to OTP UI locally
    } finally {
      if (typeof window !== 'undefined' && otpAutoSentKey) {
        try {
          sessionStorage.removeItem(otpAutoSentKey)
        } catch {
          // ignore
        }
      }
      setDash(null)
      setOtp('')
      setRequestingAccount(false)
      setShowAllDocs(false)
      setPhase('otp')
      setMessage('Session ended. Request a verification code to open the portal again.')
      setEnding(false)
    }
  }

  const submitAccountRequest = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/fundraising/lookup/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: requestKind,
          message: accountRequestNote,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Could not submit change request')
      }
      setMessage(json.message || 'Request submitted to SELPIC.')
      setRequestingAccount(false)
      setAccountRequestNote('')
      await loadDashboard()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  const submitRequestReply = async (requestId: string) => {
    const reply = (replyDrafts[requestId] || '').trim()
    const files = replyFiles[requestId] || []
    if (!reply && files.length === 0) {
      setMessage('Add a short reply and/or attach your completed D22 PDF (or photo/scan), then send.')
      return
    }
    setReplyBusyId(requestId)
    setMessage('')
    try {
      const form = new FormData()
      form.set('requestId', requestId)
      form.set('reply', reply || (files.length > 0 ? 'Completed D22 form attached.' : ''))
      files.forEach((f) => form.append('files', f))
      const res = await fetch('/api/fundraising/lookup/change-requests', {
        method: 'PATCH',
        body: form,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not send reply')
      setMessage(json.message || 'Reply and files sent to SELPIC.')
      setReplyDrafts((d) => ({ ...d, [requestId]: '' }))
      setReplyFiles((d) => ({ ...d, [requestId]: [] }))
      setReplyFileInputKey((k) => ({ ...k, [requestId]: (k[requestId] || 0) + 1 }))
      await loadDashboard({ soft: true })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reply failed')
    } finally {
      setReplyBusyId(null)
    }
  }

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard.')
  }

  const downloadFlyer = async () => {
    if (!dash) return
    setFlyerBusy(true)
    setMessage('')
    try {
      await downloadFamilyFlyerA4Pdf({
        organizationName: dash.partner.organizationName,
        promoCode: dash.partner.linkedPromoCode,
        parentDisplayRate: dash.performance.parentDisplayRate,
        donationRate: dash.performance.donationRate,
      })
      setMessage('Family flyer PDF downloaded — official artwork with your organisation details.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not generate family flyer PDF')
    } finally {
      setFlyerBusy(false)
    }
  }

  /** Partnership Documents: PDF download. D22 uses a fillable AcroForm PDF. */
  const downloadDoc = async (doc: {
    id: string
    type: string
    title: string
    period?: string
    htmlBody: string
  }) => {
    setDocDownloadId(doc.id)
    setMessage('')
    try {
      const base = `${doc.type}${doc.period ? `-${doc.period}` : ''}-${doc.id.slice(-8)}`
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-|-$/g, '')
      const filename = `${base || doc.type}.pdf`

      if (doc.type === 'D22' && dash?.partner) {
        const p = dash.partner
        const abnDigits = digitsOnlyAbn(String(p.abn || ''))
        const openReq = (dash.changeRequests || []).find(
          (r) => r.status === 'awaiting_partner' || r.status === 'under_review' || r.status === 'submitted'
        )
        downloadD22FillablePdf(
          {
            organizationName: p.organizationName,
            contactName: p.contactName,
            partnerId: p.id,
            promoCode: p.linkedPromoCode,
            changeRequestId: openReq?.id,
            kindLabel: openReq ? formatChangeRequestKind(openReq.kind) : undefined,
            partnerMessage: openReq?.message,
            maskedAbn: abnDigits.length === 11 ? formatAbnDisplay(abnDigits) : p.abn || undefined,
            maskedBsb: p.bsb ? maskedBsbValue(p.bsb) : undefined,
            maskedAccount: p.accountNumber ? maskedAccountValue(p.accountNumber) : undefined,
            payeeAccountName: p.accountName,
          },
          filename
        )
        setMessage(`${doc.type} fillable PDF downloaded — complete fields, save, then upload on your change request.`)
        return
      }

      await downloadFundraisingPdf(filename, doc.htmlBody)
      setMessage(`${doc.type} PDF downloaded — ${doc.title}`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'PDF download failed. Please try again.')
    } finally {
      setDocDownloadId(null)
    }
  }

  const partnershipDocuments = useMemo(() => {
    if (!dash) return []
    return dash.documents
      .filter((d) => LOOKUP_PARTNERSHIP_DOC_TYPES.has(d.type) && d.status !== 'Archived')
      .slice()
      .sort((a, b) => {
        const ta = a.sentAt || a.period || a.id
        const tb = b.sentAt || b.period || b.id
        return tb.localeCompare(ta)
      })
  }, [dash])

  const visiblePartnershipDocuments = useMemo(() => {
    if (showAllDocs || partnershipDocuments.length <= LOOKUP_DOCS_PREVIEW_COUNT) {
      return partnershipDocuments
    }
    return partnershipDocuments.slice(0, LOOKUP_DOCS_PREVIEW_COUNT)
  }, [partnershipDocuments, showAllDocs])

  const cards = useMemo(() => {
    if (!dash) return []
    return [
      { label: 'Community orders', value: String(dash.performance.orderCount) },
      { label: FUNDRAISING_COPY.totalCommunitySupport, value: `$${dash.performance.netSales.toFixed(2)}` },
      {
        label: `${FUNDRAISING_COPY.fundraisingCashbackGrant} (${dash.performance.donationRate}%)`,
        value: `$${dash.performance.cashbackEarned.toFixed(2)}`,
      },
    ]
  }, [dash])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LookupPortalChrome
        orgName={dash?.partner.organizationName || orgHint || undefined}
        showEndSession={phase === 'dash'}
        onEndSession={() => void endSession()}
        ending={ending}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {phase !== 'dash' && phase !== 'boot' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-3">
              <ShieldCheck className="w-4 h-4" />
              {FUNDRAISING_COPY.lookupPortalEyebrow}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{FUNDRAISING_COPY.verifyAccessTitle}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {orgHint
                ? `We sent a 6-digit code to the email on file for ${orgHint}.`
                : FUNDRAISING_COPY.verifyAccessBody}
            </p>
            <p className="mt-2 text-xs text-slate-500">{FUNDRAISING_COPY.brandTrust}</p>
            <p className="mt-1 text-xs text-slate-500">
              {FUNDRAISING_COPY.sessionDurationNote.replace('2 hours', `${LOOKUP_SESSION_HOURS} hours`)}
            </p>
            {message && (
              <p
                className={`mt-3 text-sm rounded-lg px-3 py-2 border ${
                  isErrorMessage(message)
                    ? 'text-red-800 bg-red-50 border-red-100'
                    : isWarningMessage(message)
                      ? 'text-amber-900 bg-amber-50 border-amber-100'
                      : 'text-emerald-800 bg-emerald-50 border-emerald-100'
                }`}
              >
                {message}
              </p>
            )}
            <form onSubmit={onVerify} className="mt-6 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Verification code</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.3em] text-lg font-semibold"
                  placeholder="000000"
                />
              </label>
              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="w-full rounded-lg bg-emerald-700 text-white py-2.5 font-semibold hover:bg-emerald-800 disabled:opacity-50"
              >
                {busy ? 'Verifying…' : 'Open partnership dashboard'}
              </button>
            </form>
            <button
              type="button"
              disabled={busy || !token}
              onClick={() => void requestOtp({ reason: 'manual' })}
              className="mt-3 text-sm text-emerald-800 hover:underline disabled:opacity-50"
            >
              Resend verification code
            </button>
            {!token && (
              <p className="mt-2 text-xs text-amber-800">
                Open the latest access link from your welcome email (or ask SELPIC to reset the access link). Resend
                only works with a valid link.
              </p>
            )}
          </section>
        )}

        {phase === 'dash' && dash && (
          <div className="space-y-6">
            {message && (
              <p
                className={`text-sm rounded-lg border px-3 py-2 ${
                  isErrorMessage(message)
                    ? 'border-red-200 bg-red-50 text-red-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                {message}
              </p>
            )}

            {!dash.partner.hasOfficialGrantAccount && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{FUNDRAISING_COPY.grantAccountRequired}</div>
                  <p className="mt-1 text-amber-900/90">{FUNDRAISING_COPY.lookupGrantAccountAlert}</p>
                </div>
                <a
                  href="#grant-account"
                  className="shrink-0 rounded-lg bg-amber-800 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-900"
                >
                  Register now
                </a>
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-2">
                    <HeartHandshake className="w-4 h-4" />
                    {FUNDRAISING_COPY.communityPartner}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {dash.partner.organizationName}
                  </h1>
                  <p className="text-sm text-slate-600 mt-2 max-w-2xl">{FUNDRAISING_COPY.brandLine}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-2.5 py-1 text-xs font-medium capitalize">
                      {dash.partner.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {FUNDRAISING_COPY.grantAccountTitle}:{' '}
                      {dash.partner.hasOfficialGrantAccount ? dash.partner.bankMasked : 'Not registered'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right min-w-[11rem]">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    {FUNDRAISING_COPY.partnerCommunityCode}
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-900 mt-1">
                    {dash.partner.linkedPromoCode}
                  </div>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-800 hover:underline"
                    onClick={() => void copyText(dash.partner.linkedPromoCode)}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy code
                  </button>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-700" />
                {FUNDRAISING_COPY.lookupPrivacyNote}
              </p>
            </section>

            <nav
              className="sticky top-14 z-30 -mx-1 px-1 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200/60"
              aria-label="Portal sections"
            >
              <div className="flex flex-wrap gap-2">
                {DASH_NAV.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-900"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </nav>

            <section id="impact" className="scroll-mt-28 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{FUNDRAISING_COPY.communityImpact}</h2>
                <p className="text-xs text-slate-500 mt-1">{FUNDRAISING_COPY.lookupAllTimeHint}</p>
              </div>
              {dash.nextGrantTransfer && (
                <div
                  className={`rounded-xl border p-4 shadow-sm ${
                    dash.nextGrantTransfer.phase === 'settlement_freeze'
                      ? 'border-amber-300 bg-amber-50/80'
                      : dash.nextGrantTransfer.phase === 'transfer_due_soon' ||
                          dash.nextGrantTransfer.phase === 'transfer_overdue'
                        ? 'border-emerald-300 bg-emerald-50/80'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold uppercase tracking-wide">
                        <CalendarClock className="w-4 h-4 shrink-0" />
                        {dash.nextGrantTransfer.partnerHeadline || FUNDRAISING_COPY.nextGrantTransfer}
                      </div>
                      <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                        {dash.nextGrantTransfer.partnerDetail}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">{FUNDRAISING_COPY.nextGrantTransferHint}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white px-4 py-3 text-right min-w-[10rem]">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">Target payout</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                        {dash.nextGrantTransfer.targetPayoutDisplay}
                      </div>
                      <div className="text-xs text-emerald-800 mt-1 font-medium">
                        {dash.nextGrantTransfer.daysUntilPayout > 1
                          ? `In ${dash.nextGrantTransfer.daysUntilPayout} days`
                          : dash.nextGrantTransfer.daysUntilPayout === 1
                            ? 'Tomorrow'
                            : dash.nextGrantTransfer.daysUntilPayout === 0
                              ? 'Today'
                              : `${Math.abs(dash.nextGrantTransfer.daysUntilPayout)} days past target`}
                      </div>
                      {dash.nextGrantTransfer.daysUntilQuarterEnd != null &&
                        dash.nextGrantTransfer.daysUntilQuarterEnd > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            Quarter ends in {dash.nextGrantTransfer.daysUntilQuarterEnd} day
                            {dash.nextGrantTransfer.daysUntilQuarterEnd === 1 ? '' : 's'}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-3">
                {cards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{c.label}</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{c.value}</div>
                  </div>
                ))}
              </div>
              {dash.currentQuarter && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-sky-900">
                    This quarter · {dash.currentQuarter.periodLabel}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{FUNDRAISING_COPY.lookupCurrentQuarterHint}</p>
                  <div className="mt-3 grid sm:grid-cols-3 gap-3">
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">Orders</div>
                      <div className="text-lg font-bold text-slate-900 tabular-nums">{dash.currentQuarter.orderCount}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">{FUNDRAISING_COPY.totalCommunitySupport}</div>
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        ${dash.currentQuarter.netSales.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500">{FUNDRAISING_COPY.fundraisingCashbackGrant}</div>
                      <div className="text-lg font-bold text-slate-900 tabular-nums">
                        ${dash.currentQuarter.cashbackEarned.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {dash.partner.termEndsAt && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Partnership term</h2>
                <p className="text-sm text-slate-700 mt-1">
                  Current term ends{' '}
                  <strong>
                    {new Date(dash.partner.termEndsAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong>
                  {dash.partnership?.termMonths
                    ? ` · ${dash.partnership.termMonths}-month terms`
                    : ' · 12-month terms'}
                  .
                </p>
                {dash.partner.renewalIntent === 'wants_renew' && (
                  <p className="text-sm text-emerald-800 mt-2 font-medium">
                    You confirmed renewal. Your term has been extended — thank you for continuing with SELPIC.
                  </p>
                )}
                {dash.partner.renewalIntent === 'declines' && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-sm text-slate-700">
                      You indicated you prefer not to renew. Check your email for acknowledgement of how access and
                      records are handled. Our team may contact you before any suspension.
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {FUNDRAISING_COPY.partnershipEndDataShort}
                    </p>
                  </div>
                )}
                {dash.partner.renewalIntent !== 'wants_renew' && dash.partner.renewalIntent !== 'declines' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={renewalBusy}
                        onClick={() => void submitRenewal('wants_renew')}
                        className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {renewalBusy ? 'Saving…' : 'Yes — renew for another year'}
                      </button>
                      <button
                        type="button"
                        disabled={renewalBusy}
                        onClick={() => void submitRenewal('declines')}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        No — do not renew
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {FUNDRAISING_COPY.partnershipEndLookupHint}
                    </p>
                  </div>
                )}
              </section>
            )}

            <section
              id="grant-account"
              className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="font-semibold text-slate-900 mb-1">{FUNDRAISING_COPY.grantAccountTitle}</h2>
              <p className="text-sm text-slate-600 mb-4">{FUNDRAISING_COPY.grantAccountHelp}</p>

              {dash.partner.hasOfficialGrantAccount ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="text-sm text-slate-800">
                    <div className="font-medium">{dash.partner.accountName || '—'}</div>
                    <div className="text-slate-600 mt-0.5">{maskAbn(dash.partner.abn)}</div>
                    <div className="text-slate-600 mt-0.5">
                      {maskBsb(dash.partner.bsb)} / {maskAccount(dash.partner.accountNumber)}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{FUNDRAISING_COPY.grantAccountRequestHelp}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
                  {FUNDRAISING_COPY.grantAccountNotRegistered}
                </div>
              )}

              {!requestingAccount ? (
                <button
                  type="button"
                  className="mt-4 text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => setRequestingAccount(true)}
                >
                  {FUNDRAISING_COPY.grantAccountRequestCta}
                </button>
              ) : (
                <form onSubmit={submitAccountRequest} className="mt-4 space-y-3 max-w-xl">
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Request type</span>
                    <select
                      value={requestKind}
                      onChange={(e) => setRequestKind(e.target.value as FundraisingChangeRequestKind)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="grant_account">Official Grant Account</option>
                      <option value="contact">Contact details</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">{FUNDRAISING_COPY.grantAccountRequestNoteLabel}</span>
                    <textarea
                      required
                      value={accountRequestNote}
                      onChange={(e) => setAccountRequestNote(e.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="e.g. Our school board account has changed. Please send the form so we can update Official Grant Account details."
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      {FUNDRAISING_COPY.grantAccountRequestIntakeHint}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {busy ? 'Sending…' : FUNDRAISING_COPY.grantAccountRequestSubmit}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-4 py-2 text-sm"
                      onClick={() => setRequestingAccount(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {(dash.changeRequests?.length || 0) > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Your change requests</h3>
                  {dash.changeRequests!.slice(0, 8).map((r) => (
                    <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">
                          {formatChangeRequestKind(r.kind)} ·{' '}
                          {formatChangeRequestStatus(r.status as Parameters<typeof formatChangeRequestStatus>[0])}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(r.updatedAt || r.createdAt).toLocaleDateString('en-AU')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {partnerFacingChangeRequestHint({
                          status: r.status as Parameters<typeof partnerFacingChangeRequestHint>[0]['status'],
                        })}
                      </p>
                      {r.message && <p className="mt-2 text-slate-700 whitespace-pre-wrap">{r.message}</p>}
                      {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                        <ul className="mt-2 text-xs text-slate-600 list-disc pl-4">
                          {r.attachments.map((a) => (
                            <li key={a.id}>{a.fileName}</li>
                          ))}
                        </ul>
                      )}
                      {(r.status === 'awaiting_partner' || r.status === 'under_review') && (
                        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                          <textarea
                            value={replyDrafts[r.id] || ''}
                            onChange={(e) => setReplyDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                            placeholder="Optional note (e.g. Completed D22 attached for Official Grant Account update)."
                          />
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-700">
                              Attach completed forms (PDF, JPG, PNG, or Word — up to 5 files, 8 MB each)
                            </p>
                            <input
                              key={`reply-files-${r.id}-${replyFileInputKey[r.id] || 0}`}
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
                              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
                              onChange={(e) => {
                                const list = e.target.files
                                const next = list ? Array.from(list) : []
                                setReplyFiles((d) => ({ ...d, [r.id]: next }))
                              }}
                            />
                            {(replyFiles[r.id] || []).length > 0 ? (
                              <ul className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-2 space-y-0.5">
                                {(replyFiles[r.id] || []).map((f) => (
                                  <li key={`${f.name}-${f.size}-${f.lastModified}`}>
                                    Ready to send: <strong>{f.name}</strong> ({Math.max(1, Math.round(f.size / 1024))} KB)
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-500">No file selected yet.</p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={replyBusyId === r.id}
                            onClick={() => void submitRequestReply(r.id)}
                            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-900 disabled:opacity-50"
                          >
                            {replyBusyId === r.id ? 'Sending…' : 'Send reply & files to SELPIC'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section id="share" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-1">{FUNDRAISING_COPY.marketingHub}</h2>
              <p className="text-sm text-slate-600 mb-3">
                Share your Partner Community Code with families. Parents receive {dash.performance.parentDisplayRate}%
                off at checkout; your organisation earns the Fundraising Cashback Grant. Download a print-ready A4
                flyer with your organisation name and code filled in.
              </p>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {FUNDRAISING_COPY.customerAccountIndependence}
              </p>
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
                  disabled={flyerBusy}
                  onClick={() => void downloadFlyer()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 text-white px-3 py-2 text-sm disabled:opacity-50"
                >
                  {flyerBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Preparing PDF…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download family flyer (A4 PDF)
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 border rounded-lg p-3">{dash.marketing.shareCopyText}</p>
            </section>

            <section
              id="transfers"
              className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto"
            >
              <h2 className="font-semibold text-slate-900 mb-1">{FUNDRAISING_COPY.settlementArchive}</h2>
              <p className="text-xs text-slate-500 mb-3">{FUNDRAISING_COPY.lookupTransfersHint}</p>
              <table className="min-w-full text-sm">
                <thead className="text-left bg-slate-50">
                  <tr>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">{FUNDRAISING_COPY.totalCommunitySupport}</th>
                    <th className="px-3 py-2">{FUNDRAISING_COPY.fundraisingCashbackGrant}</th>
                    <th className="px-3 py-2">Target payout</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dash.settlements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                        No grant transfers yet. After SELPIC completes a quarterly transfer, it will appear here.
                      </td>
                    </tr>
                  )}
                  {dash.settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">{s.period}</td>
                      <td className="px-3 py-2 tabular-nums">${s.netSales.toFixed(2)}</td>
                      <td className="px-3 py-2 tabular-nums">${s.commissionAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {s.status === 'Paid' && s.paidAt
                          ? `Paid ${new Date(s.paidAt).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : s.targetPayoutDisplay || '—'}
                      </td>
                      <td className="px-3 py-2">{grantSettlementStatusLabel(s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section
              id="documents"
              className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{FUNDRAISING_COPY.documentsTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Welcome pack, grant statements, renewal notices, and related partnership documents sent to your organisation.
                  </p>
                </div>
                {partnershipDocuments.length > 0 && (
                  <p className="text-xs text-slate-500">
                    {partnershipDocuments.length} document
                    {partnershipDocuments.length === 1 ? '' : 's'} · newest first
                  </p>
                )}
              </div>
              {partnershipDocuments.length === 0 ? (
                <p className="text-sm text-slate-500">No partnership documents yet.</p>
              ) : (
                <>
                  <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {visiblePartnershipDocuments.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-medium text-slate-800">{d.type}</span>
                          <span className="text-slate-600">
                            {' '}
                            — {d.title}
                            {d.period ? ` (${d.period})` : ''}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={docDownloadId === d.id}
                          className="inline-flex shrink-0 items-center gap-1 text-emerald-800 hover:underline disabled:opacity-50"
                          onClick={() => void downloadDoc(d)}
                        >
                          {docDownloadId === d.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing PDF…
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" /> Download PDF
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  {partnershipDocuments.length > LOOKUP_DOCS_PREVIEW_COUNT && (
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-emerald-800 hover:underline"
                      onClick={() => setShowAllDocs((v) => !v)}
                    >
                      {showAllDocs
                        ? 'Show fewer'
                        : `Show all ${partnershipDocuments.length} documents`}
                    </button>
                  )}
                </>
              )}
            </section>

            <footer className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-500 space-y-1">
              <p>
                Session stays active for {LOOKUP_SESSION_HOURS} hours on this browser. Use End session when finished on a
                shared computer.
              </p>
              <p>{FUNDRAISING_COPY.lookupFooterSupport}</p>
            </footer>
          </div>
        )}

        {phase === 'boot' && (
          <div className="flex items-center justify-center gap-2 text-slate-600 text-sm py-16">
            <Loader2 className="w-4 h-4 animate-spin" /> Opening secure partnership portal…
          </div>
        )}
      </main>
    </div>
  )
}

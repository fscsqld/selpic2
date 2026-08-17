'use client'

import { useMemo, useState } from 'react'
import type { FundraisingChangeRequest, FundraisingPartner } from '@/lib/fundraising/types'
import {
  formatChangeRequestKind,
  formatChangeRequestStatus,
  isOpenFundraisingChangeRequestStatus,
} from '@/lib/fundraising/changeRequests'

type Props = {
  requests: FundraisingChangeRequest[]
  partners: FundraisingPartner[]
  /**
   * inbox — compact cross-partner triage (jump to a partner workspace).
   * partner — full actions for one organization only.
   */
  mode: 'inbox' | 'partner'
  /** Required for mode=partner; ignored for inbox. */
  partnerId?: string | null
  partnerLabel?: string
  onRefresh: () => Promise<void>
  onLoadPartner: (partnerId: string, proposed?: FundraisingChangeRequest['proposed']) => void
  onMessage: (msg: string) => void
}

type CardFeedback = { tone: 'ok' | 'err'; text: string }

export default function FundraisingChangeRequestsPanel({
  requests,
  partners,
  mode,
  partnerId,
  partnerLabel,
  onRefresh,
  onLoadPartner,
  onMessage,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [packNote, setPackNote] = useState('')
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [cardFeedback, setCardFeedback] = useState<Record<string, CardFeedback>>({})

  const scoped = useMemo(() => {
    if (mode === 'partner' && partnerId) {
      return requests.filter((r) => r.partnerId === partnerId)
    }
    return requests
  }, [mode, partnerId, requests])

  const openRequests = useMemo(
    () => scoped.filter((r) => isOpenFundraisingChangeRequestStatus(r.status)),
    [scoped]
  )
  const closedRequests = useMemo(
    () =>
      scoped
        .filter((r) => !isOpenFundraisingChangeRequestStatus(r.status))
        .slice(0, mode === 'partner' ? 25 : 10),
    [scoped, mode]
  )

  const patchRequest = async (
    requestId: string,
    body: Record<string, unknown>
  ): Promise<boolean> => {
    setBusyId(requestId)
    setCardFeedback((m) => {
      const next = { ...m }
      delete next[requestId]
      return next
    })
    try {
      const res = await fetch('/api/admin/fundraising/change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, requestId }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Update failed')

      const updated = json?.request as FundraisingChangeRequest | undefined
      const partner = partners.find((p) => p.id === (updated?.partnerId || body.partnerId))
      let msg =
        typeof json?.message === 'string' && json.message.trim()
          ? json.message
          : 'Change request updated'
      if (body.action === 'send_pack' && updated && !json?.message) {
        const email = (json?.emailedTo as string | undefined) || partner?.contactEmail || 'partner email'
        msg = `D22 notice emailed to ${email}. Status: ${formatChangeRequestStatus(updated.status)}. Partner downloads the fillable form from Lookup Documents, then uploads the completed file on the change request.`
      } else if (updated && body.action !== 'send_pack' && !json?.message) {
        msg = `Change request → ${formatChangeRequestStatus(updated.status)}`
      }
      setCardFeedback((m) => ({
        ...m,
        [requestId]: { tone: 'ok', text: msg },
      }))
      onMessage(msg)
      await onRefresh()
      return true
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Update failed'
      setCardFeedback((m) => ({
        ...m,
        [requestId]: { tone: 'err', text: err },
      }))
      onMessage(err)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const renderInboxRow = (r: FundraisingChangeRequest) => {
    const partner = partners.find((p) => p.id === r.partnerId)
    return (
      <div key={r.id} className="px-4 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-slate-900 truncate">
            {r.organizationName}{' '}
            <span className="text-xs font-normal text-slate-500">· {formatChangeRequestKind(r.kind)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {formatChangeRequestStatus(r.status)} ·{' '}
            {new Date(r.updatedAt || r.createdAt).toLocaleString('en-AU')}
            {r.message ? ` · ${r.message.slice(0, 80)}${r.message.length > 80 ? '…' : ''}` : ''}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs px-2.5 py-1.5 rounded bg-sky-700 text-white hover:bg-sky-800"
          onClick={() => onLoadPartner(r.partnerId, r.proposed)}
          disabled={!partner && !r.partnerId}
        >
          Open partner workspace
        </button>
      </div>
    )
  }

  const renderCard = (r: FundraisingChangeRequest, open: boolean) => {
    const partner = partners.find((p) => p.id === r.partnerId)
    const notes = adminNotes[r.id] ?? r.adminNotes ?? ''
    const feedback = cardFeedback[r.id]
    const packSentLabel = r.packSentAt
      ? `Form pack last sent ${new Date(r.packSentAt).toLocaleString('en-AU')}`
      : null
    const showLoadPartner = open && partner && mode === 'inbox'
    return (
      <div key={r.id} className="px-4 py-3 text-sm space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-medium text-slate-900">
              {mode === 'partner' ? formatChangeRequestKind(r.kind) : (
                <>
                  {r.organizationName}{' '}
                  <span className="text-xs font-normal text-slate-500">· {formatChangeRequestKind(r.kind)}</span>
                </>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {formatChangeRequestStatus(r.status)} · {r.id} ·{' '}
              {new Date(r.updatedAt || r.createdAt).toLocaleString('en-AU')}
            </div>
            {packSentLabel && (
              <div className="text-xs text-emerald-800 mt-0.5 font-medium">{packSentLabel}</div>
            )}
          </div>
          {showLoadPartner && (
            <button
              type="button"
              className="text-xs px-2.5 py-1 rounded border bg-white hover:bg-slate-50"
              onClick={() => onLoadPartner(r.partnerId, r.proposed)}
            >
              Load partner form
            </button>
          )}
        </div>
        {r.message && <p className="text-slate-700 whitespace-pre-wrap">{r.message}</p>}
        {r.proposed && Object.values(r.proposed).some(Boolean) && (
          <pre className="text-xs bg-slate-50 border rounded p-2 overflow-x-auto text-slate-700">
            {Object.entries(r.proposed)
              .filter(([, v]) => Boolean(v))
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}
          </pre>
        )}
        {r.partnerReply && (
          <div className="rounded border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950 whitespace-pre-wrap">
            <strong>Partner reply:</strong> {r.partnerReply}
          </div>
        )}
        {Array.isArray(r.attachments) && r.attachments.length > 0 && (
          <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs space-y-1">
            <strong className="text-slate-800">Attachments</strong>
            <ul className="list-disc pl-4 text-slate-700">
              {r.attachments.map((a) => (
                <li key={a.id}>
                  {a.fileUrl ? (
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-emerald-800 underline">
                      {a.fileName}
                    </a>
                  ) : (
                    a.fileName
                  )}{' '}
                  <span className="text-slate-400">({Math.round(a.size / 1024)} KB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback && (
          <div
            className={
              feedback.tone === 'ok'
                ? 'rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-950'
                : 'rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-950'
            }
          >
            {feedback.text}
          </div>
        )}
        {open && (
          <>
            <label className="block text-xs text-slate-600">
              Admin notes
              <textarea
                value={notes}
                onChange={(e) => setAdminNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Internal notes / pack instructions"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === r.id}
                className="text-xs px-2.5 py-1.5 rounded border bg-white disabled:opacity-50"
                onClick={() =>
                  void patchRequest(r.id, {
                    action: 'set_status',
                    status: 'under_review',
                    adminNotes: notes,
                  })
                }
              >
                Mark under review
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className="text-xs px-2.5 py-1.5 rounded bg-emerald-700 text-white disabled:opacity-50"
                onClick={() =>
                  void patchRequest(r.id, {
                    action: 'send_pack',
                    adminNotes: notes,
                    packNote: packNote || notes,
                  })
                }
              >
                {busyId === r.id ? 'Sending notice…' : r.packSentAt ? 'Resend D22 notice' : 'Email D22 notice to partner'}
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className="text-xs px-2.5 py-1.5 rounded border border-emerald-600 text-emerald-800 bg-white disabled:opacity-50"
                onClick={() =>
                  void patchRequest(r.id, {
                    action: 'set_status',
                    status: 'applied',
                    adminNotes: notes,
                  })
                }
              >
                Mark applied
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className="text-xs px-2.5 py-1.5 rounded border text-slate-600 bg-white disabled:opacity-50"
                onClick={() =>
                  void patchRequest(r.id, {
                    action: 'set_status',
                    status: 'declined',
                    adminNotes: notes,
                  })
                }
              >
                Decline
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className="text-xs px-2.5 py-1.5 rounded border text-slate-500 bg-white disabled:opacity-50"
                onClick={() =>
                  void patchRequest(r.id, {
                    action: 'set_status',
                    status: 'closed',
                    adminNotes: notes,
                  })
                }
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (mode === 'inbox') {
    return (
      <div id="change-requests" className="bg-white border rounded-xl overflow-hidden scroll-mt-24">
        <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Change request inbox</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cross-partner triage only. Open a partner workspace to review messages, attachments, and apply changes —
              so work stays scoped to one organization.
            </p>
          </div>
          <span className="text-xs rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 font-medium">
            {openRequests.length} open
          </span>
        </div>
        <div className="divide-y max-h-[16rem] overflow-y-auto">
          {openRequests.length === 0 && (
            <p className="px-4 py-5 text-sm text-slate-500">No open change requests across partners.</p>
          )}
          {openRequests.map((r) => renderInboxRow(r))}
        </div>
      </div>
    )
  }

  if (!partnerId) {
    return (
      <div
        id="partner-change-requests"
        className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 py-5 scroll-mt-24"
      >
        <h2 className="font-semibold text-slate-800">Partner change requests</h2>
        <p className="text-sm text-slate-600 mt-1">
          Select a partner from the list (or from the inbox) to manage that organization&apos;s requests here.
        </p>
      </div>
    )
  }

  return (
    <div id="partner-change-requests" className="bg-white border rounded-xl overflow-hidden scroll-mt-24">
      <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">
            Change requests
            {partnerLabel ? (
              <span className="font-normal text-slate-600"> · {partnerLabel}</span>
            ) : null}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scoped to this partner only. Email D22 notice (instructions, no PDF attachment) → partner uploads from
            Lookup → verify → Save partner form → Mark applied.
          </p>
        </div>
        <span className="text-xs rounded-full bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 font-medium">
          {openRequests.length} open
        </span>
      </div>
      <div className="px-4 py-2 border-b bg-slate-50">
        <label className="block text-xs text-slate-600">
          Default pack note (included when emailing form pack)
          <input
            value={packNote}
            onChange={(e) => setPackNote(e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white"
            placeholder="e.g. Please confirm ABN and school board account name"
          />
        </label>
      </div>
      <div className="divide-y max-h-[28rem] overflow-y-auto">
        {openRequests.length === 0 && closedRequests.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">No change requests for this partner yet.</p>
        )}
        {openRequests.length === 0 && closedRequests.length > 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">No open requests for this partner.</p>
        )}
        {openRequests.map((r) => renderCard(r, true))}
        {closedRequests.length > 0 && (
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
            Recently closed (this partner)
          </div>
        )}
        {closedRequests.map((r) => renderCard(r, false))}
      </div>
    </div>
  )
}

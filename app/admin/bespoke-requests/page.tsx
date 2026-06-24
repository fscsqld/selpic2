'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { emailService, emailTemplates, EmailTemplate } from '@/lib/emailService'
import {
  History,
  Image as ImageIcon,
  Layout,
  Loader2,
  Pencil,
  Reply,
  Search,
  Send,
  X,
} from 'lucide-react'

type BespokeStickerRequestStatus = 'new' | 'reviewed' | 'replied' | 'approved' | 'rejected'

type BespokeStickerRequestRecord = {
  id: string
  createdAt: string
  status: BespokeStickerRequestStatus
  payload: any
  logo?: {
    fileUrl: string
    mimeType: string
    originalName: string
    size: number
  }
}

type BespokeEmailHistory = {
  id: string
  requestId: string
  customerEmail: string
  customerName: string
  subject: string
  content: string
  sentAt: Date
  status: 'sent' | 'failed'
  templateUsed?: string
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function statusBadge(status: BespokeStickerRequestStatus) {
  switch (status) {
    case 'new':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'reviewed':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'replied':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

function buildDefaultReplySubject(record: BespokeStickerRequestRecord): string {
  const roll = record.payload?.roll?.variant || record.payload?.roll?.preset || 'bespoke label'
  return `Re: Your ${roll} request`
}

function buildRequestSummary(record: BespokeStickerRequestRecord): string {
  const roll = record.payload?.roll
  const text = record.payload?.text
  const lines = [
    `Roll: ${roll?.preset || '-'}${roll?.variant ? ` (${roll.variant})` : ''}`,
    `Text: ${text?.line1 || '-'}${text?.layout === 'two' && text?.line2 ? ` / ${text.line2}` : ''}`,
    record.payload?.logo?.placementNotes
      ? `Logo notes: ${record.payload.logo.placementNotes}`
      : null,
  ].filter(Boolean)
  return lines.join('\n')
}

export default function AdminBespokeRequestsPage() {
  return (
    <AdminRoute requiredPermissions={['messages:read']}>
      <AdminBespokeRequestsContent />
    </AdminRoute>
  )
}

function AdminBespokeRequestsContent() {
  const [records, setRecords] = useState<BespokeStickerRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BespokeStickerRequestRecord | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showReplyModal, setShowReplyModal] = useState(false)
  const [showEmailHistory, setShowEmailHistory] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailHistoryByRequestId, setEmailHistoryByRequestId] = useState<Record<string, BespokeEmailHistory[]>>({})
  const [loadingEmailHistoryFor, setLoadingEmailHistoryFor] = useState<string | null>(null)

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      const c = r.payload?.contact || {}
      const fields = [
        r.id,
        r.status,
        c?.name,
        c?.email,
        c?.phone,
        c?.extra,
        r.payload?.roll?.preset,
        r.payload?.roll?.variant,
        r.payload?.roll?.characterProductName,
        r.payload?.logo?.placementNotes,
      ]
      return fields.some((f) => typeof f === 'string' && f.toLowerCase().includes(q))
    })
  }, [records, search])

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bespoke-requests/stickers/custom', { credentials: 'same-origin' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch')
      setRecords(data.records || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  const resolveEmailHistory = useCallback(
    (requestId: string): BespokeEmailHistory[] => emailHistoryByRequestId[requestId] ?? [],
    [emailHistoryByRequestId]
  )

  const loadServerEmailHistory = async (requestId: string, customerName?: string) => {
    setLoadingEmailHistoryFor(requestId)
    try {
      const res = await fetch(`/api/admin/bespoke-requests/${encodeURIComponent(requestId)}/emails`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok || !json?.ok || !Array.isArray(json.emails)) {
        throw new Error(json?.error || 'EMAIL_HISTORY_LOAD_FAILED')
      }

      const name =
        customerName ||
        (selected?.id === requestId
          ? selected?.payload?.contact?.name
          : records.find((r) => r.id === requestId)?.payload?.contact?.name) ||
        'Customer'

      const mapped: BespokeEmailHistory[] = json.emails
        .map((e: any) => ({
          id: String(e.id || ''),
          requestId: String(e.bespoke_request_id || requestId),
          customerEmail: String(e.to_email || ''),
          customerName: name || 'Customer',
          subject: String(e.subject || ''),
          content: String(e.content_text || ''),
          sentAt: e.sent_at ? new Date(e.sent_at) : new Date(),
          status: (e.status === 'sent' ? 'sent' : 'failed') as 'sent' | 'failed',
          templateUsed: typeof e.template_used === 'string' ? e.template_used : undefined,
        }))
        .filter((x: BespokeEmailHistory) => Boolean(x.id))

      setEmailHistoryByRequestId((prev) => ({ ...prev, [requestId]: mapped }))
    } finally {
      setLoadingEmailHistoryFor((current) => (current === requestId ? null : current))
    }
  }

  const openRequest = (record: BespokeStickerRequestRecord, number: number) => {
    setSelected(record)
    setSelectedNumber(number)
    void loadServerEmailHistory(record.id, record.payload?.contact?.name).catch(() => {
      // non-fatal
    })
  }

  const updateStatus = async (id: string, status: BespokeStickerRequestStatus) => {
    setStatusUpdatingId(id)
    try {
      const res = await fetch(`/api/bespoke-requests/stickers/custom/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed')
      await reload()
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
    } catch {
      alert('Failed to update status.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const deleteRequest = async (id: string) => {
    if (!confirm('Delete this bespoke label request? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/bespoke-requests/stickers/custom/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Delete failed')
      }
      setSelected(null)
      setSelectedNumber(null)
      setEmailHistoryByRequestId((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await reload()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartReply = () => {
    if (!selected) return
    setEmailSubject(buildDefaultReplySubject(selected))
    setReplyText('')
    setSelectedTemplate(null)
    setShowTemplates(false)
    setShowReplyModal(true)
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setEmailSubject(template.subject)
    setReplyText(template.content)
    setShowTemplates(false)
  }

  const handleReply = async () => {
    if (!selected || (!replyText.trim() && !selectedTemplate)) {
      alert('Please enter a message or select a template')
      return
    }

    const contact = selected.payload?.contact || {}
    const customerEmail = String(contact.email || '').trim()
    if (!customerEmail || !customerEmail.includes('@')) {
      alert('This request has no valid customer email.')
      return
    }

    setIsSendingEmail(true)
    try {
      const customerName = String(contact.name || 'Customer')
      const summary = buildRequestSummary(selected)
      const messageBody = selectedTemplate
        ? selectedTemplate.content
        : `${replyText.trim()}\n\n---\nYour request summary:\n${summary}\nRequest ID: ${selected.id}`

      const emailResponse = await emailService.sendResponse({
        customerEmail,
        customerName,
        subject: emailSubject || buildDefaultReplySubject(selected),
        message: messageBody,
        originalSubject: buildDefaultReplySubject(selected),
        submissionDate: formatDate(selected.createdAt),
        adminName: 'Selpic Support Team',
        bespokeRequestId: selected.id,
        templateUsed: selectedTemplate?.name,
      })

      if (emailResponse.success) {
        await updateStatus(selected.id, 'replied')
        void loadServerEmailHistory(selected.id, customerName).catch(() => {})
        setShowReplyModal(false)
        setReplyText('')
        setEmailSubject('')
        setSelectedTemplate(null)
        alert('Email sent successfully. Check Email History for the saved reply.')
      } else {
        alert(`Failed to send email: ${emailResponse.message}`)
      }
    } catch (e) {
      console.error('Bespoke reply error:', e)
      alert('Failed to send email. Please try again.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Bespoke Label Requests"
        icon={<Pencil className="w-5 h-5 text-indigo-600" />}
        showLanguageSelector={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by id / email / notes..."
                className="w-full md:w-80 px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={reload}
              className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm">{error}</div>
        ) : null}

        {loading ? <div className="text-gray-500 text-sm">Loading...</div> : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRecords.map((r, idx) => {
            const c = r.payload?.contact || {}
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => openRequest(r, idx + 1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openRequest(r, idx + 1)
                }}
                className="text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge(r.status)}`}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      {c?.name || '(no name)'} {c?.email ? `(${c.email})` : ''}
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Roll: {r.payload?.roll?.preset || '-'}
                      {r.payload?.roll?.variant ? ` (${r.payload.roll.variant})` : ''} | Layout:{' '}
                      {r.payload?.text?.layout || '-'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                      Logo notes: {r.payload?.logo?.placementNotes || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        deleteRequest(r.id)
                      }}
                      disabled={deletingId === r.id}
                      className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingId === r.id ? 'Deleting...' : 'Delete'}
                    </button>
                    {r.logo?.fileUrl ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <img src={r.logo.fileUrl} alt="logo" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {filteredRecords.length === 0 && !loading ? (
            <div className="text-sm text-gray-500 lg:col-span-2">No requests found.</div>
          ) : null}
        </div>

        {selected ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-3xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
              <div className="p-4 sm:p-6 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Request #{selectedNumber ?? '-'}</h2>
                  <div className="text-xs text-gray-500 mt-1">{formatDate(selected.createdAt)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    setSelectedNumber(null)
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartReply}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailHistory(true)
                      if (emailHistoryByRequestId[selected.id] === undefined) {
                        void loadServerEmailHistory(selected.id, selected.payload?.contact?.name).catch(() => {})
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Email History ({resolveEmailHistory(selected.id).length})
                  </button>
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatus(selected.id, e.target.value as BespokeStickerRequestStatus)}
                    disabled={statusUpdatingId === selected.id}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="new">new</option>
                    <option value="reviewed">reviewed</option>
                    <option value="replied">replied</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteRequest(selected.id)}
                    disabled={deletingId === selected.id}
                    className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors text-sm font-semibold disabled:opacity-60"
                  >
                    {deletingId === selected.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900">Logo preview</span>
                    </div>
                    {selected.logo?.fileUrl ? (
                      <img
                        src={selected.logo.fileUrl}
                        alt="logo"
                        className="mt-3 max-h-52 w-full object-contain rounded-xl border border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="mt-3 text-sm text-gray-500">No logo image uploaded.</div>
                    )}
                    {selected.logo?.originalName ? (
                      <div className="mt-2 text-xs text-gray-500">
                        {selected.logo.originalName} ({Math.max(1, Math.round(selected.logo.size / 1024))} KB)
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-100 p-4">
                    <div className="text-sm font-semibold text-gray-900">Request details</div>
                    <div className="mt-3 text-xs text-gray-700 space-y-1">
                      <div>
                        <span className="text-gray-500">Contact:</span> {selected.payload?.contact?.name || '-'} (
                        {selected.payload?.contact?.email || '-'})
                      </div>
                      <div>
                        <span className="text-gray-500">Roll:</span> {selected.payload?.roll?.preset || '-'}
                        {selected.payload?.roll?.variant ? ` (${selected.payload.roll.variant})` : ''}
                      </div>
                      <div>
                        <span className="text-gray-500">Text:</span> {selected.payload?.text?.layout || '-'}{' '}
                        {selected.payload?.text?.line1 || ''}
                      </div>
                      {selected.payload?.text?.layout === 'two' ? (
                        <div>
                          <span className="text-gray-500">Text line2:</span> {selected.payload?.text?.line2 || '-'}
                        </div>
                      ) : null}
                      <div>
                        <span className="text-gray-500">Logo placement notes:</span>{' '}
                        {selected.payload?.logo?.placementNotes || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <details className="bg-white border border-gray-100 rounded-2xl p-4">
                  <summary className="text-sm font-semibold text-gray-900 cursor-pointer">Raw payload (debug)</summary>
                  <pre className="mt-2 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        ) : null}

        {showReplyModal && selected ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reply to {selected.payload?.contact?.name || 'Customer'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  <Layout className="w-4 h-4 mr-2" />
                  Templates
                </button>
              </div>
              <div className="p-6 space-y-4">
                {showTemplates ? (
                  <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {emailTemplates
                      .filter((t) => t.category === 'general')
                      .map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template)}
                          className={`p-3 text-left border rounded-lg text-sm ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.subject}</div>
                        </button>
                      ))}
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={8}
                    placeholder="Type your reply to the customer..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    disabled={Boolean(selectedTemplate)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyModal(false)
                      setReplyText('')
                      setSelectedTemplate(null)
                    }}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={isSendingEmail || (!replyText.trim() && !selectedTemplate)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showEmailHistory && selected ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Email History — {selected.payload?.contact?.name || 'Customer'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEmailHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                {loadingEmailHistoryFor === selected.id && emailHistoryByRequestId[selected.id] === undefined ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin text-gray-300" />
                    Loading email history…
                  </div>
                ) : resolveEmailHistory(selected.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No emails sent yet. Use Reply to contact the customer.</div>
                ) : (
                  <div className="space-y-4">
                    {resolveEmailHistory(selected.id).map((email) => (
                      <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">{email.subject}</span>
                          <span className="text-xs text-gray-500">{email.sentAt.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">To: {email.customerEmail}</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{email.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

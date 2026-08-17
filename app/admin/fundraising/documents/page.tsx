'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import { logAdminActivity } from '@/lib/logAdminActivity'
import { useFundraisingStore } from '@/lib/fundraising/store'
import { generateFundraisingDoc } from '@/lib/fundraising/generateDoc'
import { buildPartnerFacingLookupUrl } from '@/lib/fundraising/partnerFacingSite'
import {
  FUNDRAISING_DOCUMENT_LABELS,
  FundraisingDocumentType,
} from '@/lib/fundraising/types'
import {
  createSampleFundraisingPartner,
  SAMPLE_PARTNER_ID,
  sampleDocumentExtras,
} from '@/lib/fundraising/samplePartner'
import { emailService } from '@/lib/emailService'
import { useDocumentSendLogStore } from '@/lib/documentSendLogStore'
import { fundraisingHtmlToPdfFile } from '@/lib/fundraising/htmlToPdfClient'
import { buildFundraisingDocCoverPlainText } from '@/lib/fundraising/documents'
import { fundraisingDocNeedsPdfAttachment } from '@/lib/fundraising/pdfAttachmentPolicy'
import { healFundraisingDocumentHtml } from '@/lib/fundraising/partnerFacingSite'
import {
  currentAuFyQuarterPeriodId,
} from '@/lib/fundraising/auFinancialQuarter'
import { AuFyQuarterSelect } from '@/components/admin/AuFyQuarterSelect'
import { Eye, HeartHandshake, Save } from 'lucide-react'

const DOC_TYPES = Object.keys(FUNDRAISING_DOCUMENT_LABELS) as FundraisingDocumentType[]
const DOC_HISTORY_PAGE_SIZE = 10

export default function FundraisingDocumentsPage() {
  return (
    <AdminRoute requiredPermissions={['analytics:read']}>
      <DocumentsContent />
    </AdminRoute>
  )
}

function DocumentsContent() {
  const { adminUser } = useAdminAuth()
  const partners = useFundraisingStore((s) => s.partners)
  const settings = useFundraisingStore((s) => s.settings)
  const documents = useFundraisingStore((s) => s.documents)
  const updateDocumentStatus = useFundraisingStore((s) => s.updateDocumentStatus)
  const mergeRemote = useFundraisingStore((s) => s.mergeRemote)
  const addDocument = useFundraisingStore((s) => s.addDocument)
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)

  const samplePartner = useMemo(() => createSampleFundraisingPartner(), [])

  const [partnerId, setPartnerId] = useState(SAMPLE_PARTNER_ID)
  const [docType, setDocType] = useState<FundraisingDocumentType>('D2')
  const [period, setPeriod] = useState(() => currentAuFyQuarterPeriodId())
  const [previewHtml, setPreviewHtml] = useState('')
  const [editHtml, setEditHtml] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [editMode, setEditMode] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyType, setHistoryType] = useState<'all' | FundraisingDocumentType>('all')
  const [historyScope, setHistoryScope] = useState<'sent_failed' | 'archived' | 'all_send'>('sent_failed')
  const [historyPage, setHistoryPage] = useState(1)

  const isSample = partnerId === SAMPLE_PARTNER_ID || !partnerId
  const partner = useMemo(() => {
    if (isSample) return samplePartner
    return partners.find((p) => p.id === partnerId) || samplePartner
  }, [isSample, partnerId, partners, samplePartner])

  const syncFromServer = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/fundraising')
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Sync failed')
      mergeRemote({
        partners: json.partners,
        documents: json.documents,
        settlements: json.settlements,
        settings: json.settings,
      })
      setMessage(`Synced documents · ${json.documents?.length || 0} on server`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void syncFromServer()
    if (partners.length === 0) setPartnerId(SAMPLE_PARTNER_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const historyDocs = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    const filtered = documents.filter((d) => {
      // Send history purpose: only emailed / failed / archived — not Generate drafts
      if (historyScope === 'sent_failed') {
        if (d.status !== 'Sent' && d.status !== 'Failed') return false
      } else if (historyScope === 'archived') {
        if (d.status !== 'Archived') return false
      } else {
        // all_send
        if (d.status !== 'Sent' && d.status !== 'Failed' && d.status !== 'Archived') return false
      }
      if (historyType !== 'all' && d.type !== historyType) return false
      if (!q) return true
      const partnerName =
        d.partnerId ? partners.find((x) => x.id === d.partnerId)?.organizationName || '' : ''
      const hay = `${d.type} ${d.title} ${d.period || ''} ${d.status} ${partnerName}`.toLowerCase()
      return hay.includes(q)
    })
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.sentAt || a.updatedAt || a.createdAt || 0).getTime()
      const tb = new Date(b.sentAt || b.updatedAt || b.createdAt || 0).getTime()
      return tb - ta
    })
  }, [documents, historySearch, historyType, historyScope, partners])

  const historyTotalPages = Math.max(1, Math.ceil(historyDocs.length / DOC_HISTORY_PAGE_SIZE))
  const historyPageSafe = Math.min(historyPage, historyTotalPages)
  const pagedHistoryDocs = useMemo(() => {
    const start = (historyPageSafe - 1) * DOC_HISTORY_PAGE_SIZE
    return historyDocs.slice(start, start + DOC_HISTORY_PAGE_SIZE)
  }, [historyDocs, historyPageSafe])

  useEffect(() => {
    setHistoryPage(1)
  }, [historySearch, historyType, historyScope])

  const buildDoc = (type: FundraisingDocumentType, forPartner = partner) => {
    const extras =
      forPartner.id === SAMPLE_PARTNER_ID
        ? sampleDocumentExtras(forPartner, settings, period || undefined)
        : {
            promoCode: forPartner.linkedPromoCode,
            donationRate: settings.donationRate,
            parentDisplayRate: settings.parentDisplayRate,
            sampleKitRequested: forPartner.sampleKitRequested ? 'yes' : undefined,
            postalAddress: forPartner.postalAddress,
            lookupUrl: forPartner.lookupToken
              ? buildPartnerFacingLookupUrl(forPartner.lookupToken)
              : undefined,
            period: period || undefined,
          }
    return generateFundraisingDoc(type, {
      partner: forPartner,
      settings,
      period: period || undefined,
      extra: extras,
      status: 'Generated',
    })
  }

  const generate = () => {
    const doc = buildDoc(docType)
    const saved = addDocument({
      ...doc,
      partnerId: isSample ? undefined : partnerId,
      status: 'Generated',
    })
    if (!isSample) {
      void fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: { ...saved, partnerId } }),
      })
    }
    setPreviewHtml(saved.htmlBody)
    setEditHtml(saved.htmlBody)
    setPreviewId(saved.id)
    setDirty(false)
    setMessage(
      isSample
        ? `Preview ready: ${docType} — ${FUNDRAISING_DOCUMENT_LABELS[docType]} (sample). Send history only lists emailed documents.`
        : `Draft ready: ${docType} — ${FUNDRAISING_DOCUMENT_LABELS[docType]}. It appears in Document send history only after you Send email.`
    )
  }

  const previewAll = () => {
    const htmlParts = DOC_TYPES.map((t) => {
      const doc = buildDoc(t)
      return `<section style="margin-bottom:48px;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#0f172a;color:#fff;padding:10px 14px;font-weight:600">${t} — ${FUNDRAISING_DOCUMENT_LABELS[t]}</div>
        <div style="padding:8px">${doc.htmlBody}</div>
      </section>`
    }).join('\n')
    const pack = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>All fundraising docs preview</title></head><body style="font-family:system-ui;padding:16px;background:#f8fafc">${htmlParts}</body></html>`
    setPreviewHtml(pack)
    setEditHtml(pack)
    setPreviewId(null)
    setDirty(false)
    setMessage(`Preview pack: all ${DOC_TYPES.length} document types.`)
  }

  const saveEdits = () => {
    if (!previewId) {
      setMessage('Generate a single document first to save edits.')
      return
    }
    updateDocumentStatus(previewId, 'Generated', { htmlBody: editHtml })
    setPreviewHtml(editHtml)
    setDirty(false)
    const doc = useFundraisingStore.getState().documents.find((d) => d.id === previewId)
    if (doc && doc.partnerId) {
      void fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: { ...doc, htmlBody: editHtml, status: 'Generated' } }),
      })
    }
    setMessage('Edits saved. Review the preview, then Send / Resend when ready.')
  }

  const sendDoc = async (documentId: string, viaResendApi = false) => {
    if (isSample && partnerId === SAMPLE_PARTNER_ID) {
      setMessage('Select a real partner before sending. Sample partner is for preview/edit only.')
      return
    }
    const doc =
      documents.find((d) => d.id === documentId) ||
      useFundraisingStore.getState().documents.find((d) => d.id === documentId)
    if (!doc) return
    const p = doc.partnerId
      ? useFundraisingStore.getState().getPartnerById(doc.partnerId)
      : partners.find((x) => x.id === partnerId)
    if (!p?.contactEmail || p.id === SAMPLE_PARTNER_ID) {
      setMessage('Partner email required to send. Select a real partner.')
      return
    }

    const htmlToSend = healFundraisingDocumentHtml(
      documentId === previewId && editHtml ? editHtml : doc.htmlBody
    )
    if (documentId === previewId && dirty) {
      updateDocumentStatus(documentId, 'Generated', { htmlBody: editHtml })
    }

    // Prefer client PDF (visual fidelity). Server resend keeps a text PDF fallback.
    if (viaResendApi && doc.partnerId) {
      try {
        setMessage('Sending…')
        const res = await fetch('/api/admin/fundraising', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partner: p,
            document: { ...doc, htmlBody: htmlToSend },
            lifecycle: { kind: 'resend', documentId },
          }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error || 'Resend failed')
        if (json.resend) {
          mergeRemote({ documents: [json.resend] })
          setMessage(`Resent ${doc.type} (with PDF) to ${p.contactEmail}`)
          logAdminActivity({
            action: 'fundraising_document_sent',
            target: p.id,
            field: doc.type,
            description: `${adminUser?.username || adminUser?.email || 'Admin'} resent ${doc.type} to ${p.contactEmail} · ${p.organizationName} (${p.id})`,
          })
        }
        return
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Resend failed')
        return
      }
    }

    const sentBy = adminUser?.username || adminUser?.email || 'Admin'
    try {
      const needsPdf = fundraisingDocNeedsPdfAttachment(doc.type)
      let pdf: File | undefined
      if (needsPdf) {
        setMessage('Preparing PDF attachment…')
        const pdfName = `SELPIC-${doc.type}-${(p.organizationName || 'partner').replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40)}.pdf`
        // Always use full HTML → iframe capture. Do NOT capture the preview panel
        // (max-h / overflow crops Payment Destination + footer).
        pdf = await fundraisingHtmlToPdfFile(htmlToSend, pdfName)
      } else {
        setMessage('Sending…')
      }

      // Settlement docs: short cover + PDF. Registration/welcome etc.: full HTML body, no attachment.
      const cover = needsPdf
        ? buildFundraisingDocCoverPlainText({
            contactName: p.contactName,
            organizationName: p.organizationName,
            documentTitle: doc.title,
            documentType: doc.type,
            period: doc.period,
          })
        : undefined
      const emailRes = await emailService.sendResponse({
        customerEmail: p.contactEmail,
        customerName: p.contactName,
        subject: `SELPIC Fundraising — ${doc.title}`,
        message: cover || doc.title,
        adminName: sentBy,
        ...(needsPdf
          ? { attachments: pdf ? [pdf] : undefined }
          : { html: htmlToSend }),
      })
      const log = addSendLog({
        documentType: 'other',
        documentNumber: `${doc.type}-${doc.id.slice(-8)}`,
        recipientEmail: p.contactEmail,
        recipientName: p.contactName,
        subject: doc.title,
        content: needsPdf
          ? `${(cover || '').slice(0, 400)} [PDF attached: ${pdf?.name || 'n/a'}]`
          : htmlToSend.slice(0, 500),
        sentBy,
        status: emailRes.success ? 'sent' : 'failed',
        source: 'other',
        errorMessage: emailRes.success ? undefined : emailRes.message,
      })
      const nextStatus = emailRes.success ? ('Sent' as const) : ('Failed' as const)
      updateDocumentStatus(doc.id, nextStatus, { sendLogId: log.id, htmlBody: htmlToSend })
      void fetch('/api/admin/fundraising', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            ...doc,
            htmlBody: htmlToSend,
            status: nextStatus,
            sentAt: emailRes.success ? new Date().toISOString() : doc.sentAt,
            sendLogId: log.id,
            updatedAt: new Date().toISOString(),
          },
        }),
      })
      setMessage(
        emailRes.success
          ? needsPdf
            ? `Sent ${doc.type} with PDF to ${p.contactEmail}`
            : `Sent ${doc.type} to ${p.contactEmail}`
          : `Send failed: ${emailRes.message}`
      )
      if (emailRes.success) {
        logAdminActivity({
          action: 'fundraising_document_sent',
          target: p.id,
          field: doc.type,
          description: `${sentBy} sent ${doc.type} to ${p.contactEmail} · ${p.organizationName} (${p.id})`,
        })
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Send failed')
    }
  }

  const archive = (documentId: string) => {
    updateDocumentStatus(documentId, 'Archived')
    setMessage('Document archived.')
  }

  const openPreview = (html: string, id: string | null) => {
    setPreviewHtml(html)
    setEditHtml(html)
    setPreviewId(id)
    setDirty(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Fundraising Documents"
        icon={<HeartHandshake className="w-6 h-6" />}
        showBackButton
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      <FundraisingAdminShell
        title="Documents (D1–D20)"
        subtitle="Generate & preview drafts above, then Send email. Document send history below lists Sent / Failed (and Archived). Sync pulls cloud email records."
        current="/admin/fundraising/documents"
      >
        {message && (
          <div className="mb-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">{message}</div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncFromServer()}
            className="text-sm rounded-lg border px-3 py-1.5 hover:bg-white disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from server'}
          </button>
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Use Sample partner to preview without a real org, then Resend for cloud history.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 mb-6 grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="text-sm block lg:col-span-2">
            <span className="font-medium">Partner</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
            >
              <option value={SAMPLE_PARTNER_ID}>Sample partner (preview) — no real org required</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.organizationName} ({p.linkedPromoCode || 'no code'})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            <span className="font-medium">Document</span>
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={docType}
              onChange={(e) => setDocType(e.target.value as FundraisingDocumentType)}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} — {FUNDRAISING_DOCUMENT_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <AuFyQuarterSelect value={period} onChange={setPeriod} className="block" />
          <div className="flex flex-col gap-2 justify-end">
            <button
              type="button"
              onClick={generate}
              className="w-full rounded-lg bg-slate-800 text-white px-3 py-2 text-sm font-medium"
            >
              Generate &amp; Preview
            </button>
            <button
              type="button"
              onClick={previewAll}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              Preview all types
            </button>
          </div>
        </div>

        {(previewHtml || editHtml) && (
          <div className="bg-white border rounded-xl p-4 mb-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                Preview {previewId ? `(draft ${previewId.slice(-8)})` : '(pack — not saved)'}
                {dirty ? ' · unsaved edits' : ''}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`text-sm px-3 py-1.5 rounded-lg border ${editMode ? 'bg-slate-100' : ''}`}
                  onClick={() => setEditMode((v) => !v)}
                >
                  {editMode ? 'Hide editor' : 'Edit HTML'}
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg border inline-flex items-center gap-1"
                  onClick={saveEdits}
                  disabled={!previewId}
                  title={!previewId ? 'Generate a single document first (not Preview all)' : undefined}
                >
                  <Save className="w-3.5 h-3.5" /> Save edits
                </button>
                <button
                  type="button"
                  className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                  disabled={!previewId || isSample}
                  title={
                    !previewId
                      ? 'Click Generate & Preview for one document type first (Preview all cannot be emailed)'
                      : isSample
                        ? 'Select a real partner before sending'
                        : 'Send short cover email with PDF attachment'
                  }
                  onClick={() => {
                    if (!previewId) {
                      setMessage(
                        'Generate a single document first (Generate & Preview). “Preview all types” cannot be emailed.'
                      )
                      return
                    }
                    if (isSample) {
                      setMessage('Select a real partner before sending. Sample partner is for preview only.')
                      return
                    }
                    void sendDoc(previewId, false)
                  }}
                >
                  Send email
                </button>
              </div>
            </div>

            {editMode && (
              <label className="block text-sm">
                <span className="font-medium text-gray-700">HTML body (edit before send)</span>
                <textarea
                  className="mt-1 w-full min-h-[220px] font-mono text-xs border rounded-lg p-3 bg-slate-50"
                  value={editHtml}
                  onChange={(e) => {
                    setEditHtml(e.target.value)
                    setDirty(true)
                  }}
                />
              </label>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Rendered preview</p>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-white text-slate-900 overflow-auto max-h-[70vh]"
                dangerouslySetInnerHTML={{ __html: editHtml || previewHtml }}
              />
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium text-sm text-slate-900">
                Document send history
                <span className="ml-2 font-normal text-slate-500">({historyDocs.length})</span>
              </div>
              <p className="text-xs text-slate-500">
                Email attempts only (Sent / Failed) · newest first · {DOC_HISTORY_PAGE_SIZE} per page
              </p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generate &amp; Preview drafts stay above until you Send. Partner lifecycle emails (welcome, D12, D19, …)
              appear here after the send attempt.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search title, partner, period…"
                className="flex-1 min-w-[12rem] border rounded-lg px-3 py-1.5 text-sm bg-white"
                aria-label="Search send history"
              />
              <select
                className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                value={historyScope}
                onChange={(e) =>
                  setHistoryScope(e.target.value as 'sent_failed' | 'archived' | 'all_send')
                }
              >
                <option value="sent_failed">Sent &amp; Failed</option>
                <option value="archived">Archived</option>
                <option value="all_send">Sent, Failed &amp; Archived</option>
              </select>
              <select
                className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                value={historyType}
                onChange={(e) =>
                  setHistoryType(e.target.value === 'all' ? 'all' : (e.target.value as FundraisingDocumentType))
                }
              >
                <option value="all">All types</option>
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t} — {FUNDRAISING_DOCUMENT_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-auto max-h-[28rem]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Partner</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {historyDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                      No send records yet. Use Send email above, or sync after partner lifecycle emails.
                    </td>
                  </tr>
                )}
                {pagedHistoryDocs.map((d) => {
                  const p = d.partnerId ? partners.find((x) => x.id === d.partnerId) : null
                  return (
                    <tr key={d.id}>
                      <td className="px-3 py-2 font-mono text-xs">{d.type}</td>
                      <td className="px-3 py-2">{d.title}</td>
                      <td className="px-3 py-2">{p?.organizationName || 'Sample / unassigned'}</td>
                      <td className="px-3 py-2">{d.period || '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            d.status === 'Sent'
                              ? 'text-emerald-700 font-medium'
                              : d.status === 'Failed'
                                ? 'text-red-700 font-medium'
                                : 'text-slate-600'
                          }
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          type="button"
                          className="text-emerald-700 hover:underline"
                          onClick={() => openPreview(d.htmlBody, d.id)}
                        >
                          Preview
                        </button>
                        {(d.status === 'Sent' || d.status === 'Failed') && (
                          <button
                            type="button"
                            className="text-blue-700 hover:underline disabled:opacity-40"
                            disabled={!d.partnerId}
                            onClick={() => void sendDoc(d.id, false)}
                          >
                            Resend
                          </button>
                        )}
                        {d.status !== 'Archived' && (
                          <button type="button" className="text-gray-500 hover:underline" onClick={() => archive(d.id)}>
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {historyDocs.length > DOC_HISTORY_PAGE_SIZE && (
            <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-gray-50">
              <span>
                Page {historyPageSafe} of {historyTotalPages} · showing{' '}
                {(historyPageSafe - 1) * DOC_HISTORY_PAGE_SIZE + 1}–
                {Math.min(historyPageSafe * DOC_HISTORY_PAGE_SIZE, historyDocs.length)} of {historyDocs.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={historyPageSafe <= 1}
                  className="px-2.5 py-1 rounded border bg-white disabled:opacity-40"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={historyPageSafe >= historyTotalPages}
                  className="px-2.5 py-1 rounded border bg-white disabled:opacity-40"
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </FundraisingAdminShell>
    </div>
  )
}

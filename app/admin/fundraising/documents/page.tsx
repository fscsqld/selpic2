'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
import AdminPageHeader from '@/components/AdminPageHeader'
import { FundraisingAdminShell } from '@/components/admin/FundraisingAdminNav'
import { useAdminAuth } from '@/lib/adminAuth'
import {
  createDraftDocument,
  useFundraisingStore,
} from '@/lib/fundraising/store'
import { buildFundraisingDocumentHtml } from '@/lib/fundraising/documents'
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
import { Eye, HeartHandshake, Save } from 'lucide-react'

const DOC_TYPES = Object.keys(FUNDRAISING_DOCUMENT_LABELS) as FundraisingDocumentType[]

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
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)

  const samplePartner = useMemo(() => createSampleFundraisingPartner(), [])

  const [partnerId, setPartnerId] = useState(SAMPLE_PARTNER_ID)
  const [docType, setDocType] = useState<FundraisingDocumentType>('D2')
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7))
  const [previewHtml, setPreviewHtml] = useState('')
  const [editHtml, setEditHtml] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [editMode, setEditMode] = useState(true)
  const [dirty, setDirty] = useState(false)

  const isSample = partnerId === SAMPLE_PARTNER_ID || !partnerId
  const partner = useMemo(() => {
    if (isSample) return samplePartner
    return partners.find((p) => p.id === partnerId) || samplePartner
  }, [isSample, partnerId, partners, samplePartner])

  // Default to sample so Preview works with zero partners
  useEffect(() => {
    if (partners.length === 0) setPartnerId(SAMPLE_PARTNER_ID)
  }, [partners.length])

  const clientSiteBase = () => {
    if (typeof window !== 'undefined') return window.location.origin
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://selpic.com.au').replace(/\/$/, '')
  }

  const buildHtmlFor = (type: FundraisingDocumentType, forPartner = partner) => {
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
              ? `${clientSiteBase()}/fundraising/lookup?token=${encodeURIComponent(forPartner.lookupToken)}`
              : undefined,
            period: period || undefined,
          }
    return buildFundraisingDocumentHtml({
      type,
      partner: forPartner,
      settings,
      period: period || undefined,
      extra: extras,
    })
  }

  const generate = () => {
    const html = buildHtmlFor(docType)
    const doc = createDraftDocument({
      type: docType,
      partnerId: isSample ? undefined : partnerId,
      period: period || undefined,
      htmlBody: html,
    })
    useFundraisingStore.getState().updateDocumentStatus(doc.id, 'Generated')
    setPreviewHtml(html)
    setEditHtml(html)
    setPreviewId(doc.id)
    setDirty(false)
    setMessage(
      isSample
        ? `Preview generated: ${docType} — ${FUNDRAISING_DOCUMENT_LABELS[docType]} (sample partner — edit before using with a real partner)`
        : `Generated ${docType} — ${FUNDRAISING_DOCUMENT_LABELS[docType]}`
    )
  }

  const previewAll = () => {
    const htmlParts = DOC_TYPES.map((t) => {
      const body = buildHtmlFor(t)
      return `<section style="margin-bottom:48px;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#0f172a;color:#fff;padding:10px 14px;font-weight:600">${t} — ${FUNDRAISING_DOCUMENT_LABELS[t]}</div>
        <div style="padding:8px">${body}</div>
      </section>`
    }).join('\n')
    const pack = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>All fundraising docs preview</title></head><body style="font-family:system-ui;padding:16px;background:#f8fafc">${htmlParts}</body></html>`
    setPreviewHtml(pack)
    setEditHtml(pack)
    setPreviewId(null)
    setDirty(false)
    setMessage(`Preview pack: all ${DOC_TYPES.length} document types with ${isSample ? 'sample' : partner.organizationName} data.`)
  }

  const saveEdits = () => {
    if (!previewId) {
      setMessage('Generate a single document first to save edits to the archive (or use Preview all for read-only review).')
      return
    }
    updateDocumentStatus(previewId, 'Generated', { htmlBody: editHtml })
    setPreviewHtml(editHtml)
    setDirty(false)
    setMessage('Edits saved to this document draft. Review the preview, then Send when ready.')
  }

  const sendDoc = async (documentId: string) => {
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
    const htmlToSend = documentId === previewId && editHtml ? editHtml : doc.htmlBody
    if (documentId === previewId && dirty) {
      updateDocumentStatus(documentId, 'Generated', { htmlBody: editHtml })
    }
    const sentBy = adminUser?.username || adminUser?.email || 'Admin'
    try {
      const emailRes = await emailService.sendResponse({
        customerEmail: p.contactEmail,
        customerName: p.contactName,
        subject: `SELPIC Fundraising — ${doc.title}`,
        message: doc.title,
        adminName: sentBy,
        html: htmlToSend,
      })
      const log = addSendLog({
        documentType: 'other',
        documentNumber: `${doc.type}-${doc.id.slice(-8)}`,
        recipientEmail: p.contactEmail,
        recipientName: p.contactName,
        subject: doc.title,
        content: htmlToSend.slice(0, 500),
        sentBy,
        status: emailRes.success ? 'sent' : 'failed',
        source: 'other',
        errorMessage: emailRes.success ? undefined : emailRes.message,
      })
      updateDocumentStatus(doc.id, emailRes.success ? 'Sent' : 'Failed', {
        sendLogId: log.id,
        htmlBody: htmlToSend,
      })
      setMessage(emailRes.success ? `Sent ${doc.type} to ${p.contactEmail}` : `Send failed: ${emailRes.message}`)
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
        title="Document pack (D1–D15)"
        subtitle="Preview and edit every partner document before email. Use Sample partner when no real partnership exists yet."
        current="/admin/fundraising/documents"
      >
        {message && (
          <div className="mb-4 text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">{message}</div>
        )}

        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" /> Where is Preview?
          </p>
          <p className="mt-1 text-sky-900/90">
            Choose <strong>Sample partner (preview)</strong> or a real partner → pick a document type → click{' '}
            <strong>Generate &amp; Preview</strong>. The editable HTML and rendered preview appear below. Use{' '}
            <strong>Preview all types</strong> to review D1–D15 in one scroll.
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
          <label className="text-sm block">
            <span className="font-medium">Period</span>
            <input
              type="month"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
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
                >
                  <Save className="w-3.5 h-3.5" /> Save edits
                </button>
                {previewId && (
                  <button
                    type="button"
                    className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                    disabled={isSample}
                    title={isSample ? 'Select a real partner to send' : 'Send email'}
                    onClick={() => void sendDoc(previewId)}
                  >
                    Send email
                  </button>
                )}
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
                className="prose prose-sm max-w-none border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[70vh]"
                dangerouslySetInnerHTML={{ __html: editHtml || previewHtml }}
              />
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm">Saved drafts &amp; sent documents</div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
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
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    No documents yet. Use Generate &amp; Preview with the sample partner to review templates.
                  </td>
                </tr>
              )}
              {documents.map((d) => {
                const p = d.partnerId ? partners.find((x) => x.id === d.partnerId) : null
                return (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-mono text-xs">{d.type}</td>
                    <td className="px-3 py-2">{d.title}</td>
                    <td className="px-3 py-2">{p?.organizationName || 'Sample / unassigned'}</td>
                    <td className="px-3 py-2">{d.period || '—'}</td>
                    <td className="px-3 py-2">{d.status}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        className="text-emerald-700 hover:underline"
                        onClick={() => openPreview(d.htmlBody, d.id)}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className="text-blue-700 hover:underline disabled:opacity-40"
                        disabled={!d.partnerId}
                        onClick={() => void sendDoc(d.id)}
                      >
                        Send
                      </button>
                      <button type="button" className="text-gray-500 hover:underline" onClick={() => archive(d.id)}>
                        Archive
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </FundraisingAdminShell>
    </div>
  )
}

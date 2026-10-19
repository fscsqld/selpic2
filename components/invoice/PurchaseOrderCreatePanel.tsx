'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import PurchaseOrderTemplate from '@/components/invoice/PurchaseOrderTemplate'
import {
  buildPoPdfFilename,
  createEmptyPoLine,
  getDefaultPurchaseOrderDoc,
} from '@/lib/purchaseOrderDefaults'
import {
  PO_CURRENCIES,
  PO_INCOTERMS,
  PO_PACK_UNITS,
  PO_PAYMENT_PRESETS,
  PO_SHIPMENT_METHODS,
  DEFAULT_PO_WAYBILL_INSTRUCTIONS,
  PO_KR_FORWARDER_ZERO_RATED_NOTE,
  PO_KR_HUB_UI_NOTICES,
  PO_SHIP_TO_MODES,
  PO_TAX_RULES,
  PO_WAYBILL_CHECKLIST,
  paymentTermsTextForPreset,
  type PoPaymentTermsPreset,
  type PoShipToMode,
  type PurchaseOrderDoc,
} from '@/lib/purchaseOrderTypes'
import { computePurchaseOrderTotals, formatPoMoney } from '@/lib/purchaseOrderTotals'
import { ensureMonthlyDocNumber } from '@/lib/invoiceRefNumber'
import { COMPANY_CONTACT, COMPANY_LEGAL, getCompanyBrandName } from '@/lib/companyLegal'
import { usePoStore } from '@/lib/poStore'
import { useDocumentSendLogStore } from '@/lib/documentSendLogStore'
import { emailService } from '@/lib/emailService'
import { scheduleLogAdminActivity } from '@/lib/loadLogAdminActivity'
import { useAdminAuth } from '@/lib/adminAuth'

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

function recompute(doc: PurchaseOrderDoc): PurchaseOrderDoc {
  const items = doc.items.map((line, i) => ({ ...line, lineNo: i + 1 }))
  const totals = computePurchaseOrderTotals({
    items,
    charges: doc.charges,
    taxRule: doc.taxRule,
    currency: doc.payment.currency,
  })
  return {
    ...doc,
    items,
    totals,
    poMeta: {
      ...doc.poMeta,
      // UI simplification: English PDF labels; revision stays internal default 0 unless set elsewhere.
      labelLocale: 'en',
      revision: typeof doc.poMeta.revision === 'number' ? doc.poMeta.revision : 0,
    },
  }
}

const KR_HUB_PLACEHOLDER =
  'Korean Logistics Hub / Forwarder / Designated Agent\n[Enter company name, warehouse address, contact person & phone]'

function shipToAddressForMode(mode: PoShipToMode, current: string): string {
  if (mode === 'selpic') return COMPANY_CONTACT.address
  if (mode === 'forwarder_kr') {
    const t = (current || '').trim()
    // Keep a previously edited KR hub address; reset if still AU default or empty.
    if (t && t !== COMPANY_CONTACT.address && !t.includes('[Enter forwarder')) {
      return current
    }
    return KR_HUB_PLACEHOLDER
  }
  return current || ''
}

type Props = {
  /** When opening from send history */
  initialDoc?: PurchaseOrderDoc | null
  onClearInitial?: () => void
}

export default function PurchaseOrderCreatePanel({ initialDoc, onClearInitial }: Props) {
  const poRef = useRef<HTMLDivElement>(null)
  const { adminUser } = useAdminAuth()
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)
  const saveDraft = usePoStore((s) => s.saveDraft)
  const drafts = usePoStore((s) => s.drafts)
  const deleteDraft = usePoStore((s) => s.deleteDraft)

  const [doc, setDoc] = useState<PurchaseOrderDoc>(() => getDefaultPurchaseOrderDoc())
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!initialDoc) return
    setDoc(recompute(initialDoc))
    setRecipientEmail(initialDoc.vendor.email || '')
    setShowEditForm(true)
    onClearInitial?.()
  }, [initialDoc, onClearInitial])

  const updateDoc = useCallback((updater: (prev: PurchaseOrderDoc) => PurchaseOrderDoc) => {
    setDoc((prev) => recompute(updater(prev)))
  }, [])

  /** Allocate permanent PO-YYYY-MM-### when still a draft placeholder; sync DOM before PDF. */
  const finalizePoNumber = useCallback(
    (status?: PurchaseOrderDoc['poMeta']['status']): string => {
      const next = ensureMonthlyDocNumber('PO', doc.poMeta.poNumber)
      const finalized = recompute({
        ...doc,
        poMeta: {
          ...doc.poMeta,
          poNumber: next,
          status: status ?? doc.poMeta.status,
        },
      })
      flushSync(() => setDoc(finalized))
      return next
    },
    [doc]
  )

  const buildPdfOptions = (element: HTMLElement, filename: string) => ({
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename,
    image: { type: 'jpeg' as const, quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
    },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
  })

  const handleSaveDraft = () => {
    const toSave = recompute({
      ...doc,
      poMeta: { ...doc.poMeta, status: 'draft' },
    })
    const saved = saveDraft(toSave, draftId || undefined)
    setDraftId(saved.id)
    setDoc(toSave)
    setNotice(`Draft saved: ${saved.label}`)
    scheduleLogAdminActivity({
      action: 'purchase_order_saved',
      target: saved.doc.poMeta.poNumber,
      description: `Saved PO draft ${saved.doc.poMeta.poNumber} (${saved.doc.vendor.name || 'no vendor'})`,
    })
  }

  const handleDownloadPDF = async () => {
    if (!poRef.current) return
    setIsGeneratingPDF(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const element = poRef.current
      await new Promise((r) => setTimeout(r, 200))
      element.scrollIntoView({ behavior: 'instant', block: 'start' })
      const poNumber = finalizePoNumber()
      await waitForNextPaint()
      await new Promise((r) => setTimeout(r, 100))
      const filename = buildPoPdfFilename(poNumber, doc.vendor.name)
      const opt = buildPdfOptions(element, filename)
      await html2pdf().set(opt).from(element).save()
      scheduleLogAdminActivity({
        action: 'purchase_order_downloaded',
        target: poNumber,
        description: `Downloaded PO PDF ${filename}`,
      })
    } catch (e) {
      console.error('[PO] PDF failed', e)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendEmail = async () => {
    const emailToSend = (recipientEmail || doc.vendor.email || '').trim()
    if (!emailToSend || !emailToSend.includes('@')) {
      alert('Please enter a valid supplier email address.')
      return
    }
    setIsSending(true)
    const brandName = getCompanyBrandName(COMPANY_LEGAL.companyName)
    const sentBy = adminUser?.username || adminUser?.email || 'Admin'
    let poNumber = doc.poMeta.poNumber
    let emailContent = ''
    let subject = ''

    try {
      poNumber = finalizePoNumber('sent')
      await waitForNextPaint()
      await new Promise((r) => setTimeout(r, 100))

      let pdfFile: File | null = null
      if (poRef.current) {
        const html2pdf = (await import('html2pdf.js')).default
        const element = poRef.current
        await new Promise((r) => setTimeout(r, 200))
        const filename = buildPoPdfFilename(poNumber, doc.vendor.name)
        const opt = buildPdfOptions(element, filename)
        const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob')
        pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' })
      }

      const vendorName = doc.vendor.name || 'Supplier'
      emailContent =
        message ||
        `Dear ${doc.vendor.contactPerson || vendorName},\n\n` +
          `Please find attached Purchase Order ${poNumber} from ${brandName}.\n\n` +
          `Kindly confirm acceptance of the quantities, pricing, Incoterms, and delivery schedule.\n\n` +
          `Please use the PO Number as the remittance reference when payment is due.\n\n` +
          `Best regards,\n${brandName}`

      subject = `[SELPIC PO] ${poNumber} — ${vendorName}`

      const emailResponse = await emailService.sendResponse({
        customerEmail: emailToSend,
        customerName: vendorName,
        subject,
        message: emailContent,
        adminName: sentBy,
        attachments: pdfFile ? [pdfFile] : [],
      })

      const snapshot: PurchaseOrderDoc = recompute({
        ...doc,
        poMeta: { ...doc.poMeta, poNumber, status: emailResponse.success ? 'sent' : doc.poMeta.status },
      })
      setDoc(snapshot)

      addSendLog({
        documentType: 'po',
        documentNumber: poNumber,
        recipientEmail: emailToSend,
        recipientName: vendorName,
        subject,
        content: emailContent,
        sentBy,
        status: emailResponse.success ? 'sent' : 'failed',
        source: 'create_send',
        documentSnapshot: JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
        errorMessage: emailResponse.success ? undefined : emailResponse.message,
      })

      scheduleLogAdminActivity({
        action: 'purchase_order_sent',
        target: poNumber,
        description: emailResponse.success
          ? `Sent PO ${poNumber} to ${emailToSend}`
          : `Failed to send PO ${poNumber}: ${emailResponse.message}`,
      })

      if (!emailResponse.success) {
        alert(`Failed to send PO: ${emailResponse.message}`)
        return
      }
      alert(`Purchase Order sent successfully to ${emailToSend}`)
      setMessage('')
    } catch (e) {
      console.error('[PO] send failed', e)
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      addSendLog({
        documentType: 'po',
        documentNumber: poNumber,
        recipientEmail: emailToSend,
        recipientName: doc.vendor.name || 'Supplier',
        subject: subject || `PO ${poNumber}`,
        content: emailContent || message || '',
        sentBy,
        status: 'failed',
        source: 'create_send',
        documentSnapshot: JSON.parse(JSON.stringify(doc)) as Record<string, unknown>,
        errorMessage,
      })
      alert('Failed to send Purchase Order. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  const totalsPreview = useMemo(
    () => formatPoMoney(doc.totals.total, doc.payment.currency),
    [doc.totals.total, doc.payment.currency]
  )

  const field =
    'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-600'
  const label = 'block text-xs font-semibold text-gray-600 mb-1'

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2">
          {notice}
          <button type="button" className="ml-3 underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Purchase Order</h2>
          <p className="text-sm text-gray-600">
            Buyer document for suppliers · Total {totalsPreview} · Status {doc.poMeta.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowEditForm((v) => !v)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showEditForm ? 'Hide form' : 'Edit form'}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPDF()}
            disabled={isGeneratingPDF}
            className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </div>

      {drafts.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Saved drafts</h3>
          <ul className="space-y-2">
            {drafts.slice(0, 8).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  className="text-left text-slate-700 hover:underline truncate"
                  onClick={() => {
                    setDoc(recompute(d.doc))
                    setDraftId(d.id)
                    setRecipientEmail(d.doc.vendor.email || '')
                    setNotice(`Loaded draft ${d.label}`)
                  }}
                >
                  {d.label}
                  <span className="text-gray-400 ml-2">
                    {new Date(d.savedAt).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 p-1"
                  onClick={() => deleteDraft(d.id)}
                  aria-label="Delete draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showEditForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-8">
          {/* Header */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={label}>PO Number</label>
              <input
                className={field}
                value={doc.poMeta.poNumber}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    poMeta: { ...p.poMeta, poNumber: e.target.value },
                  }))
                }
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Draft number stays <code className="bg-gray-100 px-1 rounded">PO-DRAFT-000</code> until
                Download PDF or Send Email allocates <code className="bg-gray-100 px-1 rounded">PO-YYYY-MM-###</code>.
              </p>
            </div>
            <div>
              <label className={label}>Issue Date</label>
              <input
                type="date"
                className={field}
                value={doc.poMeta.issueDate}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    poMeta: { ...p.poMeta, issueDate: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className={label}>Required Ship / Delivery Date</label>
              <input
                type="date"
                className={field}
                value={doc.poMeta.requiredShipDate || ''}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    poMeta: { ...p.poMeta, requiredShipDate: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className={label}>Incoterms 2020</label>
              <select
                className={field}
                value={doc.trade.incoterm}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    trade: {
                      ...p.trade,
                      incoterm: e.target.value as PurchaseOrderDoc['trade']['incoterm'],
                    },
                  }))
                }
              >
                {PO_INCOTERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Named Place</label>
              <input
                className={field}
                value={doc.trade.namedPlace}
                placeholder="e.g. Busan"
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    trade: { ...p.trade, namedPlace: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <label className={label}>Shipment Method</label>
              <select
                className={field}
                value={doc.trade.shipmentMethod}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    trade: {
                      ...p.trade,
                      shipmentMethod: e.target.value as PurchaseOrderDoc['trade']['shipmentMethod'],
                    },
                  }))
                }
              >
                {PO_SHIPMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Supplier Quote / PI Reference</label>
              <input
                className={field}
                value={doc.poMeta.supplierQuoteRef || ''}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    poMeta: { ...p.poMeta, supplierQuoteRef: e.target.value },
                  }))
                }
              />
            </div>
          </section>

          {/* Vendor */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Vendor (Supplier)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Company Name</label>
                <input
                  className={field}
                  value={doc.vendor.name}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, vendor: { ...p.vendor, name: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={label}>Business Registration No. (사업자등록번호)</label>
                <input
                  className={field}
                  value={doc.vendor.vatOrBizReg || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      vendor: { ...p.vendor, vatOrBizReg: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className={label}>Contact Person</label>
                <input
                  className={field}
                  value={doc.vendor.contactPerson || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      vendor: { ...p.vendor, contactPerson: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className={label}>Email</label>
                <input
                  type="email"
                  className={field}
                  value={doc.vendor.email || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, vendor: { ...p.vendor, email: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input
                  className={field}
                  value={doc.vendor.phone || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, vendor: { ...p.vendor, phone: e.target.value } }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Address</label>
                <textarea
                  className={field}
                  rows={2}
                  value={doc.vendor.address || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, vendor: { ...p.vendor, address: e.target.value } }))
                  }
                />
              </div>
            </div>
          </section>

          {/* Ship / Bill */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">Ship To & Bill To</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Ship To preset</label>
                <select
                  className={field}
                  value={doc.shipTo.mode}
                  onChange={(e) => {
                    const mode = e.target.value as PoShipToMode
                    updateDoc((p) => ({
                      ...p,
                      shipTo: {
                        ...p.shipTo,
                        mode,
                        address: shipToAddressForMode(mode, p.shipTo.address),
                      },
                      waybillInstructions: {
                        instructionText:
                          p.waybillInstructions?.instructionText?.trim() ||
                          DEFAULT_PO_WAYBILL_INSTRUCTIONS,
                      },
                    }))
                  }}
                >
                  {PO_SHIP_TO_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Bill To / Consignee</label>
                <input
                  className={field}
                  value={doc.billTo.name}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, billTo: { ...p.billTo, name: e.target.value } }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Ship To Address</label>
                <textarea
                  className={field}
                  rows={3}
                  value={doc.shipTo.address}
                  placeholder={
                    doc.shipTo.mode === 'forwarder_kr'
                      ? 'Korea domestic warehouse / forwarder / designated agent address'
                      : undefined
                  }
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      shipTo: { ...p.shipTo, address: e.target.value },
                    }))
                  }
                />
                {doc.shipTo.mode === 'forwarder_kr' && doc.taxRule === 'overseas_zero' ? (
                  <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 leading-relaxed">
                    {PO_KR_FORWARDER_ZERO_RATED_NOTE}
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <label className={label}>Bill To Address</label>
                <textarea
                  className={field}
                  rows={2}
                  value={doc.billTo.address || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      billTo: { ...p.billTo, address: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            {doc.shipTo.mode === 'forwarder_kr' ? (
              <div className="mt-6 border border-amber-200 rounded-lg p-4 bg-amber-50/60 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Korean Hub Waybill Instructions (배대지 운송장)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Shown on the PO PDF under Ship To so the supplier warehouse can fill the domestic
                    waybill and mark cartons correctly.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs leading-relaxed">
                  <p className="rounded-md border border-red-200 bg-red-50 text-red-900 px-3 py-2">
                    <strong>Consignee warning:</strong> {PO_KR_HUB_UI_NOTICES.consignee}
                  </p>
                  <p className="rounded-md border border-slate-200 bg-white text-slate-800 px-3 py-2">
                    <strong>PO reference:</strong> {PO_KR_HUB_UI_NOTICES.poReference} Current PO:{' '}
                    <code className="bg-slate-100 px-1 rounded font-semibold">
                      {doc.poMeta.poNumber}
                    </code>
                  </p>
                  <p className="rounded-md border border-slate-200 bg-white text-slate-800 px-3 py-2">
                    <strong>Box marking:</strong> {PO_KR_HUB_UI_NOTICES.boxMarking}
                  </p>
                  <p className="rounded-md border border-amber-200 bg-amber-50 text-amber-950 px-3 py-2">
                    <strong>Zero-rated export support:</strong> {PO_KR_HUB_UI_NOTICES.zeroRated}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={label}>Hub company (waybill Consignee)</label>
                    <input
                      className={field}
                      value={doc.shipTo.hubCompanyName || ''}
                      placeholder="Korean logistics hub / forwarder company name"
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          shipTo: { ...p.shipTo, hubCompanyName: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={label}>Hub contact person</label>
                    <input
                      className={field}
                      value={doc.shipTo.hubContactPerson || ''}
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          shipTo: { ...p.shipTo, hubContactPerson: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={label}>Hub phone</label>
                    <input
                      className={field}
                      value={doc.shipTo.hubPhone || ''}
                      placeholder="+82 …"
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          shipTo: { ...p.shipTo, hubPhone: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={label}>Waybill guide URL (optional)</label>
                    <input
                      className={field}
                      value={doc.shipTo.waybillGuideUrl || ''}
                      placeholder="https://… link to forwarder’s waybill fill-in guide / PDF"
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          shipTo: { ...p.shipTo, waybillGuideUrl: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={label}>Full waybill instructions (editable · PDF)</label>
                    <textarea
                      className={field}
                      rows={6}
                      value={
                        doc.waybillInstructions?.instructionText || DEFAULT_PO_WAYBILL_INSTRUCTIONS
                      }
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          waybillInstructions: { instructionText: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <ul className="text-xs text-slate-700 list-disc pl-5 space-y-1">
                  {PO_WAYBILL_CHECKLIST.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {doc.taxRule === 'overseas_zero' ? (
                  <p className="text-xs text-amber-900 border border-amber-100 rounded-md px-3 py-2 bg-amber-50">
                    {PO_KR_FORWARDER_ZERO_RATED_NOTE}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Payment & tax */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Payment, Currency & Tax (Supplier bank = remit destination)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={label}>Currency</label>
                <select
                  className={field}
                  value={doc.payment.currency}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        currency: e.target.value as PurchaseOrderDoc['payment']['currency'],
                      },
                    }))
                  }
                >
                  {PO_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Payment Terms</label>
                <select
                  className={field}
                  value={doc.payment.termsPreset}
                  onChange={(e) => {
                    const preset = e.target.value as PoPaymentTermsPreset
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        termsPreset: preset,
                        termsText:
                          preset === 'custom'
                            ? p.payment.termsText
                            : paymentTermsTextForPreset(preset),
                      },
                    }))
                  }}
                >
                  {PO_PAYMENT_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Tax Rule</label>
                <select
                  className={field}
                  value={doc.taxRule}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      taxRule: e.target.value as PurchaseOrderDoc['taxRule'],
                    }))
                  }
                >
                  {PO_TAX_RULES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {doc.payment.termsPreset === 'custom' ? (
                <div className="md:col-span-2 lg:col-span-3">
                  <label className={label}>Custom payment terms text</label>
                  <textarea
                    className={field}
                    rows={2}
                    value={doc.payment.termsText}
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        payment: {
                          ...p.payment,
                          termsText: e.target.value,
                          termsPreset: 'custom',
                        },
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                    <span className="font-semibold text-gray-700">Terms on PDF: </span>
                    {doc.payment.termsText || paymentTermsTextForPreset(doc.payment.termsPreset)}
                  </p>
                </div>
              )}
              <div>
                <label className={label}>Supplier Account Name</label>
                <input
                  className={field}
                  value={doc.payment.supplierBank.accountName}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        supplierBank: { ...p.payment.supplierBank, accountName: e.target.value },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className={label}>Supplier Bank Name</label>
                <input
                  className={field}
                  value={doc.payment.supplierBank.bankName}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        supplierBank: { ...p.payment.supplierBank, bankName: e.target.value },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className={label}>SWIFT / Account No.</label>
                <input
                  className={field}
                  value={doc.payment.supplierBank.swiftOrAccount}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        supplierBank: {
                          ...p.payment.supplierBank,
                          swiftOrAccount: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className={label}>Bank payment note</label>
                <input
                  className={field}
                  value={doc.payment.supplierBank.note || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      payment: {
                        ...p.payment,
                        supplierBank: { ...p.payment.supplierBank, note: e.target.value },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </section>

          {/* Lines */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
              <button
                type="button"
                onClick={() =>
                  updateDoc((p) => ({
                    ...p,
                    items: [...p.items, createEmptyPoLine(p.items.length + 1)],
                  }))
                }
                className="text-sm inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
              >
                <Plus className="w-4 h-4" /> Add line
              </button>
            </div>
            <div className="space-y-4">
              {doc.items.map((item, index) => (
                <div
                  key={`line-${index}`}
                  className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-6 gap-3"
                >
                  <div className="md:col-span-3">
                    <label className={label}>Description (EN)</label>
                    <input
                      className={field}
                      value={item.descriptionEn}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], descriptionEn: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className={label}>Description (KO)</label>
                    <input
                      className={field}
                      value={item.descriptionKo || ''}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], descriptionKo: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={label}>SKU / Code</label>
                    <input
                      className={field}
                      value={item.sku || ''}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], sku: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={label}>Packaging Unit</label>
                    <select
                      className={field}
                      value={item.packUnit}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = {
                            ...items[index],
                            packUnit: e.target.value as PurchaseOrderDoc['items'][0]['packUnit'],
                          }
                          return { ...p, items }
                        })
                      }
                    >
                      {PO_PACK_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Qty</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className={field}
                      value={item.qty}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], qty: Number(e.target.value) || 0 }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className={label}>Unit Price</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className={field}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = {
                            ...items[index],
                            unitPrice: Number(e.target.value) || 0,
                          }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className={label}>Line Note</label>
                    <input
                      className={field}
                      value={item.lineNote || ''}
                      placeholder='e.g. Box 1-2 via Air Freight / Box 3-6 via Sea Freight · or "1+1 Set = 4 sheets + 2 samples"'
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], lineNote: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Use for pack contents or split shipments (air vs sea). When Ship To is a Korean hub, outer box marks must follow{' '}
                      <code className="bg-gray-100 px-1 rounded">[PO-… / SELPIC / Box N of T (AIR|SEA)]</code> and match these notes.
                    </p>
                  </div>
                  <div>
                    <label className={label}>COO</label>
                    <input
                      className={field}
                      value={item.countryOfOrigin || ''}
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], countryOfOrigin: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={doc.items.length <= 1}
                      onClick={() =>
                        updateDoc((p) => ({
                          ...p,
                          items: p.items.filter((_, i) => i !== index),
                        }))
                      }
                      className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Charges */}
          <section
            className={`grid grid-cols-1 gap-4 ${
              (Number(doc.charges.other) || 0) > 0
                ? 'md:grid-cols-4'
                : 'md:grid-cols-3'
            }`}
          >
            <div>
              <label className={label}>Freight</label>
              <input
                type="number"
                min={0}
                step="any"
                className={field}
                value={doc.charges.freight ?? 0}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    charges: { ...p.charges, freight: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div>
              <label className={label}>Insurance</label>
              <input
                type="number"
                min={0}
                step="any"
                className={field}
                value={doc.charges.insurance ?? 0}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    charges: { ...p.charges, insurance: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            <div>
              <label className={label}>Other charges</label>
              <input
                type="number"
                min={0}
                step="any"
                className={field}
                value={doc.charges.other ?? 0}
                onChange={(e) =>
                  updateDoc((p) => ({
                    ...p,
                    charges: { ...p.charges, other: Number(e.target.value) || 0 },
                  }))
                }
              />
            </div>
            {(Number(doc.charges.other) || 0) > 0 ? (
              <div>
                <label className={label}>Other label</label>
                <input
                  className={field}
                  value={doc.charges.otherLabel || ''}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      charges: { ...p.charges, otherLabel: e.target.value },
                    }))
                  }
                />
              </div>
            ) : null}
          </section>

          {/* T&C / notes / signature */}
          <section className="space-y-4">
            <div>
              <label className={label}>Terms & Conditions</label>
              <textarea
                className={field}
                rows={5}
                value={doc.termsAndConditions}
                onChange={(e) => updateDoc((p) => ({ ...p, termsAndConditions: e.target.value }))}
              />
            </div>
            <div>
              <label className={label}>Notes</label>
              <textarea
                className={field}
                rows={2}
                value={doc.notes || ''}
                onChange={(e) => updateDoc((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div>
              <label className={label}>Signature image URL (optional)</label>
              <input
                className={field}
                placeholder="https://… or /path/to/signature.png — blank = empty signature line"
                value={doc.signatureImageUrl || ''}
                onChange={(e) => updateDoc((p) => ({ ...p, signatureImageUrl: e.target.value }))}
              />
            </div>
          </section>

          {/* Email */}
          <section className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 inline-flex items-center gap-2">
              <FileText className="w-4 h-4" /> Send to Supplier
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Supplier email</label>
                <input
                  type="email"
                  className={field}
                  value={recipientEmail}
                  placeholder={doc.vendor.email || 'supplier@example.com'}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Leave empty to use vendor email: {doc.vendor.email || '—'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Email message (optional)</label>
                <textarea
                  className={field}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSendEmail()}
              disabled={isSending}
              className="mt-4 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Email to Supplier
            </button>
          </section>
        </div>
      ) : null}

      {/* Live preview / PDF source */}
      <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Preview PDF
        </p>
        <div ref={poRef}>
          <PurchaseOrderTemplate doc={doc} />
        </div>
      </div>
    </div>
  )
}

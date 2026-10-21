'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import PurchaseOrderTemplate from '@/components/invoice/PurchaseOrderTemplate'
import PoSupplierCatalogPanel from '@/components/invoice/PoSupplierCatalogPanel'
import PoForwarderManagePanel from '@/components/invoice/PoForwarderManagePanel'
import PoFormSection from '@/components/invoice/PoFormSection'
import PoHubInstructionCard from '@/components/invoice/PoHubInstructionCard'
import {
  applyFinalizedPoNumber,
  buildPoPdfFilename,
  createEmptyPoLine,
  getDefaultPurchaseOrderDoc,
} from '@/lib/purchaseOrderDefaults'
import {
  applySupplierToPoDoc,
  catalogItemToPoLine,
  isCatalogPriceConfirmed,
  type PoSupplierCatalogItem,
  type PoSupplierRecord,
} from '@/lib/poSupplierTypes'
import { usePoSupplierStore } from '@/lib/poSupplierStore'
import {
  PO_SYSTEM_SHIP_PRESETS,
  buildDomesticHubInstructionBlock,
  cartonMarkSample,
  getPoSystemShipPreset,
  syncCartonMarkingToPoNumber,
} from '@/lib/poHubPresets'
import { usePoForwarderStore } from '@/lib/poForwarderStore'
import {
  applyForwarderModeToShipTo,
  type PoForwarderTransportMode,
} from '@/lib/poForwarderTypes'
import {
  PO_CURRENCIES,
  PO_INCOTERMS_MORE,
  PO_INCOTERMS_PRIMARY,
  PO_PACK_UNITS,
  PO_PAYMENT_PRESETS,
  PO_PAYMENT_REMITTANCE_NOTE,
  PO_SHIPMENT_METHODS,
  PO_TAX_RULES,
  formatIncotermLine,
  namedPlacePlaceholder,
  normalizeSupplierBank,
  paymentTermsTextForPreset,
  type PoPaymentTermsPreset,
  type PurchaseOrderDoc,
} from '@/lib/purchaseOrderTypes'
import { computePurchaseOrderTotals, formatPoMoney } from '@/lib/purchaseOrderTotals'
import { ensureMonthlyDocNumber } from '@/lib/invoiceRefNumber'
import { COMPANY_LEGAL, getCompanyBrandName } from '@/lib/companyLegal'
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
  const supplierBank = normalizeSupplierBank(doc.payment.supplierBank)
  return {
    ...doc,
    items,
    totals,
    payment: {
      ...doc.payment,
      supplierBank: {
        ...supplierBank,
        note: supplierBank.note?.trim() || PO_PAYMENT_REMITTANCE_NOTE,
      },
    },
    poMeta: {
      ...doc.poMeta,
      // UI simplification: English PDF labels; revision stays internal default 0 unless set elsewhere.
      labelLocale: 'en',
      revision: typeof doc.poMeta.revision === 'number' ? doc.poMeta.revision : 0,
    },
  }
}

type Props = {
  /** When opening from send history */
  initialDoc?: PurchaseOrderDoc | null
  onClearInitial?: () => void
  /** Load a saved draft from PO Dashboard */
  loadDraftId?: string | null
  onClearLoadDraftId?: () => void
}

export default function PurchaseOrderCreatePanel({
  initialDoc,
  onClearInitial,
  loadDraftId,
  onClearLoadDraftId,
}: Props) {
  const poRef = useRef<HTMLDivElement>(null)
  const { adminUser } = useAdminAuth()
  const addSendLog = useDocumentSendLogStore((s) => s.addSendLog)
  const saveDraft = usePoStore((s) => s.saveDraft)
  const drafts = usePoStore((s) => s.drafts)
  const deleteDraft = usePoStore((s) => s.deleteDraft)
  const getDraft = usePoStore((s) => s.getDraft)

  const [doc, setDoc] = useState<PurchaseOrderDoc>(() => getDefaultPurchaseOrderDoc())
  const [draftId, setDraftId] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [sectionOpen, setSectionOpen] = useState({
    order: true,
    supplier: true,
    shipTo: true,
    items: true,
    send: true,
    preview: true,
  })
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [catalogPickId, setCatalogPickId] = useState('')
  const [catalogPickQty, setCatalogPickQty] = useState(1)
  const suppliers = usePoSupplierStore((s) => s.suppliers)
  const forwarders = usePoForwarderStore((s) => s.forwarders)
  const activeForwarders = useMemo(
    () => forwarders.filter((f) => f.isActive !== false),
    [forwarders]
  )
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  )
  const supplierCatalogItems = useMemo(
    () => (selectedSupplier?.items || []).filter((i) => i.isActive !== false),
    [selectedSupplier]
  )

  const resolvedCartonMark = syncCartonMarkingToPoNumber(
    doc.shipTo.cartonMarking,
    doc.shipTo.destinationIdentifier,
    doc.poMeta.poNumber
  )

  const toggleSection = useCallback((key: keyof typeof sectionOpen) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setAllSections = useCallback((open: boolean) => {
    setSectionOpen({
      order: open,
      supplier: open,
      shipTo: open,
      items: open,
      send: open,
      preview: open,
    })
  }, [])

  useEffect(() => {
    if (!initialDoc) return
    setDoc(recompute(initialDoc))
    setRecipientEmail(initialDoc.vendor.email || '')
    setShowEditForm(true)
    onClearInitial?.()
  }, [initialDoc, onClearInitial])

  useEffect(() => {
    if (!loadDraftId) return
    const saved = getDraft(loadDraftId)
    if (!saved) {
      onClearLoadDraftId?.()
      return
    }
    setDoc(recompute(saved.doc))
    setDraftId(saved.id)
    setRecipientEmail(saved.doc.vendor.email || '')
    setShowEditForm(true)
    setNotice(`Loaded from dashboard: ${saved.label}`)
    onClearLoadDraftId?.()
  }, [loadDraftId, getDraft, onClearLoadDraftId])

  const updateDoc = useCallback((updater: (prev: PurchaseOrderDoc) => PurchaseOrderDoc) => {
    setDoc((prev) => recompute(updater(prev)))
  }, [])

  const applyRegisteredForwarder = useCallback(
    (forwarderId: string, transportMode: PoForwarderTransportMode) => {
      // Always read latest store (avoid stale React closure right after Manage → Save).
      const forwarder =
        usePoForwarderStore.getState().getForwarder(forwarderId) ||
        forwarders.find((f) => f.id === forwarderId)
      if (!forwarder) return
      updateDoc((p) => {
        const applied = applyForwarderModeToShipTo({
          forwarder,
          transportMode,
          poNumber: p.poMeta.poNumber,
        })
        return {
          ...p,
          shipTo: {
            ...p.shipTo,
            presetId: applied.presetId,
            forwarderId: applied.forwarderId,
            forwarderName: forwarder.name,
            transportMode: applied.transportMode,
            mode: applied.mode,
            address: applied.address,
            hubCompanyName: applied.hubCompanyName,
            hubPhone: applied.hubPhone,
            destinationIdentifier: applied.destinationIdentifier,
            cartonMarking: applied.cartonMarking,
          },
          trade: { ...p.trade, shipmentMethod: applied.shipmentMethod },
          waybillInstructions: {
            instructionText: buildDomesticHubInstructionBlock({
              forwarderName: forwarder.name,
              transportMode: applied.transportMode,
              recipientName: applied.hubCompanyName,
              phone: applied.hubPhone,
              address: applied.address,
              destinationIdentifier: applied.destinationIdentifier,
              poNumber: p.poMeta.poNumber,
              cartonMarking: applied.cartonMarking,
            }),
          },
        }
      })
      setNotice(
        `Forwarder applied: ${forwarder.name} (${transportMode === 'air' ? 'Air' : 'Sea'})`
      )
    },
    [forwarders, updateDoc]
  )

  const handleApplySupplier = useCallback(
    (supplier: PoSupplierRecord) => {
      updateDoc((prev) => applySupplierToPoDoc(prev, supplier))
      setRecipientEmail(supplier.vendor.email || '')
      setNotice(`Supplier applied: ${supplier.name}`)
    },
    [updateDoc]
  )

  const handleAddCatalogLines = useCallback(
    (
      lines: {
        item: PoSupplierCatalogItem
        qty: number
        unitPriceOverride?: number
      }[]
    ) => {
      if (!lines.length) return
      updateDoc((prev) => {
        const keepPlaceholder =
          prev.items.length === 1 &&
          !(prev.items[0].descriptionEn || '').trim() &&
          (prev.items[0].unitPrice || 0) === 0 &&
          (prev.items[0].qty || 0) <= 1
        const base = keepPlaceholder ? [] : [...prev.items]
        const nextItems = [...base]
        for (const row of lines) {
          nextItems.push(
            catalogItemToPoLine(
              row.item,
              row.qty,
              nextItems.length + 1,
              row.unitPriceOverride
            )
          )
        }
        return { ...prev, items: nextItems }
      })
      setNotice(
        lines.length === 1
          ? `Added ${lines[0].item.descriptionEn} × ${lines[0].qty}`
          : `Added ${lines.length} catalog lines`
      )
    },
    [updateDoc]
  )

  /** Allocate permanent PO-YYYY-MM-### when still a draft placeholder; sync carton + DOM before PDF. */
  const finalizePoNumber = useCallback(
    (status?: PurchaseOrderDoc['poMeta']['status']): string => {
      const next = ensureMonthlyDocNumber('PO', doc.poMeta.poNumber)
      const finalized = recompute(applyFinalizedPoNumber(doc, next, status))
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
    setSectionOpen((prev) => ({ ...prev, preview: true }))
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
    setSectionOpen((prev) => ({ ...prev, preview: true }))
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
            Order from supplier (not a customer invoice) · {totalsPreview} · {doc.poMeta.status}
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
          {showEditForm ? (
            <>
              <button
                type="button"
                onClick={() => setAllSections(true)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={() => setAllSections(false)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Collapse all
              </button>
            </>
          ) : null}
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <p className="text-xs text-slate-500">
            Use Expand/Collapse per section. Advanced holds tax, Bill To, T&amp;C extras.
          </p>

          {/* 1. Order basics */}
          <PoFormSection
            title="1. Order"
            open={sectionOpen.order}
            onToggle={() => toggleSection('order')}
            summary={`${doc.trade.incoterm} ${doc.trade.namedPlace || ''} · ${doc.trade.shipmentMethod} · ${doc.payment.currency}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <p className="text-[10px] text-gray-500 mt-1">
                  Draft = PO-DRAFT-000 · finalised on Download / Send
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
                <label className={label}>Required ship date</label>
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
                <label className={label}>Supplier Quote / PI (optional)</label>
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
              <div className="md:col-span-2">
                <label className={label}>Incoterms + Port / Designated Place</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className={`${field} sm:w-44 shrink-0`}
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
                    <optgroup label="Primary">
                      {PO_INCOTERMS_PRIMARY.map((t) => (
                        <option key={t} value={t}>
                          {t === 'FOB' ? 'FOB (default)' : t}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="More (Advanced)">
                      {PO_INCOTERMS_MORE.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <input
                    className={field}
                    value={doc.trade.namedPlace}
                    placeholder={namedPlacePlaceholder(doc.trade.incoterm)}
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        trade: { ...p.trade, namedPlace: e.target.value },
                      }))
                    }
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  PDF shows:{' '}
                  <span className="font-semibold text-slate-700">
                    {formatIncotermLine(doc.trade.incoterm, doc.trade.namedPlace)}
                  </span>
                </p>
              </div>
              <div>
                <label className={label}>Shipment</label>
                <select
                  className={field}
                  value={doc.trade.shipmentMethod}
                  onChange={(e) =>
                    updateDoc((p) => ({
                      ...p,
                      trade: {
                        ...p.trade,
                        shipmentMethod: e.target
                          .value as PurchaseOrderDoc['trade']['shipmentMethod'],
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
                <label className={label}>Payment terms</label>
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
              {doc.payment.termsPreset === 'custom' ? (
                <div className="md:col-span-2 lg:col-span-4">
                  <label className={label}>Custom payment terms</label>
                  <input
                    className={field}
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
              ) : null}
            </div>
          </PoFormSection>

          {/* 2. Supplier */}
          <PoFormSection
            title="2. Supplier (한국 업체)"
            open={sectionOpen.supplier}
            onToggle={() => toggleSection('supplier')}
            summary={
              doc.vendor.name
                ? `${doc.vendor.name}${selectedSupplierId ? ' · registered' : ''}`
                : 'Select or enter supplier'
            }
          >
            <div className="space-y-4">
            <PoSupplierCatalogPanel
              doc={doc}
              selectedSupplierId={selectedSupplierId}
              onSelectSupplierId={setSelectedSupplierId}
              onApplySupplier={handleApplySupplier}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={label}>Company name</label>
                <input
                  className={field}
                  value={doc.vendor.name}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, vendor: { ...p.vendor, name: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className={label}>Contact</label>
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
              <div className="md:col-span-2">
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
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Supplier bank (remit TO)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={label}>Bank Name</label>
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
                  <label className={label}>Account Name / Holder</label>
                  <input
                    className={field}
                    value={doc.payment.supplierBank.accountName}
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        payment: {
                          ...p.payment,
                          supplierBank: {
                            ...p.payment.supplierBank,
                            accountName: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={label}>Account Number / IBAN</label>
                  <input
                    className={field}
                    value={doc.payment.supplierBank.accountNumber || ''}
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        payment: {
                          ...p.payment,
                          supplierBank: {
                            ...p.payment.supplierBank,
                            accountNumber: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={label}>SWIFT / BIC Code (optional · KRW domestic)</label>
                  <input
                    className={field}
                    value={doc.payment.supplierBank.swiftBic || ''}
                    placeholder="Required for FX / T/T wires"
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        payment: {
                          ...p.payment,
                          supplierBank: {
                            ...p.payment.supplierBank,
                            swiftBic: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={label}>Bank Code / Branch Name (KRW domestic)</label>
                  <input
                    className={field}
                    value={doc.payment.supplierBank.bankCodeOrBranch || ''}
                    placeholder="e.g. 은행코드 / 지점명"
                    onChange={(e) =>
                      updateDoc((p) => ({
                        ...p,
                        payment: {
                          ...p.payment,
                          supplierBank: {
                            ...p.payment.supplierBank,
                            bankCodeOrBranch: e.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-amber-800 mt-2">
              Remit TO supplier bank (not SELPIC receiving account). {PO_PAYMENT_REMITTANCE_NOTE}
            </p>
            </div>
          </PoFormSection>

          {/* 3. Ship To */}
          <PoFormSection
            title="3. Ship To"
            open={sectionOpen.shipTo}
            onToggle={() => toggleSection('shipTo')}
            summary={
              doc.shipTo.mode === 'forwarder_kr'
                ? `${doc.shipTo.forwarderName || 'KR hub'} · ${doc.shipTo.transportMode === 'air' ? 'Air' : 'Sea'}`
                : doc.shipTo.mode === 'selpic'
                  ? 'SELPIC AU Warehouse'
                  : 'Custom'
            }
          >
            <div className="space-y-3">
            <PoForwarderManagePanel
              onSaved={(saved) => {
                // Refresh locked Ship To fields from the updated master profile.
                if (
                  doc.shipTo.mode === 'forwarder_kr' &&
                  doc.shipTo.forwarderId === saved.id
                ) {
                  applyRegisteredForwarder(
                    saved.id,
                    doc.shipTo.transportMode === 'air' ? 'air' : 'sea'
                  )
                }
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={label}>Destination type</label>
                <select
                  className={field}
                  value={
                    doc.shipTo.mode === 'forwarder_kr'
                      ? 'forwarder_kr'
                      : doc.shipTo.presetId === 'custom' || doc.shipTo.mode === 'custom'
                        ? 'custom'
                        : 'selpic_au'
                  }
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'forwarder_kr') {
                      const first = activeForwarders[0]
                      if (!first) {
                        alert(
                          'Register a Korean forwarder first (Manage forwarders). Real hub details are not pre-loaded.'
                        )
                        return
                      }
                      applyRegisteredForwarder(first.id, 'sea')
                      return
                    }
                    const preset = getPoSystemShipPreset(v)
                    if (!preset) return
                    updateDoc((p) => ({
                      ...p,
                      shipTo: {
                        ...p.shipTo,
                        presetId: preset.id,
                        forwarderId: undefined,
                        forwarderName: undefined,
                        transportMode: undefined,
                        mode: preset.mode,
                        address: preset.domesticAddress,
                        hubCompanyName: preset.recipientName,
                        hubPhone: preset.phone,
                        destinationIdentifier: preset.destinationIdentifier,
                        cartonMarking: cartonMarkSample(
                          preset.destinationIdentifier,
                          p.poMeta.poNumber
                        ),
                      },
                      trade: preset.shipmentMethod
                        ? { ...p.trade, shipmentMethod: preset.shipmentMethod }
                        : p.trade,
                    }))
                  }}
                >
                  {PO_SYSTEM_SHIP_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="forwarder_kr">Korean Logistics Forwarder (배대지)</option>
                </select>
              </div>

              {doc.shipTo.mode === 'forwarder_kr' ? (
                <>
                  <div>
                    <label className={label}>Registered forwarder</label>
                    <select
                      className={field}
                      value={doc.shipTo.forwarderId || ''}
                      onChange={(e) => {
                        const id = e.target.value
                        if (!id) return
                        applyRegisteredForwarder(
                          id,
                          doc.shipTo.transportMode === 'air' ? 'air' : 'sea'
                        )
                      }}
                    >
                      <option value="">— Select forwarder —</option>
                      {activeForwarders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    {activeForwarders.length === 0 ? (
                      <p className="text-[10px] text-amber-800 mt-1">
                        No forwarders yet — use Manage forwarders above (admin registers later).
                      </p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>Transport mode (Air / Sea)</label>
                    <div className="flex gap-2">
                      {(['sea', 'air'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={!doc.shipTo.forwarderId}
                          onClick={() => {
                            if (!doc.shipTo.forwarderId) return
                            applyRegisteredForwarder(doc.shipTo.forwarderId, m)
                          }}
                          className={`px-4 py-2 text-sm rounded-md border ${
                            doc.shipTo.transportMode === m
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-700 border-slate-300'
                          } disabled:opacity-40`}
                        >
                          {m === 'sea' ? 'Sea Freight' : 'Air Freight'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Switching Air/Sea reloads that mode&apos;s recipient, phone, address, and
                      carton mark from the forwarder profile.
                    </p>
                  </div>
                </>
              ) : null}

              {(() => {
                const hubLocked =
                  doc.shipTo.mode === 'forwarder_kr' && Boolean(doc.shipTo.forwarderId)
                const lockedField = hubLocked
                  ? `${field} bg-slate-100 text-slate-700 cursor-not-allowed`
                  : field
                return (
                  <>
                    <div>
                      <label className={label}>Recipient / Attn (수취인 명의)</label>
                      <input
                        className={lockedField}
                        readOnly={hubLocked}
                        value={doc.shipTo.hubCompanyName || ''}
                        onChange={(e) =>
                          updateDoc((p) => ({
                            ...p,
                            shipTo: { ...p.shipTo, hubCompanyName: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className={label}>Hub phone</label>
                      <input
                        className={lockedField}
                        readOnly={hubLocked}
                        value={doc.shipTo.hubPhone || ''}
                        onChange={(e) =>
                          updateDoc((p) => ({
                            ...p,
                            shipTo: { ...p.shipTo, hubPhone: e.target.value },
                          }))
                        }
                      />
                    </div>
                    {!hubLocked ? (
                      <div>
                        <label className={label}>Destination identifier (Air/Sea mark)</label>
                        <input
                          className={field}
                          value={doc.shipTo.destinationIdentifier || ''}
                          placeholder="Admin-defined label"
                          onChange={(e) =>
                            updateDoc((p) => ({
                              ...p,
                              shipTo: {
                                ...p.shipTo,
                                destinationIdentifier: e.target.value,
                                cartonMarking: cartonMarkSample(
                                  e.target.value,
                                  p.poMeta.poNumber
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <div>
                        <label className={label}>Carton mark (from profile)</label>
                        <input
                          className={lockedField}
                          readOnly
                          value={resolvedCartonMark}
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className={label}>Domestic Ship To address</label>
                      <textarea
                        className={lockedField}
                        rows={2}
                        readOnly={hubLocked}
                        value={doc.shipTo.address}
                        onChange={(e) =>
                          updateDoc((p) => ({
                            ...p,
                            shipTo: { ...p.shipTo, address: e.target.value },
                          }))
                        }
                      />
                      {hubLocked ? (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Locked to the selected forwarder Sea/Air profile. Edit under Manage
                          forwarders, then re-select Sea or Air.
                        </p>
                      ) : null}
                    </div>
                  </>
                )
              })()}
            </div>

            {doc.shipTo.mode === 'forwarder_kr' ? (
              <details className="border border-amber-200 rounded-lg bg-amber-50/70 open:pb-0">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-800">
                  PDF hub instruction preview (same card as export — click to expand)
                </summary>
                <div className="mx-3 mb-3 max-h-64 overflow-auto">
                  <PoHubInstructionCard
                    compact
                    forwarderName={doc.shipTo.forwarderName || ''}
                    transportMode={doc.shipTo.transportMode}
                    recipientName={doc.shipTo.hubCompanyName || ''}
                    phone={doc.shipTo.hubPhone || ''}
                    address={doc.shipTo.address}
                    cartonMarking={resolvedCartonMark}
                  />
                </div>
              </details>
            ) : null}
            </div>
          </PoFormSection>

          {/* 4. Lines */}
          <PoFormSection
            title="4. Items (수량 중심)"
            open={sectionOpen.items}
            onToggle={() => toggleSection('items')}
            summary={`${doc.items.filter((i) => (i.descriptionEn || '').trim()).length || doc.items.length} line(s) · ${totalsPreview}`}
          >
            <div className="flex items-center justify-end mb-1">
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
                <Plus className="w-4 h-4" /> Add blank line
              </button>
            </div>

            <div className="mb-3 border border-emerald-200 rounded-lg bg-emerald-50/50 p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-6">
                <label className={label}>
                  Product from selected supplier
                  {!selectedSupplierId ? ' (select supplier first)' : ''}
                </label>
                <select
                  className={field}
                  value={catalogPickId}
                  disabled={!selectedSupplierId || supplierCatalogItems.length === 0}
                  onChange={(e) => setCatalogPickId(e.target.value)}
                >
                  <option value="">
                    {selectedSupplierId
                      ? supplierCatalogItems.length
                        ? '— Choose catalog product —'
                        : '— No catalog products for this supplier —'
                      : '— Select a registered supplier first —'}
                  </option>
                  {supplierCatalogItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.descriptionEn}
                      {c.sku ? ` (${c.sku})` : ''}
                      {isCatalogPriceConfirmed(c)
                        ? ` · ${formatPoMoney(c.unitPrice as number, doc.payment.currency)}`
                        : ' · price TBD'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Qty</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  className={field}
                  value={catalogPickQty}
                  onChange={(e) => setCatalogPickQty(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="md:col-span-4">
                <button
                  type="button"
                  disabled={!catalogPickId}
                  onClick={() => {
                    const item = supplierCatalogItems.find((c) => c.id === catalogPickId)
                    if (!item) return
                    if (!isCatalogPriceConfirmed(item)) {
                      alert(
                        'This catalog product has no confirmed unit price. Set it under Manage catalog, then add.'
                      )
                      return
                    }
                    handleAddCatalogLines([{ item, qty: catalogPickQty }])
                    setCatalogPickId('')
                    setCatalogPickQty(1)
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  Add product (qty only)
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {doc.items.map((item, index) => (
                <div
                  key={`line-${index}`}
                  className="border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2"
                >
                  <div className="md:col-span-4">
                    <label className={label}>Description EN</label>
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
                    <label className={label}>Description KO</label>
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
                  <div className="md:col-span-2">
                    <label className={label}>Unit</label>
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
                  <div className="md:col-span-1">
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
                  <div className="md:col-span-2">
                    <label className={label}>Unit price</label>
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
                  <div className="md:col-span-8">
                    <label className={label}>
                      Line note (pack breakdown · Air/Sea · promo)
                    </label>
                    <input
                      className={field}
                      value={item.lineNote || ''}
                      placeholder="e.g. 1+1 Promo Pack · 8EA Display Box · Box 1-2 AIR / 3-6 SEA"
                      onChange={(e) =>
                        updateDoc((p) => {
                          const items = [...p.items]
                          items[index] = { ...items[index], lineNote: e.target.value }
                          return { ...p, items }
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>SKU</label>
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
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      disabled={doc.items.length <= 1}
                      onClick={() =>
                        updateDoc((p) => ({
                          ...p,
                          items: p.items.filter((_, i) => i !== index),
                        }))
                      }
                      className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="w-40">
                <label className={label}>Freight (optional)</label>
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
              <p className="text-sm font-semibold text-slate-800 pt-5">
                Total: {totalsPreview}
              </p>
            </div>
          </PoFormSection>

          {/* Advanced (collapsed) */}
          <section className="border border-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Advanced (tax, Bill To, T&amp;C, extras)
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showAdvanced ? (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={label}>Tax rule</label>
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
                    <p className="text-[10px] text-gray-500 mt-1">
                      Default for KR suppliers: Overseas Zero-Rated
                    </p>
                  </div>
                  <div>
                    <label className={label}>Bill To name</label>
                    <input
                      className={field}
                      value={doc.billTo.name}
                      onChange={(e) =>
                        updateDoc((p) => ({
                          ...p,
                          billTo: { ...p.billTo, name: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>Bill To address</label>
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
                  {doc.shipTo.mode === 'forwarder_kr' ? (
                    <>
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
                        <label className={label}>Waybill guide URL</label>
                        <input
                          className={field}
                          value={doc.shipTo.waybillGuideUrl || ''}
                          onChange={(e) =>
                            updateDoc((p) => ({
                              ...p,
                              shipTo: { ...p.shipTo, waybillGuideUrl: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="md:col-span-2">
                    <label className={label}>Notes (on PDF)</label>
                    <textarea
                      className={field}
                      rows={2}
                      value={doc.notes || ''}
                      onChange={(e) => updateDoc((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>Terms &amp; Conditions</label>
                    <textarea
                      className={field}
                      rows={4}
                      value={doc.termsAndConditions}
                      onChange={(e) =>
                        updateDoc((p) => ({ ...p, termsAndConditions: e.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={label}>Signature image URL</label>
                    <input
                      className={field}
                      value={doc.signatureImageUrl || ''}
                      onChange={(e) =>
                        updateDoc((p) => ({ ...p, signatureImageUrl: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Send */}
          <PoFormSection
            title="Send to supplier"
            open={sectionOpen.send}
            onToggle={() => toggleSection('send')}
            summary={recipientEmail || doc.vendor.email || 'Enter supplier email'}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={label}>Supplier email</label>
                <input
                  type="email"
                  className={field}
                  value={recipientEmail}
                  placeholder={doc.vendor.email || 'supplier@example.com'}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Message (optional)</label>
                <textarea
                  className={field}
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleSendEmail()}
              disabled={isSending}
              className="mt-3 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Email to Supplier
            </button>
          </PoFormSection>
        </div>
      ) : null}

      {/* Live preview / PDF source — keepMounted so Download/Send still find poRef */}
      <PoFormSection
        title="Preview PDF"
        open={sectionOpen.preview}
        onToggle={() => toggleSection('preview')}
        summary={`${doc.poMeta.poNumber} · ${totalsPreview}`}
        keepMounted
      >
        <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
          <div ref={poRef}>
            <PurchaseOrderTemplate doc={doc} />
          </div>
        </div>
      </PoFormSection>
    </div>
  )
}

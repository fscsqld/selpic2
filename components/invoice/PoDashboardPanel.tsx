'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, Loader2, Pencil, Save, Settings2, Trash2 } from 'lucide-react'
import {
  PO_DOMESTIC_CARRIERS,
  PO_OPS_STATUSES,
  carrierLabel,
  opsStatusLabel,
  type PoDomesticCarrierCode,
  type PoOpsStatus,
} from '@/lib/poDomesticCarriers'
import {
  EMPTY_HANA_ONE_FORM_CONFIG,
  buildDefaultHanaOnePrefillPayload,
  buildHanaOnePrefillUrl,
  canOpenHanaOneForm,
  isHanaOneFormConfigured,
  loadHanaOneFormConfig,
  saveHanaOneFormConfig,
  type HanaOneGoogleFormConfig,
} from '@/lib/poHanaOneGoogleForm'
import { usePoStore, type SavedPurchaseOrder } from '@/lib/poStore'
import { formatPoMoney } from '@/lib/purchaseOrderTotals'
import { shipmentMethodLabel } from '@/lib/purchaseOrderTypes'
import { scheduleLogAdminActivity } from '@/lib/loadLogAdminActivity'
import PurchaseOrderTemplate from '@/components/invoice/PurchaseOrderTemplate'

type Props = {
  onOpenInCreator: (draftId: string) => void
}

type RowDraft = {
  carrier: PoDomesticCarrierCode | ''
  trackingNo: string
  opsStatus: PoOpsStatus
}

function modeLabel(row: SavedPurchaseOrder): string {
  const m = row.doc.trade.shipmentMethod
  return shipmentMethodLabel(m, 'en')
}

export default function PoDashboardPanel({ onOpenInCreator }: Props) {
  const drafts = usePoStore((s) => s.drafts)
  const updateLogistics = usePoStore((s) => s.updateLogistics)
  const deleteDraft = usePoStore((s) => s.deleteDraft)

  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showFormSetup, setShowFormSetup] = useState(false)
  const [formConfig, setFormConfig] = useState<HanaOneGoogleFormConfig>(EMPTY_HANA_ONE_FORM_CONFIG)

  useEffect(() => {
    setFormConfig(loadHanaOneFormConfig())
  }, [])

  useEffect(() => {
    setRowDrafts((prev) => {
      const next = { ...prev }
      for (const d of drafts) {
        if (!next[d.id]) {
          next[d.id] = {
            carrier: d.logistics?.carrier || '',
            trackingNo: d.logistics?.trackingNo || '',
            opsStatus: d.logistics?.opsStatus || 'draft',
          }
        }
      }
      return next
    })
  }, [drafts])

  const sorted = useMemo(
    () =>
      [...drafts].sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
      ),
    [drafts]
  )

  const handleSaveLogistics = useCallback(
    (id: string) => {
      const draft = rowDrafts[id]
      if (!draft) return
      if (!draft.carrier || !draft.trackingNo.trim()) {
        setNotice('Select a carrier and enter a tracking number before Save.')
        return
      }
      setSavingId(id)
      const updated = updateLogistics(id, {
        carrier: draft.carrier,
        trackingNo: draft.trackingNo.trim(),
        opsStatus: draft.opsStatus,
        saved: true,
      })
      setSavingId(null)
      if (!updated) return
      setRowDrafts((prev) => ({
        ...prev,
        [id]: {
          carrier: updated.logistics?.carrier || '',
          trackingNo: updated.logistics?.trackingNo || '',
          opsStatus: updated.logistics?.opsStatus || 'in_transit',
        },
      }))
      setNotice(
        `Saved domestic shipping for ${updated.doc.poMeta.poNumber}: ${carrierLabel(draft.carrier)} ${draft.trackingNo.trim()}`
      )
      scheduleLogAdminActivity({
        action: 'purchase_order_logistics_saved',
        target: updated.doc.poMeta.poNumber,
        description: `PO logistics ${carrierLabel(draft.carrier)} / ${draft.trackingNo.trim()}`,
        field: 'domestic_shipping',
        newValue: `${draft.carrier}|${draft.trackingNo.trim()}`,
      })
    },
    [rowDrafts, updateLogistics]
  )

  const handleOpenHanaOne = useCallback(
    (row: SavedPurchaseOrder) => {
      const draft = rowDrafts[row.id]
      const carrier = draft?.carrier || row.logistics?.carrier || ''
      const trackingNo = draft?.trackingNo || row.logistics?.trackingNo || ''
      const logisticsSaved = Boolean(row.logistics?.saved)
      if (!canOpenHanaOneForm({ carrierCode: carrier, trackingNo, logisticsSaved })) {
        setNotice('Save Carrier and Tracking No first, then open the Hana One form.')
        return
      }
      const config = loadHanaOneFormConfig()
      const payload = buildDefaultHanaOnePrefillPayload({
        carrierCode: carrier,
        trackingNo,
        doc: row.doc,
      })
      if (!isHanaOneFormConfigured(config)) {
        void navigator.clipboard?.writeText(payload.packageInfo)
        setNotice(
          'Hana One Google Form URL / entry IDs are not configured yet. Package info copied to clipboard — open Form setup below, or paste values into the form manually.'
        )
        setShowFormSetup(true)
        return
      }
      const url = buildHanaOnePrefillUrl(config, payload)
      if (!url) {
        setNotice('Could not build the Google Form URL. Check Form setup.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    [rowDrafts]
  )

  const handleDownloadPdf = useCallback(async (row: SavedPurchaseOrder) => {
    setDownloadingId(row.id)
    try {
      const host = document.getElementById(`po-dash-pdf-${row.id}`)
      if (!host) throw new Error('PDF host missing')
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `${row.doc.poMeta.poNumber}_${(row.doc.vendor.name || 'Supplier')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40)}.pdf`
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename,
          image: { type: 'jpeg', quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: host.scrollWidth,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(host)
        .save()
      scheduleLogAdminActivity({
        action: 'purchase_order_downloaded',
        target: row.doc.poMeta.poNumber,
        description: `Downloaded PO PDF from dashboard ${filename}`,
      })
    } catch (e) {
      console.error('[PO dashboard] PDF failed', e)
      setNotice('PDF download failed. Open in Creator and try Download PDF there.')
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const handleSaveFormConfig = () => {
    saveHanaOneFormConfig(formConfig)
    setNotice('Hana One Google Form mapping saved in this browser.')
    setShowFormSetup(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">PO Dashboard (발주 관리)</h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Track saved POs, domestic carrier / tracking, and open the Hana One Google Form when
            ready.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFormSetup((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          <Settings2 className="w-4 h-4" />
          Hana One Form setup
        </button>
      </div>

      {notice ? (
        <div className="text-sm bg-amber-50 border border-amber-100 text-amber-950 rounded-lg px-3 py-2">
          {notice}
        </div>
      ) : null}

      {showFormSetup ? (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <p className="text-xs text-slate-600 leading-relaxed">
            From the live Hana One Google Form: menu → <strong>Get pre-filled link</strong>. Paste
            the viewform URL and each <code className="text-[11px]">entry.########</code> id below
            (also supported via <code className="text-[11px]">NEXT_PUBLIC_HANA_ONE_*</code> env).
            Until configured, Save still unlocks the button and Package Info is copied to the
            clipboard.
          </p>
          {(
            [
              ['viewFormUrl', 'Viewform URL'],
              ['entryRecipientName', 'Entry: Recipient Name'],
              ['entryRecipientPhone', 'Entry: Recipient Phone'],
              ['entryRecipientEmail', 'Entry: Recipient Email'],
              ['entryPackageInfo', 'Entry: Package Info'],
              ['entryDeliveryAddress', 'Entry: Delivery Address'],
              ['entryDeliveryOption', 'Entry: Delivery Option'],
              ['entryKrCustoms', 'Entry: KR Customs'],
              ['entryAuCustoms', 'Entry: AU Customs'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input
                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                value={formConfig[key]}
                onChange={(e) => setFormConfig((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={key === 'viewFormUrl' ? 'https://docs.google.com/forms/d/e/…/viewform' : 'entry.123456789'}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveFormConfig}
              className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-900"
            >
              Save form mapping
            </button>
            <button
              type="button"
              onClick={() => setShowFormSetup(false)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
          No saved POs yet. Use <strong>PO Creator</strong> → Save Draft (or Download / Send) first.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="bg-slate-800 text-white text-left">
                <th className="px-3 py-2.5 font-semibold">PO Number</th>
                <th className="px-3 py-2.5 font-semibold">Supplier</th>
                <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                <th className="px-3 py-2.5 font-semibold">Mode</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold min-w-[280px]">
                  Domestic Shipping
                </th>
                <th className="px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const draft = rowDrafts[row.id] || {
                  carrier: '',
                  trackingNo: '',
                  opsStatus: 'draft' as PoOpsStatus,
                }
                const logisticsSaved = Boolean(row.logistics?.saved)
                const formReady = canOpenHanaOneForm({
                  carrierCode: draft.carrier,
                  trackingNo: draft.trackingNo,
                  logisticsSaved,
                })
                return (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {row.doc.poMeta.poNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-700 max-w-[160px]">
                      <span className="line-clamp-2">{row.doc.vendor.name || '—'}</span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-slate-800">
                      {formatPoMoney(row.doc.totals.total, row.doc.payment.currency)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                      {modeLabel(row).replace(' Freight', '')}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white"
                        value={draft.opsStatus}
                        onChange={(e) =>
                          setRowDrafts((p) => ({
                            ...p,
                            [row.id]: {
                              ...draft,
                              opsStatus: e.target.value as PoOpsStatus,
                            },
                          }))
                        }
                      >
                        {PO_OPS_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {opsStatusLabel(row.logistics?.opsStatus)}
                        {logisticsSaved ? ' · tracking saved' : ''}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white max-w-[7.5rem]"
                          value={draft.carrier}
                          onChange={(e) =>
                            setRowDrafts((p) => ({
                              ...p,
                              [row.id]: {
                                ...draft,
                                carrier: e.target.value as PoDomesticCarrierCode | '',
                              },
                            }))
                          }
                        >
                          <option value="">Carrier…</option>
                          {PO_DOMESTIC_CARRIERS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="border border-slate-200 rounded-md px-2 py-1 text-xs w-28"
                          placeholder="Tracking No"
                          value={draft.trackingNo}
                          onChange={(e) =>
                            setRowDrafts((p) => ({
                              ...p,
                              [row.id]: { ...draft, trackingNo: e.target.value },
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveLogistics(row.id)}
                          disabled={savingId === row.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-900 disabled:opacity-50"
                        >
                          {savingId === row.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5 items-stretch min-w-[11rem]">
                        <button
                          type="button"
                          disabled={!formReady}
                          title={
                            formReady
                              ? 'Open Hana One Google Form (pre-filled when configured)'
                              : 'Save Carrier + Tracking No first'
                          }
                          onClick={() => handleOpenHanaOne(row)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium rounded-md border border-emerald-600 text-emerald-800 bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-100"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          Open Hana One Form
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadPdf(row)}
                          disabled={downloadingId === row.id}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {downloadingId === row.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Download PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenInCreator(row.id)}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit in Creator
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete saved PO ${row.doc.poMeta.poNumber}?`)) {
                              deleteDraft(row.id)
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Off-screen PDF hosts for dashboard download */}
      <div className="fixed left-[-10000px] top-0 w-[210mm]" aria-hidden>
        {sorted.map((row) => (
          <div key={row.id} id={`po-dash-pdf-${row.id}`}>
            <PurchaseOrderTemplate doc={row.doc} />
          </div>
        ))}
      </div>
    </div>
  )
}

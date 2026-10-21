import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PurchaseOrderDoc } from '@/lib/purchaseOrderTypes'
import type { PoDomesticCarrierCode, PoOpsStatus } from '@/lib/poDomesticCarriers'

export interface PoLogisticsTracking {
  carrier: PoDomesticCarrierCode | ''
  trackingNo: string
  /** True after admin clicks Save on carrier + tracking. */
  saved: boolean
  savedAt?: string
  opsStatus: PoOpsStatus
}

export interface SavedPurchaseOrder {
  id: string
  savedAt: string
  label: string
  doc: PurchaseOrderDoc
  logistics?: PoLogisticsTracking
}

interface PoStoreState {
  drafts: SavedPurchaseOrder[]
  saveDraft: (doc: PurchaseOrderDoc, id?: string) => SavedPurchaseOrder
  deleteDraft: (id: string) => void
  getDraft: (id: string) => SavedPurchaseOrder | undefined
  updateLogistics: (
    id: string,
    patch: Partial<PoLogisticsTracking>
  ) => SavedPurchaseOrder | undefined
}

const MAX_DRAFTS = 50

function createId(): string {
  return `po-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultLogistics(doc: PurchaseOrderDoc): PoLogisticsTracking {
  const status = doc.poMeta.status
  const opsStatus: PoOpsStatus =
    status === 'sent'
      ? 'sent'
      : status === 'closed' || status === 'cancelled'
        ? 'closed'
        : 'draft'
  return {
    carrier: '',
    trackingNo: '',
    saved: false,
    opsStatus,
  }
}

export const usePoStore = create<PoStoreState>()(
  persist(
    (set, get) => ({
      drafts: [],
      saveDraft: (doc, id) => {
        const existingId = id?.trim()
        const prev = existingId ? get().drafts.find((d) => d.id === existingId) : undefined
        const entry: SavedPurchaseOrder = {
          id: existingId || createId(),
          savedAt: new Date().toISOString(),
          label: `${doc.poMeta.poNumber} — ${doc.vendor.name || 'Untitled supplier'}`,
          doc: JSON.parse(JSON.stringify(doc)) as PurchaseOrderDoc,
          logistics: prev?.logistics || defaultLogistics(doc),
        }
        // Keep ops status in sync when PO is sent/downloaded, unless already in_transit+.
        if (doc.poMeta.status === 'sent' && entry.logistics) {
          const cur = entry.logistics.opsStatus
          if (cur === 'draft') {
            entry.logistics = { ...entry.logistics, opsStatus: 'sent' }
          }
        }
        set((state) => {
          const without = state.drafts.filter((d) => d.id !== entry.id)
          return { drafts: [entry, ...without].slice(0, MAX_DRAFTS) }
        })
        return entry
      },
      deleteDraft: (id) => {
        set((state) => ({ drafts: state.drafts.filter((d) => d.id !== id) }))
      },
      getDraft: (id) => get().drafts.find((d) => d.id === id),
      updateLogistics: (id, patch) => {
        let updated: SavedPurchaseOrder | undefined
        set((state) => {
          const drafts = state.drafts.map((d) => {
            if (d.id !== id) return d
            const base = d.logistics || defaultLogistics(d.doc)
            const next: PoLogisticsTracking = {
              ...base,
              ...patch,
              carrier: (patch.carrier !== undefined ? patch.carrier : base.carrier) || '',
              trackingNo:
                patch.trackingNo !== undefined ? patch.trackingNo : base.trackingNo,
            }
            if (patch.saved === true) {
              next.saved = true
              next.savedAt = new Date().toISOString()
              if (next.carrier && next.trackingNo.trim()) {
                if (next.opsStatus === 'draft' || next.opsStatus === 'sent') {
                  next.opsStatus = 'in_transit'
                }
              }
            }
            updated = { ...d, logistics: next, savedAt: new Date().toISOString() }
            return updated
          })
          return { drafts }
        })
        return updated
      },
    }),
    { name: 'selpic-po-drafts' }
  )
)

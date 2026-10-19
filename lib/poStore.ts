import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PurchaseOrderDoc } from '@/lib/purchaseOrderTypes'

export interface SavedPurchaseOrder {
  id: string
  savedAt: string
  label: string
  doc: PurchaseOrderDoc
}

interface PoStoreState {
  drafts: SavedPurchaseOrder[]
  saveDraft: (doc: PurchaseOrderDoc, id?: string) => SavedPurchaseOrder
  deleteDraft: (id: string) => void
  getDraft: (id: string) => SavedPurchaseOrder | undefined
}

const MAX_DRAFTS = 50

function createId(): string {
  return `po-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const usePoStore = create<PoStoreState>()(
  persist(
    (set, get) => ({
      drafts: [],
      saveDraft: (doc, id) => {
        const existingId = id?.trim()
        const entry: SavedPurchaseOrder = {
          id: existingId || createId(),
          savedAt: new Date().toISOString(),
          label: `${doc.poMeta.poNumber} — ${doc.vendor.name || 'Untitled supplier'}`,
          doc: JSON.parse(JSON.stringify(doc)) as PurchaseOrderDoc,
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
    }),
    { name: 'selpic-po-drafts' }
  )
)

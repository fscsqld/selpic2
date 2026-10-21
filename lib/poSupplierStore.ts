import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  createEmptyCatalogItem,
  type PoSupplierCatalogItem,
  type PoSupplierRecord,
} from './poSupplierTypes'
import { normalizeSupplierBank } from './purchaseOrderTypes'

interface PoSupplierStoreState {
  suppliers: PoSupplierRecord[]
  upsertSupplier: (
    input: Omit<PoSupplierRecord, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
    }
  ) => PoSupplierRecord
  deleteSupplier: (id: string) => void
  getSupplier: (id: string) => PoSupplierRecord | undefined
  upsertCatalogItem: (
    supplierId: string,
    item: Omit<PoSupplierCatalogItem, 'id' | 'updatedAt'> & { id?: string }
  ) => PoSupplierCatalogItem | null
  deleteCatalogItem: (supplierId: string, itemId: string) => void
}

const MAX_SUPPLIERS = 100
const MAX_ITEMS_PER_SUPPLIER = 200

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeItem(
  item: Omit<PoSupplierCatalogItem, 'id' | 'updatedAt'> & { id?: string },
  existingId?: string
): PoSupplierCatalogItem {
  const priceRaw = item.unitPrice
  const unitPrice =
    priceRaw === null || priceRaw === undefined
      ? null
      : Number.isFinite(Number(priceRaw))
        ? Math.max(0, Number(priceRaw))
        : null
  return {
    id: existingId || item.id || createId('po-sku'),
    descriptionEn: (item.descriptionEn || '').trim(),
    descriptionKo: (item.descriptionKo || '').trim() || undefined,
    sku: (item.sku || '').trim() || undefined,
    packUnit: item.packUnit || 'carton',
    unitPrice,
    lineNote: (item.lineNote || '').trim() || undefined,
    countryOfOrigin: (item.countryOfOrigin || '').trim() || undefined,
    hsCode: (item.hsCode || '').trim() || undefined,
    isActive: item.isActive !== false,
    updatedAt: new Date().toISOString(),
  }
}

export const usePoSupplierStore = create<PoSupplierStoreState>()(
  persist(
    (set, get) => ({
      suppliers: [],

      upsertSupplier: (input) => {
        const now = new Date().toISOString()
        const existingId = input.id?.trim()
        const prev = existingId ? get().suppliers.find((s) => s.id === existingId) : undefined
        const name = (input.name || input.vendor?.name || '').trim() || 'Untitled supplier'
        const entry: PoSupplierRecord = {
          id: existingId || createId('po-sup'),
          name,
          vendor: {
            name: (input.vendor?.name || name).trim(),
            address: input.vendor?.address || '',
            contactPerson: input.vendor?.contactPerson || '',
            email: input.vendor?.email || '',
            phone: input.vendor?.phone || '',
            vatOrBizReg: input.vendor?.vatOrBizReg || '',
          },
          supplierBank: normalizeSupplierBank(input.supplierBank),
          defaults: input.defaults
            ? { ...input.defaults }
            : prev?.defaults
              ? { ...prev.defaults }
              : undefined,
          items: Array.isArray(input.items)
            ? input.items
                .map((it) => normalizeItem(it, it.id))
                .slice(0, MAX_ITEMS_PER_SUPPLIER)
            : prev?.items
              ? prev.items.map((it) => ({ ...it }))
              : [],
          createdAt: prev?.createdAt || input.createdAt || now,
          updatedAt: now,
        }
        set((state) => {
          const without = state.suppliers.filter((s) => s.id !== entry.id)
          return {
            suppliers: [entry, ...without]
              .sort((a, b) => a.name.localeCompare(b.name, 'en'))
              .slice(0, MAX_SUPPLIERS),
          }
        })
        return entry
      },

      deleteSupplier: (id) => {
        set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) }))
      },

      getSupplier: (id) => get().suppliers.find((s) => s.id === id),

      upsertCatalogItem: (supplierId, item) => {
        const supplier = get().suppliers.find((s) => s.id === supplierId)
        if (!supplier) return null
        const existing = item.id ? supplier.items.find((i) => i.id === item.id) : undefined
        const nextItem = normalizeItem(
          { ...createEmptyCatalogItem(), ...item },
          existing?.id
        )
        if (!nextItem.descriptionEn) return null

        set((state) => ({
          suppliers: state.suppliers.map((s) => {
            if (s.id !== supplierId) return s
            const without = s.items.filter((i) => i.id !== nextItem.id)
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              items: [nextItem, ...without].slice(0, MAX_ITEMS_PER_SUPPLIER),
            }
          }),
        }))
        return nextItem
      },

      deleteCatalogItem: (supplierId, itemId) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id !== supplierId
              ? s
              : {
                  ...s,
                  updatedAt: new Date().toISOString(),
                  items: s.items.filter((i) => i.id !== itemId),
                }
          ),
        }))
      },
    }),
    { name: 'selpic-po-suppliers' }
  )
)

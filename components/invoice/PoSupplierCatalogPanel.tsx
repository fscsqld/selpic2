'use client'

import { useMemo, useState } from 'react'
import { Building2, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { formatPoMoney } from '@/lib/purchaseOrderTotals'
import { usePoSupplierStore } from '@/lib/poSupplierStore'
import {
  createEmptyCatalogItem,
  isCatalogPriceConfirmed,
  supplierFromPoDoc,
  type PoSupplierCatalogItem,
  type PoSupplierRecord,
} from '@/lib/poSupplierTypes'
import { PO_CURRENCIES, PO_PACK_UNITS, type PurchaseOrderDoc } from '@/lib/purchaseOrderTypes'
import { scheduleLogAdminActivity } from '@/lib/loadLogAdminActivity'

const field =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-400'
const label = 'block text-xs font-medium text-gray-600 mb-1'

type Props = {
  doc: PurchaseOrderDoc
  selectedSupplierId: string | null
  onSelectSupplierId: (id: string | null) => void
  onApplySupplier: (supplier: PoSupplierRecord) => void
}

/**
 * Supplier master only: select / save / manage catalog prices.
 * Adding lines to the PO happens in Section 4 (single path).
 */
export default function PoSupplierCatalogPanel({
  doc,
  selectedSupplierId,
  onSelectSupplierId,
  onApplySupplier,
}: Props) {
  const suppliers = usePoSupplierStore((s) => s.suppliers)
  const upsertSupplier = usePoSupplierStore((s) => s.upsertSupplier)
  const deleteSupplier = usePoSupplierStore((s) => s.deleteSupplier)
  const upsertCatalogItem = usePoSupplierStore((s) => s.upsertCatalogItem)
  const deleteCatalogItem = usePoSupplierStore((s) => s.deleteCatalogItem)

  const [manageOpen, setManageOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [itemDraft, setItemDraft] = useState(() => createEmptyCatalogItem())

  const selected = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || null,
    [suppliers, selectedSupplierId]
  )

  const activeItems = useMemo(
    () => (selected?.items || []).filter((i) => i.isActive !== false),
    [selected]
  )

  const handlePickSupplier = (id: string) => {
    if (!id) {
      onSelectSupplierId(null)
      return
    }
    const s = suppliers.find((x) => x.id === id)
    if (!s) return
    onSelectSupplierId(s.id)
    onApplySupplier(s)
  }

  const handleSaveSupplierFromForm = () => {
    const name = (doc.vendor.name || '').trim()
    if (!name) {
      alert('Enter the supplier company name on the form first, then save.')
      return
    }
    const payload = supplierFromPoDoc(doc, selected)
    const saved = upsertSupplier({
      ...payload,
      id: selected?.id,
      createdAt: selected?.createdAt,
    })
    onSelectSupplierId(saved.id)
    scheduleLogAdminActivity({
      action: 'purchase_order_supplier_saved',
      target: saved.id,
      description: `Saved PO supplier master ${saved.name}`,
    })
    setManageOpen(true)
    if (!(saved.items || []).some((i) => i.isActive !== false)) {
      setEditingItemId('new')
      setItemDraft(createEmptyCatalogItem())
    }
  }

  const handleDeleteSupplier = () => {
    if (!selected) return
    if (!confirm(`Delete supplier “${selected.name}” and its catalog?`)) return
    deleteSupplier(selected.id)
    scheduleLogAdminActivity({
      action: 'purchase_order_supplier_deleted',
      target: selected.id,
      description: `Deleted PO supplier master ${selected.name}`,
    })
    onSelectSupplierId(null)
    setEditingItemId(null)
  }

  const startNewItem = () => {
    setEditingItemId('new')
    setItemDraft(createEmptyCatalogItem())
  }

  const startEditItem = (item: PoSupplierCatalogItem) => {
    setEditingItemId(item.id)
    setItemDraft({
      descriptionEn: item.descriptionEn,
      descriptionKo: item.descriptionKo || '',
      sku: item.sku || '',
      packUnit: item.packUnit,
      unitPrice: item.unitPrice,
      lineNote: item.lineNote || '',
      countryOfOrigin: item.countryOfOrigin || 'Korea',
      hsCode: item.hsCode || '',
      isActive: item.isActive !== false,
    })
  }

  const saveItemDraft = () => {
    if (!selected) {
      alert('Select or save a supplier first.')
      return
    }
    if (!(itemDraft.descriptionEn || '').trim()) {
      alert('Description (EN) is required.')
      return
    }
    const saved = upsertCatalogItem(selected.id, {
      ...itemDraft,
      id: editingItemId && editingItemId !== 'new' ? editingItemId : undefined,
    })
    if (!saved) {
      alert('Could not save catalog item.')
      return
    }
    scheduleLogAdminActivity({
      action: 'purchase_order_supplier_saved',
      target: selected.id,
      field: 'catalog_item',
      newValue: saved.sku || saved.descriptionEn,
      description: `Saved catalog item for ${selected.name}: ${saved.descriptionEn}`,
    })
    setEditingItemId(null)
    setItemDraft(createEmptyCatalogItem())
  }

  const currency = selected?.defaults?.currency || doc.payment.currency

  return (
    <div className="border border-slate-200 rounded-lg bg-slate-50/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800 inline-flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Registered suppliers (한국 업체 마스터)
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSaveSupplierFromForm}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 inline-flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            {selected ? 'Update master from form' : 'Save form as new supplier'}
          </button>
          {selected ? (
            <button
              type="button"
              onClick={handleDeleteSupplier}
              className="text-xs px-3 py-1.5 rounded-md border border-red-200 text-red-700 bg-white hover:bg-red-50 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete supplier
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={label}>Select supplier → fill vendor &amp; bank</label>
          <select
            className={field}
            value={selectedSupplierId || ''}
            onChange={(e) => handlePickSupplier(e.target.value)}
          >
            <option value="">— Manual entry / choose supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.items.filter((i) => i.isActive !== false).length
                  ? ` (${s.items.filter((i) => i.isActive !== false).length} SKUs)`
                  : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Local browser only. After catalog prices are set, add lines in <strong>4. Items</strong>.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-1">
          <button
            type="button"
            onClick={() => {
              if (!selected) {
                alert(
                  'Select a registered supplier first, or fill Company name below and click “Save form as new supplier”.'
                )
                return
              }
              setManageOpen((v) => {
                const next = !v
                if (next) {
                  const hasItems = (selected.items || []).some((i) => i.isActive !== false)
                  if (!hasItems) {
                    setEditingItemId('new')
                    setItemDraft(createEmptyCatalogItem())
                  }
                }
                return next
              })
            }}
            className="text-xs px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100"
            title={
              selected
                ? 'Add or edit products and confirmed unit prices'
                : 'Save or select a supplier first'
            }
          >
            {manageOpen && selected ? 'Hide catalog editor' : 'Manage catalog / unit prices'}
          </button>
          {!selected ? (
            <p className="text-[10px] text-amber-800 text-right">
              Save/select a supplier first to edit the catalog.
            </p>
          ) : null}
        </div>
      </div>

      {selected && manageOpen ? (
        <div className="border border-slate-200 rounded-md bg-white p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">
              Catalog for {selected.name} · currency {currency}
            </p>
            <button
              type="button"
              onClick={startNewItem}
              className="text-xs inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
            >
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
          </div>

          {editingItemId ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-amber-100 bg-amber-50/40 rounded-md p-3">
              <div className="md:col-span-4">
                <label className={label}>Description EN *</label>
                <input
                  className={field}
                  value={itemDraft.descriptionEn}
                  onChange={(e) => setItemDraft((p) => ({ ...p, descriptionEn: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3">
                <label className={label}>Description KO</label>
                <input
                  className={field}
                  value={itemDraft.descriptionKo || ''}
                  onChange={(e) => setItemDraft((p) => ({ ...p, descriptionKo: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>SKU</label>
                <input
                  className={field}
                  value={itemDraft.sku || ''}
                  onChange={(e) => setItemDraft((p) => ({ ...p, sku: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Unit</label>
                <select
                  className={field}
                  value={itemDraft.packUnit}
                  onChange={(e) =>
                    setItemDraft((p) => ({
                      ...p,
                      packUnit: e.target.value as PoSupplierCatalogItem['packUnit'],
                    }))
                  }
                >
                  {PO_PACK_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Confirmed unit price</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={field}
                  placeholder="Leave empty if TBD"
                  value={itemDraft.unitPrice ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setItemDraft((p) => ({
                      ...p,
                      unitPrice: v === '' ? null : Number(v),
                    }))
                  }}
                />
              </div>
              <div className="md:col-span-6">
                <label className={label}>Line note template</label>
                <input
                  className={field}
                  placeholder="e.g. 1+1 Promo · 8EA Display Box"
                  value={itemDraft.lineNote || ''}
                  onChange={(e) => setItemDraft((p) => ({ ...p, lineNote: e.target.value }))}
                />
              </div>
              <div className="md:col-span-4 flex items-end gap-2">
                <button
                  type="button"
                  onClick={saveItemDraft}
                  className="px-3 py-2 text-xs rounded-md bg-slate-800 text-white hover:bg-slate-900"
                >
                  Save product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemId(null)
                    setItemDraft(createEmptyCatalogItem())
                  }}
                  className="px-3 py-2 text-xs rounded-md border border-slate-300"
                >
                  Cancel
                </button>
              </div>
              <p className="md:col-span-12 text-[10px] text-slate-500">
                Confirmed prices snapshot onto PO lines in section 4. Master price changes do not
                rewrite saved drafts. Currency:{' '}
                {PO_CURRENCIES.includes(currency) ? currency : doc.payment.currency}.
              </p>
            </div>
          ) : null}

          {activeItems.length === 0 && !editingItemId ? (
            <p className="text-xs text-slate-500">No products yet. Add SKUs with confirmed unit prices.</p>
          ) : (
            <ul className="space-y-2">
              {activeItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 text-xs border border-slate-100 rounded-md px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{item.descriptionEn}</p>
                    <p className="text-slate-500">
                      {item.sku ? `${item.sku} · ` : ''}
                      {PO_PACK_UNITS.find((u) => u.value === item.packUnit)?.label}
                      {' · '}
                      {isCatalogPriceConfirmed(item)
                        ? formatPoMoney(item.unitPrice as number, currency)
                        : 'Price TBD'}
                      {item.lineNote ? ` · ${item.lineNote}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditItem(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-800"
                    aria-label="Edit product"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm('Remove this product from the catalog?')) return
                      deleteCatalogItem(selected.id, item.id)
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!selected && suppliers.length === 0 ? (
        <p className="text-xs text-slate-500">
          Tip: fill Supplier + bank below → Save form as new supplier → Manage catalog → then add
          qty in section 4.
        </p>
      ) : null}
    </div>
  )
}

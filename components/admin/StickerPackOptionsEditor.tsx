'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { StickerLayoutProductInput } from '@/lib/stickerSheetLayout'
import {
  buildSuggestedStickerPacks,
  formatStickerPackLabel,
  getLabelsPerSheetFromProduct,
  sanitizeStickerSheetBundles,
  type StickerSheetBundle,
} from '@/lib/stickerSheetBundles'

type Props = {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  bundles: StickerSheetBundle[] | undefined
  onChange: (bundles: StickerSheetBundle[]) => void
  layoutProduct: StickerLayoutProductInput
  listPrice: number
  onListPriceChange: (price: number) => void
}

export default function StickerPackOptionsEditor({
  enabled,
  onEnabledChange,
  bundles,
  onChange,
  layoutProduct,
  listPrice,
  onListPriceChange,
}: Props) {
  const labelsPerSheet = getLabelsPerSheetFromProduct(layoutProduct)
  const rows = sanitizeStickerSheetBundles(bundles)

  const updateRow = (index: number, patch: Partial<StickerSheetBundle>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    const sanitized = sanitizeStickerSheetBundles(next)
    onChange(sanitized)
    if (sanitized.length > 0) {
      onListPriceChange(Math.min(...sanitized.map((b) => b.price)))
    }
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    const sanitized = sanitizeStickerSheetBundles(rows.filter((_, i) => i !== index))
    onChange(sanitized)
    if (sanitized.length > 0) {
      onListPriceChange(Math.min(...sanitized.map((b) => b.price)))
    }
  }

  const addRow = () => {
    const maxSheets = rows.reduce((m, r) => Math.max(m, r.sheets), 0)
    const sheets = maxSheets + 1
    const sanitized = sanitizeStickerSheetBundles([
      ...rows,
      {
        id: String(sheets),
        sheets,
        price: 0,
        label: formatStickerPackLabel(sheets, labelsPerSheet),
      },
    ])
    onChange(sanitized)
  }

  const fillSuggested = () => {
    const suggested = buildSuggestedStickerPacks(layoutProduct)
    const withPrices = suggested.map((b, i) => ({
      ...b,
      price: (rows[i]?.price ?? listPrice / (b.sheets || 1)) || 0,
    }))
    const sanitized = sanitizeStickerSheetBundles(withPrices)
    onChange(sanitized)
    if (sanitized.length > 0) {
      onListPriceChange(Math.min(...sanitized.map((b) => b.price)))
    }
  }

  const relabelFromGrid = () => {
    const sanitized = sanitizeStickerSheetBundles(
      rows.map((row) => ({
        ...row,
        label: formatStickerPackLabel(row.sheets, labelsPerSheet),
      }))
    )
    onChange(sanitized)
  }

  return (
    <div className="md:col-span-2 rounded-xl border border-sky-200 bg-sky-50/80 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="h-4 w-4 text-sky-600 rounded border-gray-300"
            />
            <span className="text-sm font-semibold text-sky-950">Enable label pack options</span>
          </label>
          <p className="mt-1 text-xs text-sky-900 leading-relaxed max-w-xl">
            Let customers choose how many sheets (labels) per pack on the customize page — like eBay pack
            sizes. When enabled, list price syncs to the lowest pack price.
          </p>
          <p className="mt-1 text-xs font-medium text-sky-800">
            This product: {labelsPerSheet} labels per sheet (from size / grid).
          </p>
        </div>
      </div>

      {enabled && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fillSuggested}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border border-sky-300 text-sky-900 hover:bg-sky-100"
            >
              Fill 1 / 2 / 3 sheet packs
            </button>
            <button
              type="button"
              onClick={relabelFromGrid}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-white border border-sky-300 text-sky-900 hover:bg-sky-100"
            >
              Update labels from grid
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, index) => (
              <div
                key={`${row.id}-${index}`}
                className="grid grid-cols-[1fr_1fr_1.4fr_auto] gap-2 items-end bg-white rounded-lg border border-sky-200 p-2"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sheets in pack</label>
                  <input
                    type="number"
                    min={1}
                    value={row.sheets}
                    onChange={(e) => {
                      const sheets = Math.max(1, parseInt(e.target.value, 10) || 1)
                      updateRow(index, {
                        sheets,
                        id: String(sheets),
                        label: formatStickerPackLabel(sheets, labelsPerSheet),
                      })
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-sky-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (AUD)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.price}
                    onChange={(e) =>
                      updateRow(index, { price: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    className="w-full px-2 py-1.5 text-sm border border-sky-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Customer label</label>
                  <input
                    type="text"
                    value={row.label || ''}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    placeholder={formatStickerPackLabel(row.sheets, labelsPerSheet)}
                    className="w-full px-2 py-1.5 text-sm border border-sky-200 rounded-md"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Remove pack option"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(index)}
                  className="p-2 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-900 hover:text-sky-950"
          >
            <Plus className="w-4 h-4" />
            Add pack option
          </button>

          <p className="text-xs text-sky-800">
            Example for {labelsPerSheet}/sheet: 1 pack = {labelsPerSheet} labels, 3 packs of 3 sheets ={' '}
            {labelsPerSheet * 9} labels. Customers also choose quantity (number of packs) on customize.
          </p>
        </>
      )}
    </div>
  )
}

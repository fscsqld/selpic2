'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { MixedLabelsSheetBundle } from '@/lib/mixedLabelsPricing'
import { DEFAULT_MIXED_LABELS_SHEET_BUNDLES, sanitizeMixedLabelsSheetBundles } from '@/lib/mixedLabelsPricing'

type Props = {
  bundles: MixedLabelsSheetBundle[] | undefined
  onChange: (bundles: MixedLabelsSheetBundle[]) => void
}

export default function MixedLabelsSheetBundlesEditor({ bundles, onChange }: Props) {
  const rows = sanitizeMixedLabelsSheetBundles(bundles)

  const updateRow = (index: number, patch: Partial<MixedLabelsSheetBundle>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(sanitizeMixedLabelsSheetBundles(next))
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    onChange(sanitizeMixedLabelsSheetBundles(rows.filter((_, i) => i !== index)))
  }

  const addRow = () => {
    const maxSheets = rows.reduce((m, r) => Math.max(m, r.sheets), 0)
    onChange(
      sanitizeMixedLabelsSheetBundles([
        ...rows,
        {
          id: `bundle-${maxSheets + 1}`,
          sheets: maxSheets + 1,
          price: 0,
          label: `${maxSheets + 1} sheets`,
        },
      ])
    )
  }

  const resetDefaults = () => {
    onChange(DEFAULT_MIXED_LABELS_SHEET_BUNDLES.map((b) => ({ ...b })))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-800">Sheet bundle options</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Each option is one pack (e.g. 1 sheet for $2.99). Customers choose a bundle, then how many
            packs (quantity) on the customize page.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="text-xs font-medium text-amber-800 hover:text-amber-950 underline"
        >
          Reset to defaults
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={`${row.id}-${index}`}
            className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 items-end bg-white rounded-lg border border-amber-200 p-2"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sheets in pack</label>
              <input
                type="number"
                min={1}
                value={row.sheets}
                onChange={(e) =>
                  updateRow(index, {
                    sheets: Math.max(1, parseInt(e.target.value, 10) || 1),
                    id: String(Math.max(1, parseInt(e.target.value, 10) || 1)),
                  })
                }
                className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded-md"
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
                className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
              <input
                type="text"
                value={row.label || ''}
                onChange={(e) => updateRow(index, { label: e.target.value })}
                placeholder={row.sheets === 1 ? '1 sheet' : `${row.sheets} sheets`}
                className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded-md"
              />
            </div>
            <button
              type="button"
              aria-label="Remove bundle option"
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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-900 hover:text-amber-950"
      >
        <Plus className="w-4 h-4" />
        Add bundle option
      </button>
    </div>
  )
}

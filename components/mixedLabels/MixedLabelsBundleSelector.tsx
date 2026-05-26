'use client'

import type { MixedLabelsSheetBundle } from '@/lib/mixedLabelsPricing'
import { formatMixedLabelsBundleOptionLabel } from '@/lib/mixedLabelsPricing'

type Props = {
  bundles: MixedLabelsSheetBundle[]
  selectedBundleId: string
  onSelect: (bundle: MixedLabelsSheetBundle) => void
  /** Match Sticker Customization sidebar (slate) or standalone light panels */
  variant?: 'light' | 'dark'
}

export default function MixedLabelsBundleSelector({
  bundles,
  selectedBundleId,
  onSelect,
  variant = 'light',
}: Props) {
  if (bundles.length === 0) return null

  const isDark = variant === 'dark'

  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
        Sheet bundle
      </p>
      <p className={`text-xs -mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        Sheets per pack — then choose quantity (number of packs) below the preview.
      </p>
      <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Sheet bundle">
        {bundles.map((bundle) => {
          const selected = bundle.id === selectedBundleId
          const label = formatMixedLabelsBundleOptionLabel(bundle)
          return (
            <button
              key={bundle.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(bundle)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                selected
                  ? isDark
                    ? 'border-amber-500/80 bg-amber-500/15 shadow-sm'
                    : 'border-amber-500 bg-amber-50 shadow-sm'
                  : isDark
                    ? 'border-slate-600 bg-slate-800/80 hover:border-slate-500'
                    : 'border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50/40'
              }`}
            >
              <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {label}
              </span>
              <span
                className={`text-base font-bold tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
              >
                ${bundle.price.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

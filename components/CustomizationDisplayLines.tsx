'use client'

import { getColorName } from '@/lib/colorUtils'
import {
  isCustomizationColourLabel,
  type CustomizationDisplayLine,
} from '@/lib/mixedLabelsCartDisplay'

type Props = {
  lines: CustomizationDisplayLine[]
  className?: string
  /** Compact packing-slip / receipt density */
  dense?: boolean
}

/**
 * Shared personalization lines for cart, order detail, admin, packing slips, receipts.
 * Colour labels show a swatch when the stored value is a hex code.
 */
export default function CustomizationDisplayLines({ lines, className = '', dense }: Props) {
  if (!lines.length) return null

  const swatchSize = dense ? 'w-4 h-4' : 'w-5 h-5'
  const rowClass = dense
    ? 'flex items-center gap-2'
    : 'flex items-center gap-2 text-sm text-gray-600'

  return (
    <div className={`space-y-1 ${className}`.trim()}>
      {lines.map((line) => {
        const isColour = isCustomizationColourLabel(line.label)
        const raw = line.value
        const showSwatch = isColour && raw.startsWith('#')
        return (
          <div key={`${line.label}:${line.value}`} className={rowClass}>
            <span className="font-medium">{line.label}:</span>
            {showSwatch ? (
              <div className="flex items-center gap-2">
                <div
                  className={`${swatchSize} rounded border border-gray-300 shrink-0`}
                  style={{ backgroundColor: raw }}
                  title={raw}
                />
                <span className="font-medium">{getColorName(raw)}</span>
              </div>
            ) : (
              <span>{raw}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

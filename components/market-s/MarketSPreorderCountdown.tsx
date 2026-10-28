'use client'

import { useEffect, useState } from 'react'
import {
  formatPreorderClosesAtLabel,
  getMarketSPreorderCountdownParts,
  type MarketSPreorderFields,
} from '@/lib/marketSPreorder'

type Props = {
  product: MarketSPreorderFields | null | undefined
  /** Compact tiles under price; default = banner / PDP block */
  compact?: boolean
  /** Hub banner = dark; PDP card = light */
  tone?: 'dark' | 'light'
  className?: string
}

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0')
}

/**
 * Live countdown to pre-order close (admin opt-in + last 7 days only).
 * Does not count down to ships-from — that stays as static copy.
 */
export default function MarketSPreorderCountdown({
  product,
  compact,
  tone = 'dark',
  className,
}: Props) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const parts = getMarketSPreorderCountdownParts(product, now)
  if (!parts) return null

  const closesLabel = formatPreorderClosesAtLabel(product?.preorderClosesAt)
  const units = [
    { label: 'Days', value: parts.days },
    { label: 'Hrs', value: parts.hours },
    { label: 'Min', value: parts.minutes },
    { label: 'Sec', value: parts.seconds },
  ]
  const light = tone === 'light'

  if (compact) {
    return (
      <div
        className={
          className ||
          'mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-700'
        }
        aria-live="polite"
      >
        <span className="font-semibold tracking-wide uppercase text-stone-500">Closes in</span>
        <span className="font-mono font-semibold tabular-nums text-stone-900">
          {parts.days > 0 ? `${parts.days}d ` : ''}
          {pad2(parts.hours)}:{pad2(parts.minutes)}:{pad2(parts.seconds)}
        </span>
      </div>
    )
  }

  return (
    <div
      className={
        className ||
        (light
          ? 'rounded-md border border-stone-200 bg-white px-3 py-2.5'
          : 'rounded-lg border border-stone-600/40 bg-stone-950/40 px-3 py-2.5 sm:px-4')
      }
      aria-live="polite"
    >
      <p
        className={`text-[10px] font-semibold tracking-[0.18em] uppercase ${
          light ? 'text-stone-500' : 'text-stone-400'
        }`}
      >
        Pre-order closes in
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2 sm:gap-3">
        {units.map((u) => (
          <div key={u.label} className="min-w-[3.25rem] text-center">
            <div
              className={`font-mono text-lg sm:text-xl font-semibold tabular-nums leading-none ${
                light ? 'text-stone-900' : 'text-stone-50'
              }`}
            >
              {u.label === 'Days' ? u.value : pad2(u.value)}
            </div>
            <div
              className={`mt-0.5 text-[9px] uppercase tracking-wider ${
                light ? 'text-stone-500' : 'text-stone-400'
              }`}
            >
              {u.label}
            </div>
          </div>
        ))}
      </div>
      {closesLabel ? (
        <p className={`mt-2 text-[11px] ${light ? 'text-stone-500' : 'text-stone-400'}`}>
          Closes {closesLabel}
        </p>
      ) : null}
    </div>
  )
}

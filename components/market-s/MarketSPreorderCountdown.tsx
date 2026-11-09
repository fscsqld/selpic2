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
  /**
   * When true, skip outer border/background so a parent card owns the chrome
   * (avoids nested boxes on PDP).
   */
  embedded?: boolean
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
  embedded = false,
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
  const urgent = parts.totalMs <= 24 * 60 * 60 * 1000
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
          `mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-1.5 py-0.5 text-[11px] ${
            urgent
              ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200/80'
              : 'bg-stone-100 text-stone-800 ring-1 ring-stone-200/80'
          }`
        }
        aria-live="polite"
      >
        <span
          className={`font-semibold tracking-wide uppercase ${
            urgent ? 'text-amber-700' : 'text-stone-500'
          }`}
        >
          Closes in
        </span>
        <span className="font-mono text-xs font-bold tabular-nums tracking-tight">
          {parts.days > 0 ? `${parts.days}d ` : ''}
          {pad2(parts.hours)}:{pad2(parts.minutes)}:{pad2(parts.seconds)}
        </span>
      </div>
    )
  }

  const shellClass = embedded
    ? className || ''
    : className ||
      (light
        ? urgent
          ? 'rounded-lg border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/80 px-3 py-3 sm:px-4'
          : 'rounded-lg border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-stone-50 px-3 py-3 sm:px-4'
        : urgent
          ? 'rounded-lg border border-amber-400/50 bg-stone-950/50 px-3 py-3 sm:px-4'
          : 'rounded-lg border border-stone-600/40 bg-stone-950/40 px-3 py-3 sm:px-4')

  return (
    <div className={shellClass} aria-live="polite">
      <p
        className={`text-[11px] font-semibold tracking-[0.16em] uppercase ${
          light
            ? urgent
              ? 'text-amber-800'
              : 'text-amber-900/70'
            : urgent
              ? 'text-amber-200'
              : 'text-stone-400'
        }`}
      >
        Pre-order closes in
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2 sm:gap-2.5">
        {units.map((u) => (
          <div
            key={u.label}
            className={`min-w-[3.75rem] flex-1 basis-[3.75rem] max-w-[5.5rem] rounded-md px-2 py-2 text-center sm:min-w-[4.25rem] ${
              light
                ? urgent
                  ? 'border border-amber-300/70 bg-white/90 shadow-sm'
                  : 'border border-amber-200/60 bg-white/80 shadow-sm'
                : urgent
                  ? 'border border-amber-400/30 bg-black/25'
                  : 'border border-white/10 bg-black/20'
            }`}
          >
            <div
              className={`font-mono text-2xl sm:text-3xl font-semibold tabular-nums leading-none tracking-tight ${
                light
                  ? urgent
                    ? 'text-amber-950'
                    : 'text-stone-900'
                  : urgent
                    ? 'text-amber-50'
                    : 'text-stone-50'
              }`}
            >
              {u.label === 'Days' ? u.value : pad2(u.value)}
            </div>
            <div
              className={`mt-1 text-[10px] font-medium uppercase tracking-wider ${
                light
                  ? urgent
                    ? 'text-amber-800/80'
                    : 'text-stone-500'
                  : urgent
                    ? 'text-amber-200/80'
                    : 'text-stone-400'
              }`}
            >
              {u.label}
            </div>
          </div>
        ))}
      </div>
      {closesLabel ? (
        <p
          className={`mt-2.5 text-xs ${
            light
              ? urgent
                ? 'text-amber-900/80'
                : 'text-stone-600'
              : urgent
                ? 'text-amber-100/80'
                : 'text-stone-400'
          }`}
        >
          Closes {closesLabel}
        </p>
      ) : null}
    </div>
  )
}

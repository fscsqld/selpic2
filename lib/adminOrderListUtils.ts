import type { OrderPlatformSource, OrderRecord } from '@/lib/store'
import { ORDER_PLATFORM_LABEL } from '@/lib/store'

const BADGE_STYLE: Record<OrderPlatformSource, string> = {
  website: 'bg-slate-100 text-slate-800 border border-slate-200',
  etsy: 'bg-orange-50 text-orange-900 border border-orange-200',
  ebay: 'bg-blue-50 text-blue-900 border border-blue-200',
  amazon: 'bg-amber-50 text-amber-900 border border-amber-200',
}

/** Bracket label + Tailwind classes for list rows (e.g. `[Website]`). */
export function orderPlatformBadge(order: OrderRecord): { text: string; className: string } {
  const p = (order.platformSource || 'website') as OrderPlatformSource
  const label = ORDER_PLATFORM_LABEL[p] ?? ORDER_PLATFORM_LABEL.website
  return {
    text: `[${label}]`,
    className: `inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLE[p] ?? BADGE_STYLE.website}`,
  }
}

/** One focal personalization string per line item (Etsy + website customizations). */
export function collectOrderPersonalizationParts(order: OrderRecord): string[] {
  const parts: string[] = []
  for (const it of order.items || []) {
    const name = String(it.name || 'Item').trim()
    if (it.buyerPersonalization?.trim()) {
      parts.push(`${name}: ${it.buyerPersonalization.trim()}`)
      continue
    }
    const etsyPers = it.customizations?.['Etsy personalization']?.trim()
    if (etsyPers) {
      parts.push(`${name}: ${etsyPers}`)
      continue
    }
    if (it.personalizationResponses?.length) {
      const txt = it.personalizationResponses.map((r) => `${r.label}: ${r.value}`).join('; ')
      if (txt.trim()) parts.push(`${name}: ${txt.trim()}`)
      continue
    }
    const keys = ['Name', 'name', 'Child name', 'Child Name', 'Baby name', 'Text', 'Line 1', 'Line 2']
    for (const k of keys) {
      const v = it.customizations?.[k]?.trim()
      if (v) {
        parts.push(`${name}: ${v}`)
        break
      }
    }
  }
  return parts
}

/** One-line summary for tables (truncated). */
export function summarizeOrderPersonalization(order: OrderRecord, maxLen = 220): string {
  const parts = collectOrderPersonalizationParts(order)
  const s = parts.join(' · ')
  if (!s) return '—'
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
}

/** Multi-line block for packing slips / PDF labels (not truncated). */
export function formatOrderPersonalizationForLabel(order: OrderRecord): string {
  const parts = collectOrderPersonalizationParts(order)
  return parts.length ? parts.join('\n') : '—'
}

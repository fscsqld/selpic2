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

/** Known storefront / admin keys (values: trim-only; never alter customer letter case). */
const OTHER_PERSONALIZATION_KEYS = [
  'Name',
  'name',
  'Child name',
  'Child Name',
  'Baby name',
  'Line 1',
  'Line 2',
] as const

/** Typical sticker sheet fields — order matches packing slip expectations. */
const PRIMARY_DISPLAY_KEYS = ['font', 'size', 'text', 'Text', 'color'] as const

/** Set/bundle line text: `sticker_0_text`, `item1_text`, etc. */
const SET_OR_BUNDLE_TEXT_KEY_RE = /^(sticker_\d+_text|item\d+_text)$/

function pushUniquePersonalizationLine(parts: string[], line: string) {
  const t = line.trim()
  if (!t) return
  if (!parts.includes(t)) parts.push(t)
}

function readCustomizationString(cust: Record<string, unknown>, key: string): string {
  const raw = cust[key]
  return typeof raw === 'string' ? raw.trim() : ''
}

/** `key: value` on one line (label PDF). */
function pushLabeledValue(lines: string[], key: string, value: string) {
  if (!value) return
  lines.push(`${key}: ${value}`)
}

/**
 * Storefront `customizations` → multi-line block: product name, then font/size/text/color, etc.
 * Only trim(); never change customer spelling/case.
 */
function collectStorefrontCustomizationBlock(name: string, cust: Record<string, unknown>): string | null {
  const lines: string[] = [name]
  let hasText = false
  for (const k of PRIMARY_DISPLAY_KEYS) {
    if (k === 'Text') {
      if (hasText) continue
    }
    const v = readCustomizationString(cust, k)
    if (!v) continue
    if (k === 'text' || k === 'Text') hasText = true
    pushLabeledValue(lines, k, v)
  }
  for (const k of OTHER_PERSONALIZATION_KEYS) {
    const v = readCustomizationString(cust, k)
    pushLabeledValue(lines, k, v)
  }
  const dynamicKeys = Object.keys(cust)
    .filter((k) => SET_OR_BUNDLE_TEXT_KEY_RE.test(k))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  for (const k of dynamicKeys) {
    const v = readCustomizationString(cust, k)
    pushLabeledValue(lines, k, v)
  }
  if (lines.length <= 1) return null
  return lines.join('\n')
}

/** Per line item: marketplace + website customizations (trim only on values; case preserved). */
export function collectOrderPersonalizationParts(order: OrderRecord): string[] {
  const parts: string[] = []
  for (const it of order.items || []) {
    const name = String(it.name || 'Item').trim()
    const bp = typeof it.buyerPersonalization === 'string' ? it.buyerPersonalization.trim() : ''
    if (bp) {
      parts.push(`${name}: ${bp}`)
      continue
    }
    const etsyRaw = it.customizations?.['Etsy personalization']
    const etsyPers = typeof etsyRaw === 'string' ? etsyRaw.trim() : ''
    if (etsyPers) {
      parts.push(`${name}: ${etsyPers}`)
      continue
    }
    if (it.personalizationResponses?.length) {
      const txt = it.personalizationResponses
        .map((r) => {
          const v = typeof r.value === 'string' ? r.value.trim() : String(r.value ?? '').trim()
          return `${r.label}: ${v}`
        })
        .join('; ')
      if (txt.trim()) parts.push(`${name}: ${txt.trim()}`)
      continue
    }

    const cust = it.customizations
    if (cust && typeof cust === 'object' && !Array.isArray(cust)) {
      const block = collectStorefrontCustomizationBlock(name, cust as Record<string, unknown>)
      if (block) pushUniquePersonalizationLine(parts, block)
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

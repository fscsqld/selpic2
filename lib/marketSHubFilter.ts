import {
  MARKET_S_SUBCATEGORIES,
  marketSSubcategoryIcon,
} from './marketSSubcategory'
import { isMarketSPreorderOpen, type MarketSSalesMode } from './marketSPreorder'

export const MARKET_S_HUB_FILTER_ALL = 'all'
/** Special hub filter — not a subcategory; matches open pre-order SKUs only. */
export const MARKET_S_HUB_FILTER_PREORDER = 'preorder'

export type MarketSHubFilterOption = {
  value: string
  label: string
  icon: string
}

/**
 * Hub filters are subcategory only (Single Item / Family Bundle),
 * plus optional Pre-order pseudo-filter.
 * Older UI used `other-${name}` and split on the first dash, which cannot
 * match catalog `HotGoods` + `Single Item`.
 */
export function normalizeMarketSHubFilter(filter: string): string {
  const raw = String(filter || '').trim()
  if (!raw || raw === MARKET_S_HUB_FILTER_ALL) return MARKET_S_HUB_FILTER_ALL
  if (raw.toLowerCase() === MARKET_S_HUB_FILTER_PREORDER) return MARKET_S_HUB_FILTER_PREORDER
  if (/^other-/i.test(raw)) {
    return raw.replace(/^other-/i, '').trim() || MARKET_S_HUB_FILTER_ALL
  }
  return raw
}

export function marketSHubFilterOptions(
  productSubcategories: Iterable<string>
): MarketSHubFilterOption[] {
  const seen = new Set<string>()
  const rows: MarketSHubFilterOption[] = []
  for (const row of MARKET_S_SUBCATEGORIES) {
    seen.add(row.value)
    rows.push({ value: row.value, label: row.label, icon: row.icon })
  }
  for (const subcategory of productSubcategories) {
    const value = String(subcategory || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    rows.push({
      value,
      label: value,
      icon: marketSSubcategoryIcon(value),
    })
  }
  return rows
}

export function productMatchesMarketSHubFilter(
  product: {
    subcategory?: string
    category?: string
    isHotGoods?: boolean
    salesMode?: MarketSSalesMode
    preorderSupplierConfirmed?: boolean
    preorderShipsFrom?: string
    preorderClosesAt?: string
    preorderMaxQty?: number
    preorderSoldCount?: number
  },
  filter: string
): boolean {
  const selected = normalizeMarketSHubFilter(filter)
  if (selected === MARKET_S_HUB_FILTER_ALL) return true
  if (selected === MARKET_S_HUB_FILTER_PREORDER) {
    return isMarketSPreorderOpen(product)
  }
  return String(product.subcategory || '').trim() === selected
}

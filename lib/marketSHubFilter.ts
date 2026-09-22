import {
  MARKET_S_SUBCATEGORIES,
  marketSSubcategoryIcon,
} from './marketSSubcategory'

export const MARKET_S_HUB_FILTER_ALL = 'all'

export type MarketSHubFilterOption = {
  value: string
  label: string
  icon: string
}

/**
 * Hub filters are subcategory only (Single Item / Family Bundle).
 * Older UI used `other-${name}` and split on the first dash, which cannot
 * match catalog `HotGoods` + `Single Item`.
 */
export function normalizeMarketSHubFilter(filter: string): string {
  const raw = String(filter || '').trim()
  if (!raw || raw === MARKET_S_HUB_FILTER_ALL) return MARKET_S_HUB_FILTER_ALL
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
  product: { subcategory?: string },
  filter: string
): boolean {
  const selected = normalizeMarketSHubFilter(filter)
  if (selected === MARKET_S_HUB_FILTER_ALL) return true
  return String(product.subcategory || '').trim() === selected
}

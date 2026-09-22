/**
 * Market S product subcategory = shipping class only (one string on the SKU).
 * Retired merch labels (Sunscreen, …) are not admin options; leftover SKUs stay
 * free-text and ship as parcel. See market-s-subcategory-fields.mdc.
 */
export const MARKET_S_SUBCATEGORIES = [
  { value: 'Single Item', label: 'Single Item', icon: '🧴' },
  { value: 'Family Bundle', label: 'Family Bundle', icon: '🎁' },
] as const

export const MARKET_S_SHIPPING_SUBCATEGORIES = ['Single Item', 'Family Bundle'] as const

/** Former hub-filter labels. Not required; do not offer in Add Product. */
export const MARKET_S_RETIRED_MERCH_SUBCATEGORIES = [
  'Sunscreen',
  'Sunstick',
  'Cool Patch',
  'Lifestyle',
  'Other',
] as const

const RETIRED_MERCH_ICON: Record<string, string> = {
  Sunscreen: '☀️',
  Sunstick: '🧴',
  'Cool Patch': '❄️',
  Lifestyle: '🌟',
  Other: '🔥',
}

const RETIRED_MERCH_SET = new Set<string>(MARKET_S_RETIRED_MERCH_SUBCATEGORIES)

export type MarketSSubcategory = (typeof MARKET_S_SUBCATEGORIES)[number]['value']

export const MARKET_S_SUBCATEGORY_VALUES: readonly MarketSSubcategory[] = MARKET_S_SUBCATEGORIES.map(
  (row) => row.value
)

const VALUE_SET = new Set<string>(MARKET_S_SUBCATEGORY_VALUES)

export function isMarketSSubcategory(value: string): value is MarketSSubcategory {
  return VALUE_SET.has(value)
}

export function isRetiredMarketSMerchSubcategory(value: string): boolean {
  return RETIRED_MERCH_SET.has(String(value || '').trim())
}

export function marketSSubcategoryIcon(value: string): string {
  const row = MARKET_S_SUBCATEGORIES.find((item) => item.value === value)
  if (row) return row.icon
  return RETIRED_MERCH_ICON[value] || '📦'
}

export function isMarketSCatalogProduct(product: {
  category?: string
  isHotGoods?: boolean
}): boolean {
  if (product.isHotGoods === true) return true
  return String(product.category || '').trim().toLowerCase() === 'hotgoods'
}

export type MarketSSubcategoryOption = {
  value: string
  label: string
  icon: string
}

/**
 * Admin product forms: Single Item + Family Bundle only.
 * CMS storefront tiles and retired merch names must not re-enter the dropdown.
 * A leftover SKU value is appended only while editing that product so save does not snap to Single Item.
 */
export function marketSProductSubcategoryOptions(
  extra?: Array<{ value?: string; label?: string; icon?: string } | null | undefined>,
  currentValue?: string
): MarketSSubcategoryOption[] {
  const rows: MarketSSubcategoryOption[] = MARKET_S_SUBCATEGORIES.map((row) => ({
    value: row.value,
    label: row.label,
    icon: row.icon,
  }))
  const seen = new Set(rows.map((row) => row.value))
  for (const item of extra || []) {
    const value = String(item?.value || '').trim()
    if (!value || seen.has(value) || isRetiredMarketSMerchSubcategory(value)) continue
    seen.add(value)
    rows.push({
      value,
      label: String(item?.label || value).trim() || value,
      icon: String(item?.icon || '').trim() || marketSSubcategoryIcon(value),
    })
  }
  const current = String(currentValue || '').trim()
  if (current && !seen.has(current)) {
    rows.push({
      value: current,
      label: isRetiredMarketSMerchSubcategory(current) ? `${current} (legacy)` : current,
      icon: marketSSubcategoryIcon(current),
    })
  }
  return rows
}

export function defaultMarketSShippingWeightGrams(subcategory?: string): number {
  return String(subcategory || '').trim() === 'Single Item' ? 40 : 250
}

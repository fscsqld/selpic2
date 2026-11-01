/** Keep in sync with `OrderPlatformSource` / `ORDER_PLATFORM_*` in `lib/store.ts`. */
export const NORMALIZED_ORDER_PLATFORM_SOURCES = [
  'website',
  'etsy',
  'ebay',
  'amazon',
] as const

export type NormalizedOrderPlatformSource = (typeof NORMALIZED_ORDER_PLATFORM_SOURCES)[number]

export const NORMALIZED_ORDER_PLATFORM_LABEL: Record<NormalizedOrderPlatformSource, string> = {
  website: 'Website',
  etsy: 'Etsy',
  ebay: 'eBay',
  amazon: 'Amazon',
}

/** Coerce any API/UI value to a known sales channel; unknown → fallback. */
export function normalizeOrderPlatformSource(
  value: unknown,
  fallback: NormalizedOrderPlatformSource = 'website'
): NormalizedOrderPlatformSource {
  const v = String(value ?? '')
    .trim()
    .toLowerCase() as NormalizedOrderPlatformSource
  return (NORMALIZED_ORDER_PLATFORM_SOURCES as readonly string[]).includes(v) ? v : fallback
}

/** Payment fields when admin records a marketplace (or website) sale by hand. */
export function paymentFieldsForPlatform(
  platform: NormalizedOrderPlatformSource,
  opts?: { websitePaymentMethodName?: string }
): {
  paymentMethod: 'bank' | 'marketplace'
  paymentMethodName: string
} {
  if (platform === 'website') {
    return {
      paymentMethod: 'bank',
      paymentMethodName: opts?.websitePaymentMethodName ?? 'Manual label',
    }
  }
  return {
    paymentMethod: 'marketplace',
    paymentMethodName: NORMALIZED_ORDER_PLATFORM_LABEL[platform],
  }
}

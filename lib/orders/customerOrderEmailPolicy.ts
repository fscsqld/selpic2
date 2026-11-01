import {
  NORMALIZED_ORDER_PLATFORM_LABEL,
  normalizeOrderPlatformSource,
  type NormalizedOrderPlatformSource,
} from './normalizeOrderPlatformSource'

type Platformish = { platformSource?: string | null }

/**
 * Website checkout customers get SELPIC transactional mail.
 * Etsy / eBay / Amazon buyers are messaged by those marketplaces — do not send from SELPIC.
 */
export function shouldSendCustomerOrderEmail(order: Platformish): boolean {
  return normalizeOrderPlatformSource(order.platformSource) === 'website'
}

export function resolveOrderSalesPlatform(order: Platformish): NormalizedOrderPlatformSource {
  return normalizeOrderPlatformSource(order.platformSource)
}

export function marketplaceCustomerEmailSkipReason(order: Platformish): string {
  const platform = resolveOrderSalesPlatform(order)
  if (platform === 'website') return ''
  return `Customer emails are handled by ${NORMALIZED_ORDER_PLATFORM_LABEL[platform]}. SELPIC does not send order confirmation, receipt, or shipping emails for this sales channel.`
}

import type { OrderItemSnapshot } from './store'
import { isMarketSCatalogProduct } from './marketSSubcategory'

export type OrderCatalogMix = 'stickers_only' | 'market_s_only' | 'mixed' | 'general'

export type OrderCatalogMixFlags = {
  hasStickers: boolean
  hasMarketS: boolean
  mix: OrderCatalogMix
}

type LineLike = Pick<OrderItemSnapshot, 'category' | 'isHotGoods'> | null | undefined

export function isOrderLineSticker(line: LineLike): boolean {
  if (!line) return false
  return String(line.category || '').trim() === 'Stickers'
}

export function isOrderLineMarketS(line: LineLike): boolean {
  if (!line) return false
  return isMarketSCatalogProduct(line)
}

/** Classify storefront order lines for confirmation email copy (stickers / Market S / both). */
export function classifyOrderCatalogMix(
  items: LineLike[] | null | undefined
): OrderCatalogMixFlags {
  let hasStickers = false
  let hasMarketS = false
  for (const item of items || []) {
    if (isOrderLineSticker(item)) hasStickers = true
    if (isOrderLineMarketS(item)) hasMarketS = true
  }
  let mix: OrderCatalogMix = 'general'
  if (hasStickers && hasMarketS) mix = 'mixed'
  else if (hasStickers) mix = 'stickers_only'
  else if (hasMarketS) mix = 'market_s_only'
  return { hasStickers, hasMarketS, mix }
}

export function buildOrderConfirmationThankYouIntro(mix: OrderCatalogMix): string {
  switch (mix) {
    case 'stickers_only':
      return "Thank you for choosing Selpic. We've received your order and are excited to start creating your custom stickers!"
    case 'market_s_only':
      return "Thank you for choosing Selpic. We've received your Market S order. We'll dispatch your items according to the shipping details below; pre-order lines ship on or after the dates shown for each item."
    case 'mixed':
      return "Thank you for choosing Selpic. We've received your order, including custom stickers and Market S items. Stickers and in-stock Market S items may ship sooner; pre-order Market S lines ship on or after the dates shown below."
    default:
      return "Thank you for choosing Selpic. We've received your order and will process it shortly."
  }
}

/** Tail phrase for payment notices (bank / stripe / card). */
export function orderConfirmationFulfillmentPhrase(mix: OrderCatalogMix): string {
  switch (mix) {
    case 'stickers_only':
      return 'We will start creating your custom stickers as soon as your payment is confirmed.'
    case 'market_s_only':
      return 'We will prepare your Market S order for dispatch as soon as your payment is confirmed.'
    case 'mixed':
      return 'We will process your stickers and Market S items as soon as your payment is confirmed.'
    default:
      return 'We will process your order as soon as your payment is confirmed.'
  }
}

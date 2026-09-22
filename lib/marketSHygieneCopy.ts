import { isMarketSCatalogProduct } from '@/lib/marketSSubcategory'

export const MARKET_S_HYGIENE_PDP =
  'Personal-care / cosmetic product. Patch-test before use, keep out of reach of children, and avoid contact with eyes. Not intended to diagnose, treat, or prevent disease.'

export const MARKET_S_HYGIENE_CHECKOUT =
  'I understand Market S items are personal-care products. Opened cosmetics are not accepted for change of mind for hygiene reasons. Australian Consumer Law rights still apply if an item is faulty, damaged, or not as described.'

export const MARKET_S_HYGIENE_REFUND_TITLE = '4. Market S personal-care products (hygiene)'

export const MARKET_S_HYGIENE_REFUND_BODY =
  'Market S cosmetics and personal-care items cannot be returned for change of mind once opened, for hygiene reasons. This does not limit your rights under the Australian Consumer Law (ACL) for faulty, damaged, or incorrectly supplied goods.'

export const MARKET_S_HYGIENE_REFUND_LIST =
  'Opened or used personal-care items are not accepted for change of mind | Unopened change-of-mind returns may be declined where hygiene or safety rules apply | Faulty, damaged, or incorrect items are handled under Section 2 and the ACL | Contact us with your order ID before sending anything back'

export function cartContainsMarketSGoods(
  lines: Array<{ category?: string; isHotGoods?: boolean } | null | undefined>
): boolean {
  return lines.some((line) => !!line && isMarketSCatalogProduct(line))
}

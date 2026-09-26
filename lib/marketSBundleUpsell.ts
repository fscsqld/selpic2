import type { Product } from './store'
import {
  isMarketSCatalogProduct,
  isMarketSSubcategory,
} from './marketSSubcategory'

function isMarketSMaskSingle(product: Product): boolean {
  return isMarketSCatalogProduct(product) && String(product.subcategory || '').trim() === 'Single Item'
}

function isMarketSFamilyBundle(product: Product): boolean {
  return isMarketSCatalogProduct(product) && String(product.subcategory || '').trim() === 'Family Bundle'
}

export type MarketSCartLineLike = {
  product: Pick<
    Product,
    'id' | 'price' | 'name' | 'category' | 'subcategory' | 'isHotGoods' | 'inStock' | 'stockQuantity'
  > &
    Partial<Product>
  quantity: number
}

export type MarketSBundleUpsellOffer = {
  singleProductId: string
  singleName: string
  singleUnitPrice: number
  singleQuantityInCart: number
  bundle: Product
  bundlePrice: number
  /** Sheets / units included in the Family Bundle SKU. */
  packCount: number
  /** bundlePrice / packCount */
  bundleUnitPrice: number
  /** singleUnitPrice − bundleUnitPrice (per sheet). */
  unitSavings: number
}

function isSellable(product: Product): boolean {
  if (product.inStock === false) return false
  if (typeof product.stockQuantity === 'number' && product.stockQuantity <= 0) return false
  return true
}

/** Admin / catalog: linked Family Bundle product ids on a Single Item SKU. */
export function sanitizeLinkedFamilyBundleIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    const id = String(entry || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** How many sellable units (e.g. mask sheets) are in one Family Bundle SKU. */
export function sanitizeFamilyBundleUnitCount(raw: unknown): number | undefined {
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n < 2) return undefined
  return Math.min(n, 99)
}

/**
 * Prefer explicit `familyBundleUnitCount`, then size/name hints like "5 sheets" / "10-pack".
 */
export function resolveFamilyBundleUnitCount(product: Product | null | undefined): number | null {
  if (!product) return null
  const explicit = sanitizeFamilyBundleUnitCount(
    (product as Product & { familyBundleUnitCount?: unknown }).familyBundleUnitCount
  )
  if (explicit) return explicit

  const haystack = `${product.size || ''} ${product.name || ''}`
  const patterns = [
    /(\d+)\s*(?:sheets?|packs?|pcs?|pieces?|masks?|units?)/i,
    /(\d+)\s*-\s*pack/i,
    /\bx\s*(\d+)\b/i,
  ]
  for (const re of patterns) {
    const m = haystack.match(re)
    if (!m) continue
    const n = sanitizeFamilyBundleUnitCount(m[1])
    if (n) return n
  }
  return null
}

export function listMarketSFamilyBundleProducts(products: Product[]): Product[] {
  return products.filter(
    (p) => isMarketSCatalogProduct(p) && isMarketSFamilyBundle(p) && isSellable(p)
  )
}

export function resolveLinkedFamilyBundles(
  single: Product | null | undefined,
  catalog: Product[]
): Product[] {
  if (!single || !isMarketSMaskSingle(single)) return []
  const ids = sanitizeLinkedFamilyBundleIds(
    (single as Product & { linkedFamilyBundleIds?: unknown }).linkedFamilyBundleIds
  )
  if (!ids.length) return []
  const byId = new Map(catalog.map((p) => [p.id, p]))
  const out: Product[] = []
  for (const id of ids) {
    const bundle = byId.get(id)
    if (!bundle) continue
    if (!isMarketSFamilyBundle(bundle)) continue
    if (!isSellable(bundle)) continue
    out.push(bundle)
  }
  return out
}

/**
 * Cart offers from per-unit economics: show when Family Bundle unit price
 * beats Single Item unit price — even if the cart only has qty 1.
 */
export function getMarketSBundleUpsellOffers(
  cart: MarketSCartLineLike[],
  catalog: Product[]
): MarketSBundleUpsellOffer[] {
  const offers: MarketSBundleUpsellOffer[] = []
  const qtyBySingleId = new Map<string, number>()

  for (const line of cart) {
    const id = line.product?.id
    if (!id) continue
    const live = catalog.find((p) => p.id === id) || (line.product as Product)
    if (!isMarketSMaskSingle(live)) continue
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0))
    if (qty <= 0) continue
    qtyBySingleId.set(id, (qtyBySingleId.get(id) || 0) + qty)
  }

  for (const [singleId, qty] of qtyBySingleId) {
    const single = catalog.find((p) => p.id === singleId)
    if (!single || !isMarketSMaskSingle(single)) continue
    const unit = Number(single.price)
    if (!Number.isFinite(unit) || unit <= 0) continue
    const bundles = resolveLinkedFamilyBundles(single, catalog)
    for (const bundle of bundles) {
      const bundlePrice = Number(bundle.price)
      if (!Number.isFinite(bundlePrice) || bundlePrice <= 0) continue
      const packCount = resolveFamilyBundleUnitCount(bundle)
      if (!packCount) continue
      const bundleUnitPrice = Number((bundlePrice / packCount).toFixed(2))
      const unitSavings = Number((unit - bundleUnitPrice).toFixed(2))
      if (unitSavings <= 0.009) continue
      offers.push({
        singleProductId: singleId,
        singleName: single.name,
        singleUnitPrice: unit,
        singleQuantityInCart: qty,
        bundle,
        bundlePrice,
        packCount,
        bundleUnitPrice,
        unitSavings,
      })
    }
  }

  offers.sort(
    (a, b) =>
      b.unitSavings - a.unitSavings ||
      a.bundleUnitPrice - b.bundleUnitPrice ||
      a.bundle.name.localeCompare(b.bundle.name)
  )
  return offers
}

/** Clear linked ids unless this SKU is Market S Single Item. */
export function linkedFamilyBundleIdsForSave(
  category: string,
  subcategory: string | undefined,
  raw: unknown
): string[] | undefined {
  if (String(category || '').trim() !== 'HotGoods') return undefined
  if (!isMarketSSubcategory(String(subcategory || '').trim())) return undefined
  if (String(subcategory || '').trim() !== 'Single Item') return undefined
  const ids = sanitizeLinkedFamilyBundleIds(raw)
  return ids.length ? ids : undefined
}

/** Persist pack count only on Market S Family Bundle SKUs. */
export function familyBundleUnitCountForSave(
  category: string,
  subcategory: string | undefined,
  raw: unknown
): number | undefined {
  if (String(category || '').trim() !== 'HotGoods') return undefined
  if (String(subcategory || '').trim() !== 'Family Bundle') return undefined
  return sanitizeFamilyBundleUnitCount(raw)
}

/** Session undo after Switch — restore Single Item if the customer changes their mind. */
export const MARKET_S_BUNDLE_SWAP_UNDO_KEY = 'market-s-bundle-swap-undo'

export type MarketSBundleSwapUndo = {
  id: string
  bundleProductId: string
  bundleName: string
  /** Bundle qty in cart before this switch added +1. */
  bundleQtyBefore: number
  singleProductId: string
  singleName: string
  singleQuantity: number
}

export function cartQuantityForProduct(
  cart: MarketSCartLineLike[],
  productId: string
): number {
  let n = 0
  for (const line of cart) {
    if (line.product?.id !== productId) continue
    n += Math.max(0, Math.floor(Number(line.quantity) || 0))
  }
  return n
}

export function parseMarketSBundleSwapUndos(raw: string | null): MarketSBundleSwapUndo[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: MarketSBundleSwapUndo[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const id = String(r.id || '').trim()
      const bundleProductId = String(r.bundleProductId || '').trim()
      const singleProductId = String(r.singleProductId || '').trim()
      const singleQuantity = Math.max(1, Math.floor(Number(r.singleQuantity) || 0))
      const bundleQtyBefore = Math.max(0, Math.floor(Number(r.bundleQtyBefore) || 0))
      if (!id || !bundleProductId || !singleProductId || singleQuantity < 1) continue
      out.push({
        id,
        bundleProductId,
        bundleName: String(r.bundleName || 'Family Bundle').trim() || 'Family Bundle',
        bundleQtyBefore,
        singleProductId,
        singleName: String(r.singleName || 'Single Item').trim() || 'Single Item',
        singleQuantity,
      })
    }
    return out
  } catch {
    return []
  }
}

/** Drop undo rows whose bundle is no longer in the cart (manual remove / checkout). */
export function pruneMarketSBundleSwapUndos(
  undos: MarketSBundleSwapUndo[],
  cart: MarketSCartLineLike[]
): MarketSBundleSwapUndo[] {
  return undos.filter((u) => cartQuantityForProduct(cart, u.bundleProductId) > u.bundleQtyBefore)
}

export function readMarketSBundleSwapUndos(): MarketSBundleSwapUndo[] {
  if (typeof window === 'undefined') return []
  try {
    return parseMarketSBundleSwapUndos(window.sessionStorage.getItem(MARKET_S_BUNDLE_SWAP_UNDO_KEY))
  } catch {
    return []
  }
}

export function writeMarketSBundleSwapUndos(undos: MarketSBundleSwapUndo[]): void {
  if (typeof window === 'undefined') return
  try {
    if (!undos.length) {
      window.sessionStorage.removeItem(MARKET_S_BUNDLE_SWAP_UNDO_KEY)
      return
    }
    window.sessionStorage.setItem(MARKET_S_BUNDLE_SWAP_UNDO_KEY, JSON.stringify(undos))
  } catch {
    /* ignore quota */
  }
}

export function buildMarketSBundleSwapUndo(input: {
  bundleProductId: string
  bundleName: string
  bundleQtyBefore: number
  singleProductId: string
  singleName: string
  singleQuantity: number
}): MarketSBundleSwapUndo {
  return {
    id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bundleProductId: input.bundleProductId,
    bundleName: input.bundleName,
    bundleQtyBefore: Math.max(0, Math.floor(input.bundleQtyBefore) || 0),
    singleProductId: input.singleProductId,
    singleName: input.singleName,
    singleQuantity: Math.max(1, Math.floor(input.singleQuantity) || 1),
  }
}

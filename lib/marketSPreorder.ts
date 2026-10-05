import type { Product } from './store'

export type MarketSSalesMode = 'in_stock' | 'preorder' | 'coming_soon'

/** Partial catalog row — missing fields stay non-preorder (live-safe). */
export type MarketSPreorderFields = Partial<
  Pick<
    Product,
    | 'category'
    | 'isHotGoods'
    | 'salesMode'
    | 'preorderSupplierConfirmed'
    | 'preorderSupplierNote'
    | 'preorderShipsFrom'
    | 'preorderClosesAt'
    | 'preorderMaxQty'
    | 'preorderSoldCount'
    | 'preorderNote'
  >
>

const PREORDER_CART_SOFT_CAP = 99

export function normalizeMarketSSalesMode(
  value: unknown
): MarketSSalesMode {
  if (value === 'preorder' || value === 'coming_soon' || value === 'in_stock') return value
  return 'in_stock'
}

export function isMarketSCatalogProduct(
  product: Partial<Pick<Product, 'category' | 'isHotGoods'>> | null | undefined
): boolean {
  if (!product) return false
  if (product.category === 'HotGoods') return true
  return product.isHotGoods === true && product.category !== 'Stickers'
}

/** True only when Admin set HotGoods SKU to preorder (never category-wide). */
export function isMarketSPreorderProduct(
  product: MarketSPreorderFields | null | undefined
): boolean {
  if (!product || !isMarketSCatalogProduct(product)) return false
  return normalizeMarketSSalesMode(product.salesMode) === 'preorder'
}

export function isMarketSComingSoonProduct(
  product: MarketSPreorderFields | null | undefined
): boolean {
  if (!product || !isMarketSCatalogProduct(product)) return false
  return normalizeMarketSSalesMode(product.salesMode) === 'coming_soon'
}

function closesAtPassed(closesAt: string | undefined, now: Date): boolean {
  if (!closesAt?.trim()) return false
  const t = Date.parse(closesAt)
  if (!Number.isFinite(t)) return false
  return t <= now.getTime()
}

/** Customer may pay now for this SKU as a pre-order. */
export function isMarketSPreorderOpen(
  product: MarketSPreorderFields | null | undefined,
  now: Date = new Date()
): boolean {
  if (!isMarketSPreorderProduct(product) || !product) return false
  if (!product.preorderSupplierConfirmed) return false
  if (!product.preorderShipsFrom?.trim()) return false
  if (closesAtPassed(product.preorderClosesAt, now)) return false
  const left = getMarketSPreorderUnitsLeft(product)
  return left > 0
}

export function getMarketSPreorderUnitsLeft(
  product: Pick<Product, 'preorderMaxQty' | 'preorderSoldCount'> | null | undefined
): number {
  if (!product) return 0
  const max =
    typeof product.preorderMaxQty === 'number' && Number.isFinite(product.preorderMaxQty)
      ? Math.max(0, Math.floor(product.preorderMaxQty))
      : null
  if (max === null) return PREORDER_CART_SOFT_CAP
  const sold =
    typeof product.preorderSoldCount === 'number' && Number.isFinite(product.preorderSoldCount)
      ? Math.max(0, Math.floor(product.preorderSoldCount))
      : 0
  return Math.max(0, max - sold)
}

/**
 * When pre-order is open, cart/checkout should use this limit instead of stockQuantity.
 * Returns null → keep normal stock logic (live catalog unchanged).
 */
export function getMarketSPreorderPurchaseLimit(
  product: MarketSPreorderFields | null | undefined,
  now: Date = new Date()
): number | null {
  if (!isMarketSPreorderOpen(product, now)) return null
  return getMarketSPreorderUnitsLeft(product)
}

export function formatPreorderShipsFromLabel(shipsFrom: string | undefined): string {
  const raw = (shipsFrom || '').trim()
  if (!raw) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (!m) return `Ships from ${raw}`
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(d.getTime())) return `Ships from ${raw}`
  const label = d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `Ships from ${label}`
}

export const MARKET_S_PREORDER_BADGE = 'PRE-ORDER'
export const MARKET_S_PREORDER_CTA = 'Pre-order now'
export const MARKET_S_COMING_SOON_CTA = 'Coming soon'

export const MARKET_S_PREORDER_CHECKOUT_ACK =
  'I understand pre-order items are charged now and ship on or after the date shown for each item.'

/** Customer order confirmation (plain + HTML) when the order includes pre-order lines. */
export const MARKET_S_PREORDER_ORDER_EMAIL_NOTICE =
  'This order includes pre-order item(s). Those lines are charged now and ship on or after the date shown for each item. Other items in the same order may ship sooner.'

export const MARKET_S_PREORDER_REFUND_TITLE = '5. Market S pre-orders'

export const MARKET_S_PREORDER_REFUND_BODY =
  'Pre-order items are charged at checkout and ship on or after the date shown on the product and your order confirmation. If there is an unexpected delay to the estimated ship date, we will notify you via email. Change-of-mind cancellation before dispatch may be available — contact us with your order ID. Once an item has been dispatched, returns follow Sections 1–4 and the Australian Consumer Law (ACL). This does not limit your ACL rights for faulty, damaged, or incorrectly supplied goods.'

export const MARKET_S_PREORDER_REFUND_LIST =
  'Pre-order lines are charged at checkout | Ship date is shown on the product and order confirmation | If ship dates change due to supply or customs delays, customers will be notified by email | Contact us with your order ID before dispatch if you need to cancel for change of mind | After dispatch, Sections 1–4 and the ACL apply | Faulty, damaged, or incorrect items are handled under Section 2 and the ACL'

/** Pre-delay-notice body (migrate local/CMS snapshots that still have this text). */
export const MARKET_S_PREORDER_REFUND_BODY_LEGACY =
  'Pre-order items are charged at checkout and ship on or after the date shown on the product and your order confirmation. Change-of-mind cancellation before dispatch may be available — contact us with your order ID. Once an item has been dispatched, returns follow Sections 1–4 and the Australian Consumer Law (ACL). This does not limit your ACL rights for faulty, damaged, or incorrectly supplied goods.'

export const MARKET_S_PREORDER_REFUND_LIST_LEGACY =
  'Pre-order lines are charged at checkout | Ship date is shown on the product and order confirmation | Contact us with your order ID before dispatch if you need to cancel for change of mind | After dispatch, Sections 1–4 and the ACL apply | Faulty, damaged, or incorrect items are handled under Section 2 and the ACL'

/** Line note for emails / admin summaries. Empty when not a frozen pre-order line. */
export function formatOrderItemPreorderNote(
  item: { salesModeAtOrder?: string; preorderShipsFrom?: string } | null | undefined
): string {
  if (item?.salesModeAtOrder !== 'preorder') return ''
  const ships = formatPreorderShipsFromLabel(item.preorderShipsFrom)
  return ships ? `Pre-order · ${ships}` : 'Pre-order'
}

export function orderIncludesPreorder(
  order: { hasPreorderItems?: boolean; items?: Array<{ salesModeAtOrder?: string } | null | undefined> } | null | undefined
): boolean {
  if (!order) return false
  if (order.hasPreorderItems === true) return true
  return orderHasPreorderItems(order.items)
}

/** Freeze open pre-order onto an order line (server overwrites client). */
export function buildOrderItemPreorderSnapshot(
  product: MarketSPreorderFields | null | undefined
): { salesModeAtOrder?: 'preorder'; preorderShipsFrom?: string } {
  if (!isMarketSPreorderOpen(product) || !product) return {}
  const ships = product.preorderShipsFrom?.trim()
  return {
    salesModeAtOrder: 'preorder',
    ...(ships ? { preorderShipsFrom: ships.slice(0, 32) } : {}),
  }
}

export function orderHasPreorderItems(
  items: Array<{ salesModeAtOrder?: string } | null | undefined> | null | undefined
): boolean {
  return (items || []).some((item) => item?.salesModeAtOrder === 'preorder')
}

/**
 * Sum pre-order line quantities by catalog productId (for sold-count bumps).
 * Ignores non-preorder lines so normal stickers/Market S in-stock stay untouched.
 */
export function collectPreorderSoldIncrements(
  items:
    | Array<{
        productId?: string
        quantity?: number
        salesModeAtOrder?: string
      } | null | undefined>
    | null
    | undefined
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items || []) {
    if (!item || item.salesModeAtOrder !== 'preorder') continue
    const id = String(item.productId || '').trim()
    if (!id) continue
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
    if (qty <= 0) continue
    out[id] = (out[id] || 0) + qty
  }
  return out
}

/** Apply sold increments onto catalog rows. Returns a new array when anything changed. */
export function applyPreorderSoldIncrements<
  T extends { id?: string; preorderSoldCount?: number }
>(
  products: T[],
  increments: Record<string, number>
): { products: T[]; changed: boolean; applied: Record<string, number> } {
  const ids = Object.keys(increments)
  if (ids.length === 0) {
    return { products, changed: false, applied: {} }
  }
  const applied: Record<string, number> = {}
  let changed = false
  const next = products.map((product) => {
    const id = String(product.id || '').trim()
    const delta = id ? increments[id] : 0
    if (!delta || delta <= 0) return product
    const current =
      typeof product.preorderSoldCount === 'number' && Number.isFinite(product.preorderSoldCount)
        ? Math.max(0, Math.floor(product.preorderSoldCount))
        : 0
    const sold = current + delta
    applied[id] = delta
    changed = true
    return { ...product, preorderSoldCount: sold }
  })
  return { products: changed ? next : products, changed, applied }
}

/**
 * Block Coming soon / closed pre-order; allow open pre-order even at stock 0.
 * Does not tighten normal in-stock SKUs (sales-safe).
 */
export function assertMarketSCatalogAllowsPurchase(
  product: MarketSPreorderFields & { name?: string; stockQuantity?: number; inStock?: boolean },
  quantity: number
): void {
  const label = (product.name || 'Item').trim() || 'Item'
  if (isMarketSComingSoonProduct(product)) {
    throw new Error(`${label} is coming soon and cannot be purchased yet.`)
  }
  const mode = normalizeMarketSSalesMode(product.salesMode)
  if (mode === 'preorder') {
    if (!isMarketSPreorderOpen(product)) {
      throw new Error(`${label} pre-order is not available.`)
    }
    const left = getMarketSPreorderUnitsLeft(product)
    if (quantity > left) {
      throw new Error(`${label} pre-order limit reached (max ${left}).`)
    }
  }
}

export type MarketSPreorderSaveInput = {
  category?: string
  salesMode?: unknown
  preorderSupplierConfirmed?: unknown
  preorderSupplierNote?: unknown
  preorderShipsFrom?: unknown
  preorderClosesAt?: unknown
  preorderMaxQty?: unknown
  preorderSoldCount?: unknown
  preorderNote?: unknown
}

/**
 * Admin save validation + normalized payload for HotGoods.
 * Non-HotGoods clears preorder fields so Stickers never carry sell-mode.
 */
export function buildMarketSSalesModePayload(input: MarketSPreorderSaveInput): {
  ok: true
  payload: Partial<Product>
} | { ok: false; error: string } {
  if (input.category !== 'HotGoods') {
    return {
      ok: true,
      payload: {
        salesMode: undefined,
        preorderSupplierConfirmed: undefined,
        preorderSupplierNote: undefined,
        preorderShipsFrom: undefined,
        preorderClosesAt: undefined,
        preorderMaxQty: undefined,
        preorderSoldCount: undefined,
        preorderNote: undefined,
      },
    }
  }

  const salesMode = normalizeMarketSSalesMode(input.salesMode)

  if (salesMode === 'in_stock') {
    return {
      ok: true,
      payload: {
        salesMode: 'in_stock',
        preorderSupplierConfirmed: false,
        preorderSupplierNote: '',
        preorderShipsFrom: '',
        preorderClosesAt: '',
        preorderMaxQty: undefined,
        preorderSoldCount:
          typeof input.preorderSoldCount === 'number' && Number.isFinite(input.preorderSoldCount)
            ? Math.max(0, Math.floor(input.preorderSoldCount))
            : undefined,
        preorderNote: '',
      },
    }
  }

  if (salesMode === 'coming_soon') {
    return {
      ok: true,
      payload: {
        salesMode: 'coming_soon',
        preorderSupplierConfirmed: false,
        preorderSupplierNote: String(input.preorderSupplierNote || '').trim().slice(0, 500),
        preorderShipsFrom: String(input.preorderShipsFrom || '').trim().slice(0, 32),
        preorderClosesAt: '',
        preorderMaxQty: undefined,
        preorderSoldCount: undefined,
        preorderNote: String(input.preorderNote || '').trim().slice(0, 120),
      },
    }
  }

  // preorder
  if (input.preorderSupplierConfirmed !== true) {
    return {
      ok: false,
      error: 'Confirm supplier availability before enabling pre-order.',
    }
  }
  const shipsFrom = String(input.preorderShipsFrom || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shipsFrom)) {
    return {
      ok: false,
      error: 'Pre-order requires a Ships from date (YYYY-MM-DD).',
    }
  }

  let preorderMaxQty: number | undefined
  if (input.preorderMaxQty !== '' && input.preorderMaxQty != null) {
    const n = Number(input.preorderMaxQty)
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: 'Max pre-order units must be a positive number when set.' }
    }
    preorderMaxQty = Math.floor(n)
  }

  return {
    ok: true,
    payload: {
      salesMode: 'preorder',
      preorderSupplierConfirmed: true,
      preorderSupplierNote: String(input.preorderSupplierNote || '').trim().slice(0, 500),
      preorderShipsFrom: shipsFrom,
      preorderClosesAt: String(input.preorderClosesAt || '').trim().slice(0, 40),
      preorderMaxQty,
      preorderSoldCount:
        typeof input.preorderSoldCount === 'number' && Number.isFinite(input.preorderSoldCount)
          ? Math.max(0, Math.floor(input.preorderSoldCount))
          : 0,
      preorderNote: String(input.preorderNote || '').trim().slice(0, 120),
    },
  }
}

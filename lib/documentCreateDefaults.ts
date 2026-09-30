/**
 * Default line items / notes for Admin Create Invoice & Quote
 * (Sticker vs Cleaning vs Market S). Shared by documents + invoices/preview.
 */

export type DocumentBusinessCategory = 'sticker' | 'cleaning' | 'market-s'

export type DocumentCreateLineItem = {
  description: string
  qty: number
  unitPrice: number
  taxRate?: number
}

/** Preset cleaning services — pick one per line via Step 4 select. */
export const CLEANING_SERVICE_OPTIONS = [
  'Regular Cleaning Service (per visit)',
  'Deep Clean / End of Lease',
  'Fit Out Cleaning',
  'Additional Services (carpet, windows, etc.)',
] as const

export type CleaningServiceOption = (typeof CLEANING_SERVICE_OPTIONS)[number]

export const CLEANING_SERVICE_CUSTOM = '__custom__'

/**
 * Market S pack classes (shipping/merch) — same two values as Admin product subcategory.
 * Admin enters brand/SKU in extra details (e.g. Mediheel 15ml).
 */
export const MARKET_S_LINE_OPTIONS = [
  'Market S — Single Item',
  'Market S — Family Bundle',
] as const

export type MarketSLineOption = (typeof MARKET_S_LINE_OPTIONS)[number]

export const MARKET_S_LINE_CUSTOM = '__market_s_custom__'

/** Placeholder seed description for document shipping lines before an AusPost option is chosen. */
export const DOCUMENT_SHIPPING_PLACEHOLDER = 'Shipping (AusPost)'
/** @deprecated Use DOCUMENT_SHIPPING_PLACEHOLDER */
export const MARKET_S_SHIPPING_PLACEHOLDER = DOCUMENT_SHIPPING_PLACEHOLDER

export const DOCUMENT_SHIPPING_CUSTOM = '__document_shipping_custom__'
/** @deprecated Use DOCUMENT_SHIPPING_CUSTOM */
export const MARKET_S_SHIPPING_CUSTOM = DOCUMENT_SHIPPING_CUSTOM

export function isCleaningCategory(category: DocumentBusinessCategory): boolean {
  return category === 'cleaning'
}

export function isMarketSCategory(category: DocumentBusinessCategory): boolean {
  return category === 'market-s'
}

/** Shipping field / shipping seed lines — not used for cleaning jobs. */
export function documentCategoryShowsShipping(category: DocumentBusinessCategory): boolean {
  return category !== 'cleaning'
}

/** Site address / service date — cleaning only. */
export function documentCategoryShowsServiceSite(category: DocumentBusinessCategory): boolean {
  return category === 'cleaning'
}

/** Single default cleaning line (admin picks service type in the form). */
export function getCleaningDefaultLineItems(): DocumentCreateLineItem[] {
  return [
    {
      description: CLEANING_SERVICE_OPTIONS[0],
      qty: 1,
      unitPrice: 0,
      taxRate: 0.1,
    },
  ]
}

/** One Market S line + optional shipping (ex-GST unit prices on tax invoice). */
export function getMarketSDefaultLineItems(): DocumentCreateLineItem[] {
  return [
    {
      description: MARKET_S_LINE_OPTIONS[0],
      qty: 1,
      unitPrice: 0,
      taxRate: 0.1,
    },
    {
      description: MARKET_S_SHIPPING_PLACEHOLDER,
      qty: 1,
      unitPrice: 0,
      taxRate: 0,
    },
  ]
}

export function getStickerDefaultLineItems(): DocumentCreateLineItem[] {
  return [
    { description: 'Custom Stickers (Premium Gloss)', qty: 2, unitPrice: 25, taxRate: 0.1 },
    { description: 'Stamp Product (Self-inking)', qty: 1, unitPrice: 32, taxRate: 0.1 },
    {
      description: DOCUMENT_SHIPPING_PLACEHOLDER,
      qty: 1,
      unitPrice: 0,
      taxRate: 0,
    },
  ]
}

export function getDefaultLineItemsByCategory(
  category: DocumentBusinessCategory
): DocumentCreateLineItem[] {
  if (category === 'cleaning') return getCleaningDefaultLineItems()
  if (category === 'market-s') return getMarketSDefaultLineItems()
  return getStickerDefaultLineItems()
}

/**
 * Default Notes block for Create Invoice / Quote.
 * No payment-due wording (owner preference). Type-specific thank-you / domain only.
 */
export function getDefaultNotesByCategory(category: DocumentBusinessCategory): string {
  if (category === 'cleaning') {
    return (
      'Thank you for choosing our cleaning services.\n' +
      'Please contact us to confirm booking and for any special requirements.'
    )
  }
  if (category === 'market-s') {
    return (
      'Thank you for your business! It is a pleasure to help bring your creative ideas to life.\n' +
      'Cosmetics are supplied sealed; check packaging on arrival and contact us promptly about any damage.'
    )
  }
  return 'Thank you for your business! It is a pleasure to help bring your creative ideas to life.'
}

export function getNewDocumentLineItem(
  category: DocumentBusinessCategory
): DocumentCreateLineItem {
  if (category === 'cleaning') {
    return {
      description: CLEANING_SERVICE_OPTIONS[0],
      qty: 1,
      unitPrice: 0,
      taxRate: 0.1,
    }
  }
  if (category === 'market-s') {
    return {
      description: MARKET_S_LINE_OPTIONS[0],
      qty: 1,
      unitPrice: 0,
      taxRate: 0.1,
    }
  }
  return { description: 'New Item', qty: 1, unitPrice: 0, taxRate: 0.1 }
}

export function documentCategoryLabel(category: DocumentBusinessCategory): string {
  switch (category) {
    case 'cleaning':
      return 'Cleaning'
    case 'market-s':
      return 'Market S'
    default:
      return 'Sticker'
  }
}

/** Resolve select value for a cleaning line description. */
export function resolveCleaningServiceSelectValue(description: string): string {
  const firstLine = String(description || '').split('\n')[0]?.trim() || ''
  if ((CLEANING_SERVICE_OPTIONS as readonly string[]).includes(firstLine)) {
    return firstLine
  }
  if (!firstLine) return CLEANING_SERVICE_OPTIONS[0]
  return CLEANING_SERVICE_CUSTOM
}

/** Extra detail lines after the selected service name (optional). */
export function getCleaningServiceExtraDetails(description: string): string {
  const parts = String(description || '').split('\n')
  if (parts.length <= 1) return ''
  return parts.slice(1).join('\n')
}

export function buildCleaningServiceDescription(
  serviceSelect: string,
  extraDetails: string
): string {
  const base =
    serviceSelect === CLEANING_SERVICE_CUSTOM
      ? extraDetails.trim() || 'Cleaning service'
      : serviceSelect
  if (serviceSelect === CLEANING_SERVICE_CUSTOM) {
    return base
  }
  const extra = extraDetails.trim()
  return extra ? `${base}\n${extra}` : base
}

export function resolveMarketSLineSelectValue(description: string): string {
  const firstLine = String(description || '').split('\n')[0]?.trim() || ''
  if ((MARKET_S_LINE_OPTIONS as readonly string[]).includes(firstLine)) {
    return firstLine
  }
  // Shipping / other free-text lines are not Market S pack selects
  if (!firstLine || isMarketSShippingLine(firstLine)) {
    return MARKET_S_LINE_CUSTOM
  }
  return MARKET_S_LINE_CUSTOM
}

export function getMarketSLineExtraDetails(description: string): string {
  const parts = String(description || '').split('\n')
  if (parts.length <= 1) return ''
  return parts.slice(1).join('\n')
}

export function buildMarketSLineDescription(
  lineSelect: string,
  extraDetails: string
): string {
  if (lineSelect === MARKET_S_LINE_CUSTOM) {
    return extraDetails.trim() || 'Market S product'
  }
  const extra = extraDetails.trim()
  return extra ? `${lineSelect}\n${extra}` : lineSelect
}

/** True when this line should show the Market S pack-class select (not a shipping row). */
export function isMarketSSelectableProductLine(description: string): boolean {
  const first = String(description || '').split('\n')[0]?.trim() || ''
  if (!first) return true
  if (isMarketSShippingLine(first)) return false
  if ((MARKET_S_LINE_OPTIONS as readonly string[]).includes(first)) return true
  // Custom product description (not shipping)
  return true
}

/** Minimal CMS / fallback shape for document shipping selects. */
export type DocumentShippingOptionLike = {
  id?: string
  name?: string
  price?: number
  isActive?: boolean
  order?: number
}

const MARKET_S_LETTER_OPTION_ID = 'market-s-untracked-letter'

const DOCUMENT_SHIPPING_FALLBACK: DocumentShippingOptionLike[] = [
  {
    id: MARKET_S_LETTER_OPTION_ID,
    name: 'Untracked letter (Market S singles)',
    price: 3.7,
    order: 0,
    isActive: true,
  },
  {
    id: 'standard-letter',
    name: 'Standard Letter',
    price: 3.7,
    order: 1,
    isActive: true,
  },
  {
    id: 'tracked-letter',
    name: 'Tracked Letter',
    price: 5.55,
    order: 2,
    isActive: true,
  },
  {
    id: 'express-post',
    name: 'Express Post',
    price: 14.5,
    order: 3,
    isActive: true,
  },
  {
    id: 'parcel-post',
    name: 'Parcel Post (Goods)',
    price: 11.7,
    order: 4,
    isActive: true,
  },
  {
    id: 'local-pickup',
    name: 'Click & Collect (Mansfield)',
    price: 0,
    order: 5,
    isActive: true,
  },
]

/** Line looks like a shipping row (seed placeholder or `Shipping — Option name`). */
export function isDocumentShippingLine(description: string): boolean {
  const first = String(description || '').split('\n')[0]?.trim() || ''
  if (!first) return false
  return /^shipping\b/i.test(first)
}

/** @deprecated Use isDocumentShippingLine */
export const isMarketSShippingLine = isDocumentShippingLine

/**
 * Active CMS shipping options for invoice/quote selects.
 * Stickers hide Market S–only untracked letter; Market S keeps the full active list.
 * Prices always come from the live CMS row (Admin → Shipping) when present.
 */
export function listDocumentShippingOptionsForSelect(
  cmsOptions: DocumentShippingOptionLike[] | null | undefined,
  category?: DocumentBusinessCategory | null
): DocumentShippingOptionLike[] {
  const raw = Array.isArray(cmsOptions) ? cmsOptions : []
  const active = raw.filter((o) => o && o.isActive !== false && String(o.id || '').trim())
  let source = active.length > 0 ? active : DOCUMENT_SHIPPING_FALLBACK
  if (category === 'sticker') {
    source = source.filter(
      (o) => String(o.id || '').trim() !== MARKET_S_LETTER_OPTION_ID
    )
  }
  return [...source].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : 0
    const bo = typeof b.order === 'number' ? b.order : 0
    if (ao !== bo) return ao - bo
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}

/**
 * Resolve select value for a document shipping line.
 * Empty string = placeholder (not yet chosen). Custom = free-text shipping line.
 */
export function resolveDocumentShippingSelectValue(
  description: string,
  options: DocumentShippingOptionLike[]
): string {
  const first = String(description || '').split('\n')[0]?.trim() || ''
  if (
    !first ||
    /^shipping\s*\(auspost\)\s*$/i.test(first) ||
    /^shipping\s*\(standard\)\s*$/i.test(first)
  ) {
    return ''
  }
  const dashMatch = first.match(/^shipping\s*[—–-]\s*(.+)$/i)
  const namePart = (dashMatch ? dashMatch[1] : first).trim()
  const byName = options.find(
    (o) => String(o.name || '').trim().toLowerCase() === namePart.toLowerCase()
  )
  if (byName?.id) return String(byName.id)
  return DOCUMENT_SHIPPING_CUSTOM
}

/** @deprecated Use resolveDocumentShippingSelectValue */
export const resolveMarketSShippingSelectValue = resolveDocumentShippingSelectValue

export function buildDocumentShippingDescription(optionName: string): string {
  const name = String(optionName || '').trim()
  if (!name) return DOCUMENT_SHIPPING_PLACEHOLDER
  return `Shipping — ${name}`
}

/** @deprecated Use buildDocumentShippingDescription */
export const buildMarketSShippingDescription = buildDocumentShippingDescription

/** Apply CMS option to a shipping line: description + unit price (taxRate stays 0). */
export function applyDocumentShippingOptionToLine<T extends DocumentCreateLineItem>(
  line: T,
  option: DocumentShippingOptionLike | null | undefined
): T {
  if (!option || !String(option.id || '').trim()) {
    return {
      ...line,
      description: DOCUMENT_SHIPPING_PLACEHOLDER,
      unitPrice: 0,
      taxRate: 0,
    }
  }
  const price = Number(option.price)
  return {
    ...line,
    description: buildDocumentShippingDescription(String(option.name || option.id)),
    unitPrice: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
    taxRate: 0,
  }
}

/** @deprecated Use applyDocumentShippingOptionToLine */
export const applyMarketSShippingOptionToLine = applyDocumentShippingOptionToLine

/** True when sticker or Market S should show the AusPost shipping select for this line. */
export function documentCategoryUsesShippingSelect(
  category: DocumentBusinessCategory
): boolean {
  return category === 'sticker' || category === 'market-s'
}

/**
 * Market S authorised supply brands (CMS list).
 * Hub trust strip + PDP/card badges match product.brand by normalised name — not DermaFirm-only.
 */

export interface MarketSAuthorisedBrand {
  id: string
  /** Display name; must match product.brand (case/spacing tolerant). */
  name: string
  /** Optional short line under the name on the hub strip. */
  tagline?: string
  /** Optional logo / mark URL (WebP preferred). */
  logoUrl?: string
  /** Optional storefront link (e.g. brand site or filtered hub). */
  linkUrl?: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export const MARKET_S_AUTHORISED_BRAND_SEED_ID = 'market-s-brand-dermafirm'

/** Default seed — first authorised partner; Admin can edit/add more. */
export function createDefaultMarketSAuthorisedBrands(): MarketSAuthorisedBrand[] {
  const now = new Date()
  return [
    {
      id: MARKET_S_AUTHORISED_BRAND_SEED_ID,
      name: 'DermaFirm',
      tagline: 'Official authorised partner in Australia',
      logoUrl: '',
      linkUrl: '',
      order: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

/** Collapse brand names for matching (Derma Firm / dermafirm / DermaFirm). */
export function normalizeMarketSBrandKey(name: string | null | undefined): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function findAuthorisedMarketSBrand(
  brands: MarketSAuthorisedBrand[] | null | undefined,
  productBrand: string | null | undefined
): MarketSAuthorisedBrand | undefined {
  const key = normalizeMarketSBrandKey(productBrand)
  if (!key) return undefined
  const list = Array.isArray(brands) ? brands : []
  return list.find(
    (b) => b.isActive && normalizeMarketSBrandKey(b.name) === key
  )
}

export function isAuthorisedMarketSBrand(
  brands: MarketSAuthorisedBrand[] | null | undefined,
  productBrand: string | null | undefined
): boolean {
  return Boolean(findAuthorisedMarketSBrand(brands, productBrand))
}

export function getActiveMarketSAuthorisedBrands(
  brands: MarketSAuthorisedBrand[] | null | undefined
): MarketSAuthorisedBrand[] {
  return (Array.isArray(brands) ? brands : [])
    .filter((b) => b && b.isActive && String(b.name || '').trim())
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * When CMS has never stored the list, seed defaults.
 * Respect an explicit empty array (admin cleared all).
 */
export function ensureMarketSAuthorisedBrands(
  brands: MarketSAuthorisedBrand[] | null | undefined,
  keyPresent: boolean
): MarketSAuthorisedBrand[] {
  if (keyPresent && Array.isArray(brands)) {
    return brands.map(normalizeAuthorisedBrandRow).filter(Boolean) as MarketSAuthorisedBrand[]
  }
  if (Array.isArray(brands) && brands.length > 0) {
    return brands.map(normalizeAuthorisedBrandRow).filter(Boolean) as MarketSAuthorisedBrand[]
  }
  return createDefaultMarketSAuthorisedBrands()
}

export function normalizeAuthorisedBrandRow(
  raw: Partial<MarketSAuthorisedBrand> | null | undefined
): MarketSAuthorisedBrand | null {
  if (!raw || typeof raw !== 'object') return null
  const name = String(raw.name || '').trim()
  if (!name) return null
  const toDate = (v: unknown, fallback: Date) => {
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v
    if (typeof v === 'string' || typeof v === 'number') {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) return d
    }
    return fallback
  }
  const now = new Date()
  return {
    id: String(raw.id || `market-s-brand-${Date.now()}`),
    name,
    tagline: String(raw.tagline || '').trim(),
    logoUrl: String(raw.logoUrl || '').trim(),
    linkUrl: String(raw.linkUrl || '').trim(),
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : 0,
    isActive: raw.isActive !== false,
    createdAt: toDate(raw.createdAt, now),
    updatedAt: toDate(raw.updatedAt, now),
  }
}

export const MARKET_S_AUTHORISED_BADGE_LABEL = 'Authorised'
export const MARKET_S_AUTHORISED_TRUST_HEADING = 'Authorised brands'
export const MARKET_S_AUTHORISED_TRUST_SUB =
  'Curated K-beauty partners — genuine supply for Market S.'

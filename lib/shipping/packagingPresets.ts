import {
  isMarketSFamilyBundle,
  isMarketSMaskSingle,
  isStickersShippingProduct,
  resolveProductShippingWeightGrams,
  type ProductShippingLike,
} from './productShippingEligibility'

/**
 * SELPIC warehouse pack stock used for Admin fulfilment tips + chargeable weight.
 * AusPost / Aramex / Couriers Please (via Transdirect) typically bill
 * max(physical kg, L×W×H m³ × 250).
 */

export const CUBIC_WEIGHT_FACTOR_KG_PER_M3 = 250

/** AusPost large-letter max thickness — envelopes above this must ship as parcel. */
export const AUSPOST_LARGE_LETTER_MAX_THICKNESS_MM = 20

export type PackagingPresetId =
  | 'envelope-160x240'
  | 'envelope-240x280'
  | 'box-220x160x77'
  | 'box-310x220x75'

export type PackagingKind = 'envelope' | 'box'

export type PackagingPreset = {
  id: PackagingPresetId
  kind: PackagingKind
  /** Admin-facing short name. */
  label: string
  /** Outer length mm (longest face edge). */
  lengthMm: number
  widthMm: number
  /**
   * Envelope: assumed packed thickness when used as letter (must stay ≤20 mm).
   * Box: outer height mm.
   */
  heightMm: number
  /** One-line hint for Admin. */
  useFor: string
}

export const PACKAGING_PRESETS: Record<PackagingPresetId, PackagingPreset> = {
  'envelope-160x240': {
    id: 'envelope-160x240',
    kind: 'envelope',
    label: 'Envelope 160×240',
    lengthMm: 240,
    widthMm: 160,
    /** Assumed packed thickness for letter path (under AusPost 20 mm cap). */
    heightMm: 12,
    useFor: 'Stickers / thin singles (Large letter; not Small letter — 160 > 130 mm)',
  },
  'envelope-240x280': {
    id: 'envelope-240x280',
    kind: 'envelope',
    label: 'Envelope 240×280',
    lengthMm: 280,
    widthMm: 240,
    heightMm: 15,
    useFor:
      'Website: 1–3 Market S singles (letter) and 1+1 promo with tracked postage (keep ≤20 mm). Not the Etsy gift box.',
  },
  'box-220x160x77': {
    id: 'box-220x160x77',
    kind: 'box',
    label: 'Box 220×160×77',
    lengthMm: 220,
    widthMm: 160,
    heightMm: 77,
    useFor:
      'Marketplace gift presentation (Etsy / eBay / Amazon) — boxed for gift buyers. Not the default for website 1+1.',
  },
  'box-310x220x75': {
    id: 'box-310x220x75',
    kind: 'box',
    label: 'Box 310×220×75',
    lengthMm: 310,
    widthMm: 220,
    heightMm: 75,
    useFor: 'DermaFix 8-pack / bulk Family Bundle (all channels when size needs it)',
  },
}

export const PACKAGING_PRESET_LIST: PackagingPreset[] = [
  PACKAGING_PRESETS['envelope-160x240'],
  PACKAGING_PRESETS['envelope-240x280'],
  PACKAGING_PRESETS['box-220x160x77'],
  PACKAGING_PRESETS['box-310x220x75'],
]

export function getPackagingPreset(id: PackagingPresetId): PackagingPreset {
  return PACKAGING_PRESETS[id]
}

/** Volume in m³ from outer mm. */
export function packagingVolumeM3(preset: Pick<PackagingPreset, 'lengthMm' | 'widthMm' | 'heightMm'>): number {
  return (preset.lengthMm / 1000) * (preset.widthMm / 1000) * (preset.heightMm / 1000)
}

/** Cubic weight in grams (factor 250 kg/m³). */
export function packagingCubicWeightGrams(
  preset: Pick<PackagingPreset, 'lengthMm' | 'widthMm' | 'heightMm'>
): number {
  return Math.round(packagingVolumeM3(preset) * CUBIC_WEIGHT_FACTOR_KG_PER_M3 * 1000)
}

/**
 * Chargeable mass for own packaging / courier quotes:
 * max(physical, cubic). Letters still report cubic for transparency but
 * letter rates are size-band based, not cubic — see `fitsAusPostLargeLetter`.
 */
export function chargeableWeightGrams(
  physicalGrams: number,
  preset: Pick<PackagingPreset, 'lengthMm' | 'widthMm' | 'heightMm'>
): number {
  const physical = Math.max(0, Math.round(Number(physicalGrams) || 0))
  const cubic = packagingCubicWeightGrams(preset)
  return Math.max(physical, cubic)
}

export function fitsAusPostLargeLetter(
  preset: Pick<PackagingPreset, 'kind' | 'lengthMm' | 'widthMm' | 'heightMm'>
): boolean {
  if (preset.kind !== 'envelope') return false
  const a = Math.max(preset.lengthMm, preset.widthMm)
  const b = Math.min(preset.lengthMm, preset.widthMm)
  return a <= 360 && b <= 260 && preset.heightMm <= AUSPOST_LARGE_LETTER_MAX_THICKNESS_MM
}

/** Rough AusPost own-packaging Parcel Post band label for Admin tip text. */
export function ausPostOwnPackagingBandHint(chargeableGrams: number): string {
  const g = Math.max(0, chargeableGrams)
  if (g <= 250) return 'AusPost own-pack ≤250 g band (~$10.20)'
  if (g <= 500) return 'AusPost own-pack ≤500 g band (~$11.70)'
  if (g <= 1000) return 'AusPost own-pack ≤1 kg band (~$16.00)'
  // 310×220×75 mm box cubic (~1.28 kg) lands here even when physical is under 500 g
  if (g <= 3000) return 'AusPost own-pack over 1 kg up to 3 kg band (~$20.25)'
  if (g <= 5000) return 'AusPost own-pack ≤5 kg band (~$24.45)'
  return 'AusPost own-pack over 5 kg (zone + cubic)'
}

export type PackagingPlatformSource = 'website' | 'etsy' | 'ebay' | 'amazon' | 'manual' | string

export type PackagingResolveInput = {
  /** Customer paid untracked / tracked letter → prefer envelopes. */
  letterService?: boolean
  physicalGrams: number
  /** Order channel — Etsy-class marketplaces use gift Box S. */
  platformSource?: PackagingPlatformSource | null
  items?: Array<
    ProductShippingLike & {
      quantity?: number
      name?: string
      price?: number
    }
  >
  /** Optional Admin override later; when set, skip inference. */
  packagingPresetId?: PackagingPresetId | null
}

/** Etsy and peer marketplaces: gift-oriented buyers → Box 220×160×77. */
export function isMarketplaceGiftPlatform(
  platformSource: PackagingPlatformSource | null | undefined
): boolean {
  const p = String(platformSource || 'website').trim().toLowerCase()
  return p === 'etsy' || p === 'ebay' || p === 'amazon'
}

function itemNameBlob(items: PackagingResolveInput['items']): string {
  return (items || [])
    .map((it) => String(it.name || ''))
    .join(' ')
    .toLowerCase()
}

function looksLikeEightPack(items: PackagingResolveInput['items']): boolean {
  const blob = itemNameBlob(items)
  if (/\b8[\s-]*(pack|pcs|piece|sheets?|masks?)\b/.test(blob)) return true
  if (/\b(eight|8)\s*[\+x×]/i.test(blob)) return true
  // Heavy Family Bundle line defaults toward 8-pack box
  for (const it of items || []) {
    if (!isMarketSFamilyBundle(it)) continue
    const qty = Math.max(1, Math.floor(Number(it.quantity) || 1))
    const unitG = resolveProductShippingWeightGrams(it)
    if (unitG * qty >= 200) return true
    const price = Number(it.price)
    if (Number.isFinite(price) && price >= 35) return true
  }
  return false
}

function looksLikeOnePlusOne(items: PackagingResolveInput['items']): boolean {
  const blob = itemNameBlob(items)
  return /1\s*\+\s*1|1\s*&\s*1|buy\s*1\s*get\s*1|bogo/i.test(blob)
}

function hasOnlyStickers(items: PackagingResolveInput['items']): boolean {
  const list = items || []
  if (list.length === 0) return false
  return list.every((it) => isStickersShippingProduct(it))
}

function hasMaskSingle(items: PackagingResolveInput['items']): boolean {
  return (items || []).some((it) => isMarketSMaskSingle(it))
}

function hasFamilyBundle(items: PackagingResolveInput['items']): boolean {
  return (items || []).some((it) => isMarketSFamilyBundle(it))
}

/**
 * Pick which warehouse pack to assume for this order (Admin tip only).
 *
 * Ops rules (learned 2026-11-06):
 * - Env 240×280: website 1+1 (tracked) and Market S letter singles — keep ≤20 mm.
 * - Box 220×160×77: Etsy / eBay / Amazon gift boxing (not default website 1+1).
 * - Box 310×220×75: 8-pack / bulky (any channel when size needs it).
 */
export function resolvePackagingPreset(input: PackagingResolveInput): PackagingPreset {
  const override = input.packagingPresetId
  if (override && PACKAGING_PRESETS[override]) {
    return PACKAGING_PRESETS[override]
  }

  const items = input.items || []
  const physical = Math.max(0, Math.round(input.physicalGrams || 0))
  const marketplaceGift = isMarketplaceGiftPlatform(input.platformSource)

  // Bulk / 8-pack always needs the large box (gift or not).
  if (looksLikeEightPack(items) || physical >= 200) {
    return PACKAGING_PRESETS['box-310x220x75']
  }

  // Marketplace gift buyers → presentation box (even for light / 1+1 SKUs).
  if (marketplaceGift) {
    return PACKAGING_PRESETS['box-220x160x77']
  }

  if (input.letterService) {
    // Stickers-only → smaller envelope; Market S singles / mixed → larger Large-letter envelope
    if (hasOnlyStickers(items) && !hasMaskSingle(items) && !hasFamilyBundle(items) && physical <= 120) {
      return PACKAGING_PRESETS['envelope-160x240']
    }
    return PACKAGING_PRESETS['envelope-240x280']
  }

  // Website 1+1 (and similar light tracked promos): tracked in Env 240×280, not Box S.
  if (looksLikeOnePlusOne(items) || (hasFamilyBundle(items) && physical < 200)) {
    return PACKAGING_PRESETS['envelope-240x280']
  }

  if (hasFamilyBundle(items) || physical >= 50) {
    return PACKAGING_PRESETS['envelope-240x280']
  }

  // Light tracked website goods — envelope first; Box S reserved for marketplace gifts.
  return PACKAGING_PRESETS['envelope-240x280']
}

export type PackagingChargeSummary = {
  preset: PackagingPreset
  physicalGrams: number
  cubicGrams: number
  chargeableGrams: number
  fitsLargeLetter: boolean
  ausPostBandHint: string
  /** Short dims for badges, e.g. 310×220×75 mm */
  dimsLabel: string
}

export function summarizePackagingCharge(
  physicalGrams: number,
  preset: PackagingPreset
): PackagingChargeSummary {
  const physical = Math.max(0, Math.round(physicalGrams || 0))
  const cubicGrams = packagingCubicWeightGrams(preset)
  const chargeableGrams = Math.max(physical, cubicGrams)
  return {
    preset,
    physicalGrams: physical,
    cubicGrams,
    chargeableGrams,
    fitsLargeLetter: fitsAusPostLargeLetter(preset),
    ausPostBandHint: ausPostOwnPackagingBandHint(chargeableGrams),
    dimsLabel: `${preset.lengthMm}×${preset.widthMm}×${preset.heightMm} mm`,
  }
}

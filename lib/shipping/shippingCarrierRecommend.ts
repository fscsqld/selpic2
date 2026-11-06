import {
  addressLooksLikePoBoxOrLocker,
  isAuMetroPostcode,
  isAusPostPreferredRemotePostcode,
} from './auMetroPostcodes'
import {
  resolvePackagingPreset,
  summarizePackagingCharge,
  type PackagingChargeSummary,
  type PackagingPresetId,
} from './packagingPresets'
import {
  resolveProductShippingWeightGrams,
  type ProductShippingLike,
} from './productShippingEligibility'
import {
  resolveOrderShippingSnapshot,
  type OrderShippingReadable,
} from './shippingSnapshot'

/**
 * Admin-only fulfilment advice: which channel is usually cheapest to book manually.
 * Does not change checkout prices or auto-book carriers.
 *
 * Phase 2: warehouse pack presets + chargeable weight = max(physical, cubic×250).
 */

export type ShippingCarrierRecommendKey =
  | 'pickup'
  | 'auspost_untracked'
  | 'auspost_letter_tracked'
  | 'auspost_po_box'
  | 'auspost_remote'
  | 'auspost_express'
  | 'transdirect_metro'
  | 'auspost_parcel'

export type ShippingCarrierRecommendation = {
  key: ShippingCarrierRecommendKey
  /** Short badge text for Admin list. */
  label: string
  /** Longer hint for order detail. */
  reason: string
  className: string
  /** Estimated physical packed mass (grams). */
  estimatedWeightGrams: number
  /** max(physical, cubic) used for carrier comparison. */
  chargeableWeightGrams: number
  packaging: PackagingChargeSummary | null
}

export type CarrierRecommendOrderLike = OrderShippingReadable & {
  address?: {
    streetAddress?: string
    suburb?: string
    state?: string
    postcode?: string
    asSingleLine?: string
  } | null
  items?: Array<
    ProductShippingLike & {
      quantity?: number
      weightKg?: number
      price?: number
      name?: string
    }
  >
  declaredShippingWeightKg?: number | null
  subtotal?: number
  /** website | etsy | ebay | amazon — Etsy-class → gift Box S. */
  platformSource?: string | null
  /** Optional Admin override of pack stock (future field). */
  packagingPresetId?: PackagingPresetId | null
}

/** Couriers Please / Aramex via Transdirect — compare on chargeable grams. */
export const TRANSDIRECT_METRO_MAX_GRAMS = 2000

/** High-value Market S lines (1+1 / 8-pack) should checkout as tracked parcel — warn if untracked. */
export const HIGH_VALUE_TRACKING_HINT_AUD = 20

/**
 * When chargeable mass reaches this, metro Transdirect may no longer undercut
 * AusPost ≤500 g band — still recommend quoting, but prefer AusPost band awareness.
 */
export const TRANSDIRECT_METRO_SOFT_CUBIC_WARN_GRAMS = 1000

function estimateOrderWeightGrams(order: CarrierRecommendOrderLike): number {
  const declared = Number(order.declaredShippingWeightKg)
  if (Number.isFinite(declared) && declared > 0) {
    return Math.round(declared * 1000)
  }

  let sum = 0
  for (const item of order.items || []) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1))
    const kg = Number(item.weightKg)
    if (Number.isFinite(kg) && kg > 0) {
      sum += Math.round(kg * 1000) * qty
      continue
    }
    sum += resolveProductShippingWeightGrams(item) * qty
  }
  return sum > 0 ? sum : 250
}

function isExpressOption(id: string, name: string): boolean {
  return /express/i.test(`${id} ${name}`)
}

function isTrackedLetterOption(id: string, name: string): boolean {
  return /tracked[\s-]*letter/i.test(`${id} ${name}`)
}

function isUntrackedLetterOption(id: string, name: string, trackingIncluded: boolean): boolean {
  if (trackingIncluded) return false
  if (id === 'market-s-untracked-letter' || id === 'standard-letter') return true
  return /untracked|standard[\s-]*letter/i.test(`${id} ${name}`)
}

function merchandiseLooksHighValue(order: CarrierRecommendOrderLike): boolean {
  const sub = Number(order.subtotal)
  if (Number.isFinite(sub) && sub >= HIGH_VALUE_TRACKING_HINT_AUD) return true
  return (order.items || []).some((it) => {
    const unit = Number(it.price)
    return Number.isFinite(unit) && unit >= HIGH_VALUE_TRACKING_HINT_AUD
  })
}

function packPhrase(pack: PackagingChargeSummary): string {
  return `${pack.preset.label} (${pack.dimsLabel}); physical ~${pack.physicalGrams} g, cubic ~${pack.cubicGrams} g → chargeable ~${pack.chargeableGrams} g`
}

function withPack(
  base: Omit<ShippingCarrierRecommendation, 'packaging' | 'chargeableWeightGrams' | 'estimatedWeightGrams'> & {
    estimatedWeightGrams: number
    packaging: PackagingChargeSummary | null
  }
): ShippingCarrierRecommendation {
  const chargeableWeightGrams = base.packaging?.chargeableGrams ?? base.estimatedWeightGrams
  return {
    ...base,
    chargeableWeightGrams,
  }
}

/**
 * Recommend AusPost vs Transdirect for Admin fulfilment (manual booking).
 */
export function getShippingCarrierRecommendation(
  order: CarrierRecommendOrderLike
): ShippingCarrierRecommendation {
  const snap = resolveOrderShippingSnapshot(order)
  const estimatedWeightGrams = estimateOrderWeightGrams(order)
  const streetBlob = [
    order.address?.streetAddress,
    order.address?.asSingleLine,
    order.address?.suburb,
  ]
    .filter(Boolean)
    .join(' ')
  const postcode = order.address?.postcode || ''

  const letterService =
    isUntrackedLetterOption(
      snap.shippingOptionId,
      snap.shippingOptionName,
      snap.shippingTrackingIncluded
    ) || isTrackedLetterOption(snap.shippingOptionId, snap.shippingOptionName)

  const packaging =
    snap.shippingType === 'pickup'
      ? null
      : summarizePackagingCharge(
          estimatedWeightGrams,
          resolvePackagingPreset({
            letterService,
            physicalGrams: estimatedWeightGrams,
            platformSource: order.platformSource,
            items: order.items,
            packagingPresetId: order.packagingPresetId,
          })
        )

  if (snap.shippingType === 'pickup') {
    return withPack({
      key: 'pickup',
      label: 'Click & Collect',
      reason: 'Customer collects in store — no postal carrier.',
      className: 'bg-sky-100 text-sky-800 border-sky-200',
      estimatedWeightGrams,
      packaging: null,
    })
  }

  if (isUntrackedLetterOption(snap.shippingOptionId, snap.shippingOptionName, snap.shippingTrackingIncluded)) {
    const highValue = merchandiseLooksHighValue(order)
    const packNote = packaging
      ? ` Pack: ${packPhrase(packaging)}. Keep thickness ≤20 mm for Large letter.`
      : ''
    const letterWarn =
      packaging && !packaging.fitsLargeLetter
        ? ' This pack may exceed Large letter limits — switch to a box + Parcel Post.'
        : ''
    return withPack({
      key: 'auspost_untracked',
      label: 'AusPost letter',
      reason: highValue
        ? `Customer chose untracked letter. Book Australia Post large letter — cheapest for untracked. Note: merchandise ≥ $${HIGH_VALUE_TRACKING_HINT_AUD} is safer as tracked parcel (register 1+1 / 8-packs as Family Bundle).${packNote}${letterWarn}`
        : `Customer chose untracked letter. Book Australia Post large letter (≤125 g band ~$3.70) — usually cheapest; no Transdirect equivalent.${packNote}${letterWarn}`,
      className: 'bg-slate-100 text-slate-800 border-slate-300',
      estimatedWeightGrams,
      packaging,
    })
  }

  if (isExpressOption(snap.shippingOptionId, snap.shippingOptionName)) {
    const packNote = packaging ? ` Pack: ${packPhrase(packaging)}. ${packaging.ausPostBandHint}.` : ''
    return withPack({
      key: 'auspost_express',
      label: 'AusPost Express',
      reason: `Customer paid Express. Book Australia Post Express — keep the paid service.${packNote}`,
      className: 'bg-violet-100 text-violet-900 border-violet-200',
      estimatedWeightGrams,
      packaging,
    })
  }

  if (isTrackedLetterOption(snap.shippingOptionId, snap.shippingOptionName)) {
    const packNote = packaging
      ? ` Pack: ${packPhrase(packaging)}. Keep ≤20 mm for letter-with-tracking.`
      : ''
    return withPack({
      key: 'auspost_letter_tracked',
      label: 'AusPost tracked letter',
      reason: `Tracked letter — Australia Post prepaid tracked envelope. Couriers do not replace letter formats.${packNote}`,
      className: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      estimatedWeightGrams,
      packaging,
    })
  }

  const chargeable = packaging?.chargeableGrams ?? estimatedWeightGrams
  const packNote = packaging
    ? ` Pack: ${packPhrase(packaging)}. ${packaging.ausPostBandHint}.`
    : ` Physical ~${estimatedWeightGrams} g.`

  // Tracked parcel / goods
  if (addressLooksLikePoBoxOrLocker(streetBlob)) {
    return withPack({
      key: 'auspost_po_box',
      label: 'AusPost only (PO Box)',
      reason: `PO Box / Parcel Locker detected. Aramex / Couriers Please via Transdirect cannot deliver — use Australia Post Parcel Post.${packNote}`,
      className: 'bg-rose-100 text-rose-900 border-rose-200',
      estimatedWeightGrams,
      packaging,
    })
  }

  if (isAusPostPreferredRemotePostcode(postcode)) {
    return withPack({
      key: 'auspost_remote',
      label: 'AusPost Parcel',
      reason: `Regional / remote postcode ${postcode || '—'}. Australia Post usually wins on coverage and price vs private couriers.${packNote}`,
      className: 'bg-amber-100 text-amber-950 border-amber-300',
      estimatedWeightGrams,
      packaging,
    })
  }

  if (isAuMetroPostcode(postcode) && chargeable > 0 && chargeable <= TRANSDIRECT_METRO_MAX_GRAMS) {
    const cubicWarn =
      chargeable >= TRANSDIRECT_METRO_SOFT_CUBIC_WARN_GRAMS
        ? ` Chargeable ≥1 kg (often driven by box cubic) — quote Transdirect carefully; may not beat ${packaging?.ausPostBandHint || 'AusPost 1 kg band'}.`
        : ' Often cheaper than AusPost on Syd / Mel / Bris / GC / Perth / Adelaide — quote before booking.'
    return withPack({
      key: 'transdirect_metro',
      label: 'Transdirect',
      reason: `Metro destination ${postcode}. Prefer Transdirect (Aramex / Couriers Please) using chargeable ~${chargeable} g.${cubicWarn}${packNote}`,
      className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      estimatedWeightGrams,
      packaging,
    })
  }

  return withPack({
    key: 'auspost_parcel',
    label: 'AusPost Parcel',
    reason: `Tracked parcel${postcode ? ` to ${postcode}` : ''}. Prefer Australia Post Parcel Post when the lane is unclear, rural, or chargeable over ${TRANSDIRECT_METRO_MAX_GRAMS} g; still quote Transdirect if metro.${packNote}`,
    className: 'bg-amber-50 text-amber-950 border-amber-200',
    estimatedWeightGrams,
    packaging,
  })
}

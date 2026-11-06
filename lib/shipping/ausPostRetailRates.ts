/**
 * Australia Post retail reference rates used as SELPIC CMS defaults (2026).
 * Sources:
 * - Regular letters (own envelope): Large ≤125 g $3.70 / ≤250 g $5.55 / ≤500 g $9.00
 * - Domestic letter with tracking prepaid: Small $5.85 / Medium C5 $8.10 / Large C4 $10.15
 * - Parcel Post own packaging ≤500 g $11.70; Express own packaging ≤500 g $15.20
 *
 * CMS `tracked-letter` uses Medium C5 **$8.10** (fits Env 240×280 / 1+1 tracked).
 * Do not confuse with untracked Large ≤250 g **$5.55**.
 */

export const AUSPOST_LARGE_LETTER_125G = 3.7
export const AUSPOST_LARGE_LETTER_250G_UNTRACKED = 5.55
export const AUSPOST_TRACKED_LETTER_SMALL = 5.85
export const AUSPOST_TRACKED_LETTER_MEDIUM_C5 = 8.1
export const AUSPOST_TRACKED_LETTER_LARGE_C4 = 10.15
export const AUSPOST_PARCEL_OWN_PACK_500G = 11.7
export const AUSPOST_EXPRESS_OWN_PACK_500G = 15.2

/** Default list price for CMS id `tracked-letter`. */
export const CMS_TRACKED_LETTER_DEFAULT_PRICE = AUSPOST_TRACKED_LETTER_MEDIUM_C5

/** Default list price for CMS id `express-post` (≤500 g band). */
export const CMS_EXPRESS_POST_DEFAULT_PRICE = AUSPOST_EXPRESS_OWN_PACK_500G

const LEGACY_TRACKED_LETTER_MISLABELLED = AUSPOST_LARGE_LETTER_250G_UNTRACKED // was wrongly used as "tracked"
const LEGACY_EXPRESS = 14.5

/**
 * Fix known wrong defaults on hydrate / server CMS load.
 * Only rewrites exact legacy prices so intentional Admin edits are kept.
 */
export function migrateAusPostShippingOptionPrices<T extends { id?: string; price?: number }>(
  options: T[]
): T[] {
  if (!Array.isArray(options)) return options
  return options.map((opt) => {
    const id = String(opt?.id || '').trim()
    const price = Number(opt?.price)
    if (id === 'tracked-letter' && price === LEGACY_TRACKED_LETTER_MISLABELLED) {
      return { ...opt, price: CMS_TRACKED_LETTER_DEFAULT_PRICE }
    }
    if (id === 'express-post' && price === LEGACY_EXPRESS) {
      return { ...opt, price: CMS_EXPRESS_POST_DEFAULT_PRICE }
    }
    return opt
  })
}

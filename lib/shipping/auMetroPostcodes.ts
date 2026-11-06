/**
 * Coarse AU metro / major-city postcode bands for Admin carrier advice.
 * Not a full AusPost zone table — favour Transdirect (Aramex/CP) on metro lanes,
 * AusPost on regional / remote / PO Box.
 */

type PostcodeRange = { min: number; max: number }

/** Capital + major coastal metros where private couriers are often cheapest. */
const METRO_RANGES: PostcodeRange[] = [
  // Sydney metro (+ nearby)
  { min: 1000, max: 1920 },
  { min: 2000, max: 2249 },
  { min: 2555, max: 2574 },
  { min: 2740, max: 2786 },
  // Canberra
  { min: 2600, max: 2620 },
  { min: 2900, max: 2914 },
  // Melbourne metro
  { min: 3000, max: 3207 },
  { min: 3335, max: 3341 },
  { min: 3750, max: 3811 },
  { min: 3910, max: 3920 },
  { min: 3975, max: 3978 },
  { min: 8001, max: 8785 },
  // Brisbane + Gold Coast + Ipswich / Sunshine Coast fringe
  { min: 4000, max: 4209 },
  { min: 4210, max: 4280 },
  { min: 4300, max: 4305 },
  { min: 4500, max: 4575 },
  // Adelaide metro
  { min: 5000, max: 5199 },
  // Perth metro
  { min: 6000, max: 6199 },
]

/** States / bands where AusPost reach usually beats private couriers on price/coverage. */
const AUSPOST_PREFERRED_RANGES: PostcodeRange[] = [
  // NT
  { min: 800, max: 999 },
  // Tasmania
  { min: 7000, max: 7999 },
  // WA outside Perth metro (already covered above as 6000–6199 metro)
  { min: 6200, max: 6999 },
  // Far north / remote QLD pockets often surcharge couriers
  { min: 4700, max: 4899 },
  { min: 4810, max: 4895 },
]

function inRanges(n: number, ranges: PostcodeRange[]): boolean {
  return ranges.some((r) => n >= r.min && n <= r.max)
}

export function parseAuPostcode(raw: string | null | undefined): number | null {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length < 4) return null
  const n = Number(digits.slice(0, 4))
  return Number.isFinite(n) && n >= 200 && n <= 9999 ? n : null
}

export function isAuMetroPostcode(postcode: string | null | undefined): boolean {
  const n = parseAuPostcode(postcode)
  if (n == null) return false
  return inRanges(n, METRO_RANGES)
}

export function isAusPostPreferredRemotePostcode(postcode: string | null | undefined): boolean {
  const n = parseAuPostcode(postcode)
  if (n == null) return false
  return inRanges(n, AUSPOST_PREFERRED_RANGES)
}

/** Street / line looks like PO Box, Parcel Locker, GPO Box, Private Bag — couriers cannot deliver. */
export function addressLooksLikePoBoxOrLocker(
  streetOrLine: string | null | undefined
): boolean {
  const s = String(streetOrLine || '').toLowerCase()
  if (!s.trim()) return false
  return (
    /\bpo\s*box\b/.test(s) ||
    /\bp\.?\s*o\.?\s*box\b/.test(s) ||
    /\bgpo\s*box\b/.test(s) ||
    /\bparcel\s*locker\b/.test(s) ||
    /\blocked\s*bag\b/.test(s) ||
    /\bprivate\s*bag\b/.test(s) ||
    /\bpost\s*office\s*box\b/.test(s)
  )
}

/**
 * Australian freight, courier and postal provider detection.
 * Company shipping + Australia Post customer mail → EXPENSE_FREIGHT_SHIPPING
 */

export interface ShippingProviderMatch {
  category: 'EXPENSE_FREIGHT_SHIPPING'
  department: 'cleaning'
  brand: string
  confidence: number
  reason: string
}

const SHIPPING_PROVIDER_PATTERNS: Array<{ patterns: string[]; brand: string }> = [
  { patterns: ['HANAONE EXPRESS', 'HANAONE', 'HANA ONE'], brand: 'Hanaone Express' },
  {
    patterns: [
      'AUSTRALIA POST',
      'AUSPOST',
      'AUS POST',
      'AUSPOST.COM',
      'POST OFFICE',
      'PARCEL POST',
      'EPARCEL',
      'E PARCEL',
      'MYPOST',
      'MY POST',
      'STARP TRACK',
      'STAR TRACK',
      'STARTRACK',
    ],
    brand: 'Australia Post',
  },
  { patterns: ['SENDLE'], brand: 'Sendle' },
  { patterns: ['ARAMEX'], brand: 'Aramex' },
  { patterns: ['COURIERS PLEASE', 'CP EXPRESS'], brand: 'Couriers Please' },
  { patterns: ['FASTWAY', 'ARAMEX FASTWAY'], brand: 'Fastway' },
  { patterns: ['TNT ', 'TNT EXPRESS', 'TNT AUSTRALIA'], brand: 'TNT' },
  { patterns: ['DHL ', 'DHL EXPRESS'], brand: 'DHL' },
  { patterns: ['FEDEX', 'FED EX'], brand: 'FedEx' },
  { patterns: ['UPS ', 'UPS AUSTRALIA'], brand: 'UPS' },
  { patterns: ['TOLL IPEC', 'TOLL PRIORITY', 'TOLL GROUP', 'TOLL '], brand: 'Toll' },
  { patterns: ['BORDER EXPRESS'], brand: 'Border Express' },
  { patterns: ['HUNTER EXPRESS'], brand: 'Hunter Express' },
  { patterns: ['DIRECT FREIGHT', 'DF EXPRESS'], brand: 'Direct Freight' },
  { patterns: ['ALLIED EXPRESS'], brand: 'Allied Express' },
  { patterns: ['NORTHLINE'], brand: 'Northline' },
  { patterns: ['MAINFREIGHT'], brand: 'Mainfreight' },
  { patterns: ['PACK & SEND', 'PACK AND SEND'], brand: 'Pack & Send' },
  { patterns: ['SHIPIT', 'SHIPPIT '], brand: 'Shippit' },
  { patterns: ['FREIGHT', 'COURIER', 'PARCEL'], brand: 'Freight/Courier' },
]

function normalise(description: string): string {
  return description.toUpperCase().replace(/\s+/g, ' ').trim()
}

function compact(description: string): string {
  return normalise(description).replace(/[^A-Z0-9]/g, '')
}

function includesPattern(text: string, compactText: string, pattern: string): boolean {
  const p = pattern.toUpperCase().trim()
  if (text.includes(p)) return true
  const pc = p.replace(/[^A-Z0-9]/g, '')
  return pc.length >= 4 && compactText.includes(pc)
}

export function detectShippingProvider(description: string): ShippingProviderMatch | null {
  const text = normalise(description)
  const compactText = compact(description)
  if (!text) return null

  for (const { patterns, brand } of SHIPPING_PROVIDER_PATTERNS) {
    for (const pattern of patterns) {
      if (includesPattern(text, compactText, pattern)) {
        return {
          category: 'EXPENSE_FREIGHT_SHIPPING',
          department: 'cleaning',
          brand,
          confidence: pattern === 'FREIGHT' || pattern === 'COURIER' || pattern === 'PARCEL' ? 0.7 : 0.93,
          reason: `Australian freight/shipping: ${brand}`,
        }
      }
    }
  }

  return null
}

export function extractShippingDescriptionLabel(rawDescription: string): string | null {
  const match = detectShippingProvider(rawDescription)
  if (!match) return null
  return match.brand
}

export const AU_SHIPPING_PROVIDER_PATTERNS = SHIPPING_PROVIDER_PATTERNS.flatMap((p) => p.patterns)

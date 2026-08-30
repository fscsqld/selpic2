/**
 * Australian fuel / petrol retailer detection for bank statement classification.
 */

export interface FuelRetailerMatch {
  category: 'EXPENSE_FUEL_TRAVEL'
  department: 'cleaning'
  brand: string
  confidence: number
  reason: string
}

/** Strong fuel-only brands — debit at these merchants is almost always fuel/travel. */
const FUEL_BRAND_PATTERNS: Array<{ patterns: string[]; brand: string }> = [
  { patterns: ['7-ELEVEN', '7ELEVEN', '7 ELEVEN', 'SEVEN ELEVEN', '7-11'], brand: '7-Eleven' },
  { patterns: ['BP CONNECT', 'BP EXP', 'BP OIL', 'BP '], brand: 'BP' },
  { patterns: ['AMPOL FOODARY', 'AMPOL', 'FOODARY'], brand: 'Ampol' },
  { patterns: ['SHELL COLES EXPRESS', 'SHELL'], brand: 'Shell' },
  { patterns: ['CALTEX STARSHOP', 'CALTEX', 'STARSHOP'], brand: 'Caltex' },
  { patterns: ['LIBERTY OIL', 'LIBERTY'], brand: 'Liberty' },
  { patterns: ['UNITED PETROLEUM', 'UNITED FUEL', 'UNITED'], brand: 'United' },
  { patterns: ['MOBIL'], brand: 'Mobil' },
  { patterns: ['METRO PETROLEUM', 'METRO FUEL', 'METRO PETROLEUM'], brand: 'Metro Petroleum' },
  { patterns: ['PUMA ENERGY', 'PUMA FUEL', 'PUMA '], brand: 'Puma Energy' },
  { patterns: ['GULL PETROLEUM', 'GULL '], brand: 'Gull' },
  { patterns: ['FREEDOM FUELS', 'FREEDOM FUEL'], brand: 'Freedom Fuels' },
  { patterns: ['PEAK OIL', 'PEAK FUEL'], brand: 'Peak Oil' },
  { patterns: ['COSTCO FUEL', 'COSTCO WHOLESALE FUEL'], brand: 'Costco Fuel' },
  { patterns: ['OTR ', 'ON THE RUN'], brand: 'OTR' },
  { patterns: ['VIBE '], brand: 'Vibe' },
  { patterns: ['EG GROUP', 'EG AMPO'], brand: 'EG Ampol' },
  { patterns: ['OOMENERGY', 'OOM ENERGY', 'OOMENRGY', 'OOMEN'], brand: 'Oom Energy' },
]

/** EFTPOS / card merchant codes sometimes drop the brand — location hints for known sites. */
const FUEL_LOCATION_HINTS: Array<{ patterns: string[]; brand: string }> = [
  { patterns: ['GRAVATT EAST', 'MT GRAVATT', 'MOUNT GRAVATT'], brand: '7-Eleven' },
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
  return pc.length >= 3 && compactText.includes(pc)
}

export function detectFuelRetailer(description: string): FuelRetailerMatch | null {
  const text = normalise(description)
  const compactText = compact(description)
  if (!text) return null

  // NAB EFTPOS often truncates to just "BP"
  if (text === 'BP') {
    return {
      category: 'EXPENSE_FUEL_TRAVEL',
      department: 'cleaning',
      brand: 'BP',
      confidence: 0.9,
      reason: 'Australian fuel retailer: BP',
    }
  }

  for (const { patterns, brand } of FUEL_BRAND_PATTERNS) {
    for (const pattern of patterns) {
      if (includesPattern(text, compactText, pattern)) {
        return {
          category: 'EXPENSE_FUEL_TRAVEL',
          department: 'cleaning',
          brand,
          confidence: 0.92,
          reason: `Australian fuel retailer: ${brand}`,
        }
      }
    }
  }

  // EFTPOS lines that lost the brand during PDF cleanup — small debit + location hint
  for (const { patterns, brand } of FUEL_LOCATION_HINTS) {
    for (const pattern of patterns) {
      if (includesPattern(text, compactText, pattern)) {
        return {
          category: 'EXPENSE_FUEL_TRAVEL',
          department: 'cleaning',
          brand,
          confidence: 0.75,
          reason: `Likely fuel purchase at ${brand} (${pattern})`,
        }
      }
    }
  }

  return null
}

export function isFuelRetailerDescription(description: string): boolean {
  return detectFuelRetailer(description) !== null
}

/** Preserve merchant identity in parsed NAB descriptions. */
export function extractFuelDescriptionLabel(rawDescription: string): string | null {
  const match = detectFuelRetailer(rawDescription)
  if (!match) return null

  const text = normalise(rawDescription)
  const locationMatch = text.match(
    /(?:MT|MOUNT|GRAVATT|EAST|WEST|NORTH|SOUTH|BRISBANE|SYDNEY|MELBOURNE|[A-Z]{3,})(?:\s+(?:MT|MOUNT|GRAVATT|EAST|WEST|[A-Z]{3,}))*/i
  )
  if (locationMatch && locationMatch[0].length > 3) {
    const loc = locationMatch[0]
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    return `${match.brand} ${loc}`
  }

  return match.brand
}

export const AU_FUEL_RETAILER_PATTERNS = FUEL_BRAND_PATTERNS.flatMap((b) => b.patterns)

/**
 * Online platform / marketplace / SaaS classification for Australian business accounts.
 *
 * Credits: Stripe, Etsy, eBay, PayPal payouts → Trading Revenue
 * Debits:  platform fees → Merchant & Platform Fees
 * Debits:  Cursor, Google Workspace/Cloud → Software & Subscriptions
 * Debits:  Google Ads → Marketing
 */

export type PlatformCategory =
  | 'INCOME_SALES_CLEANING'
  | 'EXPENSE_MERCHANT_FEES'
  | 'EXPENSE_SOFTWARE_SUBSCRIPTIONS'
  | 'EXPENSE_MARKETING'

export interface PlatformTransactionMatch {
  category: PlatformCategory
  department: 'cleaning'
  brand: string
  confidence: number
  reason: string
}

const MARKETPLACE_BRANDS = [
  { patterns: ['STRIPE'], brand: 'Stripe' },
  { patterns: ['ETSY'], brand: 'Etsy' },
  { patterns: ['EBAY', 'E-BAY'], brand: 'eBay' },
  { patterns: ['PAYPAL'], brand: 'PayPal' },
  { patterns: ['SQUARE'], brand: 'Square' },
  { patterns: ['SHOPIFY'], brand: 'Shopify' },
  { patterns: ['AMAZON MARKETPLACE', 'AMAZON AU', 'AMAZON SELLER'], brand: 'Amazon' },
]

const SOFTWARE_BRANDS = [
  { patterns: ['CURSOR', 'CURSOR AI', 'POWERED IDE'], brand: 'Cursor' },
  { patterns: ['GOOGLE WORKSPACE', 'GOOGLE CLOUD', 'GOOGLE STORAGE', 'GOOGLE DRIVE', 'GSUITE', 'G SUITE'], brand: 'Google' },
  { patterns: ['GOOGLE ONE', 'GOOGLE*GOOGLE ONE'], brand: 'Google One' },
  { patterns: ['MICROSOFT 365', 'MSFT *', 'OFFICE 365', 'MICROSOFT*OFFICE'], brand: 'Microsoft 365' },
  { patterns: ['ADOBE', 'CREATIVE CLOUD'], brand: 'Adobe' },
  { patterns: ['OPENAI', 'CHATGPT'], brand: 'OpenAI' },
  { patterns: ['ANTHROPIC', 'CLAUDE.AI'], brand: 'Anthropic' },
  { patterns: ['GITHUB'], brand: 'GitHub' },
  { patterns: ['NOTION'], brand: 'Notion' },
  { patterns: ['ZOOM'], brand: 'Zoom' },
  { patterns: ['DROPBOX'], brand: 'Dropbox' },
  { patterns: ['SLACK'], brand: 'Slack' },
  { patterns: ['CANVA'], brand: 'Canva' },
  { patterns: ['XERO'], brand: 'Xero' },
  { patterns: ['MYOB'], brand: 'MYOB' },
]

const MARKETING_PATTERNS = ['GOOGLE ADS', 'GOOGLEAD', 'ADWORDS', 'GOOGLE *ADS', 'FACEBOOK ADS', 'META ADS', 'FB ADS']

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

function matchesAny(text: string, compactText: string, patterns: string[]): boolean {
  return patterns.some((p) => includesPattern(text, compactText, p))
}

function isMarketingSpend(text: string, compactText: string): boolean {
  return matchesAny(text, compactText, MARKETING_PATTERNS)
}

function isGenericGoogleSoftware(text: string, compactText: string): boolean {
  if (!includesPattern(text, compactText, 'GOOGLE')) return false
  if (isMarketingSpend(text, compactText)) return false
  const softwareHints = ['WORKSPACE', 'CLOUD', 'STORAGE', 'DRIVE', 'GSUITE', 'ONE', 'PLAY APP', 'YOUTUBE PREMIUM']
  if (softwareHints.some((h) => includesPattern(text, compactText, h))) return true
  // Bank often shows "GOOGLE GSUITE" or "GOOGLE SYDNEY" for Workspace billing
  if (text.includes('GOOGLE') && !text.includes('ADS') && !text.includes('ADWORD')) {
    if (text.includes('SYDNEY') || text.includes('AUSTRALIA') || compactText.includes('GOOGLEGSUITE')) return true
  }
  return false
}

export function detectPlatformTransaction(
  description: string,
  debit: number | null | undefined,
  credit: number | null | undefined
): PlatformTransactionMatch | null {
  const text = normalise(description)
  const compactText = compact(description)
  if (!text) return null

  const hasDebit = !!(debit && Math.abs(debit) > 0)
  const hasCredit = !!(credit && Math.abs(credit) > 0)

  // Marketplace credits → Trading Revenue
  if (hasCredit && !hasDebit) {
    for (const { patterns, brand } of MARKETPLACE_BRANDS) {
      if (matchesAny(text, compactText, patterns)) {
        return {
          category: 'INCOME_SALES_CLEANING',
          department: 'cleaning',
          brand,
          confidence: 0.94,
          reason: `${brand} payout / platform sales revenue`,
        }
      }
    }
  }

  if (!hasDebit) return null

  // Marketing before generic Google
  if (isMarketingSpend(text, compactText)) {
    return {
      category: 'EXPENSE_MARKETING',
      department: 'cleaning',
      brand: 'Google Ads',
      confidence: 0.92,
      reason: 'Online advertising spend',
    }
  }

  // Software subscriptions
  for (const { patterns, brand } of SOFTWARE_BRANDS) {
    if (matchesAny(text, compactText, patterns)) {
      return {
        category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
        department: 'cleaning',
        brand,
        confidence: 0.92,
        reason: `Software subscription: ${brand}`,
      }
    }
  }

  if (isGenericGoogleSoftware(text, compactText)) {
    return {
      category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS',
      department: 'cleaning',
      brand: 'Google',
      confidence: 0.85,
      reason: 'Google software / cloud subscription',
    }
  }

  // Platform merchant fees (debits)
  for (const { patterns, brand } of MARKETPLACE_BRANDS) {
    if (matchesAny(text, compactText, patterns)) {
      return {
        category: 'EXPENSE_MERCHANT_FEES',
        department: 'cleaning',
        brand,
        confidence: 0.93,
        reason: `${brand} platform / merchant fee`,
      }
    }
  }

  return null
}

export function extractPlatformDescriptionLabel(rawDescription: string): string | null {
  const debit = 1
  const match =
    detectPlatformTransaction(rawDescription, debit, null) ||
    detectPlatformTransaction(rawDescription, null, 1)
  return match?.brand ?? null
}

/**
 * Apply known AU GST claim tags on purchases (1B), without touching P&L category.
 *
 * Manual overrides (gstInfo.reasoning starts with "Manual:") are never overwritten.
 */

import { buildGstInfoForClaim } from '@/lib/gst/purchase-gst-claimable'
import { detectShippingProvider } from '@/lib/classification/australian-shipping-providers'

type Tx = {
  description?: string
  debit?: number | null
  credit?: number | null
  category?: string
  confidence?: number | string
  source?: string
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence?: number
    reasoning?: string
  }
}

/** International / no AU GST on these freight brands (still EXPENSE_FREIGHT_SHIPPING for P&L). */
const GST_FREE_FREIGHT_PATTERNS = [
  'HANAONE EXPRESS',
  'HANAONE',
  'HANA ONE',
]

/** AU GST typically included. */
const GST_CLAIM_PATTERNS: Array<{ patterns: string[]; reason: string }> = [
  {
    patterns: ['CRAZYDOMAINS', 'CRAZY DOMAINS', 'CRAZYDOMAIN'],
    reason: 'Crazy Domains AU hosting — GST claimable',
  },
  {
    patterns: ['WEBSITE HO'],
    reason: 'Website hosting — GST claimable (verify)',
  },
  // Director cash: travel case (AU GST) — not Korean stamp/equipment lines
  {
    patterns: ['TRAVEL CASE', '출장용 CASE', 'CASE 구입', '출장용 CASE', 'CASE 구'],
    reason: 'Travel case — AU GST claimable',
  },
]

function upperDesc(tx: Tx): string {
  return String(tx.description || '').toUpperCase()
}

function isManualGstOverride(tx: Tx): boolean {
  const reasoning = tx.gstInfo?.reasoning || ''
  if (reasoning.startsWith('Manual:')) return true
  // Category-only Manual edits still allow GST auto-tag unless gst was manually set
  return false
}

function matchesAny(desc: string, patterns: string[]): boolean {
  return patterns.some((p) => desc.includes(p))
}

/**
 * AU domestic freight brands keep GST claim; Hanaone (and listed) are GST-free for 1B.
 */
export function resolveKnownPurchaseGstClaim(tx: Tx): boolean | null {
  if (!tx.debit || !(tx.category || '').startsWith('EXPENSE_')) return null

  const desc = upperDesc(tx)

  if (matchesAny(desc, GST_FREE_FREIGHT_PATTERNS)) {
    return false
  }

  for (const rule of GST_CLAIM_PATTERNS) {
    if (matchesAny(desc, rule.patterns)) return true
  }

  // Travel "case" purchase (AU retail) — claim GST; ignore stamp/computer lines
  if (/\bCASE\b/.test(desc) && !desc.includes('STAMP') && !desc.includes('SAMSUNG')) {
    return true
  }

  const shipping = detectShippingProvider(tx.description || '')
  if (shipping && (tx.category === 'EXPENSE_FREIGHT_SHIPPING' || !tx.category)) {
    // Known AU providers from detector — claim GST (Hanaone already returned false above)
    if (matchesAny(desc, GST_FREE_FREIGHT_PATTERNS)) return false
    return true
  }

  return null
}

export function applyKnownPurchaseGstTags<T extends Tx>(transactions: T[]): T[] {
  return transactions.map((tx) => {
    if (isManualGstOverride(tx)) return tx
    if (!tx.debit || !(tx.category || '').startsWith('EXPENSE_')) return tx

    const claim = resolveKnownPurchaseGstClaim(tx)
    if (claim === null) return tx

    const amount = Math.abs(tx.debit || 0)
    const next = buildGstInfoForClaim(amount, claim)
    // Distinguish auto tags from user Manual: overrides
    const gstInfo = {
      ...next,
      reasoning: claim
        ? `Auto: ${upperDesc(tx).includes('CRAZY') || upperDesc(tx).includes('WEBSITE HO') ? 'AU hosting GST claimable' : 'AU freight GST claimable'}`
        : 'Auto: no AU GST claim (e.g. Hanaone / international freight)',
      confidence: 0.9,
    }

    // Skip rewrite if already same type
    if (tx.gstInfo?.gstType === gstInfo.gstType) return tx

    return { ...tx, gstInfo }
  })
}

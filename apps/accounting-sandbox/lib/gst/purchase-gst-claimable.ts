/**
 * Whether an expense debit should contribute to BAS 1B / gstClaimable.
 *
 * P&L / income-tax expenses stay separate — GST-free purchases remain in totalExpenses.
 *
 * Rules:
 * - Explicit FREE or EXCLUDED → not claimable
 * - Explicit INCLUDED → claimable
 * - Manual / cash expenses with no tag → not claimable (often overseas / pre-incorp / GST-free)
 * - Bank (and other) expenses with no tag → claimable (AU inclusive ÷11 estimate)
 */

export type GstPurchaseType = 'INCLUDED' | 'EXCLUDED' | 'FREE'

export type GstPurchaseTx = {
  debit?: number | null
  category?: string
  department?: string
  source?: string
  gstInfo?: {
    gstType?: GstPurchaseType
    isGSTIncluded?: boolean
    gstAmount?: number
  }
}

export function resolvePurchaseGstType(
  tx: GstPurchaseTx
): GstPurchaseType | 'DEFAULT_BANK' | 'DEFAULT_MANUAL_FREE' {
  const tagged = tx.gstInfo?.gstType
  if (tagged === 'FREE' || tagged === 'EXCLUDED' || tagged === 'INCLUDED') return tagged
  if (tx.source === 'manual') return 'DEFAULT_MANUAL_FREE'
  return 'DEFAULT_BANK'
}

/** True when this purchase should be included in taxableExpenses / 1B. */
export function isPurchaseGstClaimable(tx: GstPurchaseTx): boolean {
  const resolved = resolvePurchaseGstType(tx)
  if (resolved === 'FREE' || resolved === 'EXCLUDED' || resolved === 'DEFAULT_MANUAL_FREE') {
    return false
  }
  return true
}

export function buildGstInfoForClaim(amount: number, claimAuGst: boolean) {
  const abs = Math.abs(amount || 0)
  if (claimAuGst) {
    return {
      isGSTIncluded: true,
      gstType: 'INCLUDED' as const,
      gstAmount: abs / 11,
      netAmount: abs - abs / 11,
      confidence: 1,
      reasoning: 'Manual: AU GST claimable (BAS 1B)',
    }
  }
  return {
    isGSTIncluded: false,
    gstType: 'FREE' as const,
    gstAmount: 0,
    netAmount: abs,
    confidence: 1,
    reasoning: 'Manual: company expense without AU GST claim',
  }
}

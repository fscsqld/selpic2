/**
 * GST on sales (BAS 1A) — respects Manual tags and company GST registration.
 *
 * Purchases (1B) stay in purchase-gst-claimable.ts.
 */

export type SalesGstType = 'INCLUDED' | 'EXCLUDED' | 'FREE'

export type SalesGstTx = {
  credit?: number | null
  category?: string
  department?: string
  gstInfo?: {
    gstType?: SalesGstType
    isGSTIncluded?: boolean
    gstAmount?: number
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Business sales credits that can carry GST (not ATO refunds / transfers). */
export function isG1SalesCredit(tx: SalesGstTx): boolean {
  if (!tx.credit || tx.credit <= 0) return false
  if (tx.department === 'personal') return false
  const cat = tx.category || ''
  if (!cat.startsWith('INCOME_')) return false
  if (cat === 'INCOME_CASH_DEPOSIT_REVIEW') return false
  return true
}

/** True when this sale should contribute to BAS 1A / gstPayable. */
export function isSalesGstTaxable(tx: SalesGstTx): boolean {
  if (!isG1SalesCredit(tx)) return false
  const tagged = tx.gstInfo?.gstType
  if (tagged === 'FREE' || tagged === 'EXCLUDED') return false
  return true
}

export function gstAmountOnSale(tx: SalesGstTx): number {
  if (!isSalesGstTaxable(tx)) return 0
  const gross = Math.abs(Number(tx.credit || 0))
  if (tx.gstInfo?.gstType === 'INCLUDED' && tx.gstInfo.gstAmount != null) {
    return roundMoney(Math.abs(Number(tx.gstInfo.gstAmount)))
  }
  return roundMoney(gross / 11)
}

/**
 * Company-level gate: not GST-registered → 1A is always 0.
 * Registered → sum taxable sales GST (Manual FREE rows excluded).
 */
export function sumGstPayableOnSales(
  transactions: SalesGstTx[],
  gstRegistered: boolean = true
): number {
  if (!gstRegistered) return 0
  let total = 0
  for (const tx of transactions) {
    total += gstAmountOnSale(tx)
  }
  return roundMoney(total)
}

export function buildGstInfoForSale(amount: number, gstIncluded: boolean) {
  const abs = Math.abs(amount || 0)
  if (gstIncluded) {
    const gstAmount = roundMoney(abs / 11)
    return {
      isGSTIncluded: true,
      gstType: 'INCLUDED' as const,
      gstAmount,
      netAmount: roundMoney(abs - gstAmount),
      confidence: 1,
      reasoning: 'Manual: GST included in sale (BAS 1A)',
    }
  }
  return {
    isGSTIncluded: false,
    gstType: 'FREE' as const,
    gstAmount: 0,
    netAmount: abs,
    confidence: 1,
    reasoning: 'Manual: GST-free / no GST on sale (no 1A)',
  }
}

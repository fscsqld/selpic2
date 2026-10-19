import type {
  PoCurrency,
  PoTaxRule,
  PurchaseOrderLine,
} from '@/lib/purchaseOrderTypes'

export type PoChargesInput = {
  freight?: number
  insurance?: number
  other?: number
}

function roundMoney(n: number, currency: PoCurrency): number {
  const digits = currency === 'KRW' ? 0 : 2
  const f = 10 ** digits
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f
}

export function lineAmount(line: PurchaseOrderLine): number {
  const qty = Number(line.qty) || 0
  const price = Number(line.unitPrice) || 0
  return qty * price
}

/**
 * Compute PO totals.
 * - overseas_zero: tax 0
 * - au_gst_excluded: tax = goodsSubtotal * 10% (charges treated as ex-GST)
 * - au_gst_included: tax portion of goods via ÷11; displayed total stays inclusive of goods + charges
 */
export function computePurchaseOrderTotals(input: {
  items: PurchaseOrderLine[]
  charges?: PoChargesInput
  taxRule: PoTaxRule
  currency: PoCurrency
}): { subtotal: number; tax: number; total: number; currency: PoCurrency } {
  const currency = input.currency
  const goods = (input.items || []).reduce((sum, line) => sum + lineAmount(line), 0)
  const freight = Number(input.charges?.freight) || 0
  const insurance = Number(input.charges?.insurance) || 0
  const other = Number(input.charges?.other) || 0
  const charges = freight + insurance + other

  let tax = 0
  let subtotal = goods
  let total = goods + charges

  if (input.taxRule === 'au_gst_excluded') {
    tax = goods * 0.1
    subtotal = goods
    total = goods + tax + charges
  } else if (input.taxRule === 'au_gst_included') {
    tax = goods / 11
    subtotal = goods - tax
    total = goods + charges
  } else {
    // overseas_zero
    tax = 0
    subtotal = goods
    total = goods + charges
  }

  return {
    subtotal: roundMoney(subtotal, currency),
    tax: roundMoney(tax, currency),
    total: roundMoney(total, currency),
    currency,
  }
}

export function formatPoMoney(value: number, currency: PoCurrency): string {
  const digits = currency === 'KRW' ? 0 : 2
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number.isFinite(value) ? value : 0)
  } catch {
    return `${currency} ${(Number.isFinite(value) ? value : 0).toFixed(digits)}`
  }
}

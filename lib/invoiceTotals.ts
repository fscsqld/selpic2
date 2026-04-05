/**
 * Australian GST (10%) totals for Document Sender / Tax Invoice.
 * - Taxable line unit prices are ex-GST; GST = 10% of ex-GST line amounts.
 * - Order discount (GST-inclusive, applied to goods subtotal) reduces GST via (taxableIncGST - discount) / 11.
 * - Shipping / payment fee rows: taxRate 0; amounts included in non-taxable sum from lines OR from top-level fields, never both.
 */

export type InvoiceLineForTotals = {
  description: string
  qty: number
  unitPrice: number
  taxRate?: number
}

export type InvoiceTotalsDiscounts = {
  totalDiscount?: number
}

export function lineLooksLikeShipping(description: string): boolean {
  return /\bshipping\b/i.test(description || '')
}

export function lineLooksLikePaymentFee(description: string): boolean {
  return /\bpayment\s*fee\b/i.test(description || '')
}

export function computeAustralianInvoiceTotals(input: {
  items: InvoiceLineForTotals[]
  shipping?: number
  paymentFee?: number
  discounts?: InvoiceTotalsDiscounts
}): {
  /** Taxable goods subtotal ex-GST (before discount), from line items */
  subtotalExclGSTGoods: number
  /** GST on goods after discount is applied to GST-inclusive goods total */
  gstAmount: number
  /** Non-GST lines (shipping / payment rows) + optional top-level fees when not duplicated as lines */
  nonTaxableAmount: number
  /** Amount due (should match order total when built from convertOrderToInvoice) */
  total: number
} {
  const items = input.items || []
  const taxable = items.filter((i) => (i.taxRate ?? 0) > 0)
  const nonTaxableLines = items.filter((i) => (i.taxRate ?? 0) === 0)

  const taxableIncGST = taxable.reduce(
    (s, i) => s + i.unitPrice * i.qty * (1 + (i.taxRate ?? 0)),
    0
  )
  const subtotalExclGSTGoods = taxable.reduce((s, i) => s + i.unitPrice * i.qty, 0)

  const discount = input.discounts?.totalDiscount ?? 0
  const taxableIncAfterDiscount = Math.max(0, taxableIncGST - discount)

  const gstAmount = taxableIncAfterDiscount > 0 ? taxableIncAfterDiscount / 11 : 0

  let nonTaxableAmount = nonTaxableLines.reduce((s, i) => s + i.unitPrice * i.qty, 0)

  const hasShippingLine = items.some((i) => lineLooksLikeShipping(i.description))
  const hasPaymentFeeLine = items.some((i) => lineLooksLikePaymentFee(i.description))

  if (!hasShippingLine && (input.shipping ?? 0) > 0) {
    nonTaxableAmount += input.shipping!
  }
  if (!hasPaymentFeeLine && (input.paymentFee ?? 0) > 0) {
    nonTaxableAmount += input.paymentFee!
  }

  const total = taxableIncAfterDiscount + nonTaxableAmount

  return {
    subtotalExclGSTGoods,
    gstAmount,
    nonTaxableAmount,
    total
  }
}

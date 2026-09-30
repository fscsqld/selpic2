/**
 * Admin Create Invoice/Quote totals: unit prices are GST-exclusive when taxRate > 0.
 * Discount % is taken off the line subtotal (excl. GST); GST is recalculated on the
 * taxable portion after discount (ATO-style for invoice-time discounts).
 */

export type DocumentCreateTotalsLine = {
  qty: number
  unitPrice: number
  taxRate?: number
}

export type DocumentCreateTotalsInput = {
  items: DocumentCreateTotalsLine[]
  vipDiscountPercent?: number | null
  promoDiscountPercent?: number | null
  shipping?: number
  paymentFee?: number
}

export type DocumentCreateTotalsResult = {
  subtotal: number
  tax: number
  vipDiscount: number
  promoDiscount: number
  totalDiscount: number
  total: number
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Compute subtotal (excl. GST), discounts, GST after discount, and amount due.
 */
export function computeDocumentCreateTotals(
  input: DocumentCreateTotalsInput
): DocumentCreateTotalsResult {
  const items = input.items || []
  const subtotal = round2(
    items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.qty) || 0), 0)
  )

  const vipPct =
    input.vipDiscountPercent !== undefined && input.vipDiscountPercent !== null
      ? Number(input.vipDiscountPercent) || 0
      : 0
  const promoPct =
    input.promoDiscountPercent !== undefined && input.promoDiscountPercent !== null
      ? Number(input.promoDiscountPercent) || 0
      : 0

  const vipDiscount = vipPct > 0 ? round2(subtotal * (vipPct / 100)) : 0
  const promoDiscount = promoPct > 0 ? round2(subtotal * (promoPct / 100)) : 0
  const totalDiscount = round2(vipDiscount + promoDiscount)

  let taxableExcl = 0
  let taxBeforeDiscount = 0
  for (const item of items) {
    const lineExcl = (Number(item.unitPrice) || 0) * (Number(item.qty) || 0)
    const rate = Number(item.taxRate) || 0
    if (rate > 0 && lineExcl > 0) {
      taxableExcl += lineExcl
      taxBeforeDiscount += lineExcl * rate
    }
  }
  taxableExcl = round2(taxableExcl)
  taxBeforeDiscount = round2(taxBeforeDiscount)

  // Apply discount to taxable ex-GST first, then scale GST by the same ratio.
  const discountOnTaxable = Math.min(totalDiscount, taxableExcl)
  const taxableAfter = round2(Math.max(0, taxableExcl - discountOnTaxable))
  const tax =
    taxableExcl > 0.0001 && taxBeforeDiscount > 0
      ? round2(taxBeforeDiscount * (taxableAfter / taxableExcl))
      : 0

  const nonTaxableExcl = round2(Math.max(0, subtotal - taxableExcl))
  const discountRemainder = round2(Math.max(0, totalDiscount - discountOnTaxable))
  const nonTaxableAfter = round2(Math.max(0, nonTaxableExcl - discountRemainder))

  const shipping = Number(input.shipping) || 0
  const paymentFee = Number(input.paymentFee) || 0

  const total = round2(taxableAfter + tax + nonTaxableAfter + shipping + paymentFee)

  return {
    subtotal,
    tax,
    vipDiscount,
    promoDiscount,
    totalDiscount,
    total,
  }
}

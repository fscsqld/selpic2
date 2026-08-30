/**
 * ATO lodgment label rounding (BAS, company tax return, individual return).
 *
 * Official ATO wording for BAS (and the same practice on income tax returns):
 * enter **whole dollar** amounts — **leave cents out** and **do not round up**
 * to the next dollar. That is truncation toward zero (`Math.trunc`), not
 * banker's / nearest-dollar rounding.
 *
 * Keep the ledger, P&L, Balance Sheet, and Trial Balance in cents.
 * Apply this helper only when preparing amounts for ATO / myTax / BAS copy fields.
 *
 * Do **not** use for PAYG withholding *formula tables* (Schedule 1): those use
 * nearest dollar with 50c rounded up — payroll calculators keep that rule.
 *
 * Typical book vs bank gap: ledger ÷11 GST credit $18.45 → BAS label $18 →
 * ATO refunds $18 into the bank → Balance Sheet clearing of $0.45 (cents left out).
 *
 * Sources: ATO “BAS and GST tips” / “Complete your BAS” — whole dollars, leave
 * cents out, don’t round up; company tax return instructions — no cents.
 */

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Whole dollars for ATO labels: discard cents (never round up).
 * e.g. 18.45 → 18, 765.99 → 765, −1,674.16 → −1,674
 */
export function roundAtoWholeDollars(amount: number): number {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.trunc(n)
}

/** Cents discarded when lodging a label (always ≥ 0). */
export function atoCentsLeftOut(amount: number): number {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return roundCents(Math.abs(n - Math.trunc(n)))
}

/**
 * Expected ATO cash movement for a BAS net GST credit/refund computed in cents:
 * lodge whole dollars (truncate), then ATO pays/charges that whole-dollar amount.
 */
export function expectedAtoBasCashFromLedgerNet(ledgerNetGst: number): number {
  return roundAtoWholeDollars(ledgerNetGst)
}

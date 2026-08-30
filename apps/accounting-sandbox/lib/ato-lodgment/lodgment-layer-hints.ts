import { roundMoney } from '@/lib/utils/currency-format'
import type { BasLodgmentResult } from './types'

export type BasLedgerCentsSlice = NonNullable<BasLodgmentResult['basLedgerCents']>

export interface BasLedgerCentsRollup {
  g1: number
  gstOnSales: number
  gstOnPurchases: number
  exGstSales: number
  periodCount: number
}

/** L2 ex-GST sales for one BAS period: G1 (incl.) − 1A (GST). */
export function basExGstSalesCents(ledger: BasLedgerCentsSlice): number {
  return roundMoney(ledger.g1 - ledger.gstOnSales)
}

export function rollupBasLedgerCents(
  periods: Array<BasLedgerCentsSlice | null | undefined>
): BasLedgerCentsRollup | null {
  const slices = periods.filter((p): p is BasLedgerCentsSlice => !!p)
  if (slices.length === 0) return null

  const g1 = roundMoney(slices.reduce((s, p) => s + p.g1, 0))
  const gstOnSales = roundMoney(slices.reduce((s, p) => s + p.gstOnSales, 0))
  const gstOnPurchases = roundMoney(slices.reduce((s, p) => s + p.gstOnPurchases, 0))

  return {
    g1,
    gstOnSales,
    gstOnPurchases,
    exGstSales: roundMoney(g1 - gstOnSales),
    periodCount: slices.length,
  }
}

export interface AnnualBasCrossCheck {
  annualExGstIncome: number
  basExGstSalesSum: number
  incomeDelta: number
  annualGstOnIncome: number
  basGstOnSalesSum: number
  gstDelta: number
}

export function compareAnnualToBasRollup(
  annualExGstIncome: number,
  annualGstOnIncome: number,
  rollup: BasLedgerCentsRollup | null
): AnnualBasCrossCheck | null {
  if (!rollup) return null
  return {
    annualExGstIncome: roundMoney(annualExGstIncome),
    basExGstSalesSum: rollup.exGstSales,
    incomeDelta: roundMoney(annualExGstIncome - rollup.exGstSales),
    annualGstOnIncome: roundMoney(annualGstOnIncome),
    basGstOnSalesSum: rollup.gstOnSales,
    gstDelta: roundMoney(annualGstOnIncome - rollup.gstOnSales),
  }
}

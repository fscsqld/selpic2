import { describe, expect, it } from 'vitest'
import {
  basExGstSalesCents,
  compareAnnualToBasRollup,
  rollupBasLedgerCents,
} from '@/lib/ato-lodgment/lodgment-layer-hints'

describe('lodgment-layer-hints', () => {
  it('basExGstSalesCents is G1 ledger minus 1A ledger', () => {
    expect(
      basExGstSalesCents({
        g1: 14419.48,
        gstOnSales: 1310.86,
        gstOnPurchases: 545.38,
        gstNet: 765.48,
      })
    ).toBeCloseTo(13108.62, 2)
  })

  it('rollupBasLedgerCents sums quarterly ledger cents', () => {
    const rollup = rollupBasLedgerCents([
      {
        g1: 14419.48,
        gstOnSales: 1310.86,
        gstOnPurchases: 545.38,
        gstNet: 765.48,
      },
      { g1: 0, gstOnSales: 0, gstOnPurchases: 18.45, gstNet: -18.45 },
    ])
    expect(rollup?.periodCount).toBe(2)
    expect(rollup?.exGstSales).toBeCloseTo(13108.62, 2)
    expect(rollup?.gstOnSales).toBeCloseTo(1310.86, 2)
  })

  it('compareAnnualToBasRollup reports FY vs sum-of-quarters delta', () => {
    const rollup = rollupBasLedgerCents([
      {
        g1: 14419.48,
        gstOnSales: 1310.86,
        gstOnPurchases: 545.38,
        gstNet: 765.48,
      },
    ])!
    const check = compareAnnualToBasRollup(13108.62, 1310.86, rollup)!
    expect(check.incomeDelta).toBeCloseTo(0, 2)
    expect(check.gstDelta).toBeCloseTo(0, 2)
  })
})

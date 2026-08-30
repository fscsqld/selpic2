import { describe, expect, it } from 'vitest'
import {
  ATO_GST_REFUND_BANKED_AUD,
  ATO_GST_REFUND_BANKED_AUD_EXAMPLE,
  adjustNetGstForAtoRefundsInCash,
  atoGstRefundRoundingGap,
  isAtoGstRefundBankedOrRoundedEstimate,
  sumAtoGstRefundAmount,
} from '@/lib/utils/ato-gst-refund'
import {
  expectedAtoBasCashFromLedgerNet,
  roundAtoWholeDollars,
} from '@/lib/utils/ato-lodgment-rounding'

describe('ato-gst-refund', () => {
  it('documents SELPIC $18 only as an example of ATO whole-dollar banked refund', () => {
    expect(ATO_GST_REFUND_BANKED_AUD_EXAMPLE).toBe(18)
    expect(ATO_GST_REFUND_BANKED_AUD).toBe(18)
    expect(roundAtoWholeDollars(18.45)).toBe(18)
    expect(expectedAtoBasCashFromLedgerNet(18.45)).toBe(
      ATO_GST_REFUND_BANKED_AUD_EXAMPLE
    )
  })

  it('matches banked whole dollars vs cents estimate for any taxpayer', () => {
    expect(isAtoGstRefundBankedOrRoundedEstimate(18, 18)).toBe(true)
    expect(isAtoGstRefundBankedOrRoundedEstimate(18.45, 18)).toBe(true)
    expect(isAtoGstRefundBankedOrRoundedEstimate(42.8, 42)).toBe(true)
    expect(isAtoGstRefundBankedOrRoundedEstimate(19.2, 18)).toBe(false)
  })

  it('sums ATO GST refund credits at banked face value', () => {
    expect(
      sumAtoGstRefundAmount([
        { category: 'NON_TAXABLE_ATO_GST_REFUND', credit: 18, debit: null },
        { category: 'INCOME_SALES_CLEANING', credit: 100, debit: null },
      ])
    ).toBe(18)
  })

  it('computes BAS estimate − banked rounding gap (e.g. 18.45 − 18 = 0.45)', () => {
    expect(atoGstRefundRoundingGap(18, 18.45)).toBeCloseTo(0.45, 2)
    expect(atoGstRefundRoundingGap(18, 18)).toBe(0)
    expect(atoGstRefundRoundingGap(0, 18.45)).toBe(0)
  })

  it('does not adjust net GST without statement closing balance', () => {
    expect(
      adjustNetGstForAtoRefundsInCash(-50, [
        { category: 'NON_TAXABLE_ATO_GST_REFUND', credit: 18, debit: null },
      ])
    ).toBe(-50)
  })

  it('adds ATO refunds into net GST when statement closing balance is present', () => {
    expect(
      adjustNetGstForAtoRefundsInCash(-50, [
        { category: 'NON_TAXABLE_ATO_GST_REFUND', credit: 18, debit: null },
        { category: 'NON_TAXABLE_TRANSFER', balance: 1000 },
      ])
    ).toBe(-32)
  })
})

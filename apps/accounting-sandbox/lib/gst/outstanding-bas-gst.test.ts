import { describe, expect, it } from 'vitest'
import { resolveOutstandingBasGstPosition } from '@/lib/gst/outstanding-bas-gst'
import { computeBalanceSheet } from '@/lib/utils/balance-sheet'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'

/**
 * Fixture: Q3 trading net GST refund ~$18, Q4 net payable ~$765.
 * Optional ATO bank deposit is Cash — not a BS liability contra.
 */
function buildQ3RefundQ4PayableTxs(includeAtoBankRefund = false) {
  const txs: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category: string
    department: string
  }> = [
    {
      date: '2026-02-10',
      description: 'Q3 Cleaning Sales',
      debit: null,
      credit: 1100,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
    },
    {
      date: '2026-02-15',
      description: 'Q3 Subcontractor',
      debit: 1298,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
    },
    {
      date: '2026-05-10',
      description: 'Q4 Cleaning Sales',
      debit: null,
      credit: 11000,
      category: 'INCOME_SALES_CLEANING',
      department: 'cleaning',
    },
    {
      date: '2026-05-20',
      description: 'Q4 Subcontractor',
      debit: 2579.72,
      credit: null,
      category: 'EXPENSE_CLEANING_SUBCONTRACTOR',
      department: 'cleaning',
    },
  ]
  if (includeAtoBankRefund) {
    txs.push({
      date: '2026-05-12',
      description: 'ATO I002 GST refund',
      debit: null,
      credit: 18,
      category: 'NON_TAXABLE_ATO_GST_REFUND',
      department: 'general',
    })
  }
  return txs
}

describe('outstanding BAS GST (latest quarter vs ATO bank refund)', () => {
  it('treats latest quarter net as outstanding, not FY net after prior refund', () => {
    const txs = buildQ3RefundQ4PayableTxs()
    const pos = resolveOutstandingBasGstPosition(txs, '2026-06-30', 'company')
    const metrics = calculateBusinessMetrics(txs, 0, 'company')
    const periodNet =
      Math.round((metrics.gstPayable - metrics.gstClaimable) * 100) / 100

    expect(pos.latestQuarter?.quarter).toBe(4)
    expect(pos.outstandingPayable).toBeGreaterThan(periodNet)
    expect(pos.settledPriorCreditsInPeriod).toBeCloseTo(
      pos.outstandingPayable - pos.periodNetPayable,
      2
    )
    expect(pos.periodNetPayable).toBeCloseTo(Math.max(0, periodNet), 2)
  })

  it('shows Q4 GST due on BS; ATO bank refund is cash note, not payable reduction', () => {
    const txs = buildQ3RefundQ4PayableTxs(true)
    const bs = computeBalanceSheet({
      transactions: txs,
      openingCashBalance: 0,
      accountType: 'company',
      asAtDate: '2026-06-30',
    })
    const metrics = calculateBusinessMetrics(txs, 0, 'company')

    expect(bs.liabilities.gstPayableOutstanding).toBeGreaterThan(0)
    expect(bs.liabilities.gstPayable).toBeCloseTo(
      bs.liabilities.gstPayableOutstanding,
      2
    )
    expect(bs.liabilities.atoGstRefundInCash).toBeCloseTo(18, 2)
    expect(bs.equity.currentPeriodProfit).toBeCloseTo(metrics.netProfitExGst, 2)
    expect(bs.equity.currentPeriodProfitCash).toBeCloseTo(metrics.netProfit, 2)
    // Equity bridge: cash Net − tax Net ≈ period (1A − 1B)
    const gstBridge =
      bs.equity.currentPeriodProfitCash - bs.equity.currentPeriodProfit
    const periodGstNet =
      Math.round((metrics.gstPayable - metrics.gstClaimable) * 100) / 100
    expect(gstBridge).toBeCloseTo(periodGstNet, 1)
    expect(bs.equity.retainedEarnings).toBeCloseTo(
      bs.equity.currentPeriodProfit,
      2
    )
    expect(bs.equity.retainedEarnings).toBeCloseTo(metrics.netProfitExGst, 2)
  })

  it('as-at mid-Q3 uses Q3 as latest outstanding (no Q4 yet)', () => {
    const txs = buildQ3RefundQ4PayableTxs().filter((t) => t.date < '2026-04-01')
    const pos = resolveOutstandingBasGstPosition(txs, '2026-03-31', 'company')
    expect(pos.latestQuarter?.quarter).toBe(3)
    expect(pos.outstandingPayable).toBe(0)
    expect(pos.outstandingReceivable).toBeGreaterThan(0)
  })
})

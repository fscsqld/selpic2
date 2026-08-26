import { describe, expect, it } from 'vitest'
import { calculatePeriodClosingBalances, summarizePeriodActivity } from '@/lib/period-management/period-utils'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { resolvePriorPeriodDirectorAdvances } from '@/lib/classification/directors-loan-balance'

describe('Period Management DL vs Biz Intel (no auto-match lump into months)', () => {
  const reimbursements = [
    {
      date: '2026-06-15',
      description: 'Director reimburse',
      debit: 8781.89,
      credit: null,
      category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
      department: 'cleaning',
    },
  ]

  const decAirfare = {
    date: '2025-12-10',
    description: 'Qantas airfare',
    debit: 1200,
    credit: null,
    category: 'EXPENSE_FUEL_TRAVEL',
    department: 'cleaning',
    source: 'manual',
    fundedByDirector: true,
    balance: 0,
  }

  it('without prior advances, reimbursements falsely create Director owes Company', () => {
    const metrics = calculateBusinessMetrics(reimbursements as any, 1500, 'company', 0)
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500 - 8781.89, 2)
  })

  it('Biz Intel auto-match prior still nets reimbursements on aggregate window', () => {
    const prior = resolvePriorPeriodDirectorAdvances(reimbursements, 0, true)
    expect(prior).toBeCloseTo(8781.89, 2)
    const metrics = calculateBusinessMetrics(reimbursements as any, 1500, 'company', prior)
    expect(metrics.directorsLoanBalance).toBeCloseTo(1500, 2)
  })

  it('December only reflects director-funded airfare — not reimbursement lump as prior', () => {
    const balances = calculatePeriodClosingBalances([decAirfare], 1500, 0, 0)
    expect(balances.closingDirectorLoanBalance).toBeCloseTo(1500 + 1200, 2)

    const activity = summarizePeriodActivity([decAirfare])
    expect(activity.directorFundedCashAdvances).toBeCloseTo(1200, 2)
    expect(activity.reimbursementsTotal).toBe(0)
    expect(activity.bankDirectorLoanNet).toBe(0)
  })

  it('June reimbursements reduce DL in June only (period-local)', () => {
    // Opening after Dec airfare chain would be 2700; here we test June alone
    const balances = calculatePeriodClosingBalances(reimbursements, 2700, 0, 0)
    expect(balances.closingDirectorLoanBalance).toBeCloseTo(2700 - 8781.89, 2)

    const activity = summarizePeriodActivity(reimbursements)
    expect(activity.reimbursementsTotal).toBeCloseTo(8781.89, 2)
    expect(activity.directorFundedCashAdvances).toBe(0)
  })

  it('manual prior on first month is allowed; auto-match sum must not be used as priorForMonth', () => {
    // Simulates syncAllOpenPeriods: only manual prior, never auto-matched total
    const manualPrior = 0
    const autoMatched = resolvePriorPeriodDirectorAdvances(reimbursements, 0, true)
    expect(autoMatched).toBeCloseTo(8781.89, 2)

    const decWithManualOnly = calculatePeriodClosingBalances([decAirfare], 1500, 0, manualPrior)
    expect(decWithManualOnly.closingDirectorLoanBalance).toBeCloseTo(2700, 2)

    // Wrong old behaviour: dumping auto-match into Dec
    const decWrong = calculatePeriodClosingBalances([decAirfare], 1500, 0, autoMatched)
    expect(decWrong.closingDirectorLoanBalance).toBeCloseTo(2700 + 8781.89, 2)
  })
})

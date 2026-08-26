import { describe, expect, it } from 'vitest'
import {
  formatCalendarDate,
  formatPeriodSelectLabel,
  healPeriodCalendarDates,
  isValidPeriodId,
  nextPeriodId,
  periodIdToCalendarBounds,
  previousPeriodId,
  resolveChainedOpenings,
  calculatePeriodClosingBalances,
} from './period-utils'
import { seedOpeningsBeforePeriod } from './period-lock'
import type { FinancialPeriod } from '../storage/period-types'

function stubPeriod(
  id: string,
  overrides: Partial<FinancialPeriod> = {}
): FinancialPeriod {
  const bounds = periodIdToCalendarBounds(id)!
  return {
    id,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    periodType: 'Monthly',
    openingDirectorLoanBalance: 0,
    closingDirectorLoanBalance: 0,
    openingCashBalance: 0,
    closingCashBalance: 0,
    isLocked: false,
    accountsReceivable: 0,
    carriedForwardReceivables: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('period calendar bounds (timezone-safe)', () => {
  it('rejects OCR junk period ids', () => {
    expect(isValidPeriodId('267-04')).toBe(false)
    expect(isValidPeriodId('257-10')).toBe(false)
    expect(isValidPeriodId('2025-12')).toBe(true)
    expect(isValidPeriodId('2025-13')).toBe(false)
  })

  it('maps August 2026 to 01/08–31/08 (not UTC-shifted 31/07–30/08)', () => {
    expect(periodIdToCalendarBounds('2026-08')).toEqual({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    })
  })

  it('maps December 2025 to 01/12–31/12 without UTC day shift', () => {
    const bounds = periodIdToCalendarBounds('2025-12')
    expect(bounds).toEqual({
      startDate: '2025-12-01',
      endDate: '2025-12-31',
    })
  })

  it('maps February leap year correctly', () => {
    expect(periodIdToCalendarBounds('2024-02')).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    })
  })

  it('formatCalendarDate uses local components, not toISOString', () => {
    const localMidnight = new Date(2025, 11, 1, 0, 0, 0, 0)
    expect(formatCalendarDate(localMidnight)).toBe('2025-12-01')
  })

  it('heals periods stored with UTC-shifted start dates', () => {
    const broken = stubPeriod('2025-12', {
      startDate: '2025-11-30',
      endDate: '2025-12-30',
    })
    const healed = healPeriodCalendarDates(broken)
    expect(healed.startDate).toBe('2025-12-01')
    expect(healed.endDate).toBe('2025-12-31')
  })

  it('formats select labels with Australian date range', () => {
    expect(formatPeriodSelectLabel('2025-12', { isLocked: false })).toBe(
      'December 2025 (01/12/2025 – 31/12/2025) · Active'
    )
    expect(formatPeriodSelectLabel('2025-12', { isLocked: false, compact: true })).toBe(
      'December 2025 · Active'
    )
  })
})

describe('period opening chain', () => {
  it('navigates previous/next month ids across year boundary', () => {
    expect(previousPeriodId('2026-01')).toBe('2025-12')
    expect(nextPeriodId('2025-12')).toBe('2026-01')
  })

  it('uses Settings fallbacks when no prior closing', () => {
    expect(resolveChainedOpenings(null, 1000, 250)).toEqual({
      openingDirectorLoan: 1000,
      openingCash: 250,
    })
  })

  it('uses previous closing when chaining months', () => {
    expect(
      resolveChainedOpenings({ directorLoan: 4200, cash: 880 }, 1000, 250)
    ).toEqual({
      openingDirectorLoan: 4200,
      openingCash: 880,
    })
  })

  it('seeds from latest locked period before the open month', () => {
    const periods = [
      stubPeriod('2025-11', {
        isLocked: true,
        closingDirectorLoanBalance: 1500,
        closingCashBalance: 400,
      }),
      stubPeriod('2025-12', {
        isLocked: false,
        openingDirectorLoanBalance: 0,
        closingDirectorLoanBalance: 0,
      }),
    ]
    expect(seedOpeningsBeforePeriod('2025-12', periods, 0, 0)).toEqual({
      directorLoan: 1500,
      cash: 400,
    })
  })

  it('seeds from immediate prior unlocked closing when no lock exists', () => {
    const periods = [
      stubPeriod('2025-12', {
        closingDirectorLoanBalance: 2200,
        closingCashBalance: 900,
      }),
    ]
    expect(seedOpeningsBeforePeriod('2026-01', periods, 0, 0)).toEqual({
      directorLoan: 2200,
      cash: 900,
    })
  })
})

describe('period cash book (bank only)', () => {
  it('does not reduce Closing Cash for director-funded Cash Expense', () => {
    const bankFee = {
      date: '2026-06-01',
      debit: 10,
      credit: null,
      category: 'EXPENSE_BANK_FEES_INTEREST',
      department: 'cleaning',
      source: 'bank',
    }
    const directorAirfare = {
      date: '2026-06-15',
      debit: 500,
      credit: null,
      category: 'EXPENSE_TRAVEL_TRANSPORT',
      department: 'cleaning',
      source: 'manual',
      id: 'cash_airfare',
      fundedByDirector: true,
    }
    const result = calculatePeriodClosingBalances([bankFee, directorAirfare], 0, 1000, 0)
    // Bank fee only: 1000 - 10 = 990 (airfare never left the bank)
    expect(result.closingCashBalance).toBe(990)
    // DL still rises for director-funded airfare
    expect(result.closingDirectorLoanBalance).toBeCloseTo(500, 2)
  })
})

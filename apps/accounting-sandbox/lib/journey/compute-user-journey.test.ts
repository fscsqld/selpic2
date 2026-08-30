import { describe, expect, it } from 'vitest'
import { computeUserJourney } from '@/lib/journey/compute-user-journey'
import { classifyWithRules } from '@/lib/ai-classifier/rule-based-classifier'

describe('computeUserJourney S1', () => {
  const base = {
    profileComplete: true,
    transactionCount: 10,
    uncategorisedCount: 0,
    hasReviewedReports: true,
    allPeriodsLocked: true,
    hasLodgmentSnapshot: false,
  }

  it('skips payment summary step when skipPaymentSummary is true', () => {
    const journey = computeUserJourney({
      ...base,
      accountType: 'individual',
      paymentSummaryCount: 0,
      skipPaymentSummary: true,
    })
    expect(journey.steps.some((s) => s.id === 'payment_summary')).toBe(false)
    expect(journey.progressPercent).toBeGreaterThan(0)
  })

  it('includes payment summary when employment income expected', () => {
    const journey = computeUserJourney({
      ...base,
      accountType: 'individual',
      paymentSummaryCount: 0,
      skipPaymentSummary: false,
    })
    const step = journey.steps.find((s) => s.id === 'payment_summary')
    expect(step).toBeDefined()
    expect(step?.completed).toBe(false)
  })

  it('auto-completes period lock when not GST registered', () => {
    const journey = computeUserJourney({
      ...base,
      accountType: 'sole_trader',
      gstRegistered: false,
      allPeriodsLocked: false,
    })
    const lock = journey.steps.find((s) => s.id === 'period_lock')
    expect(lock?.completed).toBe(true)
    expect(journey.headline).toContain('annual return')
  })
})

describe('classifyWithRules', () => {
  it('marks unknown transactions as UNCATEGORIZED', () => {
    const result = classifyWithRules(
      {
        date: '2025-01-15',
        description: 'MYSTERY SHOP XYZ',
        debit: 42,
        credit: null,
        balance: null,
      },
      'individual',
      []
    )
    expect(result.category).toBe('UNCATEGORIZED')
  })

  it('classifies Hanaone Express as freight and shipping for business accounts', () => {
    const result = classifyWithRules(
      {
        date: '2026-04-01',
        description: 'Hanaone Express Z5284156011',
        debit: 153.2,
        credit: null,
        balance: 642.42,
      },
      'company',
      []
    )
    expect(result.category).toBe('EXPENSE_FREIGHT_SHIPPING')
    expect(result.department).toBe('cleaning')
  })

  it('classifies Stripe debit as merchant fees for business accounts', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-04',
        description: 'Stripe-zrar1cd92bj Stripe Selpic',
        debit: 0.68,
        credit: null,
        balance: 5064.89,
      },
      'company',
      []
    )
    expect(result.category).toBe('EXPENSE_MERCHANT_FEES')
    expect(result.department).toBe('cleaning')
  })

  it('classifies Cursor debit as software subscription for business accounts', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-10',
        description: 'Cursor Powered IDE Software',
        debit: 32,
        credit: null,
        balance: 5000,
      },
      'company',
      []
    )
    expect(result.category).toBe('EXPENSE_SOFTWARE_SUBSCRIPTIONS')
    expect(result.department).toBe('cleaning')
  })

  it('classifies Etsy credit as trading revenue for business accounts', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-12',
        description: 'ETSY MARKETPLACE PAYOUT',
        debit: null,
        credit: 240,
        balance: 5240,
      },
      'company',
      []
    )
    expect(result.category).toBe('INCOME_SALES_CLEANING')
    expect(result.department).toBe('cleaning')
  })

  it('classifies ATO BAS refund credit as non-taxable refund for business accounts', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-12',
        description: 'Ato79694194011i002 Ato Selpic',
        debit: null,
        credit: 18,
        balance: 7076.58,
      },
      'company',
      []
    )
    expect(result.category).toBe('NON_TAXABLE_ATO_GST_REFUND')
    expect(result.department).toBe('general')
  })

  it('classifies bank interest credit as other business income', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-20',
        description: 'INT CREDIT BUSINESS ACCOUNT',
        debit: null,
        credit: 4.21,
        balance: 7080.79,
      },
      'company',
      []
    )
    expect(result.category).toBe('INCOME_OTHER_BUSINESS')
    expect(result.department).toBe('cleaning')
  })

  it('classifies bank fee debit as bank fees and interest expense', () => {
    const result = classifyWithRules(
      {
        date: '2026-05-21',
        description: 'MONTHLY ACCOUNT FEE',
        debit: 10,
        credit: null,
        balance: 7070.79,
      },
      'company',
      []
    )
    expect(result.category).toBe('EXPENSE_BANK_FEES_INTEREST')
    expect(result.department).toBe('cleaning')
  })

  it('classifies NAB international transaction fee as bank fees', () => {
    const result = classifyWithRules(
      {
        date: '2026-03-26',
        description: 'Nab Intnl Tran Fee',
        debit: 1.53,
        credit: null,
        balance: 795.62,
      },
      'company',
      []
    )
    expect(result.category).toBe('EXPENSE_BANK_FEES_INTEREST')
  })

  it('detects transfer patterns', () => {
    const result = classifyWithRules(
      {
        date: '2025-01-15',
        description: 'OSKO TRANSFER FROM SAVINGS',
        debit: null,
        credit: 100,
        balance: null,
      },
      'individual',
      []
    )
    expect(result.category).toBe('NON_TAXABLE_TRANSFER')
  })
})

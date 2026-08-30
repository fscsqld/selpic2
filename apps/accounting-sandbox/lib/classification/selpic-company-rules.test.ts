import { describe, expect, it } from 'vitest'
import { classifyWithRules } from '@/lib/ai-classifier/rule-based-classifier'
import { detectSelpicCompanyRule } from '@/lib/classification/selpic-company-rules'
import { applyKnownExpenseCategoriesIfMissing } from '@/lib/classification/apply-known-expense-categories'

const DIRECTOR = 'Jinsoo Kim'

/** User-verified company statement rows (Apr–Jun 2026) */
const USER_VERIFIED_ROWS = [
  { description: 'Hanaone Express', debit: 153.2, credit: null, category: 'EXPENSE_FREIGHT_SHIPPING' },
  { description: 'Mr Jinsoo Kim Loan', debit: null, credit: 500, category: 'LIABILITY_DIRECTORS_LOAN' },
  { description: 'Mjr', debit: 310.2, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR' },
  { description: 'Associated Cleaning', debit: null, credit: 3526.6, category: 'INCOME_SALES_CLEANING' },
  { description: 'Gravatt East)', debit: 45.59, credit: null, category: 'EXPENSE_FUEL_TRAVEL' },
  { description: 'Liberty', debit: 84.04, credit: null, category: 'EXPENSE_FUEL_TRAVEL' },
  { description: 'MJR Enterprise', debit: 248.16, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR' },
  { description: 'BP', debit: 61.64, credit: null, category: 'EXPENSE_FUEL_TRAVEL' },
  { description: 'AK Innovation', debit: null, credit: 2112, category: 'INCOME_SALES_CLEANING' },
  { description: 'Tk Maxx', debit: 89.98, credit: null, category: 'EXPENSE_OFFICE_SUPPLIES' },
  { description: 'Oomenrgy Logan', debit: 62.43, credit: null, category: 'EXPENSE_FUEL_TRAVEL' },
  { description: 'Caltex', debit: 58.58, credit: null, category: 'EXPENSE_FUEL_TRAVEL' },
  { description: 'Stripe', debit: null, credit: 0.68, category: 'INCOME_SALES_CLEANING' },
  { description: 'Google Australia', debit: 9.52, credit: null, category: 'EXPENSE_SOFTWARE_SUBSCRIPTIONS' },
  { description: 'OKTAX', debit: 1133, credit: null, category: 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES' },
  { description: 'Ato79694194011i002 Ato Selpic', debit: 18, credit: null, category: 'NON_TAXABLE_ATO_GST_REFUND' },
  { description: 'Etsy', debit: 26, credit: null, category: 'EXPENSE_MERCHANT_FEES' },
  { description: 'Jason Selpic', debit: null, credit: 1012, category: 'INCOME_SALES_CLEANING' },
  { description: 'Cyc Company Pty', debit: 279.18, credit: null, category: 'EXPENSE_CLEANING_SUBCONTRACTOR' },
  { description: 'Vistaprint', debit: 85.18, credit: null, category: 'EXPENSE_MARKETING' },
  { description: 'Mr Jinsoo Kim Return', debit: null, credit: 50.85, category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN' },
  { description: 'Jinsoo Kim Z3533358260', debit: 50.85, credit: null, category: 'NON_TAXABLE_ERRONEOUS_PAYMENT_OUT' },
  { description: 'Jinsoo Kim V7533652037', debit: 129.6, credit: null, category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT' },
] as const

describe('company rules with Settings director name', () => {
  it.each(USER_VERIFIED_ROWS)(
    'classifies "$description" as $category',
    ({ description, debit, credit, category }) => {
      const result = classifyWithRules(
        { date: '2026-04-01', description, debit, credit },
        'company',
        [],
        DIRECTOR
      )
      expect(result.category).toBe(category)
      expect(result.department).toBe('cleaning')
    }
  )

  it('does not treat another person as director without Settings name', () => {
    const result = classifyWithRules(
      { date: '2026-04-01', description: 'Jinsoo Kim V7533652037', debit: 129.6, credit: null },
      'company',
      [],
      ''
    )
    expect(result.category).not.toBe('NON_TAXABLE_DIRECTOR_REIMBURSEMENT')
  })

  it('uses any configured director name', () => {
    const result = classifyWithRules(
      { date: '2026-04-01', description: 'Sarah Chen Loan', debit: null, credit: 2000 },
      'company',
      [],
      'Sarah Chen'
    )
    expect(result.category).toBe('LIABILITY_DIRECTORS_LOAN')
  })

  it('re-applies rules to uncategorized legacy rows on load', () => {
    const legacy = USER_VERIFIED_ROWS.map((row) => ({
      description: row.description,
      debit: row.debit,
      credit: row.credit,
      category: 'UNCATEGORIZED',
    }))
    const fixed = applyKnownExpenseCategoriesIfMissing(legacy, DIRECTOR)
    for (let i = 0; i < USER_VERIFIED_ROWS.length; i++) {
      expect(fixed[i].category).toBe(USER_VERIFIED_ROWS[i].category)
    }
  })

  it('migrates misclassified Refund/Reimbursement debits on load', () => {
    const legacy = [
      {
        description: 'Jinsoo Kim K2295369739',
        debit: 2334.2,
        credit: null,
        category: 'INCOME_REFUND_REIMBURSEMENT',
      },
    ]
    const fixed = applyKnownExpenseCategoriesIfMissing(legacy, DIRECTOR)
    expect(fixed[0].category).toBe('NON_TAXABLE_DIRECTOR_REIMBURSEMENT')
  })

  it('migrates Jinsoo Return debit + Z-ref from Refund to erroneous pair', () => {
    const legacy = [
      {
        description: 'Mr Jinsoo Kim Return',
        debit: 50.85,
        credit: null,
        category: 'INCOME_REFUND_REIMBURSEMENT',
      },
      {
        description: 'Jinsoo Kim Z3533358260',
        debit: 50.85,
        credit: null,
        category: 'INCOME_REFUND_REIMBURSEMENT',
      },
      {
        description: 'Google Australia',
        debit: 12.98,
        credit: null,
        category: 'EXPENSE_MERCHANT_FEES',
      },
    ]
    const fixed = applyKnownExpenseCategoriesIfMissing(legacy, DIRECTOR)
    expect(fixed[0].category).toBe('NON_TAXABLE_ERRONEOUS_PAYMENT_RETURN')
    expect(fixed[0].credit).toBe(50.85)
    expect(fixed[0].debit).toBeNull()
    expect(fixed[1].category).toBe('NON_TAXABLE_ERRONEOUS_PAYMENT_OUT')
    expect(fixed[2].category).toBe('EXPENSE_SOFTWARE_SUBSCRIPTIONS')
  })

  it('swaps director Loan debit mis-parse to credit + Director Loan', () => {
    const result = classifyWithRules(
      {
        date: '2026-04-01',
        description: 'Mr Jinsoo Kim Loan',
        debit: 500,
        credit: null,
      },
      'company',
      [],
      DIRECTOR
    )
    expect(result.category).toBe('LIABILITY_DIRECTORS_LOAN')
  })

  it('keeps Jason Selpic 2025 credit as trading revenue (date unchanged by rules)', () => {
    const result = classifyWithRules(
      {
        date: '2025-05-18',
        description: 'Jason Selpic',
        debit: null,
        credit: 1012,
      },
      'company',
      [],
      DIRECTOR
    )
    expect(result.category).toBe('INCOME_SALES_CLEANING')
  })

  it('migrates Loan Refund misclass + debit column to Director Loan credit', () => {
    const fixed = applyKnownExpenseCategoriesIfMissing(
      [
        {
          description: 'Mr Jinsoo Kim Loan',
          debit: 500,
          credit: null,
          category: 'INCOME_REFUND_REIMBURSEMENT',
        },
      ],
      DIRECTOR
    )
    expect(fixed[0].category).toBe('LIABILITY_DIRECTORS_LOAN')
    expect(fixed[0].credit).toBe(500)
    expect(fixed[0].debit).toBeNull()
  })

  it('migrates Oomenrgy Cleaning Supplies misclass to Fuel', () => {
    const fixed = applyKnownExpenseCategoriesIfMissing(
      [
        {
          description: 'Oomenrgy Logan',
          debit: 62.43,
          credit: null,
          category: 'EXPENSE_CLEANING_SUPPLIES',
        },
      ],
      DIRECTOR
    )
    expect(fixed[0].category).toBe('EXPENSE_FUEL_TRAVEL')
  })

  it('classifies Nab Intnl Tran Fee as bank fees, not office supplies', () => {
    const match = detectSelpicCompanyRule('Nab Intnl Tran Fee', 1.53, null, DIRECTOR)
    expect(match?.category).toBe('EXPENSE_BANK_FEES_INTEREST')

    const fixed = applyKnownExpenseCategoriesIfMissing(
      [
        {
          description: 'Nab Intnl Tran Fee',
          debit: 1.53,
          credit: null,
          category: 'EXPENSE_OFFICE_SUPPLIES',
        },
      ],
      DIRECTOR
    )
    expect(fixed[0].category).toBe('EXPENSE_BANK_FEES_INTEREST')
  })

  it('classifies initial share capital as equity, not director reimbursement', () => {
    const desc = 'MR JINSOO KIM Initial capital 100 shares issued a $100.00'
    const asCredit = detectSelpicCompanyRule(desc, null, 100, DIRECTOR)
    expect(asCredit?.category).toBe('EQUITY_SHARE_CAPITAL')
    expect(asCredit?.swapDebitToCredit).toBeFalsy()

    const asDebitMisparse = detectSelpicCompanyRule(desc, 100, null, DIRECTOR)
    expect(asDebitMisparse?.category).toBe('EQUITY_SHARE_CAPITAL')
    expect(asDebitMisparse?.swapDebitToCredit).toBe(true)

    const truncated = detectSelpicCompanyRule('Mr Jinsoo Kim Initial', 100, null, DIRECTOR)
    expect(truncated?.category).toBe('EQUITY_SHARE_CAPITAL')

    const fixedFull = applyKnownExpenseCategoriesIfMissing(
      [
        {
          description: desc,
          debit: 100,
          credit: null,
          category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        },
      ],
      DIRECTOR
    )
    expect(fixedFull[0].category).toBe('EQUITY_SHARE_CAPITAL')
    expect(fixedFull[0].credit).toBe(100)
    expect(fixedFull[0].debit).toBeNull()

    const fixedTruncated = applyKnownExpenseCategoriesIfMissing(
      [
        {
          description: 'Mr Jinsoo Kim Initial',
          debit: 100,
          credit: null,
          category: 'NON_TAXABLE_DIRECTOR_REIMBURSEMENT',
        },
      ],
      DIRECTOR
    )
    expect(fixedTruncated[0].category).toBe('EQUITY_SHARE_CAPITAL')
    expect(fixedTruncated[0].credit).toBe(100)
  })

  it('detects director loan flag', () => {
    const match = detectSelpicCompanyRule('Mr Jinsoo Kim Loan', null, 500, DIRECTOR)
    expect(match?.category).toBe('LIABILITY_DIRECTORS_LOAN')
    expect(match?.isDirectorsLoan).toBe(true)
  })

  it('detects director loan debit mis-parse with swap flag', () => {
    const match = detectSelpicCompanyRule('Mr Jinsoo Kim Loan', 500, null, DIRECTOR)
    expect(match?.category).toBe('LIABILITY_DIRECTORS_LOAN')
    expect(match?.swapDebitToCredit).toBe(true)
  })
})

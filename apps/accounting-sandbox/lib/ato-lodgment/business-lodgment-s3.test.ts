import { describe, expect, it } from 'vitest'
import {
  COMPANY_TAX_RATE_SMALL,
  COMPANY_TAX_RATE_STANDARD,
  resolveCompanyTaxRate,
} from '@/lib/ato-lodgment/business-profile-tax'
import { buildBasReconcileResult } from '@/lib/ato-lodgment/bas-lodgment-reconcile'

describe('resolveCompanyTaxRate', () => {
  it('returns 25% for small business company', () => {
    expect(
      resolveCompanyTaxRate({
        accountType: 'company',
        smallBusinessEntity: true,
      })
    ).toBe(COMPANY_TAX_RATE_SMALL)
  })

  it('returns 30% when explicitly standard', () => {
    expect(
      resolveCompanyTaxRate({
        accountType: 'company',
        companyTaxRate: COMPANY_TAX_RATE_STANDARD,
      })
    ).toBe(COMPANY_TAX_RATE_STANDARD)
  })

  it('returns 25% for sole trader profile', () => {
    expect(resolveCompanyTaxRate({ accountType: 'sole_trader' })).toBe(COMPANY_TAX_RATE_SMALL)
  })
})

describe('buildBasReconcileResult', () => {
  it('reports match lodgment for empty period', () => {
    const result = buildBasReconcileResult({
      transactions: [],
      openingDirectorLoanBalance: 0,
      accountType: 'sole_trader',
      periodStart: '2025-07-01',
      periodEnd: '2025-09-30',
      periodLabel: 'Q1 2025-2026',
      periodType: 'quarterly',
    })
    expect(result.allOk).toBe(true)
    expect(result.rows.length).toBe(4)
  })
})

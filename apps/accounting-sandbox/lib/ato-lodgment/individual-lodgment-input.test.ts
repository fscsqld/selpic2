import { describe, expect, it } from 'vitest'
import {
  buildEffectiveIndividualOverrides,
  buildIndividualWorksheetHints,
  computePersonalTaxLodgment,
} from '@/lib/ato-lodgment/individual-lodgment-input'
import { buildMyTaxOutsideSections } from '@/lib/ato-lodgment/mytax-outside-app-sections'
import { buildMyTaxIndividualFields } from '@/lib/ato-lodgment/mytax-individual-field-map'

describe('individual lodgment input (Reports = Lodgment)', () => {
  const emptyHints = {
    salaryDeposits: 0,
    interest: 500,
    dividends: 0,
    govtPayments: 0,
    businessIncome: 0,
    otherIncome: 0,
    workDeductions: 100,
    giftsDonations: 0,
    taxAffairs: 0,
    otherDeductions: 0,
    paygWithheldHint: 0,
  }

  it('merges payment summary into overrides when not manually set', () => {
    const merged = buildEffectiveIndividualOverrides(
      {},
      { grossPayments: 80000, taxWithheld: 18000, count: 1 },
      {
        rental: 0,
        cgt: 0,
        rentalCount: 0,
        cgtCount: 0,
        rentalHasData: false,
        cgtHasData: false,
        active: false,
      }
    )
    expect(merged.salary).toBe(80000)
    expect(merged.taxWithheld).toBe(18000)
  })

  it('manual override wins over payment summary', () => {
    const merged = buildEffectiveIndividualOverrides(
      { salary: 75000 },
      { grossPayments: 80000, taxWithheld: 18000, count: 1 },
      {
        rental: 0,
        cgt: 0,
        rentalCount: 0,
        cgtCount: 0,
        rentalHasData: false,
        cgtHasData: false,
        active: false,
      }
    )
    expect(merged.salary).toBe(75000)
  })

  it('computePersonalTaxLodgment matches direct path with same inputs', () => {
    const transactions = [
      {
        date: '2025-08-01',
        description: 'INTEREST CREDIT',
        debit: null,
        credit: 500,
        category: 'INCOME_OTHER',
      },
      {
        date: '2025-09-01',
        description: 'OFFICE SUPPLIES',
        debit: 100,
        credit: null,
        category: 'EXPENSE_OFFICE_SUPPLIES',
      },
    ]
    const paymentTotals = { grossPayments: 60000, taxWithheld: 12000, count: 1 }
    const worksheetNets = {
      rental: 5000,
      cgt: 0,
      rentalCount: 1,
      cgtCount: 0,
      rentalHasData: true,
      cgtHasData: false,
      active: true,
    }
    const overrides = { interest: 500 }

    const result = computePersonalTaxLodgment(
      transactions,
      '2025-2026',
      overrides,
      paymentTotals,
      worksheetNets
    )

    const salary = result.fields.find((f) => f.id === 'IND_SALARY')?.amount
    const rental = result.fields.find((f) => f.id === 'IND_RENTAL')?.amount
    expect(salary).toBe(60000)
    expect(rental).toBe(5000)
  })
})

describe('myTax outside app sections', () => {
  it('includes franking section when dividends are present', () => {
    const fields = buildMyTaxIndividualFields(
      {
        salaryDeposits: 0,
        interest: 0,
        dividends: 1200,
        govtPayments: 0,
        businessIncome: 0,
        otherIncome: 0,
        workDeductions: 0,
        giftsDonations: 0,
        taxAffairs: 0,
        otherDeductions: 0,
        paygWithheldHint: 0,
      },
      {},
      {}
    )
    const sections = buildMyTaxOutsideSections(fields)
    expect(sections.some((s) => s.id === 'franking_credits')).toBe(true)
  })
})

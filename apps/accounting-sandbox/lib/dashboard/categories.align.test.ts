import { describe, expect, it } from 'vitest'
import {
  CASH_EXPENSE_CATEGORIES,
  TRANSACTION_CATEGORIES,
} from '@/lib/dashboard/categories'
import { getTransactionCategoryLabel } from '@/lib/dashboard/category-labels'

describe('Cash Expense vs Transaction History categories', () => {
  it('uses the same category code list', () => {
    expect([...CASH_EXPENSE_CATEGORIES]).toEqual([...TRANSACTION_CATEGORIES])
  })

  it('maps travel and equity codes to History display labels (not raw codes)', () => {
    expect(getTransactionCategoryLabel('EXPENSE_TRAVEL_TRANSPORT')).toBe(
      'Travel - Transport'
    )
    expect(getTransactionCategoryLabel('EXPENSE_TRAVEL_MEALS')).toBe(
      'Travel - Meals'
    )
    expect(getTransactionCategoryLabel('EXPENSE_TRAVEL_PARKING_TOLLS')).toBe(
      'Travel - Parking/Tolls'
    )
    expect(getTransactionCategoryLabel('EQUITY_SHARE_CAPITAL')).toBe(
      'Share Capital'
    )
    expect(getTransactionCategoryLabel('INCOME_REFUND_REIMBURSEMENT')).toBe(
      'Refund/Reimbursement'
    )
    expect(getTransactionCategoryLabel('INCOME_OTHER_BUSINESS')).toBe(
      'Other Business Income'
    )
    expect(getTransactionCategoryLabel('CASH_EXPENSE_PETTY')).toBe(
      'Cash & Petty Cash'
    )
  })

  it('every History/Cash category has a human label (not the raw code)', () => {
    for (const code of TRANSACTION_CATEGORIES) {
      const label = getTransactionCategoryLabel(code)
      expect(label).not.toBe(code)
      expect(label.length).toBeGreaterThan(0)
    }
  })
})

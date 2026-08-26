/**
 * Legacy payroll ASSET_CASH credit → wages payable heal.
 */

import { describe, expect, it } from 'vitest'
import { LIABILITY_WAGES_PAYABLE } from '@/src/features/payroll/bookkeeping'
import {
  countLegacyPayrollCashCredits,
  healLegacyPayrollCashCreditTx,
} from '@/lib/payroll/heal-legacy-payroll-cash'

describe('heal-legacy-payroll-cash', () => {
  it('counts only payroll ASSET_CASH credits', () => {
    const txs = [
      { id: '1', source: 'payroll', category: 'ASSET_CASH', credit: 1000 },
      { id: '2', source: 'payroll', category: LIABILITY_WAGES_PAYABLE, credit: 900 },
      { id: '3', source: 'bank', category: 'ASSET_CASH', credit: 50 },
      { id: '4', source: 'payroll', category: 'ASSET_CASH', debit: 100 },
    ]
    expect(countLegacyPayrollCashCredits(txs)).toBe(1)
  })

  it('rewrites category to wages payable and marks meta', () => {
    const healed = healLegacyPayrollCashCreditTx({
      id: 'tx1',
      source: 'payroll',
      category: 'ASSET_CASH',
      credit: 2100,
      description: 'Net Pay - Sam',
      payrollMeta: { payslipId: 'ps1' },
    })
    expect(healed).not.toBeNull()
    expect(healed!.category).toBe(LIABILITY_WAGES_PAYABLE)
    expect(healed!.payrollMeta?.healedFromLegacyCash).toBe(true)
    expect(healed!.payrollMeta?.journalKind).toBe('accrual')
    expect(String(healed!.description)).toMatch(/Wages payable/i)
  })

  it('returns null for non-legacy rows', () => {
    expect(
      healLegacyPayrollCashCreditTx({
        source: 'payroll',
        category: LIABILITY_WAGES_PAYABLE,
        credit: 100,
      })
    ).toBeNull()
  })
})

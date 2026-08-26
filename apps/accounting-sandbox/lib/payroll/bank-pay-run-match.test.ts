import { describe, expect, it } from 'vitest'
import {
  amountNearlyEqual,
  buildBankClearPatch,
  classifyPayrollBankDebit,
  isUnmatchedWageExpenseRisk,
  suggestPayRunBankMatches,
  LIABILITY_WAGES_PAYABLE,
} from '@/src/features/payroll/bank-pay-run-match'
import { LIABILITY_WAGES_PAYABLE as WAGES_PAYABLE } from '@/src/features/payroll/bookkeeping'
import type { Payslip } from '@/src/features/payroll/types'
import type { Employee } from '@/src/shared/types/employee'

const emp: Employee = {
  id: '1',
  name: 'Alex Worker',
  employeeId: 'E001',
  type: 'employee',
  superannuationRate: 0.11,
  payFrequency: 'fortnightly',
  isActive: true,
  bankAccount: { bsb: '062000', accountNumber: '12345678', accountName: 'Alex Worker' },
  createdAt: '',
  updatedAt: '',
}

const payslip: Payslip = {
  id: 'ps1',
  employeeId: 'E001',
  employeeName: 'Alex Worker',
  payPeriod: { start: '2026-05-11', end: '2026-05-17' },
  grossPay: 2000,
  taxWithheld: 300,
  superannuation: 220,
  netPay: 1700,
  payDate: '2026-05-18',
  status: 'approved',
  createdAt: '',
  updatedAt: '',
}

describe('bank-pay-run-match (Phase 4)', () => {
  it('classifies bank debit kinds', () => {
    expect(classifyPayrollBankDebit('PAY RUN ALEX WORKER')).toBe('net_wages')
    expect(classifyPayrollBankDebit('ATO PAYG WITHHOLDING')).toBe('payg_remittance')
    expect(classifyPayrollBankDebit('REST SUPER CLEARING')).toBe('super_remittance')
  })

  it('suggests net match by amount + name and builds liability clear patch', () => {
    const suggestions = suggestPayRunBankMatches(
      [
        {
          date: '2026-05-18',
          description: 'PAY ALEX WORKER 12345678',
          debit: 1700,
          category: 'EXPENSE_WAGES_SALARIES',
          source: 'bank',
        },
      ],
      [payslip],
      [emp]
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].payslipId).toBe('ps1')
    expect(suggestions[0].confidence).toBe('high')

    const patch = buildBankClearPatch(suggestions[0])
    expect(patch.category).toBe(WAGES_PAYABLE)
    expect(patch.clearsPayrollLiability).toBe(true)
    expect(patch.isPayrollTransaction).toBe(false)
    expect(isUnmatchedWageExpenseRisk({ ...suggestions[0].bank, ...patch })).toBe(
      false
    )
  })

  it('amountNearlyEqual and wage expense risk helpers', () => {
    expect(amountNearlyEqual(1700, 1700.01)).toBe(true)
    expect(
      isUnmatchedWageExpenseRisk({
        date: '2026-05-01',
        description: 'WAGES',
        debit: 100,
        category: 'EXPENSE_WAGES_SALARIES',
      })
    ).toBe(true)
    expect(LIABILITY_WAGES_PAYABLE || WAGES_PAYABLE).toBeTruthy()
  })
})

import { describe, expect, it } from 'vitest'
import {
  createPayrollJournalEntries,
  approvePayrollAndCreateTransactions,
  isLegacyPayrollCashCredit,
  LIABILITY_WAGES_PAYABLE,
} from './bookkeeping'
import type { Employee } from '../../shared/types/employee'
import type { Payslip } from './types'

const employee: Employee = {
  id: 'emp_1',
  name: 'Alex Worker',
  employeeId: 'E001',
  type: 'employee',
  superannuationRate: 0.11,
  payFrequency: 'fortnightly',
  isActive: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const payslip: Payslip = {
  id: 'payslip_ts_1_1',
  employeeId: 'emp_1',
  employeeName: 'Alex Worker',
  payPeriod: { start: '2026-05-01', end: '2026-05-14' },
  grossPay: 2000,
  taxWithheld: 300,
  superannuation: 220,
  netPay: 1700,
  payDate: '2026-05-15',
  status: 'draft',
  createdAt: '2026-05-15',
  updatedAt: '2026-05-15',
}

describe('payroll accrual bookkeeping (Phase 0)', () => {
  it('balances and never credits ASSET_CASH — net goes to wages payable', () => {
    const journal = createPayrollJournalEntries(payslip, employee)
    expect(journal.totalDebit).toBe(journal.totalCredit)
    expect(journal.totalDebit).toBe(2220) // gross + super

    const accounts = journal.entries.map((e) => e.account)
    expect(accounts).not.toContain('ASSET_CASH')
    expect(accounts).toContain(LIABILITY_WAGES_PAYABLE)

    const netLine = journal.entries.find((e) => e.account === LIABILITY_WAGES_PAYABLE)
    expect(netLine?.credit).toBe(1700)
  })

  it('contractor: wages payable = gross when no PAYG/super', () => {
    const contractor: Employee = {
      ...employee,
      type: 'contractor',
      superannuationRate: 0,
    }
    const slip: Payslip = {
      ...payslip,
      taxWithheld: 0,
      superannuation: 0,
      netPay: 2000,
    }
    const journal = createPayrollJournalEntries(slip, contractor)
    expect(journal.totalDebit).toBe(journal.totalCredit)
    expect(journal.entries.some((e) => e.account === 'ASSET_CASH')).toBe(false)
    expect(
      journal.entries.find((e) => e.account === LIABILITY_WAGES_PAYABLE)?.credit
    ).toBe(2000)
  })

  it('approvePayrollAndCreateTransactions tags accrual meta', () => {
    const txs = approvePayrollAndCreateTransactions({ ...payslip }, employee)
    expect(txs.every((t) => t.source === 'payroll')).toBe(true)
    expect(txs.some((t) => t.category === 'ASSET_CASH')).toBe(false)
    expect(txs.some((t) => t.category === LIABILITY_WAGES_PAYABLE)).toBe(true)
    expect(txs[0]?.payrollMeta?.journalKind).toBe('accrual')
  })

  it('detects legacy cash-credit payroll rows', () => {
    expect(
      isLegacyPayrollCashCredit({
        source: 'payroll',
        category: 'ASSET_CASH',
        credit: 100,
      })
    ).toBe(true)
    expect(
      isLegacyPayrollCashCredit({
        source: 'payroll',
        category: LIABILITY_WAGES_PAYABLE,
        credit: 100,
      })
    ).toBe(false)
  })
})

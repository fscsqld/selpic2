import { describe, expect, it } from 'vitest'
import {
  buildAbaFile,
  dollarsToAbaCents,
  formatAbaBsb,
  inferFinancialInstitutionFromBsb,
} from '@/src/features/payroll/aba-export'
import { computeRemittanceDue } from '@/src/features/payroll/remittance-due'
import type { Payslip } from '@/src/features/payroll/types'
import { COMPANY_BANK } from '@/lib/companyLegal'

describe('aba-export (Phase 5)', () => {
  it('formats BSB and builds 120-char ABA lines', () => {
    expect(formatAbaBsb('084034')).toBe('084-034')
    expect(dollarsToAbaCents(1700.5)).toBe(170050)

    const file = buildAbaFile(
      {
        financialInstitution: inferFinancialInstitutionFromBsb(COMPANY_BANK.bsb),
        userName: 'SELPIC PTY LTD',
        userIdNumber: '000000',
        bsb: COMPANY_BANK.bsb,
        accountNumber: COMPANY_BANK.accountNumber,
        remitterName: 'SELPIC',
      },
      [
        {
          bsb: '062-000',
          accountNumber: '12345678',
          accountName: 'Alex Worker',
          amount: 1700,
          lodgementReference: 'PAY E001',
        },
      ]
    )

    const lines = file.trim().split(/\r?\n/)
    expect(lines).toHaveLength(3)
    expect(lines[0][0]).toBe('0')
    expect(lines[1][0]).toBe('1')
    expect(lines[2][0]).toBe('7')
    expect(lines.every((l) => l.length === 120)).toBe(true)
  })
})

describe('remittance-due (Phase 5)', () => {
  it('computes PAYG/Super due minus bank clears', () => {
    const slips: Payslip[] = [
      {
        id: '1',
        employeeId: 'E001',
        employeeName: 'A',
        payPeriod: { start: '2026-05-01', end: '2026-05-14' },
        grossPay: 2000,
        taxWithheld: 300,
        superannuation: 220,
        netPay: 1700,
        payDate: '2026-05-15',
        status: 'approved',
        createdAt: '',
        updatedAt: '',
      },
    ]
    const summary = computeRemittanceDue(slips, [
      {
        date: '2026-05-20',
        description: 'ATO PAYG',
        debit: 100,
        clearsPayrollLiability: true,
        payrollClearKind: 'payg_remittance',
      },
    ])
    expect(summary.paygAccrued).toBe(300)
    expect(summary.paygCleared).toBe(100)
    expect(summary.paygDue).toBe(200)
    expect(summary.superDue).toBe(220)
    expect(summary.netAwaitingTransfer).toBe(1700)
    expect(summary.netAwaitingCount).toBe(1)
  })
})

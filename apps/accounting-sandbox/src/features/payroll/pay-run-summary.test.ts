import { describe, expect, it } from 'vitest'
import { summarizePayRun, countApprovedUnpaidTimesheets } from './pay-run-summary'
import type { Payslip } from './types'

describe('pay-run-summary (Phase 1)', () => {
  it('splits approved vs paid and sums net awaiting bank transfer', () => {
    const slips: Payslip[] = [
      {
        id: 'a',
        employeeId: '1',
        employeeName: 'A',
        payPeriod: { start: '2026-05-01', end: '2026-05-14' },
        grossPay: 1000,
        taxWithheld: 100,
        superannuation: 110,
        netPay: 900,
        payDate: '2026-05-15',
        status: 'approved',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'b',
        employeeId: '2',
        employeeName: 'B',
        payPeriod: { start: '2026-05-01', end: '2026-05-14' },
        grossPay: 2000,
        taxWithheld: 200,
        superannuation: 220,
        netPay: 1800,
        payDate: '2026-05-15',
        status: 'paid',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'c',
        employeeId: '3',
        employeeName: 'C',
        payPeriod: { start: '2026-05-01', end: '2026-05-14' },
        grossPay: 500,
        taxWithheld: 0,
        superannuation: 0,
        netPay: 500,
        payDate: '2026-05-15',
        status: 'draft',
        createdAt: '',
        updatedAt: '',
      },
    ]

    const s = summarizePayRun(slips)
    expect(s.awaitingPayment.count).toBe(1)
    expect(s.awaitingPayment.netPay).toBe(900)
    expect(s.paid.count).toBe(1)
    expect(s.netAwaitingBankTransfer).toBe(900)
    expect(s.paygAccrued).toBe(300)
    expect(s.superAccrued).toBe(330)
  })

  it('counts approved unpaid timesheets', () => {
    expect(
      countApprovedUnpaidTimesheets([
        { status: 'approved' } as any,
        { status: 'paid' } as any,
        { status: 'submitted' } as any,
      ])
    ).toBe(1)
  })
})

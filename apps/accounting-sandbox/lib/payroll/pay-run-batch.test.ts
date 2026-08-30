import { describe, expect, it } from 'vitest'
import {
  buildPayRunNetPayCsv,
  buildPayRunPreviewLines,
  filterSubmittedForPayRun,
  summarizePayRunPreviewLines,
  timesheetOverlapsPeriod,
} from '@/src/features/payroll/pay-run-batch'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'
import type { Employee } from '@/src/shared/types/employee'

const emp: Employee = {
  id: '1',
  name: 'Alex',
  employeeId: 'E001',
  type: 'employee',
  superannuationRate: 0.11,
  payFrequency: 'fortnightly',
  isActive: true,
  bankAccount: { bsb: '062000', accountNumber: '12345678', accountName: 'Alex' },
  createdAt: '',
  updatedAt: '',
}

function ts(partial: Partial<Timesheet> & Pick<Timesheet, 'id' | 'status'>): Timesheet {
  return {
    employeeId: 'E001',
    employeeName: 'Alex',
    payPeriod: { start: '2026-05-11', end: '2026-05-17' },
    entries: [],
    totalHours: 38,
    totalRegularHours: 38,
    totalOvertimeHours: 0,
    grossPay: 2000,
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('pay-run-batch (Phase 3)', () => {
  it('detects period overlap and filters submitted only', () => {
    expect(
      timesheetOverlapsPeriod(
        ts({ id: 'a', status: 'submitted' }),
        '2026-05-01',
        '2026-05-31'
      )
    ).toBe(true)
    expect(
      timesheetOverlapsPeriod(
        ts({ id: 'a', status: 'submitted' }),
        '2026-06-01',
        '2026-06-30'
      )
    ).toBe(false)

    const list = [
      ts({ id: 'a', status: 'submitted' }),
      ts({ id: 'b', status: 'approved' }),
      ts({ id: 'c', status: 'draft' }),
    ]
    expect(filterSubmittedForPayRun(list, '2026-05-01', '2026-05-31')).toHaveLength(1)
  })

  it('builds preview lines with PAYG/super and totals', () => {
    const map = new Map([['E001', emp]])
    const lines = buildPayRunPreviewLines(
      [ts({ id: 'a', status: 'submitted', grossPay: 2000 })],
      map,
      '2026-05-01',
      '2026-05-31'
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].selected).toBe(true)
    expect(lines[0].grossPay).toBe(2000)
    expect(lines[0].netPay).toBeLessThan(2000)
    expect(lines[0].superannuation).toBe(220)

    const totals = summarizePayRunPreviewLines(lines)
    expect(totals.count).toBe(1)
    expect(totals.grossPay).toBe(2000)
    expect(totals.netPay).toBe(lines[0].netPay)
  })

  it('exports net-pay CSV for selected lines', () => {
    const map = new Map([['E001', emp]])
    const lines = buildPayRunPreviewLines(
      [ts({ id: 'a', status: 'submitted', grossPay: 1000 })],
      map,
      '2026-05-01',
      '2026-05-31'
    )
    const csv = buildPayRunNetPayCsv(lines)
    expect(csv.split('\n')[0]).toContain('netPay')
    expect(csv).toContain('Alex')
    expect(csv).toContain('062000')
  })
})

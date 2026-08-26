/**
 * Batch Pay Run preview lines (Phase 3) — submitted timesheets → calculated amounts.
 */

import { calculatePayroll } from '@/src/features/payroll/calculator'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'
import type { Employee } from '@/src/shared/types/employee'
import type { PayRunTotals } from '@/src/features/payroll/pay-run-summary'

export interface PayRunPreviewLine {
  timesheetId: string
  employeeId: string
  employeeName: string
  payPeriodStart: string
  payPeriodEnd: string
  totalHours: number
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
  bsb?: string
  accountNumber?: string
  accountName?: string
  selected: boolean
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** Inclusive overlap of timesheet pay period with [rangeStart, rangeEnd]. */
export function timesheetOverlapsPeriod(
  timesheet: Timesheet,
  rangeStart: string,
  rangeEnd: string
): boolean {
  const ts = timesheet.payPeriod?.start
  const te = timesheet.payPeriod?.end
  if (!ts || !te || !rangeStart || !rangeEnd) return false
  return ts <= rangeEnd && te >= rangeStart
}

export function filterSubmittedForPayRun(
  timesheets: Timesheet[],
  rangeStart: string,
  rangeEnd: string
): Timesheet[] {
  return timesheets.filter(
    (t) => t.status === 'submitted' && timesheetOverlapsPeriod(t, rangeStart, rangeEnd)
  )
}

export function buildPayRunPreviewLines(
  timesheets: Timesheet[],
  employeesByLoginId: Map<string, Employee>,
  rangeStart: string,
  rangeEnd: string
): PayRunPreviewLine[] {
  const submitted = filterSubmittedForPayRun(timesheets, rangeStart, rangeEnd)
  const lines: PayRunPreviewLine[] = []

  for (const ts of submitted) {
    const emp = employeesByLoginId.get(ts.employeeId)
    if (!emp) {
      lines.push({
        timesheetId: ts.id,
        employeeId: ts.employeeId,
        employeeName: ts.employeeName || ts.employeeId,
        payPeriodStart: ts.payPeriod.start,
        payPeriodEnd: ts.payPeriod.end,
        totalHours: ts.totalHours || 0,
        grossPay: ts.grossPay || 0,
        taxWithheld: 0,
        superannuation: 0,
        netPay: ts.grossPay || 0,
        selected: false,
      })
      continue
    }

    const calc = calculatePayroll(emp, ts.grossPay || 0)
    lines.push({
      timesheetId: ts.id,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      payPeriodStart: ts.payPeriod.start,
      payPeriodEnd: ts.payPeriod.end,
      totalHours: ts.totalHours || 0,
      grossPay: calc.grossPay,
      taxWithheld: calc.taxWithheld,
      superannuation: calc.superannuation,
      netPay: calc.netPay,
      bsb: emp.bankAccount?.bsb,
      accountNumber: emp.bankAccount?.accountNumber,
      accountName: emp.bankAccount?.accountName,
      selected: true,
    })
  }

  return lines.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
}

export function summarizePayRunPreviewLines(
  lines: PayRunPreviewLine[],
  onlySelected = true
): PayRunTotals {
  const scoped = onlySelected ? lines.filter((l) => l.selected) : lines
  return {
    count: scoped.length,
    grossPay: roundMoney(scoped.reduce((s, l) => s + l.grossPay, 0)),
    taxWithheld: roundMoney(scoped.reduce((s, l) => s + l.taxWithheld, 0)),
    superannuation: roundMoney(scoped.reduce((s, l) => s + l.superannuation, 0)),
    netPay: roundMoney(scoped.reduce((s, l) => s + l.netPay, 0)),
  }
}

/** Simple CSV for bank transfer prep (not ABA — Phase 5). */
export function buildPayRunNetPayCsv(lines: PayRunPreviewLine[]): string {
  const header = [
    'employeeName',
    'employeeId',
    'bsb',
    'accountNumber',
    'accountName',
    'grossPay',
    'taxWithheld',
    'superannuation',
    'netPay',
    'payPeriodStart',
    'payPeriodEnd',
    'timesheetId',
  ].join(',')

  const escape = (v: string | number | undefined) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const rows = lines
    .filter((l) => l.selected)
    .map((l) =>
      [
        escape(l.employeeName),
        escape(l.employeeId),
        escape(l.bsb),
        escape(l.accountNumber),
        escape(l.accountName),
        l.grossPay.toFixed(2),
        l.taxWithheld.toFixed(2),
        l.superannuation.toFixed(2),
        l.netPay.toFixed(2),
        escape(l.payPeriodStart),
        escape(l.payPeriodEnd),
        escape(l.timesheetId),
      ].join(',')
    )

  return [header, ...rows].join('\n')
}

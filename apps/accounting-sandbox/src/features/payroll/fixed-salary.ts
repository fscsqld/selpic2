/**
 * Fixed-salary pay period → submitted timesheet (no hourly clock required).
 */

import type { Employee } from '@/src/shared/types/employee'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function isSalariedEmployee(employee: Employee): boolean {
  const basis = employee.payBasis || (employee.salaryAmount ? 'salary' : 'hourly')
  return basis === 'salary' && (employee.salaryAmount || 0) > 0
}

/**
 * Gross for one pay cycle. `salaryAmount` is the amount per payFrequency period.
 */
export function salaryGrossForPeriod(employee: Employee): number {
  return roundMoney(employee.salaryAmount || 0)
}

export function buildSubmittedSalaryTimesheet(params: {
  employee: Employee
  periodStart: string
  periodEnd: string
  submittedBy?: string
}): Timesheet {
  const { employee, periodStart, periodEnd } = params
  const gross = salaryGrossForPeriod(employee)
  if (gross <= 0) {
    throw new Error(`No salary amount for ${employee.name}`)
  }
  const now = new Date().toISOString()
  return {
    id: `timesheet_sal_${employee.employeeId}_${periodStart}_${Date.now()}`,
    employeeId: employee.employeeId,
    employeeName: employee.name,
    payPeriod: { start: periodStart, end: periodEnd },
    entries: [
      {
        id: `sal_entry_${Date.now()}`,
        date: periodStart,
        hours: 1,
        hourlyRate: gross,
        description: `Fixed salary (${employee.payFrequency || 'monthly'})`,
      },
    ],
    status: 'submitted',
    totalHours: 1,
    totalRegularHours: 1,
    totalOvertimeHours: 0,
    grossPay: gross,
    submittedAt: now,
    notes: `Fixed salary run — ${employee.payFrequency || 'monthly'} gross ${gross}`,
    createdAt: now,
    updatedAt: now,
  }
}

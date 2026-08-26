/**
 * Fixed-salary timesheet builder + salaried detection.
 */

import { describe, expect, it } from 'vitest'
import {
  buildSubmittedSalaryTimesheet,
  isSalariedEmployee,
  salaryGrossForPeriod,
} from '@/src/features/payroll/fixed-salary'
import type { Employee } from '@/src/shared/types/employee'

function baseEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp1',
    name: 'Sam Salary',
    employeeId: 'SP-001',
    type: 'employee',
    superannuationRate: 0.11,
    payFrequency: 'monthly',
    hourlyRate: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('isSalariedEmployee', () => {
  it('requires salary basis and positive amount', () => {
    expect(isSalariedEmployee(baseEmployee({ payBasis: 'salary', salaryAmount: 5000 }))).toBe(
      true
    )
    expect(isSalariedEmployee(baseEmployee({ payBasis: 'salary', salaryAmount: 0 }))).toBe(
      false
    )
    expect(isSalariedEmployee(baseEmployee({ payBasis: 'hourly', hourlyRate: 40 }))).toBe(
      false
    )
  })

  it('infers salary when salaryAmount is set without payBasis', () => {
    expect(isSalariedEmployee(baseEmployee({ salaryAmount: 4200 }))).toBe(true)
  })
})

describe('buildSubmittedSalaryTimesheet', () => {
  it('creates submitted timesheet at fixed gross', () => {
    const emp = baseEmployee({ payBasis: 'salary', salaryAmount: 5500.55 })
    const ts = buildSubmittedSalaryTimesheet({
      employee: emp,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
    })
    expect(ts.status).toBe('submitted')
    expect(ts.grossPay).toBe(5500.55)
    expect(ts.entries).toHaveLength(1)
    expect(ts.entries[0].hourlyRate).toBe(5500.55)
    expect(ts.employeeId).toBe('SP-001')
  })

  it('throws when salary is missing', () => {
    expect(() =>
      buildSubmittedSalaryTimesheet({
        employee: baseEmployee({ payBasis: 'salary', salaryAmount: 0 }),
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
      })
    ).toThrow(/No salary amount/)
  })
})

describe('salaryGrossForPeriod', () => {
  it('rounds to cents', () => {
    expect(salaryGrossForPeriod(baseEmployee({ salaryAmount: 1000.456 }))).toBe(1000.46)
  })
})

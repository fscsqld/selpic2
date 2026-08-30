/**
 * Shared timesheet → payslip accrual approve (Phase 0/3).
 * Used by single approval UI and batch Pay Run.
 */

import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { calculatePayroll } from '@/src/features/payroll/calculator'
import { approvePayrollAndCreateTransactions } from '@/src/features/payroll/bookkeeping'
import type { Payslip } from '@/src/features/payroll/types'
import type { Timesheet } from '@/src/features/payroll/timesheet-types'
import type { Employee } from '@/src/shared/types/employee'
import type { Transaction } from '@/src/shared/types/transaction'

export interface ApproveTimesheetResult {
  timesheetId: string
  payslip: Payslip
  transactions: Transaction[]
  employee: Employee
}

export async function approveSubmittedTimesheet(
  timesheetId: string,
  approvedBy: string
): Promise<ApproveTimesheetResult> {
  await indexedDBStorage.init()
  const timesheet = (await indexedDBStorage.getTimesheet(timesheetId)) as Timesheet | null
  if (!timesheet) {
    throw new Error('Timesheet not found.')
  }
  if (timesheet.status !== 'submitted') {
    throw new Error(`Timesheet ${timesheetId} is not submitted (status: ${timesheet.status}).`)
  }

  const employee = (await indexedDBStorage.getEmployeeByEmployeeId(
    timesheet.employeeId
  )) as Employee | null
  if (!employee) {
    throw new Error(`Employee not found: ${timesheet.employeeId}`)
  }

  const payrollResult = calculatePayroll(employee, timesheet.grossPay || 0)
  const payslip: Payslip = {
    id: `payslip_${timesheetId}_${Date.now()}`,
    employeeId: employee.id || employee.employeeId,
    employeeName: employee.name,
    payPeriod: {
      start: timesheet.payPeriod.start,
      end: timesheet.payPeriod.end,
    },
    grossPay: payrollResult.grossPay,
    taxWithheld: payrollResult.taxWithheld,
    superannuation: payrollResult.superannuation,
    netPay: payrollResult.netPay,
    payDate: new Date().toISOString(),
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const transactions = approvePayrollAndCreateTransactions(payslip, employee)

  for (const transaction of transactions) {
    if (transaction.isPayrollTransaction) {
      transaction.payrollType = employee.type as
        | 'employee'
        | 'director'
        | 'contractor'
        | 'partner'
      transaction.matchedEmployee = {
        id: employee.id || employee.employeeId,
        name: employee.name,
        employeeId: employee.employeeId,
        type: employee.type,
      }
      transaction.matchConfidence = 'high'
    }
    await indexedDBStorage.saveTransaction(transaction)
  }

  await indexedDBStorage.savePayslip(payslip)
  await indexedDBStorage.updateTimesheetStatus(timesheetId, 'approved', approvedBy)

  return { timesheetId, payslip, transactions, employee }
}

export async function approveSubmittedTimesheetsBatch(
  timesheetIds: string[],
  approvedBy: string
): Promise<{
  ok: ApproveTimesheetResult[]
  errors: Array<{ timesheetId: string; message: string }>
}> {
  const ok: ApproveTimesheetResult[] = []
  const errors: Array<{ timesheetId: string; message: string }> = []

  for (const id of timesheetIds) {
    try {
      ok.push(await approveSubmittedTimesheet(id, approvedBy))
    } catch (err) {
      errors.push({
        timesheetId: id,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return { ok, errors }
}

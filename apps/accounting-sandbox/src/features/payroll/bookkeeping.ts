/**
 * Automatic Bookkeeping - 급여 승인 시 자동 분개 처리
 * 
 * 급여 승인 시 Wages Expense와 PAYG/Super Liability 계정으로 자동 분개
 */

import { Payslip } from './types'
import { Employee } from '../../shared/types/employee'
import { Transaction } from '../../shared/types/transaction'
import { PayrollJournalEntry } from './types'

/**
 * 급여 승인 시 자동 분개 처리
 * @param payslip - Payslip 정보
 * @param employee - 직원 정보
 * @returns 분개 항목 배열
 */
export function createPayrollJournalEntries(
  payslip: Payslip,
  employee: Employee
): PayrollJournalEntry {
  const entries: PayrollJournalEntry['entries'] = []
  
  // 1. Wages Expense (Debit) - Gross Pay
  entries.push({
    account: employee.type === 'director' ? 'EXPENSE_DIRECTORS_FEES' : 'EXPENSE_WAGES_SALARIES',
    debit: payslip.grossPay,
    credit: 0,
    description: `Wages - ${employee.name} (${payslip.payPeriod.start} to ${payslip.payPeriod.end})`,
  })
  
  // 2. Superannuation Expense (Debit) - 고용주 기여금 (별도 비용)
  if (payslip.superannuation > 0) {
    entries.push({
      account: 'EXPENSE_SUPERANNUATION',
      debit: payslip.superannuation,
      credit: 0,
      description: `Superannuation - ${employee.name} (Employer Contribution)`,
    })
  }
  
  // 3. PAYG Withholding Liability (Credit) - 직원 급여에서 공제된 세금
  if (payslip.taxWithheld > 0) {
    entries.push({
      account: 'LIABILITY_PAYG_WITHHOLDING',
      debit: 0,
      credit: payslip.taxWithheld,
      description: `PAYG Withholding - ${employee.name}`,
    })
  }
  
  // 4. Superannuation Liability (Credit) - 고용주가 납부해야 할 Superannuation
  if (payslip.superannuation > 0) {
    entries.push({
      account: 'LIABILITY_SUPERANNUATION',
      debit: 0,
      credit: payslip.superannuation,
      description: `Superannuation - ${employee.name} (Payable)`,
    })
  }
  
  // 5. Cash/Bank (Credit) - Net Pay (Gross Pay - PAYG Withholding만)
  entries.push({
    account: 'ASSET_CASH',
    debit: 0,
    credit: payslip.netPay,
    description: `Net Pay - ${employee.name}`,
  })
  
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0)
  
  return {
    payslipId: payslip.id,
    employeeId: employee.id,
    entries,
    totalDebit,
    totalCredit,
  }
}

/**
 * 분개 항목을 Transaction 배열로 변환
 * @param journalEntry - 분개 항목
 * @param payDate - 지급일
 * @returns Transaction 배열
 */
export function convertJournalEntriesToTransactions(
  journalEntry: PayrollJournalEntry,
  payDate: string
): Transaction[] {
  return journalEntry.entries.map((entry, index) => ({
    id: `${journalEntry.payslipId}_entry_${index}`,
    reference: `PAYROLL_${journalEntry.payslipId}`,
    date: payDate,
    description: entry.description,
    debit: entry.debit > 0 ? entry.debit : null,
    credit: entry.credit > 0 ? entry.credit : null,
    category: entry.account,
    department: 'cleaning',
    source: 'payroll',
    confidence: 'Manual',
    isPayrollTransaction: true,
    requiresPAYG: entry.account === 'LIABILITY_PAYG_WITHHOLDING' || entry.account === 'EXPENSE_WAGES_SALARIES',
    // payrollType과 matchedEmployee는 TimesheetApproval에서 추가됨
  }))
}

/**
 * 급여 승인 및 자동 분개 처리 (통합 함수)
 * @param payslip - Payslip 정보
 * @param employee - 직원 정보
 * @returns 생성된 거래 목록
 */
export function approvePayrollAndCreateTransactions(
  payslip: Payslip,
  employee: Employee
): Transaction[] {
  // 분개 항목 생성
  const journalEntry = createPayrollJournalEntries(payslip, employee)
  
  // Transaction으로 변환
  const transactions = convertJournalEntriesToTransactions(journalEntry, payslip.payDate)
  
  // Payslip 상태 업데이트
  payslip.status = 'approved'
  payslip.updatedAt = new Date().toISOString()
  
  return transactions
}

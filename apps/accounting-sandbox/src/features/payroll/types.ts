/**
 * Payroll Feature - Type Definitions
 */

import { Employee, EmployeePayrollInfo } from '../../shared/types/employee'
import { Transaction } from '../../shared/types/transaction'

export interface Payslip {
  id: string
  employeeId: string
  employeeName: string
  payPeriod: {
    start: string
    end: string
  }
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
  payDate: string
  status: 'draft' | 'approved' | 'paid'
  createdAt: string
  updatedAt: string
}

export interface PayslipPDFData extends Payslip {
  companyInfo: {
    name: string
    abn: string
    acn?: string
    address?: string
  }
  employeeInfo: {
    name: string
    employeeId?: string
    taxFileNumber?: string
    address?: string
  }
  breakdown: {
    grossPay: number
    deductions: Array<{
      description: string
      amount: number
    }>
    additions: Array<{
      description: string
      amount: number
    }>
    netPay: number
  }
}

export interface PayrollJournalEntry {
  payslipId: string
  employeeId: string
  entries: Array<{
    account: string
    debit: number
    credit: number
    description: string
  }>
  totalDebit: number
  totalCredit: number
}

export interface PayrollCalculationResult {
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
  breakdown: {
    paygWithholding: number
    superannuation: number
    otherDeductions: number
  }
}

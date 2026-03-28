/**
 * Payroll Calculator - 급여 계산 로직
 * 
 * PAYG, Superannuation 계산 및 순 급여 계산
 */

import { Employee } from '../../shared/types/employee'
import { PayrollCalculationResult } from './types'
import { calculatePAYG, calculateSuperannuation, calculateNetPay } from '../../shared/utils/tax-calculator'

/**
 * 급여 계산
 * @param employee - 직원 정보
 * @param grossPay - 총 급여액
 * @returns 급여 계산 결과
 */
export function calculatePayroll(
  employee: Employee,
  grossPay: number
): PayrollCalculationResult {
  // Contractor인 경우 PAYG 계산 제외
  let taxWithheld = 0
  if (employee.type !== 'contractor') {
    // PAYG 원천징수 계산 (Employee, Director, Partner만)
    // Payment Frequency에 따라 ATO 2025-26 progressive 세액표 적용
    // Director도 일반 직원과 동일하게 progressive rate 적용 (tax-free threshold 포함)
    taxWithheld = calculatePAYG(
      grossPay,
      employee.type,
      true, // 모든 직원 타입(Employee, Director)에 tax-free threshold 적용
      employee.payFrequency || 'monthly' // Payment Frequency 전달
    )
  }
  
  // Superannuation 계산 (Contractor는 0)
  const superannuation = calculateSuperannuation(
    grossPay,
    employee.superannuationRate || 0
  )
  
  // 순 급여 계산
  const netPay = calculateNetPay(grossPay, taxWithheld, superannuation)
  
  return {
    grossPay,
    taxWithheld,
    superannuation,
    netPay,
    breakdown: {
      paygWithholding: taxWithheld,
      superannuation,
      otherDeductions: 0, // 향후 확장 가능
    },
  }
}

/**
 * PAYG 원천징수 계산 (직원별)
 * @param grossPay - 총 급여액
 * @param employeeType - 직원 유형
 * @param taxFreeThreshold - 세금 면제 한도 적용 여부
 * @returns PAYG 원천징수 금액
 */
export function calculatePAYGWithholding(
  grossPay: number,
  employeeType: Employee['type'],
  taxFreeThreshold: boolean = true
): number {
  return calculatePAYG(grossPay, employeeType, taxFreeThreshold)
}

/**
 * Superannuation 계산
 * @param grossPay - 총 급여액
 * @param rate - Superannuation 비율 (기본 11%)
 * @returns Superannuation 금액
 */
export function calculateSuperannuationContribution(
  grossPay: number,
  rate: number = 0.11
): number {
  return calculateSuperannuation(grossPay, rate)
}

/**
 * 순 급여 계산
 * 
 * 중요: Superannuation은 고용주 기여금이므로 Net Pay 계산에서 제외됩니다.
 * 
 * @param grossPay - 총 급여액
 * @param taxWithheld - 원천징수 세금 (PAYG Withholding)
 * @param superannuation - Superannuation (고용주 기여금, 계산에서 제외)
 * @param otherDeductions - 기타 공제액 (예: Health Insurance, Union Fees 등)
 * @returns 순 급여 (Gross Pay - PAYG Withholding - 기타 공제)
 */
export function calculateEmployeeNetPay(
  grossPay: number,
  taxWithheld: number,
  superannuation: number, // 파라미터는 유지하지만 계산에서 제외 (하위 호환성)
  otherDeductions: number = 0
): number {
  // Superannuation은 고용주 기여금이므로 Net Pay 계산에서 제외
  return Math.round((grossPay - taxWithheld - otherDeductions) * 100) / 100
}

/**
 * Payroll Tax 계산 (필요시)
 * @param totalWages - 총 급여 합계
 * @param rate - Payroll Tax 비율 (주별로 다름)
 * @returns Payroll Tax 금액
 */
export function calculatePayrollTax(
  totalWages: number,
  rate: number = 0
): number {
  if (rate === 0) return 0
  return Math.round((totalWages * rate) * 100) / 100
}

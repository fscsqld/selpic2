/**
 * Tax Calculator - 공통 세무 계산기
 * 
 * GST, PAYG, FBT, Income Tax 등 모든 세무 계산을 통합
 */

import { GST_RATE, PAYG_RATES, COMPANY_TAX_RATE, FBT_RATE } from '../constants/tax-rates'
import { getPAYGWithholding } from './ato-tax-tables-2025-26'

/**
 * GST 계산
 * @param amount - 금액
 * @param gstIncluded - GST 포함 여부
 * @returns GST 금액 및 순액
 */
export function calculateGST(amount: number, gstIncluded: boolean = false): {
  gstAmount: number
  netAmount: number
  grossAmount: number
} {
  if (gstIncluded) {
    // GST가 포함된 경우: amount = netAmount + GST
    const gstAmount = Math.round((amount / 11) * 100) / 100 // 10% GST
    const netAmount = amount - gstAmount
    return {
      gstAmount,
      netAmount,
      grossAmount: amount,
    }
  } else {
    // GST가 포함되지 않은 경우: amount = netAmount
    const gstAmount = Math.round((amount * GST_RATE) * 100) / 100
    const grossAmount = amount + gstAmount
    return {
      gstAmount,
      netAmount: amount,
      grossAmount,
    }
  }
}

/**
 * PAYG 원천징수 계산
 * @param grossAmount - 총 급여액
 * @param recipientType - 수취인 유형
 * @param taxFreeThreshold - 세금 면제 한도 적용 여부
 * @param payFrequency - 급여 주기 (weekly, fortnightly, monthly) - 기본값: monthly
 * @returns 원천징수 세금 금액
 */
export function calculatePAYG(
  grossAmount: number,
  recipientType: 'employee' | 'director' | 'contractor' | 'partner',
  taxFreeThreshold: boolean = true,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly' = 'monthly'
): number {
  // Contractor: No PAYG withholding (they handle their own tax)
  if (recipientType === 'contractor') {
    return 0
  }
  
  // No ABN Withholding: 47% flat rate (for partners without ABN)
  if (recipientType === 'partner' && !taxFreeThreshold) {
    return Math.round((grossAmount * PAYG_RATES.NO_ABN_WITHHOLDING) * 100) / 100
  }
  
  // Employee and Director: Use ATO 2025-26 progressive tax tables based on payment frequency
  // Director now uses the same progressive rate as employees (with tax-free threshold)
  return getPAYGWithholding(grossAmount, payFrequency, taxFreeThreshold, false)
}

/**
 * Superannuation 계산
 * @param grossAmount - 총 급여액
 * @param rate - Superannuation 비율 (기본 11%)
 * @returns Superannuation 금액
 */
export function calculateSuperannuation(
  grossAmount: number,
  rate: number = PAYG_RATES.SUPERANNUATION_RATE
): number {
  return Math.round((grossAmount * rate) * 100) / 100
}

/**
 * FBT 계산
 * @param fbtAmount - FBT 대상 금액
 * @param fbtType - FBT 유형
 * @returns FBT 금액
 */
export function calculateFBT(
  fbtAmount: number,
  fbtType: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other' = 'other'
): number {
  // FBT는 일반적으로 47% flat rate
  return Math.round((fbtAmount * FBT_RATE) * 100) / 100
}

/**
 * Company Income Tax 계산
 * @param netProfit - 순이익
 * @returns 법인세 금액
 */
export function calculateIncomeTax(netProfit: number): number {
  if (netProfit <= 0) {
    return 0
  }
  return Math.round((netProfit * COMPANY_TAX_RATE) * 100) / 100
}

/**
 * Net Pay 계산 (급여 - PAYG Withholding만 공제)
 * 
 * 중요: Superannuation은 고용주가 지급하는 법정 기여금이므로
 * 직원 급여에서 공제되지 않습니다. Net Pay 계산에서 제외됩니다.
 * 
 * @param grossPay - 총 급여
 * @param paygWithheld - PAYG 원천징수 (직원 급여에서 공제)
 * @param superannuation - Superannuation (고용주 기여금, Net Pay 계산에서 제외)
 * @returns 순 급여 (Gross Pay - PAYG Withholding)
 */
export function calculateNetPay(
  grossPay: number,
  paygWithheld: number,
  superannuation: number // 파라미터는 유지하지만 계산에서 제외 (하위 호환성)
): number {
  // Superannuation은 고용주 기여금이므로 Net Pay 계산에서 제외
  return Math.round((grossPay - paygWithheld) * 100) / 100
}

/**
 * 총 세금 부담 계산 (GST + PAYG + FBT + Income Tax)
 * @param params - 세금 계산 파라미터
 * @returns 총 세금 부담
 */
export function calculateTotalTax(params: {
  gstCollected?: number
  gstPaid?: number
  paygWithheld?: number
  fbtAmount?: number
  incomeTax?: number
}): number {
  const gstNet = (params.gstCollected || 0) - (params.gstPaid || 0)
  const total = 
    (gstNet > 0 ? gstNet : 0) + // GST Payable (only if positive)
    (params.paygWithheld || 0) +
    (params.fbtAmount || 0) +
    (params.incomeTax || 0)
  
  return Math.round(total * 100) / 100
}

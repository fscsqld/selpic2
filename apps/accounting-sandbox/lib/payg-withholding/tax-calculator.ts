/**
 * PAYG Tax Calculator
 * 
 * 호주 ATO 세율표 기반 원천징수 계산 엔진
 */

import { TaxBracket, PayrollTransaction } from './types'

/**
 * 호주 ATO 세율표 (2024-25 기준)
 * 실제 세율은 ATO 공식 문서 참조 필요
 */
export const ATO_TAX_TABLE_2024_25: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0.0 },
  { min: 18200, max: 45000, rate: 0.19 },
  { min: 45000, max: 120000, rate: 0.325 },
  { min: 120000, max: 180000, rate: 0.37 },
  { min: 180000, max: null, rate: 0.45 },
]

export class PAYGTaxCalculator {
  /**
   * 급여/보수 지급 시 PAYG 원천징수 금액 계산
   * 
   * @param grossAmount 지급 총액 (월급 기준)
   * @param recipientType 수취인 유형
   * @param taxFreeThreshold 세금 면제 한도 적용 여부
   * @returns 원천징수 세금 금액 (월 단위)
   */
  calculateWithholding(
    grossAmount: number,
    recipientType: 'employee' | 'director' | 'contractor' | 'partner',
    taxFreeThreshold: boolean = true
  ): number {
    // 연간 소득으로 환산 (월급인 경우 * 12, 주급인 경우 * 52)
    // 여기서는 월급 기준으로 가정
    const annualIncome = grossAmount * 12

    // 세금 면제 한도 적용
    let taxableIncome = annualIncome
    if (taxFreeThreshold && annualIncome <= 18200) {
      return 0  // 세금 면제 한도 이하
    }
    if (taxFreeThreshold) {
      taxableIncome = annualIncome - 18200  // 면제 한도 차감
    }

    // 세율표 적용
    let totalTax = 0
    let remainingIncome = taxableIncome

    for (const bracket of ATO_TAX_TABLE_2024_25) {
      if (remainingIncome <= 0) break

      const bracketRange = bracket.max 
        ? Math.min(bracket.max - bracket.min, remainingIncome)
        : remainingIncome

      if (bracketRange > 0) {
        totalTax += bracketRange * bracket.rate
        remainingIncome -= bracketRange
      }
    }

    // 월 단위 원천징수 금액 반환
    return Math.round((totalTax / 12) * 100) / 100
  }

  /**
   * 이사 보수 지급 시 원천징수 계산
   * 이사 보수는 일반적으로 세금 면제 한도가 적용되지 않음
   */
  calculateDirectorFee(grossAmount: number): number {
    return this.calculateWithholding(grossAmount, 'director', false)
  }

  /**
   * 직원 급여 지급 시 원천징수 계산
   * 일반적으로 세금 면제 한도 적용
   */
  calculateEmployeeSalary(grossAmount: number, taxFreeThreshold: boolean = true): number {
    return this.calculateWithholding(grossAmount, 'employee', taxFreeThreshold)
  }

  /**
   * 계약자 보수 지급 시 원천징수 계산
   * 일반적으로 세금 면제 한도 적용
   */
  calculateContractorFee(grossAmount: number, taxFreeThreshold: boolean = true): number {
    return this.calculateWithholding(grossAmount, 'contractor', taxFreeThreshold)
  }

  /**
   * No ABN Withholding (47%) 처리
   * ABN이 없는 파트너/계약자에게 지급 시 47% 원천징수
   * 
   * ⚠️ 중요: 이는 PAYG 등록 여부와 무관하게 법적 의무입니다.
   */
  calculateNoABNWithholding(grossAmount: number): number {
    return Math.round(grossAmount * 0.47 * 100) / 100
  }

  /**
   * 전체 급여 거래 생성 (Gross, Tax, Net 계산)
   */
  createPayrollTransaction(
    paymentDate: string,
    recipient: PayrollTransaction['recipient'],
    grossAmount: number
  ): PayrollTransaction {
    let withholdingTax = 0

    // ABN이 없는 경우 47% 원천징수 (법적 의무)
    if (!recipient.abn && recipient.type === 'contractor') {
      withholdingTax = this.calculateNoABNWithholding(grossAmount)
    }
    // 이사 보수
    else if (recipient.type === 'director') {
      withholdingTax = this.calculateDirectorFee(grossAmount)
    }
    // 직원 급여
    else if (recipient.type === 'employee') {
      withholdingTax = this.calculateEmployeeSalary(
        grossAmount,
        recipient.taxFreeThreshold ?? true
      )
    }
    // 계약자 보수
    else if (recipient.type === 'contractor') {
      withholdingTax = this.calculateContractorFee(
        grossAmount,
        recipient.taxFreeThreshold ?? true
      )
    }

    const netAmount = grossAmount - withholdingTax

    return {
      paymentDate,
      recipient,
      grossAmount,
      withholdingTax,
      netAmount,
      requiresPAYGReporting: recipient.type === 'employee' || recipient.type === 'director',
    }
  }

  /**
   * 연간 소득 기반 세금 계산 (연간 총액)
   * 
   * @param annualIncome 연간 소득
   * @param taxFreeThreshold 세금 면제 한도 적용 여부
   * @returns 연간 세금 총액
   */
  calculateAnnualTax(annualIncome: number, taxFreeThreshold: boolean = true): number {
    let taxableIncome = annualIncome
    
    if (taxFreeThreshold && annualIncome <= 18200) {
      return 0
    }
    if (taxFreeThreshold) {
      taxableIncome = annualIncome - 18200
    }

    let totalTax = 0
    let remainingIncome = taxableIncome

    for (const bracket of ATO_TAX_TABLE_2024_25) {
      if (remainingIncome <= 0) break

      const bracketRange = bracket.max 
        ? Math.min(bracket.max - bracket.min, remainingIncome)
        : remainingIncome

      if (bracketRange > 0) {
        totalTax += bracketRange * bracket.rate
        remainingIncome -= bracketRange
      }
    }

    return Math.round(totalTax * 100) / 100
  }

  /**
   * 주급 기반 원천징수 계산
   * 
   * @param weeklyGrossAmount 주급 총액
   * @param recipientType 수취인 유형
   * @param taxFreeThreshold 세금 면제 한도 적용 여부
   * @returns 주 단위 원천징수 세금 금액
   */
  calculateWeeklyWithholding(
    weeklyGrossAmount: number,
    recipientType: 'employee' | 'director' | 'contractor' | 'partner',
    taxFreeThreshold: boolean = true
  ): number {
    const annualIncome = weeklyGrossAmount * 52
    const annualTax = this.calculateAnnualTax(annualIncome, taxFreeThreshold)
    return Math.round((annualTax / 52) * 100) / 100
  }
}


/**
 * PAYG Withholding Engine
 * 
 * PAYG 원천징수 계산 및 관리 엔진
 */

import { PAYGConfigManager } from './config'
import { PAYGTaxCalculator } from './tax-calculator'
import { NoABNWarning, PayrollTransaction } from './types'

export class PAYGWithholdingEngine {
  private taxCalculator: PAYGTaxCalculator

  constructor() {
    this.taxCalculator = new PAYGTaxCalculator()
  }

  /**
   * PAYG 계산이 필요한지 확인
   */
  shouldCalculatePAYG(): boolean {
    const config = PAYGConfigManager.loadConfig()
    return config.isEnabled && config.autoCalculate
  }

  /**
   * PAYG 등록 여부 확인
   */
  isPAYGEnabled(): boolean {
    return PAYGConfigManager.isPAYGEnabled()
  }

  /**
   * PAYG 원천징수 계산 (활성화된 경우에만)
   * 
   * @param grossAmount 지급 총액
   * @param recipientType 수취인 유형
   * @param taxFreeThreshold 세금 면제 한도 적용 여부
   * @returns 원천징수 세금 금액 (null이면 PAYG 미등록)
   */
  calculateWithholding(
    grossAmount: number,
    recipientType: 'employee' | 'director' | 'contractor' | 'partner',
    taxFreeThreshold: boolean = true
  ): number | null {
    if (!this.shouldCalculatePAYG()) {
      return null  // PAYG 미등록 시 계산하지 않음
    }

    return this.taxCalculator.calculateWithholding(
      grossAmount,
      recipientType,
      taxFreeThreshold
    )
  }

  /**
   * 전체 급여 거래 생성 (Gross, Tax, Net 계산)
   * PAYG 미등록 시 withholdingTax는 0으로 설정
   */
  createPayrollTransaction(
    paymentDate: string,
    recipient: PayrollTransaction['recipient'],
    grossAmount: number
  ): PayrollTransaction {
    // ABN이 없는 경우 47% 원천징수 (PAYG 등록 여부와 무관)
    if (!recipient.abn && recipient.type === 'contractor') {
      const withholdingTax = this.taxCalculator.calculateNoABNWithholding(grossAmount)
      return {
        paymentDate,
        recipient,
        grossAmount,
        withholdingTax,
        netAmount: grossAmount - withholdingTax,
        requiresPAYGReporting: false, // No ABN은 별도 처리
      }
    }

    // PAYG 등록 시에만 원천징수 계산
    if (this.shouldCalculatePAYG()) {
      return this.taxCalculator.createPayrollTransaction(
        paymentDate,
        recipient,
        grossAmount
      )
    }

    // PAYG 미등록 시 원천징수 없음
    return {
      paymentDate,
      recipient,
      grossAmount,
      withholdingTax: 0,
      netAmount: grossAmount,
      requiresPAYGReporting: false,
    }
  }

  /**
   * No ABN Withholding 경고 (PAYG 등록 여부와 무관)
   * 
   * ABN이 없는 계약자에게 $75 이상 지급 시 47% 원천징수 필요
   * 이는 PAYG 등록 여부와 무관하게 법적 의무입니다.
   */
  checkNoABNWarning(
    amount: number,
    hasABN: boolean,
    recipientType: 'contractor' | 'partner'
  ): NoABNWarning {
    // ABN이 없고 $75 이상 지급 시 경고
    if (!hasABN && amount >= 75 && recipientType === 'contractor') {
      const withholdingAmount = this.taxCalculator.calculateNoABNWithholding(amount)
      
      return {
        shouldWarn: true,
        warningMessage: `⚠️ No ABN Withholding Required: This payment of $${amount.toFixed(2)} to a contractor without ABN requires 47% withholding ($${withholdingAmount.toFixed(2)}). This is a legal requirement regardless of PAYG registration status.`,
        withholdingAmount,
      }
    }

    return {
      shouldWarn: false,
      warningMessage: '',
    }
  }

  /**
   * PAYG 설정 가져오기
   */
  getConfig() {
    return PAYGConfigManager.loadConfig()
  }

  /**
   * 세율 계산기 인스턴스 가져오기
   */
  getTaxCalculator(): PAYGTaxCalculator {
    return this.taxCalculator
  }
}


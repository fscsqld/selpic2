/**
 * PAYG Withholding Types
 * 
 * Type definitions for PAYG Withholding functionality
 */

/**
 * PAYG 설정 인터페이스
 */
export interface PAYGConfig {
  /** PAYG 등록 여부 */
  isEnabled: boolean
  
  /** PAYG 등록일 (YYYY-MM-DD 형식) */
  registrationDate?: string
  
  /** PAYG 등록번호 (선택적) */
  registrationNumber?: string
  
  /** 자동 계산 활성화 여부 */
  autoCalculate: boolean
  
  /** 경고 표시 여부 (항상 true 권장) */
  showWarnings: boolean
}

/**
 * 급여 거래 인터페이스
 */
export interface PayrollTransaction {
  /** 지급일 */
  paymentDate: string
  
  /** 수취인 정보 */
  recipient: {
    name: string
    type: 'employee' | 'director' | 'contractor' | 'partner'
    tfn?: string              // Tax File Number (선택적)
    abn?: string              // Australian Business Number (선택적)
    taxFreeThreshold?: boolean // 세금 면제 한도 적용 여부
  }
  
  /** 지급 총액 (Gross Pay) */
  grossAmount: number
  
  /** 원천징수 세금 (Withholding Tax) - 계산됨 */
  withholdingTax?: number
  
  /** 실지급액 (Net Pay) - 계산됨 */
  netAmount?: number
  
  /** PAYG 신고 대상 여부 */
  requiresPAYGReporting: boolean
}

/**
 * 세율 구간 인터페이스
 */
export interface TaxBracket {
  /** 최소 금액 */
  min: number
  
  /** 최대 금액 (null이면 무한대) */
  max: number | null
  
  /** 세율 (0.0 ~ 1.0) */
  rate: number
}

/**
 * No ABN Withholding 경고 결과
 */
export interface NoABNWarning {
  /** 경고 필요 여부 */
  shouldWarn: boolean
  
  /** 경고 메시지 */
  warningMessage: string
  
  /** 원천징수 금액 */
  withholdingAmount?: number
}


/**
 * PDF 파서 타입 정의
 * 
 * 이 파일은 PDF 파싱 엔진의 핵심 타입을 정의합니다.
 * 모든 파서는 이 인터페이스를 구현해야 합니다.
 */

/**
 * 사업 주체 (Entity) 타입
 */
export type EntityType = 'partnership' | 'company' | 'personal'

/**
 * 사업부 (Department) 타입
 */
export type DepartmentType = 'cleaning' | 'sticker' | 'personal' | 'general' | 'unknown'

/**
 * 은행 거래 내역
 */
export interface BankTransaction {
  /** 거래일자 (YYYY-MM-DD 형식) */
  date: string
  
  /** 거래 설명 */
  description: string
  
  /** 출금액 (입금인 경우 null) */
  debit: number | null
  
  /** 입금액 (출금인 경우 null) */
  credit: number | null
  
  /** 잔액 */
  balance: number | null
  
  /** 참조 번호 (선택적) */
  reference?: string
  
  /** AI 분류 카테고리 (초기에는 null) */
  category?: string
  
  /** 사업 주체 (파트너십/법인/개인) */
  entityType?: EntityType
  
  /** 사업부 (Cleaning/Sticker) */
  department?: DepartmentType
  
  /** Director's Loan 관련 필드 (PAYG 미등록 시 집중 관리) */
  isDirectorsLoan?: boolean
  directorsLoanDetails?: {
    loanAmount: number
    loanType: 'capital-injection' | 'withdrawal' | 'advance' | 'expense' | 'repayment'
    repaymentDate?: string
    isRepayment: boolean
    availableForRepayment: number  // 상환 가능 잔액
  }
  
  /** Pre-trading Expenses (창업 비용) 여부 */
  isPreTradingExpense?: boolean
  preTradingExpenseDetails?: {
    expenseType: 'incorporation' | 'domain' | 'sample-production' | 'setup' | 'other'
    canBeDeducted: boolean  // 세금 공제 가능 여부
    deductionDate?: string  // 공제 적용 예정일
  }
}

/**
 * 파싱된 은행 내역서
 */
export interface ParsedStatement {
  /** 은행명 (예: 'CBA', 'ANZ') */
  bankName: string
  
  /** 계좌번호 (선택적) */
  accountNumber?: string
  
  /** 내역서 기간 */
  statementPeriod: {
    startDate: string
    endDate: string
  }
  
  /** 기초 잔액 */
  openingBalance: number
  
  /** 기말 잔액 */
  closingBalance: number
  
  /** 거래 내역 배열 */
  transactions: BankTransaction[]
  
  /** 추가 메타데이터 (선택적) */
  metadata?: {
    statementDate?: string
    accountName?: string
    [key: string]: any
  }
}

/**
 * PDF 파서 인터페이스
 * 
 * 각 은행별 파서는 이 인터페이스를 구현해야 합니다.
 */
export interface PDFParser {
  /**
   * PDF 텍스트를 분석하여 해당 은행의 내역서인지 확인
   * @param pdfText PDF에서 추출한 텍스트
   * @returns 해당 은행의 내역서이면 true
   */
  detectBank(pdfText: string): boolean

  /**
   * PDF 버퍼를 파싱하여 거래 내역 추출
   * @param pdfBuffer PDF 파일의 버퍼
   * @returns 파싱된 내역서 데이터
   */
  parse(pdfBuffer: Buffer): Promise<ParsedStatement>
}

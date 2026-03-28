# SELPIC-Accounting 설계 보고서

> **문서 유형**: 설계 보고서  
> **프로젝트명**: SELPIC-Accounting  
> **작성일**: 2026년 1월 4일  
> **버전**: 3.1  
> **상태**: 설계 완료, 구현 대기

## 🎯 SELPIC-Accounting 개요

**SELPIC-Accounting**은 호주 은행 PDF 내역서를 자동으로 파싱하고, AI를 통해 ATO(호주 국세청) 표준 카테고리로 분류하며, PAYG, GST, FBT 등 세무 신고를 자동화하는 회계 자동화 도구입니다.

### 핵심 기능
- ✅ **PDF 파싱**: 호주 주요 은행 (CBA, ANZ 등) PDF 내역서 자동 파싱
- ✅ **AI 분류**: ATO 표준 카테고리 자동 분류
- ✅ **PAYG Withholding**: 급여/보수 원천징수 계산 (모듈화 - On/Off 가능)
- ✅ **GST 정산**: GST 포함 여부 판별 및 BAS 신고 지원
- ✅ **FBT 감지**: 복리후생세 이슈 자동 모니터링
- ✅ **Director's Loan**: 이사 대여금 집중 관리 (PAYG 미등록 시)
- ✅ **통합 대시보드**: 신고 마감일 추적 및 납부 금액 추정
- ✅ **General Ledger**: 엑셀 내보내기 (ATO 표준 형식)

### 개발 전략
1. **Phase 1 (독립 개발)**: `apps/accounting-sandbox`에서 완전히 독립적인 웹 앱으로 구축
2. **검증 단계**: 공공 배포(SaaS) 형태로 테스트하여 핵심 엔진 검증
3. **Phase 2 (통합)**: 검증 완료 후 메인 홈페이지 Admin Dashboard 모듈로 통합

---

## 📋 목차

1. [SELPIC-Accounting 전체 설계 문서](#selpic-accounting---)

---



# SELPIC-Accounting 전체 설계 문서

*PDF 파싱, AI 분류, PAYG, GST, FBT, 통합 대시보드 등 전체 기능 설계*

---



> ⚠️ **중요**: 이 문서는 **구상 단계의 설계 문서**입니다.
> - 현재 홈페이지 개발과 **완전히 별개**로 관리됩니다
> - 독립적인 웹 애플리케이션으로 먼저 구축합니다
> - 검증 완료 후 메인 홈페이지로 통합 예정입니다

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [아키텍처 설계](#아키텍처-설계)
3. [Phase 1: 독립형 엔진 구축](#phase-1-독립형-엔진-구축)
4. [PAYG Withholding (원천징수) 기능](#payg-withholding-원천징수-기능)
5. [GST 정산 기능](#gst-정산-기능)
6. [FBT (복리후생세) 감지 시스템](#fbt-복리후생세-감지-시스템)
7. [통합 세무 대시보드](#통합-세무-대시보드)
8. [Phase 2: 홈페이지 통합](#phase-2-홈페이지-통합)
9. [기술 스택](#기술-스택)
10. [데이터 모델](#데이터-모델)
11. [API 설계](#api-설계)
12. [구현 단계](#구현-단계)

---

## 🎯 프로젝트 개요

### 목적
SELPIC-Accounting은 호주 은행 PDF 내역서를 자동으로 파싱하고, AI를 통해 ATO(호주 국세청) 표준 카테고리로 분류하여 General Ledger 형식의 엑셀 파일로 내보내는 회계 자동화 도구입니다.

### 비즈니스 컨텍스트
- **운영 주체**: 2026년 1월 'SELPIC PTY LTD' 법인 설립
- **과도기 운영 (1월~3월)**: 
  - 기존 '청소업 파트너십(Partnership)'을 유지하며 수익 창출 및 사장님 개인 생활비 지출
  - 법인은 매출 없이 '쇼핑몰(스티커) 및 IT 개발' 준비 단계(Pre-revenue)
- **최종 통합 (4월 이후)**: 
  - 파트너십 폐업 후 모든 청소업 계약 및 매출을 법인(SELPIC)으로 승계
  - 하나의 법인 내에서 '청소 서비스'와 '스티커 쇼핑몰'을 동시 운영

### 핵심 가치 제안
- **회계사**: 수동 데이터 입력 시간 절약, 실수 방지
- **소상공인**: 복잡한 회계 소프트웨어 없이 간단한 장부 관리
- **개인**: 개인 재무 관리 자동화

### 개발 전략
1. **Phase 1 (독립 개발)**: `apps/accounting-sandbox`에서 완전히 독립적인 웹 앱으로 구축
2. **검증 단계**: 공공 배포(SaaS) 형태로 테스트하여 핵심 엔진 검증
3. **Phase 2 (통합)**: 검증 완료 후 메인 홈페이지 Admin Dashboard 모듈로 통합

---

## 🏗️ 아키텍처 설계

### 1. 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│              메인 홈페이지 (SELPIC)                      │
│  (기존 커스터마이징 및 주문 시스템)                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Phase 2: 통합
                   │
┌──────────────────▼──────────────────────────────────────┐
│         SELPIC-Accounting (독립 앱)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PDF 파싱    │  │  AI 분류     │  │  데이터      │ │
│  │  엔진        │  │  엔진        │  │  관리        │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  엑셀 내보내기│  │  피드백 루프 │  │  사용자 인증 │ │
│  │  (GL 형식)   │  │  (학습 데이터)│  │  (선택적)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  🎯 핵심 기능:                                          │
│  • 호주 주요 은행 PDF 파싱 (CBA, ANZ 등)                │
│  • OpenAI API 연동 (시스템 키 / BYOK)                   │
│  • ATO 표준 카테고리 분류                                │
│  • PAYG Withholding (원천징수) 자동 계산                │
│  • GST 정산 및 BAS 신고 지원                            │
│  • FBT (복리후생세) 감지 및 모니터링                     │
│  • 통합 세무 대시보드 (신고 마감일 알림)                 │
│  • General Ledger 엑셀 내보내기                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ API 연동
                   │
┌──────────────────▼──────────────────────────────────────┐
│              외부 서비스                                 │
│  • OpenAI API (GPT-4o-mini)                            │
│  • 호주 은행 PDF 형식                                    │
└─────────────────────────────────────────────────────────┘
```

### 2. 디렉토리 구조

```
selpic2/
├── apps/
│   └── accounting-sandbox/          # Phase 1: 독립 앱
│       ├── app/
│       │   ├── page.tsx              # 메인 페이지
│       │   ├── upload/
│       │   │   └── page.tsx          # 파일 업로드
│       │   ├── results/
│       │   │   └── page.tsx          # 분석 결과
│       │   └── api/
│       │       ├── parse-pdf/
│       │       │   └── route.ts      # PDF 파싱 API
│       │       ├── classify/
│       │       │   └── route.ts      # AI 분류 API
│       │       ├── payg-calculate/
│       │       │   └── route.ts      # PAYG 계산 API
│       │       ├── bas-report/
│       │       │   └── route.ts      # BAS 리포트 API
│       │       ├── gst-calculate/
│       │       │   └── route.ts      # GST 계산 API
│       │       ├── fbt-detect/
│       │       │   └── route.ts      # FBT 감지 API
│       │       ├── tax-dashboard/
│       │       │   └── route.ts      # 세무 대시보드 API
│       │       └── export-excel/
│       │           └── route.ts      # 엑셀 내보내기 API
│       ├── lib/
│       │   ├── pdf-parser/
│       │   │   ├── index.ts          # PDF 파싱 엔진
│       │   │   ├── cba-parser.ts     # CBA 은행 파서
│       │   │   ├── anz-parser.ts     # ANZ 은행 파서
│       │   │   └── common-parser.ts  # 공통 파서
│       │   ├── ai-classifier/
│       │   │   ├── index.ts          # AI 분류 엔진
│       │   │   ├── openai-client.ts  # OpenAI 클라이언트
│       │   │   ├── prompts.ts        # 프롬프트 엔지니어링
│       │   │   └── ato-categories.ts  # ATO 카테고리 정의
│       │   ├── excel-export/
│       │   │   ├── index.ts          # 엑셀 내보내기
│       │   │   └── gl-formatter.ts    # GL 형식 포맷터
│       │   ├── payg-withholding/
│       │   │   ├── index.ts          # PAYG 원천징수 엔진
│       │   │   ├── config.ts          # PAYG 설정 관리 (On/Off)
│       │   │   ├── tax-calculator.ts  # 세율 계산기
│       │   │   ├── bas-reporter.ts    # BAS 리포트 생성
│       │   │   └── no-abn-handler.ts  # No ABN 처리 (47%)
│       │   ├── directors-loan/
│       │   │   ├── index.ts          # Director's Loan 관리
│       │   │   ├── detector.ts        # Director's Loan 감지
│       │   │   └── manager.ts         # Director's Loan 관리자
│       │   ├── department-classifier/
│       │   │   └── index.ts          # 부문별 분류 (Cleaning/Sticker)
│       │   ├── pre-trading-expenses/
│       │   │   └── detector.ts        # Pre-trading Expenses 감지
│       │   └── entity-tracker/
│       │       └── index.ts          # 사업 주체 추적 (Partnership/Company)
│       │   ├── gst-settlement/
│       │   │   ├── index.ts          # GST 정산 엔진
│       │   │   ├── gst-detector.ts    # GST 포함 여부 AI 판별
│       │   │   ├── gst-calculator.ts  # GST Net 계산
│       │   │   └── bas-gst-reporter.ts # BAS GST 리포트
│       │   ├── fbt-monitoring/
│       │   │   ├── index.ts          # FBT 감지 시스템
│       │   │   ├── fbt-detector.ts    # FBT 이슈 감지
│       │   │   └── fbt-reporter.ts    # FBT 보고서
│       │   ├── tax-dashboard/
│       │   │   ├── index.ts          # 통합 세무 대시보드
│       │   │   ├── deadline-tracker.ts # 신고 마감일 추적
│       │   │   └── payment-estimator.ts # 납부 금액 추정
│       │   ├── feedback/
│       │   │   └── index.ts          # 피드백 루프
│       │   └── auth/
│       │       └── index.ts          # 인증 (선택적)
│       ├── components/
│       │   ├── FileUpload.tsx        # 파일 업로드 컴포넌트
│       │   ├── TransactionTable.tsx   # 거래 내역 테이블
│       │   ├── CategoryEditor.tsx     # 카테고리 수정 컴포넌트
│       │   ├── PayrollCalculator.tsx  # 급여 계산 컴포넌트 (PAYG 상태 표시)
│       │   ├── PAYGSummary.tsx        # PAYG 요약 컴포넌트 (조건부 표시)
│       │   ├── DirectorsLoanManager.tsx # Director's Loan 관리 컴포넌트
│       │   ├── DepartmentReport.tsx    # 부문별 손익 분석 컴포넌트
│       │   ├── PreTradingExpensesReport.tsx # Pre-trading Expenses 리포트
│       │   ├── EntityTracking.tsx     # 사업 주체 추적 컴포넌트
│       │   ├── GSTSummary.tsx         # GST 요약 컴포넌트
│       │   ├── FBTMonitor.tsx         # FBT 모니터링 컴포넌트
│       │   ├── TaxDashboard.tsx       # 통합 세무 대시보드
│       │   ├── TaxRegistrationSettings.tsx # 세무 등록 설정
│       │   └── ExcelExportButton.tsx  # 엑셀 내보내기 버튼
│       ├── types/
│       │   └── index.ts              # TypeScript 타입 정의
│       ├── package.json
│       └── next.config.js
│
└── docs/
    └── accounting-module-blueprint.md  # 이 문서
```

---

## 🚀 Phase 1: 독립형 엔진 구축

### Step 1: PDF 텍스트 추출 엔진

#### 1.1 기술 스택
- **`pdf-parse`**: PDF 텍스트 추출
- **`pdf-lib`**: PDF 메타데이터 처리 (필요 시)
- **TypeScript**: 타입 안정성

#### 1.2 은행별 파서 구조

각 호주 은행은 고유한 PDF 형식을 가지고 있으므로, 은행별 전용 파서를 개발합니다.

**지원 은행 (우선순위)**:
1. **CBA (Commonwealth Bank of Australia)**
2. **ANZ (Australia and New Zealand Banking Group)**
3. **Westpac**
4. **NAB (National Australia Bank)**

#### 1.3 파서 인터페이스

```typescript
// lib/pdf-parser/types.ts
export interface BankTransaction {
  date: string                    // YYYY-MM-DD
  description: string              // 거래 설명
  debit: number | null             // 출금액 (null if credit)
  credit: number | null            // 입금액 (null if debit)
  balance: number | null           // 잔액
  reference?: string               // 참조 번호
  category?: string                // AI 분류 카테고리 (초기 null)
}

export interface ParsedStatement {
  bankName: string                 // 은행명
  accountNumber?: string            // 계좌번호
  statementPeriod: {
    startDate: string
    endDate: string
  }
  openingBalance: number
  closingBalance: number
  transactions: BankTransaction[]
  metadata?: {
    statementDate?: string
    accountName?: string
  }
}

export interface PDFParser {
  detectBank(pdfText: string): boolean
  parse(pdfBuffer: Buffer): Promise<ParsedStatement>
}
```

#### 1.4 공통 파서 유틸리티

```typescript
// lib/pdf-parser/common-parser.ts
export class CommonParser {
  /**
   * PDF 텍스트에서 날짜 추출 (다양한 형식 지원)
   */
  static extractDate(text: string): string | null {
    // DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD 등 다양한 형식 지원
    const datePatterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
      /(\d{4})-(\d{2})-(\d{2})/,
    ]
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        // 표준 형식으로 변환 (YYYY-MM-DD)
        return this.normalizeDate(match)
      }
    }
    
    return null
  }

  /**
   * 금액 추출 (호주 달러 형식)
   */
  static extractAmount(text: string): number | null {
    // $1,234.56, 1234.56, (1234.56) 등 다양한 형식 지원
    const amountPattern = /[\$]?([\d,]+\.?\d*)/g
    const match = text.match(amountPattern)
    
    if (match) {
      const cleaned = match[0].replace(/[\$,()]/g, '')
      const amount = parseFloat(cleaned)
      return isNaN(amount) ? null : amount
    }
    
    return null
  }

  /**
   * 거래 설명 정제 (불필요한 공백, 특수문자 제거)
   */
  static cleanDescription(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,]/g, '')
      .trim()
  }
}
```

#### 1.5 CBA 파서 예시

```typescript
// lib/pdf-parser/cba-parser.ts
import pdfParse from 'pdf-parse'
import { PDFParser, ParsedStatement, BankTransaction } from './types'
import { CommonParser } from './common-parser'

export class CBAParser implements PDFParser {
  detectBank(pdfText: string): boolean {
    // CBA PDF의 특징적인 텍스트 패턴 확인
    return /Commonwealth Bank|CBA|CommBank/i.test(pdfText)
  }

  async parse(pdfBuffer: Buffer): Promise<ParsedStatement> {
    const pdfData = await pdfParse(pdfBuffer)
    const text = pdfData.text

    // CBA PDF 구조 분석
    const lines = text.split('\n')
    const transactions: BankTransaction[] = []

    // CBA 특정 패턴으로 거래 내역 추출
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // CBA 거래 라인 패턴 예시: "DD/MM/YYYY Description Amount Balance"
      const transactionMatch = line.match(
        /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/
      )

      if (transactionMatch) {
        const [, dateStr, description, amountStr, balanceStr] = transactionMatch
        
        const date = this.normalizeDate(dateStr)
        const amount = CommonParser.extractAmount(amountStr)
        const balance = CommonParser.extractAmount(balanceStr)
        
        // 출금/입금 판단 (CBA 특정 로직)
        const isDebit = this.isDebitTransaction(description, amount)
        
        transactions.push({
          date,
          description: CommonParser.cleanDescription(description),
          debit: isDebit ? amount : null,
          credit: isDebit ? null : amount,
          balance,
        })
      }
    }

    // 계좌 정보 추출
    const accountNumber = this.extractAccountNumber(text)
    const statementPeriod = this.extractStatementPeriod(text)
    const openingBalance = this.extractOpeningBalance(text)
    const closingBalance = this.extractClosingBalance(text)

    return {
      bankName: 'CBA',
      accountNumber,
      statementPeriod,
      openingBalance,
      closingBalance,
      transactions,
    }
  }

  private normalizeDate(dateStr: string): string {
    // DD/MM/YYYY -> YYYY-MM-DD
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  private isDebitTransaction(description: string, amount: number): boolean {
    // CBA 특정 로직: 특정 키워드로 출금 판단
    const debitKeywords = ['PAYMENT', 'WITHDRAWAL', 'FEE', 'CHARGE']
    return debitKeywords.some(keyword => 
      description.toUpperCase().includes(keyword)
    )
  }

  private extractAccountNumber(text: string): string | undefined {
    const match = text.match(/Account\s+Number[:\s]+(\d+)/i)
    return match ? match[1] : undefined
  }

  private extractStatementPeriod(text: string): { startDate: string; endDate: string } {
    // CBA PDF에서 기간 추출
    const periodMatch = text.match(
      /Statement\s+Period[:\s]+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i
    )
    
    if (periodMatch) {
      return {
        startDate: this.normalizeDate(periodMatch[1]),
        endDate: this.normalizeDate(periodMatch[2]),
      }
    }
    
    // 기본값 (거래 내역에서 추론)
    return {
      startDate: '',
      endDate: '',
    }
  }

  private extractOpeningBalance(text: string): number {
    const match = text.match(/Opening\s+Balance[:\s]+[\$]?([\d,]+\.\d{2})/i)
    return match ? CommonParser.extractAmount(match[0]) || 0 : 0
  }

  private extractClosingBalance(text: string): number {
    const match = text.match(/Closing\s+Balance[:\s]+[\$]?([\d,]+\.\d{2})/i)
    return match ? CommonParser.extractAmount(match[0]) || 0 : 0
  }
}
```

#### 1.6 파서 팩토리

```typescript
// lib/pdf-parser/index.ts
import { PDFParser, ParsedStatement } from './types'
import { CBAParser } from './cba-parser'
import { ANZParser } from './anz-parser'
// import { WestpacParser } from './westpac-parser'
// import { NABParser } from './nab-parser'
import pdfParse from 'pdf-parse'

export class PDFParserEngine {
  private parsers: PDFParser[] = [
    new CBAParser(),
    new ANZParser(),
    // new WestpacParser(),
    // new NABParser(),
  ]

  /**
   * PDF 버퍼를 받아서 적절한 파서를 선택하고 파싱
   */
  async parsePDF(pdfBuffer: Buffer): Promise<ParsedStatement> {
    // 먼저 PDF 텍스트 추출
    const pdfData = await pdfParse(pdfBuffer)
    const text = pdfData.text

    // 적절한 파서 찾기
    const parser = this.parsers.find(p => p.detectBank(text))

    if (!parser) {
      throw new Error(
        '지원하지 않는 은행입니다. 현재 지원: CBA, ANZ'
      )
    }

    // 파싱 실행
    return await parser.parse(pdfBuffer)
  }

  /**
   * 지원하는 은행 목록 반환
   */
  getSupportedBanks(): string[] {
    return this.parsers.map(p => {
      if (p instanceof CBAParser) return 'CBA'
      if (p instanceof ANZParser) return 'ANZ'
      // if (p instanceof WestpacParser) return 'Westpac'
      // if (p instanceof NABParser) return 'NAB'
      return 'Unknown'
    })
  }
}
```

---

### Step 2: Director's Loan 집중 관리 (PAYG 미등록 시)

#### 2.1 Director's Loan 감지 및 분류

PAYG 미등록 상태에서는 공식적인 급여 지급이 없으므로, 법인 계좌에서 발생하는 사적 지출이나 이사에게 전달되는 자금을 'Director's Loan'으로 명확히 분류합니다.

```typescript
// lib/directors-loan/detector.ts
export interface DirectorsLoanTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  loanType: 'withdrawal' | 'advance' | 'expense'  // 인출, 선금, 비용
  isRepayment: boolean                            // 상환 여부
  balance?: number                                // 대여금 잔액
  notes?: string
}

export class DirectorsLoanDetector {
  /**
   * AI를 사용하여 Director's Loan 거래 감지 (비즈니스 컨텍스트 반영)
   */
  async detectDirectorsLoan(
    transaction: BankTransaction,
    companyRevenueStartDate: string = '2026-04-01'  // 4월 정식 운영 시작
  ): Promise<DirectorsLoanTransaction | null> {
    const prompt = this.buildLoanDetectionPrompt(transaction, companyRevenueStartDate)
    const response = await this.callOpenAI(prompt)
    
    if (!this.isDirectorsLoanRelevant(response)) {
      return null
    }

    return this.parseLoanResponse(transaction, response, companyRevenueStartDate)
  }

  /**
   * Director's Loan 감지 프롬프트 (비즈니스 컨텍스트 포함)
   */
  private buildLoanDetectionPrompt(
    transaction: BankTransaction,
    companyRevenueStartDate: string
  ): string {
    const isPreRevenue = new Date(transaction.date) < new Date(companyRevenueStartDate)
    
    return `Analyze the following Australian bank transaction for SELPIC PTY LTD to determine if it is a Director's Loan.

**Business Context:**
- Company incorporated: January 2026
- Pre-revenue period: January-March 2026 (no company revenue)
- Trading starts: ${companyRevenueStartDate}
- Partnership (cleaning) continues until March, then novated to company
- Transaction date: ${transaction.date} ${isPreRevenue ? '(PRE-REVENUE PERIOD)' : '(TRADING PERIOD)'}

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Reference: ${transaction.reference || 'N/A'}

**Director's Loan Indicators:**

1. **Capital Injection (Pre-revenue period, Jan-Mar 2026)**:
   - Credit (deposit) from partnership/personal account to company account
   - Partnership income transferred to company before revenue generation
   - Personal funds injected into company for startup costs
   - Look for: "TRANSFER FROM", "PARTNERSHIP", "PERSONAL ACCOUNT"

2. **Withdrawal (Any period)**:
   - Debit (withdrawal) from company account for personal use
   - Personal expenses paid from company account
   - Cash withdrawals for personal use
   - Personal purchases using company funds

3. **Repayment (After trading starts, April 2026+)**:
   - Credit (deposit) back to company from director
   - Tax-free withdrawal when company has revenue
   - Repayment of director loan

**Instructions:**
1. Check if transaction date is in pre-revenue period (Jan-Mar 2026)
2. If credit (deposit) in pre-revenue period → Capital Injection
3. If debit (withdrawal) for personal use → Withdrawal
4. If credit (deposit) after trading starts → Repayment
5. Classify loan type: 'capital-injection', 'withdrawal', 'advance', 'expense', or 'repayment'

Respond in the following format:
IS_DIRECTORS_LOAN: [true/false]
LOAN_TYPE: [capital-injection/withdrawal/advance/expense/repayment]
IS_PRE_REVENUE: [true/false]
REASON: [Brief explanation]`
  }

  private isDirectorsLoanRelevant(aiResponse: string): boolean {
    return /IS_DIRECTORS_LOAN:\s*true/i.test(aiResponse)
  }

  private parseLoanResponse(
    transaction: BankTransaction,
    aiResponse: string,
    companyRevenueStartDate: string
  ): DirectorsLoanTransaction {
    const amount = transaction.debit || transaction.credit || 0
    const loanTypeMatch = aiResponse.match(/LOAN_TYPE:\s*(\w+)/i)
    const loanType = (loanTypeMatch?.[1] || 'expense') as 'withdrawal' | 'advance' | 'expense' | 'capital-injection'
    const isRepayment = loanType === 'repayment' || (amount > 0 && new Date(transaction.date) >= new Date(companyRevenueStartDate))
    const isPreRevenue = new Date(transaction.date) < new Date(companyRevenueStartDate)

    // Capital Injection인 경우 특별 처리
    if (loanType === 'capital-injection' && amount > 0 && isPreRevenue) {
      return {
        transactionId: transaction.reference || '',
        date: transaction.date,
        description: transaction.description,
        amount: Math.abs(amount),
        loanType: 'capital-injection',
        isRepayment: false,
        availableForRepayment: Math.abs(amount),  // 상환 가능 잔액 초기화
      }
    }

    return {
      transactionId: transaction.reference || '',
      date: transaction.date,
      description: transaction.description,
      amount: Math.abs(amount),
      loanType: isRepayment ? 'expense' : loanType,
      isRepayment,
      availableForRepayment: isRepayment ? 0 : undefined,  // 상환 시 상환 가능 잔액 감소
    }
  }
}
```

#### 2.2 Director's Loan 관리 시스템

```typescript
// lib/directors-loan/manager.ts
export interface DirectorsLoanSummary {
  totalCapitalInjection: number         // 총 자본 투입 (Pre-revenue)
  totalLoans: number                    // 총 대여금 (Withdrawals)
  totalRepayments: number               // 총 상환금
  currentBalance: number                // 현재 잔액 (Capital Injection - Withdrawals + Repayments)
  availableForRepayment: number        // 상환 가능 잔액 (법인 매출 발생 후 세금 없이 인출 가능)
  transactions: DirectorsLoanTransaction[]
  byType: {
    'capital-injection': { count: number; total: number }
    withdrawal: { count: number; total: number }
    advance: { count: number; total: number }
    expense: { count: number; total: number }
  }
  preRevenuePeriod: {
    startDate: string
    endDate: string
    totalInjection: number
  }
}

export class DirectorsLoanManager {
  /**
   * Director's Loan 요약 생성 (비즈니스 컨텍스트 반영)
   */
  generateSummary(
    transactions: DirectorsLoanTransaction[],
    companyRevenueStartDate: string = '2026-04-01'
  ): DirectorsLoanSummary {
    let totalCapitalInjection = 0  // Pre-revenue 자본 투입
    let totalLoans = 0             // Withdrawals
    let totalRepayments = 0

    const byType = {
      'capital-injection': { count: 0, total: 0 },
      withdrawal: { count: 0, total: 0 },
      advance: { count: 0, total: 0 },
      expense: { count: 0, total: 0 },
    }

    const preRevenueStart = '2026-01-01'
    const preRevenueEnd = companyRevenueStartDate

    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      const isPreRevenue = txDate >= new Date(preRevenueStart) && txDate < new Date(companyRevenueStartDate)

      if (tx.isRepayment) {
        totalRepayments += tx.amount
      } else if (tx.loanType === 'capital-injection' && isPreRevenue) {
        totalCapitalInjection += tx.amount
        byType['capital-injection'].count++
        byType['capital-injection'].total += tx.amount
      } else {
        totalLoans += tx.amount
        
        if (byType[tx.loanType as keyof typeof byType]) {
          byType[tx.loanType as keyof typeof byType].count++
          byType[tx.loanType as keyof typeof byType].total += tx.amount
        }
      }
    }

    // 현재 잔액 = 자본 투입 - 인출 + 상환
    const currentBalance = totalCapitalInjection - totalLoans + totalRepayments
    
    // 상환 가능 잔액 = 자본 투입 - 인출 (법인 매출 발생 후 세금 없이 인출 가능)
    const availableForRepayment = Math.max(0, totalCapitalInjection - totalLoans)

    return {
      totalCapitalInjection,
      totalLoans,
      totalRepayments,
      currentBalance,
      availableForRepayment,
      transactions,
      byType,
      preRevenuePeriod: {
        startDate: preRevenueStart,
        endDate: preRevenueEnd,
        totalInjection: totalCapitalInjection,
      },
    }
  }

  /**
   * Director's Loan 리포트 생성
   */
  generateReport(summary: DirectorsLoanSummary, period: { start: string; end: string }): string {
    return `
Director's Loan Report
Period: ${period.start} to ${period.end}

Summary:
- Total Loans: $${summary.totalLoans.toFixed(2)}
- Total Repayments: $${summary.totalRepayments.toFixed(2)}
- Current Balance: $${summary.currentBalance.toFixed(2)}

By Type:
- Withdrawals: ${summary.byType.withdrawal.count} transactions, $${summary.byType.withdrawal.total.toFixed(2)}
- Advances: ${summary.byType.advance.count} transactions, $${summary.byType.advance.total.toFixed(2)}
- Expenses: ${summary.byType.expense.count} transactions, $${summary.byType.expense.total.toFixed(2)}
`
  }
}
```

---

### Step 3: 부문별 손익 분석 (Departmental Reporting)

#### 3.1 부문별 분류 시스템

법인 내 'Cleaning 사업부'와 'Sticker 사업부'를 구분하여 손익을 분석합니다.

```typescript
// lib/department-classifier/index.ts
// (위에 작성된 코드 참조)
```

#### 3.2 부문별 리포트 생성

```typescript
// lib/department-classifier/reporter.ts
export interface DepartmentReport {
  period: { startDate: string; endDate: string }
  cleaning: {
    revenue: number
    expenses: number
    netProfit: number
    transactionCount: number
  }
  sticker: {
    revenue: number
    expenses: number
    netProfit: number
    transactionCount: number
  }
  general: {
    revenue: number
    expenses: number
    netProfit: number
    transactionCount: number
  }
}

export class DepartmentReporter {
  generateReport(
    transactions: BankTransaction[],
    startDate: string,
    endDate: string
  ): DepartmentReport {
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end
    })

    const departments = {
      cleaning: { revenue: 0, expenses: 0, count: 0 },
      sticker: { revenue: 0, expenses: 0, count: 0 },
      general: { revenue: 0, expenses: 0, count: 0 },
    }

    for (const tx of periodTransactions) {
      const dept = tx.department || 'general'
      
      if (tx.credit) {
        departments[dept].revenue += tx.credit
      }
      if (tx.debit) {
        departments[dept].expenses += tx.debit
      }
      departments[dept].count++
    }

    return {
      period: { startDate, endDate },
      cleaning: {
        revenue: departments.cleaning.revenue,
        expenses: departments.cleaning.expenses,
        netProfit: departments.cleaning.revenue - departments.cleaning.expenses,
        transactionCount: departments.cleaning.count,
      },
      sticker: {
        revenue: departments.sticker.revenue,
        expenses: departments.sticker.expenses,
        netProfit: departments.sticker.revenue - departments.sticker.expenses,
        transactionCount: departments.sticker.count,
      },
      general: {
        revenue: departments.general.revenue,
        expenses: departments.general.expenses,
        netProfit: departments.general.revenue - departments.general.expenses,
        transactionCount: departments.general.count,
      },
    }
  }
}
```

#### 3.3 TPAR (Taxable Payments Annual Report) 지원

청소업 특화 보고서로 서브컨트랙터 지급 내역을 추적합니다.

```typescript
// lib/department-classifier/tpar-reporter.ts
export interface TPARReport {
  financialYear: string
  subcontractors: {
    abn?: string
    name: string
    totalPayments: number
    paymentCount: number
    payments: {
      date: string
      amount: number
      description: string
    }[]
  }[]
  totalPayments: number
}

export class TPARReporter {
  generateTPARReport(
    transactions: BankTransaction[],
    financialYear: string
  ): TPARReport {
    // Cleaning 부문의 서브컨트랙터 지급 내역 추출
    const cleaningPayments = transactions.filter(tx => 
      tx.department === 'cleaning' && 
      tx.debit && 
      tx.category === 'EXPENSE_CLEANING_SUBCONTRACTOR'
    )

    // 서브컨트랙터별 집계
    const subcontractorMap = new Map<string, {
      abn?: string
      name: string
      payments: any[]
    }>()

    for (const tx of cleaningPayments) {
      // 거래 설명에서 서브컨트랙터 이름 추출 (AI 또는 패턴 매칭)
      const contractorName = this.extractContractorName(tx.description)
      
      if (!subcontractorMap.has(contractorName)) {
        subcontractorMap.set(contractorName, {
          name: contractorName,
          payments: [],
        })
      }

      subcontractorMap.get(contractorName)!.payments.push({
        date: tx.date,
        amount: tx.debit,
        description: tx.description,
      })
    }

    const subcontractors = Array.from(subcontractorMap.entries()).map(([name, data]) => ({
      name: data.name,
      abn: data.abn,
      totalPayments: data.payments.reduce((sum, p) => sum + p.amount, 0),
      paymentCount: data.payments.length,
      payments: data.payments,
    }))

    return {
      financialYear,
      subcontractors,
      totalPayments: subcontractors.reduce((sum, s) => sum + s.totalPayments, 0),
    }
  }

  private extractContractorName(description: string): string {
    // AI 또는 패턴 매칭으로 서브컨트랙터 이름 추출
    // 예: "PAYMENT TO JOHN SMITH" → "JOHN SMITH"
    const match = description.match(/PAYMENT\s+TO\s+(.+)/i) ||
                  description.match(/PAY\s+(.+)/i)
    return match ? match[1].trim() : 'Unknown Contractor'
  }
}
```

---

### Step 4: Pre-trading Expenses 추적

#### 4.1 Pre-trading Expenses 감지

법인 설립 후 정식 운영 전(1-3월) 발생한 창업 비용을 감지합니다.

```typescript
// lib/pre-trading-expenses/detector.ts
// (위에 작성된 코드 참조)
```

#### 4.2 Pre-trading Expenses 리포트

```typescript
// lib/pre-trading-expenses/reporter.ts
export interface PreTradingExpenseReport {
  totalExpenses: number
  byType: {
    incorporation: { count: number; total: number }
    domain: { count: number; total: number }
    'sample-production': { count: number; total: number }
    setup: { count: number; total: number }
    other: { count: number; total: number }
  }
  deductibleAmount: number  // 공제 가능 금액
  deductionDate: string      // 공제 적용 예정일
  expenses: PreTradingExpense[]
}

export class PreTradingExpenseReporter {
  generateReport(expenses: PreTradingExpense[]): PreTradingExpenseReport {
    const byType = {
      incorporation: { count: 0, total: 0 },
      domain: { count: 0, total: 0 },
      'sample-production': { count: 0, total: 0 },
      setup: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    }

    let totalExpenses = 0
    let deductibleAmount = 0

    for (const expense of expenses) {
      totalExpenses += expense.amount
      
      if (expense.canBeDeducted) {
        deductibleAmount += expense.amount
      }

      if (byType[expense.expenseType]) {
        byType[expense.expenseType].count++
        byType[expense.expenseType].total += expense.amount
      }
    }

    return {
      totalExpenses,
      byType,
      deductibleAmount,
      deductionDate: '2026-04-01',  // 정식 운영 시작일
      expenses,
    }
  }
}
```

---

### Step 5: 사업 주체 추적 (Entity Tracking)

#### 5.1 파트너십 vs 법인 구분

```typescript
// lib/entity-tracker/index.ts
// (위에 작성된 코드 참조)
```

#### 5.2 계약 승계(Novation) 추적

```typescript
// lib/entity-tracker/novation-tracker.ts
export interface NovationTracking {
  originalContractor: string      // 파트너십
  newContractor: string            // SELPIC PTY LTD
  novationDate: string            // 2026-04-01
  contracts: {
    contractName: string
    originalValue: number
    novatedValue: number
    novationStatus: 'pending' | 'completed' | 'cancelled'
  }[]
}

export class NovationTracker {
  trackNovation(
    transactions: BankTransaction[]
  ): NovationTracking {
    // 4월 이후 Cleaning 부문 수익은 법인으로 승계됨
    const novatedTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const novationDate = new Date('2026-04-01')
      return txDate >= novationDate && tx.department === 'cleaning'
    })

    return {
      originalContractor: 'Partnership (Cleaning)',
      newContractor: 'SELPIC PTY LTD',
      novationDate: '2026-04-01',
      contracts: [],  // 실제 계약 정보는 별도 관리
    }
  }
}
```

---

### Step 6: AI 분류 지능 고도화

#### 2.1 OpenAI API 연동 아키텍처

**이원화된 API 키 시스템**:
- **시스템 API 키**: 플랫폼에서 제공하는 기본 키 (사용량 제한 있음)
- **BYOK (Bring Your Own Key)**: 사용자가 자신의 OpenAI API 키를 입력하여 사용

```typescript
// lib/ai-classifier/openai-client.ts
export interface OpenAIConfig {
  apiKey: string
  model: 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo'
  temperature?: number
  maxTokens?: number
}

export class OpenAIClient {
  private config: OpenAIConfig

  constructor(config: OpenAIConfig) {
    this.config = config
  }

  async classifyTransaction(
    transaction: BankTransaction,
    context?: string[]
  ): Promise<string> {
    const prompt = this.buildClassificationPrompt(transaction, context)
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature || 0.3,
        max_tokens: this.config.maxTokens || 100,
      }),
    })

    const data = await response.json()
    return this.extractCategory(data.choices[0].message.content)
  }

  private buildClassificationPrompt(
    transaction: BankTransaction,
    context?: string[]
  ): string {
    // 프롬프트 엔지니어링 (다음 섹션 참조)
    return buildPrompt(transaction, context)
  }

  private getSystemPrompt(): string {
    return `You are an expert Australian accountant. Your task is to classify bank transactions into ATO (Australian Taxation Office) standard categories.`
  }

  private extractCategory(response: string): string {
    // AI 응답에서 카테고리 추출
    const categoryMatch = response.match(/Category:\s*([A-Z_]+)/i)
    return categoryMatch ? categoryMatch[1] : 'UNCATEGORIZED'
  }
}
```

#### 2.2 프롬프트 엔지니어링

```typescript
// lib/ai-classifier/prompts.ts
import { BankTransaction } from '../pdf-parser/types'
import { ATO_CATEGORIES } from './ato-categories'

export function buildClassificationPrompt(
  transaction: BankTransaction,
  context?: string[]
): string {
  const contextInfo = context 
    ? `\n\nPrevious similar transactions:\n${context.join('\n')}`
    : ''

  // 비즈니스 컨텍스트 정보
  const businessContext = `
**Business Context (SELPIC PTY LTD):**
- Company incorporated: January 2026
- Pre-revenue period: January-March 2026 (preparation phase)
- Trading starts: April 2026
- Two departments: Cleaning Services & Sticker E-commerce
- Partnership (cleaning) continues until March, then novated to company

**Priority Categories (Check First):**
1. **Director's Loan (LIABILITY_DIRECTORS_LOAN)**: 
   - Personal funds from partnership injected into company account (Jan-Mar 2026)
   - Partnership income transferred to company before revenue generation
   - Look for: transfers from personal/partnership account, capital injections

2. **Pre-trading Expenses (EXPENSE_STARTUP_*)**:
   - Incorporation fees ($611)
   - Domain registration
   - Sample production costs
   - Setup costs before April 2026

3. **Department Classification**:
   - Cleaning: subcontractor payments, cleaning equipment, TPAR-related
   - Sticker: production costs, marketing, e-commerce setup
   - Analyze description and transaction patterns

4. **Entity Type**:
   - 'partnership': Partnership account transactions (until March)
   - 'company': Company account transactions
   - 'personal': Personal account transactions
`

  return `Classify the following Australian bank transaction for SELPIC PTY LTD.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Reference: ${transaction.reference || 'N/A'}

${businessContext}

Available ATO Categories:
${ATO_CATEGORIES.map(cat => `- ${cat.code}: ${cat.name} (${cat.description})`).join('\n')}
${contextInfo}

**Classification Instructions:**
1. **First Priority**: Check if this is Director's Loan (capital injection from partnership)
2. **Second Priority**: Check if this is Pre-trading Expense (Jan-Mar 2026, before trading starts)
3. **Third Priority**: Determine department (Cleaning vs Sticker) based on description
4. **Fourth Priority**: Classify into standard ATO category
5. **Entity Type**: Determine if this is from partnership, company, or personal account

**Special Rules:**
- If date is Jan-Mar 2026 and amount is credit (deposit) from personal/partnership account → Director's Loan
- If date is Jan-Mar 2026 and amount is debit (expense) for setup → Pre-trading Expense
- If description contains "cleaning", "subcontractor", "TPAR" → Cleaning Department
- If description contains "sticker", "e-commerce", "shop", "product" → Sticker Department

Respond in the following format:
Category: [CATEGORY_CODE]
Entity_Type: [partnership/company/personal]
Department: [cleaning/sticker/general/unknown]
Is_Directors_Loan: [true/false]
Is_Pre_Trading_Expense: [true/false]
Reason: [Brief explanation]`
}
```

#### 2.3 ATO 카테고리 정의

```typescript
// lib/ai-classifier/ato-categories.ts
export interface ATOCategory {
  code: string
  name: string
  description: string
  parentCategory?: string
}

export const ATO_CATEGORIES: ATOCategory[] = [
  // Income Categories
  {
    code: 'INCOME_SALES',
    name: 'Sales Income',
    description: 'Revenue from sales of goods or services',
  },
  {
    code: 'INCOME_INTEREST',
    name: 'Interest Income',
    description: 'Interest earned on savings or investments',
  },
  {
    code: 'INCOME_DIVIDENDS',
    name: 'Dividend Income',
    description: 'Dividends received from investments',
  },
  
  // Expense Categories
  {
    code: 'EXPENSE_OFFICE_SUPPLIES',
    name: 'Office Supplies',
    description: 'Office supplies and stationery',
  },
  {
    code: 'EXPENSE_RENT',
    name: 'Rent',
    description: 'Rental payments for business premises',
  },
  {
    code: 'EXPENSE_UTILITIES',
    name: 'Utilities',
    description: 'Electricity, water, gas, internet bills',
  },
  {
    code: 'EXPENSE_MARKETING',
    name: 'Marketing & Advertising',
    description: 'Marketing and advertising expenses',
  },
  {
    code: 'EXPENSE_TRAVEL',
    name: 'Travel Expenses',
    description: 'Business travel and accommodation',
  },
  {
    code: 'EXPENSE_MEALS',
    name: 'Meals & Entertainment',
    description: 'Business meals and entertainment',
  },
  {
    code: 'EXPENSE_VEHICLE',
    name: 'Vehicle Expenses',
    description: 'Vehicle fuel, maintenance, registration',
  },
  {
    code: 'EXPENSE_PROFESSIONAL_FEES',
    name: 'Professional Fees',
    description: 'Legal, accounting, consulting fees',
  },
  {
    code: 'EXPENSE_BANK_FEES',
    name: 'Bank Fees',
    description: 'Bank charges and transaction fees',
  },
  {
    code: 'EXPENSE_INSURANCE',
    name: 'Insurance',
    description: 'Business insurance premiums',
  },
  {
    code: 'EXPENSE_SUBSCRIPTIONS',
    name: 'Subscriptions & Software',
    description: 'Software subscriptions, memberships',
  },
  
  // Other Categories
  {
    code: 'TRANSFER_INTERNAL',
    name: 'Internal Transfer',
    description: 'Transfers between own accounts',
  },
  {
    code: 'UNCATEGORIZED',
    name: 'Uncategorized',
    description: 'Transactions that need manual review',
  },
]
```

---

### Step 4: 피드백 루프 설계

#### 3.1 피드백 데이터 모델

```typescript
// lib/feedback/types.ts
export interface ClassificationFeedback {
  id: string
  transactionId: string
  originalCategory: string        // AI가 처음 분류한 카테고리
  correctedCategory: string       // 사용자가 수정한 카테고리
  transaction: BankTransaction    // 거래 내역
  userReason?: string             // 사용자가 수정한 이유
  timestamp: Date
  userId?: string                 // 로그인 사용자 (선택적)
}

export interface FeedbackLearningData {
  pattern: string                 // 거래 패턴 (description + amount range)
  correctCategory: string
  confidence: number               // 학습 신뢰도
  sampleCount: number             // 학습 샘플 수
}
```

#### 3.2 피드백 저장 및 활용

```typescript
// lib/feedback/index.ts
import { ClassificationFeedback, FeedbackLearningData } from './types'
import { BankTransaction } from '../pdf-parser/types'

export class FeedbackLoop {
  private feedbacks: ClassificationFeedback[] = []

  /**
   * 사용자 피드백 저장
   */
  async saveFeedback(feedback: ClassificationFeedback): Promise<void> {
    this.feedbacks.push(feedback)
    
    // 로컬 스토리지 또는 데이터베이스에 저장
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(
        localStorage.getItem('accounting_feedbacks') || '[]'
      )
      existing.push(feedback)
      localStorage.setItem('accounting_feedbacks', JSON.stringify(existing))
    }
  }

  /**
   * 피드백을 기반으로 학습 데이터 생성
   */
  generateLearningData(): FeedbackLearningData[] {
    const learningMap = new Map<string, {
      category: string
      count: number
    }>()

    // 유사한 거래 패턴 그룹화
    for (const feedback of this.feedbacks) {
      const pattern = this.extractPattern(feedback.transaction)
      const key = `${pattern}_${feedback.correctedCategory}`

      if (learningMap.has(key)) {
        learningMap.get(key)!.count++
      } else {
        learningMap.set(key, {
          category: feedback.correctedCategory,
          count: 1,
        })
      }
    }

    // 학습 데이터로 변환
    return Array.from(learningMap.entries()).map(([pattern, data]) => ({
      pattern,
      correctCategory: data.category,
      confidence: Math.min(data.count / 10, 1.0), // 최대 1.0
      sampleCount: data.count,
    }))
  }

  /**
   * 거래 패턴 추출 (학습용)
   */
  private extractPattern(transaction: BankTransaction): string {
    // 설명의 키워드 + 금액 범위
    const keywords = transaction.description
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join('_')

    const amountRange = this.getAmountRange(
      transaction.debit || transaction.credit || 0
    )

    return `${keywords}_${amountRange}`
  }

  private getAmountRange(amount: number): string {
    if (amount < 10) return 'under_10'
    if (amount < 50) return '10_50'
    if (amount < 100) return '50_100'
    if (amount < 500) return '100_500'
    if (amount < 1000) return '500_1000'
    return 'over_1000'
  }

  /**
   * 학습 데이터를 기반으로 카테고리 추천
   */
  recommendCategory(
    transaction: BankTransaction,
    learningData: FeedbackLearningData[]
  ): string | null {
    const pattern = this.extractPattern(transaction)

    for (const data of learningData) {
      if (data.pattern === pattern && data.confidence > 0.7) {
        return data.correctCategory
      }
    }

    return null
  }
}
```

---

### Step 5: 엑셀 내보내기 (General Ledger 형식)

#### 4.1 GL 형식 정의

```typescript
// lib/excel-export/gl-formatter.ts
import { ParsedStatement, BankTransaction } from '../pdf-parser/types'
import * as XLSX from 'xlsx'

export interface GLRow {
  Date: string
  Account: string
  Description: string
  Debit: number
  Credit: number
  Balance: number
  Category: string
  Reference?: string
}

export class GLFormatter {
  /**
   * 파싱된 거래 내역을 GL 형식으로 변환
   */
  formatToGL(
    statement: ParsedStatement,
    transactions: BankTransaction[]
  ): GLRow[] {
    const glRows: GLRow[] = []

    // Opening Balance
    glRows.push({
      Date: statement.statementPeriod.startDate,
      Account: statement.accountNumber || 'N/A',
      Description: 'Opening Balance',
      Debit: 0,
      Credit: 0,
      Balance: statement.openingBalance,
      Category: 'BALANCE',
    })

    // Transactions
    for (const transaction of transactions) {
      glRows.push({
        Date: transaction.date,
        Account: statement.accountNumber || 'N/A',
        Description: transaction.description,
        Debit: transaction.debit || 0,
        Credit: transaction.credit || 0,
        Balance: transaction.balance || 0,
        Category: transaction.category || 'UNCATEGORIZED',
        Reference: transaction.reference,
      })
    }

    // Closing Balance
    glRows.push({
      Date: statement.statementPeriod.endDate,
      Account: statement.accountNumber || 'N/A',
      Description: 'Closing Balance',
      Debit: 0,
      Credit: 0,
      Balance: statement.closingBalance,
      Category: 'BALANCE',
    })

    return glRows
  }

  /**
   * GL 데이터를 엑셀 파일로 내보내기
   */
  exportToExcel(glRows: GLRow[], filename: string = 'general-ledger.xlsx'): void {
    const worksheet = XLSX.utils.json_to_sheet(glRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger')

    // 파일 다운로드
    XLSX.writeFile(workbook, filename)
  }
}
```

---

## 💰 PAYG Withholding (원천징수) 기능

> ⚠️ **중요**: 이 기능은 호주 ATO(국세청)의 PAYG Withholding 규정을 준수합니다.
> - **모듈화 설계**: PAYG 등록 여부에 따라 On/Off 가능
> - **초기 상태**: PAYG 미등록 시 기본적으로 Off 상태
> - **활성화**: 나중에 PAYG 등록 시 즉시 활성화 가능
> - **No ABN 경고**: PAYG 등록 여부와 무관하게 No ABN Withholding 경고는 항상 유지

### 1. PAYG 기능 모듈화 및 설정

#### 1.1 PAYG 활성화 상태 관리

```typescript
// lib/payg-withholding/config.ts
export interface PAYGConfig {
  isEnabled: boolean                    // PAYG 등록 여부
  registrationDate?: string             // PAYG 등록일
  registrationNumber?: string           // PAYG 등록번호
  autoCalculate: boolean                // 자동 계산 활성화 여부
  showWarnings: boolean                 // 경고 표시 여부 (항상 true 권장)
}

export class PAYGConfigManager {
  /**
   * PAYG 설정 로드
   */
  static loadConfig(): PAYGConfig {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('payg_config')
      if (stored) {
        return JSON.parse(stored)
      }
    }
    
    // 기본값: PAYG 미등록 상태
    return {
      isEnabled: false,
      autoCalculate: false,
      showWarnings: true,  // 경고는 항상 표시
    }
  }

  /**
   * PAYG 설정 저장
   */
  static saveConfig(config: PAYGConfig): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('payg_config', JSON.stringify(config))
    }
  }

  /**
   * PAYG 활성화
   */
  static enablePAYG(registrationDate: string, registrationNumber?: string): void {
    const config: PAYGConfig = {
      isEnabled: true,
      registrationDate,
      registrationNumber,
      autoCalculate: true,
      showWarnings: true,
    }
    this.saveConfig(config)
  }

  /**
   * PAYG 비활성화
   */
  static disablePAYG(): void {
    const config: PAYGConfig = {
      isEnabled: false,
      autoCalculate: false,
      showWarnings: true,  // 경고는 유지
    }
    this.saveConfig(config)
  }
}
```

#### 1.2 PAYG 기능 조건부 실행

```typescript
// lib/payg-withholding/index.ts
import { PAYGConfigManager, PAYGConfig } from './config'

export class PAYGWithholdingEngine {
  private config: PAYGConfig

  constructor() {
    this.config = PAYGConfigManager.loadConfig()
  }

  /**
   * PAYG 계산이 필요한지 확인
   */
  shouldCalculatePAYG(): boolean {
    return this.config.isEnabled && this.config.autoCalculate
  }

  /**
   * PAYG 계산 (활성화된 경우에만)
   */
  async calculateWithholding(
    grossAmount: number,
    recipientType: 'employee' | 'director' | 'contractor' | 'partner',
    taxFreeThreshold: boolean = true
  ): Promise<number | null> {
    if (!this.shouldCalculatePAYG()) {
      return null  // PAYG 미등록 시 계산하지 않음
    }

    const calculator = new PAYGTaxCalculator()
    return calculator.calculateWithholding(grossAmount, recipientType, taxFreeThreshold)
  }

  /**
   * No ABN Withholding 경고 (PAYG 등록 여부와 무관)
   */
  checkNoABNWarning(
    amount: number,
    hasABN: boolean,
    recipientType: 'contractor' | 'partner'
  ): {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  } {
    // ABN이 없고 $75 이상 지급 시 경고
    if (!hasABN && amount >= 75 && recipientType === 'contractor') {
      const withholdingAmount = Math.round(amount * 0.47 * 100) / 100
      
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
}
```

### 2. 급여 및 보수 처리 로직

#### 2.1 PAYG 원천징수 계산 엔진 (조건부 활성화)

호주 ATO의 세율표(Tax Table)를 기반으로 PAYG 원천징수 금액을 자동 계산합니다.

```typescript
// lib/payg-withholding/tax-calculator.ts
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

export interface TaxBracket {
  min: number
  max: number | null  // null이면 무한대
  rate: number        // 세율 (0.0 ~ 1.0)
}

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
   * @param grossAmount 지급 총액
   * @param recipientType 수취인 유형
   * @param taxFreeThreshold 세금 면제 한도 적용 여부
   * @returns 원천징수 세금 금액
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
   * No ABN Withholding (47%) 처리
   * ABN이 없는 파트너/계약자에게 지급 시 47% 원천징수
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

    // ABN이 없는 경우 47% 원천징수
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
    // 파트너 보수 (일반 세율 적용)
    else if (recipient.type === 'partner') {
      withholdingTax = this.calculateWithholding(
        grossAmount,
        'partner',
        recipient.taxFreeThreshold ?? false
      )
    }

    const netAmount = grossAmount - withholdingTax

    return {
      paymentDate,
      recipient,
      grossAmount,
      withholdingTax,
      netAmount,
      requiresPAYGReporting: withholdingTax > 0,
    }
  }
}
```

#### 2.2 거래 내역에 PAYG 정보 통합 (조건부)

```typescript
// lib/pdf-parser/types.ts (업데이트)
export interface BankTransaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
  reference?: string
  category?: string
  
  // PAYG 관련 필드 추가 (PAYG 등록 시에만 활성화)
  isPayroll?: boolean                    // 급여/보수 지급 여부
  payrollDetails?: {
    grossAmount: number
    withholdingTax: number | null        // PAYG 미등록 시 null
    netAmount: number
    recipientType: 'employee' | 'director' | 'contractor' | 'partner'
    recipientName?: string
    requiresPAYGReporting: boolean       // PAYG 등록 시에만 true
  }
  
  // Director's Loan 관련 필드 (PAYG 미등록 시 집중 관리)
  isDirectorsLoan?: boolean              // 이사 대여금 여부
  directorsLoanDetails?: {
    loanAmount: number
    loanType: 'withdrawal' | 'advance' | 'expense'
    repaymentDate?: string
    isRepayment: boolean
  }
  
  // No ABN Withholding 경고 (PAYG 등록 여부와 무관)
  noABNWarning?: {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  }
}
```

---

### 2. AI 지출 분석 업데이트

#### 2.1 급여/보수 자동 태그

AI가 은행 PDF 내역서에서 급여나 보수 지급 내역을 발견하면, 자동으로 'PAYG 신고 대상'으로 태그합니다.

```typescript
// lib/ai-classifier/prompts.ts (업데이트)
export function buildClassificationPrompt(
  transaction: BankTransaction,
  context?: string[]
): string {
  const contextInfo = context 
    ? `\n\nPrevious similar transactions:\n${context.join('\n')}`
    : ''

  return `Classify the following bank transaction into an ATO standard category.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Reference: ${transaction.reference || 'N/A'}

Available ATO Categories:
${ATO_CATEGORIES.map(cat => `- ${cat.code}: ${cat.name} (${cat.description})`).join('\n')}
${contextInfo}

**IMPORTANT: PAYG Withholding Detection**
If this transaction appears to be:
- Salary payment (keywords: "SALARY", "PAYROLL", "WAGES", "PAY")
- Director fee (keywords: "DIRECTOR", "FEE", "REMUNERATION")
- Contractor payment (keywords: "CONTRACTOR", "CONSULTANT", "FREELANCE")
- Partner payment (keywords: "PARTNER", "DISTRIBUTION")

You MUST:
1. Set category to "EXPENSE_PAYROLL" or "EXPENSE_DIRECTOR_FEE"
2. Flag it as PAYG reportable by adding "PAYG_REPORTABLE: true"
3. Identify recipient type: "employee", "director", "contractor", or "partner"

Instructions:
1. Analyze the transaction description carefully
2. Check for payroll-related keywords
3. If payroll detected, classify as appropriate payroll category
4. Select the most appropriate ATO category code
5. If uncertain, choose the most general category that fits

Respond in the following format:
Category: [CATEGORY_CODE]
PAYG_REPORTABLE: [true/false]
Recipient_Type: [employee/director/contractor/partner/unknown]
Reason: [Brief explanation]`
}
```

#### 2.2 ATO 카테고리 업데이트

```typescript
// lib/ai-classifier/ato-categories.ts (업데이트)
export const ATO_CATEGORIES: ATOCategory[] = [
  // ... 기존 카테고리 ...
  
  // PAYG 관련 카테고리 추가
  {
    code: 'EXPENSE_PAYROLL',
    name: 'Payroll - Employee Salaries',
    description: 'Employee salary payments (PAYG reportable)',
    parentCategory: 'EXPENSE',
  },
  {
    code: 'EXPENSE_DIRECTOR_FEE',
    name: 'Director Fees',
    description: 'Director remuneration and fees (PAYG reportable)',
    parentCategory: 'EXPENSE',
  },
  {
    code: 'EXPENSE_CONTRACTOR',
    name: 'Contractor Payments',
    description: 'Contractor and consultant payments (PAYG reportable if no ABN)',
    parentCategory: 'EXPENSE',
  },
  {
    code: 'EXPENSE_PARTNER_DISTRIBUTION',
    name: 'Partner Distributions',
    description: 'Partner profit distributions (PAYG reportable)',
    parentCategory: 'EXPENSE',
  },
  {
    code: 'LIABILITY_PAYG_WITHHOLDING',
    name: 'PAYG Withholding Liability',
    description: 'PAYG withholding tax collected (payable to ATO)',
    parentCategory: 'LIABILITY',
  },
]
```

---

### 3. BAS (Business Activity Statement) 지원 기능

#### 3.1 PAYG 요약 리포트 생성

분기별 또는 월별로 납부해야 할 총 PAYG 금액을 요약 리포트로 생성합니다.

```typescript
// lib/payg-withholding/bas-reporter.ts
export interface BASReport {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
  }
  
  paygSummary: {
    totalGrossPay: number
    totalWithholdingTax: number
    totalNetPay: number
    transactionCount: number
    
    byRecipientType: {
      employee: {
        count: number
        totalGross: number
        totalTax: number
      }
      director: {
        count: number
        totalGross: number
        totalTax: number
      }
      contractor: {
        count: number
        totalGross: number
        totalTax: number
        noABNCount: number
        noABNTotalTax: number
      }
      partner: {
        count: number
        totalGross: number
        totalTax: number
      }
    }
  }
  
  transactions: PayrollTransaction[]
}

export class BASReporter {
  /**
   * 기간별 PAYG 요약 리포트 생성
   */
  generateBASReport(
    transactions: PayrollTransaction[],
    startDate: string,
    endDate: string,
    periodType: 'monthly' | 'quarterly' = 'quarterly'
  ): BASReport {
    // 기간 내 거래 필터링
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.paymentDate)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end
    })

    // 수취인 유형별 집계
    const byType = {
      employee: { count: 0, totalGross: 0, totalTax: 0 },
      director: { count: 0, totalGross: 0, totalTax: 0 },
      contractor: { count: 0, totalGross: 0, totalTax: 0, noABNCount: 0, noABNTotalTax: 0 },
      partner: { count: 0, totalGross: 0, totalTax: 0 },
    }

    let totalGross = 0
    let totalTax = 0
    let totalNet = 0

    for (const tx of periodTransactions) {
      if (!tx.requiresPAYGReporting) continue

      totalGross += tx.grossAmount
      totalTax += tx.withholdingTax || 0
      totalNet += tx.netAmount || 0

      const type = tx.recipient.type
      if (byType[type]) {
        byType[type].count++
        byType[type].totalGross += tx.grossAmount
        byType[type].totalTax += tx.withholdingTax || 0

        // No ABN 처리 (계약자만)
        if (type === 'contractor' && !tx.recipient.abn) {
          byType.contractor.noABNCount++
          byType.contractor.noABNTotalTax += tx.withholdingTax || 0
        }
      }
    }

    return {
      period: {
        startDate,
        endDate,
        type: periodType,
      },
      paygSummary: {
        totalGrossPay: totalGross,
        totalWithholdingTax: totalTax,
        totalNetPay: totalNet,
        transactionCount: periodTransactions.length,
        byRecipientType: byType,
      },
      transactions: periodTransactions,
    }
  }

  /**
   * BAS 리포트를 엑셀 형식으로 내보내기
   */
  exportBASToExcel(report: BASReport, filename: string = 'bas-report.xlsx'): void {
    const rows = [
      ['BAS Report', '', '', ''],
      ['Period', `${report.period.startDate} to ${report.period.endDate}`, '', ''],
      ['Period Type', report.period.type, '', ''],
      ['', '', '', ''],
      ['PAYG Withholding Summary', '', '', ''],
      ['Total Gross Pay', `$${report.paygSummary.totalGrossPay.toFixed(2)}`, '', ''],
      ['Total Withholding Tax', `$${report.paygSummary.totalWithholdingTax.toFixed(2)}`, '', ''],
      ['Total Net Pay', `$${report.paygSummary.totalNetPay.toFixed(2)}`, '', ''],
      ['Transaction Count', report.paygSummary.transactionCount.toString(), '', ''],
      ['', '', '', ''],
      ['By Recipient Type', '', '', ''],
      ['Type', 'Count', 'Total Gross', 'Total Tax'],
      ['Employee', 
        report.paygSummary.byRecipientType.employee.count.toString(),
        `$${report.paygSummary.byRecipientType.employee.totalGross.toFixed(2)}`,
        `$${report.paygSummary.byRecipientType.employee.totalTax.toFixed(2)}`
      ],
      ['Director',
        report.paygSummary.byRecipientType.director.count.toString(),
        `$${report.paygSummary.byRecipientType.director.totalGross.toFixed(2)}`,
        `$${report.paygSummary.byRecipientType.director.totalTax.toFixed(2)}`
      ],
      ['Contractor',
        report.paygSummary.byRecipientType.contractor.count.toString(),
        `$${report.paygSummary.byRecipientType.contractor.totalGross.toFixed(2)}`,
        `$${report.paygSummary.byRecipientType.contractor.totalTax.toFixed(2)}`
      ],
      ['Contractor (No ABN)',
        report.paygSummary.byRecipientType.contractor.noABNCount.toString(),
        '',
        `$${report.paygSummary.byRecipientType.contractor.noABNTotalTax.toFixed(2)}`
      ],
      ['Partner',
        report.paygSummary.byRecipientType.partner.count.toString(),
        `$${report.paygSummary.byRecipientType.partner.totalGross.toFixed(2)}`,
        `$${report.paygSummary.byRecipientType.partner.totalTax.toFixed(2)}`
      ],
      ['', '', '', ''],
      ['Transaction Details', '', '', ''],
      ['Date', 'Recipient', 'Type', 'Gross', 'Tax', 'Net'],
      ...report.transactions.map(tx => [
        tx.paymentDate,
        tx.recipient.name,
        tx.recipient.type,
        `$${tx.grossAmount.toFixed(2)}`,
        `$${(tx.withholdingTax || 0).toFixed(2)}`,
        `$${(tx.netAmount || 0).toFixed(2)}`,
      ]),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BAS Report')
    XLSX.writeFile(workbook, filename)
  }
}
```

#### 3.2 No ABN Withholding (47%) 처리

```typescript
// lib/payg-withholding/no-abn-handler.ts
export class NoABNHandler {
  /**
   * ABN이 없는 파트너/계약자에게 지급 시 47% 원천징수 처리
   * 
   * 호주 ATO 규정:
   * - ABN이 없는 계약자에게 $75 이상 지급 시 47% 원천징수 필수
   * - ABN이 있으면 원천징수 불필요 (계약자가 직접 신고)
   */
  shouldWithholdNoABN(amount: number, hasABN: boolean): boolean {
    return !hasABN && amount >= 75
  }

  /**
   * No ABN Withholding 처리
   */
  processNoABNPayment(
    paymentDate: string,
    recipientName: string,
    grossAmount: number
  ): PayrollTransaction {
    const calculator = new PAYGTaxCalculator()
    const withholdingTax = calculator.calculateNoABNWithholding(grossAmount)
    const netAmount = grossAmount - withholdingTax

    return {
      paymentDate,
      recipient: {
        name: recipientName,
        type: 'contractor',
        abn: undefined,  // ABN 없음
      },
      grossAmount,
      withholdingTax,
      netAmount,
      requiresPAYGReporting: true,
    }
  }
}
```

---

### 4. 법인 설립 후 UI 구조

#### 4.1 Admin Dashboard 통합 구조

법인 설립 후 PAYG 관리 메뉴를 최상단에 배치합니다.

```typescript
// app/admin/accounting/page.tsx (Phase 2 통합 시)
export default function AccountingDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Accounting & PAYG Management</h1>
        
        {/* PAYG 관리 섹션 (최상단) */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">PAYG Withholding</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PayrollCalculator />
            <PAYGSummary />
            <BASReportGenerator />
          </div>
        </section>

        {/* PDF 파싱 및 분류 섹션 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Bank Statement Processing</h2>
          <FileUpload />
          <TransactionTable />
        </section>

        {/* 엑셀 내보내기 */}
        <section>
          <ExcelExportButton />
        </section>
      </div>
    </div>
  )
}
```

#### 4.2 PAYG 관리 컴포넌트

```typescript
// components/PayrollCalculator.tsx
'use client'

import { useState, useEffect } from 'react'
import { PAYGTaxCalculator } from '@/lib/payg-withholding/tax-calculator'
import { PAYGConfigManager, PAYGConfig } from '@/lib/payg-withholding/config'
import { PAYGWithholdingEngine } from '@/lib/payg-withholding/index'

export function PayrollCalculator() {
  const [paygConfig, setPaygConfig] = useState<PAYGConfig>({ isEnabled: false, autoCalculate: false, showWarnings: true })
  const [grossAmount, setGrossAmount] = useState(0)
  const [recipientType, setRecipientType] = useState<'employee' | 'director' | 'contractor' | 'partner'>('director')
  const [hasABN, setHasABN] = useState(true)
  const [result, setResult] = useState<PayrollTransaction | null>(null)
  const [noABNWarning, setNoABNWarning] = useState<{ shouldWarn: boolean; warningMessage: string; withholdingAmount?: number } | null>(null)

  const engine = new PAYGWithholdingEngine()

  useEffect(() => {
    setPaygConfig(PAYGConfigManager.loadConfig())
  }, [])

  const handleCalculate = () => {
    // No ABN 경고 체크 (PAYG 등록 여부와 무관)
    if (recipientType === 'contractor') {
      const warning = engine.checkNoABNWarning(grossAmount, hasABN, recipientType)
      setNoABNWarning(warning)
    } else {
      setNoABNWarning(null)
    }

    // PAYG 계산 (등록된 경우에만)
    if (paygConfig.isEnabled) {
      const calculator = new PAYGTaxCalculator()
      const transaction = calculator.createPayrollTransaction(
        new Date().toISOString().split('T')[0],
        {
          name: '',
          type: recipientType,
          abn: hasABN ? '12345678901' : undefined,
        },
        grossAmount
      )
      setResult(transaction)
    } else {
      // PAYG 미등록 시 기본 정보만 표시
      setResult({
        paymentDate: new Date().toISOString().split('T')[0],
        recipient: {
          name: '',
          type: recipientType,
          abn: hasABN ? '12345678901' : undefined,
        },
        grossAmount,
        withholdingTax: null,  // PAYG 미등록 시 null
        netAmount: grossAmount, // 전체 금액이 실지급액
        requiresPAYGReporting: false,
      })
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">Payroll Calculator</h3>
          <div className={`px-3 py-1 rounded text-sm font-medium ${
            paygConfig.isEnabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            PAYG: {paygConfig.isEnabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        
        {!paygConfig.isEnabled && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            ⚠️ PAYG Withholding is not registered. Calculations are for reference only. 
            No ABN withholding warnings will still be shown for legal compliance.
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Gross Amount</label>
          <input
            type="number"
            value={grossAmount}
            onChange={(e) => setGrossAmount(parseFloat(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Recipient Type</label>
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as any)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="director">Director</option>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        {recipientType === 'contractor' && (
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasABN}
                onChange={(e) => setHasABN(e.target.checked)}
                className="mr-2"
              />
              Has ABN (if unchecked, 47% withholding applies)
            </label>
          </div>
        )}

        <button
          onClick={handleCalculate}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Calculate
        </button>

        {/* No ABN 경고 (PAYG 등록 여부와 무관) */}
        {noABNWarning?.shouldWarn && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <div className="font-semibold text-red-800 mb-2">⚠️ Legal Warning</div>
            <div className="text-sm text-red-700">{noABNWarning.warningMessage}</div>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <div className="space-y-2">
              <div><strong>Gross:</strong> ${result.grossAmount.toFixed(2)}</div>
              {paygConfig.isEnabled ? (
                <>
                  <div><strong>Withholding Tax:</strong> ${result.withholdingTax?.toFixed(2) || '0.00'}</div>
                  <div><strong>Net Pay:</strong> ${result.netAmount?.toFixed(2)}</div>
                  <div><strong>PAYG Reportable:</strong> {result.requiresPAYGReporting ? 'Yes' : 'No'}</div>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">
                    <strong>Note:</strong> PAYG not registered. Full amount is payable.
                  </div>
                  {recipientType === 'director' && (
                    <div className="text-sm text-blue-600 mt-2">
                      💡 This may be classified as Director's Loan. Check Director's Loan section.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### 5. 데이터 모델 업데이트

```sql
-- PAYG 거래 내역 테이블
CREATE TABLE payg_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  payment_date DATE NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_type VARCHAR(20) NOT NULL, -- 'employee', 'director', 'contractor', 'partner'
  recipient_tfn VARCHAR(20),
  recipient_abn VARCHAR(20),
  gross_amount DECIMAL(15, 2) NOT NULL,
  withholding_tax DECIMAL(15, 2) NOT NULL,
  net_amount DECIMAL(15, 2) NOT NULL,
  requires_payg_reporting BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- BAS 리포트
CREATE TABLE bas_reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly'
  total_gross_pay DECIMAL(15, 2) NOT NULL,
  total_withholding_tax DECIMAL(15, 2) NOT NULL,
  total_net_pay DECIMAL(15, 2) NOT NULL,
  transaction_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6. API 엔드포인트 추가

```
POST /api/payg-calculate
  - Request: { grossAmount, recipientType, hasABN?, taxFreeThreshold? }
  - Response: PayrollTransaction

GET /api/bas-report
  - Request: { startDate, endDate, periodType }
  - Response: BASReport

POST /api/bas-report/export
  - Request: { reportId }
  - Response: Excel file download
```

---

## 💳 GST 정산 기능

> ⚠️ **중요**: 호주 GST(Goods and Services Tax)는 10%의 부가세입니다.
> - GST 등록 사업자는 모든 거래에서 GST 포함 여부를 추적해야 합니다.
> - 분기별 BAS 신고 시 GST Net (GST Collected - GST Paid)을 신고합니다.

### 1. GST 포함 여부 AI 판별

#### 1.1 AI 기반 GST 감지

모든 입출금 내역에서 AI가 GST 포함 여부를 자동으로 판별합니다.

```typescript
// lib/gst-settlement/gst-detector.ts
export interface GSTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  isGSTIncluded: boolean              // GST 포함 여부
  gstAmount?: number                  // GST 금액 (계산됨)
  netAmount?: number                  // GST 제외 금액
  gstRate: number                     // GST 세율 (기본 10%)
  transactionType: 'sale' | 'purchase' | 'expense'
  supplierABN?: string                // 공급자 ABN (구매 시)
}

export class GSTDetector {
  /**
   * AI를 사용하여 거래 내역에서 GST 포함 여부 판별
   */
  async detectGST(
    transaction: BankTransaction,
    context?: string[]
  ): Promise<GSTTransaction> {
    const prompt = this.buildGSTDetectionPrompt(transaction, context)
    
    // OpenAI API 호출
    const response = await this.callOpenAI(prompt)
    
    return this.parseGSTResponse(transaction, response)
  }

  /**
   * GST 감지 프롬프트 생성
   */
  private buildGSTDetectionPrompt(
    transaction: BankTransaction,
    context?: string[]
  ): string {
    return `Analyze the following Australian bank transaction and determine if GST (Goods and Services Tax) is included.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Category: ${transaction.category || 'UNCATEGORIZED'}

Australian GST Rules:
- GST rate is 10%
- GST registered businesses must include GST in prices
- Common GST-included transactions:
  * Sales to customers (if business is GST registered)
  * Purchases from GST registered suppliers
  * Most business expenses (if supplier is GST registered)
- GST-excluded transactions:
  * Wages and salaries
  * Interest income
  * Financial services (most cases)
  * Residential rent (if not commercial)

Instructions:
1. Analyze the transaction description for GST indicators
2. Check if the amount suggests GST inclusion (e.g., $110 = $100 + $10 GST)
3. Determine transaction type: 'sale', 'purchase', or 'expense'
4. If GST is included, calculate GST amount (amount / 11 * 1 for 10% GST)

Respond in the following format:
GST_INCLUDED: [true/false]
TRANSACTION_TYPE: [sale/purchase/expense]
GST_AMOUNT: [calculated amount if GST included, else 0]
NET_AMOUNT: [amount - GST amount]
REASON: [Brief explanation]`
  }

  /**
   * AI 응답 파싱
   */
  private parseGSTResponse(
    transaction: BankTransaction,
    aiResponse: string
  ): GSTTransaction {
    const amount = transaction.debit || transaction.credit || 0
    const isGSTIncluded = /GST_INCLUDED:\s*true/i.test(aiResponse)
    const transactionTypeMatch = aiResponse.match(/TRANSACTION_TYPE:\s*(\w+)/i)
    const transactionType = (transactionTypeMatch?.[1] || 'expense') as 'sale' | 'purchase' | 'expense'

    let gstAmount = 0
    let netAmount = amount

    if (isGSTIncluded) {
      // GST 포함 금액에서 GST 계산: amount / 11 * 1 (10% GST)
      gstAmount = Math.round((amount / 11) * 100) / 100
      netAmount = Math.round((amount - gstAmount) * 100) / 100
    }

    return {
      transactionId: transaction.reference || '',
      date: transaction.date,
      description: transaction.description,
      amount,
      isGSTIncluded,
      gstAmount: isGSTIncluded ? gstAmount : undefined,
      netAmount: isGSTIncluded ? netAmount : undefined,
      gstRate: 0.10, // 10%
      transactionType,
    }
  }

  /**
   * 금액 패턴 기반 GST 자동 감지 (AI 보조)
   */
  detectGSTByAmount(amount: number): boolean {
    // $110, $220 등 GST 포함 가능한 금액 패턴
    // 실제로는 AI 판별이 더 정확하지만, 빠른 체크용
    const roundedAmount = Math.round(amount * 100) / 100
    const potentialGST = roundedAmount / 11
    
    // GST 금액이 정수 또는 소수점 1자리인 경우 GST 포함 가능성
    return potentialGST > 0 && (potentialGST % 0.1) < 0.01
  }
}
```

#### 1.2 GST Net 계산

```typescript
// lib/gst-settlement/gst-calculator.ts
export interface GSTSummary {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
  }
  
  gstCollected: {
    total: number                    // 총 GST 징수액 (판매)
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstPaid: {
    total: number                    // 총 GST 납부액 (구매/비용)
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstNet: number                     // GST Net = GST Collected - GST Paid
  gstRefund: boolean                 // 환불 여부 (GST Net < 0)
}

export class GSTCalculator {
  /**
   * 기간별 GST Net 계산
   */
  calculateGSTNet(
    transactions: GSTTransaction[],
    startDate: string,
    endDate: string
  ): GSTSummary {
    // 기간 내 거래 필터링
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end && tx.isGSTIncluded
    })

    // GST 징수 (판매)
    const gstCollected = periodTransactions
      .filter(tx => tx.transactionType === 'sale' && tx.gstAmount)
      .reduce((sum, tx) => sum + (tx.gstAmount || 0), 0)

    // GST 납부 (구매/비용)
    const gstPaid = periodTransactions
      .filter(tx => (tx.transactionType === 'purchase' || tx.transactionType === 'expense') && tx.gstAmount)
      .reduce((sum, tx) => sum + (tx.gstAmount || 0), 0)

    const gstNet = gstCollected - gstPaid

    return {
      period: {
        startDate,
        endDate,
        type: this.getPeriodType(startDate, endDate),
      },
      gstCollected: {
        total: gstCollected,
        transactionCount: periodTransactions.filter(tx => tx.transactionType === 'sale').length,
        transactions: periodTransactions.filter(tx => tx.transactionType === 'sale'),
      },
      gstPaid: {
        total: gstPaid,
        transactionCount: periodTransactions.filter(tx => 
          tx.transactionType === 'purchase' || tx.transactionType === 'expense'
        ).length,
        transactions: periodTransactions.filter(tx => 
          tx.transactionType === 'purchase' || tx.transactionType === 'expense'
        ),
      },
      gstNet,
      gstRefund: gstNet < 0,
    }
  }

  private getPeriodType(startDate: string, endDate: string): 'monthly' | 'quarterly' {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 35 ? 'monthly' : 'quarterly'
  }
}
```

#### 1.3 BAS GST 리포트

```typescript
// lib/gst-settlement/bas-gst-reporter.ts
export class BASGSTReporter {
  /**
   * BAS 신고용 GST 리포트 생성
   */
  generateBASGSTReport(gstSummary: GSTSummary): BASGSTReport {
    return {
      period: gstSummary.period,
      g1TotalSales: this.calculateTotalSales(gstSummary.gstCollected.transactions),
      g2ExportSales: 0, // 수출 매출 (GST 면제)
      g3OtherGSTFreeSales: 0, // 기타 GST 면제 매출
      g4CapitalAcquisitions: 0, // 자본 취득
      g5NonCapitalAcquisitions: this.calculateTotalPurchases(gstSummary.gstPaid.transactions),
      g6GSTOnSales: gstSummary.gstCollected.total,
      g7GSTOnPurchases: gstSummary.gstPaid.total,
      g8GSTNet: gstSummary.gstNet,
      g9GSTRefund: gstSummary.gstRefund ? Math.abs(gstSummary.gstNet) : 0,
    }
  }

  private calculateTotalSales(transactions: GSTTransaction[]): number {
    return transactions.reduce((sum, tx) => sum + (tx.netAmount || tx.amount), 0)
  }

  private calculateTotalPurchases(transactions: GSTTransaction[]): number {
    return transactions.reduce((sum, tx) => sum + (tx.netAmount || tx.amount), 0)
  }
}

export interface BASGSTReport {
  period: { startDate: string; endDate: string; type: 'monthly' | 'quarterly' }
  g1TotalSales: number              // G1: 총 매출
  g2ExportSales: number              // G2: 수출 매출
  g3OtherGSTFreeSales: number       // G3: 기타 GST 면제 매출
  g4CapitalAcquisitions: number      // G4: 자본 취득
  g5NonCapitalAcquisitions: number   // G5: 비자본 취득
  g6GSTOnSales: number               // G6: 판매 시 GST
  g7GSTOnPurchases: number           // G7: 구매 시 GST
  g8GSTNet: number                   // G8: GST Net (납부액)
  g9GSTRefund: number                // G9: GST 환불액
}
```

---

## 🍽️ FBT (복리후생세) 감지 시스템

> ⚠️ **중요**: FBT(Fringe Benefits Tax)는 직원에게 제공하는 복리후생에 대한 세금입니다.
> - 식대, 접대비, 여행비 등이 FBT 대상이 될 수 있습니다.
> - 연간 FBT 신고 필요 (3월 31일 마감)

### 1. FBT 이슈 감지

#### 1.1 FBT 대상 거래 감지

```typescript
// lib/fbt-monitoring/fbt-detector.ts
export interface FBTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  fbtCategory: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
  fbtRisk: 'low' | 'medium' | 'high'  // FBT 위험도
  isFBTReportable: boolean
  fbtAmount?: number                   // FBT 금액 (계산됨)
  employeeName?: string                 // 직원 이름 (가능한 경우)
}

export class FBTDetector {
  /**
   * AI를 사용하여 FBT 이슈 가능 거래 감지
   */
  async detectFBT(
    transaction: BankTransaction,
    context?: string[]
  ): Promise<FBTTransaction | null> {
    const prompt = this.buildFBTDetectionPrompt(transaction, context)
    const response = await this.callOpenAI(prompt)
    
    if (!this.isFBTRelevant(response)) {
      return null
    }

    return this.parseFBTResponse(transaction, response)
  }

  /**
   * FBT 감지 프롬프트 생성
   */
  private buildFBTDetectionPrompt(
    transaction: BankTransaction,
    context?: string[]
  ): string {
    return `Analyze the following Australian bank transaction for FBT (Fringe Benefits Tax) implications.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${transaction.debit ? `-$${transaction.debit}` : `+$${transaction.credit}`}
- Category: ${transaction.category || 'UNCATEGORIZED'}

Australian FBT Rules:
FBT applies to benefits provided to employees (not contractors):
- Meals & Entertainment: Business meals, client entertainment
- Travel: Employee travel, accommodation
- Vehicle: Company car for private use
- Other: Gifts, memberships, etc.

FBT Exemptions:
- Minor benefits (< $300)
- Work-related travel
- Certain meal expenses (if conditions met)

Instructions:
1. Determine if this transaction could be an employee benefit
2. Classify FBT category: 'meal', 'entertainment', 'travel', 'vehicle', or 'other'
3. Assess FBT risk: 'low', 'medium', or 'high'
4. Determine if FBT reportable (consider exemptions)

Respond in the following format:
FBT_RELEVANT: [true/false]
FBT_CATEGORY: [meal/entertainment/travel/vehicle/other]
FBT_RISK: [low/medium/high]
FBT_REPORTABLE: [true/false]
REASON: [Brief explanation]`
  }

  private isFBTRelevant(aiResponse: string): boolean {
    return /FBT_RELEVANT:\s*true/i.test(aiResponse)
  }

  private parseFBTResponse(
    transaction: BankTransaction,
    aiResponse: string
  ): FBTTransaction {
    const amount = transaction.debit || transaction.credit || 0
    const categoryMatch = aiResponse.match(/FBT_CATEGORY:\s*(\w+)/i)
    const riskMatch = aiResponse.match(/FBT_RISK:\s*(\w+)/i)
    const reportableMatch = aiResponse.match(/FBT_REPORTABLE:\s*true/i)

    const fbtCategory = (categoryMatch?.[1] || 'other') as FBTTransaction['fbtCategory']
    const fbtRisk = (riskMatch?.[1] || 'low') as FBTTransaction['fbtRisk']
    const isFBTReportable = reportableMatch !== null

    // FBT 금액 계산 (FBT rate: 47% of grossed-up value)
    // 단순화: FBT = amount * 0.47 (실제로는 더 복잡한 계산)
    const fbtAmount = isFBTReportable ? Math.round(amount * 0.47 * 100) / 100 : undefined

    return {
      transactionId: transaction.reference || '',
      date: transaction.date,
      description: transaction.description,
      amount,
      fbtCategory,
      fbtRisk,
      isFBTReportable,
      fbtAmount,
    }
  }
}
```

#### 1.2 FBT 보고서 생성

```typescript
// lib/fbt-monitoring/fbt-reporter.ts
export interface FBTReport {
  financialYear: string                // 예: "2024-25"
  period: {
    startDate: string
    endDate: string
  }
  
  summary: {
    totalFBTAmount: number
    transactionCount: number
    byCategory: {
      meal: { count: number; total: number }
      entertainment: { count: number; total: number }
      travel: { count: number; total: number }
      vehicle: { count: number; total: number }
      other: { count: number; total: number }
    }
    byRisk: {
      low: { count: number; total: number }
      medium: { count: number; total: number }
      high: { count: number; total: number }
    }
  }
  
  transactions: FBTTransaction[]
}

export class FBTReporter {
  /**
   * 연간 FBT 보고서 생성
   */
  generateFBTReport(
    transactions: FBTTransaction[],
    financialYear: string,
    startDate: string,
    endDate: string
  ): FBTReport {
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end && tx.isFBTReportable
    })

    const byCategory = {
      meal: { count: 0, total: 0 },
      entertainment: { count: 0, total: 0 },
      travel: { count: 0, total: 0 },
      vehicle: { count: 0, total: 0 },
      other: { count: 0, total: 0 },
    }

    const byRisk = {
      low: { count: 0, total: 0 },
      medium: { count: 0, total: 0 },
      high: { count: 0, total: 0 },
    }

    let totalFBT = 0

    for (const tx of periodTransactions) {
      totalFBT += tx.fbtAmount || 0

      // 카테고리별 집계
      if (byCategory[tx.fbtCategory]) {
        byCategory[tx.fbtCategory].count++
        byCategory[tx.fbtCategory].total += tx.fbtAmount || 0
      }

      // 위험도별 집계
      if (byRisk[tx.fbtRisk]) {
        byRisk[tx.fbtRisk].count++
        byRisk[tx.fbtRisk].total += tx.fbtAmount || 0
      }
    }

    return {
      financialYear,
      period: { startDate, endDate },
      summary: {
        totalFBTAmount: totalFBT,
        transactionCount: periodTransactions.length,
        byCategory,
        byRisk,
      },
      transactions: periodTransactions,
    }
  }
}
```

---

## 📊 통합 세무 대시보드

### 1. 신고 마감일 추적

#### 1.1 BAS 마감일 계산기

```typescript
// lib/tax-dashboard/deadline-tracker.ts
export interface TaxDeadline {
  taxType: 'BAS' | 'FBT' | 'PAYG' | 'Income Tax'
  period: string                       // 예: "Q1 2024-25"
  dueDate: string                      // YYYY-MM-DD
  daysRemaining: number
  status: 'upcoming' | 'due-soon' | 'overdue' | 'submitted'
  estimatedAmount?: number             // 예상 납부 금액
}

export class DeadlineTracker {
  /**
   * BAS 분기별 마감일 계산
   * BAS는 분기 종료 후 28일 내 신고
   */
  getBASDeadlines(financialYear: string): TaxDeadline[] {
    const deadlines: TaxDeadline[] = []

    // 호주 재정연도: 7월 1일 ~ 6월 30일
    const quarters = [
      { name: 'Q1', endMonth: 9, endDay: 30 },   // 7-9월
      { name: 'Q2', endMonth: 12, endDay: 31 },  // 10-12월
      { name: 'Q3', endMonth: 3, endDay: 31 },   // 1-3월
      { name: 'Q4', endMonth: 6, endDay: 30 },   // 4-6월
    ]

    const [startYear, endYear] = financialYear.split('-').map(Number)

    for (const quarter of quarters) {
      const quarterEndDate = new Date(startYear, quarter.endMonth - 1, quarter.endDay)
      const dueDate = new Date(quarterEndDate)
      dueDate.setDate(dueDate.getDate() + 28) // 분기 종료 후 28일

      const daysRemaining = Math.ceil(
        (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )

      deadlines.push({
        taxType: 'BAS',
        period: `${quarter.name} ${financialYear}`,
        dueDate: dueDate.toISOString().split('T')[0],
        daysRemaining,
        status: this.getStatus(daysRemaining),
      })
    }

    return deadlines
  }

  /**
   * FBT 마감일 (3월 31일)
   */
  getFBTDeadline(financialYear: string): TaxDeadline {
    const [startYear] = financialYear.split('-').map(Number)
    const dueDate = new Date(startYear + 1, 2, 31) // 다음 해 3월 31일

    const daysRemaining = Math.ceil(
      (dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      taxType: 'FBT',
      period: `FY ${financialYear}`,
      dueDate: dueDate.toISOString().split('T')[0],
      daysRemaining,
      status: this.getStatus(daysRemaining),
    }
  }

  private getStatus(daysRemaining: number): TaxDeadline['status'] {
    if (daysRemaining < 0) return 'overdue'
    if (daysRemaining <= 7) return 'due-soon'
    if (daysRemaining <= 30) return 'upcoming'
    return 'upcoming'
  }
}
```

#### 1.2 납부 금액 추정

```typescript
// lib/tax-dashboard/payment-estimator.ts
export interface TaxPaymentEstimate {
  taxType: 'BAS' | 'FBT' | 'PAYG'
  period: string
  estimatedAmount: number
  breakdown: {
    gstNet?: number
    paygWithholding?: number
    fbtAmount?: number
  }
  confidence: 'high' | 'medium' | 'low'
}

export class PaymentEstimator {
  /**
   * BAS 예상 납부 금액 추정
   */
  estimateBASPayment(
    gstSummary: GSTSummary,
    paygSummary: BASReport['paygSummary']
  ): TaxPaymentEstimate {
    const gstNet = gstSummary.gstNet
    const paygWithholding = paygSummary.totalWithholdingTax

    const estimatedAmount = gstNet + paygWithholding

    return {
      taxType: 'BAS',
      period: `${gstSummary.period.startDate} to ${gstSummary.period.endDate}`,
      estimatedAmount,
      breakdown: {
        gstNet,
        paygWithholding,
      },
      confidence: this.calculateConfidence(gstSummary, paygSummary),
    }
  }

  /**
   * FBT 예상 납부 금액 추정
   */
  estimateFBTPayment(fbtReport: FBTReport): TaxPaymentEstimate {
    return {
      taxType: 'FBT',
      period: `FY ${fbtReport.financialYear}`,
      estimatedAmount: fbtReport.summary.totalFBTAmount,
      breakdown: {
        fbtAmount: fbtReport.summary.totalFBTAmount,
      },
      confidence: 'medium', // FBT는 연간 집계이므로 중간 신뢰도
    }
  }

  private calculateConfidence(
    gstSummary: GSTSummary,
    paygSummary: BASReport['paygSummary']
  ): 'high' | 'medium' | 'low' {
    // 거래 수가 많고 GST 판별이 정확할수록 높은 신뢰도
    const totalTransactions = gstSummary.gstCollected.transactionCount + 
                            gstSummary.gstPaid.transactionCount +
                            paygSummary.transactionCount

    if (totalTransactions > 50) return 'high'
    if (totalTransactions > 20) return 'medium'
    return 'low'
  }
}
```

### 2. 통합 대시보드 컴포넌트

```typescript
// components/TaxDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { DeadlineTracker } from '@/lib/tax-dashboard/deadline-tracker'
import { PaymentEstimator } from '@/lib/tax-dashboard/payment-estimator'
import { PAYGConfigManager } from '@/lib/payg-withholding/config'

export function TaxDashboard() {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>([])
  const [estimates, setEstimates] = useState<TaxPaymentEstimate[]>([])
  const [paygEnabled, setPaygEnabled] = useState(false)

  useEffect(() => {
    const config = PAYGConfigManager.loadConfig()
    setPaygEnabled(config.isEnabled)

    const tracker = new DeadlineTracker()
    const currentFY = getCurrentFinancialYear()
    const basDeadlines = tracker.getBASDeadlines(currentFY)
    const fbtDeadline = tracker.getFBTDeadline(currentFY)
    
    // PAYG 등록된 경우에만 PAYG 마감일 표시
    const allDeadlines = [...basDeadlines, fbtDeadline]
    setDeadlines(allDeadlines)
  }, [])

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Tax Dashboard</h2>
      
      {/* PAYG 상태 표시 */}
      {!paygEnabled && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">PAYG Not Registered</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>PAYG Withholding is currently disabled. When you register for PAYG, all features will be automatically enabled.</p>
                <p className="mt-1">💡 <strong>Tip:</strong> Use Director's Loan tracking for personal withdrawals from company account.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 신고 마감일 캘린더 */}
      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Upcoming Deadlines</h3>
        <div className="space-y-2">
          {deadlines.map((deadline, idx) => {
            // PAYG 미등록 시 PAYG 관련 마감일은 표시하지 않음
            if (!paygEnabled && deadline.taxType === 'PAYG') {
              return null
            }
            
            return (
              <div
                key={idx}
                className={`p-3 rounded border ${
                  deadline.status === 'overdue' ? 'border-red-500 bg-red-50' :
                  deadline.status === 'due-soon' ? 'border-orange-500 bg-orange-50' :
                  'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{deadline.taxType} - {deadline.period}</div>
                    <div className="text-sm text-gray-600">Due: {deadline.dueDate}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      deadline.status === 'overdue' ? 'text-red-600' :
                      deadline.status === 'due-soon' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      {deadline.daysRemaining < 0 
                        ? `${Math.abs(deadline.daysRemaining)} days overdue`
                        : `${deadline.daysRemaining} days remaining`
                      }
                    </div>
                    {deadline.estimatedAmount && (
                      <div className="text-sm">Est: ${deadline.estimatedAmount.toFixed(2)}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 예상 납부 금액 */}
      <section>
        <h3 className="text-lg font-semibold mb-3">Payment Estimates</h3>
        {/* 예상 납부 금액 표시 */}
      </section>
    </div>
  )
}

function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  if (month >= 7) {
    return `${year}-${year + 1}`
  } else {
    return `${year - 1}-${year}`
  }
}
```

### 3. 세무 등록 설정

```typescript
// components/TaxRegistrationSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { PAYGConfigManager, PAYGConfig } from '@/lib/payg-withholding/config'

export interface TaxRegistration {
  gstRegistered: boolean
  gstRegistrationDate?: string
  paygRegistered: boolean
  paygRegistrationDate?: string
  paygRegistrationNumber?: string
  fbtRegistered: boolean
  fbtRegistrationDate?: string
  abn: string
  acn?: string                        // 법인 등록번호
}

export function TaxRegistrationSettings() {
  const [registration, setRegistration] = useState<TaxRegistration>({
    gstRegistered: false,
    paygRegistered: false,
    fbtRegistered: false,
    abn: '',
  })

  const [paygConfig, setPaygConfig] = useState<PAYGConfig>({ isEnabled: false, autoCalculate: false, showWarnings: true })

  useEffect(() => {
    const config = PAYGConfigManager.loadConfig()
    setPaygConfig(config)
    setRegistration(prev => ({
      ...prev,
      paygRegistered: config.isEnabled,
      paygRegistrationDate: config.registrationDate,
      paygRegistrationNumber: config.registrationNumber,
    }))
  }, [])

  const handlePAYGToggle = (enabled: boolean) => {
    if (enabled) {
      const registrationDate = new Date().toISOString().split('T')[0]
      PAYGConfigManager.enablePAYG(registrationDate)
      setRegistration(prev => ({
        ...prev,
        paygRegistered: true,
        paygRegistrationDate: registrationDate,
      }))
    } else {
      PAYGConfigManager.disablePAYG()
      setRegistration(prev => ({
        ...prev,
        paygRegistered: false,
        paygRegistrationDate: undefined,
        paygRegistrationNumber: undefined,
      }))
    }
    setPaygConfig(PAYGConfigManager.loadConfig())
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">Tax Registration Settings</h2>
      
      <div className="space-y-4">
        {/* ABN */}
        <div>
          <label className="block text-sm font-medium mb-1">ABN (Australian Business Number)</label>
          <input
            type="text"
            value={registration.abn}
            onChange={(e) => setRegistration({ ...registration, abn: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="12 345 678 901"
          />
        </div>

        {/* ACN */}
        <div>
          <label className="block text-sm font-medium mb-1">ACN (Australian Company Number) - Optional</label>
          <input
            type="text"
            value={registration.acn || ''}
            onChange={(e) => setRegistration({ ...registration, acn: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="123 456 789"
          />
        </div>

        {/* GST 등록 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={registration.gstRegistered}
            onChange={(e) => setRegistration({ 
              ...registration, 
              gstRegistered: e.target.checked,
              gstRegistrationDate: e.target.checked ? new Date().toISOString().split('T')[0] : undefined
            })}
            className="mr-2"
          />
          <label>GST Registered</label>
          {registration.gstRegistered && (
            <input
              type="date"
              value={registration.gstRegistrationDate || ''}
              onChange={(e) => setRegistration({ ...registration, gstRegistrationDate: e.target.value })}
              className="ml-4 border rounded px-2 py-1"
            />
          )}
        </div>

        {/* PAYG 등록 - 모듈화된 설정 */}
        <div className="border-t pt-4">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={registration.paygRegistered}
              onChange={(e) => handlePAYGToggle(e.target.checked)}
              className="mr-2"
            />
            <label className="font-medium">PAYG Withholding Registered</label>
          </div>
          
          {registration.paygRegistered ? (
            <div className="ml-6 space-y-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Registration Date</label>
                <input
                  type="date"
                  value={registration.paygRegistrationDate || ''}
                  onChange={(e) => {
                    const date = e.target.value
                    PAYGConfigManager.enablePAYG(date, registration.paygRegistrationNumber)
                    setRegistration({ ...registration, paygRegistrationDate: date })
                  }}
                  className="border rounded px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Registration Number (Optional)</label>
                <input
                  type="text"
                  value={registration.paygRegistrationNumber || ''}
                  onChange={(e) => {
                    const number = e.target.value
                    PAYGConfigManager.enablePAYG(registration.paygRegistrationDate || '', number)
                    setRegistration({ ...registration, paygRegistrationNumber: number })
                  }}
                  className="border rounded px-2 py-1"
                  placeholder="PAYG Registration Number"
                />
              </div>
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✅ PAYG features are now active. Withholding calculations and BAS reporting are enabled.
              </div>
            </div>
          ) : (
            <div className="ml-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ PAYG is not registered. 
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>PAYG withholding calculations are disabled</li>
                <li>Director's Loan tracking is recommended for personal withdrawals</li>
                <li>No ABN withholding warnings will still be shown for legal compliance</li>
              </ul>
            </div>
          )}
        </div>

        {/* FBT 등록 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={registration.fbtRegistered}
            onChange={(e) => setRegistration({ 
              ...registration, 
              fbtRegistered: e.target.checked,
              fbtRegistrationDate: e.target.checked ? new Date().toISOString().split('T')[0] : undefined
            })}
            className="mr-2"
          />
          <label>FBT Registered</label>
          {registration.fbtRegistered && (
            <input
              type="date"
              value={registration.fbtRegistrationDate || ''}
              onChange={(e) => setRegistration({ ...registration, fbtRegistrationDate: e.target.value })}
              className="ml-4 border rounded px-2 py-1"
            />
          )}
        </div>

        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Save Settings
        </button>
      </div>
    </div>
  )
}
```

---

### 4. 데이터 모델 업데이트

```sql
-- 세무 등록 정보
CREATE TABLE tax_registrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  abn VARCHAR(20) NOT NULL,
  acn VARCHAR(20),
  gst_registered BOOLEAN DEFAULT false,
  gst_registration_date DATE,
  payg_registered BOOLEAN DEFAULT false,
  payg_registration_date DATE,
  fbt_registered BOOLEAN DEFAULT false,
  fbt_registration_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GST 거래 내역
CREATE TABLE gst_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  transaction_id UUID REFERENCES accounting_transactions(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  is_gst_included BOOLEAN NOT NULL,
  gst_amount DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'purchase', 'expense'
  created_at TIMESTAMP DEFAULT NOW()
);

-- FBT 거래 내역
CREATE TABLE fbt_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  transaction_id UUID REFERENCES accounting_transactions(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fbt_category VARCHAR(20) NOT NULL,
  fbt_risk VARCHAR(10) NOT NULL,
  is_fbt_reportable BOOLEAN NOT NULL,
  fbt_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔗 Phase 2: 홈페이지 통합

### 통합 전략

1. **모듈형 아키텍처**: 모든 로직을 함수형 모듈로 작성하여 의존성 최소화
2. **인증 통합**: 메인 홈페이지의 인증 시스템과 연동
3. **데이터베이스 통합**: 메인 홈페이지 DB에 회계 데이터 저장
4. **UI 통합**: Admin Dashboard 내 모듈로 통합

### 통합 시 파일 구조

```
selpic2/
├── app/
│   └── admin/
│       └── accounting/              # 통합된 회계 모듈
│           ├── page.tsx             # PAYG 관리 최상단 배치
│           ├── payg/
│           │   ├── page.tsx         # PAYG 관리 전용 페이지
│           │   └── bas/
│           │       └── page.tsx     # BAS 리포트 페이지
│           └── components/
│
└── lib/
    └── accounting/                  # 회계 로직 모듈 (복사)
        ├── pdf-parser/
        ├── ai-classifier/
        ├── payg-withholding/        # PAYG 원천징수 모듈
        ├── excel-export/
        └── feedback/
```

---

## 🛠️ 기술 스택

### Phase 1 (독립 앱)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **PDF Parsing**: `pdf-parse`
- **AI**: OpenAI API (GPT-4o-mini)
- **Excel Export**: `xlsx`
- **UI**: React, Tailwind CSS
- **State Management**: Zustand (선택적)
- **Storage**: LocalStorage (Phase 1), Database (Phase 2)

### Phase 2 (통합)
- 기존 홈페이지 기술 스택과 동일
- 회계 모듈만 추가

---

## 📊 데이터 모델

### Phase 1 (로컬 스토리지)

```typescript
// types/index.ts
export interface AccountingSession {
  id: string
  uploadedAt: Date
  statement: ParsedStatement
  transactions: BankTransaction[]
  feedbacks: ClassificationFeedback[]
  excelExported: boolean
  exportedAt?: Date
}
```

### Phase 2 (데이터베이스)

```sql
-- 회계 세션
CREATE TABLE accounting_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  bank_name VARCHAR(50),
  account_number VARCHAR(50),
  statement_period_start DATE,
  statement_period_end DATE,
  opening_balance DECIMAL(15, 2),
  closing_balance DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 거래 내역
CREATE TABLE accounting_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  debit DECIMAL(15, 2),
  credit DECIMAL(15, 2),
  balance DECIMAL(15, 2),
  category VARCHAR(50),
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 피드백
CREATE TABLE accounting_feedbacks (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES accounting_transactions(id),
  original_category VARCHAR(50),
  corrected_category VARCHAR(50) NOT NULL,
  user_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 세무 등록 정보
CREATE TABLE tax_registrations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  abn VARCHAR(20) NOT NULL,
  acn VARCHAR(20),
  gst_registered BOOLEAN DEFAULT false,
  gst_registration_date DATE,
  payg_registered BOOLEAN DEFAULT false,
  payg_registration_date DATE,
  fbt_registered BOOLEAN DEFAULT false,
  fbt_registration_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- GST 거래 내역
CREATE TABLE gst_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  transaction_id UUID REFERENCES accounting_transactions(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  is_gst_included BOOLEAN NOT NULL,
  gst_amount DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  transaction_type VARCHAR(20) NOT NULL, -- 'sale', 'purchase', 'expense'
  created_at TIMESTAMP DEFAULT NOW()
);

-- FBT 거래 내역
CREATE TABLE fbt_transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES accounting_sessions(id),
  transaction_id UUID REFERENCES accounting_transactions(id),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fbt_category VARCHAR(20) NOT NULL,
  fbt_risk VARCHAR(10) NOT NULL,
  is_fbt_reportable BOOLEAN NOT NULL,
  fbt_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API 설계

### Phase 1 API 엔드포인트

```
POST /api/parse-pdf
  - Request: FormData (PDF file)
  - Response: ParsedStatement

POST /api/classify
  - Request: { transactions: BankTransaction[], apiKey?: string }
  - Response: { transactions: BankTransaction[] } (with categories)

POST /api/feedback
  - Request: ClassificationFeedback
  - Response: { success: boolean }

GET /api/export-excel
  - Request: { sessionId: string }
  - Response: Excel file download

POST /api/gst-calculate
  - Request: { transactions: BankTransaction[], apiKey?: string }
  - Response: { transactions: GSTTransaction[] }

GET /api/gst-summary
  - Request: { startDate: string, endDate: string }
  - Response: GSTSummary

POST /api/fbt-detect
  - Request: { transactions: BankTransaction[], apiKey?: string }
  - Response: { transactions: FBTTransaction[] }

GET /api/fbt-report
  - Request: { financialYear: string, startDate: string, endDate: string }
  - Response: FBTReport

GET /api/tax-dashboard
  - Request: { financialYear?: string }
  - Response: { deadlines: TaxDeadline[], estimates: TaxPaymentEstimate[] }

GET /api/tax-registration
  - Response: TaxRegistration

POST /api/tax-registration
  - Request: TaxRegistration
  - Response: { success: boolean }
```

---

## 📝 구현 단계

### Phase 1: 독립 앱 개발

#### Week 1-2: PDF 파싱 엔진
- [ ] `pdf-parse` 설치 및 기본 파싱 구현
- [ ] CBA 파서 개발 및 테스트
- [ ] ANZ 파서 개발 및 테스트
- [ ] 파서 팩토리 구현

#### Week 3: AI 분류 엔진
- [ ] OpenAI API 클라이언트 구현
- [ ] 프롬프트 엔지니어링
- [ ] ATO 카테고리 정의
- [ ] 시스템 키 / BYOK 아키텍처 구현

#### Week 4: 피드백 루프
- [ ] 피드백 데이터 모델 설계
- [ ] 피드백 저장 로직
- [ ] 학습 데이터 생성 로직
- [ ] 추천 시스템 구현

#### Week 5: UI 개발
- [ ] 파일 업로드 컴포넌트
- [ ] 거래 내역 테이블
- [ ] 카테고리 수정 UI
- [ ] PAYG 계산기 컴포넌트
- [ ] BAS 리포트 컴포넌트
- [ ] 엑셀 내보내기 버튼

#### Week 6-7: PAYG Withholding 기능 (모듈화)
- [ ] PAYG 설정 관리 시스템 (On/Off)
- [ ] PAYG 세율 계산 엔진 구현
- [ ] 급여/보수 처리 로직 (조건부 활성화)
- [ ] No ABN Withholding (47%) 처리 (항상 활성)
- [ ] AI 분류에 PAYG 태그 추가
- [ ] BAS 리포트 생성 기능 (PAYG 등록 시에만)
- [ ] PAYG 관리 UI 개발 (대기 상태 표시)
- [ ] Director's Loan 감지 및 관리 시스템

#### Week 8: 비즈니스 로직 고도화
- [ ] Director's Loan 자본 투입 감지 (Pre-revenue)
- [ ] Pre-trading Expenses 감지 및 분류
- [ ] 부문별 분류 시스템 (Cleaning/Sticker)
- [ ] 사업 주체 추적 (Partnership/Company)
- [ ] 계약 승계(Novation) 추적
- [ ] TPAR 리포트 생성 (Cleaning 부문)

#### Week 9: GST 정산 기능
- [ ] GST 포함 여부 AI 판별 엔진
- [ ] GST Net 계산 로직
- [ ] BAS GST 리포트 생성
- [ ] GST 요약 UI 개발

#### Week 10: FBT 감지 시스템
- [ ] FBT 이슈 감지 엔진
- [ ] FBT 카테고리 분류
- [ ] FBT 보고서 생성
- [ ] FBT 모니터링 UI 개발

#### Week 11: 비즈니스 리포트 생성
- [ ] Director's Loan 대시보드 (상환 가능 잔액 표시)
- [ ] Pre-trading Expenses 리포트
- [ ] 부문별 손익 분석 리포트
- [ ] TPAR 리포트 (Cleaning 부문)
- [ ] 사업 주체별 추적 리포트

#### Week 12: 통합 세무 대시보드
- [ ] 신고 마감일 추적 시스템
- [ ] 납부 금액 추정 엔진
- [ ] 통합 대시보드 UI 개발
- [ ] 세무 등록 설정 메뉴
- [ ] 자금 흐름 가드레일 UI (Partnership vs Company)

#### Week 13: 통합 및 테스트
- [ ] 전체 플로우 통합
- [ ] Director's Loan 추적 정확도 검증
- [ ] Pre-trading Expenses 분류 정확도 검증
- [ ] 부문별 분류 정확도 검증
- [ ] PAYG 계산 정확도 검증
- [ ] GST 판별 정확도 검증
- [ ] FBT 감지 정확도 검증
- [ ] 다양한 PDF 샘플 테스트 (1-3월 Pre-revenue 기간 포함)
- [ ] BAS 리포트 정확도 검증
- [ ] TPAR 리포트 정확도 검증
- [ ] 세무 대시보드 통합 테스트
- [ ] 에러 핸들링
- [ ] 사용자 테스트

### Phase 2: 홈페이지 통합 (검증 후)

- [ ] 모듈 코드 복사 및 의존성 정리
- [ ] 인증 시스템 통합
- [ ] 데이터베이스 스키마 생성
- [ ] Admin Dashboard UI 통합
- [ ] 사용자별 데이터 저장

---

## 🎯 다음 단계

**지금 즉시 시작할 작업**:
1. `apps/accounting-sandbox` 디렉토리 생성
2. Next.js 프로젝트 초기화
3. PDF 파싱 엔진 초기 코드 작성 (CBA 파서부터)

**준비 명령어**:
```bash
# Phase 1 시작 시 실행
mkdir -p apps/accounting-sandbox
cd apps/accounting-sandbox
npx create-next-app@latest . --typescript --tailwind --app
npm install pdf-parse xlsx
npm install -D @types/pdf-parse
```

---

---

## 📌 세무 기능 통합 요약

### 핵심 기능

#### 1. PAYG Withholding (모듈화)
1. ✅ **모듈화 설계**: PAYG 등록 여부에 따라 On/Off 가능
2. ✅ **초기 상태**: PAYG 미등록 시 기본적으로 Off (대기 상태)
3. ✅ **급여 및 보수 처리**: PAYG 등록 시 ATO 세율표 기반 자동 계산
4. ✅ **AI 자동 태그**: PAYG 등록 시 급여/보수 거래 자동 감지 및 태그
5. ✅ **BAS 지원**: PAYG 등록 시 분기별/월별 PAYG 요약 리포트 생성
6. ✅ **No ABN 처리**: PAYG 등록 여부와 무관하게 ABN 없는 파트너 47% 원천징수 경고 (법적 의무)
7. ✅ **Director's Loan 관리**: PAYG 미등록 시 이사 대여금 집중 관리

#### 2. GST 정산
1. ✅ **GST 포함 여부 AI 판별**: 모든 거래에서 자동 감지
2. ✅ **GST Net 계산**: GST Collected - GST Paid 자동 계산
3. ✅ **BAS GST 리포트**: 분기별 BAS 신고용 리포트 생성
4. ✅ **GST 요약 대시보드**: 실시간 GST 집계 표시

#### 3. FBT 감지
1. ✅ **FBT 이슈 자동 감지**: 식대, 접대비, 여행비 등 자동 모니터링
2. ✅ **FBT 카테고리 분류**: meal, entertainment, travel, vehicle 등
3. ✅ **FBT 위험도 평가**: low, medium, high 자동 평가
4. ✅ **FBT 보고서**: 연간 FBT 신고용 보고서 생성

#### 4. 통합 세무 대시보드
1. ✅ **신고 마감일 추적**: BAS, FBT, PAYG 마감일 캘린더 표시
2. ✅ **납부 금액 추정**: 실시간 예상 납부 금액 계산
3. ✅ **세무 등록 설정**: GST, PAYG, FBT 등록 상태 관리
4. ✅ **알림 시스템**: 마감일 임박 시 자동 알림

### 법적 준수
- 호주 ATO PAYG Withholding 규정 준수
- 호주 ATO GST 규정 준수 (10% GST)
- 호주 ATO FBT 규정 준수
- 2024-25 세율표 반영
- BAS 신고 형식 준수
- FBT 신고 형식 준수

### UI 우선순위 및 상태 관리
- 법인 설립 후 Admin Dashboard 최상단 배치
- 세무 등록 설정 메뉴 추가
- 통합 세무 대시보드 최상단 표시
- **PAYG 대기 상태 UI**: PAYG 미등록 시 명확한 상태 표시 및 Director's Loan 관리 강조
- **PAYG 활성화 시**: 즉시 모든 PAYG 기능 활성화 (재시작 불필요)

---

**작성일**: 2024년  
**버전**: 3.0 (GST, FBT, 통합 대시보드 추가)  
**상태**: 설계 완료, 구현 대기  
**다음 단계**: Phase 1 개발 시작 (PDF 파싱 + PAYG + GST + FBT 기능)



---



---

## 📝 부록

### A. 용어 정의

- **SELPIC-Accounting**: 호주 은행 PDF 내역서를 자동 파싱하고 세무 신고를 자동화하는 회계 도구
- **PAYG Withholding**: 호주 원천징수 시스템 (급여/보수 지급 시 세금 원천징수)
- **GST (Goods and Services Tax)**: 호주 부가세 (10%)
- **FBT (Fringe Benefits Tax)**: 복리후생세 (직원 복리후생에 대한 세금)
- **BAS (Business Activity Statement)**: 호주 사업 활동 신고서 (분기별 신고)
- **Director's Loan**: 이사 대여금 (법인 계좌에서 이사에게 지급된 자금)
- **No ABN Withholding**: ABN 없는 계약자에게 47% 원천징수 (법적 의무)

### B. 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **PDF Parsing**: pdf-parse
- **AI**: OpenAI API (GPT-4o-mini)
- **Excel Export**: xlsx
- **UI**: React, Tailwind CSS

### C. 관련 문서

- **설계 문서**: `docs/accounting-module-blueprint.md`
- **PDF 파서 초기 코드**: `apps/accounting-sandbox/lib/pdf-parser/`
- **Director's Loan 컴포넌트**: `apps/accounting-sandbox/components/DirectorsLoanManager.tsx`

### D. 구현 상태

#### ✅ 완료
- [x] 전체 설계 문서 작성
- [x] PDF 파서 타입 정의
- [x] 공통 파서 유틸리티
- [x] CBA 파서 초기 구현
- [x] PAYG 모듈화 설계
- [x] Director's Loan 관리 설계
- [x] GST 정산 기능 설계
- [x] FBT 감지 시스템 설계
- [x] 통합 세무 대시보드 설계

#### 🚧 진행 예정
- [ ] Next.js 프로젝트 초기화
- [ ] PDF 파서 엔진 구현
- [ ] AI 분류 엔진 구현
- [ ] PAYG 계산 엔진 구현
- [ ] GST 정산 엔진 구현
- [ ] FBT 감지 엔진 구현
- [ ] UI 컴포넌트 개발

---

**보고서 생성일**: 2026-01-04T02:19:21.258Z  
**생성 도구**: generate-accounting-report.js


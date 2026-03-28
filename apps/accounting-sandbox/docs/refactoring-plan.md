# SELPIC A - 대규모 리팩토링 설계 문서

## 📋 목표
- 코드 안정성 확보
- 신규 HR/WorkCover 기능 추가를 위한 모듈화
- 기능별 파일 분리 및 재사용성 향상
- TypeScript Strict Typing 적용

---

## 🏗️ 새로운 폴더 구조

```
apps/accounting-sandbox/
├── src/
│   ├── features/
│   │   ├── payroll/                    # 급여 관리 기능
│   │   │   ├── types.ts                # Payroll 관련 TypeScript 인터페이스
│   │   │   ├── calculator.ts           # 급여 계산 로직 (PAYG, Superannuation)
│   │   │   ├── payslip-generator.ts    # Payslip PDF 생성
│   │   │   ├── bookkeeping.ts          # 자동 분개 처리 (Wages Expense, PAYG/Super Liability)
│   │   │   └── index.ts                # Public API exports
│   │   │
│   │   ├── compliance/                 # 규정 준수 기능
│   │   │   ├── types.ts                # Compliance 관련 TypeScript 인터페이스
│   │   │   ├── workcover.ts            # WorkCover 보험료 추산 로직
│   │   │   ├── workcover-certificate.ts # Certificate of Currency 관리
│   │   │   ├── tax-deadlines.ts        # 세무 마감일 계산 (FBT, BAS)
│   │   │   ├── deadline-tracker.tsx    # 세무 마감일 알림 위젯
│   │   │   └── index.ts                # Public API exports
│   │   │
│   │   └── transactions/               # 거래 관리 기능
│   │       ├── types.ts                # Transaction 관련 TypeScript 인터페이스
│   │       ├── order-approval.ts       # 주문 승인 로직
│   │       ├── duplicate-detector.ts   # 중복 매출 방지 (Unique ID 기반)
│   │       ├── matching.ts             # 거래 매칭 처리
│   │       └── index.ts                # Public API exports
│   │
│   └── shared/
│       ├── utils/
│       │   ├── category-mapper.ts      # 모든 카테고리 매핑 로직
│       │   ├── tax-calculator.ts       # 공통 세무 계산기 (TaxCalc)
│       │   ├── currency-format.ts      # 통화 포맷팅 (기존 유지)
│       │   ├── date-format.ts          # 날짜 포맷팅 (기존 유지)
│       │   └── business-calculations.ts # 비즈니스 계산 (기존 유지)
│       │
│       ├── types/
│       │   ├── transaction.ts           # Transaction 기본 타입
│       │   ├── employee.ts              # Employee 타입
│       │   ├── order.ts                 # Order 타입
│       │   └── index.ts                 # 모든 타입 re-export
│       │
│       └── constants/
│           ├── tax-categories.ts       # 세금 카테고리 상수
│           ├── tax-rates.ts            # 세율 상수
│           └── index.ts                # 모든 상수 re-export
│
├── lib/                                # 기존 lib 폴더 (점진적 마이그레이션)
│   └── ... (기존 파일들, 점진적으로 src/로 이동)
│
├── components/                         # React 컴포넌트 (기존 유지)
│   ├── Payroll/                        # 새로 추가될 급여 관련 컴포넌트
│   │   ├── PayslipGenerator.tsx
│   │   ├── PayrollApproval.tsx
│   │   └── EmployeeManagement.tsx
│   │
│   ├── Compliance/                     # 새로 추가될 규정 준수 컴포넌트
│   │   ├── WorkCoverCalculator.tsx
│   │   ├── WorkCoverCertificate.tsx
│   │   └── TaxDeadlineTracker.tsx      # 기존 파일 이동
│   │
│   └── ... (기존 컴포넌트들)
│
└── app/                                # Next.js App Router (기존 유지)
    ├── page.tsx
    └── api/
        └── ...
```

---

## 📦 모듈별 상세 설계

### 1. `/src/features/payroll` - 급여 관리

#### `types.ts`
```typescript
export interface Employee {
  id: string
  name: string
  employeeId?: string
  type: 'employee' | 'director' | 'contractor' | 'partner'
  taxFileNumber?: string
  abn?: string
  superannuationRate: number // 기본 11%
  payFrequency: 'weekly' | 'fortnightly' | 'monthly'
  createdAt: string
  updatedAt: string
}

export interface Payslip {
  id: string
  employeeId: string
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
}

export interface PayrollTransaction {
  payslipId: string
  employeeId: string
  grossAmount: number
  taxWithheld: number
  superannuation: number
  netAmount: number
  payDate: string
  category: 'EXPENSE_WAGES_SALARIES' | 'EXPENSE_DIRECTORS_FEES'
  requiresPAYG: boolean
}
```

#### `calculator.ts`
- `calculatePAYGWithholding()`: PAYG 세액 계산
- `calculateSuperannuation()`: Superannuation 계산
- `calculateNetPay()`: 순 급여 계산
- `calculatePayrollTax()`: Payroll Tax 계산 (필요시)

#### `payslip-generator.ts`
- `generatePayslipPDF()`: 호주 표준 Payslip PDF 생성
  - 회사 정보 포함 (SELPIC PTY LTD, ABN, ACN)
  - Employee 정보
  - 급여 상세 내역
  - PAYG, Superannuation 정보

#### `bookkeeping.ts`
- `createPayrollJournalEntries()`: 급여 승인 시 자동 분개
  - Wages Expense (Debit)
  - PAYG Withholding Liability (Credit)
  - Superannuation Liability (Credit)
  - Cash/Bank (Credit)

---

### 2. `/src/features/compliance` - 규정 준수

#### `types.ts`
```typescript
export interface WorkCoverPolicy {
  id: string
  policyNumber: string
  insurer: string
  startDate: string
  endDate: string
  certificateOfCurrency?: string // PDF URL or Base64
  premium: number
  renewalDate: string
  status: 'active' | 'expired' | 'pending'
}

export interface WorkCoverEstimate {
  totalWages: number
  estimatedPremium: number
  rate: number // 보험료율
  calculationDate: string
}

export interface TaxDeadline {
  type: 'BAS' | 'PAYG' | 'FBT' | 'Income Tax'
  period: string
  dueDate: string
  daysRemaining: number
  isUrgent: boolean
}
```

#### `workcover.ts`
- `estimateWorkCoverPremium()`: 급여 합계 기반 보험료 추산
- `calculateWorkCoverRate()`: 보험료율 계산
- `getWorkCoverRenewalDate()`: 갱신일 계산

#### `workcover-certificate.ts`
- `saveCertificateOfCurrency()`: Certificate of Currency 저장
- `getCertificateOfCurrency()`: Certificate 조회
- `checkCertificateExpiry()`: 만료일 확인

#### `tax-deadlines.ts`
- `calculateBASDeadline()`: BAS 마감일 계산
- `calculatePAYGDeadline()`: PAYG 마감일 계산
- `calculateFBTDeadline()`: FBT 마감일 계산
- `getUpcomingDeadlines()`: 다가오는 마감일 목록

---

### 3. `/src/features/transactions` - 거래 관리

#### `types.ts`
```typescript
export interface Order {
  id: string
  orderId: string // Unique order ID from homepage
  amount: number
  gst: number
  paymentMethod: string
  transactionDate: string
  status: 'pending' | 'approved' | 'rejected' | 'matched'
  matchedTransactionId?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionMatch {
  orderId: string
  transactionId: string
  matchType: 'exact' | 'fuzzy' | 'manual'
  confidence: number
  matchedAt: string
}
```

#### `order-approval.ts`
- `approveOrder()`: 주문 승인 처리
- `rejectOrder()`: 주문 거부 처리
- `createTransactionFromOrder()`: 주문에서 거래 생성

#### `duplicate-detector.ts`
- `checkDuplicateOrder()`: 중복 주문 확인 (orderId 기반)
- `checkDuplicateTransaction()`: 중복 거래 확인 (날짜/금액/내용 기반)
- `findMatchingTransaction()`: 기존 거래와 매칭

#### `matching.ts`
- `matchOrderToTransaction()`: 주문과 거래 매칭
- `handleMatching()`: 매칭 처리 로직
- `getMatchConfidence()`: 매칭 신뢰도 계산

---

### 4. `/src/shared/utils` - 공통 유틸리티

#### `category-mapper.ts`
- 모든 카테고리 매핑 로직 통합
- `getCategoryDisplayName()`: 카테고리 표시명 변환
- `getCategoryFromString()`: 문자열에서 카테고리 추출
- `isTaxDeductible()`: 세금 공제 가능 여부 확인

#### `tax-calculator.ts`
- `calculateGST()`: GST 계산
- `calculatePAYG()`: PAYG 계산
- `calculateFBT()`: FBT 계산
- `calculateIncomeTax()`: 소득세 계산

---

## 🔄 마이그레이션 계획

### Phase 1: 타입 정의 및 기본 구조 생성
1. `/src/shared/types/` 폴더 생성 및 기본 타입 정의
2. `/src/shared/utils/` 폴더 생성 및 공통 유틸리티 이동
3. `/src/shared/constants/` 폴더 생성 및 상수 정의

### Phase 2: Features 모듈 생성
1. `/src/features/payroll/` 생성 및 급여 관련 로직 이동
2. `/src/features/compliance/` 생성 및 규정 준수 로직 이동
3. `/src/features/transactions/` 생성 및 거래 관리 로직 이동

### Phase 3: 새 기능 구현
1. Payslip Generator 구현
2. WorkCover Module 구현
3. Automatic Bookkeeping 구현
4. Unique Key Guard 구현

### Phase 4: 컴포넌트 업데이트
1. 기존 컴포넌트를 새 모듈 구조에 맞게 업데이트
2. 새 컴포넌트 생성 (Payroll, WorkCover 등)

### Phase 5: 테스트 및 검증
1. 모든 기능 테스트
2. 기존 기능 호환성 확인
3. 문서 업데이트

---

## 🎯 구현 우선순위

### High Priority (즉시 필요)
1. ✅ 타입 정의 및 기본 구조 생성
2. ✅ `/src/shared/utils/` 공통 유틸리티 분리
3. ✅ `/src/features/transactions/` 중복 방지 로직 구현

### Medium Priority (1-2주 내)
1. ✅ `/src/features/payroll/` 급여 관리 모듈
2. ✅ Payslip Generator 구현
3. ✅ Automatic Bookkeeping 구현

### Low Priority (향후)
1. ✅ `/src/features/compliance/` WorkCover 모듈
2. ✅ WorkCover Certificate 관리
3. ✅ 고급 매칭 알고리즘

---

## 📝 다음 단계

이 설계 문서를 바탕으로 실제 구현을 시작하겠습니다. 
먼저 기본 구조와 타입 정의부터 생성하겠습니다.

# SELPIC A: 완성된 회계 프로그램 전체 기능 설명서

> **작성일**: 2026년 1월  
> **회사 정보**: SELPIC PTY LTD (ABN: 79 694 194 011, ACN: 694 194 011)  
> **현재 진행률**: Phase 1 약 **95%** 완료

---

## 📋 목차

1. [전체 개요](#전체-개요)
2. [회사 정보 통합 현황](#회사-정보-통합-현황)
3. [핵심 기능 상세 설명](#핵심-기능-상세-설명)
4. [기존 설계 계획과 비교](#기존-설계-계획과-비교)
5. [추가 구현된 기능](#추가-구현된-기능)
6. [데이터 구조 및 저장소](#데이터-구조-및-저장소)
7. [보안 및 접근 제어](#보안-및-접근-제어)
8. [리포트 및 내보내기](#리포트-및-내보내기)
9. [다음 단계](#다음-단계)

---

## 🎯 전체 개요

### SELPIC A란?

**SELPIC A (AI Tax & Bookkeeping Analyzer)**는 호주 비즈니스를 위한 AI 기반 세무 및 회계 자동화 시스템입니다. 은행 거래 내역을 자동으로 분석하고, ATO (Australian Taxation Office) 세무 카테고리를 자동 분류하며, GST, PAYG, FBT 등 호주 세무 신고에 필요한 모든 정보를 자동으로 계산합니다.

### 주요 특징

- ✅ **4대 호주 은행 지원**: CBA, ANZ, NAB, Westpac PDF 파싱 + Universal CSV 파서
- ✅ **AI 기반 자동 분류**: 31개 ATO Tax Category 자동 분류
- ✅ **실시간 세무 계산**: GST, PAYG, FBT 자동 계산 및 모니터링
- ✅ **완전한 데이터 지속성**: IndexedDB 기반 로컬 저장소
- ✅ **보안**: 4자리 PIN 잠금 시스템
- ✅ **프로페셔널 리포트**: BAS, Income Statement, Financial Summary

---

## 🏢 회사 정보 통합 현황

### 등록된 회사 정보

```
회사명: SELPIC PTY LTD
ABN: 79 694 194 011
ACN: 694 194 011
```

### 회사 정보가 표시되는 위치

#### 1. Settings 페이지 (Business Profile)
- **위치**: `components/Settings/BusinessProfileForm.tsx`
- **기능**:
  - 회사명, ABN, ACN 입력 및 저장
  - 기본값 자동 설정 (SELPIC PTY LTD, ABN: 79 694 194 011, ACN: 694 194 011)
  - GST/PAYG Reporting Cycle 설정
  - GST/FBT 등록 상태 토글
- **저장소**: IndexedDB (`businessProfile` store)

#### 2. 모든 리포트 하단 Footer
- **위치**: `components/Reports/ReportFooter.tsx`
- **적용 리포트**:
  - BAS Report (`BASReportView.tsx`)
  - Income Statement (`IncomeStatementView.tsx`)
- **표시 형식**:
  ```
  ─────────────────────────────
      SELPIC PTY LTD
      ABN: 79 694 194 011
      ACN: 694 194 011
  ─────────────────────────────
  ```
- **인쇄 지원**: 인쇄 시에도 Footer 자동 포함

#### 3. Invoice 템플릿
- **위치**: `components/invoice/InvoiceTemplate.tsx`
- **표시 형식**:
  ```
  SELPIC PTY LTD
  ABN: 79 694 194 011
  ACN: 694 194 011
  ```
- **기본값**: `lib/invoiceStore.ts`, `lib/documentTemplateStore.ts`에 저장

#### 4. Quote 템플릿
- **위치**: `components/invoice/QuoteTemplate.tsx`
- **표시 형식**: Invoice와 동일

#### 5. 영수증 모달 (Transaction Table)
- **위치**: `components/TransactionTable.tsx`
- **기능**: 영수증 이미지 상단에 회사 정보 표시
- **표시 형식**: 회사명, ABN, ACN 표시

#### 6. Admin 문서 발송 페이지
- **위치**: `app/admin/documents/page.tsx`
- **기본값**: Invoice 생성 시 자동으로 회사 정보 포함

#### 7. Admin Invoice 편집 페이지
- **위치**: `app/admin/invoices/edit/page.tsx`
- **기본값**: Invoice 편집 시 회사 정보 자동 로드

---

## 🔧 핵심 기능 상세 설명

### 1. 은행 거래 내역 파싱 엔진

#### 지원 은행 및 형식
- ✅ **CBA (Commonwealth Bank)**: PDF 파싱
- ✅ **ANZ (Australia and New Zealand Bank)**: PDF 파싱
- ✅ **NAB (National Australia Bank)**: PDF 파싱
- ✅ **Westpac**: PDF 파싱
- ✅ **Universal CSV Parser**: 모든 호주 은행 CSV 지원

#### 주요 기능
- **거래 수수료 인식**: 국제 거래 수수료 등 별도 라인 거래 자동 병합
- **설명 정제**: 복잡한 거래 설명에서 상호명 추출 (예: "POS W'DRL CITY OF SYDNEY..." → "CITY OF SYDNEY")
- **잔액 조정**: 파싱된 거래 합계와 Closing Balance 검증
- **멀티라인 설명 처리**: 여러 줄에 걸친 거래 설명 자동 병합

**파일 위치**:
- `lib/pdf-parser/cba-parser.ts`
- `lib/pdf-parser/anz-parser.ts`
- `lib/pdf-parser/nab-parser.ts`
- `lib/pdf-parser/westpac-parser.ts`
- `lib/csv-parser/nab-csv-parser.ts`

---

### 2. AI 기반 거래 분류 엔진

#### 31개 ATO Tax Category 자동 분류

**Income Categories**:
- `INCOME_TRADING_REVENUE` - Trading Revenue (Cleaning + Sticker 통합)
- `INCOME_REFUND_REIMBURSEMENT` - Refund/Reimbursement
- `INCOME_INTEREST` - Interest Income
- `INCOME_DIVIDENDS` - Dividends
- 기타 Income 카테고리

**Expense Categories**:
- `EXPENSE_OFFICE_SUPPLIES` - Office Supplies
- `EXPENSE_FUEL_TRAVEL` - Fuel & Travel
- `EXPENSE_FREIGHT_SHIPPING` - Freight & Shipping
- `EXPENSE_INSURANCE_PROFESSIONAL` - Insurance (Professional)
- `EXPENSE_INSURANCE_PERSONAL` - Insurance (Personal)
- `EXPENSE_MOTOR_VEHICLE` - Motor Vehicle Expenses
- `EXPENSE_TRAVEL_ACCOMMODATION` - Travel & Accommodation
- `EXPENSE_MEALS_ENTERTAINMENT` - Meals & Entertainment
- `EXPENSE_REPAIRS_MAINTENANCE` - Repairs & Maintenance
- `EXPENSE_OFFICE_EQUIPMENT_ASSETS` - Office Equipment & Assets
- `EXPENSE_DIRECTOR_LOAN_REPAYMENT` - Director Loan Repayment
- 기타 20개 Expense 카테고리

**Tax & Compliance Categories**:
- `TAX_WAGES_SALARIES` - Wages & Salaries
- `TAX_SUPERANNUATION` - Superannuation
- `TAX_ATO_GST_BAS` - ATO - GST & BAS
- `TAX_ATO_PAYG_WITHHOLDING` - ATO - PAYG Withholding
- `TAX_COMPANY_INCOME_TAX` - Company Income Tax
- `TAX_WORKERS_COMPENSATION` - Workers Compensation
- `TAX_ACCOUNTING_PROFESSIONAL_FEES` - Accounting & Professional Fees

**Transfer/Loan Categories**:
- `NON_TAXABLE_TRANSFER` - Non-Taxable Transfer
- `NON_TAXABLE_CASH_DEPOSIT` - Non-Taxable Cash Deposit
- `LIABILITY_DIRECTORS_LOAN` - Director's Loan

#### 자동 감지 기능
- ✅ **Director's Loan 자동 감지**: Director 이름 기반 자동 분류
- ✅ **Pre-trading Expenses 감지**: 사업 시작 전 비용 자동 감지
- ✅ **PAYG 태그 자동 추가**: 급여 거래 자동 태그
- ✅ **Capital Improvement 경고**: $5,000 이상 또는 리모델링 관련 키워드 경고
- ✅ **FBT Risk 감지**: FBT 관련 거래 자동 감지 및 리스크 평가
- ✅ **No ABN Withholding 경고**: ABN 없는 거래 47% 원천징수 경고

**파일 위치**:
- `lib/ai-classifier/openai-classifier.ts`
- `lib/ai-classifier/types.ts`

---

### 3. 사용자 수정 학습 기능 (User Mappings)

#### 기능 설명
사용자가 수동으로 수정한 카테고리를 자동으로 학습하여, 향후 유사한 거래에 자동으로 적용합니다.

#### 작동 방식
1. **학습 단계**: 사용자가 거래 카테고리를 수정하고 'Confirm' 클릭
2. **저장**: `Transaction Description`과 선택한 `Category`를 `user_mappings` 테이블에 저장
3. **자동 적용**: 새 PDF/CSV 업로드 시, 각 거래의 Description이 `user_mappings`에 있는지 확인
4. **Fuzzy Matching**: 부분 일치도 인식 (예: 'Stripe * Cursor' → 'Trading Revenue')
5. **시각적 표시**: 자동 분류된 항목에 "자동" 배지 표시

**파일 위치**:
- `lib/storage/user-mappings.ts`
- `components/TransactionTable.tsx` (UI 통합)

---

### 4. GST (Goods and Services Tax) 정산 시스템

#### GST 계산 로직
- **GST Collected (Payable)**: `Total Income / 11`
- **GST Claimable**: `Taxable Expenses / 11`
- **GST Net**: `GST Collected - GST Claimable`

#### GST 포함 여부 AI 판별
- `INCLUDED`: GST 포함 (10%)
- `EXCLUDED`: GST 제외
- `FREE`: GST 면세

#### GST Summary 컴포넌트
- 실시간 GST 집계 표시
- 분기별/월별 필터링
- BAS 리포트 내보내기 버튼

**파일 위치**:
- `lib/gst-settlement/gst-detector.ts`
- `lib/gst-settlement/gst-calculator.ts`
- `components/GSTSummary.tsx`

---

### 5. PAYG (Pay As You Go) Withholding 시스템

#### 6단계 구현 완료

**Step 1: PAYG 설정 관리**
- PAYG 등록 상태 관리
- 등록일, 등록번호 저장
- Settings 페이지에서 관리

**Step 2: PAYG 세율 계산 엔진**
- ATO 2024-25 세율표 기반
- 연간 소득 구간별 세율 자동 계산
- No ABN Withholding (47%) 처리

**Step 3: No ABN Withholding 처리**
- ABN 없는 거래 자동 감지
- 47% 원천징수 경고
- 경고 배지 표시

**Step 4: AI 분류에 PAYG 태그 추가**
- 급여 거래 자동 태그
- Employee/Director/Contractor 구분

**Step 5: BAS 리포트 생성**
- 호주 재정연도 기준 분기 계산 (Q1-Q4)
- 날짜 형식 호주 표준 (DD/MM/YYYY)
- PAYG Withholding Summary 포함

**Step 6: PAYG 관리 UI**
- PAYG Summary 컴포넌트
- PAYG 설정 폼
- BAS 리포트 내보내기

**파일 위치**:
- `lib/payg-withholding/tax-calculator.ts`
- `lib/payg-withholding/bas-reporter.ts`
- `lib/payg-withholding/config.ts`
- `components/PAYGSummary.tsx`
- `components/Settings/PAYGConfigForm.tsx`

---

### 6. FBT (Fringe Benefits Tax) 모니터링 시스템

#### FBT 감지 기능
- **FBT 관련 거래 자동 감지**: Meal, Entertainment, Travel, Vehicle 등
- **리스크 평가**: Low, Medium, High
- **FBT 금액 추정**: 자동 계산
- **FBT 제외 기능**: 사용자가 수동으로 "FBT 제외" 표시 가능

#### FBT Monitor 컴포넌트
- FBT 관련 거래 목록 표시
- 카테고리별 집계 (Meal, Entertainment, Travel 등)
- 리스크별 분류 (High/Medium/Low)
- FBT 마감일 표시 (May 21st)
- "Safe" 배지 (FBT $0.00 또는 낮은 리스크)

**파일 위치**:
- `lib/fbt-monitoring/fbt-detector.ts`
- `lib/fbt-monitoring/fbt-reporter.ts`
- `components/FBTMonitor.tsx`

---

### 7. Director's Loan 관리 시스템

#### 자동 감지 및 계산
- **Director Name 설정**: Settings에서 Director 이름 설정
- **자동 분류**: Director 이름이 포함된 거래 자동 감지
- **잔액 계산**: Opening Balance + Personal Credits - Personal Debits
- **자동 동기화**: Personal (Non-Deductible) 거래 자동 반영

#### Director's Loan Balance 카드
- 현재 잔액 표시
- "View Details" 버튼: Director's Loan 거래만 필터링
- Opening Balance 편집 가능

**파일 위치**:
- `lib/utils/business-calculations.ts` (계산 로직)
- `components/BusinessSummaryCards.tsx` (UI)

---

### 8. Cash & Petty Cash 관리

#### 수동 현금 지출 입력
- 날짜, 금액, 상호명, 카테고리 입력
- Receipt 이미지 업로드 (JPG, PNG)
- AI Vision으로 영수증 정보 자동 추출

#### AI Vision 영수증 인식
- 날짜, 금액, 상호명, ABN 자동 추출
- OpenAI Vision API 사용
- "영수증 정보를 읽어왔습니다" 메시지 표시

#### Receipt 관리
- IndexedDB에 영수증 이미지 저장
- Transaction Table에 Receipt 아이콘 표시
- 클릭 시 영수증 모달 표시 (회사 정보 포함)

**파일 위치**:
- `components/CashExpenseForm.tsx`
- `app/api/extract-receipt/route.ts`
- `lib/storage/indexed-db.ts` (cashExpenses, receipts stores)

---

### 9. 대시보드 시각화

#### Expense Charts 컴포넌트
- **Pie Chart**: 카테고리별 지출 비중
- **Bar Chart**: Bank vs Manual (Cash) 지출 비교
- **인터랙티브**: 차트 클릭 시 해당 카테고리만 필터링

**파일 위치**:
- `components/ExpenseCharts.tsx`

---

### 10. 통합 세무 대시보드

#### Tax Deadline Tracker
- **BAS 마감일**: 분기 종료 후 28일
- **PAYG 마감일**: 분기 종료 후 28일
- **Income Tax 마감일**: 재정연도 종료 후 10월 31일
- **FBT 마감일**: FBT 연도 종료 후 5월 21일
- **알림 시스템**: URGENT (≤7일), Due Soon (≤14일)

#### Payment Estimates
- GST 예상 납부 금액
- PAYG 예상 납부 금액
- 총 예상 납부 금액

#### Business Profile 통합
- Company Name, ABN, ACN 설정
- GST/PAYG Reporting Cycle 설정
- GST/FBT 등록 상태 토글

**파일 위치**:
- `lib/tax-deadlines/tracker.ts`
- `components/TaxDeadlineTracker.tsx`
- `components/PaymentEstimates.tsx`
- `components/Settings/BusinessProfileForm.tsx`

---

### 11. 데이터 지속성 및 관리

#### IndexedDB 스토리지
- **statements**: 은행 거래 내역 저장
- **transactions**: 분류된 거래 저장
- **cashExpenses**: 현금 지출 저장
- **receipts**: 영수증 이미지 저장
- **businessProfile**: 회사 정보 저장
- **apiUsage**: API 사용량 로그 저장
- **apiBalance**: API 잔액 저장

#### Statement History
- 업로드한 파일 목록 표시
- 각 파일의 거래 수 표시
- 'Load' 버튼: 기존 데이터 재로드 (API 비용 없음)
- 'Delete' 버튼: 파일 및 거래 삭제
- 중복 업로드 방지

#### 데이터 백업/복구
- 전체 데이터 JSON 다운로드
- JSON 파일 업로드로 복구
- API 키 제외 (보안)

**파일 위치**:
- `lib/storage/indexed-db.ts`
- `components/Settings/DataBackupRestore.tsx`

---

### 12. API 비용 관리

#### API Balance Dashboard
- **실제 사용량**: OpenAI API 실제 사용량 표시
- **잔액**: OpenAI API 잔액 표시
- **예산 관리**: Initial Balance ($5.00), Budget Limit ($10.00)
- **자동 추적**: 파일 업로드 시 자동으로 비용 계산 및 저장
- **"Check Balance" 버튼**: OpenAI API 직접 호출하여 실시간 잔액 확인

#### 사용자 API 키 지원
- Settings에서 사용자 API 키 입력
- 사용자 API 키 사용 시 무제한 업로드
- 시스템 API 키 사용 시 일일 5회 제한

#### 모델 전환
- **gpt-4o-mini**: 일반 거래 분류 (비용 절감)
- **gpt-4o**: 복잡한 PDF 분석

#### 사용량 로깅
- 각 API 호출 로그 저장 (날짜, 모델, 비용)
- 최근 5개 로그 표시
- 세션별 API 비용 배지 표시

**파일 위치**:
- `components/Settings/ApiBalanceDashboard.tsx`
- `components/Settings/ApiKeyForm.tsx`

---

### 13. 보안 시스템

#### PIN 잠금 시스템
- **4자리 PIN**: 앱 접근 시 PIN 입력 필요
- **설정 모드**: 첫 실행 시 PIN 설정
- **로그인 모드**: PIN 입력하여 앱 잠금 해제
- **잠금 시스템**: 5회 실패 시 15분 잠금
- **복구 코드**: 8자리 복구 코드로 PIN 재설정
  - 자동 생성 또는 사용자 지정 가능
- **개발 모드**: "Clear PIN Storage" 버튼 (개발 전용)

**파일 위치**:
- `components/Security/PINLock.tsx`

---

### 14. 리포트 시스템

#### BAS Report (Business Activity Statement)
- **GST Summary**: GST Collected, GST Claimable, Net GST
- **Profit & Loss Summary**: Total Income, Total Expenses, Net Profit
- **Director's Loan Ledger**: Opening Balance → Final Balance
- **Receipts 포함 옵션**: 영수증 이미지 포함 가능
- **인쇄 지원**: Print-friendly 형식
- **회사 정보 Footer**: 하단에 ABN, ACN 표시

**파일 위치**:
- `components/Reports/BASReportView.tsx`
- `components/Reports/ReportFooter.tsx`

#### Income Statement (Profit & Loss)
- **Revenue**: Total Income
- **Expenses**: Total Expenses (카테고리별 분류)
- **Net Profit**: Revenue - Expenses
- **기간 필터링**: All, Quarter, Year, Custom
- **인쇄 지원**: Print-friendly 형식
- **회사 정보 Footer**: 하단에 ABN, ACN 표시

**파일 위치**:
- `components/Reports/IncomeStatementView.tsx`
- `components/Reports/ReportFooter.tsx`

---

### 15. Excel 내보내기

#### General Ledger 형식
- 날짜 (DD/MM/YYYY)
- 설명 (정제된 상호명)
- 카테고리 (화면과 동일한 표기)
- GST (10%)
- Net Amount
- Debit/Credit
- Department (Company/Personal)
- Balance

#### Financial Summary
- 카테고리별 요약
- GST 요약
- 총계

**파일 위치**:
- `lib/excel-export/index.ts`

---

## 📊 기존 설계 계획과 비교

### Phase 1 핵심 기능: **100% 완료**

| 기능 | 계획안 | 현재 상태 | 달성률 |
|------|--------|----------|--------|
| PDF 파싱 (CBA, ANZ, NAB) | ✅ | ✅ | **100%** |
| AI 분류 엔진 | ✅ | ✅ | **100%** |
| Excel 내보내기 | ✅ | ✅ | **100%** |
| PAYG Withholding | ✅ | ✅ | **100%** |
| GST 정산 | ✅ | ✅ | **100%** |
| Director's Loan | ✅ | ✅ | **100%** |
| Pre-trading Expenses | ✅ | ✅ | **100%** |

### Phase 1 추가 기능: **95% 완료**

| 기능 | 계획안 | 현재 상태 | 달성률 |
|------|--------|----------|--------|
| 통합 세무 대시보드 | ✅ | ✅ | **100%** |
| FBT 감지 시스템 | ✅ | ✅ | **100%** |

### 계획에 없었으나 추가 구현된 기능

1. ✅ **Westpac PDF Parser** - 4대 은행 완전 지원
2. ✅ **Universal CSV Parser** - 모든 호주 은행 CSV 지원
3. ✅ **사용자 수정 학습 기능** - Fuzzy Matching
4. ✅ **Debit/Credit 위치 교환** - 수동 수정 기능
5. ✅ **Cash & Petty Cash 관리** - AI Vision 영수증 인식
6. ✅ **대시보드 시각화** - Pie/Bar Charts
7. ✅ **데이터 백업/복구** - JSON 형식
8. ✅ **API Balance Dashboard** - 비용 추적
9. ✅ **PIN 잠금 시스템** - 보안 강화
10. ✅ **회사 정보 통합** - ABN, ACN 모든 리포트에 표시

---

## 🎯 추가 구현된 기능 상세

### 1. 사용자 수정 학습 기능 (User Mappings)

**목적**: 사용자가 수정한 카테고리를 자동으로 학습하여 향후 유사한 거래에 자동 적용

**작동 방식**:
1. 사용자가 거래 카테고리를 수정
2. 'Confirm' 클릭 시 `user_mappings`에 저장
3. 새 파일 업로드 시 Fuzzy Matching으로 자동 적용
4. "자동" 배지로 표시

**파일**: `lib/storage/user-mappings.ts`

---

### 2. Cash & Petty Cash 관리

**목적**: 현금 지출을 수동으로 입력하고 영수증을 관리

**주요 기능**:
- 수동 현금 지출 입력 폼
- Receipt 이미지 업로드 (JPG, PNG)
- AI Vision으로 영수증 정보 자동 추출
- IndexedDB에 저장 및 관리
- Transaction Table에 통합

**파일**: 
- `components/CashExpenseForm.tsx`
- `app/api/extract-receipt/route.ts`

---

### 3. 대시보드 시각화

**목적**: 지출 데이터를 시각적으로 분석

**차트 종류**:
- **Pie Chart**: 카테고리별 지출 비중
- **Bar Chart**: Bank vs Manual (Cash) 지출 비교

**인터랙티브 기능**: 차트 클릭 시 해당 카테고리만 필터링

**파일**: `components/ExpenseCharts.tsx`

---

### 4. API 비용 관리

**목적**: OpenAI API 사용량을 추적하고 비용을 관리

**주요 기능**:
- 실제 API 사용량 표시
- 잔액 표시
- 예산 관리 (Initial Balance, Budget Limit)
- 자동 비용 계산 및 저장
- "Check Balance" 버튼으로 실시간 잔액 확인
- 사용자 API 키 지원 (무제한 업로드)
- 시스템 API 키 사용 시 일일 5회 제한

**파일**: `components/Settings/ApiBalanceDashboard.tsx`

---

### 5. PIN 잠금 시스템

**목적**: 앱 접근 보안 강화

**주요 기능**:
- 4자리 PIN 설정 및 로그인
- 5회 실패 시 15분 잠금
- 8자리 복구 코드 (자동 생성 또는 사용자 지정)
- "Forgot PIN?" 기능으로 PIN 재설정

**파일**: `components/Security/PINLock.tsx`

---

## 💾 데이터 구조 및 저장소

### IndexedDB 스토어

1. **statements**: 은행 거래 내역
2. **transactions**: 분류된 거래
3. **cashExpenses**: 현금 지출
4. **receipts**: 영수증 이미지
5. **businessProfile**: 회사 정보 (회사명, ABN, ACN, GST/PAYG Cycle)
6. **apiUsage**: API 사용량 로그
7. **apiBalance**: API 잔액

### LocalStorage

1. **openai_api_key**: 시스템 API 키
2. **user_openai_api_key**: 사용자 API 키
3. **director_name**: Director 이름
4. **accounting_transactions**: 거래 데이터 (하이드레이션용)
5. **opening_director_loan_balance**: Opening Balance
6. **user_mappings**: 사용자 수정 학습 데이터
7. **transaction_receipts**: 영수증 데이터
8. **pin_lock**: PIN 잠금 데이터

---

## 🔒 보안 및 접근 제어

### 현재 구현된 보안 기능

1. **PIN 잠금**: 4자리 PIN으로 앱 접근 제어
2. **복구 코드**: 8자리 복구 코드로 PIN 재설정
3. **API 키 관리**: 사용자 API 키 지원 (시스템 키와 분리)
4. **데이터 백업/복구**: API 키 제외하여 백업

### 향후 개선 사항

- 멀티 사용자 지원 (RBAC)
- 클라우드 동기화
- 암호화된 데이터 저장

---

## 📄 리포트 및 내보내기

### 1. BAS Report
- GST Summary
- Profit & Loss Summary
- Director's Loan Ledger
- Receipts 포함 옵션
- 회사 정보 Footer (ABN, ACN)

### 2. Income Statement
- Revenue vs Expenses
- Net Profit
- 기간 필터링
- 회사 정보 Footer (ABN, ACN)

### 3. Excel 내보내기
- General Ledger 형식
- Financial Summary
- 카테고리별 요약

---

## 🚀 다음 단계

### 즉시 시작 가능 (우선순위 순)

1. **Phase 2: 홈페이지 통합** (0% → 100%)
   - Admin Dashboard 통합
   - 인증 시스템 연동
   - 데이터베이스 마이그레이션
   - UI 통합

2. **멀티 테넌시 지원** (0% → 100%)
   - 사용자별 데이터 분리
   - 조직(회사) 관리
   - 권한 관리 시스템 (RBAC)

3. **클라우드 동기화** (0% → 100%)
   - 데이터 클라우드 백업
   - 멀티 디바이스 동기화
   - 오프라인 모드 지원

### 중간 우선순위

4. **업종별 모듈 시스템**
   - Cleaning 모듈 (TPAR 리포트)
   - Retail 모듈 (재고 관리)
   - IT Service 모듈 (프로젝트 추적)

5. **결제 게이트웨이 통합**
   - Stripe, PayPal 자동 동기화
   - 거래 자동 매칭

---

## 📈 전체 진행률 요약

### Phase 1: **95% 완료**

- ✅ 핵심 기능: 7개 완료 (100%)
- ✅ 추가 기능: 2개 완료 (100%)
- ✅ 계획 외 추가 기능: 10개 완료 (100%)

### Phase 2: **0% (다음 단계)**

- ❌ 홈페이지 통합: 0%
- ❌ 멀티 테넌시: 0%
- ❌ 클라우드 동기화: 0%

---

## 🎯 결론

**SELPIC A**는 호주 비즈니스를 위한 완전한 AI 기반 세무 및 회계 자동화 시스템입니다. 기존 설계 계획의 95%를 완료했으며, 계획에 없었던 10개의 추가 기능도 구현했습니다. 특히 **회사 정보 (SELPIC PTY LTD, ABN: 79 694 194 011, ACN: 694 194 011)**가 모든 리포트, Invoice, 영수증에 자동으로 표시되도록 완전히 통합되었습니다.

다음 단계로는 Phase 2 통합 (홈페이지 통합, 멀티 테넌시, 클라우드 동기화)을 진행할 수 있습니다.

---

**마지막 업데이트**: 2026년 1월  
**문서 버전**: 1.0

# 회계 프로그램: 현재 단계 vs 다음 단계 비교 분석

> **작성일**: 2026년 1월  
> **현재 진행률**: Phase 1 약 70% 완료

---

## 📊 현재 단계 요약

### ✅ 완료된 주요 기능 (Phase 1 - 70%)

#### 1. 핵심 인프라 ✅
- Next.js 프로젝트 구조 (포트 3001)
- TypeScript 설정
- Tailwind CSS 격리 설정
- 기본 UI 및 대시보드

#### 2. PDF 파싱 엔진 ✅
- **CBA 파서** (완전 구현)
- **ANZ 파서** (완전 구현)
- **NAB 파서** (완전 구현)
- CSV 파서 (NAB CSV 형식)
- 공통 파서 유틸리티
- 거래 내역 추출 로직
- 날짜/금액/잔액 파싱
- 멀티라인 설명 처리

#### 3. AI 분류 엔진 ✅
- OpenAI 분류기 구현
- 비즈니스 컨텍스트 프롬프트
- ATO 카테고리 분류
- Director's Loan 자동 감지
- Pre-trading Expenses 감지
- **PAYG 태그 자동 추가**
- 급여/보수 거래 자동 감지
- 사용자 수정 학습 기능 (User Mappings)

#### 4. 데이터 관리 ✅
- IndexedDB 스토리지 구현
- Statement History 기능
- 수동 카테고리 수정
- Debit/Credit 위치 교환 기능
- 사용자 수정 학습 (Fuzzy Matching)

#### 5. Excel 내보내기 ✅
- General Ledger 형식 내보내기
- GST 자동 계산 (10%)
- 카테고리별 요약
- Financial Summary 내보내기
- **Department 표기 통일** (cleaning/sticker → Company)
- **Category 표기 통일** (화면과 Excel 일치)

#### 6. PAYG Withholding 기능 ✅ (완전 구현)
- **Step 1**: PAYG 설정 관리 시스템
- **Step 2**: PAYG 세율 계산 엔진 (ATO 2024-25 세율표)
- **Step 3**: No ABN Withholding 처리 (47% 경고)
- **Step 4**: AI 분류에 PAYG 태그 추가
- **Step 5**: BAS 리포트 생성 기능
  - **호주 재정연도 기준 분기 계산** (Q1-Q4 정확히 표시)
  - **날짜 형식 호주 표준** (DD/MM/YYYY)
- **Step 6**: PAYG 관리 UI 개발

#### 7. Director's Loan 관리 ✅
- Director's Loan 감지 로직
- Director Name 설정
- 자동 분류 (Capital Injection / Repayment)
- UI 배지 표시

#### 8. Pre-trading Expenses ✅
- Pre-trading Expenses 감지
- UI 배지 표시

#### 9. Financial Summary ✅
- 수익/지출 요약
- GST 요약
- Director's Loan 잔액
- 부문별 손익 분석

---

## ⏳ 부분 완료 기능

### 1. GST 정산 기능 (40% 완료)

#### ✅ 완료된 부분:
- GST 자동 계산 (10% - amount / 11)
- Excel 내보내기 시 GST 포함
- Financial Summary에 GST 표시

#### ❌ 미완료 부분:
- **GST 포함 여부 AI 판별** (0%)
  - 현재: 모든 거래에 GST 포함 가정
  - 필요: AI 기반 GST 포함/제외/면세 판별
- **GST Net 계산 엔진** (0%)
  - 현재: 기본 계산만 있음
  - 필요: GST Collected - GST Paid 자동 계산
- **BAS GST 리포트** (0%)
  - 현재: BAS 리포트에 GST 정보 미포함
  - 필요: BAS 리포트에 GST 섹션 추가
- **GST 요약 대시보드** (0%)
  - 현재: Financial Summary에만 표시
  - 필요: 독립적인 GST 요약 컴포넌트

### 2. 통합 세무 대시보드 (20% 완료)

#### ✅ 완료된 부분:
- PAYG 설정 관리 (별도 구현)

#### ❌ 미완료 부분:
- **신고 마감일 추적** (0%)
  - BAS 분기별 마감일 계산
  - PAYG 마감일 계산
  - Income Tax 마감일 계산
  - 캘린더 UI 컴포넌트
  - 마감일 임박 알림
- **납부 금액 추정** (0%)
  - GST 예상 납부 금액
  - PAYG 예상 납부 금액
- **통합 세무 대시보드 컴포넌트** (0%)
  - 마감일 캘린더 표시
  - 예상 납부 금액 요약
- **세무 등록 설정 통합** (0%)
  - GST, FBT 등록 상태 통합 관리
  - ABN, ACN 입력

---

## ❌ 미완료 기능

### 1. FBT (복리후생세) 감지 시스템 (0%)
- FBT 감지 엔진
- FBT 보고서 생성
- FBT 모니터링 컴포넌트
- **우선순위**: 중간 (법인 설립 후 필요)

### 2. 은행 파서 추가
- **Westpac 파서** (0%)
- **우선순위**: 낮음 (사용 빈도 낮음)

### 3. Phase 2: 홈페이지 통합 (0%)
- Admin Dashboard 통합
- 인증 시스템 연동
- 데이터베이스 마이그레이션
- UI 통합
- **우선순위**: 낮음 (Phase 1 검증 후)

---

## 🎯 다음 단계: 우선순위별 작업 계획

### 🔴 높은 우선순위 (즉시 필요)

#### 1. GST 정산 기능 완성 (4-5일)
**완료율: 40% → 100% 목표**

##### 작업 1: GST 포함 여부 AI 판별 (1-2일)
**파일**: `apps/accounting-sandbox/lib/gst-settlement/gst-detector.ts`

**기능**:
- AI 기반 GST 포함 여부 판별
- 거래별 판별 결과: `GST_INCLUDED`, `GST_EXCLUDED`, `GST_FREE`
- AI 프롬프트 설계:
  - 호주 GST 규칙 학습
  - 거래 유형별 GST 포함 여부 판별
  - 면세 거래 감지 (의료, 교육 등)

**구현 내용**:
```typescript
interface GSTDetectionResult {
  hasGST: boolean
  gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
  confidence: number
  reasoning?: string
}

class GSTDetector {
  async detectGST(transaction: BankTransaction): Promise<GSTDetectionResult>
}
```

##### 작업 2: GST Net 계산 엔진 (1일)
**파일**: `apps/accounting-sandbox/lib/gst-settlement/gst-calculator.ts`

**기능**:
- GST Collected 계산 (수입에서 징수한 GST)
- GST Paid 계산 (지출에서 납부한 GST)
- GST Net = GST Collected - GST Paid
- 기간별 집계 (분기별/월별)

**구현 내용**:
```typescript
interface GSTSummary {
  gstCollected: number
  gstPaid: number
  gstNet: number
  period: {
    startDate: string
    endDate: string
    type: 'quarterly' | 'monthly'
  }
}

class GSTCalculator {
  calculateGSTSummary(transactions: Transaction[], period: Period): GSTSummary
}
```

##### 작업 3: BAS GST 리포트 (1일)
**파일**: `apps/accounting-sandbox/lib/gst-settlement/bas-gst-reporter.ts`

**기능**:
- BAS 리포트에 GST 섹션 추가
- 기존 PAYG BAS 리포트와 통합
- Excel 내보내기 확장
- GST Collected/Paid/Net 표시

**구현 내용**:
- `generateBASReport` 함수 확장
- GST 섹션 추가
- Excel 내보내기 형식 업데이트

##### 작업 4: GST 요약 대시보드 (1일)
**파일**: `apps/accounting-sandbox/components/GSTSummary.tsx`

**기능**:
- 실시간 GST 집계 표시
- GST Collected/Paid/Net 카드
- 기간별 필터링 (분기별/월별)
- 대시보드에 통합

**UI 구성**:
- GST Collected 카드
- GST Paid 카드
- GST Net 카드 (납부/환급 금액)
- 기간별 필터 토글
- BAS 리포트 내보내기 버튼

---

#### 2. 통합 세무 대시보드 - 마감일 추적 (2-3일)
**완료율: 20% → 60% 목표**

##### 작업 1: 신고 마감일 추적 (2일)
**파일**: `apps/accounting-sandbox/lib/tax-dashboard/deadline-tracker.ts`

**기능**:
- BAS 분기별 마감일 계산 (분기 종료 후 28일)
- PAYG 마감일 계산
- Income Tax 마감일 (재정연도 종료 후 10월 31일)
- 마감일 임박 알림 (7일 전, 3일 전)

**구현 내용**:
```typescript
interface TaxDeadline {
  type: 'BAS' | 'PAYG' | 'INCOME_TAX' | 'FBT'
  period: string
  deadline: Date
  daysRemaining: number
  status: 'upcoming' | 'due_soon' | 'overdue'
}

class DeadlineTracker {
  getUpcomingDeadlines(): TaxDeadline[]
  getDeadlineStatus(deadline: Date): 'upcoming' | 'due_soon' | 'overdue'
}
```

##### 작업 2: 납부 금액 추정 (1일)
**파일**: `apps/accounting-sandbox/lib/tax-dashboard/payment-estimator.ts`

**기능**:
- GST 예상 납부 금액 계산
- PAYG 예상 납부 금액 계산
- 실시간 업데이트

##### 작업 3: 통합 세무 대시보드 컴포넌트 (2일)
**파일**: `apps/accounting-sandbox/components/TaxDashboard.tsx`

**기능**:
- 마감일 캘린더 표시
- 예상 납부 금액 요약
- 알림 표시
- 대시보드에 통합

---

### 🟡 중간 우선순위 (법인 설립 후)

#### 3. FBT 감지 시스템 (4-5일)
**완료율: 0% → 100% 목표**

##### 작업 1: FBT 감지 엔진 (2-3일)
**파일**: `apps/accounting-sandbox/lib/fbt-monitoring/fbt-detector.ts`

**기능**:
- AI 기반 FBT 감지
- 카테고리 분류 (meal, entertainment, travel, vehicle)
- 위험도 평가 (low, medium, high)

##### 작업 2: FBT 보고서 (1일)
**파일**: `apps/accounting-sandbox/lib/fbt-monitoring/fbt-reporter.ts`

**기능**:
- 연간 FBT 보고서 생성
- 카테고리별/위험도별 집계

##### 작업 3: FBT 모니터링 컴포넌트 (1일)
**파일**: `apps/accounting-sandbox/components/FBTMonitor.tsx`

**기능**:
- FBT 거래 실시간 모니터링
- 위험도별 경고 표시

---

### 🟢 낮은 우선순위 (선택적)

#### 4. Westpac 파서 (2-3일)
- `lib/pdf-parser/westpac-parser.ts` 구현
- Westpac PDF 형식 분석
- 파싱 로직 구현

#### 5. Phase 2: 홈페이지 통합 (1-2주)
- Admin Dashboard 통합
- 인증 시스템 연동
- 데이터베이스 마이그레이션
- UI 통합

---

## 📈 진행률 비교

### 현재 상태 (Phase 1)
- **전체 진행률**: 약 70%
- **완료**: 9개 주요 기능
- **부분 완료**: 2개 기능 (GST 40%, 통합 대시보드 20%)
- **미완료**: 3개 기능 (FBT, Westpac, Phase 2)

### 다음 단계 목표
- **GST 정산**: 40% → 100% (4-5일)
- **통합 대시보드**: 20% → 60% (2-3일)
- **전체 진행률**: 70% → 약 85%

---

## 🎯 권장 개발 순서

### 즉시 시작 (우선순위 순)

1. **GST 정산 기능 완성** (4-5일)
   - 가장 높은 우선순위
   - BAS 신고에 필수
   - 현재 기본 계산만 있음

2. **통합 세무 대시보드 - 마감일 추적** (2-3일)
   - 법인 설립 후 즉시 필요
   - BAS, PAYG 마감일 알림

### 법인 설립 후 (중간 우선순위)

3. **FBT 감지 시스템** (4-5일)
   - 복리후생세 신고 필요 시

4. **납부 금액 추정** (1일)
   - 예상 납부 금액 계산

### 선택적 (낮은 우선순위)

5. **Westpac 파서** (2-3일)
   - 사용 빈도 낮음

6. **Phase 2 통합** (1-2주)
   - Phase 1 검증 완료 후

---

## 📝 주요 개선 사항 (최근 완료)

### 1. 호주 재정연도 기준 분기 계산 ✅
- Q1: 7-9월 (재정연도 시작)
- Q2: 10-12월 (재정연도 연속)
- Q3: 1-3월 (재정연도 연속)
- Q4: 4-6월 (재정연도 종료)
- 재정연도 표기 정확화 (예: Q2 2024-2025)

### 2. 날짜 형식 호주 표준 ✅
- YYYY-MM-DD → DD/MM/YYYY
- 모든 화면 및 Excel 내보내기 통일

### 3. Department 표기 통일 ✅
- cleaning/sticker → Company
- 화면과 Excel 내보내기 일치

### 4. Category 표기 통일 ✅
- 화면과 Excel 내보내기 동일한 표시명 사용
- Trading Revenue 통합 표시

---

## 🔄 다음 단계 상세 계획

### Step 1: GST 포함 여부 AI 판별 (1-2일)

**목표**: 거래별 GST 포함 여부를 AI로 정확히 판별

**구현 파일**:
- `apps/accounting-sandbox/lib/gst-settlement/gst-detector.ts`
- `apps/accounting-sandbox/lib/gst-settlement/types.ts`

**주요 기능**:
1. AI 프롬프트 설계
   - 호주 GST 규칙 학습
   - 거래 유형별 판별 기준
   - 면세 거래 감지
2. 거래별 판별 로직
   - 수입 거래: GST 포함 여부 판별
   - 지출 거래: GST 포함 여부 판별
   - 면세 거래 감지
3. 결과 저장 및 활용
   - 거래 데이터에 GST 정보 추가
   - Excel 내보내기 반영

---

### Step 2: GST Net 계산 엔진 (1일)

**목표**: GST Collected와 GST Paid를 분리하여 Net 계산

**구현 파일**:
- `apps/accounting-sandbox/lib/gst-settlement/gst-calculator.ts`

**주요 기능**:
1. GST Collected 계산
   - 수입 거래에서 GST 포함 거래만 집계
   - GST = Amount / 11
2. GST Paid 계산
   - 지출 거래에서 GST 포함 거래만 집계
   - GST = Amount / 11
3. GST Net 계산
   - GST Net = GST Collected - GST Paid
   - 양수: 납부해야 할 금액
   - 음수: 환급받을 금액
4. 기간별 집계
   - 분기별 집계
   - 월별 집계

---

### Step 3: BAS GST 리포트 (1일)

**목표**: BAS 리포트에 GST 섹션 추가

**구현 파일**:
- `apps/accounting-sandbox/lib/gst-settlement/bas-gst-reporter.ts`
- `apps/accounting-sandbox/lib/payg-withholding/bas-reporter.ts` (수정)

**주요 기능**:
1. BAS 리포트 확장
   - PAYG 섹션 (기존)
   - GST 섹션 (신규)
2. GST 정보 표시
   - GST Collected
   - GST Paid
   - GST Net
   - 기간별 요약
3. Excel 내보내기 확장
   - GST 섹션 추가
   - 기존 PAYG 섹션과 통합

---

### Step 4: GST 요약 대시보드 (1일)

**목표**: 독립적인 GST 요약 컴포넌트 생성

**구현 파일**:
- `apps/accounting-sandbox/components/GSTSummary.tsx`
- `apps/accounting-sandbox/app/page.tsx` (통합)

**주요 기능**:
1. GST 요약 카드
   - GST Collected 카드
   - GST Paid 카드
   - GST Net 카드
2. 기간별 필터링
   - 분기별/월별 토글
   - 기간 선택
3. BAS 리포트 내보내기
   - GST 포함 BAS 리포트 내보내기 버튼

---

## 📊 예상 일정

### 즉시 시작 가능 (우선순위 순)

| 작업 | 소요 시간 | 우선순위 | 완료율 목표 |
|------|----------|---------|------------|
| GST 정산 기능 완성 | 4-5일 | 🔴 높음 | 40% → 100% |
| 통합 세무 대시보드 - 마감일 추적 | 2-3일 | 🔴 높음 | 20% → 60% |
| **총 예상 시간** | **6-8일** | | |

### 법인 설립 후

| 작업 | 소요 시간 | 우선순위 | 완료율 목표 |
|------|----------|---------|------------|
| FBT 감지 시스템 | 4-5일 | 🟡 중간 | 0% → 100% |
| 납부 금액 추정 | 1일 | 🟡 중간 | 0% → 100% |
| **총 예상 시간** | **5-6일** | | |

---

## 🎯 결론

### 현재 상태
- **Phase 1 진행률**: 약 70%
- **완료된 핵심 기능**: PDF 파싱, AI 분류, PAYG Withholding, Excel 내보내기
- **부분 완료**: GST 정산 (40%), 통합 대시보드 (20%)

### 다음 단계
1. **GST 정산 기능 완성** (4-5일) - 가장 높은 우선순위
2. **통합 세무 대시보드 - 마감일 추적** (2-3일) - 법인 설립 후 즉시 필요

### 목표
- **Phase 1 진행률**: 70% → 약 85%
- **GST 정산**: 40% → 100%
- **통합 대시보드**: 20% → 60%

---

**마지막 업데이트**: 2026년 1월  
**다음 업데이트 예정**: GST 정산 기능 완성 후

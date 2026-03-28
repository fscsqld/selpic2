# SELPIC A (회계 프로그램) 현재 상태 분석

## 📊 전체 개요

**SELPIC A**는 호주 비즈니스를 위한 AI 기반 회계 및 세무 관리 시스템입니다.

### 기술 스택
- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **데이터 저장**: IndexedDB (클라이언트 사이드)
- **AI**: OpenAI GPT-4o / GPT-4o-mini
- **차트**: Recharts
- **Excel**: xlsx

---

## 🏗️ 아키텍처 구조

### 1. 모듈화된 구조 (리팩토링 완료)

```
apps/accounting-sandbox/
├── src/
│   ├── features/          # 기능별 모듈
│   │   ├── payroll/       # 급여 관리
│   │   ├── compliance/    # 규정 준수
│   │   └── transactions/  # 거래 관리
│   └── shared/            # 공통 모듈
│       ├── types/         # 타입 정의
│       ├── constants/     # 상수
│       └── utils/         # 유틸리티
├── lib/                   # 기존 라이브러리
│   ├── pdf-parser/        # PDF 파싱
│   ├── ai-classifier/     # AI 분류
│   ├── payg-withholding/   # PAYG 원천징수
│   ├── fbt-monitoring/    # FBT 모니터링
│   └── ...
├── components/            # React 컴포넌트
└── app/                   # Next.js 페이지 및 API
```

---

## ✅ 완료된 주요 기능

### 1. 은행 거래 분석 (Bank Statement Analysis)

#### PDF 파싱
- **지원 은행**: CBA, NAB, ANZ, Westpac (CSV)
- **기능**:
  - 거래 내역 자동 추출
  - Debit/Credit 자동 분류
  - 잔액 조정 (Reconciliation)
  - 수수료 인식

#### AI 분류
- **31개 ATO 세금 카테고리** 자동 분류
- **GST 포함/제외** 자동 감지
- **FBT 위험** 자동 감지
- **Director's Loan** 자동 추적
- **사용자 교정 학습** (User Correction Learning)

#### 데이터 저장
- IndexedDB에 거래 내역 저장
- 파일별 히스토리 관리
- 중복 업로드 방지

---

### 2. 대시보드 (Dashboard)

#### 요약 카드
- **Total Income**: 총 수입
- **Total Expenses**: 총 지출
- **Net Profit**: 순이익
- **GST Claimable**: GST 청구 가능 금액
- **Director's Loan Balance**: 이사 대출 잔액

#### 차트
- **Pie Chart**: 지출 분포
- **Bar Chart**: 은행 vs 수동 입력 비교

#### 실시간 P&L
- 실시간 손익 계산
- 기간별 필터링

---

### 3. 거래 관리 (Transaction Management)

#### 거래 테이블
- 모든 거래 내역 표시
- 카테고리/부서 수동 변경
- 증빙 첨부 (Receipt Upload)
- Debit/Credit 수동 교환

#### 필터링
- 카테고리별 필터
- 부서별 필터
- Director's Loan 필터
- 기간별 필터

---

### 4. 세무 보고서 (Tax Reports)

#### BAS Report (Business Activity Statement)
- **GST Summary**: GST 요약
- **PAYG Summary**: PAYG 원천징수 요약
- **기간별 리포트**: 분기별/연간
- **Excel Export**: Excel 내보내기
- **Print-Friendly**: 인쇄 최적화

#### Income Statement (Profit & Loss)
- 손익계산서
- 기간별 필터링
- Excel Export

#### Compliance Package
- 연간 세무 패키지
- 분기별 BAS 패키지
- Audit Trail 포함

---

### 5. 급여 관리 (Payroll)

#### 급여 계산
- **PAYG Withholding**: 원천징수 계산
- **Superannuation**: 11.5% 계산
- **Net Pay**: 순 급여 계산

#### 자동 분개
- Wages Expense (Debit)
- PAYG Withholding Liability (Credit)
- Superannuation Liability (Credit)
- Cash/Bank (Credit)

#### Payslip 생성
- 호주 표준 Payslip PDF
- 회사 정보 자동 포함 (SELPIC PTY LTD, ABN, ACN)

---

### 6. 규정 준수 (Compliance)

#### FBT Monitor
- FBT 위험 거래 감지
- 마감일 추적
- 위험 점수 계산

#### Tax Deadline Tracker
- BAS 마감일
- PAYG 마감일
- FBT 마감일
- Income Tax 마감일

#### WorkCover
- 보험료 추산
- Certificate of Currency 관리

---

### 7. 설정 (Settings)

#### Business Profile
- 회사 정보 (SELPIC PTY LTD)
- ABN: 79 694 194 011
- ACN: 694 194 011
- Director Name 설정

#### API 관리
- OpenAI API Key 설정
- 사용량 추적
- 비용 모니터링
- 모델 전환 (gpt-4o-mini / gpt-4o)

#### 데이터 관리
- 백업/복원
- 기간 관리
- 데이터 삭제

---

### 8. 보안 (Security)

#### PIN Lock
- 4자리 PIN 설정
- Recovery Code
- System Reset

---

### 9. 온보딩 (Onboarding)

#### Setup Wizard
- 초기 설정 가이드
- Business Profile 설정
- API Key 설정
- Homepage API Integration 설정

---

### 10. 홈페이지 통합 (Homepage Integration)

#### 주문 승인 통합
- 주문 승인 시 자동 회계 장부 기록
- 중복 방지 (Unique Key Guard)
- 에러 격리 (Fault Tolerance)
- 비동기 처리

#### API 엔드포인트
- `/api/orders/approve`: 주문 승인
- `/api/payroll/approve`: 급여 승인 (Super Admin 전용)
- `/api/orders/import`: 주문 데이터 수신

---

## 🔄 리팩토링 완료 사항

### 모듈화 구조
- ✅ `/src/features/payroll/`: 급여 관리 모듈
- ✅ `/src/features/compliance/`: 규정 준수 모듈
- ✅ `/src/features/transactions/`: 거래 관리 모듈
- ✅ `/src/shared/`: 공통 모듈

### 주요 모듈

#### Payroll Module
- `calculator.ts`: 급여 계산
- `payslip-generator.ts`: Payslip PDF 생성
- `bookkeeping.ts`: 자동 분개

#### Compliance Module
- `workcover.ts`: WorkCover 보험료
- `tax-deadlines.ts`: 세무 마감일
- `workcover-certificate.ts`: Certificate 관리

#### Transactions Module
- `duplicate-detector.ts`: 중복 감지
- `order-approval.ts`: 주문 승인
- `order-approval-integration.ts`: 홈페이지 통합

---

## 📋 해야 할 작업

### 1. 홈페이지 통합 (우선순위: 높음)

#### 현재 상태
- ✅ 통합 함수 구현 완료
- ✅ API 엔드포인트 구현 완료
- ✅ 시뮬레이션 테스트 통과
- ❌ **홈페이지 코드에 실제 통합 미완료**

#### 해야 할 작업
1. **주문 승인 페이지 수정**
   - 파일: `app/admin/orders/[orderId]/page.tsx`
   - Import 추가: `recordOrderToAccountingAsync`
   - 주문 승인 핸들러에 통합 함수 호출 추가

2. **테스트**
   - 주문 승인 시 회계 장부 기록 확인
   - 중복 방지 확인
   - 에러 격리 확인

**상세 가이드**: `docs/HOMEPAGE-INTEGRATION-EXACT.md`

---

### 2. Balance Sheet 구현 (우선순위: 중간)

#### 현재 상태
- ✅ Income Statement 구현 완료
- ✅ 실시간 P&L 구현 완료
- ❌ **Balance Sheet 미구현**

#### 해야 할 작업
1. **Balance Sheet 컴포넌트 생성**
   - 파일: `components/Reports/BalanceSheetView.tsx`
   - Assets (자산) 계산
   - Liabilities (부채) 계산
   - Equity (자본) 계산

2. **데이터 계산 로직**
   - 거래 내역에서 자산/부채 추출
   - Opening Balance 반영
   - 기간별 Balance Sheet 생성

---

### 3. Period Management 완성 (우선순위: 중간)

#### 현재 상태
- ✅ Period Management UI 구현
- ✅ 기간별 필터링 기능
- ❌ **Carry Forward Logic 미완성**
- ❌ **Locking 기능 미완성**

#### 해야 할 작업
1. **Carry Forward Logic**
   - 이전 기간 데이터 이월
   - Opening Balance 계산
   - Receivables/Payables 이월

2. **Locking 기능**
   - 기간 잠금
   - 잠금된 기간 수정 방지
   - Audit Trail 기록

---

### 4. API 비용 최적화 (우선순위: 낮음)

#### 현재 상태
- ✅ API 사용량 추적
- ✅ 모델 전환 기능
- ✅ 비용 모니터링
- ❌ **Token Efficiency 최적화 미완성**

#### 해야 할 작업
1. **Token Efficiency 개선**
   - 프롬프트 최적화
   - 배치 처리
   - 캐싱 전략

2. **Rate Limiting**
   - 일일 업로드 제한
   - API 호출 제한
   - 사용량 알림

---

### 5. 테스트 및 검증 (우선순위: 높음)

#### 현재 상태
- ✅ 시뮬레이션 테스트 완료
- ❌ **실제 통합 테스트 미완료**
- ❌ **E2E 테스트 미완료**

#### 해야 할 작업
1. **통합 테스트**
   - 홈페이지-회계 프로그램 통합 테스트
   - API 엔드포인트 테스트
   - 데이터 동기화 테스트

2. **E2E 테스트**
   - 전체 워크플로우 테스트
   - 에러 시나리오 테스트
   - 성능 테스트

---

### 6. 문서화 (우선순위: 낮음)

#### 현재 상태
- ✅ 기술 문서 작성 완료
- ✅ 통합 가이드 작성 완료
- ❌ **사용자 매뉴얼 미완성**
- ❌ **API 문서 미완성**

#### 해야 할 작업
1. **사용자 매뉴얼**
   - 기능별 사용 가이드
   - 스크린샷 포함
   - FAQ

2. **API 문서**
   - API 엔드포인트 문서화
   - 요청/응답 예시
   - 에러 코드 설명

---

## 🎯 우선순위별 작업 계획

### Phase 1: 홈페이지 통합 (즉시)
1. 주문 승인 페이지 수정
2. 통합 테스트
3. 에러 처리 검증

### Phase 2: 핵심 기능 완성 (1-2주)
1. Balance Sheet 구현
2. Period Management 완성
3. 테스트 및 검증

### Phase 3: 최적화 및 문서화 (2-4주)
1. API 비용 최적화
2. 사용자 매뉴얼 작성
3. API 문서 작성

---

## 📊 현재 완성도

| 기능 | 완성도 | 상태 |
|------|--------|------|
| 은행 거래 분석 | 95% | ✅ 거의 완료 |
| 대시보드 | 90% | ✅ 거의 완료 |
| 거래 관리 | 95% | ✅ 거의 완료 |
| 세무 보고서 | 90% | ✅ 거의 완료 |
| 급여 관리 | 85% | ✅ 거의 완료 |
| 규정 준수 | 85% | ✅ 거의 완료 |
| 설정 | 90% | ✅ 거의 완료 |
| 보안 | 80% | ✅ 거의 완료 |
| 온보딩 | 85% | ✅ 거의 완료 |
| 홈페이지 통합 | 70% | ⚠️ 통합 필요 |
| Balance Sheet | 0% | ❌ 미구현 |
| Period Management | 60% | ⚠️ 완성 필요 |

**전체 완성도: 약 85%**

---

## 🚀 다음 단계

1. **즉시**: 홈페이지 통합 완료
2. **단기**: Balance Sheet 구현
3. **중기**: Period Management 완성
4. **장기**: 최적화 및 문서화

---

## 📝 참고 문서

- `docs/FINAL-IMPLEMENTATION-STATUS.md`: 구현 완료 상태
- `docs/HOMEPAGE-INTEGRATION-EXACT.md`: 홈페이지 통합 가이드
- `docs/SIMULATION-TEST-RESULTS.md`: 테스트 결과
- `docs/refactoring-summary.md`: 리팩토링 요약

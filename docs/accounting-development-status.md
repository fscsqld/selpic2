# 회계 프로그램 개발 현황 및 남은 작업

> **작성일**: 2026년 1월  
> **현재 진행률**: 약 70% (Phase 1 기준)

---

## ✅ 완료된 기능 (Phase 1)

### 1. 핵심 인프라 ✅
- [x] Next.js 프로젝트 구조 (포트 3001)
- [x] TypeScript 설정
- [x] Tailwind CSS 격리 설정
- [x] 기본 UI 및 대시보드

### 2. PDF 파싱 엔진 ✅
- [x] PDF 파서 인터페이스 및 엔진
- [x] **CBA 파서** (완전 구현)
- [x] **ANZ 파서** (완전 구현)
- [x] **NAB 파서** (완전 구현)
- [x] CSV 파서 (NAB CSV 형식)
- [x] 공통 파서 유틸리티
- [x] 거래 내역 추출 로직
- [x] 날짜/금액/잔액 파싱
- [x] 멀티라인 설명 처리

### 3. AI 분류 엔진 ✅
- [x] OpenAI 분류기 구현
- [x] 비즈니스 컨텍스트 프롬프트
- [x] ATO 카테고리 분류
- [x] Director's Loan 자동 감지
- [x] Pre-trading Expenses 감지
- [x] **PAYG 태그 자동 추가** (Step 4 완료)
- [x] 급여/보수 거래 자동 감지
- [x] 사용자 수정 학습 기능 (User Mappings)

### 4. 데이터 관리 ✅
- [x] IndexedDB 스토리지 구현
- [x] Statement History 기능
- [x] 수동 카테고리 수정
- [x] Debit/Credit 위치 교환 기능
- [x] 사용자 수정 학습 (Fuzzy Matching)

### 5. Excel 내보내기 ✅
- [x] General Ledger 형식 내보내기
- [x] GST 자동 계산 (10%)
- [x] 카테고리별 요약
- [x] Financial Summary 내보내기

### 6. PAYG Withholding 기능 ✅ (최근 완료)
- [x] **Step 1**: PAYG 설정 관리 시스템
  - [x] PAYG 등록/해제 기능
  - [x] 등록 번호 및 날짜 입력
  - [x] 로컬 스토리지 저장
- [x] **Step 2**: PAYG 세율 계산 엔진
  - [x] ATO 2024-25 세율표 구현
  - [x] 급여/보수 원천징수 계산
  - [x] 이사 보수 계산
  - [x] 직원 급여 계산
  - [x] 계약자 보수 계산
- [x] **Step 3**: No ABN Withholding 처리
  - [x] ABN 없는 계약자 감지
  - [x] 47% 원천징수 경고 표시
  - [x] UI 배지 표시
- [x] **Step 4**: AI 분류에 PAYG 태그 추가
  - [x] 급여/보수 거래 자동 감지
  - [x] PAYG 태그 자동 추가
  - [x] 급여 유형 자동 분류
- [x] **Step 5**: BAS 리포트 생성 기능
  - [x] BAS 리포트 데이터 구조
  - [x] PAYG 원천징수 집계
  - [x] Excel 내보내기
  - [x] 분기별/월별 요약
- [x] **Step 6**: PAYG 관리 UI 개발
  - [x] PAYG 요약 대시보드
  - [x] 수취인 유형별 집계
  - [x] 기간별 필터링

### 7. Director's Loan 관리 ✅
- [x] Director's Loan 감지 로직
- [x] Director Name 설정
- [x] 자동 분류 (Capital Injection / Repayment)
- [x] UI 배지 표시

### 8. Pre-trading Expenses ✅
- [x] Pre-trading Expenses 감지
- [x] UI 배지 표시

### 9. Financial Summary ✅
- [x] 수익/지출 요약
- [x] GST 요약
- [x] Director's Loan 잔액
- [x] 부문별 손익 분석

---

## ⏳ 부분 완료 / 개선 필요

### 1. GST 정산 기능 (부분 완료)

#### ✅ 완료된 부분:
- [x] GST 자동 계산 (10% - amount / 11)
- [x] Excel 내보내기 시 GST 포함
- [x] Financial Summary에 GST 표시

#### ❌ 미완료 부분:
- [ ] **GST 포함 여부 AI 판별**
  - 계획: `lib/gst-settlement/gst-detector.ts`
  - 현재: 모든 거래에 GST 포함 가정 (실제로는 판별 필요)
  - 필요 작업: AI 기반 GST 포함 여부 판별 로직 구현
- [ ] **GST Net 계산 엔진**
  - 계획: `lib/gst-settlement/gst-calculator.ts`
  - 현재: 기본 계산만 있음
  - 필요 작업: GST Collected - GST Paid 자동 계산
- [ ] **BAS GST 리포트**
  - 계획: `lib/gst-settlement/bas-gst-reporter.ts`
  - 현재: BAS 리포트에 GST 정보 미포함
  - 필요 작업: BAS 리포트에 GST 섹션 추가
- [ ] **GST 요약 대시보드 컴포넌트**
  - 계획: `components/GSTSummary.tsx`
  - 현재: Financial Summary에만 표시
  - 필요 작업: 독립적인 GST 요약 컴포넌트 생성

---

## ❌ 미완료 기능 (계획안 기준)

### 1. FBT (복리후생세) 감지 시스템

#### 계획된 기능:
- [ ] **FBT 감지 엔진**
  - 파일: `lib/fbt-monitoring/fbt-detector.ts`
  - 기능: 식대, 접대비, 여행비 등 FBT 이슈 자동 감지
  - AI 기반 FBT 카테고리 분류 (meal, entertainment, travel, vehicle)
  - FBT 위험도 평가 (low, medium, high)
- [ ] **FBT 보고서 생성**
  - 파일: `lib/fbt-monitoring/fbt-reporter.ts`
  - 기능: 연간 FBT 신고용 보고서 생성
  - 카테고리별/위험도별 집계
- [ ] **FBT 모니터링 컴포넌트**
  - 파일: `components/FBTMonitor.tsx`
  - 기능: FBT 관련 거래 실시간 모니터링
  - 위험도별 경고 표시

#### 우선순위: 중간 (법인 설립 후 필요)

---

### 2. 통합 세무 대시보드

#### 계획된 기능:
- [ ] **신고 마감일 추적**
  - 파일: `lib/tax-dashboard/deadline-tracker.ts`
  - 기능: BAS, FBT, PAYG, Income Tax 마감일 자동 계산
  - 캘린더 표시
  - 마감일 임박 알림
- [ ] **납부 금액 추정**
  - 파일: `lib/tax-dashboard/payment-estimator.ts`
  - 기능: 실시간 예상 납부 금액 계산
  - GST, PAYG, FBT 예상 금액
- [ ] **통합 세무 대시보드 컴포넌트**
  - 파일: `components/TaxDashboard.tsx`
  - 기능: 모든 세무 정보 통합 표시
  - 마감일 캘린더
  - 예상 납부 금액 요약
- [ ] **세무 등록 설정 통합**
  - 파일: `components/TaxRegistrationSettings.tsx`
  - 기능: GST, PAYG, FBT 등록 상태 통합 관리
  - ABN, ACN 입력

#### 현재 상태:
- PAYG 설정만 별도로 구현됨
- GST, FBT 설정 미구현
- 마감일 추적 미구현

#### 우선순위: 높음 (법인 설립 후 즉시 필요)

---

### 3. 은행 파서 추가

#### 미완료:
- [ ] **Westpac 파서**
  - 계획: `lib/pdf-parser/westpac-parser.ts`
  - 현재: CBA, ANZ, NAB만 지원
  - 우선순위: 낮음 (사용 빈도 낮음)

---

### 4. Phase 2: 홈페이지 통합

#### 계획된 작업:
- [ ] **Admin Dashboard 통합**
  - 경로: `app/admin/accounting/page.tsx`
  - PAYG 관리 최상단 배치
  - 기존 Admin Dashboard와 통합
- [ ] **인증 시스템 통합**
  - 메인 홈페이지 인증과 연동
  - 사용자별 데이터 분리
- [ ] **데이터베이스 통합**
  - 로컬 스토리지 → 데이터베이스 마이그레이션
  - 회계 세션 및 거래 내역 DB 저장
- [ ] **UI 통합**
  - 기존 Admin Dashboard 스타일과 통합
  - 모듈형 컴포넌트 구조

#### 우선순위: 낮음 (Phase 1 검증 후)

---

## 📋 개발 우선순위 (계획안 기준)

### 🔴 높은 우선순위 (즉시 필요)

#### 1. GST 정산 기능 완성
**완료율: 40%**

필요 작업:
1. **GST 포함 여부 AI 판별** (1-2일)
   - `lib/gst-settlement/gst-detector.ts` 구현
   - AI 프롬프트 설계
   - 거래별 GST 포함 여부 판별

2. **GST Net 계산 엔진** (1일)
   - `lib/gst-settlement/gst-calculator.ts` 구현
   - GST Collected / GST Paid 분리 계산
   - 기간별 집계

3. **BAS GST 리포트** (1일)
   - `lib/gst-settlement/bas-gst-reporter.ts` 구현
   - BAS 리포트에 GST 섹션 추가
   - Excel 내보내기 확장

4. **GST 요약 대시보드** (1일)
   - `components/GSTSummary.tsx` 생성
   - 실시간 GST 집계 표시
   - 대시보드에 통합

**예상 소요 시간**: 4-5일

---

#### 2. 통합 세무 대시보드 (부분)
**완료율: 20%**

필요 작업:
1. **신고 마감일 추적** (2일)
   - `lib/tax-dashboard/deadline-tracker.ts` 구현
   - BAS 분기별 마감일 계산
   - PAYG 마감일 계산
   - 캘린더 UI 컴포넌트

2. **납부 금액 추정** (1일)
   - `lib/tax-dashboard/payment-estimator.ts` 구현
   - GST 예상 납부 금액
   - PAYG 예상 납부 금액

3. **통합 세무 대시보드 컴포넌트** (2일)
   - `components/TaxDashboard.tsx` 생성
   - 마감일 캘린더 표시
   - 예상 납부 금액 요약
   - 대시보드에 통합

**예상 소요 시간**: 5일

---

### 🟡 중간 우선순위 (법인 설립 후)

#### 3. FBT 감지 시스템
**완료율: 0%**

필요 작업:
1. **FBT 감지 엔진** (2-3일)
   - `lib/fbt-monitoring/fbt-detector.ts` 구현
   - AI 기반 FBT 감지
   - 카테고리 분류 (meal, entertainment, travel, vehicle)
   - 위험도 평가

2. **FBT 보고서** (1일)
   - `lib/fbt-monitoring/fbt-reporter.ts` 구현
   - 연간 FBT 보고서 생성

3. **FBT 모니터링 컴포넌트** (1일)
   - `components/FBTMonitor.tsx` 생성
   - FBT 거래 실시간 모니터링

**예상 소요 시간**: 4-5일

---

### 🟢 낮은 우선순위 (선택적)

#### 4. Westpac 파서
**완료율: 0%**

필요 작업:
- `lib/pdf-parser/westpac-parser.ts` 구현
- Westpac PDF 형식 분석
- 파싱 로직 구현

**예상 소요 시간**: 2-3일

---

#### 5. Phase 2: 홈페이지 통합
**완료율: 0%**

필요 작업:
- Admin Dashboard 통합
- 인증 시스템 연동
- 데이터베이스 마이그레이션
- UI 통합

**예상 소요 시간**: 1-2주

---

## 📊 전체 진행률 요약

### Phase 1 진행률: 약 70%

#### 완료된 주요 기능:
- ✅ PDF 파싱 (CBA, ANZ, NAB)
- ✅ AI 분류 엔진
- ✅ PAYG Withholding (완전 구현)
- ✅ Excel 내보내기
- ✅ Director's Loan 관리
- ✅ Pre-trading Expenses
- ✅ 사용자 수정 학습

#### 부분 완료:
- 🟡 GST 정산 (40% - 계산만 있음, AI 판별 및 리포트 미완)
- 🟡 통합 세무 대시보드 (20% - 기본 구조만 있음)

#### 미완료:
- ❌ FBT 감지 시스템
- ❌ Westpac 파서
- ❌ Phase 2 통합

---

## 🎯 다음 단계 권장사항

### 즉시 시작 가능 (우선순위 순)

1. **GST 정산 기능 완성** (4-5일)
   - 가장 높은 우선순위
   - BAS 신고에 필수
   - 현재 기본 계산만 있음

2. **통합 세무 대시보드 - 마감일 추적** (2-3일)
   - 법인 설립 후 즉시 필요
   - BAS, PAYG 마감일 알림

3. **GST 요약 대시보드** (1일)
   - GST 정보 시각화
   - 실시간 집계 표시

### 법인 설립 후 (중간 우선순위)

4. **FBT 감지 시스템** (4-5일)
   - 복리후생세 신고 필요 시

5. **납부 금액 추정** (1일)
   - 예상 납부 금액 계산

### 선택적 (낮은 우선순위)

6. **Westpac 파서** (2-3일)
   - 사용 빈도 낮음

7. **Phase 2 통합** (1-2주)
   - Phase 1 검증 완료 후

---

## 📝 참고사항

### 현재 완료된 PAYG 기능:
- ✅ PAYG 설정 관리
- ✅ PAYG 세율 계산
- ✅ No ABN Withholding
- ✅ AI 자동 태깅
- ✅ BAS 리포트 생성
- ✅ PAYG 요약 대시보드

### 다음 개발 시 고려사항:
1. **GST 기능**: 현재 기본 계산만 있으므로 AI 판별 및 리포트 추가 필요
2. **통합 대시보드**: 마감일 추적 및 알림 기능 추가 필요
3. **FBT 기능**: 법인 설립 후 복리후생세 신고 시 필요

---

**마지막 업데이트**: 2026년 1월 (PAYG Withholding 완료 후)


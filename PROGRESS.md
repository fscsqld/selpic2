# SELPIC-Accounting 개발 진행 상황

> **프로젝트**: SELPIC-Accounting Phase 1  
> **시작일**: 2026년 1월  
> **목표**: 독립 회계 엔진 및 대시보드 구축

---

## 📊 전체 진행률: 70%

### Phase 1: 독립 회계 엔진 및 대시보드 구축

#### ✅ Step 1: 환경 설정 및 프로젝트 구조 (완료)
- [x] `apps/accounting-sandbox/` 폴더 생성
- [x] 독립적인 Next.js 프로젝트 세팅
- [x] `package.json` 생성 (포트 3001)
- [x] TypeScript 설정
- [x] Tailwind CSS 격리 설정 (prefix: `acc-`)
- [x] PostCSS 설정
- [x] Next.js 설정 파일

#### ✅ Step 2: 기본 UI 및 대시보드 (완료)
- [x] 메인 레이아웃 구성
- [x] PDF 업로드 UI 컴포넌트
- [x] 분석 결과 테이블 (Mock Data)
- [x] 반응형 디자인
- [x] Tailwind CSS 스타일 격리

#### ✅ Step 3: PDF 파서 엔진 구현 (완료)
- [x] 타입 정의 (`lib/pdf-parser/types.ts`)
- [x] PDF 파서 인터페이스 정의
- [x] CBA 파서 상세 구현 (`lib/pdf-parser/cba-parser.ts`)
  - [x] 거래 내역 추출 로직
  - [x] 날짜 추출 (dd/MM/yyyy 형식)
  - [x] 금액 추출 (출금/입금 구분)
  - [x] 잔액 추출
  - [x] 설명 정리 (특수문자 제거)
  - [x] 멀티라인 설명 처리
- [x] PDF 파서 엔진 (`lib/pdf-parser/index.ts`)

#### ✅ Step 4: AI 분류 엔진 구현 (완료)
- [x] 타입 정의 (`lib/ai-classifier/types.ts`)
- [x] OpenAI 분류기 구현 (`lib/ai-classifier/openai-classifier.ts`)
- [x] 비즈니스 컨텍스트 프롬프트 설계 (영어)
- [x] Director's Loan 자동 감지 로직
- [x] Pre-trading Expenses 감지 로직
- [x] AI 분류기 엔진 (`lib/ai-classifier/index.ts`)
- [x] API 키 설정 UI (`components/Settings/ApiKeyForm.tsx`)
- [x] API 키 유효성 검증 (`app/api/validate-api-key/route.ts`)

#### ✅ Step 5: 통합 파이프라인 구현 (완료)
- [x] 통합 API 라우트 (`app/api/analyze/route.ts`)
- [x] PDF 업로드 → 파싱 → AI 분류 파이프라인 연결
- [x] 에러 핸들링
- [x] 로딩 상태 표시 (프로세싱 단계별 표시)
- [x] 결과 테이블에 표시
- [ ] 결과 저장 기능 (다음 단계)

#### ✅ Step 6: UI/UX 개선 및 i18n 준비 (완료)
- [x] 모든 UI 레이블 영어로 변경
- [x] i18n 구조 준비 (`lib/i18n/strings.ts`)
- [x] 프로페셔널 디자인 적용
- [x] 로딩 스피너 및 진행 상태 표시
- [x] 에러 메시지 영어로 표시
- [x] Director's Loan 및 Pre-revenue 태그 표시

#### ✅ Step 7: 에러 디버깅 및 Step 3 구현 (완료)
- [x] 상세 서버 사이드 로깅 추가 (`app/api/analyze/route.ts`)
- [x] PDF 파서 로깅 추가 (`lib/pdf-parser/cba-parser.ts`)
- [x] 에러 핸들링 개선 (파일 크기, API 키, Rate Limit 등)
- [x] IndexedDB 스토리지 구현 (`lib/storage/indexed-db.ts`)
- [x] 수동 카테고리 수정 기능 (`components/TransactionTable.tsx`)
- [x] Excel 내보내기 엔진 (`lib/excel-export/index.ts`)
- [x] GST 자동 계산 로직 (`lib/excel-export/index.ts`, `lib/utils/financial-summary.ts`)
- [x] 요약 대시보드 (`components/FinancialSummary.tsx`)
- [x] Statement History 기능

#### ⏳ Step 7: 추가 기능 (다음 단계)
- [ ] 결과 저장 기능 (로컬 스토리지)
- [ ] 엑셀 내보내기
- [ ] ANZ 파서 구현
- [ ] Westpac 파서 구현

---

## 📝 다음 할 일

### 즉시 시작 가능 (우선순위 순)

#### 1. CBA 파서 상세 구현 (최우선) ⭐
- [ ] CBA PDF 샘플 파일 분석
- [ ] `extractTransactions()` 메서드 구현
  - [ ] 날짜 추출 로직 (dd/MM/yyyy 형식)
  - [ ] 거래 설명 추출 로직
  - [ ] 금액 추출 로직 (출금/입금 구분)
  - [ ] 잔액 추출 로직
- [ ] `extractStatementPeriod()` 구현
- [ ] `extractBalances()` 구현
- [ ] 실제 PDF 파일로 테스트

**참고**: `apps/accounting-sandbox/NEXT_STEPS.md` 파일에 상세 가이드 작성됨

#### 2. API 키 설정 UI
- [ ] `components/ApiKeySettings.tsx` 생성
- [ ] API 키 입력 폼 (마스킹 처리)
- [ ] 로컬 스토리지 저장
- [ ] API 키 유효성 검증
- [ ] 대시보드에 통합

#### 3. 파이프라인 통합
- [ ] `app/api/parse-pdf/route.ts` 생성
- [ ] PDF 업로드 → 파싱 → AI 분류 연결
- [ ] 로딩 상태 표시
- [ ] 에러 핸들링
- [ ] 결과 테이블에 표시

#### 4. Director's Loan 자동 감지 및 표시
- [ ] Pre-revenue 기간 확인 로직
- [ ] UI에 특별 배지 표시
- [ ] 상환 가능 잔액 계산
- [ ] 요약 대시보드 추가

---

## 🎯 완료된 주요 기능

### ✅ 환경 설정
- 독립적인 Next.js 프로젝트 (포트 3001)
- Tailwind CSS 격리 (메인 홈페이지와 충돌 방지)
- TypeScript 설정

### ✅ 기본 UI
- PDF 업로드 인터페이스
- 분석 결과 테이블 (Mock Data)
- 반응형 디자인

### ✅ 핵심 모듈 구조
- PDF 파서 엔진 기본 구조
- AI 분류 엔진 기본 구조
- 비즈니스 컨텍스트 프롬프트 설계

---

## 📌 참고사항

- 모든 작업은 `apps/accounting-sandbox/` 폴더 내에서 진행
- 메인 홈페이지(`localhost:3000`)와 완전히 독립
- 개발 서버 실행: `npm run dev:accounting` (포트 3001)
- 설계 문서: `docs/accounting-module-blueprint-saas.md`

---

**마지막 업데이트**: 2026년 1월 3일


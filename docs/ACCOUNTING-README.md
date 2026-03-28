# SELPIC-Accounting 전체 정리

## 📋 프로젝트 개요

**SELPIC-Accounting**은 호주 은행 PDF 내역서를 자동으로 파싱하고, AI를 통해 ATO(호주 국세청) 표준 카테고리로 분류하며, PAYG, GST, FBT 등 세무 신고를 자동화하는 회계 자동화 도구입니다.

---

## 🎯 핵심 기능 요약

### 1. PDF 파싱 엔진
- ✅ 호주 주요 은행 지원 (CBA, ANZ 등)
- ✅ 거래 내역 자동 추출
- ✅ 계좌 정보 자동 파싱

### 2. AI 분류 시스템
- ✅ ATO 표준 카테고리 자동 분류
- ✅ 급여/보수 거래 자동 감지
- ✅ 피드백 루프를 통한 학습

### 3. PAYG Withholding (원천징수)
- ✅ **모듈화 설계**: PAYG 등록 여부에 따라 On/Off 가능
- ✅ **초기 상태**: PAYG 미등록 시 기본 Off (대기 상태)
- ✅ 급여/보수 원천징수 자동 계산
- ✅ No ABN Withholding (47%) 경고 (항상 활성)
- ✅ BAS 신고 지원

### 4. GST 정산
- ✅ GST 포함 여부 AI 판별
- ✅ GST Net 자동 계산 (GST Collected - GST Paid)
- ✅ BAS GST 리포트 생성

### 5. FBT (복리후생세) 감지
- ✅ FBT 이슈 자동 감지 (식대, 접대비, 여행비 등)
- ✅ 위험도 평가 (low/medium/high)
- ✅ FBT 보고서 생성

### 6. Director's Loan 관리
- ✅ PAYG 미등록 시 집중 관리
- ✅ 이사 대여금 자동 감지 및 분류
- ✅ 잔액 추적 및 리포트

### 7. 통합 세무 대시보드
- ✅ 신고 마감일 추적 (BAS, FBT, PAYG)
- ✅ 납부 금액 추정
- ✅ 세무 등록 설정 관리

### 8. 엑셀 내보내기
- ✅ General Ledger 형식
- ✅ BAS 리포트 형식
- ✅ ATO 표준 준수

---

## 📁 파일 구조

### 설계 문서
```
docs/
├── accounting-module-blueprint.md    # 전체 설계 문서 (메인)
└── ACCOUNTING-README.md               # 이 파일 (요약)
```

### 초기 코드 (구현 대기)
```
apps/accounting-sandbox/
├── lib/
│   └── pdf-parser/
│       ├── types.ts                  # 타입 정의
│       ├── common-parser.ts          # 공통 유틸리티
│       ├── cba-parser.ts             # CBA 파서 (초기 구현)
│       └── index.ts                  # 파서 엔진
└── components/
    └── DirectorsLoanManager.tsx      # Director's Loan 관리 컴포넌트
```

### 보고서
```
docs/report/
├── accounting-report.md               # 마크다운 보고서
└── accounting-report.html            # HTML 보고서
```

---

## 🚀 개발 상태

### ✅ 완료 (설계 단계)
- [x] 전체 설계 문서 작성
- [x] PDF 파서 타입 정의
- [x] 공통 파서 유틸리티
- [x] CBA 파서 초기 구현
- [x] PAYG 모듈화 설계
- [x] Director's Loan 관리 설계
- [x] GST 정산 기능 설계
- [x] FBT 감지 시스템 설계
- [x] 통합 세무 대시보드 설계
- [x] 세무 등록 설정 설계

### 🚧 진행 예정 (구현 단계)
- [ ] Next.js 프로젝트 초기화
- [ ] PDF 파서 엔진 완성
- [ ] AI 분류 엔진 구현
- [ ] PAYG 계산 엔진 구현
- [ ] GST 정산 엔진 구현
- [ ] FBT 감지 엔진 구현
- [ ] UI 컴포넌트 개발
- [ ] 통합 테스트

---

## 📊 주요 설계 내용

### 1. PAYG 모듈화
- **설정 관리**: `PAYGConfigManager`로 On/Off 제어
- **초기 상태**: PAYG 미등록 시 기본 Off
- **즉시 활성화**: 등록 시 재시작 없이 기능 활성화
- **조건부 UI**: PAYG 미등록 시 관련 기능 숨김 또는 비활성화 표시

### 2. Director's Loan 관리
- **자동 감지**: AI 기반 이사 대여금 거래 감지
- **카테고리 분류**: withdrawal, advance, expense 구분
- **잔액 추적**: 총 대여금, 상환금, 현재 잔액 관리
- **리포트 생성**: Director's Loan 리포트 생성

### 3. No ABN Withholding 경고
- **항상 활성**: PAYG 등록 여부와 무관하게 경고 표시
- **자동 감지**: ABN 없는 계약자에게 $75 이상 지급 시 경고
- **법적 의무**: 47% 원천징수 법적 의무 안내

### 4. 세무 등록 관리
- **GST 등록**: GST 등록 상태 관리
- **PAYG 등록**: PAYG 등록 상태 관리 (On/Off)
- **FBT 등록**: FBT 등록 상태 관리
- **ABN/ACN**: 사업자 등록번호 관리

---

## 🔗 통합 계획

### Phase 1: 독립 개발
- `apps/accounting-sandbox`에서 완전히 독립적인 웹 앱으로 구축
- 공공 배포(SaaS) 형태로 테스트

### Phase 2: 홈페이지 통합
- 검증 완료 후 메인 홈페이지 Admin Dashboard 모듈로 통합
- 사용자 인증 시스템 연동
- 데이터베이스 통합

---

## 📝 참고 문서

- **전체 설계 문서**: `docs/accounting-module-blueprint.md`
- **HTML 보고서**: `docs/report/accounting-report.html`
- **마크다운 보고서**: `docs/report/accounting-report.md`

---

**작성일**: 2024년  
**버전**: 3.1  
**상태**: 설계 완료, 구현 대기


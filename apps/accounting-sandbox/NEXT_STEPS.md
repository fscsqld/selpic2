# 다음 단계 가이드

## 🎯 현재 상태
- ✅ 프로젝트 환경 설정 완료
- ✅ 기본 UI 구성 완료 (Mock Data)
- ✅ PDF 파서 엔진 기본 구조 완료
- ✅ AI 분류 엔진 기본 구조 완료

---

## 📋 다음 단계 (우선순위 순)

### Step 1: CBA 파서 상세 구현 (최우선)

**목표**: 실제 CBA PDF 파일을 파싱하여 거래 내역 추출

**작업 내용**:
1. CBA PDF 샘플 파일 분석
   - 실제 CBA 은행 PDF 내역서 형식 확인
   - 날짜, 설명, 금액, 잔액 패턴 파악

2. `lib/pdf-parser/cba-parser.ts` 완성
   - `extractTransactions()` 메서드 구현
   - 날짜 추출: `dd/MM/yyyy` 또는 `dd-MM-yyyy` 형식
   - 거래 설명 추출: 설명 텍스트 파싱
   - 금액 추출: 출금/입금 금액 파싱
   - 잔액 추출: 거래 후 잔액 파싱

3. 테스트
   - 실제 CBA PDF 파일로 테스트
   - 추출된 데이터 검증

**예상 소요 시간**: 2-3일

---

### Step 2: API 키 설정 UI 추가

**목표**: 사용자가 OpenAI API 키를 입력하고 저장할 수 있는 UI

**작업 내용**:
1. API 키 입력 폼 컴포넌트 생성
   - `components/ApiKeySettings.tsx`
   - 입력 필드 (마스킹 처리)
   - 저장 버튼
   - 로컬 스토리지에 안전하게 저장

2. API 키 유효성 검증
   - OpenAI API 키 형식 검증
   - 테스트 API 호출로 유효성 확인

3. 대시보드에 통합
   - 설정 메뉴 또는 모달 추가
   - API 키가 없을 때 안내 메시지 표시

**예상 소요 시간**: 1일

---

### Step 3: PDF 업로드 → 파싱 → AI 분류 파이프라인 연결

**목표**: 전체 워크플로우를 하나로 연결

**작업 내용**:
1. API 라우트 생성
   - `app/api/parse-pdf/route.ts`
   - PDF 파일 업로드 처리
   - PDF 파서 엔진 호출
   - AI 분류 엔진 호출
   - 결과 반환

2. 프론트엔드 연동
   - `app/page.tsx`에서 API 호출
   - 로딩 상태 표시
   - 결과 테이블에 표시

3. 에러 핸들링
   - PDF 파싱 실패 처리
   - AI 분류 실패 처리
   - 사용자 친화적 에러 메시지

**예상 소요 시간**: 2일

---

### Step 4: Director's Loan 자동 감지 및 표시

**목표**: Pre-revenue 기간(1-3월) 자본 투입 자동 감지

**작업 내용**:
1. Director's Loan 감지 로직 강화
   - AI 분류 결과에서 `isDirectorsLoan: true` 확인
   - Pre-revenue 기간 확인 (2026-01-01 ~ 2026-03-31)
   - 파트너십 → 법인 계좌 이체 감지

2. UI에 표시
   - Director's Loan 거래에 특별 배지 표시
   - "Pre-revenue" 태그 표시
   - 상환 가능 잔액 계산 및 표시

3. 요약 대시보드
   - 총 자본 투입액
   - 총 인출액
   - 상환 가능 잔액

**예상 소요 시간**: 1-2일

---

### Step 5: Pre-trading Expenses 감지

**목표**: 창업 비용 자동 분류

**작업 내용**:
1. Pre-trading Expenses 감지 로직
   - Incorporation fees ($611)
   - Domain registration
   - Sample production costs
   - Setup costs

2. UI에 표시
   - Pre-trading Expense 태그
   - 공제 가능 여부 표시
   - 공제 적용 예정일 표시

**예상 소요 시간**: 1일

---

### Step 6: 결과 저장 및 내보내기

**목표**: 분석 결과를 저장하고 엑셀로 내보내기

**작업 내용**:
1. 로컬 스토리지 저장
   - 분석 세션 저장
   - 이전 결과 불러오기

2. 엑셀 내보내기
   - General Ledger 형식
   - ATO 표준 준수
   - xlsx 라이브러리 활용

**예상 소요 시간**: 1-2일

---

## 🚀 즉시 시작 가능한 작업

### 1. CBA 파서 상세 구현 (가장 중요)

**시작 방법**:
1. 실제 CBA PDF 샘플 파일 준비 (또는 샘플 데이터)
2. `lib/pdf-parser/cba-parser.ts`의 `extractTransactions()` 메서드 구현
3. 정규표현식 패턴 작성

**참고 코드 위치**:
- `apps/accounting-sandbox/lib/pdf-parser/cba-parser.ts`

**구현 예시**:
```typescript
private extractTransactions(text: string): BankTransaction[] {
  const transactions: BankTransaction[] = []
  
  // CBA PDF 형식 예시:
  // "15/01/2026 PAYMENT FROM CUSTOMER ABC $1,500.00 $1,500.00"
  
  const lines = text.split('\n')
  for (const line of lines) {
    // 날짜 패턴 매칭
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/)
    if (!dateMatch) continue
    
    // 금액 패턴 매칭
    const amounts = line.match(/\$([\d,]+\.\d{2})/g)
    // ... 파싱 로직
  }
  
  return transactions
}
```

---

## 📝 개발 팁

### CBA PDF 파싱 시 고려사항
1. **PDF 텍스트 추출**: `pdf-parse` 라이브러리가 이미 설치됨
2. **날짜 형식**: 호주 형식 `dd/MM/yyyy` 주의
3. **금액 형식**: 천 단위 구분자(쉼표) 처리 필요
4. **멀티라인 설명**: 거래 설명이 여러 줄에 걸칠 수 있음

### AI 분류 테스트
1. OpenAI API 키 설정 후
2. 샘플 거래로 테스트
3. 프롬프트 조정 필요 시 `openai-classifier.ts` 수정

---

## 🎯 완료 기준

각 단계가 완료되었다고 판단하는 기준:

- **CBA 파서**: 실제 PDF에서 90% 이상의 거래를 정확히 추출
- **API 키 설정**: 키 입력 후 AI 분류가 정상 작동
- **파이프라인 연결**: PDF 업로드 → 파싱 → 분류 → 결과 표시가 원활히 작동
- **Director's Loan 감지**: Pre-revenue 기간 자본 투입이 자동으로 감지됨

---

**다음 작업 시작**: CBA 파서 상세 구현부터 시작하세요! 🚀


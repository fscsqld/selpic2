# NAB PDF 파서 분석 및 문제점

## 실제 NAB PDF 형식 분석

### 제공된 샘플 거래:
```
02 Oct 25 EFTPOS 02/10 13:15RACQ\ $252.00 $3,041.25 CR
03 Oct 25 V8656 02/10 SECURE PARKING 800140 BRISBANE
74229855275
$25.25 $3,016.00 CR
07 Oct 25 V8656 06/10 INTL TXN FEE-MC 24011345279 $1.06 $7,150.74 CR
07 Oct 25 ASSOCIATEDCLEANING ASSOCIATED CLEAN JINSOO KIM $3,498.00 $5,743.80 CR
07 Oct 25 ONLINE S0990592579 LINKED ACC TRNS KIM J $4,300.00 $2,712.34 CR
```

### 실제 형식:
- **헤더**: `Date Particulars Debits Credits Balance`
- **거래 라인**: `Date | Particulars | Debits (비어있거나 값) | Credits (비어있거나 값) | Balance CR/DR`
- **특징**:
  - Debits 컬럼이 비어있으면 Credits 컬럼에 값이 있음
  - Credits 컬럼이 비어있으면 Debits 컬럼에 값이 있음
  - 항상 Balance는 마지막에 CR 또는 DR로 표시
  - 멀티라인 설명 가능 (예: SECURE PARKING이 여러 줄)

## 발견된 문제점

### 1. Debits/Credits 컬럼 처리 오류
- **현재**: 3개의 금액을 모두 찾으려고 함 (Debit, Credit, Balance)
- **실제**: 2개의 금액만 있음 (Debits 또는 Credits 중 하나, 그리고 Balance)
- **문제**: amounts.length === 2일 때 첫 번째 금액을 Debit/Credit으로 잘못 판단

### 2. 멀티라인 설명 처리 부족
- **현재**: 한 줄만 처리
- **실제**: 설명이 여러 줄에 걸칠 수 있음
- **예시**: 
  ```
  03 Oct 25 V8656 02/10 SECURE PARKING 800140 BRISBANE
  74229855275
  $25.25 $3,016.00 CR
  ```

### 3. Transaction Fee 감지 없음
- **현재**: Transaction Fee를 일반 거래로 처리
- **실제**: "INTL TXN FEE-MC" 같은 수수료가 별도로 표시됨
- **필요**: CBA 파서처럼 Transaction Fee 감지 및 병합 로직 필요

### 4. Description 클렌징 부족
- **현재**: 기본적인 클렌징만 수행
- **실제**: "EFTPOS 02/10 13:15RACQ\" → "RACQ"로 추출 필요
- **필요**: CBA 파서처럼 가맹점 이름만 추출하는 로직 필요

### 5. Balance 대조 검증 없음
- **현재**: Balance 검증 로직 없음
- **필요**: CBA 파서처럼 Closing Balance 검증 필요

## 수정 방안

1. **Debits/Credits 컬럼 처리 개선**
   - 2개 금액일 때: 첫 번째가 Debits 또는 Credits인지 판단
   - 컬럼 위치 기반 판단 로직 추가

2. **멀티라인 설명 처리**
   - 날짜가 있는 라인 이후의 연속된 라인들을 설명으로 병합
   - 다음 날짜 라인 또는 금액 라인까지 병합

3. **Transaction Fee 감지 추가**
   - "INTL TXN FEE", "FOREIGN CURRENCY FEE" 등 키워드 감지
   - 메인 거래와 병합 또는 별도 처리

4. **Description 클렌징 강화**
   - "EFTPOS", "V8656", "ONLINE" 등 접두사 제거
   - 가맹점 이름만 추출

5. **Balance 대조 검증 추가**
   - CBA 파서와 동일한 검증 로직 추가


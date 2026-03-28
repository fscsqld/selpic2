# Payroll Transaction Auto-Matching 테스트 가이드

## 📋 개요

은행 명세서에서 급여 지급 거래를 자동으로 직원/컨트랙터와 매칭하는 기능을 테스트합니다.

---

## 🧪 테스트 시나리오

### 시나리오 1: Employee 급여 지급 매칭

#### 준비 단계:
1. **HR & Payroll** → **Add Employee**
2. Employee 정보 입력:
   - **Name**: `John Smith`
   - **Employee ID**: `EMP001`
   - **Type**: `Employee`
   - **Payment Bank Account**:
     - **Bank Name**: `CBA`
     - **Account Name**: `John Smith`
     - **BSB**: `123-456`
     - **Account Number**: `12345678`
3. **Save Employee**

#### 테스트 단계:
1. **Bank Statement** 업로드
2. 명세서에 다음 거래 포함:
   ```
   Date: 2025-01-15
   Description: PAYROLL JOHN SMITH 12345678
   Debit: $1,000.00
   ```
3. **Analyze** 클릭

#### 예상 결과:
- ✅ 거래에 **"Payroll (John Smith) [employee]"** 배지 표시
- ✅ **"✓ High"** 신뢰도 배지 표시 (계좌번호 일치)
- ✅ `isPayrollTransaction: true` 태그
- ✅ `payrollType: 'employee'` 태그
- ✅ `matchedEmployee` 정보 포함

---

### 시나리오 2: Contractor 급여 지급 매칭

#### 준비 단계:
1. **HR & Payroll** → **Add Employee**
2. Contractor 정보 입력:
   - **Name**: `ABC Consulting`
   - **Contractor ID**: `SP-CO001` (자동 생성)
   - **Type**: `Contractor`
   - **Company Name**: `ABC Consulting Pty Ltd`
   - **ABN**: `12 345 678 901`
   - **GST Registered**: 체크
   - **Payment Bank Account**:
     - **Bank Name**: `NAB`
     - **Account Name**: `ABC Consulting`
     - **BSB**: `456-789`
     - **Account Number**: `98765432`
3. **Save Employee**

#### 테스트 단계:
1. **Bank Statement** 업로드
2. 명세서에 다음 거래 포함:
   ```
   Date: 2025-01-15
   Description: TRANSFER ABC CONSULTING 98765432
   Debit: $2,000.00
   ```
3. **Analyze** 클릭

#### 예상 결과:
- ✅ 거래에 **"Payroll (ABC Consulting) [contractor]"** 배지 표시
- ✅ **"✓ High"** 신뢰도 배지 표시
- ✅ `isPayrollTransaction: true` 태그
- ✅ `payrollType: 'contractor'` 태그
- ✅ PAYG 배지 없음 (Contractor는 PAYG 없음)

---

### 시나리오 3: 매칭 신뢰도 테스트

#### High Confidence (높은 신뢰도):
- **조건**: 계좌번호 일치 + BSB 일치
- **예시**: Description에 계좌번호와 BSB 모두 포함
- **표시**: **"✓ High"** (녹색 배지)

#### Medium Confidence (중간 신뢰도):
- **조건**: BSB 일치 + 계좌명 일치
- **예시**: Description에 BSB와 계좌명 포함
- **표시**: **"~ Medium"** (노란색 배지)

#### Low Confidence (낮은 신뢰도):
- **조건**: 계좌명 또는 직원 이름 일치만
- **예시**: Description에 직원 이름만 포함
- **표시**: **"? Low"** (주황색 배지)

---

### 시나리오 4: Contractor 급여 계산 테스트

#### 준비 단계:
1. Contractor 등록 (위 시나리오 2 참고)

#### 테스트 단계:
1. **HR & Payroll** → 직원 목록 → **ABC Consulting** 클릭
2. **[Payroll Processing]** 탭
3. **Gross Pay**: `$2,000` 입력
4. **Calculate** 클릭

#### 예상 결과:
- ✅ **PAYG Withholding**: `$0` (Contractor는 PAYG 없음)
- ✅ **Superannuation**: `$0` (Contractor는 Super 없음)
- ✅ **Net Pay**: `$2,000` (Gross Pay와 동일)
- ✅ **GST**: GST 등록 시 GST 포함 계산

---

## 🔍 매칭 로직 확인

### 매칭 기준 (우선순위):
1. **계좌번호 일치** (3점) - Description에 계좌번호 포함
2. **BSB 일치** (2점) - Description에 BSB 포함
3. **계좌명 일치** (1점) - Description에 계좌명 주요 단어 포함
4. **직원 이름 일치** (1점) - Description에 직원 이름 포함

### 신뢰도 결정:
- **High**: 3점 이상
- **Medium**: 2점
- **Low**: 1점

---

## ⚠️ 주의사항

### 매칭 실패 시:
1. **은행 계좌 정보 확인**:
   - 계좌번호, BSB, 계좌명이 정확한지 확인
   - 명세서의 Description 형식과 일치하는지 확인

2. **수동 태그 추가**:
   - 매칭되지 않은 거래는 수동으로 `isPayrollTransaction` 태그 추가 가능
   - Transaction Table에서 직접 수정

3. **Low Confidence 거래**:
   - 신뢰도가 낮은 거래는 수동으로 확인 권장
   - 매칭 정보가 정확한지 검증 필요

---

## 📊 테스트 체크리스트

### Employee 등록 및 매칭:
- [ ] Employee 등록 시 은행 계좌 정보 입력
- [ ] 명세서 업로드 후 자동 매칭 확인
- [ ] High Confidence 배지 표시 확인
- [ ] Payroll 배지 및 직원 이름 표시 확인

### Contractor 등록 및 매칭:
- [ ] Contractor 등록 시 SP-CO ID 자동 생성 확인
- [ ] Company Name 필수 입력 확인
- [ ] ABN 필수 입력 확인
- [ ] 명세서 업로드 후 자동 매칭 확인
- [ ] Contractor 급여 계산 시 PAYG/Super 없음 확인

### 급여 계산:
- [ ] Employee 급여 계산: PAYG, Super 포함
- [ ] Contractor 급여 계산: PAYG/Super 없음
- [ ] GST 등록 Contractor: GST 포함 계산

### UI 표시:
- [ ] Payroll 배지 표시
- [ ] 직원/컨트랙터 이름 표시
- [ ] 신뢰도 배지 표시 (High/Medium/Low)
- [ ] PAYG 배지 표시 (Employee만)

---

## 🐛 문제 해결

### 매칭이 안 되는 경우:
1. **은행 계좌 정보 확인**:
   ```typescript
   // Employee 정보에서 확인
   bankAccount: {
     bankName: "CBA",
     accountName: "John Smith",
     bsb: "123-456",
     accountNumber: "12345678"
   }
   ```

2. **명세서 Description 형식 확인**:
   - 계좌번호가 포함되어 있는지
   - BSB가 포함되어 있는지
   - 계좌명 또는 직원 이름이 포함되어 있는지

3. **콘솔 로그 확인**:
   ```
   [ANALYZE] ✅ Matched transaction X to John Smith (EMP001) - Confidence: high
   ```

### 매칭이 잘못된 경우:
1. **수동 수정**:
   - Transaction Table에서 `isPayrollTransaction` 태그 제거
   - 올바른 직원으로 수동 태그 추가

2. **은행 계좌 정보 수정**:
   - Employee 정보에서 은행 계좌 정보 수정
   - 다음 명세서 업로드 시 자동 매칭 재시도

---

## 📝 테스트 결과 기록

### 테스트 날짜: ___________

#### Employee 매칭:
- [ ] 성공
- [ ] 실패 (이유: _________________)

#### Contractor 매칭:
- [ ] 성공
- [ ] 실패 (이유: _________________)

#### 급여 계산:
- [ ] Employee 계산 정확
- [ ] Contractor 계산 정확
- [ ] 오류 발생 (이유: _________________)

#### UI 표시:
- [ ] 모든 배지 정상 표시
- [ ] 일부 배지 누락 (항목: _________________)

---

**참고 파일:**
- `lib/utils/payroll-transaction-matcher.ts` - 매칭 로직
- `app/api/analyze/route.ts` - 파서 통합
- `components/TransactionTable.tsx` - UI 표시

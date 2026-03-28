# Employee & Contractor 구분 기능 가이드

## 📋 개요

SELPIC A의 HR & Payroll 시스템은 이제 **Employee**와 **Contractor**를 명확히 구분하여 관리합니다.

---

## 🔑 주요 차이점

### Employee (직원)
- ✅ **Tax File Number (TFN)** 사용
- ✅ **PAYG Withholding** 적용
- ✅ **Superannuation** 지급 (기본 11%)
- ✅ **Employee ID** 형식: 자유 입력 (예: `EMP001`)

### Contractor (계약자)
- ✅ **ABN (Australian Business Number)** 필수
- ❌ **PAYG Withholding** 없음 (자체 세금 신고)
- ❌ **Superannuation** 없음
- ✅ **GST Registration** 선택 가능
- ✅ **Company Name** 필수
- ✅ **Contractor ID** 형식: 자동 생성 `CON-XXXXXX`

---

## 🎯 기능 상세

### 1. 직원 등록 시 자동 처리

#### Contractor 선택 시:
1. **ID 자동 생성**: `CON-`으로 시작하는 ID 자동 생성 (예: `CON-123456`)
2. **Superannuation Rate**: 자동으로 0%로 설정 (비활성화)
3. **TFN 필드**: 비활성화 (Contractor는 TFN 사용 안 함)
4. **ABN 필드**: 필수 입력
5. **GST Registration**: 체크박스로 선택
6. **Company Name**: 필수 입력

#### Employee 선택 시:
1. **ID**: 자유 입력
2. **Superannuation Rate**: 기본 11% (수정 가능)
3. **TFN 필드**: 활성화
4. **ABN 필드**: 비활성화 (필요 시 수동 입력 가능)

---

### 2. 급여 계산 차이

#### Employee 급여 계산:
```
Gross Pay: $1,000
- PAYG Withholding: $200 (예시)
- Superannuation (11%): $110
= Net Pay: $690
```

#### Contractor 급여 계산:
```
Gross Pay: $1,000
- PAYG Withholding: $0 (없음)
- Superannuation: $0 (없음)
= Net Pay: $1,000
```

**참고**: Contractor는 자체 세금 신고를 하므로 PAYG 원천징수가 없습니다.

---

### 3. 급여 결제 은행 계좌 정보

모든 직원/컨트랙터는 급여 지급을 위한 **은행 계좌 정보**를 등록할 수 있습니다.

#### 등록 정보:
- **Bank Name**: CBA, NAB, ANZ, Westpac, Other
- **Account Name**: 계좌명
- **BSB**: BSB 번호 (예: 123-456)
- **Account Number**: 계좌번호

#### 자동 매칭 기능:
은행 명세서를 업로드하면 시스템이 자동으로:
1. 계좌번호 일치 확인
2. BSB 일치 확인
3. 계좌명 일치 확인
4. 직원 이름 일치 확인

매칭된 거래는 자동으로:
- `isPayrollTransaction: true` 태그 추가
- `payrollType: 'employee' | 'contractor'` 설정
- 해당 직원/컨트랙터 정보 연결

---

## 📝 사용 시나리오

### 시나리오 1: Contractor 등록

1. **HR & Payroll** → **Add Employee**
2. **Employee Type**: `Contractor` 선택
3. 자동으로:
   - Contractor ID 생성: `CON-123456`
   - Superannuation Rate: 0% (비활성화)
   - TFN 필드: 비활성화
4. 입력:
   - **Company Name**: `ABC Consulting Pty Ltd` (필수)
   - **ABN**: `12 345 678 901` (필수)
   - **GST Registered**: 체크 (GST 포함 지급 시)
   - **Bank Account**: 급여 지급 계좌 정보
5. **Save Employee**

---

### 시나리오 2: 은행 명세서에서 급여 지급 자동 인식

1. **Bank Statement** 업로드
2. 시스템이 자동으로:
   - 모든 직원/컨트랙터의 은행 계좌 정보와 비교
   - 매칭된 거래에 `isPayrollTransaction: true` 태그 추가
   - 해당 직원/컨트랙터 정보 연결
3. **Transaction Table**에서 확인:
   - 급여 지급 거래에 "Payroll" 배지 표시
   - 직원/컨트랙터 이름 표시
   - 매칭 신뢰도 표시 (High/Medium/Low)

---

### 시나리오 3: Contractor 급여 계산

1. **HR & Payroll** → 직원 선택 → **[Payroll Processing]** 탭
2. **Gross Pay**: $1,000 입력
3. 자동 계산:
   - PAYG Withholding: $0 (Contractor는 없음)
   - Superannuation: $0 (Contractor는 없음)
   - Net Pay: $1,000
4. **GST 포함 여부**: 체크 시 GST 추가 계산
5. **Generate Payslip**

---

## 🔍 매칭 신뢰도

### High Confidence (높은 신뢰도)
- 계좌번호 일치 + BSB 일치
- 또는 계좌번호 일치 + 계좌명 일치

### Medium Confidence (중간 신뢰도)
- BSB 일치 + 계좌명 일치
- 또는 계좌번호 일치

### Low Confidence (낮은 신뢰도)
- 계좌명 일치 또는 직원 이름 일치만

---

## ⚠️ 주의사항

### Contractor 관련:
1. **ABN 필수**: Contractor 등록 시 ABN은 필수입니다.
2. **PAYG 없음**: Contractor는 PAYG 원천징수가 없으므로 급여 계산에서 제외됩니다.
3. **Superannuation 없음**: Contractor는 Superannuation 지급 대상이 아닙니다.
4. **GST**: GST 등록된 Contractor는 지급 시 GST를 포함해야 합니다.

### 은행 계좌 매칭:
1. **정확한 정보 입력**: 계좌번호, BSB, 계좌명을 정확히 입력해야 자동 매칭이 정확합니다.
2. **수동 확인 권장**: 자동 매칭된 거래는 수동으로 확인하는 것을 권장합니다.
3. **Low Confidence 거래**: 신뢰도가 낮은 거래는 수동으로 확인 후 태그를 추가하세요.

---

## 📌 요약

| 항목 | Employee | Contractor |
|------|----------|------------|
| **ID 형식** | 자유 입력 | `CON-XXXXXX` (자동) |
| **TFN** | ✅ 사용 | ❌ 없음 |
| **ABN** | 선택 | ✅ 필수 |
| **PAYG** | ✅ 적용 | ❌ 없음 |
| **Superannuation** | ✅ 11% | ❌ 0% |
| **GST** | ❌ | ✅ 선택 |
| **Company Name** | ❌ | ✅ 필수 |
| **은행 계좌 매칭** | ✅ 지원 | ✅ 지원 |

---

**참고 파일:**
- `src/shared/types/employee.ts` - Employee 타입 정의
- `components/HR/EmployeeAddForm.tsx` - 직원 등록 폼
- `components/HR/EmployeeBasicInfo.tsx` - 직원 기본 정보 편집
- `src/features/payroll/calculator.ts` - 급여 계산 로직
- `lib/utils/payroll-transaction-matcher.ts` - 은행 거래 자동 매칭

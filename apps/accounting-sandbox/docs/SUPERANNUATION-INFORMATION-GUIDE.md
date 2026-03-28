# Superannuation Information (연금 정보) 가이드

## 📋 개요

**Superannuation Information** 섹션은 회사가 직원에게 지급하는 **Superannuation (연금)** 정보를 관리하는 필드입니다.

---

## 🔍 필드 설명

### 1. Superannuation Fund Name (연금 기금 이름)

**의미:**
- 직원이 선택한 Superannuation Fund (연금 기금) 이름
- 회사가 Superannuation 기여금을 지급하는 기금

**입력 예시:**
- `AustralianSuper` - 호주 최대 규모의 연금 기금
- `REST` - Retail Employees Superannuation Trust
- `Hostplus` - 호스피리티 업계 연금 기금
- `Cbus` - 건설업계 연금 기금
- `UniSuper` - 대학 직원 연금 기금
- `HESTA` - 헬스케어 업계 연금 기금

**용도:**
- 급여 처리 시 Superannuation 기여금 지급 대상 기금 확인
- Superannuation 지급 내역 기록
- 법적 요구사항 준수 (호주는 Superannuation 지급 의무)

---

### 2. Member Number (회원 번호)

**의미:**
- 직원의 Superannuation Fund 내 고유 회원 번호
- 기금에서 발급한 식별 번호

**입력 예시:**
- `12345678` - 숫자로 구성된 회원 번호
- `MBR-123456789` - 문자와 숫자 조합
- `ABC123456` - 알파벳과 숫자 조합

**용도:**
- Superannuation 기여금 지급 시 회원 식별
- 기금 문의 시 빠른 조회
- 기여금 내역 추적

---

## 📍 위치

### 1. 직원 등록 시
**경로:** HR & Payroll → Add Employee → Superannuation Information 섹션

### 2. 직원 정보 수정 시
**경로:** HR & Payroll → 직원 목록 → 직원 클릭 → [Superannuation] 탭

---

## 💡 사용 시나리오

### 시나리오 1: 직원 등록 시 Superannuation 정보 입력

1. **HR & Payroll** → **Add Employee**
2. 기본 정보 입력 (이름, ID 등)
3. **Superannuation Information** 섹션으로 스크롤
4. 입력:
   - **Superannuation Fund Name**: `AustralianSuper` (필수)
   - **Member Number**: `12345678` (필수)
5. **Save Employee**

---

### 시나리오 2: Superannuation 정보 수정

1. **HR & Payroll** → 직원 목록 → 직원 클릭
2. **[Superannuation]** 탭 클릭
3. Superannuation 정보 수정:
   - 기금 이름 변경
   - 회원 번호 업데이트
4. **Save Changes** 클릭

---

## ⚠️ 중요 사항

### 필수 입력 항목
- **Superannuation Fund Name**: 필수 (회사가 기여금을 지급할 기금)
- **Member Number**: 필수 (기여금 지급 시 회원 식별)

### 법적 요구사항 (호주)
- 호주 법률에 따라 회사는 직원 급여의 **최소 11%**를 Superannuation Fund에 지급해야 합니다
- 현재 시스템 기본값: **11%** (설정에서 변경 가능)
- Contractor는 Superannuation 지급 대상이 아닙니다

### 급여 계산 연동
- 급여 계산 시 자동으로 Superannuation 기여금 계산
- 계산 공식: `Gross Pay × Superannuation Rate (11%)`
- 예시: $1,000 × 11% = $110

---

## 🔄 급여 처리 프로세스

### 1. 급여 계산 시
```
Gross Pay: $1,000
- PAYG Withholding: $200
- Superannuation (11%): $110 ← 이 정보로 기금에 지급
= Net Pay: $690
```

### 2. Superannuation 지급
- 회사는 $110을 직원의 Superannuation Fund에 지급
- Fund Name과 Member Number를 사용하여 지급 처리

---

## 📝 예시

### 예시 1: AustralianSuper
```
Superannuation Fund Name: AustralianSuper
Member Number: 12345678
Contribution Rate: 11.0%
```

### 예시 2: REST
```
Superannuation Fund Name: REST
Member Number: MBR-987654321
Contribution Rate: 11.0%
```

---

## ❓ FAQ

### Q1: Superannuation 정보를 입력하지 않으면 어떻게 되나요?
**A:** 필수 입력 항목이므로 직원 등록 시 반드시 입력해야 합니다. 입력하지 않으면 저장할 수 없습니다.

### Q2: Contractor도 Superannuation 정보를 입력해야 하나요?
**A:** 아니요, Contractor는 Superannuation 지급 대상이 아니므로 입력할 필요가 없습니다. (Superannuation Rate가 0%)

### Q3: Superannuation Rate를 변경할 수 있나요?
**A:** 네, Employee Basic Info에서 Superannuation Rate를 변경할 수 있습니다. 기본값은 11%입니다.

### Q4: 여러 Superannuation Fund에 지급할 수 있나요?
**A:** 현재는 하나의 Fund만 등록 가능합니다. 여러 Fund에 지급이 필요한 경우 별도로 관리하세요.

---

## 📌 요약

| 항목 | 설명 | 필수 여부 |
|------|------|----------|
| **Superannuation Fund Name** | 연금 기금 이름 | ✅ 필수 |
| **Member Number** | 회원 번호 | ✅ 필수 |
| **Contribution Rate** | 기여율 (기본 11%) | 설정 가능 |
| **용도** | 회사 Superannuation 기여금 지급 | - |
| **법적 요구사항** | 호주 법률상 필수 | - |

---

**참고 파일:**
- `components/HR/EmployeeAddForm.tsx` - 직원 등록 폼
- `components/HR/EmployeeInsurance.tsx` - Superannuation 정보 관리 컴포넌트
- `src/shared/types/employee.ts` - Employee 타입 정의
- `src/features/payroll/calculator.ts` - 급여 계산 로직

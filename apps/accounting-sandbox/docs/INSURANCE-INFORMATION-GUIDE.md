# Insurance Information (보험 정보) 가이드

## 📋 개요

**Insurance Information** 섹션은 직원/컨트랙터의 보험 정보를 관리하는 필드입니다.

---

## 🔍 필드 설명

### 1. Insurance Provider (보험사)

**의미:**
- 직원이 가입한 보험 회사 이름
- 건강보험, 생명보험, 직장 보험 등 모든 보험 유형 포함

**입력 예시:**
- `Allianz` - 알리안츠 보험
- `Medibank` - 메디뱅크 (호주 건강보험)
- `Bupa` - 부파 (호주 건강보험)
- `SELPIC ACCOUNTING` - 회사 자체 보험 정책 (예시)
- `AIA` - AIA 생명보험
- `TAL` - TAL 생명보험

**용도:**
- 직원의 보험 정보 기록 및 관리
- 긴급 상황 시 보험사 연락
- HR 기록 보관

---

### 2. Policy Number (정책 번호)

**의미:**
- 보험 정책 번호 또는 멤버십 번호
- 보험사에서 발급한 고유 식별 번호

**입력 예시:**
- `POL-123456789` - 정책 번호
- `MBR-987654321` - 멤버십 번호
- `1234567890` - 숫자만으로 구성된 번호

**용도:**
- 보험 청구 시 정책 번호 확인
- 보험사 문의 시 빠른 조회
- 보험 정보 검증

---

## 📍 위치

### 1. 직원 등록 시
**경로:** HR & Payroll → Add Employee → Insurance Information 섹션

### 2. 직원 정보 수정 시
**경로:** HR & Payroll → 직원 목록 → 직원 클릭 → [Insurance] 탭

---

## 💡 사용 시나리오

### 시나리오 1: 직원 등록 시 보험 정보 입력

1. **HR & Payroll** → **Add Employee**
2. 기본 정보 입력 (이름, ID 등)
3. **Insurance Information** 섹션으로 스크롤
4. 입력:
   - **Insurance Provider**: `Medibank`
   - **Policy Number**: `MBR-123456789`
5. **Save Employee**

---

### 시나리오 2: 보험 정보 수정

1. **HR & Payroll** → 직원 목록 → 직원 클릭
2. **[Insurance]** 탭 클릭
3. 보험 정보 수정:
   - 보험사 변경
   - 정책 번호 업데이트
4. **Save Changes** 클릭

---

## ⚠️ 중요 사항

### 선택 사항 (Optional)
- **Insurance Provider**와 **Policy Number**는 **필수 입력 항목이 아닙니다**
- 보험 정보가 없는 직원은 비워둘 수 있습니다

### 데이터 보관
- 보험 정보는 IndexedDB에 저장됩니다
- 직원 정보와 함께 관리됩니다
- 개인정보이므로 보안에 주의하세요

### 현재 기능 제한
- ⚠️ 보험 정보는 **단순 기록용**입니다
- 급여 계산이나 자동 공제 기능과는 **연동되지 않습니다**
- 향후 확장 가능: 보험료 자동 공제, 보험 청구 관리 등

---

## 🔄 향후 확장 가능 기능

### 1. 보험료 자동 공제
- 급여에서 보험료 자동 공제
- 보험사별 공제율 설정

### 2. 보험 청구 관리
- 보험 청구 내역 기록
- 보험 청구 상태 추적

### 3. 보험 만료 알림
- 보험 정책 만료일 알림
- 갱신 필요 알림

---

## 📝 예시

### 예시 1: 건강보험
```
Insurance Provider: Medibank
Policy Number: MBR-123456789
```

### 예시 2: 생명보험
```
Insurance Provider: TAL Life Limited
Policy Number: TAL-987654321
```

### 예시 3: 회사 보험 정책
```
Insurance Provider: SELPIC ACCOUNTING
Policy Number: SEL-2025-001
```

---

## ❓ FAQ

### Q1: 보험 정보를 입력하지 않아도 되나요?
**A:** 네, 선택 사항입니다. 보험 정보가 없는 직원은 비워둘 수 있습니다.

### Q2: 여러 보험을 등록할 수 있나요?
**A:** 현재는 하나의 보험 정보만 등록 가능합니다. 여러 보험은 별도로 관리하거나 메모 필드에 기록하세요.

### Q3: 보험 정보가 급여 계산에 영향을 주나요?
**A:** 아니요, 현재는 급여 계산과 연동되지 않습니다. 단순 기록용입니다.

### Q4: 보험 정보를 삭제할 수 있나요?
**A:** 네, Insurance 탭에서 필드를 비우고 저장하면 삭제됩니다.

---

## 📌 요약

| 항목 | 설명 | 필수 여부 |
|------|------|----------|
| **Insurance Provider** | 보험사 이름 | 선택 |
| **Policy Number** | 보험 정책 번호 | 선택 |
| **용도** | 직원 보험 정보 기록 | - |
| **연동 기능** | 현재 없음 (향후 확장 가능) | - |

---

**참고 파일:**
- `components/HR/EmployeeAddForm.tsx` - 직원 등록 폼
- `components/HR/EmployeeInsurance.tsx` - 보험 정보 관리 컴포넌트
- `src/shared/types/employee.ts` - Employee 타입 정의

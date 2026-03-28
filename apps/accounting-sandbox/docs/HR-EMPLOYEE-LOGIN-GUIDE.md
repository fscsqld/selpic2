# HR & Payroll - 직원 로그인 및 비밀번호 관리 가이드

## 📋 직원 로그인 방법

### 1. 로그인 절차

1. **SELPIC A 접속**
   - 회계 프로그램 메인 페이지 접속
   - 상단 탭에서 **"HR & Payroll"** 클릭

2. **로그인 버튼 클릭**
   - 직원 목록 화면 상단의 **"Employee Login"** 버튼 클릭
   - 또는 직원 목록 아래에 표시되는 로그인 폼 사용

3. **로그인 정보 입력**
   - **Employee ID**: 관리자가 등록한 직원 ID 입력
   - **Password**: 관리자가 설정한 비밀번호 입력

4. **로그인 완료**
   - 로그인 성공 시 자동으로 **"My Payroll"** 페이지로 이동
   - 본인의 타임시트 입력 및 급여 정보 확인 가능

---

## 🔐 비밀번호 관리

### 현재 비밀번호 관리 방법

#### ✅ **1. 직원 등록 시 비밀번호 설정 (관리자)**

**위치:** HR & Payroll → Add Employee → Login Credentials 섹션

**방법:**
1. 직원 등록 시 "Login Credentials" 섹션에서 비밀번호 입력
2. 비밀번호는 해시되어 저장됨 (평문 저장 안 함)
3. 직원에게 Employee ID와 초기 비밀번호 전달

**주의사항:**
- 비밀번호를 비워두면 로그인 불가
- 초기 비밀번호는 직원에게 안전하게 전달 필요

---

#### ✅ **2. 관리자가 직원 비밀번호 변경 (새로 추가됨)**

**위치:** HR & Payroll → 직원 목록 → 직원 클릭 → [기본 정보] 탭 → 하단 "Change Password" 섹션

**방법:**
1. 직원 목록에서 해당 직원 클릭
2. [기본 정보] 탭으로 이동
3. 하단 "Change Password" 섹션에서:
   - New Password 입력
   - Confirm New Password 입력
   - "Change Password" 버튼 클릭

**특징:**
- 관리자는 현재 비밀번호 확인 없이 변경 가능
- 최소 6자 이상 필요
- 변경 즉시 적용

---

#### ✅ **3. 직원이 본인 비밀번호 변경 (새로 추가됨)**

**위치:** HR & Payroll → Employee Login → My Payroll 페이지 → "Change My Password" 섹션

**방법:**
1. 직원으로 로그인
2. "My Payroll" 페이지에서 "Change My Password" 섹션으로 스크롤
3. 다음 정보 입력:
   - Current Password (현재 비밀번호)
   - New Password (새 비밀번호)
   - Confirm New Password (새 비밀번호 확인)
4. "Change Password" 버튼 클릭

**특징:**
- 현재 비밀번호 확인 필요 (보안)
- 최소 6자 이상 필요
- 변경 즉시 적용

---

## 📝 Employee ID 및 비밀번호 확인 방법

### 관리자가 확인하는 방법

1. **직원 목록에서 확인**
   - HR & Payroll → 직원 목록
   - 각 직원 카드에 Employee ID 표시
   - 비밀번호는 보안상 표시되지 않음 (해시 저장)

2. **직원 상세 페이지에서 확인**
   - 직원 클릭 → [기본 정보] 탭
   - Employee ID 확인 가능
   - 비밀번호는 표시되지 않지만 변경 가능

3. **직원 등록 정보 확인**
   - 직원 등록 시 입력한 정보는 IndexedDB에 저장
   - 비밀번호는 해시되어 저장되므로 원본 확인 불가

---

## 🔄 비밀번호 초기화 방법

### 현재 시스템 제한

- 비밀번호를 잊어버린 경우, 관리자가 새 비밀번호로 변경해야 함
- "비밀번호 찾기" 기능은 현재 없음

### 비밀번호 초기화 절차

1. **관리자 로그인**
   - HR & Payroll 탭 접속

2. **직원 선택**
   - 직원 목록에서 해당 직원 클릭

3. **비밀번호 변경**
   - [기본 정보] 탭 → "Change Password" 섹션
   - 새 비밀번호 입력 및 확인
   - "Change Password" 클릭

4. **직원에게 전달**
   - 새 비밀번호를 안전하게 전달
   - 최초 로그인 후 비밀번호 변경 권장

---

## ⚠️ 보안 고려사항

### 현재 구현
- ✅ 비밀번호 해시 저장 (평문 저장 안 함)
- ✅ 최소 6자 이상 요구
- ✅ 직원 본인 비밀번호 변경 시 현재 비밀번호 확인
- ⚠️ 간단한 해시 함수 사용 (프로덕션에서는 bcrypt 권장)

### 권장사항
1. **초기 비밀번호 정책**
   - 복잡한 초기 비밀번호 설정
   - 최초 로그인 후 즉시 변경 권장

2. **비밀번호 정책 강화 (향후 개선)**
   - 최소 8자 이상
   - 대소문자, 숫자, 특수문자 조합
   - 정기적 비밀번호 변경 요구

3. **비밀번호 찾기 기능 (향후 개선)**
   - 이메일 인증을 통한 비밀번호 재설정
   - 보안 질문 기반 재설정

---

## 📌 요약

| 기능 | 위치 | 사용자 |
|------|------|--------|
| **직원 로그인** | HR & Payroll → Employee Login | 직원 |
| **비밀번호 설정 (등록 시)** | Add Employee → Login Credentials | 관리자 |
| **비밀번호 변경 (관리자)** | 직원 상세 → [기본 정보] → Change Password | 관리자 |
| **비밀번호 변경 (직원)** | My Payroll → Change My Password | 직원 |
| **Employee ID 확인** | 직원 목록 또는 직원 상세 | 관리자 |

---

## 🎯 사용 시나리오

### 시나리오 1: 새 직원 등록 및 로그인 설정

1. 관리자가 직원 등록
   - HR & Payroll → Add Employee
   - 모든 정보 입력 (Employee ID: `EMP001`)
   - Login Credentials에서 비밀번호 설정 (예: `Temp123!`)
   - Save Employee

2. 직원에게 정보 전달
   - Employee ID: `EMP001`
   - 초기 비밀번호: `Temp123!`

3. 직원 로그인
   - HR & Payroll → Employee Login
   - Employee ID와 비밀번호 입력
   - 로그인 성공 → My Payroll 페이지

4. 직원 비밀번호 변경 (권장)
   - My Payroll → Change My Password
   - 현재 비밀번호: `Temp123!`
   - 새 비밀번호 입력 및 확인
   - Change Password 클릭

---

### 시나리오 2: 비밀번호 분실 시 초기화

1. 직원이 비밀번호를 잊어버림
2. 관리자에게 요청
3. 관리자가 비밀번호 변경
   - HR & Payroll → 직원 선택 → [기본 정보] → Change Password
   - 새 비밀번호 설정
4. 새 비밀번호를 직원에게 전달
5. 직원이 새 비밀번호로 로그인

---

**참고 파일:**
- `components/Payroll/EmployeeLogin.tsx` - 로그인 컴포넌트
- `components/HR/EmployeePasswordManagement.tsx` - 비밀번호 관리 컴포넌트
- `components/HR/EmployeeBasicInfo.tsx` - 직원 기본 정보 (관리자용 비밀번호 변경)
- `components/HR/MyPayrollPage.tsx` - 직원용 페이지 (직원 본인 비밀번호 변경)
- `lib/auth/employee-auth.ts` - 인증 로직

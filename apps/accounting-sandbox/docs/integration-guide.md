# 회계 프로그램 통합 가이드

## ✅ 완료된 작업

### Phase 1: 인프라 구축 (완료)

1. ✅ 권한 시스템 (`src/shared/auth/`)
   - `permissions.ts`: 역할별 권한 정의
   - `role-checker.ts`: API 요청에서 역할 검증

2. ✅ 로깅 시스템 (`src/shared/logging/`)
   - `audit-logger.ts`: 모든 주요 작업 로깅

3. ✅ 미들웨어 (`middleware/accounting-auth.ts`)
   - Super Admin 전용 API 보호
   - Admin 전용 API 보호
   - 권한 기반 접근 제어

4. ✅ 주문 승인 통합 (`src/features/transactions/order-approval-integration.ts`)
   - 비동기 회계 장부 기록
   - 중복 방지 (Unique Key Guard)

5. ✅ API 엔드포인트
   - `/api/orders/approve`: 주문 승인 API (홈페이지 연동)
   - `/api/payroll/approve`: 급여 승인 API (Super Admin 전용)

---

## 🔗 홈페이지 연동 방법

### 1. 주문 승인 시 회계 장부 기록

#### 기존 홈페이지 주문 승인 코드 수정

```typescript
// app/admin/orders/[orderId]/page.tsx 또는 해당 API

import { recordOrderToAccountingAsync } from '@/apps/accounting-sandbox/src/features/transactions/order-approval-integration'

// 기존 주문 승인 로직
const handleApproveOrder = async (orderId: string) => {
  // 1. 기존 주문 승인 로직 실행 (동기)
  const orderApprovalResult = await approveOrder(orderId)
  
  // 2. 즉시 응답 반환 (기존 구조 유지)
  // ... 기존 응답 코드 ...
  
  // 3. 회계 장부 기록 (비동기, await 하지 않음)
  // ⚠️ 중요: await 하지 않음! 홈페이지 응답에 영향 없음
  const { adminUser } = useAdminAuth()
  recordOrderToAccountingAsync(
    orderApprovalResult.order,
    adminUser?.username,
    adminUser?.role
  )
  
  return orderApprovalResult
}
```

#### API 요청 헤더에 역할 정보 추가

```typescript
// 홈페이지에서 회계 프로그램 API 호출 시

const response = await fetch('/api/orders/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-role': adminUser?.role || 'admin', // 역할 정보
    'x-user-id': adminUser?.username || 'unknown', // 사용자 ID
  },
  body: JSON.stringify({ order }),
})
```

---

### 2. 급여 승인 API 사용 (Super Admin 전용)

```typescript
// Super Admin만 접근 가능

const response = await fetch('/api/payroll/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-role': 'super_admin', // Super Admin 필수
    'x-user-id': adminUser?.username || 'unknown',
  },
  body: JSON.stringify({
    payslip: payslipData,
    employee: employeeData,
  }),
})

const result = await response.json()
if (result.success) {
  console.log('Payroll approved and journal entries created')
  console.log('Transactions:', result.transactions)
}
```

---

## 🛡️ 안전성 보장

### 1. 기존 홈페이지 API 응답 구조 유지

- ✅ 기존 응답 구조 절대 변경 없음
- ✅ 회계 장부 기록은 비동기로 처리 (await 하지 않음)
- ✅ 회계 장부 기록 실패가 홈페이지 응답에 영향 없음

### 2. 에러 핸들링

```typescript
// 모든 에러는 로깅만 하고 홈페이지에 영향 없음
recordOrderToAccountingAsync(order, userId, userRole)
// 에러 발생 시 auditLogger에 기록되지만 홈페이지 응답에는 영향 없음
```

### 3. 중복 방지

- ✅ 주문 ID 기반 중복 확인
- ✅ 거래 날짜/금액/내용 기반 중복 확인
- ✅ 중복 발견 시 자동 스킵 (로그 기록)

---

## 📊 로그 확인

### Audit Log 확인

```typescript
import { auditLogger } from '@/src/shared/logging/audit-logger'

// 최근 로그 확인
const recentLogs = auditLogger.getRecentLogs(50)

// 에러 로그만 확인
const errorLogs = auditLogger.getErrorLogs()

// 특정 리소스의 로그 확인
const orderLogs = auditLogger.getLogs('order', orderId)
```

### 브라우저 Console

개발 환경에서는 모든 로그가 콘솔에 출력됩니다:
- ✅ 성공: `✅ [Audit] order_accounting_success`
- ❌ 실패: `❌ [Audit] order_accounting_error`

---

## 🔐 권한 시스템

### 역할별 권한

| 역할 | 주문 승인 | 급여 승인 | 거래 조회 | 리포트 |
|------|----------|----------|----------|--------|
| Super Admin | ✅ | ✅ | 전체 | 전체 |
| Admin | ✅ | ❌ | 제한적 | 제한적 |
| Staff | ❌ | ❌ | 본인만 | ❌ |

### 권한 확인

```typescript
import { hasPermission } from '@/src/shared/auth/permissions'

const canApprovePayroll = hasPermission(userRole, 'payroll:approve')
const canViewAllTransactions = hasPermission(userRole, 'transactions:view_all')
```

---

## 🚀 다음 단계

### Phase 2: 홈페이지 통합 (수동 작업 필요)

1. **주문 승인 코드 수정**
   - `app/admin/orders/[orderId]/page.tsx` 또는 해당 API에 통합 함수 추가
   - 역할 정보를 헤더에 포함

2. **테스트**
   - 주문 승인 시 회계 장부 기록 확인
   - 중복 방지 확인
   - 권한 검증 확인

### Phase 3: UI 통합 (선택사항)

1. 회계 프로그램 대시보드에 주문 승인 내역 표시
2. 급여 승인 UI 추가 (Super Admin 전용)

---

## ⚠️ 주의사항

1. **기존 코드 보존**: 기존 홈페이지 API 응답 구조 절대 변경 금지
2. **비동기 처리**: 회계 장부 기록은 항상 비동기로 처리 (await 하지 않음)
3. **에러 격리**: 회계 장부 기록 실패가 홈페이지에 영향 주지 않음
4. **권한 검증**: 모든 API에 역할 검증 적용

---

## 📞 문제 해결

### 회계 장부 기록이 안 될 때

1. Audit Log 확인: `auditLogger.getErrorLogs()`
2. 브라우저 Console 확인
3. 중복 확인: 동일한 주문 ID가 이미 기록되었는지 확인

### 권한 오류 발생 시

1. 헤더에 `x-user-role` 포함 확인
2. 역할이 올바른지 확인 (Super Admin / Admin)
3. 미들웨어 로그 확인

---

## ✅ 체크리스트

- [x] 인프라 구축 완료
- [x] 권한 시스템 구현
- [x] 로깅 시스템 구현
- [x] 미들웨어 구현
- [x] 주문 승인 통합 함수 생성
- [x] 급여 승인 API 생성
- [ ] 홈페이지 주문 승인 코드 수정 (수동 작업 필요)
- [ ] 테스트 및 검증

# 회계 프로그램 통합 계획서

## 🎯 목표
기존 홈페이지 기능에 오류가 발생하지 않도록 안정성을 최우선으로 하면서, 회계 프로그램의 새 기능을 안전하게 통합합니다.

---

## 📋 1. 파일 구조 및 모듈 분리 (완료 ✅)

### 현재 구조
```
apps/accounting-sandbox/
├── src/
│   ├── features/
│   │   ├── payroll/          ✅ 완료
│   │   ├── compliance/      ✅ 완료
│   │   └── transactions/    ✅ 완료
│   └── shared/
│       ├── types/           ✅ 완료
│       ├── constants/       ✅ 완료
│       └── utils/           ✅ 완료
```

### 추가 필요 구조
```
apps/accounting-sandbox/
├── src/
│   ├── features/
│   │   └── transactions/
│   │       └── order-approval-integration.ts  ⚠️ 새로 생성
│   │
│   └── shared/
│       ├── auth/
│       │   ├── role-checker.ts               ⚠️ 새로 생성
│       │   └── permissions.ts                ⚠️ 새로 생성
│       │
│       └── logging/
│           └── audit-logger.ts               ⚠️ 새로 생성
│
├── app/
│   └── api/
│       ├── orders/
│       │   └── approve/route.ts              ⚠️ 새로 생성 (홈페이지 연동)
│       │
│       └── payroll/
│           └── approve/route.ts               ⚠️ 새로 생성
│
└── middleware/
    └── accounting-auth.ts                    ⚠️ 새로 생성
```

---

## 🔐 2. 권한 및 보안 시스템

### 2.1 역할 정의
```typescript
// src/shared/auth/permissions.ts
export type UserRole = 'super_admin' | 'admin' | 'staff'

export const ROLE_PERMISSIONS = {
  super_admin: [
    'accounting:read',
    'accounting:write',
    'payroll:approve',
    'orders:approve',
    'transactions:view_all',
    'reports:view_all',
  ],
  admin: [
    'accounting:read',
    'accounting:write',
    'orders:approve',
    'transactions:view_limited',
    'reports:view_limited',
  ],
  staff: [
    'timesheet:view_own',
    'payslip:view_own',
  ],
}
```

### 2.2 홈페이지 인증 연동
- `lib/adminAuth.ts`의 `useAdminAuth` 훅을 회계 프로그램에서 재사용
- 역할 정보를 API 요청 헤더에 포함
- 미들웨어에서 역할 검증

---

## 🔄 3. API 통합 계획

### 3.1 주문 승인 API 통합 (기존 홈페이지 API 수정)

#### 현재 홈페이지 주문 승인 위치
- `app/admin/orders/[orderId]/page.tsx`에서 주문 승인 처리
- 기존 API 응답 구조 유지 필수

#### 통합 전략: **비동기 후처리 패턴**

```typescript
// 기존 홈페이지 API 응답 구조 유지
// 회계 장부 기록은 비동기로 처리 (await 하지 않음)

// 1. 기존 주문 승인 로직 실행 (동기)
const orderApprovalResult = await approveOrder(orderId)

// 2. 즉시 응답 반환 (기존 구조 유지)
return NextResponse.json({
  success: true,
  order: orderApprovalResult,
  // 기존 응답 구조 그대로
})

// 3. 회계 장부 기록은 비동기로 처리 (에러가 나도 홈페이지에 영향 없음)
recordToAccounting(orderApprovalResult).catch(err => {
  // 에러 로깅만 하고 홈페이지 응답에는 영향 없음
  console.error('[Accounting] Failed to record order:', err)
  auditLogger.log('accounting_error', { orderId, error: err })
})
```

#### 파일 수정 계획
1. **기존 파일 보존**: `app/admin/orders/[orderId]/page.tsx` 백업
2. **새 통합 함수**: `src/features/transactions/order-approval-integration.ts` 생성
3. **비동기 호출**: 기존 승인 로직 뒤에 추가 (await 없이)

---

### 3.2 급여 승인 API 생성 (새 API)

#### 엔드포인트
- `POST /api/payroll/approve`
- Super Admin만 접근 가능

#### 보안 미들웨어
```typescript
// middleware/accounting-auth.ts
export async function requireSuperAdmin(request: NextRequest) {
  const role = request.headers.get('x-user-role')
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

#### 자동 분개 로직
- `src/features/payroll/bookkeeping.ts`의 `approvePayrollAndCreateTransactions` 사용
- Unique Key Guard 적용

---

## 🛡️ 4. 중복 방지 (Unique Key Guard)

### 4.1 주문 중복 방지
```typescript
// src/features/transactions/order-approval-integration.ts
import { checkDuplicateOrder } from '@/src/features/transactions'

async function recordOrderToAccounting(order) {
  // 1. 중복 확인
  const duplicateCheck = await checkDuplicateOrder(order.orderId, existingOrders)
  if (duplicateCheck.isDuplicate) {
    auditLogger.log('duplicate_order_skipped', { orderId: order.orderId })
    return { skipped: true, reason: 'duplicate' }
  }
  
  // 2. 거래 생성 및 저장
  // ...
}
```

### 4.2 급여 중복 방지
- Payslip ID 기반 중복 확인
- 동일한 payPeriod + employeeId 조합 체크

---

## 🔒 5. 트랜잭션 처리 및 에러 핸들링

### 5.1 트랜잭션 패턴
```typescript
// 회계 장부 기록 실패 시 홈페이지에 영향 없음
try {
  await recordToAccounting(order)
} catch (error) {
  // 에러 로깅만 하고 홈페이지 응답에는 영향 없음
  auditLogger.log('accounting_error', { orderId, error })
  // 홈페이지 응답은 정상 반환
}
```

### 5.2 로깅 시스템
```typescript
// src/shared/logging/audit-logger.ts
export class AuditLogger {
  log(action: string, data: any) {
    // IndexedDB에 로그 저장
    // 에러 발생 시 추적 가능
  }
}
```

---

## 📝 6. 구현 단계별 계획

### Phase 1: 인프라 구축 (안전)
1. ✅ 권한 시스템 모듈 생성 (`src/shared/auth/`)
2. ✅ 로깅 시스템 생성 (`src/shared/logging/`)
3. ✅ 미들웨어 생성 (`middleware/accounting-auth.ts`)

### Phase 2: 주문 승인 통합 (기존 API 수정)
1. ✅ 기존 주문 승인 API 백업
2. ✅ 통합 함수 생성 (`order-approval-integration.ts`)
3. ✅ 비동기 후처리 로직 추가 (기존 응답 구조 유지)
4. ✅ 테스트: 홈페이지 주문 승인 정상 작동 확인

### Phase 3: 급여 승인 API (새 API)
1. ✅ 급여 승인 API 생성 (`/api/payroll/approve`)
2. ✅ Super Admin 미들웨어 적용
3. ✅ 자동 분개 로직 통합
4. ✅ Unique Key Guard 적용

### Phase 4: 테스트 및 검증
1. ✅ 홈페이지 주문 승인 정상 작동 확인
2. ✅ 회계 장부 기록 확인
3. ✅ 중복 방지 확인
4. ✅ 권한 검증 확인

---

## ⚠️ 7. 안전성 보장 체크리스트

### 기존 홈페이지 보호
- [ ] 기존 API 응답 구조 변경 없음
- [ ] 회계 장부 기록 실패 시 홈페이지 정상 작동
- [ ] 비동기 처리로 홈페이지 속도 영향 없음
- [ ] 트랜잭션 실패 시 롤백 처리

### 에러 핸들링
- [ ] 모든 주요 단계에 try-catch 적용
- [ ] 에러 로깅 시스템 구축
- [ ] 에러 발생 시 알림 시스템

### 권한 검증
- [ ] 모든 API에 역할 검증 적용
- [ ] Super Admin 전용 API 보호
- [ ] Admin/Staff 권한 격리

---

## 🚀 8. 다음 단계

1. **인프라 구축**: 권한 시스템, 로깅 시스템, 미들웨어 생성
2. **주문 승인 통합**: 기존 API에 비동기 후처리 추가
3. **급여 승인 API**: 새 API 생성 및 보안 적용
4. **테스트**: 전체 시스템 검증

---

## 📌 중요 원칙

1. **기존 코드 보존**: 기존 홈페이지 API 응답 구조 절대 변경 금지
2. **비동기 처리**: 회계 장부 기록은 비동기로 처리 (홈페이지 속도 영향 없음)
3. **에러 격리**: 회계 장부 기록 실패가 홈페이지에 영향 주지 않음
4. **점진적 통합**: 단계별로 테스트하며 진행

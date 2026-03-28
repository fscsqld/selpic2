# 홈페이지 통합 가이드 - 가장 안전한 순서

## ✅ 테스트 결과: 모두 통과

모든 시뮬레이션 테스트가 통과했으므로, 이제 홈페이지 코드에 안전하게 통합할 수 있습니다.

---

## 📋 통합 전 체크리스트

- [x] 회계 프로그램 서버 실행 중 (`http://localhost:3001`)
- [x] 홈페이지 서버 실행 중 (`http://localhost:3000`)
- [x] 백업 완료 (기존 코드 백업)

---

## 🔄 Step 1: 백업 (가장 중요!)

### 1.1 기존 파일 백업

```bash
# 홈페이지 주문 승인 관련 파일 백업
cp app/admin/orders/[orderId]/page.tsx app/admin/orders/[orderId]/page.tsx.backup
```

또는 Git 사용 시:
```bash
git add .
git commit -m "Backup before accounting integration"
```

---

## 🔗 Step 2: 통합 함수 Import 추가

### 2.1 주문 상세 페이지에 Import 추가

**파일**: `app/admin/orders/[orderId]/page.tsx`

```typescript
// 기존 imports
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminRoute from '@/components/AdminRoute'
// ... 기존 imports ...

// ✅ 새로 추가: 회계 장부 기록 함수
import { recordOrderToAccountingAsync } from '@/apps/accounting-sandbox/src/features/transactions/order-approval-integration'
```

---

## 🎯 Step 3: 주문 승인 함수 수정 (한 줄 추가)

### 3.1 기존 주문 승인 함수 찾기

**파일**: `app/admin/orders/[orderId]/page.tsx`

기존 코드를 찾습니다:
```typescript
const handleApproveOrder = async (orderId: string) => {
  // 기존 주문 승인 로직
  const order = orders.find(o => o.id === orderId)
  if (!order) return

  // 주문 상태 업데이트
  updateOrderStatus(orderId, 'approved')
  
  // ✅ 여기에 한 줄만 추가하면 됩니다!
}
```

### 3.2 한 줄 추가 (가장 안전한 위치)

```typescript
const handleApproveOrder = async (orderId: string) => {
  // 기존 주문 승인 로직
  const order = orders.find(o => o.id === orderId)
  if (!order) return

  // 주문 상태 업데이트
  updateOrderStatus(orderId, 'approved')
  
  // ✅ 새로 추가: 회계 장부 자동 기록 (비동기, await 하지 않음)
  recordOrderToAccountingAsync(
    {
      id: order.id,
      orderId: order.id,
      transactionDate: order.createdAt || new Date().toISOString(),
      amount: order.total - (order.gst || 0),
      gst: order.gst || 0,
      status: 'approved',
      paymentMethod: order.paymentMethod || 'card',
      metadata: {
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        items: order.items || [],
      },
      createdAt: order.createdAt,
      updatedAt: new Date().toISOString(),
    },
    adminUser?.username,
    adminUser?.role
  )
  
  // 기존 성공 메시지 등...
  alert('Order approved successfully!')
}
```

### 3.3 Order 타입 변환 헬퍼 함수 (선택사항)

더 깔끔하게 하려면 헬퍼 함수를 만들 수 있습니다:

```typescript
// 파일 상단에 추가
function convertHomepageOrderToAccountingOrder(order: any): Order {
  return {
    id: order.id,
    orderId: order.id,
    transactionDate: order.createdAt || new Date().toISOString(),
    amount: order.total - (order.gst || 0),
    gst: order.gst || 0,
    status: 'approved',
    paymentMethod: order.paymentMethod || 'card',
    metadata: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      items: order.items || [],
    },
    createdAt: order.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

// 사용
const handleApproveOrder = async (orderId: string) => {
  const order = orders.find(o => o.id === orderId)
  if (!order) return

  updateOrderStatus(orderId, 'approved')
  
  // ✅ 한 줄로 간단하게
  recordOrderToAccountingAsync(
    convertHomepageOrderToAccountingOrder(order),
    adminUser?.username,
    adminUser?.role
  )
  
  alert('Order approved successfully!')
}
```

---

## 🧪 Step 4: 테스트

### 4.1 로컬 테스트

1. **홈페이지 서버 실행**
   ```bash
   npm run dev
   ```

2. **회계 프로그램 서버 실행**
   ```bash
   cd apps/accounting-sandbox
   npm run dev
   ```

3. **테스트 시나리오**
   - Admin 계정으로 로그인
   - 주문 상세 페이지로 이동
   - 주문 승인 버튼 클릭
   - 브라우저 콘솔 확인 (에러 없어야 함)
   - 회계 프로그램의 "Incoming Orders" 섹션 확인

### 4.2 확인 사항

- [ ] 주문 승인이 정상적으로 작동하는가?
- [ ] 브라우저 콘솔에 에러가 없는가?
- [ ] 회계 프로그램에 주문이 기록되는가?
- [ ] 중복 주문 승인 시 스킵되는가?

---

## 🔍 Step 5: 로그 확인

### 5.1 브라우저 콘솔 확인

개발 환경에서는 모든 로그가 콘솔에 출력됩니다:

```
✅ [Audit] order_accounting_start
✅ [Audit] order_accounting_success
```

또는 중복인 경우:
```
✅ [Audit] duplicate_order_skipped
```

### 5.2 회계 프로그램에서 확인

1. 회계 프로그램 대시보드 접속
2. "Incoming Orders" 섹션 확인
3. 승인된 주문이 표시되는지 확인

---

## ⚠️ 문제 해결

### 문제 1: Import 경로 오류

**에러**: `Cannot find module '@/apps/accounting-sandbox/...'`

**해결**:
```typescript
// 상대 경로 사용
import { recordOrderToAccountingAsync } from '../../apps/accounting-sandbox/src/features/transactions/order-approval-integration'
```

또는 `tsconfig.json`에 경로 추가:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/apps/accounting-sandbox/*": ["./apps/accounting-sandbox/*"]
    }
  }
}
```

### 문제 2: Order 타입 불일치

**에러**: `Type 'HomepageOrder' is not assignable to type 'Order'`

**해결**: 헬퍼 함수 사용 (Step 3.3 참고)

### 문제 3: 회계 장부 기록이 안 됨

**확인 사항**:
1. 회계 프로그램 서버가 실행 중인가?
2. 브라우저 콘솔에 에러가 있는가?
3. Audit Log 확인: `auditLogger.getErrorLogs()`

---

## ✅ 최종 체크리스트

- [ ] 기존 코드 백업 완료
- [ ] Import 추가 완료
- [ ] 주문 승인 함수에 한 줄 추가 완료
- [ ] 로컬 테스트 통과
- [ ] 브라우저 콘솔 에러 없음
- [ ] 회계 프로그램에 주문 기록 확인
- [ ] 중복 방지 작동 확인

---

## 🎉 완료!

모든 단계를 완료하면, 홈페이지에서 주문을 승인할 때마다 자동으로 회계 장부에 기록됩니다.

**핵심 포인트**:
- ✅ 기존 홈페이지 기능에 영향 없음
- ✅ 비동기 처리로 속도 영향 없음
- ✅ 에러 발생 시에도 홈페이지 정상 작동
- ✅ 중복 방지 자동 적용

---

## 📞 추가 도움이 필요하면

1. 브라우저 콘솔 로그 확인
2. Audit Log 확인: `auditLogger.getRecentLogs()`
3. 회계 프로그램 서버 로그 확인

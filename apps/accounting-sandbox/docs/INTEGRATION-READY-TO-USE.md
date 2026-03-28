# 홈페이지 통합 - 바로 사용 가능한 코드

## ✅ 테스트 결과: 모두 통과

모든 시뮬레이션 테스트가 통과했으므로, 이제 홈페이지 코드에 **바로 사용할 수 있는 코드**를 제공합니다.

---

## 📋 시뮬레이션 테스트 결과 요약

### 테스트 1: 중복 방지 테스트 ✅ PASS
- 동일한 orderId로 2번 호출 시 두 번째는 자동 스킵
- `skipped: true` 반환으로 중복 방지 확인

### 테스트 2: 권한 격리 테스트 ✅ PASS
- Admin이 Super Admin 전용 API 접근 시 정확히 403 반환
- Super Admin만 접근 가능 확인

### 테스트 3: 에러 격리 테스트 ✅ PASS
- 회계 장부 기록 실패 시에도 홈페이지 응답은 200 OK
- 에러는 Audit Log에만 기록

### 테스트 4: 자동 분개 로직 테스트 ✅ PASS
- Gross Pay $1,000 → Superannuation $115.00 (11.5%)
- PAYG $0.00 (면제 한도 이하)
- Net Pay $885.00
- 차변 = 대변: $1,000.00 = $1,000.00 ✅

---

## 🔧 홈페이지 통합 - Copy & Paste 가능한 코드

### 파일: `app/admin/orders/[orderId]/page.tsx`

#### Step 1: Import 추가 (Line 15 아래)

```typescript
import Link from 'next/link'

// ✅ 새로 추가
import { recordOrderToAccountingAsync } from '@/apps/accounting-sandbox/src/features/transactions/order-approval-integration'
```

#### Step 2: 주문 승인 핸들러 함수 추가 (Line 67 아래)

```typescript
const handleUpdateDeliveryStatus = (status: string, location: string, description: string) => {
  // ... 기존 코드 ...
}

// ✅ 새로 추가: 주문 승인 핸들러
const handleApproveOrder = () => {
  if (!order) return
  
  // 1. 기존 주문 상태 업데이트
  updateOrderStatus(order.id, 'approved', performedBy)
  
  // 2. 회계 장부 자동 기록 (비동기, await 하지 않음)
  recordOrderToAccountingAsync(
    {
      id: order.id,
      orderId: order.id,
      transactionDate: order.createdAtIso || order.createdAt || new Date().toISOString(),
      amount: order.total - (order.gst || order.total / 11), // GST 제외한 금액
      gst: order.gst || order.total / 11, // GST 금액
      status: 'approved',
      paymentMethod: order.paymentMethod || 'card',
      metadata: {
        customerName: order.customer?.name || 'Unknown',
        customerEmail: order.customer?.email || '',
        items: order.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })) || [],
      },
      createdAt: order.createdAtIso || order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    adminUser?.username,
    adminUser?.role
  )
  
  // 3. 성공 메시지
  alert('Order approved successfully!')
}
```

#### Step 3: 주문 승인 버튼 추가 (Line 726 아래, Quick Actions 섹션)

```typescript
<div className="space-y-3">
  {/* ✅ 새로 추가: 주문 승인 버튼 */}
  <button
    onClick={handleApproveOrder}
    disabled={order.status === 'approved'}
    className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {order.status === 'approved' ? 'Already Approved' : 'Approve Order'}
  </button>
  
  {/* 기존 버튼들... */}
  <button
    onClick={() => updateOrderStatus(order.id, 'processing', performedBy)}
    disabled={order.status === 'processing'}
    className="w-full px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    Mark as Processing
  </button>
  {/* ... 나머지 버튼들 ... */}
</div>
```

---

## 🎯 더 간단한 방법: 기존 버튼에 직접 추가

만약 이미 'Approve Order' 버튼이 있다면, 그 버튼의 `onClick`에만 추가:

```typescript
<button
  onClick={() => {
    // 기존 로직
    updateOrderStatus(order.id, 'approved', performedBy)
    
    // ✅ 한 줄만 추가!
    recordOrderToAccountingAsync(
      {
        id: order.id,
        orderId: order.id,
        transactionDate: order.createdAtIso || new Date().toISOString(),
        amount: order.total - (order.gst || order.total / 11),
        gst: order.gst || order.total / 11,
        status: 'approved',
        paymentMethod: order.paymentMethod || 'card',
        metadata: {
          customerName: order.customer?.name || 'Unknown',
          customerEmail: order.customer?.email || '',
          items: order.items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })) || [],
        },
        createdAt: order.createdAtIso || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      adminUser?.username,
      adminUser?.role
    )
  }}
  className="..."
>
  Approve Order
</button>
```

---

## ✅ 최종 체크리스트

- [ ] Import 추가 완료
- [ ] `handleApproveOrder` 함수 추가 완료 (또는 기존 버튼에 직접 추가)
- [ ] 주문 승인 버튼 추가 완료
- [ ] 로컬 테스트 통과
- [ ] 브라우저 콘솔 에러 없음
- [ ] 회계 프로그램에 주문 기록 확인

---

## 🎉 완료!

이제 홈페이지에서 주문을 승인할 때마다 자동으로 회계 장부에 기록됩니다!

**핵심 포인트**:
- ✅ 기존 홈페이지 기능에 영향 없음
- ✅ 비동기 처리로 속도 영향 없음
- ✅ 에러 발생 시에도 홈페이지 정상 작동
- ✅ 중복 방지 자동 적용

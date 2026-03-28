# 홈페이지 통합 정확한 가이드 - 실제 코드 기준

## ✅ 테스트 결과: 모두 통과

모든 시뮬레이션 테스트가 통과했으므로, 이제 홈페이지 코드에 **정확하게** 통합할 수 있습니다.

---

## 📋 실제 홈페이지 코드 분석

### 현재 주문 승인 구조

**파일**: `app/admin/orders/[orderId]/page.tsx`

```typescript
// Line 22: Store에서 updateOrderStatus 가져오기
const { orders, updateOrderStatus, addTrackingNumber, updateDeliveryStatus } = useStore()

// Line 29: 현재 주문 찾기
const order = orders.find(o => o.id === orderId)

// Line 728, 735: 주문 상태 변경 예시
onClick={() => updateOrderStatus(order.id, 'processing', performedBy)}
onClick={() => updateOrderStatus(order.id, 'shipped', performedBy)}
```

### 주문 승인 버튼 찾기

주문을 'approved' 상태로 변경하는 버튼을 찾아야 합니다. 보통 다음과 같은 패턴입니다:

```typescript
<button
  onClick={() => updateOrderStatus(order.id, 'approved', performedBy)}
  disabled={order.status === 'approved'}
  className="..."
>
  Approve Order
</button>
```

---

## 🔧 정확한 통합 방법

### Step 1: Import 추가

**파일**: `app/admin/orders/[orderId]/page.tsx`

**위치**: Line 14 아래 (다른 imports와 함께)

```typescript
import { ArrowLeft, Package, User, MapPin, CreditCard, Calendar, DollarSign, MessageSquare, Printer, Copy, X } from 'lucide-react'
import Link from 'next/link'

// ✅ 새로 추가
import { recordOrderToAccountingAsync } from '@/apps/accounting-sandbox/src/features/transactions/order-approval-integration'
```

---

### Step 2: 주문 승인 핸들러 함수 생성

**파일**: `app/admin/orders/[orderId]/page.tsx`

**위치**: `handleUpdateDeliveryStatus` 함수 아래 (Line 67 근처)

```typescript
// 기존 함수들...

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
  
  // 3. 성공 메시지 (기존 코드 유지)
  alert('Order approved successfully!')
}
```

---

### Step 3: 주문 승인 버튼 추가 또는 수정

**파일**: `app/admin/orders/[orderId]/page.tsx`

**위치**: Quick Actions 섹션 (Line 724 근처)

```typescript
{/* Quick Actions */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
  <div className="space-y-3">
    {/* ✅ 주문 승인 버튼 추가 */}
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
</div>
```

---

## 🎯 더 간단한 방법: 기존 버튼에 직접 추가

만약 이미 'Approve Order' 버튼이 있다면, 그 버튼의 `onClick` 핸들러에만 추가하면 됩니다:

```typescript
// 기존 코드
<button
  onClick={() => {
    updateOrderStatus(order.id, 'approved', performedBy)
    // ✅ 여기에 한 줄만 추가!
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

## 📊 최종 통합 코드 예시

### 완전한 예시 (Copy & Paste 가능)

```typescript
// app/admin/orders/[orderId]/page.tsx

// 1. Import 추가 (Line 15 아래)
import { recordOrderToAccountingAsync } from '@/apps/accounting-sandbox/src/features/transactions/order-approval-integration'

// 2. 핸들러 함수 추가 (Line 67 아래)
const handleApproveOrder = () => {
  if (!order) return
  
  // 기존 로직
  updateOrderStatus(order.id, 'approved', performedBy)
  
  // ✅ 회계 장부 기록 (한 줄)
  recordOrderToAccountingAsync(
    {
      id: order.id,
      orderId: order.id,
      transactionDate: order.createdAtIso || order.createdAt || new Date().toISOString(),
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
      createdAt: order.createdAtIso || order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    adminUser?.username,
    adminUser?.role
  )
  
  alert('Order approved successfully!')
}

// 3. 버튼 추가 (Quick Actions 섹션)
<button
  onClick={handleApproveOrder}
  disabled={order.status === 'approved'}
  className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {order.status === 'approved' ? 'Already Approved' : 'Approve Order'}
</button>
```

---

## ✅ 최종 체크리스트

- [ ] Import 추가 완료
- [ ] `handleApproveOrder` 함수 추가 완료
- [ ] 주문 승인 버튼 추가 또는 수정 완료
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

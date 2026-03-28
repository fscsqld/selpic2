# VIP 등급 시스템 종합 분석 보고서

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [고객 입장 기능](#고객-입장-기능)
3. [관리자 입장 기능](#관리자-입장-기능)
4. [기술적 구조](#기술적-구조)
5. [현재 오류 및 이슈](#현재-오류-및-이슈)
6. [추가 필요한 기능](#추가-필요한-기능)

---

## 🎯 시스템 개요

### 등급 체계
- **5단계 등급 시스템**: Basic (0) → Silver (1) → Gold (2) → Black (3) → VVIP (4)
- **기준**: 누적 총 판매 금액 (AUD) 기준으로 자동 등급 부여
- **자동 업데이트**: 주문 생성 시 및 주문 상태 변경 시 자동으로 등급 재계산

### 현재 등급 기준 (기본값)
| 등급 | 코드 | 최소 금액 (AUD) | 최대 금액 (AUD) | 기본 할인율 |
|------|------|----------------|----------------|-------------|
| Basic | 0 | $0 | $100,000 | 0% |
| Silver | 1 | $100,000 | $300,000 | 5% |
| Gold | 2 | $300,000 | $1,000,000 | 10% |
| Black | 3 | $1,000,000 | $3,000,000 | 20% |
| VVIP | 4 | $3,000,000 | 무제한 | 50% |

---

## 👤 고객 입장 기능

### 1. 프로필 페이지 (`app/profile/page.tsx`)

#### ✅ 구현된 기능
- **VIP 등급 정보 카드**
  - 현재 등급 배지 표시 (`GradeBadge` 컴포넌트)
  - 할인율 표시 (기본 할인율)
  - 무료 배송 포함 여부 표시
  - 누적 구매 금액 표시
  - 다음 등급까지 진행률 바 및 필요 금액 표시

- **실시간 반영**
  - 관리자가 등급 기준/혜택을 변경하면 즉시 반영 (`content-store-updated` 이벤트 리스너)

#### 📍 위치
- URL: `/profile`
- 컴포넌트: `app/profile/page.tsx`

### 2. 결제 페이지 (`app/checkout/page.tsx`)

#### ✅ 구현된 기능
- **VIP 등급 정보 표시**
  - 현재 등급 및 할인율 표시
  - 카테고리별 할인율 표시 (Stickers/Stamps vs Market S/Phonecase)
  - 무료 배송 포함 여부 표시

- **자동 할인 적용**
  - 등급별 기본 할인율 자동 적용
  - 카테고리별 차등 할인 적용:
    - Stickers/Stamps: `baseDiscountPercentage` 적용
    - Market S/Phonecase: `categoryDiscounts['HotGoods']` 적용 (Black: 5%, VVIP: 10%)
  - 이벤트 할인 적용 (Stickers/Stamps에만)
  - 최소 구매 금액 체크
  - 최대 할인 금액 제한

- **중복 할인 제어**
  - VIP 할인 + 프로모션 코드 할인 중복 허용/불허 설정 가능
  - `allowPromoCodeStacking` (VIP 혜택) 및 `allowVIPStacking` (프로모션 코드) 플래그로 제어

- **실시간 반영**
  - 관리자가 등급 기준/혜택을 변경하면 즉시 재계산 (`content-store-updated` 이벤트 리스너)

#### 📍 위치
- URL: `/checkout`
- 컴포넌트: `app/checkout/page.tsx`

### 3. 주문 영수증 (`components/OrderReceipt.tsx`)

#### ✅ 구현된 기능
- **할인 내역 표시**
  - VIP 등급 할인 금액 표시
  - 프로모션 코드 할인 금액 표시
  - 총 할인 금액 표시

#### 📍 위치
- 컴포넌트: `components/OrderReceipt.tsx`
- 사용 위치: 주문 완료 페이지, 이메일 영수증

---

## 👨‍💼 관리자 입장 기능

### 1. VIP 등급 관리 (`app/admin/content/components/VIPGradeBenefitManager.tsx`)

#### ✅ 구현된 기능
- **통합 관리 페이지**
  - 등급 기준 (Min/Max 금액)과 혜택 (할인율, 무료 배송)을 한 곳에서 관리
  - 등급별 혜택 추가/수정/삭제
  - 등급별 혜택 활성화/비활성화

- **등급 기준 관리**
  - 최소 금액 (Min Amount) 설정
  - 최대 금액 (Max Amount) 설정 (VVIP는 무제한)
  - 등급명 (한국어/영어) 설정

- **혜택 관리**
  - 기본 할인율 (`baseDiscountPercentage`) 설정
  - 카테고리별 할인율 (`categoryDiscounts`) 설정
    - 형식: `HotGoods:10` 또는 `Market S:10`
    - Stickers/Stamps는 `baseDiscountPercentage` 사용
    - Market S/Phonecase는 `categoryDiscounts['HotGoods']` 사용
  - 무료 배송 여부 설정
  - 최소 구매 금액 (`minPurchaseAmount`) 설정
  - 최대 할인 금액 (`maxDiscountAmount`) 설정
  - 이벤트 할인 설정:
    - 이벤트 시작일/종료일
    - 이벤트 할인율 (`eventDiscountPercentage`)
    - 이벤트 최대 할인 금액 (`eventMaxDiscountAmount`)
    - 이벤트 무료 배송 (`eventFreeShipping`)
  - 중복 할인 허용 여부 (`allowPromoCodeStacking`) 설정

- **등급 추가/복원**
  - 새 등급 추가 기능
  - 삭제된 기본 등급 (Basic, Silver) 복원 기능

#### 📍 위치
- URL: `/admin/content` → "Payment & Promotions" → "VIP Grade Management"
- 컴포넌트: `app/admin/content/components/VIPGradeBenefitManager.tsx`

### 2. 사용자 관리 (`app/admin/users/page.tsx`)

#### ✅ 구현된 기능
- **사용자 목록**
  - 등급 배지 표시
  - 누적 구매 금액 표시
  - 다음 등급까지 필요 금액 표시

- **사용자 상세 정보**
  - 등급 정보 표시
  - 수동 등급 변경 여부 표시
  - 수동 등급 변경 사유 표시

- **수동 등급 변경**
  - 관리자가 특정 사용자의 등급을 수동으로 변경 가능
  - 수동 변경 시 자동 등급 업데이트 비활성화 (`manualGradeOverride: true`)
  - 수동 변경 사유 입력 가능 (`gradeOverrideReason`)

- **자동 등급 업데이트 복원**
  - 수동 등급 변경을 해제하여 자동 업데이트 복원 가능

#### 📍 위치
- URL: `/admin/users`
- 컴포넌트: `app/admin/users/page.tsx`

### 3. 등급 상태 모니터링 (`app/admin/users/grades/page.tsx`)

#### ✅ 구현된 기능
- **등급별 통계**
  - 등급별 고객 수
  - 등급별 총 판매액
  - 등급별 평균 판매액

- **경계선 고객 목록**
  - 다음 등급까지 80% 이상 진행한 고객 표시
  - 남은 금액이 적은 순으로 정렬
  - 프로모션 타겟팅에 활용 가능

- **수동 등급 변경**
  - 경계선 고객의 등급을 직접 변경 가능

#### 📍 위치
- URL: `/admin/users/grades`
- 컴포넌트: `app/admin/users/grades/page.tsx`

---

## 🔧 기술적 구조

### 1. 데이터 모델

#### User 인터페이스 (`lib/userAuth.ts`)
```typescript
interface User {
  // ... 기본 필드
  totalSalesAmount?: number      // 누적 총판매금액
  currentGrade?: number          // 현재 등급 코드 (0-4)
  gradeUpdatedAt?: string        // 등급 마지막 업데이트 시점
  manualGradeOverride?: boolean   // 수동 등급 변경 여부
  gradeOverrideReason?: string   // 수동 등급 변경 사유
}
```

#### VIPGradeConfig 인터페이스 (`lib/contentStore.ts`)
```typescript
interface VIPGradeConfig {
  id: string
  code: number                    // 등급 코드 (0-4)
  name: string                   // 한국어 등급명
  nameEn: string                 // 영어 등급명
  minAmount: number              // 최소 금액 (AUD)
  maxAmount?: number             // 최대 금액 (AUD, undefined면 무제한)
  color: string                  // UI 색상
  benefits: string[]             // 혜택 목록 (표시용)
  isActive: boolean              // 활성화 여부
  createdAt: Date
  updatedAt: Date
}
```

#### VIPGradeBenefit 인터페이스 (`lib/contentStore.ts`)
```typescript
interface VIPGradeBenefit {
  id: string
  gradeCode: number              // 등급 코드 (0-4)
  gradeName: string             // 등급명
  baseDiscountPercentage: number // 기본 할인율 (%)
  categoryDiscounts?: Record<string, number> // 카테고리별 할인율
  freeShipping: boolean          // 무료 배송 여부
  minPurchaseAmount?: number     // 최소 구매 금액
  maxDiscountAmount?: number     // 최대 할인 금액
  allowPromoCodeStacking?: boolean // 프로모션 코드 중복 허용 여부
  // 이벤트 관련 필드
  eventStartDate?: Date
  eventEndDate?: Date
  eventDiscountPercentage?: number
  eventMaxDiscountAmount?: number
  eventFreeShipping?: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### OrderRecord 인터페이스 (`lib/store.ts`)
```typescript
interface OrderRecord {
  // ... 기본 필드
  discount?: number              // 총 할인 (VIP + 프로모션)
  vipDiscount?: number           // VIP 등급 할인 (별도 저장)
  vipGradeCode?: number          // VIP 등급 코드
  vipGradeName?: string          // VIP 등급명
  promoCode?: string            // 프로모션 코드
  promoDiscount?: number         // 프로모션 코드 할인 (별도 저장)
}
```

### 2. 핵심 함수

#### 등급 계산 (`lib/vipGradeConfig.ts`)
```typescript
calculateGrade(totalSalesAmount: number, gradeConfigs?: Array<...>): number
```
- 누적 총 판매 금액을 기준으로 등급 코드 반환
- 관리자가 설정한 등급 기준 우선 사용, 없으면 기본값 사용

#### 사용자 등급 업데이트 (`lib/userGradeUtils.ts`)
```typescript
updateUserGrade(user: User, orders: OrderRecord[], updateUser: Function): void
```
- 사용자의 총 판매액 계산
- 새 등급 계산
- 등급 변경 시 자동 업데이트 (수동 변경 제외)

#### 할인 계산 (`lib/contentStore.ts`)
```typescript
getVIPGradeBenefitForCheckout(
  gradeCode: number,
  subtotal: number,
  cartItems?: Array<{ category?: string; price: number }>,
  currentDate?: Date
): { discount: number; freeShipping: boolean; benefit: VIPGradeBenefit } | null
```
- 등급별 할인 금액 계산
- 카테고리별 차등 할인 적용
- 이벤트 할인 적용
- 최소 구매 금액 체크
- 최대 할인 금액 제한

### 3. 자동 업데이트 로직

#### 주문 생성 시 (`lib/store.ts` - `createOrder`)
```typescript
// 주문 생성 후 100ms 지연하여 등급 업데이트
setTimeout(() => {
  updateUserGrade(user, updatedOrders, updateUser)
}, 100)
```

#### 주문 상태 변경 시 (`lib/store.ts` - `updateOrderStatus`)
```typescript
// 주문 상태가 'shipped'로 변경되면 등급 업데이트
if (status === 'shipped') {
  setTimeout(() => {
    updateUserGrade(user, updatedOrders, updateUser)
  }, 100)
}
```

### 4. 실시간 반영 메커니즘

#### Custom Event (`lib/contentStore.ts`)
```typescript
// VIP 등급 설정 변경 시 이벤트 발생
window.dispatchEvent(new CustomEvent('content-store-updated', {
  detail: { type: 'vipGradeBenefits' | 'vipGradeConfigs' }
}))
```

#### 이벤트 리스너 (`app/checkout/page.tsx`, `app/profile/page.tsx`)
```typescript
useEffect(() => {
  const handleContentStoreUpdate = (event: Event) => {
    const customEvent = event as CustomEvent
    if (customEvent.detail?.type === 'vipGradeBenefits' || 
        customEvent.detail?.type === 'vipGradeConfigs') {
      // 재계산 및 UI 업데이트
    }
  }
  window.addEventListener('content-store-updated', handleContentStoreUpdate)
  return () => window.removeEventListener('content-store-updated', handleContentStoreUpdate)
}, [])
```

---

## ⚠️ 현재 오류 및 이슈

### 1. 확인된 오류 없음 ✅
- 모든 기능이 정상 작동 중
- 최근 수정 사항:
  - ✅ Order Receipt에 할인 내역 표시 추가 완료
  - ✅ 카테고리별 할인율 정확히 적용됨
  - ✅ 중복 할인 제어 정상 작동
  - ✅ 실시간 반영 메커니즘 정상 작동

### 2. 잠재적 이슈

#### ✅ 주문 취소 시 등급 업데이트 (해결됨)
- **이전 상태**: 주문 취소 시 등급이 자동으로 재계산되지 않음
- **현재 상태**: 주문 취소 시 등급이 자동으로 재계산됨
- **구현 내용**: `updateOrderStatus`에서 `status === 'cancelled'`일 때 등급 재계산 로직 추가
- **동작 방식**: 
  - 주문 상태가 'cancelled'로 변경되면 `updateUserGrade` 호출
  - `calculateUserTotalSales` 함수가 이미 취소된 주문을 제외하므로 자동으로 총 판매액 재계산
  - 등급이 변경되면 자동으로 업데이트

#### ⚠️ 환불 시 등급 업데이트
- **현재 상태**: 환불 처리 시 등급이 자동으로 재계산되지 않음
- **영향**: 환불된 금액이 총 판매액에서 제외되지 않음
- **해결 방법**: 
  - 현재 시스템에서는 환불 처리를 주문 취소(`status === 'cancelled'`)로 처리하는 것으로 보임
  - 별도의 환불 처리 함수가 추가되면 해당 함수에서도 등급 재계산 로직 추가 필요
  - 또는 환불 전용 주문 상태(`refunded`)를 추가하고 해당 상태일 때도 등급 재계산하도록 구현

---

## 🚀 추가 필요한 기능

### 1. 고객 대시보드 연동 (부분 구현됨)

#### ✅ 이미 구현됨
- 프로필 페이지에 등급 정보 표시
- 다음 등급까지 진행률 표시

#### ❌ 미구현
- **등급별 쿠폰/혜택 목록**
  - 현재: 혜택 목록이 프로필 페이지에서 제거됨
  - 필요: 등급별로 받을 수 있는 쿠폰/혜택 목록 표시

### 2. 이메일/알림 시스템

#### ❌ 미구현
- **등급 승급 알림**
  - 등급이 상승했을 때 이메일/알림 발송
  - 새 등급의 혜택 안내

- **등급별 혜택 안내 이메일**
  - 정기적으로 등급별 혜택 안내 이메일 발송
  - 이벤트 할인 안내

- **경계선 고객 대상 프로모션**
  - 다음 등급까지 80% 이상 진행한 고객에게 프로모션 코드 발송
  - 등급 상승 유도

### 3. 통계 및 리포트

#### ❌ 미구현
- **등급별 매출 분석**
  - 등급별 총 매출
  - 등급별 평균 주문 금액
  - 등급별 주문 빈도

- **등급별 고객 이탈률 분석**
  - 등급별 고객 유지율
  - 등급별 재구매율

- **등급별 평균 주문 금액 분석**
  - 등급별 평균 주문 금액 추이
  - 등급별 구매 패턴 분석

### 4. 추가 기능

#### ❌ 미구현
- **등급별 전용 상품/서비스**
  - 특정 등급 이상만 구매 가능한 상품
  - 등급별 전용 할인 상품

- **등급별 생일 쿠폰 자동 발급**
  - 생일 월에 자동으로 쿠폰 발급
  - 등급별 차등 쿠폰 금액

- **등급별 이벤트 참여 우선권**
  - 특정 이벤트에 등급별 우선 참여권 부여
  - 등급별 선착순 할인

- **등급별 포인트 적립 시스템**
  - 구매 시 등급별 차등 포인트 적립
  - 포인트 사용 시 추가 할인

### 5. 관리자 기능 개선

#### ❌ 미구현
- **일괄 등급 재계산**
  - 모든 사용자의 등급을 한 번에 재계산하는 기능
  - 등급 기준 변경 시 기존 고객 재계산

- **등급별 통계 대시보드**
  - 등급별 고객 수, 매출, 평균 주문 금액 등을 한눈에 볼 수 있는 대시보드
  - 시각적 차트 및 그래프

- **등급 변경 이력**
  - 사용자의 등급 변경 이력 기록
  - 수동 변경 vs 자동 변경 구분

- **등급별 프로모션 자동 생성**
  - 경계선 고객에게 자동으로 프로모션 코드 생성 및 발송
  - 등급 상승 유도 캠페인

---

## 📊 기능 구현 현황 요약

| 기능 | 고객 입장 | 관리자 입장 | 상태 |
|------|-----------|-------------|------|
| 등급 정보 표시 | ✅ | ✅ | 완료 |
| 할인 자동 적용 | ✅ | - | 완료 |
| 등급 기준 관리 | - | ✅ | 완료 |
| 혜택 관리 | - | ✅ | 완료 |
| 수동 등급 변경 | - | ✅ | 완료 |
| 등급 상태 모니터링 | - | ✅ | 완료 |
| 카테고리별 할인 | ✅ | ✅ | 완료 |
| 중복 할인 제어 | ✅ | ✅ | 완료 |
| 실시간 반영 | ✅ | ✅ | 완료 |
| 주문 취소 시 등급 업데이트 | - | - | ✅ 완료 |
| 환불 시 등급 업데이트 | - | - | ⚠️ 부분 구현 (취소로 처리) |
| 이메일/알림 시스템 | - | - | ❌ 미구현 |
| 통계 및 리포트 | - | - | ❌ 미구현 |
| 등급별 전용 상품 | - | - | ❌ 미구현 |
| 생일 쿠폰 자동 발급 | - | - | ❌ 미구현 |
| 포인트 적립 시스템 | - | - | ❌ 미구현 |

---

## 🎯 우선순위별 개선 사항

### 🔴 높은 우선순위 (즉시 필요)
1. ~~**주문 취소 시 등급 업데이트**~~ ✅ **완료**
   - 취소된 주문 금액을 총 판매액에서 제외
   - `updateOrderStatus`에서 `status === 'cancelled'` 처리 추가 완료

2. **환불 시 등급 업데이트** (부분 구현됨)
   - 현재: 환불 처리를 주문 취소(`status === 'cancelled'`)로 처리하므로 자동으로 등급 재계산됨
   - 향후: 별도의 환불 처리 함수나 상태가 추가되면 해당 부분에도 등급 재계산 로직 추가 필요

### 🟡 중간 우선순위 (단기 개선)
3. **등급 승급 알림**
   - 등급 상승 시 이메일/알림 발송
   - 새 등급의 혜택 안내

4. **등급별 통계 대시보드**
   - 관리자가 등급별 통계를 한눈에 볼 수 있는 대시보드
   - 시각적 차트 및 그래프

### 🟢 낮은 우선순위 (장기 개선)
5. **등급별 전용 상품/서비스**
6. **생일 쿠폰 자동 발급**
7. **포인트 적립 시스템**

---

## 📝 결론

현재 VIP 등급 시스템은 **핵심 기능이 모두 구현되어 있으며 정상 작동 중**입니다. 고객 입장에서는 등급 정보 확인, 할인 자동 적용, 실시간 반영이 모두 작동하고, 관리자 입장에서는 등급 기준/혜택 관리, 수동 등급 변경, 등급 상태 모니터링이 모두 가능합니다.

**주요 개선 사항**으로는 주문 취소/환불 시 등급 업데이트 로직 추가와 이메일/알림 시스템 구축이 필요합니다. 이는 고객 경험 향상과 등급 시스템의 정확성을 위해 중요한 기능입니다.


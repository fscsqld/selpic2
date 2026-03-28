# 고객 등급제(VIP 등급 시스템) 구축 방안

## 📋 현재 User Management 페이지 분석

### 현재 구조
- **위치**: `app/admin/users/page.tsx`
- **User 인터페이스**: `id`, `email`, `name`, `phone`, `address`, `createdAt`
- **주문 매칭**: email/phone으로 orders 배열에서 매칭
- **현재 기능**: 사용자 조회, 추가, 수정, 삭제, 검색, 정렬

### 개선 필요 사항
1. 총 판매액 계산 로직 없음
2. 등급 시스템 없음
3. 등급별 통계 없음
4. 등급 자동 업데이트 로직 없음

---

## 🎯 1단계: 데이터 구조 설계 및 확장

### 1.1 User 인터페이스 확장

**파일**: `lib/userAuth.ts`

```typescript
export interface User {
  id: string
  email: string
  name: string
  phone?: string
  address?: string
  password?: string
  createdAt?: string
  isDemo?: boolean
  
  // VIP 등급 시스템 필드 추가
  totalSalesAmount?: number      // 누적 총판매금액
  currentGrade?: number          // 현재 등급 코드 (0-4)
  gradeUpdatedAt?: string        // 등급 마지막 업데이트 시점
  manualGradeOverride?: boolean  // 수동 등급 변경 여부
  gradeOverrideReason?: string   // 수동 등급 변경 사유
}
```

### 1.2 등급 기준 설정

**파일**: `lib/vipGradeConfig.ts` (새로 생성)

```typescript
export interface GradeConfig {
  code: number
  name: string
  nameEn: string
  minAmount: number      // 최소 금액 (이 금액 이상)
  maxAmount?: number      // 최대 금액 (이 금액 미만, undefined면 무제한)
  color: string          // UI 표시용 색상
  benefits: string[]      // 혜택 목록
}

export const VIP_GRADE_CONFIGS: GradeConfig[] = [
  {
    code: 0,
    name: '일반',
    nameEn: 'Basic',
    minAmount: 0,
    maxAmount: 100000,        // 10만원 미만
    color: 'gray',
    benefits: ['기본 5% 할인 쿠폰']
  },
  {
    code: 1,
    name: '실버',
    nameEn: 'Silver',
    minAmount: 100000,
    maxAmount: 300000,        // 30만원 미만
    color: 'silver',
    benefits: ['5% 상시 할인', '생일 쿠폰']
  },
  {
    code: 2,
    name: '골드',
    nameEn: 'Gold',
    minAmount: 300000,
    maxAmount: 1000000,       // 100만원 미만
    color: 'gold',
    benefits: ['7% 상시 할인', '무료 배송 쿠폰']
  },
  {
    code: 3,
    name: '블랙',
    nameEn: 'Black',
    minAmount: 1000000,
    maxAmount: 3000000,       // 300만원 미만
    color: 'black',
    benefits: ['10% 상시 할인', '전용 고객 센터']
  },
  {
    code: 4,
    name: 'VVIP',
    nameEn: 'VVIP',
    minAmount: 3000000,
    maxAmount: undefined,    // 무제한
    color: 'purple',
    benefits: ['15% 상시 할인', '특별 선물']
  }
]

// 등급 계산 함수
export function calculateGrade(totalSalesAmount: number): number {
  for (let i = VIP_GRADE_CONFIGS.length - 1; i >= 0; i--) {
    const grade = VIP_GRADE_CONFIGS[i]
    if (totalSalesAmount >= grade.minAmount) {
      if (grade.maxAmount === undefined || totalSalesAmount < grade.maxAmount) {
        return grade.code
      }
    }
  }
  return 0 // 기본 등급
}

// 등급 정보 가져오기
export function getGradeInfo(gradeCode: number): GradeConfig | undefined {
  return VIP_GRADE_CONFIGS.find(g => g.code === gradeCode)
}
```

---

## 🔄 2단계: 등급 자동 업데이트 로직 구축

### 2.1 주문 완료 시 등급 업데이트

**파일**: `lib/store.ts` - `createOrder` 함수 수정

```typescript
// createOrder 함수 내부에 추가
createOrder: (orderInput) => {
  // ... 기존 주문 생성 로직 ...
  
  // 주문 생성 후 등급 업데이트
  if (orderInput.customer?.email) {
    updateUserGrade(orderInput.customer.email, orderInput.total)
  }
  
  return id
}
```

### 2.2 등급 업데이트 유틸리티 함수

**파일**: `lib/userGradeUtils.ts` (새로 생성)

```typescript
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'
import { calculateGrade } from '@/lib/vipGradeConfig'

/**
 * 사용자의 총 판매액 계산
 */
export function calculateUserTotalSales(userEmail: string, orders: OrderRecord[]): number {
  const userOrders = orders.filter(order => {
    const orderEmail = (order.customer.email || '').trim().toLowerCase()
    return orderEmail === userEmail.trim().toLowerCase() && order.status !== 'cancelled'
  })
  
  return userOrders.reduce((sum, order) => sum + (order.total || 0), 0)
}

/**
 * 사용자 등급 업데이트
 */
export function updateUserGrade(userEmail: string, newOrderTotal: number) {
  const { users, updateUser } = useUserAuth.getState()
  const { orders } = useStore.getState()
  
  const user = users.find(u => 
    (u.email || '').trim().toLowerCase() === userEmail.trim().toLowerCase()
  )
  
  if (!user) return
  
  // 수동 등급 변경이 아닌 경우에만 자동 업데이트
  if (user.manualGradeOverride) return
  
  // 총 판매액 계산
  const totalSales = calculateUserTotalSales(userEmail, orders)
  
  // 새 등급 계산
  const newGrade = calculateGrade(totalSales)
  
  // 등급이 변경된 경우에만 업데이트
  if (user.currentGrade !== newGrade) {
    updateUser(user.id, {
      totalSalesAmount: totalSales,
      currentGrade: newGrade,
      gradeUpdatedAt: new Date().toISOString()
    })
  } else {
    // 등급은 같지만 총 판매액만 업데이트
    updateUser(user.id, {
      totalSalesAmount: totalSales
    })
  }
}

/**
 * 모든 사용자의 등급 재계산 (관리자용)
 */
export function recalculateAllUserGrades() {
  const { users } = useUserAuth.getState()
  const { orders } = useStore.getState()
  
  users.forEach(user => {
    if (user.manualGradeOverride) return // 수동 변경된 사용자는 제외
    
    const totalSales = calculateUserTotalSales(user.email, orders)
    const newGrade = calculateGrade(totalSales)
    
    useUserAuth.getState().updateUser(user.id, {
      totalSalesAmount: totalSales,
      currentGrade: newGrade,
      gradeUpdatedAt: new Date().toISOString()
    })
  })
}
```

### 2.3 주문 상태 변경 시 등급 업데이트

**파일**: `lib/store.ts` - `updateOrderStatus` 함수 수정

```typescript
updateOrderStatus: (orderId, status) => {
  const { orders } = get()
  const updatedOrders = orders.map(o => 
    o.id === orderId ? { ...o, status } : o
  )
  set({ orders: updatedOrders })
  
  // 배송 완료 시 등급 업데이트
  if (status === 'delivered') {
    const order = updatedOrders.find(o => o.id === orderId)
    if (order?.customer?.email) {
      updateUserGrade(order.customer.email, order.total)
    }
  }
  
  // ... 기존 이메일 전송 로직 ...
}
```

---

## 🎨 3단계: User Management 페이지 UI 업그레이드

### 3.1 요약 카드에 등급별 통계 추가

**파일**: `app/admin/users/page.tsx`

```typescript
// 등급별 사용자 수 계산
const gradeStats = useMemo(() => {
  const stats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
  users.forEach(user => {
    const grade = user.currentGrade ?? 0
    stats[grade as keyof typeof stats]++
  })
  return stats
}, [users])

// 총 판매액 계산
const totalSales = useMemo(() => {
  return users.reduce((sum, user) => sum + (user.totalSalesAmount || 0), 0)
}, [users])
```

### 3.2 사용자 테이블에 등급 컬럼 추가

```typescript
// 테이블 헤더에 추가
<th>등급</th>
<th>총 판매액</th>

// 테이블 바디에 추가
<td>
  <GradeBadge gradeCode={user.currentGrade ?? 0} />
</td>
<td>
  ${(user.totalSalesAmount || 0).toLocaleString()}
</td>
```

### 3.3 등급 배지 컴포넌트

**파일**: `components/GradeBadge.tsx` (새로 생성)

```typescript
import { getGradeInfo } from '@/lib/vipGradeConfig'

export default function GradeBadge({ gradeCode }: { gradeCode: number }) {
  const gradeInfo = getGradeInfo(gradeCode)
  if (!gradeInfo) return null
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    silver: 'bg-gray-200 text-gray-900',
    gold: 'bg-yellow-100 text-yellow-800',
    black: 'bg-gray-900 text-white',
    purple: 'bg-purple-100 text-purple-800'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[gradeInfo.color]}`}>
      {gradeInfo.nameEn}
    </span>
  )
}
```

### 3.4 사용자 상세 모달에 등급 정보 추가

```typescript
// 사용자 상세 보기 모달에 추가
<div>
  <span className="text-gray-500">등급:</span>
  <GradeBadge gradeCode={selectedUser.currentGrade ?? 0} />
</div>
<div>
  <span className="text-gray-500">총 판매액:</span>
  <span className="text-gray-900">
    ${(selectedUser.totalSalesAmount || 0).toLocaleString()}
  </span>
</div>
<div>
  <span className="text-gray-500">다음 등급까지:</span>
  <span className="text-gray-900">
    {calculateNextGradeAmount(selectedUser)}
  </span>
</div>
```

### 3.5 수동 등급 변경 기능

```typescript
// 수정 모달에 추가
<div>
  <label>
    <input
      type="checkbox"
      checked={formData.manualGradeOverride}
      onChange={(e) => setFormData({...formData, manualGradeOverride: e.target.checked})}
    />
    수동 등급 변경
  </label>
</div>
{formData.manualGradeOverride && (
  <>
    <div>
      <label>등급</label>
      <select value={formData.currentGrade} onChange={...}>
        {VIP_GRADE_CONFIGS.map(grade => (
          <option key={grade.code} value={grade.code}>
            {grade.nameEn}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label>변경 사유</label>
      <textarea value={formData.gradeOverrideReason} onChange={...} />
    </div>
  </>
)}
```

---

## 📊 4단계: 등급 현황 모니터링 페이지

### 4.1 등급별 통계 섹션

**파일**: `app/admin/users/page.tsx`에 추가

```typescript
// 등급별 통계 카드
<div className="grid grid-cols-5 gap-4 mb-6">
  {VIP_GRADE_CONFIGS.map(grade => (
    <div key={grade.code} className="bg-white rounded-xl border p-4">
      <div className="text-sm text-gray-500">{grade.nameEn}</div>
      <div className="text-2xl font-bold">{gradeStats[grade.code]}</div>
      <div className="text-xs text-gray-400">
        {((gradeStats[grade.code] / users.length) * 100).toFixed(1)}%
      </div>
    </div>
  ))}
</div>
```

### 4.2 등급 경계 고객 리스트

```typescript
// 다음 등급까지 1만원 미만인 고객 찾기
const nearGradeUpUsers = useMemo(() => {
  return users
    .filter(user => {
      const currentGrade = user.currentGrade ?? 0
      const totalSales = user.totalSalesAmount || 0
      const nextGrade = VIP_GRADE_CONFIGS.find(g => g.code === currentGrade + 1)
      
      if (!nextGrade) return false
      
      const remaining = nextGrade.minAmount - totalSales
      return remaining > 0 && remaining < 10000
    })
    .map(user => ({
      ...user,
      remainingAmount: (VIP_GRADE_CONFIGS.find(g => g.code === (user.currentGrade ?? 0) + 1)?.minAmount || 0) - (user.totalSalesAmount || 0)
    }))
}, [users])
```

---

## 🔧 5단계: 구현 순서 및 체크리스트

### Phase 1: 데이터 구조 확장 (1일)
- [ ] `lib/userAuth.ts` - User 인터페이스 확장
- [ ] `lib/vipGradeConfig.ts` - 등급 설정 파일 생성
- [ ] 기존 사용자 데이터 마이그레이션 (totalSalesAmount, currentGrade 초기화)

### Phase 2: 등급 계산 로직 (1일)
- [ ] `lib/userGradeUtils.ts` - 등급 계산 유틸리티 생성
- [ ] `lib/store.ts` - createOrder에 등급 업데이트 로직 추가
- [ ] `lib/store.ts` - updateOrderStatus에 등급 업데이트 로직 추가

### Phase 3: UI 컴포넌트 (1일)
- [ ] `components/GradeBadge.tsx` - 등급 배지 컴포넌트 생성
- [ ] `app/admin/users/page.tsx` - 등급 컬럼 추가
- [ ] `app/admin/users/page.tsx` - 등급별 통계 카드 추가

### Phase 4: 고급 기능 (1일)
- [ ] 등급 경계 고객 리스트
- [ ] 수동 등급 변경 기능
- [ ] 등급 재계산 기능
- [ ] 등급별 혜택 관리 모듈

### Phase 5: 테스트 및 최적화 (1일)
- [ ] 등급 자동 업데이트 테스트
- [ ] 성능 최적화 (useMemo, useCallback)
- [ ] UI/UX 개선

---

## 📝 추가 고려사항

### 등급 갱신 주기
- **영구 누적 방식** (권장): 등급 하락 없이 평생 누적
- **주기적 갱신**: 매년/분기별 재산정 (구현 복잡도 높음)

### 혜택 적용
- 등급별 할인율은 프로모션 코드 시스템과 연동
- 쿠폰 발급은 PromoCodeManager와 통합

### 데이터 마이그레이션
- 기존 사용자의 totalSalesAmount는 과거 주문 내역으로 계산
- 초기 등급은 계산된 총 판매액 기준으로 자동 설정


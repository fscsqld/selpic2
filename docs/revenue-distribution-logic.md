# 수익 분배 로직 상세 설계

## 🎯 핵심 원칙

### 1. 이원화된 분배 프로세스

주문 처리 시 `agentId`의 유무에 따라 수익 분배 프로세스가 자동으로 결정됩니다.

```
agentId 유무 확인
  ↓
┌──────────────┬──────────────┐
│ agentId 있음 │ agentId 없음 │
│ (4자 분배)   │ (3자 분배)   │
└──────────────┴──────────────┘
```

### 2. 상품별 개별 판단

한 주문에 여러 상품이 포함되어 있어도, 각 상품마다 독립적으로 영업사원 적용 여부를 판단합니다.

---

## 💰 분배 비율 상세

### 3자 분배 (agentId 없음)

**플랫폼 수익 비중 증가**

```
판매 가격: $20.00
├── 제작 원가: $8.00 (40%)
├── 플랫폼 수익: $8.00 (40%) ⬆️ 영업사원 수익을 플랫폼이 가져감
└── 디자이너 수익: $4.00 (20%)
```

**비율:**
- 제작 원가: 40% (고정)
- 플랫폼 수익: 40% (영업사원 수익을 포함)
- 디자이너 수익: 20% (고정)
- 영업사원 수익: 0%

### 4자 분배 (agentId 있음)

**영업사원 수수료 배분**

```
판매 가격: $20.00
├── 제작 원가: $8.00 (40%)
├── 플랫폼 수익: $6.00 (30%) ⬇️ 영업사원 수익만큼 감소
├── 디자이너 수익: $4.00 (20%)
└── 영업사원 수익: $2.00 (10%)
```

**비율:**
- 제작 원가: 40% (고정)
- 플랫폼 수익: 30% (영업사원 수익만큼 감소)
- 디자이너 수익: 20% (고정)
- 영업사원 수익: 10% (기본값, 개별 설정 가능)

---

## 🔄 주문 처리 프로세스

### 단일 상품 주문

```typescript
// 주문 생성
const order = {
  id: 'order-123',
  items: [
    {
      customOrderId: 'custom-001',
      productName: 'Custom Sticker',
      price: 20.00,
      agentId: 'agent-abc123' // 영업사원 추천
    }
  ]
}

// 수익 분배 계산
const revenue = calculateRevenue({
  totalPrice: 20.00,
  productionCost: 8.00,
  agentId: 'agent-abc123' // 있으면 4자 분배
})

// 결과
{
  distributionType: 'four-way',
  productionCost: 8.00,
  platformRevenue: 6.00,  // 30%
  designerRevenue: 4.00,   // 20%
  agentRevenue: 2.00,     // 10%
  total: 20.00
}
```

### 복합 주문 (여러 상품)

```typescript
// 주문 생성
const order = {
  id: 'order-456',
  items: [
    {
      customOrderId: 'custom-001',
      productName: 'Custom Sticker A',
      price: 20.00,
      agentId: 'agent-abc123' // 영업사원 A 추천
    },
    {
      customOrderId: 'custom-002',
      productName: 'Custom Stamp B',
      price: 15.00,
      agentId: null // 직접 방문 (영업사원 없음)
    },
    {
      customOrderId: 'custom-003',
      productName: 'Custom Bundle C',
      price: 30.00,
      agentId: 'agent-xyz789' // 영업사원 B 추천
    }
  ]
}

// 각 상품별 수익 분배 계산
const itemRevenues = order.items.map(item => {
  return calculateRevenue({
    totalPrice: item.price,
    productionCost: item.price * 0.40,
    agentId: item.agentId // 각 상품별로 개별 판단
  })
})

// 결과
[
  {
    customOrderId: 'custom-001',
    distributionType: 'four-way',
    agentRevenue: 2.00,  // agent-abc123
    // ...
  },
  {
    customOrderId: 'custom-002',
    distributionType: 'three-way',
    agentRevenue: 0.00,  // 영업사원 없음
    platformRevenue: 6.00, // 플랫폼이 영업사원 수익을 가져감
    // ...
  },
  {
    customOrderId: 'custom-003',
    distributionType: 'four-way',
    agentRevenue: 3.00,  // agent-xyz789
    // ...
  }
]

// 전체 집계
{
  totalOrderPrice: 65.00,
  totals: {
    productionCost: 26.00,
    platformRevenue: 21.00,  // (6 + 6 + 9)
    designerRevenue: 13.00,  // (4 + 3 + 6)
    agentRevenue: 5.00       // (2 + 0 + 3)
  },
  agentBreakdown: [
    { agentId: 'agent-abc123', revenue: 2.00 },
    { agentId: 'agent-xyz789', revenue: 3.00 }
  ]
}
```

---

## 📊 계산 로직

### 수익 분배 계산 함수

```typescript
function calculateRevenue(request: CalculateRevenueRequest): RevenueCalculation {
  const { totalPrice, productionCost, agentId, agentRevenueRate = 0.10 } = request
  
  // 제작 원가 (고정 40%)
  const production = productionCost || totalPrice * 0.40
  
  // agentId 유무에 따라 분배 방식 결정
  if (agentId) {
    // 4자 분배
    const designerRevenue = totalPrice * 0.20 // 20% 고정
    const agentRevenue = totalPrice * agentRevenueRate // 영업사원 수수료
    const platformRevenue = totalPrice - production - designerRevenue - agentRevenue
    
    return {
      distributionType: 'four-way',
      productionCost: production,
      platformRevenue,
      designerRevenue,
      agentRevenue,
      total: totalPrice,
      rates: {
        production: production / totalPrice,
        platform: platformRevenue / totalPrice,
        designer: 0.20,
        agent: agentRevenueRate
      },
      agent: {
        id: agentId,
        code: request.agentCode || '',
        revenueRate: agentRevenueRate
      }
    }
  } else {
    // 3자 분배 (플랫폼 수익 증가)
    const designerRevenue = totalPrice * 0.20 // 20% 고정
    const platformRevenue = totalPrice - production - designerRevenue // 나머지 모두
    
    return {
      distributionType: 'three-way',
      productionCost: production,
      platformRevenue,
      designerRevenue,
      agentRevenue: 0,
      total: totalPrice,
      rates: {
        production: production / totalPrice,
        platform: platformRevenue / totalPrice,
        designer: 0.20,
        agent: 0.00
      }
    }
  }
}
```

### 복합 주문 집계 함수

```typescript
function calculateCompositeOrderRevenue(
  request: CalculateCompositeOrderRevenueRequest
): CompositeOrderRevenue {
  const { orderId, items } = request
  
  // 각 아이템별 수익 계산
  const itemRevenues = items.map(item => ({
    customOrderId: item.customOrderId,
    productName: item.productName,
    price: item.totalPrice,
    revenue: calculateRevenue({
      orderId,
      customOrderId: item.customOrderId,
      totalPrice: item.totalPrice,
      productionCost: item.productionCost,
      designerRevenueRate: item.designerRevenueRate,
      agentId: item.agentId,
      agentCode: item.agentCode,
      agentRevenueRate: item.agentRevenueRate
    })
  }))
  
  // 전체 집계
  const totals = itemRevenues.reduce((acc, item) => ({
    productionCost: acc.productionCost + item.revenue.productionCost,
    platformRevenue: acc.platformRevenue + item.revenue.platformRevenue,
    designerRevenue: acc.designerRevenue + item.revenue.designerRevenue,
    agentRevenue: acc.agentRevenue + item.revenue.agentRevenue,
    total: acc.total + item.price
  }), { productionCost: 0, platformRevenue: 0, designerRevenue: 0, agentRevenue: 0, total: 0 })
  
  // 영업사원별 집계
  const agentMap = new Map<string, { agentId: string, agentCode: string, revenue: number, itemCount: number }>()
  
  itemRevenues.forEach(item => {
    if (item.revenue.agent) {
      const agentId = item.revenue.agent.id
      const existing = agentMap.get(agentId) || {
        agentId,
        agentCode: item.revenue.agent.code,
        revenue: 0,
        itemCount: 0
      }
      existing.revenue += item.revenue.agentRevenue
      existing.itemCount += 1
      agentMap.set(agentId, existing)
    }
  })
  
  return {
    orderId,
    totalOrderPrice: totals.total,
    items: itemRevenues,
    totals,
    agentBreakdown: Array.from(agentMap.values()),
    stats: {
      totalItems: items.length,
      itemsWithAgent: itemRevenues.filter(i => i.revenue.agent).length,
      itemsWithoutAgent: itemRevenues.filter(i => !i.revenue.agent).length,
      uniqueAgents: agentMap.size
    }
  }
}
```

---

## 🔍 검증 로직

### 수익 분배 검증

```typescript
function validateRevenueCalculation(calculation: RevenueCalculation): boolean {
  const { totalPrice, productionCost, platformRevenue, designerRevenue, agentRevenue } = calculation
  
  // 총합 검증
  const sum = productionCost + platformRevenue + designerRevenue + agentRevenue
  const tolerance = 0.01 // 1센트 오차 허용
  
  if (Math.abs(sum - totalPrice) > tolerance) {
    console.error('❌ 수익 분배 검증 실패:', {
      totalPrice,
      sum,
      difference: Math.abs(sum - totalPrice)
    })
    return false
  }
  
  // 비율 검증
  if (calculation.distributionType === 'four-way') {
    // 4자 분배: 제작(40%) + 플랫폼(30%) + 디자이너(20%) + 영업사원(10%) = 100%
    const expectedTotal = 1.0
    const actualTotal = calculation.rates.production + 
                        calculation.rates.platform + 
                        calculation.rates.designer + 
                        calculation.rates.agent
    
    if (Math.abs(actualTotal - expectedTotal) > 0.01) {
      console.error('❌ 4자 분배 비율 검증 실패:', calculation.rates)
      return false
    }
  } else {
    // 3자 분배: 제작(40%) + 플랫폼(40%) + 디자이너(20%) = 100%
    const expectedTotal = 1.0
    const actualTotal = calculation.rates.production + 
                        calculation.rates.platform + 
                        calculation.rates.designer
    
    if (Math.abs(actualTotal - expectedTotal) > 0.01) {
      console.error('❌ 3자 분배 비율 검증 실패:', calculation.rates)
      return false
    }
  }
  
  return true
}
```

---

## 📝 구현 예시

### Server Action: 주문 처리 시 수익 분배

```typescript
// server/actions/revenueActions.ts
'use server'

import { calculateRevenue, calculateCompositeOrderRevenue } from '@/lib/services/revenueService'
import { validateRevenueCalculation } from '@/lib/utils/revenueValidator'

export async function processOrderRevenue(orderId: string, items: Array<{
  customOrderId: string
  productName: string
  totalPrice: number
  productionCost: number
  designerRevenueRate: number
  agentId?: string
  agentCode?: string
  agentRevenueRate?: number
}>) {
  try {
    // 복합 주문 수익 계산
    const compositeRevenue = calculateCompositeOrderRevenue({
      orderId,
      items
    })
    
    // 검증
    for (const item of compositeRevenue.items) {
      if (!validateRevenueCalculation(item.revenue)) {
        throw new Error(`수익 분배 검증 실패: ${item.customOrderId}`)
      }
    }
    
    // 데이터베이스에 저장
    // ... 저장 로직
    
    return {
      success: true,
      data: compositeRevenue
    }
  } catch (error) {
    console.error('❌ 주문 수익 처리 실패:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

---

## 🎯 핵심 포인트 요약

1. **이원화된 분배**: agentId 유무에 따라 자동으로 3자/4자 분배 결정
2. **플랫폼 수익 보호**: 영업사원이 없으면 플랫폼이 영업사원 수익을 가져감
3. **상품별 개별 판단**: 한 주문 내에서도 각 상품마다 독립적으로 영업사원 적용 여부 판단
4. **유연한 수수료**: 영업사원별로 다른 수수료율 적용 가능
5. **검증 로직**: 수익 분배 계산 후 자동 검증

---

**작성일**: 2024년
**버전**: 1.0


# VIP 등급 혜택 관리 시스템 설계 문서

## 📋 개요

관리자가 VIP 등급별 혜택을 수정하고, 이벤트 기간별 특별 혜택을 설정할 수 있는 시스템입니다.

## 🎯 주요 기능

### 1. 등급별 기본 혜택 관리
- **기본 할인율**: 각 등급별 기본 할인율 설정 (예: VVIP 15%)
- **무료 배송**: 등급별 무료 배송 여부 설정
- **최대 할인 금액**: 할인율 적용 시 최대 할인 금액 제한
- **최소 구매 금액**: 혜택 적용을 위한 최소 구매 금액 조건

### 2. 이벤트 기간별 특별 혜택
- **이벤트명**: 이벤트 이름 설정 (예: "크리스마스 특별 이벤트")
- **이벤트 기간**: 시작일/종료일 설정
- **추가 할인율**: 기본 할인에 추가되는 이벤트 할인율
- **이벤트 무료 배송**: 이벤트 기간 중 무료 배송 여부
- **이벤트 최대 할인**: 이벤트 기간 최대 할인 금액

### 3. 관리자 기능
- 등급별 혜택 추가/수정/삭제
- 이벤트 기간 설정 및 관리
- 활성화/비활성화 토글
- 우선순위 설정 (여러 혜택이 있을 때)

### 4. Checkout 자동 적용
- 사용자 등급 확인
- 현재 날짜 기준 이벤트 혜택 확인
- 자동 할인 계산 및 적용
- 무료 배송 자동 적용

## 📊 데이터 구조

```typescript
interface VIPGradeBenefit {
  id: string
  gradeCode: number               // 0: Basic, 1: Silver, 2: Gold, 3: Black, 4: VVIP
  gradeName: string                // 등급명
  // 기본 혜택
  baseDiscountPercentage: number  // 기본 할인율 (%)
  freeShipping: boolean           // 무료 배송 여부
  maxDiscountAmount?: number      // 최대 할인 금액
  minPurchaseAmount?: number      // 최소 구매 금액
  // 이벤트 혜택
  eventName?: string               // 이벤트명
  eventStartDate?: Date            // 이벤트 시작일
  eventEndDate?: Date              // 이벤트 종료일
  eventDiscountPercentage?: number // 이벤트 추가 할인율
  eventFreeShipping?: boolean      // 이벤트 무료 배송
  eventMaxDiscountAmount?: number  // 이벤트 최대 할인
  // 추가 정보
  additionalBenefits: string[]     // 추가 혜택 설명
  isActive: boolean               // 활성화 여부
  priority: number                // 우선순위
  createdAt: Date
  updatedAt: Date
}
```

## 🔄 작동 방식

### 예시 1: VVIP 기본 혜택
- **기본 할인율**: 15%
- **무료 배송**: true
- **최대 할인**: $50
- **최소 구매**: $0

### 예시 2: 크리스마스 이벤트 (VVIP)
- **이벤트명**: "크리스마스 특별 이벤트"
- **기간**: 2024-12-01 ~ 2024-12-25
- **기본 할인**: 15% (유지)
- **이벤트 추가 할인**: 5% (총 20%)
- **이벤트 무료 배송**: true
- **이벤트 최대 할인**: $100

### Checkout 적용 로직
1. 사용자 등급 확인 (예: VVIP = 4)
2. 현재 날짜가 이벤트 기간인지 확인
3. 이벤트 기간이면: 기본 할인 + 이벤트 할인 적용
4. 이벤트 기간이 아니면: 기본 할인만 적용
5. 무료 배송 조건 확인 및 적용

## 🛠️ 구현 단계

1. ✅ VIP 등급 혜택 인터페이스 정의
2. ⏳ Content Store에 VIP 혜택 관리 함수 추가
3. ⏳ 기본 VIP 혜택 데이터 생성
4. ⏳ Admin 페이지에 VIP 혜택 관리자 컴포넌트 추가
5. ⏳ Checkout 페이지에 자동 적용 로직 구현


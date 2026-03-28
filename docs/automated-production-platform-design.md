# SELPIC-X 설계 문서

> ⚠️ **중요**: 이 문서는 **구상 단계의 설계 문서**입니다.
> - 현재 홈페이지 개발과 **완전히 별개**로 관리됩니다
> - 아직 구현 단계가 아닙니다
> - 기존 홈페이지 개발에 **전혀 영향을 주지 않습니다**
> - 나중에 통합 예정이므로 현재는 **학습 및 구상만** 진행합니다

## 🎯 SELPIC-X 개요

**SELPIC-X**는 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고, 이를 다른 고객에게 판매할 수 있도록 하며, 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 투명하게 배분하는 자동화 생산 플랫폼입니다.

### 핵심 가치 제안
- **디자이너**: 자신의 디자인을 판매하여 수익 창출
- **구매자**: 다양한 커스텀 디자인 상품 구매 가능
- **플랫폼**: 중개 수수료 및 제작 마진으로 수익 창출
- **영업사원**: 고객 유입을 통한 수익 배분

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [비즈니스 모델](#비즈니스-모델)
3. [아키텍처 설계](#아키텍처-설계)
4. [데이터 모델](#데이터-모델)
5. [구현 가이드](#구현-가이드)
   - [5.1 핵심 운영 정책 (비즈니스 로직 규정)](#51-핵심-운영-정책-비즈니스-로직-규정)
   - [5.2 구현 단계](#52-구현-단계)
6. [주요 기능](#주요-기능)
7. [API 설계](#api-설계)
8. [수익 배분 시스템](#수익-배분-시스템)
9. [현재 홈페이지 연동 방법](#현재-홈페이지-연동-방법)

---

## 🎯 시스템 개요

### 목적
SELPIC-X는 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고, 이를 다른 고객에게 판매할 수 있도록 하며, 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 투명하게 배분하는 자동화 생산 플랫폼입니다.

### 핵심 가치
- **디자이너**: 자신의 디자인을 판매하여 수익 창출
- **구매자**: 다양한 커스텀 디자인 상품 구매 가능
- **플랫폼**: 중개 수수료 및 제작 마진으로 수익 창출

---

## 💼 비즈니스 모델

### 1. 참여자 역할

#### 디자이너 (Designer/Creator)
- 커스텀 디자인 제작 및 업로드
- 자신의 디자인을 마켓플레이스에 등록
- 판매 수익의 일정 비율을 수령

#### 구매자 (Buyer/Customer)
- 마켓플레이스에서 디자인 선택
- 커스터마이징 가능한 상품 주문
- 완성품 수령

#### 플랫폼 운영자 (Platform)
- 디자인 검수 및 승인
- 주문 접수 및 제작 관리
- 제작 업체와의 연동
- 수익 배분 관리

#### 제작 업체 (Manufacturer)
- 실제 제품 제작
- 품질 관리
- 배송 처리

### 2. 수익 구조

```
판매 가격 = 제작 원가 + 플랫폼 마진 + 디자이너 수익

예시:
- 판매 가격: $20.00
- 제작 원가: $8.00 (40%)
- 플랫폼 마진: $7.00 (35%)
- 디자이너 수익: $5.00 (25%)
```

### 3. 수익 배분 옵션

#### 옵션 1: 고정 비율
- 디자이너: 25%
- 플랫폼: 35%
- 제작 원가: 40%

#### 옵션 2: 등급별 차등 배분
- 신규 디자이너: 20%
- 인기 디자이너 (100+ 판매): 30%
- VIP 디자이너 (500+ 판매): 35%

#### 옵션 3: 협상 가능
- 디자이너가 직접 수익률 설정 (15%~40%)
- 플랫폼이 승인/거부

---

## 🏗️ 아키텍처 설계

### 1. 시스템 구조

```
┌─────────────────────────────────────────────────────────┐
│                    현재 홈페이지                        │
│  (SELPIC - 기존 커스터마이징 및 주문 시스템)            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ API 연동
                   │
┌──────────────────▼──────────────────────────────────────┐
│                    SELPIC-X                              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  디자인      │  │  마켓플레이스 │  │  주문 관리    │ │
│  │  관리 시스템 │  │  시스템      │  │  시스템       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  수익 배분   │  │  제작 연동   │  │  알림 시스템 │ │
│  │  시스템      │  │  시스템      │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  🎯 핵심 운영 가이드라인:                                │
│  • 재무 안정성 (마이너스 잔액 관리)                      │
│  • 투명성 및 무결성 (감사 로그)                          │
│  • 사용자 이해도 (계산식 가독성)                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ API 연동
                   │
┌──────────────────▼──────────────────────────────────────┐
│              제작 업체 시스템 (외부)                    │
│  - 주문 수신                                             │
│  - 제작 진행                                             │
│  - 배송 처리                                             │
└─────────────────────────────────────────────────────────┘
```

### 2. 기술 스택

#### 프론트엔드
- **Next.js 15** (현재 홈페이지와 동일)
- **React 18**
- **TypeScript**
- **Tailwind CSS**

#### 백엔드
- **Next.js API Routes** (현재 구조 유지)
- **Node.js**
- **데이터베이스**: 
  - **PostgreSQL** (주문, 사용자, 디자인 데이터)
  - **MongoDB** (디자인 파일 메타데이터)
  - **Redis** (캐싱 및 세션 관리)

#### 스토리지
- **AWS S3** 또는 **Cloudflare R2** (디자인 파일 저장)
- **IndexedDB** (현재 시스템과 호환)

#### 외부 연동
- **결제 시스템**: Stripe, PayPal (현재 시스템과 동일)
- **제작 업체 API**: RESTful API 또는 Webhook
- **이메일 서비스**: Resend (현재 사용 중)

---

## 📊 데이터 모델

### 1. 디자인 (Design)

```typescript
interface Design {
  id: string
  designerId: string // 디자이너 사용자 ID
  title: string
  description: string
  category: 'sticker' | 'stamp' | 'bundle'
  subcategory?: string
  
  // 디자인 파일
  designFiles: {
    original: string // 원본 파일 URL (S3)
    preview: string // 미리보기 이미지 URL
    thumbnail: string // 썸네일 URL
    formats: {
      png?: string
      svg?: string
      pdf?: string
    }
  }
  
  // 커스터마이징 옵션
  customizationOptions: {
    allowTextEdit: boolean
    allowColorChange: boolean
    allowSizeChange: boolean
    editableFields: string[] // ['text', 'color', 'font', 'size']
  }
  
  // 판매 정보
  pricing: {
    basePrice: number // 기본 가격
    designerRevenueRate: number // 디자이너 수익률 (0.25 = 25%)
    platformRevenueRate: number // 플랫폼 수익률 (0.35 = 35%)
    productionCost: number // 제작 원가
  }
  
  // 상태 관리
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  rejectionReason?: string
  
  // 통계
  stats: {
    views: number
    likes: number
    sales: number
    revenue: number // 디자이너가 받은 총 수익
  }
  
  // 메타데이터
  tags: string[]
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  publishedAt?: Date
}
```

### 2. 디자이너 프로필 (Designer Profile)

```typescript
interface DesignerProfile {
  userId: string // 기존 사용자 ID와 연결
  designerId: string // 고유 디자이너 ID
  
  // 프로필 정보
  displayName: string
  bio?: string
  avatar?: string
  portfolio?: string[] // 포트폴리오 이미지 URL 배열
  
  // 등급 시스템
  tier: 'new' | 'popular' | 'vip' // 신규, 인기, VIP
  revenueRate: number // 기본 수익률 (등급별 차등)
  
  // 통계
  stats: {
    totalDesigns: number
    activeDesigns: number
    totalSales: number
    totalRevenue: number
    averageRating: number
    totalRatings: number
  }
  
  // 결제 정보
  payoutSettings: {
    method: 'bank' | 'paypal' | 'stripe'
    accountInfo: {
      bankName?: string
      accountNumber?: string
      paypalEmail?: string
      stripeAccountId?: string
    }
    minimumPayout: number // 최소 출금 금액
  }
  
  // 승인 상태
  isVerified: boolean
  isActive: boolean
  
  createdAt: Date
  updatedAt: Date
}
```

### 3. 마켓플레이스 상품 (Marketplace Product)

```typescript
interface MarketplaceProduct {
  id: string
  designId: string // 연결된 디자인 ID
  
  // 상품 정보
  name: string
  description: string
  images: string[] // 상품 이미지 배열
  category: string
  subcategory?: string
  
  // 가격 정보
  price: number // 최종 판매 가격
  originalPrice?: number // 원가 (할인 전)
  discount?: number // 할인 금액
  
  // 재고 관리
  inStock: boolean
  stockQuantity?: number // 제작 가능 수량 (제작 업체 연동)
  
  // 판매 통계
  sales: number
  views: number
  rating: number
  reviews: number
  
  // 상태
  status: 'active' | 'inactive' | 'out_of_stock'
  
  createdAt: Date
  updatedAt: Date
}
```

### 4. 커스텀 주문 (Custom Order)

```typescript
interface CustomOrder {
  id: string
  orderId: string // 기존 주문 시스템과 연결
  
  // 디자인 정보
  designId: string
  designerId: string
  
  // 커스터마이징 데이터
  customization: {
    text?: string
    color?: string
    font?: string
    size?: string
    position?: { x: number; y: number }
    customImage?: string // 사용자가 추가한 이미지
  }
  
  // 제작 정보
  production: {
    status: 'pending' | 'approved' | 'in_production' | 'completed' | 'shipped' | 'delivered' | 'cancelled'
    manufacturerId?: string // 제작 업체 ID
    estimatedCompletion?: Date
    actualCompletion?: Date
    trackingNumber?: string
  }
  
  // 수익 배분
  revenue: {
    totalPrice: number
    productionCost: number
    platformRevenue: number
    designerRevenue: number
    payoutStatus: 'pending' | 'processing' | 'paid' | 'failed'
    payoutDate?: Date
  }
  
  createdAt: Date
  updatedAt: Date
}
```

### 5. 수익 배분 기록 (Revenue Share)

```typescript
interface RevenueShare {
  id: string
  orderId: string
  customOrderId: string
  designId: string
  designerId: string
  
  // 금액 정보
  totalRevenue: number
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  
  // 배분 상태
  status: 'pending' | 'calculated' | 'paid' | 'failed'
  
  // 지급 정보
  payout: {
    method: 'bank' | 'paypal' | 'stripe'
    transactionId?: string
    paidAt?: Date
    failureReason?: string
  }
  
  createdAt: Date
  updatedAt: Date
  paidAt?: Date
}
```

---

## 🎨 주요 기능

### 1. 디자이너 대시보드

#### 디자인 업로드
- 이미지 파일 업로드 (PNG, SVG, PDF)
- 디자인 정보 입력 (제목, 설명, 태그)
- 커스터마이징 옵션 설정
- 가격 및 수익률 설정
- 미리보기 생성

#### 디자인 관리
- 업로드한 디자인 목록
- 판매 통계 (조회수, 판매량, 수익)
- 디자인 수정/삭제
- 상태 관리 (초안, 승인 대기, 활성, 비활성)

#### 수익 관리
- 총 수익 조회
- 수익 내역 (주문별 상세)
- 출금 요청
- 출금 내역

### 2. 마켓플레이스

#### 상품 탐색
- 카테고리별 브라우징
- 검색 기능 (제목, 태그, 디자이너)
- 필터링 (가격, 인기순, 최신순, 평점)
- 디자이너 프로필 보기

#### 상품 상세
- 디자인 미리보기
- 커스터마이징 옵션
- 실시간 미리보기
- 디자이너 정보
- 리뷰 및 평점
- 관련 상품 추천

#### 주문 프로세스
- 커스터마이징
- 장바구니 추가
- 주문하기 (기존 주문 시스템 연동)

### 3. 관리자 대시보드

#### 디자인 승인
- 승인 대기 디자인 목록
- 디자인 검토 (이미지, 정보, 가격)
- 승인/거부 처리
- 거부 사유 입력

#### 주문 관리
- 커스텀 주문 목록
- 제작 상태 관리
- 제작 업체 연동
- 배송 추적

#### 수익 관리
- 전체 수익 통계
- 디자이너별 수익
- 배분 내역
- 출금 처리

### 4. 제작 연동 시스템

#### 주문 전송
- 승인된 주문을 제작 업체로 전송
- 제작 파일 생성 (고해상도 이미지, 제작 지시서)
- 제작 업체 API 연동

#### 상태 동기화
- 제작 진행 상태 업데이트
- 배송 정보 동기화
- 완료 알림

---

## 🔌 API 설계

### 1. 디자인 API

```typescript
// 디자인 업로드
POST /api/designs
Body: {
  title: string
  description: string
  category: string
  files: File[]
  customizationOptions: object
  pricing: object
}

// 디자인 목록 조회
GET /api/designs?category=sticker&status=active&page=1&limit=20

// 디자인 상세 조회
GET /api/designs/:id

// 디자인 수정
PUT /api/designs/:id

// 디자인 삭제
DELETE /api/designs/:id

// 디자인 승인 (관리자)
POST /api/designs/:id/approve
POST /api/designs/:id/reject
Body: { reason: string }
```

### 2. 마켓플레이스 API

```typescript
// 상품 목록 조회
GET /api/marketplace/products?category=sticker&sort=popular&page=1

// 상품 상세 조회
GET /api/marketplace/products/:id

// 상품 검색
GET /api/marketplace/search?q=keyword&category=sticker

// 커스터마이징 미리보기 생성
POST /api/marketplace/products/:id/preview
Body: {
  customization: {
    text?: string
    color?: string
    font?: string
  }
}
```

### 3. 주문 API

```typescript
// 커스텀 주문 생성
POST /api/orders/custom
Body: {
  designId: string
  customization: object
  quantity: number
  shippingAddress: object
}

// 커스텀 주문 조회
GET /api/orders/custom/:id

// 제작 상태 업데이트 (제작 업체)
PUT /api/orders/custom/:id/production
Body: {
  status: string
  trackingNumber?: string
}
```

### 4. 수익 배분 API

```typescript
// 수익 배분 계산
POST /api/revenue/calculate
Body: {
  orderId: string
  customOrderId: string
}

// 디자이너 수익 조회
GET /api/revenue/designer/:designerId?startDate=&endDate=

// 출금 요청
POST /api/revenue/payout/request
Body: {
  designerId: string
  amount: number
  method: string
}

// 출금 처리 (관리자)
POST /api/revenue/payout/:id/process
```

---

## 💰 수익 배분 시스템

### 1. 배분 계산 로직

```typescript
function calculateRevenueShare(
  totalPrice: number,
  productionCost: number,
  designerRevenueRate: number,
  platformRevenueRate: number
) {
  // 플랫폼 수익 = 총 가격 - 제작 원가 - 디자이너 수익
  const designerRevenue = totalPrice * designerRevenueRate
  const platformRevenue = totalPrice - productionCost - designerRevenue
  
  // 검증: 총 수익이 총 가격과 일치하는지 확인
  const totalRevenue = productionCost + designerRevenue + platformRevenue
  if (Math.abs(totalRevenue - totalPrice) > 0.01) {
    // 조정 필요
    const difference = totalPrice - totalRevenue
    platformRevenue += difference // 차액을 플랫폼 수익에 추가
  }
  
  return {
    totalPrice,
    productionCost,
    designerRevenue,
    platformRevenue,
    totalRevenue: productionCost + designerRevenue + platformRevenue
  }
}
```

### 2. 배분 시점

#### 옵션 1: 주문 완료 시점
- 주문이 완료되면 즉시 배분 계산
- 디자이너 수익은 출금 요청 시 지급

#### 옵션 2: 배송 완료 시점
- 배송이 완료된 후 배분 계산
- 환불 위험 최소화

#### 옵션 3: 정산 주기
- 주간/월간 정산
- 일정 금액 이상 모이면 자동 출금

### 3. 출금 시스템

```typescript
interface PayoutRequest {
  id: string
  designerId: string
  amount: number
  method: 'bank' | 'paypal' | 'stripe'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  requestedAt: Date
  processedAt?: Date
  transactionId?: string
  failureReason?: string
}
```

---

## 🔗 현재 홈페이지 연동 방법

### 1. 통합 접근 방식

#### 옵션 A: 서브도메인 방식
```
현재 홈페이지: selpic.com
마켓플레이스: marketplace.selpic.com
디자이너 대시보드: designer.selpic.com
```

#### 옵션 B: 경로 기반 방식
```
현재 홈페이지: selpic.com
마켓플레이스: selpic.com/marketplace
디자이너 대시보드: selpic.com/designer
```

#### 옵션 C: 완전 분리 방식
```
현재 홈페이지: selpic.com
새 플랫폼: selpic-marketplace.com
```

**추천: 옵션 B (경로 기반)** - 같은 도메인으로 SEO 및 브랜드 일관성 유지

### 2. 사용자 인증 연동

```typescript
// 기존 사용자 시스템 활용
interface User {
  id: string
  email: string
  // ... 기존 필드
  
  // 새 필드 추가
  isDesigner?: boolean
  designerProfileId?: string
  designerTier?: 'new' | 'popular' | 'vip'
}
```

### 3. 주문 시스템 연동

```typescript
// 기존 주문에 커스텀 주문 정보 추가
interface OrderRecord {
  // ... 기존 필드
  
  // 새 필드 추가
  isCustomOrder?: boolean
  customOrderId?: string
  designId?: string
  designerId?: string
  revenueShare?: {
    designerRevenue: number
    platformRevenue: number
  }
}
```

### 4. 상품 시스템 연동

```typescript
// 기존 Product 인터페이스 확장
interface Product {
  // ... 기존 필드
  
  // 새 필드 추가
  isMarketplaceProduct?: boolean
  designId?: string
  designerId?: string
  sourceDesign?: Design
}
```

### 5. 데이터베이스 구조

```
기존 데이터베이스 (localStorage/Zustand)
├── products (기존 상품)
├── orders (기존 주문)
└── users (기존 사용자)

새 데이터베이스 (PostgreSQL)
├── designs (디자인)
├── designer_profiles (디자이너 프로필)
├── marketplace_products (마켓플레이스 상품)
├── custom_orders (커스텀 주문)
├── revenue_shares (수익 배분)
└── payout_requests (출금 요청)
```

---

## 🚀 5. 구현 가이드

> ⚠️ **중요**: 이 섹션은 **SELPIC-X 시스템 구축 시 반드시 지켜야 할 핵심 가이드라인**입니다.
> - 단순한 아이디어가 아닌 **SELPIC-X의 공식적인 운영 정책**입니다.
> - 모든 구현은 아래 가이드라인을 기반으로 진행되어야 합니다.
> - 이 가이드라인은 SELPIC-X의 재무 안정성, 투명성, 사용자 신뢰를 보장하는 핵심 요소입니다.

### 5.1 SELPIC-X 핵심 운영 가이드라인 (Core Business Logic Guidelines)

**SELPIC-X의 3대 핵심 운영 원칙:**

1. **재무 안정성 (Financial Stability)**: 마이너스 잔액 관리 로직
2. **투명성 및 무결성 (Transparency & Integrity)**: 감사 로그 및 데이터 무결성
3. **사용자 이해도 (User Understanding)**: 파트너 대시보드 계산식 가독성

이 3가지 가이드라인은 SELPIC-X 플랫폼의 신뢰성과 지속 가능성을 보장하는 필수 요소입니다.

#### 가이드라인 1: 마이너스 잔액 관리 로직 (SELPIC-X Settlement Service Policy)

**정책 목적:**
환불 등으로 인해 파트너의 `total_revenue`가 마이너스가 될 경우, 출금을 즉시 차단하고 다음 정산 시 자동으로 상계 처리하여 재무 안정성을 확보합니다.

**구현 규정:**

1. **출금 제한 로직**
   - 파트너의 현재 `total_revenue`가 0 미만(마이너스)일 경우, 프론트엔드 출금 버튼을 비활성화합니다.
   - API 단에서도 `payout_requests` 요청을 차단합니다.
   - 차단 시 명확한 사유 메시지를 반환합니다: "마이너스 잔액으로 인해 출금할 수 없습니다."

2. **이월 공제 로직**
   - 환불 등으로 발생한 마이너스 잔액은 DB에 기록합니다.
   - 다음 매출 발생 시, 시스템은 자동적으로 다음 계산을 수행합니다:
     ```
     신규 정산액 - ABS(기존 마이너스 잔액) = 최종 잔액
     ```
   - 계산 후 잔액을 실시간으로 업데이트합니다.

**데이터베이스 스키마:**

```sql
-- PartnerBalances 테이블
CREATE TABLE partner_balances (
  partner_id VARCHAR(255) NOT NULL,
  partner_type VARCHAR(20) NOT NULL, -- 'designer' | 'agent'
  total_revenue INTEGER NOT NULL DEFAULT 0, -- 총 수익 (센트, 음수 가능)
  current_balance INTEGER NOT NULL DEFAULT 0, -- 현재 잔액 (센트, 음수 가능)
  pending_adjustments INTEGER NOT NULL DEFAULT 0, -- 대기 중인 조정 금액
  last_updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (partner_id, partner_type)
);

-- PayoutRequests 테이블
CREATE TABLE payout_requests (
  id VARCHAR(255) PRIMARY KEY,
  partner_id VARCHAR(255) NOT NULL,
  partner_type VARCHAR(20) NOT NULL,
  requested_amount INTEGER NOT NULL,
  available_balance INTEGER NOT NULL, -- 출금 가능 잔액 (마이너스 가능)
  is_negative_balance BOOLEAN DEFAULT FALSE, -- 마이너스 잔액 여부
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  -- ... 기타 필드
);
```

**구현 예시:**

```typescript
// 출금 요청 생성 시 마이너스 잔액 체크
function createPayoutRequest(partnerBalance: PartnerBalance) {
  const totalRevenue = partnerBalance.totalRevenue || 0
  const isNegativeBalance = totalRevenue < 0
  
  if (isNegativeBalance) {
    return {
      canProcess: false,
      reason: '마이너스 잔액으로 인해 출금할 수 없습니다.'
    }
  }
  // ... 정상 처리
}

// 다음 정산 시 마이너스 잔액 공제
function applyNegativeBalanceDeduction(
  partnerBalance: PartnerBalance,
  newRevenue: number
) {
  const currentBalance = partnerBalance.totalRevenue || 0
  const isNegative = currentBalance < 0
  
  if (isNegative) {
    const negativeAmount = Math.abs(currentBalance) // ABS(마이너스 잔액)
    const deductionAmount = Math.min(negativeAmount, newRevenue)
    const remainingBalance = currentBalance + newRevenue - deductionAmount
    
    return {
      updatedBalance: { ...partnerBalance, totalRevenue: remainingBalance },
      deductionAmount,
      remainingBalance
    }
  }
  // ... 정상 처리
}
```

---

#### 가이드라인 2: 감사 로그 및 데이터 무결성 (SELPIC-X Audit & Integrity Policy)

**정책 목적:**
모든 정산 관련 금액 변동을 추적 가능하고 변경 불가능한(Immutable) 로그로 기록하여 투명성과 무결성을 확보합니다.

**구현 규정:**

1. **테이블 확장**
   - `RevenueShare` 테이블에 동시성 제어를 위한 `version` 필드(INTEGER)를 추가합니다.
   - 낙관적 락(Optimistic Locking)을 구현하여 동시 수정을 방지합니다.

2. **이력 기록**
   - 금액 변동이 발생할 때마다 `SettlementAuditLog` 테이블에 다음 정보를 JSON 스냅샷 형태로 기록합니다:
     - 변경 전 값 (`prev_value`: JSONB)
     - 변경 후 값 (`next_value`: JSONB)
     - 변경 사유 (`change_reason`: TEXT)
     - 실행 시점 (`changed_at`: TIMESTAMP)
     - 변경자 정보 (`changed_by`: VARCHAR)
     - 메타데이터 (`metadata`: JSONB, 선택사항)

**데이터베이스 스키마:**

```sql
-- RevenueShare 테이블에 version 필드 추가
ALTER TABLE revenue_shares ADD COLUMN version INTEGER DEFAULT 1;

-- SettlementAuditLog 테이블
CREATE TABLE settlement_audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'revenue_share', 'settlement_adjustment', etc.
  entity_id VARCHAR(255) NOT NULL,
  entity_version INTEGER NOT NULL, -- RevenueShare의 version 필드와 연동
  
  -- 액션 정보
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'amount_changed', 'status_changed', etc.
  
  -- 변경 내용 (JSON 스냅샷)
  prev_value JSONB NOT NULL, -- 변경 전 전체 값
  next_value JSONB NOT NULL, -- 변경 후 전체 값
  changed_fields JSONB, -- 변경된 필드만 추출 (예: {"designerRevenue": {"old": 400, "new": 500}})
  change_reason TEXT NOT NULL, -- 변경 사유
  
  -- 변경자 정보
  changed_by VARCHAR(255) NOT NULL, -- 사용자 ID 또는 'system'
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- 메타데이터
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB -- 추가 메타데이터 (계산 근거, 실행 컨텍스트 등)
);

-- 인덱스
CREATE INDEX idx_settlement_audit_logs_entity ON settlement_audit_logs(entity_type, entity_id);
CREATE INDEX idx_settlement_audit_logs_version ON settlement_audit_logs(entity_id, entity_version);
CREATE INDEX idx_settlement_audit_logs_changed_at ON settlement_audit_logs(changed_at);
```

**구현 예시:**

```typescript
// 감사 로그 생성
function createSettlementAuditLog(
  entityType: string,
  entityId: string,
  entityVersion: number,
  action: string,
  prevValue: any,
  nextValue: any,
  changeReason: string,
  changedBy: string,
  metadata?: any
) {
  // 변경된 필드만 추출
  const changedFields = extractChangedFields(prevValue, nextValue)
  
  return {
    id: generateId(),
    entityType,
    entityId,
    entityVersion,
    action,
    prev_value: prevValue, // JSON 스냅샷
    next_value: nextValue, // JSON 스냅샷
    changed_fields: changedFields,
    change_reason: changeReason,
    changed_by: changedBy,
    changed_at: new Date(),
    metadata: metadata || {}
  }
}

// 금액 변경 시 version 증가 및 로그 기록
function updateRevenueShare(revenueShare: RevenueShare, updates: any) {
  const oldValue = { ...revenueShare }
  const newValue = { ...revenueShare, ...updates, version: revenueShare.version + 1 }
  
  // 감사 로그 기록
  createSettlementAuditLog(
    'revenue_share',
    revenueShare.id,
    newValue.version,
    'amount_changed',
    oldValue,
    newValue,
    updates.changeReason || 'Revenue share updated',
    updates.changedBy || 'system',
    { calculationDetails: updates.calculationDetails }
  )
  
  return newValue
}
```

---

#### 가이드라인 3: 파트너 대시보드 계산식 가독성 (SELPIC-X UI Transparency Policy)

**정책 목적:**
파트너가 자신의 수익 구조를 즉시 이해할 수 있도록 계산식을 명확하고 읽기 쉬운 형태로 제공합니다.

**구현 규정:**

1. **API 설계**
   - 파트너 수익 상세 API 응답(Response)에 `calculation_formula` 문자열 필드를 포함합니다.
   - 이 필드는 사람이 읽기 쉬운 텍스트 형태로 제공됩니다.

2. **포맷 규정**
   - 계산식은 다음 형식을 따라야 합니다:
     ```
     (판매가: {price} - 제작원가: {cost} - 플랫폼수수료: {platform} - 타파트너수수료: {others}) = 나의수익: {profit}
     ```
   - 모든 금액은 통화 형식으로 표시됩니다 (예: $20.00, ₩20,000).
   - 파트너 타입(디자이너/영업사원)에 따라 "타파트너수수료"가 적절히 변경됩니다.

**API 응답 구조:**

```typescript
// GET /api/production-platform/settlement/dashboard?partnerId=xxx&partnerType=designer
{
  "success": true,
  "data": {
    "partnerId": "designer-123",
    "partnerType": "designer",
    "totalRevenue": 50000,
    "readyRevenue": 20000,
    "revenueDetails": [
      {
        "orderId": "order-001",
        "customOrderId": "custom-001",
        "calculationFormula": {
          "text": "(판매가: $20.00 - 제작원가: $8.00 - 플랫폼수수료: $6.00 - 영업사원수수료: $2.00) = 나의수익: $4.00",
          "components": {
            "totalPrice": 2000,
            "productionCost": 800,
            "platformFee": 600,
            "otherPartnerFee": 200,
            "myRevenue": 400
          },
          "rates": {
            "productionRate": 0.40,
            "platformRate": 0.30,
            "otherPartnerRate": 0.10,
            "myRevenueRate": 0.20
          }
        },
        "breakdown": {
          "production": { "amount": 800, "rate": 0.40, "description": "제작 원가 (고정 40%)" },
          "platform": { "amount": 600, "rate": 0.30, "description": "플랫폼 수익 (30%)" },
          "designer": { "amount": 400, "rate": 0.20, "description": "디자이너 수익 (고정 20%)" },
          "agent": { "amount": 200, "rate": 0.10, "description": "영업사원 수익 (10%)" }
        },
        "calculatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**구현 예시:**

```typescript
// 계산식 생성 함수
function generateCalculationFormula(
  totalPrice: number,
  productionCost: number,
  platformRevenue: number,
  otherPartnerFee: number,
  myRevenue: number,
  partnerType: 'designer' | 'agent',
  currency: string = '$'
): string {
  const formatCurrency = (amount: number) => `${currency}${(amount / 100).toFixed(2)}`
  
  const otherPartnerLabel = partnerType === 'designer' ? '영업사원수수료' : '디자이너수수료'
  const myRevenueLabel = partnerType === 'designer' ? '디자이너수익' : '영업사원수익'
  
  return `(판매가: ${formatCurrency(totalPrice)} - 제작원가: ${formatCurrency(productionCost)} - 플랫폼수수료: ${formatCurrency(platformRevenue)} - ${otherPartnerLabel}: ${formatCurrency(otherPartnerFee)}) = ${myRevenueLabel}: ${formatCurrency(myRevenue)}`
}

// API 응답 생성
function generateRevenueDetailsResponse(revenueShares: RevenueShare[], partnerType: 'designer' | 'agent') {
  return revenueShares.map(rs => {
    const formula = generateCalculationFormula(
      rs.totalRevenue,
      rs.productionCost,
      rs.platformRevenue,
      partnerType === 'designer' ? (rs.agentRevenue || 0) : rs.designerRevenue,
      partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0),
      partnerType
    )
    
    return {
      orderId: rs.orderId,
      customOrderId: rs.customOrderId,
      calculationFormula: {
        text: formula,
        components: {
          totalPrice: rs.totalRevenue,
          productionCost: rs.productionCost,
          platformFee: rs.platformRevenue,
          otherPartnerFee: partnerType === 'designer' ? (rs.agentRevenue || 0) : rs.designerRevenue,
          myRevenue: partnerType === 'designer' ? rs.designerRevenue : (rs.agentRevenue || 0)
        }
      }
    }
  })
}
```

---

### 5.2 구현 단계

### Phase 1: 기반 구축 (2-3주)

#### 1.1 데이터베이스 설계 및 구축
- [ ] PostgreSQL 데이터베이스 생성
- [ ] 테이블 스키마 생성 (Designs, DesignerProfiles, MarketplaceProducts, CustomOrders, RevenueShares)
- [ ] 인덱스 및 관계 설정

#### 1.2 기본 API 구축
- [ ] 디자인 업로드 API
- [ ] 디자인 조회 API
- [ ] 사용자 인증 연동

#### 1.3 디자이너 대시보드 기본 UI
- [ ] 디자인 업로드 페이지
- [ ] 디자인 목록 페이지
- [ ] 기본 레이아웃

### Phase 2: 마켓플레이스 (3-4주)

#### 2.1 마켓플레이스 UI
- [ ] 상품 목록 페이지
- [ ] 상품 상세 페이지
- [ ] 검색 및 필터링
- [ ] 디자이너 프로필 페이지

#### 2.2 커스터마이징 기능
- [ ] 실시간 미리보기
- [ ] 텍스트 편집
- [ ] 색상 변경
- [ ] 크기 조정

#### 2.3 주문 연동
- [ ] 커스텀 주문 생성
- [ ] 기존 주문 시스템과 통합
- [ ] 주문 확인 페이지

### Phase 3: 관리자 기능 (2-3주)

#### 3.1 디자인 승인 시스템
- [ ] 승인 대기 목록
- [ ] 디자인 검토 UI
- [ ] 승인/거부 처리

#### 3.2 주문 관리
- [ ] 커스텀 주문 목록
- [ ] 제작 상태 관리
- [ ] 배송 추적

### Phase 4: 수익 배분 시스템 (2-3주)

#### 4.1 배분 계산 로직
- [ ] 자동 배분 계산
- [ ] 배분 내역 저장
- [ ] 통계 대시보드

#### 4.2 출금 시스템
- [ ] 출금 요청 기능
- [ ] 출금 처리 (관리자)
- [ ] 출금 내역 조회

### Phase 5: 제작 연동 (3-4주)

#### 5.1 제작 업체 API 연동
- [ ] 주문 전송 API
- [ ] 상태 동기화
- [ ] 배송 정보 연동

#### 5.2 자동화
- [ ] 주문 자동 전송
- [ ] 상태 자동 업데이트
- [ ] 알림 시스템

### Phase 6: 최적화 및 테스트 (2-3주)

#### 6.1 성능 최적화
- [ ] 이미지 최적화
- [ ] 캐싱 전략
- [ ] 데이터베이스 쿼리 최적화

#### 6.2 테스트
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 사용자 테스트

#### 6.3 배포
- [ ] 프로덕션 환경 구축
- [ ] 모니터링 설정
- [ ] 문서화

---

## 📝 추가 고려사항

### 1. 법적 고려사항
- 디자인 저작권 관리
- 사용자 약관 및 정책
- 수익 배분 계약서
- 세금 처리

### 2. 보안
- 파일 업로드 보안 (바이러스 스캔, 파일 타입 검증)
- 결제 정보 보호
- 개인정보 보호

### 3. 확장성
- 대용량 트래픽 처리
- 이미지 CDN 활용
- 마이크로서비스 아키텍처 고려

### 4. 사용자 경험
- 직관적인 디자인 업로드
- 빠른 미리보기 생성
- 모바일 반응형 디자인

---

## 📚 참고 자료

### 유사 플랫폼
- **Redbubble**: 디자이너가 디자인을 업로드하고 판매
- **Printful**: Print-on-Demand 서비스
- **Etsy**: 수공예 및 커스텀 상품 마켓플레이스

### 기술 문서
- Next.js 15 공식 문서
- PostgreSQL 최적화 가이드
- AWS S3 파일 업로드 가이드
- Stripe Connect (다중 수취인 결제)

---

---

## 📋 SELPIC-X 핵심 운영 가이드라인 요약

| 가이드라인 | 목적 | 핵심 규정 | SELPIC-X 가치 |
|-----------|------|----------|---------------|
| **1. 마이너스 잔액 관리** | 재무 안정성 확보 | `total_revenue < 0` 시 출금 차단, 다음 정산 시 `신규 정산액 - ABS(마이너스 잔액)` 자동 상계 | 플랫폼의 재무 건전성 보장 |
| **2. 감사 로그 및 무결성** | 투명성 및 추적 가능성 | `RevenueShare.version` 필드 추가, 모든 금액 변동을 `SettlementAuditLog`에 JSON 스냅샷으로 기록 | 완전한 정산 이력 추적 및 신뢰성 확보 |
| **3. 계산식 가독성** | 파트너 이해도 향상 | API 응답에 `calculation_formula` 필드 포함, "(판매가 - 제작원가 - 플랫폼수수료 - 타파트너수수료) = 나의수익" 형식 | 파트너의 수익 구조 즉시 이해 가능 |

---

**프로젝트명**: SELPIC-X  
**작성일**: 2024년  
**버전**: 2.0 (SELPIC-X 핵심 운영 가이드라인 통합)  
**작성자**: AI Assistant


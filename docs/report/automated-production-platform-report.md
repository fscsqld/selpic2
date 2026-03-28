# SELPIC-X 설계 보고서

> **문서 유형**: 설계 보고서  
> **프로젝트명**: SELPIC-X  
> **작성일**: 2026년 1월 3일  
> **버전**: 2.0  
> **상태**: 구상 단계

## 🎯 SELPIC-X 개요

**SELPIC-X**는 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고, 이를 다른 고객에게 판매할 수 있도록 하며, 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 투명하게 배분하는 자동화 생산 플랫폼입니다.

### SELPIC-X 핵심 가이드라인

SELPIC-X는 다음 3가지 핵심 운영 가이드라인을 기반으로 구축됩니다:

1. **재무 안정성 (Financial Stability)**: 마이너스 잔액 관리 로직
2. **투명성 및 무결성 (Transparency & Integrity)**: 감사 로그 및 데이터 무결성
3. **사용자 이해도 (User Understanding)**: 파트너 대시보드 계산식 가독성

---

## 📋 목차

1. [1. SELPIC-X 프로젝트 개요 및 구상](#1-selpic-x----)
2. [2. SELPIC-X 시스템 설계 (기본 버전)](#2-selpic-x----)
3. [3. SELPIC-X 시스템 설계 (확장 버전 v2.0)](#3-selpic-x-----v20)
4. [4. SELPIC-X 수익 분배 로직 상세 설계](#4-selpic-x-----)
5. [5. SELPIC-X 정산 시스템 구현 가이드](#5-selpic-x----)
6. [6. SELPIC-X 데이터베이스 스키마](#6-selpic-x--)

---



# 1. SELPIC-X 프로젝트 개요 및 구상

*SELPIC-X 프로젝트 목표, 핵심 아이디어, 현재 상태*

---



## 📌 중요 사항

⚠️ **이 문서는 SELPIC-X 구상 단계의 학습 자료입니다.**
- 현재 홈페이지 개발과 **완전히 별개**로 관리됩니다
- 아직 구현 단계가 아닙니다
- 나중에 연결 예정이므로 **현재는 학습 및 구상만** 진행합니다
- 기존 홈페이지 개발에 **전혀 영향을 주지 않습니다**

---

## 🎯 SELPIC-X 프로젝트 목표

SELPIC-X는 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고, 이를 다른 고객에게 판매할 수 있도록 하며, 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 투명하게 배분하는 자동화 생산 플랫폼입니다.

---

## 💡 핵심 아이디어

### 1. 비즈니스 모델
```
고객 디자인 → 플랫폼 승인 → 마켓플레이스 등록 → 다른 고객 구매 → 제작 → 배송 → 수익 배분
```

### 2. 참여자
- **디자이너**: 디자인 제작 및 업로드, 수익 수령
- **구매자**: 마켓플레이스에서 디자인 선택 및 구매
- **플랫폼**: 중개 및 제작 관리, 수익 배분
- **제작 업체**: 실제 제품 제작 및 배송

### 3. 수익 구조
```
판매 가격 ($20.00)
├── 제작 원가: $8.00 (40%)
├── 플랫폼 수익: $7.00 (35%)
└── 디자이너 수익: $5.00 (25%)
```

---

## 📚 학습 자료

### 설계 문서
- **파일 위치**: `docs/automated-production-platform-design.md`
- **내용**: 전체 시스템 설계, 아키텍처, 데이터 모델, API 설계 등

### 구현 가이드
- **파일 위치**: `docs/automated-production-platform-implementation-guide.md`
- **내용**: 데이터베이스 스키마, 코드 예제, 구현 단계 등

---

## 🔄 현재 홈페이지와의 관계

### 분리 관리 원칙
1. **독립적 개발**: 현재 홈페이지 코드와 완전히 분리
2. **나중에 통합**: 설계 완료 후 단계적 통합 예정
3. **영향 없음**: 현재 홈페이지 개발에 전혀 영향 없음

### 통합 예정 시점
- 현재 홈페이지 안정화 후
- 설계 검토 및 승인 후
- 단계적 통합 계획 수립 후

---

## 📋 구상 단계 체크리스트

### ✅ 완료된 작업
- [x] 비즈니스 모델 구상
- [x] 시스템 아키텍처 설계
- [x] 데이터 모델 설계
- [x] API 설계
- [x] 수익 배분 시스템 설계
- [x] 구현 가이드 작성

### 🔄 검토 필요 사항
- [ ] 비즈니스 모델 검토
- [ ] 기술 스택 검토
- [ ] 데이터베이스 구조 검토
- [ ] API 설계 검토
- [ ] 수익 배분 비율 검토
- [ ] 제작 업체 연동 방식 검토

### ⏳ 향후 작업 (구현 단계)
- [ ] 데이터베이스 구축
- [ ] 기본 API 개발
- [ ] 디자이너 대시보드 개발
- [ ] 마켓플레이스 개발
- [ ] 관리자 기능 개발
- [ ] 수익 배분 시스템 개발
- [ ] 제작 업체 연동
- [ ] 현재 홈페이지와 통합

---

## 🎓 학습 포인트

### 1. Print-on-Demand (POD) 플랫폼
- Redbubble, Printful 등 유사 플랫폼 연구
- 비즈니스 모델 이해
- 기술적 구조 파악

### 2. 마켓플레이스 시스템
- Etsy, Amazon Handmade 등 참고
- 디자이너-구매자 연결 구조
- 수익 배분 모델

### 3. 제작 자동화
- 주문 자동 전송 시스템
- 제작 상태 추적
- 배송 관리

### 4. 수익 배분 시스템
- 실시간 계산
- 자동 정산
- 출금 관리

---

## 📝 참고 자료

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

## ⚠️ 주의사항

1. **현재는 구상 단계**: 실제 구현은 하지 않음
2. **기존 홈페이지 보호**: 현재 개발 중인 홈페이지에 영향 없음
3. **문서만 관리**: 설계 문서와 학습 자료만 유지
4. **나중에 통합**: 안정화 후 단계적 통합 예정

---

**작성일**: 2024년
**상태**: 구상 단계 (학습 및 설계)
**다음 단계**: 설계 검토 및 승인 후 구현 계획 수립



---



# 2. SELPIC-X 시스템 설계 (기본 버전)

*비즈니스 모델, 아키텍처, 데이터 모델, API 설계, 핵심 운영 가이드라인*

---



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



---



# 3. SELPIC-X 시스템 설계 (확장 버전 v2.0)

*영업사원 모듈, 통합 정산 엔진, 인쇄 자동화 시스템 추가*

---



> ⚠️ **중요**: 이 문서는 **SELPIC-X 구상 단계의 확장 설계 문서**입니다.
> - 현재 홈페이지 개발과 **완전히 별개**로 관리됩니다
> - 아직 구현 단계가 아닙니다
> - 기존 홈페이지 개발에 **전혀 영향을 주지 않습니다**
> - 나중에 통합 예정이므로 현재는 **학습 및 구상만** 진행합니다

## 📋 목차
1. [확장 개요](#확장-개요)
2. [영업사원(Sales Agent) 모듈](#영업사원sales-agent-모듈)
3. [통합 정산 엔진](#통합-정산-엔진)
4. [인쇄 자동화 시스템](#인쇄-자동화-시스템)
5. [확장된 데이터 모델](#확장된-데이터-모델)
6. [API 설계 확장](#api-설계-확장)
7. [파일 구조](#파일-구조)
8. [구현 계획](#구현-계획)

---

## 🎯 확장 개요

### 기존 설계 대비 추가 사항

#### 1. 영업사원(Sales Agent) 모듈
- 외부 영업사원이 고객을 유입시켜 수익을 받는 시스템
- URL 파라미터 `?ref=AGENT_CODE`를 통한 추적
- 영업사원별 수익 배분 및 정산

#### 2. 통합 정산 엔진
- 4자 분배 시스템: 제작원가 / 플랫폼수익 / 디자이너수익 / 영업사원수익
- 실시간 정산 계산
- 자동 정산 처리

#### 3. 인쇄 자동화 시스템
- Fabric.js JSON 데이터를 고해상도 PDF로 변환
- 제작 업체 전송용 파일 생성
- 배치 처리 지원

---

## 👥 영업사원(Sales Agent) 모듈

### 비즈니스 모델

```
고객 유입 → 영업사원 추천 코드 → 주문 완료 → 수익 배분
```

### 역할 및 책임

#### 영업사원 (Sales Agent)
- 고객에게 플랫폼 추천
- 고유 추천 코드 보유
- 추천한 고객의 주문으로부터 수익 수령
- 정산 내역 조회 및 출금 요청

#### 플랫폼
- 영업사원 등록 및 관리
- 추천 코드 생성 및 검증
- 주문 추적 및 귀속
- 수익 배분 계산 및 정산

### 추천 추적 시스템 (Referral Tracker)

#### URL 파라미터 방식
```
https://selpic.com/marketplace/product-123?ref=AGENT_ABC123
```

#### 추적 프로세스
1. 고객이 추천 링크로 접속
2. `ref` 파라미터를 쿠키/세션에 저장 (30일 유효)
3. 주문 생성 시 저장된 `ref` 코드 확인
4. 해당 영업사원에게 주문 귀속
5. 수익 배분 계산 시 영업사원 수익 포함

#### 쿠키 기반 추적
- 쿠키명: `production_platform_ref`
- 유효기간: 30일
- 도메인: 전체 도메인 공유

---

## 💰 통합 정산 엔진

### 4자 분배 구조

```
판매 가격 ($20.00)
├── 제작 원가: $8.00 (40%)
├── 플랫폼 수익: $6.00 (30%)
├── 디자이너 수익: $4.00 (20%)
└── 영업사원 수익: $2.00 (10%)
```

### 분배 비율 설정

#### 기본 비율 (영업사원 없을 때)
- 제작 원가: 40%
- 플랫폼 수익: 40% (영업사원 수익을 플랫폼이 가져감)
- 디자이너 수익: 20%
- 영업사원 수익: 0%

#### 영업사원 있을 때
- 제작 원가: 40% (고정)
- 플랫폼 수익: 30% (40% → 30%)
- 디자이너 수익: 20% (고정)
- 영업사원 수익: 10% (신규)

### 🆕 이원화된 수익 분배 프로세스

#### 핵심 로직

**1. agentId 유무에 따른 분배 결정**
```typescript
if (agentId) {
  // 영업사원이 있는 경우: 4자 분배
  // 제작(40%) + 플랫폼(30%) + 디자이너(20%) + 영업사원(10%)
} else {
  // 영업사원이 없는 경우: 3자 분배 (플랫폼 수익 증가)
  // 제작(40%) + 플랫폼(40%) + 디자이너(20%)
}
```

**2. 상품별 개별 판단**
- 한 주문에 여러 상품이 포함될 수 있음
- 각 상품마다 별도의 `agentId`를 가질 수 있음
- 상품 A는 영업사원 추천, 상품 B는 직접 방문 가능
- 각 상품별로 독립적으로 수익 분배 계산

#### 분배 프로세스 흐름

```
주문 생성
  ↓
각 주문 아이템별 처리
  ↓
아이템별 agentId 확인
  ↓
┌─────────────────┬─────────────────┐
│ agentId 있음    │ agentId 없음     │
│ (4자 분배)      │ (3자 분배)       │
├─────────────────┼─────────────────┤
│ 제작: 40%       │ 제작: 40%       │
│ 플랫폼: 30%     │ 플랫폼: 40% ⬆️   │
│ 디자이너: 20%   │ 디자이너: 20%   │
│ 영업사원: 10%   │ 영업사원: 0%     │
└─────────────────┴─────────────────┘
  ↓
각 아이템별 수익 배분 기록
  ↓
주문 전체 수익 집계
```

### 🆕 복합 주문 처리 예시

#### 시나리오: 한 주문에 여러 상품

```
주문 #12345
├── 상품 A (스티커) - $20.00
│   └── agentId: AGENT_ABC123 (영업사원 추천)
│   └── 분배: 제작($8) + 플랫폼($6) + 디자이너($4) + 영업사원($2)
│
├── 상품 B (스탬프) - $15.00
│   └── agentId: null (직접 방문)
│   └── 분배: 제작($6) + 플랫폼($6) + 디자이너($3) + 영업사원($0)
│
└── 상품 C (번들) - $30.00
    └── agentId: AGENT_XYZ789 (다른 영업사원 추천)
    └── 분배: 제작($12) + 플랫폼($9) + 디자이너($6) + 영업사원($3)

총 주문 금액: $65.00
총 제작 원가: $26.00 (40%)
총 플랫폼 수익: $21.00 (32.3%)
총 디자이너 수익: $13.00 (20%)
총 영업사원 수익: $5.00 (7.7%)
  ├── AGENT_ABC123: $2.00
  └── AGENT_XYZ789: $3.00
```

### 🆕 영업사원 수수료 설정

#### 개별 영업사원 수수료
- 기본 수수료: 10%
- 등급별 차등 수수료 가능:
  - Bronze: 8%
  - Silver: 10%
  - Gold: 12%
  - Platinum: 15%

#### 수수료 적용 우선순위
1. 상품별 `agentId` 확인
2. 해당 영업사원의 `revenueRate` 조회
3. 수수료 계산 및 배분

### 정산 시점

#### 옵션 1: 주문 완료 시점
- 결제 완료 즉시 정산 계산
- 디자이너/영업사원 수익은 출금 요청 시 지급

#### 옵션 2: 배송 완료 시점
- 배송 완료 후 정산 계산
- 환불 위험 최소화

#### 옵션 3: 정산 주기
- 주간/월간 정산
- 일정 금액 이상 모이면 자동 출금

**추천: 옵션 2 (배송 완료 시점)**

---

## 🖨️ 인쇄 자동화 시스템

### Fabric.js 통합

#### 입력 데이터
```json
{
  "version": "5.3.0",
  "objects": [
    {
      "type": "text",
      "text": "Custom Text",
      "fontSize": 48,
      "fill": "#000000",
      "left": 100,
      "top": 100
    },
    {
      "type": "image",
      "src": "https://example.com/image.png",
      "left": 200,
      "top": 200,
      "width": 300,
      "height": 300
    }
  ]
}
```

#### 출력 형식
- 고해상도 PDF (300 DPI)
- 제작 업체 전송용 포맷
- CMYK 색상 공간 지원

### 변환 프로세스

1. **Fabric.js JSON 파싱**
   - JSON 데이터 검증
   - 객체 구조 분석

2. **Canvas 렌더링**
   - 고해상도 Canvas 생성 (300 DPI)
   - Fabric.js 객체를 Canvas에 렌더링
   - 이미지 리소스 로드 및 배치

3. **PDF 생성**
   - Canvas를 PDF로 변환
   - 메타데이터 추가 (주문번호, 디자인 ID 등)
   - 제작 지시서 포함

4. **파일 저장 및 전송**
   - S3/클라우드 스토리지에 저장
   - 제작 업체 API로 전송
   - 주문 상태 업데이트

### 기술 스택

- **Fabric.js**: 클라이언트 사이드 디자인 편집
- **node-canvas**: 서버 사이드 Canvas 렌더링
- **pdfkit**: PDF 생성
- **sharp**: 이미지 처리 및 최적화

---

## 📊 확장된 데이터 모델

### 1. SalesAgent (영업사원)

```typescript
interface SalesAgent {
  id: string
  agentCode: string // 고유 추천 코드 (예: AGENT_ABC123)
  userId?: string // 연결된 사용자 ID (선택사항)
  
  // 프로필 정보
  name: string
  email: string
  phone?: string
  company?: string
  
  // 수익 정보
  revenueRate: number // 수익률 (기본값: 0.10 = 10%)
  minimumPayout: number // 최소 출금 금액
  
  // 통계
  stats: {
    totalReferrals: number // 총 추천 수
    totalOrders: number // 총 주문 수
    totalRevenue: number // 총 수익
    pendingRevenue: number // 대기 중인 수익
    paidRevenue: number // 지급된 수익
  }
  
  // 결제 정보
  payoutSettings: {
    method: 'bank' | 'paypal' | 'stripe'
    accountInfo: Record<string, any>
  }
  
  // 상태
  status: 'active' | 'inactive' | 'suspended'
  isVerified: boolean
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
  lastPayoutAt?: Date
}
```

### 2. ReferralTracker (추천 추적)

```typescript
interface ReferralTracker {
  id: string
  agentCode: string
  sessionId: string // 브라우저 세션 ID
  userId?: string // 로그인한 사용자 ID
  
  // 추적 정보
  referrerUrl?: string // 추천 링크 URL
  landingPage: string // 첫 방문 페이지
  ipAddress?: string
  userAgent?: string
  
  // 상태
  isActive: boolean
  expiresAt: Date // 만료 시간 (30일 후)
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
}
```

### 3. 확장된 CustomOrder

```typescript
interface CustomOrder {
  id: string
  orderId: string
  designId: string
  designerId: string
  
  // 🆕 영업사원 정보
  agentId?: string
  agentCode?: string
  referralTrackerId?: string
  
  // 커스터마이징 데이터
  customization: {
    text?: string
    color?: string
    font?: string
    size?: string
    position?: { x: number; y: number }
    customImage?: string
    fabricJson?: string // 🆕 Fabric.js JSON 데이터
  }
  
  // 제작 정보
  production: {
    status: 'pending' | 'approved' | 'in_production' | 'completed' | 'shipped' | 'delivered' | 'cancelled'
    manufacturerId?: string
    estimatedCompletion?: Date
    actualCompletion?: Date
    trackingNumber?: string
    printFileUrl?: string // 🆕 인쇄용 PDF 파일 URL
  }
  
  // 수익 배분 (4자 분배)
  revenue: {
    totalPrice: number
    productionCost: number
    platformRevenue: number
    designerRevenue: number
    agentRevenue: number // 🆕 영업사원 수익
    payoutStatus: 'pending' | 'processing' | 'paid' | 'failed'
    payoutDate?: Date
  }
  
  createdAt: Date
  updatedAt: Date
}
```

### 4. 확장된 RevenueShare

```typescript
interface RevenueShare {
  id: string
  orderId: string
  customOrderId: string
  designId: string
  designerId: string
  
  // 🆕 영업사원 정보
  agentId?: string
  agentCode?: string
  
  // 금액 정보 (4자 분배)
  totalRevenue: number
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  agentRevenue: number // 🆕 영업사원 수익
  
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

### 5. PrintJob (인쇄 작업)

```typescript
interface PrintJob {
  id: string
  orderId: string
  customOrderId: string
  
  // 입력 데이터
  fabricJson: string // Fabric.js JSON 데이터
  designSpecs: {
    width: number // mm
    height: number // mm
    dpi: number // 기본값: 300
    colorSpace: 'RGB' | 'CMYK'
  }
  
  // 출력 파일
  printFileUrl?: string // 생성된 PDF URL
  printFileSize?: number // 파일 크기 (bytes)
  
  // 상태
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}
```

---

## 🔌 API 설계 확장

### 1. 영업사원 API

```typescript
// 영업사원 등록
POST /api/production-platform/agents
Body: {
  name: string
  email: string
  phone?: string
  company?: string
  payoutSettings: object
}

// 영업사원 목록 조회
GET /api/production-platform/agents?status=active&page=1&limit=20

// 영업사원 상세 조회
GET /api/production-platform/agents/:id

// 영업사원 수정
PUT /api/production-platform/agents/:id

// 추천 코드 검증
GET /api/production-platform/agents/validate-code?code=AGENT_ABC123

// 영업사원 통계 조회
GET /api/production-platform/agents/:id/stats?startDate=&endDate=
```

### 2. 추천 추적 API

```typescript
// 추천 링크 클릭 추적
POST /api/production-platform/referrals/track
Body: {
  agentCode: string
  landingPage: string
  referrerUrl?: string
}
Response: {
  sessionId: string
  expiresAt: Date
}

// 세션에서 추천 코드 조회
GET /api/production-platform/referrals/session/:sessionId

// 주문에 추천 코드 연결
POST /api/production-platform/referrals/attach-to-order
Body: {
  orderId: string
  sessionId: string
}
```

### 3. 통합 정산 API

```typescript
// 정산 계산 (4자 분배)
POST /api/production-platform/revenue/calculate
Body: {
  orderId: string
  customOrderId: string
  totalPrice: number
  agentCode?: string
}
Response: {
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  agentRevenue: number
  total: number
}

// 정산 내역 조회
GET /api/production-platform/revenue/shares?agentId=&designerId=&status=

// 영업사원 수익 조회
GET /api/production-platform/revenue/agent/:agentId?startDate=&endDate=

// 출금 요청
POST /api/production-platform/revenue/payout/request
Body: {
  agentId?: string
  designerId?: string
  amount: number
  method: string
}
```

### 4. 인쇄 자동화 API

```typescript
// 인쇄 작업 생성
POST /api/production-platform/print/jobs
Body: {
  orderId: string
  customOrderId: string
  fabricJson: string
  designSpecs: {
    width: number
    height: number
    dpi?: number
    colorSpace?: 'RGB' | 'CMYK'
  }
}
Response: {
  jobId: string
  status: 'pending'
}

// 인쇄 작업 상태 조회
GET /api/production-platform/print/jobs/:jobId

// 인쇄 파일 다운로드
GET /api/production-platform/print/jobs/:jobId/download

// 인쇄 작업 재시도
POST /api/production-platform/print/jobs/:jobId/retry
```

---

## 📁 파일 구조

### 독립적인 프로덕션 플랫폼 구조

```
apps/
└── production-platform/                    # 🆕 완전히 분리된 디렉토리
    ├── app/                                 # Next.js App Router
    │   ├── (platform)/                     # 플랫폼 전용 라우트 그룹
    │   │   ├── designer/                   # 디자이너 대시보드
    │   │   │   ├── dashboard/
    │   │   │   ├── designs/
    │   │   │   └── revenue/
    │   │   ├── agent/                      # 🆕 영업사원 대시보드
    │   │   │   ├── dashboard/
    │   │   │   ├── referrals/
    │   │   │   └── revenue/
    │   │   ├── marketplace/                # 마켓플레이스
    │   │   │   ├── products/
    │   │   │   └── [id]/
    │   │   └── admin/                      # 관리자
    │   │       ├── agents/                 # 🆕 영업사원 관리
    │   │       ├── orders/
    │   │       ├── revenue/
    │   │       └── print-jobs/             # 🆕 인쇄 작업 관리
    │   └── api/                            # API Routes
    │       └── production-platform/
    │           ├── agents/                 # 🆕 영업사원 API
    │           ├── referrals/              # 🆕 추천 추적 API
    │           ├── revenue/                # 통합 정산 API
    │           └── print/                  # 🆕 인쇄 자동화 API
    ├── lib/
    │   ├── types/
    │   │   └── production-platform.ts      # 확장된 타입 정의
    │   ├── stores/
    │   │   └── productionPlatformStore.ts # Zustand Store (확장)
    │   ├── services/
    │   │   ├── revenueService.ts          # 🆕 통합 정산 서비스
    │   │   ├── referralService.ts          # 🆕 추천 추적 서비스
    │   │   └── printService.ts             # 🆕 인쇄 자동화 서비스
    │   └── utils/
    │       ├── referralTracker.ts          # 🆕 추천 추적 유틸리티
    │       └── fabricConverter.ts          # 🆕 Fabric.js 변환 유틸리티
    ├── components/
    │   ├── designer/                       # 디자이너 컴포넌트
    │   ├── agent/                          # 🆕 영업사원 컴포넌트
    │   ├── marketplace/                    # 마켓플레이스 컴포넌트
    │   └── print/                          # 🆕 인쇄 관련 컴포넌트
    ├── server/
    │   └── actions/                        # Server Actions
    │       ├── revenueActions.ts           # 🆕 정산 액션
    │       ├── referralActions.ts          # 🆕 추천 추적 액션
    │       └── printActions.ts             # 🆕 인쇄 액션
    └── prisma/                             # Prisma 스키마 (선택사항)
        └── schema.prisma
```

### 기존 홈페이지와의 통합 포인트

```
selpic2/                                    # 기존 홈페이지
├── app/                                    # 기존 앱
├── components/                             # 기존 컴포넌트
└── lib/                                    # 기존 라이브러리

apps/
└── production-platform/                    # 🆕 독립적인 프로덕션 플랫폼
    └── ... (위 구조)

# 통합 시점에 연결
- 주문 시스템 연동
- 사용자 인증 공유
- 결제 시스템 공유
```

---

## 🚀 구현 계획

### Phase 1: 기반 구축 (2-3주)

#### 1.1 파일 구조 생성
- [ ] `apps/production-platform` 디렉토리 생성
- [ ] 기본 Next.js 프로젝트 설정
- [ ] 타입 정의 파일 생성

#### 1.2 데이터베이스 스키마
- [ ] SalesAgent 테이블
- [ ] ReferralTracker 테이블
- [ ] PrintJob 테이블
- [ ] 기존 테이블 확장 (CustomOrder, RevenueShare)

#### 1.3 기본 API
- [ ] 영업사원 CRUD API
- [ ] 추천 추적 API
- [ ] 정산 계산 API

### Phase 2: 영업사원 모듈 (2-3주)

#### 2.1 영업사원 대시보드
- [ ] 영업사원 등록/로그인
- [ ] 추천 코드 생성 및 관리
- [ ] 추천 링크 생성 도구
- [ ] 통계 대시보드

#### 2.2 추천 추적 시스템
- [ ] URL 파라미터 파싱
- [ ] 쿠키/세션 저장
- [ ] 주문 귀속 로직
- [ ] 추적 대시보드

#### 2.3 수익 관리
- [ ] 수익 내역 조회
- [ ] 출금 요청
- [ ] 출금 내역

### Phase 3: 통합 정산 엔진 (2-3주)

#### 3.1 4자 분배 로직
- [ ] 정산 계산 서비스
- [ ] 비율 설정 관리
- [ ] 검증 로직

#### 3.2 정산 처리
- [ ] 자동 정산 트리거
- [ ] 정산 내역 저장
- [ ] 알림 시스템

#### 3.3 출금 시스템
- [ ] 출금 요청 처리
- [ ] 출금 승인 (관리자)
- [ ] 결제 처리

### Phase 4: 인쇄 자동화 (3-4주)

#### 4.1 Fabric.js 통합
- [ ] JSON 파싱
- [ ] Canvas 렌더링
- [ ] 이미지 처리

#### 4.2 PDF 생성
- [ ] 고해상도 PDF 변환
- [ ] 메타데이터 추가
- [ ] 제작 지시서 생성

#### 4.3 파일 관리
- [ ] 클라우드 스토리지 저장
- [ ] 제작 업체 전송
- [ ] 파일 관리 API

### Phase 5: 통합 및 테스트 (2-3주)

#### 5.1 기존 시스템 통합
- [ ] 주문 시스템 연동
- [ ] 사용자 인증 공유
- [ ] 결제 시스템 연동

#### 5.2 테스트
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] E2E 테스트

#### 5.3 배포
- [ ] 프로덕션 환경 구축
- [ ] 모니터링 설정
- [ ] 문서화

---

## 📝 추가 고려사항

### 1. 보안
- 추천 코드 검증 및 보안
- 영업사원 인증 및 권한 관리
- 수익 정보 보호

### 2. 성능
- 인쇄 작업 비동기 처리
- 대용량 PDF 생성 최적화
- 캐싱 전략

### 3. 확장성
- 영업사원 등급 시스템
- 차등 수익률 적용
- 추천 네트워크 (다단계 추천)

### 4. 모니터링
- 추천 링크 클릭 추적
- 전환율 분석
- 수익 통계 대시보드

---

## 🔗 관련 문서

- **기본 설계 문서**: `docs/automated-production-platform-design.md`
- **구현 가이드**: `docs/automated-production-platform-implementation-guide.md`
- **통합 보고서**: `docs/report/automated-production-platform-report.md`

---

**작성일**: 2024년
**버전**: 2.0 (확장 버전)
**상태**: 구상 단계 (학습 및 설계)



---



# 4. SELPIC-X 수익 분배 로직 상세 설계

*이원화된 분배 프로세스, 상품별 개별 판단, 복합 주문 처리*

---



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



---



# 5. SELPIC-X 정산 시스템 구현 가이드

*핵심 운영 가이드라인, 데이터베이스 스키마, 코드 예제, 구현 단계*

---



## 📋 개요

SELPIC-X 플랫폼의 핵심 정산 및 분쟁 시스템 구현 가이드입니다.

이 문서는 SELPIC-X의 3대 핵심 운영 가이드라인을 포함합니다:
1. **재무 안정성**: 마이너스 잔액 관리 로직
2. **투명성 및 무결성**: 감사 로그 및 데이터 무결성
3. **사용자 이해도**: 파트너 대시보드 계산식 가독성

---

## 🎯 핵심 비즈니스 룰

### 1. 수익 분배 고도화 (Option A)

#### 기본 구조
- 제작 원가: 40% (고정)
- 디자이너: 20% (고정)
- 플랫폼: 최대 40%
- 영업사원: 10%

#### 이원화 로직
- `agentId` 없음: 영업사원 몫 10%는 플랫폼 수익에 합산 (플랫폼 40%)
- `agentId` 있음: 4자 분배 (플랫폼 30%, 영업사원 10%)

#### 중복 수익 허용
- `designerId === agentId`인 경우:
  - 디자이너 수익: 20%
  - 영업사원 수익: 10%
  - **총 수익: 30%**
  - 플랫폼 수익: 30%

### 2. 정산 유예 및 구매 확정

#### 프로세스
1. 주문 상태가 `DELIVERED` (배송 완료)
2. 7일간 `PENDING` 상태 유지
3. 사용자가 `CONFIRMED` (구매 확정) 또는 7일 경과
4. `payoutStatus`를 `READY`로 전환

#### 분쟁 처리
- `DISPUTE` 발생 시 정산 프로세스 즉시 중지 (`FROZEN`)

### 3. 환불 및 환수(Clawback)

#### 정산 전 환불
- `RevenueShare` 레코드를 `CANCELLED` 처리

#### 정산 후 환불
- `SettlementAdjustment` 레코드 생성
- 차기 정산금에서 차감 (마이너스 정산 지원)

### 4. 정산 안전장치

- 모든 금액 계산은 정수(센트 단위)로 처리
- 우수리 금액은 플랫폼 수익에 합산

---

## 📁 파일 구조

```
lib/
└── services/
    └── settlement-service.ts          # 정산 서비스 (핵심 로직)

app/
└── api/
    └── production-platform/
        └── settlement/
            └── dashboard/
                └── route.ts          # 정산 대시보드 API

docs/
├── database-schema-settlement.md     # 데이터베이스 스키마
└── settlement-system-implementation.md  # 구현 가이드 (이 문서)
```

---

## 🔧 주요 함수

### 1. 수익 분배 계산

```typescript
calculateRevenueAdvanced(
  request: CalculateRevenueRequest,
  designer?: DesignerProfile,
  agent?: SalesAgent
): RevenueCalculation
```

**기능:**
- agentId 유무에 따라 3자/4자 분배 자동 결정
- 중복 수익 허용 (designerId === agentId)
- 정수 기반 계산으로 소수점 오차 방지

### 2. 정산 상태 업데이트

```typescript
updateSettlementStatusOnDelivery(
  revenueShare: RevenueShare,
  orderStatus: OrderStatus,
  deliveredAt: Date
): SettlementStatus
```

**기능:**
- 배송 완료 후 7일 유예 기간 관리
- 구매 확정 또는 7일 경과 시 READY 상태 전환
- 분쟁 발생 시 FROZEN 상태

### 3. 환불 처리

```typescript
processRefund(
  revenueShare: RevenueShare,
  refundAmount: number,
  refundReason: string,
  refundedAt: Date
): { updatedRevenueShare, adjustment? }
```

**기능:**
- 정산 전 환불: CANCELLED 처리
- 정산 후 환불: Adjustment 레코드 생성

### 4. 정산 대시보드 생성

```typescript
generateSettlementDashboard(
  partnerId: string,
  partnerType: 'designer' | 'agent',
  revenueShares: RevenueShare[],
  adjustments: SettlementAdjustment[]
): SettlementDashboard
```

**기능:**
- 파트너별 수익 집계
- 조정 금액 계산
- 최종 정산 가능 금액 계산

---

## 📊 API 엔드포인트

### GET /api/production-platform/settlement/dashboard

**Query Parameters:**
- `partnerId`: 파트너 ID (필수)
- `partnerType`: 'designer' | 'agent' (필수)
- `startDate`: 시작 날짜 (선택)
- `endDate`: 종료 날짜 (선택)

**Response:**
```json
{
  "success": true,
  "data": {
    "partnerId": "designer-123",
    "partnerType": "designer",
    "totalRevenue": 50000,
    "paidRevenue": 30000,
    "pendingRevenue": 10000,
    "readyRevenue": 10000,
    "totalAdjustments": -2000,
    "pendingAdjustments": -2000,
    "appliedAdjustments": 0,
    "availableForPayout": 8000,
    "stats": {
      "totalOrders": 50,
      "totalRevenueShares": 50,
      "pendingCount": 10,
      "readyCount": 10,
      "paidCount": 30,
      "frozenCount": 0,
      "cancelledCount": 0
    },
    "adjustments": [...]
  }
}
```

### POST /api/production-platform/settlement/dashboard/summary

**Body:**
```json
{
  "partnerIds": ["designer-123", "designer-456"],
  "partnerType": "designer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboards": [...],
    "summary": {
      "totalPartners": 2,
      "totalRevenue": 100000,
      "totalReadyRevenue": 20000,
      "totalAdjustments": -4000
    }
  }
}
```

---

## 🔄 상태 전이 예시

### 정상 흐름
```
주문 생성 → 배송 완료 (DELIVERED)
  ↓
PENDING (7일 유예)
  ↓
구매 확정 또는 7일 경과
  ↓
READY
  ↓
정산 처리
  ↓
PAID
```

### 분쟁 발생
```
PENDING/READY → DISPUTE 발생
  ↓
FROZEN (정산 중지)
  ↓
분쟁 해결 후
  ↓
READY 또는 CANCELLED
```

### 환불 발생
```
PENDING/READY → 환불 요청
  ↓
CANCELLED

또는

PAID → 환불 요청
  ↓
Adjustment 생성 (차감 예정액)
```

---

## 💡 사용 예시

### 1. 수익 분배 계산

```typescript
import { calculateRevenueAdvanced } from '@/lib/services/settlement-service'

const revenue = calculateRevenueAdvanced({
  orderId: 'order-123',
  customOrderId: 'custom-001',
  totalPrice: 20.00,
  productionCost: 8.00,
  designerRevenueRate: 0.20,
  agentId: 'agent-abc123',
  agentRevenueRate: 0.10
}, designer, agent)

// 결과:
// {
//   distributionType: 'four-way',
//   productionCost: 8.00,
//   platformRevenue: 6.00,
//   designerRevenue: 4.00,
//   agentRevenue: 2.00
// }
```

### 2. 정산 상태 업데이트

```typescript
import { updateSettlementStatusOnDelivery } from '@/lib/services/settlement-service'

const newStatus = updateSettlementStatusOnDelivery(
  revenueShare,
  'DELIVERED',
  new Date()
)

// 배송 완료 후 7일 미만: PENDING
// 배송 완료 후 7일 경과: READY
```

### 3. 환불 처리

```typescript
import { processRefund } from '@/lib/services/settlement-service'

const result = processRefund(
  revenueShare,
  10.00,
  'customer_request',
  new Date()
)

// 정산 전: { updatedRevenueShare: { status: 'CANCELLED' } }
// 정산 후: { updatedRevenueShare, adjustment: { amount: -500, ... } }
```

### 4. 대시보드 조회

```typescript
// API 호출
const response = await fetch(
  '/api/production-platform/settlement/dashboard?partnerId=designer-123&partnerType=designer'
)
const { data } = await response.json()

// data.availableForPayout: 최종 정산 가능 금액
// data.totalAdjustments: 총 차감 예정액
```

---

## 🛡️ 안전장치

### 1. 정수 기반 계산
- 모든 금액을 센트 단위(정수)로 저장
- 소수점 오차 방지

### 2. 합계 검증
- 계산 후 총합이 정확히 일치하는지 검증
- 우수리 금액은 플랫폼 수익에 합산

### 3. 상태 검증
- 정산 처리 전 상태 검증
- 분쟁 중인 주문은 정산 불가

### 4. 환불 금액 검증
- 환불 금액이 총 수익을 초과하지 않도록 검증

---

## 📋 구현 시 필수 요구사항 (비즈니스 정책)

### 1. 감사 로그(Audit Log) - 로그 무결성 보장

**요구사항:**
- 모든 수익 배분, 정산 상태 변경, 수정 내역은 변경 불가능한(Immutable) 로그로 저장
- 투명성 확보를 위한 완전한 감사 추적(Audit Trail) 제공
- **🆕 로그 무결성**: `RevenueShare` 테이블에 `version` 필드 추가하여 버전 관리

**구현 방법:**
- `settlement_audit_logs` 테이블 생성 (Append-only 구조)
- `RevenueShare` 테이블에 `version` 필드 추가
- 금액 변경이 일어날 때마다 이전 값과 새 값, 변경 사유를 JSON 형태로 기록
- 모든 정산 관련 작업에 대해 자동 로그 기록
- 로그는 수정/삭제 불가능하도록 설계

**DB 스키마 반영:**
```sql
-- RevenueShare 테이블에 version 필드 추가
ALTER TABLE revenue_shares ADD COLUMN version INTEGER DEFAULT 1;

-- SettlementAuditLog 테이블 (로그 무결성)
CREATE TABLE settlement_audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'revenue_share', 'settlement_adjustment', etc.
  entity_id VARCHAR(255) NOT NULL,
  entity_version INTEGER NOT NULL, -- RevenueShare의 version 필드와 연동
  
  -- 액션 정보
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'refunded', 'amount_changed', etc.
  
  -- 변경 내용 (JSON 형태)
  old_value JSONB NOT NULL, -- 변경 전 전체 값
  new_value JSONB NOT NULL, -- 변경 후 전체 값
  changed_fields JSONB, -- 변경된 필드만 추출 (예: {"designerRevenue": {"old": 400, "new": 500}})
  change_reason TEXT NOT NULL, -- 변경 사유
  
  -- 변경자 정보
  changed_by VARCHAR(255) NOT NULL, -- 사용자 ID 또는 'system'
  changed_at TIMESTAMP DEFAULT NOW(),
  
  -- 메타데이터
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- 계산 근거 (투명한 대시보드용)
  calculation_details JSONB
);

CREATE INDEX idx_settlement_audit_logs_entity ON settlement_audit_logs(entity_type, entity_id);
CREATE INDEX idx_settlement_audit_logs_version ON settlement_audit_logs(entity_id, entity_version);
CREATE INDEX idx_settlement_audit_logs_changed_at ON settlement_audit_logs(changed_at);
CREATE INDEX idx_settlement_audit_logs_action ON settlement_audit_logs(action);
```

**정산 로직 반영:**
- 모든 `RevenueShare` 상태 변경 시 `version` 증가 및 로그 기록
- 금액 변경 시 이전 값과 새 값을 JSON으로 비교하여 변경된 필드만 추출
- 모든 `SettlementAdjustment` 생성 시 로그 기록
- 수익 분배 계산 시 계산 근거 저장

**정산 로직 반영:**
- 모든 `RevenueShare` 상태 변경 시 자동 로그 기록
- 모든 `SettlementAdjustment` 생성 시 자동 로그 기록
- 환불 처리 시 상세 로그 기록
- 수익 분배 계산 시 계산 근거 로그 기록

### 2. 마이너스 잔액 허용 - 출금 요청 처리 로직

**요구사항:**
- 환불액이 현재 잔액보다 클 경우, 해당 파트너의 잔액을 마이너스로 기록
- 다음 정산 시 최우선으로 차감(이월 정산)
- **🆕 출금 요청 처리**: `payout_requests` 처리 시 마이너스 잔액 체크 및 출금 버튼 비활성화

**구현 방법:**
- `SettlementAdjustment`의 `amount` 필드가 음수 허용
- `payout_requests` 테이블 생성
- 출금 요청 시 마이너스 잔액 체크
- 다음 정산 시 `ABS(마이너스 잔액)`만큼 공제 후 잔액 업데이트
- 대시보드에서 마이너스 잔액 표시 및 출금 버튼 비활성화

**DB 스키마 반영:**
```sql
-- PartnerBalances 테이블 (마이너스 잔액 지원)
CREATE TABLE partner_balances (
  partner_id VARCHAR(255) NOT NULL,
  partner_type VARCHAR(20) NOT NULL, -- 'designer' | 'agent'
  current_balance INTEGER NOT NULL DEFAULT 0, -- 현재 잔액 (센트, 음수 가능)
  pending_adjustments INTEGER NOT NULL DEFAULT 0, -- 대기 중인 조정 금액
  total_revenue INTEGER NOT NULL DEFAULT 0, -- 총 수익 (마이너스 가능)
  last_updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (partner_id, partner_type)
);

CREATE INDEX idx_partner_balances_balance ON partner_balances(current_balance);
CREATE INDEX idx_partner_balances_negative ON partner_balances(current_balance) WHERE current_balance < 0;

-- PayoutRequests 테이블 (출금 요청)
CREATE TABLE payout_requests (
  id VARCHAR(255) PRIMARY KEY,
  partner_id VARCHAR(255) NOT NULL,
  partner_type VARCHAR(20) NOT NULL, -- 'designer' | 'agent'
  
  -- 출금 정보
  requested_amount INTEGER NOT NULL, -- 요청 금액 (센트)
  available_balance INTEGER NOT NULL, -- 출금 가능 잔액 (마이너스 가능)
  is_negative_balance BOOLEAN DEFAULT FALSE, -- 마이너스 잔액 여부
  
  -- 상태
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled'
  rejection_reason TEXT,
  
  -- 지급 정보
  payout_method VARCHAR(20) NOT NULL, -- 'bank' | 'paypal' | 'stripe'
  payout_account_info JSONB, -- 계좌 정보
  
  -- 처리 정보
  processed_at TIMESTAMP,
  processed_by VARCHAR(255),
  transaction_id VARCHAR(255),
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (partner_id, partner_type) REFERENCES partner_balances(partner_id, partner_type)
);

CREATE INDEX idx_payout_requests_partner ON payout_requests(partner_id, partner_type);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);
CREATE INDEX idx_payout_requests_negative ON payout_requests(is_negative_balance);
```

**정산 로직 반영:**
- 환불 처리 시 잔액이 부족하면 마이너스로 기록
- 출금 요청 시 `total_revenue < 0`이면 출금 버튼 비활성화
- 다음 정산 시 `ABS(마이너스 잔액)`만큼 공제 후 잔액 업데이트
- 정산 처리 시 마이너스 잔액을 최우선 차감
- 대시보드에서 마이너스 잔액 경고 표시 및 출금 버튼 비활성화

### 3. 투명한 대시보드 - 계산식 명시

**요구사항:**
- 파트너(디자이너/영업사원)가 본인의 수익을 납득할 수 있도록 계산 근거를 상세히 공개
- 최종 판매가, 제작 원가, 본인 수수료율 등 모든 정보 공개
- **🆕 계산식 명시**: 파트너가 보는 수익 상세 팝업에 계산식을 텍스트로 명시

**구현 방법:**
- 대시보드 API 응답에 계산식 포함
- 각 수익 항목별 상세 내역 제공
- 수익 계산 과정을 단계별로 표시
- 계산식: `(판매가 - 제작원가 - 플랫폼수수료 - 타파트너수수료) = 나의수익`

**DB 스키마 반영:**
- `RevenueShare`에 계산 근거 저장 (JSON)
- `SettlementDashboard`에 상세 내역 및 계산식 포함

```sql
-- RevenueShare 테이블에 계산 근거 필드 추가
ALTER TABLE revenue_shares ADD COLUMN calculation_details JSONB;

-- 계산 근거 예시:
-- {
--   "totalPrice": 2000,
--   "productionCost": 800,
--   "designerRevenueRate": 0.20,
--   "agentRevenueRate": 0.10,
--   "distributionType": "four-way",
--   "isDuplicateEarning": false,
--   "breakdown": {
--     "production": 800,
--     "platform": 600,
--     "designer": 400,
--     "agent": 200
--   },
--   "formula": {
--     "text": "(판매가 $20.00 - 제작원가 $8.00 - 플랫폼수수료 $6.00 - 영업사원수수료 $2.00) = 디자이너수익 $4.00",
--     "components": {
--       "totalPrice": 2000,
--       "productionCost": 800,
--       "platformFee": 600,
--       "otherPartnerFee": 200,
--       "myRevenue": 400
--     }
--   }
-- }
```

**정산 로직 반영:**
- `calculateRevenueAdvanced` 함수에서 계산 근거 및 계산식 반환
- 대시보드 API에서 계산식 포함하여 응답
- UI에서 단계별 계산 과정 및 계산식 표시

**API Response 구조:**
```json
{
  "partnerId": "designer-123",
  "partnerType": "designer",
  "revenueDetails": [
    {
      "orderId": "order-001",
      "customOrderId": "custom-001",
      "calculationFormula": {
        "text": "(판매가 $20.00 - 제작원가 $8.00 - 플랫폼수수료 $6.00 - 영업사원수수료 $2.00) = 디자이너수익 $4.00",
        "breakdown": {
          "totalPrice": 20.00,
          "productionCost": 8.00,
          "platformFee": 6.00,
          "otherPartnerFee": 2.00,
          "myRevenue": 4.00
        },
        "rates": {
          "productionRate": 0.40,
          "platformRate": 0.30,
          "otherPartnerRate": 0.10,
          "myRevenueRate": 0.20
        }
      }
    }
  ]
}
```

---

## 📊 비즈니스 정책 반영 요약

### DB 스키마 반영

| 정책 | 테이블 | 필드/구조 |
|------|--------|-----------|
| 감사 로그 | `audit_logs` | Append-only 구조, 모든 변경사항 기록 |
| 마이너스 잔액 | `settlement_adjustments` | `amount` 필드 음수 허용 |
| 마이너스 잔액 | `partner_balances` | `current_balance` 음수 허용 |
| 투명한 대시보드 | `revenue_shares` | `calculation_details` JSON 필드 추가 |

### 정산 로직 반영

| 정책 | 함수/로직 | 구현 내용 |
|------|-----------|-----------|
| 감사 로그 | 모든 정산 함수 | 상태 변경 시 자동 로그 기록 |
| 마이너스 잔액 | `processRefund` | 환불액이 잔액 초과 시 마이너스 기록 |
| 마이너스 잔액 | `generateSettlementDashboard` | 마이너스 잔액 포함하여 계산 |
| 투명한 대시보드 | `calculateRevenueAdvanced` | 계산 근거 반환 |
| 투명한 대시보드 | 대시보드 API | 계산 근거 포함하여 응답 |

---

## 📝 다음 단계

### 구현 단계
1. 데이터베이스 스키마 생성 (감사 로그, 파트너 잔액 테이블 포함)
2. 정산 서비스 함수 구현 (감사 로그, 마이너스 잔액 처리)
3. API 엔드포인트 구현 (투명한 대시보드)
4. 대시보드 UI 구현 (계산 근거 표시)
5. 테스트 및 검증

### 통합 단계
1. 주문 시스템과 연동
2. 결제 시스템과 연동
3. 알림 시스템 연동
4. 모니터링 설정

---

**작성일**: 2024년
**버전**: 2.0 (비즈니스 정책 추가)



---



# 6. SELPIC-X 데이터베이스 스키마

*정산 시스템 데이터베이스 스키마 상세*

---



## 📊 확장된 테이블 구조

### 1. RevenueShare 테이블 확장

```sql
-- 수익 배분 기록 테이블 (확장)
CREATE TABLE revenue_shares (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  custom_order_id VARCHAR(255) NOT NULL,
  design_id VARCHAR(255) NOT NULL,
  designer_id VARCHAR(255) NOT NULL,
  
  -- 🆕 영업사원 정보
  agent_id VARCHAR(255),
  agent_code VARCHAR(255),
  
  -- 금액 정보 (정수로 저장, 센트 단위)
  total_revenue INTEGER NOT NULL, -- 총 수익 (센트)
  production_cost INTEGER NOT NULL, -- 제작 원가 (센트)
  platform_revenue INTEGER NOT NULL, -- 플랫폼 수익 (센트)
  designer_revenue INTEGER NOT NULL, -- 디자이너 수익 (센트)
  agent_revenue INTEGER DEFAULT 0, -- 🆕 영업사원 수익 (센트)
  
  -- 🆕 분배 방식
  distribution_type VARCHAR(20) DEFAULT 'three-way', -- 'three-way' | 'four-way'
  
  -- 🆕 중복 수익 플래그
  is_duplicate_earning BOOLEAN DEFAULT FALSE, -- designerId === agentId인 경우
  
  -- 🆕 버전 관리 (로그 무결성)
  version INTEGER DEFAULT 1, -- 버전 번호 (금액 변경 시마다 증가)
  
  -- 🆕 정산 상태 (확장)
  status VARCHAR(50) DEFAULT 'PENDING', 
  -- 'PENDING' | 'READY' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FROZEN' | 'FAILED'
  
  -- 🆕 배송 및 확정 정보
  delivered_at TIMESTAMP, -- 배송 완료 시점
  confirmed_at TIMESTAMP, -- 구매 확정 시점
  ready_at TIMESTAMP, -- 정산 준비 완료 시점 (7일 경과 또는 구매 확정)
  
  -- 🆕 분쟁 정보
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_reason TEXT,
  dispute_created_at TIMESTAMP,
  
  -- 지급 정보 (JSON)
  payout JSONB,
  
  -- 🆕 계산 근거 (투명한 대시보드용)
  calculation_details JSONB,
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  
  FOREIGN KEY (design_id) REFERENCES designs(id),
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(designer_id),
  FOREIGN KEY (agent_id) REFERENCES sales_agents(id)
);

-- 인덱스
CREATE INDEX idx_revenue_shares_designer_id ON revenue_shares(designer_id);
CREATE INDEX idx_revenue_shares_agent_id ON revenue_shares(agent_id);
CREATE INDEX idx_revenue_shares_status ON revenue_shares(status);
CREATE INDEX idx_revenue_shares_order_id ON revenue_shares(order_id);
CREATE INDEX idx_revenue_shares_delivered_at ON revenue_shares(delivered_at);
CREATE INDEX idx_revenue_shares_ready_at ON revenue_shares(ready_at);
CREATE INDEX idx_revenue_shares_version ON revenue_shares(id, version);
```

### 2. CustomOrder 테이블 확장

```sql
-- 커스텀 주문 테이블 (확장)
CREATE TABLE custom_orders (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL,
  
  design_id VARCHAR(255) NOT NULL,
  designer_id VARCHAR(255) NOT NULL,
  
  -- 🆕 영업사원 정보
  agent_id VARCHAR(255),
  agent_code VARCHAR(255),
  referral_tracker_id VARCHAR(255),
  
  -- 커스터마이징 데이터 (JSON)
  customization JSONB,
  
  -- 제작 정보 (JSON)
  production JSONB DEFAULT '{"status": "pending"}',
  
  -- 🆕 주문 상태 (확장)
  order_status VARCHAR(50) DEFAULT 'PENDING',
  -- 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 
  -- 'CONFIRMED' | 'DISPUTE' | 'REFUNDED' | 'CANCELLED'
  
  -- 🆕 배송 및 확정 정보
  delivered_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  confirmed_by VARCHAR(255), -- 사용자 ID
  
  -- 🆕 분쟁 정보
  is_disputed BOOLEAN DEFAULT FALSE,
  dispute_reason TEXT,
  dispute_created_at TIMESTAMP,
  dispute_resolved_at TIMESTAMP,
  
  -- 수익 배분 (JSON) - 참고용 (실제는 revenue_shares 테이블에 저장)
  revenue JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (design_id) REFERENCES designs(id),
  FOREIGN KEY (designer_id) REFERENCES designer_profiles(designer_id),
  FOREIGN KEY (agent_id) REFERENCES sales_agents(id)
);

-- 인덱스
CREATE INDEX idx_custom_orders_order_id ON custom_orders(order_id);
CREATE INDEX idx_custom_orders_order_status ON custom_orders(order_status);
CREATE INDEX idx_custom_orders_delivered_at ON custom_orders(delivered_at);
CREATE INDEX idx_custom_orders_is_disputed ON custom_orders(is_disputed);
```

### 3. SettlementAdjustment 테이블 (신규)

```sql
-- 정산 조정 테이블 (환불 등으로 인한 차감 예정액)
CREATE TABLE settlement_adjustments (
  id VARCHAR(255) PRIMARY KEY,
  
  -- 파트너 정보
  partner_type VARCHAR(20) NOT NULL, -- 'designer' | 'agent' | 'platform'
  partner_id VARCHAR(255) NOT NULL, -- designer_id 또는 agent_id
  
  -- 관련 주문 정보
  order_id VARCHAR(255) NOT NULL,
  custom_order_id VARCHAR(255) NOT NULL,
  revenue_share_id VARCHAR(255) NOT NULL,
  
  -- 조정 정보 (정수로 저장, 센트 단위)
  amount INTEGER NOT NULL, -- 조정 금액 (음수 가능, 차감은 음수)
  reason VARCHAR(50) NOT NULL, -- 'refund' | 'dispute' | 'chargeback' | 'manual_adjustment'
  description TEXT,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'applied' | 'cancelled'
  applied_at TIMESTAMP,
  
  -- 메타데이터
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL, -- 관리자 ID 또는 'system'
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (revenue_share_id) REFERENCES revenue_shares(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 인덱스
CREATE INDEX idx_settlement_adjustments_partner ON settlement_adjustments(partner_type, partner_id);
CREATE INDEX idx_settlement_adjustments_status ON settlement_adjustments(status);
CREATE INDEX idx_settlement_adjustments_revenue_share_id ON settlement_adjustments(revenue_share_id);
CREATE INDEX idx_settlement_adjustments_order_id ON settlement_adjustments(order_id);
```

### 4. Prisma Schema 예시

```prisma
model RevenueShare {
  id                String   @id @default(uuid())
  orderId           String
  customOrderId     String
  designId          String
  designerId        String
  
  // 영업사원 정보
  agentId           String?
  agentCode         String?
  
  // 금액 정보 (정수, 센트 단위)
  totalRevenue      Int      // 총 수익 (센트)
  productionCost    Int      // 제작 원가 (센트)
  platformRevenue   Int      // 플랫폼 수익 (센트)
  designerRevenue   Int      // 디자이너 수익 (센트)
  agentRevenue      Int      @default(0) // 영업사원 수익 (센트)
  
  // 분배 방식
  distributionType  String   @default("three-way") // "three-way" | "four-way"
  isDuplicateEarning Boolean  @default(false) // designerId === agentId
  
  // 정산 상태
  status            String   @default("PENDING")
  // PENDING | READY | PROCESSING | PAID | CANCELLED | FROZEN | FAILED
  
  // 배송 및 확정 정보
  deliveredAt      DateTime?
  confirmedAt      DateTime?
  readyAt           DateTime?
  
  // 분쟁 정보
  isDisputed        Boolean  @default(false)
  disputeReason     String?
  disputeCreatedAt  DateTime?
  
  // 지급 정보 (JSON)
  payout            Json?
  
  // 메타데이터
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  paidAt            DateTime?
  
  // 관계
  design            Design   @relation(fields: [designId], references: [id])
  designer          DesignerProfile @relation(fields: [designerId], references: [designerId])
  agent             SalesAgent? @relation(fields: [agentId], references: [id])
  adjustments       SettlementAdjustment[]
  
  @@index([designerId])
  @@index([agentId])
  @@index([status])
  @@index([orderId])
  @@index([deliveredAt])
  @@index([readyAt])
}

model CustomOrder {
  id                String   @id @default(uuid())
  orderId           String
  designId          String
  designerId        String
  
  // 영업사원 정보
  agentId           String?
  agentCode         String?
  referralTrackerId String?
  
  // 커스터마이징 데이터
  customization     Json?
  
  // 제작 정보
  production         Json     @default("{\"status\": \"pending\"}")
  
  // 주문 상태
  orderStatus        String   @default("PENDING")
  // PENDING | PAID | PROCESSING | SHIPPED | DELIVERED | CONFIRMED | DISPUTE | REFUNDED | CANCELLED
  
  // 배송 및 확정 정보
  deliveredAt       DateTime?
  confirmedAt       DateTime?
  confirmedBy       String?
  
  // 분쟁 정보
  isDisputed        Boolean  @default(false)
  disputeReason     String?
  disputeCreatedAt  DateTime?
  disputeResolvedAt DateTime?
  
  // 수익 배분 (참고용)
  revenue           Json?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // 관계
  design            Design   @relation(fields: [designId], references: [id])
  designer          DesignerProfile @relation(fields: [designerId], references: [designerId])
  agent             SalesAgent? @relation(fields: [agentId], references: [id])
  revenueShares     RevenueShare[]
  
  @@index([orderId])
  @@index([orderStatus])
  @@index([deliveredAt])
  @@index([isDisputed])
}

model SettlementAdjustment {
  id                String   @id @default(uuid())
  
  // 파트너 정보
  partnerType       String   // "designer" | "agent" | "platform"
  partnerId         String
  
  // 관련 주문 정보
  orderId           String
  customOrderId     String
  revenueShareId    String
  
  // 조정 정보 (정수, 센트 단위)
  amount            Int      // 조정 금액 (음수 가능)
  reason            String   // "refund" | "dispute" | "chargeback" | "manual_adjustment"
  description       String?
  
  // 상태
  status            String   @default("pending") // "pending" | "applied" | "cancelled"
  appliedAt         DateTime?
  
  // 메타데이터
  createdAt         DateTime @default(now())
  createdBy         String
  updatedAt         DateTime @updatedAt
  
  // 관계
  revenueShare      RevenueShare @relation(fields: [revenueShareId], references: [id])
  
  @@index([partnerType, partnerId])
  @@index([status])
  @@index([revenueShareId])
  @@index([orderId])
}
```

---

## 🔄 상태 전이 다이어그램

```
주문 생성
  ↓
[PENDING] ← 정산 대기
  ↓
배송 완료 (DELIVERED)
  ↓
[PENDING] ← 7일 유예 기간
  ↓
구매 확정 또는 7일 경과
  ↓
[READY] ← 정산 준비 완료
  ↓
정산 처리
  ↓
[PAID] ← 지급 완료

분쟁 발생 시:
[PENDING/READY] → [FROZEN] ← 정산 중지

환불 발생 시:
[PENDING/READY] → [CANCELLED] ← 정산 취소
[PAID] → Adjustment 생성 ← 차감 예정액
```

### 4. AuditLogs 테이블 (신규)

```sql
-- 감사 로그 테이블 (변경 불가능한 로그)
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  
  -- 엔티티 정보
  entity_type VARCHAR(50) NOT NULL, -- 'revenue_share', 'settlement_adjustment', 'custom_order', etc.
  entity_id VARCHAR(255) NOT NULL,
  
  -- 액션 정보
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'status_changed', 'refunded', 'calculated', etc.
  old_value JSONB, -- 변경 전 값
  new_value JSONB, -- 변경 후 값
  
  -- 변경자 정보
  changed_by VARCHAR(255) NOT NULL, -- 사용자 ID 또는 'system'
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT, -- 변경 사유
  
  -- 메타데이터
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- 🆕 계산 근거 (투명한 대시보드용)
  calculation_details JSONB -- 수익 계산 시 계산 근거 저장
);

-- 인덱스
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### 5. PartnerBalances 테이블 (신규)

```sql
-- 파트너별 잔액 테이블 (마이너스 잔액 허용)
CREATE TABLE partner_balances (
  partner_id VARCHAR(255) NOT NULL,
  partner_type VARCHAR(20) NOT NULL, -- 'designer' | 'agent'
  
  -- 잔액 정보 (정수, 센트 단위, 음수 가능)
  current_balance INTEGER NOT NULL DEFAULT 0, -- 현재 잔액 (음수 가능)
  pending_adjustments INTEGER NOT NULL DEFAULT 0, -- 대기 중인 조정 금액 (음수 가능)
  
  -- 통계
  total_earned INTEGER NOT NULL DEFAULT 0, -- 총 수익
  total_paid INTEGER NOT NULL DEFAULT 0, -- 총 지급액
  total_adjusted INTEGER NOT NULL DEFAULT 0, -- 총 조정 금액
  
  -- 메타데이터
  last_updated_at TIMESTAMP DEFAULT NOW(),
  last_settlement_at TIMESTAMP, -- 마지막 정산 시점
  
  PRIMARY KEY (partner_id, partner_type)
);

-- 인덱스
CREATE INDEX idx_partner_balances_balance ON partner_balances(current_balance);
CREATE INDEX idx_partner_balances_type ON partner_balances(partner_type);
```

### 6. Prisma Schema 업데이트

```prisma
model AuditLog {
  id                String   @id @default(uuid())
  entityType        String   // "revenue_share" | "settlement_adjustment" | "custom_order"
  entityId          String
  action            String   // "created" | "updated" | "status_changed" | "refunded"
  oldValue          Json?
  newValue          Json?
  changedBy         String
  changedAt         DateTime @default(now())
  reason            String?
  ipAddress         String?
  userAgent         String?
  calculationDetails Json?  // 계산 근거 (투명한 대시보드용)
  
  @@index([entityType, entityId])
  @@index([changedAt])
  @@index([changedBy])
  @@index([action])
}

model PartnerBalance {
  partnerId         String
  partnerType       String   // "designer" | "agent"
  currentBalance    Int      @default(0) // 현재 잔액 (음수 가능)
  pendingAdjustments Int     @default(0) // 대기 중인 조정 금액
  totalEarned       Int      @default(0) // 총 수익
  totalPaid         Int      @default(0) // 총 지급액
  totalAdjusted     Int      @default(0) // 총 조정 금액
  lastUpdatedAt     DateTime @default(now()) @updatedAt
  lastSettlementAt  DateTime?
  
  @@id([partnerId, partnerType])
  @@index([currentBalance])
  @@index([partnerType])
}
```

---

## 🔄 비즈니스 정책 반영 요약

### 1. 감사 로그 (Audit Log)

**DB 스키마:**
- `audit_logs` 테이블 생성 (Append-only 구조)
- 모든 정산 관련 변경사항 자동 기록
- 계산 근거도 함께 저장

**정산 로직:**
- 모든 `RevenueShare` 상태 변경 시 로그 기록
- 모든 `SettlementAdjustment` 생성 시 로그 기록
- 수익 분배 계산 시 계산 근거 저장

### 2. 마이너스 잔액 허용

**DB 스키마:**
- `settlement_adjustments.amount` 음수 허용
- `partner_balances` 테이블 추가
- `current_balance` 필드 음수 허용

**정산 로직:**
- 환불 처리 시 잔액 부족하면 마이너스 기록
- 정산 처리 시 마이너스 잔액 최우선 차감
- 대시보드에서 마이너스 잔액 표시

### 3. 투명한 대시보드

**DB 스키마:**
- `revenue_shares.calculation_details` JSON 필드 추가
- `audit_logs.calculation_details` 필드 추가

**정산 로직:**
- `calculateRevenueAdvanced`에서 계산 근거 반환
- 대시보드 API에서 계산 근거 포함
- UI에서 단계별 계산 과정 표시

---

**작성일**: 2024년
**버전**: 2.0 (비즈니스 정책 추가)



---



---

## 📝 부록

### A. 용어 정의

- **SELPIC-X**: 고객이 직접 디자인한 커스텀 스티커 상품을 자동으로 제작하고 판매하는 자동화 생산 플랫폼
- **디자이너 (Designer)**: 커스텀 디자인을 제작하고 업로드하는 사용자
- **마켓플레이스 (Marketplace)**: 디자인 상품을 판매하는 플랫폼
- **수익 배분 (Revenue Share)**: 판매 수익을 디자이너, 플랫폼, 영업사원, 제작사 간에 배분하는 시스템
- **Print-on-Demand (POD)**: 주문이 들어올 때마다 제품을 제작하는 방식
- **핵심 운영 가이드라인**: SELPIC-X의 3대 핵심 원칙 (재무 안정성, 투명성 및 무결성, 사용자 이해도)

### B. 참고 자료

- Next.js 15 공식 문서: https://nextjs.org/docs
- PostgreSQL 공식 문서: https://www.postgresql.org/docs/
- Zustand 공식 문서: https://zustand-demo.pmnd.rs/

### C. 관련 문서

- **SELPIC-X 설계 문서**: `docs/automated-production-platform-design.md` (핵심 운영 가이드라인 포함)
- **SELPIC-X 정산 시스템 구현 가이드**: `docs/settlement-system-implementation.md`
- **SELPIC-X 구상 문서**: `docs/automated-production-platform-planning.md`
- **SELPIC-X 확장 설계 문서**: `docs/automated-production-platform-extended-design.md`

---

**보고서 생성일**: 2026-01-03T06:48:14.776Z  
**생성 도구**: generate-report.js


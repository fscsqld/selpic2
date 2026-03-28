# SELPIC-X 확장 설계 문서 v2.0

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


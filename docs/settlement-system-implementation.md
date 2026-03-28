# SELPIC-X 정산 시스템 구현 가이드

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


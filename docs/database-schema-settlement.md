# SELPIC-X 정산 시스템 데이터베이스 스키마

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


/**
 * 자동화 생산 플랫폼 확장 타입 정의
 * 
 * 기존 설계에 영업사원(Sales Agent) 모듈과 인쇄 자동화 기능을 추가한 확장 버전
 * 
 * ⚠️ 중요: 이 파일은 구상 단계의 타입 정의입니다.
 * - 현재 홈페이지 개발과 완전히 별개로 관리됩니다
 * - 아직 구현 단계가 아닙니다
 */

// ============================================================================
// 기존 타입 (참고용)
// ============================================================================

export interface Design {
  id: string
  designerId: string
  title: string
  description: string
  category: 'sticker' | 'stamp' | 'bundle'
  subcategory?: string
  
  designFiles: {
    original: string
    preview: string
    thumbnail: string
    formats?: {
      png?: string
      svg?: string
      pdf?: string
    }
  }
  
  customizationOptions: {
    allowTextEdit: boolean
    allowColorChange: boolean
    allowSizeChange: boolean
    editableFields: string[]
  }
  
  pricing: {
    basePrice: number
    designerRevenueRate: number
    platformRevenueRate: number
    productionCost: number
  }
  
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  rejectionReason?: string
  
  stats: {
    views: number
    likes: number
    sales: number
    revenue: number
  }
  
  tags: string[]
  createdAt: Date
  updatedAt: Date
  approvedAt?: Date
  publishedAt?: Date
}

export interface DesignerProfile {
  userId: string
  designerId: string
  displayName: string
  bio?: string
  avatar?: string
  portfolio?: string[]
  tier: 'new' | 'popular' | 'vip'
  revenueRate: number
  stats: {
    totalDesigns: number
    activeDesigns: number
    totalSales: number
    totalRevenue: number
    averageRating: number
    totalRatings: number
  }
  payoutSettings: {
    method: 'bank' | 'paypal' | 'stripe'
    accountInfo: Record<string, any>
    minimumPayout: number
  }
  isVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// 🆕 영업사원(Sales Agent) 타입
// ============================================================================

/**
 * 영업사원 프로필
 */
export interface SalesAgent {
  id: string
  agentCode: string // 고유 추천 코드 (예: AGENT_ABC123)
  userId?: string // 연결된 사용자 ID (선택사항)
  
  // 프로필 정보
  name: string
  email: string
  phone?: string
  company?: string
  website?: string
  
  // 수익 정보
  revenueRate: number // 수익률 (기본값: 0.10 = 10%)
  minimumPayout: number // 최소 출금 금액 (기본값: $50)
  
  // 통계
  stats: {
    totalReferrals: number // 총 추천 수
    totalOrders: number // 총 주문 수
    totalRevenue: number // 총 수익
    pendingRevenue: number // 대기 중인 수익
    paidRevenue: number // 지급된 수익
    conversionRate: number // 전환율 (%)
    averageOrderValue: number // 평균 주문 금액
  }
  
  // 결제 정보
  payoutSettings: {
    method: 'bank' | 'paypal' | 'stripe'
    accountInfo: {
      bankName?: string
      accountNumber?: string
      accountHolder?: string
      paypalEmail?: string
      stripeAccountId?: string
    }
  }
  
  // 상태
  status: 'active' | 'inactive' | 'suspended'
  isVerified: boolean
  verificationDate?: Date
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
  lastPayoutAt?: Date
  lastActivityAt?: Date
}

/**
 * 추천 추적 정보
 */
export interface ReferralTracker {
  id: string
  agentCode: string
  sessionId: string // 브라우저 세션 ID
  userId?: string // 로그인한 사용자 ID
  
  // 추적 정보
  referrerUrl?: string // 추천 링크 URL
  landingPage: string // 첫 방문 페이지
  ipAddress?: string
  userAgent?: string
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  
  // 상태
  isActive: boolean
  expiresAt: Date // 만료 시간 (30일 후)
  
  // 주문 연결
  orderIds: string[] // 이 추천으로 생성된 주문 ID 목록
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
}

/**
 * 영업사원 등급 (선택사항 - 향후 확장)
 */
export interface AgentTier {
  id: string
  name: string // 예: 'Bronze', 'Silver', 'Gold', 'Platinum'
  minRevenue: number // 최소 수익 기준
  revenueRate: number // 해당 등급의 수익률
  benefits: string[] // 혜택 목록
}

// ============================================================================
// 🆕 확장된 주문 및 수익 타입
// ============================================================================

/**
 * 확장된 커스텀 주문 (영업사원 정보 포함)
 * 
 * 중요: 한 주문에 여러 상품이 포함될 수 있으며,
 * 각 상품(CustomOrder)마다 별도의 agentId를 가질 수 있습니다.
 */
export interface CustomOrder {
  id: string
  orderId: string // 부모 주문 ID (여러 CustomOrder가 같은 orderId를 가질 수 있음)
  designId: string
  designerId: string
  
  // 🆕 영업사원 정보 (상품별로 개별 설정 가능)
  agentId?: string // 영업사원 ID (있으면 4자 분배, 없으면 3자 분배)
  agentCode?: string // 영업사원 코드
  referralTrackerId?: string // 추천 추적 ID
  agentRevenueRate?: number // 🆕 해당 상품에 적용된 영업사원 수수료율 (기본값: 0.10)
  
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
    printJobId?: string // 🆕 인쇄 작업 ID
  }
  
  // 🆕 주문 상태 (확장)
  orderStatus?: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CONFIRMED' | 'DISPUTE' | 'REFUNDED' | 'CANCELLED'
  
  // 🆕 배송 및 확정 정보
  deliveredAt?: Date
  confirmedAt?: Date
  confirmedBy?: string // 사용자 ID
  
  // 🆕 분쟁 정보
  isDisputed?: boolean
  disputeReason?: string
  disputeCreatedAt?: Date
  disputeResolvedAt?: Date
  
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

/**
 * 확장된 수익 배분 (4자 분배)
 * 
 * 🆕 정산 유예 및 분쟁 시스템 포함
 */
export interface RevenueShare {
  id: string
  orderId: string
  customOrderId: string
  designId: string
  designerId: string
  
  // 🆕 영업사원 정보
  agentId?: string
  agentCode?: string
  
  // 금액 정보 (정수, 센트 단위로 저장 권장)
  totalRevenue: number
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  agentRevenue: number // 🆕 영업사원 수익
  
  // 🆕 분배 방식
  distributionType: 'three-way' | 'four-way'
  isDuplicateEarning?: boolean // 🆕 designerId === agentId인 경우
  
  // 🆕 버전 관리 (로그 무결성)
  version: number // 버전 번호 (금액 변경 시마다 증가)
  
  // 🆕 정산 상태 (확장)
  status: 'PENDING' | 'READY' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'FROZEN' | 'FAILED'
  
  // 🆕 배송 및 확정 정보
  deliveredAt?: Date
  confirmedAt?: Date
  readyAt?: Date // 정산 준비 완료 시점 (7일 경과 또는 구매 확정)
  
  // 🆕 분쟁 정보
  isDisputed?: boolean
  disputeReason?: string
  disputeCreatedAt?: Date
  
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

/**
 * 정산 계산 결과
 * 
 * agentId 유무에 따라 분배 방식이 달라집니다:
 * - agentId 없음: 3자 분배 (플랫폼 수익 증가)
 * - agentId 있음: 4자 분배 (영업사원 수익 포함)
 */
export interface RevenueCalculation {
  totalPrice: number
  productionCost: number
  platformRevenue: number
  designerRevenue: number
  agentRevenue: number
  total: number // 검증용: 모든 금액의 합
  
  // 🆕 분배 방식
  distributionType: 'three-way' | 'four-way' // 3자 분배 또는 4자 분배
  
  // 비율 정보
  rates: {
    production: number // 제작 원가 비율 (고정: 0.40)
    platform: number // 플랫폼 수익 비율 (3자: 0.40, 4자: 0.30)
    designer: number // 디자이너 수익 비율 (고정: 0.20)
    agent: number // 영업사원 수익 비율 (3자: 0.00, 4자: 0.10 또는 커스텀)
  }
  
  // 영업사원 정보 (있는 경우)
  agent?: {
    id: string
    code: string
    revenueRate: number // 적용된 수수료율
  }
}

/**
 * 🆕 복합 주문 정산 결과
 * 
 * 한 주문에 여러 상품이 포함된 경우의 집계 결과
 */
export interface CompositeOrderRevenue {
  orderId: string
  totalOrderPrice: number
  
  // 아이템별 수익 배분
  items: Array<{
    customOrderId: string
    productName: string
    price: number
    revenue: RevenueCalculation
  }>
  
  // 전체 집계
  totals: {
    productionCost: number
    platformRevenue: number
    designerRevenue: number
    agentRevenue: number
    total: number
  }
  
  // 영업사원별 집계 (여러 영업사원이 있을 수 있음)
  agentBreakdown: Array<{
    agentId: string
    agentCode: string
    revenue: number
    itemCount: number
  }>
  
  // 통계
  stats: {
    totalItems: number
    itemsWithAgent: number
    itemsWithoutAgent: number
    uniqueAgents: number
  }
}

// ============================================================================
// 🆕 인쇄 자동화 타입
// ============================================================================

/**
 * Fabric.js 객체 타입 (참고용)
 */
export interface FabricObject {
  type: string
  left: number
  top: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  angle?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  [key: string]: any
}

/**
 * Fabric.js Canvas JSON 구조
 */
export interface FabricCanvasJSON {
  version: string
  objects: FabricObject[]
  background?: string
  backgroundImage?: string
  width?: number
  height?: number
}

/**
 * 인쇄 작업
 */
export interface PrintJob {
  id: string
  orderId: string
  customOrderId: string
  
  // 입력 데이터
  fabricJson: string // Fabric.js JSON 데이터 (문자열)
  designSpecs: {
    width: number // mm
    height: number // mm
    dpi: number // 기본값: 300
    colorSpace: 'RGB' | 'CMYK'
    bleed?: number // 여백 (mm)
  }
  
  // 출력 파일
  printFileUrl?: string // 생성된 PDF URL
  printFileSize?: number // 파일 크기 (bytes)
  printFileHash?: string // 파일 해시 (무결성 검증)
  
  // 상태
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  retryCount?: number
  maxRetries?: number
  
  // 처리 정보
  processingTime?: number // 처리 시간 (ms)
  fileGenerationTime?: Date
  
  // 메타데이터
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

/**
 * 인쇄 작업 생성 요청
 */
export interface CreatePrintJobRequest {
  orderId: string
  customOrderId: string
  fabricJson: string
  designSpecs: {
    width: number
    height: number
    dpi?: number
    colorSpace?: 'RGB' | 'CMYK'
    bleed?: number
  }
}

/**
 * 인쇄 작업 상태 응답
 */
export interface PrintJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  errorMessage?: string
  printFileUrl?: string
  estimatedCompletion?: Date
}

// ============================================================================
// 🆕 통합 정산 엔진 타입
// ============================================================================

/**
 * 정산 계산 요청
 * 
 * agentId가 있으면 4자 분배, 없으면 3자 분배로 자동 결정됩니다.
 */
export interface CalculateRevenueRequest {
  orderId: string
  customOrderId: string
  totalPrice: number
  productionCost: number
  designerRevenueRate: number
  /** Optional; settlement helpers derive platform share when omitted. */
  platformRevenueRate?: number
  agentId?: string // 🆕 영업사원 ID (있으면 4자 분배, 없으면 3자 분배)
  agentCode?: string // 영업사원 코드 (선택사항)
  agentRevenueRate?: number // 🆕 영업사원 수익률 (기본값: 0.10, agentId가 있을 때만 사용)
}

/**
 * 🆕 정산 조정 (Adjustment) 타입
 * 
 * 환불 등으로 인한 차감 예정액
 */
export interface SettlementAdjustment {
  id: string
  partnerType: 'designer' | 'agent' | 'platform'
  partnerId: string // designerId 또는 agentId
  orderId: string
  customOrderId: string
  revenueShareId: string
  
  // 조정 정보
  amount: number // 차감 금액 (음수 가능)
  reason: 'refund' | 'dispute' | 'chargeback' | 'manual_adjustment'
  description?: string
  
  // 상태
  status: 'pending' | 'applied' | 'cancelled'
  appliedAt?: Date
  
  // 메타데이터
  createdAt: Date
  createdBy: string // 관리자 ID 또는 시스템
  updatedAt: Date
}

/**
 * 정산 대시보드 데이터
 * 
 * 🆕 투명한 대시보드: 계산 근거 포함
 */
export interface SettlementDashboard {
  partnerId: string
  partnerType: 'designer' | 'agent'
  
  // 수익 정보
  totalRevenue: number // 총 수익
  paidRevenue: number // 지급된 수익
  pendingRevenue: number // 대기 중인 수익
  readyRevenue: number // 정산 준비 완료된 수익
  
  // 조정 정보
  totalAdjustments: number // 총 조정 금액 (차감 예정액, 음수 가능)
  pendingAdjustments: number // 적용 대기 중인 조정
  appliedAdjustments: number // 이미 적용된 조정
  
  // 최종 정산 가능 금액 (마이너스 가능)
  availableForPayout: number // readyRevenue - pendingAdjustments (음수 가능)
  
  // 🆕 마이너스 잔액 정보
  currentBalance: number // 현재 잔액 (음수 가능)
  isNegativeBalance: boolean // 마이너스 잔액 여부
  
  // 통계
  stats: {
    totalOrders: number
    totalRevenueShares: number
    pendingCount: number
    readyCount: number
    paidCount: number
    frozenCount: number
    cancelledCount: number
  }
  
  // 조정 내역
  adjustments: SettlementAdjustment[]
  
  // 🆕 계산 근거 (투명한 대시보드)
  calculationDetails?: Array<{
    orderId: string
    customOrderId: string
    totalPrice: number
    productionCost: number
    partnerRevenue: number
    partnerRevenueRate: number
    distributionType: 'three-way' | 'four-way'
    breakdown: {
      production: { amount: number; rate: number }
      platform: { amount: number; rate: number }
      designer: { amount: number; rate: number }
      agent?: { amount: number; rate: number }
    }
    formula: string
    calculatedAt: Date
  }>
}

/**
 * 🆕 감사 로그
 */
export interface AuditLog {
  id: string
  entityType: 'revenue_share' | 'settlement_adjustment' | 'custom_order' | 'partner_balance'
  entityId: string
  action: 'created' | 'updated' | 'status_changed' | 'refunded' | 'calculated' | 'settled'
  oldValue?: any
  newValue?: any
  changedBy: string // 사용자 ID 또는 'system'
  changedAt: Date
  reason?: string
  ipAddress?: string
  userAgent?: string
  calculationDetails?: any // 계산 근거 (투명한 대시보드용)
}

/**
 * 🆕 파트너 잔액
 */
export interface PartnerBalance {
  partnerId: string
  partnerType: 'designer' | 'agent'
  currentBalance: number // 현재 잔액 (음수 가능)
  pendingAdjustments: number // 대기 중인 조정 금액
  totalEarned: number // 총 수익
  totalPaid: number // 총 지급액
  totalAdjusted: number // 총 조정 금액
  lastUpdatedAt: Date
  lastSettlementAt?: Date
}

/**
 * 🆕 복합 주문 정산 계산 요청
 * 
 * 한 주문에 여러 상품이 포함된 경우
 */
export interface CalculateCompositeOrderRevenueRequest {
  orderId: string
  items: Array<{
    customOrderId: string
    productName: string
    totalPrice: number
    productionCost: number
    designerRevenueRate: number
    designerId?: string
    agentId?: string // 각 상품별로 개별 설정 가능
    agentCode?: string
    agentRevenueRate?: number
  }>
}

/**
 * 정산 계산 응답
 */
export interface CalculateRevenueResponse extends RevenueCalculation {
  orderId: string
  customOrderId: string
  calculatedAt: Date
}

/**
 * 정산 설정
 * 
 * agentId 유무에 따라 다른 비율이 적용됩니다.
 */
export interface RevenueSettings {
  // 🆕 3자 분배 비율 (영업사원 없을 때 - 플랫폼 수익 증가)
  threeWayRates: {
    production: number // 0.40 (고정)
    platform: number // 0.40 (영업사원 수익을 플랫폼이 가져감)
    designer: number // 0.20 (고정)
    agent: number // 0.00
  }
  
  // 🆕 4자 분배 비율 (영업사원 있을 때)
  fourWayRates: {
    production: number // 0.40 (고정)
    platform: number // 0.30 (영업사원 수익만큼 감소)
    designer: number // 0.20 (고정)
    agent: number // 0.10 (기본값, 개별 영업사원 수수료로 오버라이드 가능)
  }
  
  // 최소/최대 제한
  constraints: {
    minProductionCost: number
    maxPlatformRevenue: number
    minDesignerRevenue: number
    minAgentRevenue: number
    maxAgentRevenueRate: number // 영업사원 수수료 상한선 (예: 0.15 = 15%)
  }
  
  // 🆕 영업사원 등급별 수수료 (선택사항)
  agentTierRates?: {
    [tier: string]: number // 예: { 'bronze': 0.08, 'silver': 0.10, 'gold': 0.12, 'platinum': 0.15 }
  }
}

// ============================================================================
// 🆕 추천 추적 유틸리티 타입
// ============================================================================

/**
 * 추천 링크 생성 요청
 */
export interface CreateReferralLinkRequest {
  agentCode: string
  targetUrl: string // 추천할 페이지 URL
  campaign?: string // 캠페인 이름 (선택사항)
  expiresIn?: number // 만료 시간 (일, 기본값: 30)
}

/**
 * 추천 링크
 */
export interface ReferralLink {
  id: string
  agentCode: string
  url: string // 전체 추천 URL
  targetUrl: string // 원본 URL
  campaign?: string
  clicks: number
  conversions: number
  createdAt: Date
  expiresAt: Date
}

/**
 * 추천 추적 이벤트
 */
export interface ReferralEvent {
  id: string
  agentCode: string
  sessionId: string
  eventType: 'click' | 'visit' | 'order' | 'conversion'
  data: Record<string, any>
  createdAt: Date
}

// ============================================================================
// 🆕 API 응답 타입
// ============================================================================

/**
 * API 응답 기본 구조
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: Date
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// ============================================================================
// 🆕 Zustand Store 타입 확장
// ============================================================================

/**
 * 프로덕션 플랫폼 Store 상태
 */
export interface ProductionPlatformStore {
  // 기존 상태
  designs: Design[]
  designerProfiles: DesignerProfile[]
  marketplaceProducts: any[]
  customOrders: CustomOrder[]
  revenueShares: RevenueShare[]
  
  // 🆕 영업사원 상태
  salesAgents: SalesAgent[]
  referralTrackers: ReferralTracker[]
  referralLinks: ReferralLink[]
  
  // 🆕 인쇄 작업 상태
  printJobs: PrintJob[]
  
  // 🆕 현재 세션
  currentAgent?: SalesAgent
  currentReferralTracker?: ReferralTracker
  
  // Actions (기존)
  addDesign: (design: Design) => void
  updateDesign: (id: string, updates: Partial<Design>) => void
  deleteDesign: (id: string) => void
  getDesignsByDesigner: (designerId: string) => Design[]
  getDesignerProfile: (userId: string) => DesignerProfile | undefined
  updateDesignerProfile: (userId: string, updates: Partial<DesignerProfile>) => void
  getMarketplaceProducts: (filters?: any) => any[]
  addCustomOrder: (order: CustomOrder) => void
  updateCustomOrder: (id: string, updates: Partial<CustomOrder>) => void
  calculateRevenueShare: (orderId: string, customOrderId: string) => RevenueShare
  getRevenueByDesigner: (designerId: string) => number
  
  // 🆕 영업사원 Actions
  addSalesAgent: (agent: SalesAgent) => void
  updateSalesAgent: (id: string, updates: Partial<SalesAgent>) => void
  getSalesAgent: (agentCode: string) => SalesAgent | undefined
  getSalesAgentById: (id: string) => SalesAgent | undefined
  validateAgentCode: (code: string) => boolean
  
  // 🆕 추천 추적 Actions
  trackReferral: (agentCode: string, landingPage: string) => ReferralTracker
  getReferralTracker: (sessionId: string) => ReferralTracker | undefined
  attachReferralToOrder: (orderId: string, sessionId: string) => void
  getReferralStats: (agentCode: string) => any
  
  // 🆕 인쇄 작업 Actions
  createPrintJob: (request: CreatePrintJobRequest) => PrintJob
  getPrintJob: (jobId: string) => PrintJob | undefined
  updatePrintJob: (jobId: string, updates: Partial<PrintJob>) => void
  getPrintJobsByOrder: (orderId: string) => PrintJob[]
  
  // 🆕 통합 정산 Actions
  calculateRevenue: (request: CalculateRevenueRequest) => RevenueCalculation
  calculateCompositeOrderRevenue: (request: CalculateCompositeOrderRevenueRequest) => CompositeOrderRevenue
  getRevenueByAgent: (agentId: string) => number
  getTotalRevenue: () => {
    platform: number
    designers: number
    agents: number
    production: number
  }
}


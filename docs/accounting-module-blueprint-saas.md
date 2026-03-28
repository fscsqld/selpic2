# SELPIC-Accounting SaaS 확장 설계 문서

## 📋 목차
1. [SaaS 아키텍처 개요](#saas-아키텍처-개요)
2. [범용 세무/회계 코어 엔진](#범용-세무회계-코어-엔진)
3. [결제 게이트웨이 자동 동기화](#결제-게이트웨이-자동-동기화)
4. [업종별 모듈 시스템](#업종별-모듈-시스템)
5. [스마트 영수증 및 증빙 관리](#스마트-영수증-및-증빙-관리)
6. [인보이스 및 페이슬립 통합 관리](#인보이스-및-페이슬립-통합-관리)
7. [현금 흐름 및 세무 예보](#현금-흐름-및-세무-예보)
8. [구독 및 고정비 관리](#구독-및-고정비-관리)
9. [권한 관리 시스템 (RBAC)](#권한-관리-시스템-rbac)
10. [데이터베이스 스키마 확장](#데이터베이스-스키마-확장)
11. [API 설계](#api-설계)
12. [구현 로드맵](#구현-로드맵)

---

## 🏗️ SaaS 아키텍처 개요

### 핵심 원칙
- **멀티 테넌시**: 각 사용자(회사)별로 데이터 완전 분리
- **모듈화**: 업종별 기능을 플러그인으로 분리
- **확장성**: 새로운 업종 모듈을 쉽게 추가 가능
- **보안**: 역할 기반 접근 제어 (RBAC)

### 시스템 구조

```
apps/accounting-sandbox/
├── core/                          # 핵심 엔진 (모든 업종 공통)
│   ├── pdf-parser/               # PDF 파싱
│   ├── ai-classifier/            # AI 분류
│   ├── reconciliation/           # 영수증 매칭
│   ├── forecasting/              # 현금 흐름 예보
│   ├── subscription-manager/    # 구독 관리
│   └── rbac/                     # 권한 관리
│
├── modules/                       # 업종별 모듈 (플러그인)
│   ├── cleaning/                 # 청소업 모듈
│   │   ├── tpar-reporter.ts     # TPAR 리포트
│   │   ├── subcontractor-tracker.ts
│   │   └── index.ts
│   │
│   ├── retail/                   # 소매업 모듈
│   │   ├── inventory-tracker.ts
│   │   ├── sales-tax-calculator.ts
│   │   └── index.ts
│   │
│   ├── it-service/               # IT 서비스 모듈
│   │   ├── project-tracker.ts
│   │   ├── time-billing.ts
│   │   └── index.ts
│   │
│   └── base/                     # 기본 모듈 (공통)
│       └── index.ts
│
├── lib/
│   ├── types/
│   │   ├── user.ts               # 사용자 타입
│   │   ├── organization.ts       # 조직(회사) 타입
│   │   ├── module.ts             # 모듈 인터페이스
│   │   └── rbac.ts               # 권한 타입
│   │
│   └── services/
│       ├── module-loader.ts      # 모듈 동적 로딩
│       ├── reconciliation-service.ts
│       ├── forecasting-service.ts
│       └── subscription-service.ts
│
└── app/
    ├── (auth)/                   # 인증
    ├── (dashboard)/
    │   ├── dashboard/
    │   │   └── page.tsx          # 멀티 테넌트 대시보드
    │   └── settings/
    │       ├── modules/          # 모듈 활성화 설정
    │       └── users/            # 사용자 관리
    │
    └── api/
        ├── reconciliation/
        ├── forecasting/
        └── subscriptions/
```

---

## 🎯 범용 세무/회계 코어 엔진

### 핵심 설계 원칙

1. **회계 전문 엔진**: 재고/상품 관리 등 운영(Operations)은 외부에서 처리, 본 엔진은 세무 및 재무 보고에만 집중
2. **API-First**: 외부 대시보드와 표준 API로 연동
3. **업종별 프리셋**: 업종 선택 시 자동으로 Chart of Accounts 로드
4. **Multi-tenancy**: 다수 매장/사업체 통합 재무 보고서 지원
5. **모듈 아카이빙**: 사용하지 않는 모듈은 아카이빙 처리 가능

### 시스템 구조

```
apps/accounting-sandbox/
├── core/
│   ├── accounting-engine/          # 회계 코어 엔진
│   │   ├── general-ledger.ts       # 총계정원장
│   │   ├── chart-of-accounts.ts   # 계정 과목 관리
│   │   ├── journal-entry.ts       # 분개 처리
│   │   └── financial-reports.ts   # 재무 보고서 생성
│   │
│   ├── tax-engine/                 # 세무 엔진
│   │   ├── gst-calculator.ts      # GST 계산
│   │   ├── payg-calculator.ts     # PAYG 계산
│   │   ├── bas-generator.ts        # BAS 리포트
│   │   └── tax-compliance.ts      # 세무 준수 검증
│   │
│   ├── data-integration/           # 외부 데이터 연동
│   │   ├── api-schema.ts          # 표준 API 스키마
│   │   ├── data-collector.ts     # 데이터 수집
│   │   ├── data-transformer.ts    # 데이터 변환
│   │   └── sync-service.ts        # 동기화 서비스
│   │
│   ├── industry-presets/           # 업종별 프리셋
│   │   ├── retail-preset.ts        # Retail/E-commerce
│   │   ├── service-preset.ts       # Service/Cleaning
│   │   ├── it-service-preset.ts   # IT Service
│   │   └── preset-loader.ts       # 프리셋 로더
│   │
│   └── capital-management/         # 자본 관리
│       ├── directors-loan.ts       # Director's Loan
│       ├── capital-injection.ts    # 자본 투입
│       └── tax-free-withdrawal.ts # 비과세 인출
│
└── data/
    └── storage/
        ├── json-storage.ts         # JSON 기반 저장소
        └── archive-manager.ts     # 아카이빙 관리
```

### API-First 데이터 연동 구조

#### 표준 API 스키마

```typescript
// core/data-integration/api-schema.ts

/**
 * 외부 대시보드에서 수집할 수 있는 표준 데이터 스키마
 */
export interface ExternalSalesData {
  /** 판매 ID (외부 시스템) */
  externalId: string
  
  /** 판매 일자 */
  saleDate: string
  
  /** 판매 유형 */
  saleType: 'product' | 'service' | 'subscription'
  
  /** 고객 정보 */
  customer: {
    name: string
    abn?: string
    email?: string
  }
  
  /** 품목 정보 */
  lineItems: {
    itemId: string
    description: string
    quantity: number
    unitPrice: number
    gstIncluded: boolean
    category?: string
  }[]
  
  /** 금액 정보 */
  subtotal: number
  gstAmount: number
  totalAmount: number
  
  /** 결제 정보 */
  payment: {
    method: 'card' | 'bank_transfer' | 'cash' | 'other'
    transactionId?: string
    paidDate?: string
  }
  
  /** 메타데이터 */
  metadata?: {
    source: string  // 'ecommerce', 'pos', 'manual'
    location?: string  // 매장 위치
    [key: string]: any
  }
}

export interface ExternalInventoryData {
  /** 재고 ID */
  itemId: string
  
  /** 품목명 */
  itemName: string
  
  /** 카테고리 */
  category: string
  
  /** 재고 수량 */
  quantity: number
  
  /** 단가 (원가) */
  unitCost: number
  
  /** 평가 방법 */
  valuationMethod: 'FIFO' | 'LIFO' | 'Weighted Average'
  
  /** 총 재고 가치 */
  totalValue: number
  
  /** 마지막 업데이트 일자 */
  lastUpdated: string
}

export interface ExternalExpenseData {
  /** 지출 ID (외부 시스템) */
  externalId: string
  
  /** 지출 일자 */
  expenseDate: string
  
  /** 공급업체 정보 */
  supplier: {
    name: string
    abn?: string
  }
  
  /** 지출 카테고리 */
  category: string
  
  /** 금액 */
  amount: number
  
  /** GST 포함 여부 */
  gstIncluded: boolean
  
  /** GST 금액 */
  gstAmount: number
  
  /** 결제 정보 */
  payment: {
    method: 'card' | 'bank_transfer' | 'cash'
    transactionId?: string
  }
  
  /** 메타데이터 */
  metadata?: {
    receiptUrl?: string
    invoiceNumber?: string
    [key: string]: any
  }
}
```

#### 데이터 수집 서비스

```typescript
// core/data-integration/data-collector.ts
import { ExternalSalesData, ExternalInventoryData, ExternalExpenseData } from './api-schema'
import { GeneralLedgerRecorder } from '../accounting-engine/general-ledger'
import { ChartOfAccounts } from '../accounting-engine/chart-of-accounts'

export class DataCollector {
  private ledgerRecorder: GeneralLedgerRecorder
  private chartOfAccounts: ChartOfAccounts

  constructor() {
    this.ledgerRecorder = new GeneralLedgerRecorder()
    this.chartOfAccounts = new ChartOfAccounts()
  }

  /**
   * 외부 매출 데이터를 General Ledger로 변환
   */
  async processSalesData(
    organizationId: string,
    salesData: ExternalSalesData
  ): Promise<void> {
    // 1. 계정 과목 결정
    const revenueAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'Sales Revenue'
    )
    const gstAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'GST Payable'
    )
    const arAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'Accounts Receivable'
    )

    // 2. General Ledger 항목 생성
    const entries = [
      {
        account: arAccount.code,
        debit: salesData.totalAmount,
        credit: 0,
        description: `Sale ${salesData.externalId} - ${salesData.customer.name}`,
      },
      {
        account: revenueAccount.code,
        debit: 0,
        credit: salesData.subtotal,
        description: `Sale ${salesData.externalId} - Revenue`,
      },
      {
        account: gstAccount.code,
        debit: 0,
        credit: salesData.gstAmount,
        description: `Sale ${salesData.externalId} - GST Collected`,
      },
    ]

    // 3. General Ledger에 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId,
      sourceDocument: 'external_sale',
      sourceDocumentId: salesData.externalId,
      entries,
      transactionDate: salesData.saleDate,
      metadata: salesData.metadata,
    })
  }

  /**
   * 재고 데이터를 자산 계정으로 변환
   */
  async processInventoryData(
    organizationId: string,
    inventoryData: ExternalInventoryData[]
  ): Promise<void> {
    const inventoryAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'Inventory Asset'
    )

    const totalValue = inventoryData.reduce(
      (sum, item) => sum + item.totalValue,
      0
    )

    // 재고 자산 평가
    await this.ledgerRecorder.recordTransaction({
      organizationId,
      sourceDocument: 'inventory_valuation',
      sourceDocumentId: `inv_${Date.now()}`,
      entries: [
        {
          account: inventoryAccount.code,
          debit: totalValue,
          credit: 0,
          description: 'Inventory Valuation',
        },
      ],
      transactionDate: new Date().toISOString().split('T')[0],
    })
  }

  /**
   * 지출 데이터를 General Ledger로 변환
   */
  async processExpenseData(
    organizationId: string,
    expenseData: ExternalExpenseData
  ): Promise<void> {
    // 1. 지출 카테고리에 맞는 계정 결정
    const expenseAccount = this.chartOfAccounts.getAccountByCategory(
      organizationId,
      expenseData.category
    )
    const gstAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'GST Input Tax Credit'
    )

    // 2. General Ledger 항목 생성
    const entries = [
      {
        account: expenseAccount.code,
        debit: expenseData.amount - expenseData.gstAmount,
        credit: 0,
        description: `Expense ${expenseData.externalId} - ${expenseData.supplier.name}`,
      },
      {
        account: gstAccount.code,
        debit: expenseData.gstAmount,
        credit: 0,
        description: `Expense ${expenseData.externalId} - GST Input Credit`,
      },
      {
        account: 'Bank Account',
        debit: 0,
        credit: expenseData.amount,
        description: `Payment for ${expenseData.externalId}`,
      },
    ]

    // 3. General Ledger에 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId,
      sourceDocument: 'external_expense',
      sourceDocumentId: expenseData.externalId,
      entries,
      transactionDate: expenseData.expenseDate,
      metadata: expenseData.metadata,
    })
  }
}
```

### 업종별 회계 프리셋

#### 프리셋 인터페이스

```typescript
// core/industry-presets/types.ts
export interface IndustryPreset {
  id: string
  name: string
  industry: 'retail' | 'service' | 'it-service' | 'general'
  
  /** Chart of Accounts */
  chartOfAccounts: {
    code: string
    name: string
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    parentCode?: string
    isActive: boolean
  }[]
  
  /** 기본 세무 설정 */
  taxSettings: {
    gstRegistered: boolean
    paygRegistered: boolean
    fbtRegistered: boolean
  }
  
  /** 특화 기능 */
  features: {
    inventoryTracking: boolean
    cogsCalculation: boolean
    tparReporting: boolean
    projectProfitability: boolean
  }
  
  /** 기본 리포트 템플릿 */
  reportTemplates: string[]
}
```

#### Retail/E-commerce 프리셋

```typescript
// core/industry-presets/retail-preset.ts
import { IndustryPreset } from './types'

export const RetailPreset: IndustryPreset = {
  id: 'retail',
  name: 'Retail / E-commerce',
  industry: 'retail',
  
  chartOfAccounts: [
    // Assets
    { code: '1000', name: 'Current Assets', type: 'asset', isActive: true },
    { code: '1100', name: 'Cash and Bank', type: 'asset', parentCode: '1000', isActive: true },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000', isActive: true },
    { code: '1300', name: 'Inventory Asset', type: 'asset', parentCode: '1000', isActive: true },
    { code: '1400', name: 'Prepaid Expenses', type: 'asset', parentCode: '1000', isActive: true },
    
    // Revenue
    { code: '4000', name: 'Revenue', type: 'revenue', isActive: true },
    { code: '4100', name: 'Sales Revenue', type: 'revenue', parentCode: '4000', isActive: true },
    { code: '4200', name: 'Shipping Revenue', type: 'revenue', parentCode: '4000', isActive: true },
    
    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', isActive: true },
    { code: '5100', name: 'COGS - Product Cost', type: 'expense', parentCode: '5000', isActive: true },
    { code: '5200', name: 'COGS - Shipping Cost', type: 'expense', parentCode: '5000', isActive: true },
    
    { code: '6000', name: 'Operating Expenses', type: 'expense', isActive: true },
    { code: '6100', name: 'Marketing & Advertising', type: 'expense', parentCode: '6000', isActive: true },
    { code: '6200', name: 'Platform Fees', type: 'expense', parentCode: '6000', isActive: true },
    { code: '6300', name: 'Packaging & Supplies', type: 'expense', parentCode: '6000', isActive: true },
    
    // Tax
    { code: '2000', name: 'Current Liabilities', type: 'liability', isActive: true },
    { code: '2100', name: 'GST Payable', type: 'liability', parentCode: '2000', isActive: true },
    { code: '2200', name: 'GST Input Tax Credit', type: 'asset', parentCode: '2000', isActive: true },
  ],
  
  taxSettings: {
    gstRegistered: true,
    paygRegistered: false,
    fbtRegistered: false,
  },
  
  features: {
    inventoryTracking: true,
    cogsCalculation: true,
    tparReporting: false,
    projectProfitability: false,
  },
  
  reportTemplates: [
    'profit-and-loss',
    'balance-sheet',
    'inventory-valuation',
    'cogs-analysis',
    'gst-bas-report',
  ],
}
```

#### Service/Cleaning 프리셋

```typescript
// core/industry-presets/service-preset.ts
import { IndustryPreset } from './types'

export const ServicePreset: IndustryPreset = {
  id: 'service',
  name: 'Service / Cleaning',
  industry: 'service',
  
  chartOfAccounts: [
    // Assets
    { code: '1000', name: 'Current Assets', type: 'asset', isActive: true },
    { code: '1100', name: 'Cash and Bank', type: 'asset', parentCode: '1000', isActive: true },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', parentCode: '1000', isActive: true },
    
    // Revenue
    { code: '4000', name: 'Revenue', type: 'revenue', isActive: true },
    { code: '4100', name: 'Service Revenue', type: 'revenue', parentCode: '4000', isActive: true },
    { code: '4200', name: 'Project Revenue', type: 'revenue', parentCode: '4000', isActive: true },
    
    // Expenses
    { code: '5000', name: 'Cost of Services', type: 'expense', isActive: true },
    { code: '5100', name: 'Wages Expense', type: 'expense', parentCode: '5000', isActive: true },
    { code: '5200', name: 'Subcontractor Payments', type: 'expense', parentCode: '5000', isActive: true },
    { code: '5300', name: 'Equipment & Supplies', type: 'expense', parentCode: '5000', isActive: true },
    
    { code: '6000', name: 'Operating Expenses', type: 'expense', isActive: true },
    { code: '6100', name: 'Vehicle Expenses', type: 'expense', parentCode: '6000', isActive: true },
    { code: '6200', name: 'Insurance', type: 'expense', parentCode: '6000', isActive: true },
    
    // Tax
    { code: '2000', name: 'Current Liabilities', type: 'liability', isActive: true },
    { code: '2100', name: 'GST Payable', type: 'liability', parentCode: '2000', isActive: true },
    { code: '2200', name: 'PAYG Payable', type: 'liability', parentCode: '2000', isActive: true },
  ],
  
  taxSettings: {
    gstRegistered: true,
    paygRegistered: true,
    fbtRegistered: false,
  },
  
  features: {
    inventoryTracking: false,
    cogsCalculation: false,
    tparReporting: true,
    projectProfitability: true,
  },
  
  reportTemplates: [
    'profit-and-loss',
    'balance-sheet',
    'tpar-report',
    'project-profitability',
    'gst-bas-report',
    'payg-summary',
  ],
}
```

#### 프리셋 로더

```typescript
// core/industry-presets/preset-loader.ts
import { IndustryPreset } from './types'
import { RetailPreset } from './retail-preset'
import { ServicePreset } from './service-preset'
import { ChartOfAccounts } from '../accounting-engine/chart-of-accounts'

export class PresetLoader {
  private presets: Map<string, IndustryPreset> = new Map()

  constructor() {
    this.presets.set('retail', RetailPreset)
    this.presets.set('service', ServicePreset)
  }

  /**
   * 업종 프리셋 로드
   */
  async loadPreset(
    organizationId: string,
    presetId: string
  ): Promise<IndustryPreset> {
    const preset = this.presets.get(presetId)
    if (!preset) {
      throw new Error(`Preset not found: ${presetId}`)
    }

    // Chart of Accounts 적용
    const chartOfAccounts = new ChartOfAccounts()
    await chartOfAccounts.initializeFromPreset(organizationId, preset)

    return preset
  }

  /**
   * 사용 가능한 프리셋 목록
   */
  getAvailablePresets(): IndustryPreset[] {
    return Array.from(this.presets.values())
  }
}
```

### 자금 흐름 추적 (Director's Loan & Capital)

```typescript
// core/capital-management/directors-loan.ts
import { GeneralLedgerRecorder } from '../accounting-engine/general-ledger'
import { ChartOfAccounts } from '../accounting-engine/chart-of-accounts'

export interface DirectorsLoanTransaction {
  id: string
  organizationId: string
  date: string
  description: string
  amount: number
  type: 'capital-injection' | 'withdrawal' | 'repayment'
  isPreRevenue: boolean  // 1-3월 과도기 여부
  availableForWithdrawal: number  // 비과세 인출 가능 금액
}

export class DirectorsLoanManager {
  private ledgerRecorder: GeneralLedgerRecorder
  private chartOfAccounts: ChartOfAccounts

  constructor() {
    this.ledgerRecorder = new GeneralLedgerRecorder()
    this.chartOfAccounts = new ChartOfAccounts()
  }

  /**
   * Director's Loan 자본 투입 기록
   */
  async recordCapitalInjection(
    organizationId: string,
    data: {
      date: string
      description: string
      amount: number
      isPreRevenue: boolean
    }
  ): Promise<DirectorsLoanTransaction> {
    const directorsLoanAccount = this.chartOfAccounts.getAccount(
      organizationId,
      "Director's Loan"
    )
    const bankAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'Cash and Bank'
    )

    // General Ledger 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId,
      sourceDocument: 'directors_loan',
      sourceDocumentId: `dl_${Date.now()}`,
      entries: [
        {
          account: bankAccount.code,
          debit: data.amount,
          credit: 0,
          description: `Director's Loan - Capital Injection`,
        },
        {
          account: directorsLoanAccount.code,
          debit: 0,
          credit: data.amount,
          description: `Director's Loan - Capital Injection from ${data.description}`,
        },
      ],
      transactionDate: data.date,
    })

    return {
      id: `dl_${Date.now()}`,
      organizationId,
      date: data.date,
      description: data.description,
      amount: data.amount,
      type: 'capital-injection',
      isPreRevenue: data.isPreRevenue,
      availableForWithdrawal: data.amount, // 초기에는 전액 인출 가능
    }
  }

  /**
   * 비과세 인출 가능 금액 계산
   */
  async calculateAvailableWithdrawal(
    organizationId: string
  ): Promise<number> {
    // 1. 총 자본 투입액 계산
    const capitalInjections = await this.getCapitalInjections(organizationId)
    const totalInjection = capitalInjections.reduce(
      (sum, tx) => sum + tx.amount,
      0
    )

    // 2. 총 인출액 계산
    const withdrawals = await this.getWithdrawals(organizationId)
    const totalWithdrawal = withdrawals.reduce((sum, tx) => sum + tx.amount, 0)

    // 3. 비과세 인출 가능 금액 = 자본 투입 - 인출
    return Math.max(0, totalInjection - totalWithdrawal)
  }

  /**
   * 비과세 인출 처리
   */
  async processTaxFreeWithdrawal(
    organizationId: string,
    data: {
      date: string
      description: string
      amount: number
    }
  ): Promise<void> {
    const available = await this.calculateAvailableWithdrawal(organizationId)

    if (data.amount > available) {
      throw new Error(
        `Insufficient available withdrawal. Available: $${available.toFixed(2)}, Requested: $${data.amount.toFixed(2)}`
      )
    }

    const directorsLoanAccount = this.chartOfAccounts.getAccount(
      organizationId,
      "Director's Loan"
    )
    const bankAccount = this.chartOfAccounts.getAccount(
      organizationId,
      'Cash and Bank'
    )

    // General Ledger 기록 (비과세 인출)
    await this.ledgerRecorder.recordTransaction({
      organizationId,
      sourceDocument: 'directors_loan_withdrawal',
      sourceDocumentId: `dlw_${Date.now()}`,
      entries: [
        {
          account: directorsLoanAccount.code,
          debit: data.amount,
          credit: 0,
          description: `Director's Loan - Tax-Free Withdrawal`,
        },
        {
          account: bankAccount.code,
          debit: 0,
          credit: data.amount,
          description: `Director's Loan - Tax-Free Withdrawal: ${data.description}`,
        },
      ],
      transactionDate: data.date,
    })
  }

  private async getCapitalInjections(
    organizationId: string
  ): Promise<DirectorsLoanTransaction[]> {
    // 데이터베이스에서 조회
    return []
  }

  private async getWithdrawals(
    organizationId: string
  ): Promise<DirectorsLoanTransaction[]> {
    // 데이터베이스에서 조회
    return []
  }
}
```

### JSON 기반 데이터 저장소

```typescript
// data/storage/json-storage.ts
export class JSONStorage {
  /**
   * 조직별 데이터 저장
   */
  async saveOrganizationData(
    organizationId: string,
    dataType: string,
    data: any
  ): Promise<void> {
    const filePath = `data/${organizationId}/${dataType}.json`
    const jsonData = JSON.stringify(data, null, 2)
    
    // 파일 시스템 또는 클라우드 스토리지에 저장
    await this.writeFile(filePath, jsonData)
  }

  /**
   * 조직별 데이터 로드
   */
  async loadOrganizationData(
    organizationId: string,
    dataType: string
  ): Promise<any> {
    const filePath = `data/${organizationId}/${dataType}.json`
    const jsonData = await this.readFile(filePath)
    return JSON.parse(jsonData)
  }

  /**
   * General Ledger 데이터 저장
   */
  async saveGeneralLedger(
    organizationId: string,
    entries: any[]
  ): Promise<void> {
    await this.saveOrganizationData(organizationId, 'general-ledger', {
      entries,
      lastUpdated: new Date().toISOString(),
    })
  }

  private async writeFile(path: string, content: string): Promise<void> {
    // 실제 파일 쓰기 구현
  }

  private async readFile(path: string): Promise<string> {
    // 실제 파일 읽기 구현
    return '{}'
  }
}
```

### 모듈 아카이빙 시스템

```typescript
// core/module-archive/archive-manager.ts
export class ArchiveManager {
  /**
   * 모듈 아카이빙 처리
   */
  async archiveModule(
    organizationId: string,
    moduleId: string
  ): Promise<void> {
    // 1. 모듈 비활성화
    await this.deactivateModule(organizationId, moduleId)

    // 2. 모듈 데이터 백업
    const moduleData = await this.exportModuleData(organizationId, moduleId)
    await this.saveArchive(organizationId, moduleId, moduleData)

    // 3. 모듈 데이터 삭제 (또는 보관)
    await this.removeModuleData(organizationId, moduleId)
  }

  /**
   * 아카이브 복원
   */
  async restoreModule(
    organizationId: string,
    moduleId: string,
    archiveDate: string
  ): Promise<void> {
    const archiveData = await this.loadArchive(
      organizationId,
      moduleId,
      archiveDate
    )
    await this.importModuleData(organizationId, moduleId, archiveData)
  }

  private async deactivateModule(
    organizationId: string,
    moduleId: string
  ): Promise<void> {
    // 모듈 비활성화 로직
  }

  private async exportModuleData(
    organizationId: string,
    moduleId: string
  ): Promise<any> {
    // 모듈 데이터 내보내기
    return {}
  }

  private async saveArchive(
    organizationId: string,
    moduleId: string,
    data: any
  ): Promise<void> {
    const archivePath = `archives/${organizationId}/${moduleId}/${Date.now()}.json`
    await this.writeFile(archivePath, JSON.stringify(data, null, 2))
  }

  private async writeFile(path: string, content: string): Promise<void> {
    // 파일 쓰기 구현
  }
}
```

---

## 💳 결제 게이트웨이 자동 동기화

### 핵심 설계 원칙

1. **Zero-touch 자동화**: Webhook을 통한 결제 확인 즉시 주문 상태 자동 업데이트
2. **회계 데이터 자동 생성**: 결제 수수료와 정산액을 구분하여 General Ledger 자동 분개
3. **실시간 알림**: 웹 대시보드와 모바일 앱에 동시 알림 전송

### 시스템 구조

```
apps/accounting-sandbox/
├── core/
│   ├── payment-gateway/            # 결제 게이트웨이 통합
│   │   ├── stripe-webhook.ts       # Stripe Webhook 처리
│   │   ├── paypal-webhook.ts       # PayPal Webhook 처리
│   │   ├── payment-processor.ts    # 결제 처리 엔진
│   │   └── fee-calculator.ts       # 수수료 계산
│   │
│   ├── order-sync/                  # 주문 동기화
│   │   ├── order-updater.ts        # 주문 상태 업데이트
│   │   ├── packing-list-generator.ts # 패킹 리스트 생성
│   │   └── fulfillment-tracker.ts  # 이행 추적
│   │
│   └── notification/                # 알림 시스템
│       ├── web-notification.ts     # 웹 대시보드 알림
│       ├── mobile-notification.ts   # 모바일 알림
│       └── notification-router.ts  # 알림 라우터
```

### Webhook 처리 시스템

#### Stripe Webhook 처리

```typescript
// core/payment-gateway/stripe-webhook.ts
import { PaymentProcessor } from './payment-processor'
import { OrderUpdater } from '../order-sync/order-updater'
import { NotificationRouter } from '../notification/notification-router'

export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: {
      id: string  // payment_intent_id
      amount: number
      currency: string
      status: 'succeeded' | 'failed' | 'pending'
      metadata?: {
        orderId?: string
        organizationId?: string
        [key: string]: string
      }
      charges?: {
        data: Array<{
          id: string
          amount: number
          fee: number
          net: number
        }>
      }
    }
  }
}

export class StripeWebhookHandler {
  private paymentProcessor: PaymentProcessor
  private orderUpdater: OrderUpdater
  private notificationRouter: NotificationRouter

  constructor() {
    this.paymentProcessor = new PaymentProcessor()
    this.orderUpdater = new OrderUpdater()
    this.notificationRouter = new NotificationRouter()
  }

  /**
   * Stripe Webhook 이벤트 처리
   */
  async handleWebhook(event: StripeWebhookEvent): Promise<void> {
    // 1. 이벤트 타입 확인
    if (event.type !== 'payment_intent.succeeded') {
      return  // 결제 성공 이벤트만 처리
    }

    const paymentIntent = event.data.object
    const orderId = paymentIntent.metadata?.orderId
    const organizationId = paymentIntent.metadata?.organizationId

    if (!orderId || !organizationId) {
      throw new Error('Missing orderId or organizationId in metadata')
    }

    // 2. 결제 정보 추출
    const charge = paymentIntent.charges?.data[0]
    if (!charge) {
      throw new Error('No charge data found')
    }

    const grossAmount = paymentIntent.amount / 100  // 센트를 달러로 변환
    const feeAmount = charge.fee / 100
    const netAmount = charge.net / 100

    // 3. 주문 상태 자동 업데이트 (Zero-touch)
    await this.orderUpdater.updateOrderStatus(orderId, {
      status: 'paid',
      paymentIntentId: paymentIntent.id,
      paidAt: new Date().toISOString(),
    })

    // 4. 패킹 리스트에 자동 추가
    await this.orderUpdater.addToPackingList(orderId)

    // 5. 회계 데이터 자동 생성
    await this.paymentProcessor.recordPaymentTransaction({
      organizationId,
      orderId,
      paymentIntentId: paymentIntent.id,
      grossAmount,
      feeAmount,
      netAmount,
      currency: paymentIntent.currency,
      paymentMethod: 'stripe',
      transactionDate: new Date().toISOString(),
    })

    // 6. 실시간 알림 전송
    await this.notificationRouter.sendPaymentNotifications({
      organizationId,
      orderId,
      grossAmount,
      netAmount,
      paymentMethod: 'stripe',
    })
  }

  /**
   * Webhook 서명 검증
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // Stripe Webhook 서명 검증 로직
    // 실제 구현 시 stripe 라이브러리 사용
    return true
  }
}
```

#### PayPal Webhook 처리

```typescript
// core/payment-gateway/paypal-webhook.ts
export interface PayPalWebhookEvent {
  event_type: string
  resource: {
    id: string  // payment_id
    amount: {
      total: string
      currency: string
    }
    transaction_fee?: {
      value: string
      currency: string
    }
    custom_id?: string  // orderId
  }
}

export class PayPalWebhookHandler {
  private paymentProcessor: PaymentProcessor
  private orderUpdater: OrderUpdater
  private notificationRouter: NotificationRouter

  constructor() {
    this.paymentProcessor = new PaymentProcessor()
    this.orderUpdater = new OrderUpdater()
    this.notificationRouter = new NotificationRouter()
  }

  /**
   * PayPal Webhook 이벤트 처리
   */
  async handleWebhook(event: PayPalWebhookEvent): Promise<void> {
    // 1. 이벤트 타입 확인
    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return
    }

    const payment = event.resource
    const orderId = payment.custom_id

    if (!orderId) {
      throw new Error('Missing orderId in custom_id')
    }

    // 2. 결제 정보 추출
    const grossAmount = parseFloat(payment.amount.total)
    const feeAmount = payment.transaction_fee
      ? parseFloat(payment.transaction_fee.value)
      : 0
    const netAmount = grossAmount - feeAmount

    // 3. 주문 상태 자동 업데이트
    await this.orderUpdater.updateOrderStatus(orderId, {
      status: 'paid',
      paymentId: payment.id,
      paidAt: new Date().toISOString(),
    })

    // 4. 패킹 리스트에 자동 추가
    await this.orderUpdater.addToPackingList(orderId)

    // 5. 회계 데이터 자동 생성
    await this.paymentProcessor.recordPaymentTransaction({
      organizationId: '', // PayPal에서 추출 필요
      orderId,
      paymentIntentId: payment.id,
      grossAmount,
      feeAmount,
      netAmount,
      currency: payment.amount.currency,
      paymentMethod: 'paypal',
      transactionDate: new Date().toISOString(),
    })

    // 6. 실시간 알림 전송
    await this.notificationRouter.sendPaymentNotifications({
      organizationId: '', // PayPal에서 추출 필요
      orderId,
      grossAmount,
      netAmount,
      paymentMethod: 'paypal',
    })
  }
}
```

### 회계 데이터 자동 생성

```typescript
// core/payment-gateway/payment-processor.ts
import { GeneralLedgerRecorder } from '../accounting-engine/general-ledger'
import { ChartOfAccounts } from '../accounting-engine/chart-of-accounts'

export interface PaymentTransaction {
  organizationId: string
  orderId: string
  paymentIntentId: string
  grossAmount: number
  feeAmount: number
  netAmount: number
  currency: string
  paymentMethod: 'stripe' | 'paypal'
  transactionDate: string
}

export class PaymentProcessor {
  private ledgerRecorder: GeneralLedgerRecorder
  private chartOfAccounts: ChartOfAccounts

  constructor() {
    this.ledgerRecorder = new GeneralLedgerRecorder()
    this.chartOfAccounts = new ChartOfAccounts()
  }

  /**
   * 결제 거래를 General Ledger에 자동 분개
   */
  async recordPaymentTransaction(
    transaction: PaymentTransaction
  ): Promise<void> {
    // 1. 계정 과목 가져오기
    const bankAccount = this.chartOfAccounts.getAccount(
      transaction.organizationId,
      'Cash and Bank'
    )
    const salesRevenueAccount = this.chartOfAccounts.getAccount(
      transaction.organizationId,
      'Sales Revenue'
    )
    const paymentFeeAccount = this.chartOfAccounts.getAccount(
      transaction.organizationId,
      'Payment Processing Fees'
    )
    const gstAccount = this.chartOfAccounts.getAccount(
      transaction.organizationId,
      'GST Payable'
    )

    // 2. GST 계산 (호주 GST 10%)
    const gstIncluded = true  // 일반적으로 포함
    const gstAmount = Math.round(
      (transaction.grossAmount * 0.1 / 1.1) * 100
    ) / 100
    const revenueExcludingGST = transaction.grossAmount - gstAmount

    // 3. General Ledger 항목 생성
    const entries = [
      // 실제 입금액 (Net Amount)
      {
        account: bankAccount.code,
        debit: transaction.netAmount,
        credit: 0,
        description: `Payment received for Order ${transaction.orderId} (${transaction.paymentMethod})`,
      },
      // 매출액 (GST 제외)
      {
        account: salesRevenueAccount.code,
        debit: 0,
        credit: revenueExcludingGST,
        description: `Sales Revenue - Order ${transaction.orderId}`,
      },
      // GST 수집
      {
        account: gstAccount.code,
        debit: 0,
        credit: gstAmount,
        description: `GST Collected - Order ${transaction.orderId}`,
      },
      // 결제 수수료 (비용)
      {
        account: paymentFeeAccount.code,
        debit: transaction.feeAmount,
        credit: 0,
        description: `Payment Processing Fee - ${transaction.paymentMethod} (Order ${transaction.orderId})`,
      },
    ]

    // 4. General Ledger에 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId: transaction.organizationId,
      sourceDocument: 'payment_gateway',
      sourceDocumentId: transaction.paymentIntentId,
      entries,
      transactionDate: transaction.transactionDate,
      metadata: {
        orderId: transaction.orderId,
        paymentMethod: transaction.paymentMethod,
        grossAmount: transaction.grossAmount,
        feeAmount: transaction.feeAmount,
        netAmount: transaction.netAmount,
      },
    })
  }
}
```

### 주문 상태 자동 업데이트

```typescript
// core/order-sync/order-updater.ts
export interface OrderStatusUpdate {
  status: 'pending' | 'paid' | 'packing' | 'shipped' | 'delivered' | 'cancelled'
  paymentIntentId?: string
  paymentId?: string
  paidAt?: string
}

export class OrderUpdater {
  /**
   * 주문 상태 자동 업데이트 (Zero-touch)
   */
  async updateOrderStatus(
    orderId: string,
    update: OrderStatusUpdate
  ): Promise<void> {
    // 1. 주문 조회
    const order = await this.getOrder(orderId)
    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // 2. 상태 업데이트
    await this.updateOrder(orderId, {
      status: update.status,
      paymentIntentId: update.paymentIntentId || update.paymentId,
      paidAt: update.paidAt,
      updatedAt: new Date().toISOString(),
    })

    // 3. 상태 변경 이력 기록
    await this.recordStatusChange(orderId, {
      fromStatus: order.status,
      toStatus: update.status,
      changedAt: new Date().toISOString(),
      reason: 'payment_confirmed',
    })
  }

  /**
   * 패킹 리스트에 자동 추가
   */
  async addToPackingList(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId)
    if (!order) {
      throw new Error(`Order not found: ${orderId}`)
    }

    // 패킹 리스트에 추가
    await this.createPackingListEntry({
      orderId,
      items: order.items,
      priority: 'normal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  }

  private async getOrder(orderId: string): Promise<any> {
    // 데이터베이스에서 주문 조회
    return null
  }

  private async updateOrder(orderId: string, data: any): Promise<void> {
    // 데이터베이스 업데이트
  }

  private async recordStatusChange(
    orderId: string,
    change: any
  ): Promise<void> {
    // 상태 변경 이력 기록
  }

  private async createPackingListEntry(entry: any): Promise<void> {
    // 패킹 리스트 항목 생성
  }
}
```

### 실시간 알림 시스템

```typescript
// core/notification/notification-router.ts
import { WebNotificationService } from './web-notification'
import { MobileNotificationService } from './mobile-notification'

export interface PaymentNotification {
  organizationId: string
  orderId: string
  grossAmount: number
  netAmount: number
  paymentMethod: 'stripe' | 'paypal'
}

export class NotificationRouter {
  private webNotification: WebNotificationService
  private mobileNotification: MobileNotificationService

  constructor() {
    this.webNotification = new WebNotificationService()
    this.mobileNotification = new MobileNotificationService()
  }

  /**
   * 결제 성공 알림 전송
   */
  async sendPaymentNotifications(
    notification: PaymentNotification
  ): Promise<void> {
    // 1. 웹 대시보드 알림 (패킹 알림)
    await this.webNotification.sendPackingNotification({
      organizationId: notification.organizationId,
      orderId: notification.orderId,
      amount: notification.grossAmount,
      paymentMethod: notification.paymentMethod,
      timestamp: new Date().toISOString(),
    })

    // 2. 모바일 알림 (매출 요약)
    await this.mobileNotification.sendSalesSummary({
      organizationId: notification.organizationId,
      orderId: notification.orderId,
      grossAmount: notification.grossAmount,
      netAmount: notification.netAmount,
      paymentMethod: notification.paymentMethod,
      timestamp: new Date().toISOString(),
    })
  }
}
```

#### 웹 대시보드 알림

```typescript
// core/notification/web-notification.ts
export class WebNotificationService {
  /**
   * 웹 대시보드 패킹 알림
   */
  async sendPackingNotification(data: {
    organizationId: string
    orderId: string
    amount: number
    paymentMethod: string
    timestamp: string
  }): Promise<void> {
    // 1. WebSocket 또는 Server-Sent Events를 통해 실시간 알림
    await this.broadcastToWebClients(data.organizationId, {
      type: 'packing_notification',
      title: 'New Order Ready for Packing',
      message: `Order #${data.orderId} - $${data.amount.toFixed(2)} (${data.paymentMethod})`,
      orderId: data.orderId,
      timestamp: data.timestamp,
      action: {
        type: 'view_packing_list',
        url: `/admin/orders/${data.orderId}`,
      },
    })

    // 2. 데이터베이스에 알림 저장 (읽지 않은 알림 표시용)
    await this.saveNotification({
      organizationId: data.organizationId,
      type: 'packing',
      title: 'New Order Ready for Packing',
      message: `Order #${data.orderId}`,
      orderId: data.orderId,
      read: false,
      createdAt: data.timestamp,
    })
  }

  private async broadcastToWebClients(
    organizationId: string,
    notification: any
  ): Promise<void> {
    // WebSocket 또는 SSE 브로드캐스트
    // 실제 구현 시 Socket.io 또는 유사한 라이브러리 사용
  }

  private async saveNotification(notification: any): Promise<void> {
    // 데이터베이스에 알림 저장
  }
}
```

#### 모바일 알림

```typescript
// core/notification/mobile-notification.ts
export class MobileNotificationService {
  /**
   * 모바일 매출 요약 알림
   */
  async sendSalesSummary(data: {
    organizationId: string
    orderId: string
    grossAmount: number
    netAmount: number
    paymentMethod: string
    timestamp: string
  }): Promise<void> {
    // 1. 사장님 모바일 디바이스 토큰 조회
    const deviceTokens = await this.getOwnerDeviceTokens(data.organizationId)

    if (deviceTokens.length === 0) {
      return  // 모바일 디바이스가 등록되지 않음
    }

    // 2. 푸시 알림 전송
    for (const token of deviceTokens) {
      await this.sendPushNotification(token, {
        title: '💰 New Sale',
        body: `Order #${data.orderId}: $${data.grossAmount.toFixed(2)} (Net: $${data.netAmount.toFixed(2)})`,
        data: {
          type: 'payment_success',
          orderId: data.orderId,
          grossAmount: data.grossAmount,
          netAmount: data.netAmount,
          paymentMethod: data.paymentMethod,
        },
        sound: 'default',
        badge: 1,
      })
    }

    // 3. 오늘 매출 요약 업데이트
    await this.updateDailySalesSummary(data.organizationId, {
      date: new Date().toISOString().split('T')[0],
      grossAmount: data.grossAmount,
      netAmount: data.netAmount,
      orderCount: 1,
    })
  }

  private async getOwnerDeviceTokens(
    organizationId: string
  ): Promise<string[]> {
    // 데이터베이스에서 사장님의 모바일 디바이스 토큰 조회
    return []
  }

  private async sendPushNotification(
    deviceToken: string,
    notification: any
  ): Promise<void> {
    // FCM (Firebase Cloud Messaging) 또는 APNS (Apple Push Notification Service) 사용
    // 실제 구현 시 firebase-admin 또는 node-apn 라이브러리 사용
  }

  private async updateDailySalesSummary(
    organizationId: string,
    summary: any
  ): Promise<void> {
    // 오늘 매출 요약 업데이트
  }
}
```

### API 엔드포인트

```typescript
// app/api/webhooks/stripe/route.ts
import { StripeWebhookHandler } from '@/core/payment-gateway/stripe-webhook'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  // Webhook 서명 검증
  const handler = new StripeWebhookHandler()
  const isValid = handler.verifyWebhookSignature(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  // 이벤트 처리
  const event = JSON.parse(body)
  await handler.handleWebhook(event)

  return new Response('OK', { status: 200 })
}
```

```typescript
// app/api/webhooks/paypal/route.ts
import { PayPalWebhookHandler } from '@/core/payment-gateway/paypal-webhook'

export async function POST(request: Request) {
  const event = await request.json()

  const handler = new PayPalWebhookHandler()
  await handler.handleWebhook(event)

  return new Response('OK', { status: 200 })
}
```

### 데이터베이스 스키마 확장

```sql
-- 결제 거래 테이블
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  order_id VARCHAR(255) NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL,
  payment_method VARCHAR(20) NOT NULL, -- 'stripe', 'paypal'
  
  -- 금액 정보
  gross_amount DECIMAL(15, 2) NOT NULL,
  fee_amount DECIMAL(15, 2) NOT NULL,
  net_amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'AUD',
  
  -- 상태
  status VARCHAR(20) NOT NULL, -- 'pending', 'succeeded', 'failed'
  
  -- 회계 연동
  general_ledger_entry_id UUID REFERENCES general_ledger_entries(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  type VARCHAR(50) NOT NULL, -- 'packing', 'payment_success', 'sales_summary'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- 관련 데이터
  order_id VARCHAR(255),
  metadata JSONB,
  
  -- 상태
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 모바일 디바이스 토큰 테이블
CREATE TABLE mobile_device_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  device_token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android'
  device_id VARCHAR(255),
  
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 일일 매출 요약 테이블
CREATE TABLE daily_sales_summary (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  gross_amount DECIMAL(15, 2) DEFAULT 0,
  net_amount DECIMAL(15, 2) DEFAULT 0,
  fee_amount DECIMAL(15, 2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(organization_id, date)
);

-- 인덱스
CREATE INDEX idx_payment_transactions_organization ON payment_transactions(organization_id);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_notifications_organization ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_mobile_tokens_user ON mobile_device_tokens(user_id);
CREATE INDEX idx_daily_sales_organization ON daily_sales_summary(organization_id, date);
```

---

## 🔌 업종별 모듈 시스템

### 모듈 인터페이스 정의

```typescript
// lib/types/module.ts
export interface IndustryModule {
  /** 모듈 ID (고유 식별자) */
  id: string
  
  /** 모듈 이름 */
  name: string
  
  /** 모듈 설명 */
  description: string
  
  /** 업종 카테고리 */
  industry: 'cleaning' | 'retail' | 'it-service' | 'general'
  
  /** 모듈 활성화 여부 */
  isEnabled: boolean
  
  /** 모듈 초기화 */
  initialize(organizationId: string): Promise<void>
  
  /** AI 프롬프트 컨텍스트 확장 */
  extendAIContext(baseContext: string): string
  
  /** 커스텀 리포트 생성 */
  generateReports(transactions: BankTransaction[]): Promise<ModuleReport[]>
  
  /** 커스텀 UI 컴포넌트 */
  getUIComponents(): ModuleUIComponent[]
  
  /** 커스텀 카테고리 */
  getCustomCategories(): ATOCategory[]
}

export interface ModuleReport {
  id: string
  name: string
  type: 'summary' | 'detailed' | 'tax'
  data: any
  generatedAt: string
}

export interface ModuleUIComponent {
  id: string
  name: string
  component: React.ComponentType<any>
  placement: 'dashboard' | 'reports' | 'settings'
}
```

### 청소업 모듈 구현 예시

```typescript
// modules/cleaning/index.ts
import { IndustryModule, ModuleReport, ModuleUIComponent } from '@/lib/types/module'
import { BankTransaction } from '@/core/pdf-parser/types'
import { TPARReporter } from './tpar-reporter'
import { SubcontractorTracker } from './subcontractor-tracker'
import TPARReportComponent from './components/TPARReportComponent'

export class CleaningModule implements IndustryModule {
  id = 'cleaning'
  name = 'Cleaning Services Module'
  description = 'Commercial cleaning services specific features'
  industry = 'cleaning'
  isEnabled = false

  private tparReporter: TPARReporter
  private subcontractorTracker: SubcontractorTracker

  async initialize(organizationId: string): Promise<void> {
    this.tparReporter = new TPARReporter(organizationId)
    this.subcontractorTracker = new SubcontractorTracker(organizationId)
    this.isEnabled = true
  }

  extendAIContext(baseContext: string): string {
    return `${baseContext}

**Cleaning Industry Context:**
- Focus on subcontractor payments (TPAR reportable)
- Commercial cleaning service contracts
- Equipment and supply expenses
- Regular payment patterns to individuals
- Keywords: "cleaning", "subcontractor", "TPAR", "commercial", "service"
`
  }

  async generateReports(transactions: BankTransaction[]): Promise<ModuleReport[]> {
    const cleaningTransactions = transactions.filter(tx => 
      tx.department === 'cleaning'
    )

    const tparReport = await this.tparReporter.generateTPARReport(
      cleaningTransactions,
      this.getCurrentFinancialYear()
    )

    return [
      {
        id: 'tpar-report',
        name: 'TPAR Report (Taxable Payments Annual Report)',
        type: 'tax',
        data: tparReport,
        generatedAt: new Date().toISOString(),
      },
      {
        id: 'subcontractor-summary',
        name: 'Subcontractor Payment Summary',
        type: 'summary',
        data: await this.subcontractorTracker.generateSummary(cleaningTransactions),
        generatedAt: new Date().toISOString(),
      },
    ]
  }

  getUIComponents(): ModuleUIComponent[] {
    return [
      {
        id: 'tpar-report-widget',
        name: 'TPAR Report Widget',
        component: TPARReportComponent,
        placement: 'dashboard',
      },
    ]
  }

  getCustomCategories(): ATOCategory[] {
    return [
      {
        code: 'EXPENSE_CLEANING_SUBCONTRACTOR',
        name: 'Cleaning - Subcontractor Payments',
        description: 'Payments to cleaning subcontractors (TPAR reportable)',
        parentCategory: 'EXPENSE',
      },
      {
        code: 'EXPENSE_CLEANING_EQUIPMENT',
        name: 'Cleaning - Equipment',
        description: 'Cleaning equipment and supplies',
        parentCategory: 'EXPENSE',
      },
    ]
  }

  private getCurrentFinancialYear(): string {
    const now = new Date()
    const year = now.getFullYear()
    return now.getMonth() < 6 ? `${year - 1}-${year}` : `${year}-${year + 1}`
  }
}
```

### 모듈 로더 서비스

```typescript
// lib/services/module-loader.ts
import { IndustryModule } from '@/lib/types/module'
import { CleaningModule } from '@/modules/cleaning'
import { RetailModule } from '@/modules/retail'
import { ITServiceModule } from '@/modules/it-service'

export class ModuleLoader {
  private modules: Map<string, IndustryModule> = new Map()
  private activeModules: Set<string> = new Set()

  /**
   * 사용 가능한 모든 모듈 등록
   */
  registerModules(): void {
    this.modules.set('cleaning', new CleaningModule())
    this.modules.set('retail', new RetailModule())
    this.modules.set('it-service', new ITServiceModule())
  }

  /**
   * 조직별 활성 모듈 로드
   */
  async loadActiveModules(
    organizationId: string,
    enabledModuleIds: string[]
  ): Promise<IndustryModule[]> {
    const activeModules: IndustryModule[] = []

    for (const moduleId of enabledModuleIds) {
      const module = this.modules.get(moduleId)
      if (module) {
        await module.initialize(organizationId)
        activeModules.push(module)
        this.activeModules.add(moduleId)
      }
    }

    return activeModules
  }

  /**
   * 활성 모듈의 AI 컨텍스트 통합
   */
  buildExtendedAIContext(baseContext: string): string {
    let extendedContext = baseContext

    for (const moduleId of this.activeModules) {
      const module = this.modules.get(moduleId)
      if (module) {
        extendedContext = module.extendAIContext(extendedContext)
      }
    }

    return extendedContext
  }

  /**
   * 활성 모듈의 커스텀 카테고리 통합
   */
  getExtendedCategories(baseCategories: ATOCategory[]): ATOCategory[] {
    const extendedCategories = [...baseCategories]

    for (const moduleId of this.activeModules) {
      const module = this.modules.get(moduleId)
      if (module) {
        extendedCategories.push(...module.getCustomCategories())
      }
    }

    return extendedCategories
  }

  /**
   * 활성 모듈의 UI 컴포넌트 가져오기
   */
  getActiveUIComponents(): ModuleUIComponent[] {
    const components: ModuleUIComponent[] = []

    for (const moduleId of this.activeModules) {
      const module = this.modules.get(moduleId)
      if (module) {
        components.push(...module.getUIComponents())
      }
    }

    return components
  }
}
```

---

## 🧾 스마트 영수증 및 증빙 관리

### 영수증 매칭 로직

```typescript
// core/reconciliation/receipt-matcher.ts
import { BankTransaction } from '../pdf-parser/types'

export interface Receipt {
  id: string
  organizationId: string
  uploadedAt: string
  fileUrl: string
  fileType: 'image' | 'pdf'
  
  // AI 추출 정보
  extractedData?: {
    date?: string
    amount?: number
    merchantName?: string
    items?: {
      description: string
      quantity: number
      unitPrice: number
      total: number
    }[]
    gstAmount?: number
    totalAmount: number
  }
  
  // 매칭 정보
  matchedTransactionId?: string
  matchConfidence?: number
  matchStatus: 'pending' | 'matched' | 'manual' | 'unmatched'
}

export class ReceiptMatcher {
  /**
   * 영수증과 거래 내역 자동 매칭
   */
  async matchReceiptToTransaction(
    receipt: Receipt,
    transactions: BankTransaction[]
  ): Promise<{
    matchedTransaction?: BankTransaction
    confidence: number
    reason: string
  }> {
    if (!receipt.extractedData) {
      return {
        confidence: 0,
        reason: 'Receipt data not extracted',
      }
    }

    const { date, amount, merchantName } = receipt.extractedData

    // 1. 날짜 범위 필터링 (±7일)
    const dateRange = this.getDateRange(date, 7)
    const candidateTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= dateRange.start && txDate <= dateRange.end
    })

    if (candidateTransactions.length === 0) {
      return {
        confidence: 0,
        reason: 'No transactions found in date range',
      }
    }

    // 2. 금액 매칭 (±$0.50 허용)
    const amountMatches = candidateTransactions.filter(tx => {
      const txAmount = Math.abs(tx.debit || tx.credit || 0)
      return Math.abs(txAmount - amount) <= 0.5
    })

    if (amountMatches.length === 0) {
      return {
        confidence: 0,
        reason: 'No transactions match amount',
      }
    }

    // 3. 업체명 유사도 검사 (AI 기반)
    let bestMatch: BankTransaction | undefined
    let bestConfidence = 0
    let bestReason = ''

    for (const tx of amountMatches) {
      const nameSimilarity = await this.calculateNameSimilarity(
        merchantName || '',
        tx.description
      )

      const dateProximity = this.calculateDateProximity(date, tx.date)
      
      // 종합 신뢰도 계산
      const confidence = (
        nameSimilarity * 0.6 +  // 업체명 60%
        dateProximity * 0.3 +   // 날짜 30%
        0.1                      // 금액 매칭 10%
      )

      if (confidence > bestConfidence) {
        bestConfidence = confidence
        bestMatch = tx
        bestReason = `Matched by merchant name (${(nameSimilarity * 100).toFixed(0)}% similarity) and date proximity`
      }
    }

    return {
      matchedTransaction: bestMatch,
      confidence: bestConfidence,
      reason: bestReason,
    }
  }

  /**
   * 업체명 유사도 계산 (AI 기반)
   */
  private async calculateNameSimilarity(
    receiptName: string,
    transactionDescription: string
  ): Promise<number> {
    // OpenAI Embeddings API 사용
    const prompt = `Calculate similarity between two merchant names:
    
Receipt: "${receiptName}"
Transaction: "${transactionDescription}"

Respond with a similarity score between 0.0 and 1.0:
SIMILARITY: [0.0-1.0]`

    // 실제 구현 시 OpenAI API 호출
    // 여기서는 간단한 문자열 매칭으로 대체
    const normalizedReceipt = receiptName.toLowerCase().trim()
    const normalizedTx = transactionDescription.toLowerCase().trim()

    if (normalizedReceipt === normalizedTx) return 1.0
    if (normalizedTx.includes(normalizedReceipt) || normalizedReceipt.includes(normalizedTx)) {
      return 0.8
    }

    // Levenshtein 거리 기반 유사도
    const distance = this.levenshteinDistance(normalizedReceipt, normalizedTx)
    const maxLength = Math.max(normalizedReceipt.length, normalizedTx.length)
    return 1 - (distance / maxLength)
  }

  /**
   * 날짜 근접도 계산
   */
  private calculateDateProximity(receiptDate: string, txDate: string): number {
    const receipt = new Date(receiptDate)
    const transaction = new Date(txDate)
    const diffDays = Math.abs((receipt.getTime() - transaction.getTime()) / (1000 * 60 * 60 * 24))

    // 7일 이내면 1.0, 그 외에는 선형 감소
    return Math.max(0, 1 - diffDays / 7)
  }

  private getDateRange(date: string, days: number): { start: Date; end: Date } {
    const center = new Date(date)
    return {
      start: new Date(center.getTime() - days * 24 * 60 * 60 * 1000),
      end: new Date(center.getTime() + days * 24 * 60 * 60 * 1000),
    }
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }
}
```

### 영수증 OCR 및 데이터 추출

```typescript
// core/reconciliation/receipt-extractor.ts
export class ReceiptExtractor {
  /**
   * 영수증 이미지/PDF에서 데이터 추출 (AI 기반)
   */
  async extractReceiptData(fileUrl: string, fileType: 'image' | 'pdf'): Promise<{
    date?: string
    amount: number
    merchantName?: string
    items?: any[]
    gstAmount?: number
    totalAmount: number
  }> {
    const prompt = `Extract structured data from this receipt image/PDF.

Extract the following information:
1. Date (YYYY-MM-DD format)
2. Total amount (including GST)
3. GST amount (if shown separately)
4. Merchant/Store name
5. List of items (description, quantity, unit price, total)

Respond in JSON format:
{
  "date": "2026-01-15",
  "totalAmount": 150.00,
  "gstAmount": 13.64,
  "merchantName": "Officeworks",
  "items": [
    {
      "description": "Printer Paper",
      "quantity": 2,
      "unitPrice": 15.00,
      "total": 30.00
    }
  ]
}`

    // OpenAI Vision API 또는 OCR 서비스 호출
    // 실제 구현 시 파일을 Base64로 인코딩하여 전송
    const response = await this.callOpenAIWithVision(prompt, fileUrl)

    return JSON.parse(response)
  }

  private async callOpenAIWithVision(prompt: string, imageUrl: string): Promise<string> {
    // OpenAI Vision API 구현
    // 실제 구현 필요
    return '{}'
  }
}
```

---

## 🧾 인보이스 및 페이슬립 통합 관리

### 핵심 설계 원칙

1. **회계 데이터 중심**: 인보이스와 페이슬립을 General Ledger의 트랜잭션 발생원으로 정의
2. **1:1 매칭**: 모든 발행 문서는 고유 ID를 가지며, 은행 내역서와 1:1 Reconciliation 가능
3. **실시간 반영**: 문서 상태 변경이 즉시 현금 흐름 그래프에 반영
4. **세무 자동화**: GST, PAYG 자동 계산 및 계정 배분

### 시스템 구조

```
apps/accounting-sandbox/
├── core/
│   ├── invoice/
│   │   ├── invoice-generator.ts      # 인보이스 생성
│   │   ├── invoice-reconciliation.ts # 은행 매칭
│   │   ├── gst-calculator.ts         # GST 계산
│   │   └── invoice-pdf.ts            # PDF 생성
│   │
│   ├── payslip/
│   │   ├── payslip-generator.ts      # 페이슬립 생성
│   │   ├── payg-calculator.ts        # PAYG 계산
│   │   ├── payslip-pdf.ts            # PDF 생성
│   │   └── payroll-reconciliation.ts # 은행 매칭
│   │
│   ├── general-ledger/
│   │   ├── transaction-recorder.ts   # 거래 기록
│   │   ├── account-manager.ts       # 계정 관리
│   │   └── reconciliation-engine.ts # 매칭 엔진
│   │
│   └── document-storage/
│       ├── s3-storage.ts             # AWS S3 저장
│       └── email-service.ts           # 이메일 발송
```

### 인보이스 관리 시스템

#### 인보이스 데이터 모델

```typescript
// lib/types/invoice.ts
export interface Invoice {
  id: string
  organizationId: string
  invoiceNumber: string  // 고유 인보이스 번호 (예: INV-2026-001)
  
  // 발행 정보
  issuedDate: string
  dueDate: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  
  // 고객 정보
  customer: {
    name: string
    abn?: string
    email: string
    address: {
      street: string
      city: string
      state: string
      postcode: string
      country: string
    }
  }
  
  // 품목 정보
  lineItems: {
    description: string
    quantity: number
    unitPrice: number
    gstIncluded: boolean
    gstAmount: number
    totalAmount: number
  }[]
  
  // 금액 정보
  subtotal: number
  gstAmount: number
  totalAmount: number
  
  // 회계 연동
  generalLedgerEntries: {
    account: string  // 'Accounts Receivable', 'Sales Revenue', 'GST Payable'
    debit: number
    credit: number
    description: string
  }[]
  
  // 은행 매칭
  matchedTransactionId?: string  // 은행 거래 ID
  matchedDate?: string
  reconciliationStatus: 'pending' | 'matched' | 'reconciled'
  
  // 문서 저장
  pdfUrl?: string  // S3 저장 경로
  emailSent: boolean
  emailSentAt?: string
  
  createdAt: string
  updatedAt: string
}

export interface InvoiceStatus {
  invoiceId: string
  status: Invoice['status']
  timestamp: string
  notes?: string
}
```

#### 인보이스 생성 및 GST 계산

```typescript
// core/invoice/invoice-generator.ts
import { Invoice, InvoiceLineItem } from '@/lib/types/invoice'
import { GSTCalculator } from './gst-calculator'
import { GeneralLedgerRecorder } from '../general-ledger/transaction-recorder'

export class InvoiceGenerator {
  private gstCalculator: GSTCalculator
  private ledgerRecorder: GeneralLedgerRecorder

  constructor() {
    this.gstCalculator = new GSTCalculator()
    this.ledgerRecorder = new GeneralLedgerRecorder()
  }

  /**
   * 인보이스 생성 및 General Ledger 기록
   */
  async createInvoice(data: {
    organizationId: string
    customer: Invoice['customer']
    lineItems: Omit<InvoiceLineItem, 'gstAmount' | 'totalAmount'>[]
    issuedDate: string
    dueDate: string
  }): Promise<Invoice> {
    // 1. GST 계산
    const lineItemsWithGST = data.lineItems.map(item => {
      const gstAmount = this.gstCalculator.calculateGST(
        item.unitPrice * item.quantity,
        item.gstIncluded
      )
      return {
        ...item,
        gstAmount,
        totalAmount: item.unitPrice * item.quantity + gstAmount,
      }
    })

    const subtotal = lineItemsWithGST.reduce((sum, item) => 
      sum + (item.unitPrice * item.quantity), 0
    )
    const gstAmount = lineItemsWithGST.reduce((sum, item) => sum + item.gstAmount, 0)
    const totalAmount = subtotal + gstAmount

    // 2. 인보이스 번호 생성
    const invoiceNumber = await this.generateInvoiceNumber(data.organizationId)

    // 3. General Ledger 항목 생성
    const ledgerEntries = this.createLedgerEntries({
      invoiceNumber,
      subtotal,
      gstAmount,
      totalAmount,
    })

    // 4. 인보이스 객체 생성
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      organizationId: data.organizationId,
      invoiceNumber,
      issuedDate: data.issuedDate,
      dueDate: data.dueDate,
      status: 'issued',
      customer: data.customer,
      lineItems: lineItemsWithGST,
      subtotal,
      gstAmount,
      totalAmount,
      generalLedgerEntries: ledgerEntries,
      reconciliationStatus: 'pending',
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 5. General Ledger에 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId: data.organizationId,
      sourceDocument: 'invoice',
      sourceDocumentId: invoice.id,
      entries: ledgerEntries,
      transactionDate: data.issuedDate,
    })

    return invoice
  }

  /**
   * General Ledger 항목 생성
   */
  private createLedgerEntries(data: {
    invoiceNumber: string
    subtotal: number
    gstAmount: number
    totalAmount: number
  }): Invoice['generalLedgerEntries'] {
    return [
      {
        account: 'Accounts Receivable',
        debit: data.totalAmount,
        credit: 0,
        description: `Invoice ${data.invoiceNumber} - Customer Receivable`,
      },
      {
        account: 'Sales Revenue',
        debit: 0,
        credit: data.subtotal,
        description: `Invoice ${data.invoiceNumber} - Sales Revenue`,
      },
      {
        account: 'GST Payable',
        debit: 0,
        credit: data.gstAmount,
        description: `Invoice ${data.invoiceNumber} - GST Collected`,
      },
    ]
  }

  /**
   * 인보이스 번호 생성 (예: INV-2026-001)
   */
  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear()
    const lastInvoice = await this.getLastInvoice(organizationId)
    
    let sequence = 1
    if (lastInvoice && lastInvoice.invoiceNumber.startsWith(`INV-${year}-`)) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2])
      sequence = lastSeq + 1
    }

    return `INV-${year}-${sequence.toString().padStart(3, '0')}`
  }

  private async getLastInvoice(organizationId: string): Promise<Invoice | null> {
    // 데이터베이스에서 마지막 인보이스 조회
    // 실제 구현 필요
    return null
  }
}
```

#### GST 계산 로직

```typescript
// core/invoice/gst-calculator.ts
export class GSTCalculator {
  private readonly GST_RATE = 0.10  // 호주 GST 10%

  /**
   * GST 금액 계산
   */
  calculateGST(amount: number, gstIncluded: boolean): number {
    if (gstIncluded) {
      // GST 포함 가격에서 GST 추출
      return Math.round((amount * this.GST_RATE / (1 + this.GST_RATE)) * 100) / 100
    } else {
      // GST 별도 가격에 GST 추가
      return Math.round(amount * this.GST_RATE * 100) / 100
    }
  }

  /**
   * GST 포함 총액 계산
   */
  calculateTotalWithGST(amount: number, gstIncluded: boolean): number {
    if (gstIncluded) {
      return amount
    } else {
      return amount + this.calculateGST(amount, false)
    }
  }

  /**
   * GST 제외 금액 계산
   */
  calculateAmountExcludingGST(amount: number, gstIncluded: boolean): number {
    if (gstIncluded) {
      return amount - this.calculateGST(amount, true)
    } else {
      return amount
    }
  }
}
```

#### 인보이스-은행 매칭 (Reconciliation)

```typescript
// core/invoice/invoice-reconciliation.ts
import { Invoice } from '@/lib/types/invoice'
import { BankTransaction } from '../pdf-parser/types'

export class InvoiceReconciliation {
  /**
   * 인보이스와 은행 거래 자동 매칭
   */
  async matchInvoiceToTransaction(
    invoice: Invoice,
    transactions: BankTransaction[]
  ): Promise<{
    matchedTransaction?: BankTransaction
    confidence: number
    reason: string
  }> {
    if (invoice.status !== 'issued') {
      return {
        confidence: 0,
        reason: 'Invoice not in issued status',
      }
    }

    // 1. 날짜 범위 필터링 (인보이스 발행일 ~ 만기일 + 30일)
    const searchStartDate = new Date(invoice.issuedDate)
    const searchEndDate = new Date(invoice.dueDate)
    searchEndDate.setDate(searchEndDate.getDate() + 30)

    const candidateTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= searchStartDate && txDate <= searchEndDate
    })

    if (candidateTransactions.length === 0) {
      return {
        confidence: 0,
        reason: 'No transactions found in date range',
      }
    }

    // 2. 금액 매칭 (±$0.50 허용)
    const amountMatches = candidateTransactions.filter(tx => {
      const txAmount = tx.credit || 0
      return Math.abs(txAmount - invoice.totalAmount) <= 0.5
    })

    if (amountMatches.length === 0) {
      return {
        confidence: 0,
        reason: 'No transactions match invoice amount',
      }
    }

    // 3. 고객명/인보이스 번호 매칭
    let bestMatch: BankTransaction | undefined
    let bestConfidence = 0
    let bestReason = ''

    for (const tx of amountMatches) {
      const description = tx.description.toLowerCase()
      const customerNameMatch = description.includes(invoice.customer.name.toLowerCase())
      const invoiceNumberMatch = description.includes(invoice.invoiceNumber.toLowerCase())

      let confidence = 0.5  // 기본 신뢰도 (금액 매칭)
      
      if (customerNameMatch) confidence += 0.3
      if (invoiceNumberMatch) confidence += 0.2

      if (confidence > bestConfidence) {
        bestConfidence = confidence
        bestMatch = tx
        bestReason = `Matched by amount and ${customerNameMatch ? 'customer name' : ''} ${invoiceNumberMatch ? 'invoice number' : ''}`
      }
    }

    return {
      matchedTransaction: bestMatch,
      confidence: bestConfidence,
      reason: bestReason,
    }
  }

  /**
   * 인보이스 상태를 'paid'로 업데이트 및 General Ledger 기록
   */
  async markInvoiceAsPaid(
    invoice: Invoice,
    transaction: BankTransaction
  ): Promise<void> {
    // 1. 인보이스 상태 업데이트
    invoice.status = 'paid'
    invoice.matchedTransactionId = transaction.reference
    invoice.matchedDate = transaction.date
    invoice.reconciliationStatus = 'reconciled'
    invoice.updatedAt = new Date().toISOString()

    // 2. General Ledger에 입금 기록
    const ledgerRecorder = new GeneralLedgerRecorder()
    await ledgerRecorder.recordTransaction({
      organizationId: invoice.organizationId,
      sourceDocument: 'invoice_payment',
      sourceDocumentId: invoice.id,
      entries: [
        {
          account: 'Bank Account',
          debit: invoice.totalAmount,
          credit: 0,
          description: `Payment received for Invoice ${invoice.invoiceNumber}`,
        },
        {
          account: 'Accounts Receivable',
          debit: 0,
          credit: invoice.totalAmount,
          description: `Invoice ${invoice.invoiceNumber} - Payment received`,
        },
      ],
      transactionDate: transaction.date,
    })
  }
}
```

### 페이슬립 관리 시스템

#### 페이슬립 데이터 모델

```typescript
// lib/types/payslip.ts
export interface Payslip {
  id: string
  organizationId: string
  payslipNumber: string  // 고유 페이슬립 번호 (예: PAY-2026-001)
  
  // 직원 정보
  employee: {
    id: string
    name: string
    email: string
    tfn?: string  // Tax File Number
    employmentType: 'full-time' | 'part-time' | 'casual' | 'contractor'
  }
  
  // 급여 기간
  payPeriod: {
    startDate: string
    endDate: string
    payDate: string
  }
  
  // 급여 정보
  grossPay: number
  deductions: {
    paygWithholding: number
    superannuation?: number
    other?: number
  }
  netPay: number
  
  // PAYG 계산 상세
  paygDetails: {
    grossAmount: number
    withholdingTax: number
    taxFreeThreshold: boolean
    recipientType: 'employee' | 'director'
  }
  
  // 상태
  status: 'draft' | 'issued' | 'paid' | 'cancelled'
  
  // 회계 연동
  generalLedgerEntries: {
    account: string  // 'Wages Expense', 'PAYG Payable', 'Superannuation Payable', 'Bank Account'
    debit: number
    credit: number
    description: string
  }[]
  
  // 은행 매칭
  matchedTransactionId?: string
  matchedDate?: string
  reconciliationStatus: 'pending' | 'matched' | 'reconciled'
  
  // 문서 저장
  pdfUrl?: string
  emailSent: boolean
  emailSentAt?: string
  
  createdAt: string
  updatedAt: string
}
```

#### 페이슬립 생성 및 PAYG 계산

```typescript
// core/payslip/payslip-generator.ts
import { Payslip } from '@/lib/types/payslip'
import { PAYGTaxCalculator } from '../payg-withholding/tax-calculator'
import { GeneralLedgerRecorder } from '../general-ledger/transaction-recorder'

export class PayslipGenerator {
  private paygCalculator: PAYGTaxCalculator
  private ledgerRecorder: GeneralLedgerRecorder

  constructor() {
    this.paygCalculator = new PAYGTaxCalculator()
    this.ledgerRecorder = new GeneralLedgerRecorder()
  }

  /**
   * 페이슬립 생성 및 General Ledger 기록
   */
  async createPayslip(data: {
    organizationId: string
    employee: Payslip['employee']
    payPeriod: Payslip['payPeriod']
    grossPay: number
    superannuationRate?: number  // 기본 11%
  }): Promise<Payslip> {
    // 1. PAYG 원천징수 계산
    const paygDetails = await this.paygCalculator.calculateWithholding(
      data.grossPay,
      data.employee.employmentType === 'director' ? 'director' : 'employee',
      true  // taxFreeThreshold
    )

    // 2. Superannuation 계산 (기본 11%)
    const superRate = data.superannuationRate || 0.11
    const superannuation = Math.round(data.grossPay * superRate * 100) / 100

    // 3. 공제 합계
    const totalDeductions = paygDetails.withholdingTax + superannuation

    // 4. 순 급여
    const netPay = data.grossPay - totalDeductions

    // 5. 페이슬립 번호 생성
    const payslipNumber = await this.generatePayslipNumber(data.organizationId)

    // 6. General Ledger 항목 생성
    const ledgerEntries = this.createLedgerEntries({
      payslipNumber,
      grossPay: data.grossPay,
      paygWithholding: paygDetails.withholdingTax,
      superannuation,
      netPay,
    })

    // 7. 페이슬립 객체 생성
    const payslip: Payslip = {
      id: `pay_${Date.now()}`,
      organizationId: data.organizationId,
      payslipNumber,
      employee: data.employee,
      payPeriod: data.payPeriod,
      grossPay: data.grossPay,
      deductions: {
        paygWithholding: paygDetails.withholdingTax,
        superannuation,
      },
      netPay,
      paygDetails,
      status: 'issued',
      generalLedgerEntries: ledgerEntries,
      reconciliationStatus: 'pending',
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 8. General Ledger에 기록
    await this.ledgerRecorder.recordTransaction({
      organizationId: data.organizationId,
      sourceDocument: 'payslip',
      sourceDocumentId: payslip.id,
      entries: ledgerEntries,
      transactionDate: data.payPeriod.payDate,
    })

    return payslip
  }

  /**
   * General Ledger 항목 생성
   */
  private createLedgerEntries(data: {
    payslipNumber: string
    grossPay: number
    paygWithholding: number
    superannuation: number
    netPay: number
  }): Payslip['generalLedgerEntries'] {
    return [
      {
        account: 'Wages Expense',
        debit: data.grossPay,
        credit: 0,
        description: `Payslip ${data.payslipNumber} - Gross Wages`,
      },
      {
        account: 'PAYG Payable',
        debit: 0,
        credit: data.paygWithholding,
        description: `Payslip ${data.payslipNumber} - PAYG Withholding`,
      },
      {
        account: 'Superannuation Payable',
        debit: 0,
        credit: data.superannuation,
        description: `Payslip ${data.payslipNumber} - Superannuation`,
      },
      {
        account: 'Bank Account',
        debit: 0,
        credit: data.netPay,
        description: `Payslip ${data.payslipNumber} - Net Pay`,
      },
    ]
  }

  private async generatePayslipNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear()
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const lastPayslip = await this.getLastPayslip(organizationId)
    
    let sequence = 1
    if (lastPayslip && lastPayslip.payslipNumber.startsWith(`PAY-${year}-${month}-`)) {
      const lastSeq = parseInt(lastPayslip.payslipNumber.split('-')[3])
      sequence = lastSeq + 1
    }

    return `PAY-${year}-${month}-${sequence.toString().padStart(3, '0')}`
  }

  private async getLastPayslip(organizationId: string): Promise<Payslip | null> {
    // 데이터베이스에서 마지막 페이슬립 조회
    return null
  }
}
```

### PDF 생성 및 저장

```typescript
// core/invoice/invoice-pdf.ts
import { Invoice } from '@/lib/types/invoice'
import { S3Storage } from '../document-storage/s3-storage'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export class InvoicePDFGenerator {
  private s3Storage: S3Storage

  constructor() {
    this.s3Storage = new S3Storage()
  }

  /**
   * 인보이스 PDF 생성 및 S3 저장
   */
  async generateAndStorePDF(invoice: Invoice): Promise<string> {
    // 1. PDF 생성
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // A4 크기
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 800

    // 헤더
    page.drawText('INVOICE', {
      x: 50,
      y,
      size: 24,
      font: boldFont,
    })
    y -= 30

    page.drawText(`Invoice Number: ${invoice.invoiceNumber}`, {
      x: 50,
      y,
      size: 12,
      font,
    })
    y -= 20

    page.drawText(`Date: ${invoice.issuedDate}`, {
      x: 50,
      y,
      size: 12,
      font,
    })
    y -= 20

    page.drawText(`Due Date: ${invoice.dueDate}`, {
      x: 50,
      y,
      size: 12,
      font,
    })
    y -= 40

    // 고객 정보
    page.drawText('Bill To:', {
      x: 50,
      y,
      size: 14,
      font: boldFont,
    })
    y -= 20

    page.drawText(invoice.customer.name, {
      x: 50,
      y,
      size: 12,
      font,
    })
    y -= 15

    if (invoice.customer.address) {
      page.drawText(invoice.customer.address.street, {
        x: 50,
        y,
        size: 10,
        font,
      })
      y -= 12
      page.drawText(
        `${invoice.customer.address.city}, ${invoice.customer.address.state} ${invoice.customer.address.postcode}`,
        {
          x: 50,
          y,
          size: 10,
          font,
        }
      )
      y -= 30
    }

    // 품목 테이블
    page.drawText('Description', {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText('Qty', {
      x: 300,
      y,
      size: 12,
      font: boldFont,
    })
    page.drawText('Amount', {
      x: 450,
      y,
      size: 12,
      font: boldFont,
    })
    y -= 20

    for (const item of invoice.lineItems) {
      page.drawText(item.description, {
        x: 50,
        y,
        size: 10,
        font,
      })
      page.drawText(item.quantity.toString(), {
        x: 300,
        y,
        size: 10,
        font,
      })
      page.drawText(`$${item.totalAmount.toFixed(2)}`, {
        x: 450,
        y,
        size: 10,
        font,
      })
      y -= 15
    }

    y -= 20

    // 합계
    page.drawText(`Subtotal: $${invoice.subtotal.toFixed(2)}`, {
      x: 400,
      y,
      size: 12,
      font,
    })
    y -= 15

    page.drawText(`GST (10%): $${invoice.gstAmount.toFixed(2)}`, {
      x: 400,
      y,
      size: 12,
      font,
    })
    y -= 15

    page.drawText(`Total: $${invoice.totalAmount.toFixed(2)}`, {
      x: 400,
      y,
      size: 14,
      font: boldFont,
    })

    // 2. PDF 바이트 생성
    const pdfBytes = await pdfDoc.save()

    // 3. S3에 저장
    const s3Key = `invoices/${invoice.organizationId}/${invoice.invoiceNumber}.pdf`
    const pdfUrl = await this.s3Storage.uploadFile(s3Key, pdfBytes, 'application/pdf')

    return pdfUrl
  }
}
```

### 이메일 발송 서비스

```typescript
// core/document-storage/email-service.ts
import { Invoice } from '@/lib/types/invoice'
import { Payslip } from '@/lib/types/payslip'

export class EmailService {
  /**
   * 인보이스 이메일 발송
   */
  async sendInvoiceEmail(invoice: Invoice, pdfUrl: string): Promise<void> {
    const emailContent = {
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${invoice.organizationId}`,
      html: `
        <html>
          <body>
            <h2>Invoice ${invoice.invoiceNumber}</h2>
            <p>Dear ${invoice.customer.name},</p>
            <p>Please find attached your invoice for $${invoice.totalAmount.toFixed(2)}.</p>
            <p>Due Date: ${invoice.dueDate}</p>
            <p><a href="${pdfUrl}">Download Invoice PDF</a></p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          path: pdfUrl,
        },
      ],
    }

    // 실제 이메일 발송 (AWS SES, SendGrid 등)
    await this.sendEmail(emailContent)
  }

  /**
   * 페이슬립 이메일 발송
   */
  async sendPayslipEmail(payslip: Payslip, pdfUrl: string): Promise<void> {
    const emailContent = {
      to: payslip.employee.email,
      subject: `Payslip ${payslip.payslipNumber} - ${payslip.payPeriod.startDate} to ${payslip.payPeriod.endDate}`,
      html: `
        <html>
          <body>
            <h2>Payslip ${payslip.payslipNumber}</h2>
            <p>Dear ${payslip.employee.name},</p>
            <p>Please find attached your payslip for the period ${payslip.payPeriod.startDate} to ${payslip.payPeriod.endDate}.</p>
            <p>Net Pay: $${payslip.netPay.toFixed(2)}</p>
            <p><a href="${pdfUrl}">Download Payslip PDF</a></p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `payslip-${payslip.payslipNumber}.pdf`,
          path: pdfUrl,
        },
      ],
    }

    await this.sendEmail(emailContent)
  }

  private async sendEmail(content: any): Promise<void> {
    // AWS SES, SendGrid, 또는 다른 이메일 서비스 구현
    console.log('Sending email:', content)
  }
}
```

### 통합 관리자 UI

```typescript
// app/(dashboard)/admin/accounting/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { InvoiceManager } from '@/components/accounting/InvoiceManager'
import { PayslipManager } from '@/components/accounting/PayslipManager'
import { CashFlowGraph } from '@/components/accounting/CashFlowGraph'
import { ReconciliationPanel } from '@/components/accounting/ReconciliationPanel'

export default function AccountingDashboard() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payslips' | 'reconciliation'>('invoices')
  const [cashFlowData, setCashFlowData] = useState<any[]>([])

  // 실시간 현금 흐름 업데이트
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await fetchCashFlowData()
      setCashFlowData(data)
    }, 5000) // 5초마다 업데이트

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Accounting Dashboard</h1>

      {/* 현금 흐름 그래프 (항상 표시) */}
      <div className="mb-6">
        <CashFlowGraph data={cashFlowData} />
      </div>

      {/* 탭 메뉴 */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 ${activeTab === 'invoices' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Invoices
        </button>
        <button
          onClick={() => setActiveTab('payslips')}
          className={`px-4 py-2 ${activeTab === 'payslips' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Payslips
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2 ${activeTab === 'reconciliation' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Reconciliation
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'invoices' && <InvoiceManager />}
      {activeTab === 'payslips' && <PayslipManager />}
      {activeTab === 'reconciliation' && <ReconciliationPanel />}
    </div>
  )
}
```

---

## 📊 현금 흐름 및 세무 예보

### 현금 흐름 예측 엔진

```typescript
// core/forecasting/cash-flow-forecaster.ts
import { BankTransaction } from '../pdf-parser/types'

export interface CashFlowForecast {
  period: {
    startDate: string
    endDate: string
  }
  dailyProjections: {
    date: string
    projectedBalance: number
    expectedInflows: number
    expectedOutflows: number
    confidence: number
  }[]
  summary: {
    totalInflows: number
    totalOutflows: number
    endingBalance: number
    minBalance: number
    maxBalance: number
  }
  taxObligations: {
    gst: {
      amount: number
      dueDate: string
      confidence: 'high' | 'medium' | 'low'
    }
    companyTax: {
      amount: number
      dueDate: string
      confidence: 'high' | 'medium' | 'low'
    }
  }
}

export class CashFlowForecaster {
  /**
   * 향후 3개월 현금 흐름 예측
   */
  async forecastCashFlow(
    transactions: BankTransaction[],
    currentBalance: number,
    months: number = 3
  ): Promise<CashFlowForecast> {
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)

    // 1. 과거 패턴 분석
    const patterns = this.analyzeHistoricalPatterns(transactions)

    // 2. 일별 예측 생성
    const dailyProjections = this.generateDailyProjections(
      patterns,
      currentBalance,
      endDate
    )

    // 3. 세무 의무 계산
    const taxObligations = await this.calculateTaxObligations(
      transactions,
      endDate
    )

    return {
      period: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      dailyProjections,
      summary: this.calculateSummary(dailyProjections),
      taxObligations,
    }
  }

  /**
   * 과거 거래 패턴 분석
   */
  private analyzeHistoricalPatterns(transactions: BankTransaction[]): {
    recurringInflows: { dayOfMonth: number; amount: number; frequency: number }[]
    recurringOutflows: { dayOfMonth: number; amount: number; frequency: number }[]
    averageDailyInflow: number
    averageDailyOutflow: number
    seasonalFactors: { month: number; multiplier: number }[]
  } {
    // 월별 집계
    const monthlyData = new Map<string, { inflows: number; outflows: number; count: number }>()

    for (const tx of transactions) {
      const monthKey = tx.date.substring(0, 7) // YYYY-MM
      const data = monthlyData.get(monthKey) || { inflows: 0, outflows: 0, count: 0 }

      if (tx.credit) {
        data.inflows += tx.credit
      }
      if (tx.debit) {
        data.outflows += tx.debit
      }
      data.count++
      monthlyData.set(monthKey, data)
    }

    // 반복 거래 감지 (같은 날짜, 비슷한 금액)
    const recurringInflows: { dayOfMonth: number; amount: number; frequency: number }[] = []
    const recurringOutflows: { dayOfMonth: number; amount: number; frequency: number }[] = []

    // 간단한 구현: 매월 같은 날짜의 거래를 반복 거래로 간주
    const dayGroups = new Map<number, number[]>()
    for (const tx of transactions) {
      const day = new Date(tx.date).getDate()
      const amount = tx.credit || tx.debit || 0
      if (!dayGroups.has(day)) {
        dayGroups.set(day, [])
      }
      dayGroups.get(day)!.push(amount)
    }

    // 평균 일일 유입/유출 계산
    const totalDays = transactions.length > 0 
      ? (new Date(transactions[transactions.length - 1].date).getTime() - 
         new Date(transactions[0].date).getTime()) / (1000 * 60 * 60 * 24)
      : 1

    const totalInflows = transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0)
    const totalOutflows = transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0)

    return {
      recurringInflows,
      recurringOutflows,
      averageDailyInflow: totalInflows / totalDays,
      averageDailyOutflow: totalOutflows / totalDays,
      seasonalFactors: [], // 계절성 요인 분석 (향후 구현)
    }
  }

  /**
   * 일별 예측 생성
   */
  private generateDailyProjections(
    patterns: any,
    currentBalance: number,
    endDate: Date
  ): CashFlowForecast['dailyProjections'] {
    const projections: CashFlowForecast['dailyProjections'] = []
    let balance = currentBalance

    const today = new Date()
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfMonth = d.getDate()
      const month = d.getMonth()

      // 반복 거래 적용
      const expectedInflows = patterns.recurringInflows
        .filter(r => r.dayOfMonth === dayOfMonth)
        .reduce((sum, r) => sum + r.amount, 0) + patterns.averageDailyInflow

      const expectedOutflows = patterns.recurringOutflows
        .filter(r => r.dayOfMonth === dayOfMonth)
        .reduce((sum, r) => sum + r.amount, 0) + patterns.averageDailyOutflow

      balance += expectedInflows - expectedOutflows

      projections.push({
        date: d.toISOString().split('T')[0],
        projectedBalance: balance,
        expectedInflows,
        expectedOutflows,
        confidence: 0.7, // 기본 신뢰도
      })
    }

    return projections
  }

  /**
   * 세무 의무 계산
   */
  private async calculateTaxObligations(
    transactions: BankTransaction[],
    endDate: Date
  ): Promise<CashFlowForecast['taxObligations']> {
    // GST 계산 (분기별)
    const gstAmount = this.calculateProjectedGST(transactions, endDate)
    const gstDueDate = this.getNextGSTDueDate()

    // 법인세 계산 (연간)
    const companyTaxAmount = this.calculateProjectedCompanyTax(transactions, endDate)
    const companyTaxDueDate = this.getNextCompanyTaxDueDate()

    return {
      gst: {
        amount: gstAmount,
        dueDate: gstDueDate,
        confidence: 'medium',
      },
      companyTax: {
        amount: companyTaxAmount,
        dueDate: companyTaxDueDate,
        confidence: 'low',
      },
    }
  }

  private calculateProjectedGST(transactions: BankTransaction[], endDate: Date): number {
    // 과거 3개월 평균 GST를 기반으로 예측
    const recentTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      return txDate >= threeMonthsAgo
    })

    // GST 포함 거래 추정 (간단한 휴리스틱)
    const gstEligibleAmount = recentTransactions
      .filter(tx => tx.category?.includes('EXPENSE') || tx.category?.includes('INCOME'))
      .reduce((sum, tx) => sum + Math.abs(tx.debit || tx.credit || 0), 0)

    const estimatedGST = gstEligibleAmount * 0.1 / 1.1 // 10% GST 추정
    return estimatedGST
  }

  private calculateProjectedCompanyTax(transactions: BankTransaction[], endDate: Date): number {
    // 간단한 구현: 과거 수익의 25% (호주 법인세율)
    const revenue = transactions
      .filter(tx => tx.credit && tx.category?.includes('INCOME'))
      .reduce((sum, tx) => sum + (tx.credit || 0), 0)

    return revenue * 0.25
  }

  private getNextGSTDueDate(): string {
    // 다음 분기 말일 계산
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3)
    const nextQuarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
    nextQuarterEnd.setDate(nextQuarterEnd.getDate() + 28) // BAS 제출 마감일 (분기 말 + 28일)
    return nextQuarterEnd.toISOString().split('T')[0]
  }

  private getNextCompanyTaxDueDate(): string {
    // 다음 회계연도 종료 후 4개월
    const now = new Date()
    const financialYearEnd = new Date(now.getFullYear(), 5, 30) // 6월 30일
    if (now > financialYearEnd) {
      financialYearEnd.setFullYear(now.getFullYear() + 1)
    }
    financialYearEnd.setMonth(financialYearEnd.getMonth() + 4) // +4개월
    return financialYearEnd.toISOString().split('T')[0]
  }

  private calculateSummary(projections: CashFlowForecast['dailyProjections']): CashFlowForecast['summary'] {
    const totalInflows = projections.reduce((sum, p) => sum + p.expectedInflows, 0)
    const totalOutflows = projections.reduce((sum, p) => sum + p.expectedOutflows, 0)
    const balances = projections.map(p => p.projectedBalance)

    return {
      totalInflows,
      totalOutflows,
      endingBalance: balances[balances.length - 1],
      minBalance: Math.min(...balances),
      maxBalance: Math.max(...balances),
    }
  }
}
```

---

## 💳 구독 및 고정비 관리

### 구독 감지 및 관리

```typescript
// core/subscription-manager/subscription-detector.ts
import { BankTransaction } from '../pdf-parser/types'

export interface Subscription {
  id: string
  organizationId: string
  name: string
  merchantName: string
  amount: number
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'weekly'
  nextBillingDate: string
  lastBillingDate: string
  category: string
  isActive: boolean
  isEssential: boolean  // 필수 구독 여부
  detectedFrom: string  // 감지된 거래 ID
  confidence: number
}

export class SubscriptionDetector {
  /**
   * 거래 내역에서 구독/고정비 자동 감지
   */
  async detectSubscriptions(
    transactions: BankTransaction[]
  ): Promise<Subscription[]> {
    // 1. 반복 거래 패턴 분석
    const recurringPatterns = this.analyzeRecurringPatterns(transactions)

    // 2. AI 기반 구독 확인
    const subscriptions: Subscription[] = []

    for (const pattern of recurringPatterns) {
      const subscription = await this.verifySubscription(pattern, transactions)
      if (subscription) {
        subscriptions.push(subscription)
      }
    }

    return subscriptions
  }

  /**
   * 반복 거래 패턴 분석
   */
  private analyzeRecurringPatterns(transactions: BankTransaction[]): {
    merchantName: string
    amount: number
    dates: string[]
    frequency: 'monthly' | 'quarterly' | 'yearly' | 'weekly'
    confidence: number
  }[] {
    // 같은 업체명, 비슷한 금액의 거래를 그룹화
    const merchantGroups = new Map<string, {
      amounts: number[]
      dates: string[]
    }>()

    for (const tx of transactions) {
      if (!tx.debit) continue // 출금만 분석

      const merchant = this.extractMerchantName(tx.description)
      if (!merchantGroups.has(merchant)) {
        merchantGroups.set(merchant, { amounts: [], dates: [] })
      }

      const group = merchantGroups.get(merchant)!
      group.amounts.push(tx.debit)
      group.dates.push(tx.date)
    }

    // 반복 패턴 확인 (최소 3회 이상)
    const patterns: any[] = []

    for (const [merchant, group] of merchantGroups.entries()) {
      if (group.dates.length < 3) continue

      // 금액 일관성 확인 (표준편차가 작으면 반복 거래로 간주)
      const avgAmount = group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length
      const variance = group.amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / group.amounts.length
      const stdDev = Math.sqrt(variance)

      // 금액 변동이 10% 이내면 반복 거래로 간주
      if (stdDev / avgAmount < 0.1) {
        const frequency = this.detectFrequency(group.dates)
        patterns.push({
          merchantName: merchant,
          amount: avgAmount,
          dates: group.dates.sort(),
          frequency,
          confidence: this.calculateConfidence(group.dates.length, stdDev / avgAmount),
        })
      }
    }

    return patterns
  }

  /**
   * 거래 빈도 감지
   */
  private detectFrequency(dates: string[]): 'monthly' | 'quarterly' | 'yearly' | 'weekly' {
    if (dates.length < 2) return 'monthly'

    const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a.getTime() - b.getTime())
    const intervals: number[] = []

    for (let i = 1; i < sortedDates.length; i++) {
      const diffDays = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      intervals.push(diffDays)
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length

    if (avgInterval <= 10) return 'weekly'
    if (avgInterval <= 35) return 'monthly'
    if (avgInterval <= 100) return 'quarterly'
    return 'yearly'
  }

  /**
   * 구독 확인 (AI 기반)
   */
  private async verifySubscription(
    pattern: any,
    transactions: BankTransaction[]
  ): Promise<Subscription | null> {
    const prompt = `Determine if this recurring transaction is a subscription or fixed expense:

Merchant: "${pattern.merchantName}"
Amount: $${pattern.amount.toFixed(2)}
Frequency: ${pattern.frequency}
Occurrences: ${pattern.dates.length} times

Is this a subscription service (e.g., software, cloud service, membership)?
Respond:
IS_SUBSCRIPTION: [true/false]
IS_ESSENTIAL: [true/false] (essential for business operations)
CATEGORY: [software/subscription/utilities/insurance/other]
REASON: [Brief explanation]`

    // AI 응답 파싱
    const isSubscription = true // 실제 구현 시 AI 응답 기반
    const isEssential = false
    const category = 'software'

    if (!isSubscription) return null

    // 다음 청구일 계산
    const lastDate = new Date(pattern.dates[pattern.dates.length - 1])
    const nextBillingDate = this.calculateNextBillingDate(lastDate, pattern.frequency)

    return {
      id: `sub_${Date.now()}`,
      organizationId: '', // 실제 구현 시 주입
      name: `${pattern.merchantName} Subscription`,
      merchantName: pattern.merchantName,
      amount: pattern.amount,
      frequency: pattern.frequency,
      nextBillingDate: nextBillingDate.toISOString().split('T')[0],
      lastBillingDate: lastDate.toISOString().split('T')[0],
      category,
      isActive: true,
      isEssential,
      detectedFrom: pattern.dates[0],
      confidence: pattern.confidence,
    }
  }

  private calculateNextBillingDate(lastDate: Date, frequency: string): Date {
    const next = new Date(lastDate)
    switch (frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'monthly':
        next.setMonth(next.getMonth() + 1)
        break
      case 'quarterly':
        next.setMonth(next.getMonth() + 3)
        break
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1)
        break
    }
    return next
  }

  private extractMerchantName(description: string): string {
    // 간단한 구현: 설명의 첫 부분을 업체명으로 간주
    return description.split(' ').slice(0, 3).join(' ')
  }

  private calculateConfidence(count: number, variance: number): number {
    // 거래 횟수가 많고 변동이 적을수록 신뢰도 높음
    return Math.min(1.0, (count / 6) * (1 - variance))
  }
}
```

### 구독 관리 서비스

```typescript
// core/subscription-manager/subscription-service.ts
export class SubscriptionService {
  /**
   * 구독 갱신 알림
   */
  async checkRenewalAlerts(subscriptions: Subscription[]): Promise<{
    upcoming: Subscription[]
    expired: Subscription[]
    unused: Subscription[]
  }> {
    const today = new Date()
    const upcoming: Subscription[] = []
    const expired: Subscription[] = []
    const unused: Subscription[] = []

    for (const sub of subscriptions) {
      if (!sub.isActive) {
        unused.push(sub)
        continue
      }

      const nextBilling = new Date(sub.nextBillingDate)
      const daysUntil = (nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

      if (daysUntil < 0) {
        expired.push(sub)
      } else if (daysUntil <= 7) {
        upcoming.push(sub)
      }
    }

    return { upcoming, expired, unused }
  }

  /**
   * 불필요한 구독 감지 (사용하지 않는 구독)
   */
  async detectUnusedSubscriptions(
    subscriptions: Subscription[],
    transactions: BankTransaction[]
  ): Promise<Subscription[]> {
    const unused: Subscription[] = []

    for (const sub of subscriptions) {
      // 최근 3개월간 해당 구독 관련 거래가 없으면 미사용으로 간주
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const recentTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= threeMonthsAgo &&
               tx.description.toLowerCase().includes(sub.merchantName.toLowerCase()) &&
               Math.abs((tx.debit || 0) - sub.amount) < 1.0
      })

      if (recentTransactions.length === 0 && !sub.isEssential) {
        unused.push(sub)
      }
    }

    return unused
  }
}
```

---

## 🔐 권한 관리 시스템 (RBAC)

### 역할 및 권한 정의

```typescript
// core/rbac/types.ts
export type Role = 'owner' | 'employee' | 'accountant' | 'viewer'

export interface Permission {
  resource: string
  actions: string[]
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    { resource: 'transactions', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['create', 'read', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'modules', actions: ['read', 'update'] },
    { resource: 'subscriptions', actions: ['create', 'read', 'update', 'delete'] },
  ],
  employee: [
    { resource: 'transactions', actions: ['create', 'read'] },
    { resource: 'receipts', actions: ['create', 'read'] },
  ],
  accountant: [
    { resource: 'transactions', actions: ['read'] },
    { resource: 'reports', actions: ['read', 'export'] },
    { resource: 'tax', actions: ['read'] },
  ],
  viewer: [
    { resource: 'transactions', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
  ],
}

export interface User {
  id: string
  organizationId: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface Organization {
  id: string
  name: string
  abn?: string
  industry?: string
  enabledModules: string[]
  createdAt: string
}
```

### RBAC 미들웨어

```typescript
// core/rbac/rbac-middleware.ts
import { Role, Permission, ROLE_PERMISSIONS } from './types'

export class RBACMiddleware {
  /**
   * 권한 확인
   */
  hasPermission(userRole: Role, resource: string, action: string): boolean {
    const permissions = ROLE_PERMISSIONS[userRole] || []
    const permission = permissions.find(p => p.resource === resource)

    if (!permission) return false

    return permission.actions.includes(action) || permission.actions.includes('*')
  }

  /**
   * 여러 권한 확인 (AND 조건)
   */
  hasAllPermissions(userRole: Role, requiredPermissions: { resource: string; action: string }[]): boolean {
    return requiredPermissions.every(req => 
      this.hasPermission(userRole, req.resource, req.action)
    )
  }

  /**
   * 여러 권한 확인 (OR 조건)
   */
  hasAnyPermission(userRole: Role, requiredPermissions: { resource: string; action: string }[]): boolean {
    return requiredPermissions.some(req => 
      this.hasPermission(userRole, req.resource, req.action)
    )
  }

  /**
   * 역할별 접근 가능한 리소스 목록
   */
  getAccessibleResources(userRole: Role): string[] {
    const permissions = ROLE_PERMISSIONS[userRole] || []
    return permissions.map(p => p.resource)
  }
}
```

### API 라우트 보호

```typescript
// app/api/transactions/route.ts
import { RBACMiddleware } from '@/core/rbac/rbac-middleware'
import { getCurrentUser } from '@/lib/auth'

const rbac = new RBACMiddleware()

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!rbac.hasPermission(user.role, 'transactions', 'read')) {
    return new Response('Forbidden', { status: 403 })
  }

  // 거래 내역 조회 로직
  // ...
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!rbac.hasPermission(user.role, 'transactions', 'create')) {
    return new Response('Forbidden', { status: 403 })
  }

  // 거래 내역 생성 로직
  // ...
}
```

---

## 🗄️ 데이터베이스 스키마 확장

```sql
-- 조직(회사) 테이블
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abn VARCHAR(11),
  industry VARCHAR(50),
  enabled_modules TEXT[], -- 활성화된 모듈 ID 배열
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'owner', 'employee', 'accountant', 'viewer'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- 영수증 테이블
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  file_url TEXT NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- 'image', 'pdf'
  
  -- AI 추출 데이터
  extracted_date DATE,
  extracted_amount DECIMAL(15, 2),
  extracted_merchant_name VARCHAR(255),
  extracted_items JSONB,
  extracted_gst_amount DECIMAL(15, 2),
  extracted_total_amount DECIMAL(15, 2),
  
  -- 매칭 정보
  matched_transaction_id UUID REFERENCES accounting_transactions(id),
  match_confidence DECIMAL(3, 2),
  match_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'matched', 'manual', 'unmatched'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 구독 테이블
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'weekly'
  next_billing_date DATE NOT NULL,
  last_billing_date DATE,
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  is_essential BOOLEAN DEFAULT false,
  detected_from VARCHAR(255), -- 감지된 거래 ID
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 현금 흐름 예보 테이블
CREATE TABLE cash_flow_forecasts (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  current_balance DECIMAL(15, 2) NOT NULL,
  projected_data JSONB NOT NULL, -- 일별 예측 데이터
  tax_obligations JSONB, -- 세무 의무 정보
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인보이스 테이블
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'draft', 'issued', 'paid', 'overdue', 'cancelled'
  
  -- 고객 정보
  customer_name VARCHAR(255) NOT NULL,
  customer_abn VARCHAR(11),
  customer_email VARCHAR(255) NOT NULL,
  customer_address JSONB,
  
  -- 금액 정보
  subtotal DECIMAL(15, 2) NOT NULL,
  gst_amount DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  
  -- 품목 정보
  line_items JSONB NOT NULL,
  
  -- 회계 연동
  general_ledger_entries JSONB NOT NULL,
  
  -- 은행 매칭
  matched_transaction_id UUID REFERENCES accounting_transactions(id),
  matched_date DATE,
  reconciliation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'matched', 'reconciled'
  
  -- 문서 저장
  pdf_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 페이슬립 테이블
CREATE TABLE payslips (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  payslip_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- 직원 정보
  employee_id UUID,
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  employee_tfn VARCHAR(9),
  employment_type VARCHAR(20) NOT NULL, -- 'full-time', 'part-time', 'casual', 'contractor'
  
  -- 급여 기간
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  
  -- 급여 정보
  gross_pay DECIMAL(15, 2) NOT NULL,
  payg_withholding DECIMAL(15, 2) NOT NULL,
  superannuation DECIMAL(15, 2),
  net_pay DECIMAL(15, 2) NOT NULL,
  
  -- PAYG 상세
  payg_details JSONB NOT NULL,
  
  -- 상태
  status VARCHAR(20) NOT NULL, -- 'draft', 'issued', 'paid', 'cancelled'
  
  -- 회계 연동
  general_ledger_entries JSONB NOT NULL,
  
  -- 은행 매칭
  matched_transaction_id UUID REFERENCES accounting_transactions(id),
  matched_date DATE,
  reconciliation_status VARCHAR(20) DEFAULT 'pending',
  
  -- 문서 저장
  pdf_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- General Ledger (총계정원장) 테이블
CREATE TABLE general_ledger_entries (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  account VARCHAR(100) NOT NULL, -- 'Accounts Receivable', 'Sales Revenue', 'GST Payable', etc.
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  description TEXT NOT NULL,
  
  -- 원천 문서 정보
  source_document VARCHAR(50) NOT NULL, -- 'invoice', 'payslip', 'bank_transaction'
  source_document_id VARCHAR(255) NOT NULL,
  
  -- 매칭 정보
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_invoices_organization ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_reconciliation ON invoices(reconciliation_status);
CREATE INDEX idx_payslips_organization ON payslips(organization_id);
CREATE INDEX idx_payslips_status ON payslips(status);
CREATE INDEX idx_ledger_organization ON general_ledger_entries(organization_id);
CREATE INDEX idx_ledger_account ON general_ledger_entries(account);
CREATE INDEX idx_ledger_date ON general_ledger_entries(transaction_date);
CREATE INDEX idx_ledger_source ON general_ledger_entries(source_document, source_document_id);

-- 인덱스
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_receipts_organization ON receipts(organization_id);
CREATE INDEX idx_receipts_match_status ON receipts(match_status);
CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
```

---

## 📡 API 설계

### 영수증 매칭 API

```typescript
// app/api/reconciliation/match/route.ts
export async function POST(request: Request) {
  const { receiptId, transactionId } = await request.json()
  
  // 권한 확인
  const user = await getCurrentUser(request)
  if (!rbac.hasPermission(user.role, 'receipts', 'update')) {
    return new Response('Forbidden', { status: 403 })
  }

  // 매칭 로직
  const matcher = new ReceiptMatcher()
  const result = await matcher.matchReceiptToTransaction(receipt, transactions)

  return Response.json(result)
}
```

### 현금 흐름 예보 API

```typescript
// app/api/forecasting/cash-flow/route.ts
export async function GET(request: Request) {
  const { months = 3 } = request.nextUrl.searchParams
  
  const user = await getCurrentUser(request)
  if (!rbac.hasPermission(user.role, 'reports', 'read')) {
    return new Response('Forbidden', { status: 403 })
  }

  const transactions = await getTransactions(user.organizationId)
  const currentBalance = await getCurrentBalance(user.organizationId)

  const forecaster = new CashFlowForecaster()
  const forecast = await forecaster.forecastCashFlow(
    transactions,
    currentBalance,
    parseInt(months)
  )

  return Response.json(forecast)
}
```

### 구독 관리 API

```typescript
// app/api/subscriptions/route.ts
export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!rbac.hasPermission(user.role, 'subscriptions', 'read')) {
    return new Response('Forbidden', { status: 403 })
  }

  const subscriptions = await getSubscriptions(user.organizationId)
  const service = new SubscriptionService()
  const alerts = await service.checkRenewalAlerts(subscriptions)

  return Response.json({ subscriptions, alerts })
}
```

---

## 🗺️ 구현 로드맵

### Phase 1: 핵심 인프라 (4주)
- [ ] 멀티 테넌시 데이터베이스 스키마
- [ ] RBAC 시스템 구현
- [ ] 사용자 인증 및 조직 관리
- [ ] 모듈 로더 기본 구조

### Phase 2: 영수증 매칭 (3주)
- [ ] 영수증 OCR/데이터 추출
- [ ] 자동 매칭 알고리즘
- [ ] 매칭 UI 컴포넌트
- [ ] 수동 매칭 기능

### Phase 3: 현금 흐름 예보 (3주)
- [ ] 과거 패턴 분석 엔진
- [ ] 예측 알고리즘 구현
- [ ] 세무 의무 계산
- [ ] 대시보드 위젯

### Phase 4: 구독 관리 (2주)
- [ ] 구독 자동 감지
- [ ] 갱신 알림 시스템
- [ ] 미사용 구독 감지
- [ ] 구독 관리 UI

### Phase 5: 결제 게이트웨이 자동 동기화 (3주)
- [ ] Stripe Webhook 연동
- [ ] PayPal Webhook 연동
- [ ] 주문 상태 자동 업데이트 (Zero-touch)
- [ ] 패킹 리스트 자동 생성
- [ ] 결제 수수료 및 정산액 구분 회계 분개
- [ ] 웹 대시보드 실시간 알림
- [ ] 모바일 푸시 알림
- [ ] 일일 매출 요약 업데이트

### Phase 6: 범용 세무/회계 코어 엔진 (5주)
- [ ] API-First 데이터 연동 구조
- [ ] 외부 대시보드 API 스키마 정의
- [ ] 업종별 회계 프리셋 구현 (Retail, Service)
- [ ] Chart of Accounts 동적 로드
- [ ] General Ledger 코어 엔진
- [ ] Director's Loan & Capital 관리
- [ ] JSON 기반 데이터 저장소
- [ ] 모듈 아카이빙 시스템

### Phase 7: 인보이스 및 페이슬립 통합 (4주)
- [ ] 인보이스 생성 및 GST 계산
- [ ] 페이슬립 생성 및 PAYG 계산
- [ ] PDF 생성 및 S3 저장
- [ ] 이메일 자동 발송
- [ ] 은행 거래 매칭 (Reconciliation)
- [ ] 통합 관리자 UI

### Phase 8: 업종별 모듈 (4주)
- [ ] 청소업 모듈 완성
- [ ] 소매업 모듈 개발
- [ ] IT 서비스 모듈 개발
- [ ] 모듈 마켓플레이스 UI

---

## 📝 참고사항

- 모든 기능은 멀티 테넌시를 고려하여 설계됨
- AI 기능은 OpenAI API를 기본으로 하되, 다른 제공자로 교체 가능하도록 인터페이스 분리
- 확장성을 위해 플러그인 아키텍처 채택
- 보안은 RBAC와 데이터 격리를 통해 보장


# GST 정산 기능 완성 - 상세 구현 가이드

> **작업 기간**: 4-5일  
> **우선순위**: 🔴 높음 (BAS 신고 필수)  
> **현재 완료율**: 40% → 목표: 100%

---

## 📋 개요

### 현재 상태
- ✅ 기본 GST 계산 함수 (`calculateGST`) 존재
- ✅ Excel 내보내기 시 GST 포함
- ✅ Financial Summary에 GST 표시
- ❌ AI 기반 GST 포함 여부 판별 없음
- ❌ GST Collected / GST Paid 분리 계산 없음
- ❌ BAS 리포트에 GST 정보 없음
- ❌ 독립적인 GST 요약 대시보드 없음

### 목표
- AI 기반 거래별 GST 포함 여부 정확한 판별
- GST Collected (수입)와 GST Paid (지출) 분리 계산
- BAS 리포트에 GST 섹션 추가
- 실시간 GST 요약 대시보드

---

## 🎯 작업 1: GST 포함 여부 AI 판별 (1-2일)

### 목표
거래별로 GST 포함 여부를 AI로 정확히 판별하여 저장

### 구현 파일
```
apps/accounting-sandbox/
├── lib/
│   └── gst-settlement/
│       ├── types.ts              # 타입 정의 (신규)
│       ├── gst-detector.ts       # GST 감지 엔진 (신규)
│       └── index.ts              # Export (신규)
```

### Step 1-1: 타입 정의 (`lib/gst-settlement/types.ts`)

```typescript
/**
 * GST 정산 관련 타입 정의
 */

export interface GSTTransaction {
  transactionId: string
  date: string
  description: string
  amount: number
  isGSTIncluded: boolean              // GST 포함 여부
  gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'  // GST 유형
  gstAmount?: number                  // GST 금액 (계산됨)
  netAmount?: number                  // GST 제외 금액
  gstRate: number                     // GST 세율 (기본 10%)
  transactionType: 'sale' | 'purchase' | 'expense'
  confidence: number                  // AI 판별 신뢰도 (0-1)
  reasoning?: string                  // 판별 근거
}

export interface GSTDetectionResult {
  isGSTIncluded: boolean
  gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
  gstAmount: number
  netAmount: number
  transactionType: 'sale' | 'purchase' | 'expense'
  confidence: number
  reasoning?: string
}
```

### Step 1-2: GST 감지 엔진 (`lib/gst-settlement/gst-detector.ts`)

```typescript
/**
 * GST 포함 여부 AI 판별 엔진
 */

import { OpenAI } from 'openai'
import { BankTransaction } from '@/lib/pdf-parser/types'
import { GSTDetectionResult } from './types'

export class GSTDetector {
  private openai: OpenAI | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey })
    }
  }

  /**
   * AI를 사용하여 거래 내역에서 GST 포함 여부 판별
   */
  async detectGST(
    transaction: BankTransaction,
    category?: string,
    apiKey?: string
  ): Promise<GSTDetectionResult> {
    // API Key가 제공되면 새로 생성
    if (apiKey && !this.openai) {
      this.openai = new OpenAI({ apiKey })
    }

    if (!this.openai) {
      // API Key가 없으면 기본값 반환 (GST 포함 가정)
      return this.getDefaultResult(transaction)
    }

    const prompt = this.buildGSTDetectionPrompt(transaction, category)
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in Australian GST (Goods and Services Tax) regulations. Analyze bank transactions and determine if GST is included, excluded, or if the transaction is GST-free.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })

      const aiResponse = response.choices[0]?.message?.content || ''
      return this.parseGSTResponse(transaction, aiResponse)
    } catch (error) {
      console.error('[GST-DETECTOR] AI detection failed:', error)
      return this.getDefaultResult(transaction)
    }
  }

  /**
   * GST 감지 프롬프트 생성
   */
  private buildGSTDetectionPrompt(
    transaction: BankTransaction,
    category?: string
  ): string {
    const amount = transaction.debit || transaction.credit || 0
    const amountStr = transaction.debit 
      ? `-$${Math.abs(transaction.debit).toFixed(2)}` 
      : `+$${Math.abs(transaction.credit || 0).toFixed(2)}`

    return `Analyze the following Australian bank transaction and determine if GST (Goods and Services Tax) is included.

Transaction Details:
- Date: ${transaction.date}
- Description: ${transaction.description}
- Amount: ${amountStr}
- Category: ${category || 'UNCATEGORIZED'}

Australian GST Rules:
- GST rate is 10%
- GST registered businesses must include GST in prices for sales
- Most business purchases from GST registered suppliers include GST
- GST-free items include:
  * Most basic food items
  * Medical services and medicines
  * Educational courses
  * Financial services (most cases)
  * Residential rent (if not commercial)
  * Wages and salaries
  * Interest income
  * Government charges (some)

Instructions:
1. Analyze the transaction description for GST indicators
2. Check if the amount suggests GST inclusion (e.g., $110 = $100 + $10 GST)
3. Determine transaction type: 'sale' (income), 'purchase' (business expense), or 'expense' (operating expense)
4. Classify GST status:
   - INCLUDED: GST is included in the amount (most business transactions)
   - EXCLUDED: GST is not included (wages, interest, some services)
   - FREE: Transaction is GST-free (medical, education, basic food)

Respond in JSON format:
{
  "gstIncluded": true/false,
  "gstType": "INCLUDED" | "EXCLUDED" | "FREE",
  "transactionType": "sale" | "purchase" | "expense",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`
  }

  /**
   * AI 응답 파싱
   */
  private parseGSTResponse(
    transaction: BankTransaction,
    aiResponse: string
  ): GSTDetectionResult {
    const amount = Math.abs(transaction.debit || transaction.credit || 0)
    
    try {
      // JSON 파싱 시도
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const isGSTIncluded = parsed.gstIncluded === true || parsed.gstType === 'INCLUDED'
        const gstType = parsed.gstType || (isGSTIncluded ? 'INCLUDED' : 'EXCLUDED')
        
        let gstAmount = 0
        let netAmount = amount

        if (isGSTIncluded && gstType === 'INCLUDED') {
          // GST 포함 금액에서 GST 계산: amount / 11 * 1 (10% GST)
          gstAmount = Math.round((amount / 11) * 100) / 100
          netAmount = Math.round((amount - gstAmount) * 100) / 100
        }

        return {
          isGSTIncluded,
          gstType: gstType as 'INCLUDED' | 'EXCLUDED' | 'FREE',
          gstAmount,
          netAmount,
          transactionType: parsed.transactionType || 'expense',
          confidence: parsed.confidence || 0.8,
          reasoning: parsed.reasoning
        }
      }
    } catch (error) {
      console.error('[GST-DETECTOR] Failed to parse JSON:', error)
    }

    // JSON 파싱 실패 시 텍스트 기반 파싱
    const isGSTIncluded = /GST.*INCLUDED|gstIncluded.*true/i.test(aiResponse)
    const gstTypeMatch = aiResponse.match(/gstType["\s:]+(INCLUDED|EXCLUDED|FREE)/i)
    const gstType = (gstTypeMatch?.[1] || (isGSTIncluded ? 'INCLUDED' : 'EXCLUDED')) as 'INCLUDED' | 'EXCLUDED' | 'FREE'
    
    let gstAmount = 0
    let netAmount = amount

    if (isGSTIncluded && gstType === 'INCLUDED') {
      gstAmount = Math.round((amount / 11) * 100) / 100
      netAmount = Math.round((amount - gstAmount) * 100) / 100
    }

    return {
      isGSTIncluded,
      gstType,
      gstAmount,
      netAmount,
      transactionType: /sale|income/i.test(aiResponse) ? 'sale' : 
                      /purchase|buy/i.test(aiResponse) ? 'purchase' : 'expense',
      confidence: 0.7,
      reasoning: 'Parsed from text response'
    }
  }

  /**
   * 기본값 반환 (API Key 없을 때)
   */
  private getDefaultResult(transaction: BankTransaction): GSTDetectionResult {
    const amount = Math.abs(transaction.debit || transaction.credit || 0)
    // 기본적으로 GST 포함 가정 (기존 로직과 동일)
    const gstAmount = Math.round((amount / 11) * 100) / 100
    const netAmount = Math.round((amount - gstAmount) * 100) / 100

    return {
      isGSTIncluded: true,
      gstType: 'INCLUDED',
      gstAmount,
      netAmount,
      transactionType: transaction.credit ? 'sale' : 'expense',
      confidence: 0.5,
      reasoning: 'Default assumption (GST included)'
    }
  }
}

// Export singleton instance
export const gstDetector = new GSTDetector()
```

### Step 1-3: Export 파일 (`lib/gst-settlement/index.ts`)

```typescript
/**
 * GST 정산 모듈 Export
 */

export * from './types'
export * from './gst-detector'
export { gstDetector } from './gst-detector'
```

### Step 1-4: API Route에 통합 (`app/api/analyze/route.ts`)

**수정 위치**: AI 분류 후, 거래 저장 전

```typescript
// 기존 코드에 추가
import { gstDetector } from '@/lib/gst-settlement'

// AI 분류 후, 각 거래에 GST 정보 추가
for (const transaction of classifiedTransactions) {
  // GST 포함 여부 AI 판별
  const gstResult = await gstDetector.detectGST(
    transaction,
    transaction.category,
    apiKey
  )

  // 거래에 GST 정보 추가
  transaction.gstInfo = {
    isGSTIncluded: gstResult.isGSTIncluded,
    gstType: gstResult.gstType,
    gstAmount: gstResult.gstAmount,
    netAmount: gstResult.netAmount,
    confidence: gstResult.confidence,
    reasoning: gstResult.reasoning
  }
}
```

### Step 1-5: 타입 정의 업데이트

**파일**: `app/api/analyze/route.ts` 또는 `app/page.tsx`

```typescript
interface ClassifiedTransaction extends BankTransaction {
  // ... 기존 필드들
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence: number
    reasoning?: string
  }
}
```

---

## 🎯 작업 2: GST Net 계산 엔진 (1일)

### 목표
GST Collected (수입)와 GST Paid (지출)를 분리하여 Net 계산

### 구현 파일
```
apps/accounting-sandbox/
└── lib/
    └── gst-settlement/
        ├── gst-calculator.ts    # GST Net 계산 엔진 (신규)
        └── index.ts             # Export 추가
```

### Step 2-1: GST 계산 엔진 (`lib/gst-settlement/gst-calculator.ts`)

```typescript
/**
 * GST Net 계산 엔진
 * GST Collected (수입) - GST Paid (지출) = GST Net
 */

import { GSTTransaction } from './types'
import { formatDateAustralian } from '@/lib/utils/date-format'

export interface GSTSummary {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
    label: string
  }
  
  gstCollected: {
    total: number                    // 총 GST 징수액 (판매)
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstPaid: {
    total: number                    // 총 GST 납부액 (구매/비용)
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstNet: number                     // GST Net = GST Collected - GST Paid
  gstRefund: boolean                 // 환불 여부 (GST Net < 0)
}

export class GSTCalculator {
  /**
   * 기간별 GST Net 계산
   */
  calculateGSTNet(
    transactions: Array<{
      date: string
      description: string
      debit: number | null
      credit: number | null
      category?: string
      gstInfo?: {
        isGSTIncluded: boolean
        gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
        gstAmount?: number
        netAmount?: number
      }
    }>,
    startDate: string,
    endDate: string,
    periodType: 'monthly' | 'quarterly' = 'quarterly'
  ): GSTSummary {
    // 기간 내 거래 필터링
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return txDate >= start && txDate <= end
    })

    // GST 포함 거래만 필터링
    const gstTransactions: GSTTransaction[] = periodTransactions
      .filter(tx => tx.gstInfo?.isGSTIncluded && tx.gstInfo.gstType === 'INCLUDED')
      .map(tx => ({
        transactionId: tx.reference || '',
        date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.debit || tx.credit || 0),
        isGSTIncluded: true,
        gstType: 'INCLUDED' as const,
        gstAmount: tx.gstInfo?.gstAmount || 0,
        netAmount: tx.gstInfo?.netAmount || 0,
        gstRate: 0.10,
        transactionType: tx.credit ? 'sale' : (tx.category?.startsWith('EXPENSE_') ? 'expense' : 'purchase'),
        confidence: tx.gstInfo?.confidence || 0.5
      }))

    // GST Collected (수입에서 징수한 GST)
    const gstCollectedTransactions = gstTransactions.filter(tx => 
      tx.transactionType === 'sale' && tx.gstAmount && tx.gstAmount > 0
    )
    const gstCollected = gstCollectedTransactions.reduce(
      (sum, tx) => sum + (tx.gstAmount || 0), 
      0
    )

    // GST Paid (지출에서 납부한 GST)
    const gstPaidTransactions = gstTransactions.filter(tx => 
      (tx.transactionType === 'purchase' || tx.transactionType === 'expense') && 
      tx.gstAmount && 
      tx.gstAmount > 0
    )
    const gstPaid = gstPaidTransactions.reduce(
      (sum, tx) => sum + (tx.gstAmount || 0), 
      0
    )

    // GST Net 계산
    const gstNet = gstCollected - gstPaid

    // Period label 생성 (BAS 리포트와 동일한 로직 사용)
    const periodLabel = this.generatePeriodLabel(startDate, endDate, periodType)

    return {
      period: {
        startDate,
        endDate,
        type: periodType,
        label: periodLabel
      },
      gstCollected: {
        total: Math.round(gstCollected * 100) / 100,
        transactionCount: gstCollectedTransactions.length,
        transactions: gstCollectedTransactions
      },
      gstPaid: {
        total: Math.round(gstPaid * 100) / 100,
        transactionCount: gstPaidTransactions.length,
        transactions: gstPaidTransactions
      },
      gstNet: Math.round(gstNet * 100) / 100,
      gstRefund: gstNet < 0
    }
  }

  /**
   * Period label 생성 (BAS 리포트와 동일한 로직)
   */
  private generatePeriodLabel(
    startDate: string,
    endDate: string,
    periodType: 'monthly' | 'quarterly'
  ): string {
    const start = new Date(startDate)
    
    if (periodType === 'quarterly') {
      const month = start.getMonth() + 1
      const year = start.getFullYear()
      
      // 호주 재정연도 기준 분기 계산
      let quarter: number
      let financialYear: string
      
      if (month >= 7 && month <= 9) {
        quarter = 1
        financialYear = `${year}-${year + 1}`
      } else if (month >= 10 && month <= 12) {
        quarter = 2
        financialYear = `${year - 1}-${year}`
      } else if (month >= 1 && month <= 3) {
        quarter = 3
        financialYear = `${year - 1}-${year}`
      } else {
        quarter = 4
        financialYear = `${year - 1}-${year}`
      }
      
      return `Q${quarter} ${financialYear}`
    } else {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }
}

// Export singleton instance
export const gstCalculator = new GSTCalculator()
```

### Step 2-2: Export 업데이트 (`lib/gst-settlement/index.ts`)

```typescript
export * from './types'
export * from './gst-detector'
export * from './gst-calculator'
export { gstDetector } from './gst-detector'
export { gstCalculator } from './gst-calculator'
```

---

## 🎯 작업 3: BAS GST 리포트 (1일)

### 목표
BAS 리포트에 GST 섹션 추가하여 PAYG와 통합

### 구현 파일
```
apps/accounting-sandbox/
└── lib/
    └── gst-settlement/
        └── bas-gst-reporter.ts    # BAS GST 리포트 (신규)
```

### Step 3-1: BAS GST 리포트 (`lib/gst-settlement/bas-gst-reporter.ts`)

```typescript
/**
 * BAS GST 리포트 생성
 * 기존 PAYG BAS 리포트에 GST 섹션 추가
 */

import { GSTSummary } from './gst-calculator'
import { formatDateAustralian } from '@/lib/utils/date-format'

export interface BASGSTReport {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
    label: string
  }
  
  gstSummary: GSTSummary
  
  // BAS 신고용 요약
  basGSTSummary: {
    gstCollected: number           // G1: Total sales (GST inclusive)
    gstPaid: number                // G11: Total purchases (GST inclusive)
    gstNet: number                 // 1A: GST Net (납부/환급 금액)
    gstRefund: boolean             // 환급 여부
  }
}

/**
 * BAS GST 리포트 생성
 */
export function generateBASGSTReport(
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
  }>,
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'quarterly' = 'quarterly'
): BASGSTReport {
  const { gstCalculator } = require('./gst-calculator')
  
  const gstSummary = gstCalculator.calculateGSTNet(
    transactions,
    startDate,
    endDate,
    periodType
  )

  return {
    period: gstSummary.period,
    gstSummary,
    basGSTSummary: {
      gstCollected: gstSummary.gstCollected.total,
      gstPaid: gstSummary.gstPaid.total,
      gstNet: gstSummary.gstNet,
      gstRefund: gstSummary.gstRefund
    }
  }
}
```

### Step 3-2: 기존 BAS 리포트 확장 (`lib/payg-withholding/bas-reporter.ts`)

**수정 위치**: `generateBASReport` 함수와 `exportBASToExcel` 함수

```typescript
// 기존 BASReport 인터페이스에 GST 추가
export interface BASReport {
  // ... 기존 필드들
  gstSummary?: {
    gstCollected: number
    gstPaid: number
    gstNet: number
    gstRefund: boolean
  }
}

// generateBASReport 함수에 GST 계산 추가
export function generateBASReport(
  transactions: Array<{...}>,
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'quarterly' = 'quarterly'
): BASReport {
  // ... 기존 PAYG 계산 로직

  // GST 계산 추가
  const { generateBASGSTReport } = require('@/lib/gst-settlement/bas-gst-reporter')
  const gstReport = generateBASGSTReport(transactions, startDate, endDate, periodType)

  return {
    // ... 기존 PAYG 정보
    gstSummary: gstReport.basGSTSummary
  }
}

// exportBASToExcel 함수에 GST 섹션 추가
export function exportBASToExcel(
  report: BASReport,
  payrollTransactions: PayrollTransaction[],
  fileName: string = 'bas-report'
): void {
  // ... 기존 PAYG 섹션

  // GST 섹션 추가
  if (report.gstSummary) {
    allRows.push([''])
    allRows.push(['GST Summary'])
    allRows.push(['GST Collected (G1):', report.gstSummary.gstCollected])
    allRows.push(['GST Paid (G11):', report.gstSummary.gstPaid])
    allRows.push(['GST Net (1A):', report.gstSummary.gstNet])
    allRows.push(['GST Refund:', report.gstSummary.gstRefund ? 'Yes' : 'No'])
  }
}
```

---

## 🎯 작업 4: GST 요약 대시보드 (1일)

### 목표
독립적인 GST 요약 컴포넌트 생성 및 대시보드 통합

### 구현 파일
```
apps/accounting-sandbox/
└── components/
    └── GSTSummary.tsx    # GST 요약 컴포넌트 (신규)
```

### Step 4-1: GST 요약 컴포넌트 (`components/GSTSummary.tsx`)

```typescript
/**
 * GST 요약 대시보드 컴포넌트
 */

'use client'

import { useMemo, useState } from 'react'
import { Receipt, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react'
import { gstCalculator } from '@/lib/gst-settlement'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { generateBASReport, exportBASToExcel } from '@/lib/payg-withholding/bas-reporter'

interface GSTSummaryProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
  }>
}

export function GSTSummary({ transactions }: GSTSummaryProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('quarterly')

  // Get date range from transactions
  const dateRange = useMemo(() => {
    if (transactions.length === 0) {
      return null
    }
    
    const dates = transactions
      .map(tx => new Date(tx.date))
      .sort((a, b) => a.getTime() - b.getTime())
    
    return {
      startDate: dates[0].toISOString().split('T')[0],
      endDate: dates[dates.length - 1].toISOString().split('T')[0],
    }
  }, [transactions])

  // Calculate GST summary
  const gstSummary = useMemo(() => {
    if (!dateRange || transactions.length === 0) {
      return null
    }

    return gstCalculator.calculateGSTNet(
      transactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    )
  }, [transactions, dateRange, periodType])

  // Handle BAS export (GST 포함)
  const handleExportBAS = () => {
    if (!dateRange || !gstSummary) return

    const report = generateBASReport(
      transactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    )

    // Payroll transactions for PAYG section
    const payrollTransactions = transactions
      .filter(tx => tx.isPayrollTransaction && tx.requiresPAYG && tx.debit)
      .map(tx => ({
        date: tx.date,
        description: tx.description,
        grossAmount: Math.abs(tx.debit || 0),
        withholdingTax: 0,
        netAmount: Math.abs(tx.debit || 0),
        recipientType: (tx.payrollType || 'employee') as 'employee' | 'director' | 'contractor' | 'partner',
        hasABN: !tx.noABNWarning?.shouldWarn,
        category: tx.category || 'UNCATEGORIZED',
      }))

    exportBASToExcel(report, payrollTransactions, 'bas-report-gst')
  }

  if (!gstSummary) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-6 h6 text-green-600" />
          <h2 className="text-2xl font-semibold">GST Summary</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No transactions found.</p>
          <p className="text-sm mt-2">Upload bank statements to see GST summary.</p>
        </div>
      </div>
    )
  }

  const { gstCollected, gstPaid, gstNet, gstRefund } = gstSummary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold">GST Summary</h2>
          </div>
          
          {/* Period Toggle */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => setPeriodType(periodType === 'quarterly' ? 'monthly' : 'quarterly')}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              {periodType === 'quarterly' ? 'Quarterly' : 'Monthly'}
            </button>
          </div>
        </div>

        {/* Period Info */}
        <div className="text-sm text-gray-600 mb-4">
          <p>Period: <span className="font-medium">{gstSummary.period.label}</span></p>
          <p>{formatDateAustralian(gstSummary.period.startDate)} to {formatDateAustralian(gstSummary.period.endDate)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GST Collected */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">GST Collected</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(gstCollected.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gstCollected.transactionCount} transactions
          </p>
        </div>

        {/* GST Paid */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">GST Paid</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {formatCurrency(gstPaid.total)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gstPaid.transactionCount} transactions
          </p>
        </div>

        {/* GST Net */}
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className={`w-5 h-5 ${gstRefund ? 'text-blue-600' : 'text-purple-600'}`} />
            <h3 className="text-lg font-semibold">GST Net</h3>
          </div>
          <p className={`text-3xl font-bold ${gstRefund ? 'text-blue-600' : 'text-purple-600'}`}>
            {formatCurrency(Math.abs(gstNet))}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gstRefund ? 'Refund' : 'Payable'}
          </p>
        </div>

        {/* Export Button */}
        <div className="card flex flex-col justify-center">
          <button
            onClick={handleExportBAS}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Download className="w-5 h-5" />
            <span>Export BAS Report</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4-2: 대시보드에 통합 (`app/page.tsx`)

```typescript
// Import 추가
import { GSTSummary } from '@/components/GSTSummary'

// 컴포넌트 렌더링 부분에 추가
{transactions.length > 0 && (
  <div className="space-y-6">
    <FinancialSummary transactions={transactions} />
    <PAYGSummary transactions={transactions} />
    <GSTSummary transactions={transactions} />  {/* 추가 */}
    <TransactionTable 
      transactions={transactions} 
      onTransactionUpdate={handleTransactionUpdate}
    />
  </div>
)}
```

---

## 📋 구현 체크리스트

### 작업 1: GST 포함 여부 AI 판별
- [ ] `lib/gst-settlement/types.ts` 생성
- [ ] `lib/gst-settlement/gst-detector.ts` 생성
- [ ] `lib/gst-settlement/index.ts` 생성
- [ ] `app/api/analyze/route.ts`에 GST 감지 통합
- [ ] `ClassifiedTransaction` 타입에 `gstInfo` 필드 추가
- [ ] 테스트: 거래별 GST 판별 확인

### 작업 2: GST Net 계산 엔진
- [ ] `lib/gst-settlement/gst-calculator.ts` 생성
- [ ] `lib/gst-settlement/index.ts`에 export 추가
- [ ] 테스트: GST Collected/Paid/Net 계산 확인

### 작업 3: BAS GST 리포트
- [ ] `lib/gst-settlement/bas-gst-reporter.ts` 생성
- [ ] `lib/payg-withholding/bas-reporter.ts` 수정 (GST 섹션 추가)
- [ ] Excel 내보내기에 GST 섹션 추가
- [ ] 테스트: BAS 리포트에 GST 정보 포함 확인

### 작업 4: GST 요약 대시보드
- [ ] `components/GSTSummary.tsx` 생성
- [ ] `app/page.tsx`에 컴포넌트 통합
- [ ] 테스트: 대시보드에 GST 요약 표시 확인

---

## 🔄 통합 순서

1. **Step 1**: GST 감지 엔진 구현 및 API 통합
2. **Step 2**: GST 계산 엔진 구현
3. **Step 3**: BAS 리포트 확장
4. **Step 4**: 대시보드 컴포넌트 생성 및 통합

---

## 📊 예상 결과

### 구현 후 기능
- ✅ 거래별 AI 기반 GST 포함 여부 판별
- ✅ GST Collected (수입) 자동 계산
- ✅ GST Paid (지출) 자동 계산
- ✅ GST Net (납부/환급 금액) 자동 계산
- ✅ BAS 리포트에 GST 섹션 포함
- ✅ 실시간 GST 요약 대시보드

### 사용자 경험
- 대시보드에서 GST 정보를 한눈에 확인
- BAS 신고 시 GST 정보 자동 포함
- 정확한 GST 납부/환급 금액 파악

---

**예상 소요 시간**: 4-5일  
**우선순위**: 🔴 높음 (BAS 신고 필수)

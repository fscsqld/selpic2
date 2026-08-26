/**
 * GST Net 계산 엔진
 * Aligns with Biz Intel / calculateBusinessMetrics (income÷11, taxable expenses÷11).
 */

import { GSTTransaction } from './types'
import { getAustralianQuarter, getAustralianQuarterDates } from '@/lib/utils/australian-financial-year'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { isPurchaseGstClaimable } from '@/lib/gst/purchase-gst-claimable'

export interface GSTSummary {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
    label: string
  }
  
  gstCollected: {
    total: number                    // 1A GST on sales
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstPaid: {
    total: number                    // 1B GST on purchases
    transactionCount: number
    transactions: GSTTransaction[]
  }
  
  gstNet: number                     // 1A − 1B
  gstRefund: boolean
  g1TotalSales?: number
}

export class GSTCalculator {
  /**
   * 기간별 GST Net 계산 — same rules as on-screen GST Summary
   */
  calculateGSTNet(
    transactions: Array<{
      reference?: string
      date: string
      description: string
      debit: number | null
      credit: number | null
      category?: string
      department?: string
      source?: string
      gstInfo?: {
        isGSTIncluded: boolean
        gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
        gstAmount?: number
        netAmount?: number
      }
    }>,
    startDate: string,
    endDate: string,
    periodType: 'monthly' | 'quarterly' = 'quarterly',
    accountType: 'individual' | 'company' | 'sole_trader' = 'company'
  ): GSTSummary {
    const startIso = toIsoDateString(startDate) || startDate.slice(0, 10)
    const endIso = toIsoDateString(endDate) || endDate.slice(0, 10)

    const periodTransactions = transactions.filter((tx) => {
      const iso = toIsoDateString(tx.date)
      if (!iso) return false
      return iso >= startIso && iso <= endIso
    })

    const metrics = calculateBusinessMetrics(periodTransactions, 0, accountType)
    const label1A = Math.round(metrics.gstPayable * 100) / 100
    const label1B = Math.round(metrics.gstClaimable * 100) / 100
    const gstNet = Math.round((label1A - label1B) * 100) / 100

    // Detail rows for audit (optional) — claimable / income lines only
    const saleRows: GSTTransaction[] = periodTransactions
      .filter(
        (tx) =>
          tx.credit &&
          (tx.category || '').startsWith('INCOME_') &&
          tx.department !== 'personal'
      )
      .map((tx) => {
        const amount = Math.abs(tx.credit || 0)
        return {
          transactionId: tx.reference || '',
          date: tx.date,
          description: tx.description,
          amount,
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount: amount / 11,
          netAmount: amount - amount / 11,
          gstRate: 0.1,
          transactionType: 'sale' as const,
          confidence: 1,
        }
      })

    const purchaseRows: GSTTransaction[] = periodTransactions
      .filter(
        (tx) =>
          tx.debit &&
          (tx.category || '').startsWith('EXPENSE_') &&
          tx.department !== 'personal' &&
          isPurchaseGstClaimable(tx)
      )
      .map((tx) => {
        const amount = Math.abs(tx.debit || 0)
        const gstAmount = tx.gstInfo?.gstAmount ?? amount / 11
        return {
          transactionId: tx.reference || '',
          date: tx.date,
          description: tx.description,
          amount,
          isGSTIncluded: true,
          gstType: 'INCLUDED' as const,
          gstAmount,
          netAmount: amount - gstAmount,
          gstRate: 0.1,
          transactionType: 'expense' as const,
          confidence: 1,
        }
      })

    const periodLabel = this.generatePeriodLabel(startDate, endDate, periodType)

    return {
      period: {
        startDate,
        endDate,
        type: periodType,
        label: periodLabel,
      },
      gstCollected: {
        total: label1A,
        transactionCount: saleRows.length,
        transactions: saleRows,
      },
      gstPaid: {
        total: label1B,
        transactionCount: purchaseRows.length,
        transactions: purchaseRows,
      },
      gstNet,
      gstRefund: gstNet < 0,
      g1TotalSales: Math.round(metrics.totalIncome * 100) / 100,
    }
  }

  private generatePeriodLabel(
    startDate: string,
    endDate: string,
    periodType: 'monthly' | 'quarterly'
  ): string {
    const start = new Date(startDate)
    
    if (periodType === 'quarterly') {
      const { quarter, financialYear } = getAustralianQuarter(start)
      const dates = getAustralianQuarterDates(quarter, financialYear)
      return `Q${quarter} ${dates.financialYear}`
    } else {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December']
      return `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }
}

export const gstCalculator = new GSTCalculator()

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

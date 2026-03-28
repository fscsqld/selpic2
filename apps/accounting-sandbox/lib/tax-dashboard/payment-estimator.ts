/**
 * Payment Estimator
 * 
 * Estimates GST and PAYG payment amounts for the current reporting period
 */

import { gstCalculator } from '@/lib/gst-settlement'
import { generateBASReport } from '@/lib/payg-withholding/bas-reporter'
import { getFinancialYearQuarter } from '../tax-deadlines/tracker'

export interface BusinessProfile {
  companyName: string
  abn: string
  gstReportingCycle: 'Monthly' | 'Quarterly'
  paygReportingCycle: 'Monthly' | 'Quarterly'
}

export interface PaymentEstimate {
  period: {
    startDate: string
    endDate: string
    type: 'monthly' | 'quarterly'
    label: string
  }
  gstEstimated: number        // GST 예상 납부 금액 (GST Net)
  paygEstimated: number       // PAYG 예상 납부 금액 (Withholding Tax)
  totalEstimated: number       // 총 예상 납부 금액
  gstRefund: boolean          // GST 환급 여부
}

/**
 * Calculate payment estimates for current period
 */
export function calculatePaymentEstimates(
  profile: BusinessProfile | null,
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    requiresPAYG?: boolean
    isPayrollTransaction?: boolean
    payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
    noABNWarning?: {
      shouldWarn: boolean
      withholdingAmount?: number
    }
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
  }>,
  currentDate: Date = new Date()
): PaymentEstimate | null {
  if (!profile) {
    return null
  }

  // Calculate current period based on reporting cycle
  let periodStart: Date
  let periodEnd: Date
  let periodType: 'monthly' | 'quarterly'
  let periodLabel: string

  if (profile.gstReportingCycle === 'Quarterly') {
    // Use GST reporting cycle for period calculation
    const currentQuarter = getFinancialYearQuarter(currentDate)
    periodStart = currentQuarter.startDate
    periodEnd = currentQuarter.endDate
    periodType = 'quarterly'
    periodLabel = currentQuarter.label
  } else {
    // Monthly
    periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0) // Last day of month
    periodType = 'monthly'
    periodLabel = periodEnd.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
  }

  const startDateStr = periodStart.toISOString().split('T')[0]
  const endDateStr = periodEnd.toISOString().split('T')[0]

  // Calculate GST estimate
  const gstSummary = gstCalculator.calculateGSTNet(
    transactions,
    startDateStr,
    endDateStr,
    periodType
  )
  const gstEstimated = gstSummary.gstNet

  // Calculate PAYG estimate
  const basReport = generateBASReport(
    transactions,
    startDateStr,
    endDateStr,
    periodType
  )
  const paygEstimated = basReport.paygSummary.totalWithholdingTax

  // Total estimate
  const totalEstimated = gstEstimated + paygEstimated

  return {
    period: {
      startDate: startDateStr,
      endDate: endDateStr,
      type: periodType,
      label: periodLabel
    },
    gstEstimated: Math.round(gstEstimated * 100) / 100,
    paygEstimated: Math.round(paygEstimated * 100) / 100,
    totalEstimated: Math.round(totalEstimated * 100) / 100,
    gstRefund: gstEstimated < 0
  }
}

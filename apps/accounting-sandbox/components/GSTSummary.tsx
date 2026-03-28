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
import { 
  getCurrentAustralianQuarter, 
  getCurrentMonthDates,
  getAustralianQuarter,
  getAustralianQuarterDates,
  getAustralianFinancialYear
} from '@/lib/utils/australian-financial-year'

interface GSTSummaryProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    gstInfo?: {
      isGSTIncluded: boolean
      gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
    requiresPAYG?: boolean
    isPayrollTransaction?: boolean
    payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
    noABNWarning?: {
      shouldWarn: boolean
      withholdingAmount?: number
    }
  }>
  // Use calculated values from parent to ensure consistency
  gstPayable?: number
  gstClaimable?: number
}

export function GSTSummary({ transactions, gstPayable, gstClaimable }: GSTSummaryProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('quarterly')

  // Get date range based on Australian Financial Year standards
  const dateRange = useMemo(() => {
    if (periodType === 'quarterly') {
      // Use current Australian quarter dates (standard period)
      const currentQuarter = getCurrentAustralianQuarter()
      return {
        startDate: currentQuarter.startDateStr,
        endDate: currentQuarter.endDateStr,
      }
    } else {
      // Use current month dates (standard period)
      const currentMonth = getCurrentMonthDates()
      return {
        startDate: currentMonth.startDateStr,
        endDate: currentMonth.endDateStr,
      }
    }
  }, [periodType])

  // Filter transactions by the standard period date range
  const filteredTransactions = useMemo(() => {
    if (!dateRange) return transactions
    
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    
    return transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate >= startDate && txDate <= endDate
    })
  }, [transactions, dateRange])

  // Use provided values or calculate from transactions (fallback)
  const calculatedGST = useMemo(() => {
    // If values are provided from parent, use them (single source of truth)
    // But we need to recalculate based on filtered transactions for accurate counts
    if (gstPayable !== undefined && gstClaimable !== undefined) {
      // Recalculate transaction counts from filtered transactions
      return {
        gstCollected: {
          total: gstPayable,
          transactionCount: filteredTransactions.filter(tx => {
            const isBusiness = tx.department !== 'personal' && 
                              tx.department !== 'unknown' &&
                              (tx.department === 'cleaning' || 
                               tx.department === 'sticker' || 
                               !tx.department)
            const isRefund = tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                            (tx.description?.toUpperCase().includes('REFUND') && tx.credit)
            return isBusiness &&
                   tx.credit && 
                   tx.category?.startsWith('INCOME_') &&
                   tx.category !== 'TRANSFER_INTERNAL' &&
                   tx.category !== 'NON_TAXABLE_CASH_DEPOSIT' &&
                   tx.category !== 'INCOME_CASH_DEPOSIT_REVIEW' &&
                   !isRefund
          }).length
        },
        gstPaid: {
          total: gstClaimable,
          transactionCount: filteredTransactions.filter(tx => {
            const isBusiness = tx.department !== 'personal' && 
                              tx.department !== 'unknown' &&
                              (tx.department === 'cleaning' || 
                               tx.department === 'sticker' || 
                               !tx.department)
            // Count business expense transactions (debits) that contribute to GST
            // Exclude Director Loan Repayment
            const isExpense = isBusiness &&
                             tx.debit &&
                             tx.category?.startsWith('EXPENSE_') &&
                             tx.category !== 'TRANSFER_INTERNAL' &&
                             tx.category !== 'LIABILITY_DIRECTORS_LOAN' &&
                             tx.category !== 'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL' &&
                             tx.category !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT'
            
            // Count REFUNDS (credits) that reduce GST Paid
            const isRefund = isBusiness &&
                            tx.credit &&
                            (tx.category === 'INCOME_REFUND_REIMBURSEMENT' ||
                             tx.description?.toUpperCase().includes('REFUND') ||
                             tx.description?.toUpperCase().includes('OFFICEWORKS'))
            
            return isExpense || isRefund
          }).length
        },
        gstNet: gstPayable - gstClaimable,
        gstRefund: gstClaimable > gstPayable,
        period: dateRange ? {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          type: periodType,
          label: periodType === 'quarterly' 
            ? (() => {
                // Use the current quarter directly from getCurrentAustralianQuarter
                const currentQuarter = getCurrentAustralianQuarter()
                return `Q${currentQuarter.quarter} ${currentQuarter.financialYear}`
              })()
            : (() => {
                const startDate = new Date(dateRange.startDate)
                return startDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
              })()
        } : { startDate: '', endDate: '', type: 'quarterly' as const, label: '' }
      }
    }

    // Fallback: Use gstCalculator if values not provided
    if (!dateRange || filteredTransactions.length === 0) {
      return null
    }

    return gstCalculator.calculateGSTNet(
      filteredTransactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    )
  }, [filteredTransactions, dateRange, periodType, gstPayable, gstClaimable])

  const gstSummary = calculatedGST

  // Handle BAS export (GST 포함)
  const handleExportBAS = () => {
    if (!dateRange || !gstSummary) return

    const report = generateBASReport(
      filteredTransactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    )

    // Payroll transactions for PAYG section (filtered by period)
    const payrollTransactions = filteredTransactions
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
          <Receipt className="w-6 h-6 text-green-600" />
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

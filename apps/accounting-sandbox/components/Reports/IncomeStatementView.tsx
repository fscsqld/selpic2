'use client'

import { useMemo, useState } from 'react'
import { Download, Printer, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { ReportFooter } from './ReportFooter'
import { 
  getCurrentAustralianQuarter,
  getCurrentMonthDates,
  getAustralianFinancialYear
} from '@/lib/utils/australian-financial-year'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'

interface Transaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
}

interface IncomeStatementViewProps {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  periodStart?: string
  periodEnd?: string
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export function IncomeStatementView({
  transactions,
  openingDirectorLoanBalance,
  periodStart,
  periodEnd,
  accountType = 'company',
}: IncomeStatementViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'quarter' | 'year' | 'custom'>('current')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  
  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    let startDate: Date | null = null
    let endDate: Date | null = null
    
    if (periodStart && periodEnd) {
      startDate = new Date(periodStart)
      endDate = new Date(periodEnd)
    } else if (selectedPeriod === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart)
      endDate = new Date(customEnd)
    } else if (selectedPeriod === 'quarter') {
      // Use Australian Financial Year quarter dates
      const currentQuarter = getCurrentAustralianQuarter()
      startDate = currentQuarter.startDate
      endDate = currentQuarter.endDate
    } else if (selectedPeriod === 'year') {
      const now = new Date()
      const financialYear = getAustralianFinancialYear(now)
      const [startYear, endYear] = financialYear.split('-').map(Number)
      
      // Australian Financial Year: July 1 to June 30
      startDate = new Date(startYear, 6, 1) // July 1
      endDate = new Date(endYear, 5, 30) // June 30
    }
    
    if (startDate && endDate) {
      return transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= startDate! && txDate <= endDate!
      })
    }
    
    return transactions
  }, [transactions, selectedPeriod, customStart, customEnd, periodStart, periodEnd])
  
  // Calculate all metrics using single source of truth
  const metrics = useMemo(() => {
    return calculateBusinessMetrics(filteredTransactions, openingDirectorLoanBalance, accountType)
  }, [filteredTransactions, openingDirectorLoanBalance, accountType])
  
  // Get date range for display (use standard period dates, not transaction dates)
  const dateRange = useMemo(() => {
    if (periodStart && periodEnd) {
      return { start: periodStart, end: periodEnd }
    }
    if (selectedPeriod === 'custom' && customStart && customEnd) {
      return { start: customStart, end: customEnd }
    }
    
    // Use standard period dates based on selected period
    if (selectedPeriod === 'quarter') {
      const currentQuarter = getCurrentAustralianQuarter()
      return {
        start: currentQuarter.startDateStr,
        end: currentQuarter.endDateStr,
      }
    } else if (selectedPeriod === 'year') {
      const now = new Date()
      const financialYear = getAustralianFinancialYear(now)
      const [startYear, endYear] = financialYear.split('-').map(Number)
      return {
        start: `${startYear}-07-01`, // July 1
        end: `${endYear}-06-30`, // June 30
      }
    } else if (selectedPeriod === 'current') {
      const currentMonth = getCurrentMonthDates()
      return {
        start: currentMonth.startDateStr,
        end: currentMonth.endDateStr,
      }
    }
    
    // Fallback: use transaction dates if no period selected
    if (filteredTransactions.length === 0) {
      return null
    }
    const dates = filteredTransactions
      .map(tx => new Date(tx.date))
      .sort((a, b) => a.getTime() - b.getTime())
    return {
      start: dates[0].toISOString().split('T')[0],
      end: dates[dates.length - 1].toISOString().split('T')[0],
    }
  }, [filteredTransactions, selectedPeriod, customStart, customEnd, periodStart, periodEnd])

  // Calculate category breakdown
  // ⚠️ IMPORTANT: Individual User mode - include all transactions (no business filter)
  const categoryBreakdown = useMemo(() => {
    const incomeByCategory: Record<string, number> = {}
    const expensesByCategory: Record<string, number> = {}
    
    filteredTransactions.forEach(tx => {
      if (accountType === 'individual') {
        // Individual User: Include all transactions
        const category = tx.category || 'Uncategorized'
        
        if (tx.credit && tx.category?.startsWith('INCOME_')) {
          incomeByCategory[category] = (incomeByCategory[category] || 0) + Math.abs(tx.credit)
        } else if (tx.debit && tx.category?.startsWith('EXPENSE_')) {
          expensesByCategory[category] = (expensesByCategory[category] || 0) + Math.abs(tx.debit)
        }
      } else {
        // Company/Sole Trader: Filter by business department
        const isBusiness = tx.department !== 'personal' && 
                          tx.department !== 'unknown' &&
                          (tx.department === 'cleaning' || 
                           tx.department === 'sticker' || 
                           !tx.department)
        
        if (!isBusiness) return
        
        const category = tx.category || 'Uncategorized'
        
        if (tx.credit && tx.category?.startsWith('INCOME_')) {
          incomeByCategory[category] = (incomeByCategory[category] || 0) + Math.abs(tx.credit)
        } else if (tx.debit && tx.category?.startsWith('EXPENSE_')) {
          expensesByCategory[category] = (expensesByCategory[category] || 0) + Math.abs(tx.debit)
        }
      }
    })
    
    return { incomeByCategory, expensesByCategory }
  }, [filteredTransactions, accountType])
  
  const handlePrint = () => {
    window.print()
  }
  
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Income Statement (Profit & Loss)</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; }
            .header { margin-bottom: 30px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary-box { background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-label { font-weight: bold; }
          </style>
        </head>
        <body>
          ${document.getElementById('income-statement-content')?.innerHTML || ''}
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }
  
  return (
    <div id="income-statement-content" className="space-y-8 print:space-y-6">
      {/* Header */}
      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Income Statement (Profit & Loss)</h1>
          {dateRange && (
            <p className="text-gray-600 mt-2">
              Period: {formatDateAustralian(typeof dateRange.start === 'string' ? dateRange.start : dateRange.start.toISOString().split('T')[0])} to {formatDateAustralian(typeof dateRange.end === 'string' ? dateRange.end : dateRange.end.toISOString().split('T')[0])}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>
      
      {/* Period Selector */}
      {!periodStart && !periodEnd && (
        <div className="no-print card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">All Transactions</option>
              <option value="quarter">Current Quarter</option>
              <option value="year">Current Financial Year</option>
              <option value="custom">Custom Range</option>
            </select>
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Summary Section */}
      <div className="section">
        <div className="section-title flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Revenue
        </div>
        
        <div className="summary-box">
          <div className="summary-row">
            <span className="summary-label">Total Revenue:</span>
            <span className="font-semibold text-green-600">{formatCurrency(metrics.totalIncome)}</span>
          </div>
          {Object.keys(categoryBreakdown.incomeByCategory).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-sm font-medium text-gray-700 mb-2">Revenue by Category:</p>
              <div className="space-y-1">
                {Object.entries(categoryBreakdown.incomeByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-600">{getCategoryDisplayName(category)}</span>
                      <span className="text-gray-800">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Expenses Section */}
      <div className="section">
        <div className="section-title flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          Expenses
        </div>
        
        <div className="summary-box">
          <div className="summary-row">
            <span className="summary-label">Total Expenses:</span>
            <span className="font-semibold text-red-600">{formatCurrency(metrics.totalExpenses)}</span>
          </div>
          {Object.keys(categoryBreakdown.expensesByCategory).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-sm font-medium text-gray-700 mb-2">Expenses by Category:</p>
              <div className="space-y-1">
                {Object.entries(categoryBreakdown.expensesByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-sm">
                      <span className="text-gray-600">{category.replace(/^EXPENSE_/, '').replace(/_/g, ' ')}</span>
                      <span className="text-gray-800">{formatCurrency(amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Net Profit Section */}
      <div className="section">
        <div className="section-title flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Net Profit
        </div>
        
        <div className="summary-box">
          <div className="summary-row border-t border-gray-300 pt-2 mt-2">
            <span className="summary-label text-lg">Net Profit (Revenue - Expenses):</span>
            <span className={`font-bold text-lg ${
              metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.netProfit)}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Revenue:</p>
                <p className="font-semibold text-green-600">{formatCurrency(metrics.totalIncome)}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Expenses:</p>
                <p className="font-semibold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Metrics */}
      <div className="section">
        <div className="section-title flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Additional Information
        </div>
        
        <div className="summary-box">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">GST Collected:</p>
              <p className="font-semibold text-green-600">{formatCurrency(metrics.gstPayable)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">GST Claimable:</p>
              <p className="font-semibold text-red-600">{formatCurrency(metrics.gstClaimable)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Net GST Payable:</p>
              <p className={`font-semibold ${
                metrics.gstPayable - metrics.gstClaimable >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {formatCurrency(metrics.gstPayable - metrics.gstClaimable)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Director's Loan Balance:</p>
              <p className={`font-semibold ${
                metrics.directorsLoanBalance >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                {formatCurrency(metrics.directorsLoanBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Company Footer */}
      <ReportFooter />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 20px;
            font-size: 12px;
          }
          .section {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  )
}

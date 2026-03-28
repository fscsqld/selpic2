'use client'

import { useState, useMemo } from 'react'
import { DollarSign, Users, FileText, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import { generateBASReport } from '@/lib/payg-withholding/bas-reporter'
import { formatCurrency } from '@/lib/utils/currency-format'
import { PAYGConfigManager } from '@/lib/payg-withholding/config'

interface PAYGSummaryProps {
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
  }>
}

export function PAYGSummary({ transactions }: PAYGSummaryProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('quarterly')
  const config = PAYGConfigManager.loadConfig()

  // Filter payroll transactions (Wages Expense 거래를 기준으로 필터링)
  // PAYG 거래는 credit이므로 Wages Expense (debit) 거래를 기준으로 필터링
  const payrollTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.isPayrollTransaction && 
      tx.category === 'EXPENSE_WAGES_SALARIES' && 
      tx.debit
    )
  }, [transactions])

  // Get date range from transactions
  const dateRange = useMemo(() => {
    if (payrollTransactions.length === 0) {
      return null
    }
    
    const dates = payrollTransactions
      .map(tx => new Date(tx.date))
      .sort((a, b) => a.getTime() - b.getTime())
    
    return {
      startDate: dates[0].toISOString().split('T')[0],
      endDate: dates[dates.length - 1].toISOString().split('T')[0],
    }
  }, [payrollTransactions])

  // Generate BAS report
  const basReport = useMemo(() => {
    if (!dateRange || payrollTransactions.length === 0) {
      return null
    }

    return generateBASReport(
      transactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType
    )
  }, [transactions, dateRange, periodType])

  // If no payroll transactions, show empty state
  if (payrollTransactions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-semibold">PAYG Withholding Summary</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No payroll transactions found.</p>
          <p className="text-sm mt-2">Upload bank statements with payroll payments to see PAYG summary.</p>
        </div>
      </div>
    )
  }

  if (!basReport) {
    return null
  }

  const { paygSummary } = basReport

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold">PAYG Withholding Summary</h2>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'monthly' | 'quarterly')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* PAYG Status */}
        <div className={`p-3 rounded-md mb-4 ${
          config.isEnabled
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-2">
            {config.isEnabled ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  PAYG Enabled - Withholding calculations active
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  PAYG Not Registered - No ABN warnings still active
                </span>
              </>
            )}
          </div>
        </div>

        {/* Period Info */}
        <div className="text-sm text-gray-600 mb-4">
          <p>Period: <span className="font-medium">{basReport.period.label}</span></p>
          <p>{formatDateAustralian(basReport.period.startDate)} to {formatDateAustralian(basReport.period.endDate)}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Pay */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Gross Pay</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(paygSummary.totalGrossPay)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {paygSummary.transactionCount} transactions
            </p>
          </div>
        </div>

        {/* Total Withholding Tax */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Withholding Tax</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(paygSummary.totalWithholdingTax)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {((paygSummary.totalWithholdingTax / paygSummary.totalGrossPay) * 100).toFixed(1)}% of gross
            </p>
          </div>
        </div>

        {/* Total Net Pay */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Net Pay</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(paygSummary.totalNetPay)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              After withholding
            </p>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">
                {paygSummary.transactionCount}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Payroll payments
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown by Recipient Type */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Breakdown by Recipient Type
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-2">Employee</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(paygSummary.byRecipientType.employee.totalGross)}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              <p>{paygSummary.byRecipientType.employee.count} payments</p>
              <p>Tax: {formatCurrency(paygSummary.byRecipientType.employee.totalTax)}</p>
            </div>
          </div>

          {/* Director */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800 mb-2">Director</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(paygSummary.byRecipientType.director.totalGross)}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              <p>{paygSummary.byRecipientType.director.count} payments</p>
              <p>Tax: {formatCurrency(paygSummary.byRecipientType.director.totalTax)}</p>
            </div>
          </div>

          {/* Contractor */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm font-medium text-green-800 mb-2">Contractor</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(paygSummary.byRecipientType.contractor.totalGross)}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              <p>{paygSummary.byRecipientType.contractor.count} payments</p>
              <p>Tax: {formatCurrency(paygSummary.byRecipientType.contractor.totalTax)}</p>
              {paygSummary.byRecipientType.contractor.noABNCount > 0 && (
                <p className="mt-1 text-red-600 font-medium">
                  ⚠️ {paygSummary.byRecipientType.contractor.noABNCount} No ABN
                  ({formatCurrency(paygSummary.byRecipientType.contractor.noABNWithholding)})
                </p>
              )}
            </div>
          </div>

          {/* Partner */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-800 mb-2">Partner</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(paygSummary.byRecipientType.partner.totalGross)}
            </p>
            <div className="mt-2 text-xs text-gray-600">
              <p>{paygSummary.byRecipientType.partner.count} payments</p>
              <p>Tax: {formatCurrency(paygSummary.byRecipientType.partner.totalTax)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


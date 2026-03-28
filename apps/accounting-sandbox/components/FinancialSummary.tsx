'use client'

import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'
import { FinancialSummary as SummaryType } from '@/lib/utils/financial-summary'
import { formatCurrency } from '@/lib/utils/currency-format'

interface FinancialSummaryProps {
  summary: SummaryType
}

export function FinancialSummary({ summary }: FinancialSummaryProps) {
  const netGST = summary.totalGSTPayable - summary.totalGSTClaimable

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Net Profit */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${
              summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(summary.netProfit)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total Business Income - Total Taxable Expenses
            </p>
          </div>
          {summary.netProfit >= 0 ? (
            <TrendingUp className="w-8 h-8 text-green-600" />
          ) : (
            <TrendingDown className="w-8 h-8 text-red-600" />
          )}
        </div>
      </div>

      {/* GST Summary */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">GST Net</p>
            <p className={`text-2xl font-bold ${
              netGST >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(Math.abs(netGST))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {netGST >= 0 ? 'Payable' : 'Claimable'}
            </p>
          </div>
          <Receipt className="w-8 h-8 text-blue-600" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payable:</span>
            <span className="text-red-600">{formatCurrency(summary.totalGSTPayable)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Claimable:</span>
            <span className="text-green-600">{formatCurrency(summary.totalGSTClaimable)}</span>
          </div>
        </div>
      </div>

      {/* Director's Loan */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Director's Loan</p>
            <p className={`text-2xl font-bold ${
              summary.directorsLoanBalance >= 0 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {formatCurrency(Math.abs(summary.directorsLoanBalance))}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.directorsLoanBalance >= 0 ? 'Company owes Director' : 'Director owes Company'}
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ⚡ Auto-synced with Personal transactions
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-yellow-600" />
        </div>
      </div>

      {/* Total Income */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Income</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </p>
          </div>
          <TrendingUp className="w-8 h-8 text-green-600" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Business:</span>
            <span className="text-green-600">{formatCurrency(summary.totalIncome)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}


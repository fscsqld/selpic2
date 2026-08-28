'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import {
  calculateBusinessMetrics,
  type Transaction,
} from '@/lib/utils/business-calculations'
import {
  L1_CASH_SUBLABEL,
  L2_EX_GST_LINE,
  L2_TAX_NET_LINE,
  REPORTING_LAYERS_BIZ_INTEL_FOOTER,
} from '@/lib/reporting/reporting-layer-labels'

interface RealTimePLViewProps {
  /** Already filtered to the selected dashboard period */
  transactions: Transaction[]
  periodLabel?: string
  accountType?: 'individual' | 'company' | 'sole_trader'
  gstRegistered?: boolean
}

/**
 * Real-time P&L for the selected banner period.
 * Primary figures are cash (GST inclusive); tax (ex GST) estimates shown alongside.
 */
export function RealTimePLView({
  transactions,
  periodLabel = 'Selected period',
  accountType = 'company',
  gstRegistered = true,
}: RealTimePLViewProps) {
  const metrics = useMemo(
    () =>
      calculateBusinessMetrics(transactions, 0, accountType, 0, gstRegistered),
    [transactions, accountType, gstRegistered]
  )

  const showGstDual =
    accountType !== 'individual' &&
    gstRegistered &&
    (Math.abs(metrics.totalIncomeExGst - metrics.totalIncome) > 0.005 ||
      Math.abs(metrics.totalExpensesExGst - metrics.totalExpenses) > 0.005 ||
      Math.abs(metrics.netProfitExGst - metrics.netProfit) > 0.005)

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Real-Time P&L View</h3>
        </div>
        <span className="text-sm text-gray-600 font-medium">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Revenue</p>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(metrics.totalIncome)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{L1_CASH_SUBLABEL}</p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1.5">
              {L2_EX_GST_LINE}:{' '}
              <span className="font-semibold text-green-800">
                {formatCurrency(metrics.totalIncomeExGst)}
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Expenses</p>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(metrics.totalExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {L1_CASH_SUBLABEL}
            {showGstDual ? ' · FREE at face' : ''}
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1.5">
              {L2_EX_GST_LINE}:{' '}
              <span className="font-semibold text-red-800">
                {formatCurrency(metrics.totalExpensesExGst)}
              </span>
            </p>
          )}
        </div>

        <div
          className={`bg-white rounded-lg p-4 border ${
            metrics.netProfit >= 0
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <DollarSign
              className={`w-4 h-4 ${
                metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-bold ${
              metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(metrics.netProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {L1_CASH_SUBLABEL} · {metrics.netProfit >= 0 ? 'Profit' : 'Loss'} this period
          </p>
          {showGstDual && (
            <p className="text-xs text-gray-600 mt-1.5">
              {L2_TAX_NET_LINE}:{' '}
              <span
                className={`font-semibold ${
                  metrics.netProfitExGst >= 0 ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {formatCurrency(metrics.netProfitExGst)}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Based on {transactions.length} transactions in {periodLabel}
        </p>
        <p className="text-xs text-gray-400 text-center mt-1">{REPORTING_LAYERS_BIZ_INTEL_FOOTER}</p>
      </div>
    </div>
  )
}

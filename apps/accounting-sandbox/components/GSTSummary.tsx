/**
 * GST Summary — same date window as P&L banner / ATO Lodgment.
 * FY Net = period 1A−1B estimate (not one annual ATO remittance).
 */

'use client'

import { useMemo, useState } from 'react'
import { Receipt, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { generateBASReport, exportBASToExcel } from '@/lib/payg-withholding/bas-reporter'
import { resolveReportingBasQuarter } from '@/lib/utils/reporting-period-resolve'
import { parseTransactionDate } from '@/lib/utils/parse-transaction-date'
import { breakdownGstByBasQuarter } from '@/lib/gst/gst-period-breakdown'
import {
  daysBetweenInclusive,
  gstSummaryCadenceLabel,
} from '@/lib/gst/gst-summary-cadence'


interface GSTSummaryProps {
  transactions: Array<{
    date: string
    description: string
    debit: number | null
    credit: number | null
    category?: string
    department?: string
    gstInfo?: {
      isGSTIncluded?: boolean
      gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
    }
    requiresPAYG?: boolean
    isPayrollTransaction?: boolean
    payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
    noABNWarning?: {
      shouldWarn?: boolean
      withholdingAmount?: number
    }
  }>
  viewPeriodId?: string | null
  periodStartDate?: string
  periodEndDate?: string
  periodLabel?: string
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export function GSTSummary({
  transactions,
  viewPeriodId = null,
  periodStartDate,
  periodEndDate,
  periodLabel,
  accountType = 'company',
}: GSTSummaryProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly'>('quarterly')

  const dateRange = useMemo(() => {
    if (periodStartDate && periodEndDate && periodType === 'quarterly') {
      return {
        startDate: periodStartDate,
        endDate: periodEndDate,
        label: periodLabel || `${periodStartDate} – ${periodEndDate}`,
      }
    }

    const bas = resolveReportingBasQuarter({
      transactions,
      viewPeriodId,
    })

    if (periodType === 'quarterly') {
      return {
        startDate: bas.startDateStr,
        endDate: bas.endDateStr,
        label: `Q${bas.quarter} ${bas.financialYear}`,
      }
    }

    if (viewPeriodId && /^\d{4}-\d{2}$/.test(viewPeriodId)) {
      const [y, m] = viewPeriodId.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      return {
        startDate: `${viewPeriodId}-01`,
        endDate: `${viewPeriodId}-${String(lastDay).padStart(2, '0')}`,
        label: viewPeriodId,
      }
    }

    return {
      startDate: bas.startDateStr,
      endDate: bas.endDateStr,
      label: `Q${bas.quarter} ${bas.financialYear}`,
    }
  }, [
    transactions,
    viewPeriodId,
    periodType,
    periodStartDate,
    periodEndDate,
    periodLabel,
  ])

  const filteredTransactions = useMemo(() => {
    if (
      periodStartDate &&
      periodEndDate &&
      periodType === 'quarterly' &&
      dateRange.startDate === periodStartDate &&
      dateRange.endDate === periodEndDate
    ) {
      return transactions
    }

    return transactions.filter((tx) => {
      const txDate = parseTransactionDate(tx.date)
      if (!txDate) return false
      const start = parseTransactionDate(dateRange.startDate)
      const end = parseTransactionDate(dateRange.endDate)
      if (!start || !end) return true
      const t = txDate.getTime()
      return t >= start.getTime() && t <= end.getTime()
    })
  }, [transactions, dateRange, periodStartDate, periodEndDate, periodType])

  const metrics = useMemo(() => {
    if (filteredTransactions.length === 0) return null
    return calculateBusinessMetrics(filteredTransactions, 0, accountType)
  }, [filteredTransactions, accountType])

  const quarterSlices = useMemo(() => {
    const days = daysBetweenInclusive(dateRange.startDate, dateRange.endDate)
    if (days <= 100) return []
    return breakdownGstByBasQuarter(
      filteredTransactions as any,
      accountType === 'sole_trader' ? 'sole_trader' : accountType,
      accountType !== 'individual'
    )
  }, [filteredTransactions, dateRange, accountType])

  const cadence = gstSummaryCadenceLabel(
    dateRange.startDate,
    dateRange.endDate,
    periodType,
    periodLabel
  )

  const handleExportBAS = () => {
    if (!metrics) return

    const report = generateBASReport(
      filteredTransactions,
      dateRange.startDate,
      dateRange.endDate,
      periodType,
      accountType
    )

    const payrollTransactions = filteredTransactions
      .filter((tx) => tx.isPayrollTransaction && tx.requiresPAYG && tx.debit)
      .map((tx) => ({
        date: tx.date,
        description: tx.description,
        grossAmount: Math.abs(tx.debit || 0),
        withholdingTax: 0,
        netAmount: Math.abs(tx.debit || 0),
        recipientType: (tx.payrollType || 'employee') as
          | 'employee'
          | 'director'
          | 'contractor'
          | 'partner',
        hasABN: !tx.noABNWarning?.shouldWarn,
        category: tx.category || 'UNCATEGORIZED',
      }))

    exportBASToExcel(report, payrollTransactions, 'bas-report-gst')
  }

  if (!metrics || filteredTransactions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-semibold">GST Summary</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No transactions found for this GST period.</p>
          <p className="text-sm mt-2">
            Select a P&amp;L period that matches your bank statement dates, then refresh.
          </p>
        </div>
      </div>
    )
  }

  const gstCollected = metrics.gstPayable
  const gstPaid = metrics.gstClaimable
  const gstNet = Math.round((gstCollected - gstPaid) * 100) / 100
  const gstRefund = gstNet < 0

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold">GST Summary</h2>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="px-3 py-1 text-sm border rounded bg-gray-50 text-gray-700">
              {cadence}
            </span>
            {cadence !== 'FY / Period' && cadence !== 'Multi-quarter' && (
              <button
                type="button"
                onClick={() =>
                  setPeriodType(periodType === 'quarterly' ? 'monthly' : 'quarterly')
                }
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Switch to {periodType === 'quarterly' ? 'Monthly' : 'Quarterly'}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          <p>
            Period: <span className="font-medium">{dateRange.label}</span>
          </p>
          <p>
            {formatDateAustralian(dateRange.startDate)} to{' '}
            {formatDateAustralian(dateRange.endDate)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Matches Business Summary and ATO Lodgment (income ÷ 11 / taxable expenses ÷ 11).
          </p>
          {(cadence === 'FY / Period' || cadence === 'Multi-quarter') && (
            <p className="text-xs text-amber-800 mt-2 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
              FY / multi-quarter Net is a <strong>period book estimate</strong> (Σ 1A − Σ 1B), not
              one annual ATO remittance. ATO bank refunds/payments (e.g. ~$18 Q3 refund) are
              settlement cash — outside this Net. Use BAS quarter for lodgment amounts.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">GST Collected (1A)</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(gstCollected)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Taxable sales ÷ 11</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold">GST Paid (1B)</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(gstPaid)}</p>
          <p className="text-sm text-gray-500 mt-1">Claimable purchases ÷ 11</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Receipt
              className={`w-5 h-5 ${gstRefund ? 'text-blue-600' : 'text-purple-600'}`}
            />
            <h3 className="text-lg font-semibold">GST Net</h3>
          </div>
          <p
            className={`text-3xl font-bold ${gstRefund ? 'text-blue-600' : 'text-purple-600'}`}
          >
            {formatCurrency(Math.abs(gstNet))}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {gstRefund ? 'Refund (7C)' : 'Payable (1C)'}
          </p>
        </div>

        <div className="card flex flex-col justify-center">
          <button
            type="button"
            onClick={handleExportBAS}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Download className="w-5 h-5" />
            <span>Export BAS Report</span>
          </button>
        </div>
      </div>

      {quarterSlices.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            BAS quarter breakdown (explains FY totals)
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Each row is that quarter&apos;s 1A / 1B estimate. Sum of 1B across quarters matches FY
            1B — it is <em>not</em> “ATO refund cash + last quarter”.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4 font-medium">Quarter</th>
                  <th className="py-2 pr-4 font-medium">1A</th>
                  <th className="py-2 pr-4 font-medium">1B</th>
                  <th className="py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {quarterSlices.map((slice) => {
                  const net =
                    Math.round((slice.gstPayable - slice.gstClaimable) * 100) / 100
                  return (
                    <tr
                      key={`${slice.financialYear}-Q${slice.quarter}`}
                      className="border-b border-gray-100"
                    >
                      <td className="py-2 pr-4">{slice.label}</td>
                      <td className="py-2 pr-4">{formatCurrency(slice.gstPayable)}</td>
                      <td className="py-2 pr-4">{formatCurrency(slice.gstClaimable)}</td>
                      <td className="py-2">
                        {formatCurrency(Math.abs(net))}{' '}
                        <span className="text-xs text-gray-500">
                          {net >= 0 ? 'payable' : 'refund'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Printer,
  Calendar,
  Scale,
  Landmark,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { ReportFooter } from './ReportFooter'
import {
  computeBalanceSheetFromStorage,
  type BalanceSheetResult,
} from '@/lib/utils/balance-sheet'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  getCurrentAustralianQuarter,
  getAustralianFinancialYear,
} from '@/lib/utils/australian-financial-year'

interface Transaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
  balance?: number | null
}

interface BalanceSheetViewProps {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  accountType?: 'individual' | 'company' | 'sole_trader'
}

type AsAtPreset = 'today' | 'quarter' | 'year' | 'custom'

function LineRow({
  label,
  amount,
  indent = false,
  bold = false,
  className = '',
}: {
  label: string
  amount: number
  indent?: boolean
  bold?: boolean
  className?: string
}) {
  return (
    <div
      className={`flex justify-between py-2 border-b border-gray-100 ${
        indent ? 'pl-4' : ''
      } ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'} ${className}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount)}</span>
    </div>
  )
}

export function BalanceSheetView({
  transactions,
  openingDirectorLoanBalance,
  accountType = 'company',
}: BalanceSheetViewProps) {
  const [preset, setPreset] = useState<AsAtPreset>('today')
  const [customDate, setCustomDate] = useState('')
  const [openingCapital, setOpeningCapital] = useState(0)
  const [openingRetainedEarnings, setOpeningRetainedEarnings] = useState(0)
  const [openingCashBalance, setOpeningCashBalance] = useState(0)
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const asAtDate = useMemo(() => {
    if (preset === 'custom' && customDate) return customDate
    if (preset === 'quarter') {
      return getCurrentAustralianQuarter().endDateStr
    }
    if (preset === 'year') {
      const now = new Date()
      const fy = getAustralianFinancialYear(now)
      const [, endYear] = fy.split('-').map(Number)
      return `${endYear}-06-30`
    }
    return new Date().toISOString().split('T')[0]
  }, [preset, customDate])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        setOpeningCapital(profile?.openingCapital ?? 0)
        setOpeningRetainedEarnings(profile?.openingRetainedEarnings ?? 0)
        setOpeningCashBalance(profile?.openingCashBalance ?? 0)
      } catch {
        // keep defaults
      }
    }
    loadProfile()

    const onProfileUpdate = () => loadProfile()
    window.addEventListener('businessProfileUpdated', onProfileUpdate)
    return () => window.removeEventListener('businessProfileUpdated', onProfileUpdate)
  }, [])

  useEffect(() => {
    let cancelled = false

    const compute = async () => {
      setIsLoading(true)
      try {
        const result = await computeBalanceSheetFromStorage({
          transactions,
          openingDirectorLoanBalance,
          openingCapital,
          openingRetainedEarnings,
          openingCashBalance,
          asAtDate,
          accountType,
        })
        if (!cancelled) setBalanceSheet(result)
      } catch (err) {
        console.error('[BalanceSheet] compute failed:', err)
        if (!cancelled) setBalanceSheet(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    compute()
    return () => {
      cancelled = true
    }
  }, [
    transactions,
    openingDirectorLoanBalance,
    openingCapital,
    openingRetainedEarnings,
    openingCashBalance,
    asAtDate,
    accountType,
  ])

  const handlePrint = () => window.print()

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Balance Sheet</title></head>
        <body>${document.getElementById('balance-sheet-content')?.innerHTML || ''}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const bs = balanceSheet

  return (
    <div id="balance-sheet-content" className="space-y-6 print:space-y-4">
      <div className="no-print flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-8 h-8 text-indigo-600" />
            Balance Sheet
          </h2>
          {bs && (
            <p className="text-gray-600 mt-1">
              As at {formatDateAustralian(bs.asAtDate)}
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

      <div className="no-print card">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">As at:</span>
          </label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as AsAtPreset)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="quarter">End of Current Quarter</option>
            <option value="year">End of Financial Year (30 Jun)</option>
            <option value="custom">Custom Date</option>
          </select>
          {preset === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Opening balances (capital, retained earnings, cash) are configured in Settings → Business Profile.
        </p>
      </div>

      {isLoading && (
        <div className="card text-center py-8 text-gray-500">Calculating balance sheet…</div>
      )}

      {!isLoading && bs && (
        <>
          <div
            className={`no-print card flex items-center gap-3 ${
              bs.isBalanced
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            {bs.isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div className="text-sm">
              {bs.isBalanced ? (
                <span className="text-green-800 font-medium">
                  Assets equal Liabilities + Equity
                </span>
              ) : (
                <span className="text-amber-800">
                  <strong>Out of balance by {formatCurrency(Math.abs(bs.balanceDifference))}.</strong>{' '}
                  Check opening balances in Business Profile or review uncategorised transactions.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600" />
                Assets
              </h3>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Current Assets
              </p>
              <LineRow label="Cash & Bank" amount={bs.assets.cashAndBank} indent />
              <LineRow label="Accounts Receivable" amount={bs.assets.accountsReceivable} indent />
              {bs.assets.directorsLoanReceivable > 0 && (
                <LineRow
                  label="Director's Loan Receivable"
                  amount={bs.assets.directorsLoanReceivable}
                  indent
                />
              )}
              <LineRow
                label="Total Current Assets"
                amount={bs.assets.totalCurrentAssets}
                bold
                className="border-t border-gray-200 mt-1"
              />

              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 mt-6">
                Fixed Assets
              </p>
              <LineRow label="Gross Fixed Assets" amount={bs.assets.grossFixedAssets} indent />
              <LineRow
                label="Less: Accumulated Depreciation"
                amount={-bs.assets.accumulatedDepreciation}
                indent
              />
              <LineRow label="Net Fixed Assets" amount={bs.assets.netFixedAssets} indent bold />
              <LineRow
                label="Total Assets"
                amount={bs.assets.totalAssets}
                bold
                className="border-t-2 border-gray-300 mt-2 text-lg"
              />
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-purple-600" />
                Liabilities & Equity
              </h3>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Current Liabilities
              </p>
              <LineRow label="Director's Loan" amount={bs.liabilities.directorsLoan} indent />
              {bs.liabilities.gstPayableOutstanding > 0 && (
                <LineRow
                  label={
                    bs.liabilities.gstLatestQuarterLabel
                      ? `GST Payable (${bs.liabilities.gstLatestQuarterLabel} due)`
                      : 'GST Payable (latest BAS due)'
                  }
                  amount={bs.liabilities.gstPayableOutstanding}
                  indent
                />
              )}
              {bs.liabilities.gstPayable > 0 && bs.liabilities.gstPayableOutstanding <= 0 && (
                <LineRow label="GST Payable" amount={bs.liabilities.gstPayable} indent />
              )}
              {bs.liabilities.paygWithholding > 0 && (
                <LineRow label="PAYG Withholding Payable" amount={bs.liabilities.paygWithholding} indent />
              )}
              <LineRow
                label="Total Liabilities"
                amount={bs.liabilities.totalLiabilities}
                bold
                className="border-t border-gray-200 mt-1"
              />

              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 mt-6">
                Equity
              </p>
              <LineRow label="Opening Capital" amount={bs.equity.openingCapital} indent />
              {bs.equity.shareCapital > 0 && (
                <LineRow label="Share Capital" amount={bs.equity.shareCapital} indent />
              )}
              <LineRow
                label="Opening Retained Earnings"
                amount={bs.equity.openingRetainedEarnings}
                indent
              />
              <LineRow
                label="Current Period Profit / (Loss) (ex GST / CTR)"
                amount={bs.equity.currentPeriodProfit}
                indent
              />
              {bs.equity.atoGstRefundRounding > 0.005 && (
                <LineRow
                  label="Less: ATO GST refund rounding (BAS est. − banked)"
                  amount={-bs.equity.atoGstRefundRounding}
                  indent
                />
              )}
              <LineRow
                label="Total Retained Earnings (ex GST / CTR)"
                amount={bs.equity.retainedEarnings}
                indent
              />
              <LineRow
                label="Total Equity"
                amount={bs.equity.totalEquity}
                bold
                className="border-t border-gray-200 mt-1"
              />
              <LineRow
                label="Total Liabilities & Equity"
                amount={bs.totalLiabilitiesAndEquity}
                bold
                className="border-t-2 border-gray-300 mt-2 text-lg"
              />
              {(Math.abs(
                bs.equity.currentPeriodProfitCash - bs.equity.currentPeriodProfit
              ) >= 0.01 ||
                bs.liabilities.atoGstRefundInCash > 0 ||
                bs.equity.atoGstRefundRounding > 0.005) && (
                <div className="mt-3 pl-4 text-xs text-gray-500 space-y-1 border-t border-dashed border-gray-200 pt-2">
                  <p className="font-medium text-gray-600">Reference (not in totals)</p>
                  {Math.abs(
                    bs.equity.currentPeriodProfitCash - bs.equity.currentPeriodProfit
                  ) >= 0.01 && (
                    <>
                      <p>
                        Cash / GST-incl. period profit:{' '}
                        {formatCurrency(bs.equity.currentPeriodProfitCash)} (Biz Intel /
                        bank). CTR uses ex-GST above so GST Payable is not double-counted in
                        equity.
                      </p>
                      <p>
                        Bridge (cash - CTR ~ period 1A - 1B):{' '}
                        {formatCurrency(
                          bs.equity.currentPeriodProfitCash -
                            bs.equity.currentPeriodProfit
                        )}
                      </p>
                    </>
                  )}
                  {bs.liabilities.atoGstRefundInCash > 0 && (
                    <p>
                      ATO GST refund of {formatCurrency(bs.liabilities.atoGstRefundInCash)}{' '}
                      is in Cash &amp; Bank (accountant-rounded / ATO banked; not deducted
                      from GST payable).
                    </p>
                  )}
                  {bs.equity.atoGstRefundRounding > 0.005 && (
                    <p>
                      ATO refund rounding of{' '}
                      {formatCurrency(bs.equity.atoGstRefundRounding)} (BAS estimate vs
                      banked) is deducted from Total RE so the sheet balances.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ReportFooter />

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

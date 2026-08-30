'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Printer,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { ReportFooter } from './ReportFooter'
import {
  computeTrialBalanceFromStorage,
  type TrialBalanceAccountType,
  type TrialBalanceResult,
} from '@/lib/utils/trial-balance'
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

interface TrialBalanceViewProps {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  accountType?: 'individual' | 'company' | 'sole_trader'
  /**
   * Reporting FY / statement as-at (e.g. 2026-06-30).
   * Used for default and "End of Financial Year" — not calendar-today's FY end
   * (which can be a future empty date like 2027-06-30).
   */
  asAtDate?: string
}

type AsAtPreset = 'today' | 'quarter' | 'year' | 'custom'

const TYPE_BADGE: Record<TrialBalanceAccountType, string> = {
  Asset: 'bg-blue-100 text-blue-800',
  Liability: 'bg-purple-100 text-purple-800',
  Equity: 'bg-indigo-100 text-indigo-800',
  Revenue: 'bg-green-100 text-green-800',
  Expense: 'bg-red-100 text-red-800',
}

function latestTransactionIso(transactions: Transaction[]): string | null {
  let latest: string | null = null
  for (const tx of transactions) {
    const d = String(tx.date || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue
    if (!latest || d > latest) latest = d
  }
  return latest
}

function financialYearEndForIso(isoDate: string): string {
  const fy = getAustralianFinancialYear(new Date(`${isoDate}T12:00:00`))
  const endYear = Number(fy.split('-')[1])
  return `${endYear}-06-30`
}

export function TrialBalanceView({
  transactions,
  openingDirectorLoanBalance,
  accountType = 'company',
  asAtDate: reportingAsAt,
}: TrialBalanceViewProps) {
  const [preset, setPreset] = useState<AsAtPreset>(reportingAsAt ? 'year' : 'today')
  const [customDate, setCustomDate] = useState(reportingAsAt || '')
  const [openingCapital, setOpeningCapital] = useState(0)
  const [openingRetainedEarnings, setOpeningRetainedEarnings] = useState(0)
  const [openingCashBalance, setOpeningCashBalance] = useState(0)
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const asAtDate = useMemo(() => {
    if (preset === 'custom' && customDate) return customDate
    if (preset === 'quarter') {
      return getCurrentAustralianQuarter().endDateStr
    }
    if (preset === 'year') {
      // Prefer Reports FY end; else FY containing latest ledger date; else calendar FY end
      if (reportingAsAt && /^\d{4}-\d{2}-\d{2}$/.test(reportingAsAt)) {
        return reportingAsAt
      }
      const latest = latestTransactionIso(transactions)
      if (latest) return financialYearEndForIso(latest)
      const now = new Date()
      const fy = getAustralianFinancialYear(now)
      const endYear = Number(fy.split('-')[1])
      return `${endYear}-06-30`
    }
    return new Date().toISOString().split('T')[0]
  }, [preset, customDate, reportingAsAt, transactions])

  const asAtNote = useMemo(() => {
    const latest = latestTransactionIso(transactions)
    if (!latest || !asAtDate) return null
    if (asAtDate >= latest) {
      return `All ledger activity is on or before ${latest}. Changing As at to any later date (including ${asAtDate}) keeps the same Trial Balance totals.`
    }
    return null
  }, [transactions, asAtDate])

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
        const result = await computeTrialBalanceFromStorage({
          transactions,
          openingDirectorLoanBalance,
          openingCapital,
          openingRetainedEarnings,
          openingCashBalance,
          asAtDate,
          accountType,
        })
        if (!cancelled) setTrialBalance(result)
      } catch (err) {
        console.error('[TrialBalance] compute failed:', err)
        if (!cancelled) setTrialBalance(null)
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
        <head><title>Trial Balance</title></head>
        <body>${document.getElementById('trial-balance-content')?.innerHTML || ''}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const tb = trialBalance

  return (
    <div id="trial-balance-content" className="space-y-6 print:space-y-4">
      <div className="no-print flex items-center justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-teal-600" />
            Trial Balance
          </h2>
          {tb && (
            <p className="text-gray-600 mt-1">
              As at {formatDateAustralian(tb.asAtDate)}
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
          Combines balance sheet accounts with revenue and expense categories. Opening balances
          are configured in Settings → Business Profile. As at includes all transactions on or
          before that date (not only one month).
        </p>
        {asAtNote && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-2">
            {asAtNote}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="card text-center py-8 text-gray-500">Calculating trial balance…</div>
      )}

      {!isLoading && tb && (
        <>
          <div
            className={`no-print card flex items-center gap-3 ${
              tb.isBalanced
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            {tb.isBalanced ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div className="text-sm">
              {tb.isBalanced ? (
                <span className="text-green-800 font-medium">
                  Total debits equal total credits ({formatCurrency(tb.totalDebit)})
                </span>
              ) : (
                <span className="text-amber-800">
                  <strong>
                    Out of balance by {formatCurrency(Math.abs(tb.balanceDifference))}.
                  </strong>{' '}
                  Review uncategorised transactions or opening balances in Business Profile.
                </span>
              )}
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 text-left">
                  <th className="py-3 pr-4 font-semibold text-gray-900">Account</th>
                  <th className="py-3 pr-4 font-semibold text-gray-900">Type</th>
                  <th className="py-3 pr-4 font-semibold text-gray-900 text-right">Debit</th>
                  <th className="py-3 font-semibold text-gray-900 text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((row) => (
                  <tr key={`${row.type}-${row.account}`} className="border-b border-gray-100">
                    <td className="py-2.5 pr-4 text-gray-800">{row.account}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[row.type]}`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-gray-900">
                      {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-900">
                      {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
                  <td className="py-3 pr-4" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(tb.totalDebit)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCurrency(tb.totalCredit)}
                  </td>
                </tr>
              </tbody>
            </table>
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

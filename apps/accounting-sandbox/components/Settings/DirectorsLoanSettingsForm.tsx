'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils/currency-format'
import {
  loadDirectorLoanAdvanceSettings,
  saveDirectorLoanAdvanceSettings,
  sumDirectorReimbursementDebits,
} from '@/lib/classification/directors-loan-balance'

interface DirectorsLoanSettingsFormProps {
  openingDirectorLoanBalance: number
  onOpeningBalanceChange: (value: number) => void
  priorPeriodDirectorAdvances: number
  onPriorAdvancesChange: (value: number) => void
  autoMatchPriorAdvances: boolean
  onAutoMatchPriorAdvancesChange: (value: boolean) => void
  /** Current-period reimbursement total (for guidance only) */
  reimbursementTotalHint?: number
  transactions?: Array<{ debit?: number | null; category?: string }>
}

/**
 * Manual balance-sheet inputs for amounts that are NOT on the current bank statement.
 * Used for year-end / Balance Sheet / Director's Loan ledger.
 */
export function DirectorsLoanSettingsForm({
  openingDirectorLoanBalance,
  onOpeningBalanceChange,
  priorPeriodDirectorAdvances,
  onPriorAdvancesChange,
  autoMatchPriorAdvances,
  onAutoMatchPriorAdvancesChange,
  reimbursementTotalHint,
  transactions = [],
}: DirectorsLoanSettingsFormProps) {
  const [openingDraft, setOpeningDraft] = useState(openingDirectorLoanBalance.toString())
  const [priorDraft, setPriorDraft] = useState(priorPeriodDirectorAdvances.toString())

  useEffect(() => {
    setOpeningDraft(openingDirectorLoanBalance.toString())
  }, [openingDirectorLoanBalance])

  useEffect(() => {
    setPriorDraft(priorPeriodDirectorAdvances.toString())
  }, [priorPeriodDirectorAdvances])

  const reimbursementHint =
    reimbursementTotalHint ?? sumDirectorReimbursementDebits(transactions)

  const handleSaveOpening = () => {
    const value = parseFloat(openingDraft)
    if (!isNaN(value)) onOpeningBalanceChange(value)
  }

  const handleSavePrior = () => {
    const value = parseFloat(priorDraft)
    if (!isNaN(value) && value >= 0) {
      onPriorAdvancesChange(value)
      saveDirectorLoanAdvanceSettings(value, autoMatchPriorAdvances)
    }
  }

  const handleAutoMatchToggle = (checked: boolean) => {
    onAutoMatchPriorAdvancesChange(checked)
    const settings = loadDirectorLoanAdvanceSettings()
    saveDirectorLoanAdvanceSettings(settings.manualPriorAdvances, checked)
  }

  const handleUseReimbursementTotal = () => {
    const amount = Math.round(reimbursementHint * 100) / 100
    setPriorDraft(amount.toString())
    onPriorAdvancesChange(amount)
    onAutoMatchPriorAdvancesChange(false)
    saveDirectorLoanAdvanceSettings(amount, false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Director&apos;s Loan &amp; Balance Sheet</h2>
        <p className="text-sm text-gray-600">
          Enter amounts that are <strong>not on the current bank statement</strong> so year-end
          reports and the Balance Sheet stay correct for any company.
        </p>
      </div>

      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-900 space-y-2">
        <p className="font-medium">How the balance is calculated</p>
        <ul className="list-disc list-inside space-y-1 text-indigo-800">
          <li>
            <strong>Opening (cash loan)</strong> — amount the company already owed the director at
            period start (or director owed company if negative).
          </li>
          <li>
            <strong>Prior advances (lodged)</strong> — business costs the director paid personally
            in a <em>prior</em> period, already reported to your accountant, but not yet repaid from
            the company bank. These increase &quot;Company owes Director&quot;.
          </li>
          <li>
            Bank credits classified as <strong>Director&apos;s Loan</strong> increase the balance.
          </li>
          <li>
            Bank debits classified as <strong>Director Reimbursement (Prior Period)</strong> reduce
            the balance (repaying those advances). They are excluded from P&amp;L and GST.
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opening Director&apos;s Loan Balance
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Positive = Company owes Director. Negative = Director owes Company.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={openingDraft}
              onChange={(e) => setOpeningDraft(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              type="button"
              onClick={handleSaveOpening}
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current: {formatCurrency(openingDirectorLoanBalance)}
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prior Period Advances (Lodged)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Manual total of director personal spend already lodged with the accountant, waiting for
            company reimbursement. Not on this statement.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={priorDraft}
              onChange={(e) => setPriorDraft(e.target.value)}
              disabled={autoMatchPriorAdvances}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={handleSavePrior}
              disabled={autoMatchPriorAdvances}
              className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Applied: {formatCurrency(priorPeriodDirectorAdvances)}
          </p>
          {reimbursementHint > 0 && (
            <button
              type="button"
              onClick={handleUseReimbursementTotal}
              className="mt-2 text-xs text-indigo-700 underline hover:text-indigo-900"
            >
              Fill from current reimbursements ({formatCurrency(reimbursementHint)})
            </button>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={autoMatchPriorAdvances}
          onChange={(e) => handleAutoMatchToggle(e.target.checked)}
        />
        <span className="text-sm text-gray-700">
          <strong>Auto-match prior advances to bank reimbursements</strong>
          <span className="block text-xs text-gray-500 mt-1">
            Off by default for other companies. Turn on only when every{' '}
            <em>Director Reimbursement (Prior Period)</em> debit on the statement settles a matching
            prior advance (same total). Prefer entering the accountant&apos;s figure manually.
          </span>
        </span>
      </label>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
        <strong>Year-end tip:</strong> Set Opening and Prior Advances from your accountant&apos;s
        prior BAS/CTR pack before locking the financial year. Then classify bank repayments as{' '}
        <em>Director Reimbursement (Prior Period)</em>. Balance Sheet and Director&apos;s Loan
        reports will include these amounts; P&amp;L and GST will not.
      </div>
    </div>
  )
}

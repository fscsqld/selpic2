'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Receipt,
  DollarSign,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Lock,
} from 'lucide-react'
import { strings } from '@/lib/i18n/strings'
import { UserJourneyProgress } from '@/components/Onboarding/UserJourneyProgress'
import { FyStartBanner } from '@/components/Onboarding/FyStartBanner'
import { PaymentSummaryForm } from '@/components/Individual/PaymentSummaryForm'
import { IndividualJourneyOptions } from '@/components/Individual/IndividualJourneyOptions'
import type { ClassificationMode } from '@/lib/journey/journey-preferences'
import { BusinessSummaryCards } from '@/components/BusinessSummaryCards'
import { ExpenseCharts } from '@/components/ExpenseCharts'
import { RealTimePLView } from '@/components/RealTimePLView'
import { TaxProvision } from '@/components/TaxProvision'
import { AssetManagement } from '@/components/AssetManagement'
import { TaxDeadlineTracker } from '@/components/TaxDeadlineTracker'
import { GSTSummary } from '@/components/GSTSummary'
import { FBTMonitor } from '@/components/FBTMonitor'
import { CompliancePackageExporter } from '@/components/ComplianceReporting/CompliancePackageExporter'
import { TransactionTable } from '@/components/TransactionTable'
import { CashExpenseForm } from '@/components/CashExpenseForm'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { CASH_EXPENSE_CATEGORIES } from '@/lib/dashboard/categories'
import { getCashExpenseCategoryLabel } from '@/lib/dashboard/cash-expense-category-labels'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'
import type { JourneyNavigateTarget } from '@/lib/journey/types'
import type { FinancialPeriod } from '@/lib/storage/period-types'
import { TRANSACTION_HISTORY_EXPAND_EVENT, getDistinctPeriodIdsFromTransactions } from '@/lib/dashboard/transaction-history-ui'
import { filterTransactionsForPeriod } from '@/lib/period-management/period-lock'
import { DashboardPeriodSelector } from '@/components/Dashboard/DashboardPeriodSelector'
import type { DashboardViewPeriod } from '@/lib/dashboard/view-period-range'
import { filterTransactionsForDateRange, formatViewPeriodLabel } from '@/lib/dashboard/view-period-range'
import { formatCurrency } from '@/lib/utils/currency-format'
import { isDirectorsLoanLedgerTransaction } from '@/lib/classification/directors-loan-ledger'
import { sumDirectorFundedCashDebits } from '@/lib/cash-expense/funded-by-director'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

export interface BizIntelTabPanelProps {
  error: string | null
  onClearError: () => void
  accountType: 'individual' | 'company' | 'sole_trader'
  transactions: ClassifiedTransaction[]
  dashboardTransactions: ClassifiedTransaction[]
  journeyFinancialYear: string
  profileComplete: boolean
  uncategorisedCount: number
  paymentSummaryCount: number
  skipPaymentSummary: boolean
  gstRegistered: boolean
  hasReviewedReports: boolean
  allPeriodsLocked: boolean
  hasLodgmentSnapshot: boolean
  onJourneyNavigate: (target: JourneyNavigateTarget) => void
  viewPeriodId: string | null
  viewPeriod: DashboardViewPeriod
  viewingPeriod?: FinancialPeriod | null
  lockedPeriodIds: Set<string>
  totalIncome: number
  totalExpenses: number
  netProfit: number
  gstPayable: number
  gstClaimable: number
  directorsLoanBalance: number
  personalSpendingNonDeductible: number
  openingDirectorLoanBalance: number
  metricsOpeningDirectorLoan: number
  effectivePriorPeriodAdvances: number
  directorLoanReimbursementTotal: number
  directorLoanInjectionTotal: number
  autoMatchPriorAdvances: boolean
  onPriorAdvancesChange: (value: number) => void
  onAutoMatchPriorAdvancesChange: (value: boolean) => void
  onOpeningBalanceChange: (value: number) => void
  companyInfo: { name: string; abn?: string; acn?: string }
  sessionApiCost: number
  appendMode: boolean
  onAppendModeChange: (value: boolean) => void
  isProcessing: boolean
  processingStage: string
  apiKey: string
  userApiKey: string
  classificationMode: ClassificationMode
  onClassificationModeChange: (mode: ClassificationMode) => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onExportExcel: (businessOnly: boolean) => void | Promise<void>
  onExportSummary: () => void | Promise<void>
  onExportBAS: () => void | Promise<void>
  onTransactionUpdate: (id: string, updates: Partial<ClassifiedTransaction>) => Promise<void>
  onSwitchViewPeriodToData?: () => void
  onChangeViewPeriod?: (period: DashboardViewPeriod) => void
  onCashExpenseSave: (expense: {
    date: string
    amount: number
    merchant: string
    category: string
    receiptImageId?: string
    department?: string
    description?: string
    source: 'manual'
    claimAuGst?: boolean
  }) => Promise<void>
  onCashExpenseDelete?: (cashExpenseId: string) => Promise<void>
  /** Active upload/load statement rows — Transaction History defaults to these */
  activeStatementSnapshot?: {
    statementId: string
    fileName: string
    period: { startDate: string; endDate: string }
    transactions: ClassifiedTransaction[]
  } | null
  /** Same repaired ledger rows used by P&L (OCR dates normalised) */
  activeLedgerTransactions?: ClassifiedTransaction[]
  /** P&L / GST cards use the uploaded statement only */
  isStatementLedgerScope?: boolean
  /** FY window for Tax Provision (not the P&L quarter filter) */
  reportsFyRange?: { startDate: string; endDate: string; label?: string } | null
}

export function BizIntelTabPanel({
  error,
  onClearError,
  accountType,
  transactions,
  dashboardTransactions,
  journeyFinancialYear,
  profileComplete,
  uncategorisedCount,
  paymentSummaryCount,
  skipPaymentSummary,
  gstRegistered,
  hasReviewedReports,
  allPeriodsLocked,
  hasLodgmentSnapshot,
  onJourneyNavigate,
  viewPeriodId,
  viewPeriod,
  viewingPeriod,
  lockedPeriodIds,
  totalIncome,
  totalExpenses,
  netProfit,
  gstPayable,
  gstClaimable,
  directorsLoanBalance,
  personalSpendingNonDeductible,
  openingDirectorLoanBalance,
  metricsOpeningDirectorLoan,
  effectivePriorPeriodAdvances,
  directorLoanReimbursementTotal,
  directorLoanInjectionTotal,
  autoMatchPriorAdvances,
  onPriorAdvancesChange,
  onAutoMatchPriorAdvancesChange,
  onOpeningBalanceChange,
  companyInfo,
  sessionApiCost,
  appendMode,
  onAppendModeChange,
  isProcessing,
  processingStage,
  apiKey,
  userApiKey,
  classificationMode,
  onClassificationModeChange,
  onFileUpload,
  onExportExcel,
  onExportSummary,
  onExportBAS,
  onTransactionUpdate,
  onSwitchViewPeriodToData,
  onChangeViewPeriod,
  onCashExpenseSave,
  onCashExpenseDelete,
  activeStatementSnapshot = null,
  activeLedgerTransactions,
  isStatementLedgerScope = false,
  reportsFyRange = null,
}: BizIntelTabPanelProps) {
  const [showCashExpenseForm, setShowCashExpenseForm] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null)
  const [showDirectorsLoanFilter, setShowDirectorsLoanFilter] = useState(false)
  /** Prefer the last uploaded/loaded statement; user can switch to full History */
  const [historyScope, setHistoryScope] = useState<'statement' | 'all_history'>('statement')
  /** Default: same date window as P&L banner (not the full statement / all months) */
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>('pl_period')
  const [isTransactionHistoryExpanded, setIsTransactionHistoryExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('transactionHistory_expanded')
      if (saved === null) return true
      return saved === 'true'
    }
    return true
  })

  useEffect(() => {
    const onExpand = () => setIsTransactionHistoryExpanded(true)
    window.addEventListener(TRANSACTION_HISTORY_EXPAND_EVENT, onExpand)
    return () => window.removeEventListener(TRANSACTION_HISTORY_EXPAND_EVENT, onExpand)
  }, [])

  // When a new statement is uploaded/loaded, snap History back to that file
  useEffect(() => {
    if (activeStatementSnapshot?.statementId) {
      setHistoryScope('statement')
    }
  }, [activeStatementSnapshot?.statementId])

  const handleViewDirectorsLoanDetails = (show: boolean) => {
    setShowDirectorsLoanFilter(show)
    if (show) {
      setIsTransactionHistoryExpanded(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('transactionHistory_expanded', 'true')
        window.dispatchEvent(new Event(TRANSACTION_HISTORY_EXPAND_EVENT))
        requestAnimationFrame(() => {
          document.getElementById('transaction-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }

  const [showUncategorisedOnly, setShowUncategorisedOnly] = useState(false)
  const rulesOnly = classificationMode === 'rules_only'
  const canUpload = !isProcessing && (rulesOnly || !!(userApiKey || apiKey))

  const hasActiveStatement =
    !!activeStatementSnapshot && activeStatementSnapshot.transactions.length > 0
  const useStatementScope = hasActiveStatement && historyScope === 'statement'

  const scopedLedgerTransactions = useMemo(() => {
    if (!useStatementScope || !activeStatementSnapshot) return transactions
    // Prefer repaired ledger (same as P&L) so History dates match summary panels
    if (activeLedgerTransactions && activeLedgerTransactions.length > 0) {
      return activeLedgerTransactions
    }
    return activeStatementSnapshot.transactions
  }, [
    useStatementScope,
    activeStatementSnapshot,
    activeLedgerTransactions,
    transactions,
  ])

  const availablePeriodIds = useMemo(
    () => getDistinctPeriodIdsFromTransactions(scopedLedgerTransactions),
    [scopedLedgerTransactions]
  )

  const historyTransactions = useMemo(() => {
    if (accountType === 'individual') {
      return scopedLedgerTransactions
    }
    // Match P&L banner From/To (e.g. Q3 Jan–Mar → 13 txs, not 64)
    if (historyMonthFilter === 'pl_period') {
      return filterTransactionsForDateRange(
        scopedLedgerTransactions,
        viewPeriod.startDate,
        viewPeriod.endDate
      )
    }
    if (historyMonthFilter === 'all') {
      return scopedLedgerTransactions
    }
    return filterTransactionsForPeriod(scopedLedgerTransactions, historyMonthFilter)
  }, [
    scopedLedgerTransactions,
    historyMonthFilter,
    accountType,
    viewPeriod.startDate,
    viewPeriod.endDate,
  ])

  const taxProvisionTransactions = useMemo(() => {
    // Company tax estimate must use the full ledger (bank + cash/manual), not the
    // active statement bank-only scope — otherwise Cash Expenses vanish from FY TI.
    const ledger = transactions.length > 0 ? transactions : activeLedgerTransactions || []
    if (reportsFyRange?.startDate && reportsFyRange?.endDate) {
      return filterTransactionsForDateRange(
        ledger,
        reportsFyRange.startDate,
        reportsFyRange.endDate
      )
    }
    return ledger
  }, [transactions, activeLedgerTransactions, reportsFyRange])

  const payrollJournalCountInFullLedger = useMemo(
    () => transactions.filter((tx) => tx.isPayrollTransaction || tx.source === 'payroll').length,
    [transactions]
  )

  const visibleHistoryTransactions = useMemo(
    () => historyTransactions.filter((tx) => !tx.isPayrollTransaction && tx.source !== 'payroll'),
    [historyTransactions]
  )

  const historyBadgeCount = visibleHistoryTransactions.length
  const fullLedgerBankCount = useMemo(
    () => transactions.filter((tx) => !tx.isPayrollTransaction && tx.source !== 'payroll').length,
    [transactions]
  )
  const scopedBankCount = useMemo(
    () =>
      scopedLedgerTransactions.filter((tx) => !tx.isPayrollTransaction && tx.source !== 'payroll')
        .length,
    [scopedLedgerTransactions]
  )

  return (
    <>
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button
                onClick={() => onClearError()}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          )}

          <UserJourneyProgress
            accountType={accountType}
            profileComplete={profileComplete}
            transactionCount={transactions.length}
            uncategorisedCount={uncategorisedCount}
            paymentSummaryCount={paymentSummaryCount}
            skipPaymentSummary={skipPaymentSummary}
            gstRegistered={gstRegistered}
            hasReviewedReports={hasReviewedReports}
            allPeriodsLocked={allPeriodsLocked}
            hasLodgmentSnapshot={hasLodgmentSnapshot}
            onNavigate={onJourneyNavigate}
          />

          <FyStartBanner
            accountType={accountType}
            gstRegistered={gstRegistered}
            onNavigate={onJourneyNavigate}
          />

          {uncategorisedCount > 0 && transactions.length > 0 && (
            <div className="card mb-6 border-amber-300 bg-amber-50">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-amber-900">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {uncategorisedCount} uncategorised transaction
                      {uncategorisedCount === 1 ? '' : 's'} — lodging blocked
                    </p>
                    <p className="text-sm mt-1">
                      Categorise every transaction below before copying values into the ATO portal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUncategorisedOnly(true)
                    setIsTransactionHistoryExpanded(true)
                    document.getElementById('transaction-history-section')?.scrollIntoView({
                      behavior: 'smooth',
                    })
                  }}
                  className="px-4 py-2 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700"
                >
                  Review uncategorised
                </button>
              </div>
            </div>
          )}

          {uncategorisedCount === 0 &&
            transactions.length > 0 &&
            !hasLodgmentSnapshot &&
            hasReviewedReports && (
              <div className="card mb-6 border-green-200 bg-green-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">
                      All transactions categorised — ready for ATO portal entry
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJourneyNavigate('ato')}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                  >
                    Open ATO Lodgment
                  </button>
                </div>
              </div>
            )}

          {accountType === 'individual' && (
            <>
              <IndividualJourneyOptions />
              {!skipPaymentSummary && (
                <PaymentSummaryForm financialYear={journeyFinancialYear} />
              )}
            </>
          )}

          {isStatementLedgerScope && activeStatementSnapshot && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
              P&amp;L / GST figures use <strong>{activeStatementSnapshot.fileName}</strong> intersected
          with the banner period ({dashboardTransactions.length} rows after date repair). History /
          payroll outside this upload are excluded. Mis-parsed years (e.g. 267→2026) are corrected
          so totals match BAS Q4.
            </div>
          )}

          {/* Individual User: Simple Summary */}
          {accountType === 'individual' && transactions.length > 0 && (
            <>
              <BusinessSummaryCards
                totalIncome={totalIncome || 0}
                totalExpenses={totalExpenses || 0}
                netProfit={netProfit || 0}
                gstPayable={0}
                gstClaimable={0}
                directorsLoanBalance={directorsLoanBalance || 0}
                personalSpendingNonDeductible={personalSpendingNonDeductible || 0}
                openingDirectorLoanBalance={openingDirectorLoanBalance}
                priorPeriodDirectorAdvances={effectivePriorPeriodAdvances}
                directorLoanReimbursementTotal={directorLoanReimbursementTotal}
                directorLoanInjectionTotal={directorLoanInjectionTotal}
                autoMatchPriorAdvances={autoMatchPriorAdvances}
                onPriorAdvancesChange={onPriorAdvancesChange}
                onAutoMatchPriorAdvancesChange={onAutoMatchPriorAdvancesChange}
                onOpeningBalanceChange={onOpeningBalanceChange}
                onViewDirectorsLoanDetails={handleViewDirectorsLoanDetails}
                showDirectorsLoanFilter={showDirectorsLoanFilter}
                accountType={accountType}
              />
              
              {/* Expense Charts for Individual Users */}
              <ExpenseCharts
                transactions={dashboardTransactions.map((tx) => ({
                  ...tx,
                  source: tx.source === 'manual' ? 'manual' : 'bank',
                }))}
                onCategoryClick={setSelectedCategoryFilter}
                selectedCategory={selectedCategoryFilter}
                accountType="individual"
              />
            </>
          )}

          {accountType !== 'individual' && onChangeViewPeriod && (
            <DashboardPeriodSelector
              viewPeriod={viewPeriod}
              onChangeViewPeriod={onChangeViewPeriod}
              transactions={
                isStatementLedgerScope && activeLedgerTransactions?.length
                  ? activeLedgerTransactions
                  : transactions
              }
              dashboardTransactionCount={dashboardTransactions.length}
              viewingPeriod={viewingPeriod ?? null}
              lockedPeriodIds={lockedPeriodIds}
            />
          )}

          {/* Company/Sole Trader: Full Business Dashboard */}
          {accountType !== 'individual' && (
            <>
              {/* Real-Time P&L View */}
              {dashboardTransactions.length > 0 && (
                <RealTimePLView 
                  key={`pl-view-${dashboardTransactions.length}-${viewPeriod.startDate}-${viewPeriod.endDate}`}
                  transactions={dashboardTransactions} 
                  periodLabel={formatViewPeriodLabel(viewPeriod)}
                  accountType={accountType}
                  gstRegistered={gstRegistered}
                />
              )}

              {/* Tax Provision */}
              {dashboardTransactions.length > 0 && (
                <TaxProvision
                  transactions={dashboardTransactions}
                  periodLabel={formatViewPeriodLabel(viewPeriod)}
                  periodStart={viewPeriod.startDate}
                  periodEnd={viewPeriod.endDate}
                  gstRegistered={gstRegistered}
                />
              )}

              {/* Expense Charts */}
              {dashboardTransactions.length > 0 && (
                <ExpenseCharts
                  transactions={dashboardTransactions.map((tx) => ({
                    ...tx,
                    source: tx.source === 'manual' ? 'manual' : 'bank',
                  }))}
                  onCategoryClick={setSelectedCategoryFilter}
                  selectedCategory={selectedCategoryFilter}
                  accountType={accountType}
                />
              )}

              {/* Asset Management — same period-scoped ledger as P&L */}
              {dashboardTransactions.length > 0 && (
                <AssetManagement 
                  transactions={dashboardTransactions}
                  onAssetRegistered={(assetId, transactionId) => {
                    console.log('Asset registered:', assetId, 'for transaction:', transactionId)
                  }}
                />
              )}

              {/* Business Summary Dashboard */}
              {dashboardTransactions.length > 0 && (
                <BusinessSummaryCards
                  totalIncome={totalIncome || 0}
                  totalExpenses={totalExpenses || 0}
                  netProfit={netProfit || 0}
                  gstPayable={gstPayable || 0}
                  gstClaimable={gstClaimable || 0}
                  directorsLoanBalance={directorsLoanBalance || 0}
                  personalSpendingNonDeductible={personalSpendingNonDeductible || 0}
                  openingDirectorLoanBalance={openingDirectorLoanBalance}
                  priorPeriodDirectorAdvances={effectivePriorPeriodAdvances}
                  directorLoanReimbursementTotal={directorLoanReimbursementTotal}
                  directorLoanInjectionTotal={directorLoanInjectionTotal}
                  autoMatchPriorAdvances={autoMatchPriorAdvances}
                  onPriorAdvancesChange={onPriorAdvancesChange}
                  onAutoMatchPriorAdvancesChange={onAutoMatchPriorAdvancesChange}
                  onOpeningBalanceChange={onOpeningBalanceChange}
                  onViewDirectorsLoanDetails={handleViewDirectorsLoanDetails}
                  showDirectorsLoanFilter={showDirectorsLoanFilter}
                  accountType={accountType}
                />
              )}

              {/* Tax Deadline Tracker (includes FBT deadlines) */}
              <TaxDeadlineTracker />

              {/* GST Summary — same banner window as P&L (no second BAS re-cut) */}
              {dashboardTransactions.length > 0 && (
                <GSTSummary
                  transactions={dashboardTransactions}
                  viewPeriodId={viewPeriodId}
                  periodStartDate={viewPeriod.startDate}
                  periodEndDate={viewPeriod.endDate}
                  periodLabel={formatViewPeriodLabel(viewPeriod)}
                  accountType={accountType}
                />
              )}

              {/* FBT Monitor */}
              {dashboardTransactions.length > 0 && (
                <FBTMonitor 
                  transactions={dashboardTransactions} 
                  onTransactionUpdate={onTransactionUpdate}
                />
              )}
            </>
          )}

          {/* PDF Upload Section */}
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  {strings.dashboard.uploadStatement}
                </h2>
                {sessionApiCost > 0 && (
                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Est. API Cost for this session: ${sessionApiCost.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCashExpenseForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 border-2 border-green-500 shadow-md"
                title="Add Cash & Petty Cash Expense with AI Vision"
              >
                <Sparkles className="w-4 h-4" />
                Add Cash Expense
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3 -mt-2">
              To remove a Cash Expense: open Transaction History → red trash icon on that row (bank lines cannot be deleted this way).
            </p>
            
            <div className="mb-4">
              <p className="text-gray-700">
                {strings.dashboard.uploadDescription}
              </p>
            </div>
            
            {/* Append Mode Toggle */}
            {transactions.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="append-mode"
                  checked={appendMode}
                  onChange={(e) => onAppendModeChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="append-mode" className="text-sm text-gray-700 cursor-pointer">
                  Append to existing transactions (instead of replacing)
                </label>
              </div>
            )}
            
            {/* Classification mode */}
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm font-medium text-gray-800 mb-2">Import classification</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-start gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name="classification-mode"
                    checked={classificationMode === 'ai'}
                    onChange={() => onClassificationModeChange('ai')}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">AI classification</span>
                    <span className="block text-gray-600 text-xs mt-0.5">
                      Requires OpenAI API key — faster, more accurate
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer flex-1">
                  <input
                    type="radio"
                    name="classification-mode"
                    checked={classificationMode === 'rules_only'}
                    onChange={() => onClassificationModeChange('rules_only')}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">Rules only (no API key)</span>
                    <span className="block text-gray-600 text-xs mt-0.5">
                      CSV or PDF import — you categorise transactions manually after import
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv,.pdf"
                onChange={onFileUpload}
                disabled={!canUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-md ${
                  !canUpload
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } transition-colors`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {processingStage || strings.dashboard.processing}
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    {strings.dashboard.selectPdfFile}
                  </>
                )}
              </label>
              <div className="mt-4">
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        {strings.dashboard.disclaimer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {!(userApiKey || apiKey) && !rulesOnly && (
                <p className="mt-2 text-sm text-red-600">
                  {strings.errors.apiKeyRequired} Or switch to <strong>Rules only</strong> above.
                </p>
              )}
              {rulesOnly && (
                <p className="mt-2 text-sm text-slate-600">
                  No API key needed. Saved category mappings are applied when available.
                </p>
              )}
            </div>

            {/* Processing Progress */}
            {isProcessing && processingStage && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStage}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Compliance Reporting Package — P&L period rows */}
          {accountType !== 'individual' && dashboardTransactions.length > 0 && (
            <CompliancePackageExporter
              transactions={dashboardTransactions}
              openingDirectorLoanBalance={openingDirectorLoanBalance}
              companyName={companyInfo.name}
              abn={companyInfo.abn || COMPANY_LEGAL.abn}
              acn={companyInfo.acn}
              periodStart={viewPeriod.startDate}
              periodEnd={viewPeriod.endDate}
            />
          )}

          {/* Export Buttons — statement ∩ P&L banner */}
          {dashboardTransactions.length > 0 && (
            <div className="mb-8 flex gap-2 flex-nowrap overflow-x-auto">
              {accountType === 'individual' ? (
                <button
                  onClick={() => onExportExcel(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                  title="Export rows in the selected P&L period from this bank statement"
                >
                  <Download className="w-5 h-5" />
                  Export Transactions (Excel)
                </button>
              ) : (
                <>
                  <button
                    onClick={() => onExportExcel(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="Business rows · statement ∩ P&L period"
                  >
                    <Download className="w-5 h-5" />
                    Export Business Only (P&amp;L Period)
                  </button>
                  <button
                    onClick={() => onExportExcel(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="All departments · statement ∩ P&L period"
                  >
                    <Download className="w-5 h-5" />
                    Export All Depts (P&amp;L Period)
                  </button>
                  <button
                    onClick={onExportSummary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="Financial summary · statement ∩ P&L period"
                  >
                    <Download className="w-5 h-5" />
                    Export Financial Summary (P&amp;L Period)
                  </button>
                  <button
                    onClick={onExportBAS}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="BAS · statement ∩ P&L period (aligns with GST Summary)"
                  >
                    <Receipt className="w-5 h-5" />
                    Export BAS (P&amp;L Period)
                  </button>
                </>
              )}
            </div>
          )}

          {/* Transaction History Table */}
          <div id="transaction-history-section" className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold">
                  {strings.dashboard.transactionHistory}
                </h2>
                {historyBadgeCount > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {historyBadgeCount}{' '}
                    {historyMonthFilter === 'pl_period'
                      ? 'in P&L period'
                      : useStatementScope
                        ? 'in this statement'
                        : 'bank/manual'}
                  </span>
                )}
                {historyMonthFilter === 'pl_period' &&
                  scopedBankCount > historyBadgeCount && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                    {scopedBankCount} in current scope (unfiltered)
                  </span>
                )}
                {useStatementScope &&
                  historyMonthFilter !== 'pl_period' &&
                  fullLedgerBankCount > historyBadgeCount && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                    {fullLedgerBankCount} in all History
                  </span>
                )}
                {payrollJournalCountInFullLedger > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const n = await indexedDBStorage.purgeOrphanPayrollTransactions()
                        window.dispatchEvent(
                          new CustomEvent('transactionsUpdated', {
                            detail: { source: 'manualPayrollPurge', removed: n },
                          })
                        )
                      } catch (err) {
                        console.error('Failed to clear leftover payroll:', err)
                      }
                    }}
                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200"
                    title="Clear leftover payroll journals that no longer exist in HR/Payroll"
                  >
                    {payrollJournalCountInFullLedger} payroll excluded — click to clear
                  </button>
                )}
                {uncategorisedCount > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-medium">
                    {uncategorisedCount} uncategorised
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveStatement && (
                  <select
                    value={historyScope}
                    onChange={(e) =>
                      setHistoryScope(e.target.value as 'statement' | 'all_history')
                    }
                    className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700"
                    aria-label="Transaction history scope"
                  >
                    <option value="statement">
                      This statement ({activeStatementSnapshot!.transactions.length})
                    </option>
                    <option value="all_history">
                      All History ({fullLedgerBankCount} bank/manual)
                    </option>
                  </select>
                )}
                {accountType !== 'individual' && (
                  <select
                    value={historyMonthFilter}
                    onChange={(e) => setHistoryMonthFilter(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700"
                    aria-label="Filter transaction history by period"
                  >
                    <option value="pl_period">
                      P&amp;L period ({dashboardTransactions.length} txs)
                    </option>
                    <option value="all">
                      All in scope ({scopedBankCount})
                    </option>
                    {availablePeriodIds.map((pid) => {
                      const count = filterTransactionsForPeriod(
                        scopedLedgerTransactions.filter(
                          (tx) => !tx.isPayrollTransaction && tx.source !== 'payroll'
                        ),
                        pid
                      ).length
                      return (
                        <option key={pid} value={pid}>
                          {pid} ({count})
                        </option>
                      )
                    })}
                  </select>
                )}
                {uncategorisedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUncategorisedOnly((v) => !v)}
                    className={`px-3 py-2 text-sm rounded-md border ${
                      showUncategorisedOnly
                        ? 'bg-amber-100 border-amber-400 text-amber-900'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {showUncategorisedOnly ? 'Show all' : 'Uncategorised only'}
                  </button>
                )}
              <button
                onClick={() => {
                  const newState = !isTransactionHistoryExpanded
                  setIsTransactionHistoryExpanded(newState)
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('transactionHistory_expanded', newState.toString())
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title={isTransactionHistoryExpanded ? 'Collapse' : 'Expand'}
              >
                <span className="text-xs font-medium">{isTransactionHistoryExpanded ? 'Hide' : 'Show'}</span>
                {isTransactionHistoryExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>
              </div>
            </div>

            {useStatementScope && activeStatementSnapshot && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">
                {historyMonthFilter === 'pl_period' ? (
                  <>
                    Showing <strong>{visibleHistoryTransactions.length}</strong> rows matching P&amp;L period{' '}
                    <strong>{formatViewPeriodLabel(viewPeriod)}</strong> (from{' '}
                    <strong>{activeStatementSnapshot.fileName}</strong>). Choose{' '}
                    <strong>All in scope</strong> to list every row in this statement.
                  </>
                ) : (
                  <>
                    Showing <strong>{visibleHistoryTransactions.length}</strong> rows from{' '}
                    <strong>{activeStatementSnapshot.fileName}</strong>
                    {activeStatementSnapshot.period.startDate &&
                    activeStatementSnapshot.period.endDate
                      ? ` (${activeStatementSnapshot.period.startDate} → ${activeStatementSnapshot.period.endDate})`
                      : ''}
                    . Switch to <strong>All History</strong> only if you need every saved statement plus cash
                    expenses.
                  </>
                )}
              </div>
            )}

            {accountType !== 'individual' &&
              !useStatementScope &&
              historyMonthFilter === 'pl_period' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                History matches P&amp;L period <strong>{formatViewPeriodLabel(viewPeriod)}</strong> (
                {visibleHistoryTransactions.length} txs). Choose <strong>All in scope</strong> to see every
                bank/manual row.
              </div>
            )}

            {accountType !== 'individual' &&
              !useStatementScope &&
              availablePeriodIds.length > 1 &&
              historyMonthFilter === 'all' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                Showing all <strong>{visibleHistoryTransactions.length}</strong> bank/manual transactions across{' '}
                <strong>{availablePeriodIds.join(', ')}</strong>. P&amp;L cards above use period{' '}
                <strong>{formatViewPeriodLabel(viewPeriod)}</strong> only — change the P&amp;L period in the banner or filter by month here.
              </div>
            )}

            {!useStatementScope && payrollJournalCountInFullLedger > 0 && (
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <strong>{payrollJournalCountInFullLedger}</strong> payroll journal entr
                {payrollJournalCountInFullLedger === 1 ? 'y is' : 'ies are'} excluded from bank Transaction History.
                Review payroll-generated entries in the <strong>HR/Payroll</strong> tab instead.
              </div>
            )}

            {showDirectorsLoanFilter && isTransactionHistoryExpanded && (
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-900">
                <strong>Director&apos;s Loan Ledger</strong> — Opening{' '}
                <strong>{formatCurrency(metricsOpeningDirectorLoan + effectivePriorPeriodAdvances)}</strong>, current{' '}
                <strong>
                  {directorsLoanBalance >= 0 ? 'Company owes Director' : 'Director owes Company'}{' '}
                  {formatCurrency(Math.abs(directorsLoanBalance))}
                </strong>
                . Showing{' '}
                <strong>
                  {visibleHistoryTransactions.filter(isDirectorsLoanLedgerTransaction).length}
                </strong>{' '}
                transactions (personal, loan injection, prior-period reimbursement, loan repayment).
                These rows are excluded from business P&amp;L and GST.
              </div>
            )}

            {/* Collapsible Content */}
            {isTransactionHistoryExpanded ? (
              <TransactionTable
                transactions={(
                  showDirectorsLoanFilter
                    ? visibleHistoryTransactions.filter(isDirectorsLoanLedgerTransaction)
                    : showUncategorisedOnly
                      ? visibleHistoryTransactions.filter(
                          (tx) =>
                            tx.category !== 'TRANSFER_INTERNAL' &&
                            (!tx.category || tx.category === 'UNCATEGORIZED')
                        )
                      : selectedCategoryFilter
                        ? visibleHistoryTransactions.filter(tx => tx.category === selectedCategoryFilter)
                        : visibleHistoryTransactions
                )}
                onTransactionUpdate={onTransactionUpdate as any}
                onCashExpenseDelete={onCashExpenseDelete}
                accountType={accountType}
                lockedPeriodIds={lockedPeriodIds}
              />
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {historyBadgeCount} visible transaction{historyBadgeCount !== 1 ? 's' : ''}
                        {!useStatementScope && transactions.length !== historyBadgeCount
                          ? ` (${transactions.length} including payroll)`
                          : ''}
                      </span>
                    </div>
                    {selectedCategoryFilter && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Filtered by:</span>
                        <span className="text-xs font-medium text-blue-600">{selectedCategoryFilter}</span>
                      </div>
                    )}
                    {showDirectorsLoanFilter && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Showing:</span>
                        <span className="text-xs font-medium text-indigo-600">Director&apos;s Loan Ledger</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsTransactionHistoryExpanded(true)
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('transactionHistory_expanded', 'true')
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View All
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
        </div>

          {/* Cash Expense Form Modal */}
          {showCashExpenseForm && (
            <CashExpenseForm
              isOpen={showCashExpenseForm}
              onClose={() => setShowCashExpenseForm(false)}
              onSave={onCashExpenseSave}
              apiKey={apiKey}
              categories={[...CASH_EXPENSE_CATEGORIES]}
              getCategoryLabel={getCashExpenseCategoryLabel}
            />
          )}
    </>
  )
}

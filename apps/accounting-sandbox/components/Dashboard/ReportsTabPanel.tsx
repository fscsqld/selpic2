'use client'

import { FileText } from 'lucide-react'
import { PersonalTaxSummaryReport } from '@/components/Reports/PersonalTaxSummaryReport'
import { ReportsScopePanel } from '@/components/Reports/ReportsScopePanel'
import { BASReportView } from '@/components/Reports/BASReportView'
import { BasLodgmentReconcilePanel } from '@/components/Reports/BasLodgmentReconcilePanel'
import { CtrReportReconcilePanel } from '@/components/Reports/CtrReportReconcilePanel'
import { IncomeStatementView } from '@/components/Reports/IncomeStatementView'
import { BalanceSheetView } from '@/components/Reports/BalanceSheetView'
import { TrialBalanceView } from '@/components/Reports/TrialBalanceView'
import { ManualJournalPanel } from '@/components/Journal/ManualJournalPanel'
import { GeneralLedgerView } from '@/components/Journal/GeneralLedgerView'
import { MonthEndChecklist } from '@/components/Closing/MonthEndChecklist'
import { ARAPManager } from '@/components/Subledger/ARAPManager'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'
import type { FinancialPeriod } from '@/lib/storage/period-types'
import type { LodgmentScopeMode } from '@/lib/ato-lodgment/period-scope'

export interface ReportsTabPanelProps {
  transactions: ClassifiedTransaction[]
  accountType: 'individual' | 'company' | 'sole_trader'
  taxpayerName: string
  onGoToDashboard: () => void
  onOpenAtoLodgment: () => void
  reportMappedTransactions: ClassifiedTransaction[]
  reportsFyRange: { startDate: string; endDate: string; financialYear: string }
  financialPeriods: FinancialPeriod[]
  lockedPeriodIds: Set<string>
  viewPeriodId: string | null
  viewingPeriod?: FinancialPeriod | null
  reportsScopeMode: LodgmentScopeMode
  onReportsScopeModeChange: (mode: LodgmentScopeMode) => void
  reportsFyTransactions: ClassifiedTransaction[]
  reportsBasTransactions: ClassifiedTransaction[]
  reportsBasDisplayTransactions: ClassifiedTransaction[]
  reportsBasOpeningDirectorLoan: number
  reportsBasPriorAdvances: number
  reportsBasMatchesViewPeriod: boolean
  reportsOpeningDirectorLoan: number
  reportsBasQuarter: { quarter: 1 | 2 | 3 | 4; startDateStr: string; endDateStr: string }
  gstRegistered?: boolean
  gstReportingCycle?: 'Monthly' | 'Quarterly'
  companyTaxRate?: number
  onJournalChanged: () => Promise<void>
  onSubledgerChanged: () => Promise<void>
  matchUploadedStatement?: boolean
}

export function ReportsTabPanel({
  transactions,
  accountType,
  taxpayerName,
  onGoToDashboard,
  onOpenAtoLodgment,
  reportMappedTransactions,
  reportsFyRange,
  financialPeriods,
  lockedPeriodIds,
  viewPeriodId,
  viewingPeriod,
  reportsScopeMode,
  onReportsScopeModeChange,
  reportsFyTransactions,
  reportsBasTransactions,
  reportsBasDisplayTransactions,
  reportsBasOpeningDirectorLoan,
  reportsBasPriorAdvances,
  reportsBasMatchesViewPeriod,
  reportsOpeningDirectorLoan,
  reportsBasQuarter,
  gstRegistered = true,
  gstReportingCycle = 'Quarterly',
  companyTaxRate = 0.25,
  onJournalChanged,
  onSubledgerChanged,
  matchUploadedStatement = false,
}: ReportsTabPanelProps) {
  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Data Available</h2>
        <p className="text-gray-500 mb-4">Upload bank statements to generate financial reports.</p>
        <button
          type="button"
          onClick={onGoToDashboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Biz Intel
        </button>
      </div>
    )
  }

  if (accountType === 'individual') {
    return (
      <PersonalTaxSummaryReport
        transactions={transactions}
        taxpayerName={taxpayerName}
        onOpenAtoLodgment={onOpenAtoLodgment}
      />
    )
  }

  return (
    <div id="bas-gst-section" className="space-y-8">
      {matchUploadedStatement && (
        <div className="card border border-emerald-200 bg-emerald-50 text-sm text-emerald-950">
          Reports use the <strong>active uploaded statement</strong> plus{' '}
          <strong>Add Cash Expense</strong> rows ({reportMappedTransactions.length} ledger rows) so
          BAS / Income Statement match Biz Intel — not all History.
        </div>
      )}

      {reportsBasMatchesViewPeriod && gstRegistered && (
        <div className="card border border-indigo-200 bg-indigo-50 text-sm text-indigo-950">
          BAS Q{reportsBasQuarter.quarter} matches your Biz Intel P&amp;L period — GST (G1 / 1A /
          1B) uses the same {reportsBasDisplayTransactions.length} transactions as the dashboard
          cards.
        </div>
      )}

      <ReportsScopePanel
        transactions={reportMappedTransactions}
        periodStart={reportsFyRange.startDate}
        periodEnd={reportsFyRange.endDate}
        periodLabel={`Financial Year ${reportsFyRange.financialYear}`}
        financialPeriods={financialPeriods}
        lockedPeriodIds={lockedPeriodIds}
        viewPeriodId={viewPeriodId}
        viewingPeriod={viewingPeriod ?? null}
        scopeMode={reportsScopeMode}
        onScopeModeChange={onReportsScopeModeChange}
        scopedTransactionCount={reportsFyTransactions.length}
      />

      {reportsScopeMode === 'dashboard_month' && (
        <div className="card border border-amber-200 bg-amber-50 text-sm text-amber-950">
          <strong>Note:</strong> Data scope is &quot;Dashboard month&quot; ({viewPeriodId}), but BAS /
          Income Statement / Balance Sheet / CTR below still use the <strong>full</strong> FY and
          BAS quarter (Apr–Jun) so all statement months stay consistent. Use month scope only for
          Month-End Closing. Prefer <strong>Full reporting period</strong> in the dropdown above.
        </div>
      )}

      {gstRegistered ? (
        <>
          <div className="card border border-blue-100 bg-blue-50 text-sm text-blue-900 space-y-1">
            <p>
              <strong>BAS vs ATO Lodgment</strong> is the <strong>lodging quarter</strong> (ATO
              files GST per BAS cycle), not the full-year P&amp;L below:{' '}
              <strong>
                Q{reportsBasQuarter.quarter} {reportsBasQuarter.startDateStr} –{' '}
                {reportsBasQuarter.endDateStr}
              </strong>
              {viewPeriodId ? (
                <>
                  {' '}
                  · Dashboard month <strong>{viewPeriodId}</strong> (month-end only)
                </>
              ) : null}
            </p>
            <p>
              <strong>Income Statement / Balance Sheet / CTR</strong> use full{' '}
              <strong>FY {reportsFyRange.financialYear}</strong> (
              {reportsFyRange.startDate} – {reportsFyRange.endDate}). FY GST in Additional
              Information is a year period estimate — do not paste it into a single quarterly BAS.
            </p>
          </div>
          <BasLodgmentReconcilePanel
            transactions={reportsBasDisplayTransactions}
            openingDirectorLoanBalance={reportsBasOpeningDirectorLoan}
            priorPeriodDirectorAdvances={reportsBasPriorAdvances}
            accountType={accountType === 'company' ? 'company' : 'sole_trader'}
            periodStart={reportsBasQuarter.startDateStr}
            periodEnd={reportsBasQuarter.endDateStr}
            periodLabel={`BAS Q${reportsBasQuarter.quarter} (${reportsBasQuarter.startDateStr} – ${reportsBasQuarter.endDateStr})`}
            gstReportingCycle={gstReportingCycle}
            onOpenAtoLodgment={onOpenAtoLodgment}
          />
          <BASReportView
            transactions={reportsBasDisplayTransactions}
            openingDirectorLoanBalance={reportsBasOpeningDirectorLoan}
            priorPeriodDirectorAdvances={reportsBasPriorAdvances}
            periodStart={reportsBasQuarter.startDateStr}
            periodEnd={reportsBasQuarter.endDateStr}
            accountType={accountType}
          />
        </>
      ) : (
        <div className="card border border-slate-200 bg-slate-50 text-sm text-slate-800">
          <strong>BAS not applicable.</strong> Your business profile indicates you are not GST
          registered. Use{' '}
          {accountType === 'company'
            ? 'ATO Lodgment → Company CTR'
            : 'ATO Lodgment → Annual income (myTax)'}{' '}
          for tax return preparation.
          <button
            type="button"
            onClick={onOpenAtoLodgment}
            className="ml-2 text-indigo-600 underline hover:text-indigo-800"
          >
            Open ATO Lodgment
          </button>
        </div>
      )}

      {accountType === 'company' && (
        <CtrReportReconcilePanel
          transactions={reportsFyTransactions}
          openingDirectorLoanBalance={reportsOpeningDirectorLoan}
          financialYear={reportsFyRange.financialYear}
          companyTaxRate={companyTaxRate}
          onOpenAtoLodgment={onOpenAtoLodgment}
        />
      )}

      <IncomeStatementView
        transactions={reportsFyTransactions}
        openingDirectorLoanBalance={reportsOpeningDirectorLoan}
        periodStart={reportsFyRange.startDate}
        periodEnd={reportsFyRange.endDate}
        accountType={accountType}
      />

      <BalanceSheetView
        transactions={reportsFyTransactions}
        openingDirectorLoanBalance={reportsOpeningDirectorLoan}
        accountType={accountType}
        asAtDate={reportsBasQuarter.endDateStr}
      />

      <TrialBalanceView
        transactions={reportsFyTransactions}
        openingDirectorLoanBalance={reportsOpeningDirectorLoan}
        accountType={accountType}
        asAtDate={reportsFyRange.endDate}
      />

      <ManualJournalPanel onJournalChanged={onJournalChanged} />

      <GeneralLedgerView transactions={reportsFyTransactions} />

      <MonthEndChecklist
        transactions={reportsFyTransactions}
        financialPeriods={financialPeriods}
        periodId={viewPeriodId || undefined}
      />

      <ARAPManager transactions={reportsFyTransactions} onChanged={onSubledgerChanged} />
    </div>
  )
}

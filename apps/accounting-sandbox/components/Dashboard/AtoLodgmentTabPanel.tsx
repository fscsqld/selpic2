'use client'

import { Shield } from 'lucide-react'
import { ATOLodgmentGuide } from '@/components/Lodgment/ATOLodgmentGuide'
import { IndividualTaxLodgmentGuide } from '@/components/Lodgment/IndividualTaxLodgmentGuide'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { ClassifiedTransaction } from '@/lib/dashboard/types'
import type { FinancialPeriod } from '@/lib/storage/period-types'
import type { DashboardViewPeriod } from '@/lib/dashboard/view-period-range'

export interface AtoLodgmentTabPanelProps {
  transactions: ClassifiedTransaction[]
  accountType: 'individual' | 'company' | 'sole_trader'
  individualName: string
  companyName: string
  abn?: string
  onGoToDashboard: () => void
  openingDirectorLoanBalance: number
  metricsOpeningDirectorLoan: number
  effectivePriorPeriodAdvances: number
  viewPeriod: DashboardViewPeriod
  openingCashBalance: number
  financialPeriods: FinancialPeriod[]
  viewPeriodId: string | null
  viewingPeriod: FinancialPeriod | null | undefined
  lockedPeriodIds: Set<string>
  onPeriodsChanged: (periods: FinancialPeriod[]) => void
  gstReportingCycle?: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  companyTaxRate?: number
  matchUploadedStatement?: boolean
}

export function AtoLodgmentTabPanel({
  transactions,
  accountType,
  individualName,
  companyName,
  abn,
  onGoToDashboard,
  openingDirectorLoanBalance,
  metricsOpeningDirectorLoan,
  effectivePriorPeriodAdvances,
  viewPeriod,
  openingCashBalance,
  financialPeriods,
  viewPeriodId,
  viewingPeriod,
  lockedPeriodIds,
  onPeriodsChanged,
  gstReportingCycle = 'Quarterly',
  gstRegistered = true,
  companyTaxRate = 0.25,
  matchUploadedStatement = false,
}: AtoLodgmentTabPanelProps) {
  if (transactions.length === 0) {
    return (
      <div className="card text-center py-12">
        <Shield className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Data for ATO Lodgment</h2>
        <p className="text-gray-500 mb-4">
          Upload and categorise bank transactions first, then return here to copy values into the ATO portal.
        </p>
        <button
          type="button"
          onClick={onGoToDashboard}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Go to Biz Intel
        </button>
      </div>
    )
  }

  const mappedTransactions = transactions.map((tx) => ({
    ...tx,
    id: tx.id || `${tx.date}_${tx.description}`,
  }))

  if (accountType === 'individual') {
    return <IndividualTaxLodgmentGuide transactions={mappedTransactions} individualName={individualName} />
  }

  return (
    <ATOLodgmentGuide
      transactions={mappedTransactions}
      openingDirectorLoanBalance={openingDirectorLoanBalance}
      metricsOpeningDirectorLoan={metricsOpeningDirectorLoan}
      effectivePriorPeriodAdvances={effectivePriorPeriodAdvances}
      viewPeriod={viewPeriod}
      openingCashBalance={openingCashBalance}
      accountType={accountType}
      companyName={companyName}
      abn={abn}
      financialPeriods={financialPeriods}
      viewPeriodId={viewPeriodId}
      viewingPeriod={viewingPeriod}
      lockedPeriodIds={lockedPeriodIds}
      onPeriodsChanged={() => {
        indexedDBStorage.getAllPeriods().then(onPeriodsChanged)
      }}
      gstReportingCycle={gstReportingCycle}
      gstRegistered={gstRegistered}
      profileCompanyTaxRate={companyTaxRate}
      matchUploadedStatement={matchUploadedStatement}
    />
  )
}

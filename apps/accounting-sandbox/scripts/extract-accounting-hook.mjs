import fs from 'fs'

const page = fs.readFileSync('app/page.tsx', 'utf8').split(/\r?\n/)

// Hook body: state + logic from line 64 to 1996 (1-based) -> index 63..1996
const hookBody = page.slice(63, 1996).join('\n')

const hookHeader = `import { useState, useEffect, useMemo, useCallback } from 'react'
import { strings } from '@/lib/i18n/strings'
import {
  loadAllTransactions as loadCanonicalTransactions,
  syncLegacyTransactionCache,
} from '@/lib/storage/load-all-transactions'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import {
  applyLodgmentScope,
  getOpeningBalanceForLodgmentScope,
  getStoredScopeMode,
  setStoredScopeMode,
  ACCOUNTING_SCOPE_MODE_CHANGED,
  type LodgmentScopeMode,
} from '@/lib/ato-lodgment/period-scope'
import { getCurrentAustralianQuarter } from '@/lib/utils/australian-financial-year'
import { PAYMENT_SUMMARY_UPDATED_EVENT } from '@/components/Individual/PaymentSummaryForm'
import { useJourneyReportsReview } from '@/hooks/useJourneyReportsReview'
import { usePayrollOnlyRedirect } from '@/hooks/usePayrollOnlyRedirect'
import { syncIncomingOrders } from '@/lib/dashboard/sync-incoming-orders'
import type { ClassifiedTransaction, DashboardTab } from '@/lib/dashboard/types'
import { LODGMENT_SNAPSHOT_SAVED_EVENT } from '@/lib/ato-lodgment/lodgment-events'
import type { JourneyNavigateTarget } from '@/lib/journey/types'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { exportToExcel, exportSummary, ExportTransaction } from '@/lib/excel-export'
import { generateBASReport, exportBASToExcel } from '@/lib/payg-withholding/bas-reporter'
import { calculateFinancialSummary } from '@/lib/utils/financial-summary'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { FinancialPeriod } from '@/lib/storage/period-types'
import { getCurrentPeriodDates } from '@/lib/period-management/period-utils'
import {
  getLockedPeriodIds,
  filterTransactionsForPeriod,
  syncAllOpenPeriods,
  isDateInLockedPeriod,
  getViewPeriodIdFromStorage,
  PERIOD_CHANGED_EVENT,
  generatePeriodIdFromDateString,
} from '@/lib/period-management/period-lock'
import { findUserMapping } from '@/lib/storage/user-mappings'
import { extractSSOToken, saveSSOToken, getSSOToken } from '@/lib/sso-handler'

export function useAccountingDashboard() {
`

const hookFooter = `
  return {
    transactions,
    isProcessing,
    processingStage,
    apiKey,
    userApiKey,
    directorName,
    error,
    statementHistory,
    currentStatementId,
    storageSize,
    showDeleteConfirm,
    setShowDeleteConfirm,
    activeTab,
    setActiveTab,
    loadSuccessMessage,
    setLoadSuccessMessage,
    duplicateFileDialog,
    sessionApiCost,
    appendMode,
    setAppendMode,
    isUnlocked,
    setIsUnlocked,
    setupComplete,
    setSetupComplete,
    companyInfo,
    accountType,
    paymentSummaryCount,
    hasLodgmentSnapshot,
    openingDirectorLoanBalance,
    setOpeningDirectorLoanBalance,
    financialPeriods,
    setFinancialPeriods,
    viewPeriodId,
    openingCashBalance,
    lockedPeriodIds,
    uncategorisedCount,
    profileComplete,
    allPeriodsLocked,
    journeyFinancialYear,
    hasReviewedReports,
    handleJourneyNavigate,
    viewingPeriod,
    dashboardTransactions,
    metricsOpeningDirectorLoan,
    reportsScopeMode,
    handleReportsScopeModeChange,
    reportMappedTransactions,
    reportsFyRange,
    reportsBasQuarter,
    reportsFyTransactions,
    reportsBasTransactions,
    reportsOpeningDirectorLoan,
    totalIncome,
    totalExpenses,
    netProfit,
    gstPayable,
    gstClaimable,
    directorsLoanBalance,
    personalSpendingNonDeductible,
    handleDuplicateFileChoice,
    handleFileUpload,
    handleCashExpenseSave,
    handleTransactionUpdate,
    handleExportExcel,
    handleExportSummary,
    handleExportBAS,
    handleDeleteStatement,
    handleDeleteAllStatements,
    formatStorageSize,
    loadStatement,
    loadStatementHistory,
    loadAllTransactions,
    setError,
    financialSummary,
  }
}
`

let body = hookBody.replace(
  /const checkForIncomingOrders = async \(\) => \{[\s\S]*?\n  \}\n\n  \/\/ Load cash expenses/,
  `// Load cash expenses`
)

body = body.replace(
  /checkForIncomingOrders\(\)/g,
  'syncIncomingOrders()'
)

fs.writeFileSync('hooks/useAccountingDashboard.ts', hookHeader + body + hookFooter)
console.log('useAccountingDashboard.ts written')

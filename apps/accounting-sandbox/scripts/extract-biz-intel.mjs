import fs from 'fs'
import path from 'path'

const pagePath = path.join('app', 'page.tsx')
const lines = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/)

// Dashboard tab inner content: lines 2259-2742 (1-based) -> slice 2258..2742
const body = lines.slice(2258, 2742).join('\n')

const header = `'use client'

import { useState } from 'react'
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
import { PaymentSummaryForm } from '@/components/Individual/PaymentSummaryForm'
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
  hasReviewedReports: boolean
  allPeriodsLocked: boolean
  hasLodgmentSnapshot: boolean
  onJourneyNavigate: (target: JourneyNavigateTarget) => void
  viewPeriodId: string | null
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
  onOpeningBalanceChange: (value: number) => void
  companyInfo: { name: string; abn?: string; acn?: string }
  sessionApiCost: number
  appendMode: boolean
  onAppendModeChange: (value: boolean) => void
  isProcessing: boolean
  processingStage: string
  apiKey: string
  userApiKey: string
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onExportExcel: (businessOnly: boolean) => void
  onExportSummary: () => void
  onExportBAS: () => void
  onTransactionUpdate: (id: string, updates: Partial<ClassifiedTransaction>) => Promise<void>
  onCashExpenseSave: (expense: {
    date: string
    amount: number
    description: string
    category: string
    receiptImage?: string
    gstInfo?: ClassifiedTransaction['gstInfo']
  }) => Promise<void>
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
  hasReviewedReports,
  allPeriodsLocked,
  hasLodgmentSnapshot,
  onJourneyNavigate,
  viewPeriodId,
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
  onOpeningBalanceChange,
  companyInfo,
  sessionApiCost,
  appendMode,
  onAppendModeChange,
  isProcessing,
  processingStage,
  apiKey,
  userApiKey,
  onFileUpload,
  onExportExcel,
  onExportSummary,
  onExportBAS,
  onTransactionUpdate,
  onCashExpenseSave,
}: BizIntelTabPanelProps) {
  const [showCashExpenseForm, setShowCashExpenseForm] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null)
  const [showDirectorsLoanFilter, setShowDirectorsLoanFilter] = useState(false)
  const [isTransactionHistoryExpanded, setIsTransactionHistoryExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('transactionHistory_expanded')
      return saved === 'true'
    }
    return true
  })

  return (
    <>
`

const footer = `
    </>
  )
}
`

let transformed = body
  .replace(/\bsetError\(null\)/g, 'onClearError()')
  .replace(/\bhandleJourneyNavigate\b/g, 'onJourneyNavigate')
  .replace(/\bsetOpeningDirectorLoanBalance\b/g, 'onOpeningBalanceChange')
  .replace(/\bsetAppendMode\b/g, 'onAppendModeChange')
  .replace(/\bhandleFileUpload\b/g, 'onFileUpload')
  .replace(/\bhandleExportExcel\b/g, 'onExportExcel')
  .replace(/\bhandleExportSummary\b/g, 'onExportSummary')
  .replace(/\bhandleExportBAS\b/g, 'onExportBAS')
  .replace(/\bhandleTransactionUpdate\b/g, 'onTransactionUpdate')
  .replace(/\bhandleCashExpenseSave\b/g, 'onCashExpenseSave')

// Replace large getCategoryLabel inline with helper
const labelStart = transformed.indexOf('getCategoryLabel={(category) => {')
if (labelStart !== -1) {
  const labelEnd = transformed.indexOf('}}', labelStart) + 2
  transformed =
    transformed.slice(0, labelStart) +
    'getCategoryLabel={getCashExpenseCategoryLabel}' +
    transformed.slice(labelEnd)
}

fs.writeFileSync(path.join('components', 'Dashboard', 'BizIntelTabPanel.tsx'), header + transformed + footer)
console.log('BizIntelTabPanel.tsx written')

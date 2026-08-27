'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Calendar,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  Printer,
  Save,
  Shield,
  Trash2,
  Unlock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import {
  buildLodgmentPeriodKey,
  computeAnnualLodgment,
  computeBasLodgment,
  computeCtrLodgment,
  filterByDateRange,
  getCurrentFinancialYearRange,
  listRecentBasQuarters,
  listRecentBasMonths,
} from '@/lib/ato-lodgment/compute-lodgment'
import { prepareLodgmentTransactions } from '@/lib/ato-lodgment/prepare-lodgment-transactions'
import { getAustralianFinancialYear } from '@/lib/utils/australian-financial-year'
import {
  resolveReportingBasQuarter,
  resolveReportingFinancialYearRange,
} from '@/lib/utils/reporting-period-resolve'
import { exportBusinessLodgmentPack } from '@/lib/export/business-lodgment-export'
import {
  basQuartersWithSnapshot,
  buildBasPeriodCompareRows,
  type BasPeriodLiveData,
} from '@/lib/ato-lodgment/bas-snapshot-compare'
import { buildPreLodgeChecklist, fieldsToTsv, serializePreLodgeSummary } from '@/lib/ato-lodgment/pre-lodge-checklist'
import { getReportsReviewed } from '@/lib/journey/reports-review-flag'
import { sortFieldsByAtoOrder } from '@/lib/ato-lodgment/field-metadata'
import { buildLodgmentCalendar } from '@/lib/ato-lodgment/lodgment-calendar'
import type { CtrLodgmentOptions } from '@/lib/ato-lodgment/types'
import {
  applyLodgmentScope,
  buildLodgmentScopeSummary,
  getOpeningBalanceForLodgmentScope,
  isViewPeriodInsideRange,
  lockMonthsInLodgmentRange,
  getStoredScopeMode,
  scopeModeLabel,
  setStoredScopeMode,
  ACCOUNTING_SCOPE_MODE_CHANGED,
  type LodgmentScopeMode,
} from '@/lib/ato-lodgment/period-scope'
import type { LodgmentField, LodgmentTab, LodgmentValidation } from '@/lib/ato-lodgment/types'
import type { FinancialPeriod } from '@/lib/storage/period-types'
import { viewPeriodMatchesRange, type DashboardViewPeriod } from '@/lib/dashboard/view-period-range'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import type { LodgmentSnapshot } from '@/lib/storage/lodgment-snapshot-types'
import { ReportFooter } from '@/components/Reports/ReportFooter'
import { LodgmentFieldPanel } from '@/components/Lodgment/LodgmentFieldPanel'
import { BasPeriodSummaryCard } from '@/components/Lodgment/BasPeriodSummaryCard'
import { AnnualIncomeSummaryCard } from '@/components/Lodgment/AnnualIncomeSummaryCard'
import { BasSnapshotComparePanel } from '@/components/Lodgment/BasSnapshotComparePanel'
import { CtrSummaryCard } from '@/components/Lodgment/CtrSummaryCard'
import { LodgmentCollapsibleSection } from '@/components/Lodgment/LodgmentCollapsibleSection'
import { LodgmentCalendar } from '@/components/Lodgment/LodgmentCalendar'
import { PreLodgeChecklistPanel } from '@/components/Lodgment/PreLodgeChecklistPanel'
import { OtherAtoObligations } from '@/components/Lodgment/OtherAtoObligations'
import { hasFbtActivity, hasPayrollActivity } from '@/lib/ato-lodgment/other-obligations'
import { notifyLodgmentSnapshotSaved } from '@/lib/ato-lodgment/lodgment-events'

interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: { shouldWarn?: boolean; withholdingAmount?: number }
  fbtInfo?: {
    isFBTRelevant: boolean
    fbtCategory?: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
    fbtRisk?: 'low' | 'medium' | 'high'
    isFBTReportable: boolean
    fbtAmount?: number
    reasoning?: string
    confidence: number
  }
  gstInfo?: {
    isGSTIncluded?: boolean
    gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
}

interface ATOLodgmentGuideProps {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  metricsOpeningDirectorLoan: number
  effectivePriorPeriodAdvances?: number
  viewPeriod?: DashboardViewPeriod
  openingCashBalance?: number
  accountType: 'individual' | 'company' | 'sole_trader'
  companyName?: string
  abn?: string
  financialPeriods?: FinancialPeriod[]
  viewPeriodId?: string | null
  viewingPeriod?: FinancialPeriod | null
  lockedPeriodIds?: Set<string>
  onPeriodsChanged?: () => void
  gstReportingCycle?: 'Monthly' | 'Quarterly'
  gstRegistered?: boolean
  profileCompanyTaxRate?: number
  /** When true, figures use the uploaded statement set as-is (no BAS/FY date cut). */
  matchUploadedStatement?: boolean
}

function amountForCopy(amount: number): string {
  return amount.toFixed(2)
}

function sectionTitle(section: LodgmentField['section']): string {
  switch (section) {
    case 'gst':
      return 'GST (activity statement)'
    case 'payg':
      return 'PAYG withholding'
    case 'income':
      return 'Business income'
    case 'expense':
      return 'Business expenses'
    case 'summary':
      return 'Summary'
    case 'ctr':
      return 'Company tax return (CTR)'
    case 'tax':
      return 'Tax calculation'
    default:
      return 'Other'
  }
}

export function ATOLodgmentGuide({
  transactions,
  openingDirectorLoanBalance,
  metricsOpeningDirectorLoan,
  effectivePriorPeriodAdvances = 0,
  viewPeriod,
  openingCashBalance = 0,
  accountType,
  companyName,
  abn,
  financialPeriods = [],
  viewPeriodId = null,
  viewingPeriod = null,
  lockedPeriodIds = new Set<string>(),
  onPeriodsChanged,
  gstReportingCycle = 'Quarterly',
  gstRegistered = true,
  profileCompanyTaxRate = 0.25,
  matchUploadedStatement = false,
}: ATOLodgmentGuideProps) {
  const defaultTab: LodgmentTab =
    gstRegistered ? 'bas' : accountType === 'company' ? 'ctr' : 'annual'
  const quarters = useMemo(() => listRecentBasQuarters(8), [])
  const months = useMemo(() => listRecentBasMonths(12), [])
  const defaultMonth = months[0]
  const isMonthlyBas = gstReportingCycle === 'Monthly'

  /** Align defaults with Biz Intel / Reports (statement cluster + dashboard month). */
  const preferredPeriod = useMemo(() => {
    const bas = resolveReportingBasQuarter({
      transactions,
      viewPeriodId,
    })
    const fy = resolveReportingFinancialYearRange({
      transactions,
      viewPeriodId,
    })
    const quarterKey = `${bas.financialYear}-Q${bas.quarter}`
    const hasQuarterOption = quarters.some(
      (q) => `${q.financialYear}-Q${q.quarter}` === quarterKey
    )
    return {
      quarterKey: hasQuarterOption
        ? quarterKey
        : quarters[0]
          ? `${quarters[0].financialYear}-Q${quarters[0].quarter}`
          : quarterKey,
      financialYear: fy.financialYear,
      basLabel: `Q${bas.quarter} ${bas.financialYear}`,
      basStart: bas.startDateStr,
      basEnd: bas.endDateStr,
    }
  }, [transactions, viewPeriodId, quarters])

  const defaultQuarter =
    quarters.find((q) => `${q.financialYear}-Q${q.quarter}` === preferredPeriod.quarterKey) ??
    quarters[0]

  const [activeTab, setActiveTab] = useState<LodgmentTab>(defaultTab)
  const [selectedQuarterKey, setSelectedQuarterKey] = useState(
    () => preferredPeriod.quarterKey
  )
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    () => defaultMonth?.periodId ?? ''
  )
  const [financialYear, setFinancialYear] = useState(() => preferredPeriod.financialYear)
  const [userOverrodePeriod, setUserOverrodePeriod] = useState(false)

  useEffect(() => {
    if (userOverrodePeriod) return
    setSelectedQuarterKey(preferredPeriod.quarterKey)
    setFinancialYear(preferredPeriod.financialYear)
  }, [preferredPeriod.quarterKey, preferredPeriod.financialYear, userOverrodePeriod])
  const [entered, setEntered] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<LodgmentSnapshot[]>([])
  const [viewingSnapshot, setViewingSnapshot] = useState<LodgmentSnapshot | null>(null)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null)
  const [scopeMode, setScopeMode] = useState<LodgmentScopeMode>(() => getStoredScopeMode())
  const [fieldViewMode, setFieldViewMode] = useState<'grouped' | 'ato_order'>('ato_order')
  const [ctrTaxRate, setCtrTaxRate] = useState(0.25)
  const [ctrAddBacks, setCtrAddBacks] = useState(0)
  const [ctrLossCarry, setCtrLossCarry] = useState(0)
  const [ctrOtherAdj, setCtrOtherAdj] = useState(0)

  const handleScopeModeChange = (mode: LodgmentScopeMode) => {
    setScopeMode(mode)
    setStoredScopeMode(mode)
  }

  useEffect(() => {
    const onScopeChanged = (e: Event) => {
      const mode = (e as CustomEvent<{ mode: LodgmentScopeMode }>).detail?.mode
      if (mode) setScopeMode(mode)
    }
    window.addEventListener(ACCOUNTING_SCOPE_MODE_CHANGED, onScopeChanged)
    return () => window.removeEventListener(ACCOUNTING_SCOPE_MODE_CHANGED, onScopeChanged)
  }, [])

  useEffect(() => {
    if (!gstRegistered && activeTab === 'bas') {
      setActiveTab(accountType === 'company' ? 'ctr' : 'annual')
    }
  }, [gstRegistered, activeTab, accountType])

  const ctrOptionsKey = `ato_ctr_options_${financialYear}`

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(ctrOptionsKey)
      if (!raw) {
        if (accountType === 'company' && profileCompanyTaxRate) {
          setCtrTaxRate(profileCompanyTaxRate)
        }
        return
      }
      const parsed = JSON.parse(raw) as CtrLodgmentOptions
      if (parsed.taxRate === 0.25 || parsed.taxRate === 0.3) setCtrTaxRate(parsed.taxRate)
      if (typeof parsed.nonDeductibleAddBacks === 'number') setCtrAddBacks(parsed.nonDeductibleAddBacks)
      if (typeof parsed.lossCarryForward === 'number') setCtrLossCarry(parsed.lossCarryForward)
      if (typeof parsed.otherAdjustments === 'number') setCtrOtherAdj(parsed.otherAdjustments)
    } catch {
      /* ignore */
    }
  }, [ctrOptionsKey, accountType, profileCompanyTaxRate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onProfile = () => {
      if (accountType === 'company') {
        try {
          const raw = localStorage.getItem(ctrOptionsKey)
          if (!raw) setCtrTaxRate(profileCompanyTaxRate)
        } catch {
          setCtrTaxRate(profileCompanyTaxRate)
        }
      }
    }
    window.addEventListener('businessProfileUpdated', onProfile)
    return () => window.removeEventListener('businessProfileUpdated', onProfile)
  }, [ctrOptionsKey, accountType, profileCompanyTaxRate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload: CtrLodgmentOptions = {
      taxRate: ctrTaxRate,
      nonDeductibleAddBacks: ctrAddBacks,
      lossCarryForward: ctrLossCarry,
      otherAdjustments: ctrOtherAdj,
    }
    localStorage.setItem(ctrOptionsKey, JSON.stringify(payload))
  }, [ctrOptionsKey, ctrTaxRate, ctrAddBacks, ctrLossCarry, ctrOtherAdj])

  const selectedQuarter = useMemo(() => {
    return (
      quarters.find((q) => `${q.financialYear}-Q${q.quarter}` === selectedQuarterKey) ??
      defaultQuarter
    )
  }, [quarters, selectedQuarterKey, defaultQuarter])

  const selectedMonth = useMemo(() => {
    return months.find((m) => m.periodId === selectedMonthKey) ?? defaultMonth
  }, [months, selectedMonthKey, defaultMonth])

  const reportingRange = useMemo(() => {
    if (activeTab === 'bas') {
      if (isMonthlyBas && selectedMonth) {
        return {
          start: selectedMonth.startDate,
          end: selectedMonth.endDate,
          label: selectedMonth.label,
        }
      }
      if (selectedQuarter) {
        return {
          start: selectedQuarter.startDate,
          end: selectedQuarter.endDate,
          label: selectedQuarter.label,
        }
      }
    }
    const fy =
      activeTab === 'ctr' || activeTab === 'annual'
        ? financialYear
        : getCurrentFinancialYearRange().financialYear
    const [sy, ey] = fy.split('-').map(Number)
    return {
      start: `${sy}-07-01`,
      end: `${ey}-06-30`,
      label: activeTab === 'ctr' ? `CTR FY ${fy}` : `FY ${fy}`,
    }
  }, [activeTab, selectedQuarter, selectedMonth, financialYear, isMonthlyBas])

  /**
   * Bank + Cash Expense rows for lodgment. Date repair runs on bank only so
   * same-day Cash Expenses are not collapsed as OCR duplicates (Biz Intel align).
   */
  const dateRepairedTransactions = useMemo(
    () => prepareLodgmentTransactions(transactions),
    [transactions]
  )

  const scopeSummary = useMemo(
    () =>
      buildLodgmentScopeSummary(
        dateRepairedTransactions,
        reportingRange.start,
        reportingRange.end,
        financialPeriods,
        lockedPeriodIds
      ),
    [dateRepairedTransactions, reportingRange, financialPeriods, lockedPeriodIds]
  )

  // BAS / CTR figures need the full selected quarter/FY — not a single dashboard month
  const statementScopeMode: LodgmentScopeMode =
    scopeMode === 'dashboard_month' ? 'full' : scopeMode

  const scopedTransactions = useMemo(
    () =>
      applyLodgmentScope(
        dateRepairedTransactions,
        reportingRange.start,
        reportingRange.end,
        statementScopeMode,
        lockedPeriodIds,
        viewPeriodId
      ),
    [dateRepairedTransactions, reportingRange, statementScopeMode, lockedPeriodIds, viewPeriodId]
  )

  const scopedOpeningBalance = useMemo(
    () =>
      getOpeningBalanceForLodgmentScope(
        scopeMode,
        reportingRange.start,
        viewPeriodId,
        financialPeriods,
        openingDirectorLoanBalance,
        metricsOpeningDirectorLoan
      ),
    [
      scopeMode,
      reportingRange.start,
      viewPeriodId,
      financialPeriods,
      openingDirectorLoanBalance,
      metricsOpeningDirectorLoan,
    ]
  )

  const dashboardMonthInRange = useMemo(
    () => isViewPeriodInsideRange(viewPeriodId, reportingRange.start, reportingRange.end),
    [viewPeriodId, reportingRange]
  )

  const basResult = useMemo(() => {
    if (isMonthlyBas) {
      if (!selectedMonth) return null
      const matchesView = viewPeriod
        ? viewPeriodMatchesRange(viewPeriod, selectedMonth.startDate, selectedMonth.endDate)
        : false
      return computeBasLodgment(
        scopedTransactions,
        selectedMonth.startDate,
        selectedMonth.endDate,
        'monthly',
        selectedMonth.label,
        matchesView ? metricsOpeningDirectorLoan : scopedOpeningBalance,
        accountType,
        matchesView ? effectivePriorPeriodAdvances : undefined,
        gstRegistered
      )
    }
    if (!selectedQuarter) return null
    const matchesView = viewPeriod
      ? viewPeriodMatchesRange(viewPeriod, selectedQuarter.startDate, selectedQuarter.endDate)
      : false
    return computeBasLodgment(
      scopedTransactions,
      selectedQuarter.startDate,
      selectedQuarter.endDate,
      'quarterly',
      selectedQuarter.label,
      matchesView ? metricsOpeningDirectorLoan : scopedOpeningBalance,
      accountType,
      matchesView ? effectivePriorPeriodAdvances : undefined,
      gstRegistered
    )
  }, [
    scopedTransactions,
    selectedQuarter,
    selectedMonth,
    scopedOpeningBalance,
    metricsOpeningDirectorLoan,
    effectivePriorPeriodAdvances,
    viewPeriod,
    accountType,
    isMonthlyBas,
    gstRegistered,
  ])

  const annualResult = useMemo(() => {
    return computeAnnualLodgment(
      scopedTransactions,
      scopedOpeningBalance,
      accountType,
      financialYear
    )
  }, [scopedTransactions, scopedOpeningBalance, accountType, financialYear])

  const ctrResult = useMemo(() => {
    if (accountType !== 'company') return null
    return computeCtrLodgment(scopedTransactions, scopedOpeningBalance, financialYear, {
      taxRate: ctrTaxRate,
      nonDeductibleAddBacks: ctrAddBacks,
      lossCarryForward: ctrLossCarry,
      otherAdjustments: ctrOtherAdj,
    })
  }, [
    scopedTransactions,
    scopedOpeningBalance,
    accountType,
    financialYear,
    ctrTaxRate,
    ctrAddBacks,
    ctrLossCarry,
    ctrOtherAdj,
  ])

  const scopeValidation = useMemo((): LodgmentValidation => {
    const warnings: string[] = []
    const errors: string[] = []

    if (scopeMode === 'full' && scopeSummary.anyOpenWithTransactions) {
      warnings.push(
        `${scopeSummary.openTransactionCount} transaction(s) in open (unlocked) months — lock periods in Settings or switch to "Locked periods only".`
      )
    }
    if (scopeMode === 'locked_only' && scopeSummary.openTransactionCount > 0) {
      warnings.push(
        `Excluded ${scopeSummary.openTransactionCount} transaction(s) from ${scopeSummary.openMonthIds.length} open month(s).`
      )
    }
    if (scopeMode === 'locked_only' && scopedTransactions.length === 0) {
      errors.push(
        'No transactions in locked periods for this range — lock months in Settings first.'
      )
    }
    if (scopeMode === 'dashboard_month') {
      if (!viewPeriodId) {
        errors.push('No dashboard period selected — choose a period on the Dashboard or in Settings.')
      } else if (!dashboardMonthInRange) {
        warnings.push(
          `Dashboard period ${viewPeriodId} is outside this reporting range — figures may not match ATO requirements.`
        )
      } else if (activeTab === 'bas') {
        warnings.push(
          'BAS covers a full quarter — dashboard month shows one month only, not a complete BAS.'
        )
      }
    }
    if (!scopeSummary.allMonthsLocked && scopeSummary.totalInRange > 0) {
      warnings.push(
        `Open months in range: ${scopeSummary.openMonthIds.join(', ') || 'none'}`
      )
    }

    return { ok: errors.length === 0, errors, warnings }
  }, [
    scopeMode,
    scopeSummary,
    scopedTransactions.length,
    viewPeriodId,
    dashboardMonthInRange,
    activeTab,
  ])

  const liveResultRaw =
    activeTab === 'bas' ? basResult : activeTab === 'ctr' ? ctrResult : annualResult

  const liveResult = useMemo(() => {
    if (!liveResultRaw) return null
    return {
      ...liveResultRaw,
      validation: {
        ok: liveResultRaw.validation.ok && scopeValidation.ok,
        errors: [...liveResultRaw.validation.errors, ...scopeValidation.errors],
        warnings: [...liveResultRaw.validation.warnings, ...scopeValidation.warnings],
      },
    }
  }, [liveResultRaw, scopeValidation])

  const activeResult = useMemo(
    () =>
      viewingSnapshot
        ? {
            kind: viewingSnapshot.kind,
            periodLabel: viewingSnapshot.periodLabel,
            periodStart: viewingSnapshot.periodStart,
            periodEnd: viewingSnapshot.periodEnd,
            fields: viewingSnapshot.fields,
            validation: viewingSnapshot.validation,
          }
        : liveResult,
    [viewingSnapshot, liveResult]
  )

  const storageKey =
    activeTab === 'bas' && basResult
      ? `ato_lodgment_entered_bas_${basResult.periodStart}_${basResult.periodEnd}`
      : activeTab === 'ctr'
        ? `ato_lodgment_entered_ctr_${financialYear}`
        : `ato_lodgment_entered_annual_${financialYear}`

  const loadSnapshots = useCallback(async () => {
    try {
      await indexedDBStorage.init()
      const rows = await indexedDBStorage.getLodgmentSnapshots()
      setSnapshots(rows.filter((s) => s.accountType === accountType))
    } catch {
      setSnapshots([])
    }
  }, [accountType])

  useEffect(() => {
    loadSnapshots()
  }, [loadSnapshots])

  useEffect(() => {
    setViewingSnapshot(null)
    setSelectedFieldId(null)
  }, [activeTab, selectedQuarterKey, financialYear, scopeMode, selectedMonthKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (viewingSnapshot) {
      setEntered(viewingSnapshot.entered || {})
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      setEntered(raw ? JSON.parse(raw) : {})
    } catch {
      setEntered({})
    }
  }, [storageKey, viewingSnapshot])

  useEffect(() => {
    if (activeResult?.fields.length && !selectedFieldId) {
      setSelectedFieldId(activeResult.fields[0].id)
    }
  }, [activeResult, selectedFieldId])

  const persistEntered = useCallback(
    (next: Record<string, boolean>) => {
      setEntered(next)
      if (viewingSnapshot) return
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(next))
      }
    },
    [storageKey, viewingSnapshot]
  )

  const toggleEntered = (fieldId: string) => {
    persistEntered({ ...entered, [fieldId]: !entered[fieldId] })
  }

  const copyAmount = async (field: LodgmentField) => {
    const text = amountForCopy(field.amount)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(field.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      window.prompt('Copy this amount:', text)
    }
  }

  const selectedField = activeResult?.fields.find((f) => f.id === selectedFieldId)

  const enteredCount = activeResult
    ? activeResult.fields.filter((f) => entered[f.id]).length
    : 0
  const totalFields = activeResult?.fields.length ?? 0
  const allEntered = totalFields > 0 && enteredCount === totalFields

  const fyOptions = useMemo(() => {
    const current = getCurrentFinancialYearRange().financialYear
    const [sy] = current.split('-').map(Number)
    const opts = [0, 1, 2].map((i) => `${sy - i}-${sy - i + 1}`)
    if (preferredPeriod.financialYear && !opts.includes(preferredPeriod.financialYear)) {
      opts.push(preferredPeriod.financialYear)
      opts.sort((a, b) => b.localeCompare(a))
    }
    return opts
  }, [preferredPeriod.financialYear])

  const groupedFields = useMemo(() => {
    if (!activeResult) return []
    const order: LodgmentField['section'][] = [
      'gst',
      'payg',
      'ctr',
      'tax',
      'summary',
      'income',
      'expense',
    ]
    const groups: { section: LodgmentField['section']; fields: LodgmentField[] }[] = []
    for (const section of order) {
      const fields = activeResult.fields.filter((f) => f.section === section)
      if (fields.length) groups.push({ section, fields })
    }
    return groups
  }, [activeResult])

  const orderedFields = useMemo(() => {
    if (!activeResult) return []
    return sortFieldsByAtoOrder(activeResult.fields)
  }, [activeResult])

  const calendarItems = useMemo(
    () =>
      buildLodgmentCalendar(accountType, gstReportingCycle, financialYear, {
        hasPayroll: hasPayrollActivity(scopedTransactions),
        hasFbt: hasFbtActivity(scopedTransactions),
      }),
    [accountType, gstReportingCycle, financialYear, scopedTransactions]
  )

  const basFinancialYear = useMemo(() => {
    if (isMonthlyBas && selectedMonth) {
      return getAustralianFinancialYear(new Date(selectedMonth.startDate))
    }
    return selectedQuarter?.financialYear ?? getCurrentFinancialYearRange().financialYear
  }, [isMonthlyBas, selectedMonth, selectedQuarter])

  const basLivePeriods = useMemo((): BasPeriodLiveData[] => {
    const scopeForRange = (start: string, end: string) =>
      applyLodgmentScope(
        dateRepairedTransactions,
        start,
        end,
        statementScopeMode,
        lockedPeriodIds,
        viewPeriodId
      )

    if (isMonthlyBas) {
      return months
        .filter((m) => getAustralianFinancialYear(new Date(m.startDate)) === basFinancialYear)
        .map((m) => {
          const scoped = scopeForRange(m.startDate, m.endDate)
          const openBal = getOpeningBalanceForLodgmentScope(
            scopeMode,
            m.startDate,
            viewPeriodId,
            financialPeriods,
            openingDirectorLoanBalance,
            metricsOpeningDirectorLoan
          )
          const result = computeBasLodgment(
            scoped,
            m.startDate,
            m.endDate,
            'monthly',
            m.label,
            openBal,
            accountType,
            undefined,
            gstRegistered
          )
          return {
            periodKey: buildLodgmentPeriodKey('bas', basFinancialYear, undefined, m.periodId),
            periodLabel: m.label,
            fields: result.fields,
            transactionCount: scoped.length,
          }
        })
    }

    return quarters
      .filter((q) => q.financialYear === basFinancialYear)
      .sort((a, b) => a.quarter - b.quarter)
      .map((q) => {
        const scoped = scopeForRange(q.startDate, q.endDate)
        const openBal = getOpeningBalanceForLodgmentScope(
          scopeMode,
          q.startDate,
          viewPeriodId,
          financialPeriods,
          openingDirectorLoanBalance,
          metricsOpeningDirectorLoan
        )
        const result = computeBasLodgment(
          scoped,
          q.startDate,
          q.endDate,
          'quarterly',
          q.label,
          openBal,
          accountType,
          undefined,
          gstRegistered
        )
        return {
          periodKey: buildLodgmentPeriodKey('bas', q.financialYear, q.quarter),
          periodLabel: q.label,
          fields: result.fields,
          transactionCount: scoped.length,
        }
      })
  }, [
    isMonthlyBas,
    months,
    quarters,
    basFinancialYear,
    dateRepairedTransactions,
    statementScopeMode,
    scopeMode,
    lockedPeriodIds,
    viewPeriodId,
    financialPeriods,
    openingDirectorLoanBalance,
    metricsOpeningDirectorLoan,
    accountType,
    gstRegistered,
  ])

  const basCompareRows = useMemo(
    () => buildBasPeriodCompareRows(snapshots, basLivePeriods),
    [snapshots, basLivePeriods]
  )

  const basQuarterRanges = useMemo(() => {
    const map: Record<string, { start: string; end: string }> = {}
    for (const q of quarters.filter((q) => q.financialYear === basFinancialYear)) {
      map[buildLodgmentPeriodKey('bas', q.financialYear, q.quarter)] = {
        start: q.startDate,
        end: q.endDate,
      }
    }
    return map
  }, [quarters, basFinancialYear])

  const getQuarterTransactions = useCallback(
    (_periodKey: string, start: string, end: string) =>
      filterByDateRange(dateRepairedTransactions, start, end).map((tx) => ({
        date: tx.date,
        description: tx.description,
        debit: tx.debit,
        credit: tx.credit,
        category: tx.category,
      })),
    [dateRepairedTransactions]
  )

  const basCurrentPeriodKey = useMemo(() => {
    if (activeTab !== 'bas') return null
    if (isMonthlyBas && selectedMonth) {
      return buildLodgmentPeriodKey('bas', basFinancialYear, undefined, selectedMonth.periodId)
    }
    if (selectedQuarter) {
      return buildLodgmentPeriodKey('bas', selectedQuarter.financialYear, selectedQuarter.quarter)
    }
    return null
  }, [activeTab, isMonthlyBas, selectedMonth, selectedQuarter, basFinancialYear])

  const showMyTaxColumn = activeTab === 'annual' && accountType !== 'company'

  const panelGroupedFields = useMemo(
    () =>
      groupedFields.map(({ section, fields }) => ({
        section,
        fields,
      })),
    [groupedFields]
  )

  const handlePrint = () => window.print()

  const handleExportExcel = () => {
    if (!liveResult || viewingSnapshot) return
    exportBusinessLodgmentPack({
      accountType: accountType as 'company' | 'sole_trader',
      businessName: companyName || 'Business',
      financialYear: liveResult.kind === 'bas' ? basFinancialYear : financialYear,
      kind: liveResult.kind,
      periodLabel:
        liveResult.kind === 'bas'
          ? liveResult.periodLabel
          : liveResult.kind === 'ctr'
            ? `CTR FY ${liveResult.financialYear}`
            : `Annual FY ${liveResult.financialYear}`,
      periodStart: liveResult.periodStart,
      periodEnd: liveResult.periodEnd,
      fields: liveResult.fields,
      uncategorisedCount: liveResult.uncategorisedCount,
      ctrOptions:
        liveResult.kind === 'ctr'
          ? {
              taxRate: ctrTaxRate,
              nonDeductibleAddBacks: ctrAddBacks,
              lossCarryForward: ctrLossCarry,
              otherAdjustments: ctrOtherAdj,
            }
          : undefined,
      basSnapshots: snapshots.filter((s) => s.kind === 'bas'),
      basLivePeriods: liveResult.kind === 'bas' ? basLivePeriods : [],
    })
    setSnapshotMessage('Excel pack downloaded.')
    setTimeout(() => setSnapshotMessage(null), 3000)
  }

  const currentPeriodKey = useMemo(() => {
    if (activeTab === 'bas' && isMonthlyBas && selectedMonth) {
      return `BAS-${selectedMonth.periodId}`
    }
    if (activeTab === 'bas' && selectedQuarter) {
      return buildLodgmentPeriodKey('bas', selectedQuarter.financialYear, selectedQuarter.quarter)
    }
    if (activeTab === 'ctr') {
      return buildLodgmentPeriodKey('ctr', financialYear)
    }
    return buildLodgmentPeriodKey('annual', financialYear)
  }, [activeTab, selectedQuarter, selectedMonth, financialYear, isMonthlyBas])

  const preLodge = useMemo(() => {
    if (!liveResult || viewingSnapshot) return null
    const uncategorised =
      liveResult.kind === 'bas'
        ? liveResult.uncategorisedCount
        : liveResult.uncategorisedCount
    return buildPreLodgeChecklist({
      fields: liveResult.fields,
      validation: liveResult.validation,
      scopeSummary,
      uncategorisedCount: uncategorised,
      entered,
      kind: liveResult.kind,
      scopeMode,
      hasReviewedReports:
        accountType === 'company' || accountType === 'sole_trader'
          ? getReportsReviewed(financialYear, accountType)
          : undefined,
      businessExtras: {
        accountType:
          accountType === 'company' || accountType === 'sole_trader'
            ? accountType
            : undefined,
        hasPayrollActivity: hasPayrollActivity(scopedTransactions),
        ctrTaxRate: liveResult.kind === 'ctr' ? ctrTaxRate : undefined,
        ctrHasAdjustments:
          liveResult.kind === 'ctr' &&
          (ctrAddBacks > 0 || ctrLossCarry > 0 || ctrOtherAdj !== 0),
        basPeriodKeysInFy: basLivePeriods.map((p) => p.periodKey),
        basSnapshotsWithPeriod: basQuartersWithSnapshot(
          snapshots,
          basLivePeriods.map((p) => p.periodKey)
        ),
        gstRegistered,
      },
    })
  }, [
    liveResult,
    viewingSnapshot,
    scopeSummary,
    entered,
    scopeMode,
    scopedTransactions,
    ctrTaxRate,
    ctrAddBacks,
    ctrLossCarry,
    ctrOtherAdj,
    accountType,
    basLivePeriods,
    snapshots,
    financialYear,
    gstRegistered,
  ])

  const copyAllFields = async () => {
    if (!activeResult?.fields.length) return
    try {
      await navigator.clipboard.writeText(fieldsToTsv(activeResult.fields))
      setSnapshotMessage('All fields copied (TSV) — paste into a spreadsheet or notes.')
      setTimeout(() => setSnapshotMessage(null), 3000)
    } catch {
      window.prompt('Copy all fields:', fieldsToTsv(activeResult.fields))
    }
  }

  const saveSnapshot = async (finalize: boolean) => {
    if (!liveResult || accountType === 'individual') return

    if (finalize && scopeSummary.openMonthIds.length > 0) {
      const lockConfirm = window.confirm(
        `Finalize will lock ${scopeSummary.openMonthIds.length} open month(s): ${scopeSummary.openMonthIds.join(', ')}.\n\n` +
          'Transactions in those months will no longer be editable. Continue?'
      )
      if (!lockConfirm) return
    }

    setSnapshotBusy(true)
    setSnapshotMessage(null)
    try {
      await indexedDBStorage.init()

      if (finalize && scopeSummary.openMonthIds.length > 0) {
        const lockResult = await lockMonthsInLodgmentRange(
          reportingRange.start,
          reportingRange.end,
          transactions,
          new Set(lockedPeriodIds),
          openingDirectorLoanBalance,
          openingCashBalance
        )
        if (lockResult.failed.length > 0) {
          setSnapshotMessage(
            `Could not lock: ${lockResult.failed.join(', ')}. Snapshot not finalized.`
          )
          setSnapshotBusy(false)
          onPeriodsChanged?.()
          return
        }
        onPeriodsChanged?.()
      }

      const periodLabel =
        liveResult.kind === 'bas'
          ? liveResult.periodLabel
          : liveResult.kind === 'ctr'
            ? `CTR FY ${liveResult.financialYear}`
            : `Annual FY ${liveResult.financialYear}`

      await indexedDBStorage.saveLodgmentSnapshot({
        kind: liveResult.kind,
        periodKey: currentPeriodKey,
        periodLabel,
        periodStart: liveResult.periodStart,
        periodEnd: liveResult.periodEnd,
        accountType: accountType as 'company' | 'sole_trader',
        fields: liveResult.fields,
        entered,
        validation: liveResult.validation,
        finalizedAt: finalize ? new Date().toISOString() : null,
        preLodge: preLodge ? serializePreLodgeSummary(preLodge) : undefined,
      })
      await loadSnapshots()
      notifyLodgmentSnapshotSaved()
      setSnapshotMessage(
        finalize
          ? 'Finalized — open months locked and snapshot saved.'
          : 'Snapshot saved.'
      )
      setTimeout(() => setSnapshotMessage(null), 4000)
    } catch {
      setSnapshotMessage('Could not save snapshot. Refresh the page and try again.')
    } finally {
      setSnapshotBusy(false)
    }
  }

  const loadSnapshotById = async (id: string) => {
    setSnapshotBusy(true)
    try {
      const snap = await indexedDBStorage.getLodgmentSnapshot(id)
      if (snap) {
        setViewingSnapshot(snap)
        setActiveTab(snap.kind)
        setUserOverrodePeriod(true)
        if (snap.kind === 'bas') {
          if (snap.periodKey.startsWith('BAS-')) {
            setSelectedMonthKey(snap.periodKey.replace(/^BAS-/, ''))
          } else {
            setSelectedQuarterKey(snap.periodKey)
          }
        } else {
          const fy = snap.periodKey.replace(/^CTR-FY/, '').replace(/^FY/, '')
          setFinancialYear(fy)
        }
      }
    } finally {
      setSnapshotBusy(false)
    }
  }

  const deleteSnapshot = async (id: string) => {
    if (!window.confirm('Delete this saved snapshot?')) return
    await indexedDBStorage.deleteLodgmentSnapshot(id)
    if (viewingSnapshot?.id === id) setViewingSnapshot(null)
    await loadSnapshots()
  }

  if (!activeResult) {
    return (
      <div className="card text-center py-8 text-gray-500">
        No lodgment data available for the selected period.
      </div>
    )
  }

  return (
    <div id="ato-lodgment-section" className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="card border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white print:border print:bg-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-7 h-7 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">ATO Lodgment Guide</h2>
            </div>
            <p className="text-sm text-gray-600 max-w-2xl">
              Values are calculated from your SELPIC A ledger. Copy each amount into the matching
              field in the ATO portal — this app does not lodge on your behalf.
            </p>
            {(companyName || abn) && (
              <p className="text-xs text-gray-500 mt-2">
                {companyName && <span className="font-medium">{companyName}</span>}
                {abn && <span className="ml-2">ABN {abn}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={copyAllFields}
              disabled={!activeResult?.fields.length}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <ClipboardCopy className="w-4 h-4" />
              Copy all fields
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!liveResult || !!viewingSnapshot}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => saveSnapshot(false)}
              disabled={snapshotBusy || !!viewingSnapshot || !liveResult}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {snapshotBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save snapshot
            </button>
            <button
              type="button"
              onClick={() => saveSnapshot(true)}
              disabled={snapshotBusy || !!viewingSnapshot || !liveResult}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Archive className="w-4 h-4" />
              Finalize
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print entry sheet
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 print:text-xs">
          <strong>Preparation only.</strong> Verify all figures against your records before lodging
          in{' '}
          <a
            href="https://www.ato.gov.au/businesses-and-organisations/online-services"
            target="_blank"
            rel="noopener noreferrer"
            className="underline inline-flex items-center gap-1"
          >
            Online services for business
            <ExternalLink className="w-3 h-3" />
          </a>{' '}
          or{' '}
          <a
            href="https://my.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            myTax
          </a>
          . SELPIC A is not a registered tax agent.
        </div>
      </div>

      {snapshotMessage && (
        <div className="card py-2 px-4 text-sm text-green-800 bg-green-50 border border-green-200 print:hidden">
          {snapshotMessage}
        </div>
      )}

      {viewingSnapshot && (
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-blue-50 border-blue-200 print:hidden">
          <p className="text-sm text-blue-900">
            Viewing saved snapshot · {viewingSnapshot.periodLabel} ·{' '}
            {formatDateAustralian(viewingSnapshot.updatedAt)}
            {viewingSnapshot.finalizedAt && (
              <span className="ml-2 text-xs font-medium text-blue-700">(Finalized)</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setViewingSnapshot(null)}
            className="text-sm text-blue-700 underline hover:text-blue-900"
          >
            Back to live data
          </button>
        </div>
      )}

      {/* Saved snapshots */}
      {snapshots.length > 0 && (
        <div className="card print:hidden">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Saved snapshots</h3>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {snapshots.map((snap) => (
              <li
                key={snap.id}
                className="flex items-center justify-between gap-2 text-sm border border-gray-100 rounded-md px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => loadSnapshotById(snap.id)}
                  className="text-left hover:text-indigo-700 flex-1"
                >
                  <span className="font-medium">{snap.periodLabel}</span>
                  <span className="text-gray-500 ml-2 text-xs uppercase">{snap.kind}</span>
                  {snap.finalizedAt && (
                    <span className="ml-2 text-xs text-green-700">Finalized</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSnapshot(snap.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs + period */}
      <div className="card print:hidden">
        {!gstRegistered && (
          <div className="mb-4 p-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-800">
            <strong>Not GST registered.</strong> BAS lodgment is not required — use{' '}
            {accountType === 'company' ? 'Company CTR' : 'Annual income (myTax)'} below for your
            tax return preparation.
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {gstRegistered && (
          <button
            type="button"
            onClick={() => setActiveTab('bas')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'bas'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            BAS ({isMonthlyBas ? 'monthly' : 'quarterly'})
          </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'annual'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Annual income ({accountType === 'company' ? 'myTax N/A' : 'myTax business'})
          </button>
          {accountType === 'company' && (
            <button
              type="button"
              onClick={() => setActiveTab('ctr')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'ctr'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Company CTR
            </button>
          )}
        </div>

        {activeTab === 'bas' ? (
          isMonthlyBas ? (
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-gray-600">BAS month:</label>
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {months.map((m) => (
                  <option key={m.periodId} value={m.periodId}>
                    {m.label} ({formatDateAustralian(m.startDate)} –{' '}
                    {formatDateAustralian(m.endDate)})
                  </option>
                ))}
              </select>
              <span className="text-xs text-indigo-600">GST cycle: Monthly (Settings)</span>
            </div>
          ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">BAS period:</label>
            <select
              value={selectedQuarterKey}
              onChange={(e) => {
                setUserOverrodePeriod(true)
                setSelectedQuarterKey(e.target.value)
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {quarters.map((q) => (
                <option key={`${q.financialYear}-Q${q.quarter}`} value={`${q.financialYear}-Q${q.quarter}`}>
                  {q.label} ({formatDateAustralian(q.startDate)} – {formatDateAustralian(q.endDate)})
                </option>
              ))}
            </select>
          </div>
          )
        ) : activeTab === 'ctr' ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">Financial year (CTR):</label>
            <select
              value={financialYear}
              onChange={(e) => {
                setUserOverrodePeriod(true)
                setFinancialYear(e.target.value)
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">Financial year:</label>
            <select
              value={financialYear}
              onChange={(e) => {
                setUserOverrodePeriod(true)
                setFinancialYear(e.target.value)
              }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Period: {formatDateAustralian(activeResult.periodStart)} –{' '}
          {formatDateAustralian(activeResult.periodEnd)}
          {activeTab === 'bas' && basResult && ` · ${basResult.periodLabel}`}
          {activeTab === 'ctr' && ` · CTR FY ${financialYear}`}
          {activeTab === 'annual' && ` · FY ${financialYear}`}
        </p>
        <p className="text-xs text-indigo-700 mt-1">
          Suggested from statements / Dashboard month: BAS{' '}
          <strong>{preferredPeriod.basLabel}</strong> (
          {formatDateAustralian(preferredPeriod.basStart)} –{' '}
          {formatDateAustralian(preferredPeriod.basEnd)}) · FY{' '}
          <strong>{preferredPeriod.financialYear}</strong>
          {viewPeriodId ? <> · Dashboard <strong>{viewPeriodId}</strong></> : null}
          {userOverrodePeriod ? (
            <>
              {' '}
              ·{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setUserOverrodePeriod(false)
                  setSelectedQuarterKey(preferredPeriod.quarterKey)
                  setFinancialYear(preferredPeriod.financialYear)
                }}
              >
                Reset to suggested
              </button>
            </>
          ) : null}
        </p>

        {activeTab === 'ctr' && accountType === 'company' && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-800">CTR tax settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-xs text-gray-600">
                Company tax rate
                <select
                  value={ctrTaxRate}
                  onChange={(e) => setCtrTaxRate(Number(e.target.value))}
                  className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value={0.25}>25% — base rate entity</option>
                  <option value={0.3}>30% — standard rate</option>
                </select>
              </label>
              <label className="text-xs text-gray-600">
                Non-deductible add-backs ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ctrAddBacks || ''}
                  onChange={(e) => setCtrAddBacks(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Prior year losses applied ($)
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={ctrLossCarry || ''}
                  onChange={(e) => setCtrLossCarry(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Other adjustments ($)
                <input
                  type="number"
                  step={0.01}
                  value={ctrOtherAdj || ''}
                  onChange={(e) => setCtrOtherAdj(Number(e.target.value) || 0)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <LodgmentCollapsibleSection
        title="Lodgment calendar"
        summary="What to lodge, where in ATO, and which tab to use — expand for steps"
        defaultOpen={false}
      >
        <LodgmentCalendar
          items={calendarItems}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          embedded
        />
      </LodgmentCollapsibleSection>

      {!viewingSnapshot && (
        <LodgmentCollapsibleSection
          title="Other ATO obligations"
          summary="Payroll / FBT reminders — expand if you pay staff or provide fringe benefits"
          defaultOpen={false}
        >
          <OtherAtoObligations transactions={scopedTransactions} embedded />
        </LodgmentCollapsibleSection>
      )}

      {/* Period lock & data scope — aligned with Dashboard / Settings */}
      {!viewingSnapshot && (
        <LodgmentCollapsibleSection
          title="Period lock & data scope"
          summary={`Using ${scopedTransactions.length} of ${scopeSummary.totalInRange} txs · ${scopeModeLabel(scopeMode)}`}
          defaultOpen={false}
          className="border-indigo-100"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {scopeSummary.allMonthsLocked && scopeSummary.totalInRange > 0 && (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                    All months locked
                  </span>
                )}
              </div>

              {viewPeriodId && (
                <p className="text-sm text-indigo-800 mb-2 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Dashboard period: <strong>{viewPeriodId}</strong>
                  {viewingPeriod?.isLocked && (
                    <span className="inline-flex items-center gap-1 text-red-700 text-xs ml-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {scopeSummary.months.map((m) => (
                  <span
                    key={m.periodId}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                      m.isLocked
                        ? 'bg-gray-100 border-gray-300 text-gray-700'
                        : m.hasTransactions
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    {m.isLocked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                    {m.periodId}
                    {m.transactionCount > 0 && (
                      <span className="opacity-70">({m.transactionCount})</span>
                    )}
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-600">
                Using <strong>{scopedTransactions.length}</strong> of{' '}
                <strong>{scopeSummary.totalInRange}</strong> transactions in this reporting range
                · {scopeModeLabel(scopeMode)}
                {matchUploadedStatement
                  ? ' · P&L period: all saved statements + Add Cash Expense (aligned with Biz Intel)'
                  : ''}
              </p>
            </div>

            <div className="lg:w-64 shrink-0">
              <label className="block text-sm text-gray-600 mb-1">Data scope</label>
              <select
                value={scopeMode}
                onChange={(e) => handleScopeModeChange(e.target.value as LodgmentScopeMode)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="full">Full reporting period</option>
                <option value="locked_only">Locked periods only</option>
                {viewPeriodId && dashboardMonthInRange && (
                  <option value="dashboard_month">
                    Dashboard month ({viewPeriodId})
                  </option>
                )}
              </select>
              {scopeMode === 'locked_only' && (
                <p className="text-xs text-gray-500 mt-1">
                  Matches closed months — recommended before lodging.
                </p>
              )}
            </div>
          </div>
        </LodgmentCollapsibleSection>
      )}

      {/* Print-only period header */}
      <div className="hidden print:block text-sm text-gray-700 mb-2">
        <strong>ATO Lodgment Entry Sheet</strong>
        {' · '}
        {activeTab === 'bas'
          ? `BAS ${basResult?.periodLabel}`
          : activeTab === 'ctr'
            ? `CTR FY ${financialYear}`
            : `Annual FY ${financialYear}`}
        {' · '}
        {formatDateAustralian(activeResult.periodStart)} –{' '}
        {formatDateAustralian(activeResult.periodEnd)}
      </div>

      {/* Validation */}
      {(!activeResult.validation.ok || activeResult.validation.warnings.length > 0) && (
        <div className="space-y-2 print:hidden">
          {activeResult.validation.errors.map((msg) => (
            <div
              key={msg}
              className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {msg}
            </div>
          ))}
          {activeResult.validation.warnings.map((msg) => (
            <div
              key={msg}
              className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      <div
        className={`card flex flex-wrap items-center justify-between gap-3 print:hidden ${
          allEntered ? 'bg-green-50 border-green-200' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {allEntered ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <FileText className="w-5 h-5 text-indigo-600" />
          )}
          <span className="text-sm font-medium">
            {enteredCount} of {totalFields} fields marked as entered in ATO
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFieldViewMode('ato_order')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              fieldViewMode === 'ato_order'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ATO entry order
          </button>
          <button
            type="button"
            onClick={() => setFieldViewMode('grouped')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              fieldViewMode === 'grouped'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            By section
          </button>
        </div>
        {allEntered && (
          <span className="text-sm text-green-700 font-medium w-full sm:w-auto">
            Ready to lodge in ATO portal
          </span>
        )}
      </div>

      <LodgmentCollapsibleSection
        title="Pre-lodge checklist"
        summary={
          preLodge?.readyToLodge
            ? 'Ready to lodge — expand for checklist detail'
            : `${preLodge?.items.filter((i) => i.severity === 'required' && !i.passed).length ?? 0} required item(s) still open — expand to review`
        }
        defaultOpen={false}
      >
        <PreLodgeChecklistPanel
          checklist={viewingSnapshot?.preLodge ?? preLodge}
          embedded
          frozenLabel={
            viewingSnapshot?.preLodge
              ? `Checklist frozen at snapshot save (${new Date(viewingSnapshot.preLodge.savedAt).toLocaleString()})`
              : undefined
          }
        />
      </LodgmentCollapsibleSection>

      {activeTab === 'bas' && basResult && !viewingSnapshot && (
        <BasPeriodSummaryCard result={basResult} />
      )}

      {activeTab === 'annual' && annualResult && !viewingSnapshot && (
        <AnnualIncomeSummaryCard result={annualResult} />
      )}

      {activeTab === 'bas' && !viewingSnapshot && basCompareRows.length > 0 && (
        <BasSnapshotComparePanel
          financialYear={basFinancialYear}
          rows={basCompareRows}
          currentPeriodKey={basCurrentPeriodKey}
          onLoadSnapshot={(snap) => loadSnapshotById(snap.id)}
          onUpdateCurrentSnapshot={() => saveSnapshot(false)}
          updateBusy={snapshotBusy}
          getQuarterTransactions={getQuarterTransactions}
          quarterRanges={basQuarterRanges}
        />
      )}

      {activeTab === 'ctr' && ctrResult && !viewingSnapshot && (
        <CtrSummaryCard result={ctrResult} taxRate={ctrTaxRate} />
      )}

      <LodgmentFieldPanel
        orderedFields={orderedFields}
        groupedFields={panelGroupedFields}
        fieldViewMode={fieldViewMode}
        entered={entered}
        onToggleEntered={toggleEntered}
        selectedField={selectedField ?? null}
        onSelectField={setSelectedFieldId}
        copiedId={copiedId}
        onCopyField={copyAmount}
        readOnlyAmounts
        showMyTaxLabel={showMyTaxColumn}
        fieldColumnLabel="ATO field"
        orderTitle="ATO entry order"
        orderHint={`Fields sorted as on the ${activeTab === 'annual' ? 'myTax' : 'OSB'} form — enter top to bottom.`}
        sectionTitle={(s) => sectionTitle(s as LodgmentField['section'])}
        portalTitle="Where to enter in ATO"
      />

      <ReportFooter />
    </div>
  )
}

import { useState, useEffect, useMemo, useCallback } from 'react'
import { strings } from '@/lib/i18n/strings'
import {
  loadAllTransactions as loadCanonicalTransactions,
  syncLegacyTransactionCache,
} from '@/lib/storage/load-all-transactions'
import { filterBankAdvisoryTransactions } from '@/lib/classification/bank-advisory'
import { normalizeCorporateTransactions } from '@/lib/classification/company-account'
import { applyKnownExpenseCategoriesIfMissing } from '@/lib/classification/apply-known-expense-categories'
import { applyKnownPurchaseGstTags } from '@/lib/gst/apply-known-purchase-gst'
import { repairUsMisparsedAustralianDates } from '@/lib/utils/repair-us-misparsed-au-dates'
import { repairStatementDateAnomalies } from '@/lib/utils/repair-statement-date-anomalies'
import { toIsoDateString } from '@/lib/utils/parse-transaction-date'
import { getCurrentFinancialYearRange } from '@/lib/ato-lodgment/compute-lodgment'
import {
  resolveReportingBasQuarter,
  resolveReportingFinancialYearRange,
} from '@/lib/utils/reporting-period-resolve'
import {
  applyLodgmentScope,
  getOpeningBalanceForLodgmentScope,
  getStoredScopeMode,
  setStoredScopeMode,
  ACCOUNTING_SCOPE_MODE_CHANGED,
  type LodgmentScopeMode,
} from '@/lib/ato-lodgment/period-scope'
import { PAYMENT_SUMMARY_UPDATED_EVENT } from '@/components/Individual/PaymentSummaryForm'
import { useJourneyReportsReview } from '@/hooks/useJourneyReportsReview'
import { usePayrollOnlyRedirect } from '@/hooks/usePayrollOnlyRedirect'
import { syncIncomingOrders } from '@/lib/dashboard/sync-incoming-orders'
import type { ClassifiedTransaction, DashboardTab } from '@/lib/dashboard/types'
import { LODGMENT_SNAPSHOT_SAVED_EVENT } from '@/lib/ato-lodgment/lodgment-events'
import type { JourneyNavigateTarget } from '@/lib/journey/types'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import {
  evaluateRecoverEligibility,
  filterRowsForStatementRecover,
  isRecoveredCacheStatement,
} from '@/lib/storage/recovered-statement'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { exportToExcel, exportSummary, ExportTransaction } from '@/lib/excel-export'
import {
  resolveStatementForExcelExport,
  type StatementExportRow,
} from '@/lib/excel-export/statement-scoped-export'
import { patchStatementTransactions, preferPeriodScopedRows } from '@/lib/storage/statement-transaction-scope'
import { generateBASReport, exportBASToExcel } from '@/lib/payg-withholding/bas-reporter'
import { calculateFinancialSummary } from '@/lib/utils/financial-summary'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import {
  loadDirectorLoanAdvanceSettings,
  resolvePriorPeriodDirectorAdvances,
  resolvePriorAdvancesForScopedWindow,
  saveDirectorLoanAdvanceSettings,
  sumDirectorLoanInjectionCredits,
  sumDirectorReimbursementDebits,
} from '@/lib/classification/directors-loan-balance'
import {
  computeDirectorsLoanOpeningAtRangeStart,
  transactionsBeforeDate,
} from '@/lib/classification/directors-loan-opening'
import { hydrateFundedByDirectorOnLedger } from '@/lib/cash-expense/funded-by-director'
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
  setViewPeriodIdInStorage,
} from '@/lib/period-management/period-lock'
import {
  pickEarliestPeriodWithTransactions,
  getDistinctPeriodIdsFromTransactions,
  readLegacyTransactionCache,
  requestTransactionHistoryExpand,
} from '@/lib/dashboard/transaction-history-ui'
import {
  type DashboardViewPeriod,
  filterTransactionsForDateRange,
  firstMonthPeriodId,
  getDefaultViewPeriod,
  getTransactionDateBounds,
  getViewPeriodFromStorage,
  inferViewPeriodFromTransactions,
  mergeManualCashExpenses,
  migrateLegacyViewPeriodId,
  setViewPeriodInStorage,
  viewPeriodMatchesRange,
} from '@/lib/dashboard/view-period-range'
import {
  buildStableTransactionId,
  buildTransactionFingerprint,
} from '@/lib/dashboard/transaction-dedupe'
import { findUserMapping, getUserMappings } from '@/lib/storage/user-mappings'
import { resolveCompanyTaxRate } from '@/lib/ato-lodgment/business-profile-tax'
import {
  getClassificationMode,
  getJourneyPreferences,
  saveClassificationMode,
  type ClassificationMode,
  JOURNEY_PREFS_UPDATED_EVENT,
} from '@/lib/journey/journey-preferences'
import {
  findLedgerTransactionIndex,
  findLedgerTransactionIndexByAmountDescription,
} from '@/lib/dashboard/find-ledger-transaction-index'
import { extractSSOToken, saveSSOToken, getSSOToken } from '@/lib/sso-handler'

/** OCR / AU date repairs before persist, period align, and P&L filters. */
function repairLedgerTransactionDates<T extends { date: string }>(txs: T[]): T[] {
  return repairUsMisparsedAustralianDates(repairStatementDateAnomalies(txs))
}

/** Category repair + known GST claim tags (Hanaone free, Crazy Domains claim, …). */
function hydrateLedgerTransactions<T extends ClassifiedTransaction>(txs: T[]): T[] {
  return applyKnownPurchaseGstTags(applyKnownExpenseCategoriesIfMissing(txs)) as T[]
}

export function useAccountingDashboard() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [userApiKey, setUserApiKey] = useState<string>('') // User's own API key
  const [directorName, setDirectorName] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setToast] = useState<{ message: string; type: 'warning' | 'error' | 'success' } | null>(null)
  const [statementHistory, setStatementHistory] = useState<any[]>([])
  /** True after first History IndexedDB read finishes (success or failure). */
  const [historyHydrated, setHistoryHydrated] = useState(false)
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null)
  /** Last uploaded/loaded statement rows only — used for Excel so History merge cannot leak */
  const [exportStatementSnapshot, setExportStatementSnapshot] = useState<{
    statementId: string
    fileName: string
    period: { startDate: string; endDate: string }
    transactions: ClassifiedTransaction[]
  } | null>(null)
  const [storageSize, setStorageSize] = useState<number>(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    // URL 파라미터에서 탭 읽기
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      // hr (기존 payroll), compliance는 별도 탭으로 처리
      if (tabParam === 'hr' || tabParam === 'payroll') {
        return 'hr' // payroll도 hr로 리다이렉트
      }
      if (tabParam === 'compliance') {
        return 'reports' // compliance BAS section
      }
      if (tabParam === 'ato') {
        return 'ato'
      }
      if (tabParam === 'reports' || tabParam === 'dashboard' || tabParam === 'history' || tabParam === 'settings') {
        return tabParam as 'dashboard' | 'history' | 'settings' | 'reports'
      }
    }
    return 'dashboard'
  })

  usePayrollOnlyRedirect(activeTab, setActiveTab)

  useEffect(() => {
    const handleEmployeeLoginSuccess = () => setActiveTab('hr')
    window.addEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
    return () => window.removeEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
  }, [])

  // 특정 섹션으로 스크롤하기 위한 상태
  const [scrollToSection, setScrollToSection] = useState<string | null>(null)
  const [loadSuccessMessage, setLoadSuccessMessage] = useState<string | null>(null)
  const [duplicateFileDialog, setDuplicateFileDialog] = useState<{ fileName: string; existingId: string } | null>(null)
  const [sessionApiCost, setSessionApiCost] = useState<number>(0) // Track API cost for current session
  const [appendMode, setAppendMode] = useState<boolean>(false) // Append transactions instead of replacing
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false) // PIN lock state
  const [setupComplete, setSetupComplete] = useState<boolean>(false) // Setup wizard completion
  const [companyInfo, setCompanyInfo] = useState<{ name: string; abn?: string; acn?: string }>({
    name: COMPANY_LEGAL.companyName,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn,
  })
  const [accountType, setAccountType] = useState<'individual' | 'company' | 'sole_trader'>('individual')
  const [paymentSummaryCount, setPaymentSummaryCount] = useState(0)
  const [hasLodgmentSnapshot, setHasLodgmentSnapshot] = useState(false)
  const [gstRegistered, setGstRegistered] = useState(true)
  const [gstReportingCycle, setGstReportingCycle] = useState<'Monthly' | 'Quarterly'>('Quarterly')
  const [companyTaxRate, setCompanyTaxRate] = useState(0.25)
  const [skipPaymentSummary, setSkipPaymentSummary] = useState(false)
  const [classificationMode, setClassificationMode] = useState<ClassificationMode>('ai')

  // ✅ SSO 토큰 처리 및 탭 설정
  useEffect(() => {
    // 쿠키에서 SSO 토큰 확인 (middleware에서 저장된 토큰)
    const getCookieToken = () => {
      if (typeof document === 'undefined') return null
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === 'selpic_sso_token') {
          try {
            return JSON.parse(decodeURIComponent(value))
          } catch {
            return null
          }
        }
      }
      return null
    }

    // URL에서 SSO 토큰 추출 (fallback)
    const urlToken = extractSSOToken()
    // 쿠키에서 SSO 토큰 추출 (middleware에서 저장된 경우)
    const cookieToken = getCookieToken()
    
    const token = cookieToken || urlToken
    
    if (token) {
      // 토큰 저장
      saveSSOToken(token)
      console.log('✅ SSO token received:', token.username, token.role, token.permissions)
      
      // 관리자 토큰이면 PIN 잠금 건너뛰기
      if (token.role === 'admin' || token.role === 'super_admin' || token.accessType === 'admin') {
        console.log('✅ Admin token detected, bypassing PIN lock')
        setIsUnlocked(true)
      }
      
      // 권한별 리다이렉트 처리
      const isAccountingManager = token.role === 'super_admin' || 
                                  token.permissions.includes('accounting:admin') ||
                                  token.permissions.includes('accounting:full')
      const isPayrollOnly = !isAccountingManager && (
        token.permissions.includes('payroll:read') || 
        token.permissions.includes('payroll:access')
      )
      
      // URL 파라미터 확인
      const urlParams = new URLSearchParams(window.location.search)
      const payrollOnlyParam = urlParams.get('payrollOnly')
      
      if (isPayrollOnly || payrollOnlyParam === 'true') {
        console.log('🔄 Redirecting to My Payroll page (Payroll Access Only)')
        setActiveTab('hr')
      } else if (isAccountingManager) {
        // 슈퍼 관리자 & 회계 관리자: Accounting Dashboard Home (기본 탭)
        console.log('🔄 Full access - Accounting Dashboard Home')
        // tab 파라미터가 없으면 dashboard로 설정
        const tabParam = urlParams.get('tab')
        if (!tabParam) {
          setActiveTab('dashboard')
        }
      }
    }
    
    // 탭 변경 이벤트 리스너
    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail as 'dashboard' | 'history' | 'settings' | 'reports' | 'ato' | 'hr'
      setActiveTab(tab)
    }
    window.addEventListener('changeTab', handleTabChange as EventListener)
    
    // URL 파라미터에서 탭 읽기 및 설정
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      
      if (tabParam) {
        // 특정 탭/섹션으로 이동
        if (tabParam === 'hr' || tabParam === 'payroll') {
          // HR (기존 Payroll) 탭으로 이동
          setActiveTab('hr')
        } else if (tabParam === 'compliance') {
          // Compliance is Reports tab BAS/GST section
          setActiveTab('reports')
          setScrollToSection('bas-gst')
        } else if (tabParam === 'ato') {
          setActiveTab('ato')
        } else if (tabParam === 'dashboard') {
          // Dashboard는 Transaction Manager로 이동
          setActiveTab('dashboard')
          setScrollToSection('transaction-manager')
        } else if (tabParam === 'reports' || tabParam === 'history' || tabParam === 'settings') {
          setActiveTab(tabParam as 'dashboard' | 'history' | 'settings' | 'reports')
        }
        
        // URL에서 tab 파라미터 제거 (깔끔한 URL 유지)
        const url = new URL(window.location.href)
        url.searchParams.delete('tab')
        if (token) {
          url.searchParams.delete('token')
        }
        window.history.replaceState({}, '', url.toString())
      } else if (token) {
        // 토큰만 있고 탭이 없으면 URL 정리
        const url = new URL(window.location.href)
        url.searchParams.delete('token')
        window.history.replaceState({}, '', url.toString())
      }
    }
    
    return () => {
      window.removeEventListener('changeTab', handleTabChange as EventListener)
    }
  }, [])

  // Check if setup is complete
  useEffect(() => {
    const checkSetup = () => {
      const setupCompleteFlag = localStorage.getItem('selpic_setup_complete')
      if (setupCompleteFlag === 'true') {
        setSetupComplete(true)
      } else {
        // Check if business profile exists
        indexedDBStorage.init().then(async () => {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          // Individual users don't need companyName/ABN
          if (profile.accountType === 'individual') {
            if (profile.individualName) {
              setSetupComplete(true)
              localStorage.setItem('selpic_setup_complete', 'true')
            } else {
              setSetupComplete(false)
            }
          } else {
            if (profile.companyName && profile.abn) {
              setSetupComplete(true)
              localStorage.setItem('selpic_setup_complete', 'true')
            } else {
              setSetupComplete(false)
            }
          }
        } else {
          setSetupComplete(false)
        }
        }).catch(() => {
          setSetupComplete(false)
        })
      }
    }
    checkSetup()
  }, [])

  // Load Business Profile on mount
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        await indexedDBStorage.init()
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          // Set account type FIRST
          const currentAccountType = profile.accountType || 'individual'
          setAccountType(currentAccountType)
          
          // Set company info based on account type
          if (currentAccountType === 'individual') {
            setCompanyInfo({
              name: profile.individualName || 'Individual User',
              abn: undefined,
              acn: undefined,
            })
          } else {
            setCompanyInfo({
              name: profile.companyName || localStorage.getItem('selpic_company_name') || COMPANY_LEGAL.companyName,
              abn: profile.abn || localStorage.getItem('selpic_abn') || COMPANY_LEGAL.abn,
              acn: profile.acn || localStorage.getItem('selpic_acn') || COMPANY_LEGAL.acn,
            })
          }
          setGstRegistered(profile.gstRegistered !== false)
          setGstReportingCycle(profile.gstReportingCycle || 'Quarterly')
          setCompanyTaxRate(resolveCompanyTaxRate(profile))
        } else {
          // Fallback to localStorage if profile doesn't exist
          const savedName = localStorage.getItem('selpic_company_name')
          const savedABN = localStorage.getItem('selpic_abn')
          const savedACN = localStorage.getItem('selpic_acn')
          if (savedName && savedABN) {
            // If we have company info in localStorage, assume company type
            setAccountType('company')
            setCompanyInfo({
              name: savedName,
              abn: savedABN,
              acn: savedACN || undefined,
            })
          } else {
            // Default to individual if no profile exists
            setAccountType('individual')
            setCompanyInfo({
              name: 'Individual User',
              abn: undefined,
              acn: undefined,
            })
          }
        }
      } catch (err) {
        console.error('Failed to load business profile:', err)
      }
    }
    loadBusinessProfile()
    
    // Listen for business profile updates
    const handleProfileUpdate = () => {
      console.log('[Main] Business profile updated event received')
      loadBusinessProfile()
    }
    window.addEventListener('businessProfileUpdated', handleProfileUpdate)
    
    return () => {
      window.removeEventListener('businessProfileUpdated', handleProfileUpdate)
    }
  }, [])

  useEffect(() => {
    setClassificationMode(getClassificationMode())
    setSkipPaymentSummary(!!getJourneyPreferences().skipPaymentSummary)
    const onPrefs = () => setSkipPaymentSummary(!!getJourneyPreferences().skipPaymentSummary)
    window.addEventListener(JOURNEY_PREFS_UPDATED_EVENT, onPrefs)
    return () => window.removeEventListener(JOURNEY_PREFS_UPDATED_EVENT, onPrefs)
  }, [])

  // Load API key, Director name and initialize IndexedDB on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    if (savedKey) {
      setApiKey(savedKey)
    }
    
    const savedUserApiKey = localStorage.getItem('user_openai_api_key')
    if (savedUserApiKey) {
      setUserApiKey(savedUserApiKey)
    }
    
    const savedDirectorName = localStorage.getItem('director_name')
    if (savedDirectorName) {
      setDirectorName(savedDirectorName)
    }

    // Load transactions from localStorage (hydrate state) — drop stale payroll journals
    const savedTransactions = localStorage.getItem('accounting_transactions')
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const withoutStalePayroll = parsed.filter(
            (tx: any) => tx?.source !== 'payroll' && !tx?.isPayrollTransaction
          )
          const hydrated = hydrateLedgerTransactions(
            normalizeCorporateTransactions(
              filterBankAdvisoryTransactions(withoutStalePayroll),
              accountType as 'individual' | 'company' | 'sole_trader'
            )
          ) as unknown as ClassifiedTransaction[]
          syncLegacyTransactionCache(hydrated)
          setTransactions(hydrated)
          console.log(
            '[Frontend] Loaded transactions from localStorage:',
            hydrated.length,
            `(stripped ${parsed.length - withoutStalePayroll.length} stale payroll)`
          )
        }
      } catch (err) {
        console.error('[Frontend] Failed to parse saved transactions:', err)
      }
    }

    // Listen for transactions updated event (from timesheet approval or payslip deletion)
    const handleTransactionsUpdated = async (event?: Event) => {
      const detail = (event as CustomEvent)?.detail
      console.log('[Frontend] 🔄 Transactions updated event received:', detail)
      console.log('[Frontend] Reloading all transactions to update Real-Time P&L View...')
      
      // Force a small delay to ensure IndexedDB operations are complete
      await new Promise(resolve => setTimeout(resolve, 300))
      
      await loadAllTransactions()
      
      console.log('[Frontend] ✅ Transactions reloaded, Real-Time P&L View should be updated')
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('transactionsUpdated', handleTransactionsUpdated)
    }

    // Load opening balance from localStorage (non-blocking hint only)
    const savedOpeningBalance = localStorage.getItem('opening_director_loan_balance') ?? ''
    if (savedOpeningBalance) {
      try {
        const parsed = parseFloat(savedOpeningBalance)
        if (Number.isNaN(parsed)) {
          console.warn('[Frontend] opening_director_loan_balance is not a number')
        }
      } catch (err) {
        console.error('[Frontend] Failed to parse saved opening balance:', err)
      }
    }

    // MUST run before the effect cleanup `return` — otherwise History stays empty forever
    // while Run audit (direct IndexedDB read) still shows statements.
    if (setupComplete) {
      indexedDBStorage
        .init()
        .then(async () => {
          await loadAllTransactions()
          await loadStatementHistory()
          syncIncomingOrders()
        })
        .catch((err) => {
          console.error('Failed to initialize IndexedDB:', err)
        })
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('transactionsUpdated', handleTransactionsUpdated)
      }
    }
  }, [setupComplete])

  // History list is React state; re-read IndexedDB whenever the tab opens
  // (covers cases where mount load was skipped or state was stale).
  useEffect(() => {
    if (!setupComplete || activeTab !== 'history') return
    void loadStatementHistory()
  }, [activeTab, setupComplete])

  // 🔧 주기적으로 새로운 주문 확인 (3초마다)
  useEffect(() => {
    if (!setupComplete) return
    
    const ordersCheckInterval = setInterval(() => {
      syncIncomingOrders()
    }, 3000)
    
    // Cleanup on unmount
    return () => {
      clearInterval(ordersCheckInterval)
    }
  }, [setupComplete])

  // Check for incoming orders from homepage
  // 🔧 UPDATED: API 응답과 localStorage 모두 확인하여 IndexedDB에 저장
  // Load cash expenses and merge with transactions
  const loadCashExpenses = async () => {
    try {
      const cashExpenses = await indexedDBStorage.getAllCashExpenses()
      
      // Convert cash expenses to transaction format
      const cashTransactions = hydrateLedgerTransactions(
        cashExpenses.map((expense: any) => ({
          id: expense.id,
          date: expense.date,
          description: expense.merchant || expense.description || 'Cash Expense',
          debit: expense.amount,
          credit: 0,
          balance: 0,
          category: expense.category || 'CASH_EXPENSE_PETTY',
          confidence: 'Manual' as const,
          department: expense.department || 'cleaning',
          source: 'manual' as const,
          receiptImageId: expense.receiptImageId,
          gstInfo: expense.gstInfo,
          paidBy: expense.paidBy,
          fundedByDirector: expense.fundedByDirector,
        }))
      )
      
      // Merge with existing transactions
      setTransactions((prev) => {
        // Remove existing manual entries to avoid duplicates
        const bankTransactions = prev.filter((tx) => (tx as any).source !== 'manual')
        return [...bankTransactions, ...cashTransactions]
      })
    } catch (err) {
      console.error('Failed to load cash expenses:', err)
    }
  }

  // Load statement history
  const loadStatementHistory = async () => {
    try {
      const statements = await indexedDBStorage.getAllStatements()
      setStatementHistory(statements)
      setHistoryLoadError(null)
      
      // Calculate storage size
      const size = await indexedDBStorage.getStorageSize()
      setStorageSize(size)
      
      // Auto-cleanup: Keep only last 20 statements
      if (statements.length > 20) {
        await indexedDBStorage.keepRecentStatements(20)
        // Reload after cleanup
        const updatedStatements = await indexedDBStorage.getAllStatements()
        setStatementHistory(updatedStatements)
        const updatedSize = await indexedDBStorage.getStorageSize()
        setStorageSize(updatedSize)
      }
    } catch (err) {
      console.error('Failed to load statement history:', err)
      setHistoryLoadError(
        err instanceof Error
          ? `Could not read Statement History: ${err.message}`
          : 'Could not read Statement History from this browser.'
      )
    } finally {
      setHistoryHydrated(true)
    }
  }

  const recoverableCacheRows = useMemo(() => {
    const raw =
      transactions.length > 0
        ? transactions
        : (readLegacyTransactionCache() as unknown as ClassifiedTransaction[])
    return filterRowsForStatementRecover(raw)
  }, [transactions])

  const unsavedCacheTransactionCount = useMemo(() => {
    const eligibility = evaluateRecoverEligibility({
      historyHydrated,
      statements: statementHistory,
      recoverableCacheCount: recoverableCacheRows.length,
    })
    return eligibility.showBanner ? recoverableCacheRows.length : 0
  }, [historyHydrated, statementHistory, recoverableCacheRows])

  const recoverTransactionsFromBrowserCache = async () => {
    try {
      await indexedDBStorage.init()
      const existing = await indexedDBStorage.getAllStatements()
      const bankRows = filterRowsForStatementRecover(
        transactions.length > 0
          ? transactions
          : (readLegacyTransactionCache() as unknown as ClassifiedTransaction[])
      )
      const eligibility = evaluateRecoverEligibility({
        historyHydrated: true,
        statements: existing,
        recoverableCacheCount: bankRows.length,
      })
      if (!eligibility.allowRecover) {
        setError(
          eligibility.blockReason ||
            'No cached bank transactions found in this browser. Please upload your statement file again.'
        )
        return
      }
      const txs = bankRows
      const label = `recovered_${new Date().toISOString().slice(0, 10)}_${txs.length}tx`
      const id = await indexedDBStorage.saveStatement({
        bankName: 'Recovered',
        fileName: `${label}.cache`,
        period: { startDate: '', endDate: '' },
        openingBalance: 0,
        closingBalance: 0,
        transactions: txs,
      })
      setCurrentStatementId(id)
      setExportStatementSnapshot({
        statementId: id,
        fileName: `${label}.cache`,
        period: { startDate: '', endDate: '' },
        transactions: [...txs],
      })
      await loadStatementHistory()
      await loadAllTransactions()
      revealUploadedTransactions(txs)
      setLoadSuccessMessage(
        `Recovered ${txs.length} transaction${txs.length === 1 ? '' : 's'} into Statement History (no re-parse).`
      )
      setActiveTab('dashboard')
      setTimeout(() => setLoadSuccessMessage(null), 6000)
    } catch (err) {
      console.error('[Frontend] Failed to recover from browser cache:', err)
      setError(
        err instanceof Error
          ? `Could not recover cached data: ${err.message}`
          : 'Could not recover cached data. Please upload your file again.'
      )
    }
  }

  // Load all transactions from IndexedDB (including payroll transactions)
  const loadAllTransactions = async () => {
    try {
      const recalculatedTransactions = await loadCanonicalTransactions()
      if (recalculatedTransactions.length === 0) {
        const legacy = readLegacyTransactionCache()
        if (legacy.length > 0) {
          console.warn(
            '[Frontend] IndexedDB has no statements but browser cache has',
            legacy.length,
            'transactions — keeping cache (use History → Recover if needed)'
          )
          setTransactions(filterBankAdvisoryTransactions(legacy) as unknown as ClassifiedTransaction[])
          return
        }
      }
      const withCategories = hydrateLedgerTransactions(recalculatedTransactions)
      const normalized = normalizeCorporateTransactions(
        withCategories,
        accountType as 'individual' | 'company' | 'sole_trader'
      )
      // Persist date repairs (US MM/DD → AU) so History / BAS months stay consistent
      syncLegacyTransactionCache(normalized)
      setTransactions(() => [...(normalized as ClassifiedTransaction[])])
      console.log(
        '[Frontend] ✅ All transactions loaded from canonical loader:',
        normalized.length
      )
    } catch (error) {
      console.error('[Frontend] Failed to load all transactions:', error)
    }
  }

  // Load statement from history (NO API CALL — refreshes full ledger from IndexedDB)
  const loadStatement = async (id: string) => {
    try {
      const statement = await indexedDBStorage.getStatement(id)
      if (statement) {
        console.log('[Frontend] Loading statement:', {
          id,
          bankName: statement.bankName,
          fileName: statement.fileName,
          transactionCount: statement.transactions?.length || 0
        })

        if (
          !statement.transactions ||
          !Array.isArray(statement.transactions) ||
          statement.transactions.length === 0
        ) {
          console.warn('[Frontend] Statement has no transactions:', statement)
          setError(
            'This statement has no transactions. It may have been saved incorrectly. Please re-upload the file.'
          )
          return
        }

        setCurrentStatementId(id)
        const bankRows = (statement.transactions || []).filter(
          (tx: ClassifiedTransaction) => (tx.source || 'bank') === 'bank'
        )
        const healed = preferPeriodScopedRows(bankRows, statement.period)
        const dateRepaired = repairUsMisparsedAustralianDates(
          repairStatementDateAnomalies(healed)
        ) as ClassifiedTransaction[]
        const rowsForSnapshot =
          dateRepaired.length > 0 ? dateRepaired : healed
        if (
          rowsForSnapshot.length > 0 &&
          (rowsForSnapshot.length < (statement.transactions?.length || 0) ||
            rowsForSnapshot.some(
              (tx, i) => tx.date !== (healed[i]?.date ?? statement.transactions?.[i]?.date)
            ))
        ) {
          try {
            await indexedDBStorage.updateStatement(id, {
              ...statement,
              transactions: rowsForSnapshot,
              period: {
                startDate:
                  getTransactionDateBounds(rowsForSnapshot)?.startDate ||
                  statement.period?.startDate ||
                  '',
                endDate:
                  getTransactionDateBounds(rowsForSnapshot)?.endDate ||
                  statement.period?.endDate ||
                  '',
              },
            })
            console.log(
              `[Frontend] Healed statement ${id}: dates/period normalised (${rowsForSnapshot.length} rows)`
            )
          } catch (healErr) {
            console.warn('[Frontend] Could not persist healed statement:', healErr)
          }
        }
        setExportStatementSnapshot({
          statementId: id,
          fileName: statement.fileName || 'statement',
          period: {
            startDate:
              getTransactionDateBounds(rowsForSnapshot)?.startDate ||
              statement.period?.startDate ||
              '',
            endDate:
              getTransactionDateBounds(rowsForSnapshot)?.endDate ||
              statement.period?.endDate ||
              '',
          },
          transactions: [...rowsForSnapshot],
        })
        setActiveTab('dashboard')

        await loadAllTransactions()

        setLoadSuccessMessage(
          `Loaded from history (no API cost). "${statement.fileName}" — ${rowsForSnapshot.length} record${rowsForSnapshot.length === 1 ? '' : 's'} for export; ledger table may show all History.`
        )
        revealUploadedTransactions(rowsForSnapshot)
        setTimeout(() => setLoadSuccessMessage(null), 5000)
      } else {
        setError('Statement not found in local storage')
      }
    } catch (err) {
      console.error('[Frontend] Failed to load statement:', err)
      setError(
        `Failed to load statement from history: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  // Save current transactions to IndexedDB
  const saveCurrentStatement = async (fileName: string, statementData: any, transactionsToSave?: ClassifiedTransaction[]) => {
    try {
      await indexedDBStorage.init()
      // Use provided transactions or fall back to state — repair OCR dates before persist
      const transactionsToUse = repairLedgerTransactionDates(
        transactionsToSave || transactions
      )
      
      // Ensure transactions are available
      if (!transactionsToUse || transactionsToUse.length === 0) {
        console.error('[Frontend] ❌ No transactions to save:', {
          fileName,
          hasProvidedTransactions: !!transactionsToSave,
          providedTransactionCount: transactionsToSave?.length || 0,
          hasStateTransactions: !!transactions,
          stateTransactionCount: transactions?.length || 0,
          statementData: statementData ? Object.keys(statementData) : null
        })
        throw new Error(`No transactions to save for file "${fileName}". Please ensure the file was processed correctly and contains transaction data.`)
      }

      const dateBounds = getTransactionDateBounds(transactionsToUse)
      const periodToSave = {
        startDate:
          dateBounds?.startDate ||
          toIsoDateString(statementData?.period?.startDate) ||
          statementData?.period?.startDate ||
          '',
        endDate:
          dateBounds?.endDate ||
          toIsoDateString(statementData?.period?.endDate) ||
          statementData?.period?.endDate ||
          '',
      }
      
      console.log('[Frontend] Saving statement:', {
        fileName,
        transactionCount: transactionsToUse.length,
        statementData,
        periodToSave,
        usingProvidedTransactions: !!transactionsToSave
      })
      
      // Check for duplicate filename
      const existingStatements = await indexedDBStorage.getAllStatements()
      const duplicate = existingStatements.find(stmt => stmt.fileName === fileName)
      
      if (duplicate) {
        // Ask user what to do with duplicate
        return new Promise<string>((resolve, reject) => {
          setDuplicateFileDialog({ fileName, existingId: duplicate.id })
          
          // Store resolve/reject and data for dialog buttons
          ;(window as any).__duplicateFileResolve = resolve
          ;(window as any).__duplicateFileReject = reject
          ;(window as any).__duplicateFileData = { statementData, transactions: transactionsToUse }
        })
      }
      
      const id = await indexedDBStorage.saveStatement({
        bankName: statementData.bankName || 'CBA',
        accountNumber: statementData.accountNumber,
        period: periodToSave,
        openingBalance: statementData.openingBalance || 0,
        closingBalance: statementData.closingBalance || 0,
        transactions: transactionsToUse, // Use provided transactions
        fileName,
      })
      
      console.log('[Frontend] ✅ Statement saved successfully:', {
        id,
        fileName,
        transactionCount: transactionsToUse.length,
        bankName: statementData.bankName || 'CBA'
      })
      setCurrentStatementId(id)
      setExportStatementSnapshot({
        statementId: id,
        fileName,
        period: periodToSave,
        transactions: [...transactionsToUse],
      })
      
      // 🔧 CRITICAL: Reload statement history to show new statement
      await loadStatementHistory()
      console.log('[Frontend] ✅ Statement History reloaded')
      
      return id
    } catch (err) {
      console.error('[Frontend] Failed to save statement:', err)
      throw err
    }
  }
  
  // Handle duplicate file dialog actions
  const handleDuplicateFileChoice = async (choice: 'reload' | 'reanalyze') => {
    if (!duplicateFileDialog) return
    
    const { fileName, existingId } = duplicateFileDialog
    const resolve = (window as any).__duplicateFileResolve
    const reject = (window as any).__duplicateFileReject
    const { statementData, transactions: newTransactions } = (window as any).__duplicateFileData || {}
    
    setDuplicateFileDialog(null)
    delete (window as any).__duplicateFileResolve
    delete (window as any).__duplicateFileReject
    delete (window as any).__duplicateFileData
    
    try {
      if (choice === 'reload') {
        // Load existing data from IndexedDB (NO API CALL)
        await loadStatement(existingId)
        resolve?.(existingId)
      } else {
        // Re-analyze: Delete old and save new (WILL USE API)
        await indexedDBStorage.deleteStatement(existingId)
        
        // Validate transactions before saving
        if (!newTransactions || !Array.isArray(newTransactions) || newTransactions.length === 0) {
          const error = new Error('No transactions available to save. Please re-upload the file.')
          console.error('[Frontend] ❌ No transactions in duplicate file data:', {
            hasTransactions: !!newTransactions,
            isArray: Array.isArray(newTransactions),
            length: newTransactions?.length || 0
          })
          reject?.(error)
          setError('No transactions available to save. Please re-upload the file.')
          return
        }
        
        // Use saveCurrentStatement to handle duplicate check and save
        const id = await saveCurrentStatement(fileName, statementData, newTransactions)
        resolve?.(id)
      }
    } catch (err) {
      console.error('Error handling duplicate file:', err)
      reject?.(err)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      console.warn('[Frontend] No file selected')
      return
    }
    
    console.log('[Frontend] File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Use user's API key if available, otherwise use system API key (from localStorage)
    const effectiveApiKey = userApiKey || apiKey
    const isUsingSystemKey = !userApiKey && !!apiKey
    const mode = classificationMode
    const rulesOnly = mode === 'rules_only'

    if (!effectiveApiKey && !rulesOnly) {
      setError(strings.errors.apiKeyRequired)
      setActiveTab('settings')
      return
    }

    // Check API balance before upload (AI mode only)
    if (!rulesOnly) {
      try {
        const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
        const stats = await indexedDBStorage.getApiUsageStats(30)
        const estimatedRemaining = 100 - stats.totalCost // Placeholder: Assume $100 starting balance
        
        if (estimatedRemaining < 0.50) {
          setToast({
            message: 'API 잔액이 부족하여 분석이 실패할 수 있습니다. 충전 후 이용해주세요.',
            type: 'warning'
          })
          setTimeout(() => setToast(null), 5000)
        }
      } catch (err) {
        console.error('Error checking API balance:', err)
      }
    }

    // Usage Limit: Check daily upload limit for system key users
    // Admin Bypass: Admins have unlimited uploads regardless of API key status
    // API Key Priority: Personal API key users have unlimited uploads
    let isAdmin = false
    try {
      // Check if user is logged in as admin by checking LocalStorage
      // adminAuth uses Zustand persist middleware which stores data in localStorage
      if (typeof window !== 'undefined') {
        const adminAuthStore = localStorage.getItem('admin-auth-store')
        if (adminAuthStore) {
          try {
            const parsed = JSON.parse(adminAuthStore)
            // Check if user is logged in and has admin user data
            isAdmin = parsed.state?.isLoggedIn === true && !!parsed.state?.adminUser
            
            if (isAdmin) {
              console.log('[Upload] ✅ Admin user detected - upload limit bypassed', {
                username: parsed.state?.adminUser?.username,
                role: parsed.state?.adminUser?.role
              })
            }
          } catch (parseErr) {
            console.warn('[Upload] Failed to parse admin auth store:', parseErr)
          }
        }
      }
    } catch (err) {
      console.warn('[Upload] Could not check admin status:', err)
      // Continue - if admin check fails, proceed with normal limit check
    }
    
    // Only apply upload limit if using system API key with AI mode
    if (isUsingSystemKey && !isAdmin && !rulesOnly) {
      try {
        const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
        const todayCount = await indexedDBStorage.getTodayUploadCount()
        const MAX_DAILY_UPLOADS = 5
        
        if (todayCount >= MAX_DAILY_UPLOADS) {
          setError(`하루 최대 업로드 횟수(${MAX_DAILY_UPLOADS}회)를 초과했습니다. 개인 API 키를 사용하시면 무제한으로 이용하실 수 있습니다.`)
          setIsProcessing(false)
          setProcessingStage('')
          return
        }
      } catch (err) {
        console.error('Error checking upload limit:', err)
        // Continue with upload even if limit check fails
      }
    } else if (isAdmin) {
      console.log('[Upload] ✅ Admin bypass: Upload limit check skipped')
    } else if (!isUsingSystemKey) {
      console.log('[Upload] ✅ Personal API key detected: Upload limit check skipped')
    }

    setIsProcessing(true)
    setError(null)
    setProcessingStage('Uploading file...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('classificationMode', mode)
      if (effectiveApiKey) {
        formData.append('apiKey', effectiveApiKey)
        formData.append('isUserApiKey', userApiKey ? 'true' : 'false')
      }
      formData.append('accountType', accountType)
      try {
        const mappings = getUserMappings()
        if (mappings.length > 0) {
          formData.append('userMappings', JSON.stringify(mappings))
        }
      } catch {
        /* ignore */
      }
      // Add Director name if provided
      if (directorName.trim()) {
        formData.append('directorName', directorName.trim())
      }
      
      // Log usage (only if IndexedDB is initialized)
      try {
        await indexedDBStorage.logFileUpload(file.name, file.size)
      } catch (logError) {
        console.warn('[Frontend] ⚠️ Failed to log file upload (IndexedDB may not be initialized):', logError)
        // Continue with upload even if logging fails
      }

      setProcessingStage('Parsing file...')
      
      // 🔧 CRITICAL: Prevent infinite retry loops - Single API call, NO RETRIES
      let response: Response
      let retryCount = 0
      const MAX_RETRIES = 0 // NO RETRIES - Single attempt only
      
      try {
        // 🔧 CRITICAL: Single fetch call - NO automatic retries
        response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })
        
        // 🔧 CRITICAL: Log request to prevent duplicate calls
        console.log('[Frontend] 📤 Single API request sent (NO RETRIES):', {
          fileName: file.name,
          fileSize: file.size,
          timestamp: new Date().toISOString()
        })
      } catch (networkError: any) {
        console.error('[Frontend] ❌ Network error (NO RETRY):', networkError)
        setError(`Network error: ${networkError.message || 'Failed to connect to server. Please check your connection and try again.'}`)
        setIsProcessing(false)
        setProcessingStage('')
        return // 🔧 CRITICAL: Exit immediately - NO RETRIES
      }

      console.log('[Frontend] Response status:', response.status, response.statusText)
      console.log('[Frontend] Response ok:', response.ok)
      console.log('[Frontend] Response headers:', Object.fromEntries(response.headers.entries()))
      console.log('[Frontend] Response ok:', response.ok)
      
      let data: any = null
      let responseText = ''
      try {
        responseText = await response.text()
        console.log('[Frontend] Raw response length:', responseText.length)
        if (responseText.length > 0) {
          console.log('[Frontend] Raw response (first 1000 chars):', responseText.substring(0, 1000))
          if (responseText.length > 1000) {
            console.log('[Frontend] Raw response (last 500 chars):', responseText.substring(responseText.length - 500))
          }
        } else {
          console.warn('[Frontend] ⚠️ Empty response body')
        }
        
        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText)
            console.log('[Frontend] ✅ Parsed response data:', {
              hasData: !!data,
              dataKeys: data ? Object.keys(data) : [],
              hasTransactions: !!data?.transactions,
              transactionCount: data?.transactions?.length || 0,
              hasError: !!data?.error,
              error: data?.error,
              success: data?.success,
              fullData: JSON.stringify(data, null, 2)
            })
          } catch (parseError: any) {
            console.error('[Frontend] ❌ JSON parse error:', parseError)
            console.error('[Frontend] Parse error message:', parseError.message)
            console.error('[Frontend] Full response text:', responseText)
            data = {
              error: 'INVALID_JSON_RESPONSE',
              details: `Server returned invalid JSON. Status: ${response.status}. Response preview: ${responseText.substring(0, 200)}`,
              rawResponse: responseText.substring(0, 1000) // Store first 1000 chars for debugging
            }
          }
        } else {
          console.warn('[Frontend] ⚠️ Empty response body')
          data = {
            error: 'EMPTY_RESPONSE',
            details: `Server returned empty response. Status: ${response.status}, StatusText: ${response.statusText}`
          }
        }
        
        // Validate data structure
        if (!data || typeof data !== 'object') {
          console.error('[Frontend] ❌ Invalid data structure:', { data, type: typeof data })
          setError('Invalid response from server. Please try again.')
          setIsProcessing(false)
          setProcessingStage('')
          return
        }
      } catch (readError: any) {
        console.error('[Frontend] ❌ Failed to read response:', readError)
        console.error('[Frontend] Read error type:', readError?.constructor?.name)
        console.error('[Frontend] Read error message:', readError?.message)
        console.error('[Frontend] Read error stack:', readError?.stack)
        data = {
          error: 'RESPONSE_READ_ERROR',
          details: `Failed to read server response: ${readError?.message || 'Unknown error'}`,
          readErrorType: readError?.constructor?.name
        }
      }

      // Check if response is OK but data might be invalid
      if (response.ok && data && (!data.transactions || !Array.isArray(data.transactions))) {
        console.error('[Frontend] ⚠️ Response OK but invalid data structure:', {
          hasData: !!data,
          hasTransactions: !!data?.transactions,
          transactionsType: typeof data?.transactions,
          isArray: Array.isArray(data?.transactions),
          dataKeys: data ? Object.keys(data) : [],
          fullData: JSON.stringify(data, null, 2)
        })
        setError('Server returned invalid data structure. Please check server logs.')
        setIsProcessing(false)
        setProcessingStage('')
        return
      }

      if (!response.ok) {
        // Build error info with only non-empty values
        const errorInfo: Record<string, any> = {
          status: response.status,
          statusText: response.statusText,
        }
        
        if (data) {
          if (data.error) errorInfo.error = data.error
          if (data.details) errorInfo.details = data.details
          if (data.type) errorInfo.type = data.type
          if (data.stack) errorInfo.stack = data.stack
          if (data.timestamp) errorInfo.timestamp = data.timestamp
          if (data.rawResponse) errorInfo.rawResponse = data.rawResponse
        } else {
          errorInfo.error = 'NO_RESPONSE_DATA'
          errorInfo.details = `Server returned an error (Status: ${response.status}) but no error details were provided. Response was empty or could not be parsed.`
        }
        
        // Log with better formatting - include response text for debugging
        console.error('[Frontend] ❌ Request failed:')
        console.error('  Status:', errorInfo.status, errorInfo.statusText)
        console.error('  Error Code:', errorInfo.error || 'UNKNOWN_ERROR')
        console.error('  Error Details:', errorInfo.details || 'No details provided')
        
        if (responseText) {
          console.error('  Response Text Length:', responseText.length)
          if (responseText.length > 0) {
            console.error('  Response Text (first 2000 chars):', responseText.substring(0, 2000))
            if (responseText.length > 2000) {
              console.error('  Response Text (last 500 chars):', responseText.substring(responseText.length - 500))
            }
          }
        }
        
        if (errorInfo.type) console.error('  Error Type:', errorInfo.type)
        if (errorInfo.timestamp) console.error('  Timestamp:', errorInfo.timestamp)
        if (errorInfo.stack) {
          console.error('  Stack Trace:')
          console.error(errorInfo.stack)
        }
        if (errorInfo.rawResponse) {
          console.error('  Raw Response (first 1000 chars):', errorInfo.rawResponse)
        }
        if (data) {
          console.error('  Full Response Data:', JSON.stringify(data, null, 2))
          console.error('  Response Data Keys:', Object.keys(data))
          console.error('  Has Transactions:', !!data.transactions)
          console.error('  Transactions Type:', typeof data.transactions)
          console.error('  Transactions Length:', data.transactions?.length || 0)
        } else {
          console.error('  ⚠️ Response data is null or undefined')
        }
        console.error('  Full Error Info Object:', JSON.stringify(errorInfo, null, 2))
        
        // Also log to help user understand what happened
        const errorMessage = errorInfo.details || errorInfo.error || `Server returned error (Status: ${errorInfo.status})`
        console.error('[Frontend] 📋 User-facing error message:', errorMessage)
        
        // Additional debugging: Log request details
        console.error('[Frontend] Request details:')
        console.error('  URL:', '/api/analyze')
        console.error('  Method:', 'POST')
        console.error('  File name:', file?.name)
        console.error('  File size:', file?.size)
        console.error('  File type:', file?.type)
        console.error('  API Key present:', !!effectiveApiKey)
        console.error('  API Key length:', effectiveApiKey?.length || 0)
        console.error('  Using User API Key:', !!userApiKey)
        console.error('  Director Name:', directorName || 'NOT SET')
        
        // Handle specific error types
        if (response.status === 401) {
          setError(data?.error === 'INVALID_API_KEY' 
            ? 'Invalid API key. Please check your OpenAI API key in Settings.'
            : data?.details || 'Authentication failed')
        } else if (response.status === 429) {
          setError(data?.error === 'RATE_LIMIT_EXCEEDED'
            ? 'API rate limit exceeded. Please wait a moment and try again.'
            : data?.details || 'Rate limit exceeded')
        } else if (response.status === 400) {
          if (data?.error === 'PDF_EXTRACTION_FAILED') {
            setError(`PDF parsing failed: ${data?.details || 'Please check if it is a valid bank statement.'}`)
          } else if (data?.error === 'CSV_EXTRACTION_FAILED' || data?.error === 'CSVParsingError') {
            setError(`CSV parsing failed: ${data?.details || 'Please check if the CSV file has the correct format (Date, Description/Narrative, Debit, Credit, Balance columns).'}`)
          } else if (data?.error === 'NO_TRANSACTIONS_FOUND') {
            const bankInfo = data?.bankName ? ` (${data.bankName})` : ''
            setError(`No transactions found in the statement${bankInfo}. Please check if the statement contains transaction data. If you're uploading a PDF, make sure it's a valid bank statement with transaction history.`)
          } else if (data?.error === 'UNSUPPORTED_FILE_TYPE') {
            setError(data?.details || 'Unsupported file format. Please upload a CSV or PDF file.')
          } else if (data?.error?.includes('File size') || data?.details?.includes('File size')) {
            setError(data?.error || data?.details || 'File is too large. Maximum size is 10MB.')
          } else {
            setError(data?.details || data?.error || 'Invalid request. Check server logs for details.')
          }
        } else if (response.status >= 500) {
          setError(data?.details || data?.error || `Server error (Status: ${response.status}). Please try again later or check server logs.`)
        } else {
          setError(data?.details || data?.error || `Analysis failed (Status: ${response.status}). Check server logs for details.`)
        }
        setIsProcessing(false)
        setProcessingStage('')
        return
      }

      setProcessingStage('Saving to database...')

      // 🔧 COST OPTIMIZATION: Log API usage stats before processing
      if (data?.apiUsage) {
        const usage = data.apiUsage
        console.log('[Frontend] 💰 API Usage Summary:')
        console.log('  - Total API calls:', usage.totalCalls || 0)
        console.log('  - Total tokens:', usage.totalTokens || 0)
        console.log('  - Total cost: $' + (usage.totalCost || 0).toFixed(6))
        if (usage.byModel && Array.isArray(usage.byModel)) {
          console.log('  - By model:')
          usage.byModel.forEach((modelUsage: any) => {
            console.log(`    * ${modelUsage.model}: ${modelUsage.calls || 0} calls, ${modelUsage.totalTokens || 0} tokens, $${(modelUsage.totalCost || 0).toFixed(6)}`)
          })
        }
      }

      // Log API usage from server-side calls to IndexedDB
      if (data.apiUsage && typeof window !== 'undefined') {
        try {
          const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
          
          // Log each individual API call usage
          if (data.apiUsage.usageLogs && Array.isArray(data.apiUsage.usageLogs)) {
            let sessionCost = 0
            console.log(`[Frontend] 📊 API Usage Data Received:`, {
              totalUsageLogs: data.apiUsage.usageLogs.length,
              totalCost: data.apiUsage.totalCost,
              totalCalls: data.apiUsage.totalCalls,
              totalTokens: data.apiUsage.totalTokens,
              byModel: data.apiUsage.byModel
            })
            
            for (const usageLog of data.apiUsage.usageLogs) {
              console.log(`[Frontend] 💾 Logging API usage to IndexedDB:`, {
                model: usageLog.model,
                promptTokens: usageLog.promptTokens,
                completionTokens: usageLog.completionTokens,
                totalTokens: usageLog.totalTokens,
                estimatedCost: usageLog.estimatedCost
              })
              
              await indexedDBStorage.logApiUsage({
                model: usageLog.model,
                promptTokens: usageLog.promptTokens,
                completionTokens: usageLog.completionTokens,
                totalTokens: usageLog.totalTokens,
                estimatedCost: usageLog.estimatedCost,
                apiKeyType: userApiKey ? 'user' : 'system'
              })
              sessionCost += usageLog.estimatedCost
            }
            console.log(`[Frontend] ✅ Logged ${data.apiUsage.usageLogs.length} API usage records to IndexedDB. Total session cost: $${sessionCost.toFixed(4)}`)
            
            // Update session cost
            setSessionApiCost(prev => prev + sessionCost)
          } else {
            console.warn('[Frontend] ⚠️ No usageLogs array in apiUsage data:', data.apiUsage)
          }
        } catch (err) {
          console.error('[Frontend] ❌ Failed to log API usage to IndexedDB:', err)
        }
      } else {
        console.warn('[Frontend] ⚠️ No apiUsage data received or not in browser context:', {
          hasApiUsage: !!data.apiUsage,
          isBrowser: typeof window !== 'undefined'
        })
      }

      // Update transactions with classified data
      if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
        // 🎓 Apply user mappings (learning feature)
        // Check each transaction against user's previous corrections
        const transactionsWithMappings = data.transactions.map((tx: any, index: number) => {
          // Check if there's a user mapping for this transaction
          const userMapping = findUserMapping(tx.description)
          
          if (userMapping) {
            console.log(`[Frontend] 🎓 Applied user mapping for transaction ${index + 1}:`, {
              description: tx.description.substring(0, 50),
              originalCategory: tx.category,
              learnedCategory: userMapping.category,
              learnedDepartment: userMapping.department
            })
            
            return {
          ...tx,
          id: tx.id || tx.reference || `tx_${Date.now()}_${index}`,
              category: userMapping.category, // Override with user's previous correction
              department: userMapping.department || tx.department, // Override department if available
              confidence: 'Learned' as const, // Mark as learned from user mapping
              isLearnedMapping: true, // Flag for UI display
            }
          }
          
          return {
            ...tx,
            id: tx.id || tx.reference || buildStableTransactionId(tx),
          }
        })
        
        // Ensure each transaction has an ID
        const transactionsWithIds = transactionsWithMappings
        // Migrate old INCOME_CASH_DEPOSIT_REVIEW to NON_TAXABLE_CASH_DEPOSIT
        const migratedTransactions = transactionsWithIds.map((tx: ClassifiedTransaction) => {
          if (tx.category === 'INCOME_CASH_DEPOSIT_REVIEW') {
            return {
              ...tx,
              category: 'NON_TAXABLE_CASH_DEPOSIT',
              department: tx.department === 'cleaning' || tx.department === 'unknown' ? 'personal' : (tx.department || 'personal')
            }
          }
          return tx
        })
        
        // Validate migratedTransactions before saving
        if (!migratedTransactions || migratedTransactions.length === 0) {
          console.error('[Frontend] ❌ No transactions after migration. Original transactions:', data.transactions)
          setError('No transactions found after processing. Please check the file format.')
          setIsProcessing(false)
          setProcessingStage('')
          return
        }
        
        // Append or replace transactions based on appendMode
        if (appendMode) {
          setTransactions((prev) => {
            const existingKeys = new Set(prev.map((tx) => buildTransactionFingerprint(tx)))
            const newTransactions = migratedTransactions.filter((tx: ClassifiedTransaction) => {
              return !existingKeys.has(buildTransactionFingerprint(tx))
            })
            return [...prev, ...newTransactions]
          })
        } else {
          setTransactions(migratedTransactions)
        }

        // Save to IndexedDB (pass transactions directly to avoid state timing issues)
        try {
          console.log('[Frontend] Saving statement to IndexedDB:', {
            fileName: file.name,
            transactionCount: migratedTransactions.length,
            statementData: data.statement
          })
          
          // Pass transactions directly to avoid React state timing issues
          const id = await saveCurrentStatement(file.name, data.statement, migratedTransactions)
          console.log('[Frontend] ✅ Statement saved with ID:', id)
          const uploadPeriods = getDistinctPeriodIdsFromTransactions(migratedTransactions)
          const periodHint =
            uploadPeriods.length > 1
              ? ` — months: ${uploadPeriods.join(', ')}`
              : uploadPeriods.length === 1
                ? ` — month: ${uploadPeriods[0]}`
                : ''
          setLoadSuccessMessage(
            `Saved to History: ${migratedTransactions.length} transaction${migratedTransactions.length === 1 ? '' : 's'} (${file.name})${periodHint}`
          )
          setTimeout(() => setLoadSuccessMessage(null), 6000)
          
          // 🔧 CRITICAL: Reload all transactions to update Transaction History
          console.log('[Frontend] 🔄 Reloading all transactions to update Transaction History...')
          await loadAllTransactions()
          console.log('[Frontend] ✅ Transaction History updated')
          revealUploadedTransactions(repairLedgerTransactionDates(migratedTransactions))
        } catch (saveErr) {
          console.error('[Frontend] Failed to save statement:', saveErr)
          setError(`Failed to save statement: ${saveErr instanceof Error ? saveErr.message : 'Unknown error'}`)
          // Continue even if save fails
        }
      } else {
        // More detailed error logging
        console.error('[Frontend] ❌ No transactions in response:', {
          hasData: !!data,
          dataType: typeof data,
          dataKeys: data ? Object.keys(data) : [],
          hasTransactions: !!data?.transactions,
          transactionsType: typeof data?.transactions,
          isArray: Array.isArray(data?.transactions),
          length: data?.transactions?.length || 0,
          hasError: !!data?.error,
          error: data?.error,
          errorDetails: data?.details,
          hasSuccess: 'success' in (data || {}),
          success: data?.success,
          fullData: JSON.stringify(data, null, 2)
        })
        
        // Provide more specific error message
        if (data?.error) {
          setError(data.details || data.error || 'An error occurred while processing the file.')
        } else if (data?.transactions && Array.isArray(data.transactions) && data.transactions.length === 0) {
          setError('The file was processed successfully but contains no transactions. Please check if the file contains valid transaction data.')
        } else {
          setError('No transactions found in the file. Please check if the file contains valid transaction data.')
        }
        setIsProcessing(false)
        setProcessingStage('')
        return
      }

      setProcessingStage('Complete!')
      
      setTimeout(() => {
        setIsProcessing(false)
        setProcessingStage('')
      }, 1000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || strings.errors.parsingFailed)
      setIsProcessing(false)
      setProcessingStage('')
    }
  }

  // Handle cash expense save
  const handleCashExpenseSave = async (expense: {
    date: string
    amount: number
    merchant: string
    category: string
    receiptImageId?: string
    department?: string
    description?: string
    source: 'manual'
    claimAuGst?: boolean
    paidBy?: 'company' | 'director'
    fundedByDirector?: boolean
    gstInfo?: ClassifiedTransaction['gstInfo']
  }) => {
    try {
      // Save receipt image if provided
      let receiptImageId = expense.receiptImageId
      if (receiptImageId && receiptImageId.startsWith('data:')) {
        // Extract base64 data
        const base64Data = receiptImageId.split(',')[1]
        const mimeType = receiptImageId.split(';')[0].split(':')[1]
        
        // Save receipt to IndexedDB
        const savedReceiptId = await indexedDBStorage.saveReceiptImage({
          cashExpenseId: '', // Will be updated after cash expense is saved
          imageData: base64Data,
          fileName: `receipt_${Date.now()}.${mimeType.split('/')[1]}`,
          fileType: mimeType,
        })
        receiptImageId = savedReceiptId
      }

      const { buildGstInfoForClaim } = await import('@/lib/gst/purchase-gst-claimable')
      const gstInfo =
        expense.gstInfo ||
        buildGstInfoForClaim(expense.amount, expense.claimAuGst === true)

      // Save cash expense to IndexedDB
      const cashExpenseId = await indexedDBStorage.saveCashExpense({
        date: expense.date,
        amount: expense.amount,
        merchant: expense.merchant,
        category: expense.category,
        receiptImageId,
        department: expense.department,
        description: expense.description,
        gstInfo,
        paidBy: expense.paidBy,
        fundedByDirector:
          expense.fundedByDirector ?? expense.paidBy === 'director',
      })

      // Update receipt with cash expense ID if needed
      if (receiptImageId && receiptImageId.startsWith('receipt_')) {
        // Receipt was saved, update it with cash expense ID
        // (This would require an updateReceipt method, but for now we'll handle it in the save)
      }

      void cashExpenseId

      // Reload cash expenses to update transactions
      await loadCashExpenses()
    } catch (err) {
      console.error('Failed to save cash expense:', err)
      throw err
    }
  }

  // Get current user name for audit trail
  const getCurrentUserName = (): string => {
    const directorName = localStorage.getItem('director_name')
    return directorName || '사장님'
  }

  // Handle transaction update (manual category / department / date / amount override)
  const handleTransactionUpdate = async (id: string, updates: Partial<ClassifiedTransaction>) => {
    let oldTxIndex = findLedgerTransactionIndex(transactions, id)
    if (oldTxIndex < 0) {
      // `${date}_${description}_${viewIndex}` — view index is from a filtered History table
      const withoutViewIdx = id.replace(/_\d+$/, '')
      const byDateDesc = transactions.findIndex(
        (tx) => `${tx.date}_${tx.description}` === withoutViewIdx
      )
      if (byDateDesc >= 0) oldTxIndex = byDateDesc
    }
    if (oldTxIndex < 0) {
      // Unique description (e.g. Jason Selpic) when compound id / view index failed
      const withoutViewIdx = id.replace(/_\d+$/, '')
      const tipDesc = withoutViewIdx.includes('_')
        ? withoutViewIdx.split('_').slice(1).join('_')
        : withoutViewIdx
      const descNorm = tipDesc.toUpperCase().replace(/\s+/g, ' ').trim()
      if (descNorm) {
        const matches = transactions
          .map((tx, idx) => ({ tx, idx }))
          .filter(
            ({ tx }) =>
              String(tx.description || '')
                .toUpperCase()
                .replace(/\s+/g, ' ')
                .trim() === descNorm
          )
        if (matches.length === 1) oldTxIndex = matches[0].idx
        else if (matches.length > 1) {
          oldTxIndex = findLedgerTransactionIndexByAmountDescription(transactions, {
            description: tipDesc,
            debit: updates.debit ?? matches[0].tx.debit,
            credit: updates.credit ?? matches[0].tx.credit,
          })
        }
      }
    }
    const oldTx = oldTxIndex >= 0 ? transactions[oldTxIndex] : undefined

    if (oldTxIndex < 0 || !oldTx) {
      console.warn('[handleTransactionUpdate] Could not resolve transaction id:', id)
      setError(
        'Could not save that edit — row not found in the ledger. Switch History to All in scope, then edit the date again.'
      )
      return
    }
    if (oldTx && isDateInLockedPeriod(oldTx.date, lockedPeriodIds)) {
      alert('This transaction is in a locked period and cannot be edited.')
      return
    }

    const normalisedDate =
      updates.date != null && updates.date !== ''
        ? toIsoDateString(updates.date) || null
        : null
    if (updates.date != null && updates.date !== '' && !normalisedDate) {
      alert('Invalid date. Please use a valid calendar date.')
      return
    }
    if (normalisedDate && isDateInLockedPeriod(normalisedDate, lockedPeriodIds)) {
      alert('That date falls in a locked period and cannot be used.')
      return
    }

    const finalUpdates: Partial<ClassifiedTransaction> = {
      ...updates,
      ...(normalisedDate ? { date: normalisedDate } : {}),
      ...(updates.category ||
      updates.department ||
      normalisedDate ||
      updates.debit !== undefined ||
      updates.credit !== undefined
        ? { confidence: 'Manual' as any }
        : {}),
    }
    
    // Log audit trail for changes
    try {
      if (updates.category && oldTx && oldTx.category !== updates.category) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'category_changed',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: oldTx.category,
          newValue: updates.category,
          description: `Category changed from "${oldTx.category || 'N/A'}" to "${updates.category}"`,
        })
      }
      if (updates.department && oldTx && oldTx.department !== updates.department) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'department_changed',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: oldTx.department,
          newValue: updates.department,
          description: `Department changed from "${oldTx.department || 'N/A'}" to "${updates.department}"`,
        })
      }
      if (normalisedDate && oldTx && toIsoDateString(oldTx.date) !== normalisedDate) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'updated',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: oldTx.date,
          newValue: normalisedDate,
          description: `Date corrected from "${oldTx.date}" to "${normalisedDate}"`,
        })
      }
      if (
        oldTx &&
        (updates.debit !== undefined || updates.credit !== undefined) &&
        ((updates.debit !== undefined && (oldTx.debit ?? null) !== (updates.debit ?? null)) ||
          (updates.credit !== undefined && (oldTx.credit ?? null) !== (updates.credit ?? null)))
      ) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'updated',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: { debit: oldTx.debit, credit: oldTx.credit },
          newValue: {
            debit: updates.debit !== undefined ? updates.debit : oldTx.debit,
            credit: updates.credit !== undefined ? updates.credit : oldTx.credit,
          },
          description: `Amount corrected (debit ${oldTx.debit ?? 0} → ${
            updates.debit !== undefined ? updates.debit ?? 0 : oldTx.debit ?? 0
          }, credit ${oldTx.credit ?? 0} → ${
            updates.credit !== undefined ? updates.credit ?? 0 : oldTx.credit ?? 0
          })`,
        })
      }
      if (updates.fbtInfo && oldTx?.fbtInfo?.isFBTRelevant !== updates.fbtInfo?.isFBTRelevant) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'updated',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: oldTx?.fbtInfo,
          newValue: updates.fbtInfo,
          description: `FBT status updated`,
        })
      }
    } catch (err) {
      console.error('Failed to log audit trail:', err)
    }
    
    const updatedTransactions = transactions.map((tx, idx) => {
      if (idx === oldTxIndex) {
        return { ...tx, ...finalUpdates }
      }
      const withIdx = tx.id ? `${tx.id}_${idx}` : `${tx.date}_${tx.description}_${idx}`
      const withoutIdx = tx.id || `${tx.date}_${tx.description}`
      if (withIdx === id || withoutIdx === id || tx.id === id) {
        return { ...tx, ...finalUpdates }
      }
      return tx
    })
    
    setTransactions(updatedTransactions)

    // Persist standalone ledger row when it has a stable id
    const persistId = oldTx?.id
    if (
      persistId &&
      (normalisedDate ||
        updates.category ||
        updates.department ||
        updates.debit !== undefined ||
        updates.credit !== undefined ||
        updates.gstInfo !== undefined)
    ) {
      try {
        await indexedDBStorage.updateTransaction(persistId, finalUpdates)
      } catch (err) {
        // Statement-scoped rows may not exist in the standalone store
        console.warn('[handleTransactionUpdate] standalone persist skipped:', err)
      }
    }

    // Persist cash / manual expense rows (including GST claim flag)
    if (oldTx?.source === 'manual' && persistId && String(persistId).startsWith('cash_')) {
      try {
        const merged = { ...oldTx, ...finalUpdates }
        await indexedDBStorage.updateCashExpense(String(persistId), {
          date: merged.date,
          amount: Math.abs(merged.debit || 0),
          merchant: merged.description,
          description: merged.description,
          category: merged.category || 'CASH_EXPENSE_PETTY',
          department: merged.department,
          gstInfo: merged.gstInfo,
        })
      } catch (err) {
        console.warn('[handleTransactionUpdate] cash expense persist skipped:', err)
      }
    }

    // Patch ONLY this statement's own rows — never write the merged History ledger back
    if (currentStatementId) {
      try {
        const statement = await indexedDBStorage.getStatement(currentStatementId)
        if (statement?.transactions?.length) {
          const patched = patchStatementTransactions(
            statement.transactions,
            updatedTransactions
          )
          await indexedDBStorage.updateStatement(currentStatementId, {
            ...statement,
            transactions: patched,
          })
          setExportStatementSnapshot((prev) =>
            prev && prev.statementId === currentStatementId
              ? { ...prev, transactions: patched as ClassifiedTransaction[] }
              : prev
          )
        }
      } catch (err) {
        console.error('Failed to update statement:', err)
      }
    }

    // After a date correction, realign P&L / Statement range so OCR years no longer cap the period
    if (normalisedDate) {
      const snapTxs = exportStatementSnapshot?.transactions
      const alignSource =
        snapTxs && snapTxs.length > 0
          ? repairLedgerTransactionDates(
              patchStatementTransactions(snapTxs, updatedTransactions)
            )
          : updatedTransactions
      alignViewPeriodToTransactions(alignSource)
    }
  }

  const statementExportOptions = () => ({
    overrideTransactions: exportStatementSnapshot?.transactions ?? null,
    overrideFileName: exportStatementSnapshot?.fileName ?? null,
    overridePeriod: exportStatementSnapshot?.period ?? null,
    // Match Biz Intel P&L / GST banner (e.g. Q3 Jan–Mar), not the whole PDF span
    dateRangeFilter:
      viewPeriod?.startDate && viewPeriod?.endDate
        ? { startDate: viewPeriod.startDate, endDate: viewPeriod.endDate }
        : null,
    // Add Cash Expense rows so P&L Period exports match on-screen company costs
    cashExpenses: transactions.filter(
      (tx) =>
        (tx as { source?: string }).source === 'manual' ||
        String((tx as { id?: string }).id || '').startsWith('cash_')
    ) as StatementExportRow[],
  })

  // Excel export: active statement ∩ P&L period (+ Cash Expenses); not all History/payroll
  const handleExportExcel = async (businessOnly: boolean = true) => {
    try {
      const resolved = await resolveStatementForExcelExport(
        currentStatementId,
        accountType,
        businessOnly,
        statementExportOptions()
      )
      if (!resolved.ok) {
        setError(resolved.error)
        return
      }

      const exportData: ExportTransaction[] = resolved.transactions.map((tx) => ({
        date: tx.date,
        description: tx.description,
        category: tx.category || 'UNCATEGORIZED',
        debit: tx.debit,
        credit: tx.credit,
        department: tx.department || 'unknown',
        status: tx.isDirectorsLoan
          ? "Director's Loan"
          : tx.isPreTradingExpense
            ? 'Pre-revenue'
            : 'Normal',
        balance: tx.balance || undefined,
      }))

      const safeFile = String(resolved.fileName)
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40)
      const fileName = businessOnly
        ? `statement-business-${safeFile || 'export'}`
        : `statement-all-${safeFile || 'export'}`

      exportToExcel(exportData, fileName)
      setLoadSuccessMessage(
        `Exported ${exportData.length} row${exportData.length === 1 ? '' : 's'} from ${resolved.fileName} · P&L period ${resolved.periodLabel} (statement ∩ banner + cash)`
      )
      setTimeout(() => setLoadSuccessMessage(null), 6000)
    } catch (err) {
      console.error('[Export] Failed to export statement Excel:', err)
      setError(err instanceof Error ? err.message : 'Failed to export Excel')
    }
  }

  // Financial summary = exact Biz Intel P&L / GST cards for the selected period
  const handleExportSummary = async () => {
    try {
      if (!viewPeriod?.startDate || !viewPeriod?.endDate) {
        setError('Select a P&L period before exporting the financial summary.')
        return
      }
      if (dashboardTransactions.length === 0) {
        setError('No transactions in the selected P&L period.')
        return
      }

      // Same inputs as Business Summary cards (includes Cash Expense + hydrated GST tags)
      const metrics = calculateBusinessMetrics(
        dashboardTransactions,
        metricsOpeningDirectorLoan,
        accountType,
        effectivePriorPeriodAdvances
      )
      const periodLabel = `${viewPeriod.startDate}_to_${viewPeriod.endDate}`
      const safeFile = String(
        exportStatementSnapshot?.fileName || currentStatementId || 'pl-period'
      )
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40)

      exportSummary(
        {
          totalIncome: metrics.totalIncome,
          totalExpenses: metrics.totalExpenses,
          netProfit: metrics.netProfit,
          totalGSTPayable: metrics.gstPayable,
          totalGSTClaimable: metrics.gstClaimable,
          directorsLoanBalance: metrics.directorsLoanBalance,
          cleaningIncome: metrics.totalIncome,
          stickerIncome: 0,
          periodLabel,
          rowCount: dashboardTransactions.length,
        },
        `statement-summary-${safeFile || 'export'}`
      )
      setLoadSuccessMessage(
        `Exported financial summary · P&L ${periodLabel} (${dashboardTransactions.length} rows · matches Biz Intel cards)`
      )
      setTimeout(() => setLoadSuccessMessage(null), 6000)
    } catch (err) {
      console.error('[Export] Failed to export summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to export summary')
    }
  }

  // BAS (P&L Period) — same rows + GST tags as Biz Intel GST Summary
  const handleExportBAS = async () => {
    try {
      if (!viewPeriod?.startDate || !viewPeriod?.endDate) {
        setError('Select a P&L period before exporting BAS.')
        return
      }
      if (dashboardTransactions.length === 0) {
        setError('No transactions in the selected P&L period.')
        return
      }

      const startDate = viewPeriod.startDate
      const endDate = viewPeriod.endDate
      const startMs = new Date(`${startDate}T12:00:00`).getTime()
      const endMs = new Date(`${endDate}T12:00:00`).getTime()
      const daysDiff = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24))
      const periodType: 'monthly' | 'quarterly' = daysDiff <= 35 ? 'monthly' : 'quarterly'

      const scoped = dashboardTransactions
      const report = generateBASReport(
        scoped,
        startDate,
        endDate,
        periodType,
        accountType,
        gstRegistered
      )

      // Bank statements rarely include payroll; keep empty rather than mixing History payroll
      const payrollTransactions = scoped
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

      const safeFile = String(
        exportStatementSnapshot?.fileName || currentStatementId || 'pl-period'
      )
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w\-]+/g, '_')
        .slice(0, 40)
      const periodLabel = `${startDate}_to_${endDate}`
      exportBASToExcel(report, payrollTransactions, `statement-bas-${safeFile || 'export'}`)
      setLoadSuccessMessage(
        `Exported BAS · P&L ${periodLabel} (${scoped.length} rows · GST matches Biz Intel)`
      )
      setTimeout(() => setLoadSuccessMessage(null), 6000)
    } catch (err) {
      console.error('[Export] Failed to export BAS:', err)
      setError(err instanceof Error ? err.message : 'Failed to export BAS')
    }
  }

  // Delete single statement
  const handleDeleteStatement = async (id: string) => {
    try {
      // Get statement to delete (to get its transactions)
      const statement = await indexedDBStorage.getStatement(id)
      
      // Delete the statement (this removes it from IndexedDB)
      await indexedDBStorage.deleteStatement(id)
      
      // Note: Transactions are stored within the statement object in IndexedDB,
      // so deleting the statement automatically removes all associated transactions
      // No need for separate transaction deletion
      
      await loadStatementHistory()
      setShowDeleteConfirm(null)
      
      // If deleted statement was current, clear transactions
      if (currentStatementId === id) {
        setTransactions([])
        setCurrentStatementId(null)
        setExportStatementSnapshot(null)
      }
    } catch (err) {
      console.error('Failed to delete statement:', err)
      setError('Failed to delete statement')
    }
  }

  // Delete all statements
  const handleDeleteAllStatements = async () => {
    if (!confirm('Are you sure you want to delete ALL statement history? This cannot be undone. Export a JSON backup from Settings → Data Management first.')) {
      return
    }
    
    try {
      await indexedDBStorage.deleteAllStatements()
      await loadStatementHistory()
      setTransactions([])
      setCurrentStatementId(null)
      setExportStatementSnapshot(null)
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete all statements:', err)
      setError('Failed to delete all statements')
    }
  }

  // Format storage size
  const formatStorageSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  // Calculate financial summary
  const financialSummary = calculateFinancialSummary(transactions)

  // Listen for openSettings event from TaxDeadlineTracker
  useEffect(() => {
    const handleOpenSettings = () => {
      setActiveTab('settings')
    }
    window.addEventListener('openSettings', handleOpenSettings)
    return () => {
      window.removeEventListener('openSettings', handleOpenSettings)
    }
  }, [])
  
  // Listen for clearAllHistory event
  useEffect(() => {
    const handleClearAllHistory = async () => {
      try {
        await indexedDBStorage.deleteAllStatements()
        setTransactions([])
        setCurrentStatementId(null)
        await loadStatementHistory()
        setActiveTab('dashboard')
      } catch (err) {
        console.error('Failed to clear all history:', err)
        setError('Failed to clear all history')
      }
    }
    window.addEventListener('clearAllHistory', handleClearAllHistory)
    return () => {
      window.removeEventListener('clearAllHistory', handleClearAllHistory)
    }
  }, [])

  // Opening Director's Loan Balance (Settings / Edit Opening → localStorage)
  const [openingDirectorLoanBalance, setOpeningDirectorLoanBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opening_director_loan_balance')
      if (saved !== null && saved !== '') {
        const parsed = parseFloat(saved)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
    // No silent $1000 default — opening must come from Settings or a statement loan row
    return 0
  })

  const [priorPeriodDirectorAdvances, setPriorPeriodDirectorAdvances] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return loadDirectorLoanAdvanceSettings().manualPriorAdvances
    }
    return 0
  })
  const [autoMatchPriorAdvances, setAutoMatchPriorAdvances] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return loadDirectorLoanAdvanceSettings().autoMatchReimbursements
    }
    return false
  })

  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([])
  const [viewPeriod, setViewPeriod] = useState<DashboardViewPeriod>(() => getDefaultViewPeriod())
  const [openingCashBalance, setOpeningCashBalance] = useState(0)

  /** First calendar month in the selected range — used for period lock / legacy hooks */
  const viewPeriodId = firstMonthPeriodId(viewPeriod)

  // Save opening balance to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opening_director_loan_balance', openingDirectorLoanBalance.toString())
    }
  }, [openingDirectorLoanBalance])

  useEffect(() => {
    saveDirectorLoanAdvanceSettings(priorPeriodDirectorAdvances, autoMatchPriorAdvances)
  }, [priorPeriodDirectorAdvances, autoMatchPriorAdvances])

  const loadFinancialPeriods = async () => {
    try {
      const periods = await indexedDBStorage.getAllPeriods()
      setFinancialPeriods(periods)

      const storedRange = getViewPeriodFromStorage()
      const legacyMonth = getViewPeriodIdFromStorage()
      if (storedRange) {
        setViewPeriod(storedRange)
      } else {
        const migrated = migrateLegacyViewPeriodId(legacyMonth)
        if (migrated) {
          setViewPeriod(migrated)
          setViewPeriodInStorage(migrated)
        } else if (legacyMonth) {
          const monthRange = migrateLegacyViewPeriodId(legacyMonth)
          if (monthRange) setViewPeriod(monthRange)
        } else {
          const current = await indexedDBStorage.getCurrentPeriod()
          if (current?.id) {
            const fromCurrent = migrateLegacyViewPeriodId(current.id)
            if (fromCurrent) setViewPeriod(fromCurrent)
          }
        }
      }

      const profile = await indexedDBStorage.getBusinessProfile()
      setOpeningCashBalance(profile?.openingCashBalance ?? 0)
    } catch (err) {
      console.error('Failed to load financial periods:', err)
    }
  }

  useEffect(() => {
    loadFinancialPeriods()

    const onPeriodChanged = () => loadFinancialPeriods()
    const onProfileUpdated = () => loadFinancialPeriods()
    const onViewPeriodChanged = (e: Event) => {
      const period = (e as CustomEvent<{ period: DashboardViewPeriod }>).detail?.period
      if (period?.startDate && period?.endDate) setViewPeriod(period)
    }

    window.addEventListener(PERIOD_CHANGED_EVENT, onPeriodChanged)
    window.addEventListener('dashboardViewPeriodChanged', onViewPeriodChanged)
    window.addEventListener('businessProfileUpdated', onProfileUpdated)
    return () => {
      window.removeEventListener(PERIOD_CHANGED_EVENT, onPeriodChanged)
      window.removeEventListener('dashboardViewPeriodChanged', onViewPeriodChanged)
      window.removeEventListener('businessProfileUpdated', onProfileUpdated)
    }
  }, [])

  const alignViewPeriodToTransactions = useCallback(
    (txs: Array<{ date: string }>) => {
      if (accountType === 'individual') return
      const inferred = inferViewPeriodFromTransactions(txs)
      setViewPeriod(inferred)
      setViewPeriodInStorage(inferred)
      setViewPeriodIdInStorage(firstMonthPeriodId(inferred))
    },
    [accountType]
  )

  const changeViewPeriod = useCallback((period: DashboardViewPeriod) => {
    if (period.endDate < period.startDate) return
    setViewPeriod(period)
    setViewPeriodInStorage(period)
    setViewPeriodIdInStorage(firstMonthPeriodId(period))
  }, [])

  const revealUploadedTransactions = useCallback(
    (txs: Array<{ date: string }>) => {
      requestTransactionHistoryExpand()
      alignViewPeriodToTransactions(txs)
    },
    [alignViewPeriodToTransactions]
  )

  const switchViewPeriodToTransactionData = useCallback(() => {
    alignViewPeriodToTransactions(transactions)
  }, [alignViewPeriodToTransactions, transactions])

  const lockedPeriodIds = useMemo(
    () => getLockedPeriodIds(financialPeriods),
    [financialPeriods]
  )

  /** Remove one Add Cash Expense row from IndexedDB and refresh ledger (P&L/GST follow). */
  const handleCashExpenseDelete = async (cashExpenseId: string) => {
    const id = typeof cashExpenseId === 'string' ? cashExpenseId.trim() : ''
    if (!id) {
      throw new Error('Cash expense id required')
    }

    const row = transactions.find((tx) => tx.id === id)
    const dateToCheck = row?.date
    if (dateToCheck && isDateInLockedPeriod(dateToCheck, lockedPeriodIds)) {
      window.alert(
        'This Cash Expense is in a locked period. Unlock the period in Period Management before deleting.'
      )
      return
    }

    try {
      await indexedDBStorage.deleteCashExpense(id)
      await loadCashExpenses()
    } catch (err) {
      console.error('Failed to delete cash expense:', err)
      throw err
    }
  }

  /**
   * When a statement was just uploaded/loaded, Biz Intel / Lodgment / Reports
   * use that file only (not all History). OCR years (267→2026) are repaired;
   * real prior-year rows (e.g. 2025-05 Jason) stay out of the BAS window.
   */
  const activeLedgerTransactions = useMemo(() => {
    const snap = exportStatementSnapshot?.transactions
    if (snap && snap.length > 0) {
      const bankOnly = snap.filter(
        (tx) => tx.source !== 'payroll' && !tx.isPayrollTransaction
      )
      const repaired = repairUsMisparsedAustralianDates(
        repairStatementDateAnomalies(bankOnly)
      )
      return normalizeCorporateTransactions(
        hydrateLedgerTransactions(repaired),
        accountType
      ) as ClassifiedTransaction[]
    }
    return transactions
  }, [exportStatementSnapshot, transactions, accountType])

  const isStatementLedgerScope = Boolean(
    exportStatementSnapshot?.transactions &&
      exportStatementSnapshot.transactions.length > 0
  )

  // Banner period misses statement rows (OCR-truncated end, or still on current BAS Q
  // while the upload is a prior quarter) — re-infer so P&L matches History.
  useEffect(() => {
    if (accountType === 'individual') return
    if (!isStatementLedgerScope || activeLedgerTransactions.length < 3) return

    const startIso = toIsoDateString(viewPeriod.startDate) || viewPeriod.startDate
    const endIso = toIsoDateString(viewPeriod.endDate) || viewPeriod.endDate
    const inRange = filterTransactionsForDateRange(
      activeLedgerTransactions,
      startIso,
      endIso
    ).length
    const total = activeLedgerTransactions.length
    const hasOutside = activeLedgerTransactions.some((tx) => {
      const d = toIsoDateString(tx.date)
      return !!d && (d < startIso || d > endIso)
    })

    const truncatedLooseRange =
      (viewPeriod.preset === 'statement' || viewPeriod.preset === 'custom') && hasOutside
    // Complete miss: e.g. banner still BAS Q1 Jul–Sep while statement is Apr–Jun
    const completeMiss = inRange === 0 && total > 0

    if (!truncatedLooseRange && !completeMiss) return

    const inferred = inferViewPeriodFromTransactions(activeLedgerTransactions)
    if (
      inferred.startDate === viewPeriod.startDate &&
      inferred.endDate === viewPeriod.endDate &&
      inferred.preset === viewPeriod.preset
    ) {
      return
    }
    setViewPeriod(inferred)
    setViewPeriodInStorage(inferred)
    setViewPeriodIdInStorage(firstMonthPeriodId(inferred))
  }, [
    accountType,
    isStatementLedgerScope,
    activeLedgerTransactions,
    viewPeriod.preset,
    viewPeriod.startDate,
    viewPeriod.endDate,
  ])

  const uncategorisedCount = useMemo(() => {
    return activeLedgerTransactions.filter(
      (tx) =>
        tx.category !== 'TRANSFER_INTERNAL' &&
        (!tx.category || tx.category === 'UNCATEGORIZED')
    ).length
  }, [activeLedgerTransactions])

  const profileComplete = useMemo(() => {
    if (accountType === 'individual') {
      return !!companyInfo.name && companyInfo.name !== 'Individual User'
    }
    return !!companyInfo.abn && !!companyInfo.name
  }, [accountType, companyInfo])

  const allPeriodsLocked = useMemo(() => {
    if (accountType === 'individual') return true
    const monthIds = new Set(
      transactions.map((tx) => generatePeriodIdFromDateString(tx.date))
    )
    if (monthIds.size === 0) return false
    return [...monthIds].every((id) => lockedPeriodIds.has(id))
  }, [accountType, transactions, lockedPeriodIds])

  const journeyFinancialYear = getCurrentFinancialYearRange().financialYear
  const hasReviewedReports = useJourneyReportsReview(journeyFinancialYear, accountType, activeTab)

  const refreshJourneyMeta = useCallback(async () => {
    try {
      await indexedDBStorage.init()
      if (accountType === 'individual') {
        const totals = await indexedDBStorage.sumPaymentSummariesForYear(journeyFinancialYear)
        setPaymentSummaryCount(totals.count)
      } else {
        setPaymentSummaryCount(0)
      }
      const snaps = await indexedDBStorage.getLodgmentSnapshots()
      const relevant =
        accountType === 'individual'
          ? snaps.filter((s) => s.accountType === 'individual' || s.kind === 'individual')
          : snaps.filter((s) => s.accountType !== 'individual')
      setHasLodgmentSnapshot(
        relevant.some((s) => s.finalizedAt != null) ||
          relevant.some((s) => Object.keys(s.entered || {}).filter((k) => s.entered[k]).length >= 3)
      )
    } catch {
      /* ignore */
    }
  }, [accountType, journeyFinancialYear])

  useEffect(() => {
    refreshJourneyMeta()
  }, [refreshJourneyMeta, transactions.length])

  useEffect(() => {
    const onPaymentUpdated = () => refreshJourneyMeta()
    const onSnapshotSaved = () => refreshJourneyMeta()
    window.addEventListener(PAYMENT_SUMMARY_UPDATED_EVENT, onPaymentUpdated)
    window.addEventListener(LODGMENT_SNAPSHOT_SAVED_EVENT, onSnapshotSaved)
    return () => {
      window.removeEventListener(PAYMENT_SUMMARY_UPDATED_EVENT, onPaymentUpdated)
      window.removeEventListener(LODGMENT_SNAPSHOT_SAVED_EVENT, onSnapshotSaved)
    }
  }, [refreshJourneyMeta])

  const handleJourneyNavigate = useCallback((target: JourneyNavigateTarget) => {
    if (target === 'settings') {
      setActiveTab('settings')
      return
    }
    if (target === 'ato') {
      setActiveTab('ato')
      return
    }
    if (target === 'reports') {
      setActiveTab('reports')
      return
    }
    if (target === 'payment_summary') {
      setActiveTab('dashboard')
      setTimeout(() => {
        document.getElementById('payment-summary-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }
    setActiveTab('dashboard')
  }, [])

  const viewingPeriod = useMemo(
    () => financialPeriods.find((p) => p.id === viewPeriodId) ?? null,
    [financialPeriods, viewPeriodId]
  )

  const dashboardTransactions = useMemo(() => {
    // Statement upload: statement ∩ banner period + Cash Expenses in that window
    let scoped: typeof transactions
    if (isStatementLedgerScope) {
      if (accountType === 'individual') {
        scoped = activeLedgerTransactions as typeof transactions
      } else {
        const bankInPeriod = filterTransactionsForDateRange(
          activeLedgerTransactions,
          viewPeriod.startDate,
          viewPeriod.endDate
        )
        scoped = mergeManualCashExpenses(
          bankInPeriod,
          transactions,
          viewPeriod.startDate,
          viewPeriod.endDate
        ) as typeof transactions
      }
    } else if (accountType === 'individual') {
      scoped = transactions
    } else {
      scoped = filterTransactionsForDateRange(
        transactions,
        viewPeriod.startDate,
        viewPeriod.endDate
      ) as typeof transactions
    }
    return hydrateFundedByDirectorOnLedger(scoped)
  }, [
    isStatementLedgerScope,
    activeLedgerTransactions,
    transactions,
    viewPeriod.startDate,
    viewPeriod.endDate,
    accountType,
  ])

  /** Full ledger (incl. cash) for DL roll-forward opening before the view window. */
  const directorsLoanLedgerTransactions = useMemo(() => {
    const rows =
      isStatementLedgerScope && accountType !== 'individual'
        ? (mergeManualCashExpenses(activeLedgerTransactions, transactions) as typeof transactions)
        : transactions
    return hydrateFundedByDirectorOnLedger(rows)
  }, [
    isStatementLedgerScope,
    activeLedgerTransactions,
    transactions,
    accountType,
  ])

  const metricsOpeningDirectorLoan = useMemo(() => {
    // Locked single month: freeze stored period opening.
    if (viewingPeriod?.isLocked && viewPeriod.preset === 'month') {
      return viewingPeriod.openingDirectorLoanBalance
    }
    // Quarter / FY / unlocked month: roll Settings opening through all txs before range start.
    return computeDirectorsLoanOpeningAtRangeStart(
      directorsLoanLedgerTransactions as any,
      openingDirectorLoanBalance,
      accountType,
      viewPeriod.startDate
    )
  }, [
    viewingPeriod,
    viewPeriod.preset,
    viewPeriod.startDate,
    directorsLoanLedgerTransactions,
    openingDirectorLoanBalance,
    accountType,
  ])

  const txsBeforeViewPeriod = useMemo(
    () => transactionsBeforeDate(directorsLoanLedgerTransactions, viewPeriod.startDate),
    [directorsLoanLedgerTransactions, viewPeriod.startDate]
  )

  const [reportsScopeMode, setReportsScopeMode] = useState<LodgmentScopeMode>(() =>
    typeof window !== 'undefined' ? getStoredScopeMode() : 'full'
  )

  useEffect(() => {
    const onScopeChanged = (e: Event) => {
      const mode = (e as CustomEvent<{ mode: LodgmentScopeMode }>).detail?.mode
      if (mode) setReportsScopeMode(mode)
    }
    window.addEventListener(ACCOUNTING_SCOPE_MODE_CHANGED, onScopeChanged)
    return () => window.removeEventListener(ACCOUNTING_SCOPE_MODE_CHANGED, onScopeChanged)
  }, [])

  const handleReportsScopeModeChange = (mode: LodgmentScopeMode) => {
    setReportsScopeMode(mode)
    setStoredScopeMode(mode)
  }

  /** Bank / statement rows + manual Cash Expenses (never in PDF snapshot). */
  const reportMappedTransactions = useMemo(() => {
    const bank = activeLedgerTransactions
      .filter((tx) => tx.source !== 'payroll' && !tx.isPayrollTransaction)
      .map((tx) => ({
        ...tx,
        id: tx.id || `${tx.date}_${tx.description}`,
      }))
    const withCash = mergeManualCashExpenses(bank, transactions)
    return hydrateLedgerTransactions(withCash) as typeof bank
  }, [activeLedgerTransactions, transactions])

  /**
   * FY / BAS from statement cluster + dashboard month.
   * Prefer the FY / quarter that actually has ledger rows.
   * Never force an empty calendar FY/Q1 just because a stale dashboard month
   * (e.g. 2025-07) sits outside the Apr–Jun statement cluster.
   */
  const reportsFyRange = useMemo(() => {
    const knownPeriodIds = financialPeriods.map((p) => p.id)
    if (viewPeriodId) knownPeriodIds.push(viewPeriodId)
    let range = resolveReportingFinancialYearRange({
      transactions: reportMappedTransactions,
      viewPeriodId,
      knownPeriodIds,
    })
    if (viewPeriodId && /^\d{4}-\d{2}$/.test(viewPeriodId)) {
      const viewIso = `${viewPeriodId}-15`
      if (viewIso < range.startDate || viewIso > range.endDate) {
        const viewAligned = resolveReportingFinancialYearRange({
          transactions: [],
          viewPeriodId,
        })
        const txsInViewFy = reportMappedTransactions.filter((tx) => {
          const d = toIsoDateString(tx.date)
          return !!d && d >= viewAligned.startDate && d <= viewAligned.endDate
        }).length
        if (txsInViewFy > 0) {
          range = viewAligned
        }
      }
    }
    return range
  }, [reportMappedTransactions, viewPeriodId, financialPeriods])

  const reportsBasQuarter = useMemo(() => {
    const knownPeriodIds = financialPeriods.map((p) => p.id)
    if (viewPeriodId) knownPeriodIds.push(viewPeriodId)
    let quarter = resolveReportingBasQuarter({
      transactions: reportMappedTransactions,
      viewPeriodId,
      knownPeriodIds,
    })
    // Align to dashboard month only when that BAS quarter has activity.
    // Stale Q1 (Jul–Sep) with Apr–Jun statements must not wipe BAS to $0.
    if (viewPeriodId && /^\d{4}-\d{2}$/.test(viewPeriodId)) {
      const viewIso = `${viewPeriodId}-15`
      if (viewIso < quarter.startDateStr || viewIso > quarter.endDateStr) {
        const viewAligned = resolveReportingBasQuarter({
          transactions: [],
          viewPeriodId,
        })
        const txsInViewQuarter = reportMappedTransactions.filter((tx) => {
          const d = toIsoDateString(tx.date)
          return (
            !!d && d >= viewAligned.startDateStr && d <= viewAligned.endDateStr
          )
        }).length
        if (txsInViewQuarter > 0) {
          quarter = viewAligned
        }
      }
    }
    return quarter
  }, [reportMappedTransactions, viewPeriodId, financialPeriods])

  /**
   * Financial reports (IS / BS / CTR / BAS) must include the full reporting range
   * (Apr–Jun Q4 / whole FY). "Dashboard month" is for month-end closing only —
   * using it here dropped May–Jun and broke cross-tab totals.
   */
  const reportsStatementScopeMode =
    reportsScopeMode === 'dashboard_month' ? 'full' : reportsScopeMode

  const reportsFyTransactions = useMemo(() => {
    if (accountType === 'individual') return reportMappedTransactions
    return applyLodgmentScope(
      reportMappedTransactions,
      reportsFyRange.startDate,
      reportsFyRange.endDate,
      reportsStatementScopeMode,
      lockedPeriodIds,
      viewPeriodId
    )
  }, [
    reportMappedTransactions,
    reportsFyRange,
    reportsStatementScopeMode,
    lockedPeriodIds,
    viewPeriodId,
    accountType,
  ])

  const reportsOpeningDirectorLoan = useMemo(() => {
    if (accountType === 'individual') return openingDirectorLoanBalance
    return getOpeningBalanceForLodgmentScope(
      reportsScopeMode,
      reportsFyRange.startDate,
      viewPeriodId,
      financialPeriods,
      openingDirectorLoanBalance,
      metricsOpeningDirectorLoan
    )
  }, [
    accountType,
    reportsScopeMode,
    reportsFyRange.startDate,
    viewPeriodId,
    financialPeriods,
    openingDirectorLoanBalance,
    metricsOpeningDirectorLoan,
  ])

  const reportsBasTransactions = useMemo(() => {
    if (accountType === 'individual') return reportMappedTransactions
    return applyLodgmentScope(
      reportMappedTransactions,
      reportsBasQuarter.startDateStr,
      reportsBasQuarter.endDateStr,
      reportsStatementScopeMode,
      lockedPeriodIds,
      viewPeriodId
    )
  }, [
    reportMappedTransactions,
    reportsBasQuarter,
    reportsStatementScopeMode,
    lockedPeriodIds,
    viewPeriodId,
    accountType,
  ])

  /** When P&L banner = Reports BAS quarter, use exact Biz Intel rows for BAS GST. */
  const reportsBasMatchesViewPeriod = useMemo(
    () =>
      viewPeriodMatchesRange(
        viewPeriod,
        reportsBasQuarter.startDateStr,
        reportsBasQuarter.endDateStr
      ),
    [viewPeriod, reportsBasQuarter.startDateStr, reportsBasQuarter.endDateStr]
  )

  const reportsBasDisplayTransactions = useMemo(() => {
    if (accountType === 'individual') return reportsBasTransactions
    if (reportsBasMatchesViewPeriod && dashboardTransactions.length > 0) {
      return dashboardTransactions
    }
    return reportsBasTransactions
  }, [
    accountType,
    reportsBasMatchesViewPeriod,
    dashboardTransactions,
    reportsBasTransactions,
  ])

  const reportsBasOpeningDirectorLoan = useMemo(() => {
    if (reportsBasMatchesViewPeriod) return metricsOpeningDirectorLoan
    // Always roll Settings through history before the BAS quarter — do not use a
    // bare Settings figure that ignores Dec director-funded cash.
    return computeDirectorsLoanOpeningAtRangeStart(
      directorsLoanLedgerTransactions as any,
      openingDirectorLoanBalance,
      accountType,
      reportsBasQuarter.startDateStr
    )
  }, [
    reportsBasMatchesViewPeriod,
    metricsOpeningDirectorLoan,
    directorsLoanLedgerTransactions,
    openingDirectorLoanBalance,
    accountType,
    reportsBasQuarter.startDateStr,
  ])

  const reportsBasPriorAdvances = useMemo(() => {
    // Same rule as Biz Intel: rolled opening already includes pre-window advances.
    // Auto-matching prior on Q4 reimbursements alone re-adds ~$8,781 → closing $10,281.89.
    if (reportsBasMatchesViewPeriod) {
      return resolvePriorAdvancesForScopedWindow(
        dashboardTransactions,
        txsBeforeViewPeriod.length > 0,
        priorPeriodDirectorAdvances,
        autoMatchPriorAdvances
      )
    }
    const settings = loadDirectorLoanAdvanceSettings()
    const beforeBas = transactionsBeforeDate(
      directorsLoanLedgerTransactions,
      reportsBasQuarter.startDateStr
    )
    return resolvePriorAdvancesForScopedWindow(
      reportsBasTransactions,
      beforeBas.length > 0,
      settings.manualPriorAdvances,
      settings.autoMatchReimbursements
    )
  }, [
    reportsBasMatchesViewPeriod,
    dashboardTransactions,
    txsBeforeViewPeriod.length,
    priorPeriodDirectorAdvances,
    autoMatchPriorAdvances,
    directorsLoanLedgerTransactions,
    reportsBasQuarter.startDateStr,
    reportsBasTransactions,
  ])


  useEffect(() => {
    if (accountType === 'individual' || transactions.length === 0) return

    // Manual prior only — never auto-match lump into Period months.
    syncAllOpenPeriods(
      transactions,
      openingDirectorLoanBalance,
      openingCashBalance,
      priorPeriodDirectorAdvances
    )
      .then(() => indexedDBStorage.getAllPeriods().then(setFinancialPeriods))
      .catch((err) => console.error('Period sync failed:', err))
  }, [
    transactions,
    accountType,
    openingDirectorLoanBalance,
    openingCashBalance,
    priorPeriodDirectorAdvances,
  ])

  // Save transactions to localStorage when they change (never persist leftover payroll journals)
  useEffect(() => {
    if (typeof window !== 'undefined' && transactions.length > 0) {
      const withoutPayroll = transactions.filter(
        (tx) => tx.source !== 'payroll' && !tx.isPayrollTransaction
      )
      localStorage.setItem('accounting_transactions', JSON.stringify(withoutPayroll))
    }
  }, [transactions])

  const effectivePriorPeriodAdvances = useMemo(() => {
    // Manual prior always applies.
    // When we already rolled DL through txs before the window, skip auto-match
    // (reimbursements in-window must reduce the rolled opening, not get a matching +prior).
    if (priorPeriodDirectorAdvances > 0) {
      return resolvePriorPeriodDirectorAdvances(
        dashboardTransactions,
        priorPeriodDirectorAdvances,
        autoMatchPriorAdvances
      )
    }
    if (txsBeforeViewPeriod.length > 0) return 0
    return resolvePriorPeriodDirectorAdvances(
      dashboardTransactions,
      0,
      autoMatchPriorAdvances
    )
  }, [
    dashboardTransactions,
    priorPeriodDirectorAdvances,
    autoMatchPriorAdvances,
    txsBeforeViewPeriod.length,
  ])

  const directorLoanReimbursementTotal = useMemo(
    () => sumDirectorReimbursementDebits(dashboardTransactions),
    [dashboardTransactions]
  )

  const directorLoanInjectionTotal = useMemo(
    () => sumDirectorLoanInjectionCredits(dashboardTransactions),
    [dashboardTransactions]
  )

  // Calculate all business metrics using single source of truth
  const businessMetrics = useMemo(() => {
    return calculateBusinessMetrics(
      dashboardTransactions,
      metricsOpeningDirectorLoan,
      accountType,
      effectivePriorPeriodAdvances
    )
  }, [
    dashboardTransactions,
    metricsOpeningDirectorLoan,
    accountType,
    effectivePriorPeriodAdvances,
  ])

  // Extract individual metrics
  const totalIncome = businessMetrics.totalIncome
  const totalExpenses = businessMetrics.totalExpenses
  const netProfit = businessMetrics.netProfit
  const gstPayable = businessMetrics.gstPayable
  const gstClaimable = businessMetrics.gstClaimable
  const taxableExpenses = businessMetrics.taxableExpenses
  const directorsLoanBalance = businessMetrics.directorsLoanBalance
  const personalSpendingNonDeductible = businessMetrics.personalSpendingNonDeductible

  const handleClassificationModeChange = useCallback((mode: ClassificationMode) => {
    setClassificationMode(mode)
    saveClassificationMode(mode)
  }, [])

  const personalSpending = useMemo(() => {
    return transactions
      .filter(tx => tx.department === 'personal')
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0) + Math.abs(tx.credit || 0), 0)
  }, [transactions])
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
    exportStatementSnapshot,
    activeLedgerTransactions,
    isStatementLedgerScope,
    storageSize,
    showDeleteConfirm,
    setShowDeleteConfirm,
    activeTab,
    setActiveTab,
    loadSuccessMessage,
    setLoadSuccessMessage,
    duplicateFileDialog,
    setDuplicateFileDialog,
    sessionApiCost,
    appendMode,
    setAppendMode,
    isUnlocked,
    setIsUnlocked,
    setupComplete,
    setSetupComplete,
    companyInfo,
    setCompanyInfo,
    setApiKey,
    setUserApiKey,
    setDirectorName,
    setTransactions,
    setCurrentStatementId,
    accountType,
    paymentSummaryCount,
    hasLodgmentSnapshot,
    skipPaymentSummary,
    gstRegistered,
    gstReportingCycle,
    companyTaxRate,
    classificationMode,
    onClassificationModeChange: handleClassificationModeChange,
    openingDirectorLoanBalance,
    setOpeningDirectorLoanBalance,
    priorPeriodDirectorAdvances,
    setPriorPeriodDirectorAdvances,
    autoMatchPriorAdvances,
    setAutoMatchPriorAdvances,
    effectivePriorPeriodAdvances,
    directorLoanReimbursementTotal,
    directorLoanInjectionTotal,
    financialPeriods,
    setFinancialPeriods,
    viewPeriodId,
    viewPeriod,
    openingCashBalance,
    lockedPeriodIds,
    uncategorisedCount,
    profileComplete,
    allPeriodsLocked,
    journeyFinancialYear,
    hasReviewedReports,
    switchViewPeriodToTransactionData,
    changeViewPeriod,
    revealUploadedTransactions,
    handleJourneyNavigate,
    viewingPeriod,
    dashboardTransactions,
    activeLedgerTransactions,
    metricsOpeningDirectorLoan,
    reportsScopeMode,
    handleReportsScopeModeChange,
    reportMappedTransactions,
    reportsFyRange,
    reportsBasQuarter,
    reportsFyTransactions,
    reportsBasTransactions,
    reportsBasDisplayTransactions,
    reportsBasOpeningDirectorLoan,
    reportsBasPriorAdvances,
    reportsBasMatchesViewPeriod,
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
    handleCashExpenseDelete,
    handleTransactionUpdate,
    handleExportExcel,
    handleExportSummary,
    handleExportBAS,
    handleDeleteStatement,
    handleDeleteAllStatements,
    formatStorageSize,
    loadStatement,
    loadStatementHistory,
    historyLoadError,
    unsavedCacheTransactionCount,
    recoverTransactionsFromBrowserCache,
    loadAllTransactions,
    setError,
    financialSummary,
  }
}

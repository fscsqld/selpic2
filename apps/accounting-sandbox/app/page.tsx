'use client'

/**
 * Enhanced Accounting Dashboard with Step 3 Features:
 * - Data Persistence (IndexedDB)
 * - Manual Category Override
 * - Excel Export
 * - Financial Summary
 */

import { useState, useEffect, useMemo } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Settings, Loader2, Download, History, Save, Trash2, AlertTriangle, TrendingUp, TrendingDown, Receipt, DollarSign, Sparkles, X, RefreshCw, Eye, ChevronDown, ChevronUp, Users, Coins, BarChart } from 'lucide-react'
import { strings } from '@/lib/i18n/strings'
import { ApiKeyForm } from '@/components/Settings/ApiKeyForm'
import { ApiBalanceDashboard } from '@/components/Settings/ApiBalanceDashboard'
import { PAYGConfigForm } from '@/components/Settings/PAYGConfigForm'
import { EmployeeManagement } from '@/components/Payroll/EmployeeManagement'
import { PayslipGenerator } from '@/components/Payroll/PayslipGenerator'
import { TimesheetEntryForm } from '@/components/Payroll/TimesheetEntryForm'
import { TimesheetApproval } from '@/components/Payroll/TimesheetApproval'
import { EmployeeList, EmployeeDetailPage, EmployeeAddForm, MyPayrollPage } from '@/components/HR'
import { getCurrentEmployeeSession } from '@/lib/auth/employee-auth'
import { BusinessProfileForm } from '@/components/Settings/BusinessProfileForm'
import { DataBackupRestore } from '@/components/Settings/DataBackupRestore'
import { PeriodManagement } from '@/components/Settings/PeriodManagement'
import { IncomingOrders } from '@/components/Settings/IncomingOrders'
import { TransactionTable } from '@/components/TransactionTable'
import { FinancialSummary } from '@/components/FinancialSummary'
import { PAYGSummary } from '@/components/PAYGSummary'
import { GSTSummary } from '@/components/GSTSummary'
import { FBTMonitor } from '@/components/FBTMonitor'
import { CashExpenseForm } from '@/components/CashExpenseForm'
import { ExpenseCharts } from '@/components/ExpenseCharts'
import { BusinessSummaryCards } from '@/components/BusinessSummaryCards'
import { BASReportView } from '@/components/Reports/BASReportView'
import { IncomeStatementView } from '@/components/Reports/IncomeStatementView'
import { PINLock } from '@/components/Security/PINLock'
import { RealTimePLView } from '@/components/RealTimePLView'
import { AssetManagement } from '@/components/AssetManagement'
import { TaxProvision } from '@/components/TaxProvision'
import { AuditTrailView } from '@/components/AuditTrailView'
import { CompliancePackageExporter } from '@/components/ComplianceReporting/CompliancePackageExporter'
import { SetupWizard } from '@/components/Onboarding/SetupWizard'
import { TaxDeadlineTracker } from '@/components/TaxDeadlineTracker'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { exportToExcel, exportSummary, ExportTransaction } from '@/lib/excel-export'
import { generateBASReport, exportBASToExcel, getPeriodDateRange } from '@/lib/payg-withholding/bas-reporter'
import { calculateFinancialSummary, FinancialSummary as SummaryType } from '@/lib/utils/financial-summary'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian, formatDateObjectAustralian } from '@/lib/utils/date-format'
import { BankTransaction } from '@/lib/pdf-parser/types'
import { findUserMapping } from '@/lib/storage/user-mappings'
// ✅ SSO 핸들러
import { extractSSOToken, saveSSOToken, getSSOToken } from '@/lib/sso-handler'

interface ClassifiedTransaction extends BankTransaction {
  id?: string
  category?: string
  confidence?: number | string // Can be number (0-1) or "Manual" or "Learned" string
  department?: string
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  isLearnedMapping?: boolean // Indicates if category was applied from user mappings
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  }
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
    confidence: number
    reasoning?: string
  }
  capitalImprovementWarning?: boolean // Capital Improvement 확인 필요 여부
  isUnusualCredit?: boolean // Indicates unusual but valid Credit transaction (e.g., refund from expense vendor)
  fbtInfo?: {
    isFBTRelevant: boolean
    fbtCategory?: 'meal' | 'entertainment' | 'travel' | 'vehicle' | 'other'
    fbtRisk?: 'low' | 'medium' | 'high'
    isFBTReportable: boolean
    fbtAmount?: number
    reasoning?: string
    confidence: number
  }
}

export default function AccountingDashboard() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [userApiKey, setUserApiKey] = useState<string>('') // User's own API key
  const [directorName, setDirectorName] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statementHistory, setStatementHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null)
  const [storageSize, setStorageSize] = useState<number>(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showCashExpenseForm, setShowCashExpenseForm] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null)
  const [showDirectorsLoanFilter, setShowDirectorsLoanFilter] = useState<boolean>(false)
  // Transaction History collapse state
  const [isTransactionHistoryExpanded, setIsTransactionHistoryExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('transactionHistory_expanded')
      return saved === 'true'
    }
    return true // Default to expanded for Transaction History
  })
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings' | 'reports' | 'hr'>(() => {
    // URL 파라미터에서 탭 읽기
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      // hr (기존 payroll), compliance는 별도 탭으로 처리
      if (tabParam === 'hr' || tabParam === 'payroll') {
        return 'hr' // payroll도 hr로 리다이렉트
      }
      if (tabParam === 'compliance') {
        return 'reports' // compliance는 Reports 탭으로
      }
      if (tabParam === 'reports' || tabParam === 'dashboard' || tabParam === 'history' || tabParam === 'settings') {
        return tabParam as 'dashboard' | 'history' | 'settings' | 'reports'
      }
    }
    return 'dashboard'
  })
  
  // HR: 선택된 직원 상태
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false)
  const [isEmployeeLoggedIn, setIsEmployeeLoggedIn] = useState(false)
  
  // 직원 로그인 상태 및 권한 확인
  useEffect(() => {
    const ssoToken = getSSOToken()
    const employeeSession = getCurrentEmployeeSession()
    
    // SSO 토큰 기반 권한 확인
    const isAccountingManager = ssoToken && (
      ssoToken.role === 'super_admin' || 
      ssoToken.permissions.includes('accounting:admin') ||
      ssoToken.permissions.includes('accounting:full')
    )
    const isPayrollOnly = ssoToken && !isAccountingManager && (
      ssoToken.permissions.includes('payroll:read') || 
      ssoToken.permissions.includes('payroll:access')
    )
    
    // 일반 관리자 (급여 전용)인 경우 HR 탭으로 강제 이동 및 MyPayrollPage 표시
    if (isPayrollOnly) {
      if (activeTab !== 'hr') {
        console.log('🔄 Payroll-only admin: Redirecting to HR tab')
        setActiveTab('hr')
      }
      // MyPayrollPage 표시를 위해 직원 로그인 상태로 설정
      // (실제로는 관리자이지만 UI는 MyPayrollPage를 표시)
      setIsEmployeeLoggedIn(true)
    } else if (activeTab === 'hr') {
      // HR 탭에서 직원 로그인 상태 확인
      if (employeeSession && (!ssoToken || !isAccountingManager)) {
        setIsEmployeeLoggedIn(true)
      } else {
        setIsEmployeeLoggedIn(false)
      }
    } else {
      setIsEmployeeLoggedIn(false)
    }
  }, [activeTab])

  // 직원 로그인 성공 이벤트 리스너
  useEffect(() => {
    const handleEmployeeLoginSuccess = () => {
      // HR 탭으로 이동하고 직원 로그인 상태로 설정
      setActiveTab('hr')
      const employeeSession = getCurrentEmployeeSession()
      if (employeeSession) {
        setIsEmployeeLoggedIn(true)
        setSelectedEmployee(null)
        setShowAddEmployeeForm(false)
      }
    }

    window.addEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
    return () => {
      window.removeEventListener('employeeLoginSuccess', handleEmployeeLoginSuccess)
    }
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
        // 일반 관리자 (급여 전용): HR 탭의 My Payroll 페이지로 리다이렉트
        console.log('🔄 Redirecting to My Payroll page (Payroll Access Only)')
        setActiveTab('hr')
        // 직원 로그인 상태로 설정 (MyPayrollPage 표시)
        const employeeSession = getCurrentEmployeeSession()
        if (!employeeSession) {
          // 직원 세션이 없으면 임시 세션 생성 (관리자용)
          // 실제로는 관리자가 자신의 급여 정보를 볼 수 있도록 해야 함
          // 여기서는 HR 탭만 활성화
        }
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
      const tab = event.detail as 'dashboard' | 'history' | 'settings' | 'reports' | 'hr'
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
          // Compliance는 Reports 탭의 BAS/GST 섹션으로 이동
          setActiveTab('reports')
          setScrollToSection('bas-gst')
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

    // Load transactions from localStorage (hydrate state)
    const savedTransactions = localStorage.getItem('accounting_transactions')
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed)
          console.log('[Frontend] Loaded transactions from localStorage:', parsed.length)
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

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('transactionsUpdated', handleTransactionsUpdated)
      }
    }

    // Load opening balance from localStorage
    const savedOpeningBalance = localStorage.getItem('opening_director_loan_balance')
    if (savedOpeningBalance) {
      try {
        const parsed = parseFloat(savedOpeningBalance)
        if (!isNaN(parsed)) {
          // Will be set via state below
        }
      } catch (err) {
        console.error('[Frontend] Failed to parse saved opening balance:', err)
      }
    }

    // Initialize IndexedDB and load history (only if setup is complete)
    // Setup Wizard에서 이미 초기화되었으므로, 여기서는 재초기화만 수행
    if (setupComplete) {
      indexedDBStorage.init().then(() => {
        loadStatementHistory()
        loadCashExpenses()
        checkForIncomingOrders() // 새로운 주문 확인
      }).catch((err) => {
        console.error('Failed to initialize IndexedDB:', err)
      })
    }
  }, [setupComplete])

  // 🔧 주기적으로 새로운 주문 확인 (3초마다)
  useEffect(() => {
    if (!setupComplete) return
    
    const ordersCheckInterval = setInterval(() => {
      checkForIncomingOrders()
    }, 3000)
    
    // Cleanup on unmount
    return () => {
      clearInterval(ordersCheckInterval)
    }
  }, [setupComplete])

  // Check for incoming orders from homepage
  // 🔧 UPDATED: API 응답과 localStorage 모두 확인하여 IndexedDB에 저장
  const checkForIncomingOrders = async () => {
    try {
      // 🔧 STEP 1: Check for API response in localStorage (highest priority)
      const apiResponseKey = 'selpic_api_orders_response'
      const apiResponseJson = localStorage.getItem(apiResponseKey)
      
      if (apiResponseJson) {
        try {
          const apiResponse = JSON.parse(apiResponseJson)
          console.log('[Incoming Orders] 📦 Found API response in localStorage:', {
            ordersCount: apiResponse.orders?.length || 0,
            timestamp: apiResponse.timestamp
          })
          
          if (apiResponse.orders && Array.isArray(apiResponse.orders) && apiResponse.orders.length > 0) {
            // 저장 직전 알림 표시
            const orderIds = apiResponse.orders.map((o: any) => o.orderId).join(', ')
            alert(`데이터 수신 성공: 주문번호 [${orderIds}]를 저장합니다.`)
            
            // 각 주문을 IndexedDB에 저장
            const savedOrders: string[] = []
            const skippedOrders: string[] = []
            const errorLogs: Array<{ orderId: string; reason: string }> = []
            
            for (const orderData of apiResponse.orders) {
              try {
                // 필수 필드 검증
                if (!orderData.orderId) {
                  errorLogs.push({ orderId: '알 수 없음', reason: 'order_id 누락' })
                  continue
                }
                
                // 중복 체크
                const exists = await indexedDBStorage.checkOrderExists(orderData.orderId)
                if (exists) {
                  console.log(`[Incoming Orders] ⚠️ Skipping duplicate: ${orderData.orderId}`)
                  skippedOrders.push(orderData.orderId)
                  continue
                }

                // IndexedDB에 저장
                await indexedDBStorage.saveIncomingOrder(orderData)
                savedOrders.push(orderData.orderId)
                console.log(`[Incoming Orders] ✅ Saved order: ${orderData.orderId}`)
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`[Incoming Orders] ❌ Error saving order ${orderData.orderId}:`, error)
                errorLogs.push({ 
                  orderId: orderData.orderId || '알 수 없음', 
                  reason: `저장 실패: ${errorMessage}` 
                })
              }
            }
            
            // 저장 완료 후 localStorage에서 제거
            localStorage.removeItem(apiResponseKey)
            console.log(`[Incoming Orders] ✅ Processed API response: ${savedOrders.length} saved, ${skippedOrders.length} skipped, ${errorLogs.length} errors`)
            
            // 에러 로그 저장
            if (errorLogs.length > 0) {
              const errorLogKey = 'selpic_incoming_orders_error_log'
              const existingLogs = JSON.parse(localStorage.getItem(errorLogKey) || '[]')
              const newLogs = [...existingLogs, ...errorLogs.map(log => ({
                ...log,
                timestamp: new Date().toISOString()
              }))]
              localStorage.setItem(errorLogKey, JSON.stringify(newLogs))
            }
            
            // 저장 성공 후 상태 업데이트 (페이지 새로고침 없이)
            if (savedOrders.length > 0) {
              // Incoming Orders 컴포넌트가 마운트되어 있으면 자동으로 새로고침됨
              // 추가로 주문 목록 새로고침 트리거
              console.log('[Incoming Orders] ✅ Orders saved successfully, UI will refresh automatically')
            }
            
            // API 응답 처리 완료 - 다음 단계로 진행하지 않음
            return
          }
        } catch (parseError) {
          console.error('[Incoming Orders] ❌ Error parsing API response:', parseError)
          localStorage.removeItem(apiResponseKey)
        }
      }
      
      // 🔧 STEP 2: Check localStorage for pending orders (legacy method)
      const pendingOrdersKey = 'selpic_pending_orders'
      const pendingOrdersJson = localStorage.getItem(pendingOrdersKey)
      
      if (pendingOrdersJson) {
        try {
          const pendingOrders = JSON.parse(pendingOrdersJson)
          console.log('[Incoming Orders] Found pending orders in localStorage:', pendingOrders.length)
          
          if (Array.isArray(pendingOrders) && pendingOrders.length > 0) {
            // 저장 직전 알림 표시
            const orderIds = pendingOrders.map((o: any) => o.orderId).join(', ')
            alert(`데이터 수신 성공: 주문번호 [${orderIds}]를 저장합니다.`)
            
            // 각 주문을 IndexedDB에 저장
            const savedOrders: string[] = []
            const errorLogs: Array<{ orderId: string; reason: string }> = []
            
            for (const orderData of pendingOrders) {
              try {
                // 필수 필드 검증
                if (!orderData.orderId) {
                  errorLogs.push({ orderId: '알 수 없음', reason: 'order_id 누락' })
                  continue
                }
                
                // 중복 체크
                const exists = await indexedDBStorage.checkOrderExists(orderData.orderId)
                if (exists) {
                  console.log(`[Incoming Orders] Skipping duplicate: ${orderData.orderId}`)
                  errorLogs.push({ orderId: orderData.orderId, reason: '중복된 주문 (이미 저장됨)' })
                  continue
                }

                // IndexedDB에 저장
                await indexedDBStorage.saveIncomingOrder(orderData)
                savedOrders.push(orderData.orderId)
                console.log(`[Incoming Orders] ✅ Saved order: ${orderData.orderId}`)
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`[Incoming Orders] Error saving order ${orderData.orderId}:`, error)
                errorLogs.push({ 
                  orderId: orderData.orderId || '알 수 없음', 
                  reason: `저장 실패: ${errorMessage}` 
                })
              }
            }
            
            // 저장 완료된 주문은 localStorage에서 제거
            if (savedOrders.length > 0) {
              const remainingOrders = pendingOrders.filter((o: any) => !savedOrders.includes(o.orderId))
              if (remainingOrders.length > 0) {
                localStorage.setItem(pendingOrdersKey, JSON.stringify(remainingOrders))
              } else {
                localStorage.removeItem(pendingOrdersKey)
              }
              console.log(`[Incoming Orders] Processed ${savedOrders.length} orders`)
              
              // 에러 로그 저장
              if (errorLogs.length > 0) {
                const errorLogKey = 'selpic_incoming_orders_error_log'
                const existingLogs = JSON.parse(localStorage.getItem(errorLogKey) || '[]')
                const newLogs = [...existingLogs, ...errorLogs.map(log => ({
                  ...log,
                  timestamp: new Date().toISOString()
                }))]
                localStorage.setItem(errorLogKey, JSON.stringify(newLogs))
              }
              
              // 저장 성공 후 상태 업데이트 (페이지 새로고침 없이)
              console.log('[Incoming Orders] ✅ Orders saved successfully, UI will refresh automatically')
            }
          }
        } catch (parseError) {
          console.error('[Incoming Orders] Error parsing pending orders:', parseError)
          localStorage.removeItem(pendingOrdersKey)
        }
      }
    } catch (error) {
      console.error('[Incoming Orders] Error checking for orders:', error)
    }
  }

  // Load cash expenses and merge with transactions
  const loadCashExpenses = async () => {
    try {
      const cashExpenses = await indexedDBStorage.getAllCashExpenses()
      
      // Convert cash expenses to transaction format
      const cashTransactions: ClassifiedTransaction[] = cashExpenses.map((expense: any) => ({
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
      }))
      
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
    }
  }

  // Load all transactions from IndexedDB (including payroll transactions)
  const loadAllTransactions = async () => {
    try {
      await indexedDBStorage.init()
      
      // Get all statements
      const statements = await indexedDBStorage.getAllStatements()
      
      // Extract all transactions from all statements
      const allTransactions: ClassifiedTransaction[] = []
      statements.forEach(statement => {
        if (statement.transactions && Array.isArray(statement.transactions)) {
          allTransactions.push(...statement.transactions)
        }
      })
      
      // Also load cash expenses and merge them
      try {
        const cashExpenses = await indexedDBStorage.getAllCashExpenses()
        const cashTransactions: ClassifiedTransaction[] = cashExpenses.map(expense => ({
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
        }))
        allTransactions.push(...cashTransactions)
      } catch (cashError) {
        console.warn('Failed to load cash expenses:', cashError)
      }
      
      // Load payroll transactions (from timesheet approvals)
      // Note: getAllTransactions() returns ALL transactions from TRANSACTIONS_STORE
      // We filter for payroll transactions to merge with statement transactions
      try {
        const payrollTransactions = await indexedDBStorage.getAllTransactions()
        const filteredPayroll = payrollTransactions.filter((tx: any) => 
          tx.isPayrollTransaction && tx.source === 'payroll'
        )
        allTransactions.push(...filteredPayroll)
        console.log('[Frontend] Loaded payroll transactions:', filteredPayroll.length, 'Total transactions:', allTransactions.length)
      } catch (payrollError) {
        console.warn('Failed to load payroll transactions:', payrollError)
      }
      
      // Recalculate No ABN warnings
      const { recalculateNoABNWarningsForTransactions } = await import('@/lib/utils/no-abn-warning-recalculator')
      const recalculatedTransactions = await recalculateNoABNWarningsForTransactions(allTransactions)
      
      // Count payroll expenses for debugging
      const payrollExpenses = recalculatedTransactions.filter((tx: any) => 
        (tx.category === 'EXPENSE_WAGES_SALARIES' || 
         tx.category === 'EXPENSE_DIRECTORS_FEES' || 
         tx.category === 'EXPENSE_SUPERANNUATION') &&
        tx.isPayrollTransaction
      )
      const payrollExpensesTotal = payrollExpenses.reduce((sum: number, tx: any) => sum + Math.abs(tx.debit || 0), 0)
      console.log('[Frontend] 💰 Payroll expenses in transactions:', payrollExpenses.length, 'Total amount: $' + payrollExpensesTotal.toFixed(2))
      if (payrollExpenses.length > 0) {
        console.log('[Frontend] 📋 Payroll expense details:', payrollExpenses.map((tx: any) => ({
          id: tx.id,
          category: tx.category,
          amount: tx.debit,
          reference: tx.reference,
          description: tx.description
        })))
      } else {
        console.log('[Frontend] ✅ No payroll expenses found in transactions (this is correct if payslips were deleted)')
      }
      
      // Force state update with new array reference to ensure React re-renders
      setTransactions(() => {
        console.log('[Frontend] 🔄 Setting transactions state, forcing re-render')
        return [...recalculatedTransactions]
      })
      console.log('[Frontend] ✅ All transactions loaded and state updated:', recalculatedTransactions.length, 'transactions')
    } catch (error) {
      console.error('[Frontend] Failed to load all transactions:', error)
    }
  }

  // Load statement from history (NO API CALL - saves costs!)
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
        
        // Check if transactions exist
        if (!statement.transactions || !Array.isArray(statement.transactions) || statement.transactions.length === 0) {
          console.warn('[Frontend] Statement has no transactions:', statement)
          setError('This statement has no transactions. It may have been saved incorrectly. Please re-upload the file.')
          return
        }
        
        // Migrate old INCOME_CASH_DEPOSIT_REVIEW to NON_TAXABLE_CASH_DEPOSIT
        const migratedTransactions = statement.transactions.map((tx: ClassifiedTransaction) => {
          if (tx.category === 'INCOME_CASH_DEPOSIT_REVIEW') {
            return {
              ...tx,
              category: 'NON_TAXABLE_CASH_DEPOSIT',
              department: tx.department === 'cleaning' || tx.department === 'unknown' ? 'personal' : (tx.department || 'personal')
            }
          }
          return tx
        })
        
        // 🔧 NEW: No ABN 경고 재계산 (등록된 Contractor 확인)
        console.log('[Frontend] Recalculating No ABN warnings for loaded transactions...')
        const { recalculateNoABNWarningsForTransactions } = await import('@/lib/utils/no-abn-warning-recalculator')
        const recalculatedTransactions = await recalculateNoABNWarningsForTransactions(migratedTransactions)
        
        console.log('[Frontend] Loaded transactions:', recalculatedTransactions.length)
        setTransactions(recalculatedTransactions)
        setCurrentStatementId(id)
        setActiveTab('dashboard') // Switch to dashboard after loading
        
        // Show success message
        setLoadSuccessMessage(`Data loaded from local storage (No API cost incurred). ${recalculatedTransactions.length} transactions loaded.`)
        setTimeout(() => setLoadSuccessMessage(null), 5000) // Auto-dismiss after 5 seconds
      } else {
        setError('Statement not found in local storage')
      }
    } catch (err) {
      console.error('[Frontend] Failed to load statement:', err)
      setError(`Failed to load statement from history: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // Save current transactions to IndexedDB
  const saveCurrentStatement = async (fileName: string, statementData: any, transactionsToSave?: ClassifiedTransaction[]) => {
    try {
      // Use provided transactions or fall back to state
      const transactionsToUse = transactionsToSave || transactions
      
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
      
      console.log('[Frontend] Saving statement:', {
        fileName,
        transactionCount: transactionsToUse.length,
        statementData,
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
        period: statementData.period || { startDate: '', endDate: '' },
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
    // Note: Master API Key from environment variable is handled server-side
    const effectiveApiKey = userApiKey || apiKey
    const isUsingSystemKey = !userApiKey && !!apiKey
    
    if (!effectiveApiKey) {
      setError(strings.errors.apiKeyRequired)
      setActiveTab('settings')
      return
    }

    // Check API balance before upload
    try {
      const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
      const stats = await indexedDBStorage.getApiUsageStats(30)
      const estimatedRemaining = 100 - stats.totalCost // Placeholder: Assume $100 starting balance
      
      // Low Balance Alert: Check if estimated remaining is less than $0.50
      if (estimatedRemaining < 0.50) {
        setToast({
          message: 'API 잔액이 부족하여 분석이 실패할 수 있습니다. 충전 후 이용해주세요.',
          type: 'warning'
        })
        // Auto-dismiss toast after 5 seconds
        setTimeout(() => setToast(null), 5000)
        // Still allow upload but warn user
      }
    } catch (err) {
      console.error('Error checking API balance:', err)
      // Continue with upload even if balance check fails
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
    
    // Only apply upload limit if:
    // 1. Using system API key (not personal key)
    // 2. User is NOT an admin
    if (isUsingSystemKey && !isAdmin) {
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
      formData.append('apiKey', effectiveApiKey)
      formData.append('isUserApiKey', userApiKey ? 'true' : 'false') // Flag to indicate if user's key is used
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
            id: tx.id || tx.reference || `tx_${Date.now()}_${index}`,
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
            // Merge with existing transactions, avoiding duplicates by ID
            const existingIds = new Set(prev.map(tx => tx.id || tx.reference))
            const newTransactions = migratedTransactions.filter(tx => {
              const txId = tx.id || tx.reference
              return !txId || !existingIds.has(txId)
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
          
          // 🔧 CRITICAL: Reload all transactions to update Transaction History
          console.log('[Frontend] 🔄 Reloading all transactions to update Transaction History...')
          await loadAllTransactions()
          console.log('[Frontend] ✅ Transaction History updated')
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

      // Save cash expense to IndexedDB
      const cashExpenseId = await indexedDBStorage.saveCashExpense({
        ...expense,
        receiptImageId,
      })

      // Update receipt with cash expense ID if needed
      if (receiptImageId && receiptImageId.startsWith('receipt_')) {
        // Receipt was saved, update it with cash expense ID
        // (This would require an updateReceipt method, but for now we'll handle it in the save)
      }

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

  // Handle transaction update (manual category override)
  const handleTransactionUpdate = async (id: string, updates: Partial<ClassifiedTransaction>) => {
    const oldTx = transactions.find((tx) => {
      const txId = tx.id || `${tx.date}_${tx.description}`
      return txId === id || `${tx.id}_${transactions.indexOf(tx)}` === id
    })

    // If category or department is being updated, mark confidence as "Manual"
    const finalUpdates = (updates.category || updates.department) 
      ? { ...updates, confidence: 'Manual' as any }
      : updates
    
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
      if (updates.fbtInfo && oldTx?.fbtInfo?.isFBTRelevant !== updates.fbtInfo?.isFBTRelevant) {
        await indexedDBStorage.logAuditTrail({
          transactionId: id,
          action: 'updated',
          userId: 'owner',
          userName: getCurrentUserName(),
          oldValue: oldTx.fbtInfo,
          newValue: updates.fbtInfo,
          description: `FBT status updated`,
        })
      }
    } catch (err) {
      console.error('Failed to log audit trail:', err)
    }
    
    const updatedTransactions = transactions.map((tx) => {
      // Match by id or by the full id string (which includes index)
      if (tx.id === id || `${tx.id}_${transactions.indexOf(tx)}` === id) {
        return { ...tx, ...finalUpdates }
      }
      return tx
    })
    
    setTransactions(updatedTransactions)

    // Update in IndexedDB if we have a current statement
    if (currentStatementId) {
      try {
        const statement = await indexedDBStorage.getStatement(currentStatementId)
        if (statement) {
          const updatedStatement = {
            ...statement,
            transactions: updatedTransactions,
          }
          await indexedDBStorage.updateStatement(currentStatementId, updatedStatement)
        }
      } catch (err) {
        console.error('Failed to update statement:', err)
      }
    }
  }

  // Export to Excel (Business Only by default)
  const handleExportExcel = (businessOnly: boolean = true) => {
    // Filter to business transactions only (Cleaning department)
    const transactionsToExport = businessOnly
      ? transactions.filter(tx => tx.department === 'cleaning')
      : transactions

    const exportData: ExportTransaction[] = transactionsToExport.map((tx) => ({
      date: tx.date,
      description: tx.description,
      category: tx.category || 'UNCATEGORIZED',
      debit: tx.debit,
      credit: tx.credit,
      department: tx.department || 'unknown',
      status: tx.isDirectorsLoan ? 'Director\'s Loan' : tx.isPreTradingExpense ? 'Pre-revenue' : 'Normal',
      balance: tx.balance || undefined,
    }))

    const fileName = businessOnly ? 'general-ledger-business-only' : 'general-ledger-all'
    exportToExcel(exportData, fileName)
  }

  // Export summary
  const handleExportSummary = () => {
    const summary = calculateFinancialSummary(transactions)
    exportSummary(summary, 'financial-summary')
  }

  // Export BAS Report
  const handleExportBAS = () => {
    if (transactions.length === 0) {
      setError('No transactions available for BAS report')
      return
    }

    // Get date range from transactions
    const dates = transactions.map(tx => new Date(tx.date)).sort((a, b) => a.getTime() - b.getTime())
    if (dates.length === 0) {
      setError('No valid dates found in transactions')
      return
    }

    const startDate = dates[0]
    const endDate = dates[dates.length - 1]
    
    // Determine period type (default to quarterly)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const periodType: 'monthly' | 'quarterly' = daysDiff <= 35 ? 'monthly' : 'quarterly'

    // Generate BAS report
    const report = generateBASReport(
      transactions,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      periodType
    )

    // Collect payroll transactions for detailed export
    const payrollTransactions = transactions
      .filter(tx => tx.isPayrollTransaction && tx.requiresPAYG && tx.debit)
      .map(tx => ({
        date: tx.date,
        description: tx.description,
        grossAmount: Math.abs(tx.debit || 0),
        withholdingTax: 0, // Will be calculated in export
        netAmount: Math.abs(tx.debit || 0),
        recipientType: (tx.payrollType || 'employee') as 'employee' | 'director' | 'contractor' | 'partner',
        hasABN: !tx.noABNWarning?.shouldWarn,
        category: tx.category || 'UNCATEGORIZED',
      }))

    // Export to Excel
    exportBASToExcel(report, payrollTransactions, 'bas-report')
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
      }
    } catch (err) {
      console.error('Failed to delete statement:', err)
      setError('Failed to delete statement')
    }
  }

  // Delete all statements
  const handleDeleteAllStatements = async () => {
    if (!confirm('Are you sure you want to delete ALL history? This cannot be undone. Make sure you have exported your data to Excel first!')) {
      return
    }
    
    try {
      await indexedDBStorage.deleteAllStatements()
      await loadStatementHistory()
      setTransactions([])
      setCurrentStatementId(null)
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

  // Opening Director's Loan Balance (can be loaded from settings or previous period)
  const [openingDirectorLoanBalance, setOpeningDirectorLoanBalance] = useState<number>(() => {
    // Load from localStorage on initial mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('opening_director_loan_balance')
      if (saved) {
        const parsed = parseFloat(saved)
        if (!isNaN(parsed)) {
          return parsed
        }
      }
    }
    // Default to $1,000
    return 1000.00
  })

  // Save opening balance to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('opening_director_loan_balance', openingDirectorLoanBalance.toString())
    }
  }, [openingDirectorLoanBalance])

  // Save transactions to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && transactions.length > 0) {
      localStorage.setItem('accounting_transactions', JSON.stringify(transactions))
    }
  }, [transactions])

  // Calculate all business metrics using single source of truth
  const businessMetrics = useMemo(() => {
    return calculateBusinessMetrics(transactions, openingDirectorLoanBalance, accountType)
  }, [transactions, openingDirectorLoanBalance, accountType])

  // Extract individual metrics
  const totalIncome = businessMetrics.totalIncome
  const totalExpenses = businessMetrics.totalExpenses
  const netProfit = businessMetrics.netProfit
  const gstPayable = businessMetrics.gstPayable
  const gstClaimable = businessMetrics.gstClaimable
  const taxableExpenses = businessMetrics.taxableExpenses
  const directorsLoanBalance = businessMetrics.directorsLoanBalance
  const personalSpendingNonDeductible = businessMetrics.personalSpendingNonDeductible

  const personalSpending = useMemo(() => {
    return transactions
      .filter(tx => tx.department === 'personal')
      .reduce((sum, tx) => sum + Math.abs(tx.debit || 0) + Math.abs(tx.credit || 0), 0)
  }, [transactions])

  // Setup Wizard check (before PIN lock)
  // IndexedDB는 Setup Wizard 완료 후에만 초기화됨
  if (!setupComplete) {
    return <SetupWizard onComplete={() => {
      setSetupComplete(true)
      // Setup Wizard에서 이미 IndexedDB가 초기화되었으므로, 프로필만 로드
      indexedDBStorage.init().then(async () => {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          setCompanyInfo({
            name: profile.companyName || COMPANY_LEGAL.companyName,
            abn: profile.abn || COMPANY_LEGAL.abn,
            acn: profile.acn || COMPANY_LEGAL.acn,
          })
        }
        // 홈페이지 API URL 로드
        const homepageApiUrl = localStorage.getItem('homepage_api_url')
        if (homepageApiUrl) {
          console.log('[Main] Homepage API URL loaded:', homepageApiUrl)
        }
      })
    }} />
  }

  // Show PIN lock if not unlocked (SSO 토큰이 없을 때만)
  const ssoToken = getSSOToken()
  const hasValidAdminToken = ssoToken && (ssoToken.role === 'admin' || ssoToken.role === 'super_admin')
  
  if (!isUnlocked && !hasValidAdminToken) {
    return (
      <PINLock 
        onUnlock={() => setIsUnlocked(true)} 
        onSystemResetComplete={() => {
          // After system reset, clear setup flag and show Setup Wizard
          setSetupComplete(false)
          setIsUnlocked(false) // Will trigger Setup Wizard to show
        }}
      />
    )
  }

  return (
    <div className="container py-8">
      {/* Load Success Message */}
      {loadSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg bg-green-50 border-l-4 border-green-400 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              {loadSuccessMessage}
            </p>
          </div>
          <button
            onClick={() => setLoadSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Duplicate File Dialog */}
      {duplicateFileDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">File Already Exists</h3>
            <p className="text-gray-700 mb-2">
              A file named <strong>"{duplicateFileDialog.fileName}"</strong> already exists in your history.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              What would you like to do?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleDuplicateFileChoice('reload')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Reload Existing Data (No API Cost)
              </button>
              <button
                onClick={() => handleDuplicateFileChoice('reanalyze')}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Re-analyze (Will Use API)
              </button>
              <button
                onClick={() => {
                  setDuplicateFileDialog(null)
                  const reject = (window as any).__duplicateFileReject
                  delete (window as any).__duplicateFileResolve
                  delete (window as any).__duplicateFileReject
                  delete (window as any).__duplicateFileData
                  reject?.(new Error('User cancelled'))
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div>
          {/* Company Name and ABN Header */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {companyInfo.name}
          </h1>
                {companyInfo.abn && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">ABN:</span>
                    <span className="text-sm text-gray-700 font-semibold">{companyInfo.abn}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Dashboard Title */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            {strings.dashboard.title}
          </h2>
          <p className="text-gray-600 mt-2">
            {strings.dashboard.subtitle}
          </p>
          <p className="text-gray-600">
            {strings.dashboard.subtitleLine2}
          </p>
        </div>
        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 border-b border-gray-200">
          {(() => {
            const ssoToken = getSSOToken()
            const isAccountingManager = ssoToken && (
              ssoToken.role === 'super_admin' || 
              ssoToken.permissions.includes('accounting:admin') ||
              ssoToken.permissions.includes('accounting:full')
            )
            const isPayrollOnly = ssoToken && !isAccountingManager && (
              ssoToken.permissions.includes('payroll:read') || 
              ssoToken.permissions.includes('payroll:access')
            )
            
            // 일반 관리자 (급여 전용)는 HR 탭만 표시
            if (isPayrollOnly) {
              return (
                <button
                  onClick={() => setActiveTab('hr')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'hr'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  My Payroll
                </button>
              )
            }
            
            // 슈퍼 관리자 & 회계 관리자는 모든 탭 표시
            return (
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'dashboard'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Coins className="w-5 h-5" />
                  Biz Intel
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'reports'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart className="w-5 h-5" />
                  Reports
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <History className="w-5 h-5" />
                  History
                </button>
                <button
                  onClick={() => setActiveTab('hr')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'hr'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  HR & Payroll
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>
              </>
            )
          })()}
        </div>
      </div>

      {/* Dashboard Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
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
                onOpeningBalanceChange={setOpeningDirectorLoanBalance}
                onViewDirectorsLoanDetails={setShowDirectorsLoanFilter}
                showDirectorsLoanFilter={showDirectorsLoanFilter}
                accountType={accountType}
              />
              
              {/* Expense Charts for Individual Users */}
              <ExpenseCharts
                transactions={transactions}
                onCategoryClick={setSelectedCategoryFilter}
                selectedCategory={selectedCategoryFilter}
                accountType="individual"
              />
            </>
          )}

          {/* Company/Sole Trader: Full Business Dashboard */}
          {accountType !== 'individual' && (
            <>
              {/* Real-Time P&L View */}
              {transactions.length > 0 && (
                <RealTimePLView 
                  key={`pl-view-${transactions.length}-${transactions.filter(tx => tx.isPayrollTransaction).length}`}
                  transactions={transactions} 
                />
              )}

              {/* Tax Provision */}
              {transactions.length > 0 && (
                <TaxProvision transactions={transactions} />
              )}

              {/* Expense Charts */}
              {transactions.length > 0 && (
                <ExpenseCharts
                  transactions={transactions}
                  onCategoryClick={setSelectedCategoryFilter}
                  selectedCategory={selectedCategoryFilter}
                  accountType={accountType}
                />
              )}

              {/* Asset Management */}
              {transactions.length > 0 && (
                <AssetManagement 
                  transactions={transactions}
                  onAssetRegistered={(assetId, transactionId) => {
                    console.log('Asset registered:', assetId, 'for transaction:', transactionId)
                  }}
                />
              )}

              {/* Business Summary Dashboard */}
              {transactions.length > 0 && (
                <BusinessSummaryCards
                  totalIncome={totalIncome || 0}
                  totalExpenses={totalExpenses || 0}
                  netProfit={netProfit || 0}
                  gstPayable={gstPayable || 0}
                  gstClaimable={gstClaimable || 0}
                  directorsLoanBalance={directorsLoanBalance || 0}
                  personalSpendingNonDeductible={personalSpendingNonDeductible || 0}
                  openingDirectorLoanBalance={openingDirectorLoanBalance}
                  onOpeningBalanceChange={setOpeningDirectorLoanBalance}
                  onViewDirectorsLoanDetails={setShowDirectorsLoanFilter}
                  showDirectorsLoanFilter={showDirectorsLoanFilter}
                  accountType={accountType}
                />
              )}

              {/* Tax Deadline Tracker (includes FBT deadlines) */}
              <TaxDeadlineTracker />

              {/* GST Summary */}
              {transactions.length > 0 && (
                <GSTSummary 
                  transactions={transactions}
                  gstPayable={gstPayable}
                  gstClaimable={gstClaimable}
                />
              )}

              {/* FBT Monitor */}
              {transactions.length > 0 && (
                <FBTMonitor 
                  transactions={transactions} 
                  onTransactionUpdate={handleTransactionUpdate}
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
                  onChange={(e) => setAppendMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="append-mode" className="text-sm text-gray-700 cursor-pointer">
                  Append to existing transactions (instead of replacing)
                </label>
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv,.pdf"
                onChange={handleFileUpload}
                disabled={isProcessing || !(userApiKey || apiKey)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-md ${
                  isProcessing || !(userApiKey || apiKey)
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
              {!(userApiKey || apiKey) && (
                <p className="mt-2 text-sm text-red-600">
                  {strings.errors.apiKeyRequired}
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

          {/* Compliance Reporting Package - Only for Company/Sole Trader */}
          {accountType !== 'individual' && transactions.length > 0 && (
            <CompliancePackageExporter
              transactions={transactions}
              openingDirectorLoanBalance={openingDirectorLoanBalance}
              companyName={companyInfo.name}
              abn={companyInfo.abn || COMPANY_LEGAL.abn}
              acn={companyInfo.acn}
            />
          )}

          {/* Export Buttons */}
          {transactions.length > 0 && (
            <div className="mb-8 flex gap-2 flex-nowrap overflow-x-auto">
              {accountType === 'individual' ? (
                // Individual User: Simple Export
                <button
                  onClick={() => handleExportExcel(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                  title="Export all transactions"
                >
                  <Download className="w-5 h-5" />
                  Export Transactions (Excel)
                </button>
              ) : (
                // Company/Sole Trader: Full Export Options
                <>
                  <button
                    onClick={() => handleExportExcel(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="Export only business transactions (Cleaning department) for accountant"
                  >
                    <Download className="w-5 h-5" />
                    Export Business Only (Excel)
                  </button>
                  <button
                    onClick={() => handleExportExcel(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="Export all transactions including personal"
                  >
                    <Download className="w-5 h-5" />
                    Export All (Excel)
                  </button>
                  <button
                    onClick={handleExportSummary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                  >
                    <Download className="w-5 h-5" />
                    Export Financial Summary (Excel)
                  </button>
                  <button
                    onClick={handleExportBAS}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
                    title="Export BAS (Business Activity Statement) Report for PAYG Withholding"
                  >
                    <Receipt className="w-5 h-5" />
                    Export BAS Report (PAYG)
                  </button>
                </>
              )}
            </div>
          )}

          {/* Transaction History Table - 통합 장부의 핵심 */}
          <div id="transaction-manager-section" className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-semibold">
                  {strings.dashboard.transactionHistory}
                </h2>
                {transactions.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                  </span>
                )}
              </div>
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

            {/* Collapsible Content */}
            {isTransactionHistoryExpanded ? (
              <TransactionTable
                transactions={
                  showDirectorsLoanFilter
                    ? transactions.filter(tx => 
                        tx.department === 'personal' || 
                        tx.category === 'LIABILITY_DIRECTORS_LOAN' ||
                        tx.isDirectorsLoan === true
                      )
                    : selectedCategoryFilter
                      ? transactions.filter(tx => tx.category === selectedCategoryFilter)
                      : transactions
                }
                onTransactionUpdate={handleTransactionUpdate}
                accountType={accountType}
              />
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {transactions.length} total transaction{transactions.length !== 1 ? 's' : ''}
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
                        <span className="text-xs font-medium text-indigo-600">Director's Loan & Personal</span>
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
              onSave={handleCashExpenseSave}
              apiKey={apiKey}
              categories={CATEGORIES}
              getCategoryLabel={(category) => {
                const categoryMap: Record<string, string> = {
                  'INCOME_SALES_CLEANING': 'Trading Revenue',
                  'INCOME_SALES_STICKER': 'Trading Revenue',
                  'NON_TAXABLE_CASH_DEPOSIT': strings.categories.nonTaxableCashDeposit,
                  'LIABILITY_DIRECTORS_LOAN': strings.categories.liabilityDirectorsLoan,
                  'EXPENSE_STARTUP_INCORPORATION': strings.categories.expenseStartup, // 통합
                  'EXPENSE_STARTUP_DOMAIN': strings.categories.expenseStartup, // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
                  'EXPENSE_STARTUP_SAMPLE': strings.categories.expenseStartup, // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
                  'EXPENSE_FUEL_TRAVEL': strings.categories.expenseFuelTravel,
                  'EXPENSE_MOTOR_VEHICLE': strings.categories.expenseMotorVehicle,
                  'EXPENSE_TRAVEL_ACCOMMODATION': strings.categories.expenseTravelAccommodation,
                  'EXPENSE_MEALS_ENTERTAINMENT': strings.categories.expenseMealsEntertainment,
                  'EXPENSE_INSURANCE_PROFESSIONAL': strings.categories.expenseInsuranceProfessional,
                  'EXPENSE_CLEANING_SUPPLIES': strings.categories.expenseCleaningSupplies,
                  'EXPENSE_UTILITIES_PHONE': strings.categories.expenseUtilitiesPhone,
                  'EXPENSE_CLEANING_SUBCONTRACTOR': strings.categories.expenseSubcontractor,
                  'EXPENSE_REPAIRS_MAINTENANCE': strings.categories.expenseRepairsMaintenance,
                  'EXPENSE_OFFICE_EQUIPMENT': strings.categories.expenseOfficeEquipment,
                  'EXPENSE_OFFICE_SUPPLIES': strings.categories.expenseOffice,
                  'EXPENSE_FREIGHT_SHIPPING': strings.categories.expenseFreightShipping,
                  'EXPENSE_RENT': strings.categories.expenseRent,
                  'EXPENSE_MARKETING': strings.categories.expenseMarketing,
                  'EXPENSE_WAGES_SALARIES': strings.categories.expenseWagesSalaries,
                  'EXPENSE_SUPERANNUATION': strings.categories.expenseSuperannuation,
                  'EXPENSE_ATO_GST_BAS': strings.categories.expenseATOGSTBAS,
                  'EXPENSE_ATO_PAYG_WITHHOLDING': strings.categories.expenseATOPAYGWithholding,
                  'EXPENSE_COMPANY_INCOME_TAX': strings.categories.expenseCompanyIncomeTax,
                  'EXPENSE_WORKERS_COMPENSATION': strings.categories.expenseWorkersCompensation,
                  'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES': strings.categories.expenseAccountingProfessionalFees,
                  'EXPENSE_DIRECTOR_LOAN_REPAYMENT': strings.categories.expenseDirectorLoanRepayment,
                  'EXPENSE_DIVIDENDS_PAID': strings.categories.expenseDividendsPaid,
                  'EXPENSE_DIRECTORS_FEES': strings.categories.expenseDirectorsFees,
                  'CASH_EXPENSE_PETTY': strings.categories.cashExpensePetty,
                  'NON_TAXABLE_TRANSFER': strings.categories.internalTransfer,
                  'UNCATEGORIZED': strings.categories.uncategorized,
                }
                return categoryMap[category] || category
              }}
            />
          )}
        </>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <HistoryPage
          statementHistory={statementHistory}
          storageSize={storageSize}
          formatStorageSize={formatStorageSize}
          onLoadStatement={loadStatement}
          onDeleteStatement={handleDeleteStatement}
          onDeleteAllStatements={handleDeleteAllStatements}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onReloadHistory={loadStatementHistory}
        />
      )}

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {transactions.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Data Available</h2>
              <p className="text-gray-500 mb-4">
                Upload bank statements to generate financial reports.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Biz Intel
              </button>
            </div>
          ) : accountType === 'individual' ? (
            // Individual User: Simple Transaction Summary
            // 🔧 Use calculateBusinessMetrics for consistency with Financial Report
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-2xl font-semibold mb-4">Transaction Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(businessMetrics.totalIncome)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(businessMetrics.totalExpenses)}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Net Balance</p>
                    <p className={`text-2xl font-bold ${
                      businessMetrics.netProfit >= 0
                        ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(businessMetrics.netProfit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Company/Sole Trader: Full Financial Reports
            <div id="bas-gst-section" className="space-y-8">
              {/* BAS Report View - BAS/GST Compliance */}
              <BASReportView
                transactions={transactions.map(tx => ({
                  ...tx,
                  id: tx.id || `${tx.date}_${tx.description}`,
                }))}
                openingDirectorLoanBalance={openingDirectorLoanBalance}
              />
              
              {/* Income Statement View */}
              <IncomeStatementView
                transactions={transactions.map(tx => ({
                  ...tx,
                  id: tx.id || `${tx.date}_${tx.description}`,
                }))}
                openingDirectorLoanBalance={openingDirectorLoanBalance}
              />
            </div>
          )}
        </div>
      )}

      {/* HR & Payroll Tab Content */}
      {activeTab === 'hr' && (
        <div className="space-y-6">
          {(() => {
            const ssoToken = getSSOToken()
            const isAccountingManager = ssoToken && (
              ssoToken.role === 'super_admin' || 
              ssoToken.permissions.includes('accounting:admin') ||
              ssoToken.permissions.includes('accounting:full')
            )
            const isPayrollOnly = ssoToken && !isAccountingManager && (
              ssoToken.permissions.includes('payroll:read') || 
              ssoToken.permissions.includes('payroll:access')
            )
            
            // 일반 관리자 (급여 전용)는 항상 MyPayrollPage 표시
            if (isPayrollOnly) {
              return (
                <MyPayrollPage
                  onLogout={() => {
                    setIsEmployeeLoggedIn(false)
                    setSelectedEmployee(null)
                    setShowAddEmployeeForm(false)
                    // SSO 토큰도 삭제하고 홈페이지로 리다이렉트
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('selpic_sso_token')
                      window.location.href = '/admin/dashboard'
                    }
                  }}
                />
              )
            }
            
            // 직원이 로그인한 경우: My Payroll 페이지
            if (isEmployeeLoggedIn) {
              return (
                <MyPayrollPage
                  onLogout={() => {
                    setIsEmployeeLoggedIn(false)
                    setSelectedEmployee(null)
                    setShowAddEmployeeForm(false)
                  }}
                />
              )
            }
            
            // 관리자가 직원 상세 페이지를 보는 경우 (아래에서 처리)
            return null
          })()}
          
          {(() => {
            const ssoToken = getSSOToken()
            const isAccountingManager = ssoToken && (
              ssoToken.role === 'super_admin' || 
              ssoToken.permissions.includes('accounting:admin') ||
              ssoToken.permissions.includes('accounting:full')
            )
            const isPayrollOnly = ssoToken && !isAccountingManager && (
              ssoToken.permissions.includes('payroll:read') || 
              ssoToken.permissions.includes('payroll:access')
            )
            
            // 일반 관리자 (급여 전용) 또는 직원 로그인 상태면 여기서는 아무것도 표시하지 않음
            if (isPayrollOnly || isEmployeeLoggedIn) {
              return null
            }
            
            // 슈퍼 관리자 & 회계 관리자용 UI
            return (
              <>
                {selectedEmployee ? (
                  // 관리자가 직원 상세 페이지를 보는 경우
                  <EmployeeDetailPage
                    employee={selectedEmployee}
                    onBack={() => {
                      setSelectedEmployee(null)
                      setShowAddEmployeeForm(false)
                    }}
                    onEmployeeUpdate={() => {
                      setSelectedEmployee(null)
                    }}
                  />
                ) : showAddEmployeeForm ? (
                  // 직원 추가 폼 (종합 정보 입력)
                  <EmployeeAddForm
                    onSave={(employee) => {
                      setShowAddEmployeeForm(false)
                      setSelectedEmployee(null)
                    }}
                    onCancel={() => setShowAddEmployeeForm(false)}
                  />
                ) : (
                  // 관리자용: 직원 목록 + 승인 섹션 + 세금 관리
                  <>
                    {/* 직원 목록 */}
                    <EmployeeList
                      onEmployeeClick={(employee) => setSelectedEmployee(employee)}
                      onAddEmployee={() => setShowAddEmployeeForm(true)}
                    />

                    {/* 타임시트 승인 섹션 (관리자용) */}
                    <div className="card">
                      <h3 className="text-xl font-semibold mb-4">Timesheet Approval</h3>
                      <p className="text-sm text-gray-600 mb-4">Review and approve employee timesheets</p>
                      <TimesheetApproval />
                    </div>

                    {/* PAYG Configuration */}
                    <div className="card">
                      <h3 className="text-xl font-semibold mb-4">PAYG Withholding Configuration</h3>
                      <PAYGConfigForm />
                    </div>

                    {/* PAYG Summary */}
                    {transactions.length > 0 && (
                      <div className="card">
                        <h3 className="text-xl font-semibold mb-4">PAYG Withholding Summary</h3>
                        <PAYGSummary transactions={transactions} />
                      </div>
                    )}
                  </>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <SettingsPage
          apiKey={apiKey}
          userApiKey={userApiKey}
          directorName={directorName}
          onApiKeySet={(key) => setApiKey(key)}
          onUserApiKeySet={(key) => setUserApiKey(key)}
          onDirectorNameSet={(name) => setDirectorName(name)}
          onNavigateToPayroll={() => setActiveTab('hr')}
        />
      )}
    </div>
  )
}

// History Page Component
interface HistoryPageProps {
  statementHistory: any[]
  storageSize: number
  formatStorageSize: (bytes: number) => string
  onLoadStatement: (id: string) => void
  onDeleteStatement: (id: string) => Promise<void>
  onDeleteAllStatements: () => Promise<void>
  showDeleteConfirm: string | null
  setShowDeleteConfirm: (id: string | null) => void
  onReloadHistory: () => Promise<void>
}

function HistoryPage({
  statementHistory,
  storageSize,
  formatStorageSize,
  onLoadStatement,
  onDeleteStatement,
  onDeleteAllStatements,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onReloadHistory,
}: HistoryPageProps) {
  const handleDelete = async (id: string) => {
    try {
      await onDeleteStatement(id)
      await onReloadHistory()
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete statement:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Statement History</h2>
            {statementHistory.length > 0 && (
              <button
              onClick={onDeleteAllStatements}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                title="Delete all history. Make sure to export to Excel first!"
              >
                <Trash2 className="w-4 h-4" />
                Clear All History
              </button>
            )}
          </div>

          {/* Storage Usage Warning */}
          {storageSize > 4 * 1024 * 1024 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Storage Usage: {formatStorageSize(storageSize)}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Your history is taking up significant space. Consider exporting to Excel and clearing old entries.
                </p>
              </div>
            </div>
          )}

          {/* Data Persistence Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Data Storage:</strong> Your history is stored in <strong>IndexedDB</strong> (browser storage).
              Data persists across page refreshes but can be cleared by browser settings.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              <strong>Important:</strong> Before clearing history, make sure to export your data to Excel for tax purposes.
            </p>
          </div>

          {statementHistory.length === 0 ? (
            <p className="text-gray-500">No saved statements found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Records
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statementHistory.map((stmt) => (
                    <tr
                      key={stmt.id}
                    className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateObjectAustralian(new Date(stmt.uploadedAt))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{stmt.fileName}</div>
                        {stmt.accountNumber && (
                          <div className="text-xs text-gray-500">Account: {stmt.accountNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stmt.bankName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {stmt.transactions?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                          onClick={() => onLoadStatement(stmt.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            title="Load this statement"
                          >
                            Load
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDeleteConfirm(stmt.id)
                            }}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            title="Delete this statement"
                          >
                          <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this statement and all its transactions? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
  )
}

// Tax & Reporting Form Component
function TaxReportingForm() {
  const [profile, setProfile] = useState<{
    abn: string
    tfn?: string
    gstReportingCycle: 'Monthly' | 'Quarterly'
    paygReportingCycle: 'Monthly' | 'Quarterly'
  }>({
    abn: '',
    tfn: '',
    gstReportingCycle: 'Quarterly',
    paygReportingCycle: 'Quarterly',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      const savedProfile = await indexedDBStorage.getBusinessProfile()
      if (savedProfile) {
        setProfile({
          abn: savedProfile.abn || '',
          tfn: (savedProfile as any).tfn || '',
          gstReportingCycle: savedProfile.gstReportingCycle || 'Quarterly',
          paygReportingCycle: savedProfile.paygReportingCycle || 'Quarterly',
        })
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const existingProfile = await indexedDBStorage.getBusinessProfile()
      await indexedDBStorage.saveBusinessProfile({
        ...existingProfile,
        abn: profile.abn,
        tfn: profile.tfn,
        gstReportingCycle: profile.gstReportingCycle,
        paygReportingCycle: profile.paygReportingCycle,
      } as any)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
      // Dispatch event to update TaxDeadlineTracker
      window.dispatchEvent(new CustomEvent('businessProfileUpdated'))
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatABN = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4').trim()
    }
    return value
  }

  const formatTFN = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    if (cleaned.length <= 9) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3').trim()
    }
    return value
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-4">
                <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ABN (Australian Business Number)
        </label>
        <input
          type="text"
          value={profile.abn}
          onChange={(e) => setProfile({ ...profile, abn: formatABN(e.target.value) })}
          placeholder="12 345 678 901"
          maxLength={14}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
            </div>

                <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TFN (Tax File Number) - Optional
        </label>
        <input
          type="text"
          value={profile.tfn || ''}
          onChange={(e) => setProfile({ ...profile, tfn: formatTFN(e.target.value) })}
          placeholder="123 456 789"
          maxLength={11}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
            </div>

                <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          GST Reporting Cycle
        </label>
        <select
          value={profile.gstReportingCycle}
          onChange={(e) => setProfile({ ...profile, gstReportingCycle: e.target.value as 'Monthly' | 'Quarterly' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
        </select>
            </div>

                <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          PAYG Reporting Cycle
        </label>
        <select
          value={profile.paygReportingCycle}
          onChange={(e) => setProfile({ ...profile, paygReportingCycle: e.target.value as 'Monthly' | 'Quarterly' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Monthly">Monthly</option>
          <option value="Quarterly">Quarterly</option>
        </select>
                </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : isSaved ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Saved!
              </>
            ) : (
              <>
            <Save className="w-4 h-4" />
            Save Tax & Reporting Settings
              </>
            )}
      </button>
    </div>
  )
}

// Clear All History Section Component
interface ClearAllHistorySectionProps {
  onClearAll: () => Promise<void>
}

function ClearAllHistorySection({ onClearAll }: ClearAllHistorySectionProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-red-600">Danger Zone</h3>
      <p className="text-sm text-gray-600 mb-4">
        Permanently delete all uploaded statements and transactions. This action cannot be undone.
      </p>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear All History
        </button>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800 mb-4">
            Are you sure you want to delete ALL history? This action cannot be undone.
          </p>
          <p className="text-xs text-red-700 mb-4">
            Make sure you have exported your data to Excel first!
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await onClearAll()
                setShowConfirm(false)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Yes, Delete All
            </button>
            </div>
          </div>
        )}
      </div>
  )
}

// Settings Page Component
interface SettingsPageProps {
  apiKey: string
  userApiKey: string
  directorName: string
  onApiKeySet: (key: string) => void
  onUserApiKeySet: (key: string) => void
  onDirectorNameSet: (name: string) => void
  onNavigateToPayroll?: () => void
}

function SettingsPage({ apiKey, userApiKey, directorName, onApiKeySet, onUserApiKeySet, onDirectorNameSet, onNavigateToPayroll }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<'business' | 'tax' | 'period' | 'data' | 'audit' | 'incoming'>(() => {
    // URL 파라미터에서 섹션 읽기 (payroll -> tax 섹션)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tabParam = urlParams.get('tab')
      if (tabParam === 'payroll') {
        return 'tax' // PAYG는 Tax & Reporting 섹션에 있음
      }
    }
    return 'business'
  })
  
  // Payroll로 이동하는 이벤트 리스너
  useEffect(() => {
    const handleScrollToPayroll = () => {
      setActiveSection('tax')
      // PAYG 섹션으로 스크롤
      setTimeout(() => {
        const payrollSection = document.getElementById('payroll-section')
        if (payrollSection) {
          payrollSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
    
    window.addEventListener('scrollToPayroll', handleScrollToPayroll)
    return () => window.removeEventListener('scrollToPayroll', handleScrollToPayroll)
  }, [])
  
  // Payroll로 이동하는 이벤트 리스너
  useEffect(() => {
    const handleScrollToPayroll = () => {
      setActiveSection('tax')
      // PAYG 섹션으로 스크롤
      setTimeout(() => {
        const payrollSection = document.getElementById('payroll-section')
        if (payrollSection) {
          payrollSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
    
    window.addEventListener('scrollToPayroll', handleScrollToPayroll)
    return () => window.removeEventListener('scrollToPayroll', handleScrollToPayroll)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="card sticky top-4">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <nav className="space-y-2">
          <button
              onClick={() => setActiveSection('business')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeSection === 'business'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Business Profile
          </button>
          <button
              onClick={() => setActiveSection('tax')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeSection === 'tax'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Tax & Reporting
          </button>
          <button
              onClick={() => setActiveSection('data')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeSection === 'data'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Data Management
          </button>
            <button
              onClick={() => setActiveSection('audit')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeSection === 'audit'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Audit Trail
            </button>
            <button
              onClick={() => setActiveSection('incoming')}
              className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                activeSection === 'incoming'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Incoming Orders
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {activeSection === 'business' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Business Profile</h2>
              <BusinessProfileForm />
            </div>
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">API Configuration</h2>
              <ApiKeyForm
                onApiKeySet={onApiKeySet}
                onUserApiKeySet={onUserApiKeySet}
                onDirectorNameSet={onDirectorNameSet}
              />
            </div>
            <ApiBalanceDashboard
              apiKey={apiKey}
              userApiKey={userApiKey}
            />
        </div>
      )}

        {activeSection === 'tax' && (
          <div className="space-y-6">
      <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Tax & Reporting</h2>
              <TaxReportingForm />
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Note:</strong> Payroll management has been moved to the <strong>HR & Payroll</strong> tab in the main dashboard.
                  </p>
                  <button
                    onClick={() => {
                      if (onNavigateToPayroll) {
                        onNavigateToPayroll()
                      } else {
                        // Fallback: use custom event
                        window.dispatchEvent(new CustomEvent('changeTab', { detail: 'hr' }))
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Go to HR & Payroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'period' && (
          <PeriodManagement />
        )}

        {activeSection === 'data' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Data Management</h2>
              <DataBackupRestore 
                onClearAllData={() => {
                  setTransactions([])
                  setCurrentStatementId(null)
                  setOpeningDirectorLoanBalance(1000.00)
                }}
              />
              <div className="mt-6 pt-6 border-t border-gray-200">
                <ClearAllHistorySection
                  onClearAll={async () => {
                    if (confirm('Are you sure you want to delete ALL history? This cannot be undone. Make sure you have exported your data to Excel first!')) {
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
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'audit' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Audit Trail</h2>
              <AuditTrailView />
            </div>
          </div>
        )}

        {activeSection === 'incoming' && (
          <div className="space-y-6">
            <IncomingOrders />
          </div>
        )}
      </div>
    </div>
  )
}

// Categories list for Cash Expense Form
const CATEGORIES = [
  'INCOME_SALES_CLEANING', // Trading Revenue (통합: Cleaning + Sticker)
  'NON_TAXABLE_CASH_DEPOSIT',
  'LIABILITY_DIRECTORS_LOAN',
  'EQUITY_SHARE_CAPITAL', // Share Capital (주식 납입금)
  'EXPENSE_STARTUP_INCORPORATION', // Startup Costs (통합: Incorporation + Domain + Sample)
  'EXPENSE_FUEL_TRAVEL',
  'EXPENSE_MOTOR_VEHICLE', // Vehicle Maintenance
  'EXPENSE_TRAVEL_TRANSPORT',
  'EXPENSE_TRAVEL_ACCOMMODATION',
  'EXPENSE_TRAVEL_MEALS',
  'EXPENSE_TRAVEL_PARKING_TOLLS',
  'EXPENSE_MEALS_ENTERTAINMENT',
  'EXPENSE_INSURANCE_PROFESSIONAL',
  'EXPENSE_CLEANING_SUPPLIES',
  'EXPENSE_UTILITIES_PHONE',
  'EXPENSE_CLEANING_SUBCONTRACTOR',
  'EXPENSE_REPAIRS_MAINTENANCE',
  'EXPENSE_OFFICE_EQUIPMENT',
  'EXPENSE_OFFICE_SUPPLIES',
  'EXPENSE_RENT',
  'EXPENSE_MARKETING',
  'EXPENSE_WAGES_SALARIES',
  'EXPENSE_SUPERANNUATION',
  'EXPENSE_ATO_GST_BAS',
  'EXPENSE_ATO_PAYG_WITHHOLDING',
  'EXPENSE_COMPANY_INCOME_TAX',
  'EXPENSE_WORKERS_COMPENSATION',
  'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES',
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT',
  'EXPENSE_DIVIDENDS_PAID',
  'EXPENSE_DIRECTORS_FEES',
  'CASH_EXPENSE_PETTY',
  'NON_TAXABLE_TRANSFER',
  'UNCATEGORIZED',
]

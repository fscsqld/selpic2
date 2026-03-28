'use client'

import { useState, useEffect } from 'react'
import { Edit2, Check, X, CheckCircle, AlertCircle, Search, Download, FileText, ArrowLeftRight, Sparkles, AlertTriangle, Receipt, Image as ImageIcon, Upload, X as XIcon, Loader2 } from 'lucide-react' //
import { formatDateAustralian } from '@/lib/utils/date-format'
import { strings } from '@/lib/i18n/strings'
import { formatCurrency } from '@/lib/utils/currency-format'
import { saveUserMapping, findUserMapping } from '@/lib/storage/user-mappings'
import { saveReceipt, getReceipt, deleteReceipt, getReceiptSourceUrl, getReceiptThumbnailUrl } from '@/lib/storage/receipt-storage'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { getCategoryDisplayName } from '@/src/shared/utils/category-mapper'

// Get current user name (default: 사장님)
const getCurrentUserName = (): string => {
  if (typeof window !== 'undefined') {
    const directorName = localStorage.getItem('director_name')
    return directorName || '사장님'
  }
  return '사장님'
}

interface Transaction {
  id?: string
  reference?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
  category?: string
  confidence?: number | string // Can be number (0-1) or "Manual" or "Learned" string
  department?: string
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
  isLearnedMapping?: boolean // Indicates if category was applied from user mappings
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  matchedEmployee?: {
    id: string
    name: string
    employeeId: string
    type: string
  }
  matchConfidence?: 'high' | 'medium' | 'low'
  matchReason?: string
  noABNWarning?: {
    shouldWarn: boolean
    warningMessage: string
    withholdingAmount?: number
  }
  capitalImprovementWarning?: boolean
  source?: 'bank' | 'manual'
  receiptImageId?: string
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

interface TransactionTableProps {
  transactions: Transaction[]
  onTransactionUpdate?: (id: string, updates: Partial<Transaction>) => void
  accountType?: 'individual' | 'company' | 'sole_trader'
}

// 정리된 Tax Category 목록 (중복 제거, 불필요한 항목 제거)
const CATEGORIES = [
  // 수입 (Income)
  'INCOME_SALES_CLEANING', // Trading Revenue (통합: Cleaning + Sticker)
  'INCOME_REFUND_REIMBURSEMENT', // Refund/Reimbursement
  'INCOME_OTHER_BUSINESS', // Other Business Income
  'NON_TAXABLE_CASH_DEPOSIT', // 개인 ATM 입금
  'LIABILITY_DIRECTORS_LOAN', // Director's Loan (통합: Withdrawal 포함)
  
  // 자본 (Equity)
  'EQUITY_SHARE_CAPITAL', // Share Capital (주식 납입금 - Net Profit에 영향 없음, Balance Sheet Equity에만 반영)
  
  // 지출 (Expenses)
  'EXPENSE_STARTUP_INCORPORATION', // Startup Costs (통합: Incorporation + Domain + Sample)
  'EXPENSE_FUEL_TRAVEL', // Fuel (주유소만 - 주차장 제거)
  'EXPENSE_MOTOR_VEHICLE', // Vehicle Maintenance
  // 출장 경비 (Travel Expenses) - Business Deductible
  'EXPENSE_TRAVEL_TRANSPORT', // Travel - Transport (항공사, Uber, Ola, 렌터카, 톨비)
  'EXPENSE_TRAVEL_ACCOMMODATION', // Travel - Accommodation (Hotel, Motel, Stay, Airbnb)
  'EXPENSE_TRAVEL_MEALS', // Travel - Meals (레스토랑, 카페 중 사장님 1인 결제)
  'EXPENSE_TRAVEL_PARKING_TOLLS', // Travel - Parking/Tolls (Secure Parking, Linkt)
  'EXPENSE_MEALS_ENTERTAINMENT', // Meals & Entertainment (클라이언트 접대비만)
  'EXPENSE_INSURANCE_PROFESSIONAL', // Insurance/Professional
  'EXPENSE_CLEANING_SUPPLIES', // Cleaning Supplies
  'EXPENSE_UTILITIES_PHONE', // Utilities/Phone
  'EXPENSE_CLEANING_SUBCONTRACTOR', // Subcontractor
  'EXPENSE_REPAIRS_MAINTENANCE', // Repairs & Maintenance
  'EXPENSE_OFFICE_EQUIPMENT', // Office Equipment & Assets
  'EXPENSE_OFFICE_SUPPLIES', // Office Supplies
  'EXPENSE_FREIGHT_SHIPPING', // Freight & Shipping
  'EXPENSE_RENT', // Rent
  'EXPENSE_MARKETING', // Marketing & Advertising
  'EXPENSE_WAGES_SALARIES', // Wages & Salaries
  'EXPENSE_SUPERANNUATION', // Superannuation
  'EXPENSE_ATO_GST_BAS', // ATO - GST & BAS
  'EXPENSE_ATO_PAYG_WITHHOLDING', // ATO - PAYG Withholding
  'EXPENSE_COMPANY_INCOME_TAX', // Company Income Tax
  'EXPENSE_WORKERS_COMPENSATION', // Workers Compensation (WorkCover)
  'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES', // Accounting & Professional Fees
  'EXPENSE_DIRECTOR_LOAN_REPAYMENT', // Director Loan Repayment
  'EXPENSE_DIVIDENDS_PAID', // Dividends Paid
  'EXPENSE_DIRECTORS_FEES', // Director's Fees
  'CASH_EXPENSE_PETTY', // Cash & Petty Cash (현금 지출)
  
  // 이체 및 기타
  'NON_TAXABLE_TRANSFER', // Non-Taxable Transfer (통합: TRANSFER_INTERNAL 포함)
  'UNCATEGORIZED', // Uncategorized
]

const DEPARTMENTS = ['cleaning', 'personal', 'general', 'unknown'] // 'sticker' removed - unified with 'cleaning' as 'Company'

/**
 * Clean and simplify transaction description for display
 * Removes transaction IDs, dates, reference numbers, and prefixes
 * Extracts core merchant name
 */
function cleanDescription(description: string): string {
  if (!description) return ''
  
  const desc = description.trim()
  const descLower = desc.toLowerCase()
  
  // Known merchant name mappings (priority order - most specific first)
  const merchantMap: Array<{ pattern: RegExp | string, name: string }> = [
    { pattern: /bcc\s+kgs\s+car\s+park|king\s+george\s+square/i, name: 'King George Square Car Park' },
    { pattern: /associated\s+cleaning?|associatedclean/i, name: 'Associated Cleaning' },
    { pattern: /jason\s+family(?:\s+shine)?/i, name: 'Jason Family Shine' },
    { pattern: /ak\s+innovation/i, name: 'AK Innovation' },
    { pattern: /aseeos(?:\s+homes)?/i, name: 'Aseeos Homes' },
    { pattern: /7[- ]?eleven|7eleven/i, name: '7-Eleven' },
    { pattern: /kleenhub/i, name: 'KleenHub' },
    { pattern: /ampol/i, name: 'Ampol' },
    { pattern: /bunnings/i, name: 'Bunnings' },
    { pattern: /malatang/i, name: 'Malatang' },
    { pattern: /mjr\s+enterprise/i, name: 'MJR Enterprise' },
    { pattern: /oktax/i, name: 'OKTAX' },
    { pattern: /tpg(?:\s+(?:internet|telecom))?/i, name: 'TPG Internet' },
    { pattern: /alinta\s+energy/i, name: 'Alinta Energy' },
    { pattern: /brisbane\s+city\s+council/i, name: 'Brisbane City Council' },
    { pattern: /allianz/i, name: 'Allianz' },
    { pattern: /racq/i, name: 'RACQ' },
    { pattern: /nrma/i, name: 'NRMA' },
    { pattern: /secure\s+parking/i, name: 'Secure Parking' },
    { pattern: /uptown\s+parking/i, name: 'Uptown Parking' },
    { pattern: /supercheap\s+auto/i, name: 'Supercheap Auto' },
    { pattern: /total\s+tools/i, name: 'Total Tools' },
    { pattern: /bp\b/i, name: 'BP' },
    { pattern: /shell\b/i, name: 'Shell' },
    { pattern: /liberty\b/i, name: 'Liberty' },
    { pattern: /united\b/i, name: 'United' },
  ]
  
  // Check for known merchant patterns first
  for (const { pattern, name } of merchantMap) {
    if (typeof pattern === 'string') {
      if (descLower.includes(pattern)) {
        return name
      }
    } else {
      if (pattern.test(desc)) {
        return name
      }
    }
  }
  
  // Remove common prefixes and patterns
  let cleaned = desc
    // Remove transaction type prefixes (V8656, EFTPOS, VISA, etc.)
    .replace(/^(V\d+|EFTPOS|VISA|MASTERCARD|DEBIT|CREDIT|ATM|NABATM)\s+/i, '')
    // Remove date patterns (DD/MM, DD/MM/YY, DD-MM-YY)
    .replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s*/g, '')
    // Remove time patterns (HH:MM)
    .replace(/\d{1,2}:\d{2}\s*/g, '')
    // Remove reference numbers (long numeric strings at the end)
    .replace(/\s+\d{8,}$/g, '')
    // Remove location codes and store numbers (4-5 digits with optional letter)
    .replace(/\b\d{4,5}[A-Z]?\b/g, '')
    // Remove state abbreviations
    .replace(/\b(QLD|NSW|VIC|SA|WA|NT|ACT|TAS)\b/gi, '')
    // Remove common location words
    .replace(/\b(MOUNT|MT|ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|BLVD|BOULEVARD)\b/gi, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
  
  // If cleaned description is still long, try to extract first meaningful words
  if (cleaned.length > 30) {
    const words = cleaned.split(/\s+/).filter(word => 
      word.length > 2 && 
      !/^\d+$/.test(word) && 
      !['THE', 'AND', 'FOR', 'FROM', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY'].includes(word.toUpperCase())
    )
    
    if (words.length > 0) {
      // Take first 2-3 meaningful words
      const extracted = words.slice(0, 3).join(' ')
      // Capitalize properly
      return extracted.split(/\s+/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
  }
  
  // Fallback: return cleaned description (truncated if too long)
  if (cleaned.length > 50) {
    return cleaned.substring(0, 50) + '...'
  }
  
  // Capitalize first letter of each word for better display
  return cleaned.split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}

export function TransactionTable({ transactions, onTransactionUpdate, accountType = 'company' }: TransactionTableProps) {
  // Local state to track transaction updates for immediate UI feedback
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions)
  
  // Track which cells are being edited
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null)
  
  // Filter: Show Business Only toggle
  const [showBusinessOnly, setShowBusinessOnly] = useState<boolean>(false)
  
  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ name: string; abn?: string; acn?: string }>({
    name: COMPANY_LEGAL.companyName,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn,
  })
  
  // Receipt upload state per transaction
  const [uploadingReceiptId, setUploadingReceiptId] = useState<string | null>(null)
  const [transactionReceipts, setTransactionReceipts] = useState<Record<string, string>>({})
  
  // Load company info for receipt display
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          setCompanyInfo({
            name: profile.companyName || COMPANY_LEGAL.companyName,
            abn: profile.abn || COMPANY_LEGAL.abn,
            acn: profile.acn || COMPANY_LEGAL.acn,
          })
        }
      } catch (err) {
        console.error('Failed to load company info:', err)
      }
    }
    loadCompanyInfo()
  }, [])
  
  // Update local state when transactions prop changes
  useEffect(() => {
    setLocalTransactions(transactions)
  }, [transactions])

  // Filter transactions based on "Show Business Only" toggle
  // Consolidated: All business activities (cleaning + sticker) treated as single entity
  // ⚠️ IMPORTANT: Individual User mode - always show all transactions (no business filter)
  // This must be defined BEFORE any useEffect that uses it
  const filteredTransactions = accountType === 'individual'
    ? localTransactions // Individual User: Show all transactions
    : showBusinessOnly
      ? localTransactions.filter(tx => {
          // Include all business transactions (exclude personal)
          return tx.department !== 'personal' && 
                 tx.department !== 'unknown' &&
                 (tx.department === 'cleaning' || 
                  tx.department === 'sticker' || 
                  !tx.department) // Include transactions without department as business
        })
      : localTransactions
  
  // Load receipts from IndexedDB on mount and when transactions change
  useEffect(() => {
    const loadReceipts = async () => {
      const receipts: Record<string, string> = {}
      
      // Load receipts for ALL transactions (not just filtered ones)
      for (const tx of localTransactions) {
        const baseTxId = tx.id || tx.reference || `${tx.date}_${tx.description}`
        
        // Check if transaction has receiptImageId
        const receiptId = (tx as any)?.receiptImageId
        if (receiptId) {
          try {
            const receiptData = await indexedDBStorage.getTransactionReceipt(receiptId)
            if (receiptData) {
              const objectUrl = URL.createObjectURL(receiptData.blob)
              receipts[baseTxId] = objectUrl
            }
          } catch (err) {
            console.error('[Receipt] Failed to load receipt:', receiptId, err)
          }
        }
        
        // Backward compatibility: Check localStorage for old receipts
        const oldReceipt = getReceipt(baseTxId)
        if (oldReceipt && !receipts[baseTxId]) {
          const receiptUrl = getReceiptThumbnailUrl(oldReceipt) || getReceiptSourceUrl(oldReceipt)
          if (receiptUrl) {
            receipts[baseTxId] = receiptUrl
          }
        }
      }
      
      setTransactionReceipts(receipts)
      console.log('[Receipt] Loaded receipts from IndexedDB:', Object.keys(receipts).length)
    }
    
    loadReceipts()
    
    // Cleanup object URLs on unmount
    return () => {
      Object.values(transactionReceipts).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [localTransactions]) // Use localTransactions instead of filteredTransactions

  const getCategoryLabel = (category?: string): string => {
    if (!category) return strings.categories.uncategorized
    
    const categoryMap: Record<string, string> = {
      // 수입 (Income)
      'INCOME_SALES_CLEANING': 'Trading Revenue', // 통합: 모든 사업적 입금 (Cleaning + Sticker)
      'INCOME_SALES_STICKER': 'Trading Revenue', // Legacy: 자동으로 INCOME_SALES_CLEANING으로 변환
      'INCOME_REFUND_REIMBURSEMENT': strings.categories.incomeRefundReimbursement, // Refund/Reimbursement
      'INCOME_OTHER_BUSINESS': strings.categories.incomeOtherBusiness, // Other Business Income
      'NON_TAXABLE_CASH_DEPOSIT': strings.categories.nonTaxableCashDeposit, // 개인 ATM 입금
      'LIABILITY_DIRECTORS_LOAN': strings.categories.liabilityDirectorsLoan, // Director's Loan (통합)
      'LIABILITY_DIRECTORS_LOAN_WITHDRAWAL': strings.categories.liabilityDirectorsLoan, // Director's Loan (통합)
      
      // 자본 (Equity)
      'EQUITY_SHARE_CAPITAL': strings.categories.equityShareCapital, // Share Capital (Net Profit에 영향 없음)
      
      // 지출 (Expenses)
      'EXPENSE_STARTUP_INCORPORATION': strings.categories.expenseStartup, // Startup Costs (통합)
      'EXPENSE_STARTUP_DOMAIN': strings.categories.expenseStartup, // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
      'EXPENSE_STARTUP_SAMPLE': strings.categories.expenseStartup, // Legacy: 자동으로 EXPENSE_STARTUP_INCORPORATION으로 변환
      'EXPENSE_FUEL_TRAVEL': strings.categories.expenseFuelTravel,
      'EXPENSE_MOTOR_VEHICLE': strings.categories.expenseMotorVehicle, // Vehicle Maintenance
      'EXPENSE_TRAVEL_TRANSPORT': strings.categories.expenseTravelTransport,
      'EXPENSE_TRAVEL_ACCOMMODATION': strings.categories.expenseTravelAccommodation,
      'EXPENSE_TRAVEL_MEALS': strings.categories.expenseTravelMeals,
      'EXPENSE_TRAVEL_PARKING_TOLLS': strings.categories.expenseTravelParkingTolls,
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
      
      // 이체 및 기타
      'NON_TAXABLE_TRANSFER': strings.categories.internalTransfer, // Non-Taxable Transfer (통합)
      'TRANSFER_INTERNAL': strings.categories.internalTransfer, // Non-Taxable Transfer (통합)
      'TRANSFER_PARTNERSHIP_TO_COMPANY': strings.categories.internalTransfer, // Non-Taxable Transfer (통합)
      'UNCATEGORIZED': strings.categories.uncategorized,
      
      // Legacy categories (하위 호환성)
      'INCOME_SALES': strings.categories.incomeSales,
      'INCOME_CASH_DEPOSIT_REVIEW': strings.categories.nonTaxableCashDeposit, // Legacy
      'EXPENSE_UTILITIES': strings.categories.expenseUtilitiesPhone, // Legacy
      'EXPENSE_STICKER_PRODUCTION': 'Sticker Production', // Legacy
    }

    return categoryMap[category] || category
  }

  const getDepartmentLabel = (dept?: string): string => {
    if (!dept) return strings.departments.unknown
    
    // Unified: 'sticker' displays as 'Company' (same as 'cleaning')
    const deptMap: Record<string, string> = {
      'cleaning': strings.departments.cleaning,
      'sticker': strings.departments.cleaning, // Unified: 'sticker' → 'cleaning' (both are 'Company')
      'personal': strings.departments.personal,
      'general': strings.departments.general,
      'unknown': strings.departments.unknown,
    }

    return deptMap[dept] || strings.departments.unknown
  }

  // Handle immediate updates for category
  const handleCategoryChange = async (txId: string, newCategory: string, index: number) => {
    const tx = localTransactions.find((t, idx) => {
      const currentTxId = t.id ? `${t.id}_${idx}` : `${t.date}_${t.description}_${idx}`
      return currentTxId === txId
    })

    if (!tx) return

    // Unified: Auto-convert legacy categories to consolidated ones
    const normalizedCategory = newCategory === 'INCOME_SALES_STICKER' 
      ? 'INCOME_SALES_CLEANING' // Trading Revenue 통합
      : (newCategory === 'EXPENSE_STARTUP_DOMAIN' || newCategory === 'EXPENSE_STARTUP_SAMPLE')
        ? 'EXPENSE_STARTUP_INCORPORATION' // Startup Costs 통합
        : newCategory

    const oldCategory = tx.category
    
    // 💾 Save user mapping for learning
    try {
      saveUserMapping(tx.description, normalizedCategory, tx.department)
      console.log('[TransactionTable] 💾 Saved user mapping:', {
        description: tx.description.substring(0, 50),
        category: normalizedCategory,
        department: tx.department
      })
    } catch (error) {
      console.error('[TransactionTable] Failed to save user mapping:', error)
    }
    
    // Log audit trail (outside of map)
    try {
      await indexedDBStorage.logAuditTrail({
        transactionId: txId,
        action: 'category_changed',
        userId: 'owner',
        userName: getCurrentUserName(),
        oldValue: oldCategory,
        newValue: normalizedCategory,
        description: `Category changed from "${oldCategory || 'N/A'}" to "${normalizedCategory}"${normalizedCategory !== newCategory ? ` (auto-converted from ${newCategory})` : ''}`,
      })
    } catch (error) {
      console.error('[TransactionTable] Failed to log audit trail:', error)
    }
    
    // Update transactions
    const updated = localTransactions.map((t, idx) => {
      const currentTxId = t.id ? `${t.id}_${idx}` : `${t.date}_${t.description}_${idx}`
      if (currentTxId === txId) {
        return { 
          ...t, 
          category: normalizedCategory,
          confidence: 'Manual' as const // Mark as manually edited
        }
      }
      return t
    })
    setLocalTransactions(updated)
    
    // Notify parent component with confidence update
    if (onTransactionUpdate) {
      onTransactionUpdate(txId, { 
        category: newCategory,
        confidence: 'Manual'
      })
    }
  }

  // Handle immediate updates for department
  const handleDepartmentChange = async (txId: string, newDepartment: string, index: number) => {
    const tx = localTransactions.find((t, idx) => {
      const currentTxId = t.id ? `${t.id}_${idx}` : `${t.date}_${t.description}_${idx}`
      return currentTxId === txId
    })

    if (!tx) return

    const oldDepartment = tx.department
    
    // Unified: Auto-convert 'sticker' to 'cleaning' (both are 'Company')
    const normalizedDepartment = newDepartment === 'sticker' ? 'cleaning' : newDepartment
    
    // 💾 Save user mapping for learning (update existing mapping if category was already set)
    try {
      const existingMapping = findUserMapping(tx.description)
      if (existingMapping) {
        // Update existing mapping with new department
        saveUserMapping(tx.description, tx.category || existingMapping.category, normalizedDepartment)
      } else if (tx.category) {
        // Create new mapping with category and department
        saveUserMapping(tx.description, tx.category, normalizedDepartment)
      }
    } catch (error) {
      console.error('[TransactionTable] Failed to save user mapping:', error)
    }
    
    // Log audit trail (outside of map)
    // Unified: Normalize old and new department values (sticker → cleaning)
    const normalizedOldDepartment = oldDepartment === 'sticker' ? 'cleaning' : oldDepartment
    try {
      await indexedDBStorage.logAuditTrail({
        transactionId: txId,
        action: 'department_changed',
        userId: 'owner',
        userName: getCurrentUserName(),
        oldValue: normalizedOldDepartment,
        newValue: normalizedDepartment,
        description: `Department changed from "${normalizedOldDepartment || 'N/A'}" to "${normalizedDepartment}"`,
      })
    } catch (error) {
      console.error('[TransactionTable] Failed to log audit trail:', error)
    }
    
    // Update transactions
    const updated = localTransactions.map((t, idx) => {
      const currentTxId = t.id ? `${t.id}_${idx}` : `${t.date}_${t.description}_${idx}`
      if (currentTxId === txId) {
        return { 
          ...t, 
          department: normalizedDepartment,
          confidence: 'Manual' as const // Mark as manually edited
        }
      }
      return t
    })
    setLocalTransactions(updated)
    
    // Notify parent component with confidence update
    if (onTransactionUpdate) {
      onTransactionUpdate(txId, { 
        department: newDepartment,
        confidence: 'Manual'
      })
    }
  }

  // Handle DEBIT/CREDIT swap
  const handleDebitCreditSwap = (txId: string, index: number) => {
    const updated = localTransactions.map((tx, idx) => {
      const currentTxId = tx.id ? `${tx.id}_${idx}` : `${tx.date}_${tx.description}_${idx}`
      if (currentTxId === txId) {
        // Swap debit and credit values
        const updatedTx = { 
          ...tx, 
          debit: tx.credit,
          credit: tx.debit,
          confidence: 'Manual' as const // Mark as manually edited
        }
        // Notify parent component with swap update
        if (onTransactionUpdate) {
          onTransactionUpdate(txId, { 
            debit: tx.credit,
            credit: tx.debit,
            confidence: 'Manual'
          })
        }
        return updatedTx
      }
      return tx
    })
    setLocalTransactions(updated)
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggle - Only for Company/Sole Trader */}
      {accountType !== 'individual' && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBusinessOnly}
                onChange={(e) => setShowBusinessOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Business Only (Company)
              </span>
            </label>
            <span className="text-xs text-gray-500">
              ({filteredTransactions.length} of {localTransactions.length} transactions)
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {strings.table.date}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {strings.table.description}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {accountType === 'individual' ? 'Expense' : strings.table.debit}
            </th>
            {accountType !== 'individual' && (
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                {strings.table.swap || 'Swap'}
              </th>
            )}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {accountType === 'individual' ? 'Income' : strings.table.credit}
            </th>
            {accountType !== 'individual' && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {strings.table.balance}
              </th>
            )}
            {accountType !== 'individual' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {strings.table.category}
              </th>
            )}
            {accountType !== 'individual' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {strings.table.department}
              </th>
            )}
            {accountType !== 'individual' && (
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {strings.table.confidence}
              </th>
            )}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
              Evidence
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredTransactions.map((tx, index) => {
            // Generate unique key: always include index to ensure absolute uniqueness
            // Even if tx.id exists, we append index to prevent duplicates
            // But for receipt matching, use the base ID without index
            const baseTxId = tx.id || tx.reference || `${tx.date}_${tx.description}`
            const txId = tx.id ? `${tx.id}_${index}` : `${tx.date}_${tx.description}_${index}`
            // Personal items have lighter background
            const isPersonal = tx.department === 'personal'
            return (
              <tr 
                key={txId} 
                className={`hover:bg-gray-50 ${isPersonal ? 'bg-gray-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDateAustralian(tx.date)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <span title={tx.description}>{cleanDescription(tx.description)}</span>
                    {(tx as any).receiptImageId && (
                      <button
                        onClick={async () => {
                          try {
                            const { indexedDBStorage } = await import('@/lib/storage/indexed-db')
                            const receipt = await indexedDBStorage.getReceiptImage((tx as any).receiptImageId)
                            if (receipt && receipt.imageData) {
                              setReceiptImage(`data:${receipt.fileType};base64,${receipt.imageData}`)
                              setShowReceiptModal(true)
                            }
                          } catch (err) {
                            console.error('Failed to load receipt:', err)
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                    {tx.isDirectorsLoan && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {strings.status.directorsLoan}
                      </span>
                    )}
                    {tx.isPreTradingExpense && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {strings.status.preRevenue}
                      </span>
                    )}
                    {tx.noABNWarning?.shouldWarn && (
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300"
                        title={tx.noABNWarning.warningMessage}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        No ABN (47%)
                        {tx.noABNWarning.withholdingAmount && (
                          <span className="ml-1 font-semibold">
                            ${tx.noABNWarning.withholdingAmount.toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                    {tx.isPayrollTransaction && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          title={tx.matchedEmployee 
                            ? `Payroll payment to ${tx.matchedEmployee.name} (${tx.matchedEmployee.employeeId})`
                            : 'Payroll transaction'}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Payroll
                          {tx.matchedEmployee && (
                            <span className="ml-1 text-xs opacity-75">
                              ({tx.matchedEmployee.name})
                            </span>
                          )}
                          {tx.payrollType && (
                            <span className="ml-1 text-xs opacity-75">
                              [{tx.payrollType}]
                            </span>
                          )}
                        </span>
                        {tx.matchConfidence && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              tx.matchConfidence === 'high' 
                                ? 'bg-green-100 text-green-800' 
                                : tx.matchConfidence === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                            title={tx.matchReason || `Match confidence: ${tx.matchConfidence}`}
                          >
                            {tx.matchConfidence === 'high' ? '✓ High' : tx.matchConfidence === 'medium' ? '~ Medium' : '? Low'}
                          </span>
                        )}
                        {tx.isPayrollTransaction && tx.requiresPAYG && (
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800"
                            title={`PAYG Withholding required for ${tx.payrollType || 'payroll'} transaction`}
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            PAYG
                          </span>
                        )}
                      </div>
                    )}
                    {tx.capitalImprovementWarning && (
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                        title="Capital Improvement 여부를 확인하세요. 금액이 $5,000 이상이거나 리모델링 관련 키워드가 포함되어 있습니다. Capital Improvement는 즉시 공제되지 않을 수 있습니다."
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Capital Improvement 확인 필요
                      </span>
                    )}
                    {tx.isUnusualCredit && (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200 cursor-help"
                        title="Unusual but valid: Credit transaction from typically expense vendor. AI detected refund/reimbursement and correctly classified based on column position (Credit)."
                      >
                        <CheckCircle className="w-3 h-3" />
                        Check
                      </span>
                    )}
                    {tx.fbtInfo?.isFBTRelevant && (
                      <span 
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-help ${
                          tx.fbtInfo.fbtRisk === 'high'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : tx.fbtInfo.fbtRisk === 'medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}
                        title={`FBT ${tx.fbtInfo.fbtRisk?.toUpperCase() || 'LOW'} Risk: ${tx.fbtInfo.fbtCategory || 'other'} - ${tx.fbtInfo.reasoning || 'FBT reportable benefit'}. ${tx.fbtInfo.fbtAmount ? `Estimated FBT: $${tx.fbtInfo.fbtAmount.toFixed(2)}` : ''}`}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        FBT {tx.fbtInfo.fbtRisk?.toUpperCase() || 'LOW'}
                        {tx.fbtInfo.fbtAmount && (
                          <span className="ml-1 font-semibold">
                            ${tx.fbtInfo.fbtAmount.toFixed(2)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {tx.debit ? formatCurrency(tx.debit) : '-'}
                </td>
                {accountType !== 'individual' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {(tx.debit || tx.credit) && (
                      <button
                        onClick={() => handleDebitCreditSwap(txId, index)}
                        className="inline-flex items-center justify-center p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                        title="Swap Debit and Credit"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                  {tx.credit ? formatCurrency(tx.credit) : '-'}
                </td>
                {accountType !== 'individual' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                    {formatCurrency(tx.balance || 0)}
                  </td>
                )}
                {accountType !== 'individual' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <select
                        value={tx.category || 'UNCATEGORIZED'}
                        onChange={(e) => handleCategoryChange(txId, e.target.value, index)}
                        className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-[150px]"
                      >
                      {/* Income */}
                      <optgroup label="Income">
                        {CATEGORIES.filter(cat => 
                          cat.startsWith('INCOME_') || cat === 'NON_TAXABLE_CASH_DEPOSIT'
                        ).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </optgroup>
                      
                      {/* Equity */}
                      <optgroup label="Equity">
                        {CATEGORIES.filter(cat => 
                          cat.startsWith('EQUITY_')
                        ).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </optgroup>
                      
                      {/* Expenses */}
                      <optgroup label="Expenses">
                        {CATEGORIES.filter(cat => 
                          cat.startsWith('EXPENSE_') && 
                          !cat.includes('ATO_') && 
                          !cat.includes('COMPANY_INCOME_TAX') &&
                          cat !== 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' &&
                          cat !== 'EXPENSE_DIVIDENDS_PAID' &&
                          cat !== 'EXPENSE_DIRECTORS_FEES'
                        ).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </optgroup>
                      
                      {/* Tax & Compliance */}
                      <optgroup label="Tax & Compliance">
                        {CATEGORIES.filter(cat => 
                          cat.includes('ATO_') || 
                          cat === 'EXPENSE_COMPANY_INCOME_TAX' ||
                          cat === 'EXPENSE_WAGES_SALARIES' ||
                          cat === 'EXPENSE_SUPERANNUATION' ||
                          cat === 'EXPENSE_DIRECTORS_FEES' ||
                          cat === 'EXPENSE_WORKERS_COMPENSATION' ||
                          cat === 'EXPENSE_ACCOUNTING_PROFESSIONAL_FEES'
                        ).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </optgroup>
                      
                      {/* Transfers & Loans */}
                      <optgroup label="Transfers & Loans">
                        {CATEGORIES.filter(cat => 
                          cat === 'LIABILITY_DIRECTORS_LOAN' ||
                          cat === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT' ||
                          cat === 'EXPENSE_DIVIDENDS_PAID' ||
                          cat === 'NON_TAXABLE_TRANSFER' ||
                          cat === 'UNCATEGORIZED'
                        ).map((cat) => (
                          <option key={cat} value={cat}>
                            {getCategoryLabel(cat)}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {tx.isLearnedMapping && (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap"
                        title="이전 수정을 바탕으로 자동 분류됨"
                      >
                        <Sparkles className="w-3 h-3" />
                        자동
                      </span>
                    )}
                  </div>
                </td>
                )}
                {accountType !== 'individual' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={tx.department === 'sticker' ? 'cleaning' : (tx.department || 'personal')} // Auto-convert 'sticker' to 'cleaning'
                      onChange={(e) => handleDepartmentChange(txId, e.target.value, index)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-[120px]"
                    >
                      <option value="cleaning">{strings.departments.cleaning}</option>
                      <option value="personal">{strings.departments.personal}</option>
                      <option value="general">{strings.departments.general}</option>
                      <option value="unknown">{strings.departments.unknown}</option>
                    </select>
                  </td>
                )}
                {accountType !== 'individual' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      {tx.confidence === 'Manual' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">Manual</span>
                        </>
                      ) : typeof tx.confidence === 'number' ? (
                        <>
                          {tx.confidence >= 0.9 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className="text-gray-600">
                            {(tx.confidence * 100).toFixed(0)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">N/A</span>
                        </>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {/* Evidence Column */}
                  <div className="flex items-center justify-center gap-2">
                    {transactionReceipts[baseTxId] ? (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              // Try IndexedDB first
                              const receiptId = (tx as any)?.receiptImageId
                              if (receiptId) {
                                const receiptData = await indexedDBStorage.getTransactionReceipt(receiptId)
                                if (receiptData) {
                                  const objectUrl = URL.createObjectURL(receiptData.blob)
                                  setReceiptImage(objectUrl)
                                  setReceiptFileName(receiptData.fileName)
                                  setShowReceiptModal(true)
                                  return
                                }
                              }
                              
                              // Fallback to localStorage
                              const receipt = getReceipt(baseTxId)
                              const receiptUrl = getReceiptSourceUrl(receipt)
                              if (receiptUrl) {
                                setReceiptImage(receiptUrl)
                                setReceiptFileName(receipt?.fileName || null)
                                setShowReceiptModal(true)
                              }
                            } catch (err) {
                              console.error('[Receipt] Failed to load receipt:', err)
                              // Final fallback
                              const receipt = getReceipt(baseTxId)
                              const receiptUrl = getReceiptSourceUrl(receipt)
                              if (receiptUrl) {
                                setReceiptImage(receiptUrl)
                                setReceiptFileName(receipt?.fileName || null)
                                setShowReceiptModal(true)
                              }
                            }
                          }}
                          className="relative group"
                          title="View receipt"
                        >
                          <img
                            src={transactionReceipts[baseTxId]}
                            alt="Receipt"
                            className="w-10 h-10 object-cover rounded border border-gray-300 hover:border-blue-500 transition-colors cursor-pointer"
                            onError={(e) => {
                              // Fallback if image fails to load (e.g., cloud URL expired)
                              console.warn('[Receipt] Failed to load thumbnail:', baseTxId)
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded transition-opacity" />
                        </button>
                        <button
                          onClick={async (e) => {
                            // Prevent event bubbling to avoid triggering other handlers
                            e.stopPropagation()
                            e.preventDefault()
                            
                            if (confirm('Delete this receipt?')) {
                              try {
                                // Get receipt ID from current transaction
                                const receiptId = (tx as any)?.receiptImageId
                                
                                if (receiptId) {
                                  // Delete from IndexedDB
                                  await indexedDBStorage.deleteTransactionReceipt(receiptId)
                                  console.log('[Receipt] Deleted from IndexedDB:', receiptId)
                                } else {
                                  // Fallback: Try to find receipt by transaction ID
                                  try {
                                    const receiptData = await indexedDBStorage.getTransactionReceiptByTransactionId(baseTxId)
                                    if (receiptData) {
                                      await indexedDBStorage.deleteTransactionReceipt(receiptData.id)
                                      console.log('[Receipt] Deleted from IndexedDB (by transaction ID):', receiptData.id)
                                    }
                                  } catch (err) {
                                    console.warn('[Receipt] No IndexedDB receipt found, trying localStorage fallback')
                                  }
                                }
                                
                                // Also delete from localStorage (backward compatibility)
                                try {
                                  deleteReceipt(baseTxId)
                                } catch (err) {
                                  console.warn('[Receipt] Failed to delete from localStorage:', err)
                                }
                                
                                // Revoke object URL
                                const currentUrl = transactionReceipts[baseTxId]
                                if (currentUrl && currentUrl.startsWith('blob:')) {
                                  URL.revokeObjectURL(currentUrl)
                                }
                                
                                // Update UI state immediately
                                setTransactionReceipts(prev => {
                                  const updated = { ...prev }
                                  delete updated[baseTxId]
                                  return updated
                                })
                                
                                // Update local transactions state
                                setLocalTransactions(prev => {
                                  return prev.map(t => {
                                    const currentTxId = t.id || t.reference || `${t.date}_${t.description}`
                                    if (currentTxId === baseTxId || (t as any).receiptImageId === receiptId) {
                                      const updated = { ...t }
                                      delete (updated as any).receiptImageId
                                      return updated
                                    }
                                    return t
                                  })
                                })
                                
                                // Update parent component if callback exists
                                if (onTransactionUpdate) {
                                  onTransactionUpdate(tx.id || tx.reference || baseTxId, {
                                    receiptImageId: undefined,
                                  } as any)
                                }
                                
                                console.log('[Receipt] Deleted successfully:', baseTxId)
                              } catch (err) {
                                console.error('[Receipt] Failed to delete receipt:', err)
                                alert('Failed to delete receipt. Please try again.')
                              }
                            }
                          }}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete receipt"
                          type="button"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            
                            // Validate file type
                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
                            if (!validTypes.includes(file.type)) {
                              alert('Please upload a JPG, PNG, or PDF file')
                              return
                            }
                            
                            // Validate file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              alert('File size must be less than 5MB')
                              return
                            }
                            
                            setUploadingReceiptId(baseTxId)
                            try {
                              // Save receipt to IndexedDB as Blob
                              const receiptId = await indexedDBStorage.saveTransactionReceipt(baseTxId, file)
                              
                              // Create object URL for preview
                              const receiptData = await indexedDBStorage.getTransactionReceipt(receiptId)
                              if (receiptData) {
                                const objectUrl = URL.createObjectURL(receiptData.blob)
                                setTransactionReceipts(prev => ({
                                  ...prev,
                                  [baseTxId]: objectUrl
                                }))
                                
                                // Update transaction with receipt ID
                                if (onTransactionUpdate) {
                                  onTransactionUpdate(baseTxId, {
                                    receiptImageId: receiptId,
                                  } as any)
                                }
                                
                                console.log('[Receipt] Saved to IndexedDB successfully:', receiptId)
                              } else {
                                console.error('[Receipt] Receipt not found after save:', receiptId)
                              }
                            } catch (err) {
                              console.error('[Receipt] Failed to save receipt:', err)
                              alert('Failed to upload receipt. Please try again.')
                            } finally {
                              setUploadingReceiptId(null)
                              // Reset input
                              e.target.value = ''
                            }
                          }}
                          disabled={uploadingReceiptId === baseTxId}
                        />
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={uploadingReceiptId === txId}
                            className={`p-2 rounded-md transition-colors ${
                              uploadingReceiptId === txId
                                ? 'bg-gray-200 cursor-not-allowed'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                            }`}
                            title="Upload receipt (JPG, PNG, or PDF)"
                          >
                            {uploadingReceiptId === baseTxId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </button>
                          <span className="text-xs text-gray-500">Add</span>
                        </div>
                      </label>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      {filteredTransactions.length === 0 && localTransactions.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          {accountType === 'individual' 
            ? 'No transactions found matching the current filters.'
            : 'No business transactions found. Try unchecking "Show Business Only" to see all transactions.'}
        </div>
      )}

      {localTransactions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No transactions found. Please upload a PDF statement.
        </div>
      )}

      {/* Receipt Image Modal */}
      {showReceiptModal && receiptImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => {
          setShowReceiptModal(false)
          setReceiptImage(null)
          setReceiptFileName(null)
        }}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowReceiptModal(false)
                setReceiptImage(null)
                setReceiptFileName(null)
              }}
              className="absolute top-4 right-4 p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              {receiptFileName && (
                <p className="text-sm font-medium text-gray-700 mb-2">{receiptFileName}</p>
              )}
              <div className="text-xs text-gray-600 space-y-0.5">
                <p className="font-semibold text-gray-800">{companyInfo.name}</p>
                {companyInfo.abn && (
                  <p>ABN: {companyInfo.abn}</p>
                )}
                {companyInfo.acn && (
                  <p>ACN: {companyInfo.acn}</p>
                )}
              </div>
            </div>
            <div className="p-4">
              {(() => {
                // Support both Base64 and external URLs (future-proof)
                const isImage = receiptImage.startsWith('data:image/') || 
                               receiptImage.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)
                const isPDF = receiptImage.startsWith('data:application/pdf') ||
                             receiptImage.match(/\.pdf(\?|$)/i) ||
                             (receiptImage.includes('drive.google.com') && receiptImage.includes('/preview'))
                
                if (isImage) {
                  return (
                    <img
                      src={receiptImage}
                      alt="Receipt"
                      className="max-w-full h-auto mx-auto"
                      onError={(e) => {
                        console.warn('[Receipt] Failed to load image in modal')
                        e.currentTarget.alt = 'Receipt image failed to load'
                      }}
                    />
                  )
                } else if (isPDF) {
                  return (
                    <iframe
                      src={receiptImage}
                      className="w-full h-[80vh] border border-gray-300 rounded"
                      title="Receipt PDF"
                    />
                  )
                } else {
                  // Fallback: try as image (supports external URLs)
                  return (
                    <img
                      src={receiptImage}
                      alt="Receipt"
                      className="max-w-full h-auto mx-auto"
                      onError={(e) => {
                        console.warn('[Receipt] Failed to load in modal:', receiptImage)
                        e.currentTarget.alt = 'Receipt failed to load'
                      }}
                    />
                  )
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


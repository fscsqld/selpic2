/**
 * IndexedDB Storage for Accounting Data
 * 
 * Persists analyzed statements and transactions locally
 */

interface StoredStatement {
  id: string
  bankName: string
  accountNumber?: string
  period: {
    startDate: string
    endDate: string
  }
  openingBalance: number
  closingBalance: number
  transactions: any[]
  uploadedAt: string
  fileName: string
}

interface ApiUsageLog {
  id: string
  timestamp: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost: number
  apiKeyType: 'system' | 'user'
}

import type { FinancialPeriod, PeriodCarryForward } from './period-types'
import { isValidPeriodId, periodIdToCalendarBounds } from '../period-management/period-utils'
import type { LeaveRecord, LeaveStatus } from './leave-types'
import type { LodgmentSnapshot } from './lodgment-snapshot-types'
import type { IndividualTaxWorksheetRecord } from './tax-worksheet-types'
import { normalizeWorksheetRecord, worksheetRecordId } from './tax-worksheet-types'
import type { PaymentSummaryEntry, PaymentSummaryTotals } from './payment-summary-types'
import {
  exportLodgmentPreferences,
  importLodgmentPreferences,
  clearLodgmentPreferences,
} from './backup-preferences'
import type { JournalEntry } from '@/src/shared/types/journal-entry'
import type {
  BankReconciliationSession,
  CustomerInvoice,
  PaymentAllocation,
  VendorBill,
} from '@/src/shared/types/subledger'
import {
  extractPayslipIdFromPayrollTx,
  isOrphanPayrollTransaction,
  isPayrollJournalTransaction,
  payslipIdsLinkedToTimesheet,
} from '@/lib/payroll/payroll-transaction-links'

const DB_NAME = 'selpic-accounting'
const DB_VERSION = 23 // Staff attendance (clock in / out)
export const BACKUP_SCHEMA_VERSION = 4
const STORE_NAME = 'statements'
const CASH_EXPENSES_STORE = 'cashExpenses'
const RECEIPTS_STORE = 'receipts'
const TRANSACTION_RECEIPTS_STORE = 'transactionReceipts' // Blob storage for transaction receipts
const BUSINESS_PROFILE_STORE = 'businessProfile'
const USAGE_LOGGING_STORE = 'usageLogging'
const API_USAGE_STORE = 'apiUsage'
const API_BALANCE_STORE = 'apiBalance'
const ASSETS_STORE = 'assets'
const AUDIT_TRAIL_STORE = 'auditTrail'
const PERIODS_STORE = 'periods' // Financial Period Management
const PERIOD_CARRY_FORWARD_STORE = 'periodCarryForward' // Period carry forward history
const INCOMING_ORDERS_STORE = 'incomingOrders' // Inbox for orders from homepage
const TIMESHEETS_STORE = 'timesheets' // Timesheet management
const EMPLOYEES_STORE = 'employees' // Employee management
const PAYSLIPS_STORE = 'payslips' // Payslip management
const LEAVE_RECORDS_STORE = 'leaveRecords' // Employee leave requests
const ATTENDANCE_STORE = 'attendanceRecords' // Staff clock in / out
const LODGMENT_SNAPSHOTS_STORE = 'lodgmentSnapshots' // ATO lodgment entry snapshots
const PAYMENT_SUMMARIES_STORE = 'paymentSummaries' // Employer PAYG payment summaries
const TAX_WORKSHEETS_STORE = 'taxWorksheets' // Rental + CGT worksheets per FY
const TRANSACTIONS_STORE = 'transactions' // Standalone transactions (e.g., payroll)
const JOURNAL_ENTRIES_STORE = 'journalEntries' // Manual and system journal entries
const CUSTOMER_INVOICES_STORE = 'customerInvoices'
const VENDOR_BILLS_STORE = 'vendorBills'
const PAYMENT_ALLOCATIONS_STORE = 'paymentAllocations'
const BANK_RECONCILIATIONS_STORE = 'bankReconciliations'

class IndexedDBStorage {
  private db: IDBDatabase | null = null

  private async assertWritableDate(date: string): Promise<void> {
    if (!date) return
    const { assertDateNotInLockedPeriod } = await import('../period-management/storage-guard')
    await assertDateNotInLockedPeriod(date)
  }

  private async assertWritableDates(dates: string[]): Promise<void> {
    for (const date of dates) {
      await this.assertWritableDate(date)
    }
  }

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[IndexedDB] Error opening database:', request.error)
        reject(request.error)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion || 0
        const newVersion = event.newVersion || DB_VERSION
        
        console.log('[IndexedDB] ========================================')
        console.log('[IndexedDB] 🔄 Database upgrade triggered!')
        console.log('[IndexedDB] Old version:', oldVersion)
        console.log('[IndexedDB] New version:', newVersion)
        console.log('[IndexedDB] Current stores:', Array.from(db.objectStoreNames))
        console.log('[IndexedDB] ========================================')
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
          objectStore.createIndex('bankName', 'bankName', { unique: false })
          console.log('[IndexedDB] Object store created')
        }
        
        // Cash Expenses store
        if (!db.objectStoreNames.contains(CASH_EXPENSES_STORE)) {
          const cashStore = db.createObjectStore(CASH_EXPENSES_STORE, { keyPath: 'id' })
          cashStore.createIndex('date', 'date', { unique: false })
          cashStore.createIndex('createdAt', 'createdAt', { unique: false })
          console.log('[IndexedDB] Cash expenses store created')
        }
        
        // Receipts store (for receipt images)
        if (!db.objectStoreNames.contains(RECEIPTS_STORE)) {
          const receiptsStore = db.createObjectStore(RECEIPTS_STORE, { keyPath: 'id' })
          receiptsStore.createIndex('cashExpenseId', 'cashExpenseId', { unique: false })
          receiptsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
          console.log('[IndexedDB] Receipts store created')
        }
        
        // Business Profile store
        if (!db.objectStoreNames.contains(BUSINESS_PROFILE_STORE)) {
          const businessProfileStore = db.createObjectStore(BUSINESS_PROFILE_STORE, { keyPath: 'id' })
          businessProfileStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          console.log('[IndexedDB] Business profile store created')
        }
        
        // Usage Logging store
        if (!db.objectStoreNames.contains(USAGE_LOGGING_STORE)) {
          const usageStore = db.createObjectStore(USAGE_LOGGING_STORE, { keyPath: 'id' })
          usageStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
          usageStore.createIndex('fileName', 'fileName', { unique: false })
          console.log('[IndexedDB] Usage logging store created')
        }
        
        // API Usage store (for tracking OpenAI API calls)
        if (!db.objectStoreNames.contains(API_USAGE_STORE)) {
          const apiUsageStore = db.createObjectStore(API_USAGE_STORE, { keyPath: 'id' })
          apiUsageStore.createIndex('timestamp', 'timestamp', { unique: false })
          apiUsageStore.createIndex('model', 'model', { unique: false })
          apiUsageStore.createIndex('apiKeyType', 'apiKeyType', { unique: false })
          console.log('[IndexedDB] API usage store created')
        }
        
        // API Balance store (for storing OpenAI balance information)
        if (!db.objectStoreNames.contains(API_BALANCE_STORE)) {
          const apiBalanceStore = db.createObjectStore(API_BALANCE_STORE, { keyPath: 'id' })
          apiBalanceStore.createIndex('apiKey', 'apiKey', { unique: true })
          apiBalanceStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          console.log('[IndexedDB] API balance store created')
        }
        
        // Assets store (for fixed assets management)
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          const assetsStore = db.createObjectStore(ASSETS_STORE, { keyPath: 'id' })
          assetsStore.createIndex('purchaseDate', 'purchaseDate', { unique: false })
          assetsStore.createIndex('category', 'category', { unique: false })
          assetsStore.createIndex('transactionId', 'transactionId', { unique: false })
          console.log('[IndexedDB] Assets store created')
        }
        
        // Audit Trail store (for transaction history tracking)
        if (!db.objectStoreNames.contains(AUDIT_TRAIL_STORE)) {
          const auditTrailStore = db.createObjectStore(AUDIT_TRAIL_STORE, { keyPath: 'id' })
          auditTrailStore.createIndex('transactionId', 'transactionId', { unique: false })
          auditTrailStore.createIndex('timestamp', 'timestamp', { unique: false })
          auditTrailStore.createIndex('action', 'action', { unique: false })
          auditTrailStore.createIndex('userId', 'userId', { unique: false })
          console.log('[IndexedDB] Audit trail store created')
        }
        
        // Transaction Receipts store (Blob storage for transaction evidence)
        if (!db.objectStoreNames.contains(TRANSACTION_RECEIPTS_STORE)) {
          const transactionReceiptsStore = db.createObjectStore(TRANSACTION_RECEIPTS_STORE, { keyPath: 'id' })
          transactionReceiptsStore.createIndex('transactionId', 'transactionId', { unique: false })
          transactionReceiptsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
          console.log('[IndexedDB] Transaction receipts store created')
        }
        
        // Periods store (Financial Period Management)
        if (!db.objectStoreNames.contains(PERIODS_STORE)) {
          const periodsStore = db.createObjectStore(PERIODS_STORE, { keyPath: 'id' })
          periodsStore.createIndex('startDate', 'startDate', { unique: false })
          periodsStore.createIndex('endDate', 'endDate', { unique: false })
          periodsStore.createIndex('isLocked', 'isLocked', { unique: false })
          periodsStore.createIndex('periodType', 'periodType', { unique: false })
          console.log('[IndexedDB] Periods store created')
        }
        
        // Period Carry Forward store (Period 이월 이력)
        if (!db.objectStoreNames.contains(PERIOD_CARRY_FORWARD_STORE)) {
          const carryForwardStore = db.createObjectStore(PERIOD_CARRY_FORWARD_STORE, { keyPath: 'id' })
          carryForwardStore.createIndex('fromPeriodId', 'fromPeriodId', { unique: false })
          carryForwardStore.createIndex('toPeriodId', 'toPeriodId', { unique: false })
          carryForwardStore.createIndex('carriedForwardAt', 'carriedForwardAt', { unique: false })
          console.log('[IndexedDB] Period carry forward store created')
        }
        
        // Incoming Orders store (Inbox for orders from homepage)
        // 버전 12 이상이거나 스토어가 없으면 생성
        if (newVersion >= 12 && !db.objectStoreNames.contains(INCOMING_ORDERS_STORE)) {
          try {
            const incomingOrdersStore = db.createObjectStore(INCOMING_ORDERS_STORE, { keyPath: 'id' })
            incomingOrdersStore.createIndex('orderId', 'orderId', { unique: true }) // 중복 체크용
            incomingOrdersStore.createIndex('receivedAt', 'receivedAt', { unique: false })
            incomingOrdersStore.createIndex('inboxStatus', 'inboxStatus', { unique: false }) // 'pending', 'approved', 'rejected'
            incomingOrdersStore.createIndex('occurredAt', 'occurredAt', { unique: false })
            console.log('[IndexedDB] ✅ Incoming orders store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating incoming orders store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(INCOMING_ORDERS_STORE)) {
          console.log('[IndexedDB] ✓ Incoming orders store already exists')
        } else {
          console.log('[IndexedDB] ⚠️ Incoming orders store not created (version check failed)')
        }
        
        // Timesheets store (for employee timesheet management)
        if (newVersion >= 13 && !db.objectStoreNames.contains(TIMESHEETS_STORE)) {
          try {
            const timesheetsStore = db.createObjectStore(TIMESHEETS_STORE, { keyPath: 'id' })
            timesheetsStore.createIndex('employeeId', 'employeeId', { unique: false })
            timesheetsStore.createIndex('status', 'status', { unique: false })
            timesheetsStore.createIndex('payPeriodStart', 'payPeriod.start', { unique: false })
            timesheetsStore.createIndex('payPeriodEnd', 'payPeriod.end', { unique: false })
            timesheetsStore.createIndex('submittedAt', 'submittedAt', { unique: false })
            timesheetsStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Timesheets store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating timesheets store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(TIMESHEETS_STORE)) {
          console.log('[IndexedDB] ✓ Timesheets store already exists')
        }
        
        // Employees store (for employee information management)
        if (!db.objectStoreNames.contains(EMPLOYEES_STORE)) {
          try {
            console.log('[IndexedDB] 🔨 Creating employees store...')
            const employeesStore = db.createObjectStore(EMPLOYEES_STORE, { keyPath: 'id' })
            employeesStore.createIndex('employeeId', 'employeeId', { unique: true }) // 로그인 ID는 고유해야 함
            employeesStore.createIndex('email', 'email', { unique: false })
            employeesStore.createIndex('isActive', 'isActive', { unique: false })
            employeesStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Employees store created successfully!')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating employees store:', error)
            throw error
          }
        } else {
          console.log('[IndexedDB] ✓ Employees store already exists')
        }

        // Payslips store (for payslip management)
        if (newVersion >= 16 && !db.objectStoreNames.contains(PAYSLIPS_STORE)) {
          try {
            const payslipsStore = db.createObjectStore(PAYSLIPS_STORE, { keyPath: 'id' })
            payslipsStore.createIndex('employeeId', 'employeeId', { unique: false })
            payslipsStore.createIndex('payDate', 'payDate', { unique: false })
            payslipsStore.createIndex('status', 'status', { unique: false })
            payslipsStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Payslips store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating payslips store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(PAYSLIPS_STORE)) {
          console.log('[IndexedDB] ✓ Payslips store already exists')
        }

        // Transactions store (for standalone transactions like payroll)
        if (newVersion >= 16 && !db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          try {
            const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' })
            transactionsStore.createIndex('date', 'date', { unique: false })
            transactionsStore.createIndex('source', 'source', { unique: false })
            transactionsStore.createIndex('isPayrollTransaction', 'isPayrollTransaction', { unique: false })
            transactionsStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Transactions store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating transactions store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          console.log('[IndexedDB] ✓ Transactions store already exists')
        }

        // Leave records store (employee leave management)
        if (newVersion >= 17 && !db.objectStoreNames.contains(LEAVE_RECORDS_STORE)) {
          try {
            const leaveStore = db.createObjectStore(LEAVE_RECORDS_STORE, { keyPath: 'id' })
            leaveStore.createIndex('employeeId', 'employeeId', { unique: false })
            leaveStore.createIndex('status', 'status', { unique: false })
            leaveStore.createIndex('startDate', 'startDate', { unique: false })
            leaveStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Leave records store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating leave records store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(LEAVE_RECORDS_STORE)) {
          console.log('[IndexedDB] ✓ Leave records store already exists')
        }

        // ATO lodgment snapshots (finalize / copy sheet history)
        if (newVersion >= 18 && !db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
          try {
            const snapStore = db.createObjectStore(LODGMENT_SNAPSHOTS_STORE, { keyPath: 'id' })
            snapStore.createIndex('kind', 'kind', { unique: false })
            snapStore.createIndex('periodKey', 'periodKey', { unique: false })
            snapStore.createIndex('createdAt', 'createdAt', { unique: false })
            snapStore.createIndex('finalizedAt', 'finalizedAt', { unique: false })
            console.log('[IndexedDB] ✅ Lodgment snapshots store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating lodgment snapshots store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
          console.log('[IndexedDB] ✓ Lodgment snapshots store already exists')
        }

        if (newVersion >= 19 && !db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
          try {
            const journalStore = db.createObjectStore(JOURNAL_ENTRIES_STORE, { keyPath: 'id' })
            journalStore.createIndex('date', 'date', { unique: false })
            journalStore.createIndex('status', 'status', { unique: false })
            journalStore.createIndex('source', 'source', { unique: false })
            journalStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Journal entries store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating journal entries store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
          console.log('[IndexedDB] ✓ Journal entries store already exists')
        }

        if (!db.objectStoreNames.contains(CUSTOMER_INVOICES_STORE)) {
          const invoiceStore = db.createObjectStore(CUSTOMER_INVOICES_STORE, { keyPath: 'id' })
          invoiceStore.createIndex('issueDate', 'issueDate', { unique: false })
          invoiceStore.createIndex('dueDate', 'dueDate', { unique: false })
          invoiceStore.createIndex('status', 'status', { unique: false })
          invoiceStore.createIndex('customerName', 'customerName', { unique: false })
          console.log('[IndexedDB] ✅ Customer invoices store created')
        }

        if (!db.objectStoreNames.contains(VENDOR_BILLS_STORE)) {
          const billStore = db.createObjectStore(VENDOR_BILLS_STORE, { keyPath: 'id' })
          billStore.createIndex('issueDate', 'issueDate', { unique: false })
          billStore.createIndex('dueDate', 'dueDate', { unique: false })
          billStore.createIndex('status', 'status', { unique: false })
          billStore.createIndex('vendorName', 'vendorName', { unique: false })
          console.log('[IndexedDB] ✅ Vendor bills store created')
        }

        if (!db.objectStoreNames.contains(PAYMENT_ALLOCATIONS_STORE)) {
          const allocStore = db.createObjectStore(PAYMENT_ALLOCATIONS_STORE, { keyPath: 'id' })
          allocStore.createIndex('documentId', 'documentId', { unique: false })
          allocStore.createIndex('transactionId', 'transactionId', { unique: false })
          allocStore.createIndex('type', 'type', { unique: false })
          allocStore.createIndex('paymentDate', 'paymentDate', { unique: false })
          console.log('[IndexedDB] ✅ Payment allocations store created')
        }

        if (!db.objectStoreNames.contains(BANK_RECONCILIATIONS_STORE)) {
          const reconStore = db.createObjectStore(BANK_RECONCILIATIONS_STORE, { keyPath: 'id' })
          reconStore.createIndex('periodId', 'periodId', { unique: true })
          reconStore.createIndex('status', 'status', { unique: false })
          reconStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          console.log('[IndexedDB] ✅ Bank reconciliations store created')
        }

        if (newVersion >= 21 && !db.objectStoreNames.contains(PAYMENT_SUMMARIES_STORE)) {
          const psStore = db.createObjectStore(PAYMENT_SUMMARIES_STORE, { keyPath: 'id' })
          psStore.createIndex('financialYear', 'financialYear', { unique: false })
          psStore.createIndex('employerName', 'employerName', { unique: false })
          psStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          console.log('[IndexedDB] ✅ Payment summaries store created')
        } else if (db.objectStoreNames.contains(PAYMENT_SUMMARIES_STORE)) {
          console.log('[IndexedDB] ✓ Payment summaries store already exists')
        }

        if (newVersion >= 22 && !db.objectStoreNames.contains(TAX_WORKSHEETS_STORE)) {
          const wsStore = db.createObjectStore(TAX_WORKSHEETS_STORE, { keyPath: 'id' })
          wsStore.createIndex('financialYear', 'financialYear', { unique: true })
          wsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          console.log('[IndexedDB] ✅ Tax worksheets store created')
        } else if (db.objectStoreNames.contains(TAX_WORKSHEETS_STORE)) {
          console.log('[IndexedDB] ✓ Tax worksheets store already exists')
        }

        if (newVersion >= 23 && !db.objectStoreNames.contains(ATTENDANCE_STORE)) {
          try {
            const attendanceStore = db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id' })
            attendanceStore.createIndex('employeeId', 'employeeId', { unique: false })
            attendanceStore.createIndex('clockInAt', 'clockInAt', { unique: false })
            attendanceStore.createIndex('createdAt', 'createdAt', { unique: false })
            console.log('[IndexedDB] ✅ Attendance store created successfully')
          } catch (error) {
            console.error('[IndexedDB] ❌ Error creating attendance store:', error)
            throw error
          }
        } else if (db.objectStoreNames.contains(ATTENDANCE_STORE)) {
          console.log('[IndexedDB] ✓ Attendance store already exists')
        }
        
        console.log('[IndexedDB] ========================================')
        console.log('[IndexedDB] ✅ Upgrade completed. All stores:', Array.from(db.objectStoreNames))
        console.log('[IndexedDB] ========================================')
      }
      
      request.onsuccess = () => {
        this.db = request.result
        
        // 초기화 시 모든 필수 스토어 존재 확인
        if (this.db) {
          const existingStores = Array.from(this.db.objectStoreNames)
          const requiredStores = [
            STORE_NAME,
            CASH_EXPENSES_STORE,
            RECEIPTS_STORE,
            TRANSACTION_RECEIPTS_STORE,
            BUSINESS_PROFILE_STORE,
            USAGE_LOGGING_STORE,
            API_USAGE_STORE,
            API_BALANCE_STORE,
            ASSETS_STORE,
            AUDIT_TRAIL_STORE,
            PERIODS_STORE,
            PERIOD_CARRY_FORWARD_STORE,
            INCOMING_ORDERS_STORE,
            TIMESHEETS_STORE,
            EMPLOYEES_STORE,
            LEAVE_RECORDS_STORE,
            ATTENDANCE_STORE,
            LODGMENT_SNAPSHOTS_STORE,
            PAYMENT_SUMMARIES_STORE,
            TAX_WORKSHEETS_STORE,
            JOURNAL_ENTRIES_STORE,
            CUSTOMER_INVOICES_STORE,
            VENDOR_BILLS_STORE,
            PAYMENT_ALLOCATIONS_STORE,
            BANK_RECONCILIATIONS_STORE,
          ]
          
          console.log('[IndexedDB] ========================================')
          console.log('[IndexedDB] Database initialization complete')
          console.log('[IndexedDB] Database version:', this.db.version)
          console.log('[IndexedDB] Existing stores:', existingStores)
          console.log('[IndexedDB] Required stores:', requiredStores)
          
          // 각 스토어 존재 여부 확인
          const missingStores: string[] = []
          requiredStores.forEach(storeName => {
            if (existingStores.includes(storeName)) {
              console.log(`[IndexedDB] ✓ ${storeName}: EXISTS`)
            } else {
              console.error(`[IndexedDB] ❌ ${storeName}: MISSING`)
              missingStores.push(storeName)
            }
          })
          
          if (missingStores.length > 0) {
            console.error('[IndexedDB] ⚠️ Missing stores detected:', missingStores)
            console.error('[IndexedDB] ⚠️ Current DB version:', this.db.version)
            console.error('[IndexedDB] ⚠️ Expected DB version:', DB_VERSION)
            if (this.db.version < DB_VERSION) {
              console.error('[IndexedDB] ⚠️ Database version is outdated!')
              console.error('[IndexedDB] ⚠️ SOLUTION 1: Close ALL browser tabs and refresh')
              console.error('[IndexedDB] ⚠️ SOLUTION 2: Run in console: indexedDB.deleteDatabase("selpic-accounting")')
              console.error('[IndexedDB] ⚠️ Then refresh the page')
            } else {
              console.error('[IndexedDB] ⚠️ Please refresh the page to trigger database upgrade')
            }
          } else {
            console.log('[IndexedDB] ✅ All required stores are present')
          }
          console.log('[IndexedDB] ========================================')
        }
        
        console.log('[IndexedDB] Database opened successfully')
        resolve()
      }
    })
  }

  /**
   * Save statement to IndexedDB
   */
  async saveStatement(statement: Omit<StoredStatement, 'id' | 'uploadedAt'>): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    // Validate transactions array
    if (!statement.transactions || !Array.isArray(statement.transactions)) {
      console.warn('[IndexedDB] Warning: Statement has no transactions array:', statement)
      statement.transactions = []
    }

    await this.assertWritableDates(
      statement.transactions.map((tx: { date?: string }) => tx.date).filter(Boolean) as string[]
    )

    const id = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storedStatement: StoredStatement = {
      ...statement,
      id,
      uploadedAt: new Date().toISOString(),
      transactions: statement.transactions || [], // Ensure transactions array exists
    }

    console.log('[IndexedDB] Saving statement:', {
      id,
      fileName: storedStatement.fileName,
      transactionCount: storedStatement.transactions.length,
      bankName: storedStatement.bankName
    })

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.add(storedStatement)

      request.onsuccess = () => {
        console.log('[IndexedDB] Statement saved successfully:', {
          id,
          transactionCount: storedStatement.transactions.length
        })
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving statement:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all statements
   */
  async getAllStatements(): Promise<StoredStatement[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const statements = request.result.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )
        console.log('[IndexedDB] Retrieved', statements.length, 'statements')
        resolve(statements)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving statements:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get statement by ID
   */
  async getStatement(id: string): Promise<StoredStatement | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result as StoredStatement | null
        if (result) {
          console.log('[IndexedDB] Retrieved statement:', {
            id: result.id,
            fileName: result.fileName,
            transactionCount: result.transactions?.length || 0,
            hasTransactions: !!result.transactions && Array.isArray(result.transactions)
          })
          
          // Ensure transactions array exists
          if (!result.transactions || !Array.isArray(result.transactions)) {
            console.warn('[IndexedDB] Statement has no transactions array, setting empty array:', result)
            result.transactions = []
          }
        }
        resolve(result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving statement:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Update statement
   */
  async updateStatement(id: string, updates: Partial<StoredStatement>): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const existing = await this.getStatement(id)
    if (!existing) {
      throw new Error('Statement not found')
    }

    const mergedTransactions = updates.transactions ?? existing.transactions ?? []
    await this.assertWritableDates(
      mergedTransactions.map((tx: { date?: string }) => tx.date).filter(Boolean) as string[]
    )

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const existing = getRequest.result
        if (!existing) {
          reject(new Error('Statement not found'))
          return
        }

        const updated = { ...existing, ...updates }
        const putRequest = store.put(updated)

        putRequest.onsuccess = () => {
          console.log('[IndexedDB] Statement updated:', id)
          resolve()
        }

        putRequest.onerror = () => {
          console.error('[IndexedDB] Error updating statement:', putRequest.error)
          reject(putRequest.error)
        }
      }

      getRequest.onerror = () => {
        console.error('[IndexedDB] Error getting statement:', getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * Delete statement
   */
  async deleteStatement(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Statement deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting statement:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete all statements
   */
  async deleteAllStatements(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[IndexedDB] All statements deleted')
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting all statements:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get storage size estimate (approximate)
   */
  async getStorageSize(): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    try {
      const statements = await this.getAllStatements()
      // Rough estimate: JSON stringify size
      const size = JSON.stringify(statements).length
      return size
    } catch (err) {
      console.error('[IndexedDB] Error calculating storage size:', err)
      return 0
    }
  }

  /**
   * Keep only the most recent N statements
   */
  async keepRecentStatements(count: number = 20): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    try {
      const statements = await this.getAllStatements()
      if (statements.length <= count) {
        return // No cleanup needed
      }

      // Keep only the most recent ones (already sorted by uploadedAt desc)
      const toDelete = statements.slice(count)
      
      for (const stmt of toDelete) {
        await this.deleteStatement(stmt.id)
      }

      console.log(`[IndexedDB] Cleaned up ${toDelete.length} old statements, kept ${count} most recent`)
    } catch (err) {
      console.error('[IndexedDB] Error cleaning up old statements:', err)
      throw err
    }
  }

  /**
   * Save cash expense to IndexedDB
   */
  async saveCashExpense(cashExpense: {
    date: string
    amount: number
    merchant: string
    category: string
    receiptImageId?: string
    department?: string
    description?: string
    paidBy?: 'company' | 'director'
    fundedByDirector?: boolean
    gstInfo?: {
      isGSTIncluded?: boolean
      gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
      gstAmount?: number
      netAmount?: number
      confidence?: number
      reasoning?: string
    }
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    await this.assertWritableDate(cashExpense.date)

    const id = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storedCashExpense = {
      ...cashExpense,
      id,
      createdAt: new Date().toISOString(),
      source: 'manual' as const,
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CASH_EXPENSES_STORE], 'readwrite')
      const store = transaction.objectStore(CASH_EXPENSES_STORE)
      const request = store.add(storedCashExpense)

      request.onsuccess = () => {
        console.log('[IndexedDB] Cash expense saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving cash expense:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Update an existing cash expense (category, GST claim flag, date, amount, etc.)
   */
  async updateCashExpense(
    id: string,
    updates: Partial<{
      date: string
      amount: number
      merchant: string
      category: string
      receiptImageId?: string
      department?: string
      description?: string
      gstInfo?: {
        isGSTIncluded?: boolean
        gstType?: 'INCLUDED' | 'EXCLUDED' | 'FREE'
        gstAmount?: number
        netAmount?: number
        confidence?: number
        reasoning?: string
      }
    }>
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    if (updates.date) {
      await this.assertWritableDate(updates.date)
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CASH_EXPENSES_STORE], 'readwrite')
      const store = transaction.objectStore(CASH_EXPENSES_STORE)
      const getReq = store.get(id)

      getReq.onsuccess = () => {
        const existing = getReq.result
        if (!existing) {
          reject(new Error(`Cash expense not found: ${id}`))
          return
        }
        const next = { ...existing, ...updates, updatedAt: new Date().toISOString() }
        const putReq = store.put(next)
        putReq.onsuccess = () => resolve()
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  /**
   * Get all cash expenses
   */
  async getAllCashExpenses(): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CASH_EXPENSES_STORE], 'readonly')
      const store = transaction.objectStore(CASH_EXPENSES_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const expenses = request.result.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        console.log('[IndexedDB] Retrieved', expenses.length, 'cash expenses')
        resolve(expenses)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving cash expenses:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save receipt image to IndexedDB
   */
  async saveReceiptImage(receipt: {
    cashExpenseId: string
    imageData: string // Base64 encoded image
    fileName: string
    fileType: string
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    const id = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storedReceipt = {
      ...receipt,
      id,
      uploadedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([RECEIPTS_STORE], 'readwrite')
      const store = transaction.objectStore(RECEIPTS_STORE)
      const request = store.add(storedReceipt)

      request.onsuccess = () => {
        console.log('[IndexedDB] Receipt image saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving receipt image:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save a receipt file linked to a bank transaction (evidence blob).
   */
  async saveTransactionReceipt(transactionId: string, file: File): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
      reader.readAsDataURL(file)
    })

    const id = `tx_receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storedReceipt = {
      id,
      transactionId,
      imageData,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([TRANSACTION_RECEIPTS_STORE], 'readwrite')
      const store = transaction.objectStore(TRANSACTION_RECEIPTS_STORE)
      const request = store.add(storedReceipt)

      request.onsuccess = () => {
        console.log('[IndexedDB] Transaction receipt saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving transaction receipt:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get receipt image by ID
   */
  async getReceiptImage(receiptId: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([RECEIPTS_STORE], 'readonly')
      const store = transaction.objectStore(RECEIPTS_STORE)
      const request = store.get(receiptId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving receipt image:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get receipt image by cash expense ID
   */
  async getReceiptByCashExpenseId(cashExpenseId: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([RECEIPTS_STORE], 'readonly')
      const store = transaction.objectStore(RECEIPTS_STORE)
      const index = store.index('cashExpenseId')
      const request = index.get(cashExpenseId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving receipt by cash expense ID:', request.error)
        reject(request.error)
      }
    })
  }

  async getCashExpense(id: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CASH_EXPENSES_STORE], 'readonly')
      const store = transaction.objectStore(CASH_EXPENSES_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting cash expense:', request.error)
        reject(request.error)
      }
    })
  }

  async deleteReceiptImage(receiptId: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([RECEIPTS_STORE], 'readwrite')
      const store = transaction.objectStore(RECEIPTS_STORE)
      const request = store.delete(receiptId)

      request.onsuccess = () => {
        console.log('[IndexedDB] Receipt image deleted:', receiptId)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting receipt image:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete cash expense (+ linked OCR receipt when present).
   * Re-reads after delete — IDB delete() succeeds even when the key was missing.
   */
  async deleteCashExpense(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new Error('Cash expense id required')
    }

    const existing = await this.getCashExpense(id)
    if (!existing) {
      throw new Error(`Cash expense not found: ${id}`)
    }

    const receiptIds = new Set<string>()
    if (typeof existing.receiptImageId === 'string' && existing.receiptImageId) {
      receiptIds.add(existing.receiptImageId)
    }
    try {
      const linked = await this.getReceiptByCashExpenseId(id)
      if (linked?.id) receiptIds.add(String(linked.id))
    } catch (err) {
      console.warn('[IndexedDB] Could not look up receipt by cash expense id:', err)
    }

    for (const receiptId of receiptIds) {
      try {
        if (receiptId.startsWith('receipt_')) {
          await this.deleteReceiptImage(receiptId)
        } else {
          await this.deleteTransactionReceipt(receiptId)
        }
      } catch (err) {
        console.warn('[IndexedDB] Receipt cleanup failed (continuing):', receiptId, err)
      }
    }

    if (!this.db) {
      await this.init()
    }

    await new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([CASH_EXPENSES_STORE], 'readwrite')
      const store = transaction.objectStore(CASH_EXPENSES_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Cash expense deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting cash expense:', request.error)
        reject(request.error)
      }
    })

    const stillThere = await this.getCashExpense(id)
    if (stillThere) {
      throw new Error(`Cash expense delete failed: ${id} still present`)
    }
  }

  async deleteAllCashExpenses(): Promise<void> {
    const expenses = await this.getAllCashExpenses()
    await Promise.all(expenses.map((expense: any) => this.deleteCashExpense(expense.id)))
  }

  /**
   * Save business profile
   */
  async saveBusinessProfile(profile: {
    individualName?: string
    companyName?: string
    abn?: string
    acn?: string
    accountType?: 'individual' | 'company' | 'sole_trader'
    gstReportingCycle?: 'Monthly' | 'Quarterly'
    paygReportingCycle?: 'Monthly' | 'Quarterly'
    gstRegistered?: boolean
    fbtRegistered?: boolean
    companyTaxRate?: number
    smallBusinessEntity?: boolean
    openingDirectorLoanBalance?: number
    openingCapital?: number
    openingRetainedEarnings?: number
    openingCashBalance?: number
    accountingBasis?: 'cash' | 'accrual'
    autoPostArApJournals?: boolean
    address?: string
  }): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const profileData = {
      id: 'business_profile', // Single profile record
      ...profile,
      updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([BUSINESS_PROFILE_STORE], 'readwrite')
      const store = transaction.objectStore(BUSINESS_PROFILE_STORE)
      const request = store.put(profileData)

      request.onsuccess = () => {
        console.log('[IndexedDB] Business profile saved')
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving business profile:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(): Promise<{
    individualName?: string
    companyName?: string
    abn?: string
    acn?: string
    accountType?: 'individual' | 'company' | 'sole_trader'
    gstReportingCycle?: 'Monthly' | 'Quarterly'
    paygReportingCycle?: 'Monthly' | 'Quarterly'
    gstRegistered?: boolean
    fbtRegistered?: boolean
    companyTaxRate?: number
    smallBusinessEntity?: boolean
    openingDirectorLoanBalance?: number
    openingCapital?: number
    openingRetainedEarnings?: number
    openingCashBalance?: number
    accountingBasis?: 'cash' | 'accrual'
    autoPostArApJournals?: boolean
    address?: string
  } | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([BUSINESS_PROFILE_STORE], 'readonly')
      const store = transaction.objectStore(BUSINESS_PROFILE_STORE)
      const request = store.get('business_profile')

      request.onsuccess = () => {
        const profile = request.result
        if (profile) {
          // Remove internal fields
          const { id, updatedAt, ...profileData } = profile
          resolve(profileData)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving business profile:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all receipts
   */
  async getAllReceipts(): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([RECEIPTS_STORE], 'readonly')
      const store = transaction.objectStore(RECEIPTS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving receipts:', request.error)
        reject(request.error)
      }
    })
  }

  async getTransactionReceipt(receiptId: string): Promise<{ id: string; transactionId: string; blob: Blob; fileName: string; fileType: string; uploadedAt: string } | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([TRANSACTION_RECEIPTS_STORE], 'readonly')
      const store = transaction.objectStore(TRANSACTION_RECEIPTS_STORE)
      const request = store.get(receiptId)

      request.onsuccess = async () => {
        const receipt = request.result
        if (!receipt) {
          resolve(null)
          return
        }

        try {
          const response = await fetch(receipt.imageData)
          const blob = await response.blob()
          resolve({ ...receipt, blob })
        } catch (error) {
          reject(error)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }

  async getTransactionReceiptByTransactionId(transactionId: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([TRANSACTION_RECEIPTS_STORE], 'readonly')
      const store = transaction.objectStore(TRANSACTION_RECEIPTS_STORE)
      const index = store.index('transactionId')
      const request = index.get(transactionId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTransactionReceipt(receiptId: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([TRANSACTION_RECEIPTS_STORE], 'readwrite')
      const store = transaction.objectStore(TRANSACTION_RECEIPTS_STORE)
      const request = store.delete(receiptId)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Export all data to JSON (schema v2)
   */
  async exportAllData(): Promise<{
    schemaVersion: number
    statements: any[]
    cashExpenses: any[]
    receipts: any[]
    transactions: any[]
    journalEntries: any[]
    customerInvoices: CustomerInvoice[]
    vendorBills: VendorBill[]
    paymentAllocations: PaymentAllocation[]
    bankReconciliations: BankReconciliationSession[]
    periods: any[]
    periodCarryForward: any[]
    assets: any[]
    auditTrail: any[]
    employees: any[]
    payslips: any[]
    timesheets: any[]
    leaveRecords: LeaveRecord[]
    lodgmentSnapshots: LodgmentSnapshot[]
    paymentSummaries: PaymentSummaryEntry[]
    taxWorksheets: IndividualTaxWorksheetRecord[]
    lodgmentPreferences: Record<string, string>
    businessProfile: any | null
    userMappings: any[]
    paygConfig: any
    directorName: string | null
    apiKey: string | null
    openingDirectorLoanBalance: number | null
    exportDate: string
  }> {
    if (!this.db) {
      await this.init()
    }

    try {
      const [
        statements,
        cashExpenses,
        receipts,
        transactions,
        journalEntries,
        customerInvoices,
        vendorBills,
        paymentAllocations,
        bankReconciliations,
        periods,
        periodCarryForward,
        assets,
        auditTrail,
        employees,
        payslips,
        timesheets,
        leaveRecords,
        lodgmentSnapshots,
        paymentSummaries,
        taxWorksheets,
        businessProfile,
      ] = await Promise.all([
        this.getAllStatements(),
        this.getAllCashExpenses(),
        this.getAllReceipts(),
        this.getAllTransactions(),
        this.getAllJournalEntries(),
        this.getAllCustomerInvoices(),
        this.getAllVendorBills(),
        this.getAllPaymentAllocations(),
        this.getAllBankReconciliations(),
        this.getAllPeriods(),
        this.getCarryForwardHistory(),
        this.getAllAssets(),
        this.getAllAuditTrails(),
        this.getAllEmployees(),
        this.getAllPayslips(),
        this.getAllTimesheets(),
        this.getAllLeaveRecords(),
        this.getLodgmentSnapshots(),
        this.getPaymentSummaries(),
        this.getAllTaxWorksheets(),
        this.getBusinessProfile(),
      ])

      const userMappings =
        typeof window !== 'undefined'
          ? JSON.parse(
              localStorage.getItem('selpic_user_mappings') ||
                localStorage.getItem('user_mappings') ||
                '[]'
            )
          : []

      const paygConfig =
        typeof window !== 'undefined'
          ? JSON.parse(
              localStorage.getItem('selpic_payg_config') ||
                localStorage.getItem('payg_config') ||
                'null'
            )
          : null

      const directorName =
        typeof window !== 'undefined' ? localStorage.getItem('director_name') : null

      const openingDirectorLoanBalance =
        typeof window !== 'undefined'
          ? (() => {
              const raw = localStorage.getItem('opening_director_loan_balance')
              return raw ? Number(raw) : null
            })()
          : null

      return {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        statements,
        cashExpenses,
        receipts,
        transactions,
        journalEntries,
        customerInvoices,
        vendorBills,
        paymentAllocations,
        bankReconciliations,
        periods,
        periodCarryForward,
        assets,
        auditTrail,
        employees,
        payslips,
        timesheets,
        leaveRecords,
        lodgmentSnapshots,
        paymentSummaries,
        taxWorksheets,
        lodgmentPreferences: exportLodgmentPreferences(),
        businessProfile,
        userMappings,
        paygConfig,
        directorName,
        apiKey: null,
        openingDirectorLoanBalance,
        exportDate: new Date().toISOString(),
      }
    } catch (err) {
      console.error('[IndexedDB] Error exporting data:', err)
      throw err
    }
  }

  /**
   * Clear accounting ledger stores before a full restore or Settings wipe.
   * Keeps business profile + API usage/balance (credentials stay in localStorage).
   */
  async clearAllForRestoreImport(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    await this.deleteAllStatements()
    await this.deleteAllCashExpenses()
    await this.clearStore(TRANSACTIONS_STORE)
    await this.clearStore(JOURNAL_ENTRIES_STORE)
    await this.clearStore(CUSTOMER_INVOICES_STORE)
    await this.clearStore(VENDOR_BILLS_STORE)
    await this.clearStore(PAYMENT_ALLOCATIONS_STORE)
    await this.clearStore(BANK_RECONCILIATIONS_STORE)
    await this.clearStore(PERIODS_STORE)
    await this.clearStore(PERIOD_CARRY_FORWARD_STORE)
    await this.clearStore(ASSETS_STORE)
    await this.clearStore(AUDIT_TRAIL_STORE)
    await this.clearStore(EMPLOYEES_STORE)
    await this.clearStore(PAYSLIPS_STORE)
    await this.clearStore(TIMESHEETS_STORE)
    await this.clearStore(LEAVE_RECORDS_STORE)
    await this.clearStore(ATTENDANCE_STORE)
    await this.clearStore(LODGMENT_SNAPSHOTS_STORE)
    await this.clearStore(PAYMENT_SUMMARIES_STORE)
    await this.clearStore(TAX_WORKSHEETS_STORE)
    await this.clearStore(RECEIPTS_STORE)
    await this.clearStore(TRANSACTION_RECEIPTS_STORE)
    await this.clearStore(INCOMING_ORDERS_STORE)

    const { invalidatePeriodLockCache } = await import('../period-management/storage-guard')
    invalidatePeriodLockCache()
    const { clearBrowserLedgerCaches } = await import('./backup-preferences')
    clearBrowserLedgerCaches()
  }

  /**
   * Full ledger wipe used by Settings → Data Management.
   * Same scope as restore-import wipe (IndexedDB + browser ledger caches).
   */
  async wipeAllAccountingData(): Promise<void> {
    await this.clearAllForRestoreImport()
  }

  /**
   * Full factory reset (PIN / System Reset): ledger wipe + profile + API usage stores.
   */
  async factoryResetAllData(): Promise<void> {
    await this.wipeAllAccountingData()
    await this.clearStore(BUSINESS_PROFILE_STORE)
    await this.clearStore(USAGE_LOGGING_STORE)
    await this.clearStore(API_USAGE_STORE)
    await this.clearStore(API_BALANCE_STORE)
  }

  private async clearStore(storeName: string): Promise<void> {
    if (!this.db?.objectStoreNames.contains(storeName)) return

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Import all data from JSON
   */
  async importAllData(
    data: {
      schemaVersion?: number
      statements?: any[]
      cashExpenses?: any[]
      receipts?: any[]
      leaveRecords?: LeaveRecord[]
      lodgmentSnapshots?: LodgmentSnapshot[]
      paymentSummaries?: PaymentSummaryEntry[]
      taxWorksheets?: IndividualTaxWorksheetRecord[]
      lodgmentPreferences?: Record<string, string>
      transactionReceipts?: any[]
      businessProfile?: any
      userMappings?: any[]
      paygConfig?: any
      directorName?: string | null
      transactions?: any[]
      journalEntries?: any[]
      customerInvoices?: CustomerInvoice[]
      vendorBills?: VendorBill[]
      paymentAllocations?: PaymentAllocation[]
      bankReconciliations?: BankReconciliationSession[]
      periods?: any[]
      periodCarryForward?: any[]
      assets?: any[]
      auditTrail?: any[]
      employees?: any[]
      payslips?: any[]
      timesheets?: any[]
      openingDirectorLoanBalance?: number | null
    },
    options: { replaceExisting?: boolean } = {}
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const { replaceExisting = false } = options

    try {
      if (replaceExisting) {
        await this.clearAllForRestoreImport()
      }

      if (data.statements && Array.isArray(data.statements)) {
        let importedStatements = 0
        const statementErrors: string[] = []
        for (const statement of data.statements) {
          try {
            const { id, uploadedAt, ...statementData } = statement
            await this.saveStatementPreservingId({ ...statementData, id, uploadedAt })
            importedStatements += 1
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            console.warn('[IndexedDB] Failed to import statement:', err)
            statementErrors.push(`${statement?.fileName || statement?.id || 'statement'}: ${msg}`)
          }
        }
        // Wipe already ran — surface failure so UI does not look like a successful empty restore
        if (data.statements.length > 0 && importedStatements === 0) {
          throw new Error(
            `Restore wiped the ledger but saved 0 of ${data.statements.length} statement(s). ${statementErrors.join('; ')}`
          )
        }
        if (statementErrors.length > 0) {
          console.warn(
            `[IndexedDB] Partial statement restore: ${importedStatements}/${data.statements.length}`,
            statementErrors
          )
        }
      }

      if (data.cashExpenses && Array.isArray(data.cashExpenses)) {
        for (const expense of data.cashExpenses) {
          try {
            await this.putRecord(CASH_EXPENSES_STORE, expense)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import cash expense:', err)
          }
        }
      }

      if (data.receipts && Array.isArray(data.receipts)) {
        for (const receipt of data.receipts) {
          try {
            await this.putRecord(RECEIPTS_STORE, receipt)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import receipt:', err)
          }
        }
      }

      if (data.transactions && Array.isArray(data.transactions)) {
        for (const tx of data.transactions) {
          try {
            await this.putRecord(TRANSACTIONS_STORE, tx)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import transaction:', err)
          }
        }
      }

      if (data.journalEntries && Array.isArray(data.journalEntries)) {
        for (const entry of data.journalEntries) {
          try {
            await this.putRecord(JOURNAL_ENTRIES_STORE, entry)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import journal entry:', err)
          }
        }
      }

      if (data.customerInvoices && Array.isArray(data.customerInvoices)) {
        for (const invoice of data.customerInvoices) {
          try {
            await this.putRecord(CUSTOMER_INVOICES_STORE, invoice)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import customer invoice:', err)
          }
        }
      }

      if (data.vendorBills && Array.isArray(data.vendorBills)) {
        for (const bill of data.vendorBills) {
          try {
            await this.putRecord(VENDOR_BILLS_STORE, bill)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import vendor bill:', err)
          }
        }
      }

      if (data.paymentAllocations && Array.isArray(data.paymentAllocations)) {
        for (const allocation of data.paymentAllocations) {
          try {
            await this.putRecord(PAYMENT_ALLOCATIONS_STORE, allocation)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import payment allocation:', err)
          }
        }
      }

      if (data.bankReconciliations && Array.isArray(data.bankReconciliations)) {
        for (const session of data.bankReconciliations) {
          try {
            await this.putRecord(BANK_RECONCILIATIONS_STORE, session)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import bank reconciliation:', err)
          }
        }
      }

      if (data.periods && Array.isArray(data.periods)) {
        for (const period of data.periods) {
          try {
            await this.putRecord(PERIODS_STORE, period)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import period:', err)
          }
        }
      }

      if (data.periodCarryForward && Array.isArray(data.periodCarryForward)) {
        for (const record of data.periodCarryForward) {
          try {
            await this.putRecord(PERIOD_CARRY_FORWARD_STORE, record)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import period carry-forward:', err)
          }
        }
      }

      if (data.assets && Array.isArray(data.assets)) {
        for (const asset of data.assets) {
          try {
            await this.putRecord(ASSETS_STORE, asset)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import asset:', err)
          }
        }
      }

      if (data.auditTrail && Array.isArray(data.auditTrail)) {
        for (const record of data.auditTrail) {
          try {
            await this.putRecord(AUDIT_TRAIL_STORE, record)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import audit record:', err)
          }
        }
      }

      if (data.employees && Array.isArray(data.employees)) {
        for (const employee of data.employees) {
          try {
            await this.saveEmployee(employee)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import employee:', err)
          }
        }
      }

      if (data.payslips && Array.isArray(data.payslips)) {
        for (const payslip of data.payslips) {
          try {
            await this.savePayslip(payslip)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import payslip:', err)
          }
        }
      }

      if (data.timesheets && Array.isArray(data.timesheets)) {
        for (const timesheet of data.timesheets) {
          try {
            await this.saveTimesheet(timesheet)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import timesheet:', err)
          }
        }
      }

      if (data.leaveRecords && Array.isArray(data.leaveRecords)) {
        for (const leave of data.leaveRecords) {
          try {
            const { id, createdAt, updatedAt, approvedAt, approvedBy, ...rest } = leave
            await this.saveLeaveRecord({
              ...rest,
              id,
              createdAt,
              updatedAt,
              ...(approvedAt ? { approvedAt } : {}),
              ...(approvedBy ? { approvedBy } : {}),
            })
          } catch (err) {
            console.warn('[IndexedDB] Failed to import leave record:', err)
          }
        }
      }

      if (data.lodgmentSnapshots && Array.isArray(data.lodgmentSnapshots)) {
        for (const snapshot of data.lodgmentSnapshots) {
          try {
            const { id, createdAt, updatedAt, ...rest } = snapshot
            await this.saveLodgmentSnapshot({
              ...rest,
              id,
              createdAt,
              updatedAt,
            })
          } catch (err) {
            console.warn('[IndexedDB] Failed to import lodgment snapshot:', err)
          }
        }
      }

      if (data.paymentSummaries && Array.isArray(data.paymentSummaries)) {
        for (const entry of data.paymentSummaries) {
          try {
            await this.putRecord(PAYMENT_SUMMARIES_STORE, entry)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import payment summary:', err)
          }
        }
      }

      if (data.taxWorksheets && Array.isArray(data.taxWorksheets)) {
        for (const worksheet of data.taxWorksheets) {
          try {
            const { rentals, cgtEvents } = normalizeWorksheetRecord(worksheet)
            await this.saveTaxWorksheet({
              financialYear: worksheet.financialYear,
              rentals,
              cgtEvents,
            })
          } catch (err) {
            console.warn('[IndexedDB] Failed to import tax worksheet:', err)
          }
        }
      }

      importLodgmentPreferences(data.lodgmentPreferences)

      if (data.transactionReceipts && Array.isArray(data.transactionReceipts)) {
        for (const receiptMeta of data.transactionReceipts) {
          try {
            if (receiptMeta.imageData) {
              const response = await fetch(receiptMeta.imageData)
              const blob = await response.blob()
              const file = new File([blob], receiptMeta.fileName, { type: receiptMeta.fileType })
              await this.saveTransactionReceipt(receiptMeta.transactionId, file)
            }
          } catch (err) {
            console.warn('[IndexedDB] Failed to import transaction receipt:', err)
          }
        }
      }

      if (data.businessProfile) {
        try {
          await this.saveBusinessProfile(data.businessProfile)
        } catch (err) {
          console.warn('[IndexedDB] Failed to import business profile:', err)
        }
      }

      if (data.userMappings && Array.isArray(data.userMappings)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selpic_user_mappings', JSON.stringify(data.userMappings))
          localStorage.setItem('user_mappings', JSON.stringify(data.userMappings))
        }
      }

      if (data.paygConfig) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('selpic_payg_config', JSON.stringify(data.paygConfig))
          localStorage.setItem('payg_config', JSON.stringify(data.paygConfig))
        }
      }

      if (data.directorName) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('director_name', data.directorName)
        }
      }

      if (data.openingDirectorLoanBalance !== undefined && data.openingDirectorLoanBalance !== null) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'opening_director_loan_balance',
            data.openingDirectorLoanBalance.toString()
          )
        }
      }

      const { invalidatePeriodLockCache } = await import('../period-management/storage-guard')
      invalidatePeriodLockCache()

      console.log('[IndexedDB] Data import completed', {
        schemaVersion: data.schemaVersion ?? 1,
        replaceExisting,
      })
    } catch (err) {
      console.error('[IndexedDB] Error importing data:', err)
      throw err
    }
  }

  private async putRecord(storeName: string, record: any): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(storeName)) {
        resolve()
        return
      }

      const transaction = this.db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async saveStatementPreservingId(statement: StoredStatement): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(statement)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Log file upload for usage tracking
   */
  async logFileUpload(fileName: string, fileSize: number): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const usageLog = {
      id,
      fileName,
      fileSize,
      uploadedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([USAGE_LOGGING_STORE], 'readwrite')
      const store = transaction.objectStore(USAGE_LOGGING_STORE)
      const request = store.add(usageLog)

      request.onsuccess = () => {
        console.log('[IndexedDB] Usage log saved:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving usage log:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get total file upload count
   */
  async getTotalUploadCount(): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([USAGE_LOGGING_STORE], 'readonly')
      const store = transaction.objectStore(USAGE_LOGGING_STORE)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error counting usage logs:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all usage logs
   */
  async getAllUsageLogs(): Promise<Array<{
    id: string
    fileName: string
    fileSize: number
    uploadedAt: string
  }>> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([USAGE_LOGGING_STORE], 'readonly')
      const store = transaction.objectStore(USAGE_LOGGING_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const logs = request.result.sort((a, b) => 
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        )
        resolve(logs)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving usage logs:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Log API usage for cost tracking
   */
  async logApiUsage(usage: {
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
    apiKeyType: 'system' | 'user'
  }): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const id = `api_usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const usageLog: ApiUsageLog = {
      id,
      timestamp: new Date().toISOString(),
      ...usage,
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_USAGE_STORE], 'readwrite')
      const store = transaction.objectStore(API_USAGE_STORE)
      const request = store.add(usageLog)

      request.onsuccess = () => {
        console.log('[IndexedDB] API usage logged:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error logging API usage:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get total API usage cost (last 30 days)
   */
  async getTotalApiUsageCost(days: number = 30): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const transaction = this.db.transaction([API_USAGE_STORE], 'readonly')
      const store = transaction.objectStore(API_USAGE_STORE)
      const index = store.index('timestamp')
      const request = index.openCursor()

      let totalCost = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const usage = cursor.value as ApiUsageLog
          const usageDate = new Date(usage.timestamp)
          
          if (usageDate >= cutoffDate) {
            totalCost += usage.estimatedCost
          }
          
          cursor.continue()
        } else {
          resolve(totalCost)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error calculating API usage cost:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get API usage statistics
   */
  async getApiUsageStats(days: number = 30, useMonthStart: boolean = false): Promise<{
    totalCost: number
    totalTokens: number
    callCount: number
    byModel: Record<string, { cost: number; tokens: number; calls: number }>
  }> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Calculate cutoff date
      let cutoffDate: Date
      if (useMonthStart) {
        // Use start of current month
        const now = new Date()
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
        cutoffDate.setHours(0, 0, 0, 0)
      } else {
        // Use N days ago
        cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        cutoffDate.setHours(0, 0, 0, 0)
      }

      console.log('[IndexedDB] Getting API usage stats from:', cutoffDate.toISOString(), useMonthStart ? '(month start)' : `(${days} days ago)`)

      const transaction = this.db.transaction([API_USAGE_STORE], 'readonly')
      const store = transaction.objectStore(API_USAGE_STORE)
      const index = store.index('timestamp')
      const request = index.openCursor()

      let totalCost = 0
      let totalTokens = 0
      let callCount = 0
      const byModel: Record<string, { cost: number; tokens: number; calls: number }> = {}

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const usage = cursor.value as ApiUsageLog
          const usageDate = new Date(usage.timestamp)
          usageDate.setHours(0, 0, 0, 0)
          
          if (usageDate >= cutoffDate) {
            totalCost += usage.estimatedCost
            totalTokens += usage.totalTokens
            callCount++

            if (!byModel[usage.model]) {
              byModel[usage.model] = { cost: 0, tokens: 0, calls: 0 }
            }
            byModel[usage.model].cost += usage.estimatedCost
            byModel[usage.model].tokens += usage.totalTokens
            byModel[usage.model].calls++
          }
          
          cursor.continue()
        } else {
          console.log('[IndexedDB] API usage stats:', { totalCost, totalTokens, callCount, byModel })
          resolve({ totalCost, totalTokens, callCount, byModel })
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting API usage stats:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get recent API usage logs (for display in UI)
   */
  async getRecentApiUsageLogs(limit: number = 5): Promise<Array<{
    id: string
    timestamp: string
    model: string
    estimatedCost: number
    totalTokens: number
  }>> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_USAGE_STORE], 'readonly')
      const store = transaction.objectStore(API_USAGE_STORE)
      const index = store.index('timestamp')
      const request = index.openCursor(null, 'prev') // Reverse order (newest first)

      const logs: Array<{
        id: string
        timestamp: string
        model: string
        estimatedCost: number
        totalTokens: number
      }> = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor && logs.length < limit) {
          const usage = cursor.value as ApiUsageLog
          logs.push({
            id: usage.id,
            timestamp: usage.timestamp,
            model: usage.model,
            estimatedCost: usage.estimatedCost,
            totalTokens: usage.totalTokens
          })
          cursor.continue()
        } else {
          resolve(logs)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting recent API usage logs:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get today's upload count for rate limiting
   */
  async getTodayUploadCount(): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString()

      const transaction = this.db.transaction([USAGE_LOGGING_STORE], 'readonly')
      const store = transaction.objectStore(USAGE_LOGGING_STORE)
      const index = store.index('uploadedAt')
      const request = index.openCursor(IDBKeyRange.bound(todayStr, tomorrowStr, false, true))

      let count = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          count++
          cursor.continue()
        } else {
          resolve(count)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error counting today uploads:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save API Balance information
   */
  async saveApiBalance(apiKey: string, balanceInfo: {
    initialBalance: number
    actualUsage: number
    actualRemaining: number
    budgetLimit: number
    lastSyncedAt: string
  }): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_BALANCE_STORE], 'readwrite')
      const store = transaction.objectStore(API_BALANCE_STORE)
      
      // Use API key as ID (unique)
      const balanceData = {
        id: apiKey,
        apiKey,
        ...balanceInfo,
        updatedAt: new Date().toISOString()
      }

      const request = store.put(balanceData)

      request.onsuccess = () => {
        console.log('[IndexedDB] API balance saved:', apiKey)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving API balance:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get API Balance information
   */
  async getApiBalance(apiKey: string): Promise<{
    initialBalance: number
    actualUsage: number
    actualRemaining: number
    budgetLimit: number
    lastSyncedAt: string
    updatedAt: string
  } | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_BALANCE_STORE], 'readonly')
      const store = transaction.objectStore(API_BALANCE_STORE)
      const request = store.get(apiKey)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          resolve({
            initialBalance: result.initialBalance,
            actualUsage: result.actualUsage,
            actualRemaining: result.actualRemaining,
            budgetLimit: result.budgetLimit,
            lastSyncedAt: result.lastSyncedAt,
            updatedAt: result.updatedAt
          })
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving API balance:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete API Balance information (for reset/initialization)
   */
  async deleteApiBalance(apiKey: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_BALANCE_STORE], 'readwrite')
      const store = transaction.objectStore(API_BALANCE_STORE)
      const request = store.delete(apiKey)

      request.onsuccess = () => {
        console.log('[IndexedDB] API balance deleted:', apiKey)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting API balance:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Clear all API Balance records (for complete reset)
   */
  async clearAllApiBalances(): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([API_BALANCE_STORE], 'readwrite')
      const store = transaction.objectStore(API_BALANCE_STORE)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[IndexedDB] All API balances cleared')
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error clearing API balances:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Asset Management Methods
   */
  async saveAsset(asset: any): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([ASSETS_STORE], 'readwrite')
      const store = transaction.objectStore(ASSETS_STORE)
      const request = store.put(asset)

      request.onsuccess = () => {
        console.log('[IndexedDB] Asset saved:', asset.id)
        resolve(asset.id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving asset:', request.error)
        reject(request.error)
      }
    })
  }

  async getAllAssets(): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([ASSETS_STORE], 'readonly')
      const store = transaction.objectStore(ASSETS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const assets = request.result.sort((a, b) => 
          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        )
        resolve(assets)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving assets:', request.error)
        reject(request.error)
      }
    })
  }

  async deleteAsset(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([ASSETS_STORE], 'readwrite')
      const store = transaction.objectStore(ASSETS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Asset deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting asset:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Audit Trail Methods
   */
  async logAuditTrail(entry: {
    transactionId: string
    action:
      | 'created'
      | 'updated'
      | 'deleted'
      | 'category_changed'
      | 'department_changed'
      | 'period_locked'
      | 'period_unlocked'
      | 'period_carry_forward'
    userId: string
    userName?: string
    oldValue?: any
    newValue?: any
    description?: string
    details?: any
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    const auditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId: entry.transactionId,
      action: entry.action,
      userId: entry.userId,
      userName: entry.userName ?? entry.userId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      description: entry.description,
      ...(entry.details !== undefined ? { details: entry.details } : {}),
      timestamp: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([AUDIT_TRAIL_STORE], 'readwrite')
      const store = transaction.objectStore(AUDIT_TRAIL_STORE)
      const request = store.add(auditEntry)

      request.onsuccess = () => {
        console.log('[IndexedDB] Audit trail logged:', auditEntry.id)
        resolve(auditEntry.id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error logging audit trail:', request.error)
        reject(request.error)
      }
    })
  }

  async getAuditTrail(transactionId: string): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([AUDIT_TRAIL_STORE], 'readonly')
      const store = transaction.objectStore(AUDIT_TRAIL_STORE)
      const index = store.index('transactionId')
      const request = index.getAll(transactionId)

      request.onsuccess = () => {
        const entries = request.result.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        resolve(entries)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving audit trail:', request.error)
        reject(request.error)
      }
    })
  }

  async getAllAuditTrails(): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([AUDIT_TRAIL_STORE], 'readonly')
      const store = transaction.objectStore(AUDIT_TRAIL_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        resolve(entries)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving all audit trails:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Remove every audit-trail log entry. Does not touch statements, cash, payroll, or journals.
   */
  async clearAllAuditTrails(): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    const entries = await this.getAllAuditTrails().catch(() => [])
    const count = entries.length
    if (count === 0) {
      return 0
    }

    await this.clearStore(AUDIT_TRAIL_STORE)
    console.log('[IndexedDB] Cleared audit trail entries:', count)
    return count
  }
  
  // ============================================
  // Period Management Methods
  // ============================================

  /**
   * Save or update a financial period
   */
  async deletePeriod(periodId: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db.transaction([PERIODS_STORE], 'readwrite')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.delete(periodId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async savePeriod(period: FinancialPeriod): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([PERIODS_STORE], 'readwrite')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.put(period)

      request.onsuccess = () => {
        console.log('[IndexedDB] Period saved:', period.id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving period:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get period by ID
   */
  async getPeriod(periodId: string): Promise<FinancialPeriod | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([PERIODS_STORE], 'readonly')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.get(periodId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving period:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all periods
   */
  async getAllPeriods(): Promise<FinancialPeriod[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([PERIODS_STORE], 'readonly')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const periods = request.result.sort((a, b) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
        resolve(periods)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving periods:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get current period (most recent unlocked period or create new)
   */
  async getCurrentPeriod(): Promise<FinancialPeriod | null> {
    const allPeriods = await this.getAllPeriods()
    const unlockedPeriods = allPeriods.filter(p => !p.isLocked)
    
    if (unlockedPeriods.length === 0) {
      return null
    }
    
    // Return the most recent period
    return unlockedPeriods.sort((a, b) => 
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    )[0]
  }

  /**
   * Lock a period (정산 완료 처리)
   */
  async lockPeriod(periodId: string, lockedBy: string = 'owner'): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Get period
      const period = await this.getPeriod(periodId)
      if (!period) {
        reject(new Error(`Period ${periodId} not found`))
        return
      }

      if (period.isLocked) {
        reject(new Error(`Period ${periodId} is already locked`))
        return
      }

      // Update period
      period.isLocked = true
      period.lockedAt = new Date().toISOString()
      period.lockedBy = lockedBy
      period.updatedAt = new Date().toISOString()

      // Save period
      const transaction = this.db.transaction([PERIODS_STORE], 'readwrite')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.put(period)

      request.onsuccess = async () => {
        // Log to audit trail
        await this.logAuditTrail({
          transactionId: periodId,
          action: 'period_locked',
          userId: lockedBy,
          details: {
            periodId,
            periodType: period.periodType,
            startDate: period.startDate,
            endDate: period.endDate,
            closingDirectorLoanBalance: period.closingDirectorLoanBalance,
            closingCashBalance: period.closingCashBalance,
          },
        })

        console.log('[IndexedDB] Period locked:', periodId)
        const { invalidatePeriodLockCache } = await import('../period-management/storage-guard')
        invalidatePeriodLockCache()
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error locking period:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Unlock a period so open-period sync can repair openings (e.g. Jul locked at $0 cash
   * while June Active still holds the real closing cash).
   */
  async unlockPeriod(periodId: string, unlockedBy: string = 'owner'): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const period = await this.getPeriod(periodId)
      if (!period) {
        reject(new Error(`Period ${periodId} not found`))
        return
      }

      if (!period.isLocked) {
        resolve()
        return
      }

      period.isLocked = false
      period.lockedAt = undefined
      period.lockedBy = undefined
      period.updatedAt = new Date().toISOString()

      const transaction = this.db.transaction([PERIODS_STORE], 'readwrite')
      const store = transaction.objectStore(PERIODS_STORE)
      const request = store.put(period)

      request.onsuccess = async () => {
        await this.logAuditTrail({
          transactionId: periodId,
          action: 'period_unlocked',
          userId: unlockedBy,
          details: { periodId },
        })
        console.log('[IndexedDB] Period unlocked:', periodId)
        const { invalidatePeriodLockCache } = await import('../period-management/storage-guard')
        invalidatePeriodLockCache()
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error unlocking period:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Carry forward balances and receivables to next period
   */
  async carryForwardPeriod(
    fromPeriodId: string,
    toPeriodId: string,
    carriedForwardBy: string = 'owner'
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      // Get source period
      const fromPeriod = await this.getPeriod(fromPeriodId)
      if (!fromPeriod) {
        reject(new Error(`Source period ${fromPeriodId} not found`))
        return
      }

      // Get or create target period
      let toPeriod = await this.getPeriod(toPeriodId)
      if (!toPeriod) {
        if (!isValidPeriodId(toPeriodId)) {
          reject(new Error(`Invalid target period id ${toPeriodId}`))
          return
        }
        const bounds = periodIdToCalendarBounds(toPeriodId)!

        toPeriod = {
          id: toPeriodId,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          periodType: 'Monthly',
          openingDirectorLoanBalance: fromPeriod.closingDirectorLoanBalance,
          closingDirectorLoanBalance: fromPeriod.closingDirectorLoanBalance,
          openingCashBalance: fromPeriod.closingCashBalance,
          closingCashBalance: fromPeriod.closingCashBalance,
          isLocked: false,
          accountsReceivable: fromPeriod.accountsReceivable,
          carriedForwardReceivables: fromPeriod.carriedForwardReceivables.concat(
            fromPeriod.accountsReceivable > 0 ? fromPeriodId : []
          ),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      } else {
        // Update existing period with carried forward balances
        toPeriod.openingDirectorLoanBalance = fromPeriod.closingDirectorLoanBalance
        toPeriod.openingCashBalance = fromPeriod.closingCashBalance
        toPeriod.accountsReceivable = (toPeriod.accountsReceivable || 0) + fromPeriod.accountsReceivable
        toPeriod.carriedForwardReceivables = toPeriod.carriedForwardReceivables.concat(
          fromPeriod.carriedForwardReceivables
        )
        if (fromPeriod.accountsReceivable > 0) {
          toPeriod.carriedForwardReceivables.push(fromPeriodId)
        }
        toPeriod.updatedAt = new Date().toISOString()
      }

      // Save target period
      const transaction = this.db.transaction([PERIODS_STORE, PERIOD_CARRY_FORWARD_STORE], 'readwrite')
      const periodsStore = transaction.objectStore(PERIODS_STORE)
      const carryForwardStore = transaction.objectStore(PERIOD_CARRY_FORWARD_STORE)

      // Save period
      const saveRequest = periodsStore.put(toPeriod)

      saveRequest.onsuccess = () => {
        // Save carry forward record
        const carryForwardRecord: PeriodCarryForward = {
          id: `cf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromPeriodId,
          toPeriodId,
          directorLoanBalance: fromPeriod.closingDirectorLoanBalance,
          cashBalance: fromPeriod.closingCashBalance,
          receivables: fromPeriod.carriedForwardReceivables,
          carriedForwardAt: new Date().toISOString(),
          carriedForwardBy,
        }

        const cfRequest = carryForwardStore.add(carryForwardRecord)

        cfRequest.onsuccess = async () => {
          // Log to audit trail
          await this.logAuditTrail({
            transactionId: fromPeriodId,
            action: 'period_carry_forward',
            userId: carriedForwardBy,
            details: {
              fromPeriodId,
              toPeriodId,
              directorLoanBalance: fromPeriod.closingDirectorLoanBalance,
              cashBalance: fromPeriod.closingCashBalance,
              receivables: fromPeriod.accountsReceivable,
            },
          })

          console.log('[IndexedDB] Period carried forward:', { fromPeriodId, toPeriodId })
          resolve()
        }

        cfRequest.onerror = () => {
          console.error('[IndexedDB] Error saving carry forward record:', cfRequest.error)
          reject(cfRequest.error)
        }
      }

      saveRequest.onerror = () => {
        console.error('[IndexedDB] Error saving period:', saveRequest.error)
        reject(saveRequest.error)
      }
    })
  }

  /**
   * Get carry forward history
   */
  async getCarryForwardHistory(periodId?: string): Promise<PeriodCarryForward[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([PERIOD_CARRY_FORWARD_STORE], 'readonly')
      const store = transaction.objectStore(PERIOD_CARRY_FORWARD_STORE)
      const request = periodId 
        ? store.index('fromPeriodId').getAll(periodId)
        : store.getAll()

      request.onsuccess = () => {
        const records = request.result.sort((a, b) => 
          new Date(b.carriedForwardAt).getTime() - new Date(a.carriedForwardAt).getTime()
        )
        resolve(records)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error retrieving carry forward history:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save incoming order to Inbox
   */
  async saveIncomingOrder(order: {
    orderId: string
    referenceNo: string
    paymentGateway: string
    paymentMethod: string
    totalPaid: number
    grossAmount: number
    gstCollected: number
    gstAmount: number
    transactionDate: string
    occurredAt: string
    customerName: string
    customerEmail: string
    items: Array<{
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
    subtotal: number
    shipping: number
    discount?: number
    status: string
    currency?: string
    rawData: any // 원본 데이터 저장
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    const id = `incoming_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const incomingOrder = {
      id,
      ...order,
      receivedAt: new Date().toISOString(),
      inboxStatus: 'pending' as 'pending' | 'approved' | 'rejected',
      approvedAt: null as string | null,
      approvedBy: null as string | null,
      rejectedAt: null as string | null,
      rejectedBy: null as string | null,
      rejectionReason: null as string | null
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readwrite')
      const store = transaction.objectStore(INCOMING_ORDERS_STORE)
      const request = store.add(incomingOrder)

      request.onsuccess = () => {
        console.log('[IndexedDB] Incoming order saved:', { id, orderId: order.orderId })
        resolve(id)
      }

      request.onerror = () => {
        // 중복 체크: orderId가 이미 존재하는 경우
        if (request.error && (request.error as any).name === 'ConstraintError') {
          console.warn('[IndexedDB] Duplicate order detected:', order.orderId)
          reject(new Error(`Order ${order.orderId} already exists in inbox`))
        } else {
          console.error('[IndexedDB] Error saving incoming order:', request.error)
          reject(request.error)
        }
      }
    })
  }

  /**
   * Check if order ID already exists in inbox
   */
  async checkOrderExists(orderId: string): Promise<boolean> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readonly')
      const store = transaction.objectStore(INCOMING_ORDERS_STORE)
      const index = store.index('orderId')
      const request = index.get(orderId)

      request.onsuccess = () => {
        resolve(!!request.result)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error checking order existence:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all incoming orders (Inbox)
   */
  async getAllIncomingOrders(status?: 'pending' | 'approved' | 'rejected'): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        console.error('[IndexedDB] Database not initialized when getting incoming orders')
        reject(new Error('Database not initialized'))
        return
      }

      // 스토어 존재 확인
      if (!this.db.objectStoreNames.contains(INCOMING_ORDERS_STORE)) {
        console.error(`[IndexedDB] ❌ Store '${INCOMING_ORDERS_STORE}' does not exist`)
        console.error('[IndexedDB] Available stores:', Array.from(this.db.objectStoreNames))
        reject(new Error(`Store '${INCOMING_ORDERS_STORE}' does not exist. Please refresh the page to trigger database upgrade.`))
        return
      }

      try {
        const transaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readonly')
        const store = transaction.objectStore(INCOMING_ORDERS_STORE)
        
        console.log('[IndexedDB] Getting incoming orders, status filter:', status || 'all')
        
        const request = status 
          ? store.index('inboxStatus').getAll(status)
          : store.getAll()

        request.onsuccess = () => {
          const orders = request.result || []
          console.log(`[IndexedDB] Retrieved ${orders.length} orders from IndexedDB`)
          const sortedOrders = orders.sort((a, b) => 
            new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime()
          )
          resolve(sortedOrders)
        }

        request.onerror = () => {
          console.error('[IndexedDB] ❌ Error retrieving incoming orders:', request.error)
          console.error('[IndexedDB] Error name:', (request.error as any)?.name)
          console.error('[IndexedDB] Error message:', (request.error as any)?.message)
          reject(request.error)
        }
      } catch (error) {
        console.error('[IndexedDB] ❌ Exception while getting incoming orders:', error)
        reject(error)
      }
    })
  }

  /**
   * Update incoming order status (approve/reject)
   */
  async updateIncomingOrderStatus(
    id: string, 
    status: 'approved' | 'rejected',
    userId: string,
    reason?: string
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readwrite')
      const store = transaction.objectStore(INCOMING_ORDERS_STORE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const order = getRequest.result
        if (!order) {
          reject(new Error('Order not found'))
          return
        }

        order.inboxStatus = status
        if (status === 'approved') {
          order.approvedAt = new Date().toISOString()
          order.approvedBy = userId
        } else {
          order.rejectedAt = new Date().toISOString()
          order.rejectedBy = userId
          order.rejectionReason = reason || null
        }

        const updateRequest = store.put(order)
        updateRequest.onsuccess = () => {
          console.log('[IndexedDB] Incoming order status updated:', { id, status })
          resolve()
        }
        updateRequest.onerror = () => {
          console.error('[IndexedDB] Error updating incoming order status:', updateRequest.error)
          reject(updateRequest.error)
        }
      }

      getRequest.onerror = () => {
        console.error('[IndexedDB] Error getting incoming order:', getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * Link an approved order to a bank deposit transaction.
   */
  async updateIncomingOrderMatch(
    id: string,
    matchedTransactionId: string,
    matchType: 'exact' | 'fuzzy' | 'manual',
    matchedBy: string = 'owner'
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const dbTransaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readwrite')
      const store = dbTransaction.objectStore(INCOMING_ORDERS_STORE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const order = getRequest.result
        if (!order) {
          reject(new Error('Order not found'))
          return
        }

        order.matchedTransactionId = matchedTransactionId
        order.matchType = matchType
        order.matchedAt = new Date().toISOString()
        order.matchedBy = matchedBy

        const putRequest = store.put(order)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Remove bank deposit match from an incoming order.
   */
  async clearIncomingOrderMatch(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const dbTransaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readwrite')
      const store = dbTransaction.objectStore(INCOMING_ORDERS_STORE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const order = getRequest.result
        if (!order) {
          reject(new Error('Order not found'))
          return
        }

        delete order.matchedTransactionId
        delete order.matchType
        delete order.matchedAt
        delete order.matchedBy

        const putRequest = store.put(order)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * Delete incoming order
   */
  async deleteIncomingOrder(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([INCOMING_ORDERS_STORE], 'readwrite')
      const store = transaction.objectStore(INCOMING_ORDERS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Incoming order deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting incoming order:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save timesheet
   */
  async saveTimesheet(timesheet: {
    id?: string
    employeeId: string
    employeeName: string
    payPeriod: {
      start: string
      end: string
    }
    entries: Array<{
      id: string
      date: string
      startTime?: string
      endTime?: string
      hours: number
      hourlyRate?: number
      description?: string
      projectCode?: string
      isOvertime?: boolean
      overtimeMultiplier?: number
    }>
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'
    totalHours: number
    totalRegularHours: number
    totalOvertimeHours: number
    grossPay: number
    submittedAt?: string
    approvedAt?: string
    approvedBy?: string
    rejectedAt?: string
    rejectedReason?: string
    paidAt?: string
    notes?: string
    createdAt?: string
    updatedAt?: string
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TIMESHEETS_STORE)) {
        reject(new Error(`Store '${TIMESHEETS_STORE}' does not exist. Please refresh the page.`))
        return
      }

      const id = timesheet.id || `timesheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const timesheetData = {
        ...timesheet,
        id,
        createdAt: timesheet.createdAt || now,
        updatedAt: now,
      }

      const transaction = this.db.transaction([TIMESHEETS_STORE], 'readwrite')
      const store = transaction.objectStore(TIMESHEETS_STORE)
      const request = store.put(timesheetData)

      request.onsuccess = () => {
        console.log('[IndexedDB] Timesheet saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving timesheet:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all timesheets
   */
  async getAllTimesheets(employeeId?: string, status?: string): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TIMESHEETS_STORE)) {
        resolve([]) // Store doesn't exist yet, return empty array
        return
      }

      const transaction = this.db.transaction([TIMESHEETS_STORE], 'readonly')
      const store = transaction.objectStore(TIMESHEETS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        let timesheets = request.result || []

        // Filter by employeeId if provided
        if (employeeId) {
          timesheets = timesheets.filter((ts: any) => ts.employeeId === employeeId)
        }

        // Filter by status if provided
        if (status) {
          timesheets = timesheets.filter((ts: any) => ts.status === status)
        }

        // Sort by createdAt (newest first)
        timesheets.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )

        resolve(timesheets)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting timesheets:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get timesheet by ID
   */
  async getTimesheet(id: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TIMESHEETS_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([TIMESHEETS_STORE], 'readonly')
      const store = transaction.objectStore(TIMESHEETS_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting timesheet:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Update timesheet status
   */
  async updateTimesheetStatus(
    id: string,
    status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid',
    approvedBy?: string,
    rejectedReason?: string
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TIMESHEETS_STORE)) {
        reject(new Error(`Store '${TIMESHEETS_STORE}' does not exist`))
        return
      }

      const transaction = this.db.transaction([TIMESHEETS_STORE], 'readwrite')
      const store = transaction.objectStore(TIMESHEETS_STORE)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const timesheet = getRequest.result
        if (!timesheet) {
          reject(new Error('Timesheet not found'))
          return
        }

        timesheet.status = status
        timesheet.updatedAt = new Date().toISOString()

        if (status === 'submitted') {
          timesheet.submittedAt = new Date().toISOString()
        } else if (status === 'approved') {
          timesheet.approvedAt = new Date().toISOString()
          timesheet.approvedBy = approvedBy
        } else if (status === 'rejected') {
          timesheet.rejectedAt = new Date().toISOString()
          timesheet.rejectedReason = rejectedReason
        } else if (status === 'paid') {
          timesheet.paidAt = new Date().toISOString()
        }

        const updateRequest = store.put(timesheet)
        updateRequest.onsuccess = () => {
          console.log('[IndexedDB] Timesheet status updated:', { id, status })
          resolve()
        }
        updateRequest.onerror = () => {
          console.error('[IndexedDB] Error updating timesheet status:', updateRequest.error)
          reject(updateRequest.error)
        }
      }

      getRequest.onerror = () => {
        console.error('[IndexedDB] Error getting timesheet:', getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * Delete timesheet and cascade approved payslip + payroll journals
   */
  async deleteTimesheet(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    try {
      const timesheet = await this.getTimesheet(id)
      if (timesheet) {
        const payslips = await this.getAllPayslips()
        const linkedPayslipIds = payslipIdsLinkedToTimesheet(payslips, {
          id,
          employeeName: timesheet.employeeName,
          payPeriod: timesheet.payPeriod,
          grossPay: timesheet.grossPay,
        })
        for (const payslipId of linkedPayslipIds) {
          try {
            await this.deletePayslip(payslipId)
          } catch (err) {
            console.warn('[IndexedDB] Failed to cascade delete payslip for timesheet:', payslipId, err)
          }
        }
      }
    } catch (err) {
      console.warn('[IndexedDB] Timesheet cascade lookup failed (continuing delete):', err)
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TIMESHEETS_STORE)) {
        reject(new Error(`Store '${TIMESHEETS_STORE}' does not exist`))
        return
      }

      const transaction = this.db.transaction([TIMESHEETS_STORE], 'readwrite')
      const store = transaction.objectStore(TIMESHEETS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Timesheet deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting timesheet:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save employee
   */
  async saveEmployee(employee: {
    id?: string
    name: string
    employeeId: string
    password?: string
    type: 'employee' | 'director' | 'contractor' | 'partner'
    taxFileNumber?: string
    abn?: string
    hourlyRate?: number
    superannuationRate: number
    payFrequency: 'weekly' | 'fortnightly' | 'monthly'
    email?: string
    /** Homepage admin username for SSO → My Payroll (path B) */
    linkedAdminUsername?: string
    phone?: string
    address?: {
      street?: string
      city?: string
      state?: string
      postcode?: string
    }
    startDate?: string
    endDate?: string
    isActive: boolean
    annualLeaveBalance?: number
    sickLeaveBalance?: number
    createdAt?: string
    updatedAt?: string
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        reject(new Error(`Store '${EMPLOYEES_STORE}' does not exist. Please refresh the page.`))
        return
      }

      const id = employee.id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const employeeData = {
        ...employee,
        id,
        createdAt: employee.createdAt || now,
        updatedAt: now,
      }

      const transaction = this.db.transaction([EMPLOYEES_STORE], 'readwrite')
      const store = transaction.objectStore(EMPLOYEES_STORE)
      const request = store.put(employeeData)

      request.onsuccess = () => {
        console.log('[IndexedDB] Employee saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving employee:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all employees
   */
  async getAllEmployees(isActive?: boolean): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        resolve([]) // Store doesn't exist yet, return empty array
        return
      }

      const transaction = this.db.transaction([EMPLOYEES_STORE], 'readonly')
      const store = transaction.objectStore(EMPLOYEES_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        let employees = request.result || []

        // Filter by isActive if provided
        if (isActive !== undefined) {
          employees = employees.filter((emp: any) => emp.isActive === isActive)
        }

        // Sort by createdAt (newest first)
        employees.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )

        resolve(employees)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting employees:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get employee by ID
   */
  async getEmployee(id: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([EMPLOYEES_STORE], 'readonly')
      const store = transaction.objectStore(EMPLOYEES_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting employee:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get employee by employeeId (login ID)
   */
  async getEmployeeByEmployeeId(employeeId: string): Promise<any | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([EMPLOYEES_STORE], 'readonly')
      const store = transaction.objectStore(EMPLOYEES_STORE)
      const index = store.index('employeeId')
      const request = index.get(employeeId)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting employee by employeeId:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete employee and cascade their payslips, timesheets, and payroll journals
   */
  async deleteEmployee(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    try {
      const employee = await this.getEmployee(id).catch(() => null)
      const payslips = await this.getAllPayslips()
      const linkedPayslips = payslips.filter(
        (ps: any) =>
          ps.employeeId === id ||
          (employee?.employeeId && ps.employeeId === employee.employeeId)
      )
      for (const payslip of linkedPayslips) {
        if (payslip?.id) {
          try {
            await this.deletePayslip(payslip.id)
          } catch (err) {
            console.warn(
              '[IndexedDB] Failed to cascade delete payslip for employee:',
              payslip.id,
              err
            )
          }
        }
      }

      const timesheetsByDbId = await this.getAllTimesheets(id)
      const timesheetsByCode = employee?.employeeId
        ? await this.getAllTimesheets(employee.employeeId)
        : []
      const timesheetMap = new Map<string, any>()
      for (const ts of [...timesheetsByDbId, ...timesheetsByCode]) {
        if (ts?.id) timesheetMap.set(ts.id, ts)
      }
      for (const ts of timesheetMap.values()) {
        try {
          await this.deleteTimesheet(ts.id)
        } catch (err) {
          console.warn(
            '[IndexedDB] Failed to cascade delete timesheet for employee:',
            ts.id,
            err
          )
        }
      }
    } catch (err) {
      console.warn('[IndexedDB] Employee cascade lookup failed (continuing delete):', err)
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(EMPLOYEES_STORE)) {
        reject(new Error(`Store '${EMPLOYEES_STORE}' does not exist`))
        return
      }

      const transaction = this.db.transaction([EMPLOYEES_STORE], 'readwrite')
      const store = transaction.objectStore(EMPLOYEES_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Employee deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting employee:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save leave record
   */
  async saveLeaveRecord(
    record: Omit<LeaveRecord, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
      updatedAt?: string
    }
  ): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LEAVE_RECORDS_STORE)) {
        reject(new Error(`Store '${LEAVE_RECORDS_STORE}' does not exist. Please refresh the page.`))
        return
      }

      const id = record.id || `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      const data: LeaveRecord = {
        employeeId: record.employeeId,
        type: record.type,
        startDate: record.startDate,
        endDate: record.endDate,
        hours: record.hours,
        status: record.status,
        reason: record.reason,
        id,
        createdAt: record.createdAt || now,
        updatedAt: record.updatedAt || now,
        ...(record.approvedAt ? { approvedAt: record.approvedAt } : {}),
        ...(record.approvedBy ? { approvedBy: record.approvedBy } : {}),
      }

      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readwrite')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.put(data)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get leave records for an employee
   */
  async getLeaveRecordsByEmployee(employeeId: string): Promise<LeaveRecord[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LEAVE_RECORDS_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readonly')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const index = store.index('employeeId')
      const request = index.getAll(employeeId)

      request.onsuccess = () => {
        const records = (request.result || []) as LeaveRecord[]
        records.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
        resolve(records)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get all leave records (for backup export)
   */
  async getAllLeaveRecords(): Promise<LeaveRecord[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LEAVE_RECORDS_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readonly')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const records = (request.result || []) as LeaveRecord[]
        records.sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )
        resolve(records)
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Update leave record status and optionally deduct employee leave balance
   */
  async updateLeaveRecordStatus(
    id: string,
    status: LeaveStatus,
    approvedBy: string = 'owner'
  ): Promise<LeaveRecord> {
    if (!this.db) {
      await this.init()
    }

    const record = await new Promise<LeaveRecord | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readonly')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })

    if (!record) {
      throw new Error('Leave record not found')
    }

    const previousStatus = record.status
    const now = new Date().toISOString()
    const updated: LeaveRecord = {
      ...record,
      status,
      updatedAt: now,
      ...(status === 'approved'
        ? { approvedAt: now, approvedBy }
        : { approvedAt: undefined, approvedBy: undefined }),
    }

    await new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readwrite')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.put(updated)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    if (status === 'approved' && previousStatus !== 'approved' && record.type !== 'unpaid') {
      await this.applyLeaveBalanceDeduction(record.employeeId, record.type, record.hours)
    }

    if (previousStatus === 'approved' && status !== 'approved' && record.type !== 'unpaid') {
      await this.restoreLeaveBalance(record.employeeId, record.type, record.hours)
    }

    return updated
  }

  private async applyLeaveBalanceDeduction(
    employeeId: string,
    type: LeaveRecord['type'],
    hours: number
  ): Promise<void> {
    const employee = await this.getEmployee(employeeId)
    if (!employee) return

    const balanceField = type === 'sick' ? 'sickLeaveBalance' : 'annualLeaveBalance'
    const current = employee[balanceField] ?? 0
    await this.saveEmployee({
      ...employee,
      [balanceField]: Math.max(0, current - hours),
    })
  }

  private async restoreLeaveBalance(
    employeeId: string,
    type: LeaveRecord['type'],
    hours: number
  ): Promise<void> {
    const employee = await this.getEmployee(employeeId)
    if (!employee) return

    const balanceField = type === 'sick' ? 'sickLeaveBalance' : 'annualLeaveBalance'
    const current = employee[balanceField] ?? 0
    await this.saveEmployee({
      ...employee,
      [balanceField]: current + hours,
    })
  }

  /**
   * Delete leave record (pending/rejected only; approved restores balance first)
   */
  async deleteLeaveRecord(id: string): Promise<void> {
    const records = await new Promise<LeaveRecord | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db!.transaction([LEAVE_RECORDS_STORE], 'readonly')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })

    if (records?.status === 'approved' && records.type !== 'unpaid') {
      await this.restoreLeaveBalance(records.employeeId, records.type, records.hours)
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db.transaction([LEAVE_RECORDS_STORE], 'readwrite')
      const store = transaction.objectStore(LEAVE_RECORDS_STORE)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveAttendanceRecord(record: {
    id?: string
    employeeId: string
    employeeName?: string
    clockInAt: string
    clockOutAt?: string
    note?: string
    source?: 'employee' | 'admin'
    createdAt?: string
    updatedAt?: string
  }): Promise<string> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      if (!this.db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        reject(
          new Error(
            `Store '${ATTENDANCE_STORE}' does not exist. Please refresh the page.`
          )
        )
        return
      }
      const id =
        record.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const now = new Date().toISOString()
      const data = {
        ...record,
        id,
        source: record.source || 'employee',
        createdAt: record.createdAt || now,
        updatedAt: now,
      }
      const tx = this.db.transaction([ATTENDANCE_STORE], 'readwrite')
      const store = tx.objectStore(ATTENDANCE_STORE)
      const req = store.put(data)
      req.onsuccess = () => resolve(id)
      req.onerror = () => reject(req.error)
    })
  }

  async getAttendanceRecords(employeeId?: string): Promise<any[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      if (!this.db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        resolve([])
        return
      }
      const tx = this.db.transaction([ATTENDANCE_STORE], 'readonly')
      const store = tx.objectStore(ATTENDANCE_STORE)
      const req = employeeId
        ? store.index('employeeId').getAll(employeeId)
        : store.getAll()
      req.onsuccess = () => {
        const rows = (req.result || []) as any[]
        rows.sort(
          (a, b) =>
            new Date(b.clockInAt || 0).getTime() -
            new Date(a.clockInAt || 0).getTime()
        )
        resolve(rows)
      }
      req.onerror = () => reject(req.error)
    })
  }

  async deleteAttendanceRecord(id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      if (!this.db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        reject(new Error(`Store '${ATTENDANCE_STORE}' does not exist`))
        return
      }
      const tx = this.db.transaction([ATTENDANCE_STORE], 'readwrite')
      const store = tx.objectStore(ATTENDANCE_STORE)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Save transaction (standalone, e.g., from payroll)
   */
  async saveTransaction(transaction: any): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    if (transaction?.date) {
      await this.assertWritableDate(transaction.date)
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        // If store doesn't exist, save to localStorage as fallback
        console.warn('[IndexedDB] Transactions store not found, saving to localStorage')
        if (typeof window !== 'undefined') {
          const existing = localStorage.getItem('payroll_transactions')
          const transactions = existing ? JSON.parse(existing) : []
          transactions.push(transaction)
          localStorage.setItem('payroll_transactions', JSON.stringify(transactions))
          resolve(transaction.id || `tx_${Date.now()}`)
        } else {
          reject(new Error('Transactions store not available'))
        }
        return
      }

      const id = transaction.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const transactionData = {
        ...transaction,
        id,
        createdAt: transaction.createdAt || now,
      }

      const dbTransaction = this.db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = dbTransaction.objectStore(TRANSACTIONS_STORE)
      const request = store.put(transactionData)

      request.onsuccess = () => {
        console.log('[IndexedDB] Transaction saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving transaction:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all transactions (standalone)
   */
  async getAllTransactions(): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          const existing = localStorage.getItem('payroll_transactions')
          const transactions = existing ? JSON.parse(existing) : []
          resolve(transactions)
        } else {
          resolve([])
        }
        return
      }

      const transaction = this.db.transaction([TRANSACTIONS_STORE], 'readonly')
      const store = transaction.objectStore(TRANSACTIONS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const transactions = request.result || []
        resolve(transactions.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        ))
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting transactions:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Update a standalone transaction by id
   */
  async updateTransaction(id: string, updates: any): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    const allTransactions = await this.getAllTransactions()
    const existing = allTransactions.find((tx: any) => tx.id === id)
    if (!existing) {
      throw new Error(`Transaction not found: ${id}`)
    }

    const nextDate = updates.date ?? existing.date
    await this.assertWritableDate(existing.date)
    if (nextDate !== existing.date) {
      await this.assertWritableDate(nextDate)
    }

    await this.saveTransaction({
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Save payslip
   */
  async savePayslip(payslip: {
    id?: string
    employeeId: string
    employeeName: string
    payPeriod: {
      start: string
      end: string
    }
    grossPay: number
    taxWithheld: number
    superannuation: number
    netPay: number
    payDate: string
    status: 'draft' | 'approved' | 'paid'
    bankMatchedTransactionKey?: string
    bankMatchedAt?: string
    createdAt?: string
    updatedAt?: string
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(PAYSLIPS_STORE)) {
        reject(new Error(`Store '${PAYSLIPS_STORE}' does not exist. Please refresh the page.`))
        return
      }

      const id = payslip.id || `payslip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const payslipData = {
        ...payslip,
        id,
        createdAt: payslip.createdAt || now,
        updatedAt: now,
      }

      const transaction = this.db.transaction([PAYSLIPS_STORE], 'readwrite')
      const store = transaction.objectStore(PAYSLIPS_STORE)
      const request = store.put(payslipData)

      request.onsuccess = () => {
        console.log('[IndexedDB] Payslip saved:', id)
        resolve(id)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error saving payslip:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Get all payslips
   */
  async getAllPayslips(employeeId?: string, status?: string): Promise<any[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(PAYSLIPS_STORE)) {
        resolve([]) // Store doesn't exist yet, return empty array
        return
      }

      const transaction = this.db.transaction([PAYSLIPS_STORE], 'readonly')
      const store = transaction.objectStore(PAYSLIPS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        let payslips = request.result || []

        // Filter by employeeId if provided
        if (employeeId) {
          payslips = payslips.filter((ps: any) => ps.employeeId === employeeId)
        }

        // Filter by status if provided
        if (status) {
          payslips = payslips.filter((ps: any) => ps.status === status)
        }

        // Sort by createdAt (newest first)
        payslips.sort((a: any, b: any) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )

        resolve(payslips)
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error getting payslips:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Delete one standalone transaction (payroll journals live here, not in statements).
   */
  async deleteStandaloneTransaction(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    if (typeof window !== 'undefined') {
      try {
        const existing = localStorage.getItem('payroll_transactions')
        if (existing) {
          const list = JSON.parse(existing)
          if (Array.isArray(list)) {
            localStorage.setItem(
              'payroll_transactions',
              JSON.stringify(list.filter((tx: any) => tx?.id !== id))
            )
          }
        }
      } catch (err) {
        console.warn('[IndexedDB] Failed to prune localStorage payroll_transactions:', err)
      }
    }

    if (!this.db?.objectStoreNames.contains(TRANSACTIONS_STORE)) {
      return
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }
      const transaction = this.db.transaction([TRANSACTIONS_STORE], 'readwrite')
      const store = transaction.objectStore(TRANSACTIONS_STORE)
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete payroll journal rows linked to a payslip id.
   */
  async deletePayrollTransactionsForPayslip(payslipId: string): Promise<number> {
    const allTransactions = await this.getAllTransactions()
    const related = allTransactions.filter((tx: any) => {
      if (!isPayrollJournalTransaction(tx)) {
        // Still allow legacy rows matched only by reference/id pattern
      }
      const linkedId = extractPayslipIdFromPayrollTx(tx)
      if (linkedId === payslipId) return true
      return (
        tx.reference === `PAYROLL_${payslipId}` ||
        tx.id?.startsWith(`${payslipId}_entry_`) ||
        (typeof tx.reference === 'string' && tx.reference.includes(payslipId))
      )
    })

    for (const tx of related) {
      if (tx?.id) {
        await this.deleteStandaloneTransaction(tx.id)
      }
    }
    return related.length
  }

  /**
   * Remove payroll journals whose payslip no longer exists (orphans from old test deletes).
   * Also strips payroll rows wrongly embedded inside bank statements, and when HR is empty
   * (no employees + no timesheets) clears ALL payslips + payroll journals.
   */
  async purgeOrphanPayrollTransactions(): Promise<number> {
    if (!this.db) {
      await this.init()
    }

    let removed = 0

    const employees = await this.getAllEmployees().catch(() => [])
    const timesheets = await this.getAllTimesheets().catch(() => [])
    const hrEmpty = employees.length === 0 && timesheets.length === 0

    // HR UI empty → wipe leftover payslips + every payroll journal (old test residue)
    if (hrEmpty) {
      const payslips = await this.getAllPayslips().catch(() => [])
      for (const ps of payslips) {
        if (ps?.id) {
          try {
            await this.deletePayslip(ps.id)
            removed += 1
          } catch (err) {
            console.warn('[IndexedDB] Failed to delete leftover payslip:', ps.id, err)
          }
        }
      }

      const leftover = await this.getAllTransactions()
      for (const tx of leftover) {
        if (isPayrollJournalTransaction(tx) && tx?.id) {
          await this.deleteStandaloneTransaction(tx.id)
          removed += 1
        }
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('payroll_transactions')
        } catch {
          /* ignore */
        }
      }
    } else {
      const payslips = await this.getAllPayslips()
      const payslipIds = new Set(
        payslips
          .map((ps: any) => ps?.id)
          .filter((id: unknown): id is string => typeof id === 'string')
      )
      const employeeIds = new Set<string>()
      for (const emp of employees) {
        if (emp?.id) employeeIds.add(emp.id)
        if (emp?.employeeId) employeeIds.add(emp.employeeId)
      }

      // Payslips whose employee was deleted
      for (const ps of payslips) {
        if (!ps?.id) continue
        const empKey = ps.employeeId
        if (empKey && !employeeIds.has(empKey)) {
          try {
            await this.deletePayslip(ps.id)
            removed += 1
            payslipIds.delete(ps.id)
          } catch (err) {
            console.warn('[IndexedDB] Failed to delete orphan payslip:', ps.id, err)
          }
        }
      }

      const allTransactions = await this.getAllTransactions()
      const orphans = allTransactions.filter((tx: any) =>
        isOrphanPayrollTransaction(tx, payslipIds)
      )
      for (const tx of orphans) {
        if (tx?.id) {
          await this.deleteStandaloneTransaction(tx.id)
          removed += 1
        }
      }
    }

    // Payroll journals must never live inside bank statement blobs
    removed += await this.stripPayrollJournalsFromStatements()

    if (removed > 0) {
      console.log(`[IndexedDB] Purged ${removed} leftover payroll record(s) (hrEmpty=${hrEmpty})`)
    }
    return removed
  }

  /**
   * Remove source=payroll / isPayrollTransaction rows from stored bank statements.
   */
  async stripPayrollJournalsFromStatements(): Promise<number> {
    const statements = await this.getAllStatements()
    let removed = 0
    for (const statement of statements) {
      const txs = Array.isArray(statement.transactions) ? statement.transactions : []
      const kept = txs.filter((tx: any) => !isPayrollJournalTransaction(tx))
      if (kept.length < txs.length) {
        removed += txs.length - kept.length
        await this.updateStatement(statement.id, { ...statement, transactions: kept })
      }
    }
    return removed
  }

  /**
   * Delete payslip and related payroll journal transactions
   */
  async deletePayslip(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    if (!this.db?.objectStoreNames.contains(PAYSLIPS_STORE)) {
      throw new Error(`Store '${PAYSLIPS_STORE}' does not exist`)
    }

    const deletedCount = await this.deletePayrollTransactionsForPayslip(id)
    console.log(
      `[IndexedDB] Deleted ${deletedCount} payroll journal(s) for payslip ${id}`
    )

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([PAYSLIPS_STORE], 'readwrite')
      const store = transaction.objectStore(PAYSLIPS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log('[IndexedDB] Payslip deleted:', id)
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error deleting payslip:', request.error)
        reject(request.error)
      }
    })
  }

  /**
   * Save ATO lodgment snapshot (copy sheet freeze + checklist).
   */
  async saveLodgmentSnapshot(
    snapshot: Omit<LodgmentSnapshot, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
      updatedAt?: string
    }
  ): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
        reject(new Error(`Store '${LODGMENT_SNAPSHOTS_STORE}' does not exist. Please refresh the page.`))
        return
      }

      const id =
        snapshot.id || `lodgment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      const data: LodgmentSnapshot = {
        ...snapshot,
        id,
        createdAt: snapshot.createdAt || now,
        updatedAt: now,
      }

      const transaction = this.db.transaction([LODGMENT_SNAPSHOTS_STORE], 'readwrite')
      const store = transaction.objectStore(LODGMENT_SNAPSHOTS_STORE)
      const request = store.put(data)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * List lodgment snapshots, newest first.
   */
  async getLodgmentSnapshots(kind?: LodgmentSnapshot['kind']): Promise<LodgmentSnapshot[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([LODGMENT_SNAPSHOTS_STORE], 'readonly')
      const store = transaction.objectStore(LODGMENT_SNAPSHOTS_STORE)
      const request = kind ? store.index('kind').getAll(kind) : store.getAll()

      request.onsuccess = () => {
        const rows = (request.result || []) as LodgmentSnapshot[]
        rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        resolve(rows)
      }

      request.onerror = () => reject(request.error)
    })
  }

  async getLodgmentSnapshot(id: string): Promise<LodgmentSnapshot | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([LODGMENT_SNAPSHOTS_STORE], 'readonly')
      const store = transaction.objectStore(LODGMENT_SNAPSHOTS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve((request.result as LodgmentSnapshot) || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteLodgmentSnapshot(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(LODGMENT_SNAPSHOTS_STORE)) {
        resolve()
        return
      }

      const transaction = this.db.transaction([LODGMENT_SNAPSHOTS_STORE], 'readwrite')
      const store = transaction.objectStore(LODGMENT_SNAPSHOTS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async savePaymentSummary(
    entry: Omit<PaymentSummaryEntry, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string
      createdAt?: string
      updatedAt?: string
    }
  ): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(PAYMENT_SUMMARIES_STORE)) {
        reject(new Error('Payment summaries store not available. Refresh the page.'))
        return
      }

      const id =
        entry.id || `ps_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const now = new Date().toISOString()
      const data: PaymentSummaryEntry = {
        ...entry,
        id,
        grossPayments: Math.round(entry.grossPayments * 100) / 100,
        taxWithheld: Math.round(entry.taxWithheld * 100) / 100,
        createdAt: entry.createdAt || now,
        updatedAt: now,
      }

      const transaction = this.db.transaction([PAYMENT_SUMMARIES_STORE], 'readwrite')
      const store = transaction.objectStore(PAYMENT_SUMMARIES_STORE)
      const request = store.put(data)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async getPaymentSummaries(financialYear?: string): Promise<PaymentSummaryEntry[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(PAYMENT_SUMMARIES_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([PAYMENT_SUMMARIES_STORE], 'readonly')
      const store = transaction.objectStore(PAYMENT_SUMMARIES_STORE)
      const request = financialYear
        ? store.index('financialYear').getAll(financialYear)
        : store.getAll()

      request.onsuccess = () => {
        const rows = (request.result || []) as PaymentSummaryEntry[]
        rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        resolve(rows)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deletePaymentSummary(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(PAYMENT_SUMMARIES_STORE)) {
        resolve()
        return
      }

      const transaction = this.db.transaction([PAYMENT_SUMMARIES_STORE], 'readwrite')
      const store = transaction.objectStore(PAYMENT_SUMMARIES_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async sumPaymentSummariesForYear(financialYear: string): Promise<PaymentSummaryTotals> {
    const rows = await this.getPaymentSummaries(financialYear)
    return {
      grossPayments: Math.round(rows.reduce((s, r) => s + r.grossPayments, 0) * 100) / 100,
      taxWithheld: Math.round(rows.reduce((s, r) => s + r.taxWithheld, 0) * 100) / 100,
      count: rows.length,
    }
  }

  async clearIndividualTaxData(): Promise<void> {
    if (!this.db) {
      await this.init()
    }
    await this.clearStore(PAYMENT_SUMMARIES_STORE)
    await this.clearStore(TAX_WORKSHEETS_STORE)
    clearLodgmentPreferences()
  }

  async getAllTaxWorksheets(): Promise<IndividualTaxWorksheetRecord[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(TAX_WORKSHEETS_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([TAX_WORKSHEETS_STORE], 'readonly')
      const store = transaction.objectStore(TAX_WORKSHEETS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const rows = (request.result || []) as IndividualTaxWorksheetRecord[]
        resolve(
          rows.map((raw) => {
            const { rentals, cgtEvents } = normalizeWorksheetRecord(raw)
            return { ...raw, rentals, cgtEvents }
          })
        )
      }
      request.onerror = () => reject(request.error)
    })
  }

  async getTaxWorksheet(financialYear: string): Promise<IndividualTaxWorksheetRecord | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(TAX_WORKSHEETS_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([TAX_WORKSHEETS_STORE], 'readonly')
      const store = transaction.objectStore(TAX_WORKSHEETS_STORE)
      const request = store.get(worksheetRecordId(financialYear))

      request.onsuccess = () => {
        const raw = request.result as IndividualTaxWorksheetRecord | undefined
        if (!raw) {
          resolve(null)
          return
        }
        const { rentals, cgtEvents } = normalizeWorksheetRecord(raw)
        resolve({ ...raw, rentals, cgtEvents })
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveTaxWorksheet(
    data: Pick<IndividualTaxWorksheetRecord, 'financialYear' | 'rentals' | 'cgtEvents'>
  ): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(TAX_WORKSHEETS_STORE)) {
        reject(new Error('Tax worksheets store not available. Refresh the page.'))
        return
      }

      const id = worksheetRecordId(data.financialYear)
      const record: IndividualTaxWorksheetRecord = {
        id,
        financialYear: data.financialYear,
        rentals: data.rentals,
        cgtEvents: data.cgtEvents,
        updatedAt: new Date().toISOString(),
      }

      const transaction = this.db.transaction([TAX_WORKSHEETS_STORE], 'readwrite')
      const store = transaction.objectStore(TAX_WORKSHEETS_STORE)
      const request = store.put(record)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(request.error)
    })
  }

  async saveJournalEntry(entry: JournalEntry): Promise<string> {
    if (!this.db) {
      await this.init()
    }

    await this.assertWritableDate(entry.date)

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
        reject(new Error('Journal entries store not available'))
        return
      }

      const transaction = this.db.transaction([JOURNAL_ENTRIES_STORE], 'readwrite')
      const store = transaction.objectStore(JOURNAL_ENTRIES_STORE)
      const request = store.put(entry)

      request.onsuccess = () => resolve(entry.id)
      request.onerror = () => reject(request.error)
    })
  }

  async getJournalEntry(id: string): Promise<JournalEntry | null> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([JOURNAL_ENTRIES_STORE], 'readonly')
      const store = transaction.objectStore(JOURNAL_ENTRIES_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllJournalEntries(): Promise<JournalEntry[]> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([JOURNAL_ENTRIES_STORE], 'readonly')
      const store = transaction.objectStore(JOURNAL_ENTRIES_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = (request.result || []) as JournalEntry[]
        resolve(
          entries.sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime() ||
              b.createdAt.localeCompare(a.createdAt)
          )
        )
      }
      request.onerror = () => reject(request.error)
    })
  }

  async deleteJournalEntry(id: string): Promise<void> {
    const entry = await this.getJournalEntry(id)
    if (!entry) return
    await this.assertWritableDate(entry.date)

    return new Promise((resolve, reject) => {
      if (!this.db || !this.db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
        resolve()
        return
      }

      const transaction = this.db.transaction([JOURNAL_ENTRIES_STORE], 'readwrite')
      const store = transaction.objectStore(JOURNAL_ENTRIES_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveCustomerInvoice(invoice: CustomerInvoice): Promise<string> {
    if (!this.db) await this.init()
    await this.assertWritableDate(invoice.issueDate)
    await this.putRecord(CUSTOMER_INVOICES_STORE, invoice)
    return invoice.id
  }

  async getCustomerInvoice(id: string): Promise<CustomerInvoice | null> {
    if (!this.db) await this.init()
    return this.getRecord<CustomerInvoice>(CUSTOMER_INVOICES_STORE, id)
  }

  async getAllCustomerInvoices(): Promise<CustomerInvoice[]> {
    if (!this.db) await this.init()
    const rows = await this.getAllRecords<CustomerInvoice>(CUSTOMER_INVOICES_STORE)
    return rows.sort(
      (a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime() ||
        b.createdAt.localeCompare(a.createdAt)
    )
  }

  async saveVendorBill(bill: VendorBill): Promise<string> {
    if (!this.db) await this.init()
    await this.assertWritableDate(bill.issueDate)
    await this.putRecord(VENDOR_BILLS_STORE, bill)
    return bill.id
  }

  async getVendorBill(id: string): Promise<VendorBill | null> {
    if (!this.db) await this.init()
    return this.getRecord<VendorBill>(VENDOR_BILLS_STORE, id)
  }

  async getAllVendorBills(): Promise<VendorBill[]> {
    if (!this.db) await this.init()
    const rows = await this.getAllRecords<VendorBill>(VENDOR_BILLS_STORE)
    return rows.sort(
      (a, b) =>
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime() ||
        b.createdAt.localeCompare(a.createdAt)
    )
  }

  async savePaymentAllocation(allocation: PaymentAllocation): Promise<string> {
    if (!this.db) await this.init()
    await this.assertWritableDate(allocation.paymentDate)
    await this.putRecord(PAYMENT_ALLOCATIONS_STORE, allocation)
    return allocation.id
  }

  async getPaymentAllocationsForDocument(
    type: 'ar' | 'ap',
    documentId: string
  ): Promise<PaymentAllocation[]> {
    if (!this.db) await this.init()
    const rows = await this.getAllRecords<PaymentAllocation>(PAYMENT_ALLOCATIONS_STORE)
    return rows
      .filter((row) => row.type === type && row.documentId === documentId)
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
  }

  async getAllPaymentAllocations(): Promise<PaymentAllocation[]> {
    if (!this.db) await this.init()
    return this.getAllRecords<PaymentAllocation>(PAYMENT_ALLOCATIONS_STORE)
  }

  async saveBankReconciliation(session: BankReconciliationSession): Promise<string> {
    if (!this.db) await this.init()
    await this.putRecord(BANK_RECONCILIATIONS_STORE, session)
    return session.id
  }

  async getBankReconciliation(id: string): Promise<BankReconciliationSession | null> {
    if (!this.db) await this.init()
    return this.getRecord<BankReconciliationSession>(BANK_RECONCILIATIONS_STORE, id)
  }

  async getBankReconciliationByPeriod(
    periodId: string
  ): Promise<BankReconciliationSession | null> {
    if (!this.db) await this.init()
    const db = this.db
    if (!db?.objectStoreNames.contains(BANK_RECONCILIATIONS_STORE)) {
      return null
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BANK_RECONCILIATIONS_STORE], 'readonly')
      const store = transaction.objectStore(BANK_RECONCILIATIONS_STORE)
      const index = store.index('periodId')
      const request = index.get(periodId)

      request.onsuccess = () => resolve((request.result as BankReconciliationSession) || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllBankReconciliations(): Promise<BankReconciliationSession[]> {
    if (!this.db) await this.init()
    const rows = await this.getAllRecords<BankReconciliationSession>(BANK_RECONCILIATIONS_STORE)
    return rows.sort((a, b) => b.periodId.localeCompare(a.periodId))
  }

  private async getRecord<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db?.objectStoreNames.contains(storeName)) return null

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null)
        return
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve((request.result as T) || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async getAllRecords<T>(storeName: string): Promise<T[]> {
    if (!this.db?.objectStoreNames.contains(storeName)) return []

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([])
        return
      }

      const transaction = this.db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve((request.result || []) as T[])
      request.onerror = () => reject(request.error)
    })
  }
}

export const indexedDBStorage = new IndexedDBStorage()

/**
 * Check if IndexedDB database exists and list all stores
 * This function can be called from browser console for debugging
 */
export async function checkIndexedDBStatus(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)
    
    request.onsuccess = () => {
      const db = request.result
      console.log('========================================')
      console.log('📊 IndexedDB Status Check')
      console.log('========================================')
      console.log('Database Name:', DB_NAME)
      console.log('Database Version:', db.version)
      console.log('Database Exists:', '✅ YES')
      console.log('')
      console.log('Object Stores:')
      const stores = Array.from(db.objectStoreNames)
      if (stores.length === 0) {
        console.log('  ⚠️ No stores found')
      } else {
        stores.forEach(storeName => {
          console.log(`  ✓ ${storeName}`)
        })
      }
      console.log('')
      console.log('Required Stores:')
      const requiredStores = [
        STORE_NAME,
        CASH_EXPENSES_STORE,
        RECEIPTS_STORE,
        TRANSACTION_RECEIPTS_STORE,
        BUSINESS_PROFILE_STORE,
        USAGE_LOGGING_STORE,
        API_USAGE_STORE,
        API_BALANCE_STORE,
        ASSETS_STORE,
        AUDIT_TRAIL_STORE,
        PERIODS_STORE,
        PERIOD_CARRY_FORWARD_STORE,
        INCOMING_ORDERS_STORE
      ]
      
      const allRequiredStores = [
        ...requiredStores,
        TIMESHEETS_STORE,
        EMPLOYEES_STORE
      ]
      
      allRequiredStores.forEach(storeName => {
        if (stores.includes(storeName)) {
          console.log(`  ✅ ${storeName}: EXISTS`)
        } else {
          console.error(`  ❌ ${storeName}: MISSING`)
        }
      })
      
      console.log('========================================')
      db.close()
      resolve()
    }
    
    request.onerror = () => {
      console.error('========================================')
      console.error('❌ IndexedDB Status Check Failed')
      console.error('========================================')
      console.error('Database Name:', DB_NAME)
      console.error('Database Exists:', '❌ NO')
      console.error('Error:', request.error)
      console.error('========================================')
      reject(request.error)
    }
    
    request.onblocked = () => {
      console.warn('⚠️ Database is blocked. Please close other tabs using this database.')
    }
  })
}

// Make it available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).checkIndexedDBStatus = checkIndexedDBStatus
  console.log('💡 Tip: Run checkIndexedDBStatus() in console to check database status')
}

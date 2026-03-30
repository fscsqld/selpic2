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

const DB_NAME = 'selpic-accounting'
const DB_VERSION = 16 // Increment version to add payslips store
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
const TRANSACTIONS_STORE = 'transactions' // Standalone transactions (e.g., payroll)

class IndexedDBStorage {
  private db: IDBDatabase | null = null

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
            EMPLOYEES_STORE
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
      // Set empty array if transactions is missing
      statement.transactions = []
    }

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
  }): Promise<string> {
    if (!this.db) {
      await this.init()
    }

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

  /**
   * Delete cash expense
   */
  async deleteCashExpense(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
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

  /**
   * Export all data to JSON
   */
  async exportAllData(): Promise<{
    statements: any[]
    cashExpenses: any[]
    receipts: any[]
    businessProfile: any | null
    userMappings: any[]
    paygConfig: any
    directorName: string | null
    apiKey: string | null
    exportDate: string
  }> {
    if (!this.db) {
      await this.init()
    }

    try {
      const [statements, cashExpenses, receipts, businessProfile] = await Promise.all([
        this.getAllStatements(),
        this.getAllCashExpenses(),
        this.getAllReceipts(),
        this.getBusinessProfile(),
      ])

      // Get user mappings from localStorage
      const userMappings = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('user_mappings') || '[]')
        : []

      // Get PAYG config from localStorage
      const paygConfig = typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('payg_config') || 'null')
        : null

      // Get Director name and API key from localStorage
      const directorName = typeof window !== 'undefined'
        ? localStorage.getItem('director_name')
        : null
      const apiKey = typeof window !== 'undefined'
        ? localStorage.getItem('openai_api_key')
        : null

      return {
        statements,
        cashExpenses,
        receipts,
        businessProfile,
        userMappings,
        paygConfig,
        directorName,
        apiKey: apiKey ? '***REDACTED***' : null, // Don't export actual API key
        exportDate: new Date().toISOString(),
      }
    } catch (err) {
      console.error('[IndexedDB] Error exporting data:', err)
      throw err
    }
  }

  /**
   * Import all data from JSON
   */
  async importAllData(data: {
    statements?: any[]
    cashExpenses?: any[]
    receipts?: any[]
    transactionReceipts?: any[]
    businessProfile?: any
    userMappings?: any[]
    paygConfig?: any
    directorName?: string | null
    transactions?: any[]
    openingDirectorLoanBalance?: number | null
  }): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    try {
      // Import statements
      if (data.statements && Array.isArray(data.statements)) {
        for (const statement of data.statements) {
          try {
            const { id, uploadedAt, ...statementData } = statement
            await this.saveStatement(statementData)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import statement:', err)
          }
        }
      }

      // Import cash expenses
      if (data.cashExpenses && Array.isArray(data.cashExpenses)) {
        for (const expense of data.cashExpenses) {
          try {
            const { id, createdAt, source, ...expenseData } = expense
            await this.saveCashExpense(expenseData)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import cash expense:', err)
          }
        }
      }

      // Import receipts (cash expense receipts)
      if (data.receipts && Array.isArray(data.receipts)) {
        for (const receipt of data.receipts) {
          try {
            const { id, uploadedAt, ...receiptData } = receipt
            await this.saveReceiptImage(receiptData)
          } catch (err) {
            console.warn('[IndexedDB] Failed to import receipt:', err)
          }
        }
      }

      // Import transaction receipts (Blob storage)
      if (data.transactionReceipts && Array.isArray(data.transactionReceipts)) {
        for (const receiptMeta of data.transactionReceipts) {
          try {
            // Convert Base64 back to Blob
            if (receiptMeta.imageData) {
              const response = await fetch(receiptMeta.imageData)
              const blob = await response.blob()
              const file = new File([blob], receiptMeta.fileName, { type: receiptMeta.fileType })
              
              // Save using transaction ID
              await this.saveTransactionReceipt(receiptMeta.transactionId, file)
            }
          } catch (err) {
            console.warn('[IndexedDB] Failed to import transaction receipt:', err)
          }
        }
      }

      // Import business profile
      if (data.businessProfile) {
        try {
          await this.saveBusinessProfile(data.businessProfile)
        } catch (err) {
          console.warn('[IndexedDB] Failed to import business profile:', err)
        }
      }

      // Import user mappings to localStorage
      if (data.userMappings && Array.isArray(data.userMappings)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_mappings', JSON.stringify(data.userMappings))
        }
      }

      // Import PAYG config to localStorage
      if (data.paygConfig) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('payg_config', JSON.stringify(data.paygConfig))
        }
      }

      // Import Director name to localStorage
      if (data.directorName) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('director_name', data.directorName)
        }
      }

      // Import transactions to localStorage
      if (data.transactions && Array.isArray(data.transactions)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accounting_transactions', JSON.stringify(data.transactions))
        }
      }

      // Import opening director loan balance
      if (data.openingDirectorLoanBalance !== undefined && data.openingDirectorLoanBalance !== null) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('opening_director_loan_balance', data.openingDirectorLoanBalance.toString())
        }
      }

      console.log('[IndexedDB] Data import completed')
    } catch (err) {
      console.error('[IndexedDB] Error importing data:', err)
      throw err
    }
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
  
  // ============================================
  // Period Management Methods
  // ============================================

  /**
   * Save or update a financial period
   */
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
        resolve()
      }

      request.onerror = () => {
        console.error('[IndexedDB] Error locking period:', request.error)
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
        // Create new period if it doesn't exist
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0) // Last day of month

        toPeriod = {
          id: toPeriodId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
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
   * Delete timesheet
   */
  async deleteTimesheet(id: string): Promise<void> {
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
   * Delete employee
   */
  async deleteEmployee(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
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
   * Save transaction (standalone, e.g., from payroll)
   */
  async saveTransaction(transaction: any): Promise<string> {
    if (!this.db) {
      await this.init()
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
   * Delete payslip and related transactions
   */
  async deletePayslip(id: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }

    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      if (!this.db.objectStoreNames.contains(PAYSLIPS_STORE)) {
        reject(new Error(`Store '${PAYSLIPS_STORE}' does not exist`))
        return
      }

      try {
        // 1. 먼저 관련 거래(Transactions) 삭제
        // Payslip이 승인되면 PAYROLL_${payslipId} 형식의 reference를 가진 거래들이 생성됨
        // 거래 ID 형식: ${payslipId}_entry_${index}
        const allTransactions = await this.getAllTransactions()
        console.log(`[IndexedDB] Total transactions in store: ${allTransactions.length}`)
        console.log(`[IndexedDB] Searching for transactions related to payslip: ${id}`)
        
        const relatedTransactions = allTransactions.filter((tx: any) => {
          const matchReference = tx.reference === `PAYROLL_${id}`
          const matchId = tx.id?.startsWith(`${id}_entry_`)
          const matchReferenceContains = tx.reference?.includes(id)
          const matchPayrollTransaction = tx.isPayrollTransaction && tx.reference?.includes(id)
          
          const isMatch = matchReference || matchId || matchReferenceContains || matchPayrollTransaction
          
          if (isMatch) {
            console.log(`[IndexedDB] Found related transaction:`, {
              id: tx.id,
              reference: tx.reference,
              category: tx.category,
              description: tx.description
            })
          }
          
          return isMatch
        })

        console.log(`[IndexedDB] Found ${relatedTransactions.length} related transactions for payslip ${id}`)

        // 관련 거래 삭제
        if (relatedTransactions.length > 0 && this.db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const deletePromises = relatedTransactions.map((tx: any) => {
            return new Promise<void>((resolveTx, rejectTx) => {
              if (!this.db) {
                rejectTx(new Error('Database not initialized'))
                return
              }

              const txTransaction = this.db.transaction([TRANSACTIONS_STORE], 'readwrite')
              const txStore = txTransaction.objectStore(TRANSACTIONS_STORE)
              const deleteRequest = txStore.delete(tx.id)

              deleteRequest.onsuccess = () => {
                console.log(`[IndexedDB] ✅ Related transaction deleted: ${tx.id} (${tx.category})`)
                resolveTx()
              }

              deleteRequest.onerror = () => {
                console.error(`[IndexedDB] ❌ Error deleting transaction ${tx.id}:`, deleteRequest.error)
                rejectTx(deleteRequest.error)
              }
            })
          })

          await Promise.all(deletePromises)
          console.log(`[IndexedDB] ✅ All ${relatedTransactions.length} related transactions deleted successfully`)
        } else if (relatedTransactions.length === 0) {
          console.warn(`[IndexedDB] ⚠️ No related transactions found for payslip ${id}. This may be normal if payslip was not approved.`)
        }

        // 2. Payslip 삭제
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
      } catch (error) {
        console.error('[IndexedDB] Error in deletePayslip:', error)
        reject(error)
      }
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

'use client'

/**
 * Enhanced Accounting Dashboard with Step 3 Features:
 * - Data Persistence (IndexedDB)
 * - Manual Category Override
 * - Excel Export
 * - Financial Summary
 */

import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Settings, Loader2, Download, History, Save } from 'lucide-react'
import { strings } from '@/lib/i18n/strings'
import { ApiKeyForm } from '@/components/Settings/ApiKeyForm'
import { TransactionTable } from '@/components/TransactionTable'
import { FinancialSummary } from '@/components/FinancialSummary'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { exportToExcel, exportSummary, ExportTransaction } from '@/lib/excel-export'
import { calculateFinancialSummary, FinancialSummary as SummaryType } from '@/lib/utils/financial-summary'
import { BankTransaction } from '@/lib/pdf-parser/types'

interface ClassifiedTransaction extends BankTransaction {
  id?: string
  category?: string
  confidence?: number
  department?: string
  isDirectorsLoan?: boolean
  isPreTradingExpense?: boolean
}

export default function AccountingDashboard() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statementHistory, setStatementHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null)

  // Load API key and initialize IndexedDB on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key')
    if (savedKey) {
      setApiKey(savedKey)
    }

    // Initialize IndexedDB and load history
    indexedDBStorage.init().then(() => {
      loadStatementHistory()
    }).catch((err) => {
      console.error('Failed to initialize IndexedDB:', err)
    })
  }, [])

  // Load statement history
  const loadStatementHistory = async () => {
    try {
      const statements = await indexedDBStorage.getAllStatements()
      setStatementHistory(statements)
    } catch (err) {
      console.error('Failed to load statement history:', err)
    }
  }

  // Load statement from history
  const loadStatement = async (id: string) => {
    try {
      const statement = await indexedDBStorage.getStatement(id)
      if (statement) {
        setTransactions(statement.transactions)
        setCurrentStatementId(id)
        setShowHistory(false)
      }
    } catch (err) {
      console.error('Failed to load statement:', err)
      setError('Failed to load statement from history')
    }
  }

  // Save current transactions to IndexedDB
  const saveCurrentStatement = async (fileName: string, statementData: any) => {
    try {
      const id = await indexedDBStorage.saveStatement({
        bankName: statementData.bankName || 'CBA',
        accountNumber: statementData.accountNumber,
        period: statementData.period || { startDate: '', endDate: '' },
        openingBalance: statementData.openingBalance || 0,
        closingBalance: statementData.closingBalance || 0,
        transactions,
        fileName,
      })
      setCurrentStatementId(id)
      await loadStatementHistory()
      return id
    } catch (err) {
      console.error('Failed to save statement:', err)
      throw err
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!apiKey) {
      setError(strings.errors.apiKeyRequired)
      setShowSettings(true)
      return
    }

    setIsProcessing(true)
    setError(null)
    setProcessingStage('Uploading PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('apiKey', apiKey)

      setProcessingStage('Parsing PDF...')
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error types
        if (response.status === 401) {
          setError('Invalid API key. Please check your OpenAI API key in Settings.')
        } else if (response.status === 429) {
          setError('API rate limit exceeded. Please wait a moment and try again.')
        } else if (response.status === 400 && data.error?.includes('File size')) {
          setError(data.error)
        } else {
          setError(data.error || 'Analysis failed. Check server logs for details.')
        }
        setIsProcessing(false)
        setProcessingStage('')
        return
      }

      setProcessingStage('Saving to database...')

      // Update transactions with classified data
      if (data.transactions && Array.isArray(data.transactions)) {
        // Ensure each transaction has an ID
        const transactionsWithIds = data.transactions.map((tx: any, index: number) => ({
          ...tx,
          id: tx.id || tx.reference || `tx_${Date.now()}_${index}`,
        }))
        setTransactions(transactionsWithIds)

        // Save to IndexedDB
        try {
          await saveCurrentStatement(file.name, data.statement)
        } catch (saveErr) {
          console.error('Failed to save statement:', saveErr)
          // Continue even if save fails
        }
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

  // Handle transaction update (manual category override)
  const handleTransactionUpdate = async (id: string, updates: Partial<ClassifiedTransaction>) => {
    const updatedTransactions = transactions.map((tx) => 
      tx.id === id ? { ...tx, ...updates } : tx
    )
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

  // Export to Excel
  const handleExportExcel = () => {
    const exportData: ExportTransaction[] = transactions.map((tx) => ({
      date: tx.date,
      description: tx.description,
      category: tx.category || 'UNCATEGORIZED',
      debit: tx.debit,
      credit: tx.credit,
      department: tx.department || 'unknown',
      status: tx.isDirectorsLoan ? 'Director\'s Loan' : tx.isPreTradingExpense ? 'Pre-revenue' : 'Normal',
      balance: tx.balance || undefined,
    }))

    exportToExcel(exportData, 'general-ledger')
  }

  // Export summary
  const handleExportSummary = () => {
    const summary = calculateFinancialSummary(transactions)
    exportSummary(summary, 'financial-summary')
  }

  // Calculate financial summary
  const financialSummary = calculateFinancialSummary(transactions)

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {strings.dashboard.title}
          </h1>
          <p className="text-gray-600">
            {strings.dashboard.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <History className="w-5 h-5" />
            History
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            {strings.settings.title}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="mb-8">
          <ApiKeyForm onApiKeySet={(key) => {
            setApiKey(key)
            if (key) {
              setShowSettings(false)
            }
          }} />
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="mb-8 card">
          <h2 className="text-2xl font-semibold mb-4">Statement History</h2>
          {statementHistory.length === 0 ? (
            <p className="text-gray-500">No saved statements found.</p>
          ) : (
            <div className="space-y-2">
              {statementHistory.map((stmt) => (
                <div
                  key={stmt.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadStatement(stmt.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{stmt.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {stmt.bankName} • {stmt.transactions.length} transactions • {new Date(stmt.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        loadStatement(stmt.id)
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Financial Summary */}
      {transactions.length > 0 && (
        <FinancialSummary summary={financialSummary} />
      )}

      {/* PDF Upload Section */}
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-6 h-6" />
          {strings.dashboard.uploadStatement}
        </h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isProcessing || !apiKey}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-md ${
              isProcessing || !apiKey
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
          <p className="mt-4 text-sm text-gray-500">
            {strings.dashboard.supportedBanks}
          </p>
          {!apiKey && (
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

      {/* Export Buttons */}
      {transactions.length > 0 && (
        <div className="mb-8 flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export General Ledger (Excel)
          </button>
          <button
            onClick={handleExportSummary}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Financial Summary (Excel)
          </button>
        </div>
      )}

      {/* Transaction History Table */}
      <div className="card">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-600" />
          {strings.dashboard.transactionHistory}
        </h2>

        <TransactionTable
          transactions={transactions}
          onTransactionUpdate={handleTransactionUpdate}
        />
      </div>
    </div>
  )
}


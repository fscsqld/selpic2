'use client'

import { useState, useEffect } from 'react'
import { AccountingNavbar } from '@/components/Shared/AccountingNavbar'
import { TransactionTable } from '@/components/TransactionTable'
import { BusinessSummaryCards } from '@/components/BusinessSummaryCards'
import { ExpenseCharts } from '@/components/ExpenseCharts'
import { RealTimePLView } from '@/components/RealTimePLView'
import { TaxProvision } from '@/components/TaxProvision'
import { AssetManagement } from '@/components/AssetManagement'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { ClassifiedTransaction } from '@/lib/pdf-parser/types'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { GSTCalculator } from '@/lib/gst-settlement/gst-calculator'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [openingDirectorLoanBalance, setOpeningDirectorLoanBalance] = useState<number>(0)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null)
  const [showDirectorsLoanFilter, setShowDirectorsLoanFilter] = useState(false)
  const [isTransactionHistoryExpanded, setIsTransactionHistoryExpanded] = useState(true)

  useEffect(() => {
    loadTransactions()
    loadOpeningBalance()
    loadExpandedState()
  }, [])

  const loadTransactions = async () => {
    try {
      // Initialize IndexedDB if needed
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
      
      // 🔧 NEW: No ABN 경고 재계산 (등록된 Contractor 확인)
      console.log('[Transactions] Recalculating No ABN warnings for loaded transactions...')
      const { recalculateNoABNWarningsForTransactions } = await import('@/lib/utils/no-abn-warning-recalculator')
      const recalculatedTransactions = await recalculateNoABNWarningsForTransactions(allTransactions)
      
      setTransactions(recalculatedTransactions)
    } catch (error) {
      console.error('Failed to load transactions:', error)
    }
  }

  const loadOpeningBalance = async () => {
    try {
      const profile = await indexedDBStorage.getBusinessProfile()
      if (profile?.openingDirectorLoanBalance) {
        setOpeningDirectorLoanBalance(profile.openingDirectorLoanBalance)
      }
    } catch (error) {
      console.error('Failed to load opening balance:', error)
    }
  }

  const loadExpandedState = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('transactionHistory_expanded')
      setIsTransactionHistoryExpanded(saved === 'true')
    }
  }

  const handleTransactionUpdate = async (updatedTransaction: ClassifiedTransaction) => {
    try {
      await indexedDBStorage.updateTransaction(updatedTransaction.id || '', updatedTransaction)
      await loadTransactions()
    } catch (error) {
      console.error('Failed to update transaction:', error)
    }
  }

  // Calculate business metrics
  const businessMetrics = calculateBusinessMetrics(transactions)
  
  // Calculate GST (using businessMetrics which already includes GST calculations)
  const gstPayable = businessMetrics.gstPayable || 0
  const gstClaimable = businessMetrics.gstClaimable || 0

  // Calculate Director's Loan Balance
  const directorsLoanBalance = transactions
    .filter(tx => tx.department === 'personal' || tx.isDirectorsLoan)
    .reduce((sum, tx) => {
      if (tx.debit && tx.debit > 0) return sum + tx.debit // Personal spending (debit)
      if (tx.credit && tx.credit > 0) return sum - tx.credit // Personal income (credit)
      return sum
    }, openingDirectorLoanBalance)

  const personalSpendingNonDeductible = transactions
    .filter(tx => tx.department === 'personal')
    .reduce((sum, tx) => sum + (tx.debit || 0), 0)

  // Account type (default to company for now)
  const accountType = 'company'

  return (
    <div className="min-h-screen bg-gray-50">
      <AccountingNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrated Ledger</h1>
          <p className="text-gray-600">Biz Intel - View and manage all business transactions</p>
        </div>

        {transactions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">No transactions available. Upload bank statements to view transactions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Summary Cards */}
            <BusinessSummaryCards
              totalIncome={businessMetrics.totalIncome || 0}
              totalExpenses={businessMetrics.totalExpenses || 0}
              netProfit={businessMetrics.netProfit || 0}
              gstPayable={gstPayable}
              gstClaimable={gstClaimable}
              directorsLoanBalance={directorsLoanBalance || 0}
              personalSpendingNonDeductible={personalSpendingNonDeductible || 0}
              openingDirectorLoanBalance={openingDirectorLoanBalance}
              onOpeningBalanceChange={setOpeningDirectorLoanBalance}
              onViewDirectorsLoanDetails={setShowDirectorsLoanFilter}
              showDirectorsLoanFilter={showDirectorsLoanFilter}
              accountType={accountType}
            />

            {/* Real-Time P&L View */}
            <RealTimePLView transactions={transactions} />

            {/* Tax Provision */}
            <TaxProvision transactions={transactions} />

            {/* Expense Charts */}
            <ExpenseCharts
              transactions={transactions}
              onCategoryClick={setSelectedCategoryFilter}
              selectedCategory={selectedCategoryFilter}
              accountType={accountType}
            />

            {/* Asset Management */}
            <AssetManagement 
              transactions={transactions}
              onAssetRegistered={(assetId, transactionId) => {
                console.log('Asset registered:', assetId, 'for transaction:', transactionId)
              }}
            />

            {/* Transaction Table - 통합 장부의 핵심 */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">Transaction History</h2>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                  </span>
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
                >
                  <span className="text-xs font-medium">{isTransactionHistoryExpanded ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              {/* Transaction Table */}
              {isTransactionHistoryExpanded && (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

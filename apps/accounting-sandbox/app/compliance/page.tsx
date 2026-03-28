'use client'

import { useState, useEffect } from 'react'
import { AccountingNavbar } from '@/components/Shared/AccountingNavbar'
import { BASReportView } from '@/components/Reports/BASReportView'
import { GSTSummary } from '@/components/GSTSummary'
import { FBTMonitor } from '@/components/FBTMonitor'
import { TaxDeadlineTracker } from '@/components/TaxDeadlineTracker'
import { CompliancePackageExporter } from '@/components/ComplianceReporting/CompliancePackageExporter'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { ClassifiedTransaction } from '@/lib/pdf-parser/types'
import { GSTCalculator } from '@/lib/gst-settlement/gst-calculator'

export default function CompliancePage() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [openingDirectorLoanBalance, setOpeningDirectorLoanBalance] = useState<number>(0)
  const [gstPayable, setGstPayable] = useState<number>(0)
  const [gstClaimable, setGstClaimable] = useState<number>(0)

  useEffect(() => {
    loadTransactions()
    loadOpeningBalance()
  }, [])

  useEffect(() => {
    if (transactions.length > 0) {
      calculateGSTValues()
    }
  }, [transactions])

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
      
      // 🔧 NEW: No ABN 경고 재계산 (등록된 Contractor 확인)
      console.log('[Compliance] Recalculating No ABN warnings for loaded transactions...')
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

  const calculateGSTValues = () => {
    // Get current period dates
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    
    // Calculate quarter dates
    const quarter = Math.floor(currentMonth / 3) + 1
    const quarterStartMonth = (quarter - 1) * 3
    const startDate = new Date(currentYear, quarterStartMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(currentYear, quarterStartMonth + 3, 0).toISOString().split('T')[0]
    
    const gstCalculator = new GSTCalculator()
    const gstResult = gstCalculator.calculateGSTNet(transactions, startDate, endDate, 'quarterly')
    setGstPayable(gstResult.gstNet > 0 ? gstResult.gstNet : 0)
    setGstClaimable(gstResult.gstNet < 0 ? Math.abs(gstResult.gstNet) : 0)
  }

  const handleTransactionUpdate = async (updatedTransaction: ClassifiedTransaction) => {
    try {
      await indexedDBStorage.updateTransaction(updatedTransaction.id || '', updatedTransaction)
      await loadTransactions()
    } catch (error) {
      console.error('Failed to update transaction:', error)
    }
  }

  const companyInfo = {
    name: COMPANY_LEGAL.companyName,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AccountingNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BAS/GST Compliance</h1>
          <p className="text-gray-600">Business Activity Statement, GST reporting, and tax compliance</p>
        </div>

        {transactions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">No transactions available. Upload bank statements to generate compliance reports.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tax Deadline Tracker */}
            <TaxDeadlineTracker />

            {/* BAS Report View */}
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Business Activity Statement (BAS)</h2>
              <BASReportView
                transactions={transactions.map(tx => ({
                  ...tx,
                  id: tx.id || `${tx.date}_${tx.description}`,
                }))}
                openingDirectorLoanBalance={openingDirectorLoanBalance}
              />
            </div>

            {/* GST Summary */}
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">GST Summary</h2>
              <GSTSummary 
                transactions={transactions}
                gstPayable={gstPayable}
                gstClaimable={gstClaimable}
              />
            </div>

            {/* FBT Monitor */}
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">FBT Monitor</h2>
              <FBTMonitor 
                transactions={transactions} 
                onTransactionUpdate={handleTransactionUpdate}
              />
            </div>

            {/* Compliance Package Exporter */}
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">Compliance Reporting Package</h2>
              <CompliancePackageExporter
                transactions={transactions}
                openingDirectorLoanBalance={openingDirectorLoanBalance}
                companyName={companyInfo.name}
                abn={companyInfo.abn}
                acn={companyInfo.acn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

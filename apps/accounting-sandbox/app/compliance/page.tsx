'use client'

import { useState, useEffect } from 'react'
import { AccountingNavbar } from '@/components/Shared/AccountingNavbar'
import { BASReportView } from '@/components/Reports/BASReportView'
import { GSTSummary } from '@/components/GSTSummary'
import { FBTMonitor } from '@/components/FBTMonitor'
import { TaxDeadlineTracker } from '@/components/TaxDeadlineTracker'
import { CompliancePackageExporter } from '@/components/ComplianceReporting/CompliancePackageExporter'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { loadAllTransactions, syncLegacyTransactionCache } from '@/lib/storage/load-all-transactions'
import { COMPANY_LEGAL } from '@/lib/companyLegal'

interface ClassifiedTransaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance?: number | null
  category?: string
  department?: string
  confidence?: number | string
  isDirectorsLoan?: boolean
  requiresPAYG?: boolean
  isPayrollTransaction?: boolean
  payrollType?: 'employee' | 'director' | 'contractor' | 'partner'
  noABNWarning?: {
    shouldWarn?: boolean
    warningMessage?: string
    withholdingAmount?: number
  }
  gstInfo?: {
    isGSTIncluded: boolean
    gstType: 'INCLUDED' | 'EXCLUDED' | 'FREE'
    gstAmount?: number
    netAmount?: number
  }
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

export default function CompliancePage() {
  const [transactions, setTransactions] = useState<ClassifiedTransaction[]>([])
  const [openingDirectorLoanBalance, setOpeningDirectorLoanBalance] = useState<number>(0)

  useEffect(() => {
    loadTransactions()
    loadOpeningBalance()
  }, [])

  const loadTransactions = async () => {
    try {
      await indexedDBStorage.init()
      const recalculatedTransactions = await loadAllTransactions()
      syncLegacyTransactionCache(recalculatedTransactions)
      setTransactions(recalculatedTransactions as ClassifiedTransaction[])
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

  const handleTransactionUpdate = (
    id: string,
    updates: Partial<ClassifiedTransaction>
  ) => {
    void (async () => {
      try {
        await indexedDBStorage.updateTransaction(id, updates)
        await loadTransactions()
      } catch (error) {
        console.error('Failed to update transaction:', error)
      }
    })()
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
                transactions={transactions as any}
              />
            </div>

            {/* FBT Monitor */}
            <div className="card">
              <h2 className="text-2xl font-semibold mb-4">FBT Monitor</h2>
              <FBTMonitor 
                transactions={transactions as any} 
                onTransactionUpdate={handleTransactionUpdate as any}
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

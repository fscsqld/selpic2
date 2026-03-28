'use client'

import { useMemo, useState, useEffect } from 'react'
import { Download, Printer, Receipt, TrendingUp, TrendingDown, DollarSign, FileImage, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { calculateBusinessMetrics } from '@/lib/utils/business-calculations'
import { getReceipts, getReceiptSourceUrl } from '@/lib/storage/receipt-storage'
import { ReportFooter } from './ReportFooter'

interface Transaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
  department?: string
  isDirectorsLoan?: boolean
}

interface BASReportViewProps {
  transactions: Transaction[]
  openingDirectorLoanBalance: number
  periodStart?: string
  periodEnd?: string
  accountType?: 'individual' | 'company' | 'sole_trader'
}

export function BASReportView({
  transactions,
  openingDirectorLoanBalance,
  periodStart,
  periodEnd,
  accountType = 'company',
}: BASReportViewProps) {
  const [includeReceipts, setIncludeReceipts] = useState(false)
  // Director's Loan Ledger collapse state
  const [isDirectorsLoanLedgerExpanded, setIsDirectorsLoanLedgerExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('directorsLoanLedger_expanded')
      return saved === 'true'
    }
    return true // Default to expanded
  })

  // Save collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('directorsLoanLedger_expanded', isDirectorsLoanLedgerExpanded.toString())
    }
  }, [isDirectorsLoanLedgerExpanded])
  
  // Calculate all metrics using single source of truth
  const metrics = useMemo(() => {
    return calculateBusinessMetrics(transactions, openingDirectorLoanBalance, accountType)
  }, [transactions, openingDirectorLoanBalance, accountType])
  
  // Get all receipts for transactions
  const transactionReceipts = useMemo(() => {
    if (!includeReceipts) return []
    
    const allReceipts = getReceipts()
    return transactions
      .map(tx => {
        const txId = tx.id || `${tx.date}_${tx.description}`
        const receipt = allReceipts[txId]
        if (receipt) {
          return {
            transactionId: txId,
            date: tx.date,
            description: tx.description,
            amount: tx.debit || tx.credit || 0,
            receipt,
          }
        }
        return null
      })
      .filter(Boolean) as Array<{
        transactionId: string
        date: string
        description: string
        amount: number
        receipt: any
      }>
  }, [transactions, includeReceipts])

  // Get date range from transactions if not provided
  const dateRange = useMemo(() => {
    if (periodStart && periodEnd) {
      return { start: periodStart, end: periodEnd }
    }
    if (transactions.length === 0) {
      return null
    }
    const dates = transactions
      .map(tx => new Date(tx.date))
      .sort((a, b) => a.getTime() - b.getTime())
    return {
      start: dates[0].toISOString().split('T')[0],
      end: dates[dates.length - 1].toISOString().split('T')[0],
    }
  }, [transactions, periodStart, periodEnd])

  // Filter Director's Loan transactions (Personal + Repayments)
  const directorsLoanTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        // Personal transactions
        if (tx.department === 'personal') return true
        // Director Loan Repayment
        if (tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT') return true
        // Explicit Director's Loan
        if (tx.category === 'LIABILITY_DIRECTORS_LOAN' || tx.isDirectorsLoan) return true
        return false
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [transactions])

  // Calculate Director's Loan running balance
  const directorsLoanLedger = useMemo(() => {
    let runningBalance = openingDirectorLoanBalance
    return directorsLoanTransactions.map(tx => {
      let balanceChange = 0
      let transactionType = ''

      if (tx.department === 'personal') {
        if (tx.credit) {
          balanceChange = tx.credit
          transactionType = 'Personal Deposit'
          runningBalance += balanceChange
        } else if (tx.debit) {
          balanceChange = -tx.debit
          transactionType = 'Personal Expense'
          runningBalance -= tx.debit
        }
      } else if (tx.category === 'EXPENSE_DIRECTOR_LOAN_REPAYMENT') {
        if (tx.debit) {
          balanceChange = -tx.debit
          transactionType = 'Loan Repayment'
          runningBalance -= tx.debit
        }
      } else if (tx.category === 'LIABILITY_DIRECTORS_LOAN' || tx.isDirectorsLoan) {
        if (tx.credit) {
          balanceChange = tx.credit
          transactionType = 'Loan Injection'
          runningBalance += balanceChange
        } else if (tx.debit) {
          balanceChange = -tx.debit
          transactionType = 'Loan Withdrawal'
          runningBalance -= tx.debit
        }
      }

      return {
        date: tx.date,
        description: tx.description,
        type: transactionType,
        amount: Math.abs(balanceChange),
        isCredit: balanceChange > 0,
        balance: runningBalance,
      }
    })
  }, [directorsLoanTransactions, openingDirectorLoanBalance])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = () => {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>BAS & Financial Summary Report</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; }
            .header { margin-bottom: 30px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary-box { background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-label { font-weight: bold; }
          </style>
        </head>
        <body>
          ${document.getElementById('bas-report-content')?.innerHTML || ''}
        </body>
      </html>
    `
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div id="bas-report-content" className="space-y-8 print:space-y-6">
      {/* Header */}
      <div className="no-print flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">BAS & Financial Summary Report</h1>
          {dateRange && (
            <p className="text-gray-600 mt-2">
              Period: {formatDateAustralian(dateRange.start)} to {formatDateAustralian(dateRange.end)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReceipts}
              onChange={(e) => setIncludeReceipts(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FileImage className="w-4 h-4" />
              Include Receipts
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* GST Summary Section (Company/Sole Trader only - Hidden for Individual Users) */}
      {accountType !== 'individual' && (
        <div className="section">
          <div className="section-title flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            GST Summary (ATO BAS Format)
          </div>
        
        <div className="summary-box">
          <div className="summary-row">
            <span className="summary-label">G1 - Total Sales (Income):</span>
            <span className="font-semibold">{formatCurrency(metrics.totalIncome)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">1A - GST Collected (10% of Sales):</span>
            <span className="font-semibold text-green-600">{formatCurrency(metrics.gstPayable)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">1B - GST Paid (on Expenses):</span>
            <span className="font-semibold text-red-600">{formatCurrency(metrics.gstClaimable)}</span>
          </div>
          <div className="summary-row border-t border-gray-300 pt-2 mt-2">
            <span className="summary-label text-lg">Net GST Payable (1A - 1B):</span>
            <span className={`font-bold text-lg ${
              metrics.gstPayable - metrics.gstClaimable >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(metrics.gstPayable - metrics.gstClaimable)}
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Profit & Loss Summary */}
      <div className="section">
        <div className="section-title flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit & Loss Summary
        </div>
        
        <div className="summary-box">
          <div className="summary-row">
            <span className="summary-label">Total Business Income:</span>
            <span className="font-semibold text-green-600">{formatCurrency(metrics.totalIncome)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Total Business Expenses:</span>
            <span className="font-semibold text-red-600">{formatCurrency(metrics.totalExpenses)}</span>
          </div>
          <div className="summary-row border-t border-gray-300 pt-2 mt-2">
            <span className="summary-label text-lg">Net Profit (Income - Expenses):</span>
            <span className={`font-bold text-lg ${
              metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.netProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* Director's Loan Ledger (Company/Sole Trader only - Hidden for Individual Users) */}
      {accountType !== 'individual' && (
        <div className="section">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Director's Loan Ledger
              {directorsLoanLedger.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                  {directorsLoanLedger.length} {directorsLoanLedger.length === 1 ? 'transaction' : 'transactions'}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsDirectorsLoanLedgerExpanded(!isDirectorsLoanLedgerExpanded)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title={isDirectorsLoanLedgerExpanded ? 'Collapse' : 'Expand'}
            >
              <span className="text-xs font-medium">{isDirectorsLoanLedgerExpanded ? 'Hide' : 'Show'}</span>
              {isDirectorsLoanLedgerExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Collapsible Content */}
          {isDirectorsLoanLedgerExpanded ? (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Opening Balance:</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(openingDirectorLoanBalance)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-900">Closing Balance:</p>
                    <p className={`text-lg font-bold ${
                      metrics.directorsLoanBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(metrics.directorsLoanBalance)}
                    </p>
                  </div>
                </div>
              </div>

              {directorsLoanLedger.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th className="text-left">Description</th>
                        <th className="text-left">Type</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={4} className="text-right">Opening Balance</td>
                        <td className="text-right">{formatCurrency(openingDirectorLoanBalance)}</td>
                      </tr>
                      
                      {directorsLoanLedger.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td>{formatDateAustralian(entry.date)}</td>
                          <td className="max-w-xs truncate" title={entry.description}>
                            {entry.description}
                          </td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs ${
                              entry.isCredit 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className={`text-right font-medium ${
                            entry.isCredit ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.isCredit ? '+' : '-'}{formatCurrency(entry.amount)}
                          </td>
                          <td className={`text-right font-semibold ${
                            entry.balance >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(entry.balance)}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Closing Balance Row */}
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                        <td colSpan={4} className="text-right">Closing Balance</td>
                        <td className={`text-right ${
                          metrics.directorsLoanBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(metrics.directorsLoanBalance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Director's Loan transactions found for this period.</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Opening Balance: <span className="text-blue-600 font-bold">{formatCurrency(openingDirectorLoanBalance)}</span>
                      </p>
                      <p className="text-sm font-medium text-gray-700 mt-1">
                        Closing Balance: <span className={`font-bold ${
                          metrics.directorsLoanBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(metrics.directorsLoanBalance)}
                        </span>
                      </p>
                    </div>
                  </div>
                  {directorsLoanLedger.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Transactions:</span>
                      <span className="text-xs font-medium text-indigo-600">{directorsLoanLedger.length}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setIsDirectorsLoanLedgerExpanded(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View All
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Receipts Section */}
      {includeReceipts && transactionReceipts.length > 0 && (
        <div className="section">
          <div className="section-title flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            Attached Receipts & Evidence
          </div>
          
          <div className="space-y-4">
            {transactionReceipts.map((item, index) => (
              <div key={item.transactionId} className="border border-gray-200 rounded-lg p-4 print:break-inside-avoid">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{item.description}</p>
                    <p className="text-xs text-gray-600">
                      {formatDateAustralian(item.date)} • {formatCurrency(item.amount)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
                <div className="mt-3">
                  {(() => {
                    // Use modular fetching function - supports both Base64 and external URLs
                    const receiptUrl = getReceiptSourceUrl(item.receipt)
                    if (!receiptUrl) return <p className="text-sm text-gray-500">Receipt not available</p>
                    
                    // Check if it's an image or PDF
                    const isImage = receiptUrl.startsWith('data:image/') || 
                                   receiptUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ||
                                   item.receipt.fileType?.startsWith('image/')
                    const isPDF = receiptUrl.startsWith('data:application/pdf') ||
                                 receiptUrl.match(/\.pdf(\?|$)/i) ||
                                 item.receipt.fileType === 'application/pdf'
                    
                    if (isImage) {
                      return (
                        <img
                          src={receiptUrl}
                          alt={`Receipt for ${item.description}`}
                          className="max-w-full h-auto border border-gray-300 rounded print:max-w-md"
                          onError={(e) => {
                            console.warn('[Receipt] Failed to load image:', item.transactionId)
                            e.currentTarget.alt = 'Receipt image failed to load'
                          }}
                        />
                      )
                    } else if (isPDF) {
                      return (
                        <div className="border border-gray-300 rounded p-2 bg-gray-50">
                          <p className="text-sm text-gray-600 mb-2">
                            <FileImage className="w-4 h-4 inline mr-1" />
                            PDF: {item.receipt.fileName}
                          </p>
                          <iframe
                            src={receiptUrl}
                            className="w-full h-96 border border-gray-300 rounded print:hidden"
                            title={`Receipt PDF for ${item.description}`}
                          />
                          <p className="text-xs text-gray-500 mt-2 print:block hidden print:mt-4">
                            [PDF receipt attached - view in digital version]
                          </p>
                        </div>
                      )
                    } else {
                      // Fallback: try to display as image
                      return (
                        <img
                          src={receiptUrl}
                          alt={`Receipt for ${item.description}`}
                          className="max-w-full h-auto border border-gray-300 rounded print:max-w-md"
                          onError={(e) => {
                            console.warn('[Receipt] Failed to load:', item.transactionId)
                            e.currentTarget.alt = 'Receipt failed to load'
                          }}
                        />
                      )
                    }
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Footer */}
      <ReportFooter />

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 20px;
            font-size: 12px;
          }
          .section {
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          table {
            font-size: 11px;
          }
          th, td {
            padding: 4px;
          }
        }
      `}</style>
    </div>
  )
}

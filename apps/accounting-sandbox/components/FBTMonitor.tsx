/**
 * FBT (Fringe Benefits Tax) 모니터링 컴포넌트
 * 
 * FBT 거래를 실시간으로 모니터링하고 위험도별로 표시합니다.
 */

'use client'

import { useMemo, useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, FileText, Download, Calendar, Info, CheckCircle, X } from 'lucide-react'
import { FBTReporter } from '@/lib/fbt-monitoring/fbt-reporter'
import { FBTTransaction } from '@/lib/fbt-monitoring/types'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { calculateFBTDeadline, getCurrentFinancialYearEnd } from '@/lib/tax-deadlines/tracker'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface ClassifiedTransaction {
  id?: string
  date: string
  description: string
  debit: number | null
  credit: number | null
  category?: string
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

interface FBTMonitorProps {
  transactions: ClassifiedTransaction[]
  onTransactionUpdate?: (id: string, updates: Partial<ClassifiedTransaction>) => void
}

export function FBTMonitor({ transactions, onTransactionUpdate }: FBTMonitorProps) {
  const [fbtRegistered, setFbtRegistered] = useState<boolean>(false)
  const [nextFBTDeadline, setNextFBTDeadline] = useState<Date | null>(null)

  // Load FBT registration status and calculate deadline
  useEffect(() => {
    const loadFBTStatus = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile?.fbtRegistered) {
          setFbtRegistered(true)
          const currentFYEnd = getCurrentFinancialYearEnd()
          const deadline = calculateFBTDeadline(currentFYEnd)
          setNextFBTDeadline(deadline)
        }
      } catch (err) {
        console.error('Failed to load FBT status:', err)
      }
    }
    loadFBTStatus()
  }, [])

  // FBT 관련 거래 필터링 및 변환
  // Enhanced risk scoring: Entertainment over $300 = High Risk
  // Filter out business travel (only private portion is FBT reportable)
  const fbtTransactions = useMemo(() => {
    return transactions
      .filter(tx => {
        // Must be FBT relevant
        if (!tx.fbtInfo?.isFBTRelevant) return false
        
        // For travel transactions: Only include if it's FBT reportable (private portion)
        // Business travel is exempt from FBT
        if (tx.fbtInfo.fbtCategory === 'travel') {
          // Only include travel if it's explicitly marked as FBT reportable
          // This means it's private travel or has a private portion
          return tx.fbtInfo.isFBTReportable === true
        }
        
        return true
      })
      .map(tx => {
        const amount = Math.abs(tx.debit || tx.credit || 0)
        let fbtRisk = tx.fbtInfo?.fbtRisk || 'low'
        
        // Enhanced risk scoring logic
        if (tx.fbtInfo?.fbtCategory === 'entertainment' && amount >= 300) {
          fbtRisk = 'high'
        } else if (tx.fbtInfo?.fbtCategory === 'entertainment' && amount >= 200) {
          fbtRisk = 'medium'
        } else if (tx.fbtInfo?.fbtCategory === 'meal' && amount >= 300) {
          fbtRisk = 'high'
        } else if (amount >= 500) {
          // Any FBT transaction over $500 is high risk
          fbtRisk = 'high'
        } else if (amount >= 300 && fbtRisk === 'low') {
          // Any FBT transaction $300-$500 is at least medium risk
          fbtRisk = 'medium'
        }
        
        // Create a unique transaction ID that matches the format used in app/page.tsx
        const txIndex = transactions.indexOf(tx)
        const transactionId = tx.id 
          ? `${tx.id}_${txIndex}` 
          : `${tx.date}_${tx.description}_${txIndex}`
        
        return {
          transactionId,
          date: tx.date,
          description: tx.description,
          amount,
          fbtCategory: tx.fbtInfo?.fbtCategory || 'other',
          fbtRisk,
          isFBTRelevant: true,
          isFBTReportable: tx.fbtInfo?.isFBTReportable || false,
          fbtAmount: tx.fbtInfo?.fbtAmount,
          reasoning: tx.fbtInfo?.reasoning,
          confidence: tx.fbtInfo?.confidence || 0.5,
        } as FBTTransaction
      })
  }, [transactions])

  // 위험도별 그룹화
  const byRisk = useMemo(() => {
    return {
      high: fbtTransactions.filter(tx => tx.fbtRisk === 'high'),
      medium: fbtTransactions.filter(tx => tx.fbtRisk === 'medium'),
      low: fbtTransactions.filter(tx => tx.fbtRisk === 'low'),
    }
  }, [fbtTransactions])

  // 카테고리별 그룹화
  const byCategory = useMemo(() => {
    return {
      meal: fbtTransactions.filter(tx => tx.fbtCategory === 'meal'),
      entertainment: fbtTransactions.filter(tx => tx.fbtCategory === 'entertainment'),
      travel: fbtTransactions.filter(tx => tx.fbtCategory === 'travel'),
      vehicle: fbtTransactions.filter(tx => tx.fbtCategory === 'vehicle'),
      other: fbtTransactions.filter(tx => tx.fbtCategory === 'other'),
    }
  }, [fbtTransactions])

  // 총 FBT 금액 계산
  const totalFBT = useMemo(() => {
    return fbtTransactions
      .filter(tx => tx.isFBTReportable)
      .reduce((sum, tx) => sum + (tx.fbtAmount || 0), 0)
  }, [fbtTransactions])

  // FBT 보고서 생성 및 내보내기
  const handleExportFBTReport = () => {
    const currentDate = new Date()
    const financialYear = currentDate.getMonth() >= 6 
      ? `${currentDate.getFullYear()}-${currentDate.getFullYear() + 1}`
      : `${currentDate.getFullYear() - 1}-${currentDate.getFullYear()}`
    
    const startDate = new Date(currentDate.getFullYear(), 6, 1).toISOString().split('T')[0] // July 1
    const endDate = new Date(currentDate.getFullYear() + 1, 5, 30).toISOString().split('T')[0] // June 30
    
    const reporter = new FBTReporter()
    const report = reporter.generateFBTReport(
      fbtTransactions.filter(tx => tx.isFBTReportable),
      financialYear,
      startDate,
      endDate
    )
    
    const filename = `fbt-report-${financialYear}.xlsx`
    reporter.exportFBTToExcel(report, filename)
  }

  if (fbtTransactions.length === 0) {
    return (
      <div className="card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-semibold">FBT Monitor</h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>No FBT-relevant transactions found</p>
          <p className="text-sm mt-2">FBT applies to benefits provided to employees (meals, entertainment, travel, vehicle, etc.)</p>
        </div>
      </div>
    )
  }

  // Handle marking transaction as not FBT relevant
  const handleMarkAsNotFBT = (transactionId: string) => {
    if (!onTransactionUpdate) return
    
    // The transactionId is already in the correct format (from fbtTransactions mapping)
    // Just update it directly
    onTransactionUpdate(transactionId, {
      fbtInfo: {
        isFBTRelevant: false,
        isFBTReportable: false,
        reasoning: 'Manually excluded by user',
        confidence: 1.0
      }
    })
  }

  // FBT Category tooltips
  const categoryTooltips: Record<string, string> = {
    meal: 'Meals provided to employees (e.g., business lunches, team dinners). FBT applies if over $300 per employee per year or if entertainment-related.',
    entertainment: 'Entertainment expenses for employees (e.g., tickets, events, client entertainment). High risk if over $300. FBT applies to employee benefits.',
    travel: 'Travel and accommodation provided to employees. IMPORTANT: Business travel is EXEMPT from FBT. Only private portion or travel primarily for employee benefit is FBT reportable.',
    vehicle: 'Company vehicles used by employees for private purposes. FBT applies based on vehicle value and private use percentage.',
    other: 'Other employee benefits (e.g., gifts, memberships, subscriptions). FBT applies if over $300 per employee per year.'
  }

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-semibold">FBT Monitor</h2>
        </div>
        <button
          onClick={handleExportFBTReport}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
          title="Export FBT Report to Excel"
        >
          <Download className="w-4 h-4" />
          Export FBT Report
        </button>
      </div>

      {/* FBT Deadline Display */}
      {fbtRegistered && nextFBTDeadline && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Next FBT Lodgement Deadline</h3>
          </div>
          <p className="text-lg font-bold text-blue-700">
            {formatDateAustralian(nextFBTDeadline.toISOString().split('T')[0])}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            FBT returns are due by May 21st following each FBT year end (March 31). The FBT year runs from April 1 to March 31.
          </p>
        </div>
      )}

      {!fbtRegistered && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <Info className="w-4 h-4 inline mr-1" />
            FBT registration is not enabled. Enable it in Settings → Business Profile to see FBT deadlines.
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${(totalFBT === 0 || (byRisk.high.length === 0 && byRisk.medium.length === 0)) ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {/* Safe Badge - Show if Total FBT is $0 or all risks are low */}
        {(totalFBT === 0 || (byRisk.high.length === 0 && byRisk.medium.length === 0)) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Safe</h3>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {totalFBT === 0 ? '$0.00' : formatCurrency(totalFBT)}
            </p>
            <p className="text-sm text-green-700">
              {totalFBT === 0 
                ? 'No FBT liability' 
                : 'Low risk transactions only'}
            </p>
          </div>
        )}

        {byRisk.high.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">High Risk</h3>
            </div>
            <p className="text-2xl font-bold text-red-900">{byRisk.high.length}</p>
            <p className="text-sm text-red-700">
              {formatCurrency(
                byRisk.high.reduce((sum, tx) => sum + (tx.fbtAmount || 0), 0)
              )}
            </p>
          </div>
        )}

        {byRisk.medium.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Medium Risk</h3>
            </div>
            <p className="text-2xl font-bold text-amber-900">{byRisk.medium.length}</p>
            <p className="text-sm text-amber-700">
              {formatCurrency(
                byRisk.medium.reduce((sum, tx) => sum + (tx.fbtAmount || 0), 0)
              )}
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Total FBT</h3>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalFBT)}</p>
          <p className="text-sm text-blue-700">
            {fbtTransactions.filter(tx => tx.isFBTReportable).length} reportable transactions
          </p>
        </div>
      </div>

      {/* High Risk Transactions */}
      {byRisk.high.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            High Risk Transactions ({byRisk.high.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-800 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-800 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-red-800 uppercase">FBT Amount</th>
                  {onTransactionUpdate && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-red-800 uppercase">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byRisk.high.map((tx, index) => (
                  <tr key={`${tx.transactionId}-${index}`} className="hover:bg-red-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDateAustralian(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{tx.fbtCategory}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-red-900">
                      {tx.fbtAmount ? formatCurrency(tx.fbtAmount) : '-'}
                    </td>
                    {onTransactionUpdate && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleMarkAsNotFBT(tx.transactionId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          title="이 거래는 FBT 대상이 아님"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>FBT 제외</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Medium Risk Transactions */}
      {byRisk.medium.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Medium Risk Transactions ({byRisk.medium.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-amber-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-800 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-800 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-amber-800 uppercase">FBT Amount</th>
                  {onTransactionUpdate && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-amber-800 uppercase">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byRisk.medium.map((tx, index) => (
                  <tr key={`${tx.transactionId}-${index}`} className="hover:bg-amber-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDateAustralian(tx.date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{tx.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{tx.fbtCategory}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-amber-900">
                      {tx.fbtAmount ? formatCurrency(tx.fbtAmount) : '-'}
                    </td>
                    {onTransactionUpdate && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleMarkAsNotFBT(tx.transactionId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          title="이 거래는 FBT 대상이 아님"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>FBT 제외</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Category Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(byCategory).map(([category, txs]) => {
            const totalAmount = txs.reduce((sum, tx) => sum + tx.amount, 0)
            const totalFBTAmount = txs.reduce((sum, tx) => sum + (tx.fbtAmount || 0), 0)
            
            return (
              <div key={category} className="bg-gray-50 border border-gray-200 rounded-lg p-3 relative">
                <div className="flex items-center gap-1 mb-1">
                  <p className="text-sm font-medium text-gray-700 capitalize">{category}</p>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {categoryTooltips[category] || 'FBT category information'}
                    </div>
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{txs.length}</p>
                <p className="text-xs text-gray-600">
                  Amount: {formatCurrency(totalAmount)}
                </p>
                {totalFBTAmount > 0 && (
                  <p className="text-xs text-amber-700 font-medium">
                    FBT: {formatCurrency(totalFBTAmount)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Risk Scoring Explanation */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          FBT Risk Scoring Logic
        </h3>
        <ul className="text-xs text-gray-700 space-y-1">
          <li><strong>High Risk:</strong> Entertainment expenses over $300, any FBT transaction over $500, or luxury items</li>
          <li><strong>Medium Risk:</strong> Transactions between $200-$500, or entertainment expenses $200-$300</li>
          <li><strong>Low Risk:</strong> Transactions under $200, clearly business-related, or minor benefits</li>
          <li className="text-gray-600 mt-2">Note: FBT applies to benefits provided to employees, not contractors or external parties.</li>
        </ul>
      </div>
    </div>
  )
}

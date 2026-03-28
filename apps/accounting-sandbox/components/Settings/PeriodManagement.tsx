'use client'

import { useState, useEffect } from 'react'
import { Calendar, Lock, Unlock, ArrowRight, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { FinancialPeriod } from '@/lib/storage/period-types'
import { 
  getCurrentPeriodDates, 
  generatePeriodId,
  closePeriodAndCarryForward,
  createOrUpdatePeriod 
} from '@/lib/period-management/period-utils'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'

export function PeriodManagement() {
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<FinancialPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  useEffect(() => {
    loadPeriods()
  }, [])

  const loadPeriods = async () => {
    try {
      setIsLoading(true)
      const allPeriods = await indexedDBStorage.getAllPeriods()
      setPeriods(allPeriods)
      
      const current = await indexedDBStorage.getCurrentPeriod()
      setCurrentPeriod(current)
      
      if (current) {
        setSelectedPeriodId(current.id)
      } else {
        // Create current period if it doesn't exist
        const { periodId } = getCurrentPeriodDates()
        setSelectedPeriodId(periodId)
      }
    } catch (err) {
      console.error('Failed to load periods:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClosePeriod = async (periodId: string) => {
    if (!confirm(
      `정말로 ${periodId} 기간을 마감하시겠습니까?\n\n` +
      `마감 후에는 해당 기간의 데이터를 수정할 수 없습니다.\n` +
      `Closing Balance는 자동으로 다음 기간의 Opening Balance로 이월됩니다.`
    )) {
      return
    }

    try {
      setIsClosing(true)
      const { nextPeriod } = await closePeriodAndCarryForward(periodId, 'owner')
      
      alert(
        `기간 마감이 완료되었습니다!\n\n` +
        `다음 기간(${nextPeriod.id})이 생성되었으며,\n` +
        `Closing Balance가 자동으로 이월되었습니다.`
      )
      
      await loadPeriods()
    } catch (err: any) {
      console.error('Failed to close period:', err)
      alert(`기간 마감 실패: ${err.message}`)
    } finally {
      setIsClosing(false)
    }
  }

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">Period Management</h2>
        </div>
      </div>

      {/* Current Period Status */}
      {currentPeriod && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Current Period: {currentPeriod.id}</span>
            </div>
            {currentPeriod.isLocked ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                <Lock className="w-4 h-4" />
                Locked
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium flex items-center gap-1">
                <Unlock className="w-4 h-4" />
                Active
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <p className="text-gray-600">Period</p>
              <p className="font-semibold">
                {formatDateAustralian(currentPeriod.startDate)} ~ {formatDateAustralian(currentPeriod.endDate)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Opening Director Loan</p>
              <p className="font-semibold">{formatCurrency(currentPeriod.openingDirectorLoanBalance)}</p>
            </div>
            <div>
              <p className="text-gray-600">Closing Director Loan</p>
              <p className="font-semibold">{formatCurrency(currentPeriod.closingDirectorLoanBalance)}</p>
            </div>
            <div>
              <p className="text-gray-600">Accounts Receivable</p>
              <p className="font-semibold text-orange-600">
                {formatCurrency(currentPeriod.accountsReceivable)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Period Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Period
        </label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          {periods.length === 0 && (
            <option value="">No periods available</option>
          )}
          {periods.map(period => (
            <option key={period.id} value={period.id}>
              {period.id} {period.isLocked ? '(Locked)' : '(Active)'}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Period Details */}
      {selectedPeriod && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Period Details: {selectedPeriod.id}</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold">{formatDateAustralian(selectedPeriod.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-semibold">{formatDateAustralian(selectedPeriod.endDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold">
                {selectedPeriod.isLocked ? (
                  <span className="text-red-600 flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Locked
                  </span>
                ) : (
                  <span className="text-green-600 flex items-center gap-1">
                    <Unlock className="w-4 h-4" />
                    Active
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Opening Director Loan</p>
              <p className="font-semibold">{formatCurrency(selectedPeriod.openingDirectorLoanBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Closing Director Loan</p>
              <p className="font-semibold">{formatCurrency(selectedPeriod.closingDirectorLoanBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Opening Cash</p>
              <p className="font-semibold">{formatCurrency(selectedPeriod.openingCashBalance)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Closing Cash</p>
              <p className="font-semibold">{formatCurrency(selectedPeriod.closingCashBalance)}</p>
            </div>
          </div>

          {selectedPeriod.accountsReceivable > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Accounts Receivable (미수금)</p>
              </div>
              <p className="text-lg font-semibold text-orange-700">
                {formatCurrency(selectedPeriod.accountsReceivable)}
              </p>
              {selectedPeriod.carriedForwardReceivables.length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {selectedPeriod.carriedForwardReceivables.length} transaction(s) carried forward
                </p>
              )}
            </div>
          )}

          {selectedPeriod.isLocked && selectedPeriod.lockedAt && (
            <div className="mb-4 p-3 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-600">
                Locked at: {formatDateAustralian(selectedPeriod.lockedAt)}
              </p>
              {selectedPeriod.lockedBy && (
                <p className="text-sm text-gray-600">
                  Locked by: {selectedPeriod.lockedBy}
                </p>
              )}
            </div>
          )}

          {/* Close Period Button */}
          {!selectedPeriod.isLocked && (
            <button
              onClick={() => handleClosePeriod(selectedPeriod.id)}
              disabled={isClosing}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Closing Period...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Close Period & Carry Forward
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* All Periods List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">All Periods</h3>
        <div className="space-y-2">
          {periods.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No periods created yet</p>
          ) : (
            periods.map(period => (
              <div
                key={period.id}
                className={`p-3 border rounded-md flex items-center justify-between ${
                  period.isLocked ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {period.isLocked ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <p className="font-semibold">{period.id}</p>
                    <p className="text-sm text-gray-600">
                      {formatDateAustralian(period.startDate)} ~ {formatDateAustralian(period.endDate)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    Director Loan: {formatCurrency(period.closingDirectorLoanBalance)}
                  </p>
                  {period.accountsReceivable > 0 && (
                    <p className="text-xs text-orange-600">
                      Receivables: {formatCurrency(period.accountsReceivable)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

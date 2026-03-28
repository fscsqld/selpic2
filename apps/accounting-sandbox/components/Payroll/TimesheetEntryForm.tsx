/**
 * Timesheet Entry Form - 직원용 타임시트 입력 컴포넌트
 * 
 * 직원이 본인의 근무 시간을 입력하고 제출하는 폼
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Send, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { Timesheet, TimesheetEntry } from '@/src/features/payroll/timesheet-types'
import { calculateTotalHours, calculateGrossPay, validateTimesheet } from '@/src/features/payroll/timesheet-calculator'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'
import { getSSOToken } from '@/lib/sso-handler'

interface TimesheetEntryFormProps {
  employeeId?: string
  employeeName?: string
  hourlyRate?: number
  onSave?: (timesheet: Timesheet) => void
  onSubmitted?: (timesheet: Timesheet) => void
}

export function TimesheetEntryForm({ 
  employeeId, 
  employeeName, 
  hourlyRate = 0,
  onSave,
  onSubmitted 
}: TimesheetEntryFormProps) {
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(employeeId || '')
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string>(employeeName || '')
  const [currentHourlyRate, setCurrentHourlyRate] = useState<number>(hourlyRate)
  const [payPeriod, setPayPeriod] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    {
      id: `entry_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      hours: 0,
      hourlyRate: hourlyRate || 0,
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // SSO 토큰에서 직원 정보 가져오기 (직원이 본인 정보를 입력한 경우)
  useEffect(() => {
    const token = getSSOToken()
    if (token && !currentEmployeeId) {
      // SSO 토큰에서 직원 ID 추출 (실제로는 employeeId를 별도로 관리해야 함)
      // 여기서는 username을 employeeId로 사용
      setCurrentEmployeeId(token.username)
      setCurrentEmployeeName(token.username)
    }
  }, [])

  // 총 시간 및 급여 계산
  const { totalHours, totalRegularHours, totalOvertimeHours } = calculateTotalHours(entries)
  const grossPay = calculateGrossPay(entries, currentHourlyRate)

  // 엔트리 추가
  const handleAddEntry = () => {
    setEntries([
      ...entries,
      {
        id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        hours: 0,
        hourlyRate: currentHourlyRate || 0,
      },
    ])
  }

  // 엔트리 삭제
  const handleDeleteEntry = (id: string) => {
    if (entries.length === 1) {
      alert('최소 하나의 엔트리가 필요합니다.')
      return
    }
    setEntries(entries.filter(entry => entry.id !== id))
  }

  // 엔트리 업데이트
  const handleUpdateEntry = (id: string, updates: Partial<TimesheetEntry>) => {
    setEntries(
      entries.map(entry =>
        entry.id === id ? { ...entry, ...updates } : entry
      )
    )
  }

  // 초안 저장
  const handleSaveDraft = async () => {
    if (!currentEmployeeId || !currentEmployeeName) {
      setError('직원 정보를 입력해주세요.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const timesheet: Timesheet = {
        id: `timesheet_${Date.now()}`,
        employeeId: currentEmployeeId,
        employeeName: currentEmployeeName,
        payPeriod,
        entries,
        status: 'draft',
        totalHours,
        totalRegularHours,
        totalOvertimeHours,
        grossPay,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await indexedDBStorage.saveTimesheet(timesheet)

      setSuccess('초안이 저장되었습니다.')
      setTimeout(() => setSuccess(null), 3000)

      if (onSave) {
        onSave(timesheet)
      }
    } catch (err) {
      console.error('Failed to save timesheet:', err)
      setError('저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  // 제출
  const handleSubmit = async () => {
    if (!currentEmployeeId || !currentEmployeeName) {
      setError('직원 정보를 입력해주세요.')
      return
    }

    const timesheet: Timesheet = {
      id: `timesheet_${Date.now()}`,
      employeeId: currentEmployeeId,
      employeeName: currentEmployeeName,
      payPeriod,
      entries,
      status: 'submitted',
      totalHours,
      totalRegularHours,
      totalOvertimeHours,
      grossPay,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const validation = validateTimesheet(timesheet)
    if (!validation.isValid) {
      setError(validation.errors.join(', '))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await indexedDBStorage.saveTimesheet(timesheet)

      setSuccess('타임시트가 제출되었습니다. 관리자 승인을 기다려주세요.')
      setTimeout(() => setSuccess(null), 5000)

      // 폼 초기화
      setEntries([
        {
          id: `entry_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          hours: 0,
          hourlyRate: currentHourlyRate || 0,
        },
      ])

      if (onSubmitted) {
        onSubmitted(timesheet)
      }
    } catch (err) {
      console.error('Failed to submit timesheet:', err)
      setError('제출에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Timesheet Entry
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isSubmitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
          {success}
        </div>
      )}

      {/* Employee Info */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-3">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              type="text"
              value={currentEmployeeId}
              onChange={(e) => setCurrentEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name *
            </label>
            <input
              type="text"
              value={currentEmployeeName}
              onChange={(e) => setCurrentEmployeeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={currentHourlyRate}
              onChange={(e) => {
                const rate = parseFloat(e.target.value) || 0
                setCurrentHourlyRate(rate)
                // 모든 엔트리의 시급 업데이트
                setEntries(entries.map(entry => ({ ...entry, hourlyRate: rate })))
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Pay Period */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Pay Period
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={payPeriod.start}
              onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={payPeriod.end}
              onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Timesheet Entries */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Time Entries</h3>
          <button
            onClick={handleAddEntry}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="p-4 bg-white border border-gray-200 rounded-md"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-700">Entry #{index + 1}</span>
                {entries.length > 1 && (
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => handleUpdateEntry(entry.id, { date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours *
                  </label>
                  <input
                    type="number"
                    value={entry.hours || ''}
                    onChange={(e) => handleUpdateEntry(entry.id, { hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    step="0.25"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    value={entry.hourlyRate || ''}
                    onChange={(e) => handleUpdateEntry(entry.id, { hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <input
                      type="checkbox"
                      checked={entry.isOvertime || false}
                      onChange={(e) => handleUpdateEntry(entry.id, { isOvertime: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    Overtime
                  </label>
                  {entry.isOvertime && (
                    <input
                      type="number"
                      value={entry.overtimeMultiplier || 1.5}
                      onChange={(e) => handleUpdateEntry(entry.id, { overtimeMultiplier: parseFloat(e.target.value) || 1.5 })}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      step="0.1"
                      min="1"
                      placeholder="1.5"
                    />
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={entry.description || ''}
                  onChange={(e) => handleUpdateEntry(entry.id, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Work description..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Hours</p>
            <p className="text-lg font-bold text-gray-900">{totalHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Regular Hours</p>
            <p className="text-lg font-bold text-blue-600">{totalRegularHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Overtime Hours</p>
            <p className="text-lg font-bold text-orange-600">{totalOvertimeHours.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Gross Pay</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(grossPay)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

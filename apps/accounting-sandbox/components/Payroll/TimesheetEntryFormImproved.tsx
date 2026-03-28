/**
 * Timesheet Entry Form (Improved) - 요일별 입력, 2주 페이 기준
 * 
 * 직원이 요일별로 근무 시간을 쉽게 입력할 수 있는 개선된 폼
 */

'use client'

import { useState, useEffect } from 'react'
import { Save, Send, Calendar, Clock, DollarSign, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Timesheet, TimesheetEntry } from '@/src/features/payroll/timesheet-types'
import { calculateTotalHours, calculateGrossPay, validateTimesheet } from '@/src/features/payroll/timesheet-calculator'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'
import { getCurrentEmployeeSession } from '@/lib/auth/employee-auth'

interface TimesheetEntryFormImprovedProps {
  employeeId?: string
  employeeName?: string
  hourlyRate?: number
  payFrequency?: 'weekly' | 'fortnightly' | 'monthly'
  onSave?: (timesheet: Timesheet) => void
  onSubmitted?: (timesheet: Timesheet) => void
}

export function TimesheetEntryFormImproved({ 
  employeeId, 
  employeeName, 
  hourlyRate = 0,
  payFrequency = 'fortnightly',
  onSave,
  onSubmitted 
}: TimesheetEntryFormImprovedProps) {
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(employeeId || '')
  const [currentEmployeeName, setCurrentEmployeeName] = useState<string>(employeeName || '')
  const [currentHourlyRate, setCurrentHourlyRate] = useState<number>(hourlyRate)
  const [payPeriodStart, setPayPeriodStart] = useState<string>('')
  const [payPeriodEnd, setPayPeriodEnd] = useState<string>('')
  const [weekEntries, setWeekEntries] = useState<{ [key: string]: number }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 직원 세션에서 정보 가져오기
  useEffect(() => {
    const session = getCurrentEmployeeSession()
    if (session) {
      setCurrentEmployeeId(session.employeeId)
      setCurrentEmployeeName(session.employeeName)
      if (session.employeeData?.hourlyRate) {
        setCurrentHourlyRate(session.employeeData.hourlyRate)
      }
    } else if (employeeId && employeeName) {
      setCurrentEmployeeId(employeeId)
      setCurrentEmployeeName(employeeName)
    }
  }, [employeeId, employeeName])

  // 2주 페이 기준으로 기간 자동 설정
  useEffect(() => {
    if (payFrequency === 'fortnightly' && !payPeriodStart) {
      const today = new Date()
      const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...
      
      // 가장 가까운 월요일 찾기
      const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 1 - dayOfWeek)
      const monday = new Date(today)
      monday.setDate(today.getDate() + daysToMonday)
      
      // 2주 전 월요일 (페이 시작일)
      const payStart = new Date(monday)
      payStart.setDate(monday.getDate() - 14)
      
      // 페이 종료일 (2주 후 일요일)
      const payEnd = new Date(monday)
      payEnd.setDate(monday.getDate() - 1)
      
      setPayPeriodStart(payStart.toISOString().split('T')[0])
      setPayPeriodEnd(payEnd.toISOString().split('T')[0])
    }
  }, [payFrequency, payPeriodStart])

  // 페이 기간의 모든 날짜 생성
  const generatePayPeriodDates = (): Date[] => {
    if (!payPeriodStart || !payPeriodEnd) return []
    
    const start = new Date(payPeriodStart)
    const end = new Date(payPeriodEnd)
    const dates: Date[] = []
    
    const current = new Date(start)
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return dates
  }

  const dates = generatePayPeriodDates()

  // 요일 이름
  const getDayName = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[date.getDay()]
  }

  // 요일별 시간 업데이트
  const handleHoursChange = (dateStr: string, hours: number) => {
    setWeekEntries({
      ...weekEntries,
      [dateStr]: hours || 0,
    })
  }

  // 엔트리 배열로 변환
  const entriesToArray = (): TimesheetEntry[] => {
    return dates
      .filter(date => {
        const dateStr = date.toISOString().split('T')[0]
        return weekEntries[dateStr] && weekEntries[dateStr] > 0
      })
      .map(date => {
        const dateStr = date.toISOString().split('T')[0]
        return {
          id: `entry_${dateStr}`,
          date: dateStr,
          hours: weekEntries[dateStr] || 0,
          hourlyRate: currentHourlyRate || 0,
        }
      })
  }

  const entries = entriesToArray()
  const { totalHours, totalRegularHours, totalOvertimeHours } = calculateTotalHours(entries)
  const grossPay = calculateGrossPay(entries, currentHourlyRate)

  // 초안 저장
  const handleSaveDraft = async () => {
    if (!currentEmployeeId || !currentEmployeeName) {
      setError('Employee information is required')
      return
    }

    if (!payPeriodStart || !payPeriodEnd) {
      setError('Pay period is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const timesheet: Timesheet = {
        id: `timesheet_${Date.now()}`,
        employeeId: currentEmployeeId,
        employeeName: currentEmployeeName,
        payPeriod: {
          start: payPeriodStart,
          end: payPeriodEnd,
        },
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

      setSuccess('Draft saved successfully')
      setTimeout(() => setSuccess(null), 3000)

      if (onSave) {
        onSave(timesheet)
      }
    } catch (err) {
      console.error('Failed to save timesheet:', err)
      setError('Failed to save draft. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // 제출
  const handleSubmit = async () => {
    if (!currentEmployeeId || !currentEmployeeName) {
      setError('Employee information is required')
      return
    }

    if (!payPeriodStart || !payPeriodEnd) {
      setError('Pay period is required')
      return
    }

    if (entries.length === 0) {
      setError('Please enter at least one day with hours')
      return
    }

    const timesheet: Timesheet = {
      id: `timesheet_${Date.now()}`,
      employeeId: currentEmployeeId,
      employeeName: currentEmployeeName,
      payPeriod: {
        start: payPeriodStart,
        end: payPeriodEnd,
      },
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

      setSuccess('Timesheet submitted successfully. Waiting for manager approval.')
      setTimeout(() => setSuccess(null), 5000)

      // 폼 초기화
      setWeekEntries({})

      if (onSubmitted) {
        onSubmitted(timesheet)
      }
    } catch (err) {
      console.error('Failed to submit timesheet:', err)
      setError('Failed to submit timesheet. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 페이 기간 변경
  const adjustPayPeriod = (weeks: number) => {
    if (!payPeriodStart || !payPeriodEnd) return
    
    const start = new Date(payPeriodStart)
    const end = new Date(payPeriodEnd)
    
    start.setDate(start.getDate() + (weeks * 7))
    end.setDate(end.getDate() + (weeks * 7))
    
    setPayPeriodStart(start.toISOString().split('T')[0])
    setPayPeriodEnd(end.toISOString().split('T')[0])
    setWeekEntries({}) // 기간 변경 시 엔트리 초기화
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Timesheet Entry (2-Week Pay Period)
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
              Employee ID
            </label>
            <input
              type="text"
              value={currentEmployeeId}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Name
            </label>
            <input
              type="text"
              value={currentEmployeeName}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($)
            </label>
            <input
              type="number"
              value={currentHourlyRate}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Pay Period */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pay Period (2 Weeks)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => adjustPayPeriod(-2)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Previous Period"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => adjustPayPeriod(2)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Next Period"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={payPeriodStart}
              onChange={(e) => {
                setPayPeriodStart(e.target.value)
                setWeekEntries({})
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={payPeriodEnd}
              onChange={(e) => {
                setPayPeriodEnd(e.target.value)
                setWeekEntries({})
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Weekly Timesheet Grid */}
      {dates.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Daily Hours Entry
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {dates.map((date) => {
              const dateStr = date.toISOString().split('T')[0]
              const dayName = getDayName(date)
              const isWeekend = date.getDay() === 0 || date.getDay() === 6
              
              return (
                <div
                  key={dateStr}
                  className={`p-3 border rounded-md ${
                    isWeekend
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-600 mb-1">
                    {dayName}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {formatDateAustralian(dateStr).split('/')[0]}/{formatDateAustralian(dateStr).split('/')[1]}
                  </div>
                  <input
                    type="number"
                    value={weekEntries[dateStr] || ''}
                    onChange={(e) => handleHoursChange(dateStr, parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    step="0.25"
                    min="0"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

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

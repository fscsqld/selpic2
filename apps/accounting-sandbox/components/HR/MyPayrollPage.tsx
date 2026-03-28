/**
 * My Payroll Page - 직원용 급여 페이지
 * 
 * 직원이 로그인하면 이 페이지로 이동하여 본인의 타임시트를 입력할 수 있음
 */

'use client'

import { useState, useEffect } from 'react'
import { LogOut, User, Clock, DollarSign, FileText, AlertCircle, Lock, Trash2, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { getCurrentEmployeeSession, logoutEmployee, EmployeeSession } from '@/lib/auth/employee-auth'
import { TimesheetEntryForm } from '@/components/Payroll/TimesheetEntryForm'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { Timesheet } from '@/src/features/payroll/timesheet-types'
import { EmployeePasswordManagement } from './EmployeePasswordManagement'
import { EmployeePayslipHistory } from './EmployeePayslipHistory'

interface MyPayrollPageProps {
  onLogout?: () => void
}

export function MyPayrollPage({ onLogout }: MyPayrollPageProps) {
  const [session, setSession] = useState<EmployeeSession | null>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [myTimesheets, setMyTimesheets] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTimesheetHistoryExpanded, setIsTimesheetHistoryExpanded] = useState(() => {
    // localStorage에서 이전 상태 불러오기 (기본값: true - 펼친 상태)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('myTimesheetHistory_expanded')
      return saved !== 'false' // 기본값은 true
    }
    return true
  })

  const handleLogout = () => {
    logoutEmployee()
    if (onLogout) {
      onLogout()
    }
  }

  // 자동 로그아웃 타이머 (30분 비활성 시)
  useEffect(() => {
    if (!session || !employee) return

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30분 (밀리초)
    let inactivityTimer: NodeJS.Timeout | null = null
    let lastActivityTime = Date.now()

    // 활동 감지 함수
    const resetTimer = () => {
      lastActivityTime = Date.now()
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      
      inactivityTimer = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          console.log('[MyPayrollPage] Auto logout: 30 minutes of inactivity detected')
          alert('You have been automatically logged out due to 30 minutes of inactivity. Please log in again.')
          handleLogout()
        }
      }, INACTIVITY_TIMEOUT)
    }

    // 초기 타이머 시작
    resetTimer()

    // 사용자 활동 이벤트 리스너
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      resetTimer()
    }

    // 이벤트 리스너 등록
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [session, employee, onLogout])

  useEffect(() => {
    loadEmployeeData()
  }, [])

  // 타임시트 상태 업데이트 이벤트 리스너 (관리자가 승인/거부/삭제 시 실시간 반영)
  useEffect(() => {
    const handleTimesheetStatusUpdate = (event: CustomEvent) => {
      const { timesheetId, status } = event.detail || {}
      console.log('[MyPayrollPage] Timesheet status updated:', { timesheetId, status })
      
      // 삭제된 경우 특별 처리
      if (status === 'deleted') {
        console.log('[MyPayrollPage] Timesheet deleted by administrator:', timesheetId)
        // 타임시트 목록 새로고침 (삭제된 항목 제거)
        loadEmployeeData()
      } else {
        // 승인/거부된 경우 목록 새로고침 (상태 업데이트 반영)
        loadEmployeeData()
      }
    }

    window.addEventListener('timesheetStatusUpdated', handleTimesheetStatusUpdate as EventListener)
    
    return () => {
      window.removeEventListener('timesheetStatusUpdated', handleTimesheetStatusUpdate as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // loadEmployeeData는 안정적인 함수이므로 의존성 배열에서 제외

  const loadEmployeeData = async () => {
    setIsLoading(true)
    try {
      const currentSession = getCurrentEmployeeSession()
      if (!currentSession) {
        // 로그인되지 않음
        return
      }

      setSession(currentSession)
      const currentEmployeeId = currentSession.employeeId

      // 🔒 보안: 현재 세션의 employeeId만 사용 (강제 필터링)
      await indexedDBStorage.init()
      const emp = await indexedDBStorage.getEmployeeByEmployeeId(currentEmployeeId)
      
      if (!emp) {
        console.error('[MyPayrollPage] Employee not found:', currentEmployeeId)
        return
      }

      // 🔒 보안: 직원 ID 검증 (타인의 정보 접근 방지)
      if (emp.employeeId !== currentEmployeeId) {
        console.error('[MyPayrollPage] Security violation: Employee ID mismatch')
        return
      }

      setEmployee(emp)

      // 🔒 보안: 내 타임시트만 로드 (강제 필터링)
      const allTimesheets = await indexedDBStorage.getAllTimesheets()
      const myTimesheets = allTimesheets.filter(
        (ts: any) => ts.employeeId === currentEmployeeId
      ) as Timesheet[]
      
      setMyTimesheets(
        myTimesheets.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      )
    } catch (err) {
      console.error('Failed to load employee data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTimesheetSubmitted = () => {
    // 타임시트 제출 후 목록 새로고침
    loadEmployeeData()
  }

  const handleDeleteTimesheet = async (timesheetId: string, status: string) => {
    // 삭제 확인 메시지 (상태에 따라 다르게 표시)
    let confirmMessage = ''
    if (status === 'draft') {
      confirmMessage = '⚠️ WARNING: Are you sure you want to delete this draft timesheet?\n\nOnce deleted, this data cannot be recovered. This action cannot be undone.'
    } else if (status === 'approved') {
      confirmMessage = '⚠️ WARNING: This timesheet has been APPROVED. Deleting it may affect payroll records.\n\nOnce deleted, this data cannot be recovered. Are you sure you want to delete this approved timesheet? This action cannot be undone.'
    } else if (status === 'submitted') {
      confirmMessage = '⚠️ WARNING: This timesheet has been SUBMITTED for approval.\n\nOnce deleted, this data cannot be recovered. Are you sure you want to delete it? This action cannot be undone.'
    } else {
      confirmMessage = `⚠️ WARNING: Are you sure you want to delete this ${status} timesheet?\n\nOnce deleted, this data cannot be recovered. This action cannot be undone.`
    }

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await indexedDBStorage.deleteTimesheet(timesheetId)
      console.log('[MyPayrollPage] Timesheet deleted:', timesheetId, 'Status:', status)
      // 목록 새로고침
      loadEmployeeData()
    } catch (err) {
      console.error('Failed to delete timesheet:', err)
      alert('Failed to delete timesheet. Please try again.')
    }
  }

  // 접기/펼치기 상태를 localStorage에 저장
  const toggleTimesheetHistory = () => {
    const newState = !isTimesheetHistoryExpanded
    setIsTimesheetHistoryExpanded(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('myTimesheetHistory_expanded', newState.toString())
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || !employee) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Not Logged In</h3>
          <p className="text-gray-500">Please log in to access your payroll information.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">{employee.name}</h2>
              <p className="text-gray-600">Employee ID: {employee.employeeId}</p>
              {employee.hourlyRate && (
                <p className="text-sm text-gray-500 mt-1">
                  Hourly Rate: {formatCurrency(employee.hourlyRate)}/hr
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Timesheet Entry Form */}
      <div className="card">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Enter Work Hours
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter your work hours for the pay period and submit for approval
          </p>
        </div>
        <TimesheetEntryForm
          employeeId={employee.employeeId}
          employeeName={employee.name}
          hourlyRate={employee.hourlyRate || 0}
          onSubmitted={handleTimesheetSubmitted}
        />
      </div>

      {/* Change Password */}
      <div className="card">
        <EmployeePasswordManagement
          employeeId={employee.employeeId}
          employeeName={employee.name}
          isSelfChange={true}
          onPasswordChanged={() => {
            // 비밀번호 변경 후 아무 작업 없음 (성공 메시지 표시됨)
          }}
        />
      </div>

      {/* My Timesheets History */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            My Timesheet History
            {myTimesheets.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {myTimesheets.length} {myTimesheets.length === 1 ? 'timesheet' : 'timesheets'}
              </span>
            )}
          </h3>
          {myTimesheets.length > 0 && (
            <button
              onClick={toggleTimesheetHistory}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title={isTimesheetHistoryExpanded ? 'Hide' : 'Show'}
            >
              <span className="text-xs font-medium">{isTimesheetHistoryExpanded ? 'Hide' : 'Show'}</span>
              {isTimesheetHistoryExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Collapsible Content */}
        {isTimesheetHistoryExpanded && (
          <>
            {myTimesheets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No timesheets submitted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTimesheets.map((timesheet) => (
                  <div
                    key={timesheet.id}
                    className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {formatDateAustralian(timesheet.payPeriod.start)} - {formatDateAustralian(timesheet.payPeriod.end)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            timesheet.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : timesheet.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : timesheet.status === 'submitted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {timesheet.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Total Hours:</span>
                            <span className="ml-2 font-medium">{timesheet.totalHours.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Regular:</span>
                            <span className="ml-2 font-medium text-blue-600">{timesheet.totalRegularHours.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Overtime:</span>
                            <span className="ml-2 font-medium text-orange-600">{timesheet.totalOvertimeHours.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Gross Pay:</span>
                            <span className="ml-2 font-medium text-green-600">{formatCurrency(timesheet.grossPay)}</span>
                          </div>
                        </div>
                        {timesheet.submittedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted: {formatDateAustralian(timesheet.submittedAt)}
                          </p>
                        )}
                        {timesheet.approvedAt && timesheet.approvedBy && (
                          <p className="text-xs text-green-600 mt-2">
                            ✓ Approved by {timesheet.approvedBy} on {formatDateAustralian(timesheet.approvedAt)}
                          </p>
                        )}
                        {timesheet.rejectedAt && (
                          <p className="text-xs text-red-600 mt-2">
                            ✗ Rejected on {formatDateAustralian(timesheet.rejectedAt)}
                          </p>
                        )}
                        {(timesheet.rejectedReason || timesheet.rejectionReason) && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                                <p className="text-sm text-red-700 whitespace-pre-wrap">
                                  {timesheet.rejectedReason || timesheet.rejectionReason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Delete Button - 모든 상태의 타임시트 삭제 가능 (상태에 따라 경고 메시지 다름) */}
                      <button
                        onClick={() => handleDeleteTimesheet(timesheet.id, timesheet.status)}
                        className={`ml-4 p-2 rounded-md transition-colors ${
                          timesheet.status === 'approved' || timesheet.status === 'submitted'
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={
                          timesheet.status === 'draft'
                            ? 'Delete this draft timesheet'
                            : timesheet.status === 'approved'
                            ? 'Delete approved timesheet (Warning: May affect payroll records)'
                            : 'Delete this timesheet'
                        }
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* My Payslip History */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6" />
          My Payslip History
        </h3>
        {employee && (
          <EmployeePayslipHistory employee={employee} />
        )}
      </div>
    </div>
  )
}

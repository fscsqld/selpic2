/**
 * Timesheet Approval - 관리자용 타임시트 승인 컴포넌트
 * 
 * 관리자가 직원이 제출한 타임시트를 확인하고 승인/거부하는 컴포넌트
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, Calendar, Clock, DollarSign, User, AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { Timesheet } from '@/src/features/payroll/timesheet-types'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'
import { getSSOToken } from '@/lib/sso-handler'
import { calculatePayroll } from '@/src/features/payroll/calculator'
import { approvePayrollAndCreateTransactions } from '@/src/features/payroll/bookkeeping'
import { Payslip } from '@/src/features/payroll/types'

export function TimesheetApproval() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('submitted')
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [pendingRejectionId, setPendingRejectionId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // SSO 토큰 확인 (관리자 권한)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const token = getSSOToken()
    if (token && (token.role === 'admin' || token.role === 'super_admin')) {
      setIsAdmin(true)
    }
    loadTimesheets()
  }, [filterStatus])

  const loadTimesheets = async () => {
    setIsLoading(true)
    try {
      await indexedDBStorage.init()
      const allTimesheets = await indexedDBStorage.getAllTimesheets()
      
      // 필터링
      let filtered = allTimesheets
      if (filterStatus !== 'all') {
        filtered = allTimesheets.filter((ts: any) => ts.status === filterStatus)
      }

      // 정렬 (최신순)
      filtered.sort((a: any, b: any) => 
        new Date(b.submittedAt || b.createdAt || 0).getTime() - 
        new Date(a.submittedAt || a.createdAt || 0).getTime()
      )

      setTimesheets(filtered as Timesheet[])
    } catch (err) {
      console.error('Failed to load timesheets:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (timesheetId: string) => {
    if (!isAdmin) {
      alert('Administrator privileges required.')
      return
    }

    const token = getSSOToken()
    if (!token) {
      alert('Login required.')
      return
    }

    setIsProcessing(true)
    try {
      // 1. 타임시트 정보 로드
      await indexedDBStorage.init()
      const timesheet = await indexedDBStorage.getTimesheet(timesheetId)
      if (!timesheet) {
        alert('Timesheet not found.')
        return
      }

      // 2. 직원 정보 로드
      const employee = await indexedDBStorage.getEmployeeByEmployeeId(timesheet.employeeId)
      if (!employee) {
        alert('Employee not found.')
        return
      }

      // 3. Payroll 계산 (PAYG, Superannuation 포함)
      const payrollResult = calculatePayroll(employee, timesheet.grossPay)
      
      console.log('[TimesheetApproval] Payroll calculated:', {
        grossPay: payrollResult.grossPay,
        taxWithheld: payrollResult.taxWithheld,
        superannuation: payrollResult.superannuation,
        netPay: payrollResult.netPay
      })

      // 4. Payslip 생성
      const payslip: Payslip = {
        id: `payslip_${timesheetId}_${Date.now()}`,
        employeeId: employee.id || employee.employeeId,
        employeeName: employee.name,
        payPeriod: {
          start: timesheet.payPeriod.start,
          end: timesheet.payPeriod.end
        },
        grossPay: payrollResult.grossPay,
        taxWithheld: payrollResult.taxWithheld,
        superannuation: payrollResult.superannuation,
        netPay: payrollResult.netPay,
        payDate: new Date().toISOString(),
        status: 'approved',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // 5. 거래 기록 생성 (Wages Expense, PAYG Liability, Superannuation Liability, Cash)
      const transactions = approvePayrollAndCreateTransactions(payslip, employee)
      
      // 6. 거래 기록 저장
      for (const transaction of transactions) {
        // 거래에 직원 정보 추가 (PAYG Summary에서 사용)
        if (transaction.isPayrollTransaction) {
          transaction.payrollType = employee.type as 'employee' | 'director' | 'contractor' | 'partner'
          transaction.matchedEmployee = {
            id: employee.id || employee.employeeId,
            name: employee.name,
            employeeId: employee.employeeId,
            type: employee.type
          }
          transaction.matchConfidence = 'high'
        }
        await indexedDBStorage.saveTransaction(transaction)
      }
      
      console.log('[TimesheetApproval] Transactions saved:', transactions.length)

      // 7. Payslip 저장 (IndexedDB에 저장)
      await indexedDBStorage.savePayslip(payslip)
      console.log('[TimesheetApproval] Payslip saved:', payslip.id)

      // 8. 타임시트 상태 업데이트
      await indexedDBStorage.updateTimesheetStatus(
        timesheetId,
        'approved',
        token.username
      )
      
      alert(`Timesheet has been approved.\n\nPayroll processed:\n- Gross Pay: ${formatCurrency(payrollResult.grossPay)}\n- PAYG Withheld: ${formatCurrency(payrollResult.taxWithheld)}\n- Superannuation: ${formatCurrency(payrollResult.superannuation)}\n- Net Pay: ${formatCurrency(payrollResult.netPay)}\n\nJournal entries created successfully.`)
      
      // 직원 페이지에 승인 상태 업데이트 알림 (이벤트 발생)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('timesheetStatusUpdated', {
          detail: { timesheetId, status: 'approved', payslipId: payslip.id }
        }))
        
        // 거래 기록 새로고침 알림 (PAYG Summary 업데이트를 위해)
        window.dispatchEvent(new CustomEvent('transactionsUpdated', {
          detail: { source: 'timesheetApproval', timesheetId }
        }))
      }
      
      await loadTimesheets()
      if (selectedTimesheet?.id === timesheetId) {
        setSelectedTimesheet(null)
      }
    } catch (err) {
      console.error('Failed to approve timesheet:', err)
      alert(`Failed to approve timesheet: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!pendingRejectionId) return

    const token = getSSOToken()
    if (!token) {
      alert('Login required.')
      return
    }

    setIsProcessing(true)
    try {
      await indexedDBStorage.updateTimesheetStatus(
        pendingRejectionId,
        'rejected',
        token.username,
        rejectionReason
      )
      
      alert('Timesheet has been rejected.')
      
      // 직원 페이지에 거부 상태 업데이트 알림 (이벤트 발생)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('timesheetStatusUpdated', {
          detail: { timesheetId: pendingRejectionId, status: 'rejected' }
        }))
      }
      
      setShowRejectionModal(false)
      setPendingRejectionId(null)
      setRejectionReason('')
      await loadTimesheets()
      if (selectedTimesheet?.id === pendingRejectionId) {
        setSelectedTimesheet(null)
      }
    } catch (err) {
      console.error('Failed to reject timesheet:', err)
      alert('Failed to reject timesheet.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (timesheetId: string) => {
    if (!isAdmin) {
      alert('Administrator privileges required.')
      return
    }

    const token = getSSOToken()
    if (!token) {
      alert('Login required.')
      return
    }

    // 타임시트 정보 가져오기 (상태 확인용)
    try {
      await indexedDBStorage.init()
      const timesheet = await indexedDBStorage.getTimesheet(timesheetId)
      
      if (!timesheet) {
        alert('Timesheet not found.')
        return
      }

      // 상태에 따른 경고 메시지
      let confirmMessage = ''
      if (timesheet.status === 'approved') {
        confirmMessage = '⚠️ WARNING: This timesheet has been APPROVED. Deleting it may affect payroll records.\n\nOnce deleted, this data cannot be recovered. Are you sure you want to delete this approved timesheet? This action cannot be undone.'
      } else if (timesheet.status === 'submitted') {
        confirmMessage = '⚠️ WARNING: This timesheet has been SUBMITTED for approval.\n\nOnce deleted, this data cannot be recovered. Are you sure you want to delete it? This action cannot be undone.'
      } else if (timesheet.status === 'rejected') {
        confirmMessage = '⚠️ WARNING: Are you sure you want to delete this rejected timesheet?\n\nOnce deleted, this data cannot be recovered. This action cannot be undone.'
      } else {
        confirmMessage = `⚠️ WARNING: Are you sure you want to delete this ${timesheet.status} timesheet?\n\nOnce deleted, this data cannot be recovered. This action cannot be undone.`
      }

      if (!confirm(confirmMessage)) {
        return
      }

      setIsProcessing(true)
      await indexedDBStorage.deleteTimesheet(timesheetId)
      
      alert('Timesheet has been deleted successfully.')
      
      // 직원 페이지에 삭제 알림 (이벤트 발생)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('timesheetStatusUpdated', {
          detail: { timesheetId, status: 'deleted' }
        }))
      }
      
      await loadTimesheets()
      if (selectedTimesheet?.id === timesheetId) {
        setSelectedTimesheet(null)
      }
    } catch (err) {
      console.error('Failed to delete timesheet:', err)
      alert('Failed to delete timesheet. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const openRejectionModal = (timesheetId: string) => {
    setPendingRejectionId(timesheetId)
    setShowRejectionModal(true)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
    }
    return badges[status as keyof typeof badges] || badges.draft
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Administrator Privileges Required</h3>
          <p className="text-gray-600">Only administrators can approve timesheets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          Timesheet Approval
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="submitted">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading timesheets...</p>
        </div>
      ) : timesheets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No timesheets found</p>
          <p className="text-sm mt-1">
            {filterStatus === 'submitted' 
              ? 'No pending timesheets for approval'
              : 'No timesheets match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {timesheets.map((timesheet) => (
            <div
              key={timesheet.id}
              className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{timesheet.employeeName}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(timesheet.status)}`}>
                      {timesheet.status.toUpperCase()}
                    </span>
                    {timesheet.employeeId && (
                      <span className="text-sm text-gray-600">ID: {timesheet.employeeId}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Pay Period</p>
                      <p className="font-medium">
                        {formatDateAustralian(timesheet.payPeriod.start)} - {formatDateAustralian(timesheet.payPeriod.end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Hours</p>
                      <p className="font-medium">{timesheet.totalHours.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Regular Hours</p>
                      <p className="font-medium text-blue-600">{timesheet.totalRegularHours.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Gross Pay</p>
                      <p className="font-medium text-green-600">{formatCurrency(timesheet.grossPay)}</p>
                    </div>
                  </div>

                  {timesheet.submittedAt && (
                    <p className="text-xs text-gray-500">
                      Submitted: {formatDateAustralian(timesheet.submittedAt)}
                    </p>
                  )}
                  {timesheet.approvedAt && timesheet.approvedBy && (
                    <p className="text-xs text-green-600">
                      Approved by {timesheet.approvedBy} on {formatDateAustralian(timesheet.approvedAt)}
                    </p>
                  )}
                  {timesheet.rejectedAt && timesheet.rejectedReason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="text-red-800 font-medium">Rejected</p>
                      <p className="text-red-700">{timesheet.rejectedReason}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => setSelectedTimesheet(timesheet)}
                    className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-2 border border-blue-200"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">View</span>
                  </button>
                  {timesheet.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleApprove(timesheet.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                        title="Approve Timesheet"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Approve</span>
                      </button>
                      <button
                        onClick={() => openRejectionModal(timesheet.id)}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                        title="Reject Timesheet"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">Reject</span>
                      </button>
                    </>
                  )}
                  {/* Delete Button - 모든 상태의 타임시트 삭제 가능 (관리자만) */}
                  <button
                    onClick={() => handleDelete(timesheet.id)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    title="Delete Timesheet"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timesheet Detail Modal */}
      {selectedTimesheet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Timesheet Details</h3>
                <button
                  onClick={() => setSelectedTimesheet(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md">
                  <h4 className="font-semibold mb-2">Employee Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedTimesheet.employeeName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ID:</span>
                      <span className="ml-2 font-medium">{selectedTimesheet.employeeId}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-md">
                  <h4 className="font-semibold mb-2">Pay Period</h4>
                  <p className="text-sm">
                    {formatDateAustralian(selectedTimesheet.payPeriod.start)} - {formatDateAustralian(selectedTimesheet.payPeriod.end)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Time Entries</h4>
                  <div className="space-y-2">
                    {selectedTimesheet.entries.map((entry, index) => (
                      <div key={entry.id} className="p-3 bg-gray-50 rounded-md">
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Date:</span>
                            <span className="ml-2 font-medium">{formatDateAustralian(entry.date)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Hours:</span>
                            <span className="ml-2 font-medium">{entry.hours.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Rate:</span>
                            <span className="ml-2 font-medium">{formatCurrency(entry.hourlyRate || 0)}</span>
                          </div>
                          <div>
                            {entry.isOvertime && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                Overtime (×{entry.overtimeMultiplier || 1.5})
                              </span>
                            )}
                          </div>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mt-2">{entry.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-md">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="ml-2 font-bold">{selectedTimesheet.totalHours.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Regular:</span>
                      <span className="ml-2 font-bold text-blue-600">{selectedTimesheet.totalRegularHours.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Overtime:</span>
                      <span className="ml-2 font-bold text-orange-600">{selectedTimesheet.totalOvertimeHours.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Gross Pay:</span>
                      <span className="ml-2 font-bold text-green-600">{formatCurrency(selectedTimesheet.grossPay)}</span>
                    </div>
                  </div>
                </div>

                {selectedTimesheet.status === 'submitted' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        handleApprove(selectedTimesheet.id)
                        setSelectedTimesheet(null)
                      }}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        openRejectionModal(selectedTimesheet.id)
                        setSelectedTimesheet(null)
                      }}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                )}
                {/* Delete Button in Modal - 모든 상태의 타임시트 삭제 가능 */}
                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleDelete(selectedTimesheet.id)
                      setSelectedTimesheet(null)
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Reject Timesheet</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectionModal(false)
                  setPendingRejectionId(null)
                  setRejectionReason('')
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

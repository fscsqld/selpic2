/**
 * Employee Payslip History - 페이스립 기록 탭
 */

'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Calendar, DollarSign, Trash2 } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'
import { generatePayslipPDF, preparePayslipPDFData } from '@/src/features/payroll/payslip-generator'

interface EmployeePayslipHistoryProps {
  employee: Employee
}

interface PayslipRecord {
  id: string
  employeeId: string
  employeeName: string
  payPeriod: {
    start: string
    end: string
  }
  grossPay: number
  taxWithheld: number
  superannuation: number
  netPay: number
  payDate: string
  status: string
  createdAt: string
}

export function EmployeePayslipHistory({ employee }: EmployeePayslipHistoryProps) {
  const [payslips, setPayslips] = useState<PayslipRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companyInfo, setCompanyInfo] = useState<{
    name: string
    abn: string
    acn?: string
    address?: string
  }>({
    name: COMPANY_LEGAL.companyName,
    abn: COMPANY_LEGAL.abn,
    acn: COMPANY_LEGAL.acn,
  })

  useEffect(() => {
    loadPayslipHistory()
    loadCompanyInfo()
  }, [employee.id])

  const loadCompanyInfo = async () => {
    try {
      const profile = await indexedDBStorage.getBusinessProfile()
      if (profile) {
        setCompanyInfo({
          name: profile.companyName || COMPANY_LEGAL.companyName,
          abn: profile.abn || COMPANY_LEGAL.abn,
          acn: profile.acn || COMPANY_LEGAL.acn,
          address: profile.address,
        })
      }
    } catch (err) {
      console.error('Failed to load company info:', err)
    }
  }

  const loadPayslipHistory = async () => {
    setIsLoading(true)
    try {
      await indexedDBStorage.init()
      
      // Payslips store에서 직접 로드
      const payslipsData = await indexedDBStorage.getAllPayslips(employee.id || employee.employeeId)
      
      const payslipRecords: PayslipRecord[] = payslipsData.map((ps: any) => ({
        id: ps.id,
        employeeId: ps.employeeId,
        employeeName: ps.employeeName,
        payPeriod: ps.payPeriod,
        grossPay: ps.grossPay,
        taxWithheld: ps.taxWithheld || 0,
        superannuation: ps.superannuation || 0,
        netPay: ps.netPay || ps.grossPay,
        payDate: ps.payDate || ps.createdAt,
        status: ps.status,
        createdAt: ps.createdAt,
      }))

      setPayslips(payslipRecords.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (err) {
      console.error('Failed to load payslip history:', err)
      // Fallback: timesheets에서 승인된 항목을 페이스립으로 간주
      try {
        const timesheets = await indexedDBStorage.getAllTimesheets(employee.id || employee.employeeId, 'approved')
        const payslipRecords: PayslipRecord[] = timesheets.map((ts: any) => ({
          id: ts.id,
          employeeId: ts.employeeId,
          employeeName: ts.employeeName,
          payPeriod: ts.payPeriod,
          grossPay: ts.grossPay,
          taxWithheld: 0,
          superannuation: 0,
          netPay: ts.grossPay,
          payDate: ts.approvedAt || ts.submittedAt || ts.createdAt,
          status: ts.status,
          createdAt: ts.createdAt,
        }))
        setPayslips(payslipRecords.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      } catch (fallbackErr) {
        console.error('Failed to load payslip history (fallback):', fallbackErr)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const formatPayDate = (dateString: string): string => {
    if (!dateString) return 'N/A'
    
    try {
      // ISO 날짜 문자열 처리 (예: "2026-01-17T02:30:35.840Z")
      if (dateString.includes('T')) {
        const date = new Date(dateString)
        if (!isNaN(date.getTime())) {
          return formatDateAustralian(date.toISOString().split('T')[0])
        }
      }
      
      // 일반 날짜 문자열 처리
      return formatDateAustralian(dateString)
    } catch (error) {
      console.error('[Payslip History] Error formatting pay date:', dateString, error)
      return dateString
    }
  }

  const handleDownloadPayslip = async (payslip: PayslipRecord) => {
    try {
      // Load full employee data
      const fullEmployee = await indexedDBStorage.getEmployeeByEmployeeId(employee.employeeId)
      if (!fullEmployee) {
        alert('Employee information not found.')
        return
      }

      // Prepare payslip data
      const payslipData = {
        id: payslip.id,
        employeeId: fullEmployee.id || fullEmployee.employeeId,
        employeeName: payslip.employeeName,
        payPeriod: payslip.payPeriod,
        grossPay: payslip.grossPay,
        taxWithheld: payslip.taxWithheld,
        superannuation: payslip.superannuation,
        netPay: payslip.netPay,
        payDate: payslip.payDate,
        status: payslip.status as 'draft' | 'approved' | 'paid',
        createdAt: payslip.createdAt,
        updatedAt: payslip.createdAt,
      }

      // Generate PDF
      const pdfData = preparePayslipPDFData(payslipData, fullEmployee, companyInfo)
      const html = generatePayslipPDF(pdfData)

      // Open in new window for printing/downloading
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        
        // Auto-trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print()
        }, 500)
      } else {
        alert('Please allow pop-ups to download the payslip.')
      }
    } catch (error) {
      console.error('Failed to download payslip:', error)
      alert('Failed to download payslip. Please try again.')
    }
  }

  const handleDeletePayslip = async (payslipId: string, status: string) => {
    // 삭제 확인 메시지 (상태에 따라 다르게 표시)
    let confirmMessage = ''
    if (status === 'approved' || status === 'paid') {
      confirmMessage = '⚠️ WARNING: This payslip has been APPROVED/PAID. Deleting it may affect payroll records and accounting entries.\n\nOnce deleted, this data cannot be recovered. Are you sure you want to delete this payslip? This action cannot be undone.'
    } else {
      confirmMessage = '⚠️ WARNING: Are you sure you want to delete this payslip?\n\nOnce deleted, this data cannot be recovered. This action cannot be undone.'
    }

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      console.log('[EmployeePayslipHistory] 🗑️ Deleting payslip:', payslipId)
      await indexedDBStorage.deletePayslip(payslipId)
      console.log('[EmployeePayslipHistory] ✅ Payslip deleted successfully:', payslipId, 'Status:', status)
      
      // 목록 새로고침
      await loadPayslipHistory()
      
      // 거래 기록 새로고침 알림 (Real-Time P&L View 업데이트를 위해)
      // 약간의 지연을 두어 IndexedDB 삭제가 완전히 완료되도록 함
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          console.log('[EmployeePayslipHistory] 📢 Dispatching transactionsUpdated event for Real-Time P&L View refresh')
          window.dispatchEvent(new CustomEvent('transactionsUpdated', {
            detail: { source: 'payslipDeletion', payslipId }
          }))
          console.log('[EmployeePayslipHistory] ✅ Event dispatched, waiting for Real-Time P&L View to update...')
        }
      }, 500) // 500ms 지연
      
      alert('Payslip and related transactions deleted successfully.\n\nPlease refresh the main dashboard to see the updated Real-Time P&L View.')
    } catch (err) {
      console.error('[EmployeePayslipHistory] ❌ Failed to delete payslip:', err)
      alert('Failed to delete payslip. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payslip history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Payslip History
        </h3>
      </div>

      {payslips.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No payslips found</p>
          <p className="text-sm text-gray-500 mt-2">
            Payslips will appear here after payroll processing
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      Pay Period: {formatDateAustralian(payslip.payPeriod.start)} - {formatDateAustralian(payslip.payPeriod.end)}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      payslip.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : payslip.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payslip.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Gross Pay:</span>
                      <span className="ml-2 font-medium">{formatCurrency(payslip.grossPay)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">PAYG Withholding:</span>
                      <span className="ml-2 font-medium text-red-600">-{formatCurrency(payslip.taxWithheld)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Net Pay:</span>
                      <span className="ml-2 font-medium text-green-600">{formatCurrency(payslip.netPay)}</span>
                    </div>
                    {payslip.superannuation > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-600 text-xs">Superannuation (Employer Contribution):</span>
                        <span className="ml-2 font-medium text-blue-600 text-xs">{formatCurrency(payslip.superannuation)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pay Date: {formatPayDate(payslip.payDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPayslip(payslip)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download Payslip"
                    disabled={!payslip || payslip.status !== 'approved'}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeletePayslip(payslip.id, payslip.status)}
                    className={`p-2 rounded transition-colors ${
                      payslip.status === 'approved' || payslip.status === 'paid'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={
                      payslip.status === 'approved' || payslip.status === 'paid'
                        ? 'Delete approved/paid payslip (Warning: May affect payroll records)'
                        : 'Delete this payslip'
                    }
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

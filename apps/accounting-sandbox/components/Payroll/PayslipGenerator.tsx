/**
 * Payslip Generator Component
 * 
 * 호주 표준 Payslip PDF 생성 및 미리보기
 */

'use client'

import { useState, useEffect } from 'react'
import { Download, Printer, FileText, User, Calendar, DollarSign, Loader2 } from 'lucide-react'
import { generatePayslipPDF, preparePayslipPDFData } from '@/src/features/payroll'
import { Payslip } from '@/src/features/payroll/types'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { COMPANY_LEGAL } from '@/lib/companyLegal'
import { formatDateAustralian } from '@/lib/utils/date-format'
import { formatCurrency } from '@/lib/utils/currency-format'

interface PayslipGeneratorProps {
  payslip?: Payslip
  employee?: Employee
  onSave?: (payslip: Payslip) => void
}

export function PayslipGenerator({ payslip, employee, onSave }: PayslipGeneratorProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employee || null)
  const [employees, setEmployees] = useState<Employee[]>([])
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
  const [payPeriod, setPayPeriod] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [grossPay, setGrossPay] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load company info
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        const profile = await indexedDBStorage.getBusinessProfile()
        if (profile) {
          setCompanyInfo({
            name: profile.companyName || COMPANY_LEGAL.companyName,
            abn: profile.abn || COMPANY_LEGAL.abn,
            acn: profile.acn || COMPANY_LEGAL.acn,
          })
        }
      } catch (err) {
        console.error('Failed to load company info:', err)
      }
    }
    loadCompanyInfo()
  }, [])

  // Load employees (placeholder - 실제로는 IndexedDB에서 로드)
  useEffect(() => {
    // TODO: Load employees from IndexedDB
    // For now, use provided employee or empty
    if (employee) {
      setSelectedEmployee(employee)
    }
  }, [employee])

  const handleGeneratePDF = () => {
    if (!selectedEmployee) {
      alert('Please select an employee')
      return
    }

    setIsGenerating(true)
    try {
      const payslipData: Payslip = {
        id: payslip?.id || `payslip_${Date.now()}`,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        payPeriod,
        grossPay,
        taxWithheld: 0, // Will be calculated
        superannuation: 0, // Will be calculated
        netPay: 0, // Will be calculated
        payDate: new Date().toISOString(),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const pdfData = preparePayslipPDFData(payslipData, selectedEmployee, companyInfo)
      const html = generatePayslipPDF(pdfData)

      // Open in new window for printing
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
      }
    } catch (err) {
      console.error('Failed to generate payslip:', err)
      alert('Failed to generate payslip PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = () => {
    handleGeneratePDF()
  }

  const handlePrint = () => {
    handleGeneratePDF()
    // Print will be handled by the opened window
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Payslip Generator
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={!selectedEmployee || isGenerating}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedEmployee || isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Employee Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Employee
          </label>
          {selectedEmployee ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="font-medium">{selectedEmployee.name}</p>
              {selectedEmployee.employeeId && (
                <p className="text-sm text-gray-600">ID: {selectedEmployee.employeeId}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No employee selected</p>
          )}
        </div>

        {/* Pay Period */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Period Start
            </label>
            <input
              type="date"
              value={payPeriod.start}
              onChange={(e) => setPayPeriod({ ...payPeriod, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Period End
            </label>
            <input
              type="date"
              value={payPeriod.end}
              onChange={(e) => setPayPeriod({ ...payPeriod, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Gross Pay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            Gross Pay
          </label>
          <input
            type="number"
            value={grossPay}
            onChange={(e) => setGrossPay(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            step="0.01"
          />
        </div>

        {/* Company Info Display */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-900 mb-1">Company Information</p>
          <p className="text-sm text-blue-800">{companyInfo.name}</p>
          <p className="text-xs text-blue-700">ABN: {companyInfo.abn}</p>
          {companyInfo.acn && (
            <p className="text-xs text-blue-700">ACN: {companyInfo.acn}</p>
          )}
        </div>
      </div>
    </div>
  )
}

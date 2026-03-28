/**
 * Payroll Approval Component
 * 
 * 급여 승인 및 자동 분개 처리
 */

'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, DollarSign, Users, Calendar, AlertTriangle, Loader2 } from 'lucide-react'
import { approvePayrollAndCreateTransactions } from '@/src/features/payroll'
import { calculatePayroll } from '@/src/features/payroll'
import { Payslip } from '@/src/features/payroll/types'
import { Employee } from '@/src/shared/types/employee'
import { Transaction } from '@/src/shared/types/transaction'
import { formatCurrency } from '@/lib/utils/currency-format'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface PayrollApprovalProps {
  payslip: Payslip
  employee: Employee
  onApprove?: (transactions: Transaction[]) => void
  onReject?: () => void
}

export function PayrollApproval({ payslip, employee, onApprove, onReject }: PayrollApprovalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [calculatedPayroll, setCalculatedPayroll] = useState<{
    grossPay: number
    taxWithheld: number
    superannuation: number
    netPay: number
  } | null>(null)

  // Calculate payroll when component mounts or payslip changes
  useEffect(() => {
    if (payslip.grossPay > 0) {
      const result = calculatePayroll(employee, payslip.grossPay)
      setCalculatedPayroll({
        grossPay: result.grossPay,
        taxWithheld: result.taxWithheld,
        superannuation: result.superannuation,
        netPay: result.netPay,
      })
    }
  }, [payslip, employee])

  const handleApprove = async () => {
    if (!calculatedPayroll) return

    setIsProcessing(true)
    try {
      // Update payslip with calculated values
      const updatedPayslip: Payslip = {
        ...payslip,
        taxWithheld: calculatedPayroll.taxWithheld,
        superannuation: calculatedPayroll.superannuation,
        netPay: calculatedPayroll.netPay,
      }

      // Create transactions
      const transactions = approvePayrollAndCreateTransactions(updatedPayslip, employee)

      if (onApprove) {
        onApprove(transactions)
      }

      alert('✅ Payroll approved and journal entries created successfully!')
    } catch (err) {
      console.error('Failed to approve payroll:', err)
      alert('❌ Failed to approve payroll. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = () => {
    if (window.confirm('Are you sure you want to reject this payroll?')) {
      if (onReject) {
        onReject()
      }
    }
  }

  if (!calculatedPayroll) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Calculating payroll...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Payroll Approval
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Approve & Create Entries
          </button>
        </div>
      </div>

      {/* Employee Info */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-2">Employee Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>
            <span className="ml-2 font-medium">{employee.name}</span>
          </div>
          {employee.employeeId && (
            <div>
              <span className="text-gray-600">Employee ID:</span>
              <span className="ml-2 font-medium">{employee.employeeId}</span>
            </div>
          )}
          <div>
            <span className="text-gray-600">Type:</span>
            <span className="ml-2 font-medium capitalize">{employee.type}</span>
          </div>
          <div>
            <span className="text-gray-600">Super Rate:</span>
            <span className="ml-2 font-medium">{(employee.superannuationRate * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Pay Period */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Pay Period
        </h3>
        <div className="text-sm text-blue-800">
          {formatDateAustralian(payslip.payPeriod.start)} to {formatDateAustralian(payslip.payPeriod.end)}
        </div>
      </div>

      {/* Payroll Breakdown */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Payroll Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-gray-700">Gross Pay:</span>
            <span className="font-bold text-green-600">{formatCurrency(calculatedPayroll.grossPay)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <span className="text-gray-700">PAYG Withholding:</span>
            <span className="font-bold text-red-600">-{formatCurrency(calculatedPayroll.taxWithheld)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 border-2 border-blue-300 rounded-md font-bold">
            <span className="text-gray-800">Net Pay:</span>
            <span className="text-blue-600 text-lg">{formatCurrency(calculatedPayroll.netPay)}</span>
          </div>
        </div>

        {/* Employer Contributions */}
        {calculatedPayroll.superannuation > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-semibold text-gray-800 mb-3">Employer Contributions</h4>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Superannuation:</span>
              <span className="font-bold text-blue-600">{formatCurrency(calculatedPayroll.superannuation)}</span>
            </div>
            <p className="text-xs text-gray-600 mt-2 italic">
              Note: Superannuation is paid by the employer and is not deducted from gross pay.
            </p>
          </div>
        )}
      </div>

      {/* Journal Entries Preview */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Automatic Journal Entries
        </h3>
        <p className="text-sm text-yellow-800 mb-2">
          The following journal entries will be created automatically:
        </p>
        <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
          <li>Wages Expense (Debit): {formatCurrency(calculatedPayroll.grossPay)}</li>
          <li>PAYG Withholding Liability (Credit): {formatCurrency(calculatedPayroll.taxWithheld)}</li>
          <li>Superannuation Liability (Credit): {formatCurrency(calculatedPayroll.superannuation)}</li>
          <li>Cash/Bank (Credit): {formatCurrency(calculatedPayroll.netPay)}</li>
        </ul>
      </div>
    </div>
  )
}

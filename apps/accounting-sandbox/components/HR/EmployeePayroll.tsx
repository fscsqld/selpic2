/**
 * Employee Payroll - 급여 처리 탭
 * 
 * 해당 직원의 ID가 자동으로 고정된 상태에서 급여 계산
 */

'use client'

import { useState, useEffect } from 'react'
import { Calculator, DollarSign, FileText } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { PayslipGenerator } from '@/components/Payroll/PayslipGenerator'
import { calculatePayroll } from '@/src/features/payroll/calculator'
import { PayrollCalculationResult } from '@/src/features/payroll/types'
import { formatCurrency } from '@/lib/utils/currency-format'

interface EmployeePayrollProps {
  employee: Employee
  onPayslipGenerated: () => void
}

export function EmployeePayroll({ employee, onPayslipGenerated }: EmployeePayrollProps) {
  const [grossPay, setGrossPay] = useState<number>(0)
  const [calculatedPayroll, setCalculatedPayroll] = useState<PayrollCalculationResult | null>(null)

  // 급여 계산
  useEffect(() => {
    if (grossPay > 0) {
      const result = calculatePayroll(employee, grossPay)
      setCalculatedPayroll(result)
    } else {
      setCalculatedPayroll(null)
    }
  }, [grossPay, employee])

  return (
    <div className="space-y-6">
      {/* Payroll Calculator */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Payroll Calculator
        </h3>
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Employee:</strong> {employee.name} ({employee.employeeId})
          </p>
          {employee.hourlyRate && (
            <p className="text-sm text-blue-800 mt-1">
              <strong>Hourly Rate:</strong> {formatCurrency(employee.hourlyRate)}/hr
            </p>
          )}
          <p className="text-sm text-blue-800 mt-1">
            <strong>Payment Frequency:</strong> {employee.payFrequency === 'weekly' ? 'Weekly' : employee.payFrequency === 'fortnightly' ? 'Fortnightly' : 'Monthly'}
          </p>
          {employee.type === 'contractor' && (
            <p className="text-sm text-amber-800 mt-1">
              <strong>Type:</strong> Contractor (No PAYG Withholding)
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gross Pay ($)
            </label>
            <input
              type="number"
              value={grossPay || ''}
              onChange={(e) => setGrossPay(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          {calculatedPayroll && (
            <div className="space-y-4">
              {/* Deductions Section */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <h4 className="font-semibold text-gray-800 mb-3">Calculation Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Pay:</span>
                    <span className="font-medium">{formatCurrency(calculatedPayroll.grossPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PAYG Withholding:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(calculatedPayroll.taxWithheld)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold text-gray-800">Net Pay:</span>
                    <span className="font-bold text-green-600 text-lg">{formatCurrency(calculatedPayroll.netPay)}</span>
                  </div>
                </div>
              </div>

              {/* Employer Contributions Section */}
              {calculatedPayroll.superannuation > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-semibold text-gray-800 mb-3">Employer Contributions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Superannuation ({((employee.superannuationRate || 0.11) * 100).toFixed(1)}%):
                      </span>
                      <span className="font-medium text-blue-600">{formatCurrency(calculatedPayroll.superannuation)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3 italic">
                    Note: Superannuation is paid by the employer and is not deducted from your gross pay.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payslip Generator - 직원 ID 자동 고정 */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Generate Payslip
        </h3>
        {calculatedPayroll ? (
          <PayslipGenerator
            employee={employee}
            payslip={{
              id: `payslip_${Date.now()}`,
              employeeId: employee.id,
              employeeName: employee.name,
              payPeriod: {
                start: new Date().toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
              },
              grossPay: calculatedPayroll.grossPay,
              taxWithheld: calculatedPayroll.taxWithheld,
              superannuation: calculatedPayroll.superannuation,
              netPay: calculatedPayroll.netPay,
              payDate: new Date().toISOString(),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            onSave={onPayslipGenerated}
          />
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p>Please enter a gross pay amount above to generate a payslip.</p>
          </div>
        )}
      </div>
    </div>
  )
}

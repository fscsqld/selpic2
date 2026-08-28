/**
 * Employee Detail Page - 직원 상세 페이지
 * 
 * 탭 구조: [기본 정보], [급여 처리], [페이스립 기록]
 */

'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, DollarSign, FileText, Calendar, Trash2, Loader2 } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { EmployeeBasicInfo } from './EmployeeBasicInfo'
import { EmployeePayroll } from './EmployeePayroll'
import { EmployeePayslipHistory } from './EmployeePayslipHistory'
import { EmployeeLeaveManagement } from './EmployeeLeaveManagement'
import { EmployeeInsurance } from './EmployeeInsurance'

interface EmployeeDetailPageProps {
  employee: Employee | null
  onBack: () => void
  onEmployeeUpdate: () => void
}

export function EmployeeDetailPage({ employee, onBack, onEmployeeUpdate }: EmployeeDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'payroll' | 'payslip' | 'leave' | 'insurance'>('basic')
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(employee)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (employee) {
      loadEmployeeDetails(employee.id)
    }
  }, [employee])

  const loadEmployeeDetails = async (employeeId: string) => {
    try {
      await indexedDBStorage.init()
      const emp = await indexedDBStorage.getEmployee(employeeId)
      if (emp) {
        setCurrentEmployee(emp as Employee)
      }
    } catch (err) {
      console.error('Failed to load employee details:', err)
    }
  }

  const handleDeleteEmployee = async () => {
    if (!currentEmployee?.id || isDeleting) return

    const label = currentEmployee.employeeId
      ? `${currentEmployee.name} (${currentEmployee.employeeId})`
      : currentEmployee.name

    const confirmed = window.confirm(
      [
        `⚠️ WARNING: Permanently delete ${label}?`,
        '',
        'This will also delete:',
        '• All timesheets for this employee',
        '• All payslips and related payroll journal entries',
        '',
        'This cannot be undone.',
      ].join('\n')
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await indexedDBStorage.init()
      await indexedDBStorage.deleteEmployee(currentEmployee.id)
      window.dispatchEvent(
        new CustomEvent('transactionsUpdated', {
          detail: { source: 'employeeDeleted', employeeId: currentEmployee.id },
        })
      )
      onEmployeeUpdate()
    } catch (err) {
      console.error('Failed to delete employee:', err)
      alert('Failed to delete employee. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!currentEmployee) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <p className="text-gray-600">Employee not found</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Employee List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Back to Employee List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{currentEmployee.name}</h2>
            <p className="text-gray-600 text-sm">
              {currentEmployee.employeeId && `ID: ${currentEmployee.employeeId}`}
              {currentEmployee.email && ` • ${currentEmployee.email}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleDeleteEmployee()}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-60 transition-colors"
          title="Permanently delete this employee and all related payroll data"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {isDeleting ? 'Deleting…' : 'Delete employee'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-2">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-5 h-5" />
            Basic Information
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'payroll'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Payroll Processing
          </button>
          <button
            onClick={() => setActiveTab('payslip')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'payslip'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            Payslip History
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'leave'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Leave Management
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`px-6 py-3 font-medium text-sm transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'insurance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            Superannuation
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'basic' && (
          <EmployeeBasicInfo
            employee={currentEmployee}
            onUpdate={async () => {
              await loadEmployeeDetails(currentEmployee.id)
              onEmployeeUpdate()
            }}
          />
        )}
        {activeTab === 'payroll' && (
          <EmployeePayroll
            employee={currentEmployee}
            onPayslipGenerated={async () => {
              await loadEmployeeDetails(currentEmployee.id)
            }}
          />
        )}
        {activeTab === 'payslip' && (
          <EmployeePayslipHistory
            employee={currentEmployee}
          />
        )}
        {activeTab === 'leave' && (
          <EmployeeLeaveManagement
            employee={currentEmployee}
          />
        )}
        {activeTab === 'insurance' && (
          <EmployeeInsurance
            employee={currentEmployee}
            onUpdate={async () => {
              await loadEmployeeDetails(currentEmployee.id)
              onEmployeeUpdate()
            }}
          />
        )}
      </div>
    </div>
  )
}

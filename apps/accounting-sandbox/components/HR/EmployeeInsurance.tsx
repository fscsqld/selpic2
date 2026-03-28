/**
 * Employee Superannuation - Superannuation (연금) 정보 탭
 * 
 * 회사가 직원에게 지급하는 Superannuation 정보 관리
 */

'use client'

import { useState } from 'react'
import { DollarSign, Save } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

interface EmployeeInsuranceProps {
  employee: Employee
  onUpdate: () => void
}

export function EmployeeInsurance({ employee, onUpdate }: EmployeeInsuranceProps) {
  const [formData, setFormData] = useState({
    superannuationFund: employee.superannuationFund || '',
    superannuationMemberNumber: employee.superannuationMemberNumber || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const updatedEmployee: Employee = {
        ...employee,
        superannuationFund: formData.superannuationFund,
        superannuationMemberNumber: formData.superannuationMemberNumber,
        updatedAt: new Date().toISOString(),
      }

      await indexedDBStorage.saveEmployee(updatedEmployee)
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      onUpdate()
    } catch (err) {
      console.error('Failed to save superannuation information:', err)
      alert('Failed to save superannuation information')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Superannuation Information
        </h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800">
          Superannuation information saved successfully!
        </div>
      )}

      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is the Superannuation Fund information for company contributions. 
            The company is required to pay Superannuation (currently {employee.superannuationRate ? (employee.superannuationRate * 100).toFixed(1) : '11'}%) 
            of the employee's gross pay to this fund.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Superannuation Fund Name *
            </label>
            <input
              type="text"
              value={formData.superannuationFund}
              onChange={(e) => setFormData({ ...formData, superannuationFund: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., AustralianSuper, REST, Hostplus, Cbus"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Name of the Superannuation Fund where company contributions are paid
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Number *
            </label>
            <input
              type="text"
              value={formData.superannuationMemberNumber}
              onChange={(e) => setFormData({ ...formData, superannuationMemberNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Employee's Superannuation member number"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Employee's unique member number in the Superannuation Fund
            </p>
          </div>
        </div>

        {employee.superannuationFund && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-semibold text-green-900 mb-2">Current Superannuation Fund</h4>
            <p className="text-sm text-green-800">
              <strong>Fund Name:</strong> {employee.superannuationFund}
            </p>
            {employee.superannuationMemberNumber && (
              <p className="text-sm text-green-800 mt-1">
                <strong>Member Number:</strong> {employee.superannuationMemberNumber}
              </p>
            )}
            {employee.superannuationRate && (
              <p className="text-sm text-green-800 mt-1">
                <strong>Contribution Rate:</strong> {(employee.superannuationRate * 100).toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

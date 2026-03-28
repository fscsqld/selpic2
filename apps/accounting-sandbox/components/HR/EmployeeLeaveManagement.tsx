/**
 * Employee Leave Management - 연차 관리 탭
 */

'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit2, Trash2 } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { formatDateAustralian } from '@/lib/utils/date-format'

interface LeaveRecord {
  id: string
  employeeId: string
  type: 'annual' | 'sick' | 'personal' | 'unpaid'
  startDate: string
  endDate: string
  hours: number
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  createdAt: string
}

interface EmployeeLeaveManagementProps {
  employee: Employee
}

export function EmployeeLeaveManagement({ employee }: EmployeeLeaveManagementProps) {
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<Partial<LeaveRecord>>({
    type: 'annual',
    startDate: '',
    endDate: '',
    hours: 0,
    reason: '',
  })

  useEffect(() => {
    loadLeaveRecords()
  }, [employee.id])

  const loadLeaveRecords = async () => {
    // TODO: IndexedDB에 leaveRecords store 추가 후 구현
    // 현재는 임시 데이터
    setLeaveRecords([])
  }

  const handleAddLeave = async () => {
    if (!formData.startDate || !formData.endDate || !formData.hours) {
      alert('Please fill in all required fields')
      return
    }

    const newLeave: LeaveRecord = {
      id: `leave_${Date.now()}`,
      employeeId: employee.id,
      type: formData.type || 'annual',
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      hours: formData.hours!,
      status: 'pending',
      reason: formData.reason,
      createdAt: new Date().toISOString(),
    }

    // TODO: Save to IndexedDB
    setLeaveRecords([...leaveRecords, newLeave])
    setShowAddForm(false)
    setFormData({
      type: 'annual',
      startDate: '',
      endDate: '',
      hours: 0,
      reason: '',
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Leave Management
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Leave Request
        </button>
      </div>

      {/* Leave Balances */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="font-semibold text-gray-800 mb-3">Current Leave Balances</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Annual Leave:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {employee.annualLeaveBalance || 0} hours
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600">Sick Leave:</span>
            <span className="ml-2 font-semibold text-gray-900">
              {employee.sickLeaveBalance || 0} hours
            </span>
          </div>
        </div>
      </div>

      {/* Add Leave Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="font-semibold text-gray-800 mb-4">New Leave Request</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={formData.type || 'annual'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveRecord['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  value={formData.hours || ''}
                  onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.5"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddLeave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Submit Request
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setFormData({
                    type: 'annual',
                    startDate: '',
                    endDate: '',
                    hours: 0,
                    reason: '',
                  })
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Records */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-4">Leave History</h4>
        {leaveRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No leave records yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaveRecords.map((leave) => (
              <div
                key={leave.id}
                className="p-4 bg-white border border-gray-200 rounded-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">{leave.type} Leave</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        leave.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : leave.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {leave.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatDateAustralian(leave.startDate)} - {formatDateAustralian(leave.endDate)}
                    </p>
                    <p className="text-sm text-gray-600">{leave.hours} hours</p>
                    {leave.reason && (
                      <p className="text-sm text-gray-500 mt-1">Reason: {leave.reason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

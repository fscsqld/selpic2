/**
 * Employee Management Component
 * 
 * 직원 정보 관리 (추가, 수정, 삭제)
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, User, Save, X, AlertCircle } from 'lucide-react'
import { Employee, EmployeeType, PayFrequency } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    employeeId: '',
    type: 'employee',
    superannuationRate: 0.11,
    payFrequency: 'monthly',
    isActive: true,
  })

  // Load employees
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      await indexedDBStorage.init()
      const allEmployees = await indexedDBStorage.getAllEmployees()
      setEmployees(allEmployees as Employee[])
    } catch (err) {
      console.error('Failed to load employees:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name) {
      alert('Please enter employee name')
      return
    }

    try {
      const employee: Employee = {
        id: editingEmployee?.id || `emp_${Date.now()}`,
        name: formData.name!,
        employeeId: formData.employeeId,
        type: (formData.type as EmployeeType) || 'employee',
        taxFileNumber: formData.taxFileNumber,
        abn: formData.abn,
        superannuationRate: formData.superannuationRate || 0.11,
        payFrequency: (formData.payFrequency as PayFrequency) || 'monthly',
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive ?? true,
        createdAt: editingEmployee?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Save to IndexedDB
      await indexedDBStorage.saveEmployee(employee)
      
      // Update local state
      if (editingEmployee) {
        setEmployees(employees.map(emp => emp.id === employee.id ? employee : emp))
      } else {
        setEmployees([...employees, employee])
      }

      // Reset form
      setFormData({
        name: '',
        employeeId: '',
        type: 'employee',
        superannuationRate: 0.11,
        payFrequency: 'monthly',
        isActive: true,
      })
      setShowForm(false)
      setEditingEmployee(null)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save employee:', err)
      alert('Failed to save employee')
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData(employee)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleDelete = async (employeeId: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return
    }

    try {
      await indexedDBStorage.deleteEmployee(employeeId)
      setEmployees(employees.filter(emp => emp.id !== employeeId))
    } catch (err) {
      console.error('Failed to delete employee:', err)
      alert('Failed to delete employee')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      employeeId: '',
      type: 'employee',
      superannuationRate: 0.11,
      payFrequency: 'monthly',
      isActive: true,
    })
    setShowForm(false)
    setEditingEmployee(null)
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <User className="w-6 h-6" />
          Employee Management
        </h2>
        <button
          onClick={() => {
            setShowForm(true)
            setIsEditing(false)
            setEditingEmployee(null)
            setFormData({
              name: '',
              employeeId: '',
              type: 'employee',
              superannuationRate: 0.11,
              payFrequency: 'monthly',
              isActive: true,
            })
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Employee Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="font-semibold text-gray-800 mb-4">
            {isEditing ? 'Edit Employee' : 'Add New Employee'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={formData.employeeId || ''}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type || 'employee'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EmployeeType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Employee</option>
                  <option value="director">Director</option>
                  <option value="contractor">Contractor</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Frequency
                </label>
                <select
                  value={formData.payFrequency || 'monthly'}
                  onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as PayFrequency })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Superannuation Rate (%)
                </label>
                <input
                  type="number"
                  value={(formData.superannuationRate || 0.11) * 100}
                  onChange={(e) => setFormData({ ...formData, superannuationRate: parseFloat(e.target.value) / 100 || 0.11 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.1"
                  min="0"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax File Number (TFN)
                </label>
                <input
                  type="text"
                  value={formData.taxFileNumber || ''}
                  onChange={(e) => setFormData({ ...formData, taxFileNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees List */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Employees ({employees.length})</h3>
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No employees added yet</p>
            <p className="text-sm mt-1">Click "Add Employee" to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{employee.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        employee.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {employee.type}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {employee.employeeId && (
                        <p>ID: {employee.employeeId}</p>
                      )}
                      <p>Super: {(employee.superannuationRate * 100).toFixed(1)}% | Pay: {employee.payFrequency}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

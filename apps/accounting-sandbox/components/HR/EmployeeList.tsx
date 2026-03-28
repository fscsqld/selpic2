/**
 * Employee List - 전체 직원 목록 컴포넌트
 * 
 * HR & Payroll의 첫 화면으로 전체 직원 목록을 표시
 */

'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, User, ChevronRight, AlertCircle, LogIn } from 'lucide-react'
import { Employee } from '@/src/shared/types/employee'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getCurrentEmployeeSession } from '@/lib/auth/employee-auth'
import { EmployeeLogin } from '@/components/Payroll/EmployeeLogin'

interface EmployeeListProps {
  onEmployeeClick: (employee: Employee) => void
  onAddEmployee: () => void
}

export function EmployeeList({ onEmployeeClick, onAddEmployee }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [showEmployeeLogin, setShowEmployeeLogin] = useState(false)
  
  // 직원 로그인 상태 확인
  useEffect(() => {
    const session = getCurrentEmployeeSession()
    if (session) {
      setShowEmployeeLogin(false)
    }
  }, [])

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

  // 필터링된 직원 목록
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterActive === null || emp.isActive === filterActive
    
    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Employee List</h2>
          <p className="text-gray-600 mt-1">Manage all employees and their payroll information</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmployeeLogin(!showEmployeeLogin)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Employee Login
          </button>
          <button
            onClick={onAddEmployee}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Employee Login Form */}
      {showEmployeeLogin && (
        <div className="card">
          <EmployeeLogin
            onLoginSuccess={(session) => {
              setShowEmployeeLogin(false)
              // 부모 컴포넌트에 로그인 성공 알림 (페이지 새로고침 없이)
              // 부모 컴포넌트에서 isEmployeeLoggedIn을 true로 설정하면 MyPayrollPage가 표시됨
              if (typeof window !== 'undefined') {
                // 직원 로그인 성공 시 HR 탭으로 이동하도록 이벤트 발생
                window.dispatchEvent(new CustomEvent('employeeLoginSuccess'))
              }
            }}
          />
        </div>
      )}

      {/* Search and Filter */}
      <div className="card">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, or email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const value = e.target.value
              setFilterActive(value === 'all' ? null : value === 'active')
            }}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Employees</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      <div className="card">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {employees.length === 0 ? 'No employees yet' : 'No employees found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {employees.length === 0 
                ? 'Add your first employee to get started'
                : 'Try adjusting your search or filter'}
            </p>
            {employees.length === 0 && (
              <button
                onClick={onAddEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Employee
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.map((employee) => (
              <div
                key={employee.id}
                onClick={() => onEmployeeClick(employee)}
                className="p-4 bg-white border border-gray-200 rounded-md hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{employee.name}</h3>
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
                      <div className="mt-1 text-sm text-gray-600 space-x-4">
                        {employee.employeeId && (
                          <span>ID: {employee.employeeId}</span>
                        )}
                        {employee.email && (
                          <span>Email: {employee.email}</span>
                        )}
                        {employee.hourlyRate && (
                          <span>Rate: ${employee.hourlyRate.toFixed(2)}/hr</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {employees.length > 0 && (
        <div className="card bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total: {employees.length} employees
            </span>
            <span className="text-gray-600">
              Active: {employees.filter(e => e.isActive).length} | 
              Inactive: {employees.filter(e => !e.isActive).length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

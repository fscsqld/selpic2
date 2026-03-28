/**
 * Employee Password Management - 비밀번호 관리 컴포넌트
 * 
 * 관리자가 직원 비밀번호를 변경하거나, 직원이 본인 비밀번호를 변경할 수 있음
 */

'use client'

import { useState, useEffect } from 'react'
import { Lock, Save, Eye, EyeOff, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { setEmployeePassword, loginEmployee } from '@/lib/auth/employee-auth'
import { indexedDBStorage } from '@/lib/storage/indexed-db'
import { getCurrentEmployeeSession } from '@/lib/auth/employee-auth'

interface EmployeePasswordManagementProps {
  employeeId: string
  employeeName: string
  isSelfChange?: boolean // 직원이 본인 비밀번호를 변경하는 경우
  onPasswordChanged?: () => void
}

export function EmployeePasswordManagement({
  employeeId,
  employeeName,
  isSelfChange = false,
  onPasswordChanged
}: EmployeePasswordManagementProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isExpanded, setIsExpanded] = useState(() => {
    // localStorage에서 이전 상태 불러오기 (기본값: false - 접힌 상태)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('changePassword_expanded')
      return saved === 'true'
    }
    return false
  })

  // 컴포넌트 마운트 시 필드 초기화 (브라우저 자동완성 방지)
  useEffect(() => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(false)
  }, [])

  // 접기/펼치기 상태를 localStorage에 저장
  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (typeof window !== 'undefined') {
      localStorage.setItem('changePassword_expanded', newState.toString())
    }
  }

  const handleChangePassword = async () => {
    setError(null)
    setSuccess(false)

    // 유효성 검사
    if (!newPassword) {
      setError('Please enter a new password')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    // 직원이 본인 비밀번호를 변경하는 경우, 현재 비밀번호 확인
    if (isSelfChange) {
      try {
        await indexedDBStorage.init()
        const employee = await indexedDBStorage.getEmployeeByEmployeeId(employeeId)
        
        if (!employee) {
          setError('Employee not found')
          return
        }

        // 비밀번호가 있는 경우에만 현재 비밀번호 확인 필요
        if (employee.password) {
          // 현재 비밀번호가 입력되지 않았으면 에러
          if (!currentPassword) {
            setError('Please enter your current password')
            return
          }

          // 현재 비밀번호로 로그인 시도하여 검증
          const session = await loginEmployee(employeeId, currentPassword)
          if (!session) {
            setError('Current password is incorrect')
            return
          }

          // 새 비밀번호가 현재 비밀번호와 같은지 확인 (해시 비교)
          const hashPassword = (password: string): string => {
            let hash = 0
            for (let i = 0; i < password.length; i++) {
              const char = password.charCodeAt(i)
              hash = ((hash << 5) - hash) + char
              hash = hash & hash
            }
            return hash.toString(36)
          }

          const hashedNewPassword = hashPassword(newPassword)
          if (employee.password === hashedNewPassword) {
            setError('New password must be different from current password')
            return
          }
        }
        // 비밀번호가 없으면 최초 설정이므로 현재 비밀번호 확인 불필요
      } catch (err) {
        console.error('Failed to verify current password:', err)
        setError('Failed to verify current password')
        return
      }
    }

    setIsChanging(true)
    try {
      const success = await setEmployeePassword(employeeId, newPassword)
      
      if (success) {
        setSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => {
          setSuccess(false)
          if (onPasswordChanged) {
            onPasswordChanged()
          }
        }, 3000)
      } else {
        setError('Failed to change password. Please try again.')
      }
    } catch (err) {
      console.error('Failed to change password:', err)
      setError('Failed to change password. Please try again.')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Lock className="w-6 h-6" />
          {isSelfChange ? 'Change My Password' : 'Change Password'}
        </h3>
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title={isExpanded ? 'Hide' : 'Show'}
        >
          <span className="text-xs font-medium">{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span>Password changed successfully!</span>
            </div>
          )}

          <div className="space-y-4">
        {!isSelfChange && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <strong>Employee:</strong> {employeeName} ({employeeId})
          </div>
        )}

        {isSelfChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                name="current-password-change"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="current-password"
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password *
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              name="new-password-change"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters long</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password *
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirm-password-change"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

            <button
              onClick={handleChangePassword}
              disabled={isChanging}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isChanging ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

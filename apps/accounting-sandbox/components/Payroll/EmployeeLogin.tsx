/**
 * Employee Login - 직원 로그인 컴포넌트
 */

'use client'

import { useState, useEffect } from 'react'
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { loginEmployee, getCurrentEmployeeSession } from '@/lib/auth/employee-auth'

interface EmployeeLoginProps {
  onLoginSuccess: (session: any) => void
}

export function EmployeeLogin({ onLoginSuccess }: EmployeeLoginProps) {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 컴포넌트 마운트 시 필드 초기화 (브라우저 자동완성 방지)
  useEffect(() => {
    setEmployeeId('')
    setPassword('')
    setError(null)
  }, [])

  // 로그인 페이지에서는 기존 세션을 사용하지 않음
  // (부모 컴포넌트에서 이미 세션을 삭제했으므로)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const session = await loginEmployee(employeeId, password)
      if (session) {
        onLoginSuccess(session)
      } else {
        setError('Invalid employee ID or password')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="card max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Employee Login</h2>
        <p className="text-gray-600">Enter your employee ID and password</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee ID
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="employee-login-id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter your employee ID"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="employee-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Enter your password"
              autoComplete="new-password"
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Logging in...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

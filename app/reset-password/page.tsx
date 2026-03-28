'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Header from '@/components/Header'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const { users, updateUser } = useUserAuth()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isResetting, setIsResetting] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    // 토큰 유효성 검사
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.')
      setIsResetting(false)
      return
    }

    const user = users.find(u => {
      const emailMatch = u.email.toLowerCase() === email.toLowerCase()
      const tokenMatch = u.resetPasswordToken === token
      const notExpired = u.resetPasswordExpires && new Date(u.resetPasswordExpires) > new Date()
      
      return emailMatch && tokenMatch && notExpired
    })

    setIsValid(!!user)
    setIsResetting(false)
    
    if (!user) {
      setError('This reset link has expired or is invalid. Please request a new password reset.')
    }
  }, [token, email, users])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 유효성 검사
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    setIsLoading(true)

    try {
      const user = users.find(u => 
        u.email.toLowerCase() === email?.toLowerCase() &&
        u.resetPasswordToken === token &&
        u.resetPasswordExpires &&
        new Date(u.resetPasswordExpires) > new Date()
      )

      if (!user) {
        setError('Reset link has expired. Please request a new password reset.')
        setIsLoading(false)
        return
      }

      // 비밀번호 업데이트 및 토큰 제거
      updateUser(user.id, {
        password,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined
      })

      // 성공 후 로그인 페이지로 리다이렉트
      router.push('/login?reset=success')
    } catch (error) {
      console.error('Reset password error:', error)
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // 로딩 중
  if (isResetting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600">Verifying reset link...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 유효하지 않은 토큰
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
              <p className="text-gray-600 mb-6">{error || 'This reset link has expired or is invalid.'}</p>
            </div>

            <div className="space-y-4">
              <Link
                href="/forgot-password"
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
              >
                <Mail size={20} />
                <span>Request New Reset Link</span>
              </Link>
              
              <Link
                href="/login"
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 유효한 토큰 - 비밀번호 재설정 폼
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600">Enter your new password below</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter new password (min. 6 characters)"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


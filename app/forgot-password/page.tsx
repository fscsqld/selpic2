'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useTranslation } from '@/lib/useTranslation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 실제 API 호출
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link')
      }

      if (data.success) {
        setIsSubmitted(true)
      } else {
        setError(data.error || t('forgotPassword.error'))
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      // 보안을 위해 존재하지 않는 이메일이어도 성공 메시지 표시
      // 실제 오류는 서버 로그에만 기록
      setIsSubmitted(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/login')
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('forgotPassword.successTitle')}</h1>
              <p className="text-gray-600">{t('forgotPassword.successMessage')}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                {t('forgotPassword.checkEmail').replace('{email}', email)}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleBackToLogin}
                className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
              >
                <ArrowLeft size={20} />
                <span>{t('forgotPassword.backToLogin')}</span>
              </button>
              
              <button
                onClick={() => {
                  setEmail('')
                  setIsSubmitted(false)
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {t('forgotPassword.tryAnotherEmail')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('forgotPassword.title')}</h1>
            <p className="text-gray-600">{t('forgotPassword.subtitle')}</p>
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
                {t('forgotPassword.email')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('forgotPassword.sending')}</span>
                </>
              ) : (
                <>
                  <Mail size={20} />
                  <span>{t('forgotPassword.sendResetLink')}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleBackToLogin}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center space-x-1 mx-auto"
            >
              <ArrowLeft size={16} />
              <span>{t('forgotPassword.backToLogin')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
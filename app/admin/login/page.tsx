'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle, Home } from 'lucide-react'
import { useAdminAuth } from '@/lib/adminAuth'
import { useTranslation } from '@/lib/useTranslation'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAdminAuth()
  const router = useRouter()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const success = await login(username, password)
      if (success) {
        router.push('/admin/dashboard')
      } else {
        setError(t('admin.login.loginError'))
      }
    } catch (err) {
              setError(t('admin.login.systemError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
      {/* 홈으로 가기 버튼 */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 text-white hover:bg-white/20 transition-all duration-200"
        >
          <Home size={20} />
          <span>{t('admin.login.home')}</span>
        </button>
      </div>
      
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t('admin.login.title')}</h1>
          <p className="text-gray-300">{t('admin.login.subtitle')}</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 사용자명 입력 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
                {t('admin.login.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('admin.login.usernamePlaceholder')}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                {t('admin.login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-white/90 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('admin.login.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('admin.login.loggingIn')}</span>
                </div>
              ) : (
                t('admin.login.login')
              )}
            </button>
          </form>

          {/* 테스트 계정 정보 */}
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-medium text-blue-300 mb-2">{t('admin.login.testAccount')}</h3>
            <div className="text-xs text-blue-200 space-y-1">
              <p><strong>{t('admin.login.regularAdmin')}:</strong> admin / selpic2024</p>
              <p><strong>{t('admin.login.superAdmin')}:</strong> superadmin / selpic2024super</p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            {t('admin.login.copyright')}
          </p>
        </div>
      </div>
    </div>
  )
} 
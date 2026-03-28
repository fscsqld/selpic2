'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Lock, Eye, EyeOff, Mail } from 'lucide-react'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'

export default function PersonalLoginPage() {
  const router = useRouter()
  const { login } = useUserAuth()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const success = await login(formData.email, formData.password)
      
      if (success) {
        router.push('/') // 홈페이지로 리다이렉트
      } else {
        setError(t('login.loginFailed'))
      }
    } catch (err) {
      setError(t('login.loginError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <Link 
            href="/login" 
            className="inline-flex items-center text-gray-600 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            {t('login.backToLogin')}
          </Link>
          
          <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
            <User size={32} className="text-pink-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {t('login.title')}
          </h1>
          <p className="text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  placeholder={t('login.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  placeholder={t('login.passwordPlaceholder')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('login.loggingIn')}
                </span>
              ) : (
                t('login.loginButton')
              )}
            </button>

            {/* 회원가입 링크 */}
            <div className="text-center">
              <p className="text-gray-600">
                {t('login.noAccount')}{' '}
                <Link href="/register" className="text-pink-600 hover:text-pink-700 font-medium">
                  {t('login.register')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
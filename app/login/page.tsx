'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { login, initializeDemoUser } = useUserAuth()
  const { t } = useTranslation()
  const { clearCart } = useStore()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // 컴포넌트 마운트 시 데모 사용자 초기화
  useEffect(() => {
    initializeDemoUser()
  }, [initializeDemoUser])

  // 비밀번호 재설정 성공 메시지 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('reset') === 'success') {
        setResetSuccess(true)
        // URL에서 쿼리 파라미터 제거
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    console.log('=== LOGIN FORM SUBMISSION ===')
    console.log('Form data:', { email: formData.email, passwordLength: formData.password?.length })

    // 기본 유효성 검사
    if (!formData.email || !formData.password) {
      console.log('❌ Validation failed: missing email or password')
      alert('Please enter both email and password.')
      setIsLoading(false)
      return
    }

    try {
      // 데모 사용자 초기화 강제 실행
      console.log('Initializing demo user...')
      initializeDemoUser()
      
      console.log('Calling login function...')
      const success = await login(formData.email, formData.password, keepLoggedIn)
      
      console.log('Login result:', success)
      
      if (success) {
        console.log('✅ Login successful, redirecting to home')
        // 로그인 성공 후 장바구니 초기화
        try {
          clearCart(true)
        } catch (cartError) {
          console.warn('Cart clear error (non-critical):', cartError)
        }
        router.push('/')
      } else {
        console.log('❌ Login failed')
        alert('Login failed. Please check your email and password.')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
      alert('An error occurred during login.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    
    console.log('=== DEMO LOGIN BUTTON CLICKED ===')
    console.log('Current form data:', formData)
    console.log('Keep logged in:', keepLoggedIn)
    
    try {
      // 데모 사용자 초기화 확인
      console.log('Initializing demo user...')
      initializeDemoUser()
      
      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('=== DEMO LOGIN ATTEMPT ===')
      console.log('Attempting demo login with: user@example.com / password123')
      
      const success = await login('user@example.com', 'password123', keepLoggedIn)
      
      console.log('Demo login result:', success)
      
      if (success) {
        console.log('✅ Demo login successful - redirecting to home')
        // 데모 계정 로그인 성공 시 장바구니 초기화
        try {
          clearCart(true)
          console.log('Cart cleared successfully')
        } catch (cartError) {
          console.warn('Cart clear error (non-critical):', cartError)
        }
        
        console.log('Navigating to home page...')
        router.push('/')
      } else {
        console.log('❌ Demo login failed')
        alert('Demo login failed. Please check the browser console.')
      }
    } catch (error) {
      console.error('❌ Demo login error:', error)
      alert('An error occurred during demo login: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Header />
      
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-light text-slate-900 mb-2 tracking-wide">{t('login.title')}</h1>
            <p className="text-slate-600">{t('login.subtitle')}</p>
          </div>

          {resetSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-sm text-green-800">
                  Password reset successful! You can now login with your new password.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="group">
              <label className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                {t('login.email')}
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-4 pl-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                  placeholder={t('login.emailPlaceholder')}
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-5 py-4 pl-12 pr-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                  placeholder={t('login.passwordPlaceholder')}
                />
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors duration-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{t('login.keepLogin')}</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 transition-colors duration-300">
                {t('login.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{t('login.loggingIn')}</span>
                </>
              ) : (
                <>
                  <User size={20} />
                  <span>{t('login.loginButton')}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              {t('login.noAccount')}{' '}
              <Link href="/register" className="text-purple-600 hover:text-purple-700 font-medium transition-colors duration-300">
                {t('login.register')}
              </Link>
            </p>
          </div>

          {/* 간단한 로그인 옵션들 */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                ) : (
                  <span>{t('login.demoLogin')}</span>
                )}
              </button>

                              <Link
                  href="/admin/login"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 hover:shadow-md"
                >
                  <Lock size={16} />
                  <span>{t('adminLogin')}</span>
                </Link>
              </div>
              
              {/* 디버그 버튼 */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    initializeDemoUser()
                    console.log('Demo user initialized. Try login with:')
                    console.log('Email: user@example.com')
                    console.log('Password: password123')
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Debug: Initialize Demo User
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
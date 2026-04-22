'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Lock, Eye, EyeOff, Mail, Phone, User as UserIcon, CheckCircle, AlertCircle, Shield, FileText, Home, ChevronDown, ChevronUp } from 'lucide-react'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import AustralianAddressForm, { AddressData } from '@/components/AustralianAddressForm'

function mapSupabaseSignUpError(message: string): string {
  const m = (message || '').toLowerCase()
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already') ||
    m.includes('email address is already') ||
    m.includes('already exists')
  ) {
    return 'This email address is already in use. Try signing in or use a different email.'
  }
  if (
    (m.includes('password') && (m.includes('least') || m.includes('short') || m.includes('6') || m.includes('long'))) ||
    m.includes('password should be')
  ) {
    return 'Password must be at least 6 characters.'
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Please enter a valid email address.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'New registrations are temporarily unavailable. Please try again later.'
  }
  return (message || '').trim() || 'Something went wrong. Please try again.'
}

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useUserAuth()
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+61 ', // 호주 국가 코드만 기본값
    password: '',
    confirmPassword: ''
  })
  
  const [addressData, setAddressData] = useState<AddressData>({
    streetAddress: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'AU' // 기본값을 호주로 설정
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 동의서 관련 상태
  const [agreements, setAgreements] = useState({
    termsOfService: false,
    privacyPolicy: false,
    marketingConsent: false,
    dataCollection: false,
    ageConsent: false
  })
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showAgreements, setShowAgreements] = useState(false)
  const [allAgreeChecked, setAllAgreeChecked] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!agreements.termsOfService || !agreements.privacyPolicy || !agreements.dataCollection || !agreements.ageConsent) {
      setError('Please accept all required agreements before continuing.')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.')
      setIsLoading(false)
      return
    }

    const addressParts = [
      addressData.streetAddress,
      addressData.suburb,
      addressData.state && addressData.postcode ? `${addressData.state} ${addressData.postcode}` : addressData.state || addressData.postcode,
      addressData.country,
    ].filter((part) => part && part.trim() !== '')

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : ''

    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

    try {
      if (hasSupabase) {
        const email = formData.email.trim().toLowerCase()

        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            address: fullAddress,
            marketingConsent: agreements.marketingConsent,
          }),
        })
        const regJson = (await registerRes.json().catch(() => ({}))) as { error?: string; ok?: boolean }

        if (!registerRes.ok) {
          const msg = typeof regJson.error === 'string' ? regJson.error : ''
          setError(msg || 'Registration could not be completed. Please try again.')
          return
        }

        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const { postSupabasePasswordSignInBridge } = await import('@/lib/supabase/postSupabasePasswordSignInBridge')
        const supabase = createSupabaseBrowserClient()
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: formData.password,
        })

        if (!signInErr && signInData.session && signInData.user) {
          const bridge = await postSupabasePasswordSignInBridge(supabase, signInData.session, 'storefront')
          if (bridge.outcome === 'admin') {
            router.replace('/admin/dashboard')
            return
          }
          if (bridge.outcome === 'roster_blocked' || bridge.outcome === 'not_admin_gate') {
            setError(bridge.error)
            return
          }
          useUserAuth.getState().establishSessionFromSupabaseUser(bridge.user)
          try {
            const { useStore } = await import('@/lib/store')
            useStore.getState().clearCart(true)
          } catch {
            /* non-fatal */
          }
          router.replace('/')
          return
        }

        if (signInErr) {
          setError(
            `Your account was created. Go to Log in and sign in with the same email and password. (${signInErr.message})`
          )
          return
        }

        router.replace('/register/thank-you')
        return
      }

      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        address: fullAddress,
      })

      if (result.success) {
        router.push('/login?registered=1')
      } else if (result.error === 'emailExists') {
        setError('This email address is already in use. Try signing in or use a different email.')
      } else {
        setError('Registration could not be completed. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    
    // 전화번호 필드 (+61 이후 자유 입력)
    if (e.target.name === 'phone') {
      // +61로 시작하는지 확인
      if (!value.startsWith('+61')) {
        // +61이 없으면 자동으로 추가
        value = '+61 ' + value.replace(/\D/g, '').slice(0, 15)
      }
    }
    
    setFormData({
      ...formData,
      [e.target.name]: value
    })
  }

  const handleAgreementChange = (field: keyof typeof agreements) => {
    setAgreements(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleAllAgree = () => {
    const newState = !allAgreeChecked
    setAllAgreeChecked(newState)
    setAgreements({
      termsOfService: newState,
      privacyPolicy: newState,
      marketingConsent: newState,
      dataCollection: newState,
      ageConsent: newState
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center text-slate-600 hover:text-purple-700 transition-colors duration-300 group">
              <Home size={20} className="mr-2 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-medium">Back to home</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <UserIcon size={32} className="text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-light text-slate-900 mb-2 tracking-wide">Create your Selpic account</h1>
          <p className="text-slate-600">Register to save your details and track orders.</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름과 이메일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                  Full name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 pl-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="Your name"
                    required
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>

              <div className="group">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                  Email address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                    className="w-full px-5 py-4 pl-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="name@example.com"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                </div>
              </div>
            </div>

            {/* 전화번호 */}
            <div className="group">
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                Phone number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={20}
                  className="w-full px-5 py-4 pl-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                  placeholder="+61 XXXX XXXX"
                />
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              </div>
            </div>

            {/* 호주 주소 컴포넌트 */}
            <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-200">
              <AustralianAddressForm
                addressData={addressData}
                onAddressChange={setAddressData}
                required={false}
                showCountry={true}
              />
            </div>

            {/* 비밀번호 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    className="w-full px-5 py-4 pl-12 pr-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="At least 6 characters"
                    required
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

              <div className="group">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                  Confirm password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    className="w-full px-5 py-4 pl-12 pr-12 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="Re-enter your password"
                    required
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors duration-300"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={20} className="text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* 간단한 동의사항 */}
            <div className="space-y-4">
              {/* 모두 동의 버튼 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleAllAgree}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                        allAgreeChecked 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' 
                          : 'border-2 border-slate-300 bg-white hover:border-purple-400'
                      }`}
                    >
                      {allAgreeChecked && <CheckCircle size={16} />}
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{t('register.allAgree')}</h3>
                      <p className="text-sm text-slate-600">{t('register.allAgreeDesc')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgreements(!showAgreements)}
                    className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
                  >
                    {showAgreements ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </button>
                </div>
              </div>

              {/* 개별 동의사항 (드롭다운) */}
              {showAgreements && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 animate-in slide-in-from-top duration-300">
                  <div className="flex items-center mb-4">
                    <Shield size={20} className="text-purple-600 mr-2" />
                    <h4 className="text-md font-semibold text-slate-900">Detailed Terms</h4>
                  </div>
                  {/* Required Agreements */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-slate-800 mb-3">Required Agreements</h5>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={agreements.termsOfService}
                            onChange={() => handleAgreementChange('termsOfService')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-700">{t('register.termsOfService')}</span>
                            <span className="text-xs text-purple-600 ml-2">{t('register.requiredAgreement')}</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTermsModal(true)}
                          className="text-xs text-purple-600 hover:text-purple-700 underline font-medium"
                        >
                          {t('register.viewTerms')}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={agreements.privacyPolicy}
                            onChange={() => handleAgreementChange('privacyPolicy')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-700">{t('register.privacyPolicy')}</span>
                            <span className="text-xs text-purple-600 ml-2">{t('register.requiredAgreement')}</span>
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyModal(true)}
                          className="text-xs text-purple-600 hover:text-purple-700 underline font-medium"
                        >
                          {t('register.viewPrivacy')}
                        </button>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreements.dataCollection}
                            onChange={() => handleAgreementChange('dataCollection')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-slate-700">{t('register.dataCollection')}</span>
                              <span className="text-xs text-purple-600 ml-2">{t('register.requiredAgreement')}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{t('register.dataCollectionDesc')}</p>
                          </div>
                        </label>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreements.ageConsent}
                            onChange={() => handleAgreementChange('ageConsent')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-slate-700">{t('register.ageConsent')}</span>
                            <span className="text-xs text-purple-600 ml-2">{t('register.requiredAgreement')}</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Optional Agreements */}
                    <div className="border-t border-slate-200 pt-4">
                      <h5 className="text-sm font-medium text-slate-800 mb-3">Optional Agreements</h5>
                      
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agreements.marketingConsent}
                            onChange={() => handleAgreementChange('marketingConsent')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-slate-300 rounded mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-slate-700">{t('register.marketingConsent')}</span>
                              <span className="text-xs text-slate-500 ml-2">{t('register.optionalAgreement')}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{t('register.marketingDesc')}</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 회원가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating your account…</span>
                </>
              ) : (
                <>
                  <UserIcon size={20} />
                  <span>Create account</span>
                </>
              )}
            </button>

            <div className="text-center pt-6">
              <p className="text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors duration-300">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* 이용약관 모달 */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{t('register.termsModal.title')}</h3>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <h4 className="font-semibold text-lg">1. Service and Orders</h4>
                <p>
                  Selpic provides online sticker customization and related services. A purchase is
                  completed when you place an order, complete payment, and we confirm the order.
                  All prices are displayed in Australian Dollars (AUD) unless otherwise specified.
                </p>

                <h4 className="font-semibold text-lg">2. Custom Products and Cancellations</h4>
                <p>
                  Our stickers are custom-made based on the text, designs, and options you choose.
                  Once production has started, your order may not be cancelled or changed, except as
                  allowed by our refund policy. The on-screen preview is a visual guide only.
                  Because of printing conditions, materials, and monitor settings, slight differences
                  in color, size, and layout may occur and are not considered defects.
                </p>

                <h4 className="font-semibold text-lg">3. Member Responsibilities and Content</h4>
                <p>
                  You are responsible for the accuracy of the information you provide (including
                  names, text, and delivery details). You are also responsible for any images, text,
                  and designs you upload, and you confirm that you have the necessary rights
                  (including copyright and portrait rights) to use this content. By uploading
                  content, you grant Selpic a non-exclusive license to use, reproduce, and display
                  your content only for producing, processing, and delivering your orders and for
                  related customer support.
                </p>

                <h4 className="font-semibold text-lg">4. Use of the Service</h4>
                <p>
                  You must comply with applicable laws, these Terms, and any usage guidelines or
                  notices provided in the service. You must not use the service to infringe on the
                  rights of others, upload illegal or harmful content, or interfere with the normal
                  operation of the service.
                </p>

                <h4 className="font-semibold text-lg">5. Service Changes and Suspension</h4>
                <p>
                  We may change, add, or remove features of the service for operational or technical
                  reasons. We may temporarily suspend the service for maintenance, system failure, or
                  similar reasons. Where reasonably possible, we will provide prior notice and, in
                  urgent cases, notice after the fact.
                </p>

                <h4 className="font-semibold text-lg">6. Limitation of Liability</h4>
                <p>
                  To the maximum extent permitted by law, Selpic is not liable for indirect,
                  incidental, or consequential damages arising from your use of the service. Selpic is
                  not responsible for issues caused by your own input errors, misuse of the service,
                  or failure to follow our instructions and guidelines. To the extent permitted by
                  law, our total liability for any claim related to a specific order is limited to
                  the amount you actually paid for that order.
                </p>
              </div>
              
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                >
                  {t('register.termsModal.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{t('register.privacyModal.title')}</h3>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <h4 className="font-semibold text-lg">1. Purpose of Collection and Use</h4>
                <p>
                  We collect and use your personal information to create and manage your account,
                  process and deliver your orders, provide customer support, and improve our
                  services. We may also use information to prevent fraud or abuse of the service.
                </p>

                <h4 className="font-semibold text-lg">2. Personal Information We Collect</h4>
                <p>
                  We may collect your name, email address, phone number, delivery address, order
                  details, and payment-related information (processed via secure payment providers),
                  as well as service usage information such as order history and communication
                  records.
                </p>

                <h4 className="font-semibold text-lg">3. Retention Period</h4>
                <p>
                  We retain your personal information only for as long as necessary to provide our
                  services and to meet legal, accounting, or reporting requirements. After the
                  retention period ends, we securely delete or anonymize your information in
                  accordance with applicable laws.
                </p>

                <h4 className="font-semibold text-lg">4. Third-Party Provision and Outsourcing</h4>
                <p>
                  We do not sell or share your personal information with third parties for their own
                  independent marketing purposes. We may provide information to third parties only
                  when required by law or with your explicit consent. We may use trusted service
                  providers (such as payment processors, hosting providers, or delivery companies) to
                  help operate the service, and we require them to protect your data in accordance
                  with data protection laws and our instructions.
                </p>

                <h4 className="font-semibold text-lg">5. Data Location and Security</h4>
                <p>
                  Your personal information may be stored and processed in data centers or cloud
                  services, which may be located in other countries. We take appropriate technical
                  and organizational measures—such as encryption, access controls, and monitoring—to
                  protect your personal information from unauthorized access, loss, or misuse.
                </p>

                <h4 className="font-semibold text-lg">6. Your Rights</h4>
                <p>
                  Subject to applicable law, you have the right to access, correct, delete, or
                  request restriction of processing of your personal information. You can also
                  withdraw your consent to optional uses (such as marketing communications) at any
                  time. To exercise these rights, please contact us through the details provided in
                  our service.
                </p>

                <h4 className="font-semibold text-lg">7. Disposal and Changes</h4>
                <p>
                  When personal information is no longer needed for its original purpose or the
                  legal retention period has expired, we promptly delete or anonymize it. We may
                  update this Privacy Policy to reflect changes in laws or our services, and we will
                  notify you of important changes in advance where appropriate.
                </p>
              </div>
              
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                >
                  {t('register.privacyModal.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
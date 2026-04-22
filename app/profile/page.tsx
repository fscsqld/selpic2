'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, MapPin, LogOut, Edit3, Save, X, Globe, Lock, Eye, EyeOff, Bell, BellOff, Award, TrendingUp, Gift } from 'lucide-react'
import Header from '@/components/Header'
import { useUserAuth } from '@/lib/userAuth'
import { useStore } from '@/lib/store'
import { getGradeInfo } from '@/lib/vipGradeConfig'
import { useContentStore } from '@/lib/contentStore'
import GradeBadge from '@/components/GradeBadge'
import { calculateUserTotalSales } from '@/lib/userGradeUtils'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, isLoggedIn, updateUser, changePassword } = useUserAuth()
  const { clearCart, newsletterSubscribers, unsubscribeFromNewsletter } = useStore()
  const { getVIPGradeBenefitForCheckout, getActiveVIPGradeConfigs } = useContentStore()
  
  // VIP 등급 정보 상태
  const [vipGradeInfo, setVipGradeInfo] = useState<{
    gradeCode: number
    gradeName: string
    discountPercentage: number
    freeShipping: boolean
    benefits: string[]
    totalSalesAmount: number
    nextGradeAmount?: number
  } | null>(null)
  
  const { orders, _hasHydrated } = useStore()
  
  // VIP 등급 정보 업데이트 함수
  const updateVipGradeInfo = (currentUser: typeof user) => {
    if (!currentUser || currentUser.currentGrade === undefined) {
      setVipGradeInfo(null)
      return
    }
    
    const gradeCode = currentUser.currentGrade
    const gradeInfo = getGradeInfo(gradeCode)
    const gradeConfigs = getActiveVIPGradeConfigs()
    
    // 등급별 혜택 가져오기
    const subtotal = 100 // 예시 금액 (실제 할인율 표시용)
    const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal)
    
    // 실시간으로 주문에서 총 구매 금액 계산 (user.totalSalesAmount 대신)
    // 주문 데이터가 하이드레이션된 후에만 계산
    let calculatedAmount = 0
    if (_hasHydrated && currentUser.email) {
      calculatedAmount = calculateUserTotalSales(currentUser.email, orders, currentUser.phone)
    } else {
      // 하이드레이션 전이면 user.totalSalesAmount 사용 (fallback)
      calculatedAmount = currentUser.totalSalesAmount || 0
    }
    
    // 다음 등급까지 필요한 금액 계산
    const nextGradeConfig = gradeConfigs.find((config: any) => config.code > gradeCode && config.isActive)
    const nextGradeAmount = nextGradeConfig ? nextGradeConfig.minAmount - calculatedAmount : undefined
    
    setVipGradeInfo({
      gradeCode,
      gradeName: gradeInfo?.nameEn || ['Basic', 'Silver', 'Gold', 'Black', 'VVIP'][gradeCode] || `Grade ${gradeCode}`,
      discountPercentage: vipBenefit?.benefit?.baseDiscountPercentage || 0,
      freeShipping: vipBenefit?.freeShipping || false,
      benefits: gradeInfo?.benefits || [],
      totalSalesAmount: calculatedAmount, // 실시간 계산된 값 사용
      nextGradeAmount: nextGradeAmount && nextGradeAmount > 0 ? nextGradeAmount : undefined
    })
  }
  
  // 사용자 정보 변경 시 VIP 등급 정보 업데이트
  useEffect(() => {
    if (user) {
      updateVipGradeInfo(user)
    }
  }, [user, orders, _hasHydrated]) // orders와 _hasHydrated도 의존성에 추가
  
  // 관리자 페이지 변경사항 즉시 반영을 위한 이벤트 리스너
  useEffect(() => {
    const handleContentStoreUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.type === 'vipGradeBenefits' || customEvent.detail?.type === 'vipGradeConfigs') {
        console.log('🔄 Profile: VIP Grade 설정 변경 감지, 등급 정보 새로고침')
        // VIP 등급 정보 다시 계산
        if (user && user.currentGrade !== undefined) {
          updateVipGradeInfo(user)
        }
      }
    }

    if (typeof window === 'undefined') return
    
    window.addEventListener('content-store-updated', handleContentStoreUpdate)
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('content-store-updated', handleContentStoreUpdate)
      }
    }
  }, [user])
  
  // 사용자 정보 업데이트 이벤트 리스너 (totalSalesAmount 업데이트 감지)
  useEffect(() => {
    if (!user) return
    
    const currentUserId = user.id
    
    const handleUserUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.userId === currentUserId) {
        const updatedFields = customEvent.detail?.updatedFields || []
        if (updatedFields.includes('totalSalesAmount') || updatedFields.includes('currentGrade')) {
          console.log('🔄 Profile: 사용자 구매 금액/등급 업데이트 감지, 정보 새로고침')
          // 최신 사용자 정보 가져오기
          const { user: latestUser } = useUserAuth.getState()
          if (latestUser && latestUser.id === currentUserId) {
            updateVipGradeInfo(latestUser)
          }
        }
      }
    }

    if (typeof window === 'undefined') return
    
    window.addEventListener('user-updated', handleUserUpdate)
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('user-updated', handleUserUpdate)
      }
    }
  }, [user])
  
  // Newsletter 구독 상태 확인
  const newsletterSubscription = newsletterSubscribers.find(
    sub => sub.email.toLowerCase() === user?.email?.toLowerCase()
  )
  const isNewsletterSubscribed = newsletterSubscription?.isActive || false
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  })
  
  // 비밀번호 변경 모달
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordError, setPasswordError] = useState('')

  // 회원 탈퇴 모달
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // 사용자 정보 업데이트
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      })
    }
  }, [user])

  const handleLogout = () => {
    logout()
    clearCart(true)
    router.push('/')
  }

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || ''
      })
    }
    setIsEditing(!isEditing)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setIsSaving(true)
    
    try {
      const updatedUser = { ...user, ...editForm }
      await updateUser(user.id, updatedUser)
      setIsEditing(false)
    } catch (error) {
      console.error('Profile update error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 비밀번호 변경 함수들
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
    setPasswordError('')
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Please fill in all fields.')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    setPasswordError('')
    
    try {
      const success = await changePassword(user.id, passwordForm.currentPassword, passwordForm.newPassword)
      
      if (success) {
        setShowPasswordModal(false)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswords({ current: false, new: false, confirm: false })
      } else {
        setPasswordError('Current password is incorrect.')
      }
    } catch (error) {
      setPasswordError('Could not update password. Please try again.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleConfirmCancelMembership = async () => {
    if (!user) return
    try {
      setIsCancelling(true)
      // 계정 삭제 후 로그아웃 및 장바구니 정리
      await useUserAuth.getState().deleteUser(user.id)
      logout()
      clearCart(true)
      setShowCancelModal(false)
      router.push('/')
    } catch (error) {
      console.error('Cancel membership error:', error)
    } finally {
      setIsCancelling(false)
    }
  }



  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center bg-white/80 backdrop-blur-md border border-white/20 rounded-3xl p-12 shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h2>
            <p className="text-gray-600 mb-8">Please log in to view your profile.</p>
            <button 
              onClick={() => router.push('/login')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
          <p className="text-gray-600">Selpic Member</p>
        </div>

        {/* VIP 등급 정보 카드 */}
        {vipGradeInfo && (
          <div className="mb-8 bg-gradient-to-br from-purple-50 via-white to-blue-50 backdrop-blur-md border border-purple-200 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Award size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">VIP Grade Information</h2>
                  <p className="text-sm text-gray-600">Check your current grade and benefits.</p>
                </div>
              </div>
              <GradeBadge gradeCode={vipGradeInfo.gradeCode} size="lg" />
            </div>
            <div className="flex justify-end mb-4">
              <Link
                href="/benefits"
                className="inline-flex items-center text-sm font-semibold text-purple-700 hover:text-purple-800 underline"
              >
                View All Benefits & Promo Codes
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* 현재 등급 정보 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp size={20} className="text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Current Grade</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Grade Name</p>
                    <p className="text-2xl font-bold text-purple-700">{vipGradeInfo.gradeName}</p>
                  </div>
                  {vipGradeInfo.discountPercentage > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Discount Rate</p>
                      <p className="text-xl font-bold text-green-600">{vipGradeInfo.discountPercentage}%</p>
                    </div>
                  )}
                  {vipGradeInfo.freeShipping && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Gift size={16} />
                      <span className="text-sm font-medium">Free Shipping Included</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 누적 구매 금액 및 다음 등급 */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Purchase Status</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Purchase Amount</p>
                    <p className="text-2xl font-bold text-blue-700">${vipGradeInfo.totalSalesAmount.toFixed(2)}</p>
                  </div>
                  {vipGradeInfo.nextGradeAmount && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">To Next Grade</p>
                      <p className="text-lg font-bold text-purple-600">${vipGradeInfo.nextGradeAmount.toFixed(2)}</p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (vipGradeInfo.totalSalesAmount / (vipGradeInfo.totalSalesAmount + vipGradeInfo.nextGradeAmount)) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 프로필 정보 */}
          <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
              {!isEditing ? (
                <button
                  onClick={handleEditToggle}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{isSaving ? 'Saving…' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
                  >
                    <X size={16} />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {/* 이름 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleInputChange}
                      className="w-full text-lg font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your name"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{user.name}</p>
                  )}
                </div>
              </div>

              {/* 이메일 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Mail size={20} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Email</p>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      className="w-full text-lg font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{user.email}</p>
                  )}
                </div>
              </div>

              {/* 전화번호 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone size={20} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleInputChange}
                      className="w-full text-lg font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{user.phone || 'Not registered'}</p>
                  )}
                </div>
              </div>

              {/* 주소 */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin size={20} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Address</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="address"
                      value={editForm.address}
                      onChange={handleInputChange}
                      className="w-full text-lg font-medium text-gray-900 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-lg font-medium text-gray-900">{user.address || 'Not registered'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 액션 카드들 */}
          <div className="space-y-6">
            {/* 계정 설정 */}
            <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Settings</h2>
              
              <div className="space-y-4">
                {/* 비밀번호 변경 */}
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <Lock size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-500">For security, update your password regularly</p>
                  </div>
                </button>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Globe size={20} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Language</p>
                      <p className="text-sm text-gray-500">This site is available in English only.</p>
                    </div>
                  </div>
                </div>

                {/* Newsletter 구독 관리 */}
                {user?.email && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isNewsletterSubscribed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {isNewsletterSubscribed ? (
                          <Bell size={20} className="text-green-600" />
                        ) : (
                          <BellOff size={20} className="text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Newsletter Subscription</p>
                        <p className="text-sm text-gray-500">
                          {isNewsletterSubscribed ? 'Currently subscribed' : 'Not subscribed'}
                        </p>
                      </div>
                    </div>
                    {isNewsletterSubscribed ? (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to unsubscribe from the newsletter?')) {
                            unsubscribeFromNewsletter(user.email)
                            alert('You have been unsubscribed from the newsletter.')
                          }
                        }}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <BellOff size={16} />
                        <span>Unsubscribe</span>
                      </button>
                    ) : (
                      <p className="text-sm text-gray-500 text-center">
                        You can subscribe on the homepage.
                      </p>
                    )}
                  </div>
                )}

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-4 p-4 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors group"
                >
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-red-100 rounded-full flex items-center justify-center transition-colors">
                    <LogOut size={20} className="text-gray-600 group-hover:text-red-600 transition-colors" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">Log Out</p>
                    <p className="text-sm text-gray-500">Sign out of your account</p>
                  </div>
                </button>

                {/* 회원 탈퇴 */}
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full flex items-center space-x-4 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
                >
                  <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center transition-colors">
                    <X size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-red-700">Cancel Membership</p>
                    <p className="text-sm text-red-600">Your account and data will be deleted</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/cart')}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Cart
                </button>
                <button 
                  onClick={() => router.push('/stickers')}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Browse Products
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">Change Password</h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* 에러 메시지 */}
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm">{passwordError}</p>
                  </div>
                )}

                {/* 현재 비밀번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* 새 비밀번호 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Enter a new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Use at least 6 characters</p>
                </div>

                {/* 새 비밀번호 확인 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:transform-none font-medium"
                  >
                    {isChangingPassword ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating…</span>
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 탈퇴 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 border border-white/20 rounded-3xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Cancel Membership</h3>
                <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <p className="text-gray-700 mb-6">Are you sure you want to cancel your membership? This action cannot be undone and will delete your account and related data.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCancelMembership}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-60"
                >
                  {isCancelling ? 'Processing…' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
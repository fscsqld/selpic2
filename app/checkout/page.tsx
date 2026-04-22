'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Building2, DollarSign, ArrowLeft, ArrowRight, Check, ChevronDown, Wallet, HelpCircle, BadgeCheck, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/useTranslation'
import {
  mergePersistedSiteConfig,
  normalizeRehydratedContentStoreState,
  useContentStore,
  type ShippingOption
} from '@/lib/contentStore'
import { useUserAuth } from '@/lib/userAuth'
import { getGradeInfo } from '@/lib/vipGradeConfig'
import { updateUserGrade } from '@/lib/userGradeUtils'
import AustralianAddressForm, { AddressData } from '@/components/AustralianAddressForm'
import OrderNotification from '@/components/OrderNotification'
import { getCustomizationSurchargePerUnit } from '@/lib/orderCustomizationSurcharge'
import type { OrderRecord } from '@/lib/store'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, createOrder, sendOrderConfirmationEmail, products, orders } = useStore()
  const { user, updateUser, users: allUsers } = useUserAuth()
  const { 
    getActiveShippingOptions, 
    getDefaultShippingOption,
    getPaymentOptionByType,
    getActivePaymentOptions,
    getDefaultPaymentOption,
    validatePromoCode,
    applyPromoCode,
    incrementPromoCodeUsage,
    promoCodes,
    getVIPGradeBenefitForCheckout,
    _hasHydrated
  } = useContentStore()
  // Subscribe so threshold/message updates from admin always drive shipping math
  const freeShippingSettings = useContentStore((s) => s.freeShippingSettings)
  // 강제 리렌더 트리거: 관리자가 VIP 설정 또는 Promo Code를 변경해도 즉시 반영되도록 store 구독
  const [storeVersion, setStoreVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = (useContentStore as any).subscribe?.(() => {
      setStoreVersion((v: number) => v + 1)
    })
    
    // content-store-updated 이벤트 리스너 추가
    const handleContentStoreUpdate = () => {
      setStoreVersion((v: number) => v + 1)
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('content-store-updated', handleContentStoreUpdate)
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'content-store' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { state?: Record<string, unknown> }
          const remote = parsed?.state
          if (remote && typeof remote === 'object') {
            const merged = mergePersistedSiteConfig(remote, useContentStore.getState())
            normalizeRehydratedContentStoreState(merged)
            useContentStore.setState(merged)
          }
        } catch {
          /* ignore */
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage)
    }
    
    return () => {
      if (unsubscribe) unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('content-store-updated', handleContentStoreUpdate)
        window.removeEventListener('storage', onStorage)
      }
    }
  }, [])
  
  // Get payment options from Content Store
  const allActivePaymentOptions = getActivePaymentOptions()
  const paymentOptions = allActivePaymentOptions
  const defaultPaymentOption =
    getDefaultPaymentOption() ||
    paymentOptions[0] ||
    allActivePaymentOptions[0]
  
  // 디버깅: Promo Codes 로드 확인
  useEffect(() => {
    if (_hasHydrated) {
      console.log('📦 Promo Codes loaded:', {
        count: promoCodes?.length || 0,
        codes: promoCodes?.map(c => c.code) || [],
        active: promoCodes?.filter(c => c.isActive).map(c => c.code) || []
      })
    }
  }, [_hasHydrated, promoCodes])
  const { t } = useTranslation()
  const { isLoggedIn, user: currentUser } = useUserAuth()
  
  // Get shipping options from Content Store
  const shippingOptions = getActiveShippingOptions()
  const defaultShippingOption = getDefaultShippingOption() || shippingOptions[0]
  
  // CRITICAL: Check cart length first before any other hooks to prevent hooks mismatch
  const hasCartItems = cart.length > 0
  const getAvailableStock = (productId: string) => {
    const storeProduct = products.find(p => p.id === productId)
    if (!storeProduct) return 0
    const stock = (storeProduct as any).stockQuantity
    if (typeof stock === 'number') {
      return Math.max(0, stock)
    }
    return storeProduct.inStock ? Infinity : 0
  }
  const insufficientItems = cart.filter(item => item.quantity > getAvailableStock(item.product.id))
  
  // Safe translation wrapper to prevent runtime errors
  const safeT = (key: string, fallback: string = '') => {
    try {
      return t(key) || fallback
    } catch (error) {
      console.warn(`Translation error for key: ${key}`, error)
      return fallback
    }
  }
  
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY FUNCTIONS THAT USE THEM
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  
  // Initialize payment method with default option
  useEffect(() => {
    if (!defaultPaymentOption) return

    const isCurrentMethodActive = paymentOptions.some((o) => o.type === paymentMethod)
    if (!paymentMethod || !isCurrentMethodActive) {
      setPaymentMethod(defaultPaymentOption.type)
    }
  }, [defaultPaymentOption, paymentMethod, paymentOptions])
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)
  
  // Initialize selectedShipping with default option
  useEffect(() => {
    if (!selectedShipping && defaultShippingOption) {
      setSelectedShipping(defaultShippingOption)
    }
  }, [defaultShippingOption, selectedShipping])
  const [showShippingOptions, setShowShippingOptions] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<{ code: string; discount: number } | null>(null)
  const [promoCodeError, setPromoCodeError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+61 ', // 호주 국가 코드만 기본값
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    depositorName: '',
    deliveryContact: '+61 ' // 호주 국가 코드만 기본값
  })
  
  const [addressData, setAddressData] = useState<AddressData>({
    streetAddress: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'AU' // 기본값을 호주로 설정
  })

  // 로그인 사용자: 체크아웃 폼에 계정 정보 자동 입력 → 주문 시 customer.email이 user.email과 일치해 Order History에 표시됨
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return
    const nameParts = (currentUser.name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    setFormData(prev => ({
      ...prev,
      ...(prev.email === '' && currentUser.email ? { email: currentUser.email } : {}),
      ...(prev.firstName === '' && firstName ? { firstName } : {}),
      ...(prev.lastName === '' && lastName ? { lastName } : {}),
      ...(prev.phone === '+61 ' || prev.phone === '' ? { phone: (currentUser.phone && currentUser.phone.trim()) ? (currentUser.phone.startsWith('+') || currentUser.phone.startsWith('0') ? currentUser.phone : `+61 ${currentUser.phone.replace(/^61/, '')}`) : prev.phone } : {}),
    }))
  }, [isLoggedIn, currentUser])

  // 주문 완료 알림 상태
  const [showOrderNotification, setShowOrderNotification] = useState(false)
  const [orderNotificationData, setOrderNotificationData] = useState<{
    orderId: string
    customerName: string
    total: number
    items: Array<{ name: string; quantity: number }>
    timestamp: string
  } | null>(null)

  // DEFINE ALL HELPER FUNCTIONS FIRST, IN DEPENDENCY ORDER
  
  const calculateSubtotal = (): number => {
    if (!cart || cart.length === 0) {
      return 0
    }
    
    const result = cart.reduce((total, item) => {
      // 안전한 가격 및 수량 확인
      const price = typeof item.product?.price === 'number' && !isNaN(item.product.price) 
        ? item.product.price 
        : 0
      const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0
        ? item.quantity 
        : 0
      
      const itemTotal = price * quantity
      const surchargePerUnit = getCustomizationSurchargePerUnit(item.customizations, item.product)
      const additionalCost = surchargePerUnit * quantity
      
      return total + itemTotal + additionalCost
    }, 0)
    
    console.log('💰 Subtotal 계산:', {
      cartLength: cart.length,
      result,
      cartItems: cart.map(item => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        customizations: item.customizations
      }))
    })
    
    return result
  }

  // 카테고리별 할인 계산용 cartItems (커스터마이징 비용 포함 + 카테고리 정규화)
  const buildCartItemsForDiscount = () => {
    const normalizeCategory = (raw?: string, product?: any) => {
      // isHotGoods 플래그 우선
      if (product && (product as any).isHotGoods) return 'HotGoods'
      const lower = (raw || '').toLowerCase()
      if (lower.includes('market s') || lower.includes('market-s') || lower === 'markets') return 'HotGoods'
      if (lower.includes('phone case') || lower.includes('phone-case') || lower.includes('phonecase') || lower.includes('phone cases')) return 'HotGoods'
      if (lower.includes('sticker')) return 'Stickers'
      if (lower.includes('stamp')) return 'Stamps'
      if (lower.includes('hotgoods') || lower.includes('hot goods') || lower.includes('hot-goods') || lower === 'hot') return 'HotGoods'
      return raw || 'Other'
    }

    return cart && cart.length > 0 ? cart.map(item => {
      const priceNum = typeof item.product.price === 'number'
        ? item.product.price
        : parseFloat((item.product.price as any) ?? '0')
      const quantityNum = typeof item.quantity === 'number'
        ? item.quantity
        : parseFloat((item.quantity as any) ?? '0')
      const safePrice = !isNaN(priceNum) && isFinite(priceNum) ? priceNum : 0
      const safeQty = !isNaN(quantityNum) && isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 0
      const itemTotal = safePrice * safeQty
      const surchargePerUnit = getCustomizationSurchargePerUnit(item.customizations, item.product)
      const customizationCost = surchargePerUnit * safeQty
      const categoryRaw =
        (item.product as any)?.category ||
        (item.product as any)?.categoryName ||
        (item.product as any)?.productCategory ||
        (item.product as any)?.type ||
        ''
      return {
        productId: item.product.id,
        category: normalizeCategory(categoryRaw, item.product),
        price: itemTotal + customizationCost
      }
    }) : []
  }

  const getShippingPrice = (option: ShippingOption | null) => {
    if (!option) return 0
    const subtotal = calculateSubtotal()
    
    // VIP 등급 무료 배송 확인
    if (currentUser && currentUser.currentGrade !== undefined) {
      const gradeCode = currentUser.currentGrade
      const cartItemsForDiscount = buildCartItemsForDiscount()
      const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
      if (vipBenefit && vipBenefit.freeShipping) {
        return 0 // VIP 등급 무료 배송
      }
    }
    
    // 항상 무료 옵션 (Cash on Delivery 등)
    if (option.alwaysFree) {
      return 0
    }

    // 전역 무료 배송 설정이 활성화되어 있고 기준 금액을 달성한 경우
    if (freeShippingSettings.enabled && subtotal >= freeShippingSettings.threshold) {
      // 기준 금액 달성 시 완전 무료
      if (option.freeShippingWhenThresholdMet) {
        return 0
      }
      // 기준 금액 달성 시 할인 적용
      if (option.discountWhenThresholdMet && option.discountWhenThresholdMet > 0) {
        const discounted = option.price - option.discountWhenThresholdMet
        return discounted > 0 ? Number(discounted.toFixed(2)) : 0
      }
    }
    
    return option.price
  }

  const calculateTotal = (): number => {
    const subtotal = calculateSubtotal()
    let shipping = getShippingPrice(selectedShipping)
    const cartItemsForDiscount = buildCartItemsForDiscount()
    // 스토어가 아직 하이드레이션되지 않았다면 할인 계산을 건너뛰고 이후 리렌더에서 반영
    if (_hasHydrated === false) {
      const paymentOption = getPaymentOptionByType(paymentMethod as 'card' | 'paypal' | 'bank' | 'cash' | 'stripe')
      return subtotal + shipping + (getPaymentFee(paymentOption, subtotal) || 0)
    }
    
    // VIP 등급 할인 계산
    let vipDiscount = 0
    
    // 디버깅: currentUser 상태 확인
    console.log('🔍 calculateTotal - currentUser 상태:', {
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        currentGrade: currentUser.currentGrade,
        totalSalesAmount: currentUser.totalSalesAmount
      } : 'null',
      isLoggedIn,
      hasGrade: currentUser?.currentGrade !== undefined
    })
    if (currentUser && currentUser.currentGrade !== undefined) {
      const gradeCode = currentUser.currentGrade
      
      // 디버깅: vipGradeBenefits 상태 확인
      let storeVipBenefits: any[] = []
      try {
        const storeState = useContentStore.getState() as any
        storeVipBenefits = storeState.vipGradeBenefits || []
        console.log('🔍 calculateTotal - vipGradeBenefits 상태:', {
          totalBenefits: storeVipBenefits.length || 0,
          activeBenefits: storeVipBenefits.filter((b: any) => b.isActive).length || 0,
          benefitsForGrade: storeVipBenefits.filter((b: any) => b.gradeCode === gradeCode && b.isActive).length || 0
        })
      } catch (e) {
        console.error('❌ vipGradeBenefits 접근 오류:', e)
      }
      
    const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
      
      // 디버깅: calculateTotal 함수에서 VIP 할인 확인
      const gradeNames = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP']
      const gradeName = gradeNames[gradeCode] || `Grade ${gradeCode}`
      
      if (vipBenefit) {
        vipDiscount = vipBenefit.discount
        // VIP 무료배송이면 배송비 0 처리
        if (vipBenefit.freeShipping) {
          shipping = 0
        }
        console.log(`✅ calculateTotal - ${gradeName} 등급 할인 적용:`, {
          gradeCode,
          gradeName,
          subtotal: `$${subtotal.toFixed(2)}`,
          discount: `$${vipDiscount.toFixed(2)}`,
          freeShipping: vipBenefit.freeShipping,
          baseDiscountPercentage: vipBenefit.benefit?.baseDiscountPercentage,
          categoryDiscounts: vipBenefit.benefit?.categoryDiscounts,
          maxDiscountAmount: vipBenefit.benefit?.maxDiscountAmount
        })
      } else {
        // 혜택을 찾았지만 null이 반환된 경우, 원인 확인
        const foundBenefit = storeVipBenefits.find((b: any) => b.gradeCode === gradeCode && b.isActive)
        
        // minPurchaseAmount 체크 실패인지 확인
        const minPurchaseAmountFailed = foundBenefit?.minPurchaseAmount && 
          foundBenefit.minPurchaseAmount > 0 && 
          subtotal < foundBenefit.minPurchaseAmount
        
        if (minPurchaseAmountFailed) {
          // minPurchaseAmount 미달인 경우 - 에러가 아닌 정보성 로그
          console.log(`ℹ️ calculateTotal - ${gradeName} 등급 혜택: 최소 구매 금액 미달`, {
            gradeCode,
            gradeName,
            subtotal: `$${subtotal.toFixed(2)}`,
            minPurchaseAmount: `$${foundBenefit.minPurchaseAmount.toFixed(2)}`,
            required: `$${(foundBenefit.minPurchaseAmount - subtotal).toFixed(2)} 더 필요`,
            message: 'This is expected behavior when subtotal is below minimum purchase amount'
          })
        } else {
          // 다른 원인인 경우에만 에러 로그
          console.error(`❌ calculateTotal - ${gradeName} 등급 혜택 없음:`, {
            gradeCode,
            gradeName,
            subtotal: `$${subtotal.toFixed(2)}`,
            reason: 'getVIPGradeBenefitForCheckout returned null',
            storeVipBenefitsCount: storeVipBenefits.length || 0,
            activeBenefitsForGrade: storeVipBenefits.filter((b: any) => b.gradeCode === gradeCode && b.isActive).length || 0,
            foundBenefit: foundBenefit ? {
              id: foundBenefit.id,
              minPurchaseAmount: foundBenefit.minPurchaseAmount ? `$${foundBenefit.minPurchaseAmount.toFixed(2)}` : '없음',
              baseDiscountPercentage: foundBenefit.baseDiscountPercentage,
              isActive: foundBenefit.isActive,
              minPurchaseAmountCheck: foundBenefit.minPurchaseAmount ? (subtotal >= foundBenefit.minPurchaseAmount ? '통과' : `실패 (${(foundBenefit.minPurchaseAmount - subtotal).toFixed(2)} 부족)`) : '조건 없음'
            } : '혜택 없음'
          })
        }
      }
    } else {
      console.warn('⚠️ calculateTotal - currentUser 또는 currentGrade 없음:', {
        hasCurrentUser: !!currentUser,
        currentGrade: currentUser?.currentGrade,
        isLoggedIn
      })
    }
    
    // 프로모션 코드 할인
    const promoDiscount = appliedPromoCode ? appliedPromoCode.discount : 0
    
    // 중복 할인 허용 여부 확인
    let totalDiscount = 0
    if (vipDiscount > 0 && promoDiscount > 0) {
      // VIP 혜택과 프로모션 코드의 중복 허용 여부 확인
      const vipBenefit = currentUser && currentUser.currentGrade !== undefined
        ? getVIPGradeBenefitForCheckout(currentUser.currentGrade, subtotal, buildCartItemsForDiscount())
        : null
      
      // 프로모션 코드 정보 가져오기
      const promoCodeInfo = appliedPromoCode 
        ? useContentStore.getState().promoCodes.find((pc: any) => pc.code === appliedPromoCode.code)
        : null
      
      // 둘 다 중복 허용이 true일 때만 합산, 아니면 더 큰 할인만 적용
      const vipAllowsStacking = vipBenefit?.benefit?.allowPromoCodeStacking !== false // 기본값: true
      const promoAllowsStacking = promoCodeInfo?.allowVIPStacking !== false // 기본값: true
      
      if (vipAllowsStacking && promoAllowsStacking) {
        // 중복 허용: 두 할인 합산
        totalDiscount = Math.min(vipDiscount + promoDiscount, subtotal)
      } else {
        // 중복 비허용: 더 큰 할인만 적용
        totalDiscount = Math.max(vipDiscount, promoDiscount)
      }
    } else {
      // 하나만 적용되는 경우
      totalDiscount = Math.min(vipDiscount + promoDiscount, subtotal)
    }
    
    const selectedPaymentOption = paymentOptions.find(opt => opt.type === paymentMethod)
    const paymentFee = selectedPaymentOption ? getPaymentFee(selectedPaymentOption, subtotal) : 0
    
    // 최종 계산 로그
    const finalTotal = Math.max(0, subtotal + shipping - totalDiscount + paymentFee)
    console.log('💰 calculateTotal - 최종 계산:', {
      subtotal: `$${subtotal.toFixed(2)}`,
      shipping: `$${shipping.toFixed(2)}`,
      vipDiscount: `$${vipDiscount.toFixed(2)}`,
      promoDiscount: `$${promoDiscount.toFixed(2)}`,
      totalDiscount: `$${totalDiscount.toFixed(2)}`,
      paymentFee: `$${paymentFee.toFixed(2)}`,
      finalTotal: `$${finalTotal.toFixed(2)}`
    })
    
    // GST is included in subtotal; do not add tax again
    return finalTotal
  }

  // 프로모션 코드 적용 함수
  const handleApplyPromoCode = () => {
    if (!promoCodeInput.trim()) {
      setPromoCodeError('Please enter a promo code')
      return
    }

    const subtotal = calculateSubtotal()
    const cartItems = cart && cart.length > 0 ? cart.map(item => ({
      productId: item.product.id,
      category: (item.product as any).category
    })) : []
    // 코드 정규화: 공백 제거 및 대문자 변환
    const normalizedCode = promoCodeInput.trim().toUpperCase()
    
    console.log('🔍 Applying promo code:', {
      code: normalizedCode,
      subtotal,
      cartItems,
      cartLength: cart.length
    })
    
    const validation = validatePromoCode(normalizedCode, subtotal, cartItems, user?.id, orders, user?.email, user?.phone)
    
    console.log('✅ Validation result:', validation)
    
    if (!validation.valid) {
      setPromoCodeError(validation.error || 'Invalid promo code')
      return
    }

    // 검증이 통과했으므로 할인 계산
    if (!validation.promoCode) {
      setPromoCodeError('Promo code validation failed')
      return
    }

    const promoCode = validation.promoCode
    let discount = 0

    // 할인 계산
    if (promoCode.discountType === 'percentage') {
      discount = (subtotal * promoCode.discountValue) / 100
      if (promoCode.maxDiscountAmount) {
        discount = Math.min(discount, promoCode.maxDiscountAmount)
      }
    } else {
      discount = promoCode.discountValue
    }

    // 할인 금액이 subtotal을 초과하지 않도록
    discount = Math.min(discount, subtotal)
    discount = Number(discount.toFixed(2))

    console.log('💰 Discount calculated:', {
      discount,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      subtotal
    })

    // 할인 적용
    setAppliedPromoCode({ code: normalizedCode, discount })
    setPromoCodeError(null)
    setPromoCodeInput('')
    
    console.log('✅ Promo code applied successfully')
  }

  // 프로모션 코드 제거 함수
  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null)
    setPromoCodeError(null)
    setPromoCodeInput('')
  }

  // ALL HOOKS MUST BE CALLED AFTER FUNCTIONS THEY DEPEND ON
  useEffect(() => {
    if (!isLoggedIn) {
      alert('Please sign in to continue to checkout.')
      router.push('/login')
    } else if (cart.length === 0) {
      router.push('/cart')
    }
  }, [cart, router, isLoggedIn])

  // VIP Grade Benefits/Criteria 변경 감지 및 실시간 반영
  useEffect(() => {
    const handleContentStoreUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.type === 'vipGradeBenefits' || customEvent.detail?.type === 'vipGradeConfigs') {
        console.log('🔄 Checkout: VIP Grade 설정 변경 감지, 할인 정보 새로고침')
        // 강제 리렌더링을 위해 상태 업데이트 (실제로는 calculateTotal이 최신 상태를 사용하므로 자동 반영됨)
        // 하지만 UI 업데이트를 보장하기 위해 빈 상태 업데이트
        setFormData(prev => ({ ...prev }))
      }
    }

    if (typeof window === 'undefined') return
    
    window.addEventListener('content-store-updated', handleContentStoreUpdate)
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('content-store-updated', handleContentStoreUpdate)
      }
    }
  }, [])

  // Ensure payment method meets minimum order requirements
  useEffect(() => {
    const currentSubtotal = calculateSubtotal()
    const selectedOption = paymentOptions.find(opt => opt.type === paymentMethod)
    if (selectedOption && selectedOption.minOrderAmount && currentSubtotal < selectedOption.minOrderAmount) {
      // Switch to default payment option if current one doesn't meet requirements
      if (defaultPaymentOption) {
        setPaymentMethod(defaultPaymentOption.type)
      }
    }
  }, [cart, paymentMethod, paymentOptions, defaultPaymentOption])

  // 결제 방법 변경
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method)
  }
  
  // 결제 옵션 수수료 계산
  const getPaymentFee = (option: any, subtotal: number): number => {
    if (!option) return 0
    if (option.feeType === 'percentage' && option.feePercentage) {
      return (subtotal * option.feePercentage) / 100
    }
    return option.fee || 0
  }

  // 장바구니가 비어있으면 로딩 표시
  if (!hasCartItems) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('checkout.redirectingToCart')}</h2>
          </div>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    // 카드번호 자동 포맷팅
    if (name === 'cardNumber') {
      const cleaned = value.replace(/\s/g, '')
      const match = cleaned.match(/(\d{1,4})(\d{1,4})?(\d{1,4})?(\d{1,4})?/)
      if (match) {
        formattedValue = [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ')
      }
    }

    // 만료일 자동 포맷팅
    if (name === 'expiryDate') {
      const cleaned = value.replace(/\D/g, '')
      if (cleaned.length >= 2) {
        formattedValue = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
      } else {
        formattedValue = cleaned
      }
    }

    // CVV 숫자만 입력
    if (name === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 4)
    }

    // 전화번호 필드 (+61 이후 자유 입력)
    if (name === 'phone' || name === 'deliveryContact') {
      // +61로 시작하는지 확인
      if (!value.startsWith('+61')) {
        // +61이 없으면 자동으로 추가
        formattedValue = '+61 ' + value.replace(/\D/g, '').slice(0, 15)
      } else {
        // +61 이후는 자유 입력
        formattedValue = value
      }
    }

    // 우편번호 숫자만 입력
    if (name === 'postalCode') {
      formattedValue = value.replace(/\D/g, '').slice(0, 5)
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
  }

  // 주소가 변경될 때 Mansfield 지역 확인 및 자동 배송 옵션 설정
  const handleAddressChange = (newAddressData: AddressData) => {
    setAddressData(newAddressData)
  }

  const buildOrderPayload = (mode: 'default' | 'stripe'): Omit<OrderRecord, 'id' | 'createdAtIso'> => {
    if (!selectedShipping) {
      throw new Error('Please select a shipping option.')
    }

    const effectivePaymentType = mode === 'stripe' ? 'stripe' : paymentMethod

    const items = cart.map(item => {
      const storeProduct = products.find(p => p.id === item.product.id)
      const sourceProduct = storeProduct ?? item.product
      const stockQuantity =
        typeof (storeProduct as any)?.stockQuantity === 'number'
          ? Math.max(0, (storeProduct as any).stockQuantity)
          : undefined
      const safetyStock =
        typeof (storeProduct as any)?.safetyStock === 'number'
          ? Math.max(0, (storeProduct as any).safetyStock)
          : undefined
      const incomingStock =
        typeof (storeProduct as any)?.incomingStock === 'number'
          ? Math.max(0, (storeProduct as any).incomingStock)
          : undefined
      const remainingStock =
        typeof stockQuantity === 'number'
          ? Math.max(0, stockQuantity - item.quantity)
          : undefined

      const basePrice =
        typeof sourceProduct.price === 'number' && !isNaN(sourceProduct.price)
          ? sourceProduct.price
          : 0
      const surchargePerUnit = getCustomizationSurchargePerUnit(item.customizations, sourceProduct)
      const unitPriceInclOptions = Number((basePrice + surchargePerUnit).toFixed(2))

      return {
        productId: sourceProduct.id,
        name: sourceProduct.name,
        price: unitPriceInclOptions,
        baseUnitPrice: Number(basePrice.toFixed(2)),
        customizationSurchargePerUnit: Number(surchargePerUnit.toFixed(2)),
        image: sourceProduct.image,
        quantity: item.quantity,
        customizations: item.customizations,
        category: (sourceProduct as any).category,
        subcategory: (sourceProduct as any).subcategory,
        brand: (sourceProduct as any).brand,
        size: (sourceProduct as any).size,
        color: (sourceProduct as any).color,
        type: (sourceProduct as any).type,
        spfLevel: (sourceProduct as any).spfLevel,
        isNew: (sourceProduct as any).isNew,
        isBestSeller: (sourceProduct as any).isBestSeller,
        isPopular: (sourceProduct as any).isPopular,
        inStock: (sourceProduct as any).inStock,
        features: (sourceProduct as any).features,
        bundleItems: Array.isArray((sourceProduct as any).bundleItems)
          ? (sourceProduct as any).bundleItems.map((bundleItem: any) => ({ ...bundleItem }))
          : undefined,
        isBundle: Boolean((sourceProduct as any).isBundle),
        stockQuantityAtOrder: stockQuantity,
        remainingStock,
        safetyStock,
        incomingStock
      }
    })

    const subtotalNow = calculateSubtotal()
    const shippingNow = getShippingPrice(selectedShipping)

    const selectedPaymentOptionForStatus = paymentOptions.find(opt => opt.type === effectivePaymentType)
    // Bank transfer is never "paid" at checkout — admin must confirm the deposit first.
    // (Do not tie this to `requiresAuth`; admins sometimes enable that flag for bank, which wrongly stored orders as paid.)
    const paymentStatus: 'paid' | 'pending' =
      mode === 'stripe'
        ? 'paid'
        : effectivePaymentType === 'bank'
          ? 'pending'
          : selectedPaymentOptionForStatus?.requiresAuth
            ? 'paid'
            : 'pending'

    const getShippingOptionName = (id: string) => {
      const option = shippingOptions.find(opt => opt.id === id)
      return option ? option.name : id
    }

    let vipDiscount = 0
    let vipGradeCode: number | undefined = undefined
    let vipGradeName: string | undefined = undefined
    if (currentUser && currentUser.currentGrade !== undefined) {
      vipGradeCode = currentUser.currentGrade
      const cartItemsForDiscount = buildCartItemsForDiscount()
      const vipBenefit = getVIPGradeBenefitForCheckout(vipGradeCode, subtotalNow, cartItemsForDiscount)

      const gradeNames = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP']
      const gradeName = gradeNames[vipGradeCode] || `Grade ${vipGradeCode}`

      if (vipBenefit && vipBenefit.discount > 0) {
        vipDiscount = vipBenefit.discount
        const gradeInfo = getGradeInfo(vipGradeCode)
        vipGradeName = gradeInfo?.nameEn || gradeName

        console.log(`📦 주문 생성 - ${gradeName} 등급 할인 적용:`, {
          gradeCode: vipGradeCode,
          gradeName: vipGradeName,
          subtotal: `$${subtotalNow.toFixed(2)}`,
          discount: `$${vipDiscount.toFixed(2)}`,
          freeShipping: vipBenefit.freeShipping
        })
      } else {
        console.log(`ℹ️ 주문 생성 - ${gradeName} 등급 할인 없음:`, {
          gradeCode: vipGradeCode,
          gradeName,
          subtotal: `$${subtotalNow.toFixed(2)}`,
          reason: !vipBenefit ? '혜택을 찾을 수 없음' : '할인 금액이 0'
        })
      }
    }

    const promoDiscount = appliedPromoCode ? appliedPromoCode.discount : 0

    let totalDiscount = 0
    if (vipDiscount > 0 && promoDiscount > 0) {
      const vipBenefit = vipGradeCode !== undefined
        ? getVIPGradeBenefitForCheckout(vipGradeCode, subtotalNow, buildCartItemsForDiscount())
        : null

      const promoCodeInfo = appliedPromoCode
        ? useContentStore.getState().promoCodes.find((pc: any) => pc.code === appliedPromoCode.code)
        : null

      const vipAllowsStacking = vipBenefit?.benefit?.allowPromoCodeStacking !== false
      const promoAllowsStacking = promoCodeInfo?.allowVIPStacking !== false

      if (vipAllowsStacking && promoAllowsStacking) {
        totalDiscount = Math.min(vipDiscount + promoDiscount, subtotalNow)
      } else {
        totalDiscount = Math.max(vipDiscount, promoDiscount)
      }
    } else {
      totalDiscount = Math.min(vipDiscount + promoDiscount, subtotalNow)
    }

    const selectedPaymentOptionResolved = paymentOptions.find(opt => opt.type === effectivePaymentType)
    const paymentFee = selectedPaymentOptionResolved ? getPaymentFee(selectedPaymentOptionResolved, subtotalNow) : 0
    const finalTotal = Math.max(0, subtotalNow + shippingNow - totalDiscount + paymentFee)

    return {
      items,
      subtotal: Number(subtotalNow.toFixed(2)),
      shippingPrice: Number(shippingNow.toFixed(2)),
      paymentFee: Number(paymentFee.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      vipDiscount: vipDiscount > 0 ? Number(vipDiscount.toFixed(2)) : undefined,
      vipGradeCode: vipGradeCode,
      vipGradeName: vipGradeName,
      promoCode: appliedPromoCode ? appliedPromoCode.code : undefined,
      promoDiscount: promoDiscount > 0 ? Number(promoDiscount.toFixed(2)) : undefined,
      total: Number(finalTotal.toFixed(2)),
      shippingOptionId: selectedShipping.id,
      shippingOptionName: getShippingOptionName(selectedShipping.id),
      paymentMethod: effectivePaymentType as OrderRecord['paymentMethod'],
      paymentMethodName: selectedPaymentOptionResolved ? selectedPaymentOptionResolved.name : effectivePaymentType,
      status: paymentStatus,
      customer: {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      },
      address: {
        streetAddress: addressData.streetAddress,
        suburb: addressData.suburb,
        state: addressData.state,
        postcode: addressData.postcode,
        country: addressData.country,
        asSingleLine: [addressData.streetAddress, [addressData.suburb, addressData.state, addressData.postcode, addressData.country].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      },
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Check if cart has items
      if (cart.length === 0) {
        throw new Error(t('checkout.cartEmpty') || '장바구니가 비어있습니다. 상품을 추가한 후 다시 시도해주세요.')
      }

      // 폼 데이터 검증
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || 
          !addressData.streetAddress || !addressData.suburb || 
          !addressData.state || !addressData.postcode) {
                  throw new Error(t('checkout.requiredFields'))
      }

      // 결제 방법별 추가 검증
      const selectedPaymentOption = paymentOptions.find(opt => opt.type === paymentMethod)
      if (selectedPaymentOption?.requiresAuth) {
        if (paymentMethod === 'card') {
          if (!formData.cardNumber || !formData.cardholderName || !formData.expiryDate || !formData.cvv) {
            throw new Error(t('checkout.cardInfoRequired'))
          }
        } else if (paymentMethod === 'paypal') {
          // PayPal은 별도 인증 필요 없음 (외부 리다이렉트)
        } else if (paymentMethod === 'stripe') {
          // Card / wallet collected on Stripe-hosted Checkout
        }
      } else {
        if (paymentMethod === 'bank') {
          if (!formData.depositorName) {
            throw new Error(t('checkout.depositorNameRequired'))
          }
        } else if (paymentMethod === 'cash') {
          if (!formData.deliveryContact) {
            throw new Error(t('checkout.deliveryContactRequired'))
          }
        }
      }
      
      // 최소/최대 주문 금액 검증
      if (selectedPaymentOption) {
        const subtotal = calculateSubtotal()
        if (selectedPaymentOption.minOrderAmount && subtotal < selectedPaymentOption.minOrderAmount) {
          throw new Error(`Minimum order amount of $${selectedPaymentOption.minOrderAmount} required for ${selectedPaymentOption.name}`)
        }
        if (selectedPaymentOption.maxOrderAmount && subtotal > selectedPaymentOption.maxOrderAmount) {
          throw new Error(`Maximum order amount of $${selectedPaymentOption.maxOrderAmount} for ${selectedPaymentOption.name}`)
        }
      }

      const latestStockIssues = cart.filter(item => item.quantity > getAvailableStock(item.product.id))
      if (latestStockIssues.length > 0) {
        alert('Some items are no longer available in the requested quantity. Please adjust your cart before checking out.')
        setIsProcessing(false)
        router.push('/cart')
        return
      }

      if (paymentMethod === 'stripe') {
        let orderData: Omit<OrderRecord, 'id' | 'createdAtIso'>
        try {
          orderData = buildOrderPayload('stripe')
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Could not prepare checkout.'
          alert(msg)
          setIsProcessing(false)
          return
        }
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderDraft: orderData }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          alert(typeof data.error === 'string' ? data.error : 'Could not start Stripe checkout.')
          setIsProcessing(false)
          return
        }
        if (data.url) {
          window.location.href = data.url as string
          return
        }
        alert('No checkout URL returned.')
        setIsProcessing(false)
        return
      }

      // Legacy "card" form is a demo simulator — do not mark paid when Stripe Checkout is configured.
      if (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && paymentMethod === 'card') {
        alert(
          'Card payments are processed through Stripe Checkout. Please select the Stripe payment option and complete payment on the Stripe page.'
        )
        setIsProcessing(false)
        return
      }

      // Simulate payment processing
      await new Promise((resolve) => {
        setTimeout(() => {
          // Always succeed for demo purposes
          resolve(true)
        }, 2000)
      })

      console.log('💳 Payment simulation completed successfully')

      // Create order record for admin
      try {
        console.log('🛒 Creating order with cart:', cart)
        console.log('📝 Form data:', formData)
        console.log('📍 Address data:', addressData)

        const orderData = buildOrderPayload('default')

        console.log('📋 Order data being sent:', orderData)

        const items = orderData.items

        const newOrderId = createOrder(orderData)
        
        // 프로모션 코드 사용 횟수 증가
        if (appliedPromoCode) {
          const cartItemsForValidation = items.map(item => ({
            productId: item.productId,
            category: item.category
          }))
          const promoCode = validatePromoCode(appliedPromoCode.code, orderData.subtotal, cartItemsForValidation, user?.id, orders, user?.email, user?.phone)
          if (promoCode.valid && promoCode.promoCode) {
            incrementPromoCodeUsage(promoCode.promoCode.id)
          }
        }
        console.log('🆔 New order ID:', newOrderId)
        
        // VIP 등급 자동 업데이트 (로그인된 사용자만)
        // 주문이 생성된 후 약간의 지연을 두고 등급 업데이트 (주문 목록이 업데이트될 시간 확보)
        if (user && isLoggedIn) {
          setTimeout(() => {
            try {
              console.log('⭐ Updating VIP grade for user:', user.email)
              // 주문 목록을 다시 가져와서 최신 주문 포함
              const { orders: latestOrders } = useStore.getState()
              // 최신 사용자 정보 가져오기
              const latestUser = allUsers.find(u => u.id === user.id)
              if (latestUser) {
                updateUserGrade(latestUser, latestOrders, updateUser)
                console.log('✅ VIP grade updated successfully')
              }
            } catch (gradeError) {
              console.error('❌ Failed to update VIP grade:', gradeError)
              // 등급 업데이트 실패는 주문 완료를 막지 않음
            }
          }, 500) // 500ms 지연으로 주문 목록 업데이트 대기
        }
        
        if (typeof newOrderId === 'string') {
          console.log('✅ Order created successfully, redirecting...')
          
          // 주문 알림 데이터 설정
          setOrderNotificationData({
            orderId: newOrderId,
            customerName: `${formData.firstName} ${formData.lastName}`.trim(),
            total: orderData.total,
            items: items.map(orderItem => ({
              name: orderItem.name,
              quantity: orderItem.quantity
            })),
            timestamp: new Date().toISOString()
          })
          setShowOrderNotification(true)
          
          // 자동으로 주문 확인 이메일 발송
          try {
            console.log('📧 Sending automatic order confirmation email...')
            await sendOrderConfirmationEmail(newOrderId)
            console.log('✅ Order confirmation email sent successfully')
            // Bank transfer: receipt PDF is sent manually from admin after deposit is confirmed
            if (orderData.paymentMethod !== 'bank') {
              try {
                console.log('🧾 Sending automatic receipt email...')
                await useStore.getState().sendReceiptEmail(newOrderId)
                console.log('✅ Receipt email sent successfully')
              } catch (receiptError) {
                console.error('❌ Failed to send receipt email:', receiptError)
              }
            } else {
              console.log('🧾 Receipt email skipped (bank transfer — admin sends after deposit confirmation)')
            }
          } catch (emailError) {
            console.error('❌ Failed to send order confirmation email:', emailError)
            // 이메일 발송 실패는 주문 완료를 막지 않음
          }
          
          // Clear cart first, then redirect
          try {
            clearCart(isLoggedIn)
            console.log('🛒 Cart cleared successfully')
          } catch (cartError) {
            console.error('❌ Error clearing cart:', cartError)
            // Continue even if cart clearing fails
          }
          
          // Show success message and redirect
          alert(t('checkout.orderSuccess'))
          
          // Redirect customer back to Home so they can continue shopping
          setTimeout(() => {
            router.push('/')
          }, 100)
        } else {
          console.error('❌ Invalid order ID returned:', newOrderId)
                           alert(t('checkout.orderError'))
        }
      } catch (e) {
        console.error('❌ Error creating order:', e)
                       alert(t('checkout.orderError'))
        return // Stop execution if order creation fails
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '주문 처리에 실패했습니다. 다시 시도해주세요.'
      alert(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const subtotal: number = calculateSubtotal()
  // GST included in subtotal: compute as subtotal - (subtotal / 1.1) for better precision
  const gstIncluded: number = subtotal - subtotal / 1.1
  const shipping: number = getShippingPrice(selectedShipping)
  const total: number = calculateTotal()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <Header />
      
      {/* 주문 완료 알림 */}
      {showOrderNotification && orderNotificationData && (
        <OrderNotification
          orderId={orderNotificationData.orderId}
          customerName={orderNotificationData.customerName}
          total={orderNotificationData.total}
          items={orderNotificationData.items}
          timestamp={orderNotificationData.timestamp}
        />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/cart" className="group flex items-center space-x-2 text-slate-600 hover:text-purple-700 transition-colors duration-300">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span className="font-medium">{t('checkout.backToCart')}</span>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-light text-slate-900 tracking-wide mb-4">{t('checkout.title')}</h1>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-600 to-pink-600 mx-auto rounded-full"></div>
          </div>
        </div>

        {insufficientItems.length > 0 && (
          <div className="mb-8 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
            Some items exceed available stock. Please{' '}
            <Link href="/cart" className="underline font-medium">
              return to your cart
            </Link>{' '}
            to adjust quantities before completing checkout.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-8">
          {/* 배송 정보 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">1</span>
                </div>
                <h2 className="text-2xl font-light text-slate-800 tracking-wide">{t('checkout.shippingInfo')}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="group">
                  <label className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-5 py-4 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="Given name"
                  />
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-5 py-4 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition-all duration-300 placeholder-slate-400"
                    placeholder="Family name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('checkout.email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('checkout.phone')}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    maxLength={20}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+61 XXXX XXXX"
                  />
                </div>

                {/* 호주 주소 입력 컴포넌트 */}
                <div className="md:col-span-2 bg-slate-50/50 rounded-xl p-6 border border-slate-200">
                  <AustralianAddressForm
                    addressData={addressData}
                    onAddressChange={handleAddressChange}
                    required={true}
                    showCountry={true}
                  />
                </div>
              </div>
            </div>

            {/* 배송 옵션 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <h2 className="text-2xl font-light text-slate-800 tracking-wide">{t('checkout.shippingOptions')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShippingOptions(prev => !prev)}
                  className="w-8 h-8 rounded-full border border-slate-300 text-slate-700 flex items-center justify-center text-xl leading-none hover:border-purple-400 hover:text-purple-500 transition-colors"
                  aria-expanded={showShippingOptions}
                  aria-controls="shipping-options-panel"
                >
                  {showShippingOptions ? '−' : '+'}
                </button>
              </div>

              <div className="space-y-3" id="shipping-options-panel">
                {!showShippingOptions && selectedShipping && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between text-sm text-gray-900">
                      <span className="font-semibold">{selectedShipping.name}</span>
                      <span className="font-semibold text-primary-600">
                        ${getShippingPrice(selectedShipping).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{selectedShipping.description || selectedShipping.deliveryTime}</p>
                    <button
                      type="button"
                      onClick={() => setShowShippingOptions(true)}
                      className="mt-3 text-xs font-medium text-purple-600 hover:text-purple-700 transition"
                    >
                      {t('checkout.viewAllShippingOptions') ?? 'View all shipping options'}
                    </button>
                  </div>
                )}

                {showShippingOptions && shippingOptions.map((option) => {
                  const isClickAndCollect =
                    option.id === 'local-pickup' || option.id === 'click-collect-mansfield'

                  const isSelected = selectedShipping?.id === option.id

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedShipping(option)
                        setShowShippingOptions(false)
                      }}
                      className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 text-sm">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-gray-900">
                            <span className="font-semibold">{option.name}</span>
                            <span className="font-semibold text-primary-600">${getShippingPrice(option).toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-snug">
                            {option.description || option.deliveryTime}
                          </p>
                          {!isClickAndCollect && option.deliveryTime && (
                            <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
                              <span>
                                {t('checkout.shippingOptionsDetails.deliveryTime')}:{' '}
                                {option.deliveryTime}
                              </span>
                              <span>
                                {t('checkout.shippingOptionsDetails.tracking')}:{' '}
                                {option.tracking
                                  ? t('checkout.shippingOptionsDetails.included')
                                  : t('checkout.shippingOptionsDetails.notIncluded')}
                              </span>
                              <span>
                                {t('checkout.shippingOptionsDetails.insurance')}:{' '}
                                {option.insurance
                                  ? t('checkout.shippingOptionsDetails.included')
                                  : t('checkout.shippingOptionsDetails.notIncluded')}
                              </span>
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 mt-1" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

{/* 결제 방법 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">3</span>
                </div>
                <h2 className="text-2xl font-light text-slate-800 tracking-wide">{t('checkout.paymentMethod')}</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {paymentOptions.map((option) => {
                  const subtotal = calculateSubtotal()
                  const isDisabled = Boolean(
                    (option.minOrderAmount && subtotal < option.minOrderAmount) || 
                    (option.maxOrderAmount && subtotal > option.maxOrderAmount)
                  )
                  const isSelected = paymentMethod === option.type
                  const fee = getPaymentFee(option, subtotal)
                  
                  // Get icon component
                  let IconComponent = CreditCard
                  if (option.type === 'stripe') IconComponent = BadgeCheck
                  else if (option.type === 'paypal') IconComponent = Wallet
                  else if (option.type === 'bank') IconComponent = Building2
                  else if (option.type === 'cash') IconComponent = DollarSign
                  
                  return (
                    <label
                      key={option.id}
                      className={`group relative flex items-center space-x-4 p-6 border-2 rounded-xl transition-all duration-300 ${
                        isDisabled
                          ? 'opacity-60 cursor-not-allowed border-gray-200 bg-gray-50'
                          : isSelected
                          ? 'border-purple-500 bg-purple-50/50 shadow-lg cursor-pointer'
                          : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.type}
                        checked={isSelected}
                        onChange={() => !isDisabled && handlePaymentMethodChange(option.type)}
                        disabled={isDisabled}
                        className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                      />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-600'
                      } transition-all duration-300`}>
                        <IconComponent size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{option.name}</span>
                          {fee > 0 && (
                            <span className="text-xs text-gray-500">
                              (+${fee.toFixed(2)})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                        {option.type === 'stripe' && (
                          <div className="mt-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              Secure payment via <span className="font-semibold">Stripe</span>
                            </span>
                          </div>
                        )}
                        {isDisabled && option.minOrderAmount && (
                          <p className="text-xs text-red-500 mt-1">
                            Minimum order: ${option.minOrderAmount}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-3 h-3 bg-purple-500 rounded-full"></div>
                      )}
                    </label>
                  )
                })}
              </div>

              {/* 신용카드 정보 */}
              {paymentMethod === 'card' && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('checkout.creditCard')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('checkout.cardNumber')}
                          </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleInputChange}
                        required
                        maxLength={19}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('checkout.cardholderName')}
                          </label>
                      <input
                        type="text"
                        name="cardholderName"
                        value={formData.cardholderName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('checkout.expiryDate')}
                          </label>
                      <input
                        type="text"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleInputChange}
                        required
                        maxLength={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('checkout.cvv')}
                          </label>
                      <input
                        type="text"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleInputChange}
                        required
                        maxLength={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 계좌이체 정보 */}
              {paymentMethod === 'bank' && (() => {
                const bankOption = getPaymentOptionByType('bank')
                const activeBankAccounts = bankOption?.bankAccounts?.filter(acc => acc.isActive) || []
                
                return (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">{t('checkout.bankInfo')}</h3>
                    {activeBankAccounts.length > 0 ? (
                      activeBankAccounts.map((account) => (
                        <div key={account.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{t('checkout.bankName')}:</span>
                              <span>{account.bankName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">{t('checkout.accountNumber')}:</span>
                              <span>{account.accountNumber}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">{t('checkout.accountHolder')}:</span>
                              <span>{account.accountHolder}</span>
                            </div>
                            {account.bsb && (
                              <div className="flex justify-between">
                                <span className="font-medium">{t('checkout.bsb')}:</span>
                                <span>{account.bsb}</span>
                              </div>
                            )}
                            {account.accountType && (
                              <div className="flex justify-between">
                                <span className="font-medium">{t('checkout.accountType')}:</span>
                                <span>{account.accountType}</span>
                              </div>
                            )}
                            {account.swiftCode && (
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">SWIFT Code:</span>
                                  <div className="relative group">
                                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                      <div className="font-semibold mb-1">SWIFT Code</div>
                                      <div className="text-gray-300 leading-relaxed">
                                        A unique identifier for international bank transfers. Required when sending money from overseas banks to this account.
                                      </div>
                                      <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                                <span>{account.swiftCode}</span>
                              </div>
                            )}
                            {account.branchAddress && (
                              <div className="flex justify-between">
                                <span className="font-medium">Branch:</span>
                                <span className="text-right">{account.branchAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">No bank account information available. Please contact support.</p>
                      </div>
                    )}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkout.depositorName')}
                      </label>
                      <input
                        type="text"
                        name="depositorName"
                        value={formData.depositorName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 mt-1">{t('checkout.bankNote')}</p>
                    </div>
                  </div>
                )
              })()}

              {/* 현금결제 정보 */}
              {paymentMethod === 'cash' && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('checkout.cashInfo')}</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 mb-2">{t('checkout.cashInstructions')}</p>
                    <p className="text-green-700 text-sm whitespace-pre-line">{t('checkout.cashAdvantages')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkout.deliveryContact')}
                    </label>
                    <input
                      type="tel"
                      name="deliveryContact"
                      value={formData.deliveryContact}
                      onChange={handleInputChange}
                      placeholder="+61 XXXX XXXX"
                      maxLength={20}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 sticky top-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">✓</span>
                  </div>
                  <h2 className="text-2xl font-light text-slate-800 tracking-wide">{t('checkout.orderSummary')}</h2>
                </div>
                <Link
                  href="/benefits"
                  className="text-sm font-semibold text-purple-700 hover:text-purple-800 underline"
                >
                  View all benefits &amp; promo codes
                </Link>
              </div>
              
              {/* VIP 등급 정보 표시 */}
              {currentUser && currentUser.currentGrade !== undefined && (() => {
                const gradeCode = currentUser.currentGrade
                const gradeInfo = getGradeInfo(gradeCode)
                const gradeName = gradeInfo?.nameEn || ['Basic', 'Silver', 'Gold', 'Black', 'VVIP'][gradeCode] || `Grade ${gradeCode}`
                const subtotal = calculateSubtotal()
    const cartItemsForDiscount = buildCartItemsForDiscount()
                const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
                const baseDiscountPct = vipBenefit?.benefit?.baseDiscountPercentage ?? 0
                const hotGoodsDiscountPct = vipBenefit?.benefit?.categoryDiscounts?.HotGoods
                // 최소 구매 금액 가져오기
                const storeState = useContentStore.getState() as any
                const foundBenefit = storeState.vipGradeBenefits?.find((b: any) => b.gradeCode === gradeCode && b.isActive)
                const minPurchaseAmount = foundBenefit?.minPurchaseAmount
                
                // 등급 색상 설정
                const gradeColors: Record<number, { bg: string; text: string; border: string }> = {
                  0: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
                  1: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
                  2: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
                  3: { bg: 'bg-gray-900', text: 'text-white', border: 'border-gray-700' },
                  4: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' }
                }
                const colors = gradeColors[gradeCode] || gradeColors[0]
                
                return (
                  <div className={`mb-4 p-4 rounded-lg border ${colors.bg} ${colors.border} ${colors.text}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm">Your VIP Grade:</span>
                        <span className="font-bold text-base">{gradeName}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-medium space-y-1">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          Stickers/Stamps: {baseDiscountPct}% off
                          {minPurchaseAmount && minPurchaseAmount > 0 && (
                            <span className="ml-1 text-purple-600">min ${minPurchaseAmount.toFixed(0)}</span>
                          )}
                        </span>
                        {hotGoodsDiscountPct !== undefined && (
                          <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Market S / Phonecase: {hotGoodsDiscountPct}% off
                          </span>
                        )}
                      </div>
                      {vipBenefit?.freeShipping && (
                        <div className="flex items-center gap-1 text-green-700">
                          <span className="text-xs">✓ Free Shipping Included</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
              
              <div className="space-y-3">
                <div className="flex justify-between">
                                          <span className="text-gray-600">{t('checkout.subtotal')}</span>
                  <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('checkout.tax')} <span className="text-xs text-gray-500">({t('checkout.included')})</span></span>
                  <span className="font-medium">$0.00</span>
                </div>
                
                 <div className="flex justify-between">
                   <span className="text-gray-600">{t('checkout.shipping')}</span>
                   <span className="font-medium">
                     {getShippingPrice(selectedShipping) === 0 ? t('checkout.freeShipping') : `$${getShippingPrice(selectedShipping).toFixed(2)}`}
                   </span>
                 </div>
                
                 {selectedShipping && (
                   <div className="text-sm text-gray-500 pl-4">
                     {selectedShipping.name} - {selectedShipping.deliveryTime}
                   </div>
                 )}

                 {/* VIP 등급 할인 표시 */}
                 {(() => {
                   if (!currentUser || currentUser.currentGrade === undefined) return null
                   const gradeCode = currentUser.currentGrade
                   const subtotal = calculateSubtotal()
                   const cartItemsForDiscount = buildCartItemsForDiscount()
                   const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
                   
                   // 디버깅: 모든 VIP 등급 할인 확인
                   const gradeNames = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP']
                   const gradeName = gradeNames[gradeCode] || `Grade ${gradeCode}`
                   
                   // 혜택 정보 가져오기 (minPurchaseAmount 확인용)
                   const storeState = useContentStore.getState() as any
                   const foundBenefit = storeState.vipGradeBenefits?.find((b: any) => b.gradeCode === gradeCode && b.isActive)
                   
                   console.log(`🎯 VIP ${gradeName} (등급 코드: ${gradeCode}) 할인 확인:`, {
                     gradeCode,
                     gradeName,
                     subtotal: `$${subtotal.toFixed(2)}`,
                     minPurchaseAmount: foundBenefit?.minPurchaseAmount ? `$${foundBenefit.minPurchaseAmount.toFixed(2)}` : '없음',
                     minPurchaseAmountCheck: foundBenefit?.minPurchaseAmount ? (subtotal >= foundBenefit.minPurchaseAmount ? '✅ 통과' : `❌ 실패 ($${(foundBenefit.minPurchaseAmount - subtotal).toFixed(2)} 부족)`) : '조건 없음',
                     vipBenefit: vipBenefit ? {
                       discount: `$${vipBenefit.discount.toFixed(2)}`,
                       freeShipping: vipBenefit.freeShipping,
                       baseDiscountPercentage: vipBenefit.benefit?.baseDiscountPercentage || 0,
                       maxDiscountAmount: vipBenefit.benefit?.maxDiscountAmount || '없음'
                     } : '혜택 없음',
                     benefitFound: !!vipBenefit,
                     discountApplied: (vipBenefit?.discount || 0) > 0
                   })
                   
                   if (!vipBenefit || vipBenefit.discount === 0) {
                     if (gradeCode >= 0 && gradeCode <= 4) {
                       // 혜택을 찾았지만 null이 반환된 경우, minPurchaseAmount 체크 실패 가능성 확인
                       const storeState = useContentStore.getState() as any
                       const foundBenefit = storeState.vipGradeBenefits?.find((b: any) => b.gradeCode === gradeCode && b.isActive)
                       console.warn(`⚠️ ${gradeName} 등급 할인이 적용되지 않았습니다.`, {
                         reason: !vipBenefit ? '혜택을 찾을 수 없음' : '할인 금액이 0',
                         gradeCode,
                         subtotal: `$${subtotal.toFixed(2)}`,
                         foundBenefit: foundBenefit ? {
                           minPurchaseAmount: foundBenefit.minPurchaseAmount ? `$${foundBenefit.minPurchaseAmount.toFixed(2)}` : '없음',
                           minPurchaseAmountCheck: foundBenefit.minPurchaseAmount ? (subtotal >= foundBenefit.minPurchaseAmount ? '통과' : `실패 ($${(foundBenefit.minPurchaseAmount - subtotal).toFixed(2)} 부족)`) : '조건 없음'
                         } : '혜택 없음'
                       })
                     }
                     return null
                   }
                   
                   // 등급명 가져오기
                   const gradeInfo = getGradeInfo(gradeCode)
                   const displayGradeName = gradeInfo?.nameEn || gradeName
                   
                   return (
                     <div className="flex justify-between text-purple-600 border-t pt-3">
                       <span className="font-medium">
                         VIP {displayGradeName} Discount
                       </span>
                       <span className="font-medium">-${vipBenefit.discount.toFixed(2)}</span>
                     </div>
                   )
                 })()}

                 {/* Discount Display - Promo Code 할인 */}
                 {appliedPromoCode && (
                   <div className="flex justify-between text-green-600 border-t pt-3">
                     <span className="font-medium">
                       Discount ({appliedPromoCode.code})
                     </span>
                     <span className="font-medium">-${appliedPromoCode.discount.toFixed(2)}</span>
                   </div>
                 )}

                 {/* Promo Code Section */}
                 <div className="border-t pt-3">
                   {!appliedPromoCode ? (
                     <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700">Promo Code</label>
                       <div className="flex gap-2">
                         <input
                           type="text"
                           value={promoCodeInput}
                           onChange={(e) => {
                             setPromoCodeInput(e.target.value.toUpperCase())
                             setPromoCodeError(null)
                           }}
                           onKeyPress={(e) => {
                             if (e.key === 'Enter') {
                               e.preventDefault()
                               handleApplyPromoCode()
                             }
                           }}
                           placeholder="Enter promo code"
                           className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                         />
                         <button
                           type="button"
                           onClick={handleApplyPromoCode}
                           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                         >
                           Apply
                         </button>
                       </div>
                       {promoCodeError && (
                         <p className="text-sm text-red-600">{promoCodeError}</p>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                         <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-green-800">Promo Code Applied:</span>
                           <span className="font-mono font-bold text-green-900">{appliedPromoCode.code}</span>
                           <span className="text-sm font-bold text-green-700">-${appliedPromoCode.discount.toFixed(2)}</span>
                         </div>
                         <button
                           type="button"
                           onClick={handleRemovePromoCode}
                           className="text-red-600 hover:text-red-700 text-sm font-medium"
                         >
                           Remove
                         </button>
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Payment Fee Display */}
                 {(() => {
                   const selectedPaymentOption = paymentOptions.find(opt => opt.type === paymentMethod)
                   const paymentFee = selectedPaymentOption ? getPaymentFee(selectedPaymentOption, calculateSubtotal()) : 0
                   return paymentFee > 0 ? (
                     <div className="flex justify-between text-gray-600">
                       <span className="font-medium">Payment Fee</span>
                       <span className="font-medium">+${paymentFee.toFixed(2)}</span>
                     </div>
                   ) : null
                 })()}
                 
                <div className="border-t-2 border-gray-300 pt-3 mt-3">
                  {(() => {
                    const subtotal = calculateSubtotal()
                    let shipping = getShippingPrice(selectedShipping)
                    const selectedPaymentOption = paymentOptions.find(opt => opt.type === paymentMethod)
                    const paymentFee = selectedPaymentOption ? getPaymentFee(selectedPaymentOption, subtotal) : 0

                   const cartItemsForDiscount = buildCartItemsForDiscount()

                    // VIP 등급 할인 계산
                    let vipDiscount = 0
                    let vipGradeName = ''
                    if (currentUser && currentUser.currentGrade !== undefined) {
                      const gradeCode = currentUser.currentGrade
                      const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
                      
                      // 디버깅: 총액 계산 시 VIP 할인 확인
                      const gradeNames = ['Basic', 'Silver', 'Gold', 'Black', 'VVIP']
                      const gradeName = gradeNames[gradeCode] || `Grade ${gradeCode}`
                      
                      if (vipBenefit && vipBenefit.discount > 0) {
                        vipDiscount = vipBenefit.discount
                        const gradeInfo = getGradeInfo(gradeCode)
                        vipGradeName = gradeInfo?.nameEn || gradeName
                        
                        console.log(`✅ ${gradeName} 등급 할인 적용됨 (총액 계산):`, {
                          gradeCode,
                          gradeName: vipGradeName,
                          subtotal: `$${subtotal.toFixed(2)}`,
                          discount: `$${vipDiscount.toFixed(2)}`,
                          freeShipping: vipBenefit.freeShipping
                        })
                        
                        // VIP 무료배송이면 배송비 0 처리
                        if (vipBenefit.freeShipping) {
                          shipping = 0
                        }
                      } else {
                        console.log(`ℹ️ ${gradeName} 등급 할인 없음 (총액 계산):`, {
                          gradeCode,
                          gradeName,
                          subtotal: `$${subtotal.toFixed(2)}`,
                          reason: !vipBenefit ? '혜택을 찾을 수 없음' : '할인 금액이 0'
                        })
                      }
                    }
                    
                    const promoDiscount = appliedPromoCode ? appliedPromoCode.discount : 0
                    
                    // 중복 할인 허용 여부에 따라 총 할인 계산 (calculateTotal과 동일 로직)
                    let totalDiscount = 0
                    if (vipDiscount > 0 && promoDiscount > 0) {
                      const vipBenefit = currentUser && currentUser.currentGrade !== undefined
                        ? getVIPGradeBenefitForCheckout(currentUser.currentGrade, subtotal, cartItemsForDiscount)
                        : null
                      const promoCodeInfo = appliedPromoCode 
                        ? useContentStore.getState().promoCodes.find((pc: any) => pc.code === appliedPromoCode.code)
                        : null
                      const vipAllowsStacking = vipBenefit?.benefit?.allowPromoCodeStacking !== false
                      const promoAllowsStacking = promoCodeInfo?.allowVIPStacking !== false
                      if (vipAllowsStacking && promoAllowsStacking) {
                        totalDiscount = Math.min(vipDiscount + promoDiscount, subtotal)
                      } else {
                        totalDiscount = Math.max(vipDiscount, promoDiscount)
                      }
                    } else {
                      totalDiscount = Math.min(vipDiscount + promoDiscount, subtotal)
                    }

                    const totalBeforeDiscount = subtotal + shipping + paymentFee
                    const finalTotal = Math.max(0, totalBeforeDiscount - totalDiscount)

                    if (totalDiscount <= 0) return null
                    
                    return (
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal + Shipping + Payment Fee</span>
                          <span>${totalBeforeDiscount.toFixed(2)}</span>
                        </div>
                        {vipDiscount > 0 && (
                          <div className="flex justify-between text-sm text-purple-600 font-medium">
                            <span>VIP {vipGradeName} Discount</span>
                            <span>-${vipDiscount.toFixed(2)}</span>
                          </div>
                        )}
                        {promoDiscount > 0 && (
                          <div className="flex justify-between text-sm text-green-600 font-medium">
                            <span>Promo Code Discount ({appliedPromoCode?.code})</span>
                            <span>-${promoDiscount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">{t('checkout.total')}</span>
                    {(() => {
                      const subtotal = calculateSubtotal()
                      let shipping = getShippingPrice(selectedShipping)
                      const selectedPaymentOption = paymentOptions.find(opt => opt.type === paymentMethod)
                      const paymentFee = selectedPaymentOption ? getPaymentFee(selectedPaymentOption, subtotal) : 0
                      const cartItemsForDiscount = buildCartItemsForDiscount()
                      let vipDiscount = 0
                      if (currentUser && currentUser.currentGrade !== undefined) {
                      const vipBenefit = getVIPGradeBenefitForCheckout(currentUser.currentGrade, subtotal, cartItemsForDiscount)
                        vipDiscount = vipBenefit?.discount || 0
                        if (vipBenefit?.freeShipping) {
                          shipping = 0
                        }
                      }
                      const promoDiscount = appliedPromoCode ? appliedPromoCode.discount : 0

                      let totalDiscount = 0
                      if (vipDiscount > 0 && promoDiscount > 0) {
                        const vipBenefit = currentUser && currentUser.currentGrade !== undefined
                          ? getVIPGradeBenefitForCheckout(currentUser.currentGrade, subtotal, cartItemsForDiscount)
                          : null
                        const promoCodeInfo = appliedPromoCode 
                          ? useContentStore.getState().promoCodes.find((pc: any) => pc.code === appliedPromoCode.code)
                          : null
                        const vipAllowsStacking = vipBenefit?.benefit?.allowPromoCodeStacking !== false
                        const promoAllowsStacking = promoCodeInfo?.allowVIPStacking !== false
                        totalDiscount = (vipAllowsStacking && promoAllowsStacking)
                          ? Math.min(vipDiscount + promoDiscount, subtotal)
                          : Math.max(vipDiscount, promoDiscount)
                      } else {
                        totalDiscount = Math.min(vipDiscount + promoDiscount, subtotal)
                      }

                      const finalTotal = Math.max(0, subtotal + shipping + paymentFee - totalDiscount)
                      return (
                        <span className="text-lg font-semibold text-gray-900">${finalTotal.toFixed(2)}</span>
                      )
                    })()}
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isProcessing || insufficientItems.length > 0}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-medium py-5 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none mt-8 flex items-center justify-center space-x-3 text-lg"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                              <span>{t('checkout.processing')}</span>
                  </>
                ) : (
                  <>
                                              <span>{paymentMethod === 'stripe' ? 'Pay Now' : t('checkout.placeOrder')}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </button>

              {paymentMethod === 'stripe' && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-xs font-medium text-slate-700">Secure payment</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <span className="text-xs text-slate-500">Powered by</span>
                        <span className="text-xs font-semibold tracking-wide text-slate-800">Stripe</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm" aria-label="Visa">
                        <svg width="34" height="14" viewBox="0 0 34 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <rect x="0.5" y="0.5" width="33" height="13" rx="3" stroke="#E2E8F0" />
                          <path d="M12.2 4.1 10.6 9.9H9.2L8.2 6.1c-.06-.23-.11-.32-.29-.42-.3-.16-.8-.31-1.23-.4l.03-.12h2.25c.29 0 .55.2.62.52l.52 2.8 1.3-3.32h1.1ZM18.2 9.9h-1.05l-.82-5.8h1.01l.86 5.8ZM22.1 4.24c.62 0 1.08.13 1.43.29l-.18.86c-.25-.1-.63-.21-1.1-.21-.47 0-.78.19-.78.45 0 .24.3.38.79.61.7.33 1.01.67 1.01 1.2 0 .9-.78 1.5-2.06 1.5-.68 0-1.3-.14-1.7-.32l.19-.88c.42.18 1.02.33 1.55.33.45 0 .86-.16.86-.5 0-.23-.2-.4-.73-.65-.62-.3-1.07-.66-1.07-1.17 0-.83.78-1.38 1.79-1.38ZM27.4 9.9h-1.04l-.41-1.12h-1.45l-.23 1.12h-1.02l1.47-5.8h1.1l1.58 5.8Zm-2.7-1.95h1l-.41-1.14c-.09-.26-.18-.62-.25-.9-.06.28-.13.64-.22.9l-.12.33Z" fill="#0F172A" opacity="0.8"/>
                        </svg>
                      </span>

                      <span className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm" aria-label="Mastercard">
                        <svg width="34" height="14" viewBox="0 0 34 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <rect x="0.5" y="0.5" width="33" height="13" rx="3" stroke="#E2E8F0" />
                          <circle cx="14" cy="7" r="3.8" fill="#EF4444" opacity="0.9"/>
                          <circle cx="20" cy="7" r="3.8" fill="#F59E0B" opacity="0.9"/>
                          <path d="M17 3.6c1 0 1.9.4 2.5 1.1-.6.7-1.5 1.1-2.5 1.1s-1.9-.4-2.5-1.1c.6-.7 1.5-1.1 2.5-1.1Zm0 4.8c1 0 1.9.4 2.5 1.1-.6.7-1.5 1.1-2.5 1.1s-1.9-.4-2.5-1.1c.6-.7 1.5-1.1 2.5-1.1Z" fill="#0F172A" opacity="0.12"/>
                        </svg>
                      </span>

                      <span className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm" aria-label="Apple Pay">
                        <svg width="44" height="14" viewBox="0 0 44 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <rect x="0.5" y="0.5" width="43" height="13" rx="3" stroke="#E2E8F0" />
                          <path d="M12.2 4.2c.5-.6.9-1.4.8-2.2-.7 0-1.6.5-2.1 1.1-.5.6-.9 1.4-.8 2.1.8.1 1.6-.4 2.1-1Z" fill="#0F172A" opacity="0.85"/>
                          <path d="M13 6.1c-.9-.1-1.6.5-2 .5-.4 0-1-.5-1.7-.5-.9 0-1.7.5-2.1 1.3-.9 1.6-.2 4 0 4.5.2.5.7 1.3 1.3 1.3.6 0 .8-.4 1.5-.4.7 0 .9.4 1.6.4.7 0 1.1-.7 1.3-1.2.2-.4.3-.7.3-.7s-1.2-.5-1.2-1.9c0-1.2 1-1.8 1-1.8-.5-.7-1.3-.8-1.6-.8Z" fill="#0F172A" opacity="0.85"/>
                          <path d="M18.7 10.9V6.1h1.4c1.2 0 2 .7 2 1.8 0 1.1-.8 1.8-2 1.8h-.6v1.2h-.8Zm.8-1.9h.6c.7 0 1.2-.4 1.2-1.1 0-.7-.4-1.1-1.2-1.1h-.6v2.2ZM23.2 10.9h-.8l1.7-4.8h.9l1.7 4.8h-.8l-.4-1.2h-1.8l-.4 1.2Zm1-3.1-.5 1.5h1.4l-.5-1.5c-.1-.3-.2-.6-.2-.8 0 .2-.1.5-.2.8ZM28.6 12.6h-.8l.7-1.8-1.7-4.7h.9l1 3.1c.1.3.2.7.2.9 0-.2.1-.6.2-.9l1-3.1h.9l-2.4 6.5ZM31.1 10.9V6.1h.8v4.8h-.8Z" fill="#0F172A" opacity="0.8"/>
                        </svg>
                      </span>

                      <span className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm" aria-label="Google Pay">
                        <svg width="52" height="14" viewBox="0 0 52 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <rect x="0.5" y="0.5" width="51" height="13" rx="3" stroke="#E2E8F0" />
                          <path d="M17.8 7.2c0 2-1.4 3.4-3.4 3.4s-3.4-1.4-3.4-3.4 1.4-3.4 3.4-3.4c1 0 1.8.4 2.4 1l-.7.7c-.4-.4-1-.7-1.7-.7-1.4 0-2.5 1.2-2.5 2.6s1.1 2.6 2.5 2.6c1.6 0 2.2-1.1 2.3-1.7h-2.3v-1h3.3c.1.2.1.5.1.9Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M22 10.6c-1.2 0-2.2-.9-2.2-2.2S20.8 6.2 22 6.2s2.2.9 2.2 2.2-.9 2.2-2.2 2.2Zm0-3.5c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3 1.3-.6 1.3-1.3-.6-1.3-1.3-1.3Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M26.7 10.6c-1.2 0-2.2-.9-2.2-2.2s.9-2.2 2.2-2.2 2.2.9 2.2 2.2-.9 2.2-2.2 2.2Zm0-3.5c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3 1.3-.6 1.3-1.3-.6-1.3-1.3-1.3Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M31.9 6.3h.8v4c0 1.7-1 2.4-2.3 2.4-.8 0-1.5-.3-1.9-.9l.7-.5c.3.4.6.6 1.2.6.8 0 1.3-.5 1.3-1.4v-.4h0c-.2.3-.7.5-1.2.5-1.2 0-2.2-1-2.2-2.2s1-2.2 2.2-2.2c.5 0 1 .2 1.2.5h0v-.4Zm-1.1 3.5c.7 0 1.3-.6 1.3-1.3s-.6-1.3-1.3-1.3-1.3.6-1.3 1.3.6 1.3 1.3 1.3Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M34.4 10.4V4.1h.9v6.3h-.9Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M38.2 10.6c-1.2 0-2.1-.9-2.1-2.2 0-1.4.9-2.2 2-2.2 1.2 0 1.8.9 1.8 2.2v.1h-3c.1.8.6 1.2 1.3 1.2.6 0 .9-.3 1.2-.6l.7.5c-.4.6-1 1-1.9 1Zm-1.2-2.8h2c-.1-.5-.4-.8-1-.8-.5 0-.9.3-1 .8Z" fill="#0F172A" opacity="0.8"/>
                          <path d="M43.2 10.9V6.1h1.7c1.1 0 1.8.7 1.8 1.8 0 1.1-.7 1.8-1.8 1.8h-.8v1.2h-.9Zm.9-1.9h.7c.6 0 1-.4 1-1.1 0-.7-.4-1.1-1-1.1h-.7v2.2Z" fill="#0F172A" opacity="0.8"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
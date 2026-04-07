'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/useTranslation'
import { useUserAuth } from '@/lib/userAuth'
import { getColorName } from '@/lib/colorUtils'
import {
  mergePersistedSiteConfig,
  normalizeRehydratedContentStoreState,
  useContentStore
} from '@/lib/contentStore'
import { getGradeInfo } from '@/lib/vipGradeConfig'

export default function CartPage() {
  const router = useRouter()
  const { cart, removeFromCart, updateCartItemQuantity, clearCart, products } = useStore()
  const { t } = useTranslation()
  const { isLoggedIn, isDemo, user: currentUser } = useUserAuth()
  const { 
    getVIPGradeBenefitForCheckout,
    getActiveShippingOptions,
  } = useContentStore()
  const freeShippingSettings = useContentStore((s) => s.freeShippingSettings)
  
  const shippingOptions = getActiveShippingOptions()

  // Filter out invalid cart items and clean up empty objects
  const validCart = cart.filter(item => 
    item && 
    typeof item === 'object' && 
    item.product && 
    typeof item.product === 'object' && 
    item.product.id && 
    item.product.price !== undefined
  )

  const getStockMeta = (productId: string) => {
    const storeProduct = products.find(p => p.id === productId)
    if (!storeProduct) {
      return {
        available: 0,
        safety: 0,
        incoming: 0,
        trackable: false
      }
    }
    const rawStock = (storeProduct as any).stockQuantity
    const available =
      typeof rawStock === 'number'
        ? Math.max(0, rawStock)
        : storeProduct.inStock
        ? Infinity
        : 0
    const safety =
      typeof (storeProduct as any).safetyStock === 'number'
        ? Math.max(0, (storeProduct as any).safetyStock)
        : 0
    const incoming =
      typeof (storeProduct as any).incomingStock === 'number'
        ? Math.max(0, (storeProduct as any).incomingStock)
        : 0

    return {
      available,
      safety,
      incoming,
      trackable: Number.isFinite(available)
    }
  }

  const stockStatuses = validCart.map(item => {
    const meta = getStockMeta(item.product.id)
    const isExceeded = meta.trackable ? item.quantity > meta.available : false
    const lowThreshold = Math.max(meta.safety || 0, 5)
    const isLowStock = meta.trackable && meta.available <= lowThreshold
    return {
      item,
      ...meta,
      isExceeded,
      isLowStock
    }
  })

  const insufficientItems = stockStatuses.filter(status => status.isExceeded)

  // Clean up invalid cart items automatically
  useEffect(() => {
    const invalidItems = cart.filter(item => 
      !item || 
      typeof item !== 'object' || 
      !item.product || 
      typeof item.product !== 'object' || 
      !item.product.id || 
      item.product.price === undefined
    )
    
    if (invalidItems.length > 0) {
      console.log('Cleaning up invalid cart items:', invalidItems)
      // Clear the entire cart if there are invalid items
      clearCart(isLoggedIn)
    }
  }, [cart, clearCart, isLoggedIn])

  // Debug cart data
  useEffect(() => {
    console.log('Cart data:', cart)
    console.log('Cart length:', cart.length)
    console.log('Valid cart length:', validCart.length)
    if (validCart.length !== cart.length) {
      console.warn('Some cart items were filtered out due to invalid data')
    }
  }, [cart, validCart])

  // Redirect non-logged in users to login page
  useEffect(() => {
    if (!isLoggedIn) {
      // Allow browsing cart, but block checkout later
      // No redirect here to allow demo users to see cart contents
    }
  }, [isLoggedIn])

  // 다른 탭에서 content-store 동기화 이벤트(합성 storage 등)로 전달된 페이로드 병합
  useEffect(() => {
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
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Parse surcharge from customization value (e.g. "2 lines (Name & Phone) +$2.00" -> 2)
  const parseSurchargeFromValue = (value: string): number => {
    if (typeof value !== 'string') return 0
    const match = value.match(/\+\s*\$\s*([\d.]+)/)
    if (!match) return 0
    const n = parseFloat(match[1])
    return !isNaN(n) && isFinite(n) ? n : 0
  }

  const TWO_LINE_SURCHARGE_DEFAULT = 2
  const TWO_LINE_SIZE_VALUES = ['large', 'extra large', 'medium', '대형', '특대형', '중형']

  // 2줄 옵션 등 커스텀 추가 요금: twoLineSurchargeAmount 우선 → twoLineOption 파싱 → 텍스트 줄바꿈+size로 추론
  const getSurchargePerUnit = (
    customizations: Record<string, string> | undefined,
    product?: { size?: string }
  ): number => {
    if (!customizations || typeof customizations !== 'object') return 0
    const explicit = customizations.twoLineSurchargeAmount
    if (explicit != null && String(explicit).trim() !== '') {
      const n = parseFloat(String(explicit).trim())
      if (!isNaN(n) && isFinite(n) && n >= 0) return n
    }
    const twoLineOpt = customizations.twoLineOption
    if (typeof twoLineOpt === 'string' && twoLineOpt.trim()) {
      const m = twoLineOpt.match(/\+\s*\$?\s*([\d.]+)/)
      if (m) {
        const n = parseFloat(m[1])
        if (!isNaN(n) && isFinite(n) && n >= 0) return n
      }
    }
    const fromEntries = Object.entries(customizations)
      .filter(([key]) => !key.toLowerCase().includes('customizedimage'))
      .reduce((sum, [, value]) => sum + parseSurchargeFromValue(value), 0)
    if (fromEntries > 0) return fromEntries
    // 키가 없어도 2줄 텍스트(줄바꿈) + 2줄 지원 size면 기본 추가 요금 적용
    const text = customizations.text
    const hasTwoLineText = typeof text === 'string' && text.includes('\n')
    const sizeNorm = product?.size ? String(product.size).trim().toLowerCase() : ''
    const sizeSupportsTwo = TWO_LINE_SIZE_VALUES.includes(sizeNorm)
    if (hasTwoLineText && sizeSupportsTwo) return TWO_LINE_SURCHARGE_DEFAULT
    return 0
  }

  const calculateSubtotal = () => {
    if (!validCart || validCart.length === 0) {
      return 0
    }
    
    return validCart.reduce((total, item) => {
      const price = typeof item.product?.price === 'number' && !isNaN(item.product.price) 
        ? item.product.price 
        : 0
      const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0
        ? item.quantity 
        : 0
      
      const itemTotal = price * quantity
      const surchargePerUnit = getSurchargePerUnit(item.customizations, item.product)
      const additionalCost = surchargePerUnit * quantity
      
      return total + itemTotal + additionalCost
    }, 0)
  }

  const subtotal = calculateSubtotal()
  
  // VIP 할인 예상 금액 계산
  const buildCartItemsForDiscount = () => {
    return validCart.map(item => {
      const product = products.find(p => p.id === item.product.id)
      const category = product?.category || item.product.category || 'Other'
      
      // 카테고리 정규화 (checkout과 동일한 로직)
      const normalizeCategory = (raw?: string) => {
        const lower = (raw || '').toLowerCase()
        if (product && (product as any).isHotGoods) return 'HotGoods'
        if (lower.includes('market s') || lower.includes('market-s') || lower === 'markets') return 'HotGoods'
        if (lower.includes('phone case') || lower.includes('phone-case') || lower.includes('phonecase') || lower.includes('phone cases')) return 'HotGoods'
        if (lower.includes('sticker')) return 'Stickers'
        if (lower.includes('stamp')) return 'Stamps'
        if (lower.includes('hotgoods') || lower.includes('hot goods') || lower.includes('hot-goods') || lower === 'hot') return 'HotGoods'
        return raw || 'Other'
      }
      
      const normalizedCategory = normalizeCategory(category)
      const itemPrice = (item.product.price || 0) * (item.quantity || 0)
      const surchargePerUnit = getSurchargePerUnit(item.customizations, item.product)
      const customizationCost = surchargePerUnit * (item.quantity || 0)
      
      return {
        productId: item.product.id,
        category: normalizedCategory,
        price: itemPrice + customizationCost
      }
    })
  }
  
  let vipDiscount = 0
  let vipGradeName = ''
  let vipFreeShipping = false
  let baseDiscountPct = 0
  let hotGoodsDiscountPct: number | undefined = undefined
  
  if (currentUser && currentUser.currentGrade !== undefined && isLoggedIn) {
    const gradeCode = currentUser.currentGrade
    const cartItemsForDiscount = buildCartItemsForDiscount()
    const vipBenefit = getVIPGradeBenefitForCheckout(gradeCode, subtotal, cartItemsForDiscount)
    
    if (vipBenefit) {
      vipDiscount = vipBenefit.discount
      vipFreeShipping = vipBenefit.freeShipping || false
      baseDiscountPct = vipBenefit.benefit?.baseDiscountPercentage ?? 0
      hotGoodsDiscountPct = vipBenefit.benefit?.categoryDiscounts?.HotGoods
      
      const gradeInfo = getGradeInfo(gradeCode)
      vipGradeName = gradeInfo?.nameEn || ['Basic', 'Silver', 'Gold', 'Black', 'VVIP'][gradeCode] || `Grade ${gradeCode}`
    }
  }
  
  // 배송비 계산 (Checkout과 동일한 로직)
  const getShippingPrice = () => {
    if (shippingOptions.length === 0) return 0
    const option = shippingOptions[0]
    
    // VIP 무료 배송 확인
    if (vipFreeShipping) {
      return 0
    }
    
    // 항상 무료 옵션
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
  
  const shipping = getShippingPrice()
  
  // VIP 무료 배송이면 배송비 0
  const finalShipping = vipFreeShipping ? 0 : shipping
  const total = subtotal + finalShipping - vipDiscount

  const handleCheckout = () => {
    if (insufficientItems.length > 0) {
      alert('One or more items exceed available stock. Please adjust your cart before checkout.')
      return
    }

    // Check if user is a demo user
    if (isDemo) {
      alert(t('cart.demoUserCheckoutBlocked'))
      router.push('/login')
      return
    }
    
    // Check if user is logged in
    if (!isLoggedIn) {
      alert(t('cart.loginRequired'))
      router.push('/login')
      return
    }
    
    router.push('/checkout')
  }

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (!productId) return
    if (newQuantity <= 0) {
      updateCartItemQuantity(productId, 0, isLoggedIn)
      return
    }
    const { available, trackable } = getStockMeta(productId)
    if (trackable && newQuantity > available) {
      alert(`Only ${available} item(s) are currently available.`)
      return
    }
    const success = updateCartItemQuantity(productId, newQuantity, isLoggedIn)
    if (!success) {
      alert('Unable to update quantity due to stock limitations.')
    }
  }

  if (validCart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Your cart is empty</h2>
            <Link href="/" className="btn-primary">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft size={20} />
              <span>Continue Shopping</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {insufficientItems.length > 0 && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm">
                Some items exceed available stock. Please adjust highlighted items before checkout.
              </div>
            )}
            {stockStatuses.map(({ item, available, safety, incoming, isExceeded, isLowStock, trackable }, index) => {
              return (
                <div
                  key={`${item.product.id}-${JSON.stringify(item.customizations)}-${index}-${item.quantity || 0}`}
                  className={`bg-white rounded-xl shadow-sm border p-6 ${isExceeded ? 'border-red-300' : 'border-gray-200'}`}
                >
                <div className="flex space-x-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 relative">
                    {(item.customizations as any)?.customizedImage ? (
                      <img
                        src={(item.customizations as any).customizedImage}
                        alt={`${item.product.name} (Customized)`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                    {(item.customizations as any)?.customizedImage && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                        Custom
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.product.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{item.product.description}</p>

                        {/* 기본 상품 정보 */}
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-700">
                          {item.product.subcategory && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-700">
                              {item.product.subcategory}
                            </span>
                          )}
                          {item.product.brand && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                              {item.product.brand}
                            </span>
                          )}
                          {item.product.size && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              Size: {item.product.size}
                            </span>
                          )}
                          {item.product.color && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-pink-100 text-pink-700">
                              Color: {item.product.color}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full ${
                              item.product.inStock ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.product.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        
                        {/* Customization Options Display */}
                        {(item.customizations as any)?.bundleType === 'bundle' ? (
                          // 묶음 상품 커스터마이징 정보 표시
                          <div className="mt-2 space-y-2">
                            <p className="text-sm font-semibold text-gray-700">Bundle Customization:</p>
                            
                            {/* Bundle Items 표시 */}
                            {item.product.bundleItems && item.product.bundleItems.length > 0 && (
                              <div className="mb-3 space-y-1">
                                <p className="text-xs font-semibold text-gray-600">Included Items:</p>
                                {item.product.bundleItems.map((bundleItem: any, idx: number) => {
                                  const categoryLabel = bundleItem.category === 'Stickers' ? '🏷️ Sticker' : 
                                                       bundleItem.category === 'Stamps' ? '📮 Stamp' : 
                                                       bundleItem.category === 'PhoneCases' ? '📱 Phone Case' : 
                                                       bundleItem.category === 'HotGoods' ? '🔥 Market S' : bundleItem.category
                                  return (
                                    <div key={idx} className="text-xs text-gray-600 pl-4">
                                      <span className="font-medium">{categoryLabel}: {bundleItem.name}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            
                            {/* 커스터마이징 옵션 표시 */}
                            {Object.entries(item.customizations)
                              .filter(([key]) => !['bundleType', 'customizedImage', 'phoneCases_included'].includes(key) && !key.includes('customizedImage'))
                              .map(([key, value]) => {
                                // bundleType 형식: sticker_0_text, stamp_0_font, phoneCase_0_color 등
                                const parts = key.split('_')
                                if (parts.length >= 3) {
                                  const category = parts[0]
                                  const index = parts[1]
                                  const option = parts.slice(2).join('_')
                                  
                                  const categoryLabel = category === 'sticker' ? '🏷️ Sticker' : 
                                                       category === 'stamp' ? '📮 Stamp' : 
                                                       category === 'phoneCase' ? '📱 Phone Case' : category
                                  
                                  const isColor = option === 'color' && String(value).startsWith('#')
                                  
                                  return (
                                    <div key={key} className="text-xs text-gray-600 flex items-center gap-2 pl-4">
                                      <span className="font-medium">{categoryLabel} {parseInt(index) + 1} - {option}:</span>
                                      {isColor ? (
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-4 h-4 rounded border border-gray-300"
                                            style={{ backgroundColor: String(value) }}
                                            title={String(value)}
                                          />
                                          <span className="font-medium">{getColorName(String(value))}</span>
                                        </div>
                                      ) : (
                                        <span>{String(value)}</span>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })}
                          </div>
                        ) : (item.customizations as any)?.setType === 'set' ? (
                          // SET 상품 커스터마이징 정보 표시 (일반 스티커 형식으로)
                          (() => {
                            // SET 아이템들을 그룹화
                            const setItems: Record<number, { designName?: string; text?: string; font?: string; color?: string }> = {}
                            
                            Object.entries(item.customizations).forEach(([key, value]) => {
                              if (key.startsWith('item') && (key.includes('_designName') || key.includes('_text') || key.includes('_font') || key.includes('_color'))) {
                                const match = key.match(/item(\d+)_(designName|text|font|color)/)
                                if (match) {
                                  const itemIndex = parseInt(match[1])
                                  const optionType = match[2] as 'designName' | 'text' | 'font' | 'color'
                                  if (!setItems[itemIndex]) {
                                    setItems[itemIndex] = {}
                                  }
                                  setItems[itemIndex][optionType] = String(value)
                                }
                              }
                            })
                            
                            return (
                              <div className="mt-2 space-y-3">
                                {Object.entries(setItems)
                                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  .map(([index, options]) => (
                                    <div key={index} className="space-y-1 pl-2 border-l-2 border-blue-200">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Item {index}</p>
                                      {options.designName && (
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                          <span className="font-medium">Design:</span>
                                          <span>{options.designName}</span>
                                        </div>
                                      )}
                                      {options.text && (
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                          <span className="font-medium">Text:</span>
                                          <span>{options.text}</span>
                                        </div>
                                      )}
                                      {options.font && (
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                          <span className="font-medium">Font:</span>
                                          <span>{options.font}</span>
                                        </div>
                                      )}
                                      {options.color && (
                                        <div className="text-sm text-gray-600 flex items-center gap-2">
                                          <span className="font-medium">Color:</span>
                                          {options.color.startsWith('#') ? (
                                            <div className="flex items-center gap-2">
                                              <div 
                                                className="w-5 h-5 rounded border border-gray-300"
                                                style={{ backgroundColor: options.color }}
                                                title={options.color}
                                              />
                                              <span className="font-medium">{getColorName(options.color)}</span>
                                            </div>
                                          ) : (
                                            <span>{options.color}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )
                          })()
                        ) : (
                          // 일반 상품 커스터마이징 정보 표시
                          Object.entries(item.customizations)
                            .filter(([key]) => key !== 'customizedImage' && !key.includes('customizedImage'))
                            .length > 0 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(item.customizations)
                                .filter(([key]) => key !== 'customizedImage' && !key.includes('customizedImage'))
                                .map(([key, value]) => {
                                  const isColor = key.toLowerCase() === 'color' && String(value).startsWith('#')
                                  return (
                                    <div key={key} className="text-sm text-gray-600 flex items-center gap-2">
                                      <span className="font-medium capitalize">{key}:</span>
                                      {isColor ? (
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-5 h-5 rounded border border-gray-300"
                                            style={{ backgroundColor: String(value) }}
                                            title={String(value)}
                                          />
                                          <span className="font-medium">{getColorName(String(value))}</span>
                                        </div>
                                      ) : (
                                        <span>{String(value)}</span>
                                      )}
                                    </div>
                                  )
                                })}
                            </div>
                          )
                        )}
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.product.id, item.quantity, isLoggedIn)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <div>
                          {trackable ? `Available: ${available}` : 'In stock'}
                        </div>
                        {trackable && !isExceeded && isLowStock && (
                          <div className="text-red-600 font-medium">
                            Only {available} left
                          </div>
                        )}
                        {isExceeded && (
                          <div className="text-red-600 font-medium">
                            Only {available} left
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {(() => {
                          const surchargePerUnit = getSurchargePerUnit(item.customizations, item.product)
                          const lineTotal = item.product.price * item.quantity + surchargePerUnit * item.quantity
                          return (
                            <>
                              <div className="text-lg font-semibold text-gray-900">
                                ${lineTotal.toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {surchargePerUnit > 0
                                  ? `${item.product.price.toFixed(2)} + $${surchargePerUnit.toFixed(2)} surcharge each`
                                  : `$${item.product.price.toFixed(2)} each`}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
                <Link
                  href="/benefits"
                  className="text-sm font-semibold text-purple-700 hover:text-purple-800 underline"
                >
                  View all benefits &amp; promo codes
                </Link>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                {/* VIP 할인 예상 금액 표시 */}
                {vipDiscount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-purple-600 font-medium text-sm">VIP {vipGradeName} Discount</span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {baseDiscountPct > 0 && `Stickers/Stamps: ${baseDiscountPct}% off`}
                        {hotGoodsDiscountPct !== undefined && baseDiscountPct > 0 && ' • '}
                        {hotGoodsDiscountPct !== undefined && `Market S: ${hotGoodsDiscountPct}% off`}
                      </span>
                    </div>
                    <span className="text-purple-600 font-medium">-${vipDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {finalShipping === 0 ? (
                      <span className="text-green-600">
                        {vipFreeShipping ? 'Free (VIP)' : 'Free'}
                      </span>
                    ) : (
                      `$${finalShipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                
                {finalShipping > 0 && !vipFreeShipping && freeShippingSettings.enabled && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <div className="text-sm font-semibold text-blue-900">
                      {freeShippingSettings.message}
                    </div>
                    <div className="text-xs font-semibold text-blue-700 mt-1">
                      Select Click & Collect (Mansfield) at checkout.
                    </div>
                  </div>
                )}
                
                {vipFreeShipping && (
                  <div className="text-sm text-green-600">
                    Free shipping (VIP benefit)
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-semibold text-gray-900">${total.toFixed(2)}</span>
                  </div>
                  {vipDiscount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      * Estimated discount. Final amount calculated at checkout.
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={insufficientItems.length > 0}
                className={`w-full btn-primary mt-6 py-3 ${insufficientItems.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
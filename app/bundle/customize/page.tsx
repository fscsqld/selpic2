'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore, Product, BundleItem } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { getStickerFonts, getEffectiveFont } from '@/lib/fontList'
import { Type, Palette, Package, ShoppingCart, ArrowRight } from 'lucide-react'
import Header from '@/components/Header'

// Suspense wrapper for useSearchParams
export default function BundleCustomizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BundleCustomizeContent />
    </Suspense>
  )
}

function BundleCustomizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { products, addToCart } = useStore()
  const { isLoggedIn, isDemo } = useUserAuth()
  const { t } = useTranslation()
  
  const [isMounted, setIsMounted] = useState(false)
  const [bundleProduct, setBundleProduct] = useState<Product | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  
  // 각 카테고리별 커스터마이징 상태
  const [stickerItems, setStickerItems] = useState<Array<{
    text: string
    font: string
    color: string
    customizedImage: string | null
  }>>([])
  
  const [stampItems, setStampItems] = useState<Array<{
    text: string
    font: string
    color: string
  }>>([])
  
  // Phone Cases는 커스터마이징 불가하므로 상태 제거

  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    const productId = searchParams.get('product')
    
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId && p.isBundle)
      if (product && product.bundleItems) {
        setBundleProduct(product)
        
        // 각 카테고리별 아이템 초기화
        const stickers = product.bundleItems.filter(item => item.category === 'Stickers')
        const stamps = product.bundleItems.filter(item => item.category === 'Stamps')
        const phoneCases = product.bundleItems.filter(item => item.category === 'PhoneCases')
        const hotGoods = product.bundleItems.filter(item => item.category === 'HotGoods')
        
        setStickerItems(stickers.map(() => ({
          text: 'Your Name\nCustom Text',
          font: 'andika',
          color: '#3B82F6',
          customizedImage: null
        })))
        
        setStampItems(stamps.map(() => ({
          text: 'Your Name',
          font: 'Arial',
          color: '#000000'
        })))
        
        // Phone Cases는 커스터마이징 불가하므로 상태 초기화 불필요
      }
    }
  }, [searchParams, products, isMounted])

  const fonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Georgia', 'Verdana', 'Comic Sans MS', 'Impact']
  const stickerFonts = getStickerFonts()
  const STICKER_FONT_DISPLAY_NAMES: Record<string, string> = {
    andika: 'Font 1',
    'edu-nsw-act-foundation': 'Font 2',
    'edu-au-vic-wa-nt-hand': 'Font 3',
    'edu-sa-beginner': 'Font 4',
    'edu-tas-beginner': 'Font 5',
    'k-round-joy': 'Font 6',
    'nanum-myeongjo': 'Font 7'
  }
  const getStickerFontLabel = (fontId: string): string => {
    return STICKER_FONT_DISPLAY_NAMES[fontId] ?? getEffectiveFont(fontId, '').displayName
  }
  const colors = ['#000000', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#FFFFFF']

  const getCustomizationPrice = (): number => {
    if (!bundleProduct) return 0
    return bundleProduct.price
  }

  // 커스터마이징된 이미지 생성 (Canvas 사용) - Stickers용
  const MAX_CANVAS_DIMENSION = 600

  const generateCustomizedImage = useCallback(async (
    productImage: string,
    text: string,
    font: string,
    color: string
  ) => {
    if (typeof window === 'undefined') return null

    return new Promise<string>((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            let targetWidth = img.width
            let targetHeight = img.height

            if (targetWidth > targetHeight && targetWidth > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetWidth
              targetWidth = MAX_CANVAS_DIMENSION
              targetHeight = Math.max(1, Math.round(targetHeight * scale))
            } else if (targetHeight >= targetWidth && targetHeight > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetHeight
              targetHeight = MAX_CANVAS_DIMENSION
              targetWidth = Math.max(1, Math.round(targetWidth * scale))
            }

            canvas.width = targetWidth
            canvas.height = targetHeight
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
            const effectiveFont = getEffectiveFont(font, text)
            ctx.font = `bold 24px ${effectiveFont.fontFamily}`
            ctx.fillStyle = color
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const textX = canvas.width / 2
            const textY = canvas.height / 2
            const lines = text.split('\n')
            const lineHeight = 24 * 1.2
            const startY = textY - ((lines.length - 1) * lineHeight) / 2

            lines.forEach((line, index) => {
              if (line.trim()) {
                ctx.fillText(line, textX, startY + index * lineHeight)
              }
            })

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            resolve(dataUrl)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = productImage
      } catch (error) {
        reject(error)
      }
    })
  }, [])

  const handleAddToCartAndCheckout = async () => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    if (!bundleProduct) {
      alert('Please select a bundle product first')
      return
    }

    setIsAddingToCart(true)

    try {
      const customizations: Record<string, string> = {
        bundleType: 'bundle'
      }
      
      // Stickers 커스터마이징
      if (bundleProduct.bundleItems) {
        const stickerBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stickers')
        for (let i = 0; i < stickerBundleItems.length; i++) {
          const item = stickerBundleItems[i]
          const stickerProduct = products.find(p => p.id === item.productId)
          if (stickerProduct && stickerItems[i]) {
            const customizedImg = await generateCustomizedImage(
              stickerProduct.image,
              stickerItems[i].text,
              stickerItems[i].font,
              stickerItems[i].color
            )
            
            customizations[`sticker_${i}_text`] = stickerItems[i].text
            customizations[`sticker_${i}_font`] = stickerItems[i].font
            customizations[`sticker_${i}_color`] = stickerItems[i].color
            if (customizedImg) {
              customizations[`sticker_${i}_customizedImage`] = customizedImg
            }
          }
        }
        
        // Stamps 커스터마이징
        const stampBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stamps')
        for (let i = 0; i < stampBundleItems.length; i++) {
          if (stampItems[i]) {
            customizations[`stamp_${i}_text`] = stampItems[i].text
            customizations[`stamp_${i}_font`] = stampItems[i].font
            customizations[`stamp_${i}_color`] = stampItems[i].color
          }
        }
        
        // PhoneCases는 커스터마이징 불가 - 포함된 상품 정보만 저장
        const phoneCaseBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'PhoneCases')
        if (phoneCaseBundleItems.length > 0) {
          customizations[`phoneCases_included`] = phoneCaseBundleItems.map(item => item.name).join(', ')
        }
        
        // HotGoods는 커스터마이징 불가 - 포함된 상품 정보만 저장
        const hotGoodsBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'HotGoods')
        if (hotGoodsBundleItems.length > 0) {
          customizations[`hotGoods_included`] = hotGoodsBundleItems.map(item => item.name).join(', ')
        }
      }
      
      const cartItem = {
        product: bundleProduct,
        quantity: 1,
        customizations
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      if (success) {
        router.push('/checkout')
      } else {
        alert('Failed to add item to cart')
        setIsAddingToCart(false)
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('An error occurred while adding the item to cart.')
      setIsAddingToCart(false)
    }
  }

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    if (!bundleProduct) {
      alert('Please select a bundle product first')
      return
    }

    try {
      const customizations: Record<string, string> = {
        bundleType: 'bundle'
      }
      
      // Stickers 커스터마이징
      if (bundleProduct.bundleItems) {
        const stickerBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stickers')
        for (let i = 0; i < stickerBundleItems.length; i++) {
          const item = stickerBundleItems[i]
          const stickerProduct = products.find(p => p.id === item.productId)
          if (stickerProduct && stickerItems[i]) {
            const customizedImg = await generateCustomizedImage(
              stickerProduct.image,
              stickerItems[i].text,
              stickerItems[i].font,
              stickerItems[i].color
            )
            
            customizations[`sticker_${i}_text`] = stickerItems[i].text
            customizations[`sticker_${i}_font`] = stickerItems[i].font
            customizations[`sticker_${i}_color`] = stickerItems[i].color
            if (customizedImg) {
              customizations[`sticker_${i}_customizedImage`] = customizedImg
            }
          }
        }
        
        // Stamps 커스터마이징
        const stampBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stamps')
        for (let i = 0; i < stampBundleItems.length; i++) {
          if (stampItems[i]) {
            customizations[`stamp_${i}_text`] = stampItems[i].text
            customizations[`stamp_${i}_font`] = stampItems[i].font
            customizations[`stamp_${i}_color`] = stampItems[i].color
          }
        }
        
        // PhoneCases는 커스터마이징 불가 - 포함된 상품 정보만 저장
        const phoneCaseBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'PhoneCases')
        if (phoneCaseBundleItems.length > 0) {
          customizations[`phoneCases_included`] = phoneCaseBundleItems.map(item => item.name).join(', ')
        }
      }
      
      const cartItem = {
        product: bundleProduct,
        quantity: 1,
        customizations
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      if (success) {
        alert('Item added to cart!')
        router.push('/cart')
      } else {
        alert('Failed to add item to cart')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('An error occurred while adding the item to cart.')
    }
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!bundleProduct || !bundleProduct.bundleItems) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Bundle product not found.</p>
          </div>
        </div>
      </div>
    )
  }

  const stickerBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stickers')
  const stampBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'Stamps')
  const phoneCaseBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'PhoneCases')
  const hotGoodsBundleItems = bundleProduct.bundleItems.filter(item => item.category === 'HotGoods')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 Bundle Customization</h1>
          <p className="text-gray-600">
            Customize each item in your bundle. Each product can have different text, font, and color.
          </p>
        </div>

        {/* 묶음 상품 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{bundleProduct.name}</h2>
              <p className="text-gray-600 mt-1">{bundleProduct.description}</p>
              <p className="text-xl font-bold text-gray-900 mt-2">${getCustomizationPrice().toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{bundleProduct.bundleItems.length}</p>
            </div>
          </div>
        </div>

        {/* 각 카테고리별 커스터마이징 */}
        <div className="space-y-6">
          {/* Stickers 커스터마이징 */}
          {stickerBundleItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🏷️ Stickers ({stickerBundleItems.length} items)
              </h2>
              <div className="space-y-6">
                {stickerBundleItems.map((bundleItem, index) => {
                  const product = products.find(p => p.id === bundleItem.productId)
                  if (!product) return null
                  
                  return (
                    <div key={bundleItem.productId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Sticker {index + 1}: {bundleItem.name}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Type className="w-4 h-4 inline mr-1" />
                            Text
                          </label>
                          <textarea
                            value={stickerItems[index]?.text || ''}
                            onChange={(e) => {
                              const newItems = [...stickerItems]
                              newItems[index] = { ...newItems[index], text: e.target.value }
                              setStickerItems(newItems)
                            }}
                            placeholder="Enter custom text..."
                            className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                        </div>
                        
                        {/* Font */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Type className="w-4 h-4 inline mr-1" />
                            Font
                          </label>
                          <select
                            value={stickerItems[index]?.font || 'andika'}
                            onChange={(e) => {
                              const newItems = [...stickerItems]
                              newItems[index] = { ...newItems[index], font: e.target.value }
                              setStickerItems(newItems)
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {stickerFonts.map((font) => (
                              <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                                {getStickerFontLabel(font.id)}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Color */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Palette className="w-4 h-4 inline mr-1" />
                            Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <div className="grid grid-cols-5 gap-2 flex-1">
                              {colors.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    const newItems = [...stickerItems]
                                    newItems[index] = { ...newItems[index], color }
                                    setStickerItems(newItems)
                                  }}
                                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                    stickerItems[index]?.color === color
                                      ? 'border-gray-800 scale-110 shadow-lg'
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                            <input
                              type="color"
                              value={stickerItems[index]?.color || '#3B82F6'}
                              onChange={(e) => {
                                const newItems = [...stickerItems]
                                newItems[index] = { ...newItems[index], color: e.target.value }
                                setStickerItems(newItems)
                              }}
                              className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                            />
                          </div>
                        </div>
                        
                        {/* Preview */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preview
                          </label>
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-contain opacity-50"
                            />
                            {stickerItems[index]?.text.trim() && (
                              <div
                                className="absolute text-center"
                                style={{
                                  fontFamily: getEffectiveFont(stickerItems[index]?.font || 'andika', stickerItems[index]?.text || '').fontFamily,
                                  color: stickerItems[index]?.color || '#3B82F6',
                                  fontSize: '16px',
                                  fontWeight: 'bold',
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                  whiteSpace: 'pre-line',
                                  maxWidth: '90%',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {stickerItems[index]?.text}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Stamps 커스터마이징 */}
          {stampBundleItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📮 Stamps ({stampBundleItems.length} items)
              </h2>
              <div className="space-y-6">
                {stampBundleItems.map((bundleItem, index) => {
                  const product = products.find(p => p.id === bundleItem.productId)
                  if (!product) return null
                  
                  return (
                    <div key={bundleItem.productId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Stamp {index + 1}: {bundleItem.name}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Text */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Type className="w-4 h-4 inline mr-1" />
                            Text
                          </label>
                          <input
                            type="text"
                            value={stampItems[index]?.text || ''}
                            onChange={(e) => {
                              const newItems = [...stampItems]
                              newItems[index] = { ...newItems[index], text: e.target.value }
                              setStampItems(newItems)
                            }}
                            placeholder="Enter custom text..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Font */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Type className="w-4 h-4 inline mr-1" />
                            Font
                          </label>
                          <select
                            value={stampItems[index]?.font || 'Arial'}
                            onChange={(e) => {
                              const newItems = [...stampItems]
                              newItems[index] = { ...newItems[index], font: e.target.value }
                              setStampItems(newItems)
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            {fonts.map((font) => (
                              <option key={font} value={font} style={{ fontFamily: font }}>
                                {font}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Color */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Palette className="w-4 h-4 inline mr-1" />
                            Color
                          </label>
                          <div className="flex items-center space-x-2">
                            <div className="grid grid-cols-5 gap-2 flex-1">
                              {colors.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    const newItems = [...stampItems]
                                    newItems[index] = { ...newItems[index], color }
                                    setStampItems(newItems)
                                  }}
                                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                    stampItems[index]?.color === color
                                      ? 'border-gray-800 scale-110 shadow-lg'
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                            <input
                              type="color"
                              value={stampItems[index]?.color || '#000000'}
                              onChange={(e) => {
                                const newItems = [...stampItems]
                                newItems[index] = { ...newItems[index], color: e.target.value }
                                setStampItems(newItems)
                              }}
                              className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* PhoneCases 정보 표시 (커스터마이징 불가) */}
          {phoneCaseBundleItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                📱 Phone Cases ({phoneCaseBundleItems.length} items)
              </h2>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Phone Cases are included in this bundle but cannot be customized. They will be added as-is.
                </p>
              </div>
              <div className="space-y-4">
                {phoneCaseBundleItems.map((bundleItem, index) => {
                  const product = products.find(p => p.id === bundleItem.productId)
                  if (!product) return null
                  
                  return (
                    <div key={bundleItem.productId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Phone Case {index + 1}: {bundleItem.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            {product.brand && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                Brand: {product.brand}
                              </span>
                            )}
                            {product.model && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                Model: {product.model}
                              </span>
                            )}
                            {product.color && (
                              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                                Color: {product.color}
                              </span>
                            )}
                            {product.size && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                Size: {product.size}
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* HotGoods 정보 표시 (커스터마이징 불가) */}
          {hotGoodsBundleItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🔥 Market S ({hotGoodsBundleItems.length} items)
              </h2>
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ℹ️ Market S products are included in this bundle but cannot be customized. They will be added as-is.
                </p>
              </div>
              <div className="space-y-4">
                {hotGoodsBundleItems.map((bundleItem, index) => {
                  const product = products.find(p => p.id === bundleItem.productId)
                  if (!product) return null
                  
                  return (
                    <div key={bundleItem.productId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Market S {index + 1}: {bundleItem.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            {(product as any).brand && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                Brand: {(product as any).brand}
                              </span>
                            )}
                            {(product as any).size && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                Size: {(product as any).size}
                              </span>
                            )}
                            {(product as any).color && (
                              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                                Color: {(product as any).color}
                              </span>
                            )}
                            {(product as any).subcategory && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                                {(product as any).subcategory}
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <button
                onClick={handleAddToCartAndCheckout}
                disabled={!bundleProduct || isAddingToCart}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Checkout</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleAddToCart}
                disabled={!bundleProduct}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


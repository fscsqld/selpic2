'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore, Product } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { Type, Palette, Package, ShoppingCart, ArrowRight, X, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import Header from '@/components/Header'
import { getStampFonts, getEffectiveFont, containsKorean, type FontConfig } from '@/lib/fontList'

// Suspense wrapper for useSearchParams
export default function StampCustomizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StampCustomizeContent />
    </Suspense>
  )
}

function StampCustomizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { products, addToCart } = useStore()
  const { isLoggedIn, isDemo } = useUserAuth()
  const { t } = useTranslation()
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [customText, setCustomText] = useState('Your Name')
  const [selectedFont, setSelectedFont] = useState('k-stamp-antique') // 기본값을 한글 지원 폰트로 설정
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFontGuideOpen, setIsFontGuideOpen] = useState(false)
  
  // SET 상품용: 각 아이템별 커스터마이징 상태 (각 아이템마다 다른 디자인 선택 가능)
  const [setItems, setSetItems] = useState<Array<{
    selectedDesign: Product | null // 각 아이템마다 선택한 디자인(스템프 상품)
    text: string
    font: string
    color: string
    customizedImage: string | null
  }>>([])

  useEffect(() => {
    const productId = searchParams.get('product')
    
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId && p.category === 'Stamps')
      if (product) {
        setSelectedProduct(product)
        setCustomText(product.name)
        
        // SET 상품인 경우 아이템 개수만큼 초기화
        if (product.subcategory === 'Set') {
          const itemCount = (product as any).setItemCount ?? 3
          setSetItems(Array(itemCount).fill(null).map(() => ({
            selectedDesign: null, // 각 아이템마다 다른 디자인 선택 가능
            text: 'Custom Text',
            font: 'k-stamp-antique', // 기본값을 한글 지원 폰트로 설정
            color: '#000000',
            customizedImage: null
          })))
        } else {
          setSetItems([])
        }
      }
    }
  }, [searchParams, products])

  const getCustomizationPrice = (): number => {
    if (!selectedProduct) return 25.00
    return selectedProduct.price
  }
  
  // ✅ 공통 FONT_LIST에서 스탬프용 폰트만 필터링하여 사용
  const stampFonts = getStampFonts()
  
  // ✅ 선택한 폰트 ID로 실제 폰트 정보 가져오기 (fallback 처리 포함)
  const getCurrentFont = (): FontConfig => {
    return getEffectiveFont(selectedFont, customText)
  }
  
  // ✅ Font Style Guide 데이터
  const fontGuideData = [
    {
      id: 'k-round-joy',
      name: 'K-Round Joy',
      description: 'A friendly and playful Korean font with rounded edges. Perfect for casual and cheerful designs.',
      recommendedUse: 'Casual stickers, name tags, friendly messages, children\'s products'
    },
    {
      id: 'k-sweet-candy',
      name: 'K-Sweet Candy',
      description: 'A sweet and charming Korean font with a candy-like appearance. Great for cute and adorable designs.',
      recommendedUse: 'Cute stickers, gift tags, sweet messages, decorative labels'
    },
    {
      id: 'k-clean-soft',
      name: 'K-Clean Soft',
      description: 'A clean and modern Korean font with soft rounded corners. Ideal for professional yet approachable designs.',
      recommendedUse: 'Business cards, professional stickers, clean labels, modern designs'
    },
    {
      id: 'k-strong-impact',
      name: 'K-Strong Impact',
      description: 'A bold and impactful Korean font that commands attention. Perfect for statements and emphasis.',
      recommendedUse: 'Bold statements, attention-grabbing stickers, strong messages, promotional materials'
    },
    {
      id: 'k-stamp-antique',
      name: 'K-Stamp Antique',
      description: 'A traditional Korean font with an antique, classic feel. Evokes a sense of heritage and elegance.',
      recommendedUse: 'Traditional stamps, formal documents, classic designs, heritage products'
    },
    {
      id: 'k-classic-seal',
      name: 'K-Classic Seal',
      description: 'A classic Korean font with seal-like characteristics. Perfect for official and formal applications.',
      recommendedUse: 'Official stamps, formal documents, certificates, traditional designs'
    },
    {
      id: 'aussie-script',
      name: 'Aussie Script',
      description: 'A relaxed and friendly script font with an Australian flair. Great for casual and laid-back designs.',
      recommendedUse: 'Casual stamps, friendly messages, relaxed designs, informal labels'
    },
    {
      id: 'elegant-flow',
      name: 'Elegant Flow',
      description: 'A flowing and elegant script font that adds sophistication to any design.',
      recommendedUse: 'Elegant stamps, formal invitations, sophisticated designs, premium products'
    },
    {
      id: 'premium-sans',
      name: 'Premium Sans',
      description: 'A modern and clean sans-serif font perfect for contemporary and minimalist designs.',
      recommendedUse: 'Modern designs, minimalist stickers, contemporary labels, premium products'
    },
    {
      id: 'bubble-pop',
      name: 'Bubble Pop',
      description: 'A fun and bubbly font that pops with personality. Great for playful and energetic designs.',
      recommendedUse: 'Playful stickers, fun messages, children\'s products, energetic designs'
    },
    {
      id: 'friendly-bold',
      name: 'Friendly Bold',
      description: 'A bold and friendly font that combines strength with approachability.',
      recommendedUse: 'Bold stickers, friendly messages, attention-grabbing designs, promotional materials'
    }
  ]
  
  const colors = ['#000000', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
  const fixedSize = { id: 'medium', name: 'Medium', price: 25.00 }

  // HEX 코드를 색상 이름으로 변환
  const getColorName = (hex: string): string => {
    const colorMap: { [key: string]: string } = {
      '#000000': 'BLACK',
      '#3B82F6': 'BLUE',
      '#EF4444': 'RED',
      '#10B981': 'GREEN',
      '#F59E0B': 'YELLOW',
      '#8B5CF6': 'PURPLE',
      '#EC4899': 'PINK',
      '#06B6D4': 'CYAN',
      '#84CC16': 'LIME'
    }
    return colorMap[hex.toUpperCase()] || hex
  }

  // 디자인 통계 계산
  const designStats = (() => {
    const characters = customText.replace(/\n/g, '').length
    const maxCharacters = 50

    // 완료도 계산
    let steps = 0
    let done = 0

    // 텍스트 입력
    steps += 1
    if (customText.trim().length > 0) done += 1

    // 폰트 선택
    steps += 1
    if (selectedFont) done += 1

    // 색상 선택
    steps += 1
    if (selectedColor) done += 1

    // 제품 선택
    steps += 1
    if (selectedProduct) done += 1

    const completion = steps > 0 ? Math.floor((done / steps) * 100) : 0

    return {
      characters,
      maxCharacters,
      completion,
      price: getCustomizationPrice()
    }
  })()

  // SET 아이템의 커스터마이징된 이미지 생성
  const MAX_CANVAS_DIMENSION = 600

  const generateSetItemCustomizedImage = useCallback(async (designProduct: Product, customization: {
    text: string
    font: string
    color: string
  }) => {
    if (typeof window === 'undefined' || !designProduct) return null

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

            // ✅ SET 아이템 폰트 설정 (한글 fallback 처리)
            const effectiveFont = getEffectiveFont(customization.font, customization.text)
            ctx.font = `bold 24px ${effectiveFont.fontFamily}`
            ctx.fillStyle = customization.color
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const textX = canvas.width / 2
            const textY = canvas.height / 2

            ctx.fillText(customization.text, textX, textY)

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            resolve(dataUrl)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = designProduct.image
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

    if (!selectedProduct) {
      alert('Please select a product first')
      return
    }

    setIsAddingToCart(true)

    try {
      // Store에서 최신 제품 정보 가져오기
      const storeProduct = products.find(p => p.id === selectedProduct.id)
      if (!storeProduct) {
        alert('Product not found. Please refresh the page and try again.')
        setIsAddingToCart(false)
        return
      }

      // SET 상품인 경우
      if (selectedProduct.subcategory === 'Set') {
        // 모든 아이템이 디자인을 선택했는지 확인
        const allDesignsSelected = setItems.every(item => item.selectedDesign !== null)
        if (!allDesignsSelected) {
          alert('Please select a design for all items in the set')
          setIsAddingToCart(false)
          return
        }

        const customizations: Record<string, string> = {
          size: fixedSize.name,
          setType: 'set'
        }
        
        // 각 아이템의 커스터마이징 정보와 선택한 디자인 저장
        for (let index = 0; index < setItems.length; index++) {
          const item = setItems[index]
          if (!item.selectedDesign) continue

          // 각 아이템의 커스터마이징된 이미지 생성
          const customizedImg = await generateSetItemCustomizedImage(item.selectedDesign, {
            text: item.text,
            font: item.font,
            color: item.color
          })

          customizations[`item${index + 1}_designId`] = item.selectedDesign.id
          customizations[`item${index + 1}_designName`] = item.selectedDesign.name
          customizations[`item${index + 1}_text`] = item.text
          customizations[`item${index + 1}_font`] = item.font
          customizations[`item${index + 1}_color`] = item.color
          if (customizedImg) {
            customizations[`item${index + 1}_customizedImage`] = customizedImg
          }
        }
        
        // SET 상품의 원래 가격 유지
        const cartItem = {
          product: selectedProduct, // SET 상품 자체를 사용 (원래 가격 유지)
          quantity: orderQuantity,
          customizations
        }

        const success = addToCart(cartItem, isLoggedIn)
        
        setIsAddingToCart(false)
        
        if (success) {
          router.push('/checkout')
        } else {
          alert('Failed to add item to cart')
        }
        return
      }

      // 일반 상품인 경우 (기존 로직)
      const cartItem = {
        product: storeProduct, // 최신 제품 정보 사용
        quantity: orderQuantity,
        customizations: {
          text: customText,
          font: selectedFont,
          color: selectedColor,
          size: fixedSize.name
        }
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      if (success) {
        // 바로 결제 페이지로 이동
        router.push('/checkout')
      } else {
        // 재고 확인
        const stockQty = typeof storeProduct.stockQuantity === 'number' 
          ? storeProduct.stockQuantity 
          : (storeProduct.inStock ? 100 : 0)
        
        if (stockQty === 0) {
          alert('This product is currently out of stock.')
        } else {
          alert('Failed to add item to cart. Please try again.')
        }
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

    if (!selectedProduct) {
      alert('Please select a product first')
      return
    }

    try {
      // Store에서 최신 제품 정보 가져오기
      const storeProduct = products.find(p => p.id === selectedProduct.id)
      if (!storeProduct) {
        alert('Product not found. Please refresh the page and try again.')
        return
      }

      // SET 상품인 경우
      if (selectedProduct.subcategory === 'Set') {
        // 모든 아이템이 디자인을 선택했는지 확인
        const allDesignsSelected = setItems.every(item => item.selectedDesign !== null)
        if (!allDesignsSelected) {
          alert('Please select a design for all items in the set')
          return
        }

        const customizations: Record<string, string> = {
          size: fixedSize.name,
          setType: 'set'
        }
        
        // 각 아이템의 커스터마이징 정보와 선택한 디자인 저장
        for (let index = 0; index < setItems.length; index++) {
          const item = setItems[index]
          if (!item.selectedDesign) continue

          // 각 아이템의 커스터마이징된 이미지 생성
          const customizedImg = await generateSetItemCustomizedImage(item.selectedDesign, {
            text: item.text,
            font: item.font,
            color: item.color
          })

          customizations[`item${index + 1}_designId`] = item.selectedDesign.id
          customizations[`item${index + 1}_designName`] = item.selectedDesign.name
          customizations[`item${index + 1}_text`] = item.text
          customizations[`item${index + 1}_font`] = item.font
          customizations[`item${index + 1}_color`] = item.color
          if (customizedImg) {
            customizations[`item${index + 1}_customizedImage`] = customizedImg
          }
        }
        
        // SET 상품의 원래 가격 유지
        const cartItem = {
          product: selectedProduct, // SET 상품 자체를 사용 (원래 가격 유지)
          quantity: orderQuantity,
          customizations
        }

        const success = addToCart(cartItem, isLoggedIn)
        
        if (success) {
          alert('Item added to cart!')
          router.push('/cart')
        } else {
          alert('Failed to add item to cart')
        }
        return
      }

      // 일반 상품인 경우 (기존 로직)
      const cartItem = {
        product: storeProduct, // 최신 제품 정보 사용
        quantity: orderQuantity,
        customizations: {
          text: customText,
          font: selectedFont,
          color: selectedColor,
          size: fixedSize.name
        }
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      if (success) {
        alert('Item added to cart!')
        router.push('/cart')
      } else {
        // 재고 확인
        const stockQty = typeof storeProduct.stockQuantity === 'number' 
          ? storeProduct.stockQuantity 
          : (storeProduct.inStock ? 100 : 0)
        
        if (stockQty === 0) {
          alert('This product is currently out of stock.')
        } else {
          alert('Failed to add item to cart. Please try again.')
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert('An error occurred while adding the item to cart.')
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/images/stamp.jpg')",
          zIndex: 0
        }}
      />
      
      {/* Dark Overlay for Text Readability */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/75 via-slate-800/70 to-slate-900/75" style={{ zIndex: 1 }} />
      
      {/* Content */}
      <div className="relative z-10">
        <Header />
      
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            📮 Stamp Customization
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            {selectedProduct 
              ? `Customize your ${selectedProduct.name} with text, colors, and fonts`
              : 'Design your own unique stamp. You can freely choose text, font, and color.'
            }
          </p>
        </div>

        {/* 제품 선택 */}
        {!selectedProduct && (
          <div className="bg-slate-800/90 rounded-xl shadow-2xl border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Select Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products
                .filter(p => p.category === 'Stamps')
                .slice(0, 6)
                .map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product)
                      setCustomText(product.name)
                    }}
                    className="p-4 border-2 rounded-lg text-left transition-all border-slate-600 hover:border-slate-500 bg-slate-700/50"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <h3 className="font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-slate-300">${product.price.toFixed(2)}</p>
                  </button>
                ))}
            </div>
          </div>
        )}

            {/* SET 상품 커스터마이징 */}
            {selectedProduct && selectedProduct.subcategory === 'Set' && setItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  📦 Set Customization ({setItems.length} items)
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Select a different design for each item in your set. Each item can have different text, font, and color.
                </p>
                
                <div className="space-y-6">
                  {setItems.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Item {index + 1} of {setItems.length}
                      </h3>
                      
                      {/* 디자인 선택 */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Design *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {products
                            .filter(
                              (p): p is Product =>
                                p.category === 'Stamps' &&
                                p.subcategory !== 'Set' &&
                                !!(
                                  p.customizationOptions &&
                                  p.customizationOptions.length > 0
                                )
                            )
                            .map((designProduct) => {
                              const isSelected = item.selectedDesign?.id === designProduct.id
                              return (
                                <button
                                  key={designProduct.id}
                                  onClick={() => {
                                    const newItems = [...setItems]
                                    newItems[index].selectedDesign = designProduct
                                    newItems[index].text = designProduct.name
                                    setSetItems(newItems)
                                  }}
                                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                                    isSelected
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <img
                                    src={designProduct.image}
                                    alt={designProduct.name}
                                    className="w-full h-24 object-cover rounded mb-2"
                                  />
                                  <h4 className="text-xs font-semibold text-gray-900 truncate">{designProduct.name}</h4>
                                </button>
                              )
                            })}
                        </div>
                        {!item.selectedDesign && (
                          <p className="text-xs text-red-600 mt-2">Please select a design for this item</p>
                        )}
                      </div>

                      {/* 커스터마이징 옵션 - 디자인이 선택된 경우에만 표시 */}
                      {item.selectedDesign && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {/* Text */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Type className="w-4 h-4 inline mr-1" />
                              Text
                            </label>
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => {
                                const newItems = [...setItems]
                                newItems[index].text = e.target.value
                                setSetItems(newItems)
                              }}
                              placeholder="Enter custom text (single line only)..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Stamps support single line text only.</p>
                          </div>
                          
                          {/* Font */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Type className="w-4 h-4 inline mr-1" />
                              Font
                            </label>
                            <select
                              value={item.font}
                              onChange={(e) => {
                                const newItems = [...setItems]
                                newItems[index].font = e.target.value
                                setSetItems(newItems)
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              {stampFonts.map((font) => (
                                <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                                  {font.displayName} {font.supportsKorean ? '[KOR/ENG]' : '[ENG ONLY]'}
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
                                      const newItems = [...setItems]
                                      newItems[index].color = color
                                      setSetItems(newItems)
                                    }}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                      item.color === color
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
                                value={item.color}
                                onChange={(e) => {
                                  const newItems = [...setItems]
                                  newItems[index].color = e.target.value
                                  setSetItems(newItems)
                                }}
                                className="w-12 h-12 rounded-lg cursor-pointer border border-gray-300"
                              />
                            </div>
                          </div>
                          
                          {/* Preview for this item */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Preview
                            </label>
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                              <img
                                src={item.selectedDesign.image}
                                alt={item.selectedDesign.name}
                                className="w-full h-full object-contain opacity-50"
                              />
                              {item.text.trim() && (
                                <div
                                  className="absolute text-center"
                                  style={{
                                    fontFamily: getEffectiveFont(item.font, item.text).fontFamily,
                                    color: item.color,
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    left: '50%',
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                    maxWidth: '90%',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {item.text}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Action Buttons for SET Customization */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-sm text-gray-600 font-medium">Quantity</span>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={orderQuantity <= 1}
                        onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                        className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-semibold tabular-nums">{orderQuantity}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={orderQuantity >= 999}
                        onClick={() => setOrderQuantity((q) => Math.min(999, q + 1))}
                        className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAddToCartAndCheckout}
                      disabled={!selectedProduct || isAddingToCart || !setItems.every(item => item.selectedDesign !== null)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={!selectedProduct || !setItems.every(item => item.selectedDesign !== null)}
                      className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all border border-gray-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Package className="w-5 h-5" />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                  {!setItems.every(item => item.selectedDesign !== null) && (
                    <p className="text-sm text-red-600 mt-2 text-center">
                      Please select a design for all items before proceeding
                    </p>
                  )}
                </div>
              </div>
            )}

        {/* 일반 상품인 경우: Game Layout Style */}
        {selectedProduct && selectedProduct.subcategory !== 'Set' && (
          <div className={`flex gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[1000px]' : ''}`}>
            {/* Left: Preview Area */}
            <div className={`flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700 transition-all relative ${isSidebarCollapsed ? 'max-w-none' : ''}`}>
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute top-4 right-4 bg-blue-600/80 hover:bg-blue-600 border-none rounded-lg w-9 h-9 text-white font-bold cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-105"
                title="Toggle Sidebar"
              >
                <span>{isSidebarCollapsed ? '▶' : '◀'}</span>
              </button>

              {/* Preview Header */}
              <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-t-xl mb-4">
                <h3 className="text-xl font-bold text-center">Live Preview</h3>
              </div>

              {/* Preview Canvas (Bright Style) */}
              <div className="bg-gradient-to-br from-gray-50 to-white min-h-[500px] rounded-xl flex items-center justify-center p-8 border-2 border-gray-200 shadow-inner">
                <div
                  className="text-center"
                  style={{
                    fontFamily: getCurrentFont().fontFamily,
                    color: selectedColor,
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    textShadow: `0 0 20px ${selectedColor}30, 2px 2px 4px rgba(0,0,0,0.1)`
                  }}
                >
                  {customText || 'Your Text'}
                </div>
              </div>

              {/* HUD at Bottom (Game Style) */}
              <div className="mt-4 w-full">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 bg-slate-800/90 rounded-lg p-2 border border-slate-600 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Completion</span>
                    <span className="text-base font-semibold text-blue-400">
                      {designStats.completion}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-amber-400 min-h-[18px]">
                  {designStats.completion === 100
                    ? '✨ Design complete! Ready to add to cart'
                    : '💡 Complete your design to proceed'}
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${designStats.completion}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 bg-slate-800/90 rounded-lg p-2.5 border border-slate-600">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={orderQuantity <= 1}
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-white tabular-nums">{orderQuantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={orderQuantity >= 999}
                      onClick={() => setOrderQuantity((q) => Math.min(999, q + 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleAddToCartAndCheckout}
                    disabled={!selectedProduct || isAddingToCart}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={!selectedProduct}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all border border-slate-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Package className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Control Sidebar (Game Sidebar Style) */}
            {!isSidebarCollapsed && (
              <aside className="w-80 bg-slate-800/90 rounded-2xl p-4 border border-slate-700 shadow-2xl flex flex-col gap-3 relative">
                {/* Close Button */}
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 border-none rounded-full w-7 h-7 text-white cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-110"
                  title="Close Sidebar"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Design Stats Section */}
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">📊 Design Stats</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Font</span>
                      <span className="text-sm font-semibold text-white">{getCurrentFont().displayName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Color</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border border-slate-600"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <span className="text-sm font-semibold text-white">{getColorName(selectedColor)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Price</span>
                      <span className="text-sm font-semibold text-green-400">${designStats.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Customization Controls */}
                <div className="space-y-3">
                  {/* Text Input */}
                  <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      <Type className="w-4 h-4 inline mr-1" />
                      Stamp Text
                    </label>
                    <input
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Enter your custom text (single line only)..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Stamps support single line text only.</p>
                  </div>

                  {/* Font Selection */}
                  <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Font Style
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      style={{ fontFamily: getCurrentFont().fontFamily }}
                    >
                      {stampFonts.map(font => (
                        <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                          {font.displayName} {font.supportsKorean ? '[KOR/ENG]' : '[ENG ONLY]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Style Guide Accordion */}
                  <div className="bg-slate-900/60 rounded-lg border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setIsFontGuideOpen(!isFontGuideOpen)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-slate-300 hover:bg-slate-800/50 transition-colors"
                    >
                      <span>Font Style Guide</span>
                      {isFontGuideOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isFontGuideOpen && (
                      <div className="px-3 pb-3 space-y-3 max-h-[400px] overflow-y-auto">
                        {fontGuideData.map((guide) => {
                          const font = stampFonts.find(f => f.id === guide.id)
                          if (!font) return null
                          
                          return (
                            <div
                              key={guide.id}
                              className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-2"
                            >
                              {/* Font Name */}
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-semibold text-slate-200">{guide.name}</h5>
                                {font.supportsKorean && (
                                  <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                                    KOR/ENG
                                  </span>
                                )}
                                {!font.supportsKorean && (
                                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                    ENG ONLY
                                  </span>
                                )}
                              </div>
                              
                              {/* Sample Text Preview */}
                              <div
                                className="text-lg font-bold text-slate-100 py-2 px-3 bg-slate-900/50 rounded border border-slate-600/50"
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {font.supportsKorean ? '안녕하세요 Hello' : 'Hello World'}
                              </div>
                              
                              {/* Description */}
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description:</span>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{guide.description}</p>
                              </div>
                              
                              {/* Recommended Use */}
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recommended Use:</span>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed italic">{guide.recommendedUse}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Color Selection */}
                  <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      <Palette className="w-4 h-4 inline mr-1" />
                      Text Color
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all ${
                            selectedColor === color 
                              ? 'border-blue-500 ring-2 ring-blue-300 scale-110' 
                              : 'border-slate-600 hover:scale-105 hover:border-slate-500'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}


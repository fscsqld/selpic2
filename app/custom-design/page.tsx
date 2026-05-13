'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import NextImage from 'next/image'
import { useStore, Product } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useContentStore } from '@/lib/contentStore'
import { getStickerFonts, getEffectiveFont, type FontConfig } from '@/lib/fontList'
import { Type, Palette, Package, X, Gamepad2, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import Header from '@/components/Header'
import CustomDesignStudioPreview from '@/components/CustomDesignStudioPreview'
import { isStampsCheckoutEnabled } from '@/lib/stampsCommerce'

// Suspense wrapper for useSearchParams
export default function CustomDesignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CustomDesignContent />
    </Suspense>
  )
}

const DEFAULT_BG_IMAGE = '/images/STICKER1.jpg'
/** Static print guide: official AU school fonts (Fonts 1–5); matches Font 1–5 in the menu (Sticker Customization parity) */
const AU_SCHOOL_FONT_GUIDE_IMAGE = '/images/guides/australian-school-fonts-black-print.png'
const NAME_MAX_LETTERS = 9
const DEFAULT_TWO_LINE_SURCHARGE = 2
const twoLineMaxChars = 18

function CustomDesignContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { products, addToCart } = useStore()
  const { isLoggedIn, isDemo, user } = useUserAuth()
  const { t } = useTranslation()
  const categoryItems = useContentStore(s => s.categoryItems)
  const getActiveCategoryItems = useContentStore(s => s.getActiveCategoryItems)

  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(DEFAULT_BG_IMAGE)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productCategory, setProductCategory] = useState<string>('Custom Design')
  const [customText, setCustomText] = useState('Your Name')
  const [selectedFont, setSelectedFont] = useState('andika') // Font 1 (Andika) default, Sticker Customization과 동일
  const [selectedColor, setSelectedColor] = useState('#000000') // Sticker Customization과 동일 (Black only)
  const [categoryFilter, setCategoryFilter] = useState<'Stamps' | 'Stickers'>('Stickers')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFontGuideOpen, setIsFontGuideOpen] = useState(false)
  const [isOfficialSchoolFontGuideOpen, setIsOfficialSchoolFontGuideOpen] = useState(false)
  const [isOfficialFontGuideLightboxOpen, setIsOfficialFontGuideLightboxOpen] = useState(false)
  const [lineMode, setLineMode] = useState<'single' | 'two'>('single')
  const [twoLineFormat, setTwoLineFormat] = useState<'affiliation-name' | 'name-phone'>('affiliation-name')
  // Double-line 전용 입력 상태 (Option 1/2 공통: 소속/이름/전화 분리)
  const [twoLineAffiliation, setTwoLineAffiliation] = useState('')
  const [twoLineName, setTwoLineName] = useState('Your Name')
  const [twoLinePhone, setTwoLinePhone] = useState('')

  useEffect(() => {
    const categories = getActiveCategoryItems()
    const customDesign = categories.find(c => c.title === 'Custom Design')
    const bg = customDesign?.backgroundImage?.trim()
    if (!bg || bg.startsWith('indexeddb://')) {
      setBackgroundImageUrl(DEFAULT_BG_IMAGE)
      return
    }
    setBackgroundImageUrl(bg)
  }, [categoryItems, getActiveCategoryItems])

  // localStorage에서 저장된 이름 불러오기 (클라이언트에서만 실행)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selpic-custom-design-name')
      if (saved && saved !== 'Your Name\nCustom Text') {
        setCustomText(saved)
      }
    }
  }, [])

  useEffect(() => {
    const productId = searchParams.get('product')
    const categoryParam = searchParams.get('category')
    
    if (categoryParam) {
      setProductCategory(categoryParam)
    }
    
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId)
      if (product) {
        setSelectedProduct(product)
        setProductCategory(product.category)
        setCustomText(`${product.name}\nCustom Text`)
      }
    }
  }, [searchParams, products])

  // 필터 변경 시 카테고리 업데이트
  useEffect(() => {
    setProductCategory(categoryFilter)
  }, [categoryFilter])

  // customText 변경 시 localStorage에 자동 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && customText && customText !== 'Your Name\nCustom Text') {
      localStorage.setItem('selpic-custom-design-name', customText)
    }
  }, [customText])

  // Official font guide lightbox: Esc to close, lock body scroll while open
  useEffect(() => {
    if (!isOfficialFontGuideLightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOfficialFontGuideLightboxOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOfficialFontGuideLightboxOpen])

  useEffect(() => {
    if (categoryFilter !== 'Stickers') {
      setIsOfficialFontGuideLightboxOpen(false)
      setIsOfficialSchoolFontGuideOpen(false)
    }
  }, [categoryFilter])

  const getCustomizationPrice = (): number => {
    if (!selectedProduct) return 20.00
    return selectedProduct.price
  }

  // ✅ Sticker Customization 페이지와 동일: 스티커용 폰트만 사용
  const availableFonts = getStickerFonts()
  
  // ✅ 선택한 폰트 ID로 실제 폰트 정보 가져오기 (fallback 처리 포함)
  const getCurrentFont = (): FontConfig => {
    return getEffectiveFont(selectedFont, customText)
  }

  // ✅ 스티커 폰트 표시 이름 (Font 1~7, Sticker Customization과 동일)
  const STICKER_FONT_DISPLAY_NAMES: Record<string, string> = {
    'andika': 'Font 1',
    'edu-nsw-act-foundation': 'Font 2',
    'edu-au-vic-wa-nt-hand': 'Font 3',
    'edu-sa-beginner': 'Font 4',
    'edu-tas-beginner': 'Font 5',
    'k-round-joy': 'Font 6',
    'nanum-myeongjo': 'Font 7'
  }
  const getFontLabel = (fontId: string): string => {
    return STICKER_FONT_DISPLAY_NAMES[fontId] ?? getEffectiveFont(fontId, '').displayName
  }

  // ✅ Font Style Guide: Sticker Customization 페이지와 동일 (Font 1~7, 지역·용도 설명 포함)
  const fontGuideData = [
    {
      id: 'andika',
      name: 'Font 1',
      description: 'Andika is a humanist sans-serif font widely preferred in Queensland (QLD) for clear, easy-to-read printing. Designed for literacy and education contexts in Queensland—clear, friendly, and highly legible at small sizes. Supports Latin and many other scripts; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Queensland schools and families, school labels, readable name tags, professional and friendly designs'
    },
    {
      id: 'nanum-myeongjo',
      name: 'Font 7',
      description: 'Font 7 uses Gungsuh (궁서체) style first, with Nanum Myeongjo as fallback. Elegant, formal, and readable with a classic calligraphy feel. Supports both Korean and English. Compared with Font 6 (Jua), Font 7 focuses on a more serious, traditional look suitable for formal name labels rather than playful designs.',
      recommendedUse: 'Name stickers, formal labels, certificates, traditional and elegant designs where a more serious serif style is preferred over rounded playful fonts like Font 6.'
    },
    {
      id: 'edu-nsw-act-foundation',
      name: 'Font 2',
      description: 'Edu NSW ACT Foundation is a handwriting font designed for Australian education standards. It is the official foundation font for the New South Wales (NSW) and Australian Capital Territory (ACT) regions. Sincere, childlike, and active in feel—ideal for name labels and school use in NSW and ACT. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for NSW & ACT schools and families, children\'s labels, educational and regional preference'
    },
    {
      id: 'edu-au-vic-wa-nt-hand',
      name: 'Font 3',
      description: 'Edu AU VIC WA NT Hand is the official handwriting font for the Victoria (VIC), Western Australia (WA), and Northern Territory (NT) regions. Designed for Australian school standards in these regions—ideal for name labels and school use in VIC, WA & NT. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Victoria, Western Australia & Northern Territory schools and families, children\'s labels, regional preference'
    },
    {
      id: 'edu-sa-beginner',
      name: 'Font 4',
      description: 'Edu SA Beginner is a handwriting font from the Foundation Fonts for Australian Schools collection, designed specifically for South Australia (SA). It uses a sloped print style with a sincere, childlike feel—ideal for beginner handwriting and name labels in South Australian schools. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for South Australia schools and families, beginner handwriting labels, regional preference for SA'
    },
    {
      id: 'edu-tas-beginner',
      name: 'Font 5',
      description: 'Edu TAS Beginner is a handwriting font representing the precursive print style used in Tasmanian (TAS) schools. Designed for early handwriting education in Tasmania—clean, simple, and easy for children to follow. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Tasmania schools and families, beginner handwriting labels, regional preference for TAS'
    },
    {
      id: 'k-round-joy',
      name: 'Font 6',
      description: 'Jua (K-Round Joy) is a popular Korean rounded sans-serif font with a friendly, playful look. Widely used in Korea for children\'s books, signage, and casual designs. Fully supports Korean and English, making it ideal for name stickers that need clear Hangul and Latin characters. Compared with Font 7 (Nanum Myeongjo), Font 6 is much more casual and playful, better suited for kids and fun designs rather than formal or traditional labels.',
      recommendedUse: 'Name stickers and labels for Korean-speaking families, children\'s labels, playful and friendly designs requiring clear Hangul support, especially when a more casual alternative to the formal serif style of Font 7 is desired.'
    }
  ]
  
  const colors = ['#000000'] // Sticker Customization과 동일 (Black only)
  const fixedSize = { id: 'medium', name: 'Medium', price: 20.00 }

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

    // 완료도 계산: 필수 요소 기준으로 비율 계산
    // 1) 텍스트가 비어있지 않은지
    // 2) 폰트가 선택되어 있는지
    // 3) 색상이 선택되어 있는지
    // 4) 카테고리가 선택되어 있는지
    let steps = 0
    let done = 0

    // 텍스트 입력
    steps += 1
    if (customText.trim().length > 0) {
      done += 1
    }

    // 폰트 선택 (기본값 포함, 어떤 값이든 선택된 것으로 간주)
    steps += 1
    if (selectedFont) {
      done += 1
    }

    // 색상 선택 (기본값 포함)
    steps += 1
    if (selectedColor) {
      done += 1
    }

    // 카테고리 선택
    steps += 1
    if (categoryFilter) {
      done += 1
    }

    const completion = steps > 0 ? Math.round((done / steps) * 100) : 0

    return {
      characters,
      maxCharacters,
      completion: Math.min(100, completion),
      price: getCustomizationPrice()
    }
  })()

  const handleAddToCart = () => {
    if (categoryFilter === 'Stamps' && !isStampsCheckoutEnabled()) {
      alert('Stamps are not available for purchase yet. You can still use this studio to preview typography.')
      return
    }

    if (!isLoggedIn) {
      alert('Please login to add items to cart')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    // 카테고리에 맞는 실제 제품 찾기
    let productToAdd = selectedProduct
    
    if (!productToAdd) {
      // 카테고리에 맞는 제품 찾기 (커스터마이징 가능한 제품 우선)
      const categoryProducts = products.filter(p => {
        const matchesCategory = p.category === categoryFilter || 
                               p.category === 'Custom Design' ||
                               (categoryFilter === 'Stickers' && p.category === 'Stickers') ||
                               (categoryFilter === 'Stamps' && p.category === 'Stamps')
        return matchesCategory && p.inStock
      })
      
      if (categoryProducts.length > 0) {
        // 커스터마이징 옵션이 있는 제품 우선 선택
        const customizableProduct = categoryProducts.find(p => p.customizationOptions && p.customizationOptions.length > 0)
        productToAdd = customizableProduct || categoryProducts[0]
      } else {
        // 기본 제품 생성 (커스텀 제품으로 처리)
        productToAdd = {
          id: `custom-${categoryFilter.toLowerCase()}-${Date.now()}`,
          name: `Custom ${categoryFilter}`,
          price: getCustomizationPrice(),
          category: categoryFilter,
          description: `Custom designed ${categoryFilter.toLowerCase()}`,
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
          inStock: true
        } as Product
      }
    }

    const cartItem = {
      product: productToAdd,
      quantity: 1,
      customizations: {
        text: customText,
        font: selectedFont,
        color: selectedColor,
        size: fixedSize.name
      }
    }

    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      alert('Added to cart!')
      router.push('/cart')
    } else {
      // 커스텀 제품인 경우 store에 추가 시도
      if (!selectedProduct && !products.find(p => p.id === productToAdd.id)) {
        alert('Custom design products need to be added to the product catalog first. Please contact support.')
      } else {
        alert('Failed to add to cart')
      }
    }
  }

  const handleDirectOrder = () => {
    if (categoryFilter === 'Stamps' && !isStampsCheckoutEnabled()) {
      alert('Stamps are not available for purchase yet. You can still use this studio to preview typography.')
      return
    }

    if (!isLoggedIn) {
      alert('Please login to place orders')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    const productToAdd = selectedProduct || {
      id: 'custom-design-1',
      name: 'Custom Design',
      price: 20.00,
      category: 'Custom Design',
      description: 'Custom designed product',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      inStock: true
    } as Product

    const cartItem = {
      product: productToAdd,
      quantity: 1,
      customizations: {
        text: customText,
        font: selectedFont,
        color: selectedColor,
        size: fixedSize.name
      }
    }

    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      router.push('/checkout')
    } else {
      alert('Failed to process order')
    }
  }

  const getPageTitle = () => {
    if (selectedProduct || productCategory) {
      const category = selectedProduct?.category || productCategory
      if (category === 'Stamps') return 'Customize Stamp'
      if (category === 'Stickers') return 'Customize Sticker'
      if (category === 'Phone Cases') return 'Customize Phone Case'
    }
    return 'Custom Design Studio'
  }

  const getPreviewTitle = () => {
    if (selectedProduct || productCategory) {
      const category = selectedProduct?.category || productCategory
      if (category === 'Stamps') return 'Stamp Preview'
      if (category === 'Stickers') return 'Sticker Preview'
      if (category === 'Phone Cases') return 'Phone Case Preview'
    }
    return 'Design Preview'
  }

  const getTextLabel = () => {
    if (selectedProduct || productCategory) {
      const category = selectedProduct?.category || productCategory
      if (category === 'Stamps') return 'Stamp Text'
      if (category === 'Stickers') return 'Sticker Text'
      if (category === 'Phone Cases') return 'Phone Case Text'
    }
    return 'Custom Text'
  }

  // 필터링된 카테고리에 따라 타이틀 업데이트
  const getFilteredTitle = () => {
    return 'Custom Design Studio'
  }

  const getFilteredPreviewTitle = () => {
    if (categoryFilter === 'Stamps') return 'Stamp Preview'
    if (categoryFilter === 'Stickers') return 'Sticker Preview'
    return getPreviewTitle()
  }

  const getFilteredTextLabel = () => {
    if (categoryFilter === 'Stamps') return 'Stamp Text'
    if (categoryFilter === 'Stickers') return 'Sticker Text'
    return getTextLabel()
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image (Custom Design 카테고리와 동일) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url('${backgroundImageUrl}')`,
          zIndex: 0
        }}
      />
      
      {/* 선명도 유지: 강한 오버레이 제거, 텍스트 가독용으로만 하단 얕은 그라데이션 */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Content */}
      <div className="relative z-10">
        <Header />

      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Page Title — 가독성: 배경 이미지와 관계없이 텍스트가 보이도록 그림자·배경 적용 */}
        <div className="text-center mb-8 px-4 py-6 rounded-xl bg-black/30 backdrop-blur-sm max-w-3xl mx-auto">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {getFilteredTitle()}
          </h1>
          <p className="text-xl text-slate-200 max-w-2xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            {selectedProduct 
              ? `Customize your ${selectedProduct.name} with text, colors, and fonts`
              : 'Create your own unique custom design with our easy-to-use tools'
            }
          </p>
        </div>

        {/* Category Filter - Top */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => setCategoryFilter('Stickers')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              categoryFilter === 'Stickers'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 border-2 border-slate-600 hover:border-blue-400'
            }`}
          >
            🏷️ Stickers
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('Stamps')}
            className={`inline-flex flex-wrap items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              categoryFilter === 'Stamps'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 border-2 border-slate-600 hover:border-green-400'
            }`}
          >
            <span>📮 Stamps</span>
            {!isStampsCheckoutEnabled() && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/40">
                Coming soon
              </span>
            )}
          </button>
        </div>

        {categoryFilter === 'Stamps' && !isStampsCheckoutEnabled() && (
          <div
            className="mb-6 rounded-xl border border-amber-400/35 bg-amber-950/40 px-4 py-3 text-center shadow-inner backdrop-blur-sm max-w-2xl mx-auto"
            role="status"
          >
            <p className="text-sm font-semibold text-amber-100">Stamps — not on sale yet</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/85">
              You can explore fonts and text here; purchasing stamp products is not available until launch. Stickers are
              available from the Stickers tab.
            </p>
          </div>
        )}

        {/* Game Layout: Left (Preview) + Right (Sidebar) */}
        <div className={`flex gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[1000px]' : ''}`}>
          {/* Left: Preview Area (Game Canvas Style) */}
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
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl mb-4">
              <h3 className="text-xl font-bold text-center">{getFilteredPreviewTitle()}</h3>
            </div>

            {/* Preview canvas: generic studio sheet — responsive; rest of page unchanged */}
            <div className="overflow-hidden rounded-xl border-2 border-gray-200/90 bg-gradient-to-br from-[#f8f9fb] via-white to-[#eef1f6] shadow-inner">
              <CustomDesignStudioPreview
                categoryFilter={categoryFilter}
                customText={customText}
                lineMode={lineMode}
                twoLineFormat={twoLineFormat}
                fontFamily={getCurrentFont().fontFamily}
                color={selectedColor}
              />
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
                {designStats.characters > designStats.maxCharacters
                  ? '⚠️ Character limit exceeded!'
                  : categoryFilter === 'Stamps' && !isStampsCheckoutEnabled()
                    ? designStats.completion === 100
                      ? '✨ Preview ready — stamps not available for purchase yet'
                      : '💡 Studio preview only (stamps coming soon)'
                    : designStats.completion === 100
                      ? '✨ Design complete! Ready to add to cart'
                      : '💡 Complete your design to proceed'}
              </div>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${designStats.completion}%` }}
                />
              </div>
              
              {/* Game Promotion Text */}
              {designStats.completion === 100 && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-500/30">
                  <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                    <p className="font-semibold text-purple-300 mb-1.5">
                      🎮 Play Selpic TETRIS & Win Rewards!
                    </p>
                    <p className="text-[10px] font-bold text-yellow-400 whitespace-nowrap overflow-hidden text-ellipsis">
                      Complete all 5 levels to unlock a promo code: 10% off (max $15), min. cart $30 — one use per customer.
                    </p>
                    <p className="text-slate-400 text-[10px] mt-1.5 italic">
                      Your custom name will appear in the game blocks!
                    </p>
                  </div>
                </div>
              )}
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
                    <span className="text-xs text-slate-400">Category</span>
                    <span className="text-sm font-semibold text-white">{categoryFilter}</span>
                  </div>
                </div>
              </div>

              {/* Sticker Text / Stamp Text (Sticker Customization과 동일) */}
              <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  <Type className="w-3.5 h-3.5 inline mr-1" />
                  {categoryFilter === 'Stamps' ? 'Stamp Text' : 'Sticker Text'}
                  {categoryFilter === 'Stickers' && (
                    <span className="ml-2 text-blue-400 font-normal">
                      ( 2 lines: +${DEFAULT_TWO_LINE_SURCHARGE} surcharge)
                    </span>
                  )}
                </label>
                {categoryFilter === 'Stamps' ? (
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Enter stamp text"
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3 mb-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="lineMode"
                          checked={lineMode === 'single'}
                          onChange={() => {
                            // Single line로 전환 시, 현재 이름 줄을 단일 텍스트로 사용
                            setLineMode('single')
                            setCustomText(prev => {
                              const parts = prev.split('\n').map(p => p.trim()).filter(Boolean)
                              const namePart = parts[0] || twoLineName || 'Your Name'
                              return namePart.replace(/\n/g, '').slice(0, NAME_MAX_LETTERS)
                            })
                          }}
                          className="rounded border-slate-500"
                        />
                        <span className="text-xs text-slate-300">Single line (default)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="lineMode"
                          checked={lineMode === 'two'}
                          onChange={() => {
                            // Double line으로 전환 시, 현재 텍스트를 2줄(Option 1/2)에 맞게 분리
                            setLineMode('two')
                            setCustomText(prev => {
                              const rawParts = prev.split('\n')
                              if (twoLineFormat === 'name-phone') {
                                const namePart = (rawParts[0] || twoLineName || 'Your Name').slice(0, 9)
                                const phonePart = (rawParts[1] || twoLinePhone || '').slice(0, 9)
                                setTwoLineName(namePart)
                                setTwoLinePhone(phonePart)
                                return phonePart ? `${namePart}\n${phonePart}` : namePart
                              } else {
                                // affiliation-name
                                const affPart = (rawParts[0] || twoLineAffiliation || '').slice(0, 9)
                                const namePart = (rawParts[1] || twoLineName || 'Your Name').slice(0, 9)
                                setTwoLineAffiliation(affPart)
                                setTwoLineName(namePart)
                                return affPart ? `${affPart}\n${namePart}` : namePart
                              }
                            })
                          }}
                          className="rounded border-slate-500"
                        />
                        <span className="text-xs text-slate-300">Double line</span>
                      </label>
                    </div>
                    {lineMode === 'two' && (
                      <div className="flex gap-3 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="twoLineFormat"
                            checked={twoLineFormat === 'affiliation-name'}
                            onChange={() => {
                              setTwoLineFormat('affiliation-name')
                              // 현재 2줄 텍스트를 소속/이름으로 재구성
                              setCustomText(() => {
                                const affPart = twoLineAffiliation.slice(0, 9)
                                const namePart = twoLineName.slice(0, 9) || 'Your Name'
                                return affPart ? `${affPart}\n${namePart}` : namePart
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Option 1: Affiliation + Name</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="twoLineFormat"
                            checked={twoLineFormat === 'name-phone'}
                            onChange={() => {
                              setTwoLineFormat('name-phone')
                              // 현재 2줄 텍스트를 이름/전화로 재구성
                              setCustomText(() => {
                                const namePart = twoLineName.slice(0, 9) || 'Your Name'
                                const phonePart = twoLinePhone.slice(0, 9)
                                return phonePart ? `${namePart}\n${phonePart}` : namePart
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Option 2: Name + Phone</span>
                        </label>
                      </div>
                    )}
                    {lineMode === 'two' && twoLineFormat === 'affiliation-name' && (
                      // Option 1: Affiliation + Name — 소속/이름 입력을 분리
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 1: Affiliation
                            </label>
                            <input
                              type="text"
                              value={twoLineAffiliation}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineAffiliation(v)
                                setCustomText(v + (twoLineName ? `\n${twoLineName}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Affiliation (up to 9 letters)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 2: Name
                            </label>
                            <input
                              type="text"
                              value={twoLineName}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineName(v)
                                setCustomText((twoLineAffiliation || '').slice(0, 9) + (v ? `\n${v}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Name (up to 9 letters)"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {lineMode === 'two' && twoLineFormat === 'name-phone' && (
                      // Option 2: Name + Phone — 이름/전화 입력을 분리
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 1: Name
                            </label>
                            <input
                              type="text"
                              value={twoLineName}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineName(v)
                                setCustomText(v + (twoLinePhone ? `\n${twoLinePhone}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Name (up to 9 letters)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 2: Phone number
                            </label>
                            <input
                              type="text"
                              value={twoLinePhone}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLinePhone(v)
                                setCustomText(twoLineName + (v ? `\n${v}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Phone (up to 9 characters)"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {lineMode !== 'two' && (
                      <textarea
                        value={customText}
                        onChange={(e) => {
                          const raw = e.target.value
                          setCustomText(raw.replace(/\n/g, '').slice(0, NAME_MAX_LETTERS))
                        }}
                        placeholder="Enter your custom text..."
                        maxLength={NAME_MAX_LETTERS}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm min-h-0"
                        rows={2}
                      />
                    )}
                  </>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">
                    {categoryFilter === 'Stamps'
                      ? 'Single line only'
                      : lineMode === 'two'
                        ? '2 lines available. Up to 9 letters per line (18 total). Name line displays larger. Extra charge applies when 2 lines are used.'
                        : `Up to ${NAME_MAX_LETTERS} letters (one line)`}
                  </p>
                  <p className="text-xs font-bold text-blue-400 italic bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                    ✓ Korean supported
                  </p>
                </div>
              </div>

              {/* Font Selection */}
              <div className="bg-blue-900/50 rounded-lg p-3 border border-blue-700/60">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Font Style
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  style={{ fontFamily: getCurrentFont().fontFamily }}
                >
                  {availableFonts.map(font => (
                    <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                      {getFontLabel(font.id)}
                    </option>
                  ))}
                </select>
              </div>

              {categoryFilter === 'Stickers' && (
                <>
                  {/* Official Australian school fonts — static print guide (Sticker Customization parity) */}
                  <div className="bg-blue-900/50 rounded-lg border border-blue-700/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsOfficialSchoolFontGuideOpen((open) => !open)}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-300 hover:bg-blue-800/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-left min-w-0">
                        <BookOpen className="w-4 h-4 shrink-0 text-sky-300" aria-hidden />
                        <span>View official Australian school fonts guide (black print)</span>
                      </span>
                      {isOfficialSchoolFontGuideOpen ? (
                        <ChevronUp className="w-4 h-4 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" aria-hidden />
                      )}
                    </button>
                    {isOfficialSchoolFontGuideOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Pick the foundation font that matches your child&apos;s state or territory. Rows 1–5 on this sheet align with Font 1–5 in the menu above. Fonts 6–7 are extra styles (for example Korean-friendly options).
                        </p>
                        <p className="text-xs text-slate-500">Tap the image for a larger view.</p>
                        <button
                          type="button"
                          onClick={() => setIsOfficialFontGuideLightboxOpen(true)}
                          className="group w-full rounded-lg overflow-hidden border border-slate-600/80 bg-slate-900/40 text-left ring-offset-2 ring-offset-slate-950 transition hover:border-sky-500/50 hover:ring-2 hover:ring-sky-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          aria-label="Open enlarged official school fonts guide"
                        >
                          <NextImage
                            src={AU_SCHOOL_FONT_GUIDE_IMAGE}
                            alt="Official Australian school fonts for black-print labels: Queensland (Andika) through Tasmania, with sample text for each font."
                            width={900}
                            height={1200}
                            className="w-full h-auto transition group-hover:opacity-95"
                            sizes="(max-width: 768px) 100vw, 360px"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Font Style Guide Accordion */}
              <div className="bg-blue-900/50 rounded-lg border border-blue-700/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsFontGuideOpen(!isFontGuideOpen)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-slate-300 hover:bg-blue-800/50 transition-colors"
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
                    {[...fontGuideData].sort((a, b) => {
                      const aIndex = availableFonts.findIndex(f => f.id === a.id)
                      const bIndex = availableFonts.findIndex(f => f.id === b.id)
                      return aIndex - bIndex
                    }).map((guide) => {
                      const font = availableFonts.find(f => f.id === guide.id)
                      if (!font) return null
                      
                      return (
                        <div
                          key={guide.id}
                          className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-2"
                        >
                          {/* Font Name */}
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-semibold text-slate-200">{guide.name}</h5>
                          </div>
                          
                          {/* Sample Text Preview (Sticker Customization과 동일) */}
                          <div
                            className="text-lg font-bold text-slate-100 py-2 px-3 bg-slate-900/50 rounded border border-slate-600/50"
                            style={{ fontFamily: font.fontFamily }}
                          >
                            {'Hello / Selpic'}
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

              {/* Text Color - Black only, compact (Sticker Customization과 동일) */}
              <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex flex-col items-center">
                <label className="text-xs font-semibold text-slate-400 mb-1.5">
                  <Palette className="w-3.5 h-3.5 inline mr-1 align-middle" />
                  Text Color
                </label>
                <div className="flex items-center justify-center gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-lg border-2 flex-shrink-0 transition-all ${
                        selectedColor === color
                          ? 'border-blue-500 ring-2 ring-blue-300'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <span className="text-sm text-slate-400">{getColorName(selectedColor)}</span>
                </div>
              </div>

              {/* Play Game Button */}
              <div>
                <button
                  onClick={() => {
                    // customText를 분석하여 영어/한글 이름 추출
                    const lines = customText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
                    const firstLine = lines[0] || ''
                    const secondLine = lines[1] || ''
                    
                    // 영어 이름 추출: 첫 번째 줄에서 영어 문자만 추출
                    let englishName = firstLine.replace(/[^a-zA-Z\s]/g, '').trim()
                    // 영어가 없고 한글도 없으면 첫 번째 줄 전체를 영어 이름으로 사용
                    if (!englishName && firstLine && !firstLine.match(/[\u3131-\u3163\uac00-\ud7a3]/)) {
                      englishName = firstLine.trim()
                    }
                    
                    // 한글 이름 추출: 두 번째 줄이 있으면 사용, 없으면 첫 번째 줄에서 한글만 추출
                    let koreanName = secondLine
                    if (!koreanName && firstLine) {
                      // 첫 번째 줄에서 한글만 추출
                      koreanName = firstLine.replace(/[^\u3131-\u3163\uac00-\ud7a3\s,]/g, '').trim()
                    }
                    
                    // 이름이 없으면 빈 문자열로 전달 (게임에서 Selpic 기본값 사용)
                    if (!englishName) englishName = ''
                    if (!koreanName) koreanName = ''
                    
                    // 게임 URL 생성 (이름이 있으면 전달, 없으면 빈 문자열)
                    const gameUrl = `/tetris?en=${encodeURIComponent(englishName)}&ko=${encodeURIComponent(koreanName)}`
                    router.push(gameUrl)
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-3"
                >
                  <Gamepad2 className="w-5 h-5" />
                  Play Game
                </button>
              </div>

              {/* Shop More Button */}
              <div>
                <button
                  onClick={() => router.push('/#shop-by-category')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Shopping Now
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
      </div>

      {isOfficialFontGuideLightboxOpen && categoryFilter === 'Stickers' && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-design-official-font-guide-lightbox-heading"
          onClick={() => setIsOfficialFontGuideLightboxOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700 bg-slate-800/90 px-3 py-2">
              <p id="custom-design-official-font-guide-lightbox-heading" className="text-sm font-medium text-slate-200 pr-2">
                Official Australian school fonts (black print)
              </p>
              <button
                type="button"
                onClick={() => setIsOfficialFontGuideLightboxOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-700 hover:text-white shrink-0"
                aria-label="Close enlarged guide"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-2 sm:p-4">
              <NextImage
                src={AU_SCHOOL_FONT_GUIDE_IMAGE}
                alt="Enlarged: official Australian school fonts guide for black-print name labels by state."
                width={1200}
                height={1600}
                className="mx-auto h-auto max-h-[82vh] w-full object-contain"
                sizes="(max-width: 1024px) 96vw, 1024px"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

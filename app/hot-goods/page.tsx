'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useContentStore } from '@/lib/contentStore'
import { Filter, Search, Star, Shield, Award, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import SlidingBackground from '@/components/SlidingBackground'
import SeoProductJsonLd from '@/components/SeoProductJsonLd'

// Market S 상품 타입 정의
interface MarketSProduct {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  category: 'sunscreen' | 'coolpatch' | 'beauty' | 'lifestyle' | 'other'
  subcategory?: string
  size?: string
  brand?: string
  spfLevel?: string // SPF 30, 50, 50+ 등
  type?: string // 타입/용도
  color?: string
  scent?: string // 향 (선스틱용)
  rating: number
  reviews: number
  inStock: boolean
  isNew?: boolean
  isBestSeller?: boolean
  isPopular?: boolean
  isHotGoods: boolean
  features: string[]
  trending?: boolean // 트렌딩 아이템
  stockQuantity?: number
  safetyStock?: number
  incomingStock?: number
}

export default function HotGoodsPage() {
  const { products, addToCart } = useStore()
  const { isLoggedIn } = useUserAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [marketSProducts, setMarketSProducts] = useState<MarketSProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<MarketSProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('price-low')
  const [showFilters, setShowFilters] = useState(false)
  
  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const { 
    getActiveContentBySection, 
    getActiveCategoryHeroSlides, 
    categoryHeroSlides: allCategoryHeroSlides,
    _hasHydrated: contentHydrated,
    categoryItems,
    getActiveCategoryItems
  } = useContentStore()
  
  // 카테고리별 Hero Slide 가져오기
  const categoryHeroSlides = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return []
    }
    return getActiveCategoryHeroSlides('hot-goods')
  }, [allCategoryHeroSlides, getActiveCategoryHeroSlides, isMounted, contentHydrated])
  
  // 카테고리 정보 가져오기
  const categoryInfo = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return {
        title: 'Market S',
        description: 'Korea\'s trending hot items - UV protection, cool patches, and more!',
        emoji: '🔥'
      }
    }
    const activeCategories = getActiveCategoryItems()
    const marketSCategory = activeCategories.find(cat => cat.linkUrl === '/hot-goods' || cat.title === 'Market S')
    return {
      title: marketSCategory ? `${marketSCategory.emoji} ${marketSCategory.title}` : 'Market S',
      description: marketSCategory?.description || 'Korea\'s trending hot items - UV protection, cool patches, and more!',
      emoji: marketSCategory?.emoji || '🔥'
    }
  }, [isMounted, contentHydrated, categoryItems, getActiveCategoryItems])
  
  // 🆕 현재 슬라이드 인덱스 상태 관리
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // 🆕 슬라이드별 텍스트 가져오기 (현재 활성 슬라이드의 텍스트 사용)
  const slideText = React.useMemo(() => {
    if (!isMounted) {
      return {
        title: 'Market S',
        subtitle: 'Korea\'s trending hot items'
      }
    }
    if (categoryHeroSlides && categoryHeroSlides.length > 0) {
      // 🆕 현재 슬라이드 인덱스에 해당하는 슬라이드의 텍스트 사용
      const currentSlide = categoryHeroSlides[currentSlideIndex] || categoryHeroSlides[0]
      return {
        title: currentSlide.title ?? '',
        subtitle: currentSlide.subtitle ?? ''
      }
    }
    return {
      title: categoryInfo.title,
      subtitle: categoryInfo.description
    }
  }, [isMounted, categoryHeroSlides, categoryInfo, currentSlideIndex])

  // 🆕 슬라이드 변경 핸들러
  const handleSlideChange = React.useCallback((index: number) => {
    setCurrentSlideIndex(index)
  }, [])

  // Content Store에서 동적 콘텐츠 가져오기
  const headerContent = getActiveContentBySection('header')
  const hotGoodsContent = getActiveContentBySection('hot-goods')
  const companyName = headerContent.find(item => item.title === 'Company Name')?.content || 'Selpic'
  
  // Market S 페이지 콘텐츠
  const pageTitle = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return 'Market S'
    }
    return hotGoodsContent.find(item => item.title === 'Page Title')?.content || 'Market S'
  }, [isMounted, contentHydrated, hotGoodsContent])
  
  const searchPlaceholder = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return 'Search trending items...'
    }
    return hotGoodsContent.find(item => item.title === 'Search Placeholder')?.content || 'Search trending items...'
  }, [isMounted, contentHydrated, hotGoodsContent])
  
  const filterButton = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return 'Filter'
    }
    return hotGoodsContent.find(item => item.title === 'Filter Button')?.content || 'Filter'
  }, [isMounted, contentHydrated, hotGoodsContent])
  
  const noResultsMessage = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return 'No items found matching your search criteria.'
    }
    return hotGoodsContent.find(item => item.title === 'No Results Message')?.content || 'No items found matching your search criteria.'
  }, [isMounted, contentHydrated, hotGoodsContent])
  
  const noResultsSubmessage = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return 'Try different search terms or filters.'
    }
    return hotGoodsContent.find(item => item.title === 'No Results Submessage')?.content || 'Try different search terms or filters.'
  }, [isMounted, contentHydrated, hotGoodsContent])

  // Market S 상품 데이터 생성
  useEffect(() => {
    const generateMarketSProducts = () => {
      // Market S 노출 조건: isHotGoods가 true이거나 카테고리가 HotGoods인 상품
      // 재고가 0인 상품도 표시 (Sold Out으로 표시됨)
      const baseProducts = products.filter(product => {
        const matchesCategory = product.isHotGoods === true || product.category === 'HotGoods'
        return matchesCategory
      })
      
      // 디버깅: 필터링된 상품 확인
      console.log('🔍 Market S - Total products:', products.length)
      console.log('🔍 Market S - Products with isHotGoods or category HotGoods:', baseProducts.length)
      console.log('🔍 Market S - All products details:', products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        isHotGoods: p.isHotGoods,
        inStock: p.inStock
      })))
      console.log('🔍 Market S - Filtered products:', baseProducts.map(p => ({
        id: p.id,
        name: p.name,
        isHotGoods: p.isHotGoods,
        category: p.category
      })))
      
      // 실제 등록된 상품만 사용 (샘플 데이터 제거)
      const allMarketS = baseProducts.map(product => {
        // stockQuantity가 있으면 그것을 기준으로 inStock 계산, 없으면 원본 inStock 사용
        const stockQty = typeof (product as any).stockQuantity === 'number' 
          ? Math.max(0, (product as any).stockQuantity) 
          : undefined
        const calculatedInStock = stockQty !== undefined 
          ? stockQty > 0 
          : product.inStock
        
        // 원본 상품의 정보를 최대한 유지하면서 MarketSProduct 타입으로 변환
        const marketSProduct: MarketSProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          category: 'other', // 기본값, 필요시 상품 정보에서 매핑 가능
          subcategory: product.subcategory,
          size: (product as any).size,
          brand: (product as any).brand,
          rating: (product as any).rating || 4.5, // 원본 상품의 rating이 있으면 사용
          reviews: (product as any).reviews || 0, // 원본 상품의 reviews가 있으면 사용
          inStock: calculatedInStock, // stockQuantity 기반으로 재계산
          isNew: (product as any).isNew || false,
          isBestSeller: (product as any).isBestSeller || false,
          isPopular: (product as any).isPopular || false,
          isHotGoods: product.isHotGoods || true,
          features: (product as any).features || ['Hot Item'],
          trending: (product as any).trending || false,
          // 추가 필드들도 원본에서 가져오기
          type: (product as any).type,
          color: (product as any).color,
          scent: (product as any).scent,
          spfLevel: (product as any).spfLevel,
          stockQuantity: stockQty,
          safetyStock: (product as any).safetyStock,
          incomingStock: (product as any).incomingStock
        }
        return marketSProduct
      })

      setMarketSProducts(allMarketS)
      setFilteredProducts(allMarketS)
    }

    generateMarketSProducts()
  }, [products])

  const hasMarketSProducts = marketSProducts.length > 0

  const typingText = 'MARKET S: COMING SOON'
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (hasMarketSProducts) return
    let i = 0
    setTyped('')
    const t = window.setInterval(() => {
      i += 1
      setTyped(typingText.slice(0, i))
      if (i >= typingText.length) {
        window.clearInterval(t)
      }
    }, 55)
    return () => window.clearInterval(t)
  }, [hasMarketSProducts, typingText])

  // 실제 등록된 상품의 카테고리 목록 동적 생성
  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>()
    marketSProducts.forEach(product => {
      if (product.category) {
        categories.add(product.category)
      }
    })
    return Array.from(categories).sort()
  }, [marketSProducts])

  // 실제 등록된 상품의 서브카테고리 목록 동적 생성
  const availableSubcategories = React.useMemo(() => {
    const subcategories = new Set<string>()
    marketSProducts.forEach(product => {
      if (product.subcategory) {
        subcategories.add(product.subcategory)
      }
    })
    return Array.from(subcategories).sort()
  }, [marketSProducts])

  // 서브카테고리 아이콘 및 라벨 매핑 (Add New Market S 페이지와 동일한 형식)
  const getSubcategoryIcon = (subcategory: string) => {
    const icons: Record<string, string> = {
      'Sunscreen': '☀️',
      'Sunstick': '🧴',
      'Cool Patch': '❄️',
      'Lifestyle': '🌟',
      'Other': '🔥'
    }
    return icons[subcategory] || '📦'
  }

  // 서브카테고리 라벨 매핑 (Add New Market S 페이지와 동일한 형식)
  const getSubcategoryLabel = (subcategory: string) => {
    // Add New Market S 페이지와 동일한 형식으로 표시
    return subcategory
  }

  // 필터링 및 검색 로직
  useEffect(() => {
    // 재고가 0인 상품도 표시 (Sold Out으로 표시됨)
    let filtered = [...marketSProducts]

    // 검색어 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.features && product.features.some(feature => feature.toLowerCase().includes(searchTerm.toLowerCase())))
      )
    }

    // 카테고리 및 서브카테고리 필터링 (통합)
    if (selectedCategory !== 'all') {
      // 카테고리와 서브카테고리가 함께 선택된 경우 (예: "other-Sunscreen")
      if (selectedCategory.includes('-')) {
        const [category, subcategory] = selectedCategory.split('-')
        filtered = filtered.filter(product => 
          product.category === category && product.subcategory === subcategory
        )
      } else {
        // 카테고리만 선택된 경우
        filtered = filtered.filter(product => product.category === selectedCategory)
      }
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'rating':
          return b.rating - a.rating
        case 'newest':
          // isNew가 true인 상품 우선, 그 다음 최신순
          if (a.isNew && !b.isNew) return -1
          if (!a.isNew && b.isNew) return 1
          return 0
        case 'trending':
        default:
          // 트렌딩 아이템 우선, 그 다음 평점
          if (a.trending && !b.trending) return -1
          if (!a.trending && b.trending) return 1
          return b.rating - a.rating
      }
    })

    setFilteredProducts(filtered)
  }, [marketSProducts, searchTerm, selectedCategory, sortBy])

  const handleAddToCart = (product: MarketSProduct) => {
    const cartItem = {
      product: product,
      quantity: 1,
      customizations: {}
    }
    
    console.log('🛒 Market S cartItem to add:', cartItem)
    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      alert('Item added to cart!')
    } else {
      alert('Failed to add item to cart')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      sunscreen: 'UV Protection',
      coolpatch: 'Cool Patch',
      beauty: 'Beauty',
      lifestyle: 'Lifestyle',
      other: 'Other',
      HotGoods: 'Market S',
      Stickers: 'Stickers',
      Stamps: 'Stamps',
      PhoneCases: 'Phone Cases'
    }
    // 카테고리 이름을 그대로 표시하거나, 매핑된 라벨 반환
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      sunscreen: '☀️',
      coolpatch: '❄️',
      beauty: '✨',
      lifestyle: '🌟',
      other: '🔥',
      HotGoods: '🔥',
      Stickers: '🎨',
      Stamps: '✍️',
      PhoneCases: '📱'
    }
    return icons[category] || '🔥'
  }

  if (!hasMarketSProducts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
        <Header />

        <section className="relative py-16 sm:py-20 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(112,0,255,0.12),transparent_60%)]" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="mt-6 text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-fuchsia-600">
                {typed}
              </span>
              <span className="inline-block w-[0.6ch] align-baseline animate-pulse text-slate-500" aria-hidden>
                |
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600">
              We’re curating only the hottest items—coming soon.
            </p>

            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-xl rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg ring-1 ring-slate-200/80 p-6 sm:p-7 text-left">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Tell us what you want to see on MARKET S
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Share your idea and we’ll curate better picks based on your feedback.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact?from=hot-goods&type=market_s"
                    className="w-full sm:w-auto btn-ux btn-ux-solid-purple"
                  >
                    Submit an idea
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skeleton Grid (6) */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
                  <div className="h-48 bg-slate-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
                      <div className="h-10 w-28 bg-slate-100 rounded-xl animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SeoProductJsonLd
        pageName="Market S"
        pagePath="/hot-goods"
        products={filteredProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          image: p.image,
          price: p.price,
          category: p.subcategory || p.category,
          brand: p.brand,
          inStock: p.inStock,
          rating: p.rating,
          reviews: p.reviews
        }))}
      />

      {/* Hero Section with Sliding Background — 반응형: 모바일 짧게, 데스크톱에서 더 크게 */}
      <div className="relative min-h-[273px] sm:min-h-[315px] lg:min-h-[357px] flex items-center justify-center overflow-hidden">
        <SlidingBackground 
          slides={categoryHeroSlides} 
          onSlideChange={handleSlideChange}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">{slideText.title}</h1>
          <p className="text-xl text-white drop-shadow-md">{slideText.subtitle}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
              <p className="text-gray-600">Korea's trending hot items - UV protection, cool patches, beauty essentials, and lifestyle products</p>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            {/* 검색바 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            {/* 필터 토글 버튼 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5 mr-2" />
              {filterButton}
            </button>
          </div>

          {/* 필터 옵션들 */}
          {showFilters && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 카테고리 필터 - 서브카테고리 포함 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="all">All Categories</option>
                    {/* 서브카테고리 옵션 - All Categories 아래에 표시 */}
                    <option value="other-Sunscreen">☀️ Sunscreen</option>
                    <option value="other-Sunstick">🧴 Sunstick</option>
                    <option value="other-Cool Patch">❄️ Cool Patch</option>
                    <option value="other-Lifestyle">🌟 Lifestyle</option>
                    <option value="other-Other">🔥 Other</option>
                    {/* 카테고리 옵션 - other 제외 (서브카테고리 옵션과 중복 방지) */}
                    {availableCategories.filter(category => category !== 'other').map(category => (
                      <option key={category} value={category}>
                        {getCategoryIcon(category)} {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 정렬 - 간소화된 옵션 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="trending">🔥 Trending</option>
                    <option value="newest">✨ Newest</option>
                    <option value="rating">⭐ Highest Rating</option>
                    <option value="price-low">💰 Price: Low to High</option>
                    <option value="price-high">💰 Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 상품 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockQty =
              typeof product.stockQuantity === 'number' ? Math.max(0, product.stockQuantity) : undefined
            const safety = typeof product.safetyStock === 'number' ? Math.max(0, product.safetyStock) : undefined
            const incoming = typeof product.incomingStock === 'number' ? Math.max(0, product.incomingStock) : undefined
            const lowStockThreshold = Math.max(safety ?? 0, 5)
            // 재고가 0이면 자동으로 품절 처리
            const isOutOfStock = typeof stockQty === 'number' ? stockQty === 0 : !product.inStock
            const isLowStock = stockQty !== undefined && stockQty > 0 && stockQty <= lowStockThreshold && product.inStock
            return (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* 상품 이미지 */}
              <div className="relative">
                {(product as any).hasDetailPage !== false ? (
                  <Link href={`/products/${product.id}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </Link>
                ) : (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                {/* 배지 */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.trending && (
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      TRENDING
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">NEW ARRIVAL</span>
                  )}
                  {product.isBestSeller && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">BEST SELLER</span>
                  )}
                  {product.isPopular && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">POPULAR</span>
                  )}
                  {isOutOfStock && (
                    <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">Out of Stock</span>
                  )}
                  {isLowStock && product.inStock && typeof stockQty === 'number' && (
                    <span className="bg-white/90 text-red-600 text-xs px-2 py-1 rounded-full border border-red-100">
                      Only {stockQty} left
                    </span>
                  )}
                </div>
              </div>

              {/* 상품 정보 */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>

                {/* 상품 특성 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {/* 서브카테고리가 있으면 서브카테고리 표시, 없으면 카테고리 표시 */}
                  {product.subcategory ? (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      {getSubcategoryIcon(product.subcategory)} {product.subcategory}
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                      {getCategoryLabel(product.category)}
                    </span>
                  )}
                  {product.brand && (
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded">
                      🏷️ {product.brand}
                    </span>
                  )}
                  {product.size && (
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                      📏 {product.size}
                    </span>
                  )}
                  {product.color && (
                    <span className="bg-pink-100 text-pink-700 text-xs px-2 py-1 rounded">
                      🎨 {product.color}
                    </span>
                  )}
                  {product.spfLevel && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      {product.spfLevel}
                    </span>
                  )}
                  {product.type && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {product.type}
                    </span>
                  )}
                  {product.scent && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      {product.scent}
                    </span>
                  )}
                </div>

                {/* 평점 */}
                <div className="flex items-center mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.floor(product.rating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    {product.rating} ({product.reviews} reviews)
                  </span>
                </div>

                {/* 가격 및 주문 버튼 */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm text-gray-500 line-through ml-2">
                          ${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {isLowStock && typeof stockQty === 'number' && (
                      <div className="text-xs text-red-600 font-medium">
                        Only {stockQty} left
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock}
                    className={`px-4 py-2 text-sm ${
                      isOutOfStock
                        ? 'rounded-xl bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'btn-ux btn-ux-cart'
                    }`}
                  >
                    {isOutOfStock ? 'Out of Stock' : 'Cart'}
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">{noResultsMessage}</p>
            <p className="text-gray-400 text-sm mt-2">{noResultsSubmessage}</p>
          </div>
        )}
      </div>
    </div>
  )
}


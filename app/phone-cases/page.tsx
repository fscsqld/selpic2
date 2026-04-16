'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useContentStore } from '@/lib/contentStore'
import { Star, Filter, Search, CheckCircle, Award, Clock } from 'lucide-react'
import Header from '@/components/Header'
import SlidingBackground from '@/components/SlidingBackground'
import SeoProductJsonLd from '@/components/SeoProductJsonLd'
import Link from 'next/link'
import { getCustomizationPath, isCustomizationRequired } from '@/lib/productCustomization'

// 폰케이스 타입 정의
interface PhoneCaseProduct {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  category: string
  brand: 'Samsung' | 'iPhone'
  model: string
  material: 'silicone' | 'tpu' | 'leather' | 'carbon' | 'wood'
  color: string
  rating: number
  reviews: number
  inStock: boolean
  isNew?: boolean
  isBestSeller?: boolean
  features: string[]
  hasDetailPage?: boolean
}

export default function PhoneCasesPage() {
  const router = useRouter()
  const { products, addToCart } = useStore()
  const { isLoggedIn } = useUserAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [phoneCaseProducts, setPhoneCaseProducts] = useState<PhoneCaseProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<PhoneCaseProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all')
  const [selectedColor, setSelectedColor] = useState<string>('all')
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [showFilters, setShowFilters] = useState(false)
  
  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 카테고리별 Hero Slide 가져오기 (store 변경 감지)
  const { 
    categoryHeroSlides: allCategoryHeroSlides,
    _hasHydrated: contentHydrated,
    categoryItems,
    getActiveCategoryItems,
    getActiveCategoryHeroSlides
  } = useContentStore()
  
  const categoryHeroSlides = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return []
    }
    return getActiveCategoryHeroSlides('phone-cases')
  }, [allCategoryHeroSlides, getActiveCategoryHeroSlides, isMounted, contentHydrated])
  
  // 카테고리 정보 가져오기 (제목, 설명 등)
  const categoryInfo = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return {
        title: '📱 Phone Cases',
        description: 'Protect your device with style and personality',
        emoji: '📱'
      }
    }
    const activeCategories = getActiveCategoryItems()
    const phoneCasesCategory = activeCategories.find(cat => cat.linkUrl === '/phone-cases' || cat.title === 'Phone Cases')
    return {
      title: phoneCasesCategory ? `${phoneCasesCategory.emoji} ${phoneCasesCategory.title}` : '📱 Phone Cases',
      description: phoneCasesCategory?.description || 'Protect your device with style and personality',
      emoji: phoneCasesCategory?.emoji || '📱'
    }
  }, [isMounted, contentHydrated, categoryItems, getActiveCategoryItems])
  
  // 🆕 현재 슬라이드 인덱스 상태 관리
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // 🆕 슬라이드별 텍스트 가져오기 (현재 활성 슬라이드의 텍스트 사용)
  const slideText = React.useMemo(() => {
    if (!isMounted) {
      return {
        title: '📱 Phone Cases',
        subtitle: 'Protect your device with style and personality'
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
  
  // 디버깅: categoryHeroSlides 변경 감지
  useEffect(() => {
    console.log('🔄 Phone Cases page - categoryHeroSlides changed:', {
      count: categoryHeroSlides.length,
      slides: categoryHeroSlides.map(s => ({
        id: s.id,
        title: s.title || '(empty)',
        subtitle: s.subtitle || '(empty)',
        src: s.src?.substring(0, 50) + '...',
        speed: s.speed,
        direction: s.direction,
        opacity: s.opacity
      }))
    })
    console.log('📝 Phone Cases page - slideText:', slideText)
    console.log('📋 Phone Cases page - categoryInfo:', categoryInfo)
  }, [categoryHeroSlides, slideText, categoryInfo])

  // 폰케이스 상품 데이터 생성
  useEffect(() => {
    const generatePhoneCaseProducts = () => {
      // 관리자가 등록한 PhoneCases 카테고리 상품만 필터링
      const baseProducts = products.filter(product => product.category === 'PhoneCases')
      
      // 관리자가 등록한 상품을 PhoneCaseProduct 형식으로 변환
      const allPhoneCases: PhoneCaseProduct[] = baseProducts.map(product => {
        const brand = (product as any).brand || (product as any).subcategory || 'Samsung'
        const model = (product as any).model || ''
        const material = (product as any).material || 'silicone'
        const color = (product as any).color || 'Black'
        const rating = product.rating || 4.5
        const reviews = product.reviews || 0
        const features = (product as any).features || []
        const hasDetailPage = (product as any).hasDetailPage !== false
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          category: product.category,
          brand: (brand === 'iPhone' || brand === 'Samsung') ? brand : 'Samsung' as const,
          model: model,
          material: (['silicone', 'tpu', 'leather', 'carbon', 'wood'].includes(material.toLowerCase())) 
            ? material.toLowerCase() as 'silicone' | 'tpu' | 'leather' | 'carbon' | 'wood'
            : 'silicone' as const,
          color: color,
          rating: rating,
          reviews: reviews,
          inStock: product.inStock,
          isNew: product.isNew || false,
          isBestSeller: product.isBestSeller || false,
          features: Array.isArray(features) ? features : [],
          hasDetailPage: hasDetailPage
        }
      })

      setPhoneCaseProducts(allPhoneCases)
      setFilteredProducts(allPhoneCases)
    }

    generatePhoneCaseProducts()
  }, [products])

  // 필터링 및 검색 로직
  useEffect(() => {
    let filtered = phoneCaseProducts

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.features.some(feature => feature.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 브랜드 필터링
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(product => product.brand === selectedBrand)
    }

    // 재질 필터링
    if (selectedMaterial !== 'all') {
      filtered = filtered.filter(product => product.material === selectedMaterial)
    }

    // 색상 필터링
    if (selectedColor !== 'all') {
      filtered = filtered.filter(product => product.color.toLowerCase() === selectedColor.toLowerCase())
    }

    // 모델 필터링
    if (selectedModel !== 'all') {
      filtered = filtered.filter(product => product.model.toLowerCase() === selectedModel.toLowerCase())
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
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    setFilteredProducts(filtered)
  }, [phoneCaseProducts, searchTerm, selectedBrand, selectedMaterial, selectedColor, selectedModel, sortBy])

  const handleAddToCart = (product: PhoneCaseProduct) => {
    const sourceProduct = products.find((p) => p.id === product.id)
    if (sourceProduct && isCustomizationRequired(sourceProduct)) {
      router.push(getCustomizationPath(sourceProduct))
      return
    }
    // ✅ Fix: Use correct CartItem interface structure
    const cartItem = {
      product: product,        // Product object with all properties
      quantity: 1,
      customizations: {}       // Empty customizations for phone cases
    }
    
    console.log('🛒 Phone case cartItem to add:', cartItem)
    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      alert('Phone case added to cart!')
    } else {
      alert('Failed to add phone case to cart')
    }
  }

  const getMaterialLabel = (material: string) => {
    const labels = {
      silicone: '실리콘',
      tpu: 'TPU',
      leather: '가죽',
      carbon: '카본',
      wood: '우드'
    }
    return labels[material as keyof typeof labels] || material
  }

  const getBrandColor = (brand: string) => {
    return brand === 'Samsung' ? 'text-blue-600' : 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SeoProductJsonLd
        pageName="Phone Cases"
        pagePath="/phone-cases"
        products={filteredProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          image: p.image,
          price: p.price,
          category: p.category,
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
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📱 Phone Cases</h2>
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
                placeholder="Search phone cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            {/* 필터 토글 버튼 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filter
            </button>
          </div>

          {/* 필터 옵션들 */}
          {showFilters && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* 브랜드 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All</option>
                  <option value="Samsung">Samsung</option>
                  <option value="iPhone">iPhone</option>
                </select>
              </div>

              {/* 모델 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All</option>
                  <optgroup label="Apple">
                    <option value="iPhone 17 Pro Max">iPhone 17 Pro Max</option>
                    <option value="iPhone 17 Pro">iPhone 17 Pro</option>
                    <option value="iPhone 16 Pro Max">iPhone 16 Pro Max</option>
                    <option value="iPhone 16 Pro">iPhone 16 Pro</option>
                    <option value="iPhone 15 Pro Max">iPhone 15 Pro Max</option>
                    <option value="iPhone 14 Pro">iPhone 14 Pro</option>
                    <option value="iPhone 13">iPhone 13</option>
                  </optgroup>
                  <optgroup label="Samsung">
                    <option value="Galaxy S25 Ultra">Galaxy S25 Ultra</option>
                    <option value="Galaxy S25">Galaxy S25</option>
                    <option value="Galaxy S25+">Galaxy S25+</option>
                    <option value="Galaxy Z Flip7">Galaxy Z Flip7</option>
                    <option value="Galaxy Z Fold7">Galaxy Z Fold7</option>
                    <option value="Galaxy S24 Ultra">Galaxy S24 Ultra</option>
                    <option value="Galaxy S23">Galaxy S23</option>
                    <option value="Galaxy Z Fold5">Galaxy Z Fold5</option>
                  </optgroup>
                </select>
              </div>

              {/* 재질 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                <select
                  value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All</option>
                  <option value="silicone">Silicone</option>
                  <option value="tpu">TPU, PC</option>
                  <option value="leather">Leather</option>
                </select>
              </div>

              {/* 색상 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="all">All</option>
                  <option value="black">Black</option>
                  <option value="clear">Clear</option>
                  <option value="brown">Brown</option>
                  <option value="carbon">Carbon</option>
                  <option value="walnut">Walnut</option>
                  <option value="blue">Blue</option>
                </select>
              </div>

              {/* 정렬 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="name">Name</option>
                  <option value="price-low">Price Low to High</option>
                  <option value="price-high">Price High to Low</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* 상품 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* 상품 이미지 */}
              <div className="relative">
                {product.hasDetailPage !== false ? (
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
                  {product.isNew && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>
                  )}
                  {product.isBestSeller && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">BEST</span>
                  )}
                  {!product.inStock && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">품절</span>
                  )}
                </div>
                {/* 브랜드 배지 */}
                <div className="absolute top-2 right-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-white/90 ${getBrandColor(product.brand)}`}>
                    {product.brand}
                  </span>
                </div>
              </div>

              {/* 상품 정보 */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                
                {/* 모델 정보 */}
                <div className="text-sm text-gray-500 mb-3">
                  {product.model} • {getMaterialLabel(product.material)} • {product.color}
                </div>
                
                {/* 상품 특성 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.features.slice(0, 2).map((feature, index) => (
                    <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      {feature}
                    </span>
                  ))}
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
                    {product.rating} ({product.reviews}개 리뷰)
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
                  </div>
                  {(() => {
                    const sourceProduct = products.find((p) => p.id === product.id)
                    const requiresCustomization = !!sourceProduct && isCustomizationRequired(sourceProduct)
                    if (requiresCustomization) {
                      return (
                        <Link
                          href={getCustomizationPath(sourceProduct)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            product.inStock
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
                          }`}
                        >
                          {product.inStock ? 'Customize' : 'Out of Stock'}
                        </Link>
                      )
                    }
                    return (
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.inStock}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          product.inStock
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {product.inStock ? 'Cart' : 'Out of Stock'}
                      </button>
                    )
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">No phone cases found matching your search criteria.</p>
            <p className="text-gray-400 text-sm mt-2">Try different search terms or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

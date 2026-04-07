'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useContentStore } from '@/lib/contentStore'
import { Filter, Search, Star, Clock, Shield, Award, Palette } from 'lucide-react'
import Header from '@/components/Header'
import SlidingBackground from '@/components/SlidingBackground'
import SeoProductJsonLd from '@/components/SeoProductJsonLd'
import Link from 'next/link'

const StampProductImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [actualSrc, setActualSrc] = useState<string>(src)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!src || src.trim() === '' || src === 'undefined') {
      setActualSrc('')
      setImageError(true)
      return
    }
    if (src.startsWith('indexeddb://')) {
      setActualSrc('')
      setImageError(true)
      return
    }
    setActualSrc(src)
    setImageError(false)
  }, [src])

  if (imageError || !actualSrc) {
    return (
      <div className={`w-full h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 ${className || ''}`}>
        <span className="text-xs text-gray-500">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={actualSrc}
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  )
}

// 스템프 타입 정의
interface StampProduct {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  category: string
  size: 'small' | 'medium' | 'large' | 'custom'
  material: 'rubber' | 'wood' | 'metal' | 'acrylic'
  usage: 'personal' | 'office' | 'commercial' | 'craft'
  rating: number
  reviews: number
  inStock: boolean
  isNew?: boolean
  isBestSeller?: boolean
  features: string[]
}

export default function StampPage() {
  const router = useRouter()
  const { products, addToCart } = useStore()
  const { isLoggedIn } = useUserAuth()
  const [isMounted, setIsMounted] = useState(false)
  const {
    getActiveCategoryHeroSlides,
    categoryHeroSlides: allCategoryHeroSlides,
    _hasHydrated: contentHydrated,
    categoryItems,
    getActiveCategoryItems
  } = useContentStore()
  const [stampProducts, setStampProducts] = useState<StampProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<StampProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSize, setSelectedSize] = useState<string>('all')
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all')
  const [selectedUsage, setSelectedUsage] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [showFilters, setShowFilters] = useState(false)
  
  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // content-store-updated 이벤트 리스너 추가 (같은 탭에서 변경 감지)
  useEffect(() => {
    const handleContentStoreUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.type === 'categoryHeroSlides') {
        console.log('🔄 Stamp page: content-store-updated 이벤트 감지, categoryHeroSlides 새로고침')
        try {
          const raw = customEvent.detail?.data?.state?.categoryHeroSlides as unknown
          if (Array.isArray(raw)) {
            const categoryHeroSlides = raw.map((slide: any) => ({
              ...slide,
              createdAt: typeof slide.createdAt === 'string' ? new Date(slide.createdAt) : slide.createdAt,
              updatedAt: typeof slide.updatedAt === 'string' ? new Date(slide.updatedAt) : slide.updatedAt
            }))
            useContentStore.setState({ categoryHeroSlides })
            console.log('✅ Stamp page: categoryHeroSlides 상태 업데이트 완료', categoryHeroSlides.length, '개')
          }
        } catch (error) {
          console.error('❌ Stamp page: categoryHeroSlides 업데이트 실패:', error)
        }
      }
    }

    window.addEventListener('content-store-updated', handleContentStoreUpdate)
    return () => {
      window.removeEventListener('content-store-updated', handleContentStoreUpdate)
    }
  }, [])
  
  // 카테고리 정보 가져오기 (제목, 설명 등)
  const categoryInfo = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return {
        title: '📮 Stamps',
        description: 'Professional quality stamps for every occasion',
        emoji: '📮'
      }
    }
    const activeCategories = getActiveCategoryItems()
    const stampsCategory = activeCategories.find(cat => cat.linkUrl === '/stamp' || cat.title === 'Stamps')
    return {
      title: stampsCategory ? `${stampsCategory.emoji} ${stampsCategory.title}` : '📮 Stamps',
      description: stampsCategory?.description || 'Professional quality stamps for every occasion',
      emoji: stampsCategory?.emoji || '📮'
    }
  }, [isMounted, contentHydrated, categoryItems, getActiveCategoryItems])
  
  // 카테고리별 Hero Slide 가져오기 (store 변경 감지)
  const categoryHeroSlides = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      console.log('⏳ Stamp page - isMounted:', isMounted, 'contentHydrated:', contentHydrated)
      return []
    }
    
    // allCategoryHeroSlides가 없거나 비어있으면 빈 배열 반환
    if (!allCategoryHeroSlides || !Array.isArray(allCategoryHeroSlides) || allCategoryHeroSlides.length === 0) {
      console.log('⚠️ Stamp page - allCategoryHeroSlides가 비어있습니다.')
      return []
    }
    
    // allCategoryHeroSlides에서 stamps 카테고리만 필터링
    const stampsSlides = allCategoryHeroSlides.filter(slide => {
      const matches = slide &&
        slide.category === 'stamps' &&
        slide.isActive === true
      if (!matches && slide) {
        console.log('🔍 Filtered out slide:', {
          id: slide.id,
          category: slide.category,
          isActive: slide.isActive,
          expectedCategory: 'stamps'
        })
      }
      return matches
    })
    
    // order로 정렬
    const sortedSlides = stampsSlides.sort((a, b) => (a.order || 0) - (b.order || 0))
    
    console.log('📮 Stamp page - CategoryHeroSlides:', {
      contentHydrated,
      allCategoryHeroSlidesCount: allCategoryHeroSlides.length,
      allCategoryHeroSlides: allCategoryHeroSlides.map(s => ({
        id: s.id,
        category: s.category,
        isActive: s.isActive
      })),
      stampsSlidesCount: sortedSlides.length,
      stampsSlides: sortedSlides.map(s => ({
        id: s.id,
        category: s.category,
        isActive: s.isActive,
        order: s.order,
        src: s.src?.substring(0, 50) + '...',
        title: s.title || '(empty)',
        subtitle: s.subtitle || '(empty)'
      }))
    })
    
    return sortedSlides
  }, [allCategoryHeroSlides, contentHydrated, isMounted])
  
  // 🆕 현재 슬라이드 인덱스 상태 관리
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // 🆕 슬라이드별 텍스트 가져오기 (현재 활성 슬라이드의 텍스트 사용)
  const slideText = React.useMemo(() => {
    if (!isMounted) {
      return {
        title: '📮 Stamps',
        subtitle: 'Professional quality stamps for every occasion'
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
    console.log('🔄 Stamp page - categoryHeroSlides changed:', {
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
    console.log('📝 Stamp page - slideText:', slideText)
    console.log('📋 Stamp page - categoryInfo:', categoryInfo)
  }, [categoryHeroSlides, slideText, categoryInfo])

  // 스템프 상품 데이터 생성 (관리자가 등록한 상품만 사용)
  useEffect(() => {
    const generateStampProducts = () => {
      // 관리자가 등록한 Stamps 카테고리 상품만 필터링
      const baseProducts = products.filter(product => product.category === 'Stamps')
      
      // 관리자가 등록한 상품을 StampProduct 형식으로 변환
      const allStamps: StampProduct[] = baseProducts.map(product => {
        const size = (product as any).size || 'medium'
        const material = (product as any).material || 'rubber'
        const usage = (product as any).usage || 'personal'
        const rating = product.rating || 4.5
        const reviews = product.reviews || 0
        const features = (product as any).features || []
        
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image,
          category: product.category,
          size: (['small', 'medium', 'large', 'custom'].includes(size.toLowerCase())) 
            ? size.toLowerCase() as 'small' | 'medium' | 'large' | 'custom'
            : 'medium' as const,
          material: (['rubber', 'wood', 'metal', 'acrylic'].includes(material.toLowerCase())) 
            ? material.toLowerCase() as 'rubber' | 'wood' | 'metal' | 'acrylic'
            : 'rubber' as const,
          usage: (['personal', 'office', 'commercial', 'craft'].includes(usage.toLowerCase())) 
            ? usage.toLowerCase() as 'personal' | 'office' | 'commercial' | 'craft'
            : 'personal' as const,
          rating: rating,
          reviews: reviews,
          inStock: product.inStock,
          isNew: product.isNew || false,
          isBestSeller: product.isBestSeller || false,
          features: Array.isArray(features) ? features : []
        }
      })

      setStampProducts(allStamps)
      setFilteredProducts(allStamps)
    }

    generateStampProducts()
  }, [products])

  // 필터링 및 검색 로직
  useEffect(() => {
    let filtered = stampProducts

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.features.some(feature => feature.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // 크기 필터링
    if (selectedSize !== 'all') {
      filtered = filtered.filter(product => product.size === selectedSize)
    }

    // 재질 필터링
    if (selectedMaterial !== 'all') {
      filtered = filtered.filter(product => product.material === selectedMaterial)
    }

    // 용도 필터링
    if (selectedUsage !== 'all') {
      filtered = filtered.filter(product => product.usage === selectedUsage)
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
  }, [stampProducts, searchTerm, selectedSize, selectedMaterial, selectedUsage, sortBy])

  const handleAddToCart = (product: StampProduct) => {
    // ✅ Fix: Use correct CartItem interface structure
    const cartItem = {
      product: product,        // Product object with all properties
      quantity: 1,
      customizations: {}       // Empty customizations for stamps
    }
    
    console.log('🛒 Stamp cartItem to add:', cartItem)
    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      alert('Stamp added to cart!')
    } else {
      alert('Failed to add stamp to cart')
    }
  }

  const handleCustomize = (product: StampProduct) => {
    // 스템프 전용 커스터마이징 페이지로 이동
    router.push(`/stamp/customize?product=${product.id}`)
  }

  const getSizeLabel = (size: string) => {
    const labels = {
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      custom: 'Custom'
    }
    return labels[size as keyof typeof labels] || size
  }

  const getMaterialLabel = (material: string) => {
    const labels = {
      rubber: 'Rubber',
      wood: 'Wood',
      metal: 'Metal',
      acrylic: 'Acrylic'
    }
    return labels[material as keyof typeof labels] || material
  }

  const getUsageLabel = (usage: string) => {
    const labels = {
      personal: 'Personal',
      office: 'Office',
      commercial: 'Commercial',
      craft: 'Craft'
    }
    return labels[usage as keyof typeof labels] || usage
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SeoProductJsonLd
        pageName="Stamps"
        pagePath="/stamp"
        products={filteredProducts.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          image: p.image,
          price: p.price,
          category: p.category,
          brand: (p as any).brand,
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">📮 Stamps</h1>
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
                placeholder="Search stamps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 크기 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* 재질 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="rubber">Rubber</option>
                    <option value="wood">Wood</option>
                    <option value="metal">Metal</option>
                    <option value="acrylic">Acrylic</option>
                  </select>
                </div>

                {/* 용도 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Usage</label>
                  <select
                    value={selectedUsage}
                    onChange={(e) => setSelectedUsage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="personal">Personal</option>
                    <option value="office">Office</option>
                    <option value="commercial">Commercial</option>
                    <option value="craft">Craft</option>
                  </select>
                </div>

                {/* 정렬 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                {(product as any).hasDetailPage !== false ? (
                  <Link href={`/products/${product.id}`}>
                    <StampProductImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </Link>
                ) : (
                  <StampProductImage
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
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Out of Stock</span>
                  )}
                </div>
              </div>

              {/* 상품 정보 */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                
                {/* 상품 특성 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {getSizeLabel(product.size)}
                  </span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {getMaterialLabel(product.material)}
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    {getUsageLabel(product.usage)}
                  </span>
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
                <div className="space-y-3">
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
                  </div>
                  
                  {/* 버튼 그룹 */}
                  <div className="flex gap-2">
                    {/* 원본 product에서 customizationOptions 확인 */}
                    {(() => {
                      const originalProduct = products.find(p => p.id === product.id)
                      const hasCustomizationOptions = originalProduct?.customizationOptions && originalProduct.customizationOptions.length > 0
                      
                      if (hasCustomizationOptions) {
                        // 커스터마이징이 필요한 스탬프: Customize 버튼만
                        return (
                          <button
                            onClick={() => handleCustomize(product)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
                          >
                            <Palette className="w-4 h-4" />
                            Customize
                          </button>
                        )
                      } else {
                        // 일반 스탬프 상품: Cart 버튼만
                        return (
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!product.inStock}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              product.inStock
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {product.inStock ? 'Cart' : 'Out of Stock'}
                          </button>
                        )
                      }
                    })()}
                  </div>
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
            <p className="text-gray-500 text-lg">No stamps found matching your search criteria.</p>
            <p className="text-gray-400 text-sm mt-2">Try different search terms or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import React, { useState, useEffect } from 'react'
import { Search, Filter, Grid, List, ArrowRight } from 'lucide-react'
import { useStore, Product } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import ProductCard from '@/components/ProductCard'
import CustomizationModal from '@/components/CustomizationModal'
import Header from '@/components/Header'
import SlidingBackground from '@/components/SlidingBackground'
import SeoProductJsonLd from '@/components/SeoProductJsonLd'
import Link from 'next/link'

// Subcategory Image Component (indexeddb:// 지원)
const SubcategoryImageDisplay = ({ src, emoji, alt }: { src: string, emoji?: string, alt: string }) => {
  const [actualSrc, setActualSrc] = useState<string>(src)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      if (src && src.startsWith('indexeddb://')) {
        const fileId = src.replace('indexeddb://', '')
        try {
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (fileUrl) {
            setActualSrc(fileUrl)
          } else {
            setImageError(true)
          }
        } catch (error) {
          console.error('Failed to load subcategory image from IndexedDB:', error)
          setImageError(true)
        }
      } else if (src) {
        setActualSrc(src)
      }
    }
    
    loadFromIndexedDB()
  }, [src])
  
  if (imageError || !actualSrc) {
    return <div className="text-4xl">{emoji || '📝'}</div>
  }
  
  return (
    <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
      <img 
        src={actualSrc} 
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  )
}

export default function StickersPage() {
  const { products, _hasHydrated, refreshProducts } = useStore()
  const [isMounted, setIsMounted] = useState(false)
  const { 
    categoryHeroSlides: allCategoryHeroSlides, 
    _hasHydrated: contentHydrated, 
    getActiveCategoryHeroSlides,
    categoryItems,
    getActiveCategoryItems,
    subcategoryItems
  } = useContentStore()
  
  // 클라이언트에서만 마운트 확인
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 🆕 상품 업데이트 감지 (Edit Product에서 이미지 변경 시 즉시 반영)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleProductsUpdate = () => {
      console.log('🔄 [StickersPage] Products updated, refreshing...')
      // Zustand store 강제 새로고침
      refreshProducts()
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selpic-store') {
        console.log('🔄 [StickersPage] localStorage selpic-store (products) changed, refreshing...')
        refreshProducts()
      }
    }

    // Custom Event 리스너
    window.addEventListener('products-store-updated', handleProductsUpdate)
    // Storage Event 리스너 (다른 탭/페이지에서 변경 시)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('products-store-updated', handleProductsUpdate)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [refreshProducts])
  
  // 카테고리 정보 가져오기 (제목, 설명 등)
  const categoryInfo = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      return {
        title: '🏷️ Stickers',
        description: 'Express yourself with our premium sticker collection',
        emoji: '🏷️'
      }
    }
    const activeCategories = getActiveCategoryItems()
    const stickersCategory = activeCategories.find(cat => cat.linkUrl === '/stickers')
    return {
      title: stickersCategory ? `${stickersCategory.emoji} ${stickersCategory.title}` : '🏷️ Stickers',
      description: stickersCategory?.description || 'Express yourself with our premium sticker collection',
      emoji: stickersCategory?.emoji || '🏷️'
    }
  }, [isMounted, contentHydrated, categoryItems, getActiveCategoryItems])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubcategory, setSelectedSubcategory] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 카테고리별 Hero Slide 가져오기 (store 변경 감지)
    const categoryHeroSlides = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      console.log('⏳ Stickers page - isMounted:', isMounted, 'contentHydrated:', contentHydrated)
      return []
    }
    
    // allCategoryHeroSlides가 없거나 비어있으면 빈 배열 반환
    if (!allCategoryHeroSlides || !Array.isArray(allCategoryHeroSlides) || allCategoryHeroSlides.length === 0) {
      console.log('⚠️ Stickers page - allCategoryHeroSlides가 비어있습니다.')
      return []
    }
    
    // allCategoryHeroSlides에서 stickers 카테고리만 필터링
    const stickersSlides = allCategoryHeroSlides.filter(slide => {
      const matches = slide && 
        slide.category === 'stickers' && 
        slide.isActive === true
      if (!matches && slide) {
        console.log('🔍 Filtered out slide:', {
          id: slide.id,
          category: slide.category,
          isActive: slide.isActive,
          expectedCategory: 'stickers'
        })
      }
      return matches
    })
    
    // order로 정렬
    const sortedSlides = stickersSlides.sort((a, b) => (a.order || 0) - (b.order || 0))
    
    console.log('🏷️ Stickers page - CategoryHeroSlides:', {
      contentHydrated,
      allCategoryHeroSlidesCount: allCategoryHeroSlides.length,
      allCategoryHeroSlides: allCategoryHeroSlides.map(s => ({ 
        id: s.id, 
        category: s.category, 
        isActive: s.isActive 
      })),
      stickersSlidesCount: sortedSlides.length,
      stickersSlides: sortedSlides.map(s => ({ 
        id: s.id, 
        category: s.category, 
        isActive: s.isActive, 
        order: s.order,
        src: s.src?.substring(0, 50) + '...'
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
        title: '🏷️ Stickers',
        subtitle: 'Express yourself with our premium sticker collection'
      }
    }
    if (categoryHeroSlides && categoryHeroSlides.length > 0) {
      // 슬라이드별 제목/부제만 사용. 관리자가 입력한 값이 없으면 빈 문자열(이미지만 표시)
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
  
  // categoryHeroSlides 변경 감지 및 강제 업데이트
  useEffect(() => {
    console.log('🔄 Stickers page - categoryHeroSlides changed:', {
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
    
    // slideText도 함께 로그
    console.log('📝 Stickers page - slideText:', slideText)
  }, [categoryHeroSlides, slideText])
  
  // localStorage 변경 감지 (같은 탭에서 수정 시 - zustand persist가 자동으로 처리)
  useEffect(() => {
    // zustand persist가 자동으로 localStorage 변경을 감지하므로
    // 추가적인 처리는 필요 없지만, 디버깅을 위해 로그만 추가
    const checkStorage = () => {
      try {
        const stored = localStorage.getItem('content-store')
        if (stored) {
          const data = JSON.parse(stored)
          const storedSlides = data?.state?.categoryHeroSlides || []
          console.log('📦 localStorage check - categoryHeroSlides count:', storedSlides.length)
        }
      } catch (error) {
        console.error('❌ localStorage check error:', error)
      }
    }
    
    // 주기적으로 확인 (실제로는 zustand가 자동으로 처리하지만 디버깅용)
    const interval = setInterval(checkStorage, 2000)
    return () => clearInterval(interval)
  }, [])

  // 스티커 상품만 Filtering
  // 재고가 0인 상품도 표시 (Sold Out으로 표시됨)
  const stickers = products.filter(product => product.category === 'Stickers')
  const availableStickers = stickers
  
  // 서브카테고리 목록
  const subcategories = ['All', ...Array.from(new Set(availableStickers.map(s => s.subcategory).filter(Boolean)))]

  // 서브카테고리 카드 데이터 (Content Store에서 가져오기)
  // subcategoryItems를 직접 구독하여 변경사항이 즉시 반영되도록 함
  const subcategoryCards = React.useMemo(() => {
    if (!isMounted || !contentHydrated) {
      console.log('⏳ Subcategories not ready:', { isMounted, contentHydrated })
      return []
    }
    
    console.log('📦 SubcategoryItems from store:', subcategoryItems.length, 'items')
    const filtered = subcategoryItems
      .filter(item => {
        const matches = item.category === 'stickers' && item.isActive === true
        if (!matches && item.category === 'stickers') {
          console.log('🚫 Filtered out inactive subcategory:', item.title, 'isActive:', item.isActive)
        }
        return matches
      })
      .sort((a, b) => a.order - b.order)
    
    console.log('✅ Active subcategory cards:', filtered.length, filtered.map(s => s.title))
    return filtered
  }, [isMounted, contentHydrated, subcategoryItems])
  
  // 디버깅: subcategoryItems 변경 감지
  useEffect(() => {
    console.log('🔄 SubcategoryItems changed:', {
      count: subcategoryItems.length,
      items: subcategoryItems.map(item => ({
        id: item.id,
        title: item.title,
        category: item.category,
        isActive: item.isActive,
        order: item.order
      }))
    })
  }, [subcategoryItems])

  // 상품 데이터 새로고침
  useEffect(() => {
    if (_hasHydrated) {
      refreshProducts()
      console.log('🔄 Stickers page: 상품 데이터 새로고침됨', stickers.length, '개 스티커')
    }
  }, [_hasHydrated, refreshProducts])

  // 검색어와 서브카테고리에 따라 상품 Filtering
  const filteredStickers = availableStickers.filter(sticker => {
    const matchesSearch = sticker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sticker.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSubcategory = selectedSubcategory === 'All' || sticker.subcategory === selectedSubcategory
    return matchesSearch && matchesSubcategory
  })

  const handleCustomize = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  // Hydration 에러 방지: 서버와 클라이언트에서 동일한 구조 렌더링
  // _hasHydrated는 클라이언트에서만 true가 되므로 조건부 렌더링 제거
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <SeoProductJsonLd
        pageName="Stickers"
        pagePath="/stickers"
        products={filteredStickers.map((p) => ({
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

        {/* 스티커 카테고리 네비게이션 */}
        {/* Subcategories Section - Loaded from Content Store */}
        {subcategoryCards.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {subcategoryCards.map((subcategory) => (
                <Link 
                  key={subcategory.id}
                  href={subcategory.linkUrl}
                  className="group bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300"
                >
                  <div className="text-4xl mb-3">
                    {subcategory.imageUrl ? (
                      <SubcategoryImageDisplay 
                        src={subcategory.imageUrl}
                        emoji={subcategory.emoji}
                        alt={subcategory.title}
                      />
                    ) : (
                      subcategory.emoji || '📝'
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{subcategory.title}</h3>
                  <p className="text-sm text-gray-600">{subcategory.description}</p>
                  <ArrowRight className="w-4 h-4 mx-auto mt-2 text-gray-400 group-hover:text-blue-600" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filter 및 검색 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* 검색 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search stickers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 서브카테고리 Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {subcategories.map(subcategory => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>

              {/* 뷰 모드 토글 */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 스티커 목록 */}
        <div className="mb-8">

          {filteredStickers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No search results
              </h3>
              <p className="text-gray-600">
                Try different search terms or filters
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'space-y-4'
            }>
              {filteredStickers.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onCustomize={handleCustomize}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 커스터마이징 모달 */}
      {selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

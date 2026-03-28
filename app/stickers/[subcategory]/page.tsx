'use client'

import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import Header from '@/components/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'

// 🆕 Product Image Component (indexeddb:// 지원)
const ProductImage = ({ src, alt, className }: { 
  src: string, 
  alt: string, 
  className?: string
}) => {
  const [actualSrc, setActualSrc] = useState<string>(src)
  const [imageError, setImageError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadImage = async () => {
      if (!src || src.trim() === '' || src === 'undefined') {
        setImageError(true)
        return
      }

      // indexeddb:// URL인 경우 blob URL로 변환
      if (src.startsWith('indexeddb://')) {
        setIsLoading(true)
        try {
          const fileId = src.replace('indexeddb://', '')
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (fileUrl) {
            setActualSrc(fileUrl)
            setImageError(false)
          } else {
            console.warn('Product image not found in IndexedDB:', fileId)
            setImageError(true)
          }
        } catch (error) {
          console.error('Failed to load product image from IndexedDB:', error)
          setImageError(true)
        } finally {
          setIsLoading(false)
        }
      } else {
        // 일반 URL인 경우 바로 사용
        setActualSrc(src)
        setImageError(false)
      }
    }

    loadImage()
  }, [src])

  if (isLoading) {
    return (
      <div className={`${className || ''} bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    )
  }

  if (imageError || !actualSrc) {
    return (
      <div className={`${className || ''} bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center`}>
        <span className="text-xs text-gray-500">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={actualSrc}
      alt={alt}
      className={className || 'w-full h-full object-cover'}
      onError={() => setImageError(true)}
    />
  )
}

export default function DynamicSubcategoryPage() {
  const params = useParams()
  const subcategorySlug = params?.subcategory as string
  const { products, _hasHydrated, refreshProducts } = useStore()
  const { subcategoryItems, _hasHydrated: contentHydrated } = useContentStore()
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 스토어 복원 후·페이지 진입 시 상품 목록 갱신 (등록 상품 개수가 올바르게 표시되도록)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (_hasHydrated) {
      refreshProducts()
    }
  }, [_hasHydrated, refreshProducts])

  // URL에서 서브카테고리 슬러그 추출 (예: /stickers/basic -> basic)
  // linkUrl이 /stickers/[subcategory] 형식인 서브카테고리 찾기
  const subcategoryInfo = isMounted && contentHydrated
    ? subcategoryItems.find(item => {
        // linkUrl이 /stickers/[subcategory] 형식인지 확인
        if (item.linkUrl && item.linkUrl.startsWith('/stickers/')) {
          const urlSlug = item.linkUrl.replace('/stickers/', '')
          return urlSlug === subcategorySlug && item.category === 'stickers'
        }
        return false
      })
    : null

  // 서브카테고리 정보가 없으면 404 (하지만 마운트 전에는 기다림)
  if (isMounted && contentHydrated && !subcategoryInfo) {
    return notFound()
  }

  // 서브카테고리 제목으로 상품 필터링 (대소문자 무시, 공백/하이픈 무시)
  const normalizeString = (str: string) => {
    if (!str) return ''
    return str.toLowerCase().replace(/[\s-]/g, '')
  }
  
  // URL slug를 직접 사용하여 필터링 (subcategoryInfo가 없어도 작동)
  const normalizeSlug = (slug: string) => {
    if (!slug) return ''
    return slug.toLowerCase().replace(/[\s-]/g, '')
  }
  
  const subcategoryProducts = products.filter(product => {
    if (product.category !== 'Stickers') return false
    if (!product.subcategory) return false
    
    // 방법 1: subcategoryInfo가 있으면 title로 비교
    if (subcategoryInfo?.title) {
      const normalizedSubcategoryTitle = normalizeString(subcategoryInfo.title)
      const normalizedProductSubcategory = normalizeString(product.subcategory)
      
      if (normalizedSubcategoryTitle === normalizedProductSubcategory) {
        return true
      }
    }
    
    // 방법 2: URL slug와 product.subcategory 직접 비교 (대소문자, 공백/하이픈 무시)
    const normalizedSlug = normalizeSlug(subcategorySlug)
    const normalizedProductSubcategory = normalizeString(product.subcategory)
    
    if (normalizedSlug === normalizedProductSubcategory) {
      return true
    }
    
    // 방법 3: URL slug를 title로 변환하여 비교 (예: "name-stickers" -> "Name Stickers")
    // slug를 title 형식으로 변환 (하이픈을 공백으로, 각 단어 첫 글자 대문자)
    const slugAsTitle = subcategorySlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
    const normalizedSlugAsTitle = normalizeString(slugAsTitle)
    
    if (normalizedSlugAsTitle === normalizedProductSubcategory) {
      return true
    }
    
    return false
  })
  
  // 디버깅 로그 (개발 환경에서만)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔍 [SubcategoryPage] 필터링 정보:', {
        subcategorySlug,
        subcategoryInfoTitle: subcategoryInfo?.title,
        subcategoryInfoLinkUrl: subcategoryInfo?.linkUrl,
        totalProducts: products.length,
        stickersProducts: products.filter(p => p.category === 'Stickers').length,
        filteredProducts: subcategoryProducts.length,
        productSubcategories: products
          .filter(p => p.category === 'Stickers' && p.subcategory)
          .map(p => p.subcategory)
          .filter((v, i, a) => a.indexOf(v) === i) // 중복 제거
      })
    }
  }, [subcategorySlug, subcategoryInfo, products, subcategoryProducts])

  const pageTitle = subcategoryInfo?.pageTitle || `${subcategoryInfo?.title || subcategorySlug} Stickers`
  const productsCountText = _hasHydrated ? `${subcategoryProducts.length} products` : '...'
  const pageSubtitle = subcategoryInfo?.pageSubtitle || `${subcategoryInfo?.description || ''} (${productsCountText})`

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/stickers"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Stickers
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {subcategoryInfo?.emoji && (
                <span className="text-4xl">{subcategoryInfo.emoji}</span>
              )}
              <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <p className="text-gray-600">
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* 상품 목록 */}
        {subcategoryProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subcategoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 text-lg mb-2">No products available in this subcategory.</p>
            <p className="text-gray-400 text-sm">
              Products will appear here when they are registered with the "{subcategoryInfo?.title || subcategorySlug}" subcategory.
            </p>
            <Link 
              href="/admin/products"
              className="inline-block mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Go to Product Management →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}


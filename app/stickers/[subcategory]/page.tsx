'use client'

import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import Header from '@/components/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, notFound } from 'next/navigation'
import ProductCard from '@/components/ProductCard'

const ProductImage = ({ src, alt, className }: { 
  src: string, 
  alt: string, 
  className?: string
}) => {
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

  const normalizeString = (str: string) => {
    return decodeURIComponent(str || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const requestedSlug = normalizeString(subcategorySlug)

  // URL에서 서브카테고리 슬러그 추출 (예: /stickers/basic -> basic)
  // linkUrl/title 둘 다 슬러그로 비교해 매칭 복원
  const subcategoryInfo = isMounted && contentHydrated
    ? subcategoryItems.find((item) => {
        if (item.category !== 'stickers') return false
        const titleSlug = normalizeString(item.title)
        const linkSlug = item.linkUrl?.startsWith('/stickers/')
          ? normalizeString(item.linkUrl.replace('/stickers/', ''))
          : ''
        return requestedSlug === titleSlug || (linkSlug && requestedSlug === linkSlug)
      })
    : null
  
  const subcategoryProducts = products.filter(product => {
    if (product.category !== 'Stickers') return false
    if (!product.subcategory) return false
    
    // 방법 1: subcategoryInfo가 있으면 title로 비교
    if (subcategoryInfo?.title) {
      if (normalizeString(subcategoryInfo.title) === normalizeString(product.subcategory)) {
        return true
      }
    }

    // 방법 2: URL slug와 product.subcategory 직접 비교
    if (requestedSlug === normalizeString(product.subcategory)) {
      return true
    }

    return false
  })

  // 서브카테고리 정보도 없고 상품도 없으면 404
  if (isMounted && contentHydrated && !subcategoryInfo && subcategoryProducts.length === 0) {
    return notFound()
  }
  
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


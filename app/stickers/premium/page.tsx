'use client'

import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import { useMemo, useState, useEffect } from 'react'
import { sortProductsByCatalogPrice } from '@/lib/storefrontProductSort'

export default function PremiumStickersPage() {
  const { products } = useStore()
  const { subcategoryItems, _hasHydrated: contentHydrated } = useContentStore()
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const premiumStickers = useMemo(
    () =>
      sortProductsByCatalogPrice(
        products.filter(
          (product) => product.category === 'Stickers' && product.subcategory === 'Premium'
        ),
        'price-low'
      ),
    [products]
  )

  // Content Store에서 서브카테고리 정보 가져오기
  const subcategoryInfo = isMounted && contentHydrated
    ? subcategoryItems.find(item => item.linkUrl === '/stickers/premium')
    : null

  const pageTitle = subcategoryInfo?.pageTitle || '✨ Premium Stickers'
  const pageSubtitle = subcategoryInfo?.pageSubtitle || `Premium stickers made with high-quality materials and special designs. Perfect choice for special moments. (${premiumStickers.length} products)`

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
            <p className="text-gray-600">
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* 상품 목록 — ProductCard로 이미지 크기 통일 (max 240×240px) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {premiumStickers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {premiumStickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No premium stickers available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

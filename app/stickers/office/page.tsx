'use client'

import { useStore } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import Header from '@/components/Header'
import ProductCard from '@/components/ProductCard'
import { useState, useEffect } from 'react'

export default function OfficeStickersPage() {
  const { products } = useStore()
  const { subcategoryItems, _hasHydrated: contentHydrated } = useContentStore()
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // 오피스 스티커 상품만 필터링
  const officeStickers = products.filter(product => 
    product.category === 'Stickers' && product.subcategory === 'Office'
  )

  // Content Store에서 서브카테고리 정보 가져오기
  const subcategoryInfo = isMounted && contentHydrated
    ? subcategoryItems.find(item => item.linkUrl === '/stickers/office')
    : null

  const pageTitle = subcategoryInfo?.pageTitle || '🏢 Office Stickers'
  const pageSubtitle = subcategoryInfo?.pageSubtitle || `Office stickers optimized for organizing company supplies. Increase work efficiency with clean and professional designs. (${officeStickers.length} products)`

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
          {officeStickers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {officeStickers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No office stickers available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

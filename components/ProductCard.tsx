'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ShoppingCart, Eye, Star, Tag } from 'lucide-react'
import { Product } from '@/lib/store'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/useTranslation'
import { useUserAuth } from '@/lib/userAuth'
import { getCustomizationPath, isCustomizationRequired } from '@/lib/productCustomization'

const ProductImage = ({
  src,
  alt,
  fill,
  className,
  onError
}: {
  src: string
  alt: string
  fill?: boolean
  className?: string
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}) => {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (!src || src.trim() === '' || src === 'undefined' || src.startsWith('indexeddb://')) {
      setImageError(true)
      return
    }
    setImageError(false)
  }, [src])

  if (imageError) {
    return (
      <div
        className={`${fill ? 'absolute inset-0' : ''} bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center ${className || ''}`}
      >
        <Tag className="w-8 h-8 text-gray-400" />
        <span className="text-xs text-gray-500 mt-2">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={fill ? 'absolute inset-0 w-full h-full object-cover' : className}
      onError={(e) => {
        setImageError(true)
        onError?.(e)
      }}
    />
  )
}

interface ProductCardProps {
  product: Product
  onCustomize?: (product: Product) => void
}

export default function ProductCard({ product, onCustomize }: ProductCardProps) {
  const { addToCart } = useStore()
  const { t } = useTranslation()
  const { isLoggedIn } = useUserAuth()
  
  // ✅ category 정규화 (대소문자 구분 없이)
  const normalizedCategory = product.category?.toLowerCase() || ''
  const isStickersOrStamps = normalizedCategory === 'stickers' || normalizedCategory === 'stamps'
  const requiresCustomization = isCustomizationRequired(product)
  const customizationPath = getCustomizationPath(product)
  
  // ✅ customizationOptions 확인 (배열이고 길이가 0보다 큰지)
  const hasCustomizationOptions = Array.isArray(product.customizationOptions) && product.customizationOptions.length > 0
  
  // ✅ 디버깅: customizationOptions 확인 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development' && isStickersOrStamps) {
    console.log('🔍 [ProductCard] Product:', {
      id: product.id,
      name: product.name,
      category: product.category,
      normalizedCategory: normalizedCategory,
      hasCustomizationOptions: hasCustomizationOptions,
      customizationOptionsLength: product.customizationOptions?.length || 0,
      customizationOptions: product.customizationOptions,
      isArray: Array.isArray(product.customizationOptions)
    })
  }
  
  const stockQuantity =
    typeof product.stockQuantity === 'number' ? Math.max(0, product.stockQuantity) : undefined
  const safetyStock =
    typeof product.safetyStock === 'number' ? Math.max(0, product.safetyStock) : undefined
  const incomingStock =
    typeof product.incomingStock === 'number' ? Math.max(0, product.incomingStock) : undefined
  const lowStockThreshold = Math.max(safetyStock ?? 0, 5)
  // 재고가 0이면 자동으로 품절 처리
  const isOutOfStock = typeof stockQuantity === 'number' ? stockQuantity === 0 : !product.inStock
  const isLowStock =
    typeof stockQuantity === 'number' && stockQuantity > 0 && stockQuantity <= lowStockThreshold && product.inStock

  const handleAddToCart = () => {
    if (requiresCustomization) {
      return
    }
    if (!isLoggedIn) {
      alert(t('cart.loginRequired'))
      return
    }
    
    const success = addToCart({
      product,
      quantity: 1,
      customizations: {}
    }, isLoggedIn)
    
    if (success) {
      alert(t('cart.addedToCart'))
    }
  }

  const handleCustomize = () => {
    if (onCustomize) {
      onCustomize(product)
    }
  }

  // 언어에 따른 상품 정보 가져오기
  const getProductInfo = () => {
    // 방수스티커인 경우 특별 처리
    if (product.name.includes('방수스티커') || product.name.includes('Waterproof')) {
      return {
        name: t('home.products.waterproofSticker.name'),
        description: t('home.products.waterproofSticker.description')
      }
    }
    
    return {
      name: product.name,
      description: product.description
    }
  }

  const productInfo = getProductInfo()

  const hasDetailPage = (product as any).hasDetailPage !== false

  return (
    <div className="card group hover:shadow-lg transition-all duration-300">
      {/* Product image — capped for comfortable viewing (max 240px); centered in card */}
      <div className="relative aspect-square w-full max-w-[240px] mx-auto mb-4 overflow-hidden rounded-lg">
        {/* 🆕 ProductImage 컴포넌트 사용 (indexeddb:// 지원) */}
        {product.image && product.image.trim() !== '' && product.image !== 'undefined' ? (
          hasDetailPage ? (
            <Link href={`/products/${product.id}`}>
              <ProductImage
                src={product.image}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                onError={(e) => {
                  // 이미지 로드 실패 시 placeholder로 대체
                  e.currentTarget.style.display = 'none'
                  const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                  if (placeholder) {
                    placeholder.style.display = 'flex'
                  }
                }}
              />
            </Link>
          ) : (
            <ProductImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // 이미지 로드 실패 시 placeholder로 대체
                e.currentTarget.style.display = 'none'
                const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                if (placeholder) {
                  placeholder.style.display = 'flex'
                }
              }}
            />
          )
        ) : (
          // 이미지가 없을 때는 Link 없이 placeholder만 표시
          hasDetailPage ? (
            <Link href={`/products/${product.id}`}>
              <div className="absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                <Tag className="w-8 h-8 text-gray-400" />
                <span className="text-xs text-gray-500 mt-2">No Image</span>
              </div>
            </Link>
          ) : (
            <div className="absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
              <Tag className="w-8 h-8 text-gray-400" />
              <span className="text-xs text-gray-500 mt-2">No Image</span>
            </div>
          )
        )}
        {/* 이미지 로드 실패 시 표시될 placeholder (기본적으로 숨김) */}
        <div className="image-placeholder absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hidden">
          <Tag className="w-8 h-8 text-gray-400" />
          <span className="text-xs text-gray-500 mt-2">No Image</span>
        </div>
        {product.originalPrice && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% {t('product.discount')}
          </div>
        )}
        {isLowStock && typeof stockQuantity === 'number' && (
          <div className="absolute top-2 right-2 bg-white/90 text-red-600 text-xs px-2 py-1 rounded-full shadow">
            Only {stockQuantity} left
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">{t('product.outOfStock')}</span>
          </div>
        )}
      </div>

      {/* 상품 정보 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-pink-600 transition-colors line-clamp-2 break-words min-h-[3.25rem]">
          {productInfo.name}
        </h3>
        
        <p className="text-gray-600 text-sm line-clamp-2">
          {productInfo.description}
        </p>

        {/* 가격 */}
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-gray-500 line-through text-sm">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span
            className={`inline-flex items-center px-2 py-1 rounded ${
              isOutOfStock
                ? 'bg-gray-200 text-gray-600'
                : isLowStock
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {typeof stockQuantity === 'number'
              ? isOutOfStock
                ? 'Out of stock'
                : `${stockQuantity} in stock`
              : isOutOfStock
              ? 'Out of stock'
              : 'Available'}
          </span>
        </div>

        {/* 카테고리 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center space-x-1">
            <Tag size={12} />
            <span>{product.category}</span>
          </span>
          
          {/* 평점 */}
          <div className="flex items-center space-x-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600">
              {typeof product.rating === 'number' ? product.rating.toFixed(1) : '4.8'}
            </span>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex space-x-2 pt-2">
          {/* 커스텀 필수 상품은 항상 커스텀 페이지로 유도 */}
          {requiresCustomization ? (
            <Link
              href={customizationPath}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-1 text-center shadow-md hover:shadow-lg"
            >
              <Eye size={16} />
              <span>{t('product.customize')}</span>
            </Link>
          ) : isStickersOrStamps ? (
            <button
              onClick={handleAddToCart}
              className="flex-1 btn-primary flex items-center justify-center space-x-1"
              disabled={!product.inStock}
            >
              <ShoppingCart size={16} />
              <span>{t('product.addToCart')}</span>
            </button>
          ) : (
            // 다른 카테고리: Customize와 Cart 버튼 모두 표시(기존 동작 유지)
            <>
              <Link
                href={`/customize?product=${product.id}`}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-1 text-center shadow-md hover:shadow-lg"
              >
                <Eye size={16} />
                <span>{t('product.customize')}</span>
              </Link>
              
              <button
                onClick={handleAddToCart}
                className="flex-1 btn-primary flex items-center justify-center space-x-1"
                disabled={!product.inStock}
              >
                <ShoppingCart size={16} />
                <span>{t('product.addToCart')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 
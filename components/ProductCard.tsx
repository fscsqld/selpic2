'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ShoppingCart, Eye, Star, Tag } from 'lucide-react'
import { Product } from '@/lib/store'
import { useStore } from '@/lib/store'
import { useTranslation } from '@/lib/useTranslation'
import { useUserAuth } from '@/lib/userAuth'
import { getCustomizationPath, isCustomizationRequired } from '@/lib/productCustomization'
import {
  productCardHasCatalogRating,
  resolveProductCardImageLayout,
  type ProductCardImageLayout,
} from '@/lib/productCardImageLayout'
import {
  productCardHasAnyMerchBadge,
  resolveProductCardMerchBadges,
} from '@/lib/productCardMerchBadges'

export type { ProductCardImageLayout }

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
      className={
        fill
          ? `absolute inset-0 w-full h-full ${className || 'object-cover'}`
          : className
      }
      onError={(e) => {
        setImageError(true)
        onError?.(e)
      }}
    />
  )
}

/** `compact` = sticker subcategory grids (max 240px image). `full` = Market S–style hub cards. */
interface ProductCardProps {
  product: Product
  onCustomize?: (product: Product) => void
  imageLayout?: ProductCardImageLayout
}

export default function ProductCard({
  product,
  onCustomize,
  imageLayout = 'compact',
}: ProductCardProps) {
  const fullBleed = resolveProductCardImageLayout(imageLayout) === 'full'
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

  // Product listing should reflect admin-edited fields by default.
  // Avoid keyword-based overrides (e.g. "Waterproof") because they break future product names.
  const productInfo = {
    name: product.name,
    description: product.description,
  }

  const hasDetailPage = (product as any).hasDetailPage !== false
  const merchBadges = resolveProductCardMerchBadges(product)
  const showMerchBadges = productCardHasAnyMerchBadge(merchBadges)

  const imageShellClass = fullBleed
    ? // Slightly taller than Market S h-48 so portrait sticker sheets read a bit wider (owner 2026-09-25).
      'relative h-52 w-full overflow-hidden bg-gray-50'
    : 'relative aspect-square w-full max-w-[240px] mx-auto mb-4 overflow-hidden rounded-lg'
  const imageFitClass = fullBleed
    ? 'object-contain group-hover:opacity-95 transition-opacity duration-300'
    : 'object-cover group-hover:scale-105 transition-transform duration-300'
  /** Full hub: light inset — keep small gap, not inset-3 (too small) or edge-to-edge (too large). */
  const imageFrameClass = fullBleed ? 'absolute inset-1 block' : 'absolute inset-0 block'
  const cardClass = fullBleed
    ? 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group'
    : 'card group hover:shadow-lg transition-all duration-300'
  const bodyClass = fullBleed ? 'p-4 space-y-2' : 'space-y-2'
  const titleClass = fullBleed
    ? 'font-semibold text-lg text-gray-900 group-hover:text-pink-600 transition-colors line-clamp-2 break-words text-left'
    : 'font-semibold text-lg text-gray-900 group-hover:text-pink-600 transition-colors line-clamp-2 break-words min-h-[3.25rem] text-center'
  const showCatalogRating = productCardHasCatalogRating(product.rating)
  const reviewCount =
    typeof product.reviews === 'number' && Number.isFinite(product.reviews)
      ? Math.max(0, product.reviews)
      : 0
  const chipLabel = (product.subcategory || '').trim() || product.category
  const badgeSizeClass = fullBleed
    ? // Full hub: Mixed Labels art is portrait inside h-52+contain — same text-xs reads huge vs filled Basic sheets.
      'text-[10px] leading-tight px-1.5 py-0.5'
    : 'text-xs px-2 py-1'
  const merchBadgeClass = `text-white ${badgeSizeClass} rounded-full font-semibold shadow-sm`
  const discountBadgeClass = `bg-red-500 text-white ${badgeSizeClass} rounded font-semibold shadow-sm`

  return (
    <div className={cardClass}>
      <div className={imageShellClass}>
        {product.image && product.image.trim() !== '' && product.image !== 'undefined' ? (
          hasDetailPage ? (
            <Link href={`/products/${product.id}`} className={imageFrameClass}>
              <ProductImage
                src={product.image}
                alt={product.name}
                fill
                className={`${imageFitClass} cursor-pointer`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                  if (placeholder) {
                    placeholder.style.display = 'flex'
                  }
                }}
              />
            </Link>
          ) : (
            <div className={imageFrameClass}>
              <ProductImage
                src={product.image}
                alt={product.name}
                fill
                className={imageFitClass}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                  if (placeholder) {
                    placeholder.style.display = 'flex'
                  }
                }}
              />
            </div>
          )
        ) : (
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
        <div className="image-placeholder absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hidden">
          <Tag className="w-8 h-8 text-gray-400" />
          <span className="text-xs text-gray-500 mt-2">No Image</span>
        </div>
        {showMerchBadges && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            {merchBadges.showDiscount && product.originalPrice != null && (
              <span className={discountBadgeClass}>
                {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%{' '}
                {t('product.discount')}
              </span>
            )}
            {merchBadges.showNewArrival && (
              <span className={`bg-green-500 ${merchBadgeClass}`}>
                NEW ARRIVAL
              </span>
            )}
            {merchBadges.showBestSeller && (
              <span className={`bg-orange-500 ${merchBadgeClass}`}>
                BEST SELLER
              </span>
            )}
            {merchBadges.showPopular && (
              <span className={`bg-blue-500 ${merchBadgeClass}`}>
                POPULAR
              </span>
            )}
            {merchBadges.showLimitedEdition && (
              <span className={`bg-amber-500 ${merchBadgeClass}`}>
                LIMITED EDITION
              </span>
            )}
          </div>
        )}
        {isLowStock && typeof stockQuantity === 'number' && (
          <div className="absolute top-2 right-2 z-10 bg-white/90 text-red-600 text-xs px-2 py-1 rounded-full shadow pointer-events-none">
            Only {stockQuantity} left
          </div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-medium">{t('product.outOfStock')}</span>
          </div>
        )}
      </div>

      <div className={bodyClass}>
        <h3 className={titleClass}>
          {productInfo.name}
        </h3>

        {productInfo.description ? (
          <p className="text-gray-600 text-sm line-clamp-2 mb-1">
            {productInfo.description}
          </p>
        ) : null}

        {fullBleed ? (
          <>
            {chipLabel ? (
              <div className="flex flex-wrap gap-1 mb-1">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {chipLabel}
                </span>
              </div>
            ) : null}

            {showCatalogRating ? (
              <div className="flex items-center mb-1">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating as number)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  {(product.rating as number).toFixed(1)} ({reviewCount} reviews)
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price ? (
                    <span className="text-gray-500 line-through text-sm">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                {isLowStock && typeof stockQuantity === 'number' ? (
                  <div className="text-xs text-red-600 font-medium">Only {stockQuantity} left</div>
                ) : null}
              </div>
              {requiresCustomization ? (
                <Link href={customizationPath} className="shrink-0 btn-ux btn-ux-cta text-sm px-4 py-2">
                  <Eye size={16} />
                  <span>{t('product.customize')}</span>
                </Link>
              ) : isStickersOrStamps ? (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="shrink-0 btn-ux btn-ux-cart text-sm px-4 py-2"
                  disabled={!product.inStock}
                >
                  <ShoppingCart size={16} />
                  <span>{isOutOfStock ? t('product.outOfStock') : t('product.addToCart')}</span>
                </button>
              ) : (
                <Link
                  href={`/customize?product=${product.id}`}
                  className="shrink-0 btn-ux btn-ux-cta text-sm px-4 py-2"
                >
                  <Eye size={16} />
                  <span>{t('product.customize')}</span>
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
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

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center space-x-1">
                <Tag size={12} />
                <span>{product.category}</span>
              </span>

              <div className="flex items-center space-x-1">
                <Star size={14} className="text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600">
                  {typeof product.rating === 'number' ? product.rating.toFixed(1) : '4.8'}
                </span>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              {requiresCustomization ? (
                <Link
                  href={customizationPath}
                  className="flex-1 btn-ux btn-ux-cta text-sm"
                >
                  <Eye size={16} />
                  <span>{t('product.customize')}</span>
                </Link>
              ) : isStickersOrStamps ? (
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn-ux btn-ux-cart text-sm"
                  disabled={!product.inStock}
                >
                  <ShoppingCart size={16} />
                  <span>{t('product.addToCart')}</span>
                </button>
              ) : (
                <>
                  <Link
                    href={`/customize?product=${product.id}`}
                    className="flex-1 btn-ux btn-ux-cta text-sm"
                  >
                    <Eye size={16} />
                    <span>{t('product.customize')}</span>
                  </Link>

                  <button
                    onClick={handleAddToCart}
                    className="flex-1 btn-ux btn-ux-cart text-sm"
                    disabled={!product.inStock}
                  >
                    <ShoppingCart size={16} />
                    <span>{t('product.addToCart')}</span>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 
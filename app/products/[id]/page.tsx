'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, ShoppingCart, Star, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useStore } from '@/lib/store'
import { useMediaStore } from '@/lib/mediaStore'
import { useTranslation } from '@/lib/useTranslation'
import { useUserAuth } from '@/lib/userAuth'
import Image from 'next/image'
import ProductGallery from '@/components/ProductGallery'
import {
  hydrateMediaStoreFromLocalStorage,
  resolveStorefrontFallbackImage,
} from '@/lib/mediaGalleryLocal'
import ProductDetailJsonLd from '@/components/ProductDetailJsonLd'
import { getCustomizationPath, isCustomizationRequired } from '@/lib/productCustomization'
import MarketSBaitCrossSell from '@/components/MarketSBaitCrossSell'
import ProductLikeButton from '@/components/ProductLikeButton'
import { isMarketSCatalogProduct } from '@/lib/marketSSubcategory'
import { MARKET_S_HYGIENE_PDP } from '@/lib/marketSHygieneCopy'
import { isProductOutOfStock } from '@/lib/likedProductStock'
import {
  formatPreorderShipsFromLabel,
  getMarketSPreorderPurchaseLimit,
  isMarketSComingSoonProduct,
  isMarketSPreorderOpen,
  MARKET_S_COMING_SOON_CTA,
  MARKET_S_PREORDER_BADGE,
  MARKET_S_PREORDER_CTA,
} from '@/lib/marketSPreorder'

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useTranslation()
  const { products, addToCart, _hasHydrated, refreshProducts, updateProduct } = useStore()
  const { refreshMediaFilesFromStorage } = useMediaStore()
  const { isLoggedIn } = useUserAuth()
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [storeSettled, setStoreSettled] = useState(false)
  
  // productId를 먼저 정의 (useEffect보다 위에 있어야 함)
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const product = products.find(p => p.id === productId)
  const galleryFallback =
    product && productId
      ? resolveStorefrontFallbackImage(productId, product.fallbackImage, product.image)
      : ''
  
  // Hydration 방지: 서버와 클라이언트 첫 렌더를 동일하게 맞춘 뒤, 마운트 후에만 store 의존 UI 표시
  useEffect(() => {
    setMounted(true)
  }, [])

  // 새로고침 시 상품 목록 동기화 + 미디어 스토어 동기화 + "Product Not Found" 판정 전에 스토어가 완전히 로드될 때까지 대기
  useEffect(() => {
    if (!mounted || !productId || typeof window === 'undefined') return
    // 상세 페이지 진입 시 미디어 스토어를 localStorage에서 즉시 동기화 (갤러리 연결 이미지가 첫 로드에 보이도록)
    refreshMediaFilesFromStorage()
    hydrateMediaStoreFromLocalStorage()
    refreshProducts()
    if (!_hasHydrated) return
    const t = setTimeout(() => setStoreSettled(true), 400)
    return () => clearTimeout(t)
  }, [mounted, productId, _hasHydrated, refreshProducts, refreshMediaFilesFromStorage])
  
  // 미디어 파일 변경 감지 (Image Management에서 업로드/수정 시 즉시 반영)
  useEffect(() => {
    const handleMediaFilesUpdate = (e: CustomEvent) => {
      console.log('🔄 [ProductPage] Media files updated:', e.detail)
      refreshMediaFilesFromStorage()
      hydrateMediaStoreFromLocalStorage()
      const detail = e.detail as {
        productId?: string
        productIds?: string[]
        action?: string
      }
      const affectsThis =
        detail?.action === 'delete' ||
        !detail?.productIds?.length ||
        detail?.productIds?.some((pid) => String(pid) === String(productId)) ||
        detail?.productId === productId ||
        !detail?.productId
      if (affectsThis) {
        setForceUpdate((prev) => prev + 1)
      }
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'media-store') {
        console.log('🔄 [ProductPage] localStorage media-store changed, syncing and refreshing...')
        refreshMediaFilesFromStorage()
        hydrateMediaStoreFromLocalStorage()
        setForceUpdate(prev => prev + 1)
      }
    }
    
    // Custom Event 리스너
    const handleProductsUpdate = () => {
      refreshProducts()
      setForceUpdate((prev) => prev + 1)
    }

    window.addEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
    window.addEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)
    window.addEventListener('products-store-updated', handleProductsUpdate)
    
    // Storage Event 리스너 (다른 탭/페이지에서 변경 시)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
      window.removeEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)
      window.removeEventListener('products-store-updated', handleProductsUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [productId, refreshProducts, refreshMediaFilesFromStorage])

  // 브라우저 탭·메타 설명: 상품은 localStorage 기반이라 서버 메타는 layout 기본값만 가능
  useEffect(() => {
    if (!product || typeof document === 'undefined') return
    document.title = `${product.name} | Selpic`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    const text = (product.description || '').replace(/\s+/g, ' ').trim()
    meta.setAttribute('content', (text.slice(0, 160) || `${product.name} — Selpic`).trim())
  }, [product])

  // 재고 정보 계산
  const stockQty = typeof product?.stockQuantity === 'number' 
    ? Math.max(0, product.stockQuantity) 
    : undefined
  const requiresCustomization = product ? isCustomizationRequired(product) : false
  const customizationPath = product ? getCustomizationPath(product) : '/customize'
  const safety = typeof (product as any)?.safetyStock === 'number' 
    ? Math.max(0, (product as any).safetyStock) 
    : undefined
  const lowStockThreshold = Math.max(safety ?? 0, 5)
  const preorderOpen = isMarketSPreorderOpen(product)
  const comingSoon = isMarketSComingSoonProduct(product)
  const preorderLimit = getMarketSPreorderPurchaseLimit(product)
  const maxPurchasableQty =
    preorderLimit != null
      ? preorderLimit
      : typeof stockQty === 'number'
        ? stockQty
        : undefined
  const isOutOfStock = isProductOutOfStock(product)
  const isLowStock =
    !preorderOpen &&
    stockQty !== undefined &&
    stockQty > 0 &&
    stockQty <= lowStockThreshold &&
    !isOutOfStock
  const shipsLabel = formatPreorderShipsFromLabel(product?.preorderShipsFrom)

  // 마운트 전에는 서버와 동일한 로딩 UI만 렌더 (hydration mismatch 방지)
  const loadingBlock = (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          Loading product...
        </div>
      </div>
    </div>
  )
  if (!mounted) {
    return loadingBlock
  }
  if (!_hasHydrated) {
    return loadingBlock
  }
  // 스토어가 비어 있는 동안에는 로딩 유지 (새로고침 직후 products가 아직 복원되지 않았을 수 있음)
  if (!product && products.length === 0 && !storeSettled) {
    return loadingBlock
  }

  // 상품을 찾을 수 없음 (스토어는 로드됐으나 해당 id 상품 없음)
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-6">The requested product does not exist or has been deleted.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Go Back
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Go to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleAddToCart = () => {
    if (requiresCustomization) {
      router.push(customizationPath)
      return
    }
    if (!isLoggedIn) {
      alert(t('cart.loginRequired'))
      router.push('/login')
      return
    }

    if (isOutOfStock) {
      alert(
        comingSoon
          ? 'This item is coming soon and cannot be purchased yet.'
          : 'This product is currently out of stock.'
      )
      return
    }

    if (maxPurchasableQty !== undefined && quantity > maxPurchasableQty) {
      alert(
        preorderOpen
          ? `Pre-order limit reached. Max units: ${maxPurchasableQty}`
          : `Insufficient stock. Current stock: ${maxPurchasableQty}`
      )
      return
    }

    setIsAddingToCart(true)
    const success = addToCart({
      product,
      quantity,
      customizations: {}
    }, isLoggedIn)

    if (success) {
      alert('Added to cart!')
      setIsAddingToCart(false)
    } else {
      alert('Failed to add to cart.')
      setIsAddingToCart(false)
    }
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity < 1) return
    if (maxPurchasableQty !== undefined && newQuantity > maxPurchasableQty) {
      alert(
        preorderOpen
          ? `Pre-order limit. Max units: ${maxPurchasableQty}`
          : `Insufficient stock. Current stock: ${maxPurchasableQty}`
      )
      return
    }
    setQuantity(newQuantity)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ProductDetailJsonLd product={product} productId={productId || product.id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Back</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 상품 이미지 갤러리 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
            {/* 배지 (갤러리 위에 오버레이) */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              {preorderOpen && (
                <span className="bg-stone-900 text-stone-50 text-xs px-3 py-1 rounded font-semibold tracking-wide">
                  {MARKET_S_PREORDER_BADGE}
                </span>
              )}
              {comingSoon && !preorderOpen && (
                <span className="bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded font-semibold tracking-wide">
                  COMING SOON
                </span>
              )}
              {product.isNew && (
                <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  NEW ARRIVAL
                </span>
              )}
              {product.isBestSeller && (
                <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  BEST SELLER
                </span>
              )}
              {product.isPopular && (
                <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  POPULAR
                </span>
              )}
              {product.isLimitedEdition && (
                <span className="bg-amber-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  LIMITED EDITION
                </span>
              )}
              {isOutOfStock && !preorderOpen && (
                <span className="bg-gray-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  {comingSoon ? MARKET_S_COMING_SOON_CTA : 'Out of Stock'}
                </span>
              )}
              {isLowStock && typeof stockQty === 'number' && (
                <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  Only {stockQty} left
                </span>
              )}
            </div>
            
            {/* ProductGallery 컴포넌트 */}
            <ProductGallery
              key={`${productId}-${forceUpdate}`}
              productId={productId}
              showThumbnails={true}
              showFullscreenButton={true}
              showPlayButton={false}
              showBullets={false}
              autoPlay={false}
              fallbackImage={galleryFallback}
            />
          </div>

          {/* 상품 정보 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* 평점 */}
            {product.rating && (
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 ml-2">
                  {product.rating} ({product.reviews || 0} reviews)
                </span>
              </div>
            )}

            {/* 가격 */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-red-600">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-2xl text-gray-500 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg text-red-600 font-semibold">
                      {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Customer like (not rating) — one per logged-in account */}
            <ProductLikeButton productId={productId} />

            {/* 상품 설명 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Overview</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">
                {product.description}
              </p>
              
              {/* 상세 설명 (상세 페이지 전용) */}
              {(product as any).detailDescription && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Detailed Information</h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {(product as any).detailDescription}
                    </p>
                  </div>
                </div>
              )}
              {isMarketSCatalogProduct(product) && (
                <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
                  {MARKET_S_HYGIENE_PDP}
                </p>
              )}
            </div>

            {/* 상품 속성 */}
            <div className="mb-6 space-y-3">
              {product.subcategory && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-24">Category:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                    {product.subcategory}
                  </span>
                </div>
              )}
              {(product as any).brand && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-24">Brand:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-sm">
                    🏷️ {(product as any).brand}
                  </span>
                </div>
              )}
              {(product as any).size && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-24">Size:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                    📏 {(product as any).size}
                  </span>
                </div>
              )}
              {(product as any).color && (
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 w-24">Color:</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-sm">
                    🎨 {(product as any).color}
                  </span>
                </div>
              )}
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 w-24">Stock:</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  isOutOfStock
                    ? 'bg-gray-200 text-gray-600'
                    : preorderOpen
                    ? 'bg-stone-100 text-stone-800'
                    : isLowStock
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isOutOfStock
                    ? comingSoon
                      ? MARKET_S_COMING_SOON_CTA
                      : 'Out of Stock'
                    : preorderOpen
                    ? shipsLabel || 'Pre-order open'
                    : typeof stockQty === 'number'
                    ? `${stockQty} in stock`
                    : product.inStock
                    ? 'In Stock'
                    : 'Out of Stock'}
                </span>
              </div>
            </div>

            {preorderOpen && (
              <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">
                <p className="font-semibold tracking-wide text-xs text-stone-500 mb-1">
                  {MARKET_S_PREORDER_BADGE}
                </p>
                {shipsLabel ? <p className="font-medium">{shipsLabel}</p> : null}
                {typeof product.preorderMaxQty === 'number' &&
                product.preorderMaxQty > 0 &&
                preorderLimit != null ? (
                  <p className="mt-1 text-stone-600">
                    {preorderLimit} of {product.preorderMaxQty} left
                  </p>
                ) : null}
                {product.preorderNote?.trim() ? (
                  <p className="mt-1 text-stone-600">{product.preorderNote.trim()}</p>
                ) : (
                  <p className="mt-1 text-stone-600">
                    Charged today. We dispatch on or after the ships-from date once stock arrives.
                  </p>
                )}
              </div>
            )}

            {/* 수량 선택 */}
            {!isOutOfStock && !requiresCustomization && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={maxPurchasableQty}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      if (maxPurchasableQty !== undefined && val > maxPurchasableQty) {
                        alert(
                          preorderOpen
                            ? `Pre-order limit. Max units: ${maxPurchasableQty}`
                            : `Insufficient stock. Current stock: ${maxPurchasableQty}`
                        )
                        return
                      }
                      setQuantity(Math.max(1, val))
                    }}
                    className="w-20 text-center border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={maxPurchasableQty !== undefined && quantity >= maxPurchasableQty}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  {maxPurchasableQty !== undefined && (
                    <span className="text-sm text-gray-600">
                      (Max {maxPurchasableQty})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 장바구니 추가 버튼 또는 커스터마이징 버튼 */}
            <div className="space-y-3">
              {/* 커스텀 필수 상품: CUSTOMIZE NOW 버튼 */}
              {requiresCustomization ? (
                <Link
                  href={customizationPath}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {isOutOfStock ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <span>🎨</span>
                      CUSTOMIZE NOW
                    </>
                  )}
                </Link>
              ) : (
                /* 일반 상품: ADD TO CART 버튼 */
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAddingToCart}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 ${
                    isOutOfStock
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : preorderOpen
                        ? 'bg-stone-900 text-stone-50 hover:bg-stone-800'
                        : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isAddingToCart ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Adding...
                    </>
                  ) : isOutOfStock ? (
                    comingSoon ? MARKET_S_COMING_SOON_CTA : 'Out of Stock'
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      {preorderOpen ? MARKET_S_PREORDER_CTA : 'Add to Cart'}
                    </>
                  )}
                </button>
              )}
              
              {!isLoggedIn && (
                <p className="text-sm text-gray-500 text-center">
                  {requiresCustomization ? (
                    <>To customize this product, you need to <Link href="/login" className="text-red-600 hover:underline">login</Link>.</>
                  ) : (
                    <>To add to cart, you need to <Link href="/login" className="text-red-600 hover:underline">login</Link>.</>
                  )}
                </p>
              )}
              {product.category === 'Stickers' && <MarketSBaitCrossSell />}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}


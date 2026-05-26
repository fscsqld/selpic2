'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Type,
  X,
} from 'lucide-react'
import Header from '@/components/Header'
import { useStore, type Product } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useContentStore } from '@/lib/contentStore'
import MixedLabelsBundleSelector from '@/components/mixedLabels/MixedLabelsBundleSelector'
import MixedLabelsNamePreview from '@/components/mixedLabels/MixedLabelsNamePreview'
import {
  buildMixedLabelsBundleCustomizations,
  formatMixedLabelsBundleOptionLabel,
  getMixedLabelsSheetBundles,
  getMixedLabelsTotalSheets,
} from '@/lib/mixedLabelsPricing'
import {
  DEFAULT_LIMITED_EDITION_TEXT,
  getMixedLabelsNameMaxLength,
  isMixedLabelsProduct,
  mixedLabelsFormDefaults,
  resolveMixedSheetTemplateId,
  sanitizeMixedLabelsNameInput,
  validateMixedLabelsName,
} from '@/lib/mixedLabelsProduct'
import { getEffectiveFont } from '@/lib/fontList'
import { getMixedLabelsTemplate } from '@/lib/mixedLabelsTemplates'

const DEFAULT_BG_IMAGE = '/images/STICKER1.jpg'

export default function MixedLabelsCustomizeClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { products, addToCart, _hasHydrated } = useStore()
  const { isLoggedIn, isDemo } = useUserAuth()
  const categoryItems = useContentStore((s) => s.categoryItems)
  const getActiveCategoryItems = useContentStore((s) => s.getActiveCategoryItems)

  const [backgroundImageUrl, setBackgroundImageUrl] = useState(DEFAULT_BG_IMAGE)
  const [isMounted, setIsMounted] = useState(false)
  const [name, setName] = useState('')
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [selectedBundleId, setSelectedBundleId] = useState('')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [mobilePreviewMode, setMobilePreviewMode] = useState<'sheet' | 'product'>('sheet')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const updateMobile = () => setIsMobileViewport(window.innerWidth < 640)
    updateMobile()
    window.addEventListener('resize', updateMobile)
    return () => window.removeEventListener('resize', updateMobile)
  }, [])

  useEffect(() => {
    const categories = getActiveCategoryItems()
    const customDesign = categories.find((c: { title?: string }) => c.title === 'Custom Design')
    const bg = customDesign?.backgroundImage?.trim()
    if (!bg || bg.startsWith('indexeddb://')) {
      setBackgroundImageUrl(DEFAULT_BG_IMAGE)
      return
    }
    setBackgroundImageUrl(bg)
  }, [categoryItems, getActiveCategoryItems])

  useEffect(() => {
    if (typeof window === 'undefined' || !isMounted || !_hasHydrated) return
    void import('@/lib/catalogHydration').then((m) => m.fetchPublicCatalogAndApplyIfEmpty())
  }, [isMounted, _hasHydrated])

  const productId = searchParams.get('product')
  const displayProduct = useMemo(() => {
    if (!productId || products.length === 0) return null
    const p = products.find((x) => x.id === productId && x.category === 'Stickers')
    return p && isMixedLabelsProduct(p) ? p : null
  }, [productId, products])

  const mixedLabelsProducts = useMemo(
    () => products.filter((p) => p.category === 'Stickers' && isMixedLabelsProduct(p)),
    [products]
  )

  const wouldWaitForRestore = Boolean(
    productId && (!_hasHydrated || (products.length > 0 && !displayProduct))
  )

  useEffect(() => {
    if (!wouldWaitForRestore) {
      setLoadingTimeout(false)
      return
    }
    const t = setTimeout(() => setLoadingTimeout(true), 2500)
    return () => clearTimeout(t)
  }, [wouldWaitForRestore])

  const templateId = resolveMixedSheetTemplateId(
    (displayProduct as Product & { mixedSheetTemplateId?: string })?.mixedSheetTemplateId
  )
  const template = useMemo(() => getMixedLabelsTemplate(templateId), [templateId])
  const effectiveFont = useMemo(
    () => getEffectiveFont(template.fontId, name),
    [template.fontId, name]
  )
  const nameMaxLen = getMixedLabelsNameMaxLength(
    displayProduct as Product & { mixedLabelsNameMaxLength?: number }
  )
  const nameHint =
    (displayProduct as Product & { mixedLabelsNameHint?: string })?.mixedLabelsNameHint?.trim() ||
    mixedLabelsFormDefaults().mixedLabelsNameHint
  const limitedText =
    (displayProduct as Product & { limitedEditionText?: string })?.limitedEditionText?.trim() ||
    DEFAULT_LIMITED_EDITION_TEXT
  const showLimited =
    !!(displayProduct as Product & { isLimitedEdition?: boolean })?.isLimitedEdition

  const nameValidation = validateMixedLabelsName(name, nameMaxLen)
  const sheetBundles = useMemo(
    () => getMixedLabelsSheetBundles(displayProduct ?? undefined),
    [displayProduct]
  )
  const selectedBundle = useMemo(() => {
    const found = sheetBundles.find((b) => b.id === selectedBundleId)
    return found ?? sheetBundles[0]
  }, [sheetBundles, selectedBundleId])

  useEffect(() => {
    if (sheetBundles.length === 0) return
    if (!selectedBundleId || !sheetBundles.some((b) => b.id === selectedBundleId)) {
      setSelectedBundleId(sheetBundles[0].id)
    }
  }, [sheetBundles, selectedBundleId])

  const packUnitPrice = selectedBundle?.price ?? displayProduct?.price ?? 0
  const lineTotal = Number((packUnitPrice * orderQuantity).toFixed(2))
  const totalSheets = selectedBundle
    ? getMixedLabelsTotalSheets(selectedBundle, orderQuantity)
    : orderQuantity

  const productImage = displayProduct?.image?.trim() || ''

  const designCompletion = useMemo(() => {
    if (!displayProduct) return 0
    let score = 20
    if (selectedBundle) score += 25
    if (name.trim() && nameValidation.ok) score += 55
    return Math.min(100, score)
  }, [displayProduct, selectedBundle, name, nameValidation.ok])

  const buildCustomizations = useCallback(() => {
    const trimmed = name.trim()
    const bundle = selectedBundle ?? sheetBundles[0]
    const base = {
      customizationMode: 'fixed-mixed-sheet',
      mixedSheetTemplateId: templateId,
      name: trimmed,
      text: trimmed,
      font: effectiveFont.id,
      color: '#000000',
      productType: 'mixed-labels',
      ...(showLimited && limitedText ? { limitedEditionNote: limitedText } : {}),
    }
    if (!bundle) return base
    return buildMixedLabelsBundleCustomizations(bundle, base)
  }, [
    name,
    effectiveFont.id,
    templateId,
    showLimited,
    limitedText,
    selectedBundle,
    sheetBundles,
  ])

  const addToCartWithRedirect = useCallback(
    async (redirectToCheckout: boolean) => {
      if (!isLoggedIn) {
        alert('Please log in to add items to your cart.')
        router.push('/login')
        return
      }
      if (isDemo) {
        alert('Demo accounts cannot make purchases. Please create a real account.')
        return
      }
      if (!displayProduct) {
        alert('Please open this page from a Mixed Labels product.')
        return
      }
      if (!selectedBundle) {
        alert('Please choose a sheet bundle.')
        return
      }
      const check = validateMixedLabelsName(name, nameMaxLen)
      if (!check.ok) {
        alert(check.error)
        return
      }

      setIsAddingToCart(true)
      try {
        const customizations = buildCustomizations()
        const success = addToCart(
          {
            product: displayProduct,
            quantity: orderQuantity,
            customizations,
          },
          isLoggedIn
        )
        if (!success) {
          alert('Failed to add item to cart.')
          return
        }
        if (redirectToCheckout) router.push('/checkout')
        else router.push('/cart')
      } finally {
        setIsAddingToCart(false)
      }
    },
    [
      isLoggedIn,
      isDemo,
      displayProduct,
      name,
      nameMaxLen,
      buildCustomizations,
      addToCart,
      orderQuantity,
      router,
      selectedBundle,
    ]
  )

  const waitingForRestore = wouldWaitForRestore && !loadingTimeout

  if (!isMounted || waitingForRestore) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!displayProduct) {
    return (
      <div className="min-h-screen relative">
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${backgroundImageUrl}')`, zIndex: 0 }}
        />
        <div
          className="fixed inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
          style={{ zIndex: 1 }}
        />
        <div className="relative z-10">
          <Header />
          <div className="max-w-[1400px] mx-auto px-4 py-8">
            <div className="text-center mb-8 px-4 py-6 rounded-xl bg-black/30 backdrop-blur-sm max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                Mixed Labels Customization
              </h1>
              <p className="text-slate-200 text-sm sm:text-base drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Select a mixed label product to customize your name on the sheet.
              </p>
            </div>

            {mixedLabelsProducts.length > 0 ? (
              <div className="bg-slate-800/90 rounded-xl shadow-2xl border border-slate-700 p-6 mb-8 max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-white mb-4">Select Product</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mixedLabelsProducts.slice(0, 9).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        router.push(`/stickers/customize/mixed?product=${encodeURIComponent(product.id)}`)
                      }
                      className="p-4 border-2 rounded-lg text-left transition-all border-slate-600 hover:border-slate-500 bg-slate-700/50"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full h-32 bg-slate-600 rounded mb-2 flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-sm text-slate-300">
                        From $
                        {getMixedLabelsSheetBundles(product)[0]?.price.toFixed(2) ??
                          product.price.toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-lg mx-auto px-4 py-8 text-center bg-slate-800/90 rounded-xl border border-slate-700">
                <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Mixed Labels product not found</h2>
                <p className="text-slate-300 mb-6 text-sm">
                  Open customize from a Mixed Labels product, or register one in admin with
                  subcategory &quot;Mixed Labels&quot;.
                </p>
                <Link
                  href="/stickers"
                  className="inline-flex items-center gap-2 text-amber-300 font-medium hover:underline"
                >
                  Back to Stickers
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const canPurchase = nameValidation.ok && !!selectedBundle && designCompletion === 100

  return (
    <div className="min-h-screen relative">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${backgroundImageUrl}')`, zIndex: 0 }}
      />
      <div
        className="fixed inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none"
        style={{ zIndex: 1 }}
      />

      <div className="relative z-10">
        <Header />

        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="text-center mb-8 px-4 py-6 rounded-xl bg-black/30 backdrop-blur-sm max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Mixed Labels Customization
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-slate-200 max-w-2xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              {`What if you could create your own ${displayProduct.name}?`}
            </p>
          </div>

          {showLimited && (
            <div className="mb-6 max-w-3xl mx-auto rounded-xl border border-amber-400/50 bg-amber-500/20 backdrop-blur-sm px-4 py-3 flex gap-3">
              <Sparkles className="w-5 h-5 text-amber-200 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Limited edition</p>
                <p className="text-sm text-amber-100/90 mt-0.5">{limitedText}</p>
              </div>
            </div>
          )}

          <div className="bg-slate-800/90 rounded-xl shadow-2xl border border-slate-700 p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center space-x-4">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={displayProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-slate-600 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-white break-words">
                    {displayProduct.name}
                  </h2>
                  <p className="text-slate-300 text-sm sm:text-base">
                    Mixed sheet · from ${sheetBundles[0]?.price.toFixed(2) ?? displayProduct.price.toFixed(2)} per
                    pack
                    {selectedBundle && (
                      <span className="text-amber-300">
                        {' '}
                        · {formatMixedLabelsBundleOptionLabel(selectedBundle)} selected
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Name only — artwork and layout are fixed · Black print
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push('/stickers')}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors shrink-0"
              >
                Change Product
              </button>
            </div>
          </div>

          <div
            className={`flex flex-col md:flex-row gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'md:max-w-[1000px]' : ''}`}
          >
            {/* Left: Live preview (Sticker Customization layout) */}
            <div
              className={`flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700 transition-all relative ${isSidebarCollapsed ? 'md:max-w-none' : ''}`}
            >
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute top-4 right-4 bg-blue-600/80 hover:bg-blue-600 border-none rounded-lg w-9 h-9 text-white font-bold cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-105"
                title="Toggle sidebar"
              >
                <span>{isSidebarCollapsed ? '▶' : '◀'}</span>
              </button>

              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl mb-4">
                <h3 className="text-xl font-bold text-center">Live Preview</h3>
                {isMobileViewport && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobilePreviewMode('sheet')}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        mobilePreviewMode === 'sheet'
                          ? 'bg-white text-blue-700 border-white'
                          : 'bg-blue-800/40 text-white border-blue-300/50'
                      }`}
                    >
                      Sheet Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePreviewMode('product')}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        mobilePreviewMode === 'product'
                          ? 'bg-white text-blue-700 border-white'
                          : 'bg-blue-800/40 text-white border-blue-300/50'
                      }`}
                    >
                      Product Image
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2 sm:p-3 border-2 border-gray-200 shadow-inner min-h-[420px] sm:min-h-[480px]">
                <div
                  className={`min-w-0 flex flex-col items-center justify-center overflow-hidden border border-slate-200 rounded-lg bg-white/80 p-3 ${
                    isMobileViewport && mobilePreviewMode !== 'product' ? 'hidden sm:flex' : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-700 py-1.5 text-center truncate max-w-full px-2">
                    {displayProduct.name}
                  </p>
                  <p className="text-[10px] text-slate-500 -mt-1 pb-2 text-center px-2 leading-snug">
                    Character designs are randomly sequenced.
                  </p>
                  {productImage ? (
                    <img
                      src={productImage}
                      alt={displayProduct.name}
                      className="max-h-[280px] w-full object-contain rounded-lg border border-slate-200 shadow-md"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2 py-12">
                      <Package className="w-10 h-10" />
                      <span className="text-sm">No product image</span>
                    </div>
                  )}
                </div>

                <div
                  className={`min-w-0 flex flex-col items-center justify-center overflow-hidden border border-slate-200 rounded-lg bg-white/80 p-3 ${
                    isMobileViewport && mobilePreviewMode !== 'sheet' ? 'hidden sm:flex' : ''
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-500 py-1.5">Your name on the sheet</p>
                  <MixedLabelsNamePreview
                    name={name}
                    fontFamily={effectiveFont.fontFamily}
                    maxLength={nameMaxLen}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4 w-full">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 bg-slate-800/90 rounded-lg p-2 border border-slate-600 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Completion</span>
                    <span className="text-base font-semibold text-blue-400">{designCompletion}%</span>
                  </div>
                  <div className="flex-1 bg-slate-800/90 rounded-lg p-2 border border-slate-600 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Total</span>
                    <span className="text-base font-semibold text-green-400">${lineTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-amber-400 min-h-[18px]">
                  {designCompletion === 100
                    ? '✨ Ready to add to cart'
                    : '💡 Enter your name and choose a sheet bundle'}
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${designCompletion}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 bg-slate-800/90 rounded-lg p-2.5 border border-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Quantity
                    </span>
                    <span className="text-[10px] text-slate-500">Number of packs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={orderQuantity <= 1}
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-white tabular-nums">
                      {orderQuantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={orderQuantity >= 99}
                      onClick={() => setOrderQuantity((q) => Math.min(99, q + 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {selectedBundle && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    {totalSheets} sheet{totalSheets === 1 ? '' : 's'} total (
                    {formatMixedLabelsBundleOptionLabel(selectedBundle)}
                    {orderQuantity > 1 ? ` × ${orderQuantity} packs` : ''})
                  </p>
                )}

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => addToCartWithRedirect(true)}
                    disabled={!canPurchase || isAddingToCart}
                    className="w-full btn-ux btn-ux-editor-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>Checkout</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCartWithRedirect(false)}
                    disabled={!canPurchase || isAddingToCart}
                    className="w-full btn-ux btn-ux-editor-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Package className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Control sidebar */}
            {!isSidebarCollapsed && (
              <aside className="w-full md:w-80 bg-slate-800/90 rounded-2xl p-4 border border-slate-700 shadow-2xl flex flex-col gap-3 relative">
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 border-none rounded-full w-7 h-7 text-white cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-110"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                    Design stats
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs text-slate-400">Font</span>
                      <span className="text-sm font-semibold text-white text-right">Fixed on sheet</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Color</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border border-slate-600 bg-black" />
                        <span className="text-sm font-semibold text-white">Black</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Line total</span>
                      <span className="text-sm font-semibold text-green-400">${lineTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 rounded-lg px-3 py-3 border border-slate-700">
                  <MixedLabelsBundleSelector
                    variant="dark"
                    bundles={sheetBundles}
                    selectedBundleId={selectedBundle?.id ?? ''}
                    onSelect={(bundle) => setSelectedBundleId(bundle.id)}
                  />
                </div>

                <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700">
                  <label
                    htmlFor="mixed-labels-name"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    <Type className="w-3.5 h-3.5 inline mr-1" />
                    Name on every sticker
                  </label>
                  <input
                    id="mixed-labels-name"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={nameMaxLen}
                    value={name}
                    onChange={(e) =>
                      setName(sanitizeMixedLabelsNameInput(e.target.value, nameMaxLen))
                    }
                    placeholder="e.g. Emily or 지우"
                    className={`w-full px-2.5 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold ${
                      name && !nameValidation.ok ? 'border-red-500' : 'border-slate-600'
                    }`}
                    style={{ fontFamily: effectiveFont.fontFamily }}
                  />
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <p className="text-[11px] text-slate-400 leading-relaxed flex-1">{nameHint}</p>
                    <p className="text-[10px] font-bold text-blue-400 italic bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 shrink-0">
                      ✓ Korean supported
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {name.length}/{nameMaxLen} characters (one line)
                  </p>
                  {name && !nameValidation.ok && (
                    <p className="mt-1 text-[11px] text-red-400">{nameValidation.error}</p>
                  )}
                </div>

                <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 text-[11px] text-slate-400 leading-relaxed space-y-1">
                  <p>
                    <span className="text-slate-300 font-medium">Not customizable:</span> font, color,
                    or sticker layout — fixed for this product type.
                  </p>
                  <p>
                    The name preview shows your text only — not position on each sticker. Printed
                    sheets use fixed artwork with your name on every label.
                  </p>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

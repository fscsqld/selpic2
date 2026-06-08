'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { Plus, Edit, Trash2, Eye, Search, X, CheckCircle, AlertCircle } from 'lucide-react'
import AdminProductHeader from '@/components/AdminProductHeader'
import MediaUpload from '@/components/MediaUpload'
import { stickerPresetForAdminForm } from '@/lib/stickerSheetLayout'
import { catalogImagePersistError } from '@/lib/catalogRecordSanitize'
import {
  MIXED_LABELS_SUBCATEGORY,
  MIXED_LABELS_ADMIN_SHEET_INTRO,
  MIXED_LABELS_ADMIN_SHEET_RANDOM_NOTE,
  STICKER_PRODUCT_COLOR,
  isMixedLabelsSubcategory,
  mixedLabelsFormDefaults,
  stripGridNameLabelFields,
  resolveMixedSheetTemplateId,
} from '@/lib/mixedLabelsProduct'
import { sanitizeMixedLabelsSheetBundles, type MixedLabelsSheetBundle } from '@/lib/mixedLabelsPricing'
import MixedLabelsSheetBundlesEditor from '@/components/admin/MixedLabelsSheetBundlesEditor'
import StickerPackOptionsEditor from '@/components/admin/StickerPackOptionsEditor'
import {
  buildSuggestedStickerPacks,
  sanitizeStickerSheetBundles,
  type StickerSheetBundle,
} from '@/lib/stickerSheetBundles'

interface StickerFormData {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  subcategory?: string
  description: string
  inStock: boolean
  size?: string
  material?: string
  color?: string
  rating?: number
  reviews?: number
  isNew?: boolean
  isPopular?: boolean
  isBestSeller?: boolean
  features?: string[]
  tags?: string[]
  /** 시트지 수량. 가격 3장 기준, 기본 3장. 이벤트 시 3장 이상. 관리자 미설정 시 모든 커스텀 네임스티커에 적용. */
  stickerSheetQuantity?: number
  /** 스티커 치수(mm)·배치. 모두 입력 시 커스텀/미리보기에서 이 값 사용. */
  stickerWidthMm?: number
  stickerHeightMm?: number
  stickerCols?: number
  stickerRows?: number
  stickerGapMm?: number
  stickerHasImage?: boolean
  /** Extra charge when customer uses 2-line (Option 1 or 2). Optional; default applied in customize page if not set. */
  twoLineSurcharge?: number
  customizationMode?: string
  mixedSheetTemplateId?: string
  mixedLabelsNameMaxLength?: number
  mixedLabelsNameHint?: string
  mixedLabelsSheetBundles?: MixedLabelsSheetBundle[]
  enableStickerPackOptions?: boolean
  stickerSheetBundles?: StickerSheetBundle[]
  limitedEditionText?: string
  isLimitedEdition?: boolean
}

const normalizeSubcategoryKey = (value?: string): string =>
  (value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')

const isStationeryEssentialsSubcategory = (value?: string): boolean =>
  normalizeSubcategoryKey(value) === 'stationery essentials'

export default function StickersPage() {
  const forceCatalogSync = useCallback(async (): Promise<boolean> => {
    try {
      const { syncCatalogToServerNow } = await import('@/lib/catalogSyncScheduler')
      const result = await syncCatalogToServerNow(3)
      return !!result.ok
    } catch (e) {
      console.error('❌ [Sticker Management] force catalog sync failed:', e)
      return false
    }
  }, [])

  const { products, addProduct, updateProduct, deleteProduct } = useStore()
  
  // Filter only sticker products
  const stickersProducts = products.filter(product => product.category === 'Stickers')
  
  // Subcategory list
  const subcategories = [
    { value: 'all', label: 'All', icon: '🏷️' },
    { value: 'Basic', label: 'Basic', icon: '📝' },
    { value: 'Set', label: 'Set', icon: '📦' },
    { value: 'Premium', label: 'Premium', icon: '✨' },
    { value: 'Office', label: 'Office', icon: '💼' },
    { value: 'Kids', label: 'Kids', icon: '👶' },
    { value: 'Custom', label: 'Custom', icon: '🎨' },
    { value: 'Stationery Essentials', label: 'Stationery Essentials', icon: '📎' },
    { value: MIXED_LABELS_SUBCATEGORY, label: 'Mixed Labels', icon: '🦕' },
  ]
  
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StickerFormData | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })

  const [formData, setFormData] = useState<StickerFormData>({
    id: '',
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: 'Stickers',
    subcategory: '',
    description: '',
    inStock: true,
    size: '',
    material: '',
    color: '',
    rating: 4.5,
    reviews: 0,
    isNew: false,
    isPopular: false,
    isBestSeller: false,
    isLimitedEdition: false,
    limitedEditionText: '',
    features: [],
    tags: [],
    stickerSheetQuantity: 3,
    stickerWidthMm: undefined,
    stickerHeightMm: undefined,
    stickerCols: undefined,
    stickerRows: undefined,
    stickerGapMm: undefined,
    stickerHasImage: false,
    twoLineSurcharge: undefined,
    customizationMode: undefined,
    mixedSheetTemplateId: '',
    mixedLabelsNameMaxLength: mixedLabelsFormDefaults().mixedLabelsNameMaxLength,
    mixedLabelsNameHint: '',
    mixedLabelsSheetBundles: mixedLabelsFormDefaults().mixedLabelsSheetBundles.map((b) => ({ ...b })),
    enableStickerPackOptions: false,
    stickerSheetBundles: [],
  })
  const isStationeryEssentialsProduct = isStationeryEssentialsSubcategory(formData.subcategory)
  const isMixedLabelsProduct = isMixedLabelsSubcategory(formData.subcategory)
  const isGridNameLabelProduct =
    !isMixedLabelsProduct && !isStationeryEssentialsProduct && formData.subcategory !== 'Set'
  
  // Filter by subcategory
  const filteredProducts = selectedSubcategory === 'all' 
    ? stickersProducts 
    : stickersProducts.filter(product => product.subcategory === selectedSubcategory)

  // Show notification function
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification({ type: 'info', message: '', show: false })
    }, 3000)
  }

  // Open modal
  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        ...product,
        originalPrice: product.originalPrice || 0,
        size: product.size || '',
        material: product.material || '',
        color: product.color || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        isNew: product.isNew || false,
        isPopular: product.isPopular || false,
        isBestSeller: product.isBestSeller || false,
        features: product.features || [],
        tags: product.tags || [],
        stickerSheetQuantity: (product as any).stickerSheetQuantity ?? 3,
        stickerWidthMm: (product as any).stickerWidthMm,
        stickerHeightMm: (product as any).stickerHeightMm,
        stickerCols: (product as any).stickerCols,
        stickerRows: (product as any).stickerRows,
        stickerGapMm: (product as any).stickerGapMm,
        stickerHasImage: !!(product as any).stickerHasImage,
        twoLineSurcharge: (product as any).twoLineSurcharge,
        customizationMode: (product as any).customizationMode,
        mixedSheetTemplateId: (product as any).mixedSheetTemplateId || '',
        mixedLabelsNameMaxLength: (product as any).mixedLabelsNameMaxLength,
        mixedLabelsNameHint: (product as any).mixedLabelsNameHint || '',
        mixedLabelsSheetBundles: sanitizeMixedLabelsSheetBundles(
          (product as any).mixedLabelsSheetBundles
        ),
        enableStickerPackOptions: !!(product as any).enableStickerPackOptions,
        stickerSheetBundles: sanitizeStickerSheetBundles((product as any).stickerSheetBundles),
        limitedEditionText: (product as any).limitedEditionText || '',
        isLimitedEdition: !!(product as any).isLimitedEdition,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        id: '',
        name: '',
        price: 0,
        originalPrice: 0,
        image: '',
        category: 'Stickers',
        subcategory: '',
        description: '',
        inStock: true,
        size: '',
        material: '',
        color: '',
        rating: 4.5,
        reviews: 0,
        isNew: false,
        isPopular: false,
        isBestSeller: false,
        isLimitedEdition: false,
        limitedEditionText: '',
        features: [],
        tags: [],
        stickerSheetQuantity: 3,
        stickerWidthMm: undefined,
        stickerHeightMm: undefined,
        stickerCols: undefined,
        stickerRows: undefined,
        stickerGapMm: undefined,
        stickerHasImage: false,
        twoLineSurcharge: undefined,
        customizationMode: undefined,
        mixedSheetTemplateId: '',
        mixedLabelsNameMaxLength: mixedLabelsFormDefaults().mixedLabelsNameMaxLength,
        mixedLabelsNameHint: '',
    mixedLabelsSheetBundles: mixedLabelsFormDefaults().mixedLabelsSheetBundles.map((b) => ({ ...b })),
        enableStickerPackOptions: false,
        stickerSheetBundles: [],
      })
    }
    setIsModalOpen(true)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData({
      id: '',
      name: '',
      price: 0,
      originalPrice: 0,
      image: '',
      category: 'Stickers',
      subcategory: '',
      description: '',
      inStock: true,
      size: '',
      material: '',
      color: '',
      rating: 4.5,
      reviews: 0,
      isNew: false,
      isPopular: false,
      isBestSeller: false,
      isLimitedEdition: false,
      limitedEditionText: '',
      features: [],
      tags: [],
      stickerSheetQuantity: 3,
      stickerWidthMm: undefined,
      stickerHeightMm: undefined,
      stickerCols: undefined,
      stickerRows: undefined,
      stickerGapMm: undefined,
    stickerHasImage: false,
      twoLineSurcharge: undefined,
      customizationMode: undefined,
      mixedSheetTemplateId: '',
      mixedLabelsNameMaxLength: mixedLabelsFormDefaults().mixedLabelsNameMaxLength,
      mixedLabelsNameHint: '',
    mixedLabelsSheetBundles: mixedLabelsFormDefaults().mixedLabelsSheetBundles.map((b) => ({ ...b })),
      enableStickerPackOptions: false,
      stickerSheetBundles: [],
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subcategory) {
      showNotification('error', 'Please select a sticker subcategory.')
      return
    }

    const imagePersistErr = catalogImagePersistError(formData.image)
    if (imagePersistErr) {
      showNotification('error', imagePersistErr)
      return
    }
    
    try {
      const hasStickerDims =
        !isMixedLabelsProduct &&
        formData.stickerWidthMm != null &&
        formData.stickerHeightMm != null &&
        formData.stickerCols != null &&
        formData.stickerRows != null
      const optionalSticker = hasStickerDims
        ? {
            stickerWidthMm: Number(formData.stickerWidthMm),
            stickerHeightMm: Number(formData.stickerHeightMm),
            stickerCols: Number(formData.stickerCols),
            stickerRows: Number(formData.stickerRows),
            stickerGapMm:
              formData.stickerGapMm != null ? Number(formData.stickerGapMm) : 2
          }
        : {}
      const twoLineSurchargeVal =
        !isMixedLabelsProduct && formData.twoLineSurcharge != null
          ? Number(formData.twoLineSurcharge)
          : undefined
      const normalizedStickerSheetQuantity = isStationeryEssentialsProduct
        ? undefined
        : isMixedLabelsProduct
          ? Math.max(1, Number(formData.stickerSheetQuantity) || 1)
          : Math.max(3, Number(formData.stickerSheetQuantity) || 3)

      const limitedEditionPayload = {
        isLimitedEdition: !!formData.isLimitedEdition,
        limitedEditionText: formData.isLimitedEdition
          ? (formData.limitedEditionText?.trim() ||
              (isMixedLabelsProduct ? mixedLabelsFormDefaults().limitedEditionText : ''))
          : '',
      }

      const mixedLabelsBundles = isMixedLabelsProduct
        ? sanitizeMixedLabelsSheetBundles(formData.mixedLabelsSheetBundles)
        : undefined

      const mixedLabelsPayload = isMixedLabelsProduct
        ? {
            customizationMode: mixedLabelsFormDefaults().customizationMode,
            mixedSheetTemplateId: resolveMixedSheetTemplateId(formData.mixedSheetTemplateId),
            mixedLabelsNameMaxLength: Math.max(
              1,
              Math.min(20, Number(formData.mixedLabelsNameMaxLength) || 6)
            ),
            mixedLabelsNameHint: formData.mixedLabelsNameHint?.trim() || '',
            mixedLabelsSheetBundles: mixedLabelsBundles,
            size: formData.size?.trim() || mixedLabelsFormDefaults().size,
            price:
              mixedLabelsBundles && mixedLabelsBundles.length > 0
                ? Math.min(...mixedLabelsBundles.map((b) => b.price))
                : formData.price,
          }
        : {}

      const isGridNameLabel =
        !isMixedLabelsProduct &&
        !isStationeryEssentialsProduct &&
        formData.subcategory !== 'Set'

      const stickerPackBundles =
        isGridNameLabel && formData.enableStickerPackOptions
          ? sanitizeStickerSheetBundles(formData.stickerSheetBundles)
          : []

      if (isGridNameLabel && formData.enableStickerPackOptions && stickerPackBundles.length === 0) {
        showNotification('error', 'Add at least one pack option or disable pack options.')
        return
      }

      const stickerPackPayload = isGridNameLabel && formData.enableStickerPackOptions
        ? {
            enableStickerPackOptions: true,
            stickerSheetBundles: stickerPackBundles,
            price: Math.min(...stickerPackBundles.map((b) => b.price)),
          }
        : {
            enableStickerPackOptions: false,
            stickerSheetBundles: undefined,
          }

      const basePayload = {
        ...formData,
        color: STICKER_PRODUCT_COLOR,
        stickerSheetQuantity: normalizedStickerSheetQuantity,
        ...optionalSticker,
        twoLineSurcharge: twoLineSurchargeVal,
        ...mixedLabelsPayload,
        ...stickerPackPayload,
        ...limitedEditionPayload,
      }

      const productPayload = isMixedLabelsProduct
        ? stripGridNameLabelFields(basePayload)
        : basePayload

      if (editingProduct) {
        // Update product
        const updatedProduct = {
          ...productPayload,
          customizationOptions: (editingProduct as any).customizationOptions || [],
          updatedAt: new Date().toISOString()
        }
        updateProduct(updatedProduct)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${formData.name}" sticker has been successfully updated!`
            : `"${formData.name}" sticker saved locally, but server sync failed.`
        )
      } else {
        // Add new product
        const newProduct = {
          ...productPayload,
          id: Date.now().toString(),
          customizationOptions: [],
          updatedAt: new Date().toISOString()
        }
        addProduct(newProduct)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${formData.name}" sticker has been successfully added!`
            : `"${formData.name}" sticker saved locally, but server sync failed.`
        )
      }
      
      closeModal()
    } catch (error) {
      showNotification('error', 'An error occurred while saving.')
      console.error('Product save error:', error)
    }
  }

  // Delete product
  const handleDelete = (productId: string) => {
    const product = stickersProducts.find(p => p.id === productId)
    if (confirm(`Are you sure you want to delete the "${product?.name}" sticker?`)) {
      void (async () => {
        deleteProduct(productId)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${product?.name}" sticker has been deleted.`
            : `"${product?.name}" sticker deleted locally, but server sync failed.`
        )
      })()
    }
  }

  // Handle input field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => {
      const next: StickerFormData = {
        ...prev,
        [name]: type === 'number' ? parseFloat(String(value)) || 0 :
                  type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
      // Size + subcategory → sticker mm/cols/rows (Premium 30×13mm = 3×9, Basic 30×13mm = 3×8)
      if (name === 'size' && typeof value === 'string' && value.trim()) {
        const preset = stickerPresetForAdminForm(value, next.subcategory || '')
        next.stickerWidthMm = preset.stickerWidthMm
        next.stickerHeightMm = preset.stickerHeightMm
        next.stickerCols = preset.stickerCols
        next.stickerRows = preset.stickerRows
        next.stickerGapMm = preset.stickerGapMm ?? prev.stickerGapMm ?? 2
      }
      if (name === 'subcategory' && typeof value === 'string') {
        next.color = STICKER_PRODUCT_COLOR
        if (isMixedLabelsSubcategory(value)) {
          const defs = mixedLabelsFormDefaults()
          next.customizationMode = defs.customizationMode
          next.stickerSheetQuantity = defs.stickerSheetQuantity
          next.size = defs.size
          next.color = defs.color
          next.stickerWidthMm = undefined
          next.stickerHeightMm = undefined
          next.stickerCols = undefined
          next.stickerRows = undefined
          next.stickerGapMm = undefined
          next.stickerHasImage = false
          next.twoLineSurcharge = undefined
          next.mixedSheetTemplateId = mixedLabelsFormDefaults().mixedSheetTemplateId
          if (next.mixedLabelsNameMaxLength == null) {
            next.mixedLabelsNameMaxLength = defs.mixedLabelsNameMaxLength
          }
          if (!next.mixedLabelsNameHint?.trim()) {
            next.mixedLabelsNameHint = defs.mixedLabelsNameHint
          }
          if (!next.mixedLabelsSheetBundles?.length) {
            next.mixedLabelsSheetBundles = defs.mixedLabelsSheetBundles.map((b) => ({ ...b }))
          }
          next.enableStickerPackOptions = false
          next.stickerSheetBundles = undefined
          if (!next.limitedEditionText?.trim()) {
            next.limitedEditionText = defs.limitedEditionText
          }
          if (name === 'subcategory') next.isLimitedEdition = true
        } else {
          next.customizationMode = undefined
          next.mixedSheetTemplateId = ''
          next.mixedLabelsNameHint = ''
          next.mixedLabelsSheetBundles = undefined
          if (isStationeryEssentialsSubcategory(value) || value === 'Set') {
            next.enableStickerPackOptions = false
            next.stickerSheetBundles = undefined
          }
          next.limitedEditionText = ''
          next.isLimitedEdition = false
          const size = next.size || ''
          if (size.trim() && !isStationeryEssentialsSubcategory(value)) {
            const preset = stickerPresetForAdminForm(size, value)
            next.stickerWidthMm = preset.stickerWidthMm
            next.stickerHeightMm = preset.stickerHeightMm
            next.stickerCols = preset.stickerCols
            next.stickerRows = preset.stickerRows
            next.stickerGapMm = preset.stickerGapMm ?? next.stickerGapMm ?? 2
          }
        }
      }
      if (name === 'subcategory') {
        if (isStationeryEssentialsSubcategory(value)) {
          next.stickerSheetQuantity = undefined
          next.size = ''
        } else if (isMixedLabelsSubcategory(value)) {
          next.stickerSheetQuantity = Math.max(1, Number(next.stickerSheetQuantity) || 1)
        } else if (next.stickerSheetQuantity == null || Number(next.stickerSheetQuantity) < 3) {
          next.stickerSheetQuantity = 3
        }
      }
      if (
        name === 'stickerSheetQuantity' &&
        !isStationeryEssentialsSubcategory(next.subcategory) &&
        typeof next.stickerSheetQuantity === 'number'
      ) {
        if (isMixedLabelsSubcategory(next.subcategory) && next.stickerSheetQuantity < 1) {
          next.stickerSheetQuantity = 1
        } else if (
          !isMixedLabelsSubcategory(next.subcategory) &&
          next.stickerSheetQuantity < 3
        ) {
          next.stickerSheetQuantity = 3
        }
      }
      return next
    })
  }

  // Handle checkbox changes
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AdminProductHeader
        title="Sticker Management"
        icon="🏷️"
        showHomepageLink={true}
        showLanguageSelector={true}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : notification.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Page description */}
        <div className="mb-8">
          <p className="text-gray-600">Manage sticker products. You can organize them by subcategory.</p>
        </div>

        {/* Sticker management buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Sticker
          </button>
        </div>

        {/* Subcategory filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Subcategory</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {subcategories.map(subcategory => (
              <button
                key={subcategory.value}
                onClick={() => setSelectedSubcategory(subcategory.value)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  selectedSubcategory === subcategory.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-1">{subcategory.icon}</div>
                <div className="text-sm font-medium">{subcategory.label}</div>
                <div className="text-xs text-gray-500">
                  {subcategory.value === 'all' 
                    ? stickersProducts.length 
                    : stickersProducts.filter(p => p.subcategory === subcategory.value).length
                  } items
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sticker statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">
              {selectedSubcategory === 'all' ? 'Total Stickers' : `${subcategories.find(s => s.value === selectedSubcategory)?.label} Stickers`}
            </div>
            <div className="text-2xl font-bold text-gray-900">{filteredProducts.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">In Stock</div>
            <div className="text-2xl font-bold text-green-600">
              {filteredProducts.filter(p => p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">
              {filteredProducts.filter(p => !p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">Average Price</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(filteredProducts.reduce((sum, p) => sum + p.price, 0) / Math.max(filteredProducts.length, 1)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Sticker list */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {selectedSubcategory === 'all' ? 'Sticker Product List' : `${subcategories.find(s => s.value === selectedSubcategory)?.label} Sticker List`}
          </h2>
          {filteredProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No stickers registered.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                                        <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">${product.price}</p>
                      <div className="flex space-x-1 mt-1">
                        {product.subcategory && (
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {subcategories.find(s => s.value === product.subcategory)?.icon} {product.subcategory}
                          </span>
                        )}
                        {(product as any).size && (
                          <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            📏 {(product as any).size}
                          </span>
                        )}
                        {(product as any).material && (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            🏷️ {(product as any).material}
                          </span>
                        )}
                        {(product as any).color && (
                          <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                            🎨 {(product as any).color}
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                          product.inStock 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => openModal(product)}
                        className="text-emerald-600 hover:text-emerald-900 p-1"
                        title="Edit Sticker"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Sticker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => window.open('/', '_blank')}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View on Homepage"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit sticker modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct
                    ? isMixedLabelsProduct
                      ? 'Edit Mixed Labels Product'
                      : 'Edit Sticker'
                    : isMixedLabelsProduct
                      ? 'Add Mixed Labels Product'
                      : 'Add New Sticker'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sticker Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter sticker name"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Price *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Original price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price
                    </label>
                    <input
                      type="number"
                      name="originalPrice"
                      value={formData.originalPrice || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory *
                    </label>
                    <select
                      name="subcategory"
                      value={formData.subcategory || ''}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select Subcategory</option>
                      {subcategories.filter(s => s.value !== 'all').map(subcategory => (
                        <option key={subcategory.value} value={subcategory.value}>
                          {subcategory.icon} {subcategory.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isMixedLabelsProduct && (
                    <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-amber-900">Mixed Labels sheet</h4>
                        <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                          {MIXED_LABELS_ADMIN_SHEET_INTRO}
                        </p>
                        <p className="mt-2 text-xs text-amber-800 leading-relaxed">
                          {MIXED_LABELS_ADMIN_SHEET_RANDOM_NOTE}
                        </p>
                        <p className="mt-2 text-xs text-amber-800 leading-relaxed">
                          Not the same as grid name labels (Basic / Premium).
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-800 mb-1">
                            Max name length
                          </label>
                          <input
                            type="number"
                            name="mixedLabelsNameMaxLength"
                            value={formData.mixedLabelsNameMaxLength ?? 6}
                            onChange={handleInputChange}
                            min={1}
                            max={20}
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                          />
                        </div>
                      </div>

                      <MixedLabelsSheetBundlesEditor
                        bundles={formData.mixedLabelsSheetBundles}
                        onChange={(bundles) =>
                          setFormData((prev) => ({
                            ...prev,
                            mixedLabelsSheetBundles: bundles,
                            price: bundles.length
                              ? Math.min(...bundles.map((b) => b.price))
                              : prev.price,
                          }))
                        }
                      />
                      <p className="text-xs text-amber-800">
                        List price syncs to the lowest bundle on save. Quantity on the storefront is
                        number of packs.
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          Name input hint (storefront)
                        </label>
                        <textarea
                          name="mixedLabelsNameHint"
                          value={formData.mixedLabelsNameHint || ''}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-sm"
                          placeholder="Shown on the customize page above the name field"
                        />
                      </div>

                      {formData.isLimitedEdition && (
                        <div className="rounded-lg border border-amber-300 bg-white p-3">
                          <label className="block text-sm font-medium text-gray-800 mb-1">
                            Limited edition text (storefront)
                          </label>
                          <textarea
                            name="limitedEditionText"
                            value={formData.limitedEditionText || ''}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                            placeholder={mixedLabelsFormDefaults().limitedEditionText}
                          />
                          <p className="mt-1 text-xs text-amber-800">
                            Enable <strong>Limited Edition</strong> in Product Status below.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Size — grid name labels only */}
                  {!isMixedLabelsProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    {isStationeryEssentialsProduct ? (
                      <>
                        <input
                          type="text"
                          name="size"
                          value={formData.size || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          placeholder="e.g., A4 sheet, 210 x 297mm, printable area"
                        />
                        <p className="mt-1 text-xs text-gray-500">Stationery Essentials uses free-form size input for stationery file products.</p>
                      </>
                    ) : (
                      <>
                        <select
                          name="size"
                          value={formData.size || ''}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="">Select Size</option>
                          <option value="Small">Small (22mm x 9mm)</option>
                          <option value="Medium (30mm x 13mm)">Medium (30mm x 13mm)</option>
                          <option value="Medium (30mm x 15mm)">Medium (30mm x 15mm)</option>
                          <option value="Large (46mm x 15mm)">Large (46mm x 15mm)</option>
                          <option value="Large (47mm x 15mm)">Large (47mm x 15mm)</option>
                          <option value="Extra Large">Extra Large (45mm x 21mm)</option>
                          <option value="Round">Round (28mm)</option>
                          <option value="Custom">Custom Size</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">선택한 크기가 커스텀·미리보기 등 모든 페이지에 반영됩니다. Custom 선택 시 아래 치수를 입력하세요.</p>
                      </>
                    )}
                  </div>
                  )}

                  {/* Sticker dimensions (optional): grid name labels only */}
                  {!isMixedLabelsProduct && (
                  <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <label className="col-span-2 md:col-span-5 text-sm font-medium text-gray-700">스티커 치수 (선택) — 입력 시 해당 상품에만 적용</label>
                    <div>
                      <label className="block text-xs text-gray-500">가로(mm)</label>
                      <input type="number" name="stickerWidthMm" value={formData.stickerWidthMm ?? ''} onChange={handleInputChange} min={1} step={1} placeholder="예: 30" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">세로(mm)</label>
                      <input type="number" name="stickerHeightMm" value={formData.stickerHeightMm ?? ''} onChange={handleInputChange} min={1} step={1} placeholder="예: 15" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">열(cols)</label>
                      <input type="number" name="stickerCols" value={formData.stickerCols ?? ''} onChange={handleInputChange} min={1} placeholder="예: 3" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">행(rows)</label>
                      <input type="number" name="stickerRows" value={formData.stickerRows ?? ''} onChange={handleInputChange} min={1} placeholder="예: 8" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500">간격(mm)</label>
                      <input type="number" name="stickerGapMm" value={formData.stickerGapMm ?? ''} onChange={handleInputChange} min={0} step={0.5} placeholder="예: 2" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm" />
                    </div>
                  </div>
                  )}

                  {isGridNameLabelProduct && (
                    <StickerPackOptionsEditor
                      enabled={!!formData.enableStickerPackOptions}
                      onEnabledChange={(enabled) =>
                        setFormData((prev) => {
                          const layout = {
                            size: prev.size,
                            subcategory: prev.subcategory,
                            stickerWidthMm: prev.stickerWidthMm,
                            stickerHeightMm: prev.stickerHeightMm,
                            stickerCols: prev.stickerCols,
                            stickerRows: prev.stickerRows,
                            stickerGapMm: prev.stickerGapMm,
                          }
                          const bundles =
                            enabled && (!prev.stickerSheetBundles?.length)
                              ? buildSuggestedStickerPacks(layout)
                              : sanitizeStickerSheetBundles(prev.stickerSheetBundles)
                          return {
                            ...prev,
                            enableStickerPackOptions: enabled,
                            stickerSheetBundles: enabled ? bundles : [],
                            price:
                              enabled && bundles.length > 0
                                ? Math.min(...bundles.map((b) => b.price))
                                : prev.price,
                          }
                        })
                      }
                      bundles={formData.stickerSheetBundles}
                      onChange={(bundles) =>
                        setFormData((prev) => ({
                          ...prev,
                          stickerSheetBundles: bundles,
                          price: bundles.length
                            ? Math.min(...bundles.map((b) => b.price))
                            : prev.price,
                        }))
                      }
                      layoutProduct={{
                        size: formData.size,
                        subcategory: formData.subcategory,
                        stickerWidthMm: formData.stickerWidthMm,
                        stickerHeightMm: formData.stickerHeightMm,
                        stickerCols: formData.stickerCols,
                        stickerRows: formData.stickerRows,
                        stickerGapMm: formData.stickerGapMm,
                      }}
                      listPrice={formData.price}
                      onListPriceChange={(price) =>
                        setFormData((prev) => ({ ...prev, price }))
                      }
                    />
                  )}

                  {/* Sticker has image — grid name labels only */}
                  {!isMixedLabelsProduct && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stickerHasImage"
                      name="stickerHasImage"
                      checked={!!formData.stickerHasImage}
                      onChange={handleCheckboxChange}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="stickerHasImage" className="text-sm text-gray-700">
                      Sticker has image (e.g. icon on left) — text will be placed so it does not overlap the image
                    </label>
                  </div>
                  )}

                  {/* Material — not used for Mixed Labels */}
                  {!isMixedLabelsProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <select
                      name="material"
                      value={formData.material || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select Material</option>
                      <option value="Vinyl">Vinyl (Durable)</option>
                      <option value="Paper">Paper (Standard)</option>
                      <option value="Waterproof PP">Waterproof PP</option>
                    </select>
                  </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <select
                      name="color"
                      value={formData.color || STICKER_PRODUCT_COLOR}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50"
                    >
                      <option value={STICKER_PRODUCT_COLOR}>{STICKER_PRODUCT_COLOR}</option>
                    </select>
                  </div>

                  {/* 2-line surcharge — grid name labels only */}
                  {!isMixedLabelsProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2-line surcharge (AUD)
                    </label>
                    <input
                      type="number"
                      name="twoLineSurcharge"
                      value={formData.twoLineSurcharge ?? ''}
                      onChange={handleInputChange}
                      min={0}
                      step={0.5}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Extra charge when customer uses 2 lines (Affiliation+Name or Name+Phone). Leave empty to use default ($1) on customize page.</p>
                  </div>
                  )}

                  {/* Sticker sheet quantity — legacy single-price mode (hidden when pack options on) */}
                  {!isStationeryEssentialsProduct && !isMixedLabelsProduct && !formData.enableStickerPackOptions && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sticker sheet quantity (sheets)
                    </label>
                    <input
                      type="number"
                      name="stickerSheetQuantity"
                      value={formData.stickerSheetQuantity ?? 3}
                      onChange={handleInputChange}
                      min={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Price is for 3 sheets. Default 3. Use 3+ for events. Applies to all custom name stickers if not changed.</p>
                  </div>
                  )}

                  {isStationeryEssentialsProduct && (
                    <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      Stationery Essentials selected: name-sticker sheet quantity is hidden.
                      Use Customization Options type "image" for customer file uploads.
                    </div>
                  )}

                  {/* Stock status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="inStock"
                      checked={formData.inStock}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      In Stock
                    </label>
                  </div>

                  {/* Image upload — Supabase URL required (base64 is stripped on catalog sync) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isMixedLabelsProduct ? 'Product image (listing & sample sheet)' : 'Product image'}
                    </label>
                    {isMixedLabelsProduct && (
                      <p className="mb-2 text-xs text-gray-500">
                        Upload the sample sheet image (e.g. with placeholder name). Used on shop listing and product detail until customize preview is live.
                      </p>
                    )}
                    <MediaUpload
                      type="image"
                      currentUrl={formData.image}
                      usage="product-media"
                      onUpload={(_file, url) => setFormData((prev) => ({ ...prev, image: url }))}
                      onRemove={() => setFormData((prev) => ({ ...prev, image: '' }))}
                    />
                  </div>

                  {/* Rating and reviews */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                      </label>
                      <input
                        type="number"
                        name="rating"
                        value={formData.rating || ''}
                        onChange={handleInputChange}
                        min="0"
                        max="5"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="4.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Count
                      </label>
                      <input
                        type="number"
                        name="reviews"
                        value={formData.reviews || ''}
                        onChange={handleInputChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Product status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isNew"
                        checked={formData.isNew || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        New Arrival
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isBestSeller"
                        checked={formData.isBestSeller || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Best Seller
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isPopular"
                        checked={formData.isPopular || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Popular Item
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isLimitedEdition"
                        checked={!!formData.isLimitedEdition}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        Limited Edition
                      </label>
                    </div>
                  </div>

                  {formData.isLimitedEdition && !isMixedLabelsProduct && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Limited edition text (optional)
                      </label>
                      <textarea
                        name="limitedEditionText"
                        value={formData.limitedEditionText || ''}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="Shown on product and customize pages when set"
                      />
                    </div>
                  )}

                  {/* Product description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder={
                        isMixedLabelsProduct
                          ? 'Describe the mixed sheet (themes, sticker count, fixed design, name-only customization)...'
                          : 'Enter detailed description of the sticker'
                      }
                    />
                  </div>
                </div>

                {/* Preview */}
                {formData.image && (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Image Preview</h4>
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik00MCA2NEg4OE02NCA0MFY4OCIgc3Ryb2tlPSIjOUI5QkEwIiBzdHJva2Utd2lkdGg9IjQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'
                      }}
                    />
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {editingProduct ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

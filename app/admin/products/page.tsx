'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useStore, CustomizationOption } from '@/lib/store'
import { useContentStore } from '@/lib/contentStore'
import { Plus, Edit, Trash2, Eye, Search, Filter, X, CheckCircle, AlertCircle, Package } from 'lucide-react'
import AdminPageHeader from '@/components/AdminPageHeader'
import MediaUpload from '@/components/MediaUpload'
import { useTranslation } from '@/lib/useTranslation'
import AdminRoute from '@/components/AdminRoute'

const ProductImagePreview = ({ src, alt, className = 'w-32 h-32 object-cover rounded-lg border border-gray-300' }: { src: string, alt: string, className?: string }) => {
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
      <div className={`${className} border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center`}>
        <Package className="w-8 h-8 text-gray-400" />
        <span className="text-xs text-gray-500 mt-1">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={actualSrc}
      alt={alt}
      className={className}
      onError={() => {
        setImageError(true)
      }}
    />
  )
}

interface ProductFormData {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  subcategory?: string
  description: string
  inStock: boolean
  // 카테고리별 특화 필드
  size?: string // 스티커, 스템프, 폰케이스용
  material?: string // 스티커, 스템프, 폰케이스용
  color?: string // 모든 카테고리용
  brand?: string // 폰케이스용 (Samsung, iPhone)
  model?: string // 폰케이스용 (Galaxy S24, iPhone 15 Pro 등)
  usage?: string // 스템프용 (personal, office, commercial, craft)
  rating?: number // 평점
  reviews?: number // 리뷰 수
  isNew?: boolean // 신상품
  isPopular?: boolean // 인기 상품
  isBestSeller?: boolean // 베스트셀러
  stockQuantity?: number
  safetyStock?: number
  incomingStock?: number
  features?: string[] // 특징들
  isHotGoods?: boolean // Market S용
  tags?: string[] // 모든 카테고리용
  hasDetailPage?: boolean // 상세 페이지 표시 여부
  detailDescription?: string // 상세 페이지 전용 상세 설명
  setItemCount?: number // SET 상품인 경우 포함된 아이템 개수 (기본값: 3)
  customizationOptions?: CustomizationOption[] // 커스터마이징 옵션
  fallbackImage?: string // 🆕 동영상 로딩 전 표시할 Fallback 이미지
  /** 스티커 시트지 수량. 가격은 3장 기준, 기본 3장. 이벤트 시 3장 이상 입력. 관리자 미설정 시 모든 커스텀 네임스티커에 적용. */
  stickerSheetQuantity?: number
}

export default function AdminProductsPage() {
  return (
    <AdminRoute requiredPermissions={['products:read']}>
      <AdminProductsPageContent />
    </AdminRoute>
  )
}

function AdminProductsPageContent() {
  const { products, addProduct, updateProduct, deleteProduct, refreshProducts, adjustProductStock, defaultPageSize } = useStore()
  const { subcategoryItems } = useContentStore()
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({})
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(defaultPageSize)

  const [formData, setFormData] = useState<ProductFormData>({
    id: '',
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: '',
    subcategory: '',
    description: '',
    inStock: true,
    size: '',
    material: '',
    color: '',
    brand: '',
    model: '',
    usage: '',
    rating: 4.5,
    reviews: 0,
    isNew: false,
    isPopular: false,
    isBestSeller: false,
    features: [],
    isHotGoods: false,
    stockQuantity: 0,
    safetyStock: 5,
    incomingStock: 0,
    tags: [],
    hasDetailPage: true, // 기본값: 상세 페이지 표시
    detailDescription: '', // 상세 페이지 전용 상세 설명
    setItemCount: 3, // SET 상품인 경우 포함된 아이템 개수 (기본값: 3)
    customizationOptions: [], // 커스터마이징 옵션
    fallbackImage: '', // 🆕 동영상 로딩 전 표시할 Fallback 이미지
    stickerSheetQuantity: 3 // 네임스티커 시트지 수량 (가격 3장 기준, 기본 3장)
  })

  const categories = [
    { value: 'All', label: t('admin.products.categories.all') },
    { value: 'Stickers', label: t('admin.products.categories.stickers'), icon: '🏷️', subcategories: ['Basic', 'Set', 'Premium', 'Office', 'Kids', 'Custom', 'Others'] },
    { value: 'Stamps', label: t('admin.products.categories.stamps'), icon: '📮', subcategories: ['Set', 'Basic', 'Self-Inking', 'Traditional', 'Embosser', 'Wax Seal', 'Others'] },
    { value: 'PhoneCases', label: t('admin.products.categories.phoneCases'), icon: '📱', subcategories: ['Samsung', 'iPhone', 'Others'] },
    { value: 'HotGoods', label: t('admin.products.categories.hotGoods'), icon: '🔥', subcategories: ['Sunscreen', 'Sunstick', 'Cool Patch', 'Lifestyle', 'Other'] }
  ]

  // 알림 표시 함수
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification({ type: 'info', message: '', show: false })
    }, 3000)
  }

  const forceCatalogSync = useCallback(async (): Promise<boolean> => {
    try {
      const { syncCatalogToServerNow } = await import('@/lib/catalogSyncScheduler')
      const snapshot = useStore.getState().products
      const result = await syncCatalogToServerNow(snapshot, 3)
      return !!result.ok
    } catch (e) {
      console.error('❌ [Product Management] force catalog sync failed:', e)
      return false
    }
  }, [])

  // 검색 및 필터링된 상품 목록
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  // 필터/정렬 변경 시 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, sortBy, sortOrder, products.length])

  // Keep admin products aligned with shared server catalog first, then local cache fallback.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const loadProductsFromLocalStorage = () => {
      try {
        const currentStore = localStorage.getItem('selpic-store')
        if (currentStore) {
          const parsed = JSON.parse(currentStore)
          if (parsed?.state?.products && Array.isArray(parsed.state.products)) {
            const storeState = useStore.getState()
            useStore.setState({ 
              ...storeState,
              products: parsed.state.products 
            })
            return true
          }
        }
      } catch (error) {
        console.error('❌ [Product Management] Failed to load products from localStorage:', error)
      }
      return false
    }

    const loadProductsFromServerCatalog = async () => {
      try {
        const res = await fetch('/api/catalog/public', { cache: 'no-store' })
        if (!res.ok) return false
        const payload = await res.json() as { success?: boolean; products?: unknown[] }
        if (!payload.success || !Array.isArray(payload.products)) return false
        const storeState = useStore.getState()
        useStore.setState({
          ...storeState,
          products: payload.products as any
        })
        return true
      } catch (error) {
        console.warn('⚠️ [Product Management] Failed to load server catalog:', error)
        return false
      }
    }

    // Local-first: admin just-saved values may be newer than server catalog.
    // Only fall back to server when local cache is empty/unavailable.
    void (async () => {
      const hasLocal = loadProductsFromLocalStorage()
      if (!hasLocal) {
        await loadProductsFromServerCatalog()
      }
      refreshProducts()
    })()

    const handleProductsUpdate = (event?: Event) => {
      const customEvent = event as CustomEvent
      const action = customEvent?.detail?.action || 'unknown'
      // Important: after add/edit/delete in admin, local store is the newest source.
      // If we fetch server immediately, stale catalog can overwrite just-saved edits
      // before debounced sync completes.
      loadProductsFromLocalStorage()
      refreshProducts()
      console.log('🔄 [Product Management] Products updated:', action)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selpic-store') {
        void (async () => {
          // localStorage changed => prefer newest local snapshot first.
          const hasLocal = loadProductsFromLocalStorage()
          if (!hasLocal) await loadProductsFromServerCatalog()
          refreshProducts()
          console.log('🔄 [Product Management] localStorage selpic-store changed, refreshing...')
        })()
      }
    }

    window.addEventListener('products-store-updated', handleProductsUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('products-store-updated', handleProductsUpdate)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [refreshProducts])

  const openModal = (product?: ProductFormData) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        ...product,
        isPopular: product.isPopular || false,
        stockQuantity: (product as any).stockQuantity ?? 0,
        safetyStock: (product as any).safetyStock ?? 5,
        incomingStock: (product as any).incomingStock ?? 0,
        hasDetailPage: (product as any).hasDetailPage ?? true,
        detailDescription: (product as any).detailDescription || '',
        setItemCount: (product as any).setItemCount ?? 3,
        customizationOptions: (product as any).customizationOptions || [],
        fallbackImage: (product as any).fallbackImage || '', // 🆕 Fallback Image
        stickerSheetQuantity: (product as any).stickerSheetQuantity ?? 3,
        rating: typeof (product as any).rating === 'number' ? (product as any).rating : 4.5,
        reviews: typeof (product as any).reviews === 'number' ? (product as any).reviews : 0
      })
    } else {
      setEditingProduct(null)
      setFormData({
        id: '',
        name: '',
        price: 0,
        originalPrice: 0,
        image: '',
        category: '',
        subcategory: '',
        description: '',
        inStock: true,
        size: '',
        material: '',
        color: '',
        brand: '',
        model: '',
        usage: '',
        rating: 4.5,
        reviews: 0,
        isNew: false,
        isPopular: false,
        isBestSeller: false,
        features: [],
        isHotGoods: false,
        stockQuantity: 0,
        safetyStock: 5,
        incomingStock: 0,
        tags: [],
        hasDetailPage: true,
        detailDescription: '',
        setItemCount: 3,
        customizationOptions: [],
        fallbackImage: '',
        stickerSheetQuantity: 3
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData({
      id: '',
      name: '',
      price: 0,
      originalPrice: 0,
      image: '',
      category: '',
      subcategory: '',
      description: '',
      inStock: true,
      size: '',
      material: '',
      color: '',
      brand: '',
      model: '',
      usage: '',
      rating: 4.5,
      reviews: 0,
        isNew: false,
        isPopular: false,
        isBestSeller: false,
      features: [],
      isHotGoods: false,
      stockQuantity: 0,
      safetyStock: 5,
      incomingStock: 0,
      tags: [],
      hasDetailPage: true,
      fallbackImage: '', // 🆕 Fallback Image 초기화
      detailDescription: '',
      customizationOptions: [],
      stickerSheetQuantity: 3
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 스티커 카테고리일 때 서브카테고리 필수 검증
    if (formData.category === 'Stickers' && !formData.subcategory) {
      showNotification('error', t('admin.products.stickerSubcategoryError'))
      return
    }
    
    // HotGoods 카테고리일 때 서브카테고리 필수 검증
    if (formData.category === 'HotGoods' && !formData.subcategory) {
      showNotification('error', t('admin.products.hotGoodsSubcategoryError'))
      return
    }
    
    
    try {
      if (editingProduct) {
        // 상품 수정
        // ✅ customizationOptions 명시적 전달 (빈 배열도 유효한 값이므로 || [] 제거)
        const updatedProduct = {
          ...formData,
          customizationOptions: Array.isArray(formData.customizationOptions) 
            ? formData.customizationOptions 
            : (formData.customizationOptions || []),
          updatedAt: new Date().toISOString() // 업데이트 시간 추가
        }
        // ✅ 디버깅: customizationOptions 확인 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [Edit Product] Updating product with customizationOptions:', {
            productId: updatedProduct.id,
            productName: updatedProduct.name,
            customizationOptionsLength: updatedProduct.customizationOptions?.length || 0,
            customizationOptions: updatedProduct.customizationOptions
          })
        }
        updateProduct(updatedProduct)
        
        // 강제 새로고침을 위해 잠시 대기 후 실행
        setTimeout(() => {
          refreshProducts()
          // localStorage 강제 새로고침
          const currentState = useStore.getState()
          localStorage.setItem('selpic-store', JSON.stringify({
            state: {
              products: currentState.products,
              _hasHydrated: true
            },
            version: 0
          }))
        }, 100)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? t('admin.products.productUpdatedSuccess').replace('{name}', formData.name)
            : `${t('admin.products.productUpdatedSuccess').replace('{name}', formData.name)} (Saved locally, server sync failed)`
        )
        
        // 상품 수정 후 홈페이지와 상품 페이지로 자동 이동
        setTimeout(() => {
          closeModal()
          if (synced) {
            // 홈페이지와 상품 페이지로 이동하여 변경사항 확인
            window.open('/', '_blank')
            window.open('/stickers', '_blank')
          }
        }, 2000)
        return
      } else {
        // 새 상품 추가
        // ✅ customizationOptions 명시적 전달 (Edit Product와 동일한 로직)
        const newProduct = {
          ...formData,
          id: Date.now().toString(), // 간단한 ID 생성
          image: formData.image || '', // ✅ image 명시적 보존
          customizationOptions: Array.isArray(formData.customizationOptions) 
            ? formData.customizationOptions 
            : (formData.customizationOptions || []),
          updatedAt: new Date().toISOString() // 업데이트 시간 추가
        }
        // ✅ 디버깅: 상품 데이터 확인 (개발 환경에서만)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [Add Product] Adding new product:', {
            productId: newProduct.id,
            productName: newProduct.name,
            image: newProduct.image,
            imageType: typeof newProduct.image,
            imageLength: newProduct.image?.length || 0,
            customizationOptionsLength: newProduct.customizationOptions?.length || 0,
            customizationOptions: newProduct.customizationOptions
          })
        }
        addProduct(newProduct)
        
        // 강제 새로고침을 위해 잠시 대기 후 실행
        setTimeout(() => {
          refreshProducts()
          // localStorage 강제 새로고침
          const currentState = useStore.getState()
          localStorage.setItem('selpic-store', JSON.stringify({
            state: {
              products: currentState.products,
              _hasHydrated: true
            },
            version: 0
          }))
        }, 100)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? t('admin.products.productAddedSuccess').replace('{name}', formData.name)
            : `${t('admin.products.productAddedSuccess').replace('{name}', formData.name)} (Saved locally, server sync failed)`
        )
        
        // 새 상품 추가 후 홈페이지와 상품 페이지로 자동 이동
        setTimeout(() => {
          closeModal()
          if (synced) {
            // 홈페이지와 상품 페이지로 이동하여 변경사항 확인
            window.open('/', '_blank')
            window.open('/stickers', '_blank')
          }
        }, 2000)
        return
      }
      
      closeModal()
    } catch (error) {
      showNotification('error', t('admin.products.saveProductError'))
      console.error('Product save error:', error)
    }
  }

  const handleDelete = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    if (confirm(t('admin.products.confirmDeleteSingle').replace('{name}', product?.name || ''))) {
      deleteProduct(productId)
      const synced = await forceCatalogSync()
      showNotification(
        synced ? 'success' : 'error',
        synced
          ? t('admin.products.productDeletedSuccess').replace('{name}', product?.name || '')
          : `${t('admin.products.productDeletedSuccess').replace('{name}', product?.name || '')} (Saved locally, server sync failed)`
      )
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : 
                  type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
      
      // 카테고리가 변경되면 서브카테고리 초기화
      if (name === 'category') {
        newData.subcategory = ''
        newData.isHotGoods = value === 'HotGoods'
      }
      
      // 스티커 시트지 수량은 최소 3
      if (name === 'stickerSheetQuantity' && typeof newData.stickerSheetQuantity === 'number' && newData.stickerSheetQuantity < 3) {
        newData.stickerSheetQuantity = 3
      }
      
      return newData
    })
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  // 커스터마이징 옵션 관리
  const addCustomizationOption = () => {
    const newOption: CustomizationOption = {
      id: `option-${Date.now()}`,
      name: '',
      type: 'text',
      required: false,
      options: []
    }
    setFormData(prev => ({
      ...prev,
      customizationOptions: [...(prev.customizationOptions || []), newOption]
    }))
  }

  const updateCustomizationOption = (index: number, field: keyof CustomizationOption, value: any) => {
    setFormData(prev => {
      const options = [...(prev.customizationOptions || [])]
      options[index] = { ...options[index], [field]: value }
      return { ...prev, customizationOptions: options }
    })
  }

  const removeCustomizationOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customizationOptions: (prev.customizationOptions || []).filter((_, i) => i !== index)
    }))
  }

  const addOptionValue = (optionIndex: number, value: string) => {
    if (!value.trim()) return
    setFormData(prev => {
      const options = [...(prev.customizationOptions || [])]
      const option = options[optionIndex]
      if (option) {
        options[optionIndex] = {
          ...option,
          options: [...(option.options || []), value.trim()]
        }
      }
      return { ...prev, customizationOptions: options }
    })
  }

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    setFormData(prev => {
      const options = [...(prev.customizationOptions || [])]
      const option = options[optionIndex]
      if (option && option.options) {
        options[optionIndex] = {
          ...option,
          options: option.options.filter((_, i) => i !== valueIndex)
        }
      }
      return { ...prev, customizationOptions: options }
    })
  }

  // 일괄 선택/해제
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleApplyStockAdjustment = (productId: string, direction: 'in' | 'out') => {
    const value = stockAdjustments[productId]
    if (!value || value === 0 || isNaN(value)) {
      showNotification('error', t('admin.products.enterQuantityToAdjust'))
      return
    }
    const delta = direction === 'in' ? Math.abs(value) : -Math.abs(value)
    adjustProductStock(productId, delta, 'Manual adjustment', 'manual')
    showNotification('success', t('admin.products.stockUpdatedSuccess'))
    setStockAdjustments(prev => ({
      ...prev,
      [productId]: 0
    }))
  }

  // 개별 상품 선택/해제
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  // 일괄 삭제
  const handleBulkDelete = () => {
    if (selectedProducts.size === 0) return
    
    if (confirm(t('admin.products.confirmBulkDeleteProducts').replace('{count}', selectedProducts.size.toString()))) {
      const deletedNames: string[] = []
      selectedProducts.forEach(productId => {
        const product = products.find(p => p.id === productId)
        if (product) {
          deletedNames.push(product.name)
          deleteProduct(productId)
        }
      })
      setSelectedProducts(new Set())
      setShowBulkActions(false)
      showNotification('success', t('admin.products.bulkDeleteSuccess').replace('{count}', deletedNames.length.toString()))
    }
  }

  // 일괄 재고 상태 변경
  const handleBulkStockChange = (inStock: boolean) => {
    if (selectedProducts.size === 0) return
    
    const action = inStock ? t('admin.products.inStockAction') : t('admin.products.outOfStockAction')
    if (confirm(t('admin.products.confirmStockChange').replace('{count}', selectedProducts.size.toString()).replace('{action}', action))) {
      let updatedCount = 0
      selectedProducts.forEach(productId => {
        const product = products.find(p => p.id === productId)
        if (product) {
          updateProduct({ ...product, inStock })
          updatedCount++
        }
      })
      setSelectedProducts(new Set())
      setShowBulkActions(false)
      showNotification('success', t('admin.products.stockStatusChanged').replace('{count}', updatedCount.toString()))
    }
  }

  // 홈페이지에서 상품 확인
  const viewProductOnHomepage = () => {
    window.open('/', '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <AdminPageHeader
        title="Product Management"
        icon={<Package className="w-6 h-6" />}
        showBackButton={true}
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />
      
      {/* 알림: 모달(z-50)보다 위에 표시 */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-lg max-w-sm ${
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 설명 */}
        <div className="mb-8">
          <p className="text-gray-600">{t('admin.products.description')}</p>
        </div>

        {/* 상품 관리 버튼들 */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('admin.products.addProduct')}
          </button>
          
          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600">
                {selectedProducts.size}{t('admin.products.selectedItems')}
              </span>
              <button
                onClick={() => handleBulkStockChange(true)}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                {t('admin.products.changeToInStock')}
              </button>
              <button
                onClick={() => handleBulkStockChange(false)}
                className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 text-sm"
              >
                {t('admin.products.changeToOutOfStock')}
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
              >
                {t('admin.products.bulkDeleteItems')}
              </button>
              <button
                onClick={() => setSelectedProducts(new Set())}
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
              >
                {t('admin.products.deselectItems')}
              </button>
            </div>
          )}
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={t('admin.products.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* {t('admin.products.categoryFilter')} */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value === 'All' ? 'all' : category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>

            {/* 정렬 기준 */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'category')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="name">{t('admin.products.sortName')}</option>
              <option value="price">{t('admin.products.sortPrice')}</option>
              <option value="category">{t('admin.products.sortCategory')}</option>
            </select>

            {/* 정렬 순서 */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="asc">{t('admin.products.ascending')}</option>
              <option value="desc">{t('admin.products.descending')}</option>
            </select>
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.products.productName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.products.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.products.price')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.products.inStock')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-16 w-16">
                          {/* 🆕 ProductImagePreview 컴포넌트 사용 (indexeddb:// 지원) */}
                          {product.image && product.image.trim() !== '' && product.image !== 'undefined' ? (
                            <ProductImagePreview 
                              src={product.image} 
                              alt={product.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                              <span className="text-xs text-gray-500 mt-1">No Image</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description}
                          </div>
                          {/* 상품 ID 표시 */}
                          <div className="mt-1">
                            <span className="text-xs text-gray-400">
                              ID: <span 
                                className="font-mono bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-200"
                                onClick={() => {
                                  navigator.clipboard.writeText(product.id)
                                  showNotification('success', t('admin.products.productIdCopied'))
                                }}
                                title={t('admin.products.clickToCopy')}
                              >
                                {product.id}
                              </span>
                            </span>
                          </div>
                          {/* 추가 정보 표시 */}
                          <div className="flex flex-wrap gap-1 mt-1">
                             {(product as any).subcategory && (
                               <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                 {(product as any).subcategory}
                               </span>
                             )}
                             {(product as any).brand && (
                               <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                 📱 {(product as any).brand}
                               </span>
                             )}
                             {(product as any).model && (
                               <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 📱 {(product as any).model}
                               </span>
                             )}
                             {(product as any).size && (
                               <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 📏 {(product as any).size}
                               </span>
                             )}
                             {(product as any).material && (
                               <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 🏷️ {(product as any).material}
                               </span>
                             )}
                             {(product as any).color && (
                               <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 🎨 {(product as any).color}
                               </span>
                             )}
                             {(product as any).usage && (
                               <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                 🎯 {(product as any).usage}
                               </span>
                             )}
                             {(product as any).isNew && (
                               <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-600 rounded">
                                 NEW
                               </span>
                             )}
                             {(product as any).isBestSeller && (
                               <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded">
                                 BEST
                               </span>
                             )}
                             {(product as any).isHotGoods && (
                               <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-600 rounded">
                                 🔥 HOT
                               </span>
                             )}
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                ((product as any).stockQuantity ?? 0) <= ((product as any).safetyStock ?? 0)
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              Stock: {(product as any).stockQuantity ?? 0}
                            </span>
                            {(product as any).incomingStock ? (
                              <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                Incoming: {(product as any).incomingStock}
                              </span>
                            ) : null}
                           </div>
                          <div className="text-xs text-gray-500">
                            Safety stock: {(product as any).safetyStock ?? 0}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.category === 'Stickers' ? 'bg-green-100 text-green-800' :
                          product.category === 'Stamps' ? 'bg-blue-100 text-blue-800' :
                          product.category === 'PhoneCases' ? 'bg-purple-100 text-purple-800' :
                          product.category === 'HotGoods' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {categories.find(cat => cat.value === product.category)?.icon} {product.category}
                        </span>
                                                 <button
                           onClick={() => {
                             if (product.category === 'Stickers') {
                               window.open('/admin/products/stickers', '_blank')
                             } else if (product.category === 'Stamps') {
                               window.open('/admin/products/stamps', '_blank')
                             } else if (product.category === 'PhoneCases') {
                               window.open('/admin/products/phonecases', '_blank')
                             } else if (product.category === 'HotGoods') {
                               window.open('/admin/products/hotgoods', '_blank')
                             } else {
                               window.open(`/admin/products/${product.category.toLowerCase()}`, '_blank')
                             }
                           }}
                           className="text-xs text-blue-600 hover:text-blue-800 underline"
                         >
                           {product.category === 'Stickers'
                             ? `${t('admin.products.categories.stickers')} ${t('admin.products.viewAllCategory')}` 
                             : product.category === 'PhoneCases'
                             ? `${t('admin.products.categories.phoneCases')} ${t('admin.products.viewAllCategory')}`
                             : product.category === 'Stamps'
                             ? `${t('admin.products.categories.stamps')} ${t('admin.products.viewAllCategory')}`
                             : product.category === 'HotGoods'
                             ? `${t('admin.products.categories.hotGoods')} ${t('admin.products.viewAllCategory')}`
                             : `${product.category} ${t('admin.products.viewAllCategory')}`} →
                         </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${product.price.toFixed(2)}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            ${product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <button
                          onClick={() => updateProduct({ ...product, inStock: !product.inStock })}
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                            product.inStock 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                          title={t('admin.products.clickToChangeStock')}
                        >
                          {product.inStock ? t('admin.products.inStock') : t('admin.products.outOfStock')}
                        </button>
                        <span className="text-xs text-gray-600 mt-1">
                          Qty: {(product as any).stockQuantity ?? 0}
                          {(product as any).incomingStock ? ` (+${(product as any).incomingStock} incoming)` : ''}
                        </span>
                        <span className="text-xs text-gray-500">
                          Safety: {(product as any).safetyStock ?? 0}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="number"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            value={stockAdjustments[product.id] ?? ''}
                            onChange={(e) =>
                              setStockAdjustments(prev => ({
                                ...prev,
                                [product.id]: Number(e.target.value)
                              }))
                            }
                            placeholder="Qty"
                          />
                          <button
                            onClick={() => handleApplyStockAdjustment(product.id, 'in')}
                            className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            + 
                          </button>
                          <button
                            onClick={() => handleApplyStockAdjustment(product.id, 'out')}
                            className="px-2 py-1 text-xs rounded bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                          >
                            –
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(product)}
                          className="text-emerald-600 hover:text-emerald-900"
                          title={t('admin.products.editProductTooltip')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                          title={t('admin.products.deleteProductTooltip')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open('/', '_blank')}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('admin.products.viewOnHomepage')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('admin.products.noSearchResults')}</p>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredProducts.length > 0 && (
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-gray-600">
              {`Total ${filteredProducts.length} items`}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Rows
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                >
                  {[10, 25, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                >
                  Prev
                </button>
                <div className="text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 상품 통계 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">{t('admin.products.totalProducts')}</div>
            <div className="text-2xl font-bold text-gray-900">{products.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">{t('admin.products.inStock')}</div>
            <div className="text-2xl font-bold text-green-600">
              {products.filter(p => p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">{t('admin.products.outOfStock')}</div>
            <div className="text-2xl font-bold text-red-600">
              {products.filter(p => !p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">{t('admin.products.averagePrice')}</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(products.reduce((sum, p) => sum + p.price, 0) / Math.max(products.length, 1)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* {t('admin.products.categoryStats')} */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.filter(cat => cat.value !== 'All').map(category => {
            const categoryProducts = products.filter(p => p.category === category.value)
            const inStockCount = categoryProducts.filter(p => p.inStock).length
            return (
              <div key={category.value} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-500">{category.label}</div>
                      <div className="text-xl font-bold text-gray-900">{categoryProducts.length}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">{t('admin.products.inStock')}</div>
                    <div className="text-lg font-semibold text-green-600">{inStockCount}</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${categoryProducts.length > 0 ? (inStockCount / categoryProducts.length) * 100 : 0}%` }}
                  ></div>
                </div>
                                 <button
                   onClick={() => {
                     if (category.value === 'Stickers') {
                       window.open('/admin/products/stickers', '_blank')
                     } else if (category.value === 'Stamps') {
                       window.open('/admin/products/stamps', '_blank')
                     } else if (category.value === 'PhoneCases') {
                       window.open('/admin/products/phonecases', '_blank')
                     } else if (category.value === 'HotGoods') {
                       window.open('/admin/products/hotgoods', '_blank')
                     } else {
                       window.open(`/admin/products/${category.value.toLowerCase()}`, '_blank')
                     }
                   }}
                   className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                 >
                   {category.icon} {category.label} {t('admin.products.viewAllCategory')}
                 </button>
              </div>
            )
          })}
        </div>

        {/* 웹 적용 안내 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-2">{t('admin.products.webApplicationComplete')}</h3>
              <p className="text-blue-700 mb-3">
                {t('admin.products.webApplicationDescription')}
              </p>
              <div className="space-y-2 text-sm text-blue-600">
                <p>✅ {t('admin.products.addProductReflected')}</p>
                <p>✅ {t('admin.products.editProductReflected')}</p>
                <p>✅ {t('admin.products.deleteProductReflected')}</p>
                <p>✅ {t('admin.products.stockChangeReflected')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* {t('admin.products.addEditProductModal')} */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct ? t('admin.products.editProduct') : t('admin.products.addProduct')}
                </h3>
                {editingProduct && formData.id && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">
                      {t('admin.products.productId')}: <span 
                        className="font-mono bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          navigator.clipboard.writeText(formData.id)
                          showNotification('success', t('admin.products.productIdCopied'))
                        }}
                        title={t('admin.products.clickToCopy')}
                      >
                        {formData.id}
                      </span>
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 상품명 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.productName')} *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={t('admin.products.productNamePlaceholder')}
                  />
                </div>

                {/* 가격 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.price')} *
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

                {/* 원가 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.originalPriceLabel')}
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

                                 {/* {t('admin.products.category')} */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     {t('admin.products.categoryFieldRequired')}
                   </label>
                   <select
                     name="category"
                     value={formData.category}
                     onChange={handleInputChange}
                     required
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                   >
                     <option value="">{t('admin.products.selectCategory')}</option>
                     {categories.filter(cat => cat.value !== 'All').map(category => (
                       <option key={category.value} value={category.value}>
                         {category.icon} {category.label}
                       </option>
                     ))}
                   </select>
                 </div>

                 {/* {t('admin.products.subcategory')} */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     {formData.category === 'Stickers' ? t('admin.products.subcategoryRequiredMark') : t('admin.products.subcategoryRequired')}
                   </label>
                   <select
                     name="subcategory"
                     value={formData.subcategory || ''}
                     onChange={handleInputChange}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                     disabled={!categories.find(cat => cat.value === formData.category)?.subcategories?.length}
                   >
                     <option value="">{t('admin.products.selectSubcategory')}</option>
                     {(() => {
                       // 카테고리 매핑: ProductFormData의 category → SubcategoryItem의 category
                       const categoryMap: Record<string, 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'> = {
                         'Stickers': 'stickers',
                         'Stamps': 'stamps',
                         'PhoneCases': 'phone-cases',
                         'HotGoods': 'hot-goods'
                       }
                       
                       const mappedCategory = categoryMap[formData.category]
                       if (!mappedCategory) return null
                       
                       // 해당 카테고리의 활성화된 서브카테고리 필터링 및 정렬
                       const availableSubcategories = subcategoryItems
                         .filter(item => item.category === mappedCategory && item.isActive)
                         .sort((a, b) => a.order - b.order)
                       
                       // 동적으로 서브카테고리 옵션 생성
                       if (availableSubcategories.length > 0) {
                         return availableSubcategories.map(subcategory => (
                           <option key={subcategory.id} value={subcategory.title}>
                             {subcategory.emoji} {subcategory.title}
                           </option>
                         ))
                       }
                       
                       // 서브카테고리가 없으면 기본 하드코딩된 옵션 표시 (하위 호환성)
                       if (formData.category === 'Stickers') {
                         return (
                           <>
                             <option value="Basic">📝 {t('admin.products.subcategoryBasic')}</option>
                             <option value="Set">📦 {t('admin.products.subcategorySet')}</option>
                             <option value="Premium">✨ {t('admin.products.subcategoryPremium')}</option>
                             <option value="Office">💼 {t('admin.products.subcategoryOffice')}</option>
                             <option value="Kids">👶 {t('admin.products.subcategoryKids')}</option>
                             <option value="Custom">🎨 {t('admin.products.subcategoryCustom')}</option>
                             <option value="Others">📌 Others</option>
                           </>
                         )
                       }
                       if (formData.category === 'PhoneCases') {
                         return (
                           <>
                             <option value="Samsung">📱 Samsung</option>
                             <option value="iPhone">📱 iPhone</option>
                             <option value="Others">📌 Others</option>
                           </>
                         )
                       }
                       if (formData.category === 'Stamps') {
                         return (
                           <>
                             <option value="Set">📦 {t('admin.products.subcategorySet')}</option>
                             <option value="Basic">📝 Basic</option>
                             <option value="Self-Inking">🖨️ Self-Inking</option>
                             <option value="Traditional">🖋️ Traditional</option>
                             <option value="Embosser">✨ Embosser</option>
                             <option value="Wax Seal">🕯️ Wax Seal</option>
                             <option value="Others">📌 Others</option>
                           </>
                         )
                       }
                       if (formData.category === 'HotGoods') {
                         return (
                           <>
                             <option value="Sunscreen">☀️ Sunscreen</option>
                             <option value="Sunstick">🧴 Sunstick</option>
                             <option value="Cool Patch">❄️ Cool Patch</option>
                             <option value="Lifestyle">🌟 Lifestyle</option>
                             <option value="Other">🔥 Other</option>
                           </>
                         )
                       }
                       return null
                     })()}
                   </select>
                   {formData.category === 'Stickers' && (
                     <p className="mt-1 text-sm text-gray-500">{t('admin.products.stickerSubcategoryNote')}</p>
                   )}
                 </div>

                {/* {t('admin.products.stockStatus')} */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={formData.inStock}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    {t('admin.products.inStock')}
                  </label>
                </div>

                {/* 이미지 업로드 */}
                <div className="md:col-span-2">
                  <MediaUpload
                    type="image"
                    currentUrl={formData.image}
                    usage="product-media"
                    onUpload={(file: File, url: string) => {
                      setFormData(prev => ({ ...prev, image: url }))
                    }}
                    onRemove={() => setFormData(prev => ({ ...prev, image: '' }))}
                  />
                </div>

                {/* 🆕 Fallback Image 업로드 (동영상 로딩 전 표시) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Image (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    동영상이 표시되기 전이나 로딩 중에 보여줄 대체 이미지입니다. ProductGallery에서 사용됩니다.
                  </p>
                  <MediaUpload
                    type="image"
                    currentUrl={formData.fallbackImage || ''}
                    usage="product-media"
                    onUpload={(file: File, url: string) => {
                      setFormData(prev => ({ ...prev, fallbackImage: url }))
                    }}
                    onRemove={() => setFormData(prev => ({ ...prev, fallbackImage: '' }))}
                  />
                </div>

                {/* 브랜드 필드 */}
                {formData.category === 'HotGoods' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.brandLabel')}
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter brand name"
                    />
                  </div>
                ) : formData.category === 'PhoneCases' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.products.brandLabel')} *
                      </label>
                      <select
                        name="brand"
                        value={formData.brand || ''}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">{t('admin.products.selectBrand')}</option>
                        <option value="Samsung">Samsung</option>
                        <option value="iPhone">iPhone</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('admin.products.modelLabel')} *
                      </label>
                      <input
                        type="text"
                        name="model"
                        value={formData.model || ''}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder={t('admin.products.modelPlaceholder')}
                      />
                    </div>
                  </>
                ) : null}

                {/* 크기/사이즈 필드 */}
                {formData.category === 'HotGoods' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.sizeLabel')}
                    </label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Enter size details (e.g., 15ml, 3 pcs set)"
                    />
                  </div>
                ) : (
                  (formData.category === 'Stickers' || formData.category === 'Stamps' || formData.category === 'PhoneCases') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.sizeLabel')}
                    </label>
                    <select
                      name="size"
                      value={formData.size || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('admin.products.selectSize')}</option>
                      {formData.category === 'Stickers' && (
                        <>
                          <option value="Small">Small (22mm x 9mm)</option>
                          <option value="Medium">Medium (30mm x 13mm)</option>
                          <option value="Large">Large (46mm x 15mm)</option>
                          <option value="Extra Large">Extra Large (45mm x 21mm)</option>
                          <option value="Round">Round (28mm)</option>
                          <option value="Custom">Custom Size</option>
                        </>
                      )}
                      {formData.category === 'Stamps' && (
                        <>
                          <option value="Small">Small (2cm x 2cm)</option>
                          <option value="Medium">Medium (3cm x 3cm)</option>
                          <option value="Large">Large (5cm x 5cm)</option>
                          <option value="Custom">Custom Size</option>
                        </>
                      )}
                      {formData.category === 'PhoneCases' && (
                        <>
                          <option value="Small">Small</option>
                          <option value="Medium">Medium</option>
                          <option value="Large">Large</option>
                          <option value="Custom">Custom</option>
                        </>
                      )}
                    </select>
                  </div>
                  )
                )}

                {/* 스템프 특화 필드 */}
                {formData.category === 'Stamps' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.usageLabel')}
                    </label>
                    <select
                      name="usage"
                      value={formData.usage || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('admin.products.selectUsage')}</option>
                      <option value="personal">{t('admin.products.usagePersonal')}</option>
                      <option value="office">{t('admin.products.usageOffice')}</option>
                      <option value="commercial">{t('admin.products.usageCommercial')}</option>
                      <option value="craft">{t('admin.products.usageCraft')}</option>
                    </select>
                  </div>
                )}

                {/* 재질 필드 */}
                {(formData.category === 'Stickers' || formData.category === 'Stamps' || formData.category === 'PhoneCases') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.materialLabel')}
                    </label>
                    <select
                      name="material"
                      value={formData.material || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">{t('admin.products.selectMaterial')}</option>
                      {formData.category === 'Stickers' && (
                        <>
                          <option value="Vinyl">Vinyl ({t('admin.products.materialDurable')})</option>
                          <option value="Paper">Paper ({t('admin.products.materialStandard')})</option>
                          <option value="Waterproof PP">Waterproof PP</option>
                        </>
                      )}
                      {formData.category === 'Stamps' && (
                        <>
                          <option value="rubber">{t('admin.products.materialRubber')}</option>
                          <option value="wood">{t('admin.products.materialWood')}</option>
                          <option value="metal">{t('admin.products.materialMetal')}</option>
                          <option value="acrylic">{t('admin.products.materialAcrylic')}</option>
                        </>
                      )}
                      {formData.category === 'PhoneCases' && (
                        <>
                          <option value="silicone">{t('admin.products.materialSilicone')}</option>
                          <option value="tpu">TPU</option>
                          <option value="leather">{t('admin.products.materialLeather')}</option>
                          <option value="carbon">{t('admin.products.materialCarbon')}</option>
                          <option value="wood">{t('admin.products.materialWoodCase')}</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* 색상 필드 · 스티커 시트지 수량(Stickers일 때만) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.colorLabel')}
                  </label>
                  <select
                    name="color"
                    value={formData.color || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">{t('admin.products.selectColor')}</option>
                    <option value="White">White</option>
                    <option value="Black">Black</option>
                    <option value="Red">Red</option>
                    <option value="Blue">Blue</option>
                    <option value="Green">Green</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Pink">Pink</option>
                    <option value="Purple">Purple</option>
                    <option value="Brown">Brown</option>
                    <option value="Clear">Clear</option>
                    <option value="Transparent">Transparent</option>
                    <option value="Carbon">Carbon</option>
                    <option value="Walnut">Walnut</option>
                    <option value="Multi">Multi Color</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* 스티커 시트지 수량: Stickers 카테고리일 때 Color 오른쪽에 표시. 가격 3장 기준, 기본 3장, 이벤트 시 3장 이상. */}
                {formData.category === 'Stickers' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.stickerSheetQuantityLabel')}
                    </label>
                    <input
                      type="number"
                      name="stickerSheetQuantity"
                      value={formData.stickerSheetQuantity ?? 3}
                      onChange={handleInputChange}
                      min={3}
                      step={1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('admin.products.stickerSheetQuantityHelp')}</p>
                  </div>
                )}

                {/* 재고 설정 */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.stockQuantityLabel')}
                    </label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity ?? 0}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.safetyStockLabel')}
                    </label>
                    <input
                      type="number"
                      name="safetyStock"
                      value={formData.safetyStock ?? 0}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.incomingStockLabel')}
                    </label>
                    <input
                      type="number"
                      name="incomingStock"
                      value={formData.incomingStock ?? 0}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 평점 및 리뷰 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.ratingLabel')}
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
                      {t('admin.products.reviewsLabel')}
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

                {/* 상세 페이지 옵션 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasDetailPage"
                    checked={formData.hasDetailPage ?? true}
                    onChange={(e) => setFormData({ ...formData, hasDetailPage: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="hasDetailPage" className="ml-2 text-sm font-medium text-gray-700">
                    {t('admin.products.detailPageDisplay')}
                  </label>
                </div>

                {/* 상품 상태 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isNew"
                      checked={formData.isNew || false}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      {t('admin.products.isNewLabel')}
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
                      {t('admin.products.isBestSellerLabel')}
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
                      {t('admin.products.isPopularLabel')}
                    </label>
                  </div>
                </div>

                {/* 상품 설명 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('admin.products.productDescription')} * {t('admin.products.productDescriptionNote')}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={t('admin.products.descriptionPlaceholder')}
                  />
                </div>

                {/* 커스터마이징 옵션 관리 */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('admin.products.customizationOptionsTitle')}
                    </label>
                    <button
                      type="button"
                      onClick={addCustomizationOption}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      <span>{t('admin.products.addOption')}</span>
                    </button>
                  </div>
                  
                  {formData.customizationOptions && formData.customizationOptions.length > 0 ? (
                    <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                      {formData.customizationOptions.map((option, index) => (
                        <div key={option.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">{t('admin.products.option')} {index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => removeCustomizationOption(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* 옵션 이름 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {t('admin.products.optionName')} *
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateCustomizationOption(index, 'name', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder={t('admin.products.customizationOptionsPlaceholder')}
                              />
                            </div>
                            
                            {/* 옵션 타입 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {t('admin.products.optionType')} *
                              </label>
                              <select
                                value={option.type}
                                onChange={(e) => updateCustomizationOption(index, 'type', e.target.value as 'text' | 'color' | 'size' | 'image')}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                              >
                                <option value="text">Text</option>
                                <option value="color">{t('admin.products.customizationOptionTypeColor')}</option>
                                <option value="size">{t('admin.products.customizationOptionTypeSize')}</option>
                                <option value="image">{t('admin.products.customizationOptionTypeImage')}</option>
                              </select>
                              {/* 타입별 안내 텍스트 */}
                              <p className="mt-1 text-xs text-gray-500">
                                {option.type === 'text' && '자유 입력 또는 선택지 목록 추가 가능'}
                                {option.type === 'color' && '색상 선택지 목록 필요'}
                                {option.type === 'size' && '크기 선택지 목록 필요'}
                                {option.type === 'image' && '고객이 이미지를 업로드할 수 있는 옵션'}
                              </p>
                            </div>
                            
                            {/* 필수 여부 */}
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={option.required}
                                onChange={(e) => updateCustomizationOption(index, 'required', e.target.checked)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              />
                              <label className="ml-2 text-xs text-gray-700">{t('admin.products.requiredOption')}</label>
                            </div>
                            
                            {/* 추가 가격 */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {t('admin.products.additionalPrice')}
                              </label>
                              <input
                                type="number"
                                value={option.price || ''}
                                onChange={(e) => updateCustomizationOption(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          
                          {/* 옵션 값 (color, size 타입 또는 text 타입에서 선택지가 필요한 경우) */}
                          {(option.type === 'color' || option.type === 'size' || option.type === 'text') && (
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-600 mb-2">
                                {option.type === 'text' 
                                  ? '선택 가능한 값들 (비워두면 자유 입력)' 
                                  : '선택 가능한 값들'}
                              </label>
                              {option.options && option.options.length > 0 ? (
                                <>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {option.options.map((value, valueIndex) => (
                                      <span
                                        key={valueIndex}
                                        className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                      >
                                        <span>{value}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeOptionValue(index, valueIndex)}
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          <X size={12} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex space-x-2">
                                    <input
                                      type="text"
                                      placeholder={option.type === 'text' ? '새 선택지 입력 후 Enter (예: Normal, Bold, Italic)' : '새 값 입력 후 Enter'}
                                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          const input = e.currentTarget
                                          if (input.value.trim()) {
                                            addOptionValue(index, input.value.trim())
                                            input.value = ''
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                        if (input && input.value.trim()) {
                                          addOptionValue(index, input.value.trim())
                                          input.value = ''
                                        }
                                      }}
                                      className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                      추가
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-xs text-gray-500 mb-2">
                                    {option.type === 'text' 
                                      ? '선택지를 추가하지 않으면 고객이 자유롭게 텍스트를 입력할 수 있습니다.'
                                      : '선택 가능한 값들을 추가해주세요.'}
                                  </p>
                                  <div className="flex space-x-2">
                                    <input
                                      type="text"
                                      placeholder={option.type === 'text' ? '새 선택지 입력 후 Enter (예: Normal, Bold, Italic)' : '새 값 입력 후 Enter'}
                                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          const input = e.currentTarget
                                          if (input.value.trim()) {
                                            addOptionValue(index, input.value.trim())
                                            input.value = ''
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                                        if (input && input.value.trim()) {
                                          addOptionValue(index, input.value.trim())
                                          input.value = ''
                                        }
                                      }}
                                      className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                                    >
                                      추가
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
                      {t('admin.products.noCustomizationOptions')}
                    </div>
                  )}
                </div>
              </div>

                {/* SET 상품 아이템 개수 (Stickers 또는 Stamps 카테고리이고 subcategory가 Set인 경우) */}
                {(formData.category === 'Stickers' || formData.category === 'Stamps') && formData.subcategory === 'Set' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('admin.products.setItemCountLabel')}
                    </label>
                    <input
                      type="number"
                      name="setItemCount"
                      value={formData.setItemCount ?? 3}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="3"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      {t('admin.products.setItemCountDescription')}
                    </p>
                  </div>
                )}


                {/* 상세 페이지 전용 상세 설명 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('admin.products.detailDescriptionLabel')}
                </label>
                <textarea
                  name="detailDescription"
                  value={formData.detailDescription || ''}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={t('admin.products.detailDescriptionPlaceholder')}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('admin.products.detailDescriptionNote')}
                </p>
              </div>

              {/* 미리보기 */}
              {formData.image && formData.image.trim() !== '' && formData.image !== 'undefined' ? (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">{t('admin.products.imagePreview')}</h4>
                  <ProductImagePreview src={formData.image} alt={t('admin.products.preview')} />
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">{t('admin.products.imagePreview')}</h4>
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">No Image</span>
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {t('admin.products.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {editingProduct ? t('admin.products.edit') : t('admin.products.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, Search, X } from 'lucide-react'
import { useStore, Product, BundleItem } from '@/lib/store'
import ProductImageUpload from '@/components/ProductImageUpload'

interface BundleManagerProps {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function BundleManager({ showNotification }: BundleManagerProps) {
  const { products, addProduct, updateProduct, deleteProduct } = useStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    description: '',
    bundleItems: [] as BundleItem[],
    inStock: true,
    stockQuantity: 0,
    safetyStock: 5,
    incomingStock: 0,
    hasDetailPage: true,
    detailDescription: ''
  })

  // Bundle 상품만 필터링
  const bundleProducts = products.filter(p => p.isBundle === true || p.category === 'Bundle')

  // ID가 없는 Bundle 상품 자동 수정 (페이지 로드 시 한 번만 실행)
  useEffect(() => {
    const bundlesWithoutId = bundleProducts.filter(bundle => !bundle.id || bundle.id.trim() === '')
    
    if (bundlesWithoutId.length > 0) {
      console.log(`🔧 Found ${bundlesWithoutId.length} Bundle products without IDs. Auto-generating IDs...`)
      
      bundlesWithoutId.forEach((bundle, index) => {
        const newId = `bundle-${Date.now()}-${index}`
        updateProduct({
          ...bundle,
          id: newId
        })
        console.log(`✅ Generated ID "${newId}" for bundle: ${bundle.name}`)
      })
      
      showNotification('info', `Auto-generated IDs for ${bundlesWithoutId.length} Bundle product(s).`)
    }
  }, []) // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  // 검색 필터링
  const filteredBundles = bundleProducts.filter(bundle =>
    bundle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bundle.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openModal = (bundle?: Product) => {
    if (bundle) {
      setEditingBundle(bundle)
      setFormData({
        name: bundle.name,
        price: bundle.price,
        originalPrice: bundle.originalPrice || 0,
        image: bundle.image,
        description: bundle.description,
        bundleItems: (bundle.bundleItems || []) as BundleItem[],
        inStock: bundle.inStock,
        stockQuantity: (bundle as any).stockQuantity || 0,
        safetyStock: (bundle as any).safetyStock || 5,
        incomingStock: (bundle as any).incomingStock || 0,
        hasDetailPage: (bundle as any).hasDetailPage !== false,
        detailDescription: (bundle as any).detailDescription || ''
      })
    } else {
      setEditingBundle(null)
      setFormData({
        name: '',
        price: 0,
        originalPrice: 0,
        image: '',
        description: '',
        bundleItems: [],
        inStock: true,
        stockQuantity: 0,
        safetyStock: 5,
        incomingStock: 0,
        hasDetailPage: true,
        detailDescription: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingBundle(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      showNotification('error', 'Please enter a product name.')
      return
    }

    if (formData.price <= 0) {
      showNotification('error', 'Please enter a price.')
      return
    }

    if (!formData.image) {
      showNotification('error', 'Please upload an image.')
      return
    }

    if (formData.bundleItems.length === 0) {
      showNotification('error', 'Please select at least 1 product.')
      return
    }

    try {
      const bundleData: Partial<Product> = {
        name: formData.name,
        price: formData.price,
        originalPrice: formData.originalPrice > 0 ? formData.originalPrice : undefined,
        image: formData.image,
        description: formData.description,
        category: 'Bundle',
        bundleItems: formData.bundleItems,
        isBundle: true,
        inStock: formData.inStock,
        stockQuantity: formData.stockQuantity,
        safetyStock: formData.safetyStock,
        incomingStock: formData.incomingStock,
        hasDetailPage: formData.hasDetailPage,
        detailDescription: formData.detailDescription || undefined,
        customizationOptions: [] // Bundle 상품은 커스터마이징 옵션 없음
      }

      if (editingBundle) {
        updateProduct({
          ...editingBundle,
          ...bundleData
        })
        showNotification('success', 'Event Bundle has been updated.')
      } else {
        // 새 Event Bundle 추가 시 ID 생성
        const newBundle: Product = {
          ...bundleData,
          id: `bundle-${Date.now()}`,
        } as Product
        addProduct(newBundle)
        showNotification('success', 'Event Bundle has been registered.')
      }

      closeModal()
    } catch (error) {
      console.error('Bundle save error:', error)
      showNotification('error', 'An error occurred while saving the Event Bundle.')
    }
  }

  const handleDelete = (bundle: Product) => {
    if (confirm(`Are you sure you want to delete the Event Bundle "${bundle.name}"?`)) {
      deleteProduct(bundle.id)
      showNotification('success', 'Event Bundle has been deleted.')
    }
  }

  const toggleBundleItem = (product: Product) => {
    const isSelected = formData.bundleItems.some(
      item => item.productId === product.id && item.category === product.category
    )

    if (isSelected) {
      setFormData({
        ...formData,
        bundleItems: formData.bundleItems.filter(
          item => !(item.productId === product.id && item.category === product.category)
        )
      })
    } else {
      setFormData({
        ...formData,
        bundleItems: [
          ...formData.bundleItems,
          {
            productId: product.id,
            category: product.category as 'Stickers' | 'Stamps' | 'PhoneCases' | 'HotGoods',
            name: product.name,
            image: product.image
          }
        ]
      })
    }
  }

  // 일반 상품 목록 (Bundle 및 SET 상품 제외)
  const availableProducts = products.filter(
    p => (p.category === 'Stickers' || p.category === 'Stamps' || p.category === 'PhoneCases' || p.category === 'HotGoods') 
      && !p.isBundle 
      && p.subcategory !== 'Set'
  )

  const stickers = availableProducts.filter(p => p.category === 'Stickers')
  const stamps = availableProducts.filter(p => p.category === 'Stamps')
  const phoneCases = availableProducts.filter(p => p.category === 'PhoneCases')
  const hotGoods = availableProducts.filter(p => p.category === 'HotGoods')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Event Bundle Management
          </h2>
          <p className="text-gray-600 mt-1">Register and manage event Bundle products.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Event Bundle
        </button>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search Event Bundle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Bundle 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBundles.map((bundle, index) => (
          <div key={bundle.id || `bundle-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative aspect-video">
              <img src={bundle.image} alt={bundle.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">Bundle</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{bundle.name}</h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{bundle.description}</p>
              {/* Product ID display */}
              <div className="mb-2">
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Product ID:</span>{' '}
                  <span 
                    className="font-mono bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      navigator.clipboard.writeText(bundle.id)
                      showNotification('success', 'Product ID copied to clipboard.')
                    }}
                    title="Click to copy"
                  >
                    {bundle.id}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-red-600">${bundle.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">
                  {bundle.bundleItems?.length || 0} items included
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(bundle)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(bundle)}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBundles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No Event Bundle registered.</p>
        </div>
      )}

      {/* 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBundle ? 'Edit Event Bundle' : 'Add Event Bundle'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Original Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalPrice}
                    onChange={(e) => setFormData({ ...formData, originalPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image <span className="text-red-500">*</span>
                </label>
                <ProductImageUpload
                  currentImage={formData.image}
                  onImageChange={(image) => setFormData({ ...formData, image })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Product Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Products to Include <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select products to include in the event. (At least 1 required)
                </p>

                <div className="space-y-4 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {/* Stickers */}
                  {stickers.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">🏷️ Stickers</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {stickers.map(product => {
                          const isSelected = formData.bundleItems.some(
                            item => item.productId === product.id && item.category === 'Stickers'
                          )
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleBundleItem(product)}
                              className={`p-2 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded mb-1" />
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-600">${product.price.toFixed(2)}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stamps */}
                  {stamps.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">📮 Stamps</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {stamps.map(product => {
                          const isSelected = formData.bundleItems.some(
                            item => item.productId === product.id && item.category === 'Stamps'
                          )
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleBundleItem(product)}
                              className={`p-2 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded mb-1" />
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-600">${product.price.toFixed(2)}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Phone Cases */}
                  {phoneCases.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">📱 Phone Cases</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {phoneCases.map(product => {
                          const isSelected = formData.bundleItems.some(
                            item => item.productId === product.id && item.category === 'PhoneCases'
                          )
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleBundleItem(product)}
                              className={`p-2 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded mb-1" />
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-600">${product.price.toFixed(2)}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Market S (Hot Goods) */}
                  {hotGoods.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">🔥 Market S</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {hotGoods.map(product => {
                          const isSelected = formData.bundleItems.some(
                            item => item.productId === product.id && item.category === 'HotGoods'
                          )
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => toggleBundleItem(product)}
                              className={`p-2 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img src={product.image} alt={product.name} className="w-full h-16 object-cover rounded mb-1" />
                              <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-600">${product.price.toFixed(2)}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <p className="mt-2 text-sm text-gray-600">
                  Selected Products: <span className="font-semibold">{formData.bundleItems.length} items</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  {editingBundle ? 'Save' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


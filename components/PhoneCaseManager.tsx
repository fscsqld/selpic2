'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Plus, Edit, Trash2, Eye, X, CheckCircle, AlertCircle } from 'lucide-react'
import ProductImageUpload from '@/components/ProductImageUpload'
import { useTranslation } from '@/lib/useTranslation'

interface PhoneCaseFormData {
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
  brand?: string
  model?: string
  rating?: number
  reviews?: number
  isNew?: boolean
  isPopular?: boolean
  isBestSeller?: boolean
  stockQuantity?: number
  safetyStock?: number
  incomingStock?: number
  features?: string[]
  tags?: string[]
  hasDetailPage?: boolean
  detailDescription?: string
}

export default function PhoneCaseManager() {
  const { products, addProduct, updateProduct, deleteProduct, adjustProductStock, refreshProducts } = useStore()
  const { t } = useTranslation()
  
  // 폰케이스 상품만 필터링
  const phoneCaseProducts = products.filter(product => product.category === 'PhoneCases')
  
  // Subcategory list
  const subcategories = [
    { value: 'all', label: 'All', icon: '📱' },
    { value: 'iPhone', label: 'iPhone', icon: '🍎' },
    { value: 'Samsung', label: 'Samsung', icon: '📱' }
  ]
  
  const [selectedSubcategory, setSelectedSubcategory] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<PhoneCaseFormData | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({})

  const [formData, setFormData] = useState<PhoneCaseFormData>({
    id: '',
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: 'PhoneCases',
    subcategory: '',
    description: '',
    inStock: true,
    size: '',
    material: '',
    color: '',
    brand: '',
    model: '',
    rating: 4.5,
    reviews: 0,
    isNew: false,
    isPopular: false,
    isBestSeller: false,
    stockQuantity: 0,
    safetyStock: 5,
    incomingStock: 0,
    features: [],
    tags: [],
    hasDetailPage: true,
    detailDescription: ''
  })
  
  // 서브카테고리별 필터링
  const filteredProducts = selectedSubcategory === 'all' 
    ? phoneCaseProducts 
    : phoneCaseProducts.filter(product => product.subcategory === selectedSubcategory)

  // 알림 표시 함수
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification({ type: 'info', message: '', show: false })
    }, 3000)
  }

  // 모달 열기
  const openModal = (product?: any) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        ...product,
        originalPrice: product.originalPrice || 0,
        size: product.size || '',
        material: product.material || '',
        color: product.color || '',
        brand: product.brand || '',
        model: product.model || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        isNew: product.isNew || false,
        isPopular: product.isPopular || false,
        isBestSeller: product.isBestSeller || false,
        stockQuantity: (product as any).stockQuantity ?? 0,
        safetyStock: (product as any).safetyStock ?? 5,
        incomingStock: (product as any).incomingStock ?? 0,
        hasDetailPage: (product as any).hasDetailPage ?? true,
        detailDescription: (product as any).detailDescription || '',
        features: product.features || [],
        tags: product.tags || []
      })
    } else {
      setEditingProduct(null)
      setFormData({
        id: '',
        name: '',
        price: 0,
        originalPrice: 0,
        image: '',
        category: 'PhoneCases',
        subcategory: selectedSubcategory !== 'all' ? selectedSubcategory : '',
        description: '',
        inStock: true,
        size: '',
        material: '',
        color: '',
        brand: selectedSubcategory !== 'all' ? selectedSubcategory : '',
        model: '',
        rating: 4.5,
        reviews: 0,
        isNew: false,
        isPopular: false,
        isBestSeller: false,
        stockQuantity: 0,
        safetyStock: 5,
        incomingStock: 0,
        hasDetailPage: true,
        detailDescription: '',
        features: [],
        tags: []
      })
    }
    setIsModalOpen(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData({
      id: '',
      name: '',
      price: 0,
      originalPrice: 0,
      image: '',
      category: 'PhoneCases',
      subcategory: '',
      description: '',
      inStock: true,
      size: '',
      material: '',
      color: '',
      brand: '',
      model: '',
      rating: 4.5,
      reviews: 0,
      isNew: false,
      isPopular: false,
      isBestSeller: false,
      stockQuantity: 0,
      safetyStock: 5,
      incomingStock: 0,
      hasDetailPage: true,
      detailDescription: '',
      features: [],
      tags: []
    })
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subcategory || !formData.brand) {
      showNotification('error', 'Please select a brand (iPhone/Samsung).')
      return
    }
    
    if (!formData.model) {
      showNotification('error', 'Please enter a model.')
      return
    }
    
    try {
      if (editingProduct) {
        // 상품 수정
        const updatedProduct = {
          ...formData,
          customizationOptions: (editingProduct as any).customizationOptions || [],
          updatedAt: new Date().toISOString()
        }
        updateProduct(updatedProduct)
        
        setTimeout(() => {
          refreshProducts()
        }, 100)
        
        showNotification('success', `"${formData.name}" phone case updated successfully!`)
      } else {
        // 새 상품 추가
        const newProduct = {
          ...formData,
          id: Date.now().toString(),
          customizationOptions: [],
          updatedAt: new Date().toISOString()
        }
        addProduct(newProduct)
        
        setTimeout(() => {
          refreshProducts()
        }, 100)
        
        showNotification('success', `"${formData.name}" phone case added successfully!`)
      }
      
      setTimeout(() => {
        closeModal()
      }, 2000)
    } catch (error) {
      showNotification('error', 'An error occurred while saving.')
      console.error('Product save error:', error)
    }
  }

  // 상품 삭제
  const handleDelete = (productId: string) => {
    const product = phoneCaseProducts.find(p => p.id === productId)
    if (confirm(`Are you sure you want to delete "${product?.name}" phone case?`)) {
      deleteProduct(productId)
      showNotification('success', `"${product?.name}" phone case deleted successfully.`)
    }
  }

  // 입력 필드 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : 
                type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  // 체크박스 변경 처리
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  // 재고 조정 처리
  const handleApplyStockAdjustment = (productId: string, direction: 'in' | 'out') => {
    const value = stockAdjustments[productId]
    if (!value || value === 0 || isNaN(value)) {
      showNotification('error', 'Enter a quantity to adjust.')
      return
    }
    const delta = direction === 'in' ? Math.abs(value) : -Math.abs(value)
    adjustProductStock(productId, delta, 'Manual adjustment', 'manual')
    showNotification('success', 'Stock updated successfully.')
    setStockAdjustments(prev => ({
      ...prev,
      [productId]: 0
    }))
  }

  return (
    <div className="space-y-6">
      {/* 알림 */}
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

      {/* Phone case management buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Phone Case
        </button>
      </div>

      {/* Subcategory filter */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter by Brand</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {subcategories.map((subcategory) => (
            <button
              key={subcategory.value}
              onClick={() => setSelectedSubcategory(subcategory.value)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedSubcategory === subcategory.value
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{subcategory.icon}</div>
                <div className="font-medium">{subcategory.label}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {subcategory.value === 'all' 
                    ? `${phoneCaseProducts.length} products`
                    : `${phoneCaseProducts.filter(p => p.subcategory === subcategory.value).length} products`
                  }
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Total Phone Cases</div>
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
          <div className="text-sm font-medium text-gray-500">Low Stock Items</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredProducts.filter(p => {
              const stockQty = (p as any).stockQuantity ?? 0
              const safety = (p as any).safetyStock ?? 0
              return stockQty > 0 && stockQty <= safety
            }).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Average Price</div>
          <div className="text-2xl font-bold text-gray-900">
            ${(filteredProducts.reduce((sum, p) => sum + p.price, 0) / Math.max(filteredProducts.length, 1)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          📱 {selectedSubcategory === 'all' ? 'All' : subcategories.find(s => s.value === selectedSubcategory)?.label} Phone Cases
        </h2>
        {filteredProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {selectedSubcategory === 'all' 
              ? 'No phone cases registered.' 
              : `No ${subcategories.find(s => s.value === selectedSubcategory)?.label} phone cases registered.`
            }
          </p>
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
                    <div className="flex space-x-1 mt-1 flex-wrap">
                      {product.subcategory && (
                        <span className={`inline-flex px-2 py-1 text-xs rounded ${
                          product.subcategory === 'iPhone' 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {product.subcategory === 'iPhone' ? '🍎' : '📱'} {product.subcategory}
                        </span>
                      )}
                      {(product as any).model && (
                        <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          📱 {(product as any).model}
                        </span>
                      )}
                      {(product as any).material && (
                        <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          🏷️ {(product as any).material}
                        </span>
                      )}
                      {(product as any).color && (
                        <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${
                        ((product as any).stockQuantity ?? 0) <= ((product as any).safetyStock ?? 0)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        Stock: {(product as any).stockQuantity ?? 0}
                      </span>
                      {(product as any).incomingStock ? (
                        <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          Incoming: {(product as any).incomingStock}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Safety stock: {(product as any).safetyStock ?? 0}
                    </div>
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
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openModal(product)}
                      className="text-purple-600 hover:text-purple-900 p-1"
                      title="Edit Phone Case"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete Phone Case"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open('/', '_blank')}
                      className="text-gray-600 hover:text-gray-900 p-1"
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

      {/* Phone case add/edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProduct ? 'Edit Phone Case' : 'Add New Phone Case'}
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
                    Phone Case Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter phone case name"
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

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand *
                  </label>
                  <select
                    name="brand"
                    value={formData.brand || ''}
                    onChange={(e) => {
                      handleInputChange(e)
                      // Update subcategory field simultaneously
                      setFormData(prev => ({ ...prev, subcategory: e.target.value }))
                    }}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select Brand</option>
                    <option value="Samsung">Samsung</option>
                    <option value="iPhone">iPhone</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={formData.brand === 'iPhone' ? 'iPhone 15 Pro Max' : 'Galaxy S24 Ultra'}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Size
                  </label>
                  <select
                    name="size"
                    value={formData.size || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* Material */}
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
                    <option value="Silicone">Silicone</option>
                    <option value="TPU">TPU</option>
                    <option value="Leather">Leather</option>
                    <option value="Carbon">Carbon</option>
                    <option value="Wood">Wood</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <select
                    name="color"
                    value={formData.color || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select Color</option>
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

                {/* 이미지 업로드 */}
                <div className="md:col-span-2">
                  <ProductImageUpload
                    currentImage={formData.image}
                    onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, image: imageUrl }))}
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

                {/* 재고 설정 */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity
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
                      Safety Stock
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
                      Incoming Stock
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
                    상세 페이지 표시 (이미지 클릭 시 상세 페이지로 이동)
                  </label>
                </div>

                {/* Product status */}
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

                {/* Product description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Description * (목록 페이지에 표시되는 간단한 설명)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Enter detailed description of the phone case"
                  />
                </div>
              </div>

              {/* 상세 페이지 전용 상세 설명 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상세 페이지 설명 (상세 페이지에서만 표시되는 자세한 설명)
                </label>
                <textarea
                  name="detailDescription"
                  value={formData.detailDescription || ''}
                  onChange={handleInputChange}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="상세 페이지에서 고객에게 보여줄 자세한 상품 설명을 입력하세요.&#10;예: 제품의 특징, 사용 방법, 주의사항, 배송 정보 등을 포함할 수 있습니다."
                />
                <p className="mt-2 text-xs text-gray-500">
                  * 이 설명은 상세 페이지에서만 표시됩니다. 목록 페이지에는 기본 설명이 표시됩니다.
                </p>
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
  )
}

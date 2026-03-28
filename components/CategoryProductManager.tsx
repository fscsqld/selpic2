'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { Plus, Edit, Trash2, Eye, X, CheckCircle, AlertCircle } from 'lucide-react'
import ProductImageUpload from '@/components/ProductImageUpload'

interface CategoryProductManagerProps {
  categoryName: string
  categoryValue: string
  categoryIcon: string
  categoryColor: string
  specialFields?: {
    subcategories?: { value: string; label: string; icon: string }[]
    sizes?: { value: string; label: string }[]
    materials?: { value: string; label: string }[]
    colors?: { value: string; label: string }[]
    brands?: { value: string; label: string }[]
    usages?: { value: string; label: string }[]
  }
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
  size?: string
  material?: string
  color?: string
  brand?: string
  model?: string
  usage?: string
  rating?: number
  reviews?: number
  isNew?: boolean
  isPopular?: boolean
  isBestSeller?: boolean
  isHotGoods?: boolean
  stockQuantity?: number
  safetyStock?: number
  incomingStock?: number
  features?: string[]
  tags?: string[]
  hasDetailPage?: boolean // 상세 페이지 표시 여부
  detailDescription?: string // 상세 페이지 전용 상세 설명
}

export default function CategoryProductManager({
  categoryName,
  categoryValue,
  categoryIcon,
  categoryColor,
  specialFields = {}
}: CategoryProductManagerProps) {
  const { products, addProduct, updateProduct, deleteProduct, adjustProductStock } = useStore()
  
  // 해당 카테고리 상품만 필터링
  const categoryProducts = products.filter(product => product.category === categoryValue)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })

  const [formData, setFormData] = useState<ProductFormData>({
    id: '',
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: categoryValue,
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
    isHotGoods: categoryValue === 'HotGoods',
    stockQuantity: 0,
    safetyStock: 5,
    incomingStock: 0,
    features: [],
    tags: [],
    hasDetailPage: true, // 기본값: 상세 페이지 표시
    detailDescription: '' // 상세 페이지 전용 상세 설명
  })
  const [stockAdjustments, setStockAdjustments] = useState<Record<string, number>>({})

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
        usage: product.usage || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        isNew: product.isNew || false,
        isPopular: product.isPopular || false,
        isBestSeller: product.isBestSeller || false,
        isHotGoods: product.isHotGoods || (categoryValue === 'HotGoods'),
        stockQuantity: (product as any).stockQuantity ?? 0,
        safetyStock: (product as any).safetyStock ?? 5,
        incomingStock: (product as any).incomingStock ?? 0,
        features: product.features || [],
        tags: product.tags || [],
        hasDetailPage: (product as any).hasDetailPage ?? true,
        detailDescription: (product as any).detailDescription || ''
      })
    } else {
      setEditingProduct(null)
      setFormData({
        id: '',
        name: '',
        price: 0,
        originalPrice: 0,
        image: '',
        category: categoryValue,
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
        isHotGoods: categoryValue === 'HotGoods',
        stockQuantity: 0,
        safetyStock: 5,
        incomingStock: 0,
        features: [],
        tags: [],
        hasDetailPage: true,
        detailDescription: ''
      })
    }
    setIsModalOpen(true)
  }

  // 모달 닫기
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // HotGoods 카테고리일 때 서브카테고리 필수 검증
    if (categoryValue === 'HotGoods' && !formData.subcategory) {
      showNotification('error', 'Please select a subcategory for Market S products.')
      return
    }
    
    try {
      const finalFormData = {
        ...formData,
        isHotGoods:
          categoryValue === 'HotGoods'
            ? true
            : (formData.isHotGoods || false)
      }
      
      console.log('💾 CategoryProductManager - Saving product:', {
        categoryValue,
        isHotGoods: finalFormData.isHotGoods,
        category: finalFormData.category,
        name: finalFormData.name
      })
      
      if (editingProduct) {
        // 상품 수정
        const updatedProduct = {
          ...finalFormData,
          customizationOptions: editingProduct.customizationOptions || [],
          updatedAt: new Date()
        }
        console.log('💾 Updating product:', updatedProduct)
        updateProduct(updatedProduct)
        showNotification('success', `"${formData.name}" ${categoryName} updated successfully!`)
      } else {
        // 새 상품 추가
        const newProduct = {
          ...finalFormData,
          id: Date.now().toString(),
          customizationOptions: [],
          updatedAt: new Date()
        }
        console.log('💾 Adding new product:', newProduct)
        addProduct(newProduct)
        showNotification('success', `"${formData.name}" ${categoryName} added successfully!`)
      }
      
      closeModal()
    } catch (error) {
      showNotification('error', 'An error occurred while saving.')
      console.error('Product save error:', error)
    }
  }

  // 상품 삭제
  const handleDelete = (productId: string) => {
    const product = categoryProducts.find(p => p.id === productId)
    if (confirm(`Are you sure you want to delete "${product?.name}" ${categoryName}?`)) {
      deleteProduct(productId)
      showNotification('success', `"${product?.name}" ${categoryName} deleted successfully.`)
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

  const handleApplyStockAdjustment = (productId: string, direction: 'in' | 'out') => {
    const rawValue = stockAdjustments[productId]
    if (!rawValue || rawValue === 0 || isNaN(rawValue)) {
      showNotification('error', 'Enter a quantity to adjust.')
      return
    }
    const delta = direction === 'in' ? Math.abs(rawValue) : -Math.abs(rawValue)
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

      {/* Management buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => openModal()}
          className={`inline-flex items-center px-4 py-2 ${categoryColor} text-white rounded-lg hover:opacity-90 transition-colors duration-200`}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New {categoryName}
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Total {categoryName}</div>
          <div className="text-2xl font-bold text-gray-900">{categoryProducts.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">In Stock</div>
          <div className="text-2xl font-bold text-green-600">
            {categoryProducts.filter(p => p.inStock).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm font-medium text-gray-500">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">
            {categoryProducts.filter(p => !p.inStock).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-2">
          <div className="text-sm font-medium text-gray-500">Inventory</div>
          <div className="text-2xl font-bold text-gray-900">
            {categoryProducts.reduce((sum, p) => sum + ((p as any).stockQuantity ?? 0), 0)}
          </div>
          <div className="text-sm text-gray-500 flex items-center justify-between">
            <span>Low Stock</span>
            <span className="font-semibold text-red-600">
              {categoryProducts.filter(p => {
                const stock = (p as any).stockQuantity ?? 0
                const safety = (p as any).safetyStock ?? 0
                return stock <= safety
              }).length}
            </span>
          </div>
        </div>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{categoryIcon} {categoryName} Product List</h2>
        {categoryProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No {categoryName} registered.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryProducts.map((product) => (
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
                        <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {product.subcategory}
                        </span>
                      )}
                      {(product as any).brand && (
                        <span className="inline-flex px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                          { (product as any).brand }
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
                      {(product as any).usage && (
                        <span className="inline-flex px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                          🎯 {(product as any).usage}
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
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openModal(product)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title={`Edit ${categoryName}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title={`Delete ${categoryName}`}
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

              <div className="mt-4 border-t pt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Stock Adjustment</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => handleApplyStockAdjustment(product.id, 'out')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  >
                    Remove
                  </button>
                </div>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product add/edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProduct ? `Edit ${categoryName}` : `Add New ${categoryName}`}
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
                    {categoryName} Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter ${categoryName} name`}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Subcategory */}
                {specialFields.subcategories && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory {categoryValue === 'HotGoods' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      name="subcategory"
                      value={formData.subcategory || ''}
                      onChange={handleInputChange}
                      required={categoryValue === 'HotGoods'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Subcategory</option>
                      {specialFields.subcategories.map(sub => (
                        <option key={sub.value} value={sub.value}>
                          {sub.icon} {sub.label}
                        </option>
                      ))}
                    </select>
                    {categoryValue === 'HotGoods' && (
                      <p className="mt-1 text-sm text-gray-500">Please select a subcategory to classify your Market S product.</p>
                    )}
                  </div>
                )}

                {/* Brand */}
                {categoryValue === 'HotGoods' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter brand name"
                    />
                  </div>
                ) : (
                  specialFields.brands && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand
                      </label>
                      <select
                        name="brand"
                        value={formData.brand || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Brand</option>
                        {specialFields.brands.map(brand => (
                          <option key={brand.value} value={brand.value}>
                            {brand.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                )}

                {/* Model (for phone cases) */}
                {categoryValue === 'PhoneCases' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Galaxy S24 Ultra, iPhone 15 Pro Max"
                    />
                  </div>
                )}

                {/* Size */}
                {categoryValue === 'HotGoods' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <input
                      type="text"
                      name="size"
                      value={formData.size || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter size details (e.g., 15ml, 3 pcs set)"
                    />
                  </div>
                ) : (
                  specialFields.sizes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size
                      </label>
                      <select
                        name="size"
                        value={formData.size || ''}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Size</option>
                        {specialFields.sizes.map(size => (
                          <option key={size.value} value={size.value}>
                            {size.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                )}

                {/* Stock settings */}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                    />
                  </div>
                </div>

                {/* Material */}
                {specialFields.materials && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Material
                    </label>
                    <select
                      name="material"
                      value={formData.material || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Material</option>
                      {specialFields.materials.map(material => (
                        <option key={material.value} value={material.value}>
                          {material.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Color */}
                {specialFields.colors && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <select
                      name="color"
                      value={formData.color || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Color</option>
                      {specialFields.colors.map(color => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Usage */}
                {specialFields.usages && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Usage
                    </label>
                    <select
                      name="usage"
                      value={formData.usage || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Usage</option>
                      {specialFields.usages.map(usage => (
                        <option key={usage.value} value={usage.value}>
                          {usage.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Stock status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="inStock"
                    checked={formData.inStock}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    In Stock
                  </label>
                </div>

                {/* Image upload */}
                <div className="md:col-span-2">
                  <ProductImageUpload
                    currentImage={formData.image}
                    onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, image: imageUrl }))}
                  />
                </div>

                {/* Product status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="isNew"
                      checked={formData.isNew || false}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Popular Item
                    </label>
                  </div>
                </div>

                {/* 상세 페이지 옵션 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hasDetailPage"
                    checked={formData.hasDetailPage ?? true}
                    onChange={(e) => setFormData({ ...formData, hasDetailPage: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasDetailPage" className="ml-2 block text-sm text-gray-900">
                    상세 페이지 표시 (이미지 클릭 시 상세 페이지로 이동)
                  </label>
                </div>

                {/* Product description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Description * (간단한 설명 - 목록 페이지에 표시)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Enter detailed description of the ${categoryName}`}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`상세 페이지에서 고객에게 보여줄 자세한 ${categoryName} 설명을 입력하세요.&#10;예: 제품의 특징, 사용 방법, 주의사항, 배송 정보 등을 포함할 수 있습니다.`}
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

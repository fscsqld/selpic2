'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { Plus, Edit, Trash2, Eye, Search, X, CheckCircle, AlertCircle } from 'lucide-react'
import AdminProductHeader from '@/components/AdminProductHeader'
import ProductImageUpload from '@/components/ProductImageUpload'

interface StampFormData {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  description: string
  inStock: boolean
  size?: string
  material?: string
  color?: string
  usage?: string
  rating?: number
  reviews?: number
  isNew?: boolean
  isBestSeller?: boolean
  features?: string[]
  tags?: string[]
}

export default function StampsPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore()
  const forceCatalogSync = useCallback(async (): Promise<boolean> => {
    try {
      const { syncCatalogToServerNow } = await import('@/lib/catalogSyncScheduler')
      const result = await syncCatalogToServerNow(3)
      return !!result.ok
    } catch (e) {
      console.error('❌ [Stamp Management] force catalog sync failed:', e)
      return false
    }
  }, [])
  
  // 스템프 상품만 필터링
  const stampsProducts = products.filter(product => product.category === 'Stamps')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StampFormData | null>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })

  const [formData, setFormData] = useState<StampFormData>({
    id: '',
    name: '',
    price: 0,
    originalPrice: 0,
    image: '',
    category: 'Stamps',
    description: '',
    inStock: true,
    size: '',
    material: '',
    color: '',
    usage: '',
    rating: 4.5,
    reviews: 0,
    isNew: false,
    isBestSeller: false,
    features: [],
    tags: []
  })

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
        usage: product.usage || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        isNew: product.isNew || false,
        isBestSeller: product.isBestSeller || false,
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
        category: 'Stamps',
        description: '',
        inStock: true,
        size: '',
        material: '',
        color: '',
        usage: '',
        rating: 4.5,
        reviews: 0,
        isNew: false,
        isBestSeller: false,
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
      category: 'Stamps',
      description: '',
      inStock: true,
      size: '',
      material: '',
      color: '',
      usage: '',
      rating: 4.5,
      reviews: 0,
      isNew: false,
      isBestSeller: false,
      features: [],
      tags: []
    })
  }

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingProduct) {
        // 상품 수정
        const updatedProduct = {
          ...formData,
          customizationOptions: (editingProduct as any).customizationOptions || [],
          updatedAt: new Date().toISOString()
        }
        updateProduct(updatedProduct)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${formData.name}" stamp updated successfully!`
            : `"${formData.name}" stamp saved locally, but server sync failed.`
        )
      } else {
        // 새 상품 추가
        const newProduct = {
          ...formData,
          id: Date.now().toString(),
          customizationOptions: [],
          updatedAt: new Date().toISOString()
        }
        addProduct(newProduct)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${formData.name}" stamp added successfully!`
            : `"${formData.name}" stamp saved locally, but server sync failed.`
        )
      }
      
      closeModal()
    } catch (error) {
      showNotification('error', 'An error occurred while saving.')
      console.error('Product save error:', error)
    }
  }

  // 상품 삭제
  const handleDelete = (productId: string) => {
    const product = stampsProducts.find(p => p.id === productId)
    if (confirm(`Are you sure you want to delete "${product?.name}" stamp?`)) {
      void (async () => {
        deleteProduct(productId)
        const synced = await forceCatalogSync()
        showNotification(
          synced ? 'success' : 'error',
          synced
            ? `"${product?.name}" stamp deleted successfully.`
            : `"${product?.name}" stamp deleted locally, but server sync failed.`
        )
      })()
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <AdminProductHeader
        title="Stamp Management"
        icon="📮"
        showHomepageLink={false}
        showLanguageSelector={true}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* 페이지 설명 */}
        <div className="mb-8">
          <p className="text-gray-600">Manage stamp products. Categorize by size, material, and color.</p>
        </div>

        {/* Stamp management buttons */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Stamp
          </button>
        </div>

        {/* Stamp statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">Total Stamps</div>
            <div className="text-2xl font-bold text-gray-900">{stampsProducts.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">In Stock</div>
            <div className="text-2xl font-bold text-green-600">
              {stampsProducts.filter(p => p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">Out of Stock</div>
            <div className="text-2xl font-bold text-red-600">
              {stampsProducts.filter(p => !p.inStock).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm font-medium text-gray-500">Average Price</div>
            <div className="text-2xl font-bold text-gray-900">
              ${(stampsProducts.reduce((sum, p) => sum + p.price, 0) / Math.max(stampsProducts.length, 1)).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stamp list */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Stamp Product List</h2>
          {stampsProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No stamps registered.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stampsProducts.map((product) => (
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
                        {(product as any).size && (
                          <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
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
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit Stamp"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete Stamp"
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

        {/* 스템프 추가/편집 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingProduct ? 'Edit Stamp' : 'Add New Stamp'}
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
                      Stamp Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter stamp name"
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

                  {/* Size */}
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
                      <option value="Small">Small (2cm x 2cm)</option>
                      <option value="Medium">Medium (3cm x 3cm)</option>
                      <option value="Large">Large (5cm x 5cm)</option>
                      <option value="Custom">Custom Size</option>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Material</option>
                      <option value="rubber">Rubber</option>
                      <option value="wood">Wood</option>
                      <option value="metal">Metal</option>
                      <option value="acrylic">Acrylic</option>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Color</option>
                      <option value="Black">Black</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Green">Green</option>
                      <option value="Brown">Brown</option>
                      <option value="Natural">Natural</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  {/* Usage */}
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
                      <option value="personal">Personal</option>
                      <option value="office">Office</option>
                      <option value="commercial">Commercial</option>
                      <option value="craft">Craft</option>
                    </select>
                  </div>

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Product status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isNew"
                        checked={formData.isNew || false}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        New Product
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
                  </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter detailed description of the stamp"
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
    </div>
  )
}

'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Package, ImageIcon, X } from 'lucide-react'
import { SubcategoryItem } from '@/lib/contentStore'
import { useStore } from '@/lib/store'
import MediaUpload from '@/components/MediaUpload'

const SubcategoryImage = ({ src, emoji, alt, className = '', wrapperClassName = '' }: { src?: string, emoji?: string, alt: string, className?: string, wrapperClassName?: string }) => {
  const [imageError, setImageError] = useState(false)
  const actualSrc = src?.trim() && !src.startsWith('indexeddb://') ? src : ''

  useEffect(() => {
    setImageError(false)
  }, [src])
  
  if (imageError || !actualSrc) {
    return <div className={wrapperClassName || className}>{emoji || '📝'}</div>
  }
  
  if (wrapperClassName) {
    return (
      <div className={wrapperClassName}>
        <img 
          src={actualSrc} 
          alt={alt}
          className={className || "w-full h-full object-cover"}
          onError={() => setImageError(true)}
        />
      </div>
    )
  }
  
  return (
    <img 
      src={actualSrc} 
      alt={alt}
      className={className}
      onError={() => setImageError(true)}
    />
  )
}

interface SubcategoryManagerProps {
  subcategoryItems: SubcategoryItem[]
  category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'
  onAddSubcategory: (subcategory: Omit<SubcategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateSubcategory: (id: string, updates: Partial<SubcategoryItem>) => void
  onDeleteSubcategory: (id: string) => void
  onToggleSubcategoryActive: (id: string) => void
  onReorderSubcategory: (fromIndex: number, toIndex: number) => void
  showNotification: (type: 'success' | 'error', message: string) => void
}

const CATEGORY_LABELS = {
  'stickers': 'Stickers',
  'stamps': 'Stamps',
  'phone-cases': 'Phone Cases',
  'hot-goods': 'Market S'
}

function toSlug(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildCategorySubcategoryPath(
  category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods',
  title: string
): string {
  const slug = toSlug(title)
  if (!slug) return ''
  if (category === 'stickers') return `/stickers/${slug}`
  if (category === 'stamps') return `/stamps/${slug}`
  if (category === 'phone-cases') return `/phone-cases/${slug}`
  if (category === 'hot-goods') return `/hot-goods/${slug}`
  return `/${category}/${slug}`
}

export default function SubcategoryManager({
  subcategoryItems,
  category,
  onAddSubcategory,
  onUpdateSubcategory,
  onDeleteSubcategory,
  onToggleSubcategoryActive,
  onReorderSubcategory,
  showNotification
}: SubcategoryManagerProps) {
  const { products } = useStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryItem | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [previewSubcategory, setPreviewSubcategory] = useState<SubcategoryItem | null>(null)
  const [iconType, setIconType] = useState<'emoji' | 'image'>('emoji')
  const [editIconType, setEditIconType] = useState<'emoji' | 'image'>('emoji')

  const filteredItems = subcategoryItems
    .filter(item => item.category === category)
    .sort((a, b) => a.order - b.order)

  // 상품 개수 계산 (서브카테고리별)
  const getProductCount = useMemo(() => {
    return (subcategoryTitle: string) => {
      return products.filter(product => {
        const normalizedCategory = (product.category || '').toLowerCase().replace(/[\s-]/g, '')
        const normalizedSubcategory = (product.subcategory || '').toLowerCase().replace(/[\s-]/g, '')
        const normalizedTitle = subcategoryTitle.toLowerCase().replace(/[\s-]/g, '')
        
        const categoryMatch = 
          (normalizedCategory === 'stickers' && category === 'stickers') ||
          (normalizedCategory === 'stamps' && category === 'stamps') ||
          (normalizedCategory === 'phonecases' && category === 'phone-cases') ||
          (normalizedCategory === 'hotgoods' || normalizedCategory === 'markets' && category === 'hot-goods')
        
        return categoryMatch && normalizedSubcategory === normalizedTitle
      }).length
    }
  }, [products, category])

  const [newSubcategory, setNewSubcategory] = useState({
    category: category as 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods',
    title: '',
    description: '',
    emoji: '📝',
    imageUrl: '',
    linkUrl: '',
    pageTitle: '',
    pageSubtitle: '',
    order: filteredItems.length + 1,
    isActive: true
  })

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    emoji: '',
    imageUrl: '',
    linkUrl: '',
    pageTitle: '',
    pageSubtitle: '',
    isActive: true
  })

  const handleAdd = () => {
    if (!newSubcategory.title) {
      showNotification('error', 'Please fill in title')
      return
    }
    const normalizedLinkUrl =
      newSubcategory.linkUrl.trim() || buildCategorySubcategoryPath(category, newSubcategory.title)
    if (!normalizedLinkUrl) {
      showNotification('error', 'Could not generate a valid link URL from title')
      return
    }
    // pageTitle과 pageSubtitle이 비어있으면 기본값 설정
    const subcategoryToAdd = {
      ...newSubcategory,
      linkUrl: normalizedLinkUrl,
      pageTitle: newSubcategory.pageTitle || `${newSubcategory.title} Stickers`,
      pageSubtitle: newSubcategory.pageSubtitle || newSubcategory.description
    }
    onAddSubcategory(subcategoryToAdd)
    setNewSubcategory({
      category: category,
      title: '',
      description: '',
      emoji: '📝',
      imageUrl: '',
      linkUrl: '',
      pageTitle: '',
      pageSubtitle: '',
      order: filteredItems.length + 2,
      isActive: true
    })
    setIsAdding(false)
    showNotification('success', 'Subcategory added successfully')
  }

  const handleEdit = (subcategory: SubcategoryItem) => {
    setEditingSubcategory(subcategory)
    setEditIconType(subcategory.imageUrl ? 'image' : 'emoji')
    setEditForm({
      title: subcategory.title,
      description: subcategory.description,
      emoji: subcategory.emoji,
      imageUrl: subcategory.imageUrl || '',
      linkUrl: subcategory.linkUrl,
      pageTitle: subcategory.pageTitle || '',
      pageSubtitle: subcategory.pageSubtitle || '',
      isActive: subcategory.isActive
    })
  }

  const handleUpdate = () => {
    if (!editingSubcategory) return
    if (!editForm.title) {
      showNotification('error', 'Please fill in title')
      return
    }
    const normalizedLinkUrl =
      editForm.linkUrl.trim() || buildCategorySubcategoryPath(category, editForm.title)
    if (!normalizedLinkUrl) {
      showNotification('error', 'Could not generate a valid link URL from title')
      return
    }
    // pageTitle과 pageSubtitle이 비어있으면 기본값 설정
    const updates = {
      ...editForm,
      linkUrl: normalizedLinkUrl,
      pageTitle: editForm.pageTitle || `${editForm.title} Stickers`,
      pageSubtitle: editForm.pageSubtitle || editForm.description
    }
    onUpdateSubcategory(editingSubcategory.id, updates)
    setEditingSubcategory(null)
    showNotification('success', 'Subcategory updated successfully')
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      onDeleteSubcategory(id)
      showNotification('success', 'Subcategory deleted successfully')
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    if (draggedIndex !== index) {
      onReorderSubcategory(draggedIndex, index)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{CATEGORY_LABELS[category]} Subcategories</h3>
          <p className="text-sm text-gray-600 mt-1">Manage subcategory cards displayed on the {CATEGORY_LABELS[category].toLowerCase()} page</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Subcategory
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <h4 className="font-semibold text-emerald-900 mb-4">Add New Subcategory</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Icon Type Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="iconType"
                    value="emoji"
                    checked={iconType === 'emoji'}
                    onChange={(e) => setIconType(e.target.value as 'emoji' | 'image')}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Emoji</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="iconType"
                    value="image"
                    checked={iconType === 'image'}
                    onChange={(e) => setIconType(e.target.value as 'emoji' | 'image')}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Image</span>
                </label>
              </div>
            </div>

            {/* Emoji or Image Input */}
            {iconType === 'emoji' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                <input
                  type="text"
                  value={newSubcategory.emoji}
                  onChange={(e) => setNewSubcategory({ ...newSubcategory, emoji: e.target.value, imageUrl: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="📝"
                  maxLength={2}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <MediaUpload
                  type="image"
                  currentUrl={newSubcategory.imageUrl}
                  usage="subcategory-card"
                  onUpload={(file, url) => {
                    setNewSubcategory({ ...newSubcategory, imageUrl: url, emoji: '' })
                  }}
                  onRemove={() => {
                    setNewSubcategory({ ...newSubcategory, imageUrl: '' })
                  }}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newSubcategory.title}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Basic"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newSubcategory.description}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="High quality basic stickers"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubcategory.linkUrl}
                  onChange={(e) => setNewSubcategory({ ...newSubcategory, linkUrl: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="/stickers/basic"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    // Title 기반으로 Link URL 자동 생성
                    if (newSubcategory.title) {
                      const autoUrl = buildCategorySubcategoryPath(category, newSubcategory.title)
                      setNewSubcategory({ ...newSubcategory, linkUrl: autoUrl || '' })
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                  title="Generate URL from title"
                >
                  Auto
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                URL format: /stickers/[subcategory-slug] (e.g., /stickers/basic)
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
              <input
                type="text"
                value={newSubcategory.pageTitle}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, pageTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Basic Stickers (shown on subcategory page)"
              />
              <p className="text-xs text-gray-500 mt-1">Title displayed on the subcategory page header</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Page Subtitle</label>
              <textarea
                value={newSubcategory.pageSubtitle}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, pageSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="High quality basic stickers. Made with premium materials for long-lasting use."
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">Subtitle/description displayed on the subcategory page header</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subcategory List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No subcategories found. Click "Add Subcategory" to create one.
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
              <div className="flex-shrink-0">
                {item.imageUrl ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    <SubcategoryImage 
                      src={item.imageUrl}
                      emoji={item.emoji}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-3xl">{item.emoji || '📝'}</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  {!item.isActive && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                  )}
                  {getProductCount(item.title) > 0 && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <Package className="w-3 h-3" /> {getProductCount(item.title)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-xs text-gray-500 mt-1">{item.linkUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewSubcategory(item)}
                  className="p-2 hover:bg-purple-100 rounded text-purple-600"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onToggleSubcategoryActive(item.id)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title={item.isActive ? 'Hide' : 'Show'}
                >
                  {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 hover:bg-blue-100 rounded text-blue-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 hover:bg-red-100 rounded text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingSubcategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Subcategory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Icon Type Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editIconType"
                      value="emoji"
                      checked={editIconType === 'emoji'}
                      onChange={(e) => setEditIconType(e.target.value as 'emoji' | 'image')}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Emoji</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="editIconType"
                      value="image"
                      checked={editIconType === 'image'}
                      onChange={(e) => setEditIconType(e.target.value as 'emoji' | 'image')}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Image</span>
                  </label>
                </div>
              </div>

              {/* Emoji or Image Input */}
              {editIconType === 'emoji' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={editForm.emoji}
                    onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value, imageUrl: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    maxLength={2}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                  <MediaUpload
                    type="image"
                    currentUrl={editForm.imageUrl}
                    usage="subcategory-card"
                    onUpload={(file, url) => {
                      setEditForm({ ...editForm, imageUrl: url, emoji: '' })
                    }}
                    onRemove={() => {
                      setEditForm({ ...editForm, imageUrl: '' })
                    }}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL *</label>
                <input
                  type="text"
                  value={editForm.linkUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
                <input
                  type="text"
                  value={editForm.pageTitle}
                  onChange={(e) => setEditForm({ ...editForm, pageTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Basic Stickers (shown on subcategory page)"
                />
                <p className="text-xs text-gray-500 mt-1">Title displayed on the subcategory page header</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Subtitle</label>
                <textarea
                  value={editForm.pageSubtitle}
                  onChange={(e) => setEditForm({ ...editForm, pageSubtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="High quality basic stickers. Made with premium materials for long-lasting use."
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Subtitle/description displayed on the subcategory page header</p>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setEditingSubcategory(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSubcategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Preview Subcategory Card</h3>
              <button
                onClick={() => setPreviewSubcategory(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 실제 카테고리 페이지와 동일한 그리드 레이아웃으로 표시 */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Card Preview (Actual Size)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 실제 페이지와 동일한 카드 디자인 */}
                <div className="group bg-white rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300">
                  <div className="text-4xl mb-3">
                    {previewSubcategory.imageUrl ? (
                      <SubcategoryImage 
                        src={previewSubcategory.imageUrl}
                        emoji={previewSubcategory.emoji}
                        alt={previewSubcategory.title}
                        wrapperClassName="w-16 h-16 mx-auto rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      previewSubcategory.emoji || '📝'
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{previewSubcategory.title}</h3>
                  <p className="text-sm text-gray-600">{previewSubcategory.description}</p>
                  <div className="w-4 h-4 mx-auto mt-2 text-gray-400 group-hover:text-blue-600">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* 상품 개수 정보 */}
              {getProductCount(previewSubcategory.title) > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
                  <Package className="w-4 h-4" />
                  <span>{getProductCount(previewSubcategory.title)} products linked to this subcategory</span>
                </div>
              )}
            </div>

            {/* Page Title/Subtitle Preview */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Page Header Preview</h4>
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  {previewSubcategory.pageTitle || `${previewSubcategory.title} ${CATEGORY_LABELS[category]}`}
                </h2>
                <p className="text-base text-gray-600">
                  {previewSubcategory.pageSubtitle || previewSubcategory.description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPreviewSubcategory(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


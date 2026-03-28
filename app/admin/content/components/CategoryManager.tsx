'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, ArrowRight, Package } from 'lucide-react'
import { CategoryItem } from '@/lib/contentStore'
import MediaUpload from '@/components/MediaUpload'
import { useStore } from '@/lib/store'

interface CategoryManagerProps {
  categoryItems: CategoryItem[]
  onAddCategory: (category: Omit<CategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateCategory: (id: string, updates: Partial<CategoryItem>) => void
  onDeleteCategory: (id: string) => void
  onToggleCategoryActive: (id: string) => void
  onReorderCategory: (fromIndex: number, toIndex: number) => void
  showNotification: (type: 'success' | 'error', message: string) => void
}

export default function CategoryManager({
  categoryItems,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onToggleCategoryActive,
  onReorderCategory,
  showNotification
}: CategoryManagerProps) {
  const { products } = useStore()
  const [isAdding, setIsAdding] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  // 상품 개수 계산 (홈페이지와 동일한 로직). Content 페이지에서 store 미복원 시 localStorage fallback.
  const productCounts = useMemo(() => {
    const counts = {
      stickers: 0,
      stamps: 0,
      phoneCases: 0,
      marketS: 0,
      bundles: 0,
      byCategory: {} as Record<string, number>
    }

    const normalize = (value: string | undefined) => (value || '').toLowerCase().replace(/[\s-]/g, '')

    let list = Array.isArray(products) ? products : []
    if (typeof window !== 'undefined' && list.length === 0) {
      try {
        const raw = localStorage.getItem('selpic-store')
        if (raw) {
          const parsed = JSON.parse(raw)
          const stored = parsed?.state?.products
          if (Array.isArray(stored)) list = stored
        }
      } catch {
        // ignore
      }
    }

    list.forEach(product => {
      const normalizedCategory = normalize(product.category)

      switch (normalizedCategory) {
        case 'stickers':
          counts.stickers += 1
          break
        case 'stamps':
          counts.stamps += 1
          break
        case 'phonecases':
          counts.phoneCases += 1
          break
        case 'bundle':
        case 'eventbundle':
          counts.bundles += 1
          break
        default:
          break
      }

      if (product.isHotGoods || normalizedCategory === 'hotgoods' || normalizedCategory === 'markets') {
        counts.marketS += 1
      }

      counts.byCategory[normalizedCategory] = (counts.byCategory[normalizedCategory] || 0) + 1
    })

    return counts
  }, [products])

  // 카테고리별 상품 개수 계산 함수
  const getProductCountForCategory = useCallback((category: CategoryItem) => {
    const normalize = (value: string | undefined) => (value || '').toLowerCase().replace(/[\s-]/g, '')
    const normalizedTitle = normalize(category.title)
    const normalizedLinkUrl = normalize(category.linkUrl)

    // linkUrl / title 기반 매칭 (Name Stickers, Stickers, /stickers 등)
    if (
      normalizedLinkUrl.includes('stickers') ||
      normalizedTitle.includes('sticker') ||
      normalizedTitle.includes('namesticker')
    ) {
      return productCounts.stickers
    }

    if (normalizedLinkUrl.includes('stamp') || normalizedTitle.includes('stamp')) {
      return productCounts.stamps
    }

    if (normalizedLinkUrl.includes('phone') || normalizedTitle.includes('phone')) {
      return productCounts.phoneCases
    }

    if (
      normalizedLinkUrl.includes('hotgoods') ||
      normalizedLinkUrl.includes('hot-goods') ||
      normalizedTitle.includes('markets') ||
      normalizedTitle.includes('hotgoods') ||
      normalizedTitle.includes('market')
    ) {
      return productCounts.marketS
    }

    if (normalizedLinkUrl.includes('bundle') || normalizedTitle.includes('bundle')) {
      return productCounts.bundles
    }

    // title 기반 매칭
    if (normalizedTitle && productCounts.byCategory[normalizedTitle] !== undefined) {
      return productCounts.byCategory[normalizedTitle]
    }

    return 0
  }, [productCounts])

  // 새 카테고리 추가 폼 상태
  const [newCategory, setNewCategory] = useState({
    title: '',
    description: '',
    emoji: '🎨',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-purple-600',
    backgroundImage: '',
    linkUrl: '/products',
    tags: ['New', 'Custom'],
    order: categoryItems.length + 1,
    isActive: true
  })

  // 편집 폼 상태
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    emoji: '',
    gradientFrom: '',
    gradientTo: '',
    backgroundImage: '',
    linkUrl: '',
    tags: [] as string[],
    isActive: true
  })

  // indexeddb:// 배경 이미지를 로컬에서 미리보기 위해 실제 URL로 변환
  const [resolvedBackgrounds, setResolvedBackgrounds] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true

    const loadBackgroundImages = async () => {
      const updates: Record<string, string> = {}

      for (const category of categoryItems) {
        const bg = category.backgroundImage
        if (!bg) continue

        if (bg.startsWith('indexeddb://')) {
          const fileId = bg.replace('indexeddb://', '')
          try {
            const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
            const fileUrl = await indexedDBStorage.getFile(fileId)
            if (fileUrl && isMounted) {
              updates[category.id] = fileUrl
            }
          } catch (error) {
            console.error('Failed to load category background image from IndexedDB:', { categoryId: category.id, error })
          }
        } else {
          updates[category.id] = bg
        }
      }

      if (isMounted) {
        setResolvedBackgrounds(updates)
      }
    }

    loadBackgroundImages()

    return () => {
      isMounted = false
    }
  }, [categoryItems])

  // 그라디언트 옵션들
  const gradientOptions = [
    { from: 'from-blue-500', to: 'to-purple-600', name: 'Blue to Purple' },
    { from: 'from-green-500', to: 'to-teal-600', name: 'Green to Teal' },
    { from: 'from-purple-500', to: 'to-pink-600', name: 'Purple to Pink' },
    { from: 'from-red-500', to: 'to-orange-600', name: 'Red to Orange' },
    { from: 'from-gray-600', to: 'to-slate-700', name: 'Gray to Slate' },
    { from: 'from-indigo-500', to: 'to-cyan-600', name: 'Indigo to Cyan' },
    { from: 'from-yellow-500', to: 'to-orange-500', name: 'Yellow to Orange' },
    { from: 'from-pink-500', to: 'to-rose-600', name: 'Pink to Rose' }
  ]

  // 이모지 옵션들
  const emojiOptions = ['🏷️', '📮', '📱', '🔥', '🎁', '🎨', '⭐', '💎', '🚀', '🎯', '🎪', '🎭']

  const handleAddCategory = () => {
    // title은 선택사항으로 변경 (공란 허용)
    onAddCategory(newCategory)
    setNewCategory({
      title: '',
      description: '',
      emoji: '🎨',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-purple-600',
      backgroundImage: '',
      linkUrl: '/products',
      tags: ['New', 'Custom'],
      order: categoryItems.length + 1,
      isActive: true
    })
    setIsAdding(false)
    showNotification('success', 'Category has been successfully added!')
  }

  const handleUpdateCategory = () => {
    if (!editingCategory) {
      showNotification('error', 'No category selected for editing.')
      return
    }

    // title은 선택사항으로 변경 (공란 허용)
    console.log('🔄 CategoryManager - Updating category:', {
      id: editingCategory.id,
      editForm: {
        title: editForm.title,
        description: editForm.description,
        emoji: editForm.emoji,
        backgroundImage: editForm.backgroundImage,
        gradientFrom: editForm.gradientFrom,
        gradientTo: editForm.gradientTo,
        linkUrl: editForm.linkUrl
      }
    })

    onUpdateCategory(editingCategory.id, editForm)
    setEditingCategory(null)
    showNotification('success', 'Category has been successfully updated!')
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      onDeleteCategory(id)
      showNotification('success', 'Category has been deleted.')
    }
  }

  const startEdit = (category: CategoryItem) => {
    setEditingCategory(category)
    setEditForm({
      title: category.title,
      description: category.description,
      emoji: category.emoji,
      gradientFrom: category.gradientFrom,
      gradientTo: category.gradientTo,
      backgroundImage: category.backgroundImage || '',
      linkUrl: category.linkUrl,
      tags: [...category.tags],
      isActive: category.isActive
    })
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      console.log('Drag and drop:', draggedIndex, '->', dropIndex)
      onReorderCategory(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Category Management</h3>
          <p className="text-sm text-gray-600">Manage the Shop by Category section on the homepage.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* 새 카테고리 추가 폼 */}
      {isAdding && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-blue-900 mb-4">Add New Category</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
              <input
                type="text"
                value={newCategory.title}
                onChange={(e) => setNewCategory({ ...newCategory, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Category title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNewCategory({ ...newCategory, emoji: '' })}
                  className={`px-3 py-2 text-sm rounded-md border-2 ${
                    !newCategory.emoji ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  No emoji
                </button>
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, emoji })}
                    className={`p-2 text-2xl rounded-md border-2 ${
                      newCategory.emoji === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Category description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gradient</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newCategory.gradientFrom}
                  onChange={(e) => setNewCategory({ ...newCategory, gradientFrom: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {gradientOptions.map((option) => (
                    <option key={option.from} value={option.from}>
                      {option.name} From
                    </option>
                  ))}
                </select>
                <select
                  value={newCategory.gradientTo}
                  onChange={(e) => setNewCategory({ ...newCategory, gradientTo: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {gradientOptions.map((option) => (
                    <option key={option.to} value={option.to}>
                      {option.name} To
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Image (Optional)
              </label>
              <MediaUpload
                type="image"
                currentUrl={newCategory.backgroundImage}
                usage="category-bg"
                onUpload={(file: File, url: string) => {
                  if (url && url.trim()) {
                    setNewCategory({ ...newCategory, backgroundImage: url })
                    showNotification('success', 'Background image uploaded successfully!')
                  }
                }}
                onRemove={() => setNewCategory({ ...newCategory, backgroundImage: '' })}
              />
              <p className="text-xs text-gray-500 mt-1">
                If set, this image will be used as the background instead of the gradient
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
              <input
                type="text"
                value={newCategory.linkUrl}
                onChange={(e) => setNewCategory({ ...newCategory, linkUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="/products"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="tagInput"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter tags and press Enter or comma to add"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const input = e.currentTarget
                        const tagValue = input.value.trim()
                        if (tagValue && !newCategory.tags.includes(tagValue)) {
                          setNewCategory({ 
                            ...newCategory, 
                            tags: [...newCategory.tags, tagValue] 
                          })
                        }
                        input.value = ''
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('tagInput') as HTMLInputElement
                      const tagValue = input.value.trim()
                      if (tagValue && !newCategory.tags.includes(tagValue)) {
                        setNewCategory({ 
                          ...newCategory, 
                          tags: [...newCategory.tags, tagValue] 
                        })
                        input.value = ''
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newCategory.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setNewCategory({ ...newCategory, tags: newCategory.tags.filter((_, i) => i !== index) })}
                        className="text-blue-600 hover:text-blue-800 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  You can add tags by pressing Enter, comma(,) or clicking the "Add" button. 
                  Click individual tags to delete them.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* 카테고리 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryItems
          .sort((a, b) => a.order - b.order)
          .map((category, index) => (
                         <div
               key={category.id}
               draggable
               onDragStart={(e) => handleDragStart(e, index)}
               onDragOver={handleDragOver}
               onDrop={(e) => handleDrop(e, index)}
               className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-move ${
                 draggedIndex === index ? 'opacity-50 scale-95' : 'hover:scale-105'
               }`}
               title="Drag to reorder"
             >
              {/* 카테고리 미리보기 */}
              <div 
                className={`h-32 rounded-t-lg relative overflow-hidden ${
                  resolvedBackgrounds[category.id] 
                    ? '' 
                    : `bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo}`
                }`}
                style={resolvedBackgrounds[category.id] ? {
                  backgroundImage: `url('${resolvedBackgrounds[category.id]}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              >
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 p-4 h-full flex flex-col justify-between text-white">
                  <div className="flex items-start justify-between">
                    <div className="text-4xl">{category.emoji}</div>
                    {/* 상품 개수 배지 */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                      <Package className="w-3 h-3" />
                      <span className="text-xs font-semibold">{getProductCountForCategory(category)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{category.title || 'Untitled Category'}</h4>
                    <p className="text-sm opacity-90 line-clamp-2">{category.description || ''}</p>
                  </div>
                </div>
              </div>

              {/* 카테고리 정보 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">#{category.order}</span>
                  </div>
                </div>

                {/* 상품 개수 표시 */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-100">
                    <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-900">
                      {getProductCountForCategory(category)} {getProductCountForCategory(category) === 1 ? 'product' : 'products'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {category.tags.map((tag, tagIndex) => (
                    <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <div>Link: {category.linkUrl}</div>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(category)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onToggleCategoryActive(category.id)}
                      className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                      title={category.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {category.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* 카테고리가 없을 때 */}
      {categoryItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg font-medium">No categories found</p>
          <p className="text-sm">Add a new category to get started</p>
        </div>
      )}

      {/* 편집 모달 */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Edit Category</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, emoji: '' })}
                    className={`px-3 py-2 text-sm rounded-md border-2 ${
                      !editForm.emoji ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    No emoji
                  </button>
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, emoji })}
                      className={`p-2 text-2xl rounded-md border-2 ${
                        editForm.emoji === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gradient</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editForm.gradientFrom}
                    onChange={(e) => setEditForm({ ...editForm, gradientFrom: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {gradientOptions.map((option) => (
                      <option key={option.from} value={option.from}>
                        {option.name} From
                      </option>
                    ))}
                  </select>
                  <select
                    value={editForm.gradientTo}
                    onChange={(e) => setEditForm({ ...editForm, gradientTo: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {gradientOptions.map((option) => (
                      <option key={option.to} value={option.to}>
                        {option.name} To
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Image (Optional)
                </label>
                <MediaUpload
                  type="image"
                  currentUrl={editForm.backgroundImage}
                  usage="category-bg"
                  onUpload={(file: File, url: string) => {
                    if (url && url.trim()) {
                      setEditForm({ ...editForm, backgroundImage: url })
                      showNotification('success', 'Background image uploaded successfully!')
                    }
                  }}
                  onRemove={() => setEditForm({ ...editForm, backgroundImage: '' })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  If set, this image will be used as the background instead of the gradient
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <input
                  type="text"
                  value={editForm.linkUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="editTagInput"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tags and press Enter or comma to add"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          const input = e.currentTarget
                          const tagValue = input.value.trim()
                          if (tagValue && !editForm.tags.includes(tagValue)) {
                            setEditForm({ 
                              ...editForm, 
                              tags: [...editForm.tags, tagValue] 
                            })
                          }
                          input.value = ''
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('editTagInput') as HTMLInputElement
                        const tagValue = input.value.trim()
                        if (tagValue && !editForm.tags.includes(tagValue)) {
                          setEditForm({ 
                            ...editForm, 
                            tags: [...editForm.tags, tagValue] 
                          })
                          input.value = ''
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {editForm.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setEditForm({ ...editForm, tags: editForm.tags.filter((_, i) => i !== index) })}
                          className="text-blue-600 hover:text-blue-800 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    You can add tags by pressing Enter, comma(,) or clicking the "Add" button. 
                    Click individual tags to delete them.
                  </p>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

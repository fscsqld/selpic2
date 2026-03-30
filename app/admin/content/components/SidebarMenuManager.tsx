import { useState } from 'react'
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { validateAndFixUrl } from '../utils'
import { SidebarMenuItem } from '@/lib/contentStore'

interface SidebarMenuManagerProps {
  sidebarMenuItems: SidebarMenuItem[]
  onAddMenuItem: (item: Omit<SidebarMenuItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateMenuItem: (id: string, updates: Partial<SidebarMenuItem>) => void
  onDeleteMenuItem: (id: string) => void
  onReorderMenuItem: (fromIndex: number, toIndex: number) => void
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function SidebarMenuManager({
  sidebarMenuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  onReorderMenuItem,
  showNotification
}: SidebarMenuManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    type: 'link' as 'link' | 'scroll' | 'disabled',
    url: '',
    icon: 'Home',
    order: 1,
    isActive: true,
    isComingSoon: false
  })

  const openModal = (index?: number) => {
    if (index !== undefined) {
      setEditingIndex(index)
      const currentItem = sidebarMenuItems[index]
      if (currentItem) {
        setFormData({
          title: currentItem.title,
          type: currentItem.type,
          url: currentItem.url,
          icon: currentItem.icon,
          order: currentItem.order,
          isActive: currentItem.isActive,
          isComingSoon: currentItem.isComingSoon
        })
      }
    } else {
      setEditingIndex(null)
      setFormData({
        title: '',
        type: 'link',
        url: '',
        icon: 'Home',
        order: sidebarMenuItems.length + 1,
        isActive: true,
        isComingSoon: false
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIndex(null)
    setFormData({
      title: '',
      type: 'link',
      url: '',
      icon: 'Home',
      order: 1,
      isActive: true,
      isComingSoon: false
    })
  }


  const handleSave = () => {
    if (!formData.title.trim()) {
      showNotification('error', 'Please enter a menu title.')
      return
    }

    const validatedUrl = validateAndFixUrl(formData.url)

    if (editingIndex !== null) {
      const currentItem = sidebarMenuItems[editingIndex]
      if (currentItem) {
        onUpdateMenuItem(currentItem.id, {
          title: formData.title,
          type: formData.type,
          url: validatedUrl,
          icon: formData.icon,
          order: formData.order,
          isActive: formData.isActive,
          isComingSoon: formData.isComingSoon
        })
        showNotification('success', 'Menu has been successfully updated!')
      }
    } else {
      onAddMenuItem({
        title: formData.title,
        type: formData.type,
        url: validatedUrl,
        icon: formData.icon,
        order: formData.order,
        isActive: formData.isActive,
        isComingSoon: formData.isComingSoon
      })
      showNotification('success', 'New menu has been successfully added!')
    }

    closeModal()
  }

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this menu?')) {
      const currentItem = sidebarMenuItems[index]
      if (currentItem) {
        onDeleteMenuItem(currentItem.id)
        showNotification('success', 'Menu has been deleted.')
      }
    }
  }

  // 드래그 앤 드롭 핸들러들
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderMenuItem(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="col-span-full bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-purple-900">🧭 Sidebar Menu Management</h4>
          <p className="text-sm text-purple-700">Manage menu items displayed in the sidebar.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Menu
        </button>
      </div>

      {/* 메뉴 목록 */}
      <div className="space-y-3">
        {sidebarMenuItems.map((menuItem, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-3 bg-white rounded-lg border transition-all duration-200 ${
              draggedIndex === index 
                ? 'border-purple-400 shadow-lg opacity-50' 
                : dragOverIndex === index 
                ? 'border-purple-300 bg-purple-50' 
                : 'border-purple-200 hover:shadow-md'
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center space-x-3">
              <div className="cursor-move text-purple-400 hover:text-purple-600 transition-colors">
                <GripVertical size={20} />
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-sm font-medium">{index + 1}</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-purple-900">{menuItem.title}</span>
                  {menuItem.isComingSoon && (
                    <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                      Coming Soon
                    </span>
                  )}
                </div>
                <div className="text-sm text-purple-600">
                  {menuItem.type === 'link' ? `Link: ${menuItem.url}` : 
                   menuItem.type === 'scroll' ? 'Page scroll' : 
                   menuItem.type === 'disabled' ? 'Disabled' : 'Default link'}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => openModal(index)}
                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(index)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 메뉴 편집 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingIndex !== null ? 'Edit Menu' : 'Add New Menu'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Menu Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter menu title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Menu Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'link' | 'scroll' | 'disabled' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="link">Link (External page)</option>
                    <option value="scroll">Scroll (Within page)</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL or Anchor
                </label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => {
                    let url = e.target.value.trim()
                    if (url.includes('#app/')) {
                      url = url.replace('#app/', '/')
                    }
                    if (url.includes('/page.tsx')) {
                      url = url.replace('/page.tsx', '')
                    }
                    setFormData({ ...formData, url })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder={formData.type === 'link' ? '/stamp 또는 https://example.com' : formData.type === 'scroll' ? '#section-id' : '#'}
                  required
                />
                {formData.url && (formData.url.includes('#app/') || formData.url.includes('/page.tsx')) && (
                  <p className="mt-1 text-xs text-red-600">
                    ⚠️ Invalid URL pattern detected. It will be automatically corrected.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon Selection
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Select an icon</option>
                    <option value="Home">🏠 Home</option>
                    <option value="BarChart3">📊 BarChart3</option>
                    <option value="Users">👥 Users</option>
                    <option value="Package">📦 Package</option>
                    <option value="ShoppingCart">🛒 ShoppingCart</option>
                    <option value="Settings">⚙️ Settings</option>
                    <option value="Info">ℹ️ Info</option>
                    <option value="Smartphone">📱 Smartphone</option>
                    <option value="Flame">🔥 Flame</option>
                    <option value="Gift">🎁 Gift</option>
                    <option value="Palette">🎨 Palette</option>
                    <option value="MessageSquare">💬 MessageSquare</option>
                    <option value="Grid3X3">⊞ Grid3X3</option>
                    <option value="🏷️">🏷️ Sticker</option>
                    <option value="📮">📮 Stamp</option>
                    <option value="📱">📱 Phone Case</option>
                    <option value="🔥">🔥 Market S</option>
                    <option value="📦">📦 Others</option>
                    <option value="⭐">⭐ Star</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select your desired icon from the dropdown.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active Status
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isComingSoon"
                    checked={formData.isComingSoon}
                    onChange={(e) => setFormData({ ...formData, isComingSoon: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="isComingSoon" className="ml-2 text-sm text-gray-700">
                    Show Coming Soon
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  {editingIndex !== null ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

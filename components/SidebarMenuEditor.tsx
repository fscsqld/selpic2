'use client'

import { useState, useEffect } from 'react'
import { Edit3, Save, RotateCcw, Plus, Trash2, GripVertical, X } from 'lucide-react'
import { SidebarMenuItem, loadSidebarMenuConfig, saveSidebarMenuConfig, updateMenuItemIcon } from '@/lib/sidebarIcons'
import IconSelector from './IconSelector'

interface SidebarMenuEditorProps {
  isOpen: boolean
  onClose: () => void
  onMenuUpdated: () => void
}

export default function SidebarMenuEditor({ isOpen, onClose, onMenuUpdated }: SidebarMenuEditorProps) {
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([])
  const [editingItem, setEditingItem] = useState<SidebarMenuItem | null>(null)
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newItem, setNewItem] = useState<Partial<SidebarMenuItem>>({
    id: '',
    label: '',
    href: '',
    icon: 'Home',
    color: 'text-gray-700'
  })

  // 메뉴 설정 로드
  useEffect(() => {
    if (isOpen) {
      const config = loadSidebarMenuConfig()
      setMenuItems(config)
    }
  }, [isOpen])

  // 메뉴 아이템 수정
  const handleEditItem = (item: SidebarMenuItem) => {
    setEditingItem({ ...item })
    setIsEditing(true)
  }

  // Save menu item
  const handleSaveItem = () => {
    if (!editingItem) return

    const updatedItems = menuItems.map(item =>
      item.id === editingItem.id ? editingItem : item
    )
    
    setMenuItems(updatedItems)
    saveSidebarMenuConfig(updatedItems)
    setEditingItem(null)
    setIsEditing(false)
    onMenuUpdated()
  }

  // 메뉴 아이템 삭제
  const handleDeleteItem = (itemId: string) => {
    if (confirm('이 메뉴 항목을 삭제하시겠습니까?')) {
      const updatedItems = menuItems.filter(item => item.id !== itemId)
      setMenuItems(updatedItems)
      saveSidebarMenuConfig(updatedItems)
      onMenuUpdated()
    }
  }

  // 새 메뉴 아이템 추가
  const handleAddItem = () => {
    if (!newItem.id || !newItem.label || !newItem.href) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    const item: SidebarMenuItem = {
      id: newItem.id,
      label: newItem.label,
      href: newItem.href,
      icon: newItem.icon || 'Home',
      color: newItem.color || 'text-gray-700',
      isActive: false
    }

    const updatedItems = [...menuItems, item]
    setMenuItems(updatedItems)
    saveSidebarMenuConfig(updatedItems)
    
    setNewItem({
      id: '',
      label: '',
      href: '',
      icon: 'Home',
      color: 'text-gray-700'
    })
    onMenuUpdated()
  }

  // 아이콘 선택
  const handleIconSelect = (iconName: string) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, icon: iconName })
    } else {
      setNewItem({ ...newItem, icon: iconName })
    }
    setIsIconSelectorOpen(false)
  }

  // 기본 설정으로 복원
  const handleReset = () => {
    if (confirm('기본 설정으로 복원하시겠습니까? 모든 사용자 정의 설정이 삭제됩니다.')) {
      const defaultConfig = loadSidebarMenuConfig()
      setMenuItems(defaultConfig)
      saveSidebarMenuConfig(defaultConfig)
      onMenuUpdated()
    }
  }

  // 메뉴 아이템 순서 변경 (드래그 앤 드롭은 간단한 버전으로 구현)
  const moveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...menuItems]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    setMenuItems(newItems)
    saveSidebarMenuConfig(newItems)
    onMenuUpdated()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">사이드바 메뉴 편집</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-1 inline" />
              기본값 복원
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 기존 메뉴 아이템 목록 */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">메뉴 항목</h3>
            <div className="space-y-3">
              {menuItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                  
                  {isEditing && editingItem?.id === item.id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="text"
                        value={editingItem.id}
                        onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="ID"
                      />
                      <input
                        type="text"
                        value={editingItem.label}
                        onChange={(e) => setEditingItem({ ...editingItem, label: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="라벨"
                      />
                      <input
                        type="text"
                        value={editingItem.href}
                        onChange={(e) => setEditingItem({ ...editingItem, href: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="URL"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingItem.icon}
                          onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                          placeholder="아이콘 이름 (예: Home, Package, Users)"
                        />
                        <button
                          onClick={() => setIsIconSelectorOpen(true)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                          title="아이콘 선택"
                        >
                          선택
                        </button>
                        <input
                          type="text"
                          value={editingItem.color}
                          onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                          placeholder="색상 클래스"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{item.icon}</span>
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-xs text-gray-500">{item.href}</span>
                      <span className="text-xs text-gray-400">{item.color}</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {isEditing && editingItem?.id === item.id ? (
                      <button
                        onClick={handleSaveItem}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 새 메뉴 아이템 추가 */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">새 메뉴 항목 추가</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                type="text"
                value={newItem.id}
                onChange={(e) => setNewItem({ ...newItem, id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="ID (고유값)"
              />
              <input
                type="text"
                value={newItem.label}
                onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="라벨"
              />
              <input
                type="text"
                value={newItem.href}
                onChange={(e) => setNewItem({ ...newItem, href: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="URL"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newItem.icon}
                  onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                  placeholder="아이콘 이름 (예: Home, Package, Users)"
                />
                <button
                  onClick={() => setIsIconSelectorOpen(true)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  title="아이콘 선택"
                >
                  선택
                </button>
                <input
                  type="text"
                  value={newItem.color}
                  onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1"
                  placeholder="색상 클래스"
                />
              </div>
            </div>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              메뉴 항목 추가
            </button>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>

      {/* 아이콘 선택기 */}
      <IconSelector
        isOpen={isIconSelectorOpen}
        onClose={() => setIsIconSelectorOpen(false)}
        onSelectIcon={handleIconSelect}
        currentIcon={editingItem?.icon || newItem.icon || 'Home'}
        title="아이콘 선택"
      />
    </div>
  )
}

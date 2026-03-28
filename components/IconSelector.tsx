'use client'

import { useState, useEffect } from 'react'
import { Search, X, Check } from 'lucide-react'
import { AVAILABLE_ICONS, getIconComponent } from '@/lib/sidebarIcons'

interface IconSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectIcon: (iconName: string) => void
  currentIcon?: string
  title?: string
}

export default function IconSelector({ 
  isOpen, 
  onClose, 
  onSelectIcon, 
  currentIcon = 'Home',
  title = '아이콘 선택'
}: IconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [iconComponents, setIconComponents] = useState<Record<string, any>>({})

  // 검색 필터링된 아이콘 목록
  const filteredIcons = AVAILABLE_ICONS.filter(icon =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 아이콘 컴포넌트들을 동적으로 로드
  useEffect(() => {
    const loadIconComponents = async () => {
      const components: Record<string, any> = {}
      
      // 현재 선택된 아이콘과 검색 결과에 포함된 아이콘들만 로드
      const iconsToLoad = [...new Set([currentIcon, ...filteredIcons])]
      
      for (const iconName of iconsToLoad) {
        const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName)
        
        if (isEmoji) {
          // 이모지는 컴포넌트가 필요 없음
          components[iconName] = null
        } else {
          try {
            const iconComponent = await getIconComponent(iconName)()
            components[iconName] = iconComponent
          } catch (error) {
            console.warn(`Failed to load icon: ${iconName}`, error)
          }
        }
      }
      
      setIconComponents(components)
    }

    if (isOpen) {
      loadIconComponents()
    }
  }, [isOpen, filteredIcons, currentIcon])

  const handleIconSelect = (iconName: string) => {
    console.log('Icon selected:', iconName)
    setSelectedIcon(iconName)
    onSelectIcon(iconName)
    onClose()
  }

  const handleClose = () => {
    setSearchTerm('')
    setSelectedIcon(currentIcon)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* 검색 바 */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="아이콘 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 아이콘 그리드 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {filteredIcons.map((iconName) => {
              const IconComponent = iconComponents[iconName]
              const isSelected = selectedIcon === iconName
              const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName)
              
              return (
                <button
                  key={iconName}
                  onClick={() => handleIconSelect(iconName)}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 flex flex-col items-center justify-center min-h-[80px] w-full
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                    }
                  `}
                  title={iconName}
                >
                  {isEmoji ? (
                    <span className="text-2xl mb-2">{iconName}</span>
                  ) : IconComponent ? (
                    <IconComponent className="h-6 w-6 mb-2" />
                  ) : (
                    <div className="h-6 w-6 bg-gray-200 rounded animate-pulse mb-2" />
                  )}
                  <span className="text-xs text-gray-600 text-center break-words">{iconName}</span>
                  
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          {filteredIcons.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>검색 결과가 없습니다.</p>
              <p className="text-sm">다른 키워드로 검색해보세요.</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredIcons.length}개의 아이콘 중 선택
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => handleIconSelect(selectedIcon)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

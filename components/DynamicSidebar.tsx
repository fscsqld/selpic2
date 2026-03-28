'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useContentStore } from '@/lib/contentStore'
import { getIconComponent } from '@/lib/sidebarIcons'

interface DynamicSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

export default function DynamicSidebar({ isOpen, onClose, className = '' }: DynamicSidebarProps) {
  const [iconComponents, setIconComponents] = useState<Record<string, any>>({})
  const router = useRouter()
  const pathname = usePathname()
  
  // contentStore에서 사이드바 메뉴 데이터 가져오기
  const { getActiveSidebarMenuItems } = useContentStore()
  let menuItems = getActiveSidebarMenuItems()
  
  // 메뉴 아이템이 없으면 빈 배열 사용 (하드코딩된 기본 메뉴 제거)
  if (menuItems.length === 0) {
    console.log('🔍 DynamicSidebar: No menu items found, using empty menu')
    menuItems = []
  }
  
  console.log('DynamicSidebar render:', { isOpen, menuItemsCount: menuItems.length })

  // 아이콘 컴포넌트들 동적 로드 (최적화됨)
  useEffect(() => {
    const loadIcons = async () => {
      const components: Record<string, any> = {}
      
      // 아이콘 로딩을 병렬로 처리
      const iconPromises = menuItems.map(async (item) => {
        const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(item.icon)
        
        if (isEmoji) {
          components[item.icon] = null
          return
        }

        try {
          // 기본 아이콘들을 직접 처리
          if (item.icon === 'BarChart3') {
            const { BarChart3 } = await import('lucide-react')
            components[item.icon] = BarChart3
          } else if (item.icon === 'Package') {
            const { Package } = await import('lucide-react')
            components[item.icon] = Package
          } else if (item.icon === 'FileText') {
            const { FileText } = await import('lucide-react')
            components[item.icon] = FileText
          } else if (item.icon === 'Users') {
            const { Users } = await import('lucide-react')
            components[item.icon] = Users
          } else if (item.icon === 'Settings') {
            const { Settings } = await import('lucide-react')
            components[item.icon] = Settings
          } else {
            // 다른 아이콘들은 동적 로드 시도
            const iconGetter = getIconComponent(item.icon)
            if (iconGetter && typeof iconGetter === 'function') {
              const IconComponent = await iconGetter()
              components[item.icon] = IconComponent
            } else {
              components[item.icon] = null
            }
          }
        } catch (error) {
          console.warn(`Failed to load icon: ${item.icon}`, error)
          components[item.icon] = null
        }
      })

      // 모든 아이콘 로딩이 완료되면 상태 업데이트
      await Promise.allSettled(iconPromises)
      setIconComponents(components)
    }

    if (menuItems.length > 0) {
      loadIcons()
    } else {
      // 메뉴 아이템이 없으면 빈 객체로 설정
      setIconComponents({})
    }
  }, [menuItems])

  // 메뉴 클릭 핸들러
  const handleMenuClick = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank')
    } else {
      router.push(url)
    }
    onClose()
  }


  // 현재 경로와 일치하는 메뉴 아이템 확인
  const isActiveMenuItem = (item: any) => {
    if (item.url === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(item.url)
  }

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r-2 border-gray-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out flex flex-col ${className}`}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {/* 메뉴 항목들 */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.length > 0 ? (
            menuItems.map((item) => {
              const IconComponent = iconComponents[item.icon]
              const isActive = isActiveMenuItem(item)
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.url)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  {IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5 bg-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-xs text-blue-600">📋</span>
                    </div>
                  )}
                  <span>{item.title}</span>
                </button>
              )
            })
          ) : (
            /* 메뉴 아이템이 없을 때 빈 상태 표시 */
            <div className="text-center py-8 text-gray-500">
              <p>메뉴 항목이 없습니다.</p>
              <p className="text-sm mt-1">관리자 패널에서 메뉴를 설정해주세요.</p>
            </div>
          )}
        </nav>

      </aside>
    </>
  )
}

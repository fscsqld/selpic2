'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Eye, RefreshCw, Package, Globe } from 'lucide-react'
import { useStore } from '@/lib/store'

interface AdminProductHeaderProps {
  title: string
  icon?: string
  showBackButton?: boolean
  backUrl?: string
  backLabel?: string
  showHomepageLink?: boolean
  showProductsPageLink?: boolean
  showCacheReset?: boolean
  showLanguageSelector?: boolean
  customActions?: React.ReactNode
}

export default function AdminProductHeader({
  title,
  icon,
  showBackButton = true,
  backUrl = '/admin/products',
  backLabel = 'Product Management',
  showHomepageLink = false,
  showProductsPageLink = false,
  showCacheReset = false,
  showLanguageSelector = false,
  customActions
}: AdminProductHeaderProps) {
  
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const { language, setLanguage } = useStore()
  
  const handleCacheReset = () => {
    // localStorage 캐시 초기화
    localStorage.removeItem('selpic-store')
    // 페이지 새로고침
    window.location.reload()
  }

  // 언어 메뉴 외부 클릭 및 키보드 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isLanguageMenuOpen && !target?.closest('.language-menu-container')) {
        setIsLanguageMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false)
      }
    }

    if (isLanguageMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isLanguageMenuOpen])

  return (
    <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 왼쪽: 뒤로가기 버튼 */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <button
                onClick={() => window.location.href = backUrl}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {backLabel}
              </button>
            )}
          </div>

          {/* 중앙: 페이지 타이틀 */}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h1>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center space-x-2">
            {/* 언어 변경 */}
            {showLanguageSelector && (
              <div className="relative language-menu-container">
                <button
                  onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                  className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="언어 변경"
                  aria-label="언어 변경"
                  aria-expanded={isLanguageMenuOpen}
                >
                  <Globe className="h-5 w-5" />
                  <span className="text-sm font-semibold">{language.toUpperCase()}</span>
                </button>
                {isLanguageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-[60]">
                    <button
                      onClick={() => {
                        setLanguage('en')
                        setIsLanguageMenuOpen(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-indigo-50 transition-colors ${language === 'en' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        setLanguage('ko')
                        setIsLanguageMenuOpen(false)
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-medium hover:bg-indigo-50 transition-colors ${language === 'ko' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-700'}`}
                    >
                      한국어
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 상품 페이지 링크 */}
            {showProductsPageLink && (
              <button
                onClick={() => window.open('/stickers', '_blank')}
                className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                title="상품 페이지에서 확인"
              >
                <Package className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">상품페이지</span>
              </button>
            )}

            {/* 캐시 초기화 */}
            {showCacheReset && (
              <button
                onClick={handleCacheReset}
                className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors duration-200"
                title="캐시 초기화 및 새로고침"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">초기화</span>
              </button>
            )}

            {/* 커스텀 액션 버튼들 */}
            {customActions}
          </div>
        </div>
      </div>
    </div>
  )
}

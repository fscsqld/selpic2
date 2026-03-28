'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Menu, X, Search, Globe, Home, Package, ShoppingBag, ArrowRight, Lock, Info, Grid3X3, Smartphone, Flame, Palette, Gift, User, MessageSquare, BarChart3, Users, Settings, Ticket } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useAdminAuth } from '@/lib/adminAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useContentStore } from '@/lib/contentStore'

// 에러 바운더리 컴포넌트
function HeaderErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Header error:', error)
      setHasError(true)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="text-xl font-playfair font-bold text-gray-900 tracking-wider">SELPIC</div>
            <Link href="/login" className="text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return <>{children}</>
}

export default function Header() {
  const router = useRouter()
  const { t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  // 안전한 훅 사용
  const store = useStore()
  const adminAuth = useAdminAuth()
  const userAuth = useUserAuth()
  const { getActiveSidebarMenuItems } = useContentStore()
  
  // 헤더 콘텐츠를 store에서 직접 구독하여 실시간 업데이트 받기
  const contentItems = useContentStore(state => state.contentItems)
  const headerContent = contentItems
    .filter(item => item.section === 'header' && item.isActive)
    .sort((a, b) => a.order - b.order)

  // 클라이언트 마운트 확인 (Hydration 에러 방지)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 안전한 값 추출
  const cart = store?.cart || []
  const language = store?.language || 'ko'
  const setLanguage = store?.setLanguage || (() => {})
  const products = store?.products || []
  const isAdminLoggedIn = adminAuth?.isLoggedIn || false
  const isUserLoggedIn = userAuth?.isLoggedIn || false
  const currentUser = userAuth?.user || null
  const logoutUser = userAuth?.logout || (() => {})
  
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)

  // 헤더 콘텐츠에서 값 추출
  const companyName = headerContent.find(item => item.title === 'Company Name')?.content || 'SELPIC'
  const homeLink = headerContent.find(item => item.title === 'Home Link')
  const loginButton = headerContent.find(item => item.title === 'Login Button')
  const cartButton = headerContent.find(item => item.title === 'Cart Button')
  const searchButtonEnabled = headerContent.find(item => item.title === 'Search Button Enabled')?.content !== 'false'
  const languageSelectorEnabled = headerContent.find(item => item.title === 'Language Selector Enabled')?.content !== 'false'
  const logoItem = headerContent.find(item => item.title === 'Logo Image')
  const useLogoImage = logoItem?.isActive && logoItem?.mediaUrl
  const logoImageUrl = logoItem?.mediaUrl || ''
  
  // Home Link URL 우선순위: 로고 이미지의 linkUrl > Home Link의 linkUrl > 기본값 '/'
  const homeLinkUrl = logoItem?.isActive && logoItem?.linkUrl 
    ? logoItem.linkUrl 
    : (homeLink?.linkUrl || '/')
  
  // Login Link URL: Login Button의 linkUrl 또는 기본값 '/login'
  const loginLinkUrl = loginButton?.linkUrl || '/login'
  
  // Cart Link URL: Cart Button의 linkUrl 또는 기본값 '/cart'
  const cartLinkUrl = cartButton?.linkUrl || '/cart'

  // 사이드바 메뉴 가져오기
  const sidebarMenuItems = getActiveSidebarMenuItems()
  
  // 디버깅: 사이드바 메뉴 로드 확인
  useEffect(() => {
    console.log('🔍 Sidebar menu items loaded:', sidebarMenuItems)
    console.log('🔍 Stamp menu item:', sidebarMenuItems.find(item => item.title === '스탬프'))
    console.log('🔍 Phone Cases menu item:', sidebarMenuItems.find(item => item.title === 'Phone Cases'))
    console.log('🔍 Market S menu item:', sidebarMenuItems.find(item => item.title === 'Market S'))
    console.log('🔍 Custom Design menu item:', sidebarMenuItems.find(item => item.title === 'Custom Design'))
    console.log('🔍 Others menu item:', sidebarMenuItems.find(item => item.title === 'Others'))
    
    // 개발자 도구에서 사용할 수 있는 글로벌 함수 추가
    if (typeof window !== 'undefined') {
      (window as any).resetContentStore = () => {
        const { resetToDefault } = useContentStore.getState()
        resetToDefault()
        console.log('✅ Content store reset via global function')
      }
      (window as any).clearContentStore = () => {
        localStorage.removeItem('content-store')
        console.log('✅ Content store cleared from localStorage')
        window.location.reload()
      }
    }
  }, [sidebarMenuItems])

  const handleLanguageChange = (newLanguage: 'ko' | 'en') => {
    try {
      console.log('🌐 Language change requested:', newLanguage)
      console.log('🌐 Current language before change:', language)
      console.log('🌐 setLanguage function:', typeof setLanguage)
      
      setLanguage(newLanguage)
      
      console.log('🌐 Language after setLanguage call:', newLanguage)
      
      // Force a re-render by checking the store state
      setTimeout(() => {
        const currentLang = useStore.getState().language
        console.log('🌐 Language in store after change:', currentLang)
      }, 100)
      
      setIsLanguageMenuOpen(false)
    } catch (error) {
      console.error('Language change error:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery)
      setIsSearchOpen(false)
      setSearchQuery('')
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNavigation = (path: string) => {
    console.log('🧭 handleNavigation called with path:', path)
    try {
      setIsNavigationOpen(false)
      
      // URL 정규화 및 검증
      let normalizedPath = path.trim()
      if (!normalizedPath) {
        console.error('❌ Empty path provided')
        return
      }
      
      // 상대 경로를 절대 경로로 변환
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = `/${normalizedPath}`
      }
      
      // 잘못된 URL 패턴 수정
      if (normalizedPath.includes('#app/')) {
        normalizedPath = normalizedPath.replace('#app/', '/')
      }
      if (normalizedPath.includes('/page.tsx')) {
        normalizedPath = normalizedPath.replace('/page.tsx', '')
      }
      
      console.log('🧭 Normalized path:', normalizedPath)
      
      // Next.js router 사용
      console.log('🧭 Using Next.js router.push to:', normalizedPath)
      router.push(normalizedPath)
    } catch (error) {
      console.error('❌ Navigation error:', error)
      console.log('🧭 Fallback: using window.location.href to:', path)
      try {
        window.location.href = path
      } catch (fallbackError) {
        console.error('❌ Fallback navigation also failed:', fallbackError)
      }
    }
  }

  // 서버와 클라이언트 렌더링 일치를 위해 로딩 상태 제거
  // 대신 마운트 후에만 동적 콘텐츠 표시

  return (
    <HeaderErrorBoundary>
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* 왼쪽: 네비게이션 토글 버튼 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('📱 Navigation menu button clicked')
                  setIsNavigationOpen(!isNavigationOpen)
                }}
                className="p-3 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200"
              >
                <Menu size={24} />
              </button>
            </div>

            {/* Center: Company Name / Logo */}
            <div className="flex-1 flex justify-center">
              <Link href={homeLinkUrl} className="flex items-center">
                <div className="relative">
                  {useLogoImage ? (
                    <img
                      src={logoImageUrl}
                      alt={companyName}
                      className="h-8 lg:h-10 max-w-[200px] object-contain transform hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // 이미지 로드 실패 시 텍스트로 대체
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const textDiv = document.createElement('div')
                          textDiv.className = 'text-lg lg:text-xl font-playfair font-bold text-gray-800 tracking-wider'
                          textDiv.textContent = companyName
                          parent.appendChild(textDiv)
                        }
                      }}
                    />
                  ) : (
                    <div className="text-lg lg:text-xl font-playfair font-bold text-gray-800 tracking-wider transform hover:scale-105 transition-transform duration-300">
                      {companyName}
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* 우측: 아이콘들 */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              {searchButtonEnabled && (
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔍 Search button clicked')
                    setIsSearchOpen(true)
                  }}
                  className="p-3 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200"
                >
                  <Search size={22} />
                </button>
              )}

              {/* Account / Login */}
              <div className="relative">
                {isUserLoggedIn ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsAccountMenuOpen(!isAccountMenuOpen)
                    }}
                    className="p-3 text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200 flex items-center space-x-2"
                    title={currentUser?.name || currentUser?.email || 'Account'}
                  >
                    <User size={22} />
                    <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">{currentUser?.name || currentUser?.email}</span>
                  </button>
                ) : (
                  <Link href={loginLinkUrl} className="p-3 text-gray-600 transition-all duration-200">
                    <User size={22} />
                  </Link>
                )}

                {isUserLoggedIn && isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.name || currentUser?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50"
                    >
                      {t('ordersPage.title')}
                    </Link>
                    <Link
                      href="/promo-codes"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-pink-50 flex items-center gap-2"
                    >
                      <Ticket className="w-4 h-4" />
                      Promo Codes
                    </Link>
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false)
                        try {
                          logoutUser()
                        } catch (e) {
                          console.error('Logout error:', e)
                        }
                        router.push('/')
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>

              {/* Cart */}
              <Link href={cartLinkUrl} className="relative p-3 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200">
                <ShoppingCart size={22} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* 언어 변경 */}
              {languageSelectorEnabled && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🌐 Language menu button clicked')
                      setIsLanguageMenuOpen(!isLanguageMenuOpen)
                    }}
                    className="p-3 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200 flex items-center space-x-2"
                  >
                    <Globe size={22} />
                    <span className="text-sm font-semibold">{language.toUpperCase()}</span>
                  </button>
                  

                  
                  {isLanguageMenuOpen && (
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('🇺🇸 English language selected')
                          handleLanguageChange('en')
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-pink-50 transition-colors ${
                          language === 'en' ? 'text-pink-600 bg-pink-50' : 'text-gray-700'
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          console.log('🇰🇷 Korean language selected')
                          handleLanguageChange('ko')
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-pink-50 transition-colors ${
                          language === 'ko' ? 'text-pink-600 bg-pink-50' : 'text-gray-700'
                        }`}
                      >
                        한국어
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 사이드 네비게이션 */}
          {isNavigationOpen && (
            <div className="fixed inset-0 z-50">
              {/* 배경 오버레이 */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setIsNavigationOpen(false)}
              />
              
              {/* 사이드 메뉴 */}
              <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300">
                <div className="flex flex-col h-full">
                                                        {/* 헤더 */}
                   <div className="flex items-center justify-between p-6 border-b border-gray-200">
                     <div className="text-2xl font-playfair font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600">
                       SELPIC
                     </div>
                     <div className="flex items-center space-x-2">
                       <button
                         onClick={() => setIsNavigationOpen(false)}
                         className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-full transition-all duration-200"
                       >
                         <X size={24} />
                       </button>
                     </div>
                   </div>

                  {/* 네비게이션 링크들 */}
                  <nav className="flex-1 overflow-y-auto scrollbar-thin max-h-[calc(100vh-120px)]">
                    <div className="p-6 space-y-4">
                      {/* 동적 사이드바 메뉴 렌더링 */}
                      {sidebarMenuItems.map((menuItem) => {
                        // 아이콘 컴포넌트 동적 렌더링
                        const getIconComponent = (iconName: string) => {
                          // 동적 아이콘 컴포넌트 매핑
                          const iconComponents: { [key: string]: React.ComponentType<any> } = {
                            'Home': Home,
                            'BarChart3': BarChart3,
                            'Users': Users,
                            'Package': Package,
                            'ShoppingCart': ShoppingCart,
                            'Settings': Settings,
                            'Info': Info,
                            'Smartphone': Smartphone,
                            'Flame': Flame,
                            'Gift': Gift,
                            'Palette': Palette,
                            'MessageSquare': MessageSquare,
                            'Grid3X3': Grid3X3,
                            'ShoppingBag': ShoppingBag
                          }
                          
                          const IconComponent = iconComponents[iconName]
                          return IconComponent ? <IconComponent size={24} /> : <Home size={24} />
                        }

                        // 메뉴 클릭 핸들러
                        const handleMenuClick = (e: React.MouseEvent) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          console.log('🎯 Menu clicked:', {
                            title: menuItem.title,
                            url: menuItem.url,
                            type: menuItem.type,
                            id: menuItem.id
                          })
                          
                          // 네비게이션 메뉴 닫기
                          setTimeout(() => {
                            setIsNavigationOpen(false)
                          }, 100)
                          
                          if (menuItem.type === 'link') {
                            console.log('🚀 Navigating to:', menuItem.url)
                            
                            // URL 검증 및 정규화
                            let url = menuItem.url?.trim()
                            if (!url) {
                              console.error('❌ Empty URL for menu item:', menuItem.title)
                              return
                            }
                            
                            // 잘못된 URL 패턴 수정
                            if (url.includes('#app/')) {
                              url = url.replace('#app/', '/')
                            }
                            if (url.includes('/page.tsx')) {
                              url = url.replace('/page.tsx', '')
                            }
                            
                            // 스티커 메뉴 링크 수정
                            if (menuItem.title === '스티커' && url === '/products') {
                              url = '/stickers'
                              console.log('🔧 스티커 메뉴 링크 수정:', url)
                            }
                            
                            console.log('🔧 Final URL:', url)
                            
                            // 네비게이션 실행
                            handleNavigation(url)
                            
                          } else if (menuItem.type === 'scroll') {
                            console.log('📜 Scrolling to:', menuItem.url)
                            const targetElement = document.querySelector(menuItem.url)
                            if (targetElement) {
                              targetElement.scrollIntoView({ behavior: 'smooth' })
                            } else {
                              console.warn('⚠️ Scroll target not found:', menuItem.url)
                            }
                          } else if (menuItem.type === 'disabled') {
                            console.log('🚫 Menu item disabled:', menuItem.title)
                            return
                          }
                        }

                        // 비활성화된 메뉴
                        if (menuItem.type === 'disabled') {
                          return (
                            <div key={menuItem.id} className="relative w-full flex items-center space-x-4 p-4 text-lg font-semibold text-gray-400 bg-gray-50 rounded-xl cursor-not-allowed">
                              {getIconComponent(menuItem.icon)}
                              <span>{menuItem.title}</span>
                              {menuItem.isComingSoon && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                          )
                        }

                        // 활성 메뉴
                        return (
                          <button 
                            key={menuItem.id}
                            onClick={handleMenuClick}
                            className="w-full flex items-center space-x-4 p-4 text-lg font-semibold text-gray-700 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-200"
                          >
                            {getIconComponent(menuItem.icon)}
                            <span>{menuItem.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </nav>
                </div>
              </div>
            </div>
          )}

          {/* Search Modal */}
          {isSearchOpen && (
            <div className="fixed inset-0 z-50">
              {/* 배경 오버레이 */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setIsSearchOpen(false)}
              />
              
              {/* Search Modal */}
              <div className="absolute top-0 left-0 right-0 bg-white shadow-2xl">
                <div className="max-w-4xl mx-auto p-6">
                  {/* Search Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Product Search</h2>
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Search Form */}
                  <form onSubmit={handleSearch} className="mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full px-4 py-4 pl-12 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        autoFocus
                      />
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <button
                        type="submit"
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-full transition-colors"
                      >
                        <ArrowRight size={20} />
                      </button>
                    </div>
                  </form>

                  {/* Search Results */}
                  {searchQuery && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Search Results ({filteredProducts.length} items)
                      </h3>
                      
                      {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredProducts.slice(0, 6).map((product) => (
                            <Link
                              key={product.id}
                              href={`/products#${product.id}`}
                              onClick={() => {
                                setIsSearchOpen(false)
                                setSearchQuery('')
                              }}
                              className="block p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <Package className="text-gray-400" size={24} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{product.name}</h4>
                                  <p className="text-sm text-gray-500">{product.category}</p>
                                  <p className="text-lg font-bold text-pink-600">
                                    ${product.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Package className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-gray-500">No search results found.</p>
                          <p className="text-sm text-gray-400 mt-2">Try searching with different keywords.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Popular Search Terms */}
                  {!searchQuery && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">Popular Search Terms</h3>
                      <div className="flex flex-wrap gap-2">
                        {['Sticker', 'Custom', 'Name', 'Gift', 'Deco'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSearchQuery(tag)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-pink-100 hover:text-pink-700 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </HeaderErrorBoundary>
  )
} 
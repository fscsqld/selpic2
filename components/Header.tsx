'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Menu, X, Search, Globe, Home, Package, ShoppingBag, ArrowRight, Lock, Info, Grid3X3, Smartphone, Flame, Palette, Gift, User, MessageSquare, BarChart3, Users, Settings, Ticket, Image as ImageIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useAdminAuth } from '@/lib/adminAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useContentStore } from '@/lib/contentStore'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { HEADER_LOGO_STATIC_FALLBACKS } from '@/lib/headerLogoDisplay'

/** English storefront default for SEO / accessibility (CMS company name may differ). */
const HEADER_LOGO_ALT_EN =
  'Selpic — Australia custom stickers and merchandise'

/** `next/image` + preload: local app assets only (not remote CMS or blob URLs). */
function isOptimizablePublicImageSrc(src: string): boolean {
  const s = src?.trim() ?? ''
  if (!s || s.startsWith('blob:') || s.startsWith('data:') || s.startsWith('indexeddb:')) {
    return false
  }
  if (/^https?:\/\//i.test(s)) return false
  return s.startsWith('/')
}

/**
 * CMS sometimes stores mistaken values (e.g. `public/image`, `/images/logo.png`) as link URLs.
 * Those are not app routes — Next would navigate to `/public/image`. Force `/` for obvious asset paths.
 */
function normalizeHeaderHomeHref(input: string): string {
  const t = (input ?? '').trim()
  if (!t) return '/'

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t)
      const p = u.pathname || ''
      if (/^\/public(\/|$)/i.test(p)) return '/'
    } catch {
      return '/'
    }
    return t
  }

  const path = t.startsWith('/') ? t : `/${t}`
  if (/^\/public(\/|$)/i.test(path)) return '/'
  if (/\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?.*)?$/i.test(path)) return '/'
  if (/^\/images\/logo\.(png|svg)/i.test(path)) return '/'

  return path
}

/** Company display name from CMS (does not require the row to be `isActive`). */
function getHeaderCompanyName(contentItems: { section: string; title: string; content?: string }[]): string {
  const raw = contentItems.find((item) => item.section === 'header' && item.title === 'Company Name')?.content
  const t = typeof raw === 'string' ? raw.trim() : ''
  return t || 'Selpic'
}

/** Error fallback bar: company name text only (logo is reserved for the main header center on the landing bar). */
function HeaderFallbackBar() {
  const contentItems = useContentStore((s) => s.contentItems)
  const companyName = getHeaderCompanyName(contentItems)
  const homeLinkRow = contentItems.find(
    (i) => i.section === 'header' && i.title === 'Home Link' && i.isActive
  )
  const homeUrl = normalizeHeaderHomeHref(homeLinkRow?.linkUrl || '/')

  return (
    <div className="flex justify-between items-center h-12">
      <Link href={homeUrl} className="flex items-center min-w-0 max-w-[70%]">
        <div className="text-xl font-playfair font-bold text-gray-900 tracking-wider truncate">{companyName}</div>
      </Link>
      <Link href="/login" className="text-blue-600 hover:text-blue-700 shrink-0">
        Login
      </Link>
    </div>
  )
}

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
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-[70]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HeaderFallbackBar />
        </div>
      </header>
    )
  }

  return <>{children}</>
}

/** Neutral block when logo URL fails — no company name text (image-only branding). */
export function HeaderLogoPlaceholder({ className }: { className: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded overflow-hidden ${className}`}
      role="img"
      aria-label="Logo"
    >
      <ImageIcon className="w-6 h-6 text-gray-400 shrink-0" aria-hidden />
    </div>
  )
}

/**
 * Never puts invalid schemes on <img src>`. Uses http(s)/data/blob/relative URLs or falls back to
 * `HEADER_LOGO_STATIC_FALLBACKS` (PNG if present, then `/images/logo.svg`, `/logo.svg`).
 * Legacy `indexeddb://` values are treated as missing and use fallbacks.
 */
export function HeaderLogoImage({
  src,
  alt,
  className,
  staticFallbacks = HEADER_LOGO_STATIC_FALLBACKS,
  exhaustedFallback,
  priority = false,
}: {
  src: string
  alt: string
  className: string
  staticFallbacks?: readonly string[]
  /** When primary + all static fallbacks fail, show this instead of the dashed placeholder (e.g. company name). */
  exhaustedFallback?: ReactNode
  /** LCP: use on the sticky header logo when `src` resolves to a local `/…` asset. */
  priority?: boolean
}) {
  const primary = src?.trim() || ''
  const blobUrlRef = useRef<string | null>(null)
  const phaseRef = useRef<'loading' | 'primary' | 'fallback'>('loading')

  const [phase, setPhase] = useState<'loading' | 'primary' | 'fallback'>(() => {
    if (!primary || primary.startsWith('indexeddb://')) return 'fallback'
    return 'primary'
  })
  const [displaySrc, setDisplaySrc] = useState(() => {
    if (!primary || primary.startsWith('indexeddb://')) return staticFallbacks[0] || ''
    return primary
  })
  const [fallbackIndex, setFallbackIndex] = useState(0)
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const applyFallback = useCallback(
    (startIndex: number) => {
      const next = staticFallbacks[startIndex]
      if (next) {
        setPhase('fallback')
        phaseRef.current = 'fallback'
        setFallbackIndex(startIndex)
        setDisplaySrc(next)
        setExhausted(false)
      } else {
        setExhausted(true)
        setDisplaySrc('')
      }
    },
    [staticFallbacks]
  )

  useEffect(() => {
    let cancelled = false
    const revokeBlob = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
    revokeBlob()
    setExhausted(false)
    setFallbackIndex(0)

    if (!primary || primary.startsWith('indexeddb://')) {
      setPhase('fallback')
      phaseRef.current = 'fallback'
      applyFallback(0)
      return () => {
        cancelled = true
        revokeBlob()
      }
    }

    setPhase('primary')
    phaseRef.current = 'primary'
    setDisplaySrc(primary)
    return () => {
      cancelled = true
      revokeBlob()
    }
  }, [primary, applyFallback])

  const handleImgError = () => {
    if (phaseRef.current === 'primary') {
      applyFallback(0)
      return
    }
    setFallbackIndex((idx) => {
      const next = idx + 1
      if (next < staticFallbacks.length) {
        setDisplaySrc(staticFallbacks[next])
        return next
      }
      setExhausted(true)
      setDisplaySrc('')
      return idx
    })
  }

  if (exhausted || !displaySrc) {
    if (exhaustedFallback != null) return <>{exhaustedFallback}</>
    return <HeaderLogoPlaceholder className={className} />
  }

  if (isOptimizablePublicImageSrc(displaySrc)) {
    return (
      <Image
        src={displaySrc}
        alt={alt}
        width={320}
        height={80}
        priority={priority}
        className={`block ${className}`}
        sizes="(max-width: 768px) 70vw, 280px"
        onError={handleImgError}
      />
    )
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={`block ${className}`}
      onError={handleImgError}
    />
  )
}

export default function Header() {
  const router = useRouter()
  const { t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  // 안전한 훅 사용
  const store = useStore()
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

  /**
   * Supabase 세션은 쿠키에 남아 있어도 Zustand `user-auth-store`가 비어 있으면 헤더가 "로그아웃"으로 보인다.
   * persist 복원이 끝난 뒤, 고객 세션만 Zustand에 맞춘다 (스태프는 관리자 스토어/로그인 플로우 사용).
   */
  useEffect(() => {
    if (!isMounted) return
    let cancelled = false

    const syncStorefrontFromSupabase = async () => {
      if (cancelled) return
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      if (!url || !anon) return
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const { userHasAdminAccess } = await import('@/lib/supabase/adminClaims')
        const supabase = createSupabaseBrowserClient()
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        const u = data.session?.user
        if (!u) {
          // Persisted admin store can stay true after stale tab restore on Safari.
          if (useAdminAuth.getState().isLoggedIn) {
            useAdminAuth.setState({ isLoggedIn: false, adminUser: null })
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('admin-auth-updated'))
            }
          }
          return
        }
        // Real Supabase admin JWT: leave legacy admin UI policy to admin routes / login.
        if (userHasAdminAccess(u)) return
        if (useAdminAuth.getState().isLoggedIn) {
          useAdminAuth.setState({ isLoggedIn: false, adminUser: null })
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('admin-auth-updated'))
          }
        }
        // Hydrated customer session: skip re-establish; stale Staff dashboard was cleared above.
        if (!useUserAuth.getState().isLoggedIn) {
          useUserAuth.getState().establishSessionFromSupabaseUser(u)
        }
      } catch {
        /* non-fatal */
      }
    }

    if (useUserAuth.persist.hasHydrated()) {
      void syncStorefrontFromSupabase()
    }
    const unsub = useUserAuth.persist.onFinishHydration(() => {
      if (!cancelled) void syncStorefrontFromSupabase()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [isMounted])

  // 안전한 값 추출
  const cart = store?.cart || []
  const language = store?.language || 'en'
  const products = store?.products || []
  const isUserLoggedIn = userAuth?.isLoggedIn || false
  const currentUser = userAuth?.user || null
  const logoutUser = userAuth?.logout || (() => {})
  const staffSessionActive = useAdminAuth((s) => s.isLoggedIn)

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)

  // Company name: always from CMS "Company Name" row when present (avoid extra brand name when row inactive)
  const companyName = getHeaderCompanyName(contentItems)
  const loginButton = headerContent.find(item => item.title === 'Login Button')
  const cartButton = headerContent.find(item => item.title === 'Cart Button')
  const searchButtonEnabled = headerContent.find(item => item.title === 'Search Button Enabled')?.content !== 'false'
  /** Include inactive rows: `headerContent` drops `isActive: false`, so read from full `contentItems`. */
  const languageSelectorRow = contentItems.find(
    (item) => item.section === 'header' && item.title === 'Language Selector Enabled'
  )
  const languageSelectorEnabled =
    !!languageSelectorRow &&
    languageSelectorRow.isActive !== false &&
    String(languageSelectorRow.content ?? '').trim().toLowerCase() === 'true'
  const logoItem = pickLogoImageItem(contentItems)
  /** Same source as home footer: CMS media (e.g. indexeddb) → static files under `public/` via `HeaderLogoImage`. */
  const logoMediaSrc = (logoItem?.mediaUrl ?? '').trim()
  /** When CMS "Use Logo Image" is on, show image (CMS URL, IndexedDB, or static `/images/*` fallbacks) — not company name text. */
  const useLogoImage = !!logoItem?.isActive

  // Brand logo + company name: always `/` — CMS "Logo Click URL" / "Home Link" were often set to asset paths (e.g. `/public/image`).
  const LOGO_BRAND_HREF = '/' as const

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
        const { resetToDefault } = useContentStore.getState()
        resetToDefault()
        console.log('✅ Content store reset to defaults (Supabase persist via Zustand)')
        window.location.reload()
      }

      if (process.env.NODE_ENV === 'development') {
        const w = window as any
        w.debugHeaderLogo = () => {
          const { contentItems } = useContentStore.getState()
          const logoRows = contentItems.filter(
            (i) => i.section === 'header' && i.title === 'Logo Image'
          )
          const picked = pickLogoImageItem(contentItems)
          const name = getHeaderCompanyName(contentItems)
          const useLogo = !!picked?.isActive
          console.log('[debugHeaderLogo] Company Name (shown when logo off):', name)
          console.log('[debugHeaderLogo] Logo Image row count:', logoRows.length)
          console.table(
            logoRows.map((r) => ({
              id: r.id,
              isActive: r.isActive,
              mediaUrlPrefix: (r.mediaUrl || '').slice(0, 80),
            }))
          )
          console.log(
            '[debugHeaderLogo] pickLogoImageItem:',
            picked
              ? {
                  id: picked.id,
                  isActive: picked.isActive,
                  mediaUrlPrefix: (picked.mediaUrl || '').slice(0, 80),
                }
              : null
          )
          console.log('[debugHeaderLogo] Header center uses logo (not text):', useLogo)
          if (picked?.mediaUrl?.trim().startsWith('indexeddb://')) {
            console.warn(
              '[debugHeaderLogo] Logo URL is legacy indexeddb:// — re-upload in Admin → Images / Content.'
            )
          }
          return { logoRows, picked, useLogoImage: useLogo, companyName: name }
        }
      }
    }
  }, [sidebarMenuItems])

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
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-[70]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-2 md:gap-3 lg:gap-4 min-h-12 py-1.5 lg:py-2">
            {/* Left: logo (sm/md/lg heights 32px / 40px / 50px via Tailwind defaults) */}
            <div className="flex items-center min-w-0 flex-1 md:flex-initial md:max-w-[min(320px,45vw)] lg:max-w-[min(360px,40vw)]">
              <Link
                href={LOGO_BRAND_HREF}
                className="flex items-center justify-start min-w-0 max-w-full"
                aria-label="Home"
              >
                <div className="relative min-h-8 md:min-h-10 lg:min-h-[50px] min-w-0 flex items-center justify-start w-full">
                  {useLogoImage ? (
                    <HeaderLogoImage
                      key={logoMediaSrc || 'header-brand'}
                      src={logoMediaSrc}
                      alt={HEADER_LOGO_ALT_EN}
                      priority
                      className="h-8 md:h-10 lg:h-[50px] object-contain object-left max-w-[min(280px,85vw)] w-auto transform hover:scale-105 transition-transform duration-300 shrink-0"
                      exhaustedFallback={
                        <div className="text-lg lg:text-xl font-playfair font-bold text-gray-800 tracking-wider text-left truncate max-w-full transform hover:scale-105 transition-transform duration-300">
                          {companyName}
                        </div>
                      }
                    />
                  ) : (
                    <div className="text-lg lg:text-xl font-playfair font-bold text-gray-800 tracking-wider transform hover:scale-105 transition-transform duration-300 text-left truncate max-w-full">
                      {companyName}
                    </div>
                  )}
                </div>
              </Link>
            </div>

            {/* Right: search, account, cart, locale, menu (hamburger last on small screens) */}
            <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-3 flex-shrink-0">
              {/* Search */}
              {searchButtonEnabled && (
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔍 Search button clicked')
                    setIsSearchOpen(true)
                  }}
                  type="button"
                  className="p-3 text-gray-600 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                >
                  <Search size={22} />
                </button>
              )}

              {staffSessionActive && (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:inline-flex items-center rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 transition-colors"
                >
                  Staff dashboard
                </Link>
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
                    className="p-3 text-gray-700 rounded-full transition-all duration-200 flex items-center space-x-2 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                    title={currentUser?.name || currentUser?.email || 'Account'}
                  >
                    <User size={22} />
                    <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">{currentUser?.name || currentUser?.email}</span>
                  </button>
                ) : (
                  <Link href={loginLinkUrl} className="p-3 text-gray-600 transition-all duration-200 rounded-full hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]">
                    <User size={22} />
                  </Link>
                )}

                {isUserLoggedIn && isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{currentUser?.name || currentUser?.email}</p>
                    </div>
                    {staffSessionActive && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="block w-full text-left px-4 py-3 text-sm font-medium text-violet-800 hover:bg-violet-50 border-b border-gray-100"
                      >
                        Staff dashboard
                      </Link>
                    )}
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
              <Link href={cartLinkUrl} className="relative p-3 text-gray-600 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]">
                <ShoppingCart size={22} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {languageSelectorEnabled && (
                <div
                  className="p-3 text-gray-600 flex items-center space-x-2 rounded-full"
                  title="Site language: English"
                  aria-label="Site language English"
                >
                  <Globe size={22} />
                  <span className="text-sm font-semibold">{language.toUpperCase()}</span>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('📱 Navigation menu button clicked')
                  setIsNavigationOpen(!isNavigationOpen)
                }}
                className="p-3 text-gray-600 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                aria-expanded={isNavigationOpen}
                aria-label="Open navigation menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>

          {/* 사이드 네비게이션 */}
          {isNavigationOpen && (
            <div className="fixed inset-0 z-[100]">
              {/* 배경 오버레이 */}
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setIsNavigationOpen(false)}
              />
              
              {/* 사이드 메뉴 */}
              <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300">
                <div className="flex flex-col h-full">
                  {/* Drawer: match main bar — logo when CMS enabled, else company name */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 gap-3">
                    <Link
                      href={LOGO_BRAND_HREF}
                      onClick={() => setIsNavigationOpen(false)}
                      className="flex items-center min-h-10 min-w-0 flex-1"
                    >
                      {useLogoImage ? (
                        <HeaderLogoImage
                          key={logoMediaSrc || 'header-drawer-brand'}
                          src={logoMediaSrc}
                          alt={HEADER_LOGO_ALT_EN}
                          className="h-8 md:h-10 lg:h-[50px] max-w-[200px] w-auto object-contain object-left"
                          exhaustedFallback={
                            <span className="text-2xl font-playfair font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 truncate block">
                              {companyName}
                            </span>
                          }
                        />
                      ) : (
                        <span className="text-2xl font-playfair font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 truncate block">
                          {companyName}
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsNavigationOpen(false)}
                        className="p-2 text-gray-600 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
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
            <div className="fixed inset-0 z-[100]">
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
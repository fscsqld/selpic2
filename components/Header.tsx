'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Menu, Search, Globe, User, Image as ImageIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useAdminAuth } from '@/lib/adminAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useContentStore } from '@/lib/contentStore'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { HEADER_LOGO_STATIC_FALLBACKS } from '@/lib/headerLogoDisplay'

const HeaderAccountMenu = dynamic(() => import('@/components/header/HeaderAccountMenu'), {
  ssr: false,
})
const HeaderSearchPanel = dynamic(() => import('@/components/header/HeaderSearchPanel'), {
  ssr: false,
})
const HeaderNavDrawer = dynamic(() => import('@/components/header/HeaderNavDrawer'), {
  ssr: false,
})

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
    const handleError = (event: ErrorEvent) => {
      // Resource failures (broken CMS img/video/script src) fire window "error" but are
      // not Header crashes — re-logging them fails Lighthouse BP and wrongly swaps the bar.
      const target = event.target
      if (target && target !== window && typeof (target as Node).nodeName === 'string') {
        return
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Header runtime error:', event.error || event.message)
      }
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
  const { t } = useTranslation()
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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
  const [staffDashboardReady, setStaffDashboardReady] = useState(false)

  useEffect(() => {
    if (!isMounted || !staffSessionActive) {
      setStaffDashboardReady(false)
      return
    }
    let cancelled = false
    void (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      if (!url || !anon) {
        if (!cancelled) setStaffDashboardReady(staffSessionActive)
        return
      }
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser')
        const { resolveAdminBrowserSession } = await import('@/lib/supabase/resolveAdminBrowserSession')
        const resolved = await resolveAdminBrowserSession(createSupabaseBrowserClient())
        if (!cancelled) setStaffDashboardReady(resolved.ok)
      } catch {
        if (!cancelled) setStaffDashboardReady(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isMounted, staffSessionActive])

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0)

  // Company name: always from CMS "Company Name" row when present (avoid extra brand name when row inactive)
  const companyName = getHeaderCompanyName(contentItems)
  const loginButton = headerContent.find(item => item.title === 'Login Button')
  const cartButton = headerContent.find(item => item.title === 'Cart Button')
  const searchButtonRow = contentItems.find(
    (item) => item.section === 'header' && item.title === 'Search Button Enabled'
  )
  const searchButtonEnabled =
    !!searchButtonRow &&
    searchButtonRow.isActive !== false &&
    String(searchButtonRow.content ?? '').trim().toLowerCase() === 'true'
  /** Include inactive rows: `headerContent` drops `isActive: false`, so read from full `contentItems`. */
  const languageSelectorRow = contentItems.find(
    (item) => item.section === 'header' && item.title === 'Language Selector Enabled'
  )
  const languageSelectorEnabled =
    !!languageSelectorRow &&
    languageSelectorRow.isActive !== false &&
    String(languageSelectorRow.content ?? '').trim().toLowerCase() === 'true'
  // Hydration safety: persisted client stores (auth/cart/content) can differ from SSR snapshot.
  // Keep first client render aligned with server, then reveal live values after mount.
  const hydrationSafeSearchEnabled = isMounted ? searchButtonEnabled : false
  const hydrationSafeLanguageSelectorEnabled = isMounted ? languageSelectorEnabled : false
  const hydrationSafeIsUserLoggedIn = isMounted ? isUserLoggedIn : false
  const hydrationSafeCartItemCount = isMounted ? cartItemCount : 0
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

  // 서버와 클라이언트 렌더링 일치를 위해 로딩 상태 제거
  // 대신 마운트 후에만 동적 콘텐츠 표시

  return (
    <HeaderErrorBoundary>
      <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-[70]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compact sticky header: keep tap targets (p-3 buttons), reduce vertical chrome */}
          <div className="flex justify-between items-center gap-2 md:gap-3 lg:gap-4 min-h-11 py-1 lg:py-1">
            {/* Left: logo (sm/md/lg heights 32px / 40px / 50px via Tailwind defaults) */}
            <div className="flex items-center min-w-0 flex-1 md:flex-initial md:max-w-[min(320px,45vw)] lg:max-w-[min(360px,40vw)]">
              <Link
                href={LOGO_BRAND_HREF}
                className="flex items-center justify-start min-w-0 max-w-full"
                aria-label="Home"
              >
                <div className="relative min-h-7 md:min-h-9 lg:min-h-10 min-w-0 flex items-center justify-start w-full">
                  {useLogoImage ? (
                    <HeaderLogoImage
                      key={logoMediaSrc || 'header-brand'}
                      src={logoMediaSrc}
                      alt={HEADER_LOGO_ALT_EN}
                      priority
                      className="h-7 md:h-9 lg:h-10 object-contain object-left max-w-[min(260px,85vw)] w-auto transform hover:scale-105 transition-transform duration-300 shrink-0"
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
              {hydrationSafeSearchEnabled && (
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('🔍 Search button clicked')
                    setIsSearchOpen(true)
                  }}
                  type="button"
                  aria-label="Open product search"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center p-3 text-gray-700 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                >
                  <Search size={22} aria-hidden />
                </button>
              )}

              {staffDashboardReady && (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:inline-flex items-center rounded-full border border-violet-200 bg-violet-50/90 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 transition-colors"
                >
                  Staff dashboard
                </Link>
              )}

              {/* Account / Login */}
              <div className="relative">
                {hydrationSafeIsUserLoggedIn ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsAccountMenuOpen(!isAccountMenuOpen)
                    }}
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center p-3 text-gray-700 rounded-full transition-all duration-200 flex items-center space-x-2 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                    title={currentUser?.name || currentUser?.email || 'Account'}
                    aria-label="Account menu"
                    aria-expanded={isAccountMenuOpen}
                  >
                    <User size={22} aria-hidden />
                    <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">{currentUser?.name || currentUser?.email}</span>
                  </button>
                ) : (
                  <Link
                    href={loginLinkUrl}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center p-3 text-gray-700 transition-all duration-200 rounded-full hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                    aria-label="Sign in"
                  >
                    <User size={22} aria-hidden />
                  </Link>
                )}

                {hydrationSafeIsUserLoggedIn && isAccountMenuOpen && (
                  <HeaderAccountMenu
                    displayName={currentUser?.name || currentUser?.email || ''}
                    staffDashboardReady={staffDashboardReady}
                    ordersLabel={t('ordersPage.title')}
                    onClose={() => setIsAccountMenuOpen(false)}
                    onLogout={() => {
                      try {
                        logoutUser()
                      } catch (e) {
                        console.error('Logout error:', e)
                      }
                    }}
                  />
                )}
              </div>

              {/* Cart */}
              <Link
                href={cartLinkUrl}
                className="relative inline-flex min-h-11 min-w-11 items-center justify-center p-3 text-gray-700 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                aria-label={
                  hydrationSafeCartItemCount > 0
                    ? `Cart, ${hydrationSafeCartItemCount} items`
                    : 'Cart'
                }
              >
                <ShoppingCart size={22} aria-hidden />
                {hydrationSafeCartItemCount > 0 && (
                  <span
                    suppressHydrationWarning
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
                    aria-hidden
                  >
                    {hydrationSafeCartItemCount}
                  </span>
                )}
              </Link>

              {hydrationSafeLanguageSelectorEnabled && (
                <div
                  className="p-3 text-gray-700 flex items-center space-x-2 rounded-full"
                  title="Site language: English"
                  aria-label="Site language English"
                >
                  <Globe size={22} aria-hidden />
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
                className="inline-flex min-h-11 min-w-11 items-center justify-center p-3 text-gray-700 rounded-full transition-all duration-200 hover:text-[color:var(--color-brand-blue)] hover:bg-[rgba(52,170,220,0.12)]"
                aria-expanded={isNavigationOpen}
                aria-label={isNavigationOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                <Menu size={24} aria-hidden />
              </button>
            </div>
          </div>


          {isNavigationOpen && (
            <HeaderNavDrawer
              menuItems={sidebarMenuItems}
              brandHref={LOGO_BRAND_HREF}
              onClose={() => setIsNavigationOpen(false)}
              brandSlot={
                useLogoImage ? (
                  <HeaderLogoImage
                    key={logoMediaSrc || 'header-drawer-brand'}
                    src={logoMediaSrc}
                    alt={HEADER_LOGO_ALT_EN}
                    className="h-7 md:h-9 lg:h-11 max-w-[200px] w-auto object-contain object-left"
                    exhaustedFallback={
                      <span className="text-2xl font-playfair font-extrabold tracking-wider text-slate-800 truncate block">
                        {companyName}
                      </span>
                    }
                  />
                ) : (
                  <span className="text-2xl font-playfair font-extrabold tracking-wider text-slate-800 truncate block">
                    {companyName}
                  </span>
                )
              }
            />
          )}

          {isSearchOpen && (
            <HeaderSearchPanel
              products={products}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </div>
      </header>
    </HeaderErrorBoundary>
  )
}

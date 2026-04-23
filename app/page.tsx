'use client'

import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, EffectCube, EffectCoverflow, EffectFlip, Autoplay, Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'
import { Package, Palette, Sparkles, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import Header, { HeaderLogoImage } from '@/components/Header'
import NewsletterForm from '@/components/NewsletterForm'
import type { CategoryItem } from '@/lib/contentStore'

type CategoryItemWithType = CategoryItem & { categoryType?: string }

/** Same backdrop as VideoSlide/ImageSlide poster shell — used until client mount so persisted CMS (video vs image) cannot diverge from SSR during hydration. */
const HYDRATION_SAFE_HERO_POSTER_URL =
  'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80'

// ✅ 개발 환경에서만 로그 출력하는 유틸리티 함수
const isDev = process.env.NODE_ENV === 'development'
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args)
}
const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args)
}
// 에러는 프로덕션에서도 출력 (중요한 에러는 항상 확인 필요)
const devError = (...args: any[]) => {
  if (isDev) console.error(...args)
}

// Check if video URL is valid (최적화됨)
const isValidVideoUrl = (url: string): boolean => {
  if (!url || url.trim() === '') {
    return false
  }
  
  // Check for common video file extensions
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.ogv', '.m4v', '.3gp', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.mpg', '.mpeg']
  const hasVideoExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext))
  
  // Check for blob URLs or data URLs
  const isBlobUrl = url.startsWith('blob:')
  const isDataVideoUrl = url.startsWith('data:video/')
  
  // Check for HTTP/HTTPS URLs
  const isHttpUrl = url.startsWith('http://') || url.startsWith('https://')
  
  // Check for relative paths (starting with /)
  const isRelativePath = url.startsWith('/')
  
  // Check for Next.js public folder paths
  const isPublicPath = url.startsWith('/videos/') || url.startsWith('/images/') || url.includes('/public/')
  
  // Check if URL is an image URL (should not be used for video)
  const isImageUrl = url.includes('images.unsplash.com') || 
                    url.includes('images.pexels.com') || 
                    url.includes('.jpg') || 
                    url.includes('.jpeg') || 
                    url.includes('.png') || 
                    url.includes('.gif') || 
                    url.includes('.webp') ||
                    url.startsWith('data:image/')
  
  // If it's an image URL, it's not valid for video
  if (isImageUrl) {
    return false
  }
  
  return hasVideoExtension || isBlobUrl || isDataVideoUrl || (isHttpUrl && !isImageUrl) || isRelativePath || isPublicPath
}

const ImageSlide = React.memo(({ src }: { src: string }) => {
  const s = (src || '').trim()
  const bgUrl =
    !s || s.startsWith('indexeddb://') ? HYDRATION_SAFE_HERO_POSTER_URL : s
  return (
    <div className="relative w-full h-full bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: `url('${bgUrl}')` }}
        aria-hidden
      />
    </div>
  )
})

/** Same normalization as legacy useEffect — SSR + CSR must agree on first paint when src matches. */
function computeVideoSlideSafeSrc(raw: string): string {
  const trimmedSrc = (raw || '').trim()
  if (!trimmedSrc || trimmedSrc.startsWith('indexeddb://')) return ''
  return trimmedSrc.startsWith('data:') ||
    trimmedSrc.startsWith('blob:') ||
    trimmedSrc.startsWith('http://') ||
    trimmedSrc.startsWith('https://')
    ? trimmedSrc
    : encodeURI(trimmedSrc)
}

// Video Slide Component with error handling (최적화됨)
// 학습: 동영상이 전체로 보이도록 항상 object-contain 사용. 잘림 없이 비율 유지, 여백은 bg-black으로 채움.
const VideoSlide = React.memo(({ src, fallbackImage, title, subtitle }: { src: string, fallbackImage: string, title?: string, subtitle?: string }) => {
  const [videoError, setVideoError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [actualSrc, setActualSrc] = useState<string>(() => computeVideoSlideSafeSrc(src))
  const [mediaReady, setMediaReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    setMediaReady(true)
  }, [])

  useEffect(() => {
    const trimmedSrc = (src || '').trim()
    if (!trimmedSrc || trimmedSrc.startsWith('indexeddb://')) {
      setActualSrc('')
      setVideoError(true)
      setVideoLoaded(false)
      return
    }
    const safeSrc = computeVideoSlideSafeSrc(trimmedSrc)
    setActualSrc(safeSrc)
    setVideoError(false)
    setVideoLoaded(false)
  }, [src])
  
  // ✅ 이전 미디어 엘리먼트가 확실히 언마운트되도록 cleanup 처리
  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 비디오 정지 및 리소스 해제 (SSR 안전)
      if (typeof window !== 'undefined' && videoRef.current) {
        try {
          videoRef.current.pause()
          videoRef.current.src = ''
          videoRef.current.load()
        } catch (error) {
          // cleanup 중 에러 무시 (이미 언마운트된 경우)
          devWarn('Video cleanup error:', error)
        }
      }
    }
  }, [])
  
  // Defensive helpers (메모이제이션)
  const isBlobUrl = useMemo(() => typeof actualSrc === 'string' && actualSrc.startsWith('blob:'), [actualSrc])
  const safeFallback = useMemo(() => (fallbackImage && fallbackImage.trim() !== '') ? fallbackImage : '/logo.svg', [fallbackImage])
  
  // ✅ actualSrc 변경 시 에러·로드 상태 초기화
  useEffect(() => {
    setVideoError(false)
    setVideoLoaded(false)
  }, [actualSrc])
  
  
  const handleVideoError = useCallback(() => {
    // ✅ Category Hero Backgrounds와 동일하게 간단한 에러 처리
    setVideoError(true)
  }, [])
  
  const handleVideoLoad = useCallback(() => {
    setVideoLoaded(true)
    setVideoError(false)
  }, [])
  
  const handleVideoCanPlay = useCallback(() => {
    setVideoLoaded(true)
    setVideoError(false)
  }, [])

  // iOS Safari: call play() after paint; ref + muted + playsinline are set in ref callback.
  useLayoutEffect(() => {
    if (videoError || !actualSrc?.trim()) return
    let cancelled = false
    let raf2 = 0
    const tryPlay = () => {
      if (cancelled) return
      const el = videoRef.current
      if (!el) return
      try {
        el.muted = true
      } catch {
        // ignore
      }
      const p = el.play()
      if (p !== undefined && typeof (p as Promise<void>).catch === 'function') {
        ;(p as Promise<void>).catch(() => {})
      }
    }
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(tryPlay)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [actualSrc, videoError])

  // Single non-video shell for SSR, first client paint, and error/empty src — identical DOM avoids hydration mismatch.
  const canRenderVideo =
    mediaReady && !videoError && !!actualSrc && actualSrc.trim() !== ''
  if (!canRenderVideo) {
    return (
      <div className="relative w-full h-full bg-black">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url('${safeFallback}')` }}
          aria-hidden
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* 배경 레이어: 동영상 좌우(또는 상하) 여백을 같은 이미지(fallback)로 채움. 검은 막대 대신 자연스럽게 보이도록 */}
      {safeFallback && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url('${safeFallback}')` }}
          aria-hidden
        />
      )}
      {/* 로딩/에러 시에만 배경 이미지만 보이게 하는 덮개 */}
      {(!videoLoaded || videoError) && safeFallback && (
        <div 
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat z-[11]"
          style={{ backgroundImage: `url('${safeFallback}')` }}
        />
      )}
      
      {/* Video - object-contain으로 전체 노출, 여백은 아래 배경(fallback 이미지)이 비침 */}
      {!videoError && (() => {
        // Use either `src` OR child <source> nodes — not both for the same URL (avoids Safari mobile playback issues).
        const useDirectSrc =
          !isBlobUrl &&
          !!actualSrc &&
          !actualSrc.startsWith('data:') &&
          !actualSrc.startsWith('blob:')
        return (
        <video
          ref={(node) => {
            videoRef.current = node
            if (node) {
              try {
                node.muted = true
                node.setAttribute('playsinline', '')
                node.setAttribute('webkit-playsinline', '')
              } catch {
                // ignore
              }
            }
          }}
          key={actualSrc}
          className="absolute inset-0 w-full h-full z-10 object-contain bg-transparent"
          autoPlay={true}
          muted={true}
          loop={true}
          playsInline
          poster={safeFallback}
          src={useDirectSrc ? actualSrc : undefined}
          onPlaying={() => {
            setVideoLoaded(true)
            setVideoError(false)
          }}
          onError={(e) => {
            const videoElement = e.currentTarget
            const error = videoElement.error
            
            // ✅ Category Hero Backgrounds와 동일하게 간단한 에러 처리
            // ✅ 개발 환경에서만 상세한 에러 정보 로깅
            if (process.env.NODE_ENV === 'development' && error) {
              const errorCode = error.code
              const networkState = videoElement.networkState
              const readyState = videoElement.readyState
              
              // ✅ 에러 코드 의미
              const errorCodeMeaning = errorCode === 1 ? 'MEDIA_ERR_ABORTED' :
                                       errorCode === 2 ? 'MEDIA_ERR_NETWORK' :
                                       errorCode === 3 ? 'MEDIA_ERR_DECODE' :
                                       errorCode === 4 ? 'MEDIA_ERR_SRC_NOT_SUPPORTED' : 
                                       `UNKNOWN (${errorCode})`
              
              // ✅ 개발 환경에서만 경고 메시지 표시
              devWarn('⚠️ VideoSlide: Video error:', {
                errorCode: errorCode,
                errorCodeMeaning: errorCodeMeaning,
                actualSrc: actualSrc?.substring(0, 50),
                isBlobUrl: isBlobUrl,
                networkState: networkState,
                readyState: readyState
              })
              
              // ✅ 네트워크 에러인 경우 파일 경로 확인 안내
              if (errorCode === 2) {
                devWarn('⚠️ MEDIA_ERR_NETWORK: 파일을 찾을 수 없습니다. 파일 경로 확인:', actualSrc?.substring(0, 100))
              }
            }
            
            // ✅ 에러 발생 시 즉시 fallback 이미지로 전환 (무한 루프 방지)
            handleVideoError()
          }}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoCanPlay}
          onLoadedMetadata={() => {
            setVideoLoaded(true)
            setVideoError(false)
          }}
          preload="auto"
          style={{ 
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
        >
          {/* blob/data: no `src` on <video>; use <source> only */}
          {!useDirectSrc && actualSrc && (isBlobUrl || actualSrc.startsWith('data:')) && (
            <>
              <source src={actualSrc} type="video/mp4" />
              <source src={actualSrc} type="video/webm" />
              <source src={actualSrc} type="video/ogg" />
            </>
          )}
        </video>
        )
      })()}
      
      {/* Loading indicator */}
      {!videoError && !videoLoaded && (
        <div className="absolute inset-0 bg-black/20 z-20 flex items-center justify-center">
          <div className="text-white text-sm">Loading...</div>
        </div>
      )}
    </div>
  )
})

// 🆕 displayName 추가 (디버깅 및 React DevTools용)
VideoSlide.displayName = 'VideoSlide'
ImageSlide.displayName = 'ImageSlide'

// Swiper CSS import
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-cube'
import 'swiper/css/effect-coverflow'
import 'swiper/css/effect-flip'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

import { useStore, useStore as useStoreDirect } from '@/lib/store'
import { translations } from '@/lib/translations'
import { useContentStore } from '@/lib/contentStore'
import { pickLogoImageItem } from '@/lib/pickLogoImageItem'
import { COMPANY_CONTACT, COMPANY_LEGAL, COMPANY_LEGAL_LINE } from '@/lib/companyLegal'

const SELPICNBackgroundImage = ({ backgroundImage }: { backgroundImage?: string }) => {
  const defaultImage = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop&q=80'
  const bg = backgroundImage?.trim()
  const imageUrl =
    bg && !bg.startsWith('indexeddb://') ? bg : defaultImage
  
  return (
    <>
      {/* 배경 이미지 레이어 */}
      <div 
        className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-700"
        style={{
          backgroundImage: `url('${imageUrl}')`,
        }}
      ></div>
      
      {/* 오버레이 제거: SELPIC N 배경 이미지 선명하게 표시 */}
    </>
  )
}

export default function HomePage() {
  const { products, language, _hasHydrated, refreshProducts } = useStore()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [swiperInstance, setSwiperInstance] = useState<any>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  const [isClientMounted, setIsClientMounted] = useState(false)

  // Prevent SSR/CSR markup mismatch on iPad Safari when persisted CMS state differs at hydration time.
  useEffect(() => {
    setIsClientMounted(true)
  }, [])

  // 🔧 상품 상태 확인 (개발 환경에서만)
  useEffect(() => {
    if (typeof window !== 'undefined' && isDev) {
      // 페이지 로드 시 상품 상태 확인
      const checkProducts = () => {
        try {
          const storeData = localStorage.getItem('selpic-store')
          if (storeData) {
            const parsed = JSON.parse(storeData)
            const storedProducts = parsed?.state?.products || []
            devLog('📦 [Homepage] Products 상태 확인:', {
              localStorage: storedProducts.length,
              store: products.length,
              localStorageIds: storedProducts.map((p: any) => p.id),
              storeIds: products.map(p => p.id)
            })
            
            // 상품이 없으면 경고
            if (storedProducts.length === 0 && products.length === 0) {
              devWarn('⚠️ [Homepage] 등록된 상품이 없습니다. Product Management에서 상품을 추가해주세요.')
            }
          }
        } catch (error) {
          devError('❌ [Homepage] Products 상태 확인 중 오류:', error)
        }
      }
      
      // 초기 확인
      if (_hasHydrated) {
        checkProducts()
      }
      
      // hydration 완료 후 확인
      const timer = setTimeout(checkProducts, 1000)
      return () => clearTimeout(timer)
    }
  }, [products, _hasHydrated])
  
  // 미디어 파일 변경 감지 (Image Management에서 업로드/수정 시 즉시 반영)
  useEffect(() => {
    // ✅ SSR 안전성 체크
    if (typeof window === 'undefined') {
      return
    }
    
    const handleMediaFilesUpdate = () => {
      devLog('🔄 [Homepage] Media files updated, refreshing...')
      // 강제 리렌더링을 위한 상태 업데이트
      setForceUpdate(prev => prev + 1)
    }
    
    const handleProductsUpdate = (event?: Event) => {
      const customEvent = event as CustomEvent
      const action = customEvent?.detail?.action || 'unknown'
      const productId = customEvent?.detail?.productId
      const updatedProducts = customEvent?.detail?.products
      
      devLog('🔄 [Homepage] Products updated, refreshing...', {
        action: action,
        productId: productId,
        updatedProductsCount: updatedProducts?.length || 0
      })
      
      // ✅ 항상 localStorage에서 최신 products 가져오기 (삭제된 상품 제거 보장)
      try {
        const currentStore = localStorage.getItem('selpic-store')
        if (currentStore) {
          const parsed = JSON.parse(currentStore)
          if (parsed?.state?.products && Array.isArray(parsed.state.products)) {
            // ✅ Zustand store에 직접 설정 (localStorage의 최신 데이터 사용)
            const storeState = useStore.getState()
            useStore.setState({ 
              ...storeState,
              products: parsed.state.products 
            })
            devLog(`✅ [Homepage] Products ${action === 'add' ? 'added' : 'deleted'} - loaded from localStorage:`, {
              productId: productId,
              action: action,
              totalProducts: parsed.state.products.length,
              productIds: parsed.state.products.map((p: any) => p.id)
            })
          } else {
            // localStorage에 products가 없거나 배열이 아니면 빈 배열로 설정
            const storeState = useStore.getState()
            useStore.setState({ 
              ...storeState,
              products: [] 
            })
            devLog('⚠️ [Homepage] No products in localStorage, clearing products')
          }
        } else {
          // localStorage가 없으면 빈 배열로 설정
          const storeState = useStore.getState()
          useStore.setState({ 
            ...storeState,
            products: [] 
          })
          devLog('⚠️ [Homepage] No localStorage data, clearing products')
        }
      } catch (error) {
        console.error('❌ [Homepage] Failed to load products from localStorage:', error)
      }
      
      // 강제 리렌더링을 위한 상태 업데이트
      setForceUpdate(prev => prev + 1)
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'media-store') {
        devLog('🔄 [Homepage] localStorage media-store changed, refreshing...')
        setForceUpdate(prev => prev + 1)
      } else if (e.key === 'content-store') {
        // content-store 변경은 별도의 useEffect에서 처리 (라인 822 참조)
        devLog('🔄 [Homepage] localStorage content-store changed (handled by dedicated listener)')
      } else if (e.key === 'selpic-store') {
        // 🆕 상품 스토어 변경 감지
        devLog('🔄 [Homepage] localStorage selpic-store (products) changed, refreshing...')
        // ✅ Zustand store 강제 새로고침 (customizationOptions 포함)
        refreshProducts()
        setForceUpdate(prev => prev + 1)
      }
    }
    
    // Custom Event 리스너
    window.addEventListener('media-files-updated', handleMediaFilesUpdate)
    window.addEventListener('media-file-uploaded', handleMediaFilesUpdate)
    window.addEventListener('products-store-updated', handleProductsUpdate as EventListener) // 🆕 상품 업데이트 이벤트
    
    // Storage Event 리스너 (다른 탭/페이지에서 변경 시)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('media-files-updated', handleMediaFilesUpdate)
        window.removeEventListener('media-file-uploaded', handleMediaFilesUpdate)
        window.removeEventListener('products-store-updated', handleProductsUpdate) // 🆕 상품 업데이트 이벤트
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [refreshProducts])

  // 상품 개수: store의 products 사용. 미복원 시 localStorage(selpic-store) fallback → 관리자 추가/삭제가 모든 관련 페이지에 반영되도록 동일 데이터 소스 사용.
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
    // Hydration safety: do not read localStorage during first client render.
    // SSR and initial CSR must produce identical text (e.g. "0 products").
    if (isClientMounted && typeof window !== 'undefined' && list.length === 0) {
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
  }, [products, isClientMounted])

  const getProductCountForCategory = useCallback((category: CategoryItemWithType) => {
    const normalize = (value: string | undefined) => (value || '').toLowerCase().replace(/[\s-]/g, '')
    const normalizedType = normalize(category.categoryType)
    const normalizedTitle = normalize(category.title)
    const normalizedLinkUrl = normalize((category as any).linkUrl || '')

    if (
      normalizedType === 'stickers' ||
      normalizedTitle.includes('sticker') ||
      normalizedTitle.includes('namesticker') ||
      normalizedLinkUrl.includes('stickers')
    ) {
      return productCounts.stickers
    }

    if (normalizedType === 'stamps' || normalizedTitle.includes('stamp')) {
      return productCounts.stamps
    }

    if (normalizedType === 'phonecases' || normalizedTitle.includes('phone')) {
      return productCounts.phoneCases
    }

    if (
      normalizedType === 'hotgoods' ||
      normalizedTitle.includes('markets') ||
      normalizedTitle.includes('hotgoods')
    ) {
      return productCounts.marketS
    }

    if (normalizedType === 'bundle' || normalizedTitle.includes('bundle')) {
      return productCounts.bundles
    }

    if (normalizedType && productCounts.byCategory[normalizedType] !== undefined) {
      return productCounts.byCategory[normalizedType]
    }

    return productCounts.byCategory[normalizedTitle] || 0
  }, [productCounts])

  const getCategoryTargetUrl = useCallback((category: CategoryItemWithType) => {
    let targetUrl = (category.linkUrl || '').trim()
    if (category.title === 'Market S') {
      targetUrl = '/hot-goods'
    } else if (category.title === 'Stickers') {
      targetUrl = '/stickers'
    }
    return targetUrl || '/'
  }, [])

  // 현재 언어에 맞는 번역 가져오기
  const t = (key: string) => {
    const keys = key.split('.')
    let value: any = translations[language as keyof typeof translations]
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    return value || key
  }

  // 콘텐츠 관리 시스템에서 콘텐츠 가져오기
  const { _hasHydrated: contentHydrated, setHasHydrated: setContentHydrated, contentItems } = useContentStore()
  const siteConfigRemoteSynced = useContentStore((s) => s.siteConfigRemoteSynced)
  // Subscribe to content changes by selecting contentItems; values below will re-run on change
  // contentItems를 직접 구독하여 변경사항이 즉시 반영되도록 함
  const heroContent = contentItems.filter(item => item.section === 'hero' && item.isActive).sort((a, b) => a.order - b.order)
  const howItWorksContent = contentItems.filter(item => item.section === 'how-it-works' && item.isActive).sort((a, b) => a.order - b.order)
  const footerContent = contentItems.filter(item => item.section === 'footer' && item.isActive).sort((a, b) => a.order - b.order)

  /** Same canonical logo as the header (header → Logo Image). Footer used to print footer "Company Name" text only, so indexeddb logos never appeared. */
  const headerLogoItem = useMemo(() => pickLogoImageItem(contentItems), [contentItems])
  const showFooterLogo = !!(headerLogoItem?.isActive && headerLogoItem?.mediaUrl?.trim())
  const footerLogoSrc = headerLogoItem?.mediaUrl?.trim() || ''
  const footerLogoHref = headerLogoItem?.linkUrl?.trim() || '/'
  const currentYear = useMemo(() => new Date().getUTCFullYear(), [])

  // Footer 링크를 CMS에서 안전하게 읽기 위한 헬퍼
  const getFooterLink = useCallback((
    baseTitle: string,
    defaultUrl: string,
    defaultLabel: string
  ) => {
    const labelItem = footerContent.find(item => item.title === `${baseTitle} Label`)
    const urlItem = footerContent.find(item => item.title === `${baseTitle} URL`)
    const label = (labelItem?.content || '').trim() || defaultLabel
    const url = (urlItem?.linkUrl || '').trim() || defaultUrl
    return { label, url }
  }, [footerContent])

  const quickLinks = useMemo(() => {
    const links = [
      getFooterLink('Quick Links Item 1', '/stickers', 'Stickers'),
      getFooterLink('Quick Links Item 2', '/custom-design', 'Customize'),
      getFooterLink('Quick Links Item 3', '/about', 'About Us'),
      getFooterLink('Quick Links Item 4', '/contact', 'Contact'),
      getFooterLink('Quick Links Item 5', '', ''),
    ]
    return links.filter(link => link.label && link.url)
  }, [getFooterLink, footerContent])

  const helpLinks = useMemo(() => {
    const links = [
      getFooterLink('Help Links Item 1', '/help', 'Help Center'),
      getFooterLink('Help Links Item 2', '/benefits', 'Benefits & Promo Codes'),
      getFooterLink('Help Links Item 3', '/privacy', 'Privacy Policy'),
      getFooterLink('Help Links Item 4', '/terms', 'Terms and Conditions'),
      getFooterLink('Help Links Item 5', '/refund', 'Refund Policy'),
    ]
    return links.filter(link => link.label && link.url)
  }, [getFooterLink, footerContent])

  // 디버깅: Footer content 확인
  useEffect(() => {
    const socialMediaTitle = footerContent.find(item => item.title === 'Social Media Title')
    if (socialMediaTitle) {
      devLog('📄 Footer Social Media Title:', socialMediaTitle.content)
    }
  }, [footerContent])

  // 콘텐츠 스토어 하이드레이션 설정
  useEffect(() => {
    if (!contentHydrated) {
      setContentHydrated(true)
    }
  }, [contentHydrated, setContentHydrated])

  // After hydration, wait for Supabase CMS merge (or timeout) so mobile/incognito never paints bundle defaults as "the site".
  // Must be >= ContentStoreSupabaseSync initial fetch budget so slow phones finish before we show possibly stale localStorage.
  const CMS_SYNC_WAIT_MS = 46_000
  const [cmsSyncTimeout, setCmsSyncTimeout] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setCmsSyncTimeout(true), CMS_SYNC_WAIT_MS)
    return () => window.clearTimeout(t)
  }, [])

  // 콘텐츠 상태 확인 (최적화)
  useEffect(() => {
    if (!contentHydrated) {
      devLog('⏳ Loading content...')
    }
  }, [contentHydrated])



  // Hero 슬라이드 데이터 가져오기
  const { getActiveHeroSlides, heroSlides: storeHeroSlides, categoryItems: allCategoryItems, heroSliderSettings } = useContentStore()
  const heroSlides = getActiveHeroSlides()
  
  // Swiper modules를 useMemo로 메모이제이션 (effect 변경 시에만 재생성)
  // 안전한 기본값 보장
  const swiperModules = useMemo(() => {
    // 기본 모듈 (항상 유효한 값 보장)
    const baseModules = [Autoplay, Navigation, Pagination]
    
    // heroSliderSettings가 없거나 effect가 없으면 기본값 사용
    const effect = heroSliderSettings?.effect || 'fade'
    
    // effect에 따른 모듈 선택
    switch (effect) {
      case 'cube':
        return [EffectCube, ...baseModules]
      case 'coverflow':
        return [EffectCoverflow, ...baseModules]
      case 'flip':
        return [EffectFlip, ...baseModules]
      default:
        return [EffectFade, ...baseModules]
    }
  }, [heroSliderSettings?.effect])
  
  // Hero Slider Settings 변경 시 Swiper 인스턴스 업데이트
  useEffect(() => {
    // heroSliderSettings가 없으면 기본값 사용
    const settings = heroSliderSettings || {
      autoplayDelay: 5000,
      effect: 'fade' as const,
      loop: true,
      speed: 1000
    }
    
    devLog('🔄 Hero Slider Settings:', settings)
    
    if (swiperInstance) {
      // Swiper 설정 업데이트
      if (swiperInstance.params) {
        // autoplay 설정 업데이트
        if (swiperInstance.autoplay) {
          const newDelay = settings.autoplayDelay
          const currentDelay = swiperInstance.params.autoplay?.delay || 5000
          
          // 현재 delay와 다를 때만 업데이트
          if (currentDelay !== newDelay) {
            devLog('⏱️ Updating autoplay delay:', { from: currentDelay, to: newDelay })
            
            swiperInstance.autoplay.stop()
            swiperInstance.params.autoplay = {
              delay: newDelay,
              disableOnInteraction: false,
            }
            // Swiper 업데이트 후 autoplay 재시작
            swiperInstance.update()
            // 약간의 지연 후 재시작 (Swiper 업데이트 완료 대기)
            const autoplayTimeout = setTimeout(() => {
              if (swiperInstance && swiperInstance.autoplay) {
                swiperInstance.autoplay.start()
              }
            }, 100)
            
            return () => clearTimeout(autoplayTimeout)
          }
        }
        
        // speed 설정 업데이트
        const newSpeed = settings.speed
        if (swiperInstance.params.speed !== newSpeed) {
          devLog('⚡ Updating speed:', { from: swiperInstance.params.speed, to: newSpeed })
          swiperInstance.params.speed = newSpeed
          swiperInstance.update()
        }
        
        // loop 설정 업데이트
        const newLoop = settings.loop !== false
        if (swiperInstance.params.loop !== newLoop) {
          devLog('🔁 Updating loop:', { from: swiperInstance.params.loop, to: newLoop })
          swiperInstance.params.loop = newLoop
          swiperInstance.update()
        }
        
        // effect 변경 시 Swiper 재초기화 필요 (key prop으로 처리됨)
      }
    }
  }, [heroSliderSettings, swiperInstance])
  
  // 🆕 heroSlides 변경 시 Swiper 업데이트
  useEffect(() => {
    // 🆕 swiperInstance를 로컬 변수에 저장하여 클로저 문제 방지
    const currentSwiper = swiperInstance
    if (!currentSwiper) {
      devLog('⚠️ HomePage: Swiper instance not available yet')
      return
    }
    
    devLog('🔄 HomePage: heroSlides changed, updating Swiper...', {
      slidesCount: heroSlides.length,
      swiperSlidesCount: currentSwiper.slides?.length || 0,
      forceUpdate: forceUpdate,
      hasUpdateMethod: typeof currentSwiper.update === 'function',
      hasUpdateSlidesMethod: typeof currentSwiper.updateSlides === 'function'
    })
    
    // Swiper 슬라이드 업데이트
    const updateTimeout = setTimeout(() => {
      // 🆕 setTimeout 내부에서도 다시 확인
      const swiper = swiperInstance
      if (!swiper) {
        devWarn('⚠️ HomePage: Swiper instance became unavailable during update')
        return
      }
      
      // 🆕 swiper가 여전히 존재하는지 먼저 확인 (try 블록 밖에서)
      if (!swiper) {
        devWarn('⚠️ HomePage: Swiper instance is null/undefined, skipping update')
        return
      }
      
      try {
        // 🆕 update 메서드가 존재하는지 확인
        if (swiper && typeof swiper.update === 'function') {
          swiper.update()
        }
        
        // 🆕 updateSlides 메서드가 존재하는지 확인 (swiper가 존재하는지 먼저 확인)
        // 🆕 swiper가 null/undefined가 아닌지 다시 한 번 확인
        if (swiper && swiper !== null && swiper !== undefined && typeof swiper.updateSlides === 'function') {
          try {
            // 🆕 호출 직전에 다시 한 번 확인
            if (swiper && swiper.updateSlides) {
              swiper.updateSlides()
            }
          } catch (updateError) {
            devWarn('⚠️ HomePage: updateSlides failed, using update only:', updateError)
          }
        } else {
          devWarn('⚠️ HomePage: updateSlides method not available, using update only')
        }
        
        // 현재 슬라이드가 범위를 벗어나면 첫 번째 슬라이드로 이동
        if (swiper && 
            typeof swiper.slideTo === 'function' && 
            typeof swiper.activeIndex !== 'undefined' &&
            swiper.activeIndex >= heroSlides.length) {
          swiper.slideTo(0, 0)
        }
        
        devLog('✅ HomePage: Swiper updated successfully')
      } catch (error) {
        devError('❌ HomePage: Failed to update Swiper:', error)
      }
    }, 150)
    
    return () => clearTimeout(updateTimeout)
  }, [heroSlides, swiperInstance, forceUpdate])
  
  // categoryItems를 useMemo로 메모이제이션하여 변경 감지 개선
  const categoryItems = useMemo(() => {
    if (!allCategoryItems || !Array.isArray(allCategoryItems)) {
      return []
    }
    const items = allCategoryItems
      .filter((category) => category.isActive)
      .sort((a, b) => a.order - b.order)
    devLog('🏠 HomePage - CategoryItems filtered:', {
      count: items.length,
      categories: items.map((cat) => ({
        id: cat.id,
        title: cat.title,
        description: cat.description,
        emoji: cat.emoji,
        backgroundImage: cat.backgroundImage ? cat.backgroundImage.substring(0, 50) + '...' : 'none',
        gradientFrom: cat.gradientFrom,
        gradientTo: cat.gradientTo,
        linkUrl: cat.linkUrl,
      })),
    })
    return items
  }, [allCategoryItems])

  const resolvedCategoryBackgrounds = useMemo(() => {
    const m: Record<string, string> = {}
    for (const category of categoryItems) {
      const bg = category.backgroundImage?.trim()
      if (bg && !bg.startsWith('indexeddb://')) {
        m[category.id] = bg
      }
    }
    return m
  }, [categoryItems])

  // content-store-updated 이벤트 리스너 추가 (같은 탭에서 변경 감지)
  useEffect(() => {
    const handleContentStoreUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      const updateType = customEvent.detail?.type
      
      // 🆕 heroSlides 업데이트 처리
      if (updateType === 'heroSlides') {
        devLog('🔄 HomePage: content-store-updated 이벤트 감지, heroSlides 새로고침', {
          action: customEvent.detail?.action,
          slideId: customEvent.detail?.slideId
        })
        try {
          const heroSlides = useContentStore.getState().heroSlides
          setForceUpdate(prev => {
            const newValue = prev + 1
            devLog('🔄 HomePage: forceUpdate triggered:', newValue)
            return newValue
          })
          setTimeout(() => {
            const currentSwiper = swiperInstance
            if (!currentSwiper) return
            devLog('🔄 HomePage: Updating Swiper instance...')
            try {
              if (typeof currentSwiper.update === 'function') {
                currentSwiper.update()
              }
              if (typeof currentSwiper.updateSlides === 'function') {
                currentSwiper.updateSlides()
              } else {
                devWarn('⚠️ HomePage: updateSlides method not available, using update only')
              }
              if (
                typeof currentSwiper.slideTo === 'function' &&
                typeof currentSwiper.activeIndex !== 'undefined' &&
                currentSwiper.activeIndex >= heroSlides.length
              ) {
                currentSwiper.slideTo(0, 0)
              }
              devLog('✅ HomePage: Swiper instance updated successfully')
            } catch (error) {
              devError('❌ HomePage: Failed to update Swiper instance:', error)
            }
          }, 150)
        } catch (error) {
          devError('❌ HomePage: heroSlides 업데이트 실패:', error)
        }
      }
      
      // categoryItems 업데이트 처리
      if (updateType === 'categoryItems') {
        devLog('🔄 HomePage: content-store-updated 이벤트 감지, categoryItems 새로고침')
        try {
          const raw = customEvent.detail?.data?.state?.categoryItems as unknown
          if (Array.isArray(raw)) {
            const categoryItems = raw.map((item: any) => ({
              ...item,
              createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt) : item.createdAt,
              updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : item.updatedAt
            }))
            useContentStore.setState({ categoryItems })
            devLog('✅ HomePage: categoryItems 상태 업데이트 완료', categoryItems.length, '개')
          }
        } catch (error) {
          devError('❌ HomePage: categoryItems 업데이트 실패:', error)
        }
      }
      
      // 🆕 heroSliderSettings 업데이트 처리
      if (updateType === 'heroSliderSettings') {
        devLog('🔄 HomePage: content-store-updated 이벤트 감지, heroSliderSettings 새로고침', customEvent.detail?.settings)
        try {
          const settings = customEvent.detail?.settings ?? useContentStore.getState().heroSliderSettings
          if (settings) {
            useContentStore.setState({ heroSliderSettings: settings })
            devLog('✅ HomePage: heroSliderSettings 상태 업데이트 완료', settings)
            setForceUpdate(prev => {
              const newValue = prev + 1
              devLog('🔄 HomePage: forceUpdate triggered for slider settings:', newValue)
              return newValue
            })
          }
        } catch (error) {
          devError('❌ HomePage: heroSliderSettings 업데이트 실패:', error)
        }
      }
    }

    if (typeof window === 'undefined') return
    
    // 🆕 이벤트 리스너 등록
    window.addEventListener('content-store-updated', handleContentStoreUpdate)
    devLog('✅ HomePage: content-store-updated event listener registered')
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('content-store-updated', handleContentStoreUpdate)
        devLog('🔄 HomePage: content-store-updated event listener removed')
      }
    }
  }, [swiperInstance]) // 🆕 swiperInstance를 의존성에 추가하여 최신 인스턴스 사용
  
  // 디버깅: categoryItems 변경 감지
  useEffect(() => {
    devLog('🏠 HomePage - CategoryItems changed:', {
      count: categoryItems.length,
      categories: categoryItems.map(cat => ({
        id: cat.id,
        title: cat.title,
        description: cat.description,
        emoji: cat.emoji,
        backgroundImage: cat.backgroundImage || 'none',
        hasBackgroundImage: !!cat.backgroundImage,
        isSELPICN: cat.title === 'SELPIC N'
      }))
    })
    
    // SELPIC N 카테고리 특별 확인
    const selpicN = categoryItems.find(cat => cat.title === 'SELPIC N')
    if (selpicN) {
      devLog('🎯 SELPIC N Category:', {
        id: selpicN.id,
        title: selpicN.title,
        description: selpicN.description,
        backgroundImage: selpicN.backgroundImage || 'none (using default)',
        hasBackgroundImage: !!selpicN.backgroundImage,
        backgroundImageLength: selpicN.backgroundImage?.length || 0,
        backgroundImagePreview: selpicN.backgroundImage ? selpicN.backgroundImage.substring(0, 100) + '...' : 'none'
      })
      
      // Optional CMS field only: SELPICNBackgroundImage still renders a built-in fallback URL when this is empty,
      // so the tile can look "fine" while backgroundImage is unset — do not treat as a broken layout.
      if (!selpicN.backgroundImage?.trim()) {
        devLog(
          '[Homepage] SELPIC N: optional category.backgroundImage is empty; built-in fallback image is used. Set a custom URL in Admin → Categories only if you want to replace it.'
        )
      }
    } else {
      devLog('[Homepage] No category row titled "SELPIC N" in active categoryItems.')
    }
    
    // 모든 카테고리의 title과 description 확인
    categoryItems.forEach(cat => {
      devLog(`📋 Category "${cat.title}":`, {
        id: cat.id,
        title: cat.title,
        description: cat.description,
        emoji: cat.emoji
      })
    })
  }, [categoryItems])
  
  // 디버깅: heroSlides 확인 (개발 모드에서만)
  devLog('=== Hero Slides Debug ===')
  devLog('Active Hero Slides Length:', heroSlides.length)
  devLog('========================')
  
  // 카테고리 데이터 디버깅
  devLog('=== Category Items Debug ===')
  devLog('Category Items:', categoryItems)
  devLog('Market S Category:', categoryItems.find(item => item.title === 'Market S'))
  devLog('========================')

  // 기본 히어로 슬라이드 데이터 (heroSlides가 비어있을 경우 사용)
  const defaultHeroSlides = [
    {
      id: 'default-1',
      type: 'image' as const,
      src: 'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      fallbackImage: 'https://images.unsplash.com/photo-1618472043393-b31d17f5b5d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      title: 'Selpic',
      subtitle: 'Premium Sticker Shop',
      color: 'blue' as const,
      order: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      linkUrl: undefined,
      isEventBanner: false,
      eventStartDate: undefined,
      eventEndDate: undefined
    },
    {
      id: 'default-3',
      type: 'image' as const,
      src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      fallbackImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      title: 'High Quality',
      subtitle: 'Professional Grade Materials',
      color: 'green' as const,
      order: 3,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      linkUrl: undefined,
      isEventBanner: false,
      eventStartDate: undefined,
      eventEndDate: undefined
    }
  ]

  // Hero 슬라이드 데이터 최적화 (메모이제이션)
  const slidesToUse = useMemo(() => {
    const slides = heroSlides.length > 0 ? heroSlides : defaultHeroSlides
    
    // ✅ 이벤트 배너 필터링을 map 전에 수행 (return null 방지)
    const filteredSlides = slides.filter((slide) => {
      // 이벤트 배너인지 확인
      const isEventBanner = slide.isEventBanner && slide.linkUrl
      const isEventActive = isEventBanner && (
        (!slide.eventStartDate || new Date(slide.eventStartDate) <= new Date()) &&
        (!slide.eventEndDate || new Date(slide.eventEndDate) >= new Date())
      )
      
      // 이벤트 배너가 아니거나 활성화된 경우에만 포함
      return !isEventBanner || isEventActive
    })
    
    // ✅ order 기준으로 정렬 (중요: Swiper가 올바른 순서로 슬라이드를 표시하도록)
    // ✅ order 값이 같더라도 고유성을 유지할 수 있도록 id를 보조 정렬 기준으로 사용
    const sortedSlides = [...filteredSlides].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      // order가 같으면 id로 정렬하여 고유성 유지
      return a.id.localeCompare(b.id)
    })

    // CMS had slides but event/date filters removed all → Swiper rendered zero slides (blank hero).
    // Same if every slide lacked id/src at page level — fall back to bundled defaults.
    if (sortedSlides.length === 0) {
      const fallbackFiltered = defaultHeroSlides.filter((slide) => {
        const isEventBanner = !!(slide.isEventBanner && slide.linkUrl)
        const isEventActive =
          isEventBanner &&
          ((!slide.eventStartDate || new Date(slide.eventStartDate) <= new Date()) &&
            (!slide.eventEndDate || new Date(slide.eventEndDate) >= new Date()))
        return !isEventBanner || isEventActive
      })
      const fallbackSorted = [...fallbackFiltered].sort((a, b) =>
        a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)
      )
      devWarn('[HomePage] No visible hero slides after CMS/event filter — using defaults', {
        heroSlidesCount: heroSlides.length,
      })
      devLog('🔄 [HomePage] slidesToUse fallback:', {
        slidesToUseCount: fallbackSorted.length,
      })
      return fallbackSorted.length > 0 ? fallbackSorted : defaultHeroSlides
    }

    devLog('🔄 [HomePage] slidesToUse updated:', {
      heroSlidesCount: heroSlides.length,
      slidesToUseCount: sortedSlides.length,
      filteredCount: slides.length - filteredSlides.length,
      forceUpdate: forceUpdate,
      slides: sortedSlides.map((s, idx) => ({
        index: idx,
        id: s.id,
        title: s.title,
        order: s.order,
        type: s.type,
        src: s.src ? s.src.substring(0, 50) + '...' : 'empty',
      })),
    })
    return sortedSlides
  }, [heroSlides, forceUpdate]) // 🆕 forceUpdate도 의존성에 추가

  // Swiper loop with 0–1 slides breaks on some Safari/iPad builds (blank slider).
  const heroLoopEnabled =
    slidesToUse.length > 1 && (heroSliderSettings?.loop !== false)

  // localStorage 변경 감지 및 상태 동기화 (최적화됨)
  useEffect(() => {
    // ✅ SSR 안전성 체크
    if (typeof window === 'undefined') {
      return
    }
    
    const handleStorageChange = () => {
      devLog('🔄 Storage change detected, refreshing hero slides')
      setForceUpdate(prev => prev + 1)
    }

    // storage 이벤트 리스너 (다른 탭에서의 변경 감지)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])



  // Background CMS sync: no sticky text banner — thin top line + optional spinner (non-blocking).
  const showStorefrontSyncLoading = isClientMounted && !siteConfigRemoteSynced && !cmsSyncTimeout
  const showStorefrontSyncError = isClientMounted && !siteConfigRemoteSynced && cmsSyncTimeout

  // ✅ 상품이 없어도 홈페이지 표시 (관리자가 아직 등록 안 했거나 전부 삭제한 경우)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      {showStorefrontSyncLoading && (
        <>
          <div className="storefront-cms-sync-line" aria-hidden />
          <span className="sr-only">Updating storefront content in the background</span>
          <div
            className="fixed bottom-5 right-5 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-md ring-1 ring-slate-200/80 pointer-events-none md:bottom-6 md:right-6"
            aria-hidden
          >
            <Loader2 className="h-4 w-4 animate-spin text-sky-600/70" strokeWidth={2.5} />
          </div>
        </>
      )}
      {showStorefrontSyncError && (
        <div
          className="fixed bottom-4 left-1/2 z-40 max-w-[min(92vw,22rem)] -translate-x-1/2 rounded-full border border-amber-200/90 bg-amber-50/95 px-4 py-2.5 shadow-lg backdrop-blur-sm pointer-events-auto"
          role="status"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 text-center">
            <p className="text-xs text-amber-950/90">
              Still on cached content. Pull to refresh or retry.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              Retry
            </button>
          </div>
        </div>
      )}
      
      {/* Hero Section - CASETiFY 스타일 슬라이딩 */}
      <section className="relative min-h-screen overflow-hidden" aria-labelledby="home-primary-heading">
        {/* Single document heading for SEO (one h1 per page). Visually minimal; slides keep h2 for slide-specific titles. */}
        <h1
          id="home-primary-heading"
          className="sr-only"
        >
          Selpic
        </h1>
          {isClientMounted ? (
          <>
            {/* Swiper Slider */}
            <Swiper
              key={`swiper-${heroSliderSettings?.effect || 'fade'}-${heroSliderSettings?.speed || 1000}-${heroLoopEnabled}-${slidesToUse.length}-${slidesToUse.map(s => `${s.id}-${s.type}`).join('-')}-${forceUpdate}`}
              modules={swiperModules}
              effect={(heroSliderSettings?.effect || 'fade') as any}
              speed={heroSliderSettings?.speed || 1000}
              autoplay={{
                delay: heroSliderSettings?.autoplayDelay || 5000,
                disableOnInteraction: false,
              }}
              loop={heroLoopEnabled}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              pagination={{
                clickable: true,
                el: '.swiper-pagination',
              }}
              onSlideChange={(swiper) => {
            // ✅ loop={true} 설정 시 realIndex와 activeIndex가 어긋나지 않도록 처리
            // loop 모드에서는 realIndex를 우선 사용, 없으면 activeIndex 사용
            const realIndex = swiper.realIndex !== undefined && swiper.realIndex !== null 
              ? swiper.realIndex 
              : (swiper.activeIndex !== undefined ? swiper.activeIndex : 0)
            
            // realIndex가 유효한 범위 내에 있는지 확인
            const validIndex = realIndex >= 0 && realIndex < slidesToUse.length ? realIndex : 0
            setCurrentSlide(validIndex)
            
            devLog('🔄 Slide changed:', {
              realIndex: swiper.realIndex,
              activeIndex: swiper.activeIndex,
              validIndex: validIndex,
              slidesCount: slidesToUse.length,
              currentSlideId: slidesToUse[validIndex]?.id,
              currentSlideTitle: slidesToUse[validIndex]?.title,
              isLoopMode: heroLoopEnabled
            })
              }}
              onSwiper={(swiper) => {
                setSwiperInstance(swiper)
                devLog('✅ Swiper initialized:', {
                  slidesCount: slidesToUse.length,
                  slides: Array.isArray(slidesToUse) ? slidesToUse.map(s => ({ id: s?.id || '', title: s?.title || '', order: s?.order || 0 })) : []
                })
              }}
              className="h-screen w-full"
            >
              {Array.isArray(slidesToUse) && slidesToUse.length > 0 ? slidesToUse.map((slide, index) => {
            // ✅ 안전성 체크: slide 객체와 필수 속성 확인
            if (!slide || !slide.id) {
              devWarn('⚠️ Invalid slide object:', slide)
              return null
            }
            
            // ✅ 이벤트 배너 필터링은 이미 slidesToUse에서 완료됨
            // 모든 슬라이드에 linkUrl이 있으면 클릭 가능
            const hasLink = slide.linkUrl && slide.linkUrl.trim() !== ''
            const isEventBanner = slide.isEventBanner && slide.linkUrl
            
            // ✅ Stable unique key per list position (duplicate slide.id + React list reconciliation)
            const uniqueKey = `hero-slide-${slide.id}-${index}`
            const mediaKey = `${slide.type || 'image'}-${slide.id}-${index}`
            
            return (
              <SwiperSlide key={uniqueKey} className={`relative ${hasLink ? 'cursor-pointer' : ''}`}>
                {/* Background Content */}
                <div className="absolute inset-0 w-full h-full">
                  {/* ✅ 슬라이드 전환 시 잔상이 남지 않도록 조건부 렌더링으로 이전 미디어 엘리먼트 확실히 언마운트 */}
                  {slide.type === 'video' ? (
                    <VideoSlide 
                      key={mediaKey}
                      src={slide.src || ''} 
                      fallbackImage={slide.fallbackImage || ''}
                      title={slide.title}
                      subtitle={slide.subtitle}
                    />
                  ) : (
                    <ImageSlide key={mediaKey} src={slide.src || ''} />
                  )}
                  
                  {/* Color Overlay — visual only; must not intercept touches (iPad Safari / Swiper) */}
                  <div
                    className={`pointer-events-none absolute inset-0 z-20 ${
                    slide.color === 'pink' ? 'bg-pink-500/20' :
                    slide.color === 'blue' ? 'bg-blue-500/20' :
                    slide.color === 'yellow' ? 'bg-yellow-500/20' :
                    slide.color === 'purple' ? 'bg-purple-500/20' :
                    slide.color === 'green' ? 'bg-green-500/20' :
                    'bg-gray-500/20'
                  }`}
                  />
                  
                  {/* 선명도 유지: 얕은 그라데이션만 (텍스트 가독용) */}
                  <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
                
                {/* Content */}
                <div className="relative z-30 flex items-center justify-center h-full">
                  <div className="text-center text-white max-w-4xl mx-auto px-4">
                    <div className="space-y-8">
                      {/* Slide Content */}
                      <div className="space-y-6">
                        {slide.title && (
                          <h2 className="text-3xl lg:text-5xl font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {slide.title}
                          </h2>
                        )}
                        {slide.subtitle && (
                          <p className="text-xl lg:text-2xl font-medium leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-90">
                            {slide.subtitle}
                          </p>
                        )}
                      </div>
                      
                      {/* CTA Buttons */}
                      <div className="flex justify-center items-center">
                        {hasLink ? (
                          <Link 
                            href={slide.linkUrl!}
                            className="bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            {isEventBanner ? 'Buy Now →' : 'Learn More →'}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            )
              }).filter(Boolean) : null}
            </Swiper>
        
            {/* Floating Elements - Between Text and Pagination */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-selpic-pink-400 rounded-full opacity-60 animate-float blur-sm" style={{animationDelay: '0s'}}></div>
              <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-selpic-blue-400 rounded-full opacity-50 animate-float blur-sm" style={{animationDelay: '2s'}}></div>
              <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 bg-selpic-yellow-400 rounded-full opacity-40 animate-float blur-sm" style={{animationDelay: '4s'}}></div>
            </div>
        
            {/* Custom Pagination - Center Aligned with Background */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
              <div className="swiper-pagination-container">
                <div className="swiper-pagination flex space-x-4">
                  {Array.isArray(slidesToUse) && slidesToUse.length > 0 ? slidesToUse.map((slide, index) => (
                    <div
                      key={`pagination-${slide?.id ?? 'slide'}-${index}`}
                      className={`w-4 h-4 rounded-full transition-all duration-300 cursor-pointer border-2 border-white/40 ${
                        currentSlide === index 
                          ? 'bg-white scale-125 shadow-lg shadow-white/50' 
                          : 'bg-white/60 hover:bg-white/80 hover:scale-110'
                      }`}
                      onClick={() => {
                        if (swiperInstance) {
                          // 🆕 loop 모드에서는 realIndex를 사용하여 정확한 슬라이드로 이동
                          const targetIndex = heroSliderSettings?.loop !== false ? index : index
                          swiperInstance.slideTo(targetIndex)
                        }
                      }}
                    />
                  )) : null}
                </div>
              </div>
            </div>
        
            {/* Scroll Indicator — decorative only */}
            <div className="pointer-events-none absolute bottom-2 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
              <div className="w-6 h-10 border-2 border-white/60 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-white/80 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </>
          ) : (
            <div
              className="h-screen w-full relative bg-black"
              aria-busy="true"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                style={{ backgroundImage: `url('${HYDRATION_SAFE_HERO_POSTER_URL}')` }}
                aria-hidden
              />
            </div>
          )}
      </section>



      {/* Product Categories Section - CASETiFY 스타일 */}
      <section id="shop-by-category" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h2>
            <p className="text-xl text-gray-600">
              Discover our amazing product collections
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categoryItems.map((category) => {
              const productCount = getProductCountForCategory(category)
              const backgroundImageUrl = resolvedCategoryBackgrounds[category.id] || category.backgroundImage
              const targetUrl = getCategoryTargetUrl(category)

              return (
                <Link
                  key={category.id}
                  href={targetUrl}
                  className={`group relative overflow-hidden rounded-3xl ${
                    category.title === 'SELPIC N' 
                      ? 'bg-white' 
                      : backgroundImageUrl
                        ? ''
                        : `bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo}`
                  } min-h-[400px] cursor-pointer transform hover:scale-105 transition-all duration-500 shadow-xl`}
                  style={backgroundImageUrl && category.title !== 'SELPIC N' ? {
                    backgroundImage: `url('${backgroundImageUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : category.title === 'SELPIC N' && backgroundImageUrl ? {
                    backgroundImage: `url('${backgroundImageUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                  onClick={() => {
                    devLog('🎯 Category clicked:', {
                      title: category.title,
                      linkUrl: category.linkUrl,
                      id: category.id,
                      targetUrl,
                    })
                  }}
                >
                  {/* SELPIC N 전용 배경 이미지 */}
                  {category.title === 'SELPIC N' && (
                    <SELPICNBackgroundImage backgroundImage={category.backgroundImage} />
                  )}
                  
                  {/* 오버레이 제거: 배경 이미지 선명하게 표시 */}
                  
                  <div className="relative z-10 p-8 h-full flex flex-col justify-between text-white">
                    <div className={category.title === 'SELPIC N' ? 'mt-[-8px]' : ''}>
                      <div className={`text-6xl mb-4 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] ${category.title === 'SELPIC N' ? 'transform group-hover:scale-110 transition-transform duration-300' : ''}`}>
                        {category.emoji}
                      </div>
                      <h3 className={`text-3xl font-bold mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] drop-shadow-[0_0_12px_rgba(0,0,0,0.7)] ${category.title === 'SELPIC N' ? 'font-playfair tracking-wider text-4xl bg-gradient-to-r from-green-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent' : ''}`}>
                        {category.title || 'Untitled Category'}
                      </h3>
                      <p className="text-lg opacity-95 mb-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]">
                        {category.description || ''}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.tags.map((tag, index) => (
                          <span 
                            key={`${category.id}-tag-${index}-${String(tag)}`} 
                            className={`px-3 py-1 rounded-full text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
                              category.title === 'SELPIC N' 
                                ? 'bg-white/30 backdrop-blur-sm border border-white/40' 
                                : 'bg-white/20'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {category.title !== 'Custom Design' && category.title !== 'SELPIC N' && (
                        <span className="text-sm opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {`${productCount} products`}
                        </span>
                      )}
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    </div>
                  </div>
                  
                </Link>
              )
            })}
          </div>
        </div>
      </section>



      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              {howItWorksContent.find(item => item.title === 'How It Works Title')?.content || howItWorksContent.find(item => item.title === 'How It Works 제목')?.content || t('home.howItWorks.title')}
            </h2>
            {(() => {
              const subtitle = howItWorksContent.find(item => item.title === 'How It Works Subtitle')?.content || howItWorksContent.find(item => item.title === 'How It Works 부제목')?.content || t('home.howItWorks.subtitle')
              return subtitle ? (
                <p className="text-2xl lg:text-3xl font-playfair font-bold text-gray-900 tracking-wide">
                  {subtitle}
                </p>
              ) : null
            })()}
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {howItWorksContent.find(item => item.title === 'Step 1 Title')?.content || howItWorksContent.find(item => item.title === '1단계 제목')?.content || t('home.howItWorks.step1.title')}
              </h3>
              <p className="text-gray-600">
                {howItWorksContent.find(item => item.title === 'Step 1 Description')?.content || howItWorksContent.find(item => item.title === '1단계 설명')?.content || t('home.howItWorks.step1.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {howItWorksContent.find(item => item.title === 'Step 2 Title')?.content || howItWorksContent.find(item => item.title === '2단계 제목')?.content || t('home.howItWorks.step2.title')}
              </h3>
              <p className="text-gray-600">
                {howItWorksContent.find(item => item.title === 'Step 2 Description')?.content || howItWorksContent.find(item => item.title === '2단계 설명')?.content || t('home.howItWorks.step2.description')}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {howItWorksContent.find(item => item.title === 'Step 3 Title')?.content || howItWorksContent.find(item => item.title === '3단계 제목')?.content || t('home.howItWorks.step3.title')}
              </h3>
              <p className="text-gray-600">
                {howItWorksContent.find(item => item.title === 'Step 3 Description')?.content || howItWorksContent.find(item => item.title === '3단계 설명')?.content || t('home.howItWorks.step3.description')}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            {showFooterLogo ? (
              <Link
                href={footerLogoHref}
                className="inline-block mb-4 max-w-full"
                aria-label="Home"
              >
                <HeaderLogoImage
                  key={footerLogoSrc}
                  src={footerLogoSrc}
                  alt=""
                  className="h-10 max-w-[220px] w-auto object-contain object-left"
                />
              </Link>
            ) : (
              <h3 className="text-white text-2xl font-bold mb-4">
                {footerContent.find(item => item.title === 'Company Name')?.content || 'Selpic'}
              </h3>
            )}
            <p className="text-gray-400">
              {footerContent.find(item => item.title === 'Company Description')?.content || 'Your digital sticker journey starts here. Customize and print your own stickers with ease.'}
            </p>
            <p className="text-gray-500 text-[11px] mt-2 whitespace-pre-line">
              {`ABN: ${COMPANY_LEGAL.abn}\nACN: ${COMPANY_LEGAL.acn}`}
            </p>
            <p className="text-gray-500 text-[11px] mt-2 whitespace-nowrap">
              {String(COMPANY_CONTACT.address || '').replace(/Address:\s*/i, '')}
            </p>
            <p className="text-gray-500 text-[11px] whitespace-nowrap">
              Email: {COMPANY_CONTACT.email}
            </p>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">
              {footerContent.find(item => item.title === 'Quick Links Title')?.content || 'Quick Links'}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={`quick-link-${link.url}`}>
                  <Link href={link.url} className="text-gray-400 hover:text-white transition-colors duration-300 text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">
              {footerContent.find(item => item.title === 'Help/Useful Links Title')?.content || 'Help/Useful Links'}
            </h3>
            <ul className="space-y-2">
              {helpLinks.map((link) => (
                <li key={`help-link-${link.url}`}>
                  <Link
                    href={link.url}
                    className="text-gray-400 hover:text-white transition-colors duration-300 text-sm whitespace-nowrap"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white text-lg font-bold mb-4">
              {footerContent.find(item => item.title === 'Newsletter Title')?.content || 'Newsletter'}
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
              {footerContent.find(item => item.title === 'Newsletter Description')?.content || 'Subscribe to our newsletter for updates.'}
            </p>
            <NewsletterForm variant="dark" />
          </div>
        </div>
        <div className="mt-16 text-center text-gray-500 text-sm">
          &copy; {currentYear} {footerContent.find(item => item.title === 'Copyright Information')?.content || 'Selpic'}. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { CategoryHeroSlide } from '@/lib/contentStore'

// 디바운스 유틸리티 함수
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

interface SlidingBackgroundProps {
  slides: CategoryHeroSlide[]
  className?: string
  onSlideChange?: (currentIndex: number) => void // 🆕 현재 슬라이드 인덱스 변경 콜백
}

// Image Slide Component (indexeddb:// 형식 지원)
const ImageSlide = ({ src }: { src: string }) => {
  const [actualSrc, setActualSrc] = useState<string>(src)
  const [imageError, setImageError] = useState(false)
  
  // indexeddb:// 형식의 URL을 IndexedDB에서 파일을 가져와서 실제 URL로 변환
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      if (src && src.startsWith('indexeddb://')) {
        const fileId = src.replace('indexeddb://', '')
        try {
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (fileUrl) {
            console.log('✅ ImageSlide: Loaded file from IndexedDB:', fileId)
            setActualSrc(fileUrl)
          } else {
            console.error('❌ ImageSlide: File not found in IndexedDB:', fileId)
            setImageError(true)
          }
        } catch (error) {
          console.error('❌ ImageSlide: Failed to load file from IndexedDB:', error)
          setImageError(true)
        }
      } else {
        setActualSrc(src)
      }
    }
    
    loadFromIndexedDB()
  }, [src])
  
  if (imageError || !actualSrc || actualSrc.trim() === '') {
    return (
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat bg-gray-800"
      />
    )
  }

  // 해상도 향상: 2x 크기로 배경을 그린 뒤 scale(0.5)로 축소해 Retina/고DPI에서 선명하게 표시
  return (
    <div className="w-full h-full overflow-hidden" style={{ isolation: 'isolate' }}>
      <div
        className="bg-cover bg-center bg-no-repeat"
        style={{
          width: '200%',
          height: '200%',
          transform: 'scale(0.5)',
          transformOrigin: '0 0',
          backgroundImage: `url('${actualSrc}')`,
          imageRendering: 'auto'
        }}
        onError={() => setImageError(true)}
      />
    </div>
  )
}

// Video Slide Component (홈페이지와 동일한 형식)
const VideoSlide = ({ 
  src, 
  fallbackImage, 
  videoRef,
  pauseOnMobile,
  shouldPreload = false
}: { 
  src: string
  fallbackImage?: string
  videoRef?: (video: HTMLVideoElement | null) => void
  pauseOnMobile?: boolean
  shouldPreload?: boolean // 현재 슬라이드인지 여부
}) => {
  const normalizedSrc = (src || '').trim()
  const [videoError, setVideoError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  // indexeddb://는 바로 비디오에 들어가면 알 수 없는 스킴으로 에러가 나므로, 최초에는 비워두고 로드 후 설정
  const [actualSrc, setActualSrc] = useState<string>(normalizedSrc.startsWith('indexeddb://') ? '' : normalizedSrc)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  
  const safeFallback = fallbackImage && fallbackImage.trim() !== '' ? fallbackImage : '/logo.svg'
  
  // videoRef 콜백 호출
  useEffect(() => {
    if (videoRef && videoElementRef.current) {
      videoRef(videoElementRef.current)
    }
  }, [videoRef, videoElementRef.current])
  
  // indexeddb:// 형식의 URL을 IndexedDB에서 파일을 가져와서 실제 URL로 변환
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      const trimmedSrc = (src || '').trim()
      if (trimmedSrc.startsWith('indexeddb://')) {
        // 로딩 중에는 비워서 <video>가 indexeddb:// 스킴을 직접 보지 않도록 함
        setActualSrc('')
        setVideoError(false)
        setVideoLoaded(false)
        const fileId = trimmedSrc.replace('indexeddb://', '')
        try {
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (fileUrl) {
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ VideoSlide: Loaded file from IndexedDB:', fileId)
            }
            setActualSrc(fileUrl)
            // 비디오 로드 명시적 호출
            setTimeout(() => {
              if (videoElementRef.current && fileUrl) {
                try {
                  videoElementRef.current.load()
                } catch (error) {
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('VideoSlide: Failed to load video after IndexedDB restore:', error)
                  }
                }
              }
            }, 100)
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ VideoSlide: File not found in IndexedDB (using fallback image):', fileId)
            }
            setVideoError(true)
            setActualSrc('') // 잘못된 indexeddb://가 비디오에 꽂히지 않도록 비운다
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ VideoSlide: Failed to load file from IndexedDB (using fallback image):', error)
          }
          setVideoError(true)
          setActualSrc('') // 실패 시에도 비워둔다
        }
      } else if (trimmedSrc) {
        // 일반 URL인 경우
        const safeSrc = trimmedSrc.startsWith('data:') || trimmedSrc.startsWith('blob:') || trimmedSrc.startsWith('http://') || trimmedSrc.startsWith('https://')
          ? trimmedSrc
          : encodeURI(trimmedSrc)
        setActualSrc(safeSrc)
        setVideoError(false)
        setVideoLoaded(false)
      } else {
        setActualSrc('')
        setVideoError(true)
      }
    }
    
    loadFromIndexedDB()
  }, [src])
  
  useEffect(() => {
    setVideoError(false)
    setVideoLoaded(false)
  }, [actualSrc])
  
  const handleVideoError = () => {
    setVideoError(true)
  }
  
  const handleVideoLoad = () => {
    setVideoLoaded(true)
    setVideoError(false)
  }
  
  if (videoError || !actualSrc || actualSrc.trim() === '') {
    return (
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${safeFallback}')` }}
      />
    )
  }
  
  // ✅ blob URL 체크
  const isBlobUrl = typeof actualSrc === 'string' && actualSrc.startsWith('blob:')
  
  return (
    <div className="relative w-full h-full">
      {/* Fallback Image - Show only when video has error or not loaded yet */}
      {(!videoLoaded || videoError) && safeFallback && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url('${safeFallback}')` }}
        />
      )}
      
      {/* Video - Show when not in error state */}
      {/* ✅ 비디오 재생 안정화: muted, autoPlay, loop, playsInline 속성 필수 포함 */}
      {!videoError && actualSrc && actualSrc.trim() !== '' && (
        <video
          ref={(el) => {
            videoElementRef.current = el
            if (videoRef && el) {
              videoRef(el)
            }
          }}
          key={actualSrc}
          className="absolute inset-0 w-full h-full object-cover z-10"
          autoPlay={!pauseOnMobile}
          muted={true}
          loop={true}
          playsInline={true}
          poster={safeFallback}
          src={!isBlobUrl && actualSrc && !actualSrc.startsWith('data:') ? actualSrc : undefined}
          onError={handleVideoError}
          onLoadedData={handleVideoLoad}
          onCanPlay={handleVideoLoad}
          preload={shouldPreload ? "auto" : "metadata"}
          style={{ 
            opacity: videoLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out'
          }}
        >
          {/* blob/data URL인 경우 source 태그 사용 */}
          {(isBlobUrl || actualSrc.startsWith('data:')) && (
            <>
              <source src={actualSrc} type="video/mp4" />
              <source src={actualSrc} type="video/webm" />
              <source src={actualSrc} type="video/ogg" />
            </>
          )}
        </video>
      )}
      
      {/* Loading indicator */}
      {!videoError && !videoLoaded && actualSrc && actualSrc.trim() !== '' && (
        <div className="absolute inset-0 bg-black/20 z-5 flex items-center justify-center">
          <div className="text-white text-sm">Loading...</div>
        </div>
      )}
      
      {/* Error state - Show fallback or error message */}
      {videoError && !safeFallback && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-white">
            <p className="text-sm">Video failed to load</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SlidingBackground({ slides, className = '', onSlideChange }: SlidingBackgroundProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  const hasInitializedRef = useRef(false) // 🆕 초기화 여부 추적
  
  // videoRef 콜백을 useCallback으로 메모이제이션
  const handleVideoRef = useCallback((slideId: string) => {
    return (video: HTMLVideoElement | null) => {
      if (video) {
        videoRefs.current.set(slideId, video)
      } else {
        videoRefs.current.delete(slideId)
      }
    }
  }, [])

  // 클라이언트에서만 렌더링하여 Hydration 에러 방지
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 화면 크기 감지 및 디바이스 타입 설정 (디바운싱 적용)
  useEffect(() => {
    if (!isMounted) return

    const updateDeviceType = () => {
      const width = window.innerWidth
      if (width < 768) {
        setDeviceType('mobile')
      } else if (width >= 768 && width <= 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    updateDeviceType()
    
    // 디바운싱 적용 (300ms 지연)
    const debouncedUpdateDeviceType = debounce(updateDeviceType, 300)
    window.addEventListener('resize', debouncedUpdateDeviceType)

    return () => {
      window.removeEventListener('resize', debouncedUpdateDeviceType)
    }
  }, [isMounted])

  // 모바일에서 비디오 자동 일시정지
  useEffect(() => {
    if (deviceType !== 'mobile') return

    const currentSlide = slides[currentSlideIndex]
    if (!currentSlide || currentSlide.type !== 'video') return

    const pauseVideoOnMobile = currentSlide.responsive?.mobile?.pauseVideoOnMobile !== false

    if (pauseVideoOnMobile) {
      // 모든 비디오 일시정지
      videoRefs.current.forEach((video) => {
        if (video && !video.paused) {
          video.pause()
        }
      })
    } else {
      // 현재 슬라이드의 비디오만 재생
      const currentVideo = videoRefs.current.get(currentSlide.id)
      if (currentVideo && currentVideo.paused) {
        currentVideo.play().catch(() => {
          // 자동 재생 실패 시 무시 (브라우저 정책)
        })
      }
    }
  }, [deviceType, currentSlideIndex, slides])

  // 슬라이드 자동 전환 (5초마다)
  useEffect(() => {
    if (!slides || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => {
        const newIndex = (prevIndex + 1) % slides.length
        // 🆕 슬라이드 변경 시 부모 컴포넌트에 알림 (다음 틱으로 지연)
        if (onSlideChange) {
          setTimeout(() => {
            onSlideChange(newIndex)
          }, 0)
        }
        return newIndex
      })
    }, 5000) // 5초마다 전환

    return () => clearInterval(interval)
  }, [slides, onSlideChange])

  // 🆕 초기 슬라이드 인덱스 전달 (마운트 후 한 번만)
  useEffect(() => {
    if (isMounted && onSlideChange && slides && slides.length > 0 && !hasInitializedRef.current) {
      // 초기 마운트 후 한 번만 콜백 호출
      const timeoutId = setTimeout(() => {
        onSlideChange(0)
        hasInitializedRef.current = true
      }, 0)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isMounted, onSlideChange, slides])

  // 🆕 슬라이드 변경 시 콜백 호출 (초기화 후에만)
  useEffect(() => {
    if (hasInitializedRef.current && onSlideChange && slides && slides.length > 0) {
      // 슬라이드 변경 시에만 콜백 호출 (다음 이벤트 루프로 지연)
      const timeoutId = setTimeout(() => {
        onSlideChange(currentSlideIndex)
      }, 0)
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentSlideIndex, onSlideChange, slides])

  // 디버깅 (개발 환경에서만)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && slides && slides.length > 0) {
      console.log('🎬 SlidingBackground:', {
        slidesCount: slides.length,
        currentSlideIndex,
        deviceType,
        slides: slides.map((s, index) => ({ 
          id: s.id, 
          index,
          speed: s.speed, 
          direction: s.direction, 
          type: s.type,
          opacity: s.opacity,
          isVisible: index === currentSlideIndex
        }))
      })
    }
  }, [slides, currentSlideIndex, deviceType])

  if (!isMounted) {
    return null
  }

  // slides가 없거나 비어있을 때 기본 배경 표시
  if (!slides || slides.length === 0) {
    return (
      <div 
        className={`absolute inset-0 overflow-hidden bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 ${className}`}
        style={{ zIndex: 0 }}
      />
    )
  }

  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
    >
      {slides.map((slide, index) => {
        // 지연 로딩: 현재 슬라이드와 다음 슬라이드만 렌더링
        const isCurrentSlide = index === currentSlideIndex
        const isNextSlide = index === (currentSlideIndex + 1) % slides.length
        const shouldRender = isCurrentSlide || isNextSlide
        
        // 렌더링하지 않을 슬라이드는 null 반환
        if (!shouldRender) {
          return null
        }
        
        // 반응형 설정 가져오기
        const responsiveSettings = slide.responsive?.[deviceType]
        const speed = responsiveSettings?.speed ?? slide.speed ?? 5
        const opacity = responsiveSettings?.opacity ?? slide.opacity ?? 1
        const pauseVideoOnMobile = slide.responsive?.mobile?.pauseVideoOnMobile !== false
        
        const direction = slide.direction || 'left'
        const effect = slide.effect || 'slide'
        
        // 애니메이션 속도 계산 (1-10을 초 단위로 변환)
        const duration = `${20 - speed * 1.5}s` // 5-17.5초 범위
        const transitionDuration = `${2 + (10 - speed) * 0.3}s` // 페이드/줌 전환 시간
        
        // 효과에 따른 애니메이션 설정 (계산 최적화)
        const getAnimationStyle = () => {
          switch (effect) {
            case 'slide':
              // 슬라이딩 효과 (기존 로직)
              switch (direction) {
                case 'left':
                  return {
                    animation: `slideLeft ${duration} linear infinite`
                  }
                case 'right':
                  return {
                    animation: `slideRight ${duration} linear infinite`
                  }
                case 'up':
                  return {
                    animation: `slideUp ${duration} linear infinite`
                  }
                case 'down':
                  return {
                    animation: `slideDown ${duration} linear infinite`
                  }
                default:
                  return {
                    animation: `slideLeft ${duration} linear infinite`
                  }
              }
            case 'fade':
              // 페이드 인/아웃 효과
              return {
                animation: `fadeInOut ${transitionDuration} ease-in-out infinite`
              }
            case 'zoom':
              // 줌 인/아웃 효과
              return {
                animation: `zoomInOut ${transitionDuration} ease-in-out infinite`
              }
            case 'rotate':
              // 회전 효과
              return {
                animation: `rotate ${duration} linear infinite`
              }
            case 'blend':
              // 블렌드 모드 효과 (정적, 애니메이션 없음)
              return {}
            default:
              return {
                animation: `slideLeft ${duration} linear infinite`
              }
          }
        }
        
        // 효과에 따른 추가 스타일
        const getEffectStyle = () => {
          switch (effect) {
            case 'blend':
              return {
                mixBlendMode: 'multiply' as const,
                filter: 'brightness(0.8) contrast(1.2)'
              }
            default:
              return {}
          }
        }

        // 슬라이딩 효과를 위해 이미지를 복제하여 연속적으로 배치
        const renderMedia = () => {
          if (slide.type === 'video') {
            return (
              <VideoSlide 
                src={slide.src || ''} 
                fallbackImage={slide.fallbackImage || ''}
                videoRef={handleVideoRef(slide.id)}
                pauseOnMobile={deviceType === 'mobile' && pauseVideoOnMobile}
                shouldPreload={isCurrentSlide}
              />
            )
          } else {
            // 이미지의 경우 indexeddb:// 형식 처리
            return (
              <ImageSlide src={slide.src || ''} />
            )
          }
        }

        // 효과에 따라 다른 레이아웃 적용
        if (effect === 'slide') {
          // 슬라이딩 효과 (기존 로직)
          if (direction === 'left' || direction === 'right') {
            return (
              <div
                key={slide.id}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                style={{
                  opacity: isCurrentSlide ? opacity : 0,
                  width: '200%',
                  display: 'flex',
                  visibility: isCurrentSlide ? 'visible' : 'hidden',
                  ...getAnimationStyle(),
                  ...getEffectStyle()
                }}
              >
                <div className="w-1/2 h-full">
                  {renderMedia()}
                </div>
                <div className="w-1/2 h-full">
                  {renderMedia()}
                </div>
              </div>
            )
          } else {
            // up, down 방향
            return (
              <div
                key={slide.id}
                className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                style={{
                  opacity: isCurrentSlide ? opacity : 0,
                  height: '200%',
                  display: 'flex',
                  flexDirection: 'column',
                  visibility: isCurrentSlide ? 'visible' : 'hidden',
                  ...getAnimationStyle(),
                  ...getEffectStyle()
                }}
              >
                <div className="w-full h-1/2">
                  {renderMedia()}
                </div>
                <div className="w-full h-1/2">
                  {renderMedia()}
                </div>
              </div>
            )
          }
        } else {
          // Fade, Zoom, Rotate, Blend 효과
          return (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
              style={{
                opacity: isCurrentSlide ? opacity : 0,
                visibility: isCurrentSlide ? 'visible' : 'hidden',
                ...getAnimationStyle(),
                ...getEffectStyle()
              }}
            >
              {renderMedia()}
            </div>
          )
        }
      })}
      
      {/* 선명도 유지를 위해 Opacity Overlay 및 강한 그라데이션 제거. 텍스트 가독용으로만 아주 얕은 그라데이션 유지 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 슬라이딩 애니메이션 */
          @keyframes slideLeft {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          
          @keyframes slideRight {
            0% {
              transform: translateX(-50%);
            }
            100% {
              transform: translateX(0);
            }
          }
          
          @keyframes slideUp {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-50%);
            }
          }
          
          @keyframes slideDown {
            0% {
              transform: translateY(-50%);
            }
            100% {
              transform: translateY(0);
            }
          }
          
          /* 페이드 인/아웃 애니메이션 (선명도 유지: 최저 opacity 상향) */
          @keyframes fadeInOut {
            0%, 100% {
              opacity: 0.85;
            }
            50% {
              opacity: 1;
            }
          }
          
          /* 줌 인/아웃 애니메이션 */
          @keyframes zoomInOut {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.2);
            }
          }
          
          /* 회전 애니메이션 */
          @keyframes rotate {
            0% {
              transform: rotate(0deg) scale(1.1);
            }
            100% {
              transform: rotate(360deg) scale(1.1);
            }
          }
        `
      }} />
    </div>
  )
}


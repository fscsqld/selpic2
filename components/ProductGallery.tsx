'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import ImageGallery from 'react-image-gallery'
import 'react-image-gallery/styles/image-gallery.css'
import { useMediaStore } from '@/lib/mediaStore'
import { ImageIcon } from 'lucide-react'

function isValidFallbackUrl(url: unknown): url is string {
  return typeof url === 'string' && url.trim() !== '' && url !== 'undefined' && !url.startsWith('undefined')
}

interface ProductGalleryProps {
  productId: string
  className?: string
  showThumbnails?: boolean
  showFullscreenButton?: boolean
  showPlayButton?: boolean
  showBullets?: boolean
  autoPlay?: boolean
  slideInterval?: number
  fallbackImage?: string
}

export default function ProductGallery({
  productId,
  className = '',
  showThumbnails = true,
  showFullscreenButton = true,
  showPlayButton = false,
  showBullets = false,
  autoPlay = false,
  slideInterval = 3000,
  fallbackImage
}: ProductGalleryProps) {
  const { getMediaFilesByProduct, mediaFiles, getMediaFileById, refreshMediaFilesFromStorage } = useMediaStore()

  // 마운트 시 localStorage에서 미디어 스토어 즉시 동기화 (persist 복원 전에도 연결 이미지 목록 확보)
  useEffect(() => {
    if (!productId || typeof window === 'undefined') return
    refreshMediaFilesFromStorage()
  }, [productId, refreshMediaFilesFromStorage])

  // 첫 방문 시에도 fallback 이미지를 즉시 표시 (미디어 스토어 복원 전에도 상품 대표 이미지 노출)
  const [galleryImages, setGalleryImages] = useState<any[]>(() => {
    if (isValidFallbackUrl(fallbackImage)) {
      return [{
        original: fallbackImage,
        thumbnail: fallbackImage,
        originalAlt: 'Product image',
        thumbnailAlt: 'Product thumbnail',
        description: '',
        originalClass: 'gallery-image',
        thumbnailClass: 'gallery-thumbnail'
      }]
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(() => !isValidFallbackUrl(fallbackImage))
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set())
  const retryAttemptsRef = useRef<Record<string, number>>({})

  // productId로 연결된 미디어 가져오기 (이미지 + 동영상)
  const productMedia = useMemo(() => {
    if (!productId) return []
    
    const media = getMediaFilesByProduct(productId)
    // 이미지와 동영상 모두 포함
    return media.filter(file => file.type === 'image' || file.type === 'video')
  }, [productId, getMediaFilesByProduct, mediaFiles]) // mediaFiles를 의존성에 추가하여 변경 감지

  // media-files-updated 이벤트 리스너 (새로고침 없이 갤러리 업데이트)
  useEffect(() => {
    const handleMediaFilesUpdate = (e: CustomEvent) => {
      const eventDetail = e.detail as { productId?: string; fileId?: string; action?: string }
      
      // 이 상품과 관련된 파일이 업데이트된 경우에만 갤러리 새로고침
      if (eventDetail?.productId === productId || !eventDetail?.productId) {
        console.log('🔄 [ProductGallery] Media files updated, refreshing gallery:', eventDetail)
        
        // 강제 리렌더링을 위해 상태 업데이트 (productImages가 변경되면 자동으로 갤러리 업데이트됨)
        // mediaFiles가 변경되면 useMemo가 자동으로 재계산되므로 추가 작업 불필요
      }
    }

    window.addEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
    window.addEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)

    return () => {
      window.removeEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
      window.removeEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)
    }
  }, [productId])

  const getImageUrlWithFallback = async (
    file: any,
    _restoredUrl?: string
  ): Promise<{ imageUrl: string | null; originalUrl: string | null; triedUrls: string[] }> => {
    const triedUrls: string[] = []
    const urlPriority = [file.webpUrl, file.url, file.dataUrl].filter(Boolean) as string[]

    for (const url of urlPriority) {
      if (
        !url ||
        typeof url !== 'string' ||
        url.trim() === '' ||
        url === 'undefined' ||
        url.startsWith('undefined') ||
        url.startsWith('indexeddb://')
      ) {
        continue
      }
      triedUrls.push(url)
      return { imageUrl: url, originalUrl: url, triedUrls }
    }

    return { imageUrl: null, originalUrl: null, triedUrls }
  }

  // 이미지 자동 복구 함수
  const recoverImage = async (fileId: string, fileName?: string): Promise<string | null> => {
    const maxRetries = 3
    const currentAttempts = retryAttemptsRef.current[fileId] || 0
    
    if (currentAttempts >= maxRetries) {
      console.warn(`⚠️ [ProductGallery] Max retry attempts reached for file: ${fileId}`)
      return null
    }
    
    retryAttemptsRef.current[fileId] = currentAttempts + 1
    
    try {
      console.log(`🔄 [ProductGallery] Attempting to recover image: ${fileId} (attempt ${currentAttempts + 1}/${maxRetries})`)
      
      // 1. mediaStore에서 파일 재조회
      const file = getMediaFileById(fileId)
      if (!file) {
        console.warn(`⚠️ [ProductGallery] File not found in store: ${fileId}`)
        return null
      }
      
      const { imageUrl } = await getImageUrlWithFallback(file)
      if (imageUrl) {
        console.log(`✅ [ProductGallery] Found valid URL in existing data: ${fileId}`)
        return imageUrl
      }
      
      console.warn(`⚠️ [ProductGallery] Could not recover image: ${fileId}`)
      return null
    } catch (error) {
      console.error(`❌ [ProductGallery] Error recovering image ${fileId}:`, error)
      return null
    }
  }

  // react-image-gallery 형식으로 변환 (모든 이미지 유효성 검사 포함)
  useEffect(() => {
    // 연결된 미디어가 없으면 fallback만 즉시 표시 (로딩 스피너 없이 첫 방문에서도 이미지 노출)
    if (productMedia.length === 0) {
      let cancelled = false

      const showFallback = async () => {
        if (!isValidFallbackUrl(fallbackImage)) {
          if (!cancelled) {
            setGalleryImages([])
            setIsLoading(false)
          }
          return
        }

        setIsLoading(true)
        const finalFallback =
          fallbackImage.startsWith('indexeddb://') ? '' : fallbackImage

        if (!cancelled) {
          if (finalFallback) {
            setGalleryImages([{
              original: finalFallback,
              thumbnail: finalFallback,
              originalAlt: 'Product image',
              thumbnailAlt: 'Product thumbnail',
              description: '',
              originalClass: 'gallery-image',
              thumbnailClass: 'gallery-thumbnail'
            }])
          } else {
            setGalleryImages([])
          }
          setIsLoading(false)
        }
      }

      showFallback()
      return () => {
        cancelled = true
      }
      return
    }

    setIsLoading(true)
    console.log('🖼️ [ProductGallery] Processing media:', {
      productId,
      productMediaCount: productMedia.length,
      fallbackImage: fallbackImage ? 'exists' : 'none',
      failedImageIdsCount: failedImageIds.size
    })

    const processMedia = async () => {
      const formattedImagesPromises = productMedia
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) // order 순서대로 정렬
        .map(async (file) => {
          const { imageUrl, originalUrl, triedUrls } = await getImageUrlWithFallback(file)
        
        // URL 유효성 검사
        if (!imageUrl || !originalUrl) {
          console.warn(`⚠️ [ProductGallery] Invalid URL for file: ${file.name || file.id}`, {
            webpUrl: file.webpUrl,
            url: file.url,
            dataUrl: file.dataUrl ? 'exists' : 'none',
            triedUrls
          })
          
          // 실패한 이미지 ID 기록
          if (file.id) {
            setFailedImageIds(prev => new Set(prev).add(file.id))
          }
          
          return null
        }
        
        // 실패 목록에서 제거 (복구됨)
        if (failedImageIds.has(file.id)) {
          setFailedImageIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(file.id)
            return newSet
          })
        }
        
        // 🆕 동영상인 경우 Fallback Image 사용
        const isVideo = file.type === 'video'
        const videoThumbnail = isVideo && file.thumbnailUrl ? file.thumbnailUrl : (isVideo && fallbackImage ? fallbackImage : null)
        const finalThumbnail = isVideo && videoThumbnail ? videoThumbnail : imageUrl
        
        return {
          original: originalUrl,
          thumbnail: finalThumbnail || imageUrl,
          originalAlt: file.name || 'Product media',
          thumbnailAlt: file.name || 'Product thumbnail',
          description: '', // 갤러리에는 이미지만 표시, 텍스트(설명) 제거
          // react-image-gallery가 지원하는 추가 속성
          originalClass: 'gallery-image',
          thumbnailClass: 'gallery-thumbnail',
          // 파일 ID 저장 (에러 처리용)
          fileId: file.id,
          fileName: file.name || '',
          // 백업 URL 목록 저장
          backupUrls: triedUrls,
          // 🆕 동영상 정보
          isVideo: isVideo,
          videoUrl: isVideo ? originalUrl : undefined,
          fallbackImageUrl: isVideo && fallbackImage ? fallbackImage : undefined
        }
        })
      
      const formattedImagesResults = await Promise.all(formattedImagesPromises)
      let formattedImages = formattedImagesResults.filter(
        (img): img is NonNullable<typeof img> =>
          img !== null && !!img.original && !!img.thumbnail
      )

      // 연결된 이미지가 없고 fallback 이미지가 있으면 추가
      if (formattedImages.length === 0) {
        const isValidFallback = fallbackImage && 
                                typeof fallbackImage === 'string' && 
                                fallbackImage.trim() !== '' && 
                                fallbackImage !== 'undefined' &&
                                !fallbackImage.startsWith('undefined')
        
        if (isValidFallback && !fallbackImage.startsWith('indexeddb://')) {
          const finalFallbackImage = fallbackImage
          console.log('✅ [ProductGallery] Using fallback image:', finalFallbackImage)
          formattedImages.push({
            original: finalFallbackImage,
            thumbnail: finalFallbackImage,
            originalAlt: 'Product image',
            thumbnailAlt: 'Product thumbnail',
            description: '',
            originalClass: 'gallery-image',
            thumbnailClass: 'gallery-thumbnail',
            fileId: 'fallback',
            fileName: 'fallback',
            backupUrls: [] as string[],
            isVideo: false,
            videoUrl: undefined,
            fallbackImageUrl: undefined,
          })
        } else {
          console.log('⚠️ [ProductGallery] No images found and fallback is invalid:', {
            fallbackImage,
            fallbackImageType: typeof fallbackImage
          })
        }
      } else {
        console.log(`✅ [ProductGallery] Found ${formattedImages.length} linked image(s)`)
      }

      setGalleryImages(formattedImages)
      setIsLoading(false)
    }
    
    processMedia()
  }, [productMedia, fallbackImage, productId])

  // 이미지가 없을 때
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gallery...</p>
        </div>
      </div>
    )
  }

  if (galleryImages.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ minHeight: '400px' }}>
        <div className="text-center text-gray-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">No images available</p>
          <p className="text-sm">Images will appear here when linked to this product in Image Management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`product-gallery-wrapper ${className}`}>
      <ImageGallery
        items={galleryImages}
        showThumbnails={showThumbnails}
        showFullscreenButton={showFullscreenButton}
        showPlayButton={showPlayButton}
        showBullets={showBullets}
        autoPlay={autoPlay}
        slideInterval={slideInterval}
        slideDuration={450}
        thumbnailPosition="bottom"
        useBrowserFullscreen={true}
        lazyLoad={true}
        // 스타일 커스터마이징
        renderItem={(item) => {
          const safeAlt = item.originalAlt || item.thumbnailAlt || 'Product media'
          const fileId = (item as any).fileId
          const fileName = (item as any).fileName || ''
          const backupUrls = (item as any).backupUrls || []
          const isVideo = (item as any).isVideo || false
          const videoUrl = (item as any).videoUrl
          const fallbackImageUrl = (item as any).fallbackImageUrl || fallbackImage
          
          // 🆕 동영상인 경우 동영상 렌더링
          if (isVideo && videoUrl) {
            return (
              <div className="image-gallery-image relative">
                <video
                  className="w-full max-h-[600px] object-contain bg-black"
                  controls
                  playsInline
                  preload="metadata"
                  poster={fallbackImageUrl || undefined}
                  src={videoUrl}
                  aria-label={safeAlt}
                />
              </div>
            )
          }
          
          // 이미지인 경우 기존 로직
          return (
            <div className="image-gallery-image">
              <img
                src={item.original}
                alt={safeAlt}
                className="w-full h-full object-contain"
                style={{ maxHeight: '600px' }}
                loading="lazy"
                onError={async (e) => {
                  const img = e.currentTarget
                  const currentSrc = img.src
                  
                  console.warn(`⚠️ [ProductGallery] Image load failed: ${safeAlt}`, {
                    currentSrc,
                    fileId,
                    fileName,
                    backupUrlsCount: backupUrls.length
                  })

                  if (backupUrls.length > 0) {
                    const nextUrlIndex = backupUrls.findIndex((url: string) => url === currentSrc) + 1
                    if (nextUrlIndex < backupUrls.length) {
                      const nextUrl = backupUrls[nextUrlIndex]
                      if (!nextUrl.startsWith('indexeddb://')) {
                        console.log(`🔄 [ProductGallery] Trying backup URL ${nextUrlIndex + 1}/${backupUrls.length}`)
                        img.src = nextUrl
                        return
                      }
                    }
                  }

                  if (item.thumbnail && item.thumbnail !== currentSrc && !String(item.thumbnail).startsWith('indexeddb://')) {
                    console.log(`🔄 [ProductGallery] Trying thumbnail URL: ${safeAlt}`)
                    img.src = item.thumbnail
                    return
                  }

                  if (fileId) {
                    console.log(`🔄 [ProductGallery] Attempting automatic recovery for: ${fileId}`)
                    const recoveredUrl = await recoverImage(fileId, fileName)
                    
                    if (recoveredUrl) {
                      console.log(`✅ [ProductGallery] Image recovered successfully: ${fileId}`)
                      img.src = recoveredUrl
                      return
                    }
                  }
                  
                  // 4단계: 모든 시도 실패 시 플레이스홀더 표시
                  console.error(`❌ [ProductGallery] All recovery attempts failed: ${safeAlt}`)
                  img.style.display = 'none'
                  
                  // 플레이스홀더 표시
                  const placeholder = document.createElement('div')
                  placeholder.className = 'flex items-center justify-center w-full h-full bg-gray-100 text-gray-400'
                  placeholder.innerHTML = `
                    <div class="text-center">
                      <svg class="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p class="text-sm">Image unavailable</p>
                    </div>
                  `
                  img.parentElement?.appendChild(placeholder)
                }}
              />
            </div>
          )
        }}
        renderThumbInner={(item) => {
          const safeAlt = item.thumbnailAlt || item.originalAlt || 'Product thumbnail'
          const fileId = (item as any).fileId
          const backupUrls = (item as any).backupUrls || []
          
          return (
            <div className="image-gallery-thumbnail-inner">
              <img
                src={item.thumbnail}
                alt={safeAlt}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={async (e) => {
                  const img = e.currentTarget
                  const currentSrc = img.src
                  
                  console.warn(`⚠️ [ProductGallery] Thumbnail load failed: ${safeAlt}`)
                  
                  // 1단계: 백업 URL 목록에서 다음 URL 시도
                  if (backupUrls.length > 0) {
                    const nextUrlIndex = backupUrls.findIndex((url: string) => url === currentSrc) + 1
                    if (nextUrlIndex < backupUrls.length) {
                      const nextUrl = backupUrls[nextUrlIndex]
                      img.src = nextUrl
                      return
                    }
                  }
                  
                  // 2단계: 원본 URL 시도
                  if (item.original && item.original !== currentSrc) {
                    img.src = item.original
                    return
                  }
                  
                  // 3단계: 자동 복구 시도
                  if (fileId) {
                    const recoveredUrl = await recoverImage(fileId)
                    if (recoveredUrl) {
                      img.src = recoveredUrl
                      return
                    }
                  }
                  
                  // 실패 시 플레이스홀더
                  img.style.display = 'none'
                }}
              />
            </div>
          )
        }}
      />
      
      {/* 커스텀 CSS */}
      <style jsx global>{`
        .product-gallery-wrapper .image-gallery {
          width: 100%;
        }
        
        .product-gallery-wrapper .image-gallery-slide-wrapper {
          background: #fff;
        }
        
        .product-gallery-wrapper .image-gallery-image {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          min-height: 400px;
        }
        
        .product-gallery-wrapper .image-gallery-thumbnail {
          border: 2px solid transparent;
          transition: border-color 0.3s;
        }
        
        .product-gallery-wrapper .image-gallery-thumbnail.active,
        .product-gallery-wrapper .image-gallery-thumbnail:hover {
          border-color: #3b82f6;
        }
        
        .product-gallery-wrapper .image-gallery-thumbnail-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .product-gallery-wrapper .image-gallery-fullscreen-button,
        .product-gallery-wrapper .image-gallery-play-button {
          color: #fff;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 4px;
          padding: 8px;
        }
        
        .product-gallery-wrapper .image-gallery-fullscreen-button:hover,
        .product-gallery-wrapper .image-gallery-play-button:hover {
          background: rgba(0, 0, 0, 0.7);
        }
        
        .product-gallery-wrapper .image-gallery-left-nav,
        .product-gallery-wrapper .image-gallery-right-nav {
          color: #fff;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          padding: 12px;
        }
        
        .product-gallery-wrapper .image-gallery-left-nav:hover,
        .product-gallery-wrapper .image-gallery-right-nav:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  )
}


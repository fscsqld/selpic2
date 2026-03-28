import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from './indexedDBStorage'
import imageCompression from 'browser-image-compression'

// 표준 태그 상수 정의
export const STANDARD_MEDIA_TAGS = {
  HERO_BANNER: 'Hero_Banner',
  CATEGORY_BG: 'Category_BG',
  SUBCATEGORY_CARD: 'Subcategory_Card',
  HEADER_LOGO: 'Header_Logo',
  PRODUCT_MEDIA: 'Product_Media',
  GENERAL_CONTENT: 'General_Content'
} as const

export type StandardMediaTag = typeof STANDARD_MEDIA_TAGS[keyof typeof STANDARD_MEDIA_TAGS]

// Usage 타입 정의 (미디어가 사용되는 영역)
export type MediaUsage = 
  | 'hero-banner' 
  | 'category-bg' 
  | 'subcategory-card' 
  | 'header-logo' 
  | 'product-media' 
  | 'general-content'

// MediaType 타입 정의 (파일 확장자 기반 자동 분류)
export type MediaType = 'image' | 'video' | 'document'

// 파일 확장자로부터 MediaType 자동 감지
export function detectMediaType(fileName: string, mimeType?: string): MediaType {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  
  // MIME 타입 우선 확인
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
  }
  
  // 확장자 기반 감지
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']
  const videoExts = ['mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'm4v', '3gp', 'mkv', 'mpg', 'mpeg']
  
  if (imageExts.includes(ext)) return 'image'
  if (videoExts.includes(ext)) return 'video'
  
  return 'document'
}

// Usage로부터 표준 태그 자동 생성
export function getStandardTagFromUsage(usage: MediaUsage): StandardMediaTag {
  const tagMap: Record<MediaUsage, StandardMediaTag> = {
    'hero-banner': STANDARD_MEDIA_TAGS.HERO_BANNER,
    'category-bg': STANDARD_MEDIA_TAGS.CATEGORY_BG,
    'subcategory-card': STANDARD_MEDIA_TAGS.SUBCATEGORY_CARD,
    'header-logo': STANDARD_MEDIA_TAGS.HEADER_LOGO,
    'product-media': STANDARD_MEDIA_TAGS.PRODUCT_MEDIA,
    'general-content': STANDARD_MEDIA_TAGS.GENERAL_CONTENT
  }
  return tagMap[usage] || STANDARD_MEDIA_TAGS.GENERAL_CONTENT
}

// 동영상 첫 프레임 썸네일 생성
export async function generateVideoThumbnail(videoFile: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      console.error('❌ [Thumbnail] Canvas context not available')
      resolve(null)
      return
    }
    
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    video.onloadedmetadata = () => {
      // 첫 프레임 (0.1초)으로 설정
      video.currentTime = 0.1
    }
    
    video.onseeked = () => {
      try {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Canvas를 Blob으로 변환
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob)
            console.log('✅ [Thumbnail] Video thumbnail generated successfully')
            resolve(thumbnailUrl)
          } else {
            console.error('❌ [Thumbnail] Failed to create blob from canvas')
            resolve(null)
          }
        }, 'image/jpeg', 0.85)
      } catch (error) {
        console.error('❌ [Thumbnail] Error generating thumbnail:', error)
        resolve(null)
      }
    }
    
    video.onerror = () => {
      console.error('❌ [Thumbnail] Video load error')
      resolve(null)
    }
    
    // 타임아웃 설정 (10초)
    setTimeout(() => {
      if (video.readyState < 2) {
        console.error('❌ [Thumbnail] Video load timeout')
        resolve(null)
      }
    }, 10000)
    
    video.src = URL.createObjectURL(videoFile)
  })
}

export interface MediaFile {
  id: string
  name: string
  type: 'image' | 'video' | 'document'
  url: string
  size: number
  uploadedAt: Date | string // Date 또는 ISO 문자열
  category: string
  productId?: string
  productName?: string
  tags: string[]
  description?: string
  // Base64 데이터를 저장하여 영구 보존
  dataUrl?: string
  // IndexedDB에 저장되었는지 표시
  storedInIndexedDB?: boolean
  // 드래그 앤 드롭 순서 (카테고리별 또는 상품별)
  order?: number
  // 워터마크 관련
  hasWatermark?: boolean
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  // 고립된 파일 여부 (계산된 값, 저장 불필요하지만 타입에는 포함)
  isOrphaned?: boolean
  // WebP 변환 관련
  webpUrl?: string // WebP 변환된 이미지 URL
  originalFormat?: string // 원본 이미지 형식 (jpeg, png, etc.)
  webpSize?: number // WebP 파일 크기
  hasWebp?: boolean // 🆕 WebP 파일이 IndexedDB에 저장되었는지 표시
  // 🆕 확장 필드
  usage?: MediaUsage // 미디어가 사용되는 영역
  mediaType?: MediaType // 파일 확장자 기반 자동 분류 (type과 동일하지만 명시적)
  thumbnailUrl?: string // 동영상 썸네일 URL (동영상인 경우)
  fallbackImageUrl?: string // Fallback 이미지 URL (동영상 로딩 실패 시)
}

interface MediaStore {
  mediaFiles: MediaFile[]
  addMediaFile: (file: MediaFile) => void
  updateMediaFile: (id: string, updates: Partial<MediaFile>) => void
  deleteMediaFile: (id: string) => void
  getMediaFilesByCategory: (category: string) => MediaFile[]
  getMediaFilesByProduct: (productId: string) => MediaFile[]
  getMediaFileById: (id: string) => MediaFile | undefined
  searchMediaFiles: (query: string) => MediaFile[]
  // WebP 변환 함수
  convertToWebP: (file: File, onProgress?: (progress: number) => void) => Promise<File | null>
  // Base64 데이터를 포함한 파일 추가
  addMediaFileWithData: (file: File, category: string, productId?: string, productName?: string, customFileName?: string, onWebPProgress?: (progress: number) => void, usage?: MediaUsage) => Promise<MediaFile>
  // Orphaned Files 감지 (상품에 연결되지 않은 파일)
  getOrphanedFiles: (productIds: string[]) => MediaFile[]
  // 순서 업데이트 (드래그 앤 드롭용)
  updateFileOrder: (fileId: string, newOrder: number, category?: string, productId?: string) => void
  // 여러 파일의 순서 일괄 업데이트
  reorderFiles: (fileIds: string[], category?: string, productId?: string) => void
  // 다른 탭에서 media-store 변경 시 localStorage에서 미디어 목록 동기화 (갤러리 반영용)
  refreshMediaFilesFromStorage: () => void
}

export const useMediaStore = create<MediaStore>()(
  persist(
    (set, get) => ({
      mediaFiles: [],

      addMediaFile: (file) => {
        const isUpdate = get().mediaFiles.some(f => f.id === file.id)
        
        console.log(`💾 [SAVE] Adding file to store: ${file.name} (${file.id})`)
        
        set((state) => {
          // 중복 체크 (같은 ID가 이미 있으면 업데이트)
          const existingIndex = state.mediaFiles.findIndex(f => f.id === file.id)
          if (existingIndex >= 0) {
            // 이미 존재하면 업데이트
            const updatedFiles = [...state.mediaFiles]
            updatedFiles[existingIndex] = file
            console.log('✅ [SAVE] Media file updated in store:', file.name, file.id, 'Category:', file.category)
            return { mediaFiles: updatedFiles }
          } else {
            // 새 파일 추가
            console.log('✅ [SAVE] Media file added to store:', file.name, file.id, 'Category:', file.category)
            return { mediaFiles: [file, ...state.mediaFiles] }
          }
        })
        
        // 상태 강제 갱신을 위한 Custom Event 발생
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('media-files-updated', {
            detail: {
              action: isUpdate ? 'updated' : 'added',
              fileId: file.id,
              fileName: file.name,
              category: file.category,
              productId: file.productId
            }
          })
          window.dispatchEvent(event)
          console.log('📢 [SAVE] Dispatched media-files-updated event:', event.detail)
        }
        
        // localStorage 저장 확인 (강화된 버전)
        // Zustand persist는 비동기이므로 여러 번 확인
        const checkStorage = (attempt: number, maxAttempts: number = 5) => {
          setTimeout(() => {
            const stored = get().mediaFiles.find(f => f.id === file.id)
            if (stored) {
              // localStorage에 실제로 저장되었는지 확인
              try {
                const storedData = localStorage.getItem('media-store')
                console.log(`🔍 [SAVE] Checking localStorage (attempt ${attempt}/${maxAttempts})...`)
                
                if (storedData) {
                  let parsed: any
                  if (typeof storedData === 'string') {
                    if (storedData === '[object Object]' || storedData.startsWith('[object')) {
                      console.warn('⚠️ [SAVE] Invalid data format in localStorage')
                      if (attempt < maxAttempts) {
                        checkStorage(attempt + 1, maxAttempts)
                      }
                      return
                    }
                    try {
                      parsed = JSON.parse(storedData)
                    } catch (parseError) {
                      console.error('❌ [SAVE] Failed to parse localStorage:', parseError)
                      if (attempt < maxAttempts) {
                        checkStorage(attempt + 1, maxAttempts)
                      }
                      return
                    }
                  } else {
                    parsed = storedData
                  }
                  
                  const exists = parsed?.state?.mediaFiles?.some((f: MediaFile) => f.id === file.id)
                  if (exists) {
                    console.log(`✅ [SAVE] File confirmed in localStorage: ${file.name} (${file.id})`)
                    console.log(`📊 [SAVE] Total files in localStorage: ${parsed?.state?.mediaFiles?.length || 0}`)
                    
                    // localStorage 변경 이벤트 강제 발생 (다른 탭/페이지 동기화)
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new StorageEvent('storage', {
                        key: 'media-store',
                        newValue: localStorage.getItem('media-store'),
                        oldValue: null,
                        storageArea: localStorage
                      }))
                    }
                  } else {
                    console.warn(`⚠️ [SAVE] File not found in localStorage (attempt ${attempt}/${maxAttempts}): ${file.name}`)
                    if (attempt < maxAttempts) {
                      checkStorage(attempt + 1, maxAttempts)
                    } else {
                      console.error(`❌ [SAVE] File NOT saved to localStorage after ${maxAttempts} attempts: ${file.name}`)
                    }
                  }
                } else {
                  console.warn(`⚠️ [SAVE] localStorage data not found (attempt ${attempt}/${maxAttempts})`)
                  if (attempt < maxAttempts) {
                    checkStorage(attempt + 1, maxAttempts)
                  }
                }
              } catch (error) {
                console.error('❌ [SAVE] Error checking localStorage:', error)
                if (attempt < maxAttempts) {
                  checkStorage(attempt + 1, maxAttempts)
                }
              }
            } else {
              console.error(`❌ [SAVE] File not found in store (attempt ${attempt}/${maxAttempts}): ${file.name}`)
              if (attempt < maxAttempts) {
                checkStorage(attempt + 1, maxAttempts)
              }
            }
          }, attempt === 1 ? 100 : attempt * 200) // 첫 시도는 100ms, 이후는 점진적으로 증가
        }
        
        // 첫 번째 확인 시작
        checkStorage(1)
      },

      updateMediaFile: (id, updates) => {
        const file = get().mediaFiles.find(f => f.id === id)
        
        set((state) => ({
          mediaFiles: state.mediaFiles.map(file =>
            file.id === id ? { ...file, ...updates } : file
          )
        }))
        
        // 상태 강제 갱신을 위한 Custom Event 발생
        if (typeof window !== 'undefined') {
          const updatedFile = get().mediaFiles.find(f => f.id === id)
          const event = new CustomEvent('media-files-updated', {
            detail: {
              action: 'updated',
              fileId: id,
              fileName: updatedFile?.name || file?.name,
              category: updatedFile?.category || file?.category,
              productId: updatedFile?.productId || file?.productId,
              updates
            }
          })
          window.dispatchEvent(event)
          console.log('📢 [MediaStore] Dispatched media-files-updated event (update):', event.detail)
          
          // localStorage 변경 이벤트 강제 발생
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'media-store',
            newValue: localStorage.getItem('media-store'),
            oldValue: null,
            storageArea: localStorage
          }))
        }
      },

      deleteMediaFile: (id) => {
        const file = get().mediaFiles.find(f => f.id === id)
        // IndexedDB에서도 삭제 (비동기이지만 에러는 무시)
        if (file?.storedInIndexedDB) {
          indexedDBStorage.deleteFile(id).catch(error => {
            console.error('Failed to delete file from IndexedDB:', error)
          })
        }
        set((state) => ({
          mediaFiles: state.mediaFiles.filter(file => file.id !== id)
        }))
      },

      getMediaFilesByCategory: (category) => {
        const files = get().mediaFiles.filter(file => file.category === category)
        // order 기준으로 정렬 (order가 없으면 uploadedAt 기준)
        return files.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order
          }
          if (a.order !== undefined) return -1
          if (b.order !== undefined) return 1
          // 둘 다 order가 없으면 uploadedAt 기준
          const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
          const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
          return dateB - dateA // 최신순
        })
      },

      getMediaFilesByProduct: (productId) => {
        const pid = productId != null ? String(productId) : ''
        const files = get().mediaFiles.filter(file => file.productId != null && String(file.productId) === pid)
        // order 기준으로 정렬
        return files.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order
          }
          if (a.order !== undefined) return -1
          if (b.order !== undefined) return 1
          // 둘 다 order가 없으면 uploadedAt 기준
          const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
          const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
          return dateB - dateA // 최신순
        })
      },

      getMediaFileById: (id) => {
        return get().mediaFiles.find(file => file.id === id)
      },

      searchMediaFiles: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().mediaFiles.filter(file =>
          file.name.toLowerCase().includes(lowerQuery) ||
          file.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
          (file.description && file.description.toLowerCase().includes(lowerQuery)) ||
          (file.productName && file.productName.toLowerCase().includes(lowerQuery))
        )
      },

      // Orphaned Files 감지 (상품에 연결되지 않았거나 삭제된 상품에 연결된 파일)
      getOrphanedFiles: (productIds) => {
        return get().mediaFiles.filter(file => {
          // productId가 없거나, productId가 존재하지만 실제 상품 목록에 없는 경우
          if (!file.productId) return true
          return !productIds.includes(file.productId)
        })
      },

      // 단일 파일의 순서 업데이트
      updateFileOrder: (fileId, newOrder, category, productId) => {
        set((state) => ({
          mediaFiles: state.mediaFiles.map(file => {
            if (file.id === fileId) {
              return { ...file, order: newOrder }
            }
            // 같은 카테고리/상품 내에서 순서 조정이 필요한 경우
            if (category && file.category === category && (!productId || file.productId === productId)) {
              // 순서가 겹치는 경우 조정
              if (file.order !== undefined && file.order >= newOrder && file.id !== fileId) {
                return { ...file, order: (file.order || 0) + 1 }
              }
            }
            return file
          })
        }))
      },

      // 여러 파일의 순서 일괄 업데이트 (드래그 앤 드롭용)
      reorderFiles: (fileIds, category, productId) => {
        set((state) => {
          const updatedFiles = [...state.mediaFiles]
          
          // 순서 업데이트
          fileIds.forEach((fileId, index) => {
            const fileIndex = updatedFiles.findIndex(f => f.id === fileId)
            if (fileIndex >= 0) {
              updatedFiles[fileIndex] = {
                ...updatedFiles[fileIndex],
                order: index
              }
            }
          })
          
          return { mediaFiles: updatedFiles }
        })
      },

      refreshMediaFilesFromStorage: () => {
        if (typeof window === 'undefined') return
        try {
          const raw = localStorage.getItem('media-store')
          if (!raw) return
          const parsed = JSON.parse(raw) as { state?: { mediaFiles?: MediaFile[] } }
          const stored = parsed?.state?.mediaFiles
          if (!stored || !Array.isArray(stored)) return
          const mediaFiles = stored.map((file: MediaFile) => ({
            ...file,
            uploadedAt: typeof file.uploadedAt === 'string' ? new Date(file.uploadedAt) : file.uploadedAt
          }))
          set({ mediaFiles })
          console.log('🔄 [MediaStore] Synced mediaFiles from localStorage:', mediaFiles.length, 'files')
        } catch (e) {
          console.warn('[MediaStore] refreshMediaFilesFromStorage failed:', e)
        }
      },

      // WebP 변환 함수 (이미지 최적화)
      convertToWebP: async (file: File, onProgress?: (progress: number) => void): Promise<File | null> => {
        try {
          // 이미지 파일만 변환
          if (!file.type.startsWith('image/')) {
            console.log('ℹ️ [WebP] Not an image file, skipping WebP conversion')
            return null
          }
          
          // 이미 WebP 형식이면 변환 불필요
          if (file.type === 'image/webp') {
            console.log('ℹ️ [WebP] Already WebP format, skipping conversion')
            return null
          }
          
          console.log('🔄 [WebP] Starting WebP conversion:', {
            fileName: file.name,
            originalSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            originalType: file.type
          })
          
          // WebP 변환 옵션
          const options = {
            maxSizeMB: 10, // 최대 10MB (원본이 더 크면 자동 압축)
            maxWidthOrHeight: 1920, // 최대 해상도
            useWebWorker: true, // 웹 워커 사용 (성능 향상)
            fileType: 'image/webp' as const,
            initialQuality: 0.85, // 품질 85%
            onProgress: (progress: number) => {
              if (onProgress) {
                onProgress(progress)
              }
            }
          }
          
          const compressedFile = await imageCompression(file, options)
          
          console.log('✅ [WebP] WebP conversion completed:', {
            originalSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            webpSize: `${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`,
            reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
            newFileName: compressedFile.name
          })
          
          return compressedFile
        } catch (error) {
          console.error('❌ [WebP] Failed to convert to WebP:', error)
          // 변환 실패 시 null 반환 (원본 사용)
          return null
        }
      },

      addMediaFileWithData: async (file, category, productId, productName, customFileName?: string, onWebPProgress?: (progress: number) => void, usage?: MediaUsage) => {
        console.log('📤 [MediaStore] addMediaFileWithData called:', {
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          fileType: file.type,
          category,
          productId,
          customFileName,
          usage
        })
        
        return new Promise(async (resolve, reject) => {
          // 파일 크기 제한 (100MB로 증가 - IndexedDB 사용)
          const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
          if (file.size > MAX_FILE_SIZE) {
            const errorMsg = `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
            console.error('❌ [MediaStore] File size validation failed:', {
              fileName: file.name,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
              maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`
            })
            reject(new Error(errorMsg))
            return
          }
          
          console.log('✅ [MediaStore] File size validation passed')
          
          const fileId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9)
          
          // 🆕 파일명과 ID 매핑 로깅 (디버깅용)
          console.log('📝 [MediaStore] File ID and name mapping:', {
            fileId: fileId,
            originalFileName: file.name,
            customFileName: customFileName,
            willBeStoredAs: customFileName || file.name
          })
          
          // 🆕 파일 확장자 기반 자동 분류
          const detectedMediaType = detectMediaType(file.name, file.type)
          const fileType = detectedMediaType === 'image' ? 'image' : 
                          detectedMediaType === 'video' ? 'video' : 'document'
          
          // 🆕 Usage 기반 표준 태그 자동 생성
          const standardTag = usage ? getStandardTagFromUsage(usage) : STANDARD_MEDIA_TAGS.GENERAL_CONTENT
          const tags = usage ? [standardTag] : []
          
          // 동영상의 경우 원본 파일을 그대로 저장 (화질 손실 방지)
          if (fileType === 'video') {
            try {
              console.log('🎥 [SAVE] Processing video file:', file.name)
              
              // 🆕 동영상 썸네일 생성
              console.log('🖼️ [Thumbnail] Generating video thumbnail...')
              let thumbnailUrl: string | undefined = undefined
              try {
                const thumbnail = await generateVideoThumbnail(file)
                if (thumbnail) {
                  thumbnailUrl = thumbnail
                  console.log('✅ [Thumbnail] Video thumbnail generated successfully')
                } else {
                  console.warn('⚠️ [Thumbnail] Failed to generate thumbnail, continuing without thumbnail')
                }
              } catch (thumbnailError) {
                console.error('❌ [Thumbnail] Error generating thumbnail:', thumbnailError)
                // 썸네일 생성 실패해도 계속 진행
              }
              
              // 동영상은 원본 File 객체를 IndexedDB에 저장
              console.log('📦 [SAVE] Converting file to ArrayBuffer...')
              const arrayBuffer = await file.arrayBuffer()
              console.log('✅ [SAVE] ArrayBuffer created:', `${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB`)
              
              const blob = new Blob([arrayBuffer], { type: file.type })
              const blobUrl = URL.createObjectURL(blob)
              console.log('✅ [SAVE] Blob URL created:', blobUrl.substring(0, 50) + '...')
              
              // ⚠️ 중요: IndexedDB 저장이 완료될 때까지 명확히 await
              const dataUrlForMime = `data:${file.type};base64,` // MIME 타입 전달용
              console.log('💾 [SAVE] Saving to IndexedDB (awaiting completion)...')
              await indexedDBStorage.saveFile(fileId, dataUrlForMime, arrayBuffer)
              console.log('✅ [SAVE] Video saved to IndexedDB successfully - IndexedDB storage confirmed')
              
              // IndexedDB 저장이 완료된 후에만 상태 업데이트
              // 🆕 카테고리별 최대 order 값 계산 (Content 파일은 usage로도 필터링)
              const existingFiles = get().getMediaFilesByCategory(category)
              // Content 파일인 경우 (usage가 있으면) 같은 usage를 가진 파일만 order 계산
              const filesForOrder = usage 
                ? existingFiles.filter(f => f.usage === usage)
                : existingFiles
              const maxOrder = filesForOrder.reduce((max, f) => {
                const order = f.order ?? 0
                return Math.max(max, order)
              }, -1)
              
              const mediaFile: MediaFile = {
                id: fileId,
                name: customFileName ? `${customFileName}.${file.name.split('.').pop()}` : file.name,
                type: 'video',
                url: blobUrl, // 현재 세션용 blob URL
                dataUrl: undefined, // 동영상은 dataUrl 사용 안 함
                storedInIndexedDB: true,
                size: file.size,
                uploadedAt: new Date(),
                category,
                productId,
                productName,
                tags, // 🆕 표준 태그 포함
                description: '',
                order: maxOrder + 1, // 기본 순서 설정
                hasWatermark: false,
                watermarkPosition: 'bottom-right',
                // 🆕 확장 필드
                usage, // 미디어 사용 영역
                mediaType: detectedMediaType, // 자동 감지된 미디어 타입
                thumbnailUrl // 동영상 썸네일
              }
              
              // IndexedDB 저장이 완료된 후에만 스토어에 추가
              console.log('💾 [SAVE] Adding to Zustand store (localStorage will be updated)...')
              get().addMediaFile(mediaFile)
              console.log(`✅ [SAVE] Video ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB) added to store`)
              
              // localStorage 저장 확인 (즉시 확인)
              await new Promise(resolve => setTimeout(resolve, 200))
              const storedData = localStorage.getItem('media-store')
              if (storedData) {
                try {
                  // "[object Object]" 같은 잘못된 문자열 체크
                  let parsed: any
                  if (typeof storedData === 'string') {
                    if (storedData === '[object Object]' || storedData.startsWith('[object')) {
                      console.warn('⚠️ [SAVE] Invalid data format in localStorage (object stringified incorrectly)')
                      // store에서 확인했으므로 계속 진행
                    } else {
                      parsed = JSON.parse(storedData)
                    }
                  } else {
                    parsed = storedData
                  }
                  
                  if (parsed) {
                    const exists = parsed?.state?.mediaFiles?.some((f: MediaFile) => f.id === fileId)
                    if (exists) {
                      console.log(`✅ [SAVE] Video confirmed in localStorage immediately after save`)
                      console.log(`📊 [SAVE] Total files in localStorage: ${parsed?.state?.mediaFiles?.length || 0}`)
                    } else {
                      console.warn(`⚠️ [SAVE] Video not found in localStorage immediately, but will be checked by addMediaFile`)
                    }
                  }
                } catch (e) {
                  console.error('❌ [SAVE] Failed to parse localStorage for verification:', e)
                }
              } else {
                console.warn('⚠️ [SAVE] localStorage data not found immediately after save')
              }
              
              resolve(mediaFile)
              return
            } catch (error) {
              console.error('❌ [SAVE] Failed to save video to IndexedDB:', {
                fileName: file.name,
                fileId,
                error,
                errorName: (error as Error)?.name,
                errorMessage: (error as Error)?.message,
                stack: (error as Error)?.stack
              })
              // IndexedDB 저장 실패 시 상태 업데이트하지 않고 에러 던지기
              reject(new Error(`Failed to save video to IndexedDB: ${(error as Error)?.message || 'Unknown error'}`))
              return
            }
          }
          
          // 이미지의 경우 WebP 변환 후 저장
          try {
            console.log('🖼️ [SAVE] Processing image file:', file.name)
            
            // 원본 형식 저장
            const originalFormat = file.type.split('/')[1] || 'unknown'
            
            // WebP 변환 시도
            let webpFile: File | null = null
            let webpUrl: string | undefined = undefined
            let webpSize: number | undefined = undefined
            
            try {
              console.log('🔄 [WebP] Attempting WebP conversion...')
              webpFile = await get().convertToWebP(file, onWebPProgress)
              
              if (webpFile) {
                // WebP 변환 성공
                const webpArrayBuffer = await webpFile.arrayBuffer()
                const webpBlob = new Blob([webpArrayBuffer], { type: 'image/webp' })
                webpUrl = URL.createObjectURL(webpBlob)
                webpSize = webpFile.size
                
                console.log('✅ [WebP] WebP conversion successful:', {
                  originalSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
                  webpSize: `${(webpSize / (1024 * 1024)).toFixed(2)}MB`,
                  reduction: `${((1 - webpSize / file.size) * 100).toFixed(1)}%`
                })
              } else {
                console.log('ℹ️ [WebP] WebP conversion skipped or failed, using original image')
              }
            } catch (webpError) {
              console.error('❌ [WebP] WebP conversion error (using original):', webpError)
              // WebP 변환 실패 시 원본 사용 (안전장치)
            }
            
            // 원본 이미지는 항상 IndexedDB에 저장 (백업용)
            console.log('📦 [SAVE] Converting original file to ArrayBuffer...')
            const arrayBuffer = await file.arrayBuffer()
            console.log('✅ [SAVE] ArrayBuffer created:', `${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB`)
            
            const blob = new Blob([arrayBuffer], { type: file.type })
            const blobUrl = URL.createObjectURL(blob)
            console.log('✅ [SAVE] Blob URL created:', blobUrl.substring(0, 50) + '...')
            
            // ⚠️ 중요: 원본 이미지를 먼저 IndexedDB에 저장
            const dataUrlForMime = `data:${file.type};base64,` // MIME 타입 전달용
            console.log('💾 [SAVE] Saving original image to IndexedDB (awaiting completion)...')
            await indexedDBStorage.saveFile(fileId, dataUrlForMime, arrayBuffer)
            console.log('✅ [SAVE] Image saved to IndexedDB successfully - IndexedDB storage confirmed')
            
            // 🆕 WebP 파일도 IndexedDB에 저장 (있는 경우) - 원본 저장 후에 저장
            let webpFileId: string | undefined = undefined
            let webpSaved = false
            if (webpFile) {
              try {
                webpFileId = fileId + '_webp'
                console.log('💾 [WebP] Saving WebP file to IndexedDB (awaiting completion)...', {
                  webpFileId: webpFileId,
                  webpSize: `${(webpFile.size / (1024 * 1024)).toFixed(2)}MB`
                })
                const webpArrayBuffer = await webpFile.arrayBuffer()
                const webpDataUrlForMime = `data:image/webp;base64,`
                // 🆕 WebP 저장이 완료될 때까지 명확히 await
                await indexedDBStorage.saveFile(webpFileId, webpDataUrlForMime, webpArrayBuffer)
                webpSaved = true
                console.log('✅ [WebP] WebP file saved to IndexedDB successfully - WebP storage confirmed')
              } catch (webpSaveError) {
                console.error('❌ [WebP] Failed to save WebP to IndexedDB:', webpSaveError)
                // WebP 저장 실패해도 원본은 계속 진행
                webpSaved = false
              }
            }
            
            // IndexedDB 저장이 완료된 후에만 상태 업데이트
            // 🆕 카테고리별 최대 order 값 계산 (Content 파일은 usage로도 필터링)
            const existingFiles = get().getMediaFilesByCategory(category)
            // Content 파일인 경우 (usage가 있으면) 같은 usage를 가진 파일만 order 계산
            const filesForOrder = usage 
              ? existingFiles.filter(f => f.usage === usage)
              : existingFiles
            const maxOrder = filesForOrder.reduce((max, f) => {
              const order = f.order ?? 0
              return Math.max(max, order)
            }, -1)
            
            // 파일명 처리 (WebP인 경우 확장자 변경)
            const finalFileName = customFileName 
              ? (webpFile ? `${customFileName}.webp` : `${customFileName}.${file.name.split('.').pop()}`)
              : (webpFile ? file.name.replace(/\.[^/.]+$/, '.webp') : file.name)
            
            const mediaFile: MediaFile = {
              id: fileId,
              name: finalFileName,
              type: 'image',
              url: webpUrl || blobUrl, // WebP가 있으면 WebP 사용, 없으면 원본 사용
              dataUrl: undefined, // 이미지도 원본 바이너리 저장하므로 dataUrl 사용 안 함
              storedInIndexedDB: true,
              size: file.size, // 원본 크기
              uploadedAt: new Date(),
              category,
              productId,
              productName,
              tags, // 🆕 표준 태그 포함
              description: '',
              order: maxOrder + 1, // 기본 순서 설정
              hasWatermark: false,
              watermarkPosition: 'bottom-right',
              // WebP 관련 필드
              webpUrl: webpUrl, // WebP URL (있는 경우)
              originalFormat: originalFormat, // 원본 형식
              webpSize: webpSize, // WebP 크기 (있는 경우)
              hasWebp: webpSaved && !!webpFileId, // 🆕 WebP 파일이 IndexedDB에 저장되었는지 표시 (저장 성공 여부 확인)
              // 🆕 확장 필드
              usage, // 미디어 사용 영역
              mediaType: detectedMediaType // 자동 감지된 미디어 타입
            }
            
            // IndexedDB 저장이 완료된 후에만 스토어에 추가
            console.log('💾 [SAVE] Adding to Zustand store (localStorage will be updated)...')
            get().addMediaFile(mediaFile)
            console.log(`✅ [SAVE] Image ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB) added to store`)
            
            // localStorage 저장 확인 (즉시 확인)
            // ⚠️ 중요: createJSONStorage를 사용하므로 storedData는 항상 JSON 문자열
            await new Promise(resolve => setTimeout(resolve, 200))
            try {
              const storedData = localStorage.getItem('media-store')
              if (storedData) {
                // createJSONStorage를 사용하므로 항상 유효한 JSON 문자열이어야 함
                // 하지만 안전을 위해 "[object Object]" 체크 추가
                let parsed: any = null
                
                if (typeof storedData === 'string') {
                  // "[object Object]" 같은 잘못된 문자열 체크
                  if (storedData === '[object Object]' || storedData.startsWith('[object')) {
                    console.error('❌ [SAVE] Invalid data format in localStorage: "[object Object]"')
                    console.error('❌ [SAVE] This indicates createJSONStorage is not working correctly!')
                    console.error('❌ [SAVE] Raw storedData type:', typeof storedData)
                    console.error('❌ [SAVE] Raw storedData (first 200 chars):', storedData.substring(0, 200))
                    // store에서 확인했으므로 계속 진행
                  } else {
                    try {
                      parsed = JSON.parse(storedData)
                    } catch (parseError) {
                      console.error('❌ [SAVE] Failed to parse localStorage:', parseError)
                      console.error('❌ [SAVE] Raw storedData (first 200 chars):', storedData.substring(0, 200))
                    }
                  }
                } else {
                  // 이미 객체인 경우 (이것도 createJSONStorage를 사용하면 발생하지 않아야 함)
                  console.warn('⚠️ [SAVE] storedData is not a string (should not happen with createJSONStorage)')
                  parsed = storedData
                }
                
                if (parsed) {
                  const exists = parsed?.state?.mediaFiles?.some((f: MediaFile) => f.id === fileId)
                  if (exists) {
                    console.log(`✅ [SAVE] Image confirmed in localStorage immediately after save`)
                    console.log(`📊 [SAVE] Total files in localStorage: ${parsed?.state?.mediaFiles?.length || 0}`)
                  } else {
                    console.warn(`⚠️ [SAVE] Image not found in localStorage immediately, but will be checked by addMediaFile`)
                  }
                }
              } else {
                console.warn('⚠️ [SAVE] localStorage data not found immediately after save')
              }
            } catch (error) {
              console.error('❌ [SAVE] Error accessing localStorage:', error)
            }
            
            resolve(mediaFile)
          } catch (error) {
            console.error('❌ [SAVE] Failed to save image to IndexedDB:', {
              fileName: file.name,
              fileId,
              error,
              errorName: (error as Error)?.name,
              errorMessage: (error as Error)?.message,
              stack: (error as Error)?.stack
            })
            // IndexedDB 저장 실패 시 상태 업데이트하지 않고 에러 던지기
            reject(new Error(`Failed to save image to IndexedDB: ${(error as Error)?.message || 'Unknown error'}`))
          }
        })
      }
    }),
    {
      name: 'media-store',
      partialize: (state) => {
        // 모든 미디어 파일은 IndexedDB에 원본 바이너리로 저장되므로
        // localStorage에는 메타데이터만 저장 (dataUrl 제외)
        const partialized = {
          mediaFiles: state.mediaFiles.map(file => {
            const serialized = {
              ...file,
              uploadedAt: typeof file.uploadedAt === 'string' 
                ? file.uploadedAt 
                : file.uploadedAt.toISOString()
            }
            
            // 모든 파일은 IndexedDB에 저장되므로 dataUrl은 localStorage에 저장하지 않음
            const { dataUrl, ...withoutDataUrl } = serialized
            return withoutDataUrl
          })
        }
        
        // partialize 확인 로그
        console.log(`💾 [PARTIALIZE] Serializing ${partialized.mediaFiles.length} files to localStorage`)
        
        return partialized
      },
      onRehydrateStorage: () => (state) => {
        console.log('🔄 [Rehydration] Starting media store rehydration...')
        console.log('🔄 [Rehydration] State received:', {
          hasState: !!state,
          mediaFilesCount: state?.mediaFiles?.length || 0,
          mediaFilesIsArray: Array.isArray(state?.mediaFiles)
        })
        
        // ⚠️ 중요: state가 없으면 기본값 반환 (빈 배열로 초기화하지 않음)
        if (!state) {
          console.warn('⚠️ [Rehydration] No state found, but NOT initializing empty array - preserving existing data')
          // state가 없어도 기존 localStorage 데이터를 보존하기 위해 null 반환하지 않음
          // Zustand persist가 자동으로 처리하도록 함
          return undefined
        }
        
        // ⚠️ 중요: mediaFiles가 없거나 배열이 아니면 기본값으로 초기화하지 않음
        // 대신 기존 localStorage 데이터를 확인하거나 빈 배열 유지
        if (!state.mediaFiles || !Array.isArray(state.mediaFiles)) {
          console.warn('⚠️ [Rehydration] mediaFiles is not an array or is missing')
          console.log('⚠️ [Rehydration] Checking localStorage directly...')
          
          // localStorage에서 직접 확인
          try {
            const storedData = localStorage.getItem('media-store')
            if (storedData) {
              const parsed = JSON.parse(storedData)
              if (parsed?.state?.mediaFiles && Array.isArray(parsed.state.mediaFiles)) {
                console.log(`✅ [Rehydration] Found ${parsed.state.mediaFiles.length} files in localStorage, restoring...`)
                state.mediaFiles = parsed.state.mediaFiles
              } else {
                console.warn('⚠️ [Rehydration] No valid mediaFiles in localStorage, initializing empty array')
                state.mediaFiles = []
              }
            } else {
              console.warn('⚠️ [Rehydration] No data in localStorage, initializing empty array')
              state.mediaFiles = []
            }
          } catch (error) {
            console.error('❌ [Rehydration] Failed to parse localStorage:', error)
            // 에러가 발생해도 빈 배열로 초기화하지 않고 기존 state 유지
            if (!state.mediaFiles) {
              state.mediaFiles = []
            }
          }
        }
        
        // mediaFiles가 배열인 경우에만 처리
        if (state.mediaFiles && Array.isArray(state.mediaFiles) && state.mediaFiles.length > 0) {
          console.log(`🔄 [Rehydration] Processing ${state.mediaFiles.length} files from localStorage`)
          
          // 카테고리별로 order 값이 없는 파일들에 대해 기본값 설정
          const categoryOrderMap = new Map<string, number>()
          
          state.mediaFiles = state.mediaFiles.map(file => {
            // Date 변환
            const uploadedAt = typeof file.uploadedAt === 'string' 
              ? new Date(file.uploadedAt) 
              : file.uploadedAt
            
            // order 값이 없으면 카테고리별로 자동 할당
            let order = file.order
            if (order === undefined) {
              const currentMax = categoryOrderMap.get(file.category) ?? -1
              order = currentMax + 1
              categoryOrderMap.set(file.category, order)
            } else {
              // order가 있으면 최대값 업데이트
              const currentMax = categoryOrderMap.get(file.category) ?? -1
              categoryOrderMap.set(file.category, Math.max(currentMax, order))
            }
            
            return {
              ...file,
              uploadedAt,
              order: order,
              hasWatermark: file.hasWatermark ?? false,
              watermarkPosition: file.watermarkPosition ?? 'bottom-right',
              // 🆕 새로고침 시 blob URL이 무효화되므로 URL을 빈 문자열로 초기화
              // 컴포넌트에서 복원하도록 트리거
              url: file.storedInIndexedDB ? '' : file.url,
              // 🆕 WebP URL도 초기화 (blob URL이 무효화됨)
              webpUrl: file.storedInIndexedDB && file.hasWebp ? '' : file.webpUrl
            }
          })
          
          console.log(`✅ [Rehydration] Successfully processed ${state.mediaFiles.length} files`)
          console.log(`📦 [Rehydration] Files by category:`, {
            stickers: state.mediaFiles.filter(f => f.category === 'stickers').length,
            stamps: state.mediaFiles.filter(f => f.category === 'stamps').length,
            phonecases: state.mediaFiles.filter(f => f.category === 'phonecases').length,
            hotgoods: state.mediaFiles.filter(f => f.category === 'hotgoods').length,
            general: state.mediaFiles.filter(f => f.category === 'general').length
          })
          
          // IndexedDB 복원은 컴포넌트에서 처리 (onRehydrateStorage는 동기 함수이므로)
          const filesToRestore = state.mediaFiles.filter(file => file.storedInIndexedDB && !file.url)
          if (filesToRestore.length > 0) {
            console.log(`📋 [Rehydration] ${filesToRestore.length} files need URL restoration from IndexedDB (will be restored in component)`)
          }
          
          // IndexedDB에서 직접 파일 목록 확인 (localStorage와 동기화)
          indexedDBStorage.getAllFileIds().then(ids => {
            if (ids.length > 0) {
              console.log(`🔍 [Rehydration] Found ${ids.length} files in IndexedDB, checking for missing files...`)
              
              // localStorage에 없는 파일이 IndexedDB에 있으면 복원 시도
              const missingIds = ids.filter(id => !state.mediaFiles.find(f => f.id === id))
              if (missingIds.length > 0) {
                console.log(`⚠️ [Rehydration] Found ${missingIds.length} files in IndexedDB that are not in localStorage`)
                // 이 경우는 나중에 수동으로 복원하거나 무시
                // (일반적으로는 localStorage에 메타데이터가 있어야 함)
              }
            } else {
              console.log('ℹ️ [Rehydration] No files found in IndexedDB')
            }
          }).catch(error => {
            console.error('❌ [Rehydration] Failed to get file IDs from IndexedDB:', error)
          })
        } else {
          console.log(`ℹ️ [Rehydration] No files to process (count: ${state.mediaFiles?.length || 0})`)
        }
        
        // ⚠️ 중요: state를 반환하여 Zustand가 사용하도록 함
        return state
      },
      // ⚠️ 중요: createJSONStorage를 사용하여 JSON 포장 보장
      // createJSONStorage는 자동으로 JSON.stringify/parse를 처리하므로
      // 직접 localStorage를 전달하면 됨
      storage: createJSONStorage(() => localStorage)
    }
  )
)


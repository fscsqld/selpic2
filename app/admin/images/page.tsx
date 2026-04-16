'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  File, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  Filter, 
  Grid, 
  List,
  Plus,
  Folder,
  Calendar,
  FileText,
  Package,
  Tag,
  Link2,
  X,
  Check,
  GripVertical,
  ChevronDown
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AdminPageHeader from '@/components/AdminPageHeader'
import AdminRoute from '@/components/AdminRoute'
import { useStore } from '@/lib/store'
import { useMediaStore, MediaFile, MediaUsage } from '@/lib/mediaStore'
import EditStageModal from '@/components/EditStageModal'
import SortableFileItem from '@/components/SortableFileItem'

export interface ProductCategory {
  id: string
  name: string
  icon: string
  color: string
  subcategories?: string[]
}

const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'stickers', name: 'Stickers', icon: '🏷️', color: 'blue', subcategories: ['Basic', 'Set', 'Premium', 'Office', 'Kids', 'Custom'] },
  { id: 'stamps', name: 'Stamps', icon: '📮', color: 'green', subcategories: [] },
  { id: 'phonecases', name: 'Phone Cases', icon: '📱', color: 'purple', subcategories: ['Samsung', 'iPhone'] },
  { id: 'hotgoods', name: 'Market S', icon: '🔥', color: 'red', subcategories: [] },
  { id: 'general', name: 'General', icon: '📦', color: 'gray', subcategories: [] }
]

// 🆕 Content Management 전용 카테고리
const CONTENT_CATEGORIES: ProductCategory[] = [
  { id: 'hero-banner', name: 'Hero Banner', icon: '🎬', color: 'purple', subcategories: [] },
  { id: 'category-bg', name: 'Category Background', icon: '🖼️', color: 'blue', subcategories: [] },
  { id: 'subcategory-card', name: 'Subcategory Card', icon: '📋', color: 'green', subcategories: [] },
  { id: 'header-logo', name: 'Header Logo', icon: '✨', color: 'indigo', subcategories: [] },
  { id: 'general-content', name: 'General Content', icon: '📄', color: 'gray', subcategories: [] }
]

export default function ImageManagementPage() {
  return (
    <AdminRoute requiredPermissions={['images:read']}>
      <ImageManagementPageContent />
    </AdminRoute>
  )
}

function ImageManagementPageContent() {
  const { products, refreshProducts, _hasHydrated } = useStore()
  const { 
    mediaFiles, 
    addMediaFileWithData, 
    deleteMediaFile: deleteMediaFileFromStore,
    updateMediaFile,
    getMediaFilesByCategory,
    searchMediaFiles,
    reorderFiles,
    getOrphanedFiles
  } = useMediaStore()

  const lastRemoteMediaVersionRef = useRef<string>('')

  const mediaSignature = useCallback((list: MediaFile[]): string => {
    return list
      .map((f) => {
        const uploadedAt =
          f.uploadedAt instanceof Date ? f.uploadedAt.toISOString() : String(f.uploadedAt || '')
        return `${f.id}|${f.productId || ''}|${f.url || ''}|${f.order ?? ''}|${uploadedAt}`
      })
      .sort()
      .join('||')
  }, [])

  /** Keep entries that exist only in the browser until POST /api/media/products succeeds. */
  const mergeRemoteWithLocalPending = useCallback((remote: MediaFile[], local: MediaFile[]): MediaFile[] => {
    const remoteIds = new Set(remote.map((f) => f.id))
    const pendingOnly = local.filter((f) => !remoteIds.has(f.id))
    if (pendingOnly.length === 0) return remote
    return [...remote, ...pendingOnly]
  }, [])

  const syncMediaFromServer = useCallback(async (force = false): Promise<boolean> => {
    try {
      const res = await fetch('/api/media/public', { cache: 'no-store' })
      if (!res.ok) return false
      const payload = (await res.json()) as {
        success?: boolean
        updatedAt?: string | null
        mediaFiles?: unknown[]
      }
      if (!payload.success || !Array.isArray(payload.mediaFiles)) return false

      const remote = payload.mediaFiles
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
        .map((m) => ({
          ...(m as unknown as MediaFile),
          uploadedAt:
            typeof m.uploadedAt === 'string' ? new Date(m.uploadedAt) : (m.uploadedAt as Date),
        }))

      const remoteVersion = payload.updatedAt || mediaSignature(remote)
      const local = useMediaStore.getState().mediaFiles
      const merged = mergeRemoteWithLocalPending(remote, local)
      const localSig = mediaSignature(local)
      const mergedSig = mediaSignature(merged)

      // Same server version as last pull but this browser may still have unsynced rows — merge anyway.
      if (!force && remoteVersion && remoteVersion === lastRemoteMediaVersionRef.current) {
        if (mergedSig !== localSig) {
          useMediaStore.setState({ mediaFiles: merged })
        }
        return true
      }

      if (mergedSig !== localSig) {
        useMediaStore.setState({ mediaFiles: merged })
      }

      lastRemoteMediaVersionRef.current = remoteVersion || ''
      return true
    } catch {
      return false
    }
  }, [mediaSignature, mergeRemoteWithLocalPending])
  
  // 미디어 파일 변경 감지 (다른 탭/페이지에서 변경 시)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'media-store') {
        console.log('🔄 [ImageManagement] localStorage media-store changed, refreshing from storage...')
        // Same-tab saves already update Zustand; pulling /api/media/public here races with
        // debounced POST and can wipe not-yet-synced files. Re-read persisted state only.
        useMediaStore.getState().refreshMediaFilesFromStorage()
      }
    }
    
    const handleMediaFilesUpdate = (e: CustomEvent) => {
      console.log('🔄 [ImageManagement] Media files updated via event:', e.detail)
      // store가 이미 업데이트되었으므로 강제 리렌더링은 필요 없음
      // 하지만 UI 업데이트를 보장하기 위해 약간의 지연 후 확인
      setTimeout(() => {
        const { mediaFiles: latestFiles } = useMediaStore.getState()
        console.log(`📊 [ImageManagement] Current mediaFiles count: ${latestFiles.length}`)
      }, 100)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncMediaFromServer()
      }
    }

    const handleOnline = () => {
      void syncMediaFromServer()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
    window.addEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    void syncMediaFromServer()
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('media-files-updated', handleMediaFilesUpdate as EventListener)
      window.removeEventListener('media-file-uploaded', handleMediaFilesUpdate as EventListener)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [syncMediaFromServer])
  
  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 🆕 탭 전환 상태 (Product Assets vs Content Management)
  const [activeTab, setActiveTab] = useState<'product' | 'content'>('product')
  const [activeCategory, setActiveCategory] = useState<string>('stickers')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [isBulkActionModalOpen, setIsBulkActionModalOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState<'category' | 'product' | 'tag' | 'delete' | null>(null) // 🆕 'tag' 추가
  const [linkingFileId, setLinkingFileId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [isWebPInfoExpanded, setIsWebPInfoExpanded] = useState(false) // WebP 정보 접기/펼치기
  const [isRestoring] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'info', message: '', show: false })
  const [showOrphanedFiles, setShowOrphanedFiles] = useState(false) // Orphaned Files 표시 여부
  const [isDeleteOrphanedModalOpen, setIsDeleteOrphanedModalOpen] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('') // 상품 검색어 (Link to Product 모달용)
  const [linkByProductIdInput, setLinkByProductIdInput] = useState('') // 상품 ID로 직접 연결 입력
  // 🆕 필터링 상태
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null) // 태그별 필터
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'image' | 'video'>('all') // 타입별 필터
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'size-asc' | 'size-desc' | 'name-asc' | 'name-desc'>('newest') // 정렬 순서
  
  // EditStage 관련 상태
  const [editStageFile, setEditStageFile] = useState<File | null>(null)
  const [isEditStageOpen, setIsEditStageOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([]) // 편집 대기 중인 파일들
  const [webPProgress, setWebPProgress] = useState(0) // WebP 변환 진행률

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 🆕 activeTab 변경 시 activeCategory 초기화
  useEffect(() => {
    if (activeTab === 'product') {
      setActiveCategory('stickers')
    } else {
      setActiveCategory('hero-banner')
    }
    setSelectedProductId('')
    setSearchTerm('')
    setCurrentPage(1)
  }, [activeTab])

  // previewFile이 변경될 때 WebP 정보 접기 상태 초기화
  useEffect(() => {
    setIsWebPInfoExpanded(false)
  }, [previewFile])

  // Link to Product 모달 열릴 때 스토어에서 상품 목록 갱신 (Quick Link 드롭다운에 상품이 나오도록)
  useEffect(() => {
    if (isLinkingModalOpen && linkingFileId && typeof window !== 'undefined') {
      refreshProducts()
    }
  }, [isLinkingModalOpen, linkingFileId, refreshProducts])

  // Orphaned Files 계산 (상품에 연결되지 않은 파일)
  const orphanedFiles = useMemo(() => {
    const allProductIds = products.map(p => p.id)
    return getOrphanedFiles(allProductIds)
  }, [mediaFiles, products, getOrphanedFiles])

  // 현재 카테고리의 상품 목록
  const categoryProducts = useMemo(() => {
    return products.filter(product => {
      const productCategory = product.category.toLowerCase().replace(/\s+/g, '')
      return productCategory === activeCategory || 
             (activeCategory === 'hotgoods' && product.isHotGoods) ||
             (activeCategory === 'general' && !['stickers', 'stamps', 'phonecases'].includes(productCategory))
    })
  }, [products, activeCategory])

  // Link to Product 모달: 카테고리에 상품이 없으면 전체 상품 표시(상품 ID 검색 등 가능)
  const productsForLinkingList = useMemo(() => {
    return categoryProducts.length > 0 ? categoryProducts : products
  }, [categoryProducts, products])

  // Link to Product 모달용 필터링된 상품 목록 (productsForLinkingList 기준으로 검색)
  const filteredProductsForLinking = useMemo(() => {
    if (!productSearchTerm.trim()) {
      return productsForLinkingList
    }
    const searchLower = productSearchTerm.toLowerCase()
    return productsForLinkingList.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.id.toLowerCase().includes(searchLower) ||
      (product.description && product.description.toLowerCase().includes(searchLower)) ||
      product.category.toLowerCase().includes(searchLower)
    )
  }, [productsForLinkingList, productSearchTerm])

  // 알림 표시 함수
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification({ type: 'info', message: '', show: false })
    }, 3000)
  }

  const forceMediaSync = useCallback(async (): Promise<boolean> => {
    try {
      const { syncMediaToServerNow } = await import('@/lib/mediaSyncScheduler')
      const result = await syncMediaToServerNow(3)
      return !!result.ok
    } catch (e) {
      console.error('❌ [ImageManagement] force media sync failed:', e)
      return false
    }
  }, [])

  // 파일 업로드 핸들러 (EditStage를 통한 업로드)
  const handleFileUpload = useCallback(async (files: FileList, targetCategory?: string) => {
    console.log('📁 [DEBUG] handleFileUpload called:', {
      fileCount: files.length,
      targetCategory: targetCategory || activeCategory
    })
    
    const validFiles: File[] = []
    
    // 파일 크기 제한 (100MB로 증가 - IndexedDB 사용)
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    
    // 파일 검증
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      
      console.log(`📄 [DEBUG] Validating file ${i + 1}/${files.length}:`, {
        name: file.name,
        type: file.type,
        size: `${fileSizeMB}MB`
      })
      
      // 파일 타입 검증
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        const errorMsg = `The file format of ${file.name} is not supported. Only images and videos are allowed.`
        console.warn('⚠️ [DEBUG] File type validation failed:', file.name, file.type)
        showNotification('error', errorMsg)
        continue
      }

      // 파일 크기 검증
      if (file.size > MAX_FILE_SIZE) {
        const errorMsg = `The file size of ${file.name} (${fileSizeMB}MB) is too large. Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
        console.error('❌ [DEBUG] File size validation failed:', {
          fileName: file.name,
          fileSize: `${fileSizeMB}MB`,
          maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`
        })
        showNotification('error', errorMsg)
        continue
      }
      
      validFiles.push(file)
      console.log('✅ [DEBUG] File validation passed:', file.name)
    }
    
    if (validFiles.length === 0) {
      console.warn('⚠️ [DEBUG] No valid files to upload')
      return
    }
    
    console.log(`✅ [DEBUG] ${validFiles.length} valid file(s) ready for upload`)
    
    // 첫 번째 파일부터 EditStage 열기
    setPendingFiles(validFiles)
    setEditStageFile(validFiles[0])
    setIsEditStageOpen(true)
    setIsUploadModalOpen(false)
    
    console.log('📝 [DEBUG] EditStage modal opened for first file:', validFiles[0].name)
  }, [activeCategory, showNotification])
  
  // EditStage에서 확인 버튼 클릭 시 실제 저장 (강화된 버전)
  const handleEditStageConfirm = useCallback(async (editedData: {
    file: File
    name: string
    category: string
    tags: string[]
    description: string
    thumbnailTime?: number
    hasWatermark?: boolean
    watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }) => {
    setIsUploading(true)
    
    console.log('🚀 [ENHANCED] handleEditStageConfirm called:', {
      fileName: editedData.name,
      fileSize: `${(editedData.file.size / (1024 * 1024)).toFixed(2)}MB`,
      category: editedData.category,
      productId: selectedProductId
    })
    
    try {
      const productName = selectedProductId ? categoryProducts.find(p => p.id === selectedProductId)?.name : undefined
      
      console.log('📤 [ENHANCED] Step 1: Calling addMediaFileWithData...')
      
      // WebP 변환 진행률 콜백
      const handleWebPProgress = (progress: number) => {
        setWebPProgress(progress)
        console.log(`🔄 [WebP] Conversion progress: ${progress}%`)
      }
      
      // Step 1: 파일 저장 (명확한 await로 완료 보장)
      // 🆕 탭별 카테고리 및 usage 자동 설정
      let targetCategory: string
      let targetUsage: MediaUsage | undefined
      
      if (activeTab === 'content') {
        // Content 탭: activeCategory를 usage로 사용, category는 'general'로 설정
        targetCategory = 'general'
        targetUsage = activeCategory as MediaUsage
      } else {
        // Product 탭: 기존 로직 유지
        targetCategory = editedData.category || activeCategory
        targetUsage = 'product-media'
      }
      
      const addedFile = await addMediaFileWithData(
        editedData.file,
        targetCategory,
        activeTab === 'product' ? (selectedProductId || undefined) : undefined,
        activeTab === 'product' ? productName : undefined,
        editedData.name,
        handleWebPProgress, // WebP 변환 진행률 콜백 전달
        targetUsage // 🆕 탭에 따라 usage 자동 설정
      )
      
      // WebP 변환 완료 후 진행률 초기화
      setWebPProgress(0)
      
      console.log('✅ [ENHANCED] Step 1 completed - File added:', {
        fileId: addedFile.id,
        fileName: addedFile.name,
        url: addedFile.url ? 'URL exists' : 'URL missing',
        storedInIndexedDB: addedFile.storedInIndexedDB
      })
      
      // Step 2: 메타데이터 업데이트 (Promise로 감싸서 완료 보장)
      const updates: any = {}
      if (editedData.tags.length > 0) updates.tags = editedData.tags
      if (editedData.description) updates.description = editedData.description
      if (editedData.hasWatermark !== undefined) updates.hasWatermark = editedData.hasWatermark
      if (editedData.watermarkPosition) updates.watermarkPosition = editedData.watermarkPosition
      
      if (Object.keys(updates).length > 0) {
        console.log('📝 [ENHANCED] Step 2: Updating metadata...', updates)
        updateMediaFile(addedFile.id, updates)
        // updateMediaFile이 동기 함수이므로 약간의 지연 후 확인
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Step 3: in-memory store only (persist/localStorage can lag; requiring LS caused false "Failed to save")
      console.log('🔍 [ENHANCED] Step 3: Verifying file in store...')
      let confirmedFile: MediaFile | null | undefined = useMediaStore.getState().getMediaFileById(addedFile.id)
      let retryCount = 0
      const maxRetries = 25
      const retryDelay = 120
      while (!confirmedFile && retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        confirmedFile = useMediaStore.getState().getMediaFileById(addedFile.id)
        retryCount++
      }
      if (confirmedFile) {
        console.log(`✅ [ENHANCED] File confirmed in store after ${retryCount} wait(s)`)
      } else {
        console.warn('⚠️ [ENHANCED] File not in store after retries; localStorage may be full or blocked')
      }
      
      // Step 4: 최종 확인 및 UI 갱신
      if (confirmedFile) {
        console.log(`✅ [ENHANCED] Step 4: File confirmed - ${editedData.name}`)
        
        // 강제 상태 갱신을 위해 store에서 최신 데이터 가져오기
        await new Promise(resolve => setTimeout(resolve, 200))
        const { mediaFiles: latestFiles } = useMediaStore.getState()
        console.log(`🔄 [ENHANCED] Current mediaFiles count: ${latestFiles.length}`)
        
        // Custom Event 발생 (다른 컴포넌트 동기화)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('media-file-uploaded', {
            detail: {
              fileId: addedFile.id,
              fileName: editedData.name,
              category: editedData.category,
              productId: selectedProductId
            }
          }))
          console.log('📢 [ENHANCED] Dispatched media-file-uploaded event')
          
          // StorageEvent도 발생시켜 다른 탭 동기화
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'media-store',
            newValue: localStorage.getItem('media-store'),
            oldValue: null,
            storageArea: localStorage
          }))
        }
        
        // WebP 변환 완료 후 진행률 초기화
        setWebPProgress(0)
        
        // 다음 파일 처리 또는 완료
        const remainingFiles = pendingFiles.slice(1)
        if (remainingFiles.length > 0) {
          console.log(`📁 [ENHANCED] ${remainingFiles.length} file(s) remaining, opening next...`)
          setPendingFiles(remainingFiles)
          setEditStageFile(remainingFiles[0])
          setIsEditStageOpen(true)
          setWebPProgress(0) // 다음 파일을 위해 진행률 초기화
        } else {
          console.log('✅ [ENHANCED] All files processed successfully!')
          setIsEditStageOpen(false)
          setEditStageFile(null)
          setPendingFiles([])
          setWebPProgress(0) // 진행률 초기화
          const pushed = await forceMediaSync()
          showNotification(
            pushed ? 'success' : 'info',
            pushed
              ? 'All files uploaded successfully!'
              : 'All files saved locally. Server snapshot sync failed — check /api/media/products in Network and CATALOG_SYNC_SECRET / Supabase on the host.'
          )
          setSelectedProductId('')
          
          // 최종 상태 확인
          setTimeout(async () => {
            const { mediaFiles: finalFiles } = useMediaStore.getState()
            console.log(`✅ [ENHANCED] Final mediaFiles count: ${finalFiles.length}`)
          }, 500)
        }
      } else {
        console.error(`❌ [ENHANCED] File not confirmed after ${maxRetries} attempts: ${editedData.name}`)
        
        // 최종 확인 시도
        const { getMediaFileById } = useMediaStore.getState()
        const finalCheck = getMediaFileById(addedFile.id)
        
        if (finalCheck) {
          console.log('✅ [ENHANCED] File found in final check, proceeding...')
          // 파일이 있으면 계속 진행
          const remainingFiles = pendingFiles.slice(1)
          if (remainingFiles.length > 0) {
            setPendingFiles(remainingFiles)
            setEditStageFile(remainingFiles[0])
            setIsEditStageOpen(true)
          } else {
            setIsEditStageOpen(false)
            setEditStageFile(null)
            setPendingFiles([])
            void forceMediaSync()
            showNotification('success', `Files uploaded (verification may be incomplete)`)
            setSelectedProductId('')
          }
        } else {
          showNotification('error', `Failed to save ${editedData.name}. Please try again.`)
        }
      }
    } catch (error) {
      console.error(`❌ [ENHANCED] Upload failed for ${editedData.name}:`, {
        error,
        errorName: (error as Error)?.name,
        errorMessage: (error as Error)?.message,
        stack: (error as Error)?.stack
      })
      
      let errorMessage = `Failed to upload ${editedData.name}`
      if (error instanceof Error) {
        if (error.message.includes('size')) {
          errorMessage = `File size error: ${error.message}`
        } else if (error.message.includes('IndexedDB')) {
          errorMessage = `Storage error: ${error.message}. Please try again.`
        } else {
          errorMessage = `Upload error: ${error.message}`
        }
      }
      
      showNotification('error', errorMessage)
    } finally {
      setIsUploading(false)
      console.log('🏁 [ENHANCED] handleEditStageConfirm completed')
    }
  }, [
    selectedProductId,
    categoryProducts,
    activeTab,
    activeCategory,
    addMediaFileWithData,
    updateMediaFile,
    pendingFiles,
    showNotification,
    forceMediaSync,
  ])
  
  // EditStage 취소
  const handleEditStageCancel = useCallback(() => {
    const remainingFiles = pendingFiles.slice(1)
    if (remainingFiles.length > 0) {
      setPendingFiles(remainingFiles)
      setEditStageFile(remainingFiles[0])
      setIsEditStageOpen(true)
    } else {
      setIsEditStageOpen(false)
      setEditStageFile(null)
      setPendingFiles([])
    }
  }, [pendingFiles])

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  // 파일 삭제 핸들러
  const handleDeleteFile = (id: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMediaFileFromStore(id)
      setSelectedFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
      showNotification('success', 'File deleted successfully.')
    }
  }

  // 파일 다운로드 핸들러
  const handleDownloadFile = (file: MediaFile) => {
    const link = document.createElement('a')
    // dataUrl이 있으면 dataUrl 사용, 없으면 url 사용
    link.href = file.dataUrl || file.url
    link.download = file.name
    link.click()
  }

  // Link to Product: 학습 — 사진(썸네일) 클릭 시 Link to Product 모달이 열리도록 SortableFileItem에서 이미지 onClick → handleLinkToProduct(file.id) 사용. Preview는 Eye 버튼으로.
  // 상품에 미디어 파일 연결 (Quick Link 포함 전체 상품에서 상품명 조회)
  const handleLinkToProduct = async (fileId: string, productId: string) => {
    const product = products.find(p => p.id === productId) ?? categoryProducts.find(p => p.id === productId)
    updateMediaFile(fileId, { productId, productName: product?.name })
    const synced = await forceMediaSync()
    showNotification(
      synced ? 'success' : 'error',
      synced
        ? `File linked to product "${product?.name ?? productId}" successfully!`
        : `Linked locally to "${product?.name ?? productId}", but server sync failed.`
    )
    setIsLinkingModalOpen(false)
    setLinkingFileId(null)
    setLinkByProductIdInput('')
  }

  // 상품 연결 해제
  const handleUnlinkFromProduct = async (fileId: string) => {
    updateMediaFile(fileId, { productId: undefined, productName: undefined })
    const synced = await forceMediaSync()
    showNotification(
      synced ? 'success' : 'error',
      synced
        ? 'File unlinked from product successfully!'
        : 'Unlinked locally, but server sync failed.'
    )
  }

  // Bulk Action 핸들러들
  const handleBulkCategoryChange = (newCategory: string) => {
    if (selectedFiles.size === 0) return
    
      if (activeTab === 'content') {
        // Content 탭: usage를 업데이트
        const categoryName = CONTENT_CATEGORIES.find(c => c.id === newCategory)?.name || newCategory
        selectedFiles.forEach(fileId => {
          const file = mediaFiles.find(f => f.id === fileId)
          if (file && newCategory) {
            // Usage를 표준 태그로 변환
            const tagMap: Record<string, string> = {
              'hero-banner': 'Hero_Banner',
              'category-bg': 'Category_BG',
              'subcategory-card': 'Subcategory_Card',
              'header-logo': 'Header_Logo',
              'general-content': 'General_Content'
            }
            const standardTag = tagMap[newCategory] || 'General_Content'
            
            // 기존 tags 배열에서 표준 태그 제거하고 새 태그 추가
            const updatedTags = file.tags.filter(tag => 
              !['Hero_Banner', 'Category_BG', 'Subcategory_Card', 'Header_Logo', 'Product_Media', 'General_Content'].includes(tag)
            )
            updatedTags.push(standardTag)
            
            updateMediaFile(fileId, { 
              usage: newCategory as MediaUsage,
              tags: updatedTags
            })
          }
        })
      const count = selectedFiles.size
      setSelectedFiles(new Set())
      setIsBulkActionModalOpen(false)
      setBulkAction(null)
      showNotification('success', `Moved ${count} file(s) to ${categoryName}`)
    } else {
      // Product 탭: category를 업데이트
      const categoryName = PRODUCT_CATEGORIES.find(c => c.id === newCategory)?.name || newCategory
      selectedFiles.forEach(fileId => {
        updateMediaFile(fileId, { category: newCategory })
      })
      const count = selectedFiles.size
      setSelectedFiles(new Set())
      setIsBulkActionModalOpen(false)
      setBulkAction(null)
      showNotification('success', `Moved ${count} file(s) to ${categoryName}`)
    }
  }

  const handleBulkProductLink = async (productId: string) => {
    if (selectedFiles.size === 0 || !productId) return
    
    const product = categoryProducts.find(p => p.id === productId)
    if (!product) return
    
    selectedFiles.forEach(fileId => {
      updateMediaFile(fileId, { productId, productName: product.name })
    })
    const synced = await forceMediaSync()
    const count = selectedFiles.size
    setSelectedFiles(new Set())
    setIsBulkActionModalOpen(false)
    setBulkAction(null)
    showNotification(
      synced ? 'success' : 'error',
      synced
        ? `Linked ${count} file(s) to "${product.name}"`
        : `Linked ${count} file(s) locally to "${product.name}", but server sync failed.`
    )
  }

  // 🆕 벌크 태그 변경 핸들러
  const handleBulkTagChange = (newTag: MediaFile['usage']) => {
    if (selectedFiles.size === 0 || !newTag) return
    
    // Usage를 표준 태그로 변환
    const tagMap: Partial<Record<MediaUsage, string>> & Record<string, string> = {
      'hero-banner': 'Hero_Banner',
      'category-bg': 'Category_BG',
      'subcategory-card': 'Subcategory_Card',
      'header-logo': 'Header_Logo',
      'product-media': 'Product_Media',
      'general-content': 'General_Content'
    }
    const standardTag = tagMap[newTag] || 'General_Content'
    
    // 태그 이름 표시용
    const tagLabels: Partial<Record<MediaUsage, string>> & Record<string, string> = {
      'hero-banner': 'Hero Banner',
      'category-bg': 'Category BG',
      'subcategory-card': 'Subcategory Card',
      'header-logo': 'Header Logo',
      'product-media': 'Product Media',
      'general-content': 'General Content'
    }
    const tagLabel = tagLabels[newTag] || 'General Content'
    
    selectedFiles.forEach(fileId => {
      const file = mediaFiles.find(f => f.id === fileId)
      if (file) {
        // 기존 tags 배열에서 표준 태그 제거하고 새 태그 추가
        const updatedTags = file.tags.filter(tag => 
          !['Hero_Banner', 'Category_BG', 'Subcategory_Card', 'Header_Logo', 'Product_Media', 'General_Content', 'Other'].includes(tag)
        )
        updatedTags.push(standardTag)
        
        // usage 필드와 tags 배열 모두 업데이트
        updateMediaFile(fileId, { 
          usage: newTag,
          tags: updatedTags
        })
      }
    })
    
    const count = selectedFiles.size
    setSelectedFiles(new Set())
    setIsBulkActionModalOpen(false)
    setBulkAction(null)
    showNotification('success', `Changed tag to "${tagLabel}" for ${count} file(s)`)
  }

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return
    
    const count = selectedFiles.size
    selectedFiles.forEach(fileId => {
      deleteMediaFileFromStore(fileId)
    })
    setSelectedFiles(new Set())
    setIsBulkActionModalOpen(false)
    setBulkAction(null)
    showNotification('success', `Deleted ${count} file(s) successfully`)
  }

  // 필터링 및 정렬된 파일 목록
  const filteredAndSortedFiles = useMemo(() => {
    let files = mediaFiles.filter(file => {
      // 🆕 탭별 필터링 로직 분리
      let matchesCategory = false
      
      if (activeTab === 'product') {
        // Product 탭: file.category === activeCategory인 파일만 표시
        matchesCategory = file.category === activeCategory
        
        // 🆕 카테고리 상품에 연결된 미디어만 표시 (카테고리 선택 시)
        // activeCategory가 선택되어 있고, 파일이 productId를 가지고 있다면
        // 해당 productId가 현재 카테고리의 상품인지 확인
        if (activeCategory !== 'all' && file.productId) {
          const product = products.find(p => p.id === file.productId)
          if (product) {
            const productCategory = product.category.toLowerCase()
            const categoryMatch = 
              productCategory === activeCategory ||
              (activeCategory === 'hotgoods' && product.isHotGoods) ||
              (activeCategory === 'general' && !['stickers', 'stamps', 'phonecases', 'hotgoods'].includes(productCategory))
            
            // 카테고리와 일치하지 않으면 제외
            if (!categoryMatch && !matchesCategory) return false
          }
        }
      } else {
        // Content 탭: file.usage === activeCategory (usage 태그가 카테고리 ID와 일치)
        matchesCategory = file.usage === activeCategory
      }
      
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (file.productName && file.productName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesProduct = !selectedProductId || file.productId === selectedProductId
      
      // 🆕 Orphaned Files 필터 (Product 탭에서만 적용)
      if (activeTab === 'product' && showOrphanedFiles) {
        const isOrphaned = !file.productId || !products.find(p => p.id === file.productId)
        if (!isOrphaned) return false
      }
      
      // 🆕 태그별 필터
      if (selectedTagFilter) {
        if (!file.tags.includes(selectedTagFilter)) return false
      }
      
      // 🆕 타입별 필터
      if (selectedTypeFilter !== 'all') {
        if (file.type !== selectedTypeFilter) return false
      }
      
      return matchesCategory && matchesSearch && matchesProduct
    })
    
    // 정렬
    files = [...files].sort((a, b) => {
      // order 필드가 있으면 우선적으로 order로 정렬 (드래그 앤 드롭 순서)
      // 같은 카테고리/상품 내에서만 order 비교
      if (a.order !== undefined && b.order !== undefined && 
          a.category === b.category && 
          (a.productId === b.productId || (!a.productId && !b.productId))) {
        return a.order - b.order
      }
      if (a.order !== undefined && a.category === b.category && 
          (a.productId === b.productId || (!a.productId && !b.productId))) {
        return -1 // order가 있는 것이 앞으로
      }
      if (b.order !== undefined && a.category === b.category && 
          (a.productId === b.productId || (!a.productId && !b.productId))) {
        return 1
      }
      
      // order가 없거나 다른 카테고리/상품이면 🆕 고급 정렬 방식 사용
      switch (sortOrder) {
        case 'newest':
          const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
          const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
          return dateB - dateA // 최신순
        case 'oldest':
          const dateA2 = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
          const dateB2 = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
          return dateA2 - dateB2 // 오래된 순
        case 'size-asc':
          return a.size - b.size // 작은 순서
        case 'size-desc':
          return b.size - a.size // 큰 순서
        case 'name-asc':
          return a.name.localeCompare(b.name) // 이름 오름차순
        case 'name-desc':
          return b.name.localeCompare(a.name) // 이름 내림차순
        default:
          // 하위 호환성: sortBy 사용
          if (sortBy === 'date') {
            const dateA3 = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
            const dateB3 = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
            return dateB3 - dateA3 // 최신순
          } else if (sortBy === 'name') {
            return a.name.localeCompare(b.name)
          } else if (sortBy === 'size') {
            return b.size - a.size
          }
          return 0
      }
    })
    
    return files
  }, [mediaFiles, activeCategory, activeTab, searchTerm, selectedProductId, sortOrder, showOrphanedFiles, products, selectedTagFilter, selectedTypeFilter])
  
  // 페이지네이션된 파일 목록
  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredAndSortedFiles.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedFiles, currentPage, pageSize])
  
  const totalPages = Math.ceil(filteredAndSortedFiles.length / pageSize)
  
  // 하위 호환성을 위한 별칭
  const filteredFiles = filteredAndSortedFiles

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 🆕 탭에 따라 activeCategoryInfo 결정
  const activeCategoryInfo = activeTab === 'product' 
    ? PRODUCT_CATEGORIES.find(c => c.id === activeCategory)
    : CONTENT_CATEGORIES.find(c => c.id === activeCategory)

  // 드래그 앤 드롭 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    // 전체 파일 목록에서 인덱스 찾기 (페이지네이션된 파일이 아닌 전체 목록 기준)
    const oldIndex = filteredAndSortedFiles.findIndex(f => f.id === active.id)
    const newIndex = filteredAndSortedFiles.findIndex(f => f.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return
    
    // arrayMove로 순서 변경
    const reorderedFiles = arrayMove(filteredAndSortedFiles, oldIndex, newIndex)
    const fileIds = reorderedFiles.map(f => f.id)
    
    // mediaStore의 reorderFiles 함수로 순서 업데이트
    // 🆕 탭별로 다른 카테고리 전달
    // Product 탭: activeCategory를 category로 사용
    // Content 탭: 'general'을 category로 사용 (실제 구분은 usage로)
    const categoryForReorder = activeTab === 'content' ? 'general' : activeCategory
    reorderFiles(fileIds, categoryForReorder, activeTab === 'product' ? (selectedProductId || undefined) : undefined)
    
    showNotification('success', 'File order updated successfully')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminPageHeader
        title="Image Management"
        icon={<ImageIcon className="w-6 h-6" />}
        showBackButton={true}
        backUrl="/admin/dashboard"
        backLabel="Dashboard"
        showHomepageLink={false}
        showLanguageSelector={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 설명 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Media Management</h2>
          <p className="text-gray-600">
            {activeTab === 'product' 
              ? 'Manage images and videos by product category. Organize media files and link them to specific products for efficient workflow.'
              : 'Manage images and videos for site content. Organize media files by usage type (Hero Banner, Category Background, etc.) for content management.'}
          </p>
        </div>

        {/* 🆕 탭 스위치 (Product Assets vs Content Management) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Mode:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('product')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'product'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Product Assets
                </button>
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'content'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Content Management
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className={`bg-white rounded-lg shadow-sm border mb-6 ${
          activeTab === 'content' ? 'border-purple-200' : 'border-gray-200'
        }`}>
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-4 overflow-x-auto" aria-label="Tabs">
              {(activeTab === 'product' ? PRODUCT_CATEGORIES : CONTENT_CATEGORIES).map((category) => {
                // 🆕 탭별 파일 카운트 계산
                const categoryFileCount = activeTab === 'product'
                  ? mediaFiles.filter(f => f.category === category.id).length
                  : mediaFiles.filter(f => f.usage === category.id).length
                const isActive = activeCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id)
                      setSelectedProductId('')
                      setSearchTerm('')
                      setCurrentPage(1)
                    }}
                    className={`
                      px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
                      ${isActive 
                        ? activeTab === 'content'
                          ? `bg-purple-50 text-purple-700 border-b-2 border-purple-500`
                          : `bg-${category.color}-50 text-${category.color}-700 border-b-2 border-${category.color}-500`
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                    {categoryFileCount > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        isActive 
                          ? activeTab === 'content'
                            ? 'bg-purple-100 text-purple-700'
                            : `bg-${category.color}-100 text-${category.color}-700`
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {categoryFileCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* 상단 컨트롤 */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* 검색 및 필터 */}
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by filename, tags, description, or product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* 🆕 Product 탭에서만 상품 선택 표시 */}
                {activeTab === 'product' && categoryProducts.length > 0 && (
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                  >
                    <option value="">All Products</option>
                    {categoryProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* 🆕 필터 버튼 그룹 */}
              <div className="flex flex-wrap gap-2">
                {/* 태그별 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tag:</span>
                  <select
                    value={selectedTagFilter || ''}
                    onChange={(e) => setSelectedTagFilter(e.target.value || null)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Tags</option>
                    <option value="Hero_Banner">Hero Banner</option>
                    <option value="Category_BG">Category BG</option>
                    <option value="Subcategory_Card">Subcategory Card</option>
                    <option value="Header_Logo">Header Logo</option>
                    <option value="Product_Media">Product Media</option>
                    <option value="General_Content">General Content</option>
                  </select>
                </div>
                
                {/* 타입별 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Type:</span>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value as 'all' | 'image' | 'video')}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
                
                {/* 정렬 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="size-asc">Size (Small)</option>
                    <option value="size-desc">Size (Large)</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                </div>
                
                {/* 🆕 Orphaned Files 토글 (Product 탭에서만 표시) */}
                {activeTab === 'product' && (
                  <button
                    onClick={() => setShowOrphanedFiles(!showOrphanedFiles)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      showOrphanedFiles
                        ? 'bg-orange-100 text-orange-700 border-orange-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {showOrphanedFiles ? '✓ Orphaned' : 'Orphaned'}
                  </button>
                )}
              </div>

              {/* 뷰 모드 및 업로드 버튼 */}
              <div className="flex items-center gap-3">
                <div className="flex border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsUploadModalOpen(true)
                    setSelectedProductId('')
                  }}
                  className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    activeTab === 'content'
                      ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Files
                </button>
              </div>
            </div>

            {/* 카테고리 정보 */}
            {activeCategoryInfo && (
              <div className={`mt-4 p-4 rounded-lg ${
                activeTab === 'content' ? 'bg-purple-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                        activeTab === 'content' ? 'text-purple-900' : 'text-gray-900'
                      }`}>
                        <span>{activeCategoryInfo.icon}</span>
                        {activeTab === 'product' && showOrphanedFiles 
                          ? 'Unused Media Files' 
                          : `${activeCategoryInfo.name} Media Library`}
                      </h3>
                      {activeTab === 'product' && orphanedFiles.length > 0 && !showOrphanedFiles && (
                        <button
                          onClick={() => {
                            setShowOrphanedFiles(true)
                            setSelectedProductId('')
                            setSearchTerm('')
                          }}
                          className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-md hover:bg-orange-200 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          {orphanedFiles.length} Unused File{orphanedFiles.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <p className={`text-sm ${
                      activeTab === 'content' ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {activeTab === 'product' && showOrphanedFiles 
                        ? `${orphanedFiles.length} file(s) not linked to any product`
                        : activeTab === 'product'
                          ? `${filteredAndSortedFiles.length} file(s) • ${categoryProducts.length} product(s) in this category`
                          : `${filteredAndSortedFiles.length} file(s) in this content category`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === 'product' && showOrphanedFiles && (
                      <>
                        {orphanedFiles.length > 0 && (
                          <button
                            onClick={() => setIsDeleteOrphanedModalOpen(true)}
                            className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Delete All ({orphanedFiles.length})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowOrphanedFiles(false)
                            setSelectedProductId('')
                            setSearchTerm('')
                          }}
                          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Back to Category
                        </button>
                      </>
                    )}
                    {activeTab === 'product' && !showOrphanedFiles && selectedProductId && (
                      <button
                        onClick={() => setSelectedProductId('')}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 드래그 앤 드롭 영역 */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Upload Files to {activeCategoryInfo?.name}</h3>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* 🆕 상품 선택 (Product 탭에서만 표시) */}
                {activeTab === 'product' && categoryProducts.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link to Product (Optional)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">No product link</option>
                      {categoryProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* 🆕 Content 탭 안내 메시지 */}
                {activeTab === 'content' && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>Note:</strong> Files uploaded here will be automatically tagged for <strong>{activeCategoryInfo?.name}</strong> usage.
                    </p>
                  </div>
                )}

                {/* 드래그 앤 드롭 영역 */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? activeTab === 'content'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className={`p-3 rounded-full transition-colors ${
                        isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Upload className="w-8 h-8" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Drag and drop files to upload
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Drag and drop image or video files here, or click to select
                      </p>
                      <p className="text-sm text-gray-700 mb-4 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-left">
                        Next, an <strong>Edit</strong> window opens — use the <strong>Confirm and Save</strong> button at the bottom
                        to finish adding files to the library. You will see a success message when it completes.
                      </p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg ${
                        isUploading
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : activeTab === 'content'
                            ? 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : 'Select Files'}
                    </button>
                    <div className="text-xs text-gray-500">
                      <p>Supported formats: JPG, PNG, GIF, WebP, MP4, WebM, OGV</p>
                      <p>Maximum size: 100MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 파일 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Media Files ({filteredAndSortedFiles.length})
                </h3>
                {filteredAndSortedFiles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size > 0 && selectedFiles.size === paginatedFiles.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allIds = new Set(paginatedFiles.map(f => f.id))
                          setSelectedFiles(prev => {
                            const newSet = new Set(prev)
                            paginatedFiles.forEach(f => newSet.add(f.id))
                            return newSet
                          })
                        } else {
                          setSelectedFiles(prev => {
                            const newSet = new Set(prev)
                            paginatedFiles.forEach(f => newSet.delete(f.id))
                            return newSet
                          })
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      title={selectedFiles.size > 0 && selectedFiles.size === paginatedFiles.length ? "Deselect all" : "Select all on this page"}
                    />
                    <span className="text-sm text-gray-600">
                      Select all
                    </span>
                  </div>
                )}
              </div>
              {/* 🆕 Orphaned Files 모드에서도 Bulk Action 활성화 */}
              {(selectedFiles.size > 0 || (showOrphanedFiles && orphanedFiles.length > 0)) && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md">
                    {showOrphanedFiles && selectedFiles.size === 0 
                      ? `${orphanedFiles.length} unused file${orphanedFiles.length !== 1 ? 's' : ''} available`
                      : `${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''} selected`
                    }
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 🆕 Orphaned Files 모드에서 "Select All Orphaned" 버튼 */}
                    {showOrphanedFiles && selectedFiles.size === 0 && (
                      <button
                        onClick={() => {
                          const allOrphanedIds = new Set(orphanedFiles.map(f => f.id))
                          setSelectedFiles(allOrphanedIds)
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Select All Unused
                      </button>
                    )}
                    {selectedFiles.size > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setBulkAction('category')
                            setIsBulkActionModalOpen(true)
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Folder className="w-4 h-4 mr-1" />
                          Change Category
                        </button>
                        <button
                          onClick={() => {
                            setBulkAction('product')
                            setIsBulkActionModalOpen(true)
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Link2 className="w-4 h-4 mr-1" />
                          Link to Product
                        </button>
                        <button
                          onClick={() => {
                            setBulkAction('tag')
                            setIsBulkActionModalOpen(true)
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                        >
                          <Tag className="w-4 h-4 mr-1" />
                          Change Tag
                        </button>
                        <button
                          onClick={() => {
                            setBulkAction('delete')
                            setIsBulkActionModalOpen(true)
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedFiles(new Set())}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                          title="Clear selection"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isRestoring ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Restoring files...</h3>
              <p className="text-gray-600">Please wait while files are being restored from storage.</p>
            </div>
          ) : filteredAndSortedFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {showOrphanedFiles ? 'No orphaned files' : 'No files'}
              </h3>
              <p className="text-gray-600 mb-4">
                {showOrphanedFiles
                  ? 'All files are linked to products. Great job!'
                  : selectedProductId 
                    ? `No files linked to this product yet.`
                    : `No files in ${activeCategoryInfo?.name} category yet.`
                }
              </p>
              {!showOrphanedFiles && (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload First File
                </button>
              )}
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={paginatedFiles.map(f => f.id)}
                  strategy={viewMode === 'grid' ? undefined : verticalListSortingStrategy}
                >
                  <div className={`p-6 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}`}>
                    {paginatedFiles.map((file) => (
                      <SortableFileItem
                        key={file.id}
                        file={file}
                        viewMode={viewMode}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        setPreviewFile={setPreviewFile}
                        handleDownloadFile={handleDownloadFile}
                        handleLinkToProduct={(id) => {
                          setLinkingFileId(id)
                          setProductSearchTerm('')
                          setIsLinkingModalOpen(true)
                        }}
                        handleDeleteFile={handleDeleteFile}
                        handleUnlinkFromProduct={handleUnlinkFromProduct}
                        categoryProducts={categoryProducts}
                        activeCategoryInfo={activeCategoryInfo}
                        formatFileSize={formatFileSize}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                        <option value={96}>96</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages} ({(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredAndSortedFiles.length)} of {filteredAndSortedFiles.length})
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Orphaned Files 일괄 삭제 확인 모달 */}
        {isDeleteOrphanedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete All Orphaned Files?
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{orphanedFiles.length} unused file{orphanedFiles.length !== 1 ? 's' : ''}</strong>? 
                This action cannot be undone.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> These files are not linked to any product. They will be permanently deleted from both localStorage and IndexedDB.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsDeleteOrphanedModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    orphanedFiles.forEach(file => deleteMediaFileFromStore(file.id))
                    setIsDeleteOrphanedModalOpen(false)
                    setShowOrphanedFiles(false)
                    showNotification('success', `Successfully deleted ${orphanedFiles.length} orphaned file${orphanedFiles.length !== 1 ? 's' : ''}`)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 미디어 미리보기 모달 */}
        {previewFile && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setPreviewFile(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[98vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-2 sm:p-2.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
                <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate pr-3">{previewFile.name}</h3>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-gray-900 min-h-0 scrollbar-preview">
                {previewFile.type === 'image' ? (
                  <img
                    src={previewFile.webpUrl || previewFile.dataUrl || previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    onError={(e) => {
                      const img = e.currentTarget
                      const currentSrc = img.src
                      
                      // WebP가 실패했고 원본 URL이 있으면 원본으로 시도
                      if ((currentSrc.includes('webp') || currentSrc.startsWith('blob:')) && previewFile.url && previewFile.url !== currentSrc) {
                        console.log(`⚠️ [PreviewModal] WebP image failed, trying original for: ${previewFile.name}`)
                        img.src = previewFile.url
                        return
                      }
                      
                      // dataUrl이 있고 현재 src와 다르면 시도
                      if (previewFile.dataUrl && previewFile.dataUrl !== currentSrc) {
                        console.log(`⚠️ [PreviewModal] Image failed, trying dataUrl for: ${previewFile.name}`)
                        img.src = previewFile.dataUrl
                        return
                      }
                    }}
                  />
                ) : previewFile.type === 'video' ? (
                  <video
                    src={previewFile.dataUrl || previewFile.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full w-auto h-auto"
                    onError={(e) => {
                      const target = e.currentTarget
                      const mediaError = target?.error
                      const message = mediaError
                        ? `Code ${mediaError.code}: ${mediaError.message || 'Unknown'}`
                        : 'Video failed to load or play'
                      console.warn('[Preview] Video playback error:', previewFile?.name ?? 'unknown', message)
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-white text-center">
                    <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Preview not available for this file type</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{previewFile.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Size:</span>
                    <span className="ml-2 font-medium text-gray-900">{formatFileSize(previewFile.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {PRODUCT_CATEGORIES.find(c => c.id === previewFile.category)?.name || previewFile.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Uploaded:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {typeof previewFile.uploadedAt === 'string' 
                        ? new Date(previewFile.uploadedAt).toLocaleDateString() 
                        : previewFile.uploadedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* WebP 최적화 정보 (접을 수 있음) */}
                {previewFile.type === 'image' && (previewFile.webpUrl || previewFile.originalFormat) && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setIsWebPInfoExpanded(!isWebPInfoExpanded)}
                      className="w-full p-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">WebP Optimization</span>
                        {previewFile.webpUrl && previewFile.webpSize && (
                          <span className="text-xs text-green-700 font-medium">
                            ({((1 - previewFile.webpSize / previewFile.size) * 100).toFixed(1)}% smaller)
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${isWebPInfoExpanded ? 'transform rotate-180' : ''}`} />
                    </button>
                    {isWebPInfoExpanded && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-blue-700">Original Format:</span>
                            <span className="ml-2 font-medium text-blue-900 uppercase">
                              {previewFile.originalFormat || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-blue-700">Original Size:</span>
                            <span className="ml-2 font-medium text-blue-900">
                              {formatFileSize(previewFile.size)}
                            </span>
                          </div>
                          {previewFile.webpUrl && previewFile.webpSize && (
                            <>
                              <div>
                                <span className="text-blue-700">WebP Size:</span>
                                <span className="ml-2 font-medium text-green-700">
                                  {formatFileSize(previewFile.webpSize)}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">Reduction:</span>
                                <span className="ml-2 font-medium text-green-700">
                                  {((1 - previewFile.webpSize / previewFile.size) * 100).toFixed(1)}%
                                </span>
                              </div>
                            </>
                          )}
                          {!previewFile.webpUrl && (
                            <div className="col-span-2">
                              <span className="text-orange-600 text-xs">
                                ⚠️ WebP conversion not available (using original format)
                              </span>
                            </div>
                          )}
                        </div>
                        {previewFile.webpUrl && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <span className="text-xs text-blue-600">
                              ✅ This image is optimized with WebP format for faster loading
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {previewFile.productName && (
                  <div className="mt-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">Linked to:</span>
                    <span className="text-sm font-medium text-green-700">{previewFile.productName}</span>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setLinkingFileId(previewFile.id)
                      setProductSearchTerm('')
                      setIsLinkingModalOpen(true)
                      setPreviewFile(null)
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link to Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 상품 연결 모달 (개선된 버전) */}
        {isLinkingModalOpen && linkingFileId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              {/* 헤더 */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Link to Product</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Select a product to link this media file to
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsLinkingModalOpen(false)
                      setLinkingFileId(null)
                      setProductSearchTerm('')
                      setLinkByProductIdInput('')
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* 검색 바 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products by name, ID, category, or description..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* 상품 목록 */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* 🆕 "All Products" 드롭다운 추가 (빠른 선택용) */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Link (All Products):
                  </label>
                  {!_hasHydrated && products.length === 0 ? (
                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      Loading products...
                    </p>
                  ) : products.length === 0 ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No products in store. Add products in Admin → Products first, then reopen this modal (or use &quot;Link by product ID&quot; below with the exact ID).
                    </p>
                  ) : (
                    <>
                      <select
                        key={`quick-link-${linkingFileId}`}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value && linkingFileId) {
                            handleLinkToProduct(linkingFileId, e.target.value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">Select product to link...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.category})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Or scroll down to see detailed product list
                      </p>
                    </>
                  )}
                </div>

                {/* 상품 ID로 직접 연결 (입력 후 버튼 클릭 시 저장) */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link by product ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkByProductIdInput}
                      onChange={(e) => setLinkByProductIdInput(e.target.value)}
                      placeholder="Enter product ID and click Link"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const id = linkByProductIdInput.trim()
                        if (!id || !linkingFileId) return
                        const product = products.find(p => p.id === id)
                        if (product) {
                          handleLinkToProduct(linkingFileId, product.id)
                          setLinkByProductIdInput('')
                        } else {
                          showNotification('error', `Product with ID "${id}" not found. Check the ID or use the dropdown above.`)
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                    >
                      Link
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Type the exact product ID and click Link to connect this file to that product.
                  </p>
                </div>
                
                {products.length > 0 ? (
                  filteredProductsForLinking.length > 0 ? (
                    <div className="space-y-3">
                      {categoryProducts.length === 0 && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          No products in this category. Showing all products below. Use the dropdown above or search by product ID.
                        </p>
                      )}
                      {filteredProductsForLinking.map(product => {
                        const file = mediaFiles.find(f => f.id === linkingFileId)
                        const isLinked = file?.productId === product.id
                        const stockQuantity = typeof product.stockQuantity === 'number' ? product.stockQuantity : undefined
                        const isOutOfStock = typeof stockQuantity === 'number' ? stockQuantity === 0 : !product.inStock
                        
                        return (
                          <button
                            key={product.id}
                            onClick={() => handleLinkToProduct(linkingFileId, product.id)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              isLinked
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* 상품 이미지 */}
                              <div className="flex-shrink-0">
                                {product.image && product.image.trim() !== '' && product.image !== 'undefined' ? (
                                  <>
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none'
                                        const placeholder = e.currentTarget.nextElementSibling as HTMLElement
                                        if (placeholder) {
                                          placeholder.style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex-col items-center justify-center hidden">
                                      <Package className="w-8 h-8 text-gray-400" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              
                              {/* 상품 정보 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                                      {isLinked && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          <Check className="w-3 h-3 mr-1" />
                                          Linked
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">ID: {product.id}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</p>
                                    {product.originalPrice && (
                                      <p className="text-sm text-gray-500 line-through">${product.originalPrice.toFixed(2)}</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* 상품 상세 정보 */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Tag className="w-3 h-3" />
                                    <span className="capitalize">{product.category}</span>
                                  </div>
                                  <div className={`flex items-center gap-1 ${
                                    isOutOfStock ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    <Package className="w-3 h-3" />
                                    <span>
                                      {isOutOfStock 
                                        ? 'Out of Stock' 
                                        : typeof stockQuantity === 'number' 
                                          ? `${stockQuantity} in stock`
                                          : 'Available'}
                                    </span>
                                  </div>
                                  {product.description && (
                                    <div className="flex items-center gap-1 text-gray-500">
                                      <FileText className="w-3 h-3" />
                                      <span className="truncate max-w-[200px]" title={product.description}>
                                        {product.description}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* 연결 상태 아이콘 */}
                              <div className="flex-shrink-0">
                                {isLinked ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Check className="w-6 h-6 text-blue-600" />
                                    <span className="text-xs text-blue-600 font-medium">Linked</span>
                                  </div>
                                ) : (
                                  <Link2 className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No products found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Try adjusting your search terms
                      </p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No products available</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Add products in Admin first, then you can link images here.
                    </p>
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-gray-600">
                  {productsForLinkingList.length > 0 && (
                    <span>
                      {filteredProductsForLinking.length} of {productsForLinkingList.length} product{productsForLinkingList.length !== 1 ? 's' : ''}
                      {categoryProducts.length === 0 && ' (all products)'}
                      {productSearchTerm && ` matching "${productSearchTerm}"`}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  {linkingFileId && (() => {
                    const file = mediaFiles.find(f => f.id === linkingFileId)
                    if (file?.productId) {
                      return (
                        <button
                          onClick={() => {
                            handleUnlinkFromProduct(linkingFileId)
                            setIsLinkingModalOpen(false)
                            setLinkingFileId(null)
                            setProductSearchTerm('')
                            setLinkByProductIdInput('')
                          }}
                          className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Unlink
                        </button>
                      )
                    }
                    return null
                  })()}
                  <button
                    onClick={() => {
                      setIsLinkingModalOpen(false)
                      setLinkingFileId(null)
                      setProductSearchTerm('')
                      setLinkByProductIdInput('')
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* EditStage Modal */}
        <EditStageModal
          isOpen={isEditStageOpen}
          file={editStageFile}
          initialCategory={activeCategory}
          activeTab={activeTab} // 🆕 탭 정보 전달
          onConfirm={handleEditStageConfirm}
          onCancel={handleEditStageCancel}
        />
        
        {/* Bulk Action Modal */}
        {isBulkActionModalOpen && bulkAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {bulkAction === 'category' && 'Change Category'}
                    {bulkAction === 'product' && 'Link to Product'}
                    {bulkAction === 'tag' && 'Change Tag'}
                    {bulkAction === 'delete' && 'Delete Files'}
                  </h3>
                  <button
                    onClick={() => {
                      setIsBulkActionModalOpen(false)
                      setBulkAction(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {bulkAction === 'category' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Move {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} to:
                    </p>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkCategoryChange(e.target.value)
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 ${
                        activeTab === 'content' ? 'focus:ring-purple-500' : 'focus:ring-blue-500'
                      }`}
                    >
                      <option value="">Select category...</option>
                      {(activeTab === 'product' ? PRODUCT_CATEGORIES : CONTENT_CATEGORIES).map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* 🆕 Product 탭에서만 상품 연결 표시 */}
                {bulkAction === 'product' && activeTab === 'product' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Link {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} to:
                    </p>
                    {categoryProducts.length > 0 ? (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkProductLink(e.target.value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select product...</option>
                        {categoryProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">No products in this category</p>
                        <button
                          onClick={() => {
                            setIsBulkActionModalOpen(false)
                            setBulkAction(null)
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {bulkAction === 'tag' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Change tag for {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} to:
                    </p>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkTagChange(e.target.value as MediaFile['usage'])
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select tag...</option>
                      <option value="hero-banner">Hero Banner</option>
                      <option value="category-bg">Category BG</option>
                      <option value="subcategory-card">Subcategory Card</option>
                      <option value="header-logo">Header Logo</option>
                      <option value="product-media">Product Media</option>
                      <option value="general-content">General Content</option>
                      <option value="Other">Other</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      This will update the usage tag for all selected files. The tag determines where the media can be used.
                    </p>
                  </div>
                )}
                
                {bulkAction === 'delete' && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Are you sure you want to delete <strong>{selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}</strong>? This action cannot be undone.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-red-800">
                        ⚠️ <strong>Warning:</strong> All selected files will be permanently deleted from both localStorage and IndexedDB.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setIsBulkActionModalOpen(false)
                          setBulkAction(null)
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 알림 */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-[110] max-w-sm p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500 text-white' :
            notification.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  )
}

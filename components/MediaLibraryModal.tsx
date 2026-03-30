'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Search, Image as ImageIcon, Video, File, Check, Grid3x3, List, Folder, Package, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMediaStore, MediaFile, getStandardTagFromUsage, type MediaUsage } from '@/lib/mediaStore'
import { indexedDBStorage } from '@/lib/indexedDBStorage'

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  type?: 'image' | 'video' | 'all'
  category?: string
  usage?: MediaUsage | 'all' // filter by usage; 'all' = no usage filter
}

export default function MediaLibraryModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  type = 'all',
  category,
  usage // 🆕 태그 필터링을 위한 usage prop
}: MediaLibraryModalProps) {
  const { mediaFiles, searchMediaFiles, updateMediaFile, deleteMediaFile } = useMediaStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all')
  const [selectedUsageTag, setSelectedUsageTag] = useState<MediaUsage | 'all'>(usage === 'all' || !usage ? 'all' : usage)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [restoredUrls, setRestoredUrls] = useState<Record<string, string>>({})
  const isRestoringRef = useRef(false)
  const restoredFileIdsRef = useRef(new Set<string>())

  // 🆕 usage prop 변경 시 selectedUsageTag 업데이트
  useEffect(() => {
    if (usage && usage !== 'all') {
      setSelectedUsageTag(usage)
      console.log('🔄 [MediaLibraryModal] Usage tag updated:', usage)
    }
  }, [usage])

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'stickers', name: 'Stickers' },
    { id: 'stamps', name: 'Stamps' },
    { id: 'phonecases', name: 'Phone Cases' },
    { id: 'hotgoods', name: 'Market S' },
    { id: 'general', name: 'General' }
  ]

  const filteredFiles = useMemo(() => {
    let files = mediaFiles

    // 1단계: document 타입 제외
    files = files.filter(file => file.type !== 'document')
    
    // 🆕 1.5단계: 사용 가능한 파일만 필터링 (URL이 있거나 IndexedDB에 저장된 파일만)
    files = files.filter(file => {
      // URL이 있으면 사용 가능
      if (file.url && file.url.trim() && file.url !== 'undefined' && !file.url.startsWith('undefined')) {
        return true
      }
      // dataUrl이 있으면 사용 가능
      if (file.dataUrl && file.dataUrl.trim() && file.dataUrl !== 'undefined' && !file.dataUrl.startsWith('undefined')) {
        return true
      }
      // 🆕 동영상 파일의 경우: IndexedDB에 저장되어 있으면 사용 가능 (dataUrl이 없어도 됨)
      if (file.type === 'video' && file.storedInIndexedDB) {
        return true
      }
      // IndexedDB에 저장된 파일이면 사용 가능 (나중에 복원 가능)
      if (file.storedInIndexedDB) {
        return true
      }
      // webpUrl이 있으면 사용 가능
      if (file.webpUrl && file.webpUrl.trim() && file.webpUrl !== 'undefined' && !file.webpUrl.startsWith('undefined')) {
        return true
      }
      // 모두 없으면 제외
      return false
    })

    // 2단계: 타입 필터링 (image 또는 video만)
    if (type !== 'all') {
      files = files.filter(file => {
        // 🆕 타입이 정확히 일치하는지 확인 (대소문자 구분)
        const fileType = file.type?.toLowerCase()
        const expectedType = type?.toLowerCase()
        return fileType === expectedType
      })
    }

    // 3단계: 카테고리 필터링
    // 🆕 selectedCategory가 'all'이 아니면 항상 필터링 수행 (사용자가 UI에서 선택한 카테고리)
    if (selectedCategory !== 'all') {
      files = files.filter(file => file.category === selectedCategory)
    }

    // 🆕 4단계: Usage 태그 필터링
    // 🆕 selectedUsageTag가 'all'이 아니면 항상 필터링 수행 (사용자가 UI에서 선택한 태그)
    if (selectedUsageTag !== 'all') {
      files = files.filter(file => {
        // selectedUsageTag를 표준 태그 형식으로 변환
        const tagMap: Record<string, string> = {
          'hero-banner': 'Hero_Banner',
          'category-bg': 'Category_BG',
          'subcategory-card': 'Subcategory_Card',
          'header-logo': 'Header_Logo',
          'product-media': 'Product_Media',
          'general-content': 'General_Content'
        }
        
        // selectedUsageTag가 usage 형식인지 표준 태그 형식인지 확인
        const standardTag =
          tagMap[selectedUsageTag as keyof typeof tagMap] || selectedUsageTag
        
        if (!standardTag) return false
        // file.usage 필드 또는 file.tags 배열에서 태그 확인
        return file.usage === selectedUsageTag ||
               file.tags.includes(standardTag) ||
               file.tags.includes(selectedUsageTag as string)
      })
    }

    // 5단계: 검색 필터링 (이미 필터링된 파일들 중에서만 검색)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      files = files.filter(file => {
        return file.name.toLowerCase().includes(lowerSearchTerm) ||
               file.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)) ||
               (file.description && file.description.toLowerCase().includes(lowerSearchTerm)) ||
               (file.productName && file.productName.toLowerCase().includes(lowerSearchTerm))
      })
    }

    // 🆕 6단계: 우선순위 정렬 (usage prop이 전달된 경우 해당 태그가 있는 파일을 먼저 표시)
    return files.sort((a, b) => {
      // usage prop이 있고, 해당 태그가 있는 파일을 우선순위로
      if (usage && usage !== 'all') {
        const usageTag = getStandardTagFromUsage(usage)

        if (usageTag) {
          const aHasTag =
            (a.usage ? getStandardTagFromUsage(a.usage) === usageTag : false) ||
            a.tags.includes(usageTag)
          const bHasTag =
            (b.usage ? getStandardTagFromUsage(b.usage) === usageTag : false) ||
            b.tags.includes(usageTag)
          
          if (aHasTag && !bHasTag) return -1 // a가 우선
          if (!aHasTag && bHasTag) return 1  // b가 우선
        }
      }
      
      // 그 외에는 최신순 정렬
      const dateA = typeof a.uploadedAt === 'string' ? new Date(a.uploadedAt).getTime() : a.uploadedAt.getTime()
      const dateB = typeof b.uploadedAt === 'string' ? new Date(b.uploadedAt).getTime() : b.uploadedAt.getTime()
      return dateB - dateA
    })
  }, [mediaFiles, type, selectedCategory, selectedUsageTag, searchTerm, usage])

  // 페이지네이션 설정
  const itemsPerPage = viewMode === 'grid' ? 20 : 10
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage))

  // 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedUsageTag, type, viewMode])

  // 현재 페이지 범위 확인 및 조정
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // 페이지네이션된 파일 목록
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredFiles.slice(start, end)
  }, [filteredFiles, currentPage, itemsPerPage])

  // IndexedDB에서 파일 URL 복원
  useEffect(() => {
    if (!isOpen || isRestoringRef.current) return
    
    const restoreFiles = async () => {
      if (isRestoringRef.current) return
      isRestoringRef.current = true
      
      try {
        // IndexedDB에 저장된 파일 중 URL이 없거나 빈 문자열인 파일만 복원
        const filesToRestore = mediaFiles.filter(file => {
          if (!file.storedInIndexedDB) return false
          // 이미 복원한 파일은 제외
          if (restoredFileIdsRef.current.has(file.id)) {
            return false
          }
          // URL이 없거나 빈 문자열이거나 blob URL이 아닌 경우만 복원
          if (!file.url || file.url === '' || !file.url.startsWith('blob:')) {
            return true
          }
          // blob URL이 이미 있으면 복원 완료로 표시
          restoredFileIdsRef.current.add(file.id)
          return false
        })
        
        if (filesToRestore.length > 0) {
          console.log(`📦 [MediaLibraryModal] Restoring ${filesToRestore.length} files from IndexedDB...`)
          
          // WebP 파일도 확인 (이미지인 경우)
          const restorePromises = filesToRestore.map(async (file) => {
            try {
              // 이미지인 경우 WebP 파일을 먼저 확인
              if (file.type === 'image') {
                // 1. WebP URL이 유효한 blob URL이면 사용
                if (file.webpUrl && file.webpUrl.startsWith('blob:')) {
                  restoredFileIdsRef.current.add(file.id)
                  setRestoredUrls(prev => ({ ...prev, [file.id]: file.webpUrl! }))
                  console.log(`✅ [MediaLibraryModal] Using existing WebP blob URL for: ${file.name}`)
                  return
                }
                
                // 2. IndexedDB에서 WebP 파일 복원 시도
                // 🆕 hasWebp가 true이거나, webpUrl이 있거나, 또는 모든 이미지에 대해 시도 (더 적극적인 복원)
                const shouldTryWebP = file.hasWebp || file.webpUrl || file.storedInIndexedDB
                if (shouldTryWebP) {
                  try {
                    const webpFileId = file.id + '_webp'
                    console.log(`🔍 [MediaLibraryModal] Attempting to restore WebP file: ${webpFileId} (hasWebp: ${file.hasWebp}, storedInIndexedDB: ${file.storedInIndexedDB})`)
                    const webpUrl = await indexedDBStorage.getFile(webpFileId)
                    if (webpUrl && webpUrl.trim()) {
                      console.log(`✅ [MediaLibraryModal] Restored WebP URL from IndexedDB for: ${file.name} (${file.id})`)
                      restoredFileIdsRef.current.add(file.id)
                      setRestoredUrls(prev => ({ ...prev, [file.id]: webpUrl }))
                      // WebP URL도 업데이트 (hasWebp 플래그 포함)
                      updateMediaFile(file.id, { 
                        webpUrl: webpUrl,
                        url: webpUrl, // WebP를 기본 URL로 사용
                        hasWebp: true // WebP 파일이 있음을 명시
                      })
                      return
                    } else {
                      console.log(`ℹ️ [MediaLibraryModal] WebP file ID ${webpFileId} not found in IndexedDB, will try original`)
                    }
                  } catch (webpError) {
                    console.log(`ℹ️ [MediaLibraryModal] WebP restore error for ${file.name}, using original:`, webpError)
                    // WebP가 없으면 원본으로 계속 진행
                  }
                } else {
                  console.log(`ℹ️ [MediaLibraryModal] File ${file.name} skipping WebP restore (hasWebp: ${file.hasWebp}, webpUrl: ${!!file.webpUrl}, storedInIndexedDB: ${file.storedInIndexedDB})`)
                }
              }
              
              // 3. IndexedDB에서 원본 파일 가져오기
              const fileUrl = await indexedDBStorage.getFile(file.id)
              
              if (fileUrl) {
                console.log(`✅ [MediaLibraryModal] Restored original URL for file: ${file.name} (${file.id})`)
                restoredFileIdsRef.current.add(file.id)
                
                // 상태 업데이트
                updateMediaFile(file.id, { url: fileUrl })
                setRestoredUrls(prev => ({ ...prev, [file.id]: fileUrl }))
              } else {
                console.warn(`⚠️ [MediaLibraryModal] File not found in IndexedDB: ${file.name} (${file.id})`)
              }
            } catch (error) {
              console.error(`❌ [MediaLibraryModal] Failed to restore file ${file.name}:`, error)
            }
          })
          
          await Promise.all(restorePromises)
          console.log(`✅ [MediaLibraryModal] Completed restoring ${filesToRestore.length} files`)
        }
      } catch (error) {
        console.error('❌ [MediaLibraryModal] Error during file restoration:', error)
      } finally {
        isRestoringRef.current = false
      }
    }
    
    restoreFiles()
  }, [isOpen, mediaFiles, updateMediaFile])

  const handleSelect = async (file: MediaFile) => {
    console.log('🎯 [MediaLibraryModal] handleSelect called:', {
      fileId: file.id,
      fileName: file.name,
      fileType: file.type,
      hasUrl: !!file.url,
      hasDataUrl: !!file.dataUrl,
      hasWebpUrl: !!file.webpUrl,
      storedInIndexedDB: file.storedInIndexedDB
    })

    // 🆕 Step 1: 기존 URL 확인 (우선순위: 복원된 URL > WebP (blob/data) > dataUrl > url > webpUrl)
    // 🆕 blob: 또는 data: URL은 indexeddb:// 형식으로 변환하여 사용
    let selectedUrl = restoredUrls[file.id] || 
                     (file.webpUrl && (file.webpUrl.startsWith('blob:') || file.webpUrl.startsWith('data:')) ? file.webpUrl : null) ||
                     file.dataUrl || 
                     file.url || 
                     file.webpUrl
    
    // 🆕 Step 1-1: blob: 또는 data: URL이면 indexeddb:// 형식으로 변환
    if (selectedUrl && (selectedUrl.startsWith('blob:') || selectedUrl.startsWith('data:'))) {
      selectedUrl = `indexeddb://${file.id}`
      console.log('🔄 [MediaLibraryModal] Converting blob/data URL to indexeddb:// in Step 1:', {
        originalUrl: restoredUrls[file.id] || file.webpUrl || file.dataUrl || file.url || file.webpUrl,
        convertedUrl: selectedUrl,
        fileId: file.id
      })
    }

    // 🆕 Step 2: URL이 없거나 유효하지 않으면 능동적 복원 시도
    if (!selectedUrl || !selectedUrl.trim() || selectedUrl === 'undefined' || selectedUrl.startsWith('undefined')) {
      console.log('🔄 [MediaLibraryModal] No valid URL found, starting active restoration...', {
        fileId: file.id,
        fileName: file.name,
        fileType: file.type
      })

      let restorationSuccess = false

      try {
        // 🆕 Step 2-1: 이미지인 경우 WebP 파일 먼저 복원 시도 (hasWebp가 true이거나 webpUrl이 있으면 시도)
        if (file.type === 'image' && (file.hasWebp || file.webpUrl)) {
          try {
            const webpFileId = file.id + '_webp'
            console.log(`🔍 [MediaLibraryModal] Attempting to restore WebP file: ${webpFileId} (hasWebp: ${file.hasWebp})`)
            const restoredWebpUrl = await indexedDBStorage.getFile(webpFileId)
            
            if (restoredWebpUrl && restoredWebpUrl.trim()) {
              // 🆕 blob: 또는 data: URL이면 indexeddb:// 형식으로 변환
              let finalWebpUrl = restoredWebpUrl
              if (restoredWebpUrl.startsWith('blob:') || restoredWebpUrl.startsWith('data:')) {
                finalWebpUrl = `indexeddb://${file.id}`
                console.log('🔄 [MediaLibraryModal] Converting restored WebP URL to indexeddb:// format:', {
                  originalUrl: restoredWebpUrl.substring(0, 50),
                  convertedUrl: finalWebpUrl
                })
              }
              
              console.log('✅ [MediaLibraryModal] WebP file restored successfully:', finalWebpUrl)
              selectedUrl = finalWebpUrl
              restorationSuccess = true
              
              // 🆕 스토어 업데이트 (WebP URL을 webpUrl과 url 모두에 설정, hasWebp 플래그 포함)
              updateMediaFile(file.id, { 
                webpUrl: finalWebpUrl, 
                url: finalWebpUrl,
                hasWebp: true // WebP 파일이 있음을 명시
              })
              setRestoredUrls(prev => ({ ...prev, [file.id]: finalWebpUrl }))
            } else {
              console.log('ℹ️ [MediaLibraryModal] WebP file not found in IndexedDB, trying original...')
            }
          } catch (webpError) {
            console.log('ℹ️ [MediaLibraryModal] WebP restore error (will try original):', webpError)
          }
        } else if (file.type === 'image') {
          console.log(`ℹ️ [MediaLibraryModal] File ${file.name} has no WebP (hasWebp: ${file.hasWebp}, webpUrl: ${!!file.webpUrl}), trying original...`)
        }

        // 🆕 Step 2-2: WebP 복원 실패 또는 이미지가 아닌 경우 원본 파일 복원 시도
        if (!restorationSuccess) {
          console.log(`🔍 [MediaLibraryModal] Attempting to restore original file: ${file.id}`)
          const restoredFileUrl = await indexedDBStorage.getFile(file.id)
          
          if (restoredFileUrl && restoredFileUrl.trim()) {
            // 🆕 blob: 또는 data: URL이면 indexeddb:// 형식으로 변환
            let finalUrl = restoredFileUrl
            if (restoredFileUrl.startsWith('blob:') || restoredFileUrl.startsWith('data:')) {
              finalUrl = `indexeddb://${file.id}`
              console.log('🔄 [MediaLibraryModal] Converting restored URL to indexeddb:// format:', {
                originalUrl: restoredFileUrl.substring(0, 50),
                convertedUrl: finalUrl
              })
            }
            
            console.log('✅ [MediaLibraryModal] Original file restored successfully:', finalUrl)
            selectedUrl = finalUrl
            restorationSuccess = true
            
            // 🆕 스토어 업데이트 (indexeddb:// 형식으로 저장)
            updateMediaFile(file.id, { url: finalUrl })
            setRestoredUrls(prev => ({ ...prev, [file.id]: finalUrl }))
          } else {
            console.warn('⚠️ [MediaLibraryModal] Original file not found in IndexedDB')
          }
        }
      } catch (error) {
        console.error('❌ [MediaLibraryModal] Failed to restore file from IndexedDB:', error)
      }

      // 🆕 Step 3: 모든 복원 시도 실패 시 최종 확인 및 에러 처리
      if (!restorationSuccess && (!selectedUrl || !selectedUrl.trim() || selectedUrl === 'undefined' || selectedUrl.startsWith('undefined'))) {
        console.warn('⚠️ [MediaLibraryModal] All restoration attempts failed. Checking IndexedDB for file existence...', {
          fileId: file.id,
          fileName: file.name,
          fileType: file.type
        })
        
        try {
          const allFileIds = await indexedDBStorage.getAllFileIds()
          const fileExists = allFileIds.includes(file.id) || allFileIds.includes(file.id + '_webp')
          
          console.warn('⚠️ [MediaLibraryModal] No URL available after all restoration attempts:', {
            fileId: file.id,
            fileName: file.name,
            fileType: file.type,
            storedInIndexedDB: file.storedInIndexedDB,
            fileExistsInIndexedDB: fileExists,
            totalFilesInIndexedDB: allFileIds.length,
            availableFileIds: allFileIds.slice(0, 10) // 디버깅을 위해 처음 10개만 표시
          })
          
          // 🆕 파일이 실제로 IndexedDB에 없으면 자동으로 삭제
          if (!fileExists && !file.storedInIndexedDB) {
            console.warn(`🗑️ [MediaLibraryModal] Removing unavailable file from store: ${file.name} (${file.id})`)
            deleteMediaFile(file.id)
            alert(`The file "${file.name}" is not available and has been removed from the library. Please select another file or re-upload it.`)
          } else if (fileExists) {
            // 파일이 IndexedDB에 있지만 복원에 실패한 경우 - 재시도 로직
            console.warn(`🔄 [MediaLibraryModal] File exists in IndexedDB but restoration failed. Attempting direct blob retrieval...`)
            try {
              // 직접 Blob으로 가져와서 URL 생성 시도
              const blob = await indexedDBStorage.getFileAsBlob(file.id)
              if (blob) {
                // 🆕 blob URL을 생성하되, indexeddb:// 형식으로 저장
                const indexedDbUrl = `indexeddb://${file.id}`
                selectedUrl = indexedDbUrl
                restorationSuccess = true
                updateMediaFile(file.id, { url: indexedDbUrl })
                setRestoredUrls(prev => ({ ...prev, [file.id]: indexedDbUrl }))
                console.log('✅ [MediaLibraryModal] Successfully restored file using indexeddb:// format:', indexedDbUrl)
              } else {
                // WebP도 시도
                const webpBlob = await indexedDBStorage.getFileAsBlob(file.id + '_webp')
                if (webpBlob) {
                  // 🆕 WebP도 indexeddb:// 형식으로 저장
                  const indexedDbUrl = `indexeddb://${file.id}`
                  selectedUrl = indexedDbUrl
                  restorationSuccess = true
                  updateMediaFile(file.id, { webpUrl: indexedDbUrl, url: indexedDbUrl, hasWebp: true })
                  setRestoredUrls(prev => ({ ...prev, [file.id]: indexedDbUrl }))
                  console.log('✅ [MediaLibraryModal] Successfully restored WebP file using indexeddb:// format:', indexedDbUrl)
                }
              }
            } catch (blobError) {
              console.error('❌ [MediaLibraryModal] Direct blob retrieval also failed:', blobError)
            }
            
            // 여전히 실패한 경우
            if (!restorationSuccess) {
              alert(`Error: Unable to load file "${file.name}". The file exists but cannot be accessed. Please try:\n1. Refreshing the page\n2. Selecting another file\n3. Re-uploading the file`)
              return
            }
          } else {
            // 파일이 있지만 접근할 수 없는 경우
            alert(`Error: Unable to load file "${file.name}". The file exists but cannot be accessed. Please try:\n1. Refreshing the page\n2. Selecting another file\n3. Re-uploading the file`)
            return
          }
        } catch (checkError) {
          console.error('❌ [MediaLibraryModal] Failed to check IndexedDB:', checkError)
          // IndexedDB 확인 실패 시에도 파일이 없으면 삭제 시도
          if (!file.storedInIndexedDB && !file.url && !file.dataUrl) {
            console.warn(`🗑️ [MediaLibraryModal] Removing file with no data from store: ${file.name} (${file.id})`)
            deleteMediaFile(file.id)
            alert(`The file "${file.name}" is not available and has been removed from the library. Please select another file.`)
          } else {
            alert(`Error: Unable to load file "${file.name}". Please try selecting another file or contact support if the problem persists.`)
          }
          return
        }
      }
    }

    // 🆕 Step 4: 유효한 URL이 있으면 onSelect 호출
    if (selectedUrl && selectedUrl.trim() && selectedUrl !== 'undefined' && !selectedUrl.startsWith('undefined')) {
      // 🆕 blob: 또는 data: URL인 경우 indexeddb:// 형식으로 변환하여 전달
      // blob:와 data: URL은 임시 URL이므로 영구적인 indexeddb:// 형식으로 변환
      let finalUrl = selectedUrl
      if (selectedUrl.startsWith('blob:') || selectedUrl.startsWith('data:')) {
        // blob: 또는 data: URL을 indexeddb:// 형식으로 변환
        finalUrl = `indexeddb://${file.id}`
        console.log('🔄 [MediaLibraryModal] Converting temporary URL to indexeddb:// format:', {
          originalUrl: selectedUrl.substring(0, 50),
          convertedUrl: finalUrl,
          fileId: file.id,
          fileType: file.type
        })
      }
      
      console.log('✅ [MediaLibraryModal] Valid URL found, calling onSelect:', {
        fileId: file.id,
        fileName: file.name,
        originalUrlPrefix: selectedUrl.substring(0, 50),
        finalUrl: finalUrl
      })
      onSelect(finalUrl)
      onClose()
    } else {
      console.error('❌ [MediaLibraryModal] Invalid URL after all attempts:', {
        fileId: file.id,
        fileName: file.name,
        selectedUrl: selectedUrl
      })
      alert(`Error: Unable to load file "${file.name}". Please try selecting another file.`)
    }
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-1 sm:p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[98vw] max-h-[98vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Select from Media Library</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 sm:p-3 border-b border-gray-200 bg-gray-50 space-y-2 sticky top-[60px] bg-gray-50 z-10">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, tags, description, or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* 🆕 Usage Tag Filter */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-600 font-medium self-center mr-1">Tags:</span>
            {[
              { value: 'all' as const, label: 'All Tags' },
              { value: 'hero-banner' as const, label: 'Hero Banner' },
              { value: 'category-bg' as const, label: 'Category BG' },
              { value: 'subcategory-card' as const, label: 'Subcategory Card' },
              { value: 'header-logo' as const, label: 'Header Logo' },
              { value: 'product-media' as const, label: 'Product Media' },
              { value: 'general-content' as const, label: 'General Content' }
            ].map(tag => (
              <button
                key={tag.value}
                onClick={() =>
                  setSelectedUsageTag(tag.value === 'all' ? 'all' : tag.value)
                }
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedUsageTag === tag.value
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid/List */}
        <div className="p-2 sm:p-3 bg-gray-50">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-16">
              <File className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">No files found</p>
              <p className="text-sm text-gray-500">
                Upload files in Image Management to use them here
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 sm:gap-3">
              {paginatedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  className="relative group cursor-pointer bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-lg transition-all"
                >
                  {file.type === 'image' ? (
                    (() => {
                      // URL 우선순위: 복원된 URL > WebP (blob) > WebP (기타) > dataUrl > url
                      const restoredUrl = restoredUrls[file.id]
                      
                      // WebP URL 확인 (blob URL이거나 복원된 URL이 WebP인 경우)
                      let webpUrl: string | null = null
                      if (file.webpUrl) {
                        if (file.webpUrl.startsWith('blob:') || file.webpUrl.startsWith('data:')) {
                          webpUrl = file.webpUrl
                        }
                      }
                      // 복원된 URL이 WebP인지 확인 (blob URL이면 WebP일 가능성)
                      const isRestoredWebP = restoredUrl && (restoredUrl.includes('webp') || restoredUrl.startsWith('blob:'))
                      
                      // 🆕 최종 이미지 URL 결정 (우선순위: 복원된 URL > WebP > dataUrl > url)
                      // WebP가 있으면 우선 사용, 없으면 원본으로 폴백
                      const imageUrl = restoredUrl || 
                                     webpUrl || 
                                     file.webpUrl || 
                                     file.dataUrl || 
                                     file.url
                      const isValidUrl = imageUrl && 
                                        typeof imageUrl === 'string' && 
                                        imageUrl.trim() !== '' && 
                                        imageUrl !== 'undefined' &&
                                        !imageUrl.startsWith('undefined')
                      
                      return isValidUrl ? (
                        <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={file.name}
                            className="max-w-full max-h-full w-auto h-auto object-contain"
                            onError={(e) => {
                              const img = e.currentTarget
                              const currentSrc = img.src
                              
                              // WebP 이미지가 실패했고, 원본 이미지가 있으면 원본으로 시도
                              if ((currentSrc.includes('webp') || currentSrc.startsWith('blob:')) && file.url && file.url !== currentSrc) {
                                console.log(`⚠️ [MediaLibraryModal] WebP image failed, trying original for: ${file.name}`)
                                img.src = file.url
                                return
                              }
                              
                              // dataUrl이 있고 현재 src와 다르면 시도
                              if (file.dataUrl && file.dataUrl !== currentSrc) {
                                console.log(`⚠️ [MediaLibraryModal] Image failed, trying dataUrl for: ${file.name}`)
                                img.src = file.dataUrl
                                return
                              }
                              
                              // 모든 시도 실패 시 플레이스홀더 표시
                              img.style.display = 'none'
                              const placeholder = img.parentElement?.nextElementSibling as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }}
                          />
                        </div>
                      ) : null
                    })() || (
                      <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 bg-gray-100 flex flex-col items-center justify-center">
                        <ImageIcon className="w-7 h-7 text-gray-400" />
                        <span className="text-xs text-gray-500">No Image</span>
                      </div>
                    )
                  ) : file.type === 'video' ? (
                    <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 bg-gray-100 flex flex-col items-center justify-center relative">
                      {(() => {
                        // 복원된 URL이 있으면 우선 사용
                        const restoredUrl = restoredUrls[file.id]
                        const videoUrl = restoredUrl || file.dataUrl || file.url
                        const isValidUrl = videoUrl && 
                                          typeof videoUrl === 'string' && 
                                          videoUrl.trim() !== '' && 
                                          videoUrl !== 'undefined' &&
                                          !videoUrl.startsWith('undefined')
                        
                        return isValidUrl ? (
                          <video
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            onLoadedMetadata={(e) => {
                              const video = e.currentTarget
                              video.currentTime = 0.1
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : null
                      })() || (
                        <Video className="w-7 h-7 text-gray-400" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                        <Video className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-20 sm:h-24 md:h-28 lg:h-32 bg-gray-100 flex items-center justify-center">
                      <File className="w-7 h-7 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-opacity flex items-center justify-center pointer-events-none">
                    <Check className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent text-white p-2">
                    <p className="text-xs font-medium truncate mb-0.5">{file.name}</p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-200">
                      <Folder className="w-2.5 h-2.5" />
                      <span className="truncate">{categories.find(c => c.id === file.category)?.name || file.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedFiles.map((file) => {
                const uploadedDate = typeof file.uploadedAt === 'string' 
                  ? new Date(file.uploadedAt) 
                  : file.uploadedAt
                
                return (
                  <div
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    className="group cursor-pointer bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {file.type === 'image' ? (() => {
                        // URL 우선순위: 복원된 URL > WebP (blob) > WebP (기타) > dataUrl > url
                        const restoredUrl = restoredUrls[file.id]
                        
                        // WebP URL 확인 (blob URL이거나 복원된 URL이 WebP인 경우)
                        let webpUrl: string | null = null
                        if (file.webpUrl) {
                          if (file.webpUrl.startsWith('blob:') || file.webpUrl.startsWith('data:')) {
                            webpUrl = file.webpUrl
                          }
                        }
                        
                        // 최종 이미지 URL 결정
                        const imageUrl = restoredUrl || webpUrl || file.dataUrl || file.url || file.webpUrl
                        const isValidUrl = imageUrl && 
                                          typeof imageUrl === 'string' && 
                                          imageUrl.trim() !== '' && 
                                          imageUrl !== 'undefined' &&
                                          !imageUrl.startsWith('undefined')
                        
                        return isValidUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={file.name}
                              className="max-w-full max-h-full w-auto h-auto object-contain bg-gray-50"
                              onError={(e) => {
                                const img = e.currentTarget
                                const currentSrc = img.src
                                
                                // WebP 이미지가 실패했고, 원본 이미지가 있으면 원본으로 시도
                                if ((currentSrc.includes('webp') || currentSrc.startsWith('blob:')) && file.url && file.url !== currentSrc) {
                                  console.log(`⚠️ [MediaLibraryModal] WebP image failed, trying original for: ${file.name}`)
                                  img.src = file.url
                                  return
                                }
                                
                                // dataUrl이 있고 현재 src와 다르면 시도
                                if (file.dataUrl && file.dataUrl !== currentSrc) {
                                  console.log(`⚠️ [MediaLibraryModal] Image failed, trying dataUrl for: ${file.name}`)
                                  img.src = file.dataUrl
                                  return
                                }
                                
                                // 모든 시도 실패 시 플레이스홀더 표시
                                img.style.display = 'none'
                                const placeholder = img.nextElementSibling as HTMLElement
                                if (placeholder) {
                                  placeholder.style.display = 'flex'
                                }
                              }}
                            />
                            <div className="w-full h-full flex flex-col items-center justify-center" style={{ display: 'none' }}>
                              <ImageIcon className="w-7 h-7 text-gray-400" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <ImageIcon className="w-7 h-7 text-gray-400" />
                            <span className="text-xs text-gray-500">No Image</span>
                          </div>
                        )
                      })() : file.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 relative">
                          {(() => {
                            // 복원된 URL이 있으면 우선 사용
                            const restoredUrl = restoredUrls[file.id]
                            const videoUrl = restoredUrl || file.dataUrl || file.url
                            const isValidVideoUrl = videoUrl && 
                                                   typeof videoUrl === 'string' && 
                                                   videoUrl.trim() !== '' && 
                                                   videoUrl !== 'undefined' &&
                                                   !videoUrl.startsWith('undefined')
                            return isValidVideoUrl ? (
                              <video
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                muted
                                onLoadedMetadata={(e) => {
                                  e.currentTarget.currentTime = 0.1
                                }}
                              />
                            ) : null
                          })() || <Video className="w-8 h-8 text-gray-400" />}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <File className="w-7 h-7 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{file.name}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Folder className="w-4 h-4" />
                              <span>{categories.find(c => c.id === file.category)?.name || file.category}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {file.type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                              <span className="capitalize">{file.type}</span>
                            </div>
                            {file.size && (
                              <div className="flex items-center gap-1">
                                <File className="w-4 h-4" />
                                <span>{formatFileSize(file.size)}</span>
                              </div>
                            )}
                            {file.productName && (
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                <span className="truncate">{file.productName}</span>
                              </div>
                            )}
                          </div>
                          {file.description && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{file.description}</p>
                          )}
                          {file.tags && file.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {file.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 3 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{file.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right text-xs text-gray-500">
                          <div className="flex items-center gap-1 mb-1">
                            <Calendar className="w-4 h-4" />
                            <span>{uploadedDate.toLocaleDateString()}</span>
                          </div>
                          <Check className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-white sticky bottom-0 bg-white z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* 파일 정보 */}
            <div className="text-sm text-gray-600">
              {filteredFiles.length === 0 ? (
                <span>No files available</span>
              ) : (
                <span>
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>-
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredFiles.length)}</span> of{' '}
                  <span className="font-medium">{filteredFiles.length}</span> file{filteredFiles.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* 페이지네이션 컨트롤 */}
            {filteredFiles.length > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Cancel 버튼 */}
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


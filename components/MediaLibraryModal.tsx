'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Search, Image as ImageIcon, Video, File, Check, Grid3x3, List, Folder, Package, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMediaStore, MediaFile, getStandardTagFromUsage, type MediaUsage } from '@/lib/mediaStore'

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
  const { mediaFiles, searchMediaFiles } = useMediaStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all')
  const [selectedUsageTag, setSelectedUsageTag] = useState<MediaUsage | 'all'>(usage === 'all' || !usage ? 'all' : usage)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)

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
    
    files = files.filter(file => {
      const u = (file.url || '').trim()
      const w = (file.webpUrl || '').trim()
      const d = (file.dataUrl || '').trim()
      if (u && u !== 'undefined' && !u.startsWith('undefined')) {
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:')) return true
      }
      if (w && w !== 'undefined' && !w.startsWith('undefined')) {
        if (w.startsWith('http://') || w.startsWith('https://') || w.startsWith('blob:') || w.startsWith('data:')) return true
      }
      if (d && d.startsWith('data:')) return true
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

  const handleSelect = (file: MediaFile) => {
    const https =
      (file.webpUrl && /^https?:\/\//i.test(file.webpUrl.trim()) ? file.webpUrl.trim() : '') ||
      (file.url && /^https?:\/\//i.test(file.url.trim()) ? file.url.trim() : '')
    const legacy =
      file.dataUrl?.trim().startsWith('data:') ? file.dataUrl.trim() : ''
    const blob =
      file.webpUrl?.startsWith('blob:') || file.url?.startsWith('blob:')
        ? file.webpUrl?.startsWith('blob:')
          ? file.webpUrl!
          : file.url!
        : ''

    const finalUrl = https || legacy || blob
    if (!finalUrl) {
      alert(
        `No stable URL for "${file.name}". Re-upload this asset in Image Management so it is stored in Supabase Storage.`
      )
      return
    }
    if (blob && !https) {
      alert(
        `This file only has a temporary preview URL. Re-upload "${file.name}" in Image Management to get a permanent public URL.`
      )
      return
    }
    onSelect(finalUrl)
    onClose()
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
                      const imageUrl = file.webpUrl || file.url || file.dataUrl || ''
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
                        const videoUrl = file.url || file.dataUrl || ''
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
                        const imageUrl = file.webpUrl || file.url || file.dataUrl || ''
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
                            const videoUrl = file.url || file.dataUrl || ''
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


'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Image as ImageIcon,
  Video,
  File,
  Eye,
  Download,
  Link2,
  Trash2,
  X,
  Package,
  Calendar,
  Folder,
  GripVertical,
  Play // 🆕 재생 아이콘
} from 'lucide-react'
import { MediaFile } from '@/lib/mediaStore'
import { ProductCategory } from '@/app/admin/images/page'
import { useState, useRef } from 'react'

// 🆕 비디오 썸네일 컴포넌트 (재생 아이콘 + 호버 프리뷰)
function VideoThumbnail({ 
  file, 
  onPreview, 
  isGrid = false 
}: { 
  file: MediaFile
  onPreview: () => void
  isGrid?: boolean
}) {
  const [isHovering, setIsHovering] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const handleMouseEnter = () => {
    setIsHovering(true)
    if (videoRef.current && (file.dataUrl || file.url)) {
      videoRef.current.play().catch(() => {
        // 자동 재생 실패 시 무시 (브라우저 정책)
      })
      setIsPlaying(true)
    }
  }
  
  const handleMouseLeave = () => {
    setIsHovering(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0.1
      setIsPlaying(false)
    }
  }
  
  const videoUrl = file.thumbnailUrl || file.dataUrl || file.url
  
  return (
    <div 
      className={`w-full h-full flex items-center justify-center relative cursor-pointer group ${
        isGrid ? '' : 'rounded'
      }`}
      onClick={onPreview}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={(file.dataUrl || file.url) || undefined}
            className={`w-full h-full object-cover ${isGrid ? '' : 'rounded'}`}
            muted
            loop
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.currentTime = 0.1
            }}
            style={{
              opacity: isHovering && isPlaying ? 1 : 0.7
            }}
          />
          {/* 🆕 재생 아이콘 (항상 표시) */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-opacity">
            <div className="bg-black bg-opacity-60 rounded-full p-3 group-hover:bg-opacity-80 transition-all transform group-hover:scale-110">
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            </div>
          </div>
          {/* 호버 시 프리뷰 재생 표시 */}
          {isHovering && (
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              Preview playing...
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-opacity">
          <Video className={`${isGrid ? 'w-12 h-12' : 'w-8 h-8'} text-white`} />
        </div>
      )}
    </div>
  )
}

interface SortableFileItemProps {
  file: MediaFile
  viewMode: 'grid' | 'list'
  selectedFiles: Set<string>
  setSelectedFiles: (set: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setPreviewFile: (file: MediaFile) => void
  handleDownloadFile: (file: MediaFile) => void
  handleLinkToProduct: (fileId: string) => void
  handleDeleteFile: (fileId: string) => void
  handleUnlinkFromProduct: (fileId: string) => void
  categoryProducts: any[]
  activeCategoryInfo?: ProductCategory
  formatFileSize: (bytes: number) => string
}

export default function SortableFileItem({
  file,
  viewMode,
  selectedFiles,
  setSelectedFiles,
  setPreviewFile,
  handleDownloadFile,
  handleLinkToProduct,
  handleDeleteFile,
  handleUnlinkFromProduct,
  categoryProducts,
  activeCategoryInfo,
  formatFileSize
}: SortableFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: file.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  if (viewMode === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4 transition-all hover:shadow-md ${
          selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        
        {/* 파일 미리보기 */}
        <div className="relative w-24 h-24 bg-gray-100 rounded flex-shrink-0">
          {file.type === 'image' ? (
            (() => {
              // 🆕 WebP 우선순위: webpUrl > dataUrl > url (안전한 폴백)
              // 빈 문자열이나 undefined 체크 추가
              const webpUrl = file.webpUrl && file.webpUrl.trim() && file.webpUrl !== 'undefined' && !file.webpUrl.startsWith('undefined') ? file.webpUrl : null
              const dataUrl = file.dataUrl && file.dataUrl.trim() && file.dataUrl !== 'undefined' && !file.dataUrl.startsWith('undefined') ? file.dataUrl : null
              const url = file.url && file.url.trim() && file.url !== 'undefined' && !file.url.startsWith('undefined') ? file.url : null
              const imageUrl = webpUrl || dataUrl || url
              
              return imageUrl ? (
                <img
                  src={imageUrl}
                  alt={file.name}
                  className="w-full h-full object-cover rounded cursor-pointer"
                  onClick={() => handleLinkToProduct(file.id)}
                  title="Link to Product"
                  onError={(e) => {
                    if (!e.currentTarget || !(e.currentTarget instanceof HTMLImageElement)) {
                      console.warn(`⚠️ [SortableFileItem] currentTarget is null or not an image element for: ${file.name}`)
                      return
                    }

                    const currentSrc = e.currentTarget.src
                    if (webpUrl && currentSrc === webpUrl) {
                      if (dataUrl && dataUrl !== currentSrc) {
                        e.currentTarget.src = dataUrl
                        return
                      }
                      if (url && url !== currentSrc) {
                        e.currentTarget.src = url
                        return
                      }
                    }
                    if (dataUrl && currentSrc === dataUrl && url && url !== currentSrc) {
                      e.currentTarget.src = url
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )
            })()
          ) : file.type === 'video' ? (
            <VideoThumbnail 
              file={file}
              onPreview={() => setPreviewFile(file)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <File className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* 파일 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {file.type === 'image' ? (
              <ImageIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
            ) : (
              <Video className="w-4 h-4 text-purple-600 flex-shrink-0" />
            )}
            <h4 className="font-medium text-gray-900 truncate" title={file.name}>
              {file.name}
            </h4>
          </div>
          
          {file.productName && (
            <div className="mb-1 flex items-center gap-1">
              <Package className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                {file.productName}
              </span>
              <button
                onClick={() => handleUnlinkFromProduct(file.id)}
                className="ml-1 text-red-600 hover:text-red-700"
                title="Unlink from product"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {typeof file.uploadedAt === 'string' 
                ? new Date(file.uploadedAt).toLocaleDateString() 
                : file.uploadedAt.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <File className="w-3 h-3" />
              {formatFileSize(file.size)}
            </div>
            <div className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {activeCategoryInfo?.name || file.category}
            </div>
          </div>
          
          {file.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {file.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="checkbox"
            checked={selectedFiles.has(file.id)}
            onChange={(e) => {
              const newSet = new Set(selectedFiles)
              if (e.target.checked) {
                newSet.add(file.id)
              } else {
                newSet.delete(file.id)
              }
              setSelectedFiles(newSet)
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <button
            onClick={() => setPreviewFile(file)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDownloadFile(file)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleLinkToProduct(file.id)}
            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
            title="Link to Product (Direct)"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteFile(file.id)}
            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md ${
        selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'cursor-grabbing opacity-50' : 'cursor-grab'}`}
    >
      {/* 파일 미리보기 */}
      <div className="relative aspect-video bg-gray-100">
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-white bg-opacity-80 hover:bg-opacity-100 rounded p-1 text-gray-600 hover:text-gray-900"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        {file.type === 'image' ? (
          (() => {
            // 🆕 WebP 우선순위: webpUrl > dataUrl > url (안전한 폴백)
            // 빈 문자열이나 undefined 체크 추가
            const webpUrl = file.webpUrl && file.webpUrl.trim() && file.webpUrl !== 'undefined' && !file.webpUrl.startsWith('undefined') ? file.webpUrl : null
            const dataUrl = file.dataUrl && file.dataUrl.trim() && file.dataUrl !== 'undefined' && !file.dataUrl.startsWith('undefined') ? file.dataUrl : null
            const url = file.url && file.url.trim() && file.url !== 'undefined' && !file.url.startsWith('undefined') ? file.url : null
            const imageUrl = webpUrl || dataUrl || url
            
            return imageUrl ? (
              <img
                src={imageUrl}
                alt={file.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => handleLinkToProduct(file.id)}
                title="Link to Product"
                onError={(e) => {
                  if (!e.currentTarget || !(e.currentTarget instanceof HTMLImageElement)) {
                    console.warn(`⚠️ [SortableFileItem] currentTarget is null or not an image element for: ${file.name}`)
                    return
                  }

                  const currentSrc = e.currentTarget.src
                  console.warn(`⚠️ [SortableFileItem] Image load error for ${file.name}:`, {
                    currentSrc: currentSrc.substring(0, 50),
                    hasWebpUrl: !!file.webpUrl,
                    hasDataUrl: !!file.dataUrl,
                    hasUrl: !!file.url,
                    hasWebp: file.hasWebp
                  })

                  if (webpUrl && currentSrc === webpUrl) {
                    if (dataUrl && dataUrl !== currentSrc) {
                      e.currentTarget.src = dataUrl
                      return
                    }
                    if (url && url !== currentSrc) {
                      e.currentTarget.src = url
                      return
                    }
                  }

                  if (dataUrl && currentSrc === dataUrl && url && url !== currentSrc) {
                    e.currentTarget.src = url
                    return
                  }

                  console.error(`❌ [SortableFileItem] All image sources failed for: ${file.name}`)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )
          })()
        ) : file.type === 'video' ? (
          <VideoThumbnail 
            file={file}
            onPreview={() => setPreviewFile(file)}
            isGrid={true}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <File className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* 선택 체크박스 */}
        <div className="absolute top-2 right-2 z-10">
          <input
            type="checkbox"
            checked={selectedFiles.has(file.id)}
            onChange={(e) => {
              const newSet = new Set(selectedFiles)
              if (e.target.checked) {
                newSet.add(file.id)
              } else {
                newSet.delete(file.id)
              }
              setSelectedFiles(newSet)
            }}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* 액션 버튼들 */}
        <div className="absolute top-2 right-12 flex gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setPreviewFile(file)
            }}
            className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 transition-all"
            title="Preview"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDownloadFile(file)
            }}
            className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 transition-all"
            title="Download"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleLinkToProduct(file.id)
            }}
            className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 transition-all"
            title="Link to Product"
          >
            <Link2 className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteFile(file.id)
            }}
            className="p-1 bg-white bg-opacity-80 rounded hover:bg-opacity-100 transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* 파일 정보 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {file.type === 'image' ? (
            <ImageIcon className="w-4 h-4 text-blue-600" />
          ) : (
            <Video className="w-4 h-4 text-purple-600" />
          )}
          <h4 className="font-medium text-gray-900 truncate flex-1" title={file.name}>
            {file.name}
          </h4>
        </div>
        
        {file.productName && (
          <div className="mb-2 flex items-center gap-1">
            <Package className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
              {file.productName}
            </span>
            <button
              onClick={() => handleUnlinkFromProduct(file.id)}
              className="ml-1 text-red-600 hover:text-red-700"
              title="Unlink from product"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            {typeof file.uploadedAt === 'string' 
              ? new Date(file.uploadedAt).toLocaleDateString() 
              : file.uploadedAt.toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <File className="w-3 h-3" />
            {formatFileSize(file.size)}
          </div>
          <div className="flex items-center gap-2">
            <Folder className="w-3 h-3" />
            {activeCategoryInfo?.name || file.category}
          </div>
        </div>

        {file.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {file.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


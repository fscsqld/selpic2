'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, Image as ImageIcon, Video, File as FileIcon, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react'
import MediaLibraryModal from './MediaLibraryModal'
import { useMediaStore, type MediaUsage } from '@/lib/mediaStore'
import { buildSelpicStoragePath, uploadToSelpicContents } from '@/lib/selpicStorageUpload'

interface MediaUploadProps {
  type: 'image' | 'video'
  currentUrl?: string
  onUpload: (file: File, url: string) => void
  onRemove: () => void
  className?: string
  usage?: MediaUsage // 🆕 미디어 사용 영역
}

export default function MediaUpload({ 
  type, 
  currentUrl, 
  onUpload, 
  onRemove, 
  className = '',
  usage // 🆕 미디어 사용 영역
}: MediaUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addMediaFileWithData } = useMediaStore()
  /** Must use Supabase https URL — catalog sync drops data: and indexeddb:// */
  const requiresSharedCloudAsset =
    usage === 'product-media' ||
    usage === 'category-bg' ||
    usage === 'hero-banner' ||
    usage === 'subcategory-card' ||
    usage === 'header-logo'

  // type prop 변경 감지
  useEffect(() => {
    console.log('MediaUpload type changed to:', type)
  }, [type])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // handleFileUpload를 먼저 정의해야 handleDrop과 handleFileSelect에서 참조 가능
  const handleFileUpload = useCallback(async (file: File, skipValidation = false) => {
    // Media Library에서 선택한 더미 파일인지 확인
    const isFromMediaLibrary = file.name === 'selected-from-library' || file.size === 0
    
    // 파일 확장자 기반 타입 검증 (MIME 타입이 없을 경우 대비)
    const getFileTypeFromExtension = (filename: string) => {
      if (!filename || typeof filename !== 'string') {
        console.warn('Invalid filename provided:', filename)
        return 'unknown'
      }
      
      const ext = filename.toLowerCase().split('.').pop()
      if (!ext) {
        console.warn('No extension found in filename:', filename)
        return 'unknown'
      }
      
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
      const videoExts = ['mp4', 'webm', 'ogg', 'ogv', 'avi', 'mov', 'wmv', 'flv', 'm4v', '3gp', 'mkv', 'mpg', 'mpeg']
      
      if (imageExts.includes(ext)) {
        console.log('✅ Extension detected as image:', ext)
        return 'image'
      }
      if (videoExts.includes(ext)) {
        console.log('✅ Extension detected as video:', ext)
        return 'video'
      }
      
      console.warn('Unknown extension:', ext)
      return 'unknown'
    }
    
    // MIME 타입과 확장자 모두 확인
    const mimeType = file.type || ''
    const extensionType = getFileTypeFromExtension(file.name)
    
    // 파일 타입 검증 (더 안전한 검증 로직)
    const isValidImage = extensionType === 'image' || mimeType.startsWith('image/')
    const isValidVideo = extensionType === 'video' || mimeType.startsWith('video/')
    
    // 추가 검증: 파일이 실제로 존재하는지 확인
    if (!file || !file.name) {
      console.error('Invalid file object:', file)
      setUploadError('Invalid file selected.')
      return
    }
    
    // 디버깅 정보 출력
    console.log('=== MediaUpload Validation Debug ===')
    console.log('File details:', { 
      name: file.name, 
      type: file.type, 
      size: file.size,
      expectedType: type,
      isFromMediaLibrary,
      skipValidation
    })
    console.log('Validation results:', { 
      mimeType, 
      extensionType, 
      isValidImage, 
      isValidVideo 
    })
    
    // Media Library에서 선택한 경우 또는 skipValidation이 true인 경우 검증 건너뛰기
    if (!skipValidation && !isFromMediaLibrary) {
      // 타입별 검증 (더 명확한 조건문)
      if (type === 'video') {
        // 동영상 검증: 확장자 또는 MIME 타입 중 하나라도 맞으면 통과
        if (extensionType !== 'video' && !mimeType.startsWith('video/')) {
          console.error('Video validation failed:', { 
            fileType: file.type, 
            fileName: file.name, 
            expectedType: type, 
            extensionType, 
            mimeType,
            isValidVideo: false
          })
          setUploadError('Only video files can be uploaded. (MP4, WebM, OGV, AVI, MOV, etc.)')
          return
        }
      } else if (type === 'image') {
        // 이미지 검증: 확장자 또는 MIME 타입 중 하나라도 맞으면 통과
        if (extensionType !== 'image' && !mimeType.startsWith('image/')) {
          console.error('Image validation failed:', { 
            fileType: file.type, 
            fileName: file.name, 
            expectedType: type, 
            extensionType, 
            mimeType,
            isValidImage: false,
            fileSize: file.size
          })
          setUploadError(`Only image files can be uploaded. (JPG, PNG, GIF, WebP, etc.)\nFile: ${file.name}\nDetected type: ${extensionType || 'unknown'}`)
          return
        }
      } else {
        console.error('Unknown type:', type)
        setUploadError('Unsupported file type.')
        return
      }
    } else {
      console.log('✅ Validation skipped (from Media Library or skipValidation=true)')
    }
    
    console.log('✅ File validation passed')

    // 파일 크기 검증 (500MB 제한으로 대폭 확대)
    // Media Library에서 선택한 경우 크기 검증 건너뛰기
    if (!isFromMediaLibrary && file.size > 500 * 1024 * 1024) {
      setUploadError('File size must be less than 500MB.')
      return
    }
    
    setIsUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const hasSupabase =
        typeof process !== 'undefined' &&
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!hasSupabase && requiresSharedCloudAsset) {
        setUploadError(
          'Cloud media sync is required for this section. Configure Supabase public env variables and try again.'
        )
        return
      }

      if (hasSupabase && !isFromMediaLibrary) {
        try {
          const folder = usage ? `cms/${usage}` : 'cms/general'
          const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
          const path = buildSelpicStoragePath(folder, fileId, file.name)
          const publicUrl = await uploadToSelpicContents(path, file, file.type || undefined)
          console.log('✅ MediaUpload: Supabase public URL:', publicUrl.substring(0, 80) + '…')
          onUpload(file, publicUrl)
          setUploadSuccess(true)
          setTimeout(() => setUploadSuccess(false), 3000)
          return
        } catch (supabaseErr) {
          const msg =
            supabaseErr instanceof Error ? supabaseErr.message : String(supabaseErr)
          console.warn('MediaUpload: Supabase upload failed:', msg)
          if (requiresSharedCloudAsset) {
            setUploadError(
              usage === 'product-media'
                ? `Product image upload failed: ${msg}. Sign in as admin, confirm SUPABASE_SERVICE_ROLE_KEY on the server, and try again.`
                : `Cloud upload failed. Check Supabase Storage (selpic-contents) and admin sign-in, then try again. (${msg})`
            )
            return
          }
        }
      }

      console.log('📦 MediaUpload: Saving file to IndexedDB...', { fileName: file.name, fileSize: file.size, fileType: file.type, usage })

      const mediaFile = await addMediaFileWithData(file, 'content', undefined, undefined, undefined, undefined, usage)

      console.log('✅ MediaUpload: File saved to IndexedDB:', {
        id: mediaFile.id,
        url: mediaFile.url?.substring(0, 50) + '...',
        dataUrl: mediaFile.dataUrl ? mediaFile.dataUrl.substring(0, 50) + '...' : 'none',
        storedInIndexedDB: mediaFile.storedInIndexedDB
      })

      const permanentUrl = `indexeddb://${mediaFile.id}`
      console.log('✅ MediaUpload: Using permanent URL (file ID):', permanentUrl)

      onUpload(file, permanentUrl)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error) {
      console.error('❌ Error in handleFileUpload:', error)
      setUploadError('An error occurred while uploading the file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [type, onUpload, addMediaFileWithData, usage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleRemove = useCallback(() => {
    onRemove()
    setUploadSuccess(false)
    setUploadError('')
  }, [onRemove])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const getTypeIcon = () => {
    return type === 'image' ? <ImageIcon className="w-8 h-8" /> : <Video className="w-8 h-8" />
  }

  const getTypeText = () => {
    return type === 'image' ? 'Image' : 'Video'
  }

  const getAcceptedTypes = () => {
    return type === 'image' 
      ? 'image/*' 
      : 'video/*'
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 현재 미디어 표시 */}
      {currentUrl && (
        <div className="mb-4">
          <div className="relative inline-block">
            {type === 'image' ? (
              <img
                src={currentUrl}
                alt="Current image"
                className="max-w-full h-32 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="relative w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                <video
                  src={currentUrl}
                  className="max-w-full h-full object-cover rounded-lg"
                  controls
                />
              </div>
            )}
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${currentUrl ? 'bg-gray-50' : 'bg-white'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`
              p-3 rounded-full transition-colors
              ${isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
            `}>
              {getTypeIcon()}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentUrl ? `${getTypeText()} Change` : `${getTypeText()} Upload`}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {currentUrl 
                ? `Drag a new ${getTypeText().toLowerCase()} to change or click to select`
                : `Drag ${getTypeText().toLowerCase()} to upload or click to select`
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={openFileDialog}
              disabled={isUploading}
              className={`
                inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
                ${isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }
              `}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Uploading...' : `Select ${getTypeText()}`}
            </button>

            <button
              type="button"
              onClick={() => setIsMediaLibraryOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Media Library
            </button>

            {currentUrl && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </button>
            )}
          </div>

          {/* 파일 정보 */}
          <div className="text-xs text-gray-500">
            <p>Supported formats: {type === 'image' ? 'JPG, PNG, GIF, WebP' : 'MP4, WebM, OGV, AVI, MOV, MKV'}</p>
            <p>Maximum size: 500MB</p>
          </div>
        </div>
      </div>

      {/* 상태 메시지 */}
      {uploadError && (
        <div className="mt-3 flex items-center text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-2" />
          {uploadError}
        </div>
      )}

      {uploadSuccess && (
        <div className="mt-3 flex items-center text-green-600 text-sm">
          <CheckCircle className="w-4 h-4 mr-2" />
          {getTypeText()} uploaded successfully!
        </div>
      )}

      {/* 미디어 라이브러리 모달 */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url) => {
          // 미디어 라이브러리에서 선택한 파일의 URL을 사용
          // MediaLibraryModal에서 이미 dataUrl || url을 전달하므로 그대로 사용
          console.log('MediaUpload onSelect called:', {
            url: url ? url.substring(0, 100) + '...' : 'null/empty',
            urlLength: url?.length || 0,
            type,
            hasUrl: !!url
          })
          
          if (!url || !url.trim()) {
            console.error('MediaUpload: Empty URL received from MediaLibraryModal')
            return
          }
          
          if (requiresSharedCloudAsset && url.startsWith('indexeddb://')) {
            setUploadError(
              'This media is local-only (IndexedDB). Please upload it to cloud storage before using it in shared sections.'
            )
            setIsMediaLibraryOpen(false)
            return
          }

          // File 객체는 더미로 생성하되, 실제로는 URL만 사용
          // Media Library에서 선택한 경우이므로 검증을 건너뛰기 위해 skipValidation=true 전달
          const dummyFile = new File([], 'selected-from-library', {
            type: type === 'image' ? 'image/jpeg' : 'video/mp4'
          })
          console.log('MediaUpload calling onUpload with:', {
            fileType: dummyFile.type,
            urlPrefix: url.substring(0, 50),
            isFromMediaLibrary: true
          })
          // Media Library에서 선택한 경우 handleFileUpload를 직접 호출하지 않고
          // onUpload를 바로 호출 (검증 건너뛰기)
          setIsUploading(true)
          setUploadError('')
          try {
            onUpload(dummyFile, url)
            setUploadSuccess(true)
            setTimeout(() => setUploadSuccess(false), 3000)
          } catch (error) {
            console.error('Error in onUpload:', error)
            setUploadError('Failed to upload file from media library.')
          } finally {
            setIsUploading(false)
          }
          setIsMediaLibraryOpen(false)
        }}
        type={type}
      />
    </div>
  )
}

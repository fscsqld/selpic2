'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X, Check, Crop, FileText, Tag, Folder, Image as ImageIcon,
  Video, Play, Pause, RotateCw, ZoomIn, ZoomOut, Save, Droplet
} from 'lucide-react'
import { useMediaStore } from '@/lib/mediaStore'
import { useWatermarkStore, WatermarkPosition } from '@/lib/watermarkStore'

interface EditStageModalProps {
  isOpen: boolean
  file: File | null
  initialCategory?: string
  activeTab?: 'product' | 'content' // 🆕 탭 정보 추가
  onConfirm: (editedData: {
    file: File
    name: string
    category: string
    tags: string[]
    description: string
    thumbnailTime?: number // 동영상 썸네일 시간 (초)
    hasWatermark?: boolean
    watermarkPosition?: WatermarkPosition
  }) => void
  onCancel: () => void
  onWebPProgress?: (progress: number) => void
  webPProgress?: number
}

const PRODUCT_CATEGORIES = [
  { id: 'stickers', name: 'Stickers', icon: '🏷️' },
  { id: 'stamps', name: 'Stamps', icon: '📮' },
  { id: 'phonecases', name: 'Phone Cases', icon: '📱' },
  { id: 'hotgoods', name: 'Market S', icon: '🔥' },
  { id: 'general', name: 'General', icon: '📦' }
]

// 🆕 Content Management 전용 카테고리
const CONTENT_CATEGORIES = [
  { id: 'hero-banner', name: 'Hero Banner', icon: '🎬' },
  { id: 'category-bg', name: 'Category Background', icon: '🖼️' },
  { id: 'subcategory-card', name: 'Subcategory Card', icon: '📋' },
  { id: 'header-logo', name: 'Header Logo', icon: '✨' },
  { id: 'general-content', name: 'General Content', icon: '📄' }
]

export default function EditStageModal({
  isOpen,
  file,
  initialCategory = 'general',
  activeTab = 'product', // 🆕 기본값은 'product'
  onConfirm,
  onCancel,
  onWebPProgress,
  webPProgress = 0
}: EditStageModalProps) {
  const [fileName, setFileName] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [description, setDescription] = useState('')
  
  // 워터마크 관련
  const { settings: watermarkSettings } = useWatermarkStore()
  const [hasWatermark, setHasWatermark] = useState(false)
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right')
  const watermarkImageRef = useRef<HTMLImageElement | null>(null)
  
  // 이미지 크롭 관련
  const [isImage, setIsImage] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 동영상 관련
  const [isVideo, setIsVideo] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [thumbnailTime, setThumbnailTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  
  // WebP 변환 진행률 관련
  const [isOptimizing, setIsOptimizing] = useState(false)
  // 외부에서 전달받은 진행률 사용 (없으면 내부 상태 사용)
  const optimizationProgress = webPProgress || 0
  
  // 파일 초기화
  useEffect(() => {
    if (!file || !isOpen) return
    
    // 파일명 설정 (확장자 제외)
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setFileName(nameWithoutExt)
    // 🆕 Content 탭일 때는 initialCategory를 그대로 사용 (이미 선택된 카테고리)
    // Product 탭일 때도 initialCategory 사용
    setCategory(initialCategory || (activeTab === 'content' ? 'hero-banner' : 'general'))
    setTags([])
    setTagInput('')
    setDescription('')
    // WebP 변환 진행률 초기화
    setIsOptimizing(false)
    
    // 파일 타입 확인
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' : 'unknown'
    
    setIsImage(fileType === 'image')
    setIsVideo(fileType === 'video')
    
    if (fileType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else if (fileType === 'video') {
      const url = URL.createObjectURL(file)
      setVideoSrc(url)
    }
  }, [file, isOpen, initialCategory, activeTab])
  
  // 이미지 크롭 영역 초기화
  useEffect(() => {
    if (imageSrc && imageRef.current && containerRef.current) {
      const img = imageRef.current
      const container = containerRef.current
      
      const initCropArea = () => {
        const containerWidth = container.clientWidth
        const containerHeight = container.clientHeight
        
        if (containerWidth === 0 || containerHeight === 0) {
          // 컨테이너 크기가 아직 결정되지 않았으면 재시도
          setTimeout(initCropArea, 100)
          return
        }
        
        // 1:1 비율로 크롭 영역 설정 (컨테이너의 80%)
        const cropSize = Math.min(containerWidth, containerHeight) * 0.8
        const cropX = (containerWidth - cropSize) / 2
        const cropY = (containerHeight - cropSize) / 2
        
        setCropArea({ x: cropX, y: cropY, width: cropSize, height: cropSize })
        setImageScale(1)
        setImagePosition({ x: 0, y: 0 })
      }
      
      if (img.complete) {
        initCropArea()
      } else {
        img.onload = initCropArea
      }
    }
  }, [imageSrc])
  
  // 동영상 로드
  useEffect(() => {
    if (videoRef && videoSrc) {
      videoRef.addEventListener('loadedmetadata', () => {
        setVideoDuration(videoRef.duration)
        setThumbnailTime(0)
      })
    }
  }, [videoRef, videoSrc])
  
  // 태그 추가
  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }
  
  // 태그 삭제
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }
  
  // 이미지 크롭 처리 (간소화된 버전)
  const handleCropImage = (): Promise<File> => {
    return new Promise((resolve) => {
      if (!imageSrc || !canvasRef.current || !imageRef.current || !containerRef.current) {
        resolve(file!)
        return
      }
      
      const canvas = canvasRef.current
      const img = imageRef.current
      const container = containerRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(file!)
        return
      }
      
      // 컨테이너 크기
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      
      // 원본 이미지 크기
      const imgWidth = img.naturalWidth
      const imgHeight = img.naturalHeight
      const imgAspect = imgWidth / imgHeight
      
      // 표시된 이미지 크기 계산 (object-contain 방식)
      let displayWidth, displayHeight
      const containerAspect = containerWidth / containerHeight
      
      if (imgAspect > containerAspect) {
        displayWidth = containerWidth
        displayHeight = containerWidth / imgAspect
      } else {
        displayHeight = containerHeight
        displayWidth = containerHeight * imgAspect
      }
      
      // 스케일 적용
      const scaledWidth = displayWidth * imageScale
      const scaledHeight = displayHeight * imageScale
      
      // 이미지의 실제 위치 (중앙 정렬 기준)
      const imageDisplayX = (containerWidth - scaledWidth) / 2 + imagePosition.x
      const imageDisplayY = (containerHeight - scaledHeight) / 2 + imagePosition.y
      
      // 크롭 영역이 이미지 영역과 겹치는 부분 계산
      const cropStartX = Math.max(0, cropArea.x - imageDisplayX)
      const cropStartY = Math.max(0, cropArea.y - imageDisplayY)
      const cropEndX = Math.min(scaledWidth, cropArea.x + cropArea.width - imageDisplayX)
      const cropEndY = Math.min(scaledHeight, cropArea.y + cropArea.height - imageDisplayY)
      
      // 원본 이미지 좌표로 변환
      const scaleX = imgWidth / scaledWidth
      const scaleY = imgHeight / scaledHeight
      
      const sourceX = cropStartX * scaleX
      const sourceY = cropStartY * scaleY
      const sourceWidth = (cropEndX - cropStartX) * scaleX
      const sourceHeight = (cropEndY - cropStartY) * scaleY
      
      // Canvas 크기를 크롭 영역 크기로 설정
      canvas.width = cropArea.width
      canvas.height = cropArea.height
      
      // 크롭된 이미지 그리기
      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(sourceWidth, imgWidth - Math.max(0, sourceX)),
        Math.min(sourceHeight, imgHeight - Math.max(0, sourceY)),
        0,
        0,
        cropArea.width,
        cropArea.height
      )
      
      // 워터마크 적용
      if (hasWatermark && watermarkSettings.imageUrl && watermarkImageRef.current) {
        const watermarkImg = watermarkImageRef.current
        const watermarkSize = Math.min(canvas.width, canvas.height) * watermarkSettings.size
        const watermarkAspect = watermarkImg.width / watermarkImg.height
        const watermarkWidth = watermarkSize
        const watermarkHeight = watermarkSize / watermarkAspect
        
        let x = 0
        let y = 0
        const margin = watermarkSettings.margin
        
        switch (watermarkPosition) {
          case 'top-left':
            x = margin
            y = margin
            break
          case 'top-right':
            x = canvas.width - watermarkWidth - margin
            y = margin
            break
          case 'bottom-left':
            x = margin
            y = canvas.height - watermarkHeight - margin
            break
          case 'bottom-right':
            x = canvas.width - watermarkWidth - margin
            y = canvas.height - watermarkHeight - margin
            break
        }
        
        ctx.save()
        ctx.globalAlpha = watermarkSettings.opacity
        ctx.drawImage(watermarkImg, x, y, watermarkWidth, watermarkHeight)
        ctx.restore()
      }
      
      // Canvas를 Blob으로 변환
      canvas.toBlob((blob) => {
        if (blob) {
          const fileExtension = file!.name.split('.').pop() || 'png'
          const croppedFile = new File([blob], `${fileName || 'cropped'}.${fileExtension}`, {
            type: file!.type || 'image/png'
          })
          resolve(croppedFile)
        } else {
          resolve(file!)
        }
      }, file!.type || 'image/png', 0.95)
    })
  }
  
  // 동영상 썸네일 캡처
  const captureVideoThumbnail = (): Promise<File> => {
    return new Promise((resolve) => {
      if (!videoRef || !canvasRef.current) {
        resolve(file!)
        return
      }
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(file!)
        return
      }
      
      // 비디오의 현재 프레임을 캔버스에 그리기
      canvas.width = videoRef.videoWidth
      canvas.height = videoRef.videoHeight
      ctx.drawImage(videoRef, 0, 0)
      
      // Canvas를 Blob으로 변환
      canvas.toBlob((blob) => {
        if (blob) {
          const thumbnailFile = new File([blob], `${fileName || 'thumbnail'}.png`, {
            type: 'image/png'
          })
          resolve(thumbnailFile)
        } else {
          resolve(file!)
        }
      }, 'image/png', 0.95)
    })
  }
  
  // 확인 버튼 클릭
  const handleConfirm = async () => {
    if (!file) return
    
    let finalFile = file
    
    // 이미지 크롭 처리
    if (isImage) {
      finalFile = await handleCropImage()
    }
    
    // 동영상은 원본 파일 사용 (썸네일은 별도 저장)
    
    // WebP 변환은 addMediaFileWithData에서 수행되므로
    // 여기서는 진행률 표시만 준비
    if (isImage) {
      setIsOptimizing(true)
    }
    
    onConfirm({
      file: finalFile,
      name: fileName || file.name.replace(/\.[^/.]+$/, ''),
      category,
      tags,
      description,
      thumbnailTime: isVideo ? thumbnailTime : undefined,
      hasWatermark: hasWatermark && watermarkSettings.imageUrl ? true : false,
      watermarkPosition: hasWatermark ? watermarkPosition : undefined
    })
  }
  
  // WebP 진행률 업데이트 감지
  useEffect(() => {
    if (webPProgress > 0) {
      setIsOptimizing(true)
    } else if (webPProgress === 0 && isOptimizing) {
      // 진행률이 0으로 돌아가면 최적화 완료
      setTimeout(() => {
        setIsOptimizing(false)
      }, 500) // 약간의 지연 후 숨김 (완료 메시지 표시를 위해)
    }
  }, [webPProgress, isOptimizing])
  
  // 이미지 드래그 핸들러
  const handleImageMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }
  
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }
  
  const handleImageMouseUp = () => {
    setIsDragging(false)
  }
  
  // 동영상 시간 설정
  const handleVideoTimeChange = (time: number) => {
    if (videoRef) {
      videoRef.currentTime = time
      setThumbnailTime(time)
    }
  }
  
  if (!isOpen || !file) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isImage ? <Crop className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            Edit Before Save
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* 미리보기 영역 */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
            <div
              ref={containerRef}
              className="relative bg-white rounded-lg overflow-hidden"
              style={{ aspectRatio: '1/1', maxHeight: '400px' }}
            >
              {isImage && imageSrc && (
                <>
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleImageMouseDown}
                    onMouseMove={handleImageMouseMove}
                    onMouseUp={handleImageMouseUp}
                    onMouseLeave={handleImageMouseUp}
                  />
                  {/* 크롭 영역 표시 */}
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
                    style={{
                      left: cropArea.x,
                      top: cropArea.y,
                      width: cropArea.width,
                      height: cropArea.height,
                      pointerEvents: 'none'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs text-blue-700 font-medium bg-white px-2 py-1 rounded">
                        1:1 Crop Area
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {isVideo && videoSrc && (
                <div className="relative w-full h-full">
                  <video
                    ref={(el) => setVideoRef(el)}
                    src={videoSrc}
                    className="w-full h-full object-contain"
                    controls
                    onTimeUpdate={(e) => {
                      const currentTime = e.currentTarget.currentTime
                      setThumbnailTime(currentTime)
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={videoDuration || 0}
                        value={thumbnailTime}
                        onChange={(e) => handleVideoTimeChange(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs">
                        {Math.floor(thumbnailTime)}s / {Math.floor(videoDuration)}s
                      </span>
                    </div>
                    <p className="text-xs mt-1">Select thumbnail frame</p>
                  </div>
                </div>
              )}
              
              {/* 숨겨진 Canvas (크롭/썸네일 생성용) */}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
          
          {/* 편집 옵션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 파일명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter file name"
              />
            </div>
            
            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Folder className="w-4 h-4 inline mr-1" />
                {activeTab === 'content' ? 'Content Type' : 'Category'}
              </label>
              {activeTab === 'content' ? (
                // 🆕 Content 탭: 읽기 전용으로 표시 (이미 선택된 카테고리)
                <div className="w-full px-3 py-2 border border-purple-300 rounded-md bg-purple-50 text-purple-900 font-medium">
                  {CONTENT_CATEGORIES.find(c => c.id === category)?.icon} {CONTENT_CATEGORIES.find(c => c.id === category)?.name || category}
                </div>
              ) : (
                // Product 탭: 선택 가능
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              )}
              {activeTab === 'content' && (
                <p className="mt-1 text-xs text-purple-600">
                  This file will be tagged for <strong>{CONTENT_CATEGORIES.find(c => c.id === category)?.name || category}</strong> usage.
                </p>
              )}
            </div>
            
            {/* 태그 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Tags (for search)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Enter tag and press Enter (e.g., #BackToSchool)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* 설명 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (English for Australian customers)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Enter description in English..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* 이미지 크롭 컨트롤 */}
          {isImage && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Crop Controls</h4>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setImageScale(Math.max(0.5, imageScale - 0.1))}
                  className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Scale: {(imageScale * 100).toFixed(0)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageScale(Math.min(2, imageScale + 0.1))}
                  className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageScale(1)
                    setImagePosition({ x: 0, y: 0 })
                  }}
                  className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Drag the image to position, use zoom to adjust size. The blue area will be cropped to 1:1 ratio.
              </p>
            </div>
          )}
          
          {/* 워터마크 설정 */}
          {isImage && watermarkSettings.imageUrl && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-600" />
                  Watermark
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWatermark}
                    onChange={(e) => setHasWatermark(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Apply Watermark</span>
                </label>
              </div>
              
              {hasWatermark && (
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value as WatermarkPosition)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  
                  {/* 워터마크 미리보기 */}
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Preview:</div>
                    <div className="relative inline-block">
                      <img
                        src={watermarkSettings.imageUrl}
                        alt="Watermark preview"
                        className="h-12 opacity-70"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-400">
                          {watermarkPosition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Watermark will be applied to the cropped image. Settings can be changed in Settings &gt; Media.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {isImage && !watermarkSettings.imageUrl && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-2">
                <Droplet className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-800">
                    No watermark image configured. Go to <strong>Settings &gt; Media</strong> to upload a watermark image.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* WebP Optimization Progress */}
        {isOptimizing && (
          <div className="bg-blue-50 border-t border-blue-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-blue-900">Optimizing...</span>
              <span className="text-sm text-blue-700 ml-auto">{optimizationProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${optimizationProgress}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Converting image to WebP format to optimize file size.
            </p>
          </div>
        )}
        
        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isOptimizing}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isOptimizing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirm & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


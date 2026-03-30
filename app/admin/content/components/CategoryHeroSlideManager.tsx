'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Play, Image as ImageIcon, Video } from 'lucide-react'
import { CategoryHeroSlide } from '@/lib/contentStore'
import MediaUpload from '@/components/MediaUpload'

interface CategoryHeroSlideManagerProps {
  categoryHeroSlides: CategoryHeroSlide[]
  category: 'stickers' | 'stamps' | 'phone-cases' | 'hot-goods'
  onAddSlide: (slide: Omit<CategoryHeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateSlide: (id: string, slide: Partial<CategoryHeroSlide>) => void
  onDeleteSlide: (id: string) => void
  onToggleSlideActive: (id: string) => void
  onReorderSlide: (fromIndex: number, toIndex: number) => void
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}

const categoryNames = {
  'stickers': 'Stickers',
  'stamps': 'Stamps',
  'phone-cases': 'Phone Cases',
  'hot-goods': 'Market S'
}

export default function CategoryHeroSlideManager({
  categoryHeroSlides,
  category,
  onAddSlide,
  onUpdateSlide,
  onDeleteSlide,
  onToggleSlideActive,
  onReorderSlide,
  showNotification
}: CategoryHeroSlideManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<CategoryHeroSlide | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [responsiveTab, setResponsiveTab] = useState<'mobile' | 'tablet' | 'desktop'>('mobile')
  
  // 이모지 옵션들 (카테고리 및 일반 사용)
  const emojiOptions = [
    // 카테고리 관련
    '🏷️', '📮', '📱', '🔥', '🎁', '🎨', '⭐', '💎', '🚀', '🎯', '🎪', '🎭',
    // 감정 및 표현
    '✨', '🌟', '💫', '🎉', '🎊', '🎈', '🎀', '💖', '💕', '💗', '💓', '💝',
    // 음식
    '🍕', '🍔', '🍟', '🍗', '🍖', '🌭', '🍿', '🧂', '🥓', '🥞', '🧇', '🧀',
    // 음료
    '☕', '🍵', '🧃', '🥤', '🍺', '🍻', '🥂', '🍷', '🍸', '🍹', '🧉', '🧊',
    // 장소 및 건물
    '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬',
    '🏭', '🏯', '🏰', '🗼', '🗽', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲',
    // 자연
    '🌍', '🌎', '🌏', '🌐', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️',
    '🏜️', '🏝️', '🏞️', '🏟️', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉',
    // 교통
    '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋',
    '🚌', '🚍', '🚎', '🚐', '🚑', '🚒', '🚓', '🚔', '🚕', '🚖', '🚗', '🚘',
    '🚙', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🛴', '🚲', '🛹', '🛼', '🛷',
    // 기타
    '🎠', '🎡', '🎢', '💈', '🎪', '♨️', '🎰', '🎲', '🃏', '🀄', '🎴', '🎯'
  ]
  
  const [formData, setFormData] = useState({
    type: 'image' as 'image' | 'video',
    src: '',
    fallbackImage: '',
    title: '', // 슬라이드별 제목
    subtitle: '', // 슬라이드별 부제목
    speed: 5,
    direction: 'left' as 'left' | 'right' | 'up' | 'down',
    effect: 'slide' as 'slide' | 'fade' | 'zoom' | 'rotate' | 'blend',
    opacity: 1,
    responsive: {
      mobile: { speed: 5, opacity: 1, pauseVideoOnMobile: true },
      tablet: { speed: 5, opacity: 1 },
      desktop: { speed: 5, opacity: 1 }
    },
    order: 1,
    isActive: true
  })

  // 현재 카테고리의 슬라이드만 필터링
  const categorySlides = categoryHeroSlides.filter(slide => slide.category === category).sort((a, b) => a.order - b.order)

  const openModal = (slide?: CategoryHeroSlide) => {
    if (slide) {
      setEditingSlide(slide)
      setFormData({
        type: slide.type || 'image',
        src: slide.src,
        fallbackImage: slide.fallbackImage || '',
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        speed: slide.speed ?? 5,
        direction: slide.direction || 'left',
        effect: slide.effect || 'slide',
        opacity: slide.opacity ?? 1,
        responsive: (() => {
          const sp = slide.speed ?? 5
          const op = slide.opacity ?? 1
          const base = {
            mobile: { speed: sp, opacity: op, pauseVideoOnMobile: true as boolean },
            tablet: { speed: sp, opacity: op },
            desktop: { speed: sp, opacity: op }
          }
          const r = slide.responsive
          if (!r) return base
          return {
            mobile: { ...base.mobile, ...r.mobile, pauseVideoOnMobile: r.mobile?.pauseVideoOnMobile ?? true },
            tablet: { ...base.tablet, ...r.tablet },
            desktop: { ...base.desktop, ...r.desktop }
          }
        })(),
        order: slide.order,
        isActive: slide.isActive ?? true
      })
    } else {
      setEditingSlide(null)
      setFormData({
        type: 'image',
        src: '',
        fallbackImage: '',
        title: '',
        subtitle: '',
        speed: 5,
        direction: 'left',
        effect: 'slide',
        opacity: 1,
        responsive: {
          mobile: { speed: 5, opacity: 1, pauseVideoOnMobile: true },
          tablet: { speed: 5, opacity: 1 },
          desktop: { speed: 5, opacity: 1 }
        },
        order: categorySlides.length + 1,
        isActive: true
      })
    }
    setIsModalOpen(true)
    setResponsiveTab('mobile')
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSlide(null)
    setShowEmojiPicker(false)
    setFormData({
      type: 'image',
      src: '',
      fallbackImage: '',
      title: '',
      subtitle: '',
      speed: 5,
      direction: 'left',
      effect: 'slide',
      opacity: 1,
      responsive: {
        mobile: { speed: 5, opacity: 1, pauseVideoOnMobile: true },
        tablet: { speed: 5, opacity: 1 },
        desktop: { speed: 5, opacity: 1 }
      },
      order: 1,
      isActive: true
    })
    setResponsiveTab('mobile')
  }

  const handleSave = () => {
    // 🆕 디버그 로그 추가
    if (process.env.NODE_ENV === 'development') {
      console.log('CategoryHeroSlideManager handleSave called:', {
        formDataSrc: formData.src ? formData.src.substring(0, 100) + '...' : 'empty',
        formDataType: formData.type,
        editingSlide: editingSlide ? editingSlide.id : 'none',
        formDataKeys: Object.keys(formData)
      })
    }
    
    if (!formData.src || !formData.src.trim()) {
      const mediaType = formData.type === 'video' ? 'Video' : 'Image'
      showNotification('error', `Please upload a ${mediaType.toLowerCase()} or enter a URL.`)
      return
    }

    if (editingSlide) {
      // 🆕 editingSlide가 없으면 에러 표시
      if (!editingSlide.id) {
        console.error('CategoryHeroSlideManager handleSave: editingSlide.id is missing.')
        showNotification('error', 'No slide selected for editing. Please try again.')
        return
      }
      
      try {
        // 🆕 editingSlide.id를 먼저 저장 (closeModal()이 editingSlide를 null로 설정하기 전에)
        const slideId = editingSlide.id
        
        const updateData = {
          ...formData,
          category,
          updatedAt: new Date()
        }
        console.log('💾 CategoryHeroSlideManager - Saving slide update:', {
          id: slideId,
          title: updateData.title || '(empty)',
          subtitle: updateData.subtitle || '(empty)',
          formData: {
            title: formData.title || '(empty)',
            subtitle: formData.subtitle || '(empty)',
            src: formData.src?.substring(0, 50) + '...',
            speed: formData.speed,
            direction: formData.direction,
            opacity: formData.opacity
          }
        })

        // 1) 먼저 스토어 반영 (수정 내용 적용)
        onUpdateSlide(slideId, updateData)
        // 2) 알림 표시 (z-index로 모달 위에 보이도록 content 페이지에서 처리)
        showNotification('success', 'Slide updated successfully!')
        // 3) 모달 닫기
        closeModal()
      } catch (error) {
        console.error('❌ CategoryHeroSlideManager Error updating slide:', error)
        showNotification('error', 'Failed to update slide. Please try again.')
        // 에러 발생 시에도 모달은 닫힌 상태 유지
      }
    } else {
      try {
        onAddSlide({
          ...formData,
          category
        })
        showNotification('success', 'New slide added successfully!')
        closeModal()
      } catch (error) {
        console.error('❌ CategoryHeroSlideManager Error adding slide:', error)
        showNotification('error', 'Failed to add slide. Please try again.')
      }
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorderSlide(draggedIndex, dropIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {categoryNames[category]} Hero Background Slides
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage sliding background for {categoryNames[category]} category page
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Slide
        </button>
      </div>

      {categorySlides.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No slides added yet</p>
          <p className="text-sm text-gray-500 mt-2">Click "Add Slide" to create your first background slide</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categorySlides.map((slide, index) => (
            <div
              key={slide.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-4 p-4 bg-white rounded-lg border-2 transition-all ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${dragOverIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
              
              <div className="flex-1 flex items-center gap-4">
                <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {slide.type === 'video' ? (
                    <video
                      src={slide.src}
                      className="w-full h-full object-cover"
                      muted
                      onError={(e) => {
                        const target = e.target as HTMLVideoElement
                        if (slide.fallbackImage) {
                          target.style.display = 'none'
                          const img = document.createElement('img')
                          img.src = slide.fallbackImage
                          img.className = 'w-full h-full object-cover'
                          target.parentElement?.appendChild(img)
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={slide.src}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {slide.type === 'video' ? (
                      <Video className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {slide.type === 'video' ? 'Video' : 'Image'}
                    </span>
                    <span className="text-xs text-gray-500">
                      • Effect: {slide.effect || 'slide'} • Speed: {slide.speed || 5} {slide.effect === 'slide' && `• Direction: ${slide.direction || 'left'}`} • Opacity: {((slide.opacity ?? 1) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{slide.src.substring(0, 60)}...</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleSlideActive(slide.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    slide.isActive
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={slide.isActive ? 'Active' : 'Inactive'}
                >
                  {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={() => openModal(slide)}
                  className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this slide?')) {
                      onDeleteSlide(slide.id)
                      showNotification('success', 'Slide deleted successfully!')
                    }
                  }}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSlide ? 'Edit Slide' : 'Add New Slide'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mediaType"
                      value="image"
                      checked={formData.type === 'image'}
                      onChange={(e) => {
                        const newType = e.target.value as 'image' | 'video'
                        // 🆕 이미지 타입으로 변경할 때 기존 비디오 src가 있으면 초기화
                        const isVideoUrl = formData.src && (
                          formData.src.startsWith('data:video/') ||
                          formData.src.match(/\.(mp4|webm|ogg|ogv|m4v|3gp|avi|mov|wmv|flv|mkv|mpg|mpeg)$/i) ||
                          (formData.src.startsWith('blob:') && formData.type === 'video')
                        )
                        
                        if (isVideoUrl) {
                          setFormData(prev => ({ 
                            ...prev, 
                            type: newType,
                            src: '', // 🆕 비디오 URL 초기화
                            fallbackImage: '' // 이미지 타입에서는 fallback 이미지 불필요
                          }))
                          showNotification('info', 'Please upload an image file. Video URL has been cleared.')
                        } else {
                          setFormData(prev => ({ ...prev, type: newType }))
                        }
                      }}
                      className="mr-2"
                    />
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Image
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mediaType"
                      value="video"
                      checked={formData.type === 'video'}
                      onChange={(e) => {
                        const newType = e.target.value as 'image' | 'video'
                        // 🆕 비디오 타입으로 변경할 때 기존 이미지 src가 있으면 초기화
                        const isImageUrl = formData.src && (
                          formData.src.startsWith('data:image/') ||
                          formData.src.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                          formData.src.includes('images.unsplash.com') ||
                          formData.src.includes('images.pexels.com') ||
                          (formData.src.startsWith('blob:') && formData.type === 'image')
                        )
                        
                        if (isImageUrl) {
                          setFormData(prev => ({ 
                            ...prev, 
                            type: newType,
                            src: '', // 🆕 이미지 URL 초기화
                            fallbackImage: prev.fallbackImage || '' // fallback 이미지는 유지 (비디오에 필요)
                          }))
                          showNotification('info', 'Please upload a video file. Image URL has been cleared.')
                        } else {
                          setFormData(prev => ({ ...prev, type: newType }))
                        }
                      }}
                      className="mr-2"
                    />
                    <Video className="w-4 h-4 mr-1" />
                    Video
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'image' ? 'Image' : 'Video'} Upload
                </label>
                <MediaUpload
                  type={formData.type}
                  currentUrl={formData.src}
                  usage="category-bg"
                  onUpload={(file: File, url: string) => {
                    console.log('CategoryHeroSlideManager MediaUpload onUpload called:', { 
                      fileType: file?.type, 
                      formDataType: formData.type, 
                      fileName: file?.name,
                      url: url ? url.substring(0, 100) + '...' : 'null/empty',
                      urlLength: url?.length || 0,
                      urlStartsWith: url ? url.substring(0, 20) : 'none'
                    })
                    
                    if (!url || !url.trim()) {
                      console.error('CategoryHeroSlideManager MediaUpload onUpload: Empty URL received')
                      showNotification('error', 'Failed to load media. Please try again.')
                      return
                    }
                    
                    console.log('CategoryHeroSlideManager: Setting formData.src to:', url.substring(0, 50) + '...')
                    setFormData(prev => {
                      const updated = { ...prev, src: url }
                      console.log('CategoryHeroSlideManager: formData updated:', {
                        oldSrc: prev.src ? prev.src.substring(0, 50) + '...' : 'empty',
                        newSrc: updated.src.substring(0, 50) + '...',
                        type: updated.type
                      })
                      return updated
                    })
                    
                    const mediaType = formData.type === 'video' ? 'Video' : 'Image'
                    showNotification('success', `${mediaType} uploaded successfully!`)
                  }}
                  onRemove={() => {
                    console.log('CategoryHeroSlideManager: Removing media')
                    setFormData(prev => ({ ...prev, src: '' }))
                  }}
                  className="mb-4"
                />
              </div>

              {formData.type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Image (for video)
                  </label>
                  <MediaUpload
                    type="image"
                    currentUrl={formData.fallbackImage}
                    usage="category-bg"
                    onUpload={(file: File, url: string) => {
                      console.log('CategoryHeroSlideManager Fallback Image onUpload called:', { 
                        fileType: file?.type, 
                        fileName: file?.name,
                        url: url ? url.substring(0, 100) + '...' : 'null/empty',
                        urlLength: url?.length || 0
                      })
                      
                      if (!url || !url.trim()) {
                        console.error('CategoryHeroSlideManager Fallback Image: Empty URL received')
                        showNotification('error', 'Failed to load fallback image. Please try again.')
                        return
                      }
                      
                      console.log('CategoryHeroSlideManager: Setting formData.fallbackImage to:', url.substring(0, 50) + '...')
                      setFormData(prev => {
                        const updated = { ...prev, fallbackImage: url }
                        console.log('CategoryHeroSlideManager: formData updated with fallbackImage:', {
                          oldFallbackImage: prev.fallbackImage ? prev.fallbackImage.substring(0, 50) + '...' : 'empty',
                          newFallbackImage: updated.fallbackImage.substring(0, 50) + '...'
                        })
                        return updated
                      })
                      
                      showNotification('success', 'Fallback image uploaded successfully!')
                    }}
                    onRemove={() => {
                      console.log('CategoryHeroSlideManager: Removing fallback image')
                      setFormData(prev => ({ ...prev, fallbackImage: '' }))
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slide Title (Optional)
                </label>
                <div className="flex gap-2 flex-wrap items-center mb-1">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, title: '' }))}
                    className={`px-3 py-1.5 text-sm rounded-md border-2 ${
                      !formData.title ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Don't use
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter slide title (e.g., 🏷️ Stickers)"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-2xl hover:scale-110 transition-transform"
                    title="Add emoji"
                  >
                    😀
                  </button>
                </div>
                {showEmojiPicker && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-2">
                      {emojiOptions.map((emoji, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              title: prev.title ? `${prev.title} ${emoji}` : emoji
                            }))
                            setShowEmojiPicker(false)
                          }}
                          className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-200"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty or use &quot;Don&apos;t use&quot; to use category default title
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slide Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Enter slide subtitle (e.g., Express yourself with our premium sticker collection)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use category default description
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animation Speed: {formData.speed ?? 5} (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.speed ?? 5}
                  onChange={(e) => setFormData(prev => ({ ...prev, speed: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animation Effect
                </label>
                <select
                  value={formData.effect || 'slide'}
                  onChange={(e) => setFormData(prev => ({ ...prev, effect: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="slide">Slide (슬라이딩)</option>
                  <option value="fade">Fade (페이드 인/아웃)</option>
                  <option value="zoom">Zoom (줌 인/아웃)</option>
                  <option value="rotate">Rotate (회전)</option>
                  <option value="blend">Blend (블렌드 모드)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.effect === 'slide' && 'Direction 설정이 필요합니다'}
                  {formData.effect !== 'slide' && 'Direction 설정은 Slide 효과에서만 사용됩니다'}
                </p>
              </div>

              {formData.effect === 'slide' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction
                  </label>
                  <select
                    value={formData.direction || 'left'}
                    onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="up">Up</option>
                    <option value="down">Down</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opacity: {((formData.opacity ?? 1) * 100).toFixed(0)}% (Desktop Default)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.opacity ?? 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Transparent</span>
                  <span>Opaque</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  기본값 (데스크톱). 반응형 설정에서 각 화면 크기별로 다르게 설정할 수 있습니다.
                </p>
              </div>

              {/* 반응형 설정 섹션 */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">📱 반응형 설정</h3>
                <p className="text-xs text-gray-500 mb-4">
                  화면 크기별로 다른 속도와 투명도를 설정할 수 있습니다.
                </p>
                
                {/* 탭 */}
                <div className="flex gap-2 mb-4 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setResponsiveTab('mobile')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      responsiveTab === 'mobile'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📱 모바일 (&lt;768px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponsiveTab('tablet')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      responsiveTab === 'tablet'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📱 태블릿 (768-1024px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponsiveTab('desktop')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      responsiveTab === 'desktop'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    💻 데스크톱 (&gt;1024px)
                  </button>
                </div>

                {/* 현재 탭의 설정 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Speed: {formData.responsive?.[responsiveTab]?.speed ?? formData.speed ?? 5} (1-10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={formData.responsive?.[responsiveTab]?.speed ?? formData.speed ?? 5}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        setFormData(prev => ({
                          ...prev,
                          responsive: {
                            ...prev.responsive,
                            [responsiveTab]: {
                              ...prev.responsive?.[responsiveTab],
                              speed: value
                            }
                          }
                        }))
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opacity: {((formData.responsive?.[responsiveTab]?.opacity ?? formData.opacity ?? 1) * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.responsive?.[responsiveTab]?.opacity ?? formData.opacity ?? 1}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        setFormData(prev => ({
                          ...prev,
                          responsive: {
                            ...prev.responsive,
                            [responsiveTab]: {
                              ...prev.responsive?.[responsiveTab],
                              opacity: value
                            }
                          }
                        }))
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Transparent</span>
                      <span>Opaque</span>
                    </div>
                  </div>

                  {/* 모바일에서만 비디오 일시정지 옵션 */}
                  {responsiveTab === 'mobile' && formData.type === 'video' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pauseVideoOnMobile"
                        checked={formData.responsive?.mobile?.pauseVideoOnMobile !== false}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            responsive: {
                              ...prev.responsive,
                              mobile: {
                                ...prev.responsive?.mobile,
                                pauseVideoOnMobile: e.target.checked
                              }
                            }
                          }))
                        }}
                        className="rounded"
                      />
                      <label htmlFor="pauseVideoOnMobile" className="text-sm font-medium text-gray-700">
                        모바일에서 비디오 자동 일시정지
                      </label>
                      <p className="text-xs text-gray-500 ml-2">
                        (배터리 절약 및 데이터 사용량 감소)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingSlide ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Play, Image as ImageIcon, X, Monitor, FileText, Save, Copy, AlertCircle } from 'lucide-react'
import { HeroSlide } from '@/lib/contentStore'
import MediaUpload from '@/components/MediaUpload'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Autoplay, Navigation, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/autoplay'

interface HeroSlideManagerProps {
  heroSlides: HeroSlide[]
  heroSlideTemplates?: any[] // HeroSlideTemplate[]
  onAddSlide: (slide: Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateSlide: (id: string, slide: Partial<HeroSlide>) => void
  onDeleteSlide: (id: string) => void
  onToggleSlideActive: (id: string) => void
  onReorderSlide: (fromIndex: number, toIndex: number) => void
  onSaveTemplate?: (template: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => void // HeroSlideTemplate
  onUpdateTemplate?: (id: string, template: Partial<any>) => void // HeroSlideTemplate
  onDeleteTemplate?: (id: string) => void
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function HeroSlideManager({
  heroSlides,
  heroSlideTemplates = [],
  onAddSlide,
  onUpdateSlide,
  onDeleteSlide,
  onToggleSlideActive,
  onReorderSlide,
  onSaveTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  showNotification
}: HeroSlideManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false)
  // 🆕 모달 내부 오류 메시지 상태
  const [modalError, setModalError] = useState<string>('')
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false)
  const [isPreviewTemplateModalOpen, setIsPreviewTemplateModalOpen] = useState(false)
  const [previewSlide, setPreviewSlide] = useState<HeroSlide | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null) // HeroSlideTemplate
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null) // HeroSlideTemplate
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null) // HeroSlideTemplate
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'product' | 'event' | 'promotion' | 'seasonal' | 'custom'
  })
  const [editTemplateFormData, setEditTemplateFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'product' | 'event' | 'promotion' | 'seasonal' | 'custom',
    slideData: {
      type: 'image' as 'image' | 'video',
      src: '',
      fallbackImage: '',
      title: '',
      subtitle: '',
      color: 'blue' as 'pink' | 'blue' | 'yellow' | 'purple' | 'green',
      linkUrl: '',
      isEventBanner: false,
      eventStartDate: '',
      eventEndDate: ''
    }
  })

  // Preview Slide Content Component (indexeddb:// 지원)
  // 동영상 전체 노출: object-contain + bg-black (홈 Hero와 동일)
  const PreviewSlideContent = ({ slide }: { slide: HeroSlide }) => {
    const [imageSrc, setImageSrc] = useState<string>(slide.src)
    const [videoSrc, setVideoSrc] = useState<string>(slide.src)
    const [videoError, setVideoError] = useState(false)
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [fallbackSrc, setFallbackSrc] = useState<string>(slide.fallbackImage || '')

    // indexeddb:// 형식의 URL 처리
    useEffect(() => {
      const loadFromIndexedDB = async () => {
        // 이미지/비디오 src 처리
        if (slide.src && slide.src.startsWith('indexeddb://')) {
          const fileId = slide.src.replace('indexeddb://', '')
          try {
            const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
            const fileUrl = await indexedDBStorage.getFile(fileId)
            if (fileUrl) {
              if (slide.type === 'video') {
                setVideoSrc(fileUrl)
              } else {
                setImageSrc(fileUrl)
              }
            } else {
              // 파일이 IndexedDB에 없음(삭제/다른 브라우저/DB 초기화). 에러 상태로 fallback 표시
              if (slide.type === 'video') {
                setVideoError(true)
              } else {
                setImageError(true)
              }
            }
          } catch (error) {
            // IndexedDB 로드 실패 시 fallback으로 전환
            if (slide.type === 'video') {
              setVideoError(true)
            } else {
              setImageError(true)
            }
            if (slide.type === 'video') {
              setVideoError(true)
            } else {
              setImageError(true)
            }
          }
        } else {
          // 일반 URL인 경우 바로 설정
          if (slide.type === 'video') {
            setVideoSrc(slide.src)
          } else {
            setImageSrc(slide.src)
          }
        }

        // Fallback 이미지 처리 (indexeddb:// 지원)
        if (slide.fallbackImage && slide.fallbackImage.startsWith('indexeddb://')) {
          const fileId = slide.fallbackImage.replace('indexeddb://', '')
          try {
            const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
            const fileUrl = await indexedDBStorage.getFile(fileId)
            if (fileUrl) {
              setFallbackSrc(fileUrl)
            }
          } catch {
            // Fallback 이미지 로드 실패 시 무시(기본 빈 fallback 유지)
          }
        } else if (slide.fallbackImage) {
          setFallbackSrc(slide.fallbackImage)
        }
      }
      loadFromIndexedDB()
    }, [slide.src, slide.fallbackImage, slide.type])

    const safeFallback = useMemo(() => 
      (fallbackSrc && fallbackSrc.trim() !== '') ? fallbackSrc : '/logo.svg', 
      [fallbackSrc]
    )

    return (
      <div className="flex-1 overflow-hidden bg-gray-900">
        <Swiper
          modules={[EffectFade, Autoplay, Navigation, Pagination]}
          effect="fade"
          speed={1000}
          autoplay={false}
          loop={false}
          navigation={false}
          pagination={false}
          className="h-full w-full"
        >
          <SwiperSlide className="relative">
            {/* Background Content */}
            <div className="absolute inset-0 w-full h-full">
              {slide.type === 'video' ? (
                <div className="relative w-full h-full">
                  {/* 배경: 좌우(또는 상하) 여백을 같은 이미지(fallback)로 채움 */}
                  {safeFallback && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
                      style={{ backgroundImage: `url('${safeFallback}')` }}
                    />
                  )}
                  {videoError && safeFallback && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat z-[11]"
                      style={{ backgroundImage: `url('${safeFallback}')` }}
                    />
                  )}
                  
                  {/* Video - object-contain, 여백은 배경(fallback)이 비치도록 */}
                  {!videoError && (
                    <video
                      key={videoSrc}
                      className="absolute inset-0 w-full h-full z-10 object-contain bg-transparent"
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={safeFallback}
                      onError={() => setVideoError(true)}
                      onLoadedData={() => {
                        setVideoLoaded(true)
                        setVideoError(false)
                      }}
                      onCanPlay={() => {
                        setVideoLoaded(true)
                        setVideoError(false)
                      }}
                      preload="metadata"
                      style={{ 
                        opacity: videoLoaded ? 1 : 0,
                        transition: 'opacity 0.5s ease-in-out'
                      }}
                    >
                      <source src={videoSrc} type="video/mp4" />
                      <source src={videoSrc} type="video/webm" />
                      <source src={videoSrc} type="video/ogg" />
                    </video>
                  )}
                  
                  {/* Loading indicator */}
                  {!videoError && !videoLoaded && (
                    <div className="absolute inset-0 bg-black/20 z-5 flex items-center justify-center">
                      <div className="text-white text-sm">Loading...</div>
                    </div>
                  )}
                  
                  {/* Error state - Show fallback or error message */}
                  {videoError && !safeFallback && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Video failed to load</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                imageError ? (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-600" />
                  </div>
                ) : (
                  <div 
                    className="w-full h-full bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url('${imageSrc}')` }}
                    onError={() => setImageError(true)}
                  />
                )
              )}
              
              {/* Color Overlay */}
              <div className={`absolute inset-0 ${
                slide.color === 'pink' ? 'bg-pink-500/20' :
                slide.color === 'blue' ? 'bg-blue-500/20' :
                slide.color === 'yellow' ? 'bg-yellow-500/20' :
                slide.color === 'purple' ? 'bg-purple-500/20' :
                slide.color === 'green' ? 'bg-green-500/20' :
                'bg-gray-500/20'
              }`}></div>
              
              {/* Dark Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/30 to-black/40"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="text-center text-white max-w-4xl mx-auto px-4">
                <div className="space-y-8">
                  {/* Slide Content */}
                  <div className="space-y-6">
                    {slide.title && (
                      <h2 className="text-3xl lg:text-5xl font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {slide.title}
                      </h2>
                    )}
                    {slide.subtitle && (
                      <p className="text-xl lg:text-2xl font-medium leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] opacity-90">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                  
                  {/* CTA Buttons */}
                  <div className="flex justify-center items-center">
                    {slide.linkUrl && (
                      <div className="bg-white text-gray-900 px-8 py-4 rounded-full font-bold text-lg shadow-lg">
                        {slide.isEventBanner ? 'Buy Now →' : 'Learn More →'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
    )
  }
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    type: 'image' as 'image' | 'video',
    src: '',
    fallbackImage: '',
    title: '',
    subtitle: '',
    color: 'blue' as 'pink' | 'blue' | 'yellow' | 'purple' | 'green',
    order: 1,
    isActive: true,
    linkUrl: '',
    isEventBanner: false,
    eventStartDate: '',
    eventEndDate: ''
  })
  const [previewSrc, setPreviewSrc] = useState<string>('') // 미리보기용 실제 URL (indexeddb:// → blob 변환)
  const [previewFallbackSrc, setPreviewFallbackSrc] = useState<string>('') // Fallback Image 미리보기용 실제 URL
  const [fallbackImageInputMethod, setFallbackImageInputMethod] = useState<'upload' | 'url'>('upload') // Fallback Image 입력 방식

  // 미리보기 src 해석 (indexeddb:// → blob/data URL 변환)
  useEffect(() => {
    let isMounted = true
    const resolvePreviewSrc = async () => {
      const src = formData.src?.trim() || ''
      if (!src) {
        if (isMounted) setPreviewSrc('')
        return
      }

      // indexeddb://인 경우 파일을 blob URL로 변환
      if (src.startsWith('indexeddb://')) {
        try {
          const fileId = src.replace('indexeddb://', '')
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (isMounted) {
            setPreviewSrc(fileUrl || '')
          }
        } catch (error) {
          if (isMounted) {
            setPreviewSrc('')
          }
        }
        return
      }

      // 그 외(src, data:, blob:, http/https, /상대경로)는 그대로 사용
      if (isMounted) {
        setPreviewSrc(src)
      }
    }

    resolvePreviewSrc()
    return () => {
      isMounted = false
    }
  }, [formData.src])

  // Fallback Image 미리보기 src 해석 (indexeddb:// → blob/data URL 변환)
  useEffect(() => {
    let isMounted = true
    const resolvePreviewFallbackSrc = async () => {
      const fallbackSrc = formData.fallbackImage?.trim() || ''
      if (!fallbackSrc) {
        if (isMounted) setPreviewFallbackSrc('')
        return
      }

      // indexeddb://인 경우 파일을 blob URL로 변환
      if (fallbackSrc.startsWith('indexeddb://')) {
        try {
          const fileId = fallbackSrc.replace('indexeddb://', '')
          const { indexedDBStorage } = await import('@/lib/indexedDBStorage')
          const fileUrl = await indexedDBStorage.getFile(fileId)
          if (isMounted) {
            setPreviewFallbackSrc(fileUrl || '')
          }
        } catch (error) {
          if (isMounted) {
            setPreviewFallbackSrc('')
          }
        }
        return
      }

      // 그 외(src, data:, blob:, http/https, /상대경로)는 그대로 사용
      if (isMounted) {
        setPreviewFallbackSrc(fallbackSrc)
      }
    }

    resolvePreviewFallbackSrc()
    return () => {
      isMounted = false
    }
  }, [formData.fallbackImage])

  // formData 변경 감지
  console.log('HeroSlideManager formData.type:', formData.type)

  const openModal = (slide?: HeroSlide, template?: any) => {
    if (template) {
      // 템플릿에서 슬라이드 생성
      // editingSlide를 설정하여 템플릿 저장 시 사용할 수 있도록 함
      const templateSlide: HeroSlide = {
        id: `temp-${Date.now()}`,
        type: template.slideData.type || 'image',
        src: template.slideData.src || '',
        fallbackImage: template.slideData.fallbackImage,
        title: template.slideData.title || '',
        subtitle: template.slideData.subtitle || '',
        color: template.slideData.color || 'blue',
        order: heroSlides.length + 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        linkUrl: template.slideData.linkUrl,
        isEventBanner: template.slideData.isEventBanner || false,
        eventStartDate: template.slideData.eventStartDate,
        eventEndDate: template.slideData.eventEndDate
      }
      setEditingSlide(templateSlide)
      const templateFallbackImage = template.slideData.fallbackImage || ''
      setFormData({
        type: template.slideData.type || 'image',
        src: template.slideData.src || '',
        fallbackImage: templateFallbackImage,
        title: template.slideData.title || '',
        subtitle: template.slideData.subtitle || '',
        color: template.slideData.color || 'blue',
        order: heroSlides.length + 1,
        isActive: true,
        linkUrl: template.slideData.linkUrl || '',
        isEventBanner: template.slideData.isEventBanner || false,
        eventStartDate: template.slideData.eventStartDate ? new Date(template.slideData.eventStartDate).toISOString().split('T')[0] : '',
        eventEndDate: template.slideData.eventEndDate ? new Date(template.slideData.eventEndDate).toISOString().split('T')[0] : ''
      })
      // Fallback Image 입력 방식 자동 감지
      if (templateFallbackImage) {
        const isUploadType = templateFallbackImage.startsWith('indexeddb://') || 
                            templateFallbackImage.startsWith('data:') || 
                            templateFallbackImage.startsWith('blob:')
        setFallbackImageInputMethod(isUploadType ? 'upload' : 'url')
      } else {
        setFallbackImageInputMethod('upload')
      }
      setSelectedTemplate(template)
    } else if (slide) {
      setEditingSlide(slide)
      const slideFallbackImage = slide.fallbackImage || ''
      setFormData({
        type: slide.type || 'image',
        src: slide.src,
        fallbackImage: slideFallbackImage,
        title: slide.title,
        subtitle: slide.subtitle,
        color: slide.color,
        order: slide.order,
        isActive: slide.isActive,
        linkUrl: slide.linkUrl || '',
        isEventBanner: slide.isEventBanner || false,
        eventStartDate: slide.eventStartDate ? new Date(slide.eventStartDate).toISOString().split('T')[0] : '',
        eventEndDate: slide.eventEndDate ? new Date(slide.eventEndDate).toISOString().split('T')[0] : ''
      })
      // Fallback Image 입력 방식 자동 감지
      if (slideFallbackImage) {
        const isUploadType = slideFallbackImage.startsWith('indexeddb://') || 
                            slideFallbackImage.startsWith('data:') || 
                            slideFallbackImage.startsWith('blob:')
        setFallbackImageInputMethod(isUploadType ? 'upload' : 'url')
      } else {
        setFallbackImageInputMethod('upload')
      }
      setSelectedTemplate(null)
    } else {
      setEditingSlide(null)
      setFormData({
        type: 'image',
        src: '',
        fallbackImage: '',
        title: '',
        subtitle: '',
        color: 'pink',
        order: heroSlides.length + 1,
        isActive: true,
        linkUrl: '',
        isEventBanner: false,
        eventStartDate: '',
        eventEndDate: ''
      })
      setFallbackImageInputMethod('upload') // 새 슬라이드 추가 시 기본값
      setSelectedTemplate(null)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSlide(null)
    setSelectedTemplate(null) // 🆕 템플릿 선택 상태도 초기화
    setModalError('') // 🆕 모달 닫을 때 오류 메시지 초기화
    setFallbackImageInputMethod('upload') // 입력 방식 초기화
    setFormData({
      type: 'image',
      src: '',
      fallbackImage: '',
      title: '',
      subtitle: '',
      color: 'blue',
      order: 1,
      isActive: true,
      linkUrl: '',
      isEventBanner: false,
      eventStartDate: '',
      eventEndDate: ''
    })
  }

  const handleSave = () => {
    // 디버그 로그는 개발 환경에서만 표시
    if (process.env.NODE_ENV === 'development') {
      console.log('handleSave called:', {
        formDataSrc: formData.src ? formData.src.substring(0, 100) + '...' : 'empty',
        formDataType: formData.type,
        srcLength: formData.src?.length || 0,
        editingSlide: editingSlide ? editingSlide.id : 'none',
        isEditMode: !!editingSlide,
        formDataKeys: Object.keys(formData)
      })
    }
    
    if (!formData.src || !formData.src.trim()) {
      const mediaType = formData.type === 'video' ? 'Video' : 'Image'
      // 콘솔 에러 대신 경고로 변경 (정상적인 검증 로직)
      if (process.env.NODE_ENV === 'development') {
        console.warn('handleSave: Media file is required. User needs to upload an image or video.')
      }
      const errorMessage = `Please upload a ${mediaType.toLowerCase()} or enter a URL before saving.`
      setModalError(errorMessage) // 🆕 모달 내부에 오류 메시지 표시
      showNotification('error', errorMessage)
      return
    }

    // URL 형식 검증 (더 유연하지만 위험한 URL 차단)
    const url = formData.src.trim()

    // 🆕 indexeddb:// 형식은 항상 허용 (Media Library에서 선택한 파일)
    const isIndexedDBUrl = url.startsWith('indexeddb://')
    
    // 동영상 금지 패턴: 이미지 도메인/확장자만 체크 (data: URL은 Media Library에서 온 것이므로 허용)
    const isImageLike = (u: string) => /images\.(unsplash|pexels)\.com|\.(jpg|jpeg|png|gif|webp)$/i.test(u)
    // data:video/로 시작하는 경우는 Media Library에서 선택한 동영상이므로 허용
    const isForbiddenForVideo = (u: string) => {
      // indexeddb://는 항상 허용 (Media Library에서 선택한 파일)
      if (u.startsWith('indexeddb://')) return false
      // data:video/는 허용 (Media Library에서 선택한 동영상)
      if (u.startsWith('data:video/')) return false
      // blob:는 허용하지 않음
      if (u.startsWith('blob:')) return true
      // data:image/는 동영상에 사용할 수 없음
      if (u.startsWith('data:image/')) return true
      // 이미지 도메인/확장자는 허용하지 않음
      if (isImageLike(u)) return true
      return false
    }

    if (formData.type === 'video' && isForbiddenForVideo(url)) {
      // 🆕 더 구체적인 오류 메시지 제공
      let errorMessage = 'Invalid video URL. '
      if (url.startsWith('data:image/')) {
        errorMessage += 'You selected an image file. Please upload a video file or select a video from Media Library.'
      } else if (url.includes('images.unsplash.com') || url.includes('images.pexels.com')) {
        errorMessage += 'Image URLs cannot be used for video. Please upload a video file or select a video from Media Library.'
      } else if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
        errorMessage += 'Image file extensions cannot be used for video. Please upload a video file (.mp4, .webm, etc.) or select a video from Media Library.'
      } else {
        errorMessage += 'Use a real video file URL or /videos/... or select a video from Media Library.'
      }
      setModalError(errorMessage) // 🆕 모달 내부에 오류 메시지 표시
      showNotification('error', errorMessage)
      return
    }

    // 🆕 indexeddb:// 형식은 URL 형식 검증 건너뛰기
    if (!isIndexedDBUrl && url && !url.includes('://') && !url.startsWith('/')) {
      // 상대 경로나 파일명만 입력된 경우 경고
      if (confirm('입력한 경로가 올바른 형식이 아닐 수 있습니다. 계속 진행하시겠습니까?')) {
        // 사용자가 계속 진행하기로 선택한 경우
      } else {
        return
      }
    }

    // 동영상의 경우 fallback 이미지 검증
    // 🆕 기존 슬라이드를 편집하는 경우 fallback 이미지가 이미 있으면 검증 건너뛰기
    const hasExistingFallback = editingSlide?.fallbackImage && editingSlide.fallbackImage.trim()
    const hasNewFallback = formData.fallbackImage && formData.fallbackImage.trim()
    
    if (formData.type === 'video' && !hasExistingFallback && !hasNewFallback) {
      const errorMessage = 'Please set a fallback image for video content.'
      setModalError(errorMessage) // 🆕 모달 내부에 오류 메시지 표시
      showNotification('error', errorMessage)
      return
    }
    
    // 🆕 fallback 이미지가 indexeddb:// 형식이면 유효한 것으로 간주
    const isValidFallback = hasNewFallback && (
      formData.fallbackImage.startsWith('indexeddb://') ||
      formData.fallbackImage.startsWith('http://') ||
      formData.fallbackImage.startsWith('https://') ||
      formData.fallbackImage.startsWith('/') ||
      formData.fallbackImage.startsWith('data:image/')
    )
    
    if (formData.type === 'video' && hasNewFallback && !isValidFallback && !hasExistingFallback) {
      const errorMessage = 'Please set a valid fallback image URL for video content.'
      setModalError(errorMessage) // 🆕 모달 내부에 오류 메시지 표시
      showNotification('error', errorMessage)
      return
    }

    // 🆕 템플릿에서 선택한 경우 (temp- ID) 또는 selectedTemplate이 있으면 새 슬라이드로 추가
    const isFromTemplate = editingSlide?.id?.startsWith('temp-') || selectedTemplate !== null
    const isExistingSlide = editingSlide && !isFromTemplate && heroSlides.some(s => s.id === editingSlide.id)
    
    // 🆕 editingSlide가 있고 실제 존재하는 슬라이드면 업데이트, 그 외에는 추가
    if (isExistingSlide) {
      // 🆕 editingSlide.id 저장 (나중에 closeModal()이 editingSlide를 null로 설정하기 전에)
      const slideId = editingSlide.id
      
      try {
        // 디버그 로그는 개발 환경에서만 표시
        if (process.env.NODE_ENV === 'development') {
          console.log('💾 Updating slide:', slideId, formData)
          console.log('📹 Video update details:', {
            type: formData.type,
            src: formData.src,
            fallbackImage: formData.fallbackImage,
            title: formData.title,
            subtitle: formData.subtitle
          })
        }
        
        // 🆕 formData를 완전한 객체로 변환하여 전달
        // fallback 이미지가 없으면 기존 fallback 이미지 유지
        const { eventStartDate: evStart, eventEndDate: evEnd, ...formRest } = formData
        const updateData: Partial<HeroSlide> = {
          ...formRest,
          fallbackImage: formData.fallbackImage.trim() || editingSlide.fallbackImage || '',
          updatedAt: new Date(),
          eventStartDate: evStart ? new Date(evStart) : undefined,
          eventEndDate: evEnd ? new Date(evEnd) : undefined
        }
        
        // 🆕 모달을 먼저 닫아서 상태 업데이트로 인한 리렌더링 시 모달이 다시 열리지 않도록 함
        closeModal()
        
        // 상태 업데이트는 모달을 닫은 후에 수행 (slideId 사용)
        onUpdateSlide(slideId, updateData)
        showNotification('success', 'Slide updated successfully!')
      } catch (error) {
        console.error('❌ Error updating slide:', error)
        showNotification('error', 'Failed to update slide. Please try again.')
        // 에러 발생 시에도 모달은 닫힌 상태 유지
      }
    } else {
      // 🆕 Add New Slide 모드 (템플릿에서 선택한 경우 포함)
      try {
        // 디버그 로그는 개발 환경에서만 표시
        if (process.env.NODE_ENV === 'development') {
          console.log('➕ Adding new slide:', {
            fromTemplate: isFromTemplate,
            selectedTemplate: selectedTemplate?.name || 'none',
            formData: {
              type: formData.type,
              src: formData.src.substring(0, 50) + '...',
              title: formData.title,
              subtitle: formData.subtitle,
              order: formData.order,
              isActive: formData.isActive
            }
          })
          console.log('📹 Video add details:', {
            type: formData.type,
            src: formData.src,
            fallbackImage: formData.fallbackImage,
            title: formData.title,
            subtitle: formData.subtitle
          })
        }
        
        // 🆕 모달을 먼저 닫아서 상태 업데이트로 인한 리렌더링 시 모달이 다시 열리지 않도록 함
        closeModal()
        
        const { eventStartDate: addStart, eventEndDate: addEnd, ...addRest } = formData
        onAddSlide({
          ...addRest,
          eventStartDate: addStart ? new Date(addStart) : undefined,
          eventEndDate: addEnd ? new Date(addEnd) : undefined
        })
        showNotification('success', isFromTemplate ? 'Slide created from template successfully!' : 'New slide added successfully!')
      } catch (error) {
        console.error('❌ Error adding slide:', error)
        showNotification('error', 'Failed to add slide. Please try again.')
        // 에러 발생 시에도 모달은 닫힌 상태 유지
      }
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this slide?')) {
      onDeleteSlide(id)
      showNotification('success', 'Slide deleted successfully.')
    }
  }

  // 드래그 앤 드롭 핸들러들
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
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

  const getColorClass = (color: string) => {
    switch (color) {
      case 'pink': return 'bg-pink-100 text-pink-800'
      case 'blue': return 'bg-blue-100 text-blue-800'
      case 'yellow': return 'bg-yellow-100 text-yellow-800'
      case 'purple': return 'bg-purple-100 text-purple-800'
      case 'green': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="col-span-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-blue-900">🎬 Hero Slide Management</h4>
          <p className="text-sm text-blue-700">Manage the sliding background of the homepage Hero section.</p>
          <p className="text-xs text-blue-600 mt-1">
            💡 To create an Event Bundle banner, first register an Event Bundle in the "Event Bundle" tab.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </button>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </button>
        </div>
      </div>

      {/* 슬라이드 목록 */}
      <div className="space-y-3">
        {heroSlides.map((slide, index) => (
          <div 
            key={slide.id} 
            className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all duration-200 ${
              draggedIndex === index 
                ? 'border-blue-400 shadow-lg opacity-50' 
                : dragOverIndex === index 
                ? 'border-blue-300 bg-blue-50' 
                : 'border-blue-200 hover:shadow-md'
            }`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center space-x-3">
              <div className="cursor-move text-blue-400 hover:text-blue-600 transition-colors">
                <GripVertical size={20} />
              </div>
              {/* 썸네일 이미지 */}
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 border border-gray-300">
                {slide.type === 'video' ? (
                  slide.fallbackImage ? (
                    <img 
                      src={slide.fallbackImage} 
                      alt={slide.title || 'Video slide'} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-300"><svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>'
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <Play className="w-8 h-8 text-gray-600" />
                    </div>
                  )
                ) : (
                  <img 
                    src={slide.src} 
                    alt={slide.title || 'Image slide'} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-300"><svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                      }
                    }}
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-blue-900">{slide.title || 'No Title'}</span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getColorClass(slide.color)}`}>
                    {slide.color}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    slide.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {slide.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-blue-600">
                  {slide.type === 'video' ? 'Video' : 'Image'} • Order: {slide.order}
                </div>
                {slide.subtitle && (
                  <div className="text-xs text-gray-500 mt-1">{slide.subtitle}</div>
                )}
                {slide.isEventBanner && (
                  <div className="mt-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                      📦 Event Banner
                    </span>
                    {slide.linkUrl && (
                      <span className="ml-2 text-xs text-blue-600">→ {slide.linkUrl}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setPreviewSlide(slide)
                  setIsPreviewModalOpen(true)
                }}
                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                title="Preview slide"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleSlideActive(slide.id)}
                className={`p-2 rounded-md transition-colors ${
                  slide.isActive 
                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                    : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                }`}
                title={slide.isActive ? 'Deactivate' : 'Activate'}
              >
                {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => openModal(slide)}
                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit slide"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(slide.id)}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title="Delete slide"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 슬라이드 편집 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSlide ? 'Edit Slide' : 'Add New Slide'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 🆕 모달 내부 오류 메시지 표시 영역 */}
            {modalError && (
              <div className="sticky top-0 z-10 bg-red-50 border-b border-red-200 p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium flex-1">{modalError}</p>
                  <button
                    onClick={() => setModalError('')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 space-y-6">
              {/* Media Type Selection */}
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
                        console.log('Media type changed to image:', { 
                          from: formData.type, 
                          to: newType, 
                          currentSrc: formData.src ? formData.src.substring(0, 50) + '...' : 'empty'
                        })
                        
                        // 🆕 이미지 타입으로 변경할 때 기존 비디오 src가 있으면 초기화
                        const isVideoUrl = formData.src && (
                          formData.src.startsWith('data:video/') ||
                          formData.src.match(/\.(mp4|webm|ogg|ogv|m4v|3gp|avi|mov|wmv|flv|mkv|mpg|mpeg)$/i) ||
                          formData.src.startsWith('blob:') && formData.type === 'video'
                        )
                        
                        if (isVideoUrl) {
                          console.log('⚠️ Clearing video src when switching to image type')
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
                        console.log('Media type changed to video:', { 
                          from: formData.type, 
                          to: newType, 
                          currentSrc: formData.src ? formData.src.substring(0, 50) + '...' : 'empty',
                          currentSrcType: formData.src ? (formData.src.startsWith('data:image/') ? 'image' : formData.src.startsWith('data:video/') ? 'video' : 'unknown') : 'none'
                        })
                        
                        // 🆕 비디오 타입으로 변경할 때 기존 이미지 src가 있으면 초기화
                        // 이미지 URL(data:image/, 이미지 확장자 등)이 비디오 src로 사용되면 검증 오류 발생
                        const isImageUrl = formData.src && (
                          formData.src.startsWith('data:image/') ||
                          formData.src.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                          formData.src.includes('images.unsplash.com') ||
                          formData.src.includes('images.pexels.com')
                        )
                        
                        if (isImageUrl) {
                          console.log('⚠️ Clearing image src when switching to video type')
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
                    <Play className="w-4 h-4 mr-1" />
                    Video
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color Theme
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="green">Green</option>
                  <option value="pink">Pink</option>
                  <option value="yellow">Yellow</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'video' ? 'Background Video' : 'Background Image'}
                </label>
                
                {/* 현재 미디어 미리보기 */}
                {previewSrc && (
                  <div className="mb-4">
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                      {formData.type === 'video' ? (
                        <video
                          src={previewSrc}
                          className="w-full h-full object-cover"
                          controls
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <img
                          src={previewSrc}
                          alt="미리보기"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Current {formData.type === 'video' ? 'video' : 'image'} preview</p>
                  </div>
                )}
                
                {/* 파일 업로드 컴포넌트 */}
                <MediaUpload
                  type={formData.type}
                  currentUrl={formData.src}
                  usage="hero-banner"
                  onUpload={(file: File, url: string) => {
                    console.log('MediaUpload onUpload called:', { 
                      fileType: file?.type, 
                      formDataType: formData.type, 
                      fileName: file?.name,
                      url: url ? url.substring(0, 100) + '...' : 'null/empty',
                      urlLength: url?.length || 0,
                      urlStartsWith: url ? url.substring(0, 20) : 'none'
                    })
                    
                    if (!url || !url.trim()) {
                      console.error('MediaUpload onUpload: Empty URL received')
                      showNotification('error', 'Failed to load media. Please try again.')
                      return
                    }
                    
                    // 🆕 파일 타입 자동 감지 및 formData.type 업데이트
                    const detectedType = file.type?.startsWith('video/') ? 'video' : 
                                       file.type?.startsWith('image/') ? 'image' :
                                       file.name?.match(/\.(mp4|webm|ogg|ogv|avi|mov|wmv|flv|m4v|3gp|mkv|mpg|mpeg)$/i) ? 'video' :
                                       file.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' :
                                       formData.type // 기본값은 현재 formData.type 유지
                    
                    console.log('MediaUpload: Detected file type:', detectedType, 'from file:', file.name)
                    
                    console.log('MediaUpload: Setting formData.src to:', url.substring(0, 50) + '...')
                    setFormData(prev => {
                      const updated = { 
                        ...prev, 
                        src: url,
                        // 🆕 파일 타입이 감지되었고 현재 타입과 다르면 자동 업데이트
                        type: detectedType !== prev.type ? detectedType : prev.type
                      }
                      console.log('MediaUpload: formData updated:', {
                        oldSrc: prev.src ? prev.src.substring(0, 50) + '...' : 'empty',
                        newSrc: updated.src.substring(0, 50) + '...',
                        oldType: prev.type,
                        newType: updated.type,
                        detectedType: detectedType
                      })
                      return updated
                    })
                    
                    const mediaType = detectedType === 'video' ? 'Video' : 'Image'
                    const typeChanged = detectedType !== formData.type
                    showNotification('success', `${mediaType} uploaded successfully!${typeChanged ? ' (Type auto-detected)' : ''}`)
                  }}
                  onRemove={() => setFormData({ ...formData, src: '' })}
                  className="mb-4"
                />
                
              </div>

              {/* 동영상의 경우 대체 이미지 설정 */}
              {formData.type === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Image (displayed when video fails to load)
                  </label>
                  
                  {/* 대체 이미지 미리보기 */}
                  {previewFallbackSrc && (
                    <div className="mb-4">
                      <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                        <img
                          src={previewFallbackSrc}
                          alt="Fallback image preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Current fallback image preview</p>
                    </div>
                  )}
                  
                  {/* 입력 방식 선택 (라디오 버튼) */}
                  <div className="mb-4">
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fallbackImageMethod"
                          value="upload"
                          checked={fallbackImageInputMethod === 'upload'}
                          onChange={(e) => {
                            setFallbackImageInputMethod('upload')
                            // URL 입력 방식에서 업로드로 전환 시 URL 필드 비우기 (선택사항)
                            if (formData.fallbackImage && !formData.fallbackImage.startsWith('indexeddb://') && !formData.fallbackImage.startsWith('data:') && !formData.fallbackImage.startsWith('blob:')) {
                              // URL 형식이면 비우기
                              setFormData({ ...formData, fallbackImage: '' })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">파일 업로드</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="fallbackImageMethod"
                          value="url"
                          checked={fallbackImageInputMethod === 'url'}
                          onChange={(e) => {
                            setFallbackImageInputMethod('url')
                            // 업로드 방식에서 URL로 전환 시 indexeddb:// 형식이면 비우기 (선택사항)
                            if (formData.fallbackImage && formData.fallbackImage.startsWith('indexeddb://')) {
                              setFormData({ ...formData, fallbackImage: '' })
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">URL 직접 입력</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* 파일 업로드 방식 */}
                  {fallbackImageInputMethod === 'upload' && (
                    <MediaUpload
                      type="image"
                      currentUrl={formData.fallbackImage}
                      usage="hero-banner"
                      onUpload={(file, url) => {
                        setFormData({ ...formData, fallbackImage: url })
                        showNotification('success', 'Fallback image uploaded successfully!')
                      }}
                      onRemove={() => setFormData({ ...formData, fallbackImage: '' })}
                      className="mb-4"
                    />
                  )}
                  
                  {/* URL 직접 입력 방식 */}
                  {fallbackImageInputMethod === 'url' && (
                    <div>
                      <input
                        type="text"
                        value={formData.fallbackImage}
                        onChange={(e) => setFormData({ ...formData, fallbackImage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/fallback.jpg or /images/fallback.jpg"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Set an image to display when the video fails to load.
                      </p>
                    </div>
                  )}
                </div>
              )}



              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Slide title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Slide subtitle"
                />
              </div>

              {/* Link URL (모든 슬라이드에 사용 가능) - Event Banner가 체크되지 않았을 때만 표시 */}
              {!formData.isEventBanner && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.linkUrl}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter URL when slide is clicked (e.g., /products, /stickers, /bundle/customize?product=...)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL to navigate when slide is clicked. Leave empty if slide should not be clickable. Supports both absolute URLs (https://...) and relative paths (/bundle/...).
                  </p>
                </div>
              )}

              {/* 이벤트 배너 설정 */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">📦 Event Banner Settings (For Bundle Products)</h4>
                
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isEventBanner"
                      checked={formData.isEventBanner}
                      onChange={(e) => setFormData({ ...formData, isEventBanner: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isEventBanner" className="ml-2 text-sm text-gray-700">
                      Use as event banner (navigate to link on click)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    When checked, clicking the banner will navigate to the specified URL. Use this for Bundle product events.
                  </p>
                </div>

                {formData.isEventBanner && (
                  <div className="space-y-4 ml-6 border-l-2 border-blue-200 pl-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bundle Product ID *
                      </label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-sm text-gray-700 font-mono">
                          /bundle/customize?product=
                        </span>
                        <input
                          type="text"
                          value={formData.linkUrl.replace('/bundle/customize?product=', '')}
                          onChange={(e) => {
                            const productId = e.target.value.trim()
                            setFormData({ 
                              ...formData, 
                              linkUrl: productId ? `/bundle/customize?product=${productId}` : '' 
                            })
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter product ID (e.g., prod-1234567890)"
                          required={formData.isEventBanner}
                        />
                      </div>
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-semibold text-blue-900 mb-2">📋 How to Use:</p>
                        <div className="text-xs text-blue-800 space-y-1">
                          <p>1. Register an Event Bundle in the "Event Bundle" tab.</p>
                          <p>2. Click "Product ID" on the registered Bundle card to copy it.</p>
                          <p>3. Paste the copied product ID into the input field above.</p>
                          <p className="mt-2 text-blue-600 font-semibold">💡 Entering only the product ID will automatically generate the full URL.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          이벤트 시작일 (선택사항)
                        </label>
                        <input
                          type="date"
                          value={formData.eventStartDate}
                          onChange={(e) => setFormData({ ...formData, eventStartDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          이벤트 종료일 (선택사항)
                        </label>
                        <input
                          type="date"
                          value={formData.eventEndDate}
                          onChange={(e) => setFormData({ ...formData, eventEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      시작일/종료일을 설정하면 해당 기간에만 배너가 표시됩니다. 설정하지 않으면 항상 표시됩니다.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active Status
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  {/* 모달이 열려있으면 항상 버튼 표시 (새 슬라이드 추가 중에도 가능) */}
                  {isModalOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        // 현재 편집 중인 슬라이드 데이터를 기반으로 템플릿 저장 모달 열기
                        // formData를 editingSlide에 반영하여 최신 데이터 사용
                        // editingSlide가 없으면 formData로부터 임시 슬라이드 객체 생성
                        const currentSlide: HeroSlide = editingSlide ? {
                          ...editingSlide,
                          type: formData.type,
                          src: formData.src,
                          fallbackImage: formData.fallbackImage,
                          title: formData.title,
                          subtitle: formData.subtitle,
                          color: formData.color,
                          linkUrl: formData.linkUrl,
                          isEventBanner: formData.isEventBanner,
                          eventStartDate: formData.eventStartDate ? new Date(formData.eventStartDate) : undefined,
                          eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate) : undefined
                        } : {
                          id: `temp-${Date.now()}`,
                          type: formData.type,
                          src: formData.src,
                          fallbackImage: formData.fallbackImage,
                          title: formData.title,
                          subtitle: formData.subtitle,
                          color: formData.color,
                          order: formData.order,
                          isActive: formData.isActive,
                          createdAt: new Date(),
                          updatedAt: new Date(),
                          linkUrl: formData.linkUrl,
                          isEventBanner: formData.isEventBanner,
                          eventStartDate: formData.eventStartDate ? new Date(formData.eventStartDate) : undefined,
                          eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate) : undefined
                        }
                        setEditingSlide(currentSlide)
                        setTemplateFormData({
                          name: `${formData.title || 'Untitled'} Template`,
                          description: `Template based on "${formData.title || 'Untitled'}"`,
                          category: 'custom'
                        })
                        setIsSaveTemplateModalOpen(true)
                      }}
                      className="px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center"
                      title="Save current slide as template"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingSlide ? 'Update' : 'Add'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {isPreviewModalOpen && previewSlide && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Slide Preview</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewSlide.title || 'No Title'} • {previewSlide.type === 'video' ? 'Video' : 'Image'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false)
                  setPreviewSlide(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 미리보기 콘텐츠 */}
            <PreviewSlideContent slide={previewSlide} />

            {/* 모달 푸터 */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Color: <span className="font-semibold capitalize">{previewSlide.color}</span></span>
                  <span>Order: <span className="font-semibold">{previewSlide.order}</span></span>
                  <span>Status: <span className={`font-semibold ${previewSlide.isActive ? 'text-green-600' : 'text-gray-400'}`}>{previewSlide.isActive ? 'Active' : 'Inactive'}</span></span>
                </div>
                {previewSlide.linkUrl && (
                  <div className="text-blue-600">
                    Link: <span className="font-mono text-xs">{previewSlide.linkUrl}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 선택 모달 */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">📋 Slide Templates</h3>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Create Custom Template</h4>
                  <p className="text-xs text-gray-500">
                    {editingSlide 
                      ? `Save "${editingSlide.title}" slide as a template`
                      : 'Edit a slide first, then save it as a template'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (editingSlide) {
                      setTemplateFormData({
                        name: `${editingSlide.title} Template`,
                        description: `Template based on "${editingSlide.title}"`,
                        category: 'custom'
                      })
                      setIsSaveTemplateModalOpen(true)
                    } else {
                      showNotification('info', 'Please edit a slide first to save it as a template. Click "Add Slide" or edit an existing slide.')
                    }
                  }}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-md ${
                    editingSlide 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!editingSlide}
                  title={editingSlide ? 'Save current slide as template' : 'Please edit a slide first'}
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Save Current Slide as Template
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {heroSlideTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      {template.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        template.category === 'product' ? 'bg-blue-100 text-blue-800' :
                        template.category === 'event' ? 'bg-pink-100 text-pink-800' :
                        template.category === 'promotion' ? 'bg-green-100 text-green-800' :
                        template.category === 'seasonal' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.category}
                      </span>
                      <span>{template.slideData.type}</span>
                      <span>{template.slideData.color}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        <strong>Title:</strong> {template.slideData.title || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>Subtitle:</strong> {template.slideData.subtitle || 'N/A'}
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewTemplate(template)
                          setIsPreviewTemplateModalOpen(true)
                        }}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                        title="Preview template"
                      >
                        <Monitor className="w-4 h-4 inline mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openModal(undefined, template)
                          setIsTemplateModalOpen(false)
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                        title="Use template"
                      >
                        <Copy className="w-4 h-4 inline mr-1" />
                        Use
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (template.isDefault) {
                            showNotification('info', 'Default templates cannot be edited. Please duplicate it first or create a custom template.')
                            return
                          }
                          setEditingTemplate(template)
                          setEditTemplateFormData({
                            name: template.name,
                            description: template.description || '',
                            category: template.category,
                            slideData: {
                              type: template.slideData.type,
                              src: template.slideData.src || '',
                              fallbackImage: template.slideData.fallbackImage || '',
                              title: template.slideData.title || '',
                              subtitle: template.slideData.subtitle || '',
                              color: template.slideData.color,
                              linkUrl: template.slideData.linkUrl || '',
                              isEventBanner: template.slideData.isEventBanner || false,
                              eventStartDate: template.slideData.eventStartDate ? new Date(template.slideData.eventStartDate).toISOString().split('T')[0] : '',
                              eventEndDate: template.slideData.eventEndDate ? new Date(template.slideData.eventEndDate).toISOString().split('T')[0] : ''
                            }
                          })
                          setIsEditTemplateModalOpen(true)
                        }}
                        className={`px-3 py-2 text-white text-sm rounded-md ${
                          template.isDefault 
                            ? 'bg-yellow-500 hover:bg-yellow-600 opacity-75 cursor-not-allowed' 
                            : 'bg-yellow-600 hover:bg-yellow-700'
                        }`}
                        title={template.isDefault ? 'Default templates cannot be edited' : 'Edit template'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (template.isDefault) {
                            showNotification('error', 'Default templates cannot be deleted.')
                            return
                          }
                          if (confirm(`Are you sure you want to delete "${template.name}" template?`)) {
                            if (onDeleteTemplate) {
                              onDeleteTemplate(template.id)
                              showNotification('success', 'Template deleted successfully!')
                            } else {
                              showNotification('error', 'Delete function is not available.')
                            }
                          }
                        }}
                        className={`px-3 py-2 text-white text-sm rounded-md ${
                          template.isDefault 
                            ? 'bg-red-500 hover:bg-red-600 opacity-75 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        title={template.isDefault ? 'Default templates cannot be deleted' : 'Delete template'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {heroSlideTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No templates available. Create your first template!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 저장 모달 */}
      {isSaveTemplateModalOpen && (editingSlide || formData.title || formData.src) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4"
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 60
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSaveTemplateModalOpen(false)
              setTemplateFormData({ name: '', description: '', category: 'custom' })
            }
          }}
        >
          <div 
            className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ 
              maxHeight: '90vh',
              position: 'relative',
              zIndex: 61
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Save className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">💾 Save as Template</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Save "{editingSlide?.title || formData.title || 'Untitled'}" slide as a reusable template
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsSaveTemplateModalOpen(false)
                    setTemplateFormData({ name: '', description: '', category: 'custom' })
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 슬라이드 미리보기 섹션 */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {(editingSlide?.type || formData.type) === 'video' ? (
                    <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6 text-purple-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {editingSlide?.title || formData.title || 'Untitled Slide'}
                  </p>
                  {(editingSlide?.subtitle || formData.subtitle) && (
                    <p className="text-xs text-gray-600 truncate mt-1">{editingSlide?.subtitle || formData.subtitle}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      (editingSlide?.color || formData.color) === 'blue' ? 'bg-blue-100 text-blue-800' :
                      (editingSlide?.color || formData.color) === 'purple' ? 'bg-purple-100 text-purple-800' :
                      (editingSlide?.color || formData.color) === 'green' ? 'bg-green-100 text-green-800' :
                      (editingSlide?.color || formData.color) === 'pink' ? 'bg-pink-100 text-pink-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {editingSlide?.color || formData.color}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      {editingSlide?.type || formData.type}
                    </span>
                    {(editingSlide?.isEventBanner || formData.isEventBanner) && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-800">
                        Event
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 폼 */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!templateFormData.name.trim()) {
                  showNotification('error', 'Template name is required.')
                  return
                }
                
                // editingSlide가 없으면 formData를 사용하여 슬라이드 데이터 생성
                const slideData = editingSlide ? {
                  type: editingSlide.type,
                  src: editingSlide.src || '',
                  fallbackImage: editingSlide.fallbackImage,
                  title: editingSlide.title || '',
                  subtitle: editingSlide.subtitle || '',
                  color: editingSlide.color,
                  linkUrl: editingSlide.linkUrl,
                  isEventBanner: editingSlide.isEventBanner || false,
                  eventStartDate: editingSlide.eventStartDate,
                  eventEndDate: editingSlide.eventEndDate
                } : {
                  type: formData.type,
                  src: formData.src || '',
                  fallbackImage: formData.fallbackImage,
                  title: formData.title || '',
                  subtitle: formData.subtitle || '',
                  color: formData.color,
                  linkUrl: formData.linkUrl,
                  isEventBanner: formData.isEventBanner || false,
                  eventStartDate: formData.eventStartDate ? new Date(formData.eventStartDate) : undefined,
                  eventEndDate: formData.eventEndDate ? new Date(formData.eventEndDate) : undefined
                }
                
                if (!onSaveTemplate) {
                  showNotification('error', 'Save template function is not available.')
                  return
                }
                
                onSaveTemplate({
                  name: templateFormData.name,
                  description: templateFormData.description,
                  category: templateFormData.category,
                  slideData: slideData
                })
                showNotification('success', 'Template saved successfully!')
                setIsSaveTemplateModalOpen(false)
                setTemplateFormData({ name: '', description: '', category: 'custom' })
              }}
              className="p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateFormData.name}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="e.g., Product Promotion Template"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Choose a descriptive name that helps you identify this template later
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={templateFormData.description}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                  rows={3}
                  placeholder="Describe when and how to use this template..."
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Add notes about this template's purpose or usage
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <select
                  value={templateFormData.category}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value as any })}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white"
                >
                  <option value="product">📦 Product</option>
                  <option value="event">🎉 Event</option>
                  <option value="promotion">🎯 Promotion</option>
                  <option value="seasonal">🍂 Seasonal</option>
                  <option value="custom">✨ Custom</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Categorize your template for easier organization
                </p>
              </div>

              {/* 정보 박스 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">💡 Template Information</p>
                    <p className="text-xs text-blue-800">
                      This template will save all slide settings (colors, text, links, etc.) but not the media file (image/video). 
                      You'll need to upload a new image/video when using this template.
                    </p>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveTemplateModalOpen(false)
                    setTemplateFormData({ name: '', description: '', category: 'custom' })
                  }}
                  className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 템플릿 편집 모달 */}
      {isEditTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">✏️ Edit Template</h3>
                <button
                  onClick={() => {
                    setIsEditTemplateModalOpen(false)
                    setEditingTemplate(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!editTemplateFormData.name.trim()) {
                  showNotification('error', 'Template name is required.')
                  return
                }
                
                if (!onUpdateTemplate) {
                  showNotification('error', 'Update function is not available.')
                  return
                }
                
                // 기본 템플릿 편집 방지
                if (editingTemplate.isDefault) {
                  showNotification('error', 'Default templates cannot be edited.')
                  return
                }
                
                onUpdateTemplate(editingTemplate.id, {
                  name: editTemplateFormData.name,
                  description: editTemplateFormData.description,
                  category: editTemplateFormData.category,
                  slideData: {
                    type: editTemplateFormData.slideData.type,
                    src: editTemplateFormData.slideData.src,
                    fallbackImage: editTemplateFormData.slideData.fallbackImage,
                    title: editTemplateFormData.slideData.title,
                    subtitle: editTemplateFormData.slideData.subtitle,
                    color: editTemplateFormData.slideData.color,
                    linkUrl: editTemplateFormData.slideData.linkUrl,
                    isEventBanner: editTemplateFormData.slideData.isEventBanner,
                    eventStartDate: editTemplateFormData.slideData.eventStartDate ? new Date(editTemplateFormData.slideData.eventStartDate) : undefined,
                    eventEndDate: editTemplateFormData.slideData.eventEndDate ? new Date(editTemplateFormData.slideData.eventEndDate) : undefined
                  }
                })
                showNotification('success', 'Template updated successfully!')
                setIsEditTemplateModalOpen(false)
                setEditingTemplate(null)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={editTemplateFormData.name}
                  onChange={(e) => setEditTemplateFormData({ ...editTemplateFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editTemplateFormData.description}
                  onChange={(e) => setEditTemplateFormData({ ...editTemplateFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={editTemplateFormData.category}
                  onChange={(e) => setEditTemplateFormData({ ...editTemplateFormData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="product">Product</option>
                  <option value="event">Event</option>
                  <option value="promotion">Promotion</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Slide Data</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={editTemplateFormData.slideData.title}
                      onChange={(e) => setEditTemplateFormData({
                        ...editTemplateFormData,
                        slideData: { ...editTemplateFormData.slideData, title: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                    <input
                      type="text"
                      value={editTemplateFormData.slideData.subtitle}
                      onChange={(e) => setEditTemplateFormData({
                        ...editTemplateFormData,
                        slideData: { ...editTemplateFormData.slideData, subtitle: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={editTemplateFormData.slideData.type}
                        onChange={(e) => setEditTemplateFormData({
                          ...editTemplateFormData,
                          slideData: { ...editTemplateFormData.slideData, type: e.target.value as 'image' | 'video' }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                      <select
                        value={editTemplateFormData.slideData.color}
                        onChange={(e) => setEditTemplateFormData({
                          ...editTemplateFormData,
                          slideData: { ...editTemplateFormData.slideData, color: e.target.value as any }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="pink">Pink</option>
                        <option value="blue">Blue</option>
                        <option value="yellow">Yellow</option>
                        <option value="purple">Purple</option>
                        <option value="green">Green</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
                    <input
                      type="text"
                      value={editTemplateFormData.slideData.linkUrl}
                      onChange={(e) => setEditTemplateFormData({
                        ...editTemplateFormData,
                        slideData: { ...editTemplateFormData.slideData, linkUrl: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="/products"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditTemplateModalOpen(false)
                    setEditingTemplate(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  Update Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 템플릿 미리보기 모달 */}
      {isPreviewTemplateModalOpen && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {previewTemplate.name} • {previewTemplate.slideData.type === 'video' ? 'Video' : 'Image'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPreviewTemplateModalOpen(false)
                  setPreviewTemplate(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 템플릿을 HeroSlide 형식으로 변환하여 미리보기 */}
            <div className="flex-1 overflow-auto">
              <PreviewSlideContent 
                slide={{
                  id: previewTemplate.id,
                  type: previewTemplate.slideData.type,
                  src: previewTemplate.slideData.src || '',
                  fallbackImage: previewTemplate.slideData.fallbackImage,
                  title: previewTemplate.slideData.title,
                  subtitle: previewTemplate.slideData.subtitle,
                  color: previewTemplate.slideData.color,
                  order: 1,
                  isActive: true,
                  createdAt: previewTemplate.createdAt,
                  updatedAt: previewTemplate.updatedAt,
                  linkUrl: previewTemplate.slideData.linkUrl,
                  isEventBanner: previewTemplate.slideData.isEventBanner,
                  eventStartDate: previewTemplate.slideData.eventStartDate,
                  eventEndDate: previewTemplate.slideData.eventEndDate
                }}
              />
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Category: <span className="font-semibold capitalize">{previewTemplate.category}</span></span>
                  <span>Color: <span className="font-semibold capitalize">{previewTemplate.slideData.color}</span></span>
                  <span>Type: <span className="font-semibold capitalize">{previewTemplate.slideData.type}</span></span>
                </div>
                {previewTemplate.slideData.linkUrl && (
                  <div className="text-blue-600">
                    Link: <span className="font-mono text-xs">{previewTemplate.slideData.linkUrl}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

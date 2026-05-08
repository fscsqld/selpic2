'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useStore, Product } from '@/lib/store'
import { useUserAuth } from '@/lib/userAuth'
import { useTranslation } from '@/lib/useTranslation'
import { useContentStore } from '@/lib/contentStore'
import { Type, Palette, Package, ShoppingCart, ArrowRight, ChevronDown, ChevronUp, X, AlertCircle, Minus, Plus } from 'lucide-react'
import Header from '@/components/Header'
import { getStickerFonts, getEffectiveFont, containsKorean, type FontConfig } from '@/lib/fontList'

const DEFAULT_BG_IMAGE = '/images/STICKER1.jpg'

// 시트지 영어 이름: 한 줄에 8자 권장 (2줄일 때 줄당 8자, 총 16자)
const NAME_MAX_LETTERS = 9
// 6자 이하: 기본 크기. 7자 이상: 글자 수에 따라 자동 축소하여 한 줄에 표시.
const getSheetNameFontSize = (len: number) => (len <= 6 ? 21 : Math.max(11, Math.round((21 * 5) / len)))
const getCanvasNameFontSize = (len: number) => (len <= 6 ? 24 : Math.max(12, Math.round((24 * 5) / len)))
// 2줄 선택 시 추가 요금 (상품별 twoLineSurcharge 미설정 시 기본값)
const DEFAULT_TWO_LINE_SURCHARGE = 2

// 학습: 대형(Large)·특대형(Extra Large)·중형(Medium)은 2줄(이름 + 소속) 지원. 고객 커스텀 시 두 줄 입력·시트 표기 적용.

// Suspense wrapper for useSearchParams
export default function StickerCustomizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <StickerCustomizeContent />
    </Suspense>
  )
}

function StickerCustomizeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { products, addToCart, _hasHydrated } = useStore()
  const { isLoggedIn, isDemo } = useUserAuth()
  const { t } = useTranslation()
  const categoryItems = useContentStore(s => s.categoryItems)
  const getActiveCategoryItems = useContentStore(s => s.getActiveCategoryItems)
  
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(DEFAULT_BG_IMAGE)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [resolvedProductImage, setResolvedProductImage] = useState<string | null>(null)
  // Double-line 전용 입력 상태 (Option 1/2 공통: 소속/이름/전화 분리)
  const [twoLineAffiliation, setTwoLineAffiliation] = useState('')
  const [twoLineName, setTwoLineName] = useState('Emily')
  const [twoLinePhone, setTwoLinePhone] = useState('')
  // ✅ 시트 이미지에서 "라벨 1장"만 추출한 이미지 (각 박스에 1장씩 동일하게 넣기)
  const [singleLabelImage, setSingleLabelImage] = useState<string | null>(null)
  const [customText, setCustomText] = useState('Emily')
  const [selectedFont, setSelectedFont] = useState('andika') // Font 1 (Andika) default
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  /** Lines added to cart / checkout from this page (cart page can still change qty later) */
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [customizedImage, setCustomizedImage] = useState<string | null>(null)
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }) // 텍스트 위치 (퍼센트)
  const [textSize, setTextSize] = useState(14) // 텍스트 크기 (9자 한 줄에 맞춤)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [previewDisplayWidth, setPreviewDisplayWidth] = useState(260)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [mobilePreviewMode, setMobilePreviewMode] = useState<'sheet' | 'product'>('sheet')
  const [isFontGuideOpen, setIsFontGuideOpen] = useState(false)
  // 1줄 / 2줄 모드 선택 (기본: 1줄)
  const [lineMode, setLineMode] = useState<'single' | 'two'>('single')
  // 2줄 형식: 옵션1 소속+이름, 옵션2 이름+전화번호
  const [twoLineFormat, setTwoLineFormat] = useState<'affiliation-name' | 'name-phone'>('affiliation-name')
  const [openSections, setOpenSections] = useState({
    text: true,
    font: true,
    color: true
  })
  
  // SET 상품용: 각 아이템별 커스터마이징 상태 (각 아이템마다 다른 디자인 선택 가능)
  const [setItems, setSetItems] = useState<Array<{
    selectedDesign: Product | null // 각 아이템마다 선택한 디자인(스티커 상품)
    text: string
    font: string
    color: string
    customizedImage: string | null
    textPosition: { x: number; y: number }
    textSize: number
  }>>([])

  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updatePreviewWidth = () => {
      const w = window.innerWidth
      setIsMobileViewport(w < 640)
      if (w < 480) setPreviewDisplayWidth(180)
      else if (w < 640) setPreviewDisplayWidth(220)
      else if (w < 1024) setPreviewDisplayWidth(210)
      else setPreviewDisplayWidth(260)
    }
    updatePreviewWidth()
    window.addEventListener('resize', updatePreviewWidth)
    return () => window.removeEventListener('resize', updatePreviewWidth)
  }, [])
  const isMobilePreview = isMobileViewport

  useEffect(() => {
    const categories = getActiveCategoryItems()
    const customDesign = categories.find((c: { title?: string }) => c.title === 'Custom Design')
    const bg = customDesign?.backgroundImage?.trim()
    if (!bg || bg.startsWith('indexeddb://')) {
      setBackgroundImageUrl(DEFAULT_BG_IMAGE)
      return
    }
    setBackgroundImageUrl(bg)
  }, [categoryItems, getActiveCategoryItems])

  // URL ?product= 복원: 새로고침 시 같은 상품 유지. products 미로드 시에는 선택을 지우지 않음(일부만 보이는 현상 방지)
  useEffect(() => {
    if (!isMounted) return
    
    const productId = searchParams.get('product')
    
    if (!productId) {
      setSelectedProduct(null)
      setSetItems([])
      return
    }

    if (products.length === 0) return

      const product = products.find(p => p.id === productId && p.category === 'Stickers')
      if (product) {
        setSelectedProduct(product)
      setCustomText('Emily')
        
        if (product.subcategory === 'Set') {
          const itemCount = (product as any).setItemCount ?? 3
          setSetItems(Array(itemCount).fill(null).map(() => ({
          selectedDesign: null,
          text: 'Emily',
          font: 'andika',
          color: '#000000',
            customizedImage: null,
            textPosition: { x: 50, y: 50 },
          textSize: 14
          })))
        } else {
          setSetItems([])
        }
    } else {
      setSelectedProduct(null)
      setSetItems([])
    }
  }, [searchParams, products, isMounted])

  const productIdFromUrl = searchParams.get('product')
  const wouldWaitForRestore = Boolean(
    productIdFromUrl && (!_hasHydrated || products.length === 0)
  )
  useEffect(() => {
    if (!wouldWaitForRestore) {
      setLoadingTimeout(false)
      return
    }
    const t = setTimeout(() => setLoadingTimeout(true), 2500)
    return () => clearTimeout(t)
  }, [wouldWaitForRestore])

  const restoredProduct = useMemo(() => {
    const id = searchParams.get('product')
    if (!id || products.length === 0) return null
    return products.find(p => p.id === id && p.category === 'Stickers') ?? null
  }, [searchParams, products])
  const displayProduct = selectedProduct ?? restoredProduct

  const sizeNorm = displayProduct?.size ? String(displayProduct.size).trim().toLowerCase() : ''
  const sizeNormCompact = sizeNorm.replace(/\s+/g, '')
  const isMedium30x13 =
    (sizeNorm.includes('medium') || sizeNorm.includes('중형')) &&
    /30mm[x×]13mm/.test(sizeNormCompact)
  const supportsTwoLinesForDisplayProduct =
    (sizeNorm.includes('extra large') || sizeNorm.includes('특대형')) ||
    // Large (but not Extra Large)
    ((sizeNorm.includes('large') || sizeNorm.includes('대형')) && !(sizeNorm.includes('extra large') || sizeNorm.includes('특대형'))) ||
    // Medium only when NOT 30×13mm
    ((sizeNorm.includes('medium') || sizeNorm.includes('중형')) && !isMedium30x13)

  const getCustomizationPrice = (): number => {
    if (!displayProduct) return 20.00
    let total = displayProduct.price
    const usesTwoLines = supportsTwoLinesForDisplayProduct && lineMode === 'two'
    if (usesTwoLines) {
      const surcharge = typeof (displayProduct as { twoLineSurcharge?: number }).twoLineSurcharge === 'number'
        ? (displayProduct as { twoLineSurcharge: number }).twoLineSurcharge
        : DEFAULT_TWO_LINE_SURCHARGE
      total += surcharge
    }
    return total
  }

  // 디자인 통계 계산
  const designStats = (() => {
    const characters = customText.replace(/\n/g, '').length
    const maxCharacters = 50

    // 완료도 계산
    let steps = 0
    let done = 0

    // 텍스트 입력
    steps += 1
    if (customText.trim().length > 0) done += 1

    // 폰트 선택
    steps += 1
    if (selectedFont) done += 1

    // 색상 선택
    steps += 1
    if (selectedColor) done += 1

    // 제품 선택
    steps += 1
    if (displayProduct) done += 1

    const completion = steps > 0 ? Math.floor((done / steps) * 100) : 0

    return {
      characters,
      maxCharacters,
      completion,
      price: getCustomizationPrice()
    }
  })()

  // ✅ 공통 FONT_LIST에서 스티커용 폰트만 필터링하여 사용
  const stickerFonts = getStickerFonts()
  
  // ✅ 선택한 폰트 ID로 실제 폰트 정보 가져오기 (fallback 처리 포함)
  const getCurrentFont = (): FontConfig => {
    return getEffectiveFont(selectedFont, customText)
  }

  // ✅ 스티커 폰트 표시 이름 (Font 1=Andika, 2~7)
  const STICKER_FONT_DISPLAY_NAMES: Record<string, string> = {
    'andika': 'Font 1',
    'edu-nsw-act-foundation': 'Font 2',
    'edu-au-vic-wa-nt-hand': 'Font 3',
    'edu-sa-beginner': 'Font 4',
    'edu-tas-beginner': 'Font 5',
    'k-round-joy': 'Font 6',
    'nanum-myeongjo': 'Font 7'
  }
  const getStickerFontLabel = (fontId: string): string => {
    return STICKER_FONT_DISPLAY_NAMES[fontId] ?? getEffectiveFont(fontId, '').displayName
  }

  // Font Style Guide: Font 1=Andika, 2~5=기존 폰트 순서 이동
  const fontGuideData = [
    {
      id: 'andika',
      name: 'Font 1',
      description: 'Andika is a humanist sans-serif font widely preferred in Queensland (QLD) for clear, easy-to-read printing. Designed for literacy and education contexts in Queensland—clear, friendly, and highly legible at small sizes. Supports Latin and many other scripts; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Queensland schools and families, school labels, readable name tags, professional and friendly designs'
    },
    {
      id: 'nanum-myeongjo',
      name: 'Font 7',
      description: 'Font 7 uses Gungsuh (궁서체) style first, with Nanum Myeongjo as fallback. Elegant, formal, and readable with a classic calligraphy feel. Supports both Korean and English. Compared with Font 6 (Jua), Font 7 focuses on a more serious, traditional look suitable for formal name labels rather than playful designs.',
      recommendedUse: 'Name stickers, formal labels, certificates, traditional and elegant designs where a more serious serif style is preferred over rounded playful fonts like Font 6.'
    },
    {
      id: 'edu-nsw-act-foundation',
      name: 'Font 2',
      description: 'Edu NSW ACT Foundation is a handwriting font designed for Australian education standards. It is the official foundation font for the New South Wales (NSW) and Australian Capital Territory (ACT) regions. Sincere, childlike, and active in feel—ideal for name labels and school use in NSW and ACT. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for NSW & ACT schools and families, children\'s labels, educational and regional preference'
    },
    {
      id: 'edu-au-vic-wa-nt-hand',
      name: 'Font 3',
      description: 'Edu AU VIC WA NT Hand is the official handwriting font for the Victoria (VIC), Western Australia (WA), and Northern Territory (NT) regions. Designed for Australian school standards in these regions—ideal for name labels and school use in VIC, WA & NT. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Victoria, Western Australia & Northern Territory schools and families, children\'s labels, regional preference'
    },
    {
      id: 'edu-sa-beginner',
      name: 'Font 4',
      description: 'Edu SA Beginner is a handwriting font from the Foundation Fonts for Australian Schools collection, designed specifically for South Australia (SA). It uses a sloped print style with a sincere, childlike feel—ideal for beginner handwriting and name labels in South Australian schools. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for South Australia schools and families, beginner handwriting labels, regional preference for SA'
    },
    {
      id: 'edu-tas-beginner',
      name: 'Font 5',
      description: 'Edu TAS Beginner is a handwriting font representing the precursive print style used in Tasmanian (TAS) schools. Designed for early handwriting education in Tasmania—clean, simple, and easy for children to follow. Supports Latin; for Korean text a fallback font is used.',
      recommendedUse: 'Name stickers and labels for Tasmania schools and families, beginner handwriting labels, regional preference for TAS'
    },
    {
      id: 'k-round-joy',
      name: 'Font 6',
      description: 'Jua (K-Round Joy) is a popular Korean rounded sans-serif font with a friendly, playful look. Widely used in Korea for children\'s books, signage, and casual designs. Fully supports Korean and English, making it ideal for name stickers that need clear Hangul and Latin characters. Compared with Font 7 (Nanum Myeongjo), Font 6 is much more casual and playful, better suited for kids and fun designs rather than formal or traditional labels.',
      recommendedUse: 'Name stickers and labels for Korean-speaking families, children\'s labels, playful and friendly designs requiring clear Hangul support, especially when a more casual alternative to the formal serif style of Font 7 is desired.'
    }
  ]
  
  const colors = ['#000000']

  // HEX 코드를 색상 이름으로 변환
  const getColorName = (hex: string): string => {
    const colorMap: { [key: string]: string } = {
      '#000000': 'BLACK',
      '#3B82F6': 'BLUE',
      '#EF4444': 'RED',
      '#10B981': 'GREEN',
      '#F59E0B': 'YELLOW',
      '#8B5CF6': 'PURPLE',
      '#EC4899': 'PINK',
      '#06B6D4': 'CYAN',
      '#84CC16': 'LIME'
    }
    return colorMap[hex.toUpperCase()] || hex
  }
  // ✅ 관리자가 Product Management에서 등록한 상품의 size·price를 기본으로 사용.
  // 학습: 시트지 수량(stickerSheetQuantity) — 가격은 3장 기준, 기본 3장. 관리자 미설정 시 모든 커스텀 네임스티커에 적용. 상품 등록·폼·상품 이미지에 표기.
  const fixedSize = displayProduct?.size
    ? {
        id: displayProduct.size.toLowerCase().replace(/\s+/g, '-'),
        name: displayProduct.size,
        price: typeof displayProduct.price === 'number' ? displayProduct.price : 20.00
      }
    : { id: 'medium', name: 'Medium', price: 20.00 }

  // ✅ 관리자가 상품 등록 시 치수(가로·세로·열·행·간격)를 입력한 경우 그 값을 기본으로 사용.
  const useProductStickerDims =
    displayProduct &&
    typeof (displayProduct as any).stickerWidthMm === 'number' &&
    typeof (displayProduct as any).stickerHeightMm === 'number' &&
    typeof (displayProduct as any).stickerCols === 'number' &&
    typeof (displayProduct as any).stickerRows === 'number'
  const productGapMm = typeof (displayProduct as any)?.stickerGapMm === 'number' ? (displayProduct as any).stickerGapMm : 2

  // 시트지 크기는 동일(약 96×138mm), 라벨 개수·배치만 다름. cols×rows에 따라 셀 크기 역산.
  // 중형 홀로그램: 30mm×15mm per label (3×8 = 24 labels). 특대형 2×6, 대형 2×8, 소형 4×12, 원형 3×4.
  const NAME_LABEL_SPEC = {
    'Extra Large': { cols: 2, rows: 6, gapMm: 2 },   // 12 labels
    'Large': { cols: 2, rows: 8, gapMm: 2 },         // 16 labels
    'Medium': { cols: 3, rows: 8, gapMm: 2 },       // 24 labels, 30×15mm
    'Small': { cols: 4, rows: 12, gapMm: 2 },       // 48 labels
    'Round': { cols: 3, rows: 4, gapMm: 2 },       // 12 labels
    'Mixed': { cols: 2, rows: 6, gapMm: 2 },      // 혼합형: 동일 시트 크기, 시트 내 혼합 레이아웃 → 추후 상세 설정
    '혼합형': { cols: 2, rows: 6, gapMm: 2 },      // Mixed와 동일
    'Two Line': { cols: 2, rows: 6, gapMm: 2 },   // 두 줄: 1줄=이름, 2줄=소속 표기 (레이아웃·입력 UI 추후 구현)
    '두줄': { cols: 2, rows: 6, gapMm: 2 }        // Two Line과 동일, "이름 + 소속" 네임스티커
  } as const
  const rawSpec = displayProduct?.size && NAME_LABEL_SPEC[displayProduct.size as keyof typeof NAME_LABEL_SPEC]
    ? NAME_LABEL_SPEC[displayProduct.size as keyof typeof NAME_LABEL_SPEC]
    : NAME_LABEL_SPEC['Medium']
  const STANDARD_CONTENT_WIDTH_MM = 92
  const STANDARD_CONTENT_HEIGHT_MM = 136
  const normalizedSize = String(displayProduct?.size || '').trim().toLowerCase()
  const isExtraLargeSheet = normalizedSize.includes('extra large') || normalizedSize.includes('특대형')
  const isLargeSheet = (normalizedSize.includes('large') || normalizedSize.includes('대형')) && !isExtraLargeSheet
  const isMediumSheet = normalizedSize.includes('medium') || normalizedSize.includes('중형')

  let contentWidthMm: number
  let contentHeightMm: number
  let stickerSpec: { cols: number; rows: number; gapMm: number; widthMm: number; heightMm: number }

  if (useProductStickerDims && displayProduct) {
    const w = (displayProduct as any).stickerWidthMm
    const h = (displayProduct as any).stickerHeightMm
    const cols = (displayProduct as any).stickerCols
    const rows = (displayProduct as any).stickerRows
    const gapMm = productGapMm
    contentWidthMm = w * cols + gapMm * (cols - 1)
    contentHeightMm = h * rows + gapMm * (rows - 1)
    stickerSpec = { cols, rows, gapMm, widthMm: w, heightMm: h }
  } else {
    // Medium (중형 홀로그램): 30×15mm per label; Large: 45×15mm 등 프리셋 기준
    contentWidthMm = isMediumSheet ? 94 : STANDARD_CONTENT_WIDTH_MM
    // 중형 3×8 시트: 셀 높이 15mm → contentHeight = 15*8 + 2*7 = 134
    contentHeightMm = isLargeSheet ? 134 : (isMediumSheet ? 134 : STANDARD_CONTENT_HEIGHT_MM)
    let widthMm = (contentWidthMm - (rawSpec.cols - 1) * rawSpec.gapMm) / rawSpec.cols
    let heightMm = (contentHeightMm - (rawSpec.rows - 1) * rawSpec.gapMm) / rawSpec.rows
    if (isLargeSheet) heightMm = 15
    stickerSpec = { ...rawSpec, widthMm, heightMm }
  }

  const totalCells = stickerSpec.cols * stickerSpec.rows
  // 대형·특대형·중형(단, 30×13mm 제외): 2줄(1줄=이름, 2줄=소속/전화) 지원
  const supportsTwoLines = supportsTwoLinesForDisplayProduct
  const twoLineMaxChars = 18
  const twoLinePhoneMaxChars = 10
  const twoLineNamePhoneMaxChars = 19
  // When true, sticker design has an image (e.g. icon on left); text is placed so it does not overlap.
  const stickerHasImage = !!(displayProduct as any)?.stickerHasImage
  // ✅ 실제 시트 크기 (mm): 위·아래·왼쪽·오른쪽 여백 포함. 좌우 2mm씩, 위아래 절단면 1mm씩 → 96×138
  const sheetMarginLeftMm = 2
  const sheetMarginRightMm = 2
  const sheetMarginTopMm = 1
  const sheetMarginBottomMm = 1
  const actualSheetWidthMm = contentWidthMm + sheetMarginLeftMm + sheetMarginRightMm
  const actualSheetHeightMm = contentHeightMm + sheetMarginTopMm + sheetMarginBottomMm
  // ✅ Live Preview를 "실제 시트 크기"로 보이게 하는 비율 (15인치 화면 기준 학습)
  // - 이전에 PX_PER_MM = 5 를 쓰면 96mm → 480px, 138mm → 690px 로 그려져서
  //   웹 표준 96 DPI(1 inch = 96px, 즉 1mm ≈ 3.78px)보다 약 1.32배 커 보임.
  // - 15인치 1920×1080 기준: 화면 가로 약 332mm → 96mm가 실제 크기면 화면의 약 29%.
  //   PX_PER_MM=5일 때 480px은 1920의 25%지만, 96 DPI 기준 "실제 96mm"는 363px이므로
  //   우리가 480px로 그려서 더 크게 보였음.
  // - 따라서 1mm = 96/25.4 px (웹 표준) 로 맞추면 모니터에서 실제 치수에 가깝게 보임.
  const PX_PER_MM = 96 / 25.4
  const actualSheetWidthPx = actualSheetWidthMm * PX_PER_MM
  const actualSheetHeightPx = actualSheetHeightMm * PX_PER_MM
  const cellWidthPx = stickerSpec.widthMm * PX_PER_MM
  const cellHeightPx = stickerSpec.heightMm * PX_PER_MM
  // Extra Large만 박스 세로를 10% 줄여 표시
  const cellHeightDisplayPx = isExtraLargeSheet ? cellHeightPx * 0.90 : cellHeightPx
  const gapPx = stickerSpec.gapMm * PX_PER_MM
  const paddingLeftPx = sheetMarginLeftMm * PX_PER_MM
  const paddingRightPx = sheetMarginRightMm * PX_PER_MM
  const paddingTopPx = sheetMarginTopMm * PX_PER_MM
  const paddingBottomPx = sheetMarginBottomMm * PX_PER_MM

  const resolveImageUrl = useCallback(async (imageUrl: string): Promise<string> => {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'undefined') {
      throw new Error('Invalid image URL')
    }
    if (imageUrl.startsWith('indexeddb://')) {
      throw new Error('Legacy indexeddb:// product image — re-upload image in Admin.')
    }
    return imageUrl
  }, [])

  // ✅ displayProduct(복원 포함).image를 blob URL로 변환 — 새로고침 시에도 이미지 표시
  useEffect(() => {
    const loadProductImage = async () => {
      if (!displayProduct || !displayProduct.image) {
        setResolvedProductImage(null)
        setSingleLabelImage(null)
        return
      }

      try {
        const resolvedUrl = await resolveImageUrl(displayProduct.image)
        setResolvedProductImage(resolvedUrl)
      } catch (error) {
        console.error('Failed to resolve product image:', error)
        setResolvedProductImage(null)
        setSingleLabelImage(null)
      }
    }

    loadProductImage()
  }, [displayProduct, resolveImageUrl])

  // ✅ 시트(전체) 이미지에서 "라벨 1칸"을 추출해 모든 박스에 넣기 위한 이미지 생성
  useEffect(() => {
    let cancelled = false

    async function buildSingleLabel() {
      if (!resolvedProductImage) {
        setSingleLabelImage(null)
        return
      }

      // ✅ 홀로그램 상품: 시트를 자르지 않고 대표 이미지를 그대로 한 장으로 사용
      if (
        displayProduct &&
        displayProduct.name &&
        displayProduct.name.toLowerCase().includes('holographic')
      ) {
        if (!cancelled) {
          setSingleLabelImage(resolvedProductImage)
        }
        return
      }

      // stickerSpec은 렌더 과정에서 계산되므로 여기서는 존재한다고 가정
      const cols = stickerSpec?.cols
      const rows = stickerSpec?.rows
      if (!cols || !rows || cols <= 0 || rows <= 0) {
        setSingleLabelImage(null)
        return
      }

      try {
        const img = new Image()
        // blob/data URL은 상관없지만, 외부 URL일 경우를 대비
        img.crossOrigin = 'anonymous'
        const loaded: HTMLImageElement = await new Promise((resolve, reject) => {
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error('Failed to load image for single-label extraction'))
          img.src = resolvedProductImage
        })

        const sw = Math.floor(loaded.naturalWidth / cols)
        const sh = Math.floor(loaded.naturalHeight / rows)
        if (sw <= 0 || sh <= 0) {
          setSingleLabelImage(null)
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setSingleLabelImage(null)
          return
        }

        // 첫 번째 칸(좌상단)을 라벨 1장으로 사용
        ctx.drawImage(loaded, 0, 0, sw, sh, 0, 0, sw, sh)
        const url = canvas.toDataURL('image/png')
        if (!cancelled) setSingleLabelImage(url)
      } catch (e) {
        console.warn('Single label extraction failed; falling back to per-cell slicing.', e)
        if (!cancelled) setSingleLabelImage(null)
      }
    }

    buildSingleLabel()
    return () => {
      cancelled = true
    }
    // stickerSpec는 객체라 deps에 넣기 애매하므로 cols/rows에 의존 + 어떤 상품인지도 고려
  }, [resolvedProductImage, stickerSpec?.cols, stickerSpec?.rows, displayProduct])

  // 커스터마이징된 이미지 생성 (Canvas 사용)
  const MAX_CANVAS_DIMENSION = 600

  const generateCustomizedImage = useCallback(async () => {
    // 서버 사이드에서는 실행하지 않음
    if (typeof window === 'undefined' || !displayProduct) return null

    return new Promise<string>(async (resolve, reject) => {
      try {
        let imageUrl = displayProduct.image
        if (imageUrl && imageUrl.startsWith('indexeddb://')) {
          reject(new Error('Legacy indexeddb:// product image — re-upload in Admin.'))
          return
        }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            let targetWidth = img.width
            let targetHeight = img.height

            // 이미지 크기를 최대 캔버스 크기에 맞게 조정
            if (targetWidth > targetHeight && targetWidth > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetWidth
              targetWidth = MAX_CANVAS_DIMENSION
              targetHeight = Math.max(1, Math.round(targetHeight * scale))
            } else if (targetHeight >= targetWidth && targetHeight > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetHeight
              targetHeight = MAX_CANVAS_DIMENSION
              targetWidth = Math.max(1, Math.round(targetWidth * scale))
            }

            canvas.width = targetWidth
            canvas.height = targetHeight

            // 스케일링된 크기로 이미지 그리기
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

            // ✅ 텍스트 스타일 설정 (한글 fallback 처리). 6자 미만=기본크기, 6자 이상=자동 축소. 두 줄 시 긴 줄 기준
            const linesForLen = customText.split('\n').map(l => l.trim().length)
            const nameLen = linesForLen.length > 1 ? Math.max(...linesForLen, 1) : (customText.trim().length || 1)
            const fontSize = getCanvasNameFontSize(nameLen)
            const effectiveFont = getEffectiveFont(selectedFont, customText)
            ctx.font = `bold ${fontSize}px ${effectiveFont.fontFamily}`
            ctx.fillStyle = selectedColor
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            // 텍스트 위치 계산 (퍼센트를 픽셀로 변환)
            const textX = (canvas.width * textPosition.x) / 100
            const textY = (canvas.height * textPosition.y) / 100

            // 텍스트 그리기 (여러 줄 지원)
            const lines = customText.split('\n')
            const lineHeight = fontSize * 1.2
            const startY = textY - ((lines.length - 1) * lineHeight) / 2

            lines.forEach((line, index) => {
              if (line.trim()) {
                ctx.fillText(line, textX, startY + index * lineHeight)
              }
            })

            // Canvas를 base64 이미지로 변환
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            resolve(dataUrl)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = imageUrl
      } catch (error) {
        reject(error)
      }
    })
  }, [displayProduct, customText, selectedFont, selectedColor, textPosition])

  // 커스터마이징 변경 시 이미지 재생성 (클라이언트에서만)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (displayProduct && customText.trim()) {
      generateCustomizedImage()
        .then(setCustomizedImage)
        .catch((error) => {
          console.error('Error generating customized image:', error)
          setCustomizedImage(null)
        })
    } else {
      setCustomizedImage(null)
    }
  }, [displayProduct, customText, selectedFont, selectedColor, textPosition, generateCustomizedImage])

  const handleAddToCartAndCheckout = async () => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    if (!displayProduct) {
      alert('Please select a product first')
      return
    }

    setIsAddingToCart(true)

    // SET 상품인 경우
    if (displayProduct.subcategory === 'Set') {
      // 모든 아이템이 디자인을 선택했는지 확인
      const allDesignsSelected = setItems.every(item => item.selectedDesign !== null)
      if (!allDesignsSelected) {
        alert('Please select a design for all items in the set')
        setIsAddingToCart(false)
        return
      }

      const customizations: Record<string, string> = {
        size: fixedSize.name,
        setType: 'set'
      }
      
      // 각 아이템의 커스터마이징 정보와 선택한 디자인 저장
      for (let index = 0; index < setItems.length; index++) {
        const item = setItems[index]
        if (!item.selectedDesign) continue

        // 각 아이템의 커스터마이징된 이미지 생성
        const customizedImg = await generateSetItemCustomizedImage(item.selectedDesign, {
          text: item.text,
          font: item.font,
          color: item.color,
          textPosition: item.textPosition,
          textSize: item.textSize
        })

        customizations[`item${index + 1}_designId`] = item.selectedDesign.id
        customizations[`item${index + 1}_designName`] = item.selectedDesign.name
        customizations[`item${index + 1}_text`] = item.text
        customizations[`item${index + 1}_font`] = item.font
        customizations[`item${index + 1}_color`] = item.color
        if (customizedImg) {
          customizations[`item${index + 1}_customizedImage`] = customizedImg
        }
      }
      
      // SET 상품의 원래 가격 유지
      const cartItem = {
        product: selectedProduct ?? displayProduct,
        quantity: orderQuantity,
        customizations
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      setIsAddingToCart(false)
      
      if (success) {
        router.push('/checkout')
      } else {
        alert('Failed to add item to cart')
      }
      return
    }

    // 일반 상품인 경우 (기존 로직)
    const customizedImg = await generateCustomizedImage()
    
    const customizations: Record<string, string> = {
      text: customText,
      font: selectedFont,
      color: selectedColor,
      size: fixedSize.name
    }

    // 2줄 옵션 선택 시: 장바구니/결제 금액에 추가 요금 반영 (명시적 금액 + 표시용 라벨)
    if (supportsTwoLines && lineMode === 'two') {
      const baseProduct = (selectedProduct ?? displayProduct) as { twoLineSurcharge?: number }
      const surcharge =
        typeof baseProduct.twoLineSurcharge === 'number'
          ? baseProduct.twoLineSurcharge
          : DEFAULT_TWO_LINE_SURCHARGE
      const optionLabel =
        twoLineFormat === 'name-phone'
          ? '2 lines (Name & Phone)'
          : '2 lines (Affiliation & Name)'
      customizations.twoLineOption = `${optionLabel} +$${surcharge.toFixed(2)}`
      // 장바구니/결제 합계에서 확실히 반영되도록 숫자만 별도 저장 (문자열 파싱 실패 방지)
      customizations.twoLineSurchargeAmount = String(surcharge)
    }
    
    if (customizedImg) {
      customizations.customizedImage = customizedImg
    }
    
    const cartItem = {
      product: selectedProduct ?? displayProduct,
      quantity: orderQuantity,
      customizations
    }

    const success = addToCart(cartItem, isLoggedIn)
    
    setIsAddingToCart(false)
    
    if (success) {
      router.push('/checkout')
    } else {
      alert('Failed to add item to cart')
    }
  }

  // SET 아이템의 커스터마이징된 이미지 생성
  const generateSetItemCustomizedImage = useCallback(async (designProduct: Product, customization: {
    text: string
    font: string
    color: string
    textPosition: { x: number; y: number }
    textSize: number
  }) => {
    if (typeof window === 'undefined' || !designProduct) return null

    let imageUrl = designProduct.image
    if (imageUrl && imageUrl.startsWith('indexeddb://')) {
      throw new Error('Legacy indexeddb:// product image — re-upload in Admin.')
    }

    return new Promise<string>((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          try {
            let targetWidth = img.width
            let targetHeight = img.height

            if (targetWidth > targetHeight && targetWidth > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetWidth
              targetWidth = MAX_CANVAS_DIMENSION
              targetHeight = Math.max(1, Math.round(targetHeight * scale))
            } else if (targetHeight >= targetWidth && targetHeight > MAX_CANVAS_DIMENSION) {
              const scale = MAX_CANVAS_DIMENSION / targetHeight
              targetHeight = MAX_CANVAS_DIMENSION
              targetWidth = Math.max(1, Math.round(targetWidth * scale))
            }

            canvas.width = targetWidth
            canvas.height = targetHeight

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

            // ✅ SET 아이템 폰트 설정 (한글 fallback 처리). 6자 미만=기본크기, 6자 이상=자동 축소
            const nameLen = customization.text.replace(/\n/g, '').trim().length
            const fontSize = getCanvasNameFontSize(nameLen)
            const effectiveFont = getEffectiveFont(customization.font, customization.text)
            ctx.font = `bold ${fontSize}px ${effectiveFont.fontFamily}`
            ctx.fillStyle = customization.color
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'

            const textX = (canvas.width * customization.textPosition.x) / 100
            const textY = (canvas.height * customization.textPosition.y) / 100

            const lines = customization.text.split('\n')
            const lineHeight = fontSize * 1.2
            const startY = textY - ((lines.length - 1) * lineHeight) / 2

            lines.forEach((line, index) => {
              if (line.trim()) {
                ctx.fillText(line, textX, startY + index * lineHeight)
              }
            })

            const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
            resolve(dataUrl)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }

        img.src = imageUrl
      } catch (error) {
        reject(error)
      }
    })
  }, [])

  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart')
      router.push('/login')
      return
    }

    if (isDemo) {
      alert('Demo accounts cannot make purchases. Please create a real account.')
      return
    }

    if (!displayProduct) {
      alert('Please select a product first')
      return
    }

    // SET 상품인 경우
    if (displayProduct.subcategory === 'Set') {
      // 모든 아이템이 디자인을 선택했는지 확인
      const allDesignsSelected = setItems.every(item => item.selectedDesign !== null)
      if (!allDesignsSelected) {
        alert('Please select a design for all items in the set')
        return
      }

      const customizations: Record<string, string> = {
        size: fixedSize.name,
        setType: 'set'
      }
      
      // 각 아이템의 커스터마이징 정보와 선택한 디자인 저장
      for (let index = 0; index < setItems.length; index++) {
        const item = setItems[index]
        if (!item.selectedDesign) continue

        // 각 아이템의 커스터마이징된 이미지 생성
        const customizedImg = await generateSetItemCustomizedImage(item.selectedDesign, {
          text: item.text,
          font: item.font,
          color: item.color,
          textPosition: item.textPosition,
          textSize: item.textSize
        })

        customizations[`item${index + 1}_designId`] = item.selectedDesign.id
        customizations[`item${index + 1}_designName`] = item.selectedDesign.name
        customizations[`item${index + 1}_text`] = item.text
        customizations[`item${index + 1}_font`] = item.font
        customizations[`item${index + 1}_color`] = item.color
        if (customizedImg) {
          customizations[`item${index + 1}_customizedImage`] = customizedImg
        }
      }
      
      // SET 상품의 원래 가격 유지
      const cartItem = {
        product: selectedProduct ?? displayProduct,
        quantity: orderQuantity,
        customizations
      }

      const success = addToCart(cartItem, isLoggedIn)
      
      if (success) {
        alert('Item added to cart!')
        router.push('/cart')
      } else {
        alert('Failed to add item to cart')
      }
      return
    }

    // 일반 상품인 경우 (기존 로직)
    const customizedImg = await generateCustomizedImage()
    
    const customizations: Record<string, string> = {
      text: customText,
      font: selectedFont,
      color: selectedColor,
      size: fixedSize.name
    }
    
    if (customizedImg) {
      customizations.customizedImage = customizedImg
    }
    
    const cartItem = {
      product: selectedProduct ?? displayProduct,
      quantity: orderQuantity,
      customizations
    }

    const success = addToCart(cartItem, isLoggedIn)
    
    if (success) {
      alert('Item added to cart!')
      router.push('/cart')
    } else {
      alert('Failed to add item to cart')
    }
  }

  const waitingForRestore = wouldWaitForRestore && !loadingTimeout

  if (!isMounted || waitingForRestore) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image (Custom Design Studio와 동일 소스) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: `url('${backgroundImageUrl}')`,
          zIndex: 0
        }}
      />
      {/* 선명도 유지: 강한 오버레이 제거, 텍스트 가독용으로만 하단 얕은 그라데이션 (Custom Design Studio와 동일) */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Content */}
      <div className="relative z-10">
        <Header />
      
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Page Title — 가독성: 배경 이미지와 관계없이 텍스트가 보이도록 그림자·배경 적용 (Custom Design Studio와 동일) */}
        <div className="text-center mb-8 px-4 py-6 rounded-xl bg-black/30 backdrop-blur-sm max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Sticker Customization
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-200 max-w-2xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            {displayProduct 
              ? `Customize your ${displayProduct.name} with text and fonts`
              : 'Design your own unique sticker. You can freely choose text and font.'
            }
          </p>
        </div>

        {/* Product selection */}
        {!displayProduct && (
          <div className="bg-slate-800/90 rounded-xl shadow-2xl border border-slate-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Select Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products
                .filter((p): p is Product => p.category === 'Stickers')
                .slice(0, 6)
                .map((product) => {
                  const productId = product.id
                  const isSelected = (displayProduct as Product | null)?.id === productId
                  return (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product)
                      setCustomText('Emily')
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }`}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <h3 className="font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-slate-300">${product.price.toFixed(2)}</p>
                  </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Selected product info */}
        {displayProduct && (
          <div className="bg-slate-800/90 rounded-xl shadow-2xl border border-slate-700 p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start sm:items-center space-x-4">
                {resolvedProductImage ? (
                <img
                    src={resolvedProductImage}
                    alt={displayProduct.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                ) : (
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-white break-words">{displayProduct.name}</h2>
                  <p className="text-slate-300 text-sm sm:text-base">Size: {fixedSize.name} • ${getCustomizationPrice().toFixed(2)} • {(displayProduct as { stickerSheetQuantity?: number }).stickerSheetQuantity ?? 3} sheets</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {Number(stickerSpec.widthMm.toFixed(1))}×{Number(stickerSpec.heightMm.toFixed(1))}mm · {stickerSpec.cols}×{stickerSpec.rows} = {totalCells} labels
                    {supportsTwoLines && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        2 lines available (name + affiliation)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  setSetItems([])
                  router.push('/stickers')
                }}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Change Product
              </button>
            </div>
          </div>
        )}

        {/* SET product customization section */}
        {displayProduct && displayProduct.subcategory === 'Set' && setItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📦 Set Customization ({setItems.length} items)
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Select a different design for each item in your set. Each item can have different text and font.
            </p>
            
            <div className="space-y-6">
              {setItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Item {index + 1} of {setItems.length}
                  </h3>
                  
                  {/* Design selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Design *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {products
                        .filter((p): p is Product => 
                          p.category === 'Stickers' && 
                          p.subcategory !== 'Set' &&
                          !!p.customizationOptions && 
                          p.customizationOptions.length > 0
                        )
                        .map((designProduct) => {
                          const isSelected = item.selectedDesign?.id === designProduct.id
                          return (
                            <button
                              key={designProduct.id}
                              onClick={() => {
                                const newItems = [...setItems]
                                newItems[index].selectedDesign = designProduct
                                newItems[index].text = 'Emily'
                                setSetItems(newItems)
                              }}
                              className={`p-3 border-2 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <img
                                src={designProduct.image}
                                alt={designProduct.name}
                                className="w-full h-24 object-cover rounded mb-2"
                              />
                              <h4 className="text-xs font-semibold text-gray-900 truncate">{designProduct.name}</h4>
                            </button>
                          )
                        })}
                    </div>
                    {!item.selectedDesign && (
                      <p className="text-xs text-red-600 mt-2">Please select a design for this item</p>
                    )}
                  </div>

                  {/* Customization options - shown when design is selected */}
                  {item.selectedDesign && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Type className="w-4 h-4 inline mr-1" />
                          Text
                        </label>
                        <textarea
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...setItems]
                            newItems[index].text = e.target.value
                            setSetItems(newItems)
                          }}
                          placeholder="Enter custom text..."
                          className="w-full min-h-0 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={2}
                        />
                      </div>
                      
                      {/* Font */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Type className="w-4 h-4 inline mr-1" />
                          Font
                        </label>
                        <select
                          value={item.font}
                          onChange={(e) => {
                            const newItems = [...setItems]
                            newItems[index].font = e.target.value
                            setSetItems(newItems)
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {stickerFonts.map((font) => (
                            <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                              {getStickerFontLabel(font.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Color - Black only */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Palette className="w-4 h-4 inline mr-1" />
                          Text Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-8 h-8 rounded-lg border-2 border-gray-800 bg-black"
                            title="#000000 Black"
                          />
                          <span className="text-sm text-gray-600">Black</span>
                        </div>
                      </div>
                      
                      {/* Preview for this item */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preview
                        </label>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 h-32 flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                          <img
                            src={item.selectedDesign.image}
                            alt={item.selectedDesign.name}
                            className="w-full h-full object-contain opacity-50"
                          />
                          {item.text.trim() && (
                            <div
                              className="absolute text-center"
                              style={{
                                fontFamily: item.font,
                                color: item.color,
                                fontSize: '16px',
                                fontWeight: 'bold',
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                                whiteSpace: 'pre-line',
                                maxWidth: '90%',
                                wordBreak: 'break-word'
                              }}
                            >
                              {item.text}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single product: main layout */}
        {displayProduct && displayProduct.subcategory !== 'Set' && (
          <div className={`flex flex-col md:flex-row gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'md:max-w-[1000px]' : ''}`}>
            {/* Left: Preview Area */}
            <div className={`flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700 transition-all relative ${isSidebarCollapsed ? 'md:max-w-none' : ''}`}>
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute top-4 right-4 bg-blue-600/80 hover:bg-blue-600 border-none rounded-lg w-9 h-9 text-white font-bold cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-105"
                title="Toggle Sidebar"
              >
                <span>{isSidebarCollapsed ? '▶' : '◀'}</span>
              </button>

              {/* Preview Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl mb-4">
                <h3 className="text-xl font-bold text-center">Live Preview</h3>
                {isMobilePreview && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobilePreviewMode('sheet')}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        mobilePreviewMode === 'sheet'
                          ? 'bg-white text-blue-700 border-white'
                          : 'bg-blue-800/40 text-white border-blue-300/50'
                      }`}
                    >
                      Sheet Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePreviewMode('product')}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        mobilePreviewMode === 'product'
                          ? 'bg-white text-blue-700 border-white'
                          : 'bg-blue-800/40 text-white border-blue-300/50'
                      }`}
                    >
                      Product Image
                    </button>
                  </div>
                )}
              </div>

              {/* Live Preview: 5:5 비율, 왼쪽 = 상품 이미지, 오른쪽 = 시트 (비교 용이) */}
              <div
                className={`bg-gradient-to-br from-gray-50 to-white rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-2 sm:p-3 border-2 border-gray-200 shadow-inner overflow-hidden ${
                  isMobilePreview
                    ? mobilePreviewMode === 'sheet'
                      ? isMediumSheet
                        ? 'min-h-[330px]'
                        : 'min-h-[500px]'
                      : isMediumSheet
                        ? 'min-h-[360px]'
                        : 'min-h-[540px]'
                    : 'min-h-[620px] sm:min-h-0 sm:h-[440px] lg:h-[500px]'
                }`}
              >
                {displayProduct && (() => {
                  // 노트북/데스크탑에서는 상품 이미지가 시트 대비 너무 작아 보이지 않도록 축소를 최소화한다.
                  const PREVIEW_DISPLAY_WIDTH = isMobilePreview && isMediumSheet
                    ? Math.max(140, previewDisplayWidth - 54)
                    : previewDisplayWidth
                  const LEFT_PREVIEW_SCALE = isMobilePreview ? 0.96 : 1
                  const topOffsetPx = isMobilePreview ? 0 : 12
                  const maxSheetDisplayHeight = isMobilePreview
                    ? isMediumSheet
                      ? 210
                      : 280
                    : 360
                  const SHEET_SCALE = Math.min(
                    PREVIEW_DISPLAY_WIDTH / actualSheetWidthPx,
                    maxSheetDisplayHeight / actualSheetHeightPx
                  )
                  const fittedSheetWidth = actualSheetWidthPx * SHEET_SCALE
                  const fittedSheetHeight = actualSheetHeightPx * SHEET_SCALE
                  const leftPreviewWidth = fittedSheetWidth * LEFT_PREVIEW_SCALE
                  const leftPreviewHeight = fittedSheetHeight
                  const mobileImageScale = isMobilePreview ? (isMediumSheet ? 1 : 1.04) : 1
                  const textPreviewScale = isMobilePreview ? 1.15 : 1
                  // 학습: Large(2×8=16칸) 선택 시, 시트지 각 칸에 "라벨 1개"만 보여야 함.
                  // 상품 이미지는 시트 전체(라벨 6개, 2×3) 모양이라, 칸마다 전체를 넣으면 한 칸에 6개가 보임.
                  // Large일 때는 이미지를 2×3(6등분)으로 잘라 셀마다 1/6만 표시 → 칸당 라벨 1개.
                  const isLargeSize = isLargeSheet
                  // 학습: 시트지 크기는 동일(96×138). 특대 2×6, 대형 2×8, 중형 3×8, 소형 4×12, 원형 3×4 → 셀 크기만 다름.
                  // scale로 표시 너비 260px 고정. overflow-x-hidden으로 가로 스크롤 없음; 세로는 행 많을 때 overflow-y-auto.
                  return (
                  <>
                    {/* Left: 상품 이미지 — object-contain으로 박스에 맞는 최대 크기 표시(비율 유지, 잘림 없음) */}
                    <div
                      className={`min-w-0 flex flex-col items-center justify-center overflow-hidden border border-slate-200 rounded-lg bg-white/80 ${
                        isMobilePreview && mobilePreviewMode !== 'product' ? 'hidden' : ''
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-700 py-1.5 text-center truncate max-w-full px-2">
                        {displayProduct.name}
                      </p>
                      <p className="text-[10px] text-slate-500 -mt-1 pb-1.5 text-center px-2 leading-snug">
                        Character designs are randomly sequenced.
                      </p>
                      <div
                        style={{
                          width: fittedSheetWidth,
                          height: fittedSheetHeight + topOffsetPx,
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          paddingTop: topOffsetPx,
                        }}
                      >
                        <div
                          className="relative rounded-lg border-2 border-slate-300 shadow-lg overflow-hidden bg-gray-50 flex-shrink-0"
                          style={{ width: leftPreviewWidth, height: leftPreviewHeight }}
                        >
                          {resolvedProductImage ? (
                            <img
                              src={resolvedProductImage}
                              alt={displayProduct.name}
                              className={isMobilePreview ? 'w-full h-full object-contain object-top' : 'w-full h-full object-contain'}
                              style={isMobilePreview ? { transform: `scale(${mobileImageScale})`, transformOrigin: 'top center' } : undefined}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No image</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: 시트 (왼쪽과 동일한 표시 너비로 스케일) */}
                    <div
                      className={`min-w-0 flex flex-col items-center justify-start overflow-hidden border border-slate-200 rounded-lg bg-white/80 ${
                        isMobilePreview && mobilePreviewMode !== 'sheet' ? 'hidden' : ''
                      }`}
                    >
                      <p className="text-xs font-semibold text-slate-500 py-1.5">Sheet</p>
                      <div className="flex-shrink-0 flex flex-col items-center w-full gap-2 pt-2 pb-2 px-2">
                        <div
                          style={{
                            width: fittedSheetWidth,
                            height: fittedSheetHeight + topOffsetPx,
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            paddingTop: topOffsetPx,
                          }}
                        >
                          <div
                            style={{
                              transform: `scale(${SHEET_SCALE})`,
                              transformOrigin: 'top center'
                            }}
                          >
                            <div
                              className="bg-white rounded border-2 border-slate-300 shadow overflow-hidden box-border"
                              style={{
                                width: `${actualSheetWidthPx}px`,
                                height: `${actualSheetHeightPx}px`,
                                paddingLeft: `${paddingLeftPx}px`,
                                paddingRight: `${paddingRightPx}px`,
                                paddingTop: `${paddingTopPx}px`,
                                paddingBottom: `${paddingBottomPx}px`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch'
                              }}
                            >
                          <div
                            style={{
                              display: 'grid',
                              width: `${stickerSpec.cols * cellWidthPx + (stickerSpec.cols - 1) * gapPx}px`,
                              gridTemplateColumns: `repeat(${stickerSpec.cols}, ${cellWidthPx}px)`,
                              gridTemplateRows: `repeat(${stickerSpec.rows}, ${cellHeightDisplayPx}px)`,
                              gap: `${gapPx}px`,
                              boxSizing: 'border-box',
                              boxShadow: 'inset 2px 0 0 0 rgba(100,116,139,0.5), inset -2px 0 0 0 rgba(100,116,139,0.5)'
                            }}
                          >
                          {Array.from({ length: totalCells }, (_, index) => {
                            // One label per box using sheet image:
                            // - Treat the product image as a full sheet.
                            // - Divide it into stickerSpec.cols × stickerSpec.rows grid.
                            // - Each cell (box) shows exactly one grid slice = one label.
                            const isLargeSizeHere = isLargeSize
                            const isMediumSizeHere = isMediumSheet
                            const isExtraLargeSize = isExtraLargeSheet
                            const partCols = stickerSpec.cols
                            const partRows = stickerSpec.rows
                            const partIndex = index
                            const col = partIndex % partCols
                            const row = Math.floor(partIndex / partCols)
                            // Background-position uses 0%..100% for the whole image.
                            // With background-size scaled up (e.g. 200% for 2 cols),
                            // each slice aligns to col/row positions across that range.
                            const bgPosX = partCols <= 1 ? 0 : (col / (partCols - 1)) * 100
                            const bgPosY = partRows <= 1 ? 0 : (row / (partRows - 1)) * 100
                            // Text alignment: when sticker has an icon on the left, push text to the right.
                            const cellColIndex = index % stickerSpec.cols
                            let textStyle: any = undefined
                            if (stickerHasImage) {
                              let paddingLeft = '45%'
                              let paddingTop: string | undefined
                              if (isExtraLargeSize) {
                                // Extra Large: left column needs the biggest offset to clear the icon
                                paddingLeft = cellColIndex === 0 ? '70%' : '60%'
                                paddingTop = cellColIndex === 0 ? '12%' : '10%' // move text even further down
                              } else if (isLargeSizeHere) {
                                // Large 45×15mm: move text right and significantly below the icon (~15% further down)
                                paddingLeft = '65%'
                                paddingTop = '25%'
                              }
                              textStyle = {
                                paddingLeft,
                                ...(paddingTop ? { paddingTop } : {}),
                                justifyContent: 'flex-start' as const
                              }
                            }
                            return (
                            <div
                              key={index}
                              className="relative border-2 border-slate-400 rounded-md overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm"
                              style={{
                                width: cellWidthPx,
                                height: cellHeightDisplayPx,
                                minWidth: 0,
                                minHeight: 0,
                                boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.3)',
                                backgroundColor: '#ffffff'
                              }}
                            >
                              {/* Text overlay — shift text 10% to the right. 2-line: name line always larger. */}
                              <div
                                className="absolute inset-0 z-10 flex flex-col items-center justify-center p-[8%] box-border pointer-events-none"
                                style={{
                                  ...textStyle,
                                  // Double-line 모드에서는 중앙 정렬 유지, 1줄 모드에서는 약간 오른쪽으로 이동
                                  transform:
                                    supportsTwoLines && lineMode === 'two'
                                      ? 'translateX(0%)'
                                      : 'translateX(10%)'
                                }}
                              >
                                {customText.trim() ? (
                                  (() => {
                                    const lines = customText.split('\n').map(l => l.trim()).filter(Boolean)
                                    const twoLines = supportsTwoLines && lineMode === 'two' && lines.length >= 2
                                    if (twoLines) {
                                      const [line1, line2] = lines
                                      const isNameFirst = twoLineFormat === 'name-phone' // option 2: Name + Phone
                                      // Option 1: line1 = Affiliation, line2 = Name
                                      // Option 2: line1 = Name, line2 = Phone
                                      const nameLine = isNameFirst ? line1 : line2
                                      const baseNameSize = getSheetNameFontSize(nameLine.length)
                                      let nameSize = baseNameSize
                                      let otherSize: number

                                      if (twoLineFormat === 'affiliation-name') {
                                        // Affiliation + Name:
                                        // - 항상 Name이 Affiliation보다 눈에 띄게 크도록 보장
                                        // - Affiliation은 Name의 약 50%지만, 최소 2pt 이상 작게 유지
                                        let affSize = Math.round(nameSize * 0.5)
                                        // 너무 작아지지 않도록 하한/상한 조정
                                        affSize = Math.max(8, affSize)
                                        if (affSize >= nameSize - 2) {
                                          affSize = Math.max(8, nameSize - 2)
                                        }
                                        otherSize = affSize
                                      } else {
                                        // Name + Phone:
                                        // - Phone은 Name의 약 62% 크기로 표시
                                        let phoneSize = Math.round(nameSize * 0.62)
                                        phoneSize = Math.max(8, phoneSize)
                                        if (phoneSize >= nameSize - 1) {
                                          phoneSize = Math.max(8, nameSize - 1)
                                        }
                                        otherSize = phoneSize
                                      }

                                      const size1 = Math.round((isNameFirst ? nameSize : otherSize) * textPreviewScale)
                                      const size2 = Math.round((isNameFirst ? otherSize : nameSize) * textPreviewScale)
                                      return (
                                        <>
                                          <span
                                            className="text-center block w-full leading-tight"
                                            style={{
                                              fontFamily: getCurrentFont().fontFamily,
                          color: selectedColor,
                                              fontSize: size1,
                          fontWeight: 'bold',
                                              textShadow: '1px 1px 2px rgba(0,0,0,0.08)',
                                              whiteSpace: 'nowrap',
                                              maxWidth: '100%'
                                            }}
                                          >
                                            {line1}
                                          </span>
                                          <span
                                            className="text-center block w-full leading-tight mt-0.5"
                                            style={{
                                              fontFamily: getCurrentFont().fontFamily,
                                              color: selectedColor,
                                              fontSize: size2,
                                              fontWeight: 'bold',
                                              textShadow: '1px 1px 2px rgba(0,0,0,0.08)',
                                              whiteSpace: 'nowrap',
                                              maxWidth: '100%'
                                            }}
                                          >
                                            {line2}
                                          </span>
                                        </>
                                      )
                                    }
                                    return (
                                      <span
                                        className="text-center block w-full leading-tight"
                                        style={{
                                          fontFamily: getCurrentFont().fontFamily,
                                          color: selectedColor,
                                          fontSize: Math.round(
                                            getSheetNameFontSize(customText.trim().length) * textPreviewScale
                                          ),
                                          fontWeight: 'bold',
                                          textShadow: '1px 1px 2px rgba(0,0,0,0.08)',
                                          whiteSpace: 'nowrap',
                                          maxWidth: '100%'
                        }}
                      >
                        {customText}
                                      </span>
                                    )
                                  })()
                                ) : (
                                  <span className="text-slate-300 text-center" style={{ fontSize: 11 }}>
                                    {supportsTwoLines ? (twoLineFormat === 'name-phone' ? 'Name\nPhone' : 'Affiliation\nName') : 'Name'}
                                  </span>
                    )}
                  </div>
                            </div>
                            )
                          })}
                          </div>
                            </div>
                          </div>
                        </div>
                        {/* Intentionally removed: technical sheet/cell size line to avoid confusing customers. */}
                      </div>
                    </div>
                  </>
                  )
                })()}
                {!displayProduct && (
                  <div className="col-span-2 flex items-center justify-center text-gray-400">
                    <p>Select a product to see preview</p>
                  </div>
                )}
              </div>

              {/* HUD at Bottom (Game Style) */}
              <div className="mt-4 w-full">
                <div className="flex justify-between gap-2">
                  <div className="flex-1 bg-slate-800/90 rounded-lg p-2 border border-slate-600 flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Completion</span>
                    <span className="text-base font-semibold text-blue-400">
                      {designStats.completion}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-amber-400 min-h-[18px]">
                  {designStats.completion === 100
                    ? '✨ Design complete! Ready to add to cart'
                    : '💡 Complete your design to proceed'}
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${designStats.completion}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 bg-slate-800/90 rounded-lg p-2.5 border border-slate-600">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={orderQuantity <= 1}
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-semibold text-white tabular-nums">{orderQuantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={orderQuantity >= 999}
                      onClick={() => setOrderQuantity((q) => Math.min(999, q + 1))}
                      className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleAddToCartAndCheckout}
                    disabled={!displayProduct || isAddingToCart}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        <span>Checkout</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={!displayProduct}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-all border border-slate-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Package className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Control Sidebar (Game Sidebar Style) */}
            {!isSidebarCollapsed && (
              <aside className="w-full md:w-80 bg-slate-800/90 rounded-2xl p-4 border border-slate-700 shadow-2xl flex flex-col gap-3 relative">
                {/* Close Button */}
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 border-none rounded-full w-7 h-7 text-white cursor-pointer flex items-center justify-center z-10 transition-all shadow-lg hover:scale-110"
                  title="Close Sidebar"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Design Stats Section */}
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">📊 Design Stats</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Font</span>
                      <span className="text-sm font-semibold text-white">{getStickerFontLabel(selectedFont)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Color</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border border-slate-600"
                          style={{ backgroundColor: selectedColor }}
                        />
                        <span className="text-sm font-semibold text-white">{getColorName(selectedColor)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Price</span>
                      <span className="text-sm font-semibold text-green-400">${designStats.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Customization Controls */}
                <div className="space-y-3">
                  {/* Text Input: 2줄 옵션1 소속+이름, 옵션2 이름+전화번호 */}
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      <Type className="w-3.5 h-3.5 inline mr-1" />
                      Sticker Text
                      {supportsTwoLines && (
                        <span className="ml-2 text-blue-400 font-normal">
                          ( 2 lines: +$
                          {typeof (displayProduct as { twoLineSurcharge?: number })?.twoLineSurcharge === 'number'
                            ? (displayProduct as { twoLineSurcharge: number }).twoLineSurcharge
                            : DEFAULT_TWO_LINE_SURCHARGE}
                          {' '}surcharge)
                        </span>
                      )}
                    </label>
                    {supportsTwoLines && (
                      <div className="flex flex-wrap gap-3 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="lineMode"
                            checked={lineMode === 'single'}
                            onChange={() => {
                              // Single line로 전환 시, 현재 이름 줄을 단일 텍스트로 사용
                              setLineMode('single')
                              setCustomText(prev => {
                                const parts = prev.split('\n').map(p => p.trim()).filter(Boolean)
                                const namePart = parts[0] || twoLineName || 'Emily'
                                return namePart.replace(/\n/g, '').slice(0, NAME_MAX_LETTERS)
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Single line (default)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="lineMode"
                            checked={lineMode === 'two'}
                            onChange={() => {
                              // Double line으로 전환 시, 현재 텍스트를 2줄(Option 1/2)에 맞게 분리
                              setLineMode('two')
                              setCustomText(prev => {
                                const rawParts = prev.split('\n')
                                if (twoLineFormat === 'name-phone') {
                                  const namePart = (rawParts[0] || twoLineName || 'Emily').slice(0, 9)
                                  const phonePart = (rawParts[1] || twoLinePhone || '').slice(0, twoLinePhoneMaxChars)
                                  setTwoLineName(namePart)
                                  setTwoLinePhone(phonePart)
                                  return phonePart ? `${namePart}\n${phonePart}` : namePart
                                } else {
                                  // affiliation-name
                                  const affPart = (rawParts[0] || twoLineAffiliation || '').slice(0, 9)
                                  const namePart = (rawParts[1] || twoLineName || 'Emily').slice(0, 9)
                                  setTwoLineAffiliation(affPart)
                                  setTwoLineName(namePart)
                                  return affPart ? `${affPart}\n${namePart}` : namePart
                                }
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Double line</span>
                        </label>
                      </div>
                    )}
                    {supportsTwoLines && lineMode === 'two' && (
                      <div className="flex gap-3 mb-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="twoLineFormat"
                            checked={twoLineFormat === 'affiliation-name'}
                            onChange={() => {
                              setTwoLineFormat('affiliation-name')
                              // 현재 2줄 텍스트를 소속/이름으로 재구성
                              setCustomText(() => {
                                const affPart = twoLineAffiliation.slice(0, 9)
                                const namePart = twoLineName.slice(0, 9) || 'Emily'
                                return affPart ? `${affPart}\n${namePart}` : namePart
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Option 1: Affiliation + Name</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="twoLineFormat"
                            checked={twoLineFormat === 'name-phone'}
                            onChange={() => {
                              setTwoLineFormat('name-phone')
                              // 현재 2줄 텍스트를 이름/전화로 재구성
                              setCustomText(() => {
                                const namePart = twoLineName.slice(0, 9) || 'Emily'
                                const phonePart = twoLinePhone.slice(0, twoLinePhoneMaxChars)
                                return phonePart ? `${namePart}\n${phonePart}` : namePart
                              })
                            }}
                            className="rounded border-slate-500"
                          />
                          <span className="text-xs text-slate-300">Option 2: Name + Phone</span>
                        </label>
                      </div>
                    )}
                    {supportsTwoLines && lineMode === 'two' && twoLineFormat === 'affiliation-name' && (
                      // Option 1: Affiliation + Name — 소속/이름 입력을 분리해서 항상 이름을 더 크게 표시
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 1: Affiliation
                            </label>
                            <input
                              type="text"
                              value={twoLineAffiliation}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineAffiliation(v)
                                setCustomText(v + (twoLineName ? `\n${twoLineName}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Affiliation (up to 9 letters)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 2: Name
                            </label>
                            <input
                              type="text"
                              value={twoLineName}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineName(v)
                                setCustomText((twoLineAffiliation || '').slice(0, 9) + (v ? `\n${v}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Name (up to 9 letters)"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {supportsTwoLines && lineMode === 'two' && twoLineFormat === 'name-phone' && (
                      // Option 2: Name + Phone — 이름/전화 입력을 분리해서 항상 이름을 더 크게 표시
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 1: Name
                            </label>
                            <input
                              type="text"
                              value={twoLineName}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, 9)
                                setTwoLineName(v)
                                setCustomText(v + (twoLinePhone ? `\n${twoLinePhone}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Name (up to 9 letters)"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Line 2: Phone number
                            </label>
                            <input
                              type="text"
                              value={twoLinePhone}
                              onChange={(e) => {
                                const v = e.target.value.slice(0, twoLinePhoneMaxChars)
                                setTwoLinePhone(v)
                                setCustomText(twoLineName + (v ? `\n${v}` : ''))
                              }}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Phone (up to 10 characters)"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {(!supportsTwoLines || lineMode !== 'two') && (
                      // 기본 1줄 또는 Option 1: Affiliation + Name 에서는 기존 textarea 사용
                    <textarea
                      value={customText}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (supportsTwoLines && lineMode === 'two') {
                            const parts = raw.split('\n').slice(0, 2)
                            const limited = parts.map((line, index) =>
                              twoLineFormat === 'name-phone' && index === 1
                                ? line.slice(0, twoLinePhoneMaxChars)
                                : line.slice(0, 9)
                            )
                            setCustomText(limited.join('\n'))
                          } else {
                            setCustomText(raw.replace(/\n/g, '').slice(0, NAME_MAX_LETTERS))
                          }
                        }}
                        placeholder={supportsTwoLines && lineMode === 'two'
                          ? (twoLineFormat === 'name-phone'
                              ? 'Line 1: Name\nLine 2: Phone number'
                              : 'Line 1: Affiliation\nLine 2: Name')
                          : 'Enter your custom text...'}
                        maxLength={supportsTwoLines && lineMode === 'two'
                          ? (twoLineFormat === 'name-phone' ? twoLineNamePhoneMaxChars : twoLineMaxChars)
                          : NAME_MAX_LETTERS}
                        className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm min-h-0"
                        rows={2}
                      />
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">
                        {supportsTwoLines && lineMode === 'two'
                          ? (twoLineFormat === 'name-phone'
                              ? `2 lines available. Name: up to 9 letters, Phone: up to 10 characters (19 total). Name line always displays larger than the second line. Extra charge applies when 2 lines are used.`
                              : `2 lines available. Up to 9 letters per line (18 total). Name line always displays larger than the second line. Extra charge applies when 2 lines are used.`)
                          : `Up to ${NAME_MAX_LETTERS} letters (one line)`}
                      </p>
                      <p className="text-xs font-bold text-blue-400 italic bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                        ✓ Korean supported
                      </p>
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className="bg-blue-900/50 rounded-lg p-3 border border-blue-700/60">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Font Style
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      style={{ fontFamily: getCurrentFont().fontFamily }}
                    >
                      {stickerFonts.map((font) => (
                        <option key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                          {getStickerFontLabel(font.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Style Guide Accordion */}
                  <div className="bg-blue-900/50 rounded-lg border border-blue-700/60 overflow-hidden">
                    <button
                      onClick={() => setIsFontGuideOpen(!isFontGuideOpen)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-sm font-semibold text-slate-300 hover:bg-blue-800/50 transition-colors"
                    >
                      <span>Font Style Guide</span>
                      {isFontGuideOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isFontGuideOpen && (
                      <div className="px-3 pb-3 space-y-3 max-h-[400px] overflow-y-auto">
                        {[...fontGuideData].sort((a, b) => {
                          const aIndex = stickerFonts.findIndex(f => f.id === a.id)
                          const bIndex = stickerFonts.findIndex(f => f.id === b.id)
                          return aIndex - bIndex
                        }).map((guide) => {
                          const font = stickerFonts.find(f => f.id === guide.id)
                          if (!font) return null
                          
                          return (
                            <div
                              key={guide.id}
                              className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 space-y-2"
                            >
                              {/* Font Name */}
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-semibold text-slate-200">{guide.name}</h5>
                              </div>
                              
                              {/* Sample Text Preview */}
                              <div
                                className="text-lg font-bold text-slate-100 py-2 px-3 bg-slate-900/50 rounded border border-slate-600/50"
                                style={{ fontFamily: font.fontFamily }}
                              >
                                {'Hello / Selpic'}
                              </div>
                              
                              {/* Description */}
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Description:</span>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{guide.description}</p>
                              </div>
                              
                              {/* Recommended Use */}
                              <div>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recommended Use:</span>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed italic">{guide.recommendedUse}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Color Selection - Black only, compact and centered */}
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700 flex flex-col items-center">
                    <label className="text-xs font-semibold text-slate-400 mb-1.5">
                      <Palette className="w-3.5 h-3.5 inline mr-1 align-middle" />
                      Text Color
                    </label>
                    <div className="flex items-center justify-center gap-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-lg border-2 flex-shrink-0 transition-all ${
                            selectedColor === color 
                              ? 'border-blue-500 ring-2 ring-blue-300'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      <span className="text-sm text-slate-400">{getColorName(selectedColor)}</span>
                    </div>
                  </div>

                  {/* Custom sticker notice - to reduce complaints */}
                  <div className="bg-amber-500/10 rounded-lg px-3 py-2.5 border border-amber-500/30 max-h-[280px] overflow-y-auto">
                    <div className="flex gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
                      <div className="space-y-1.5 text-xs text-slate-300">
                        <p className="font-semibold text-amber-400/90">Please read before ordering</p>
                        <ul className="list-disc list-inside space-y-1.5 text-slate-400">
                          <li><span className="font-medium text-slate-300">Character limit:</span> One line is limited to {NAME_MAX_LETTERS} letters. Do not exceed this or your text may be cut off on the printed label.</li>
                          <li><span className="font-medium text-slate-300">Large, Extra Large &amp; Medium — 2 lines:</span> Option 1 (Affiliation + Name) allows up to 18 total characters. Option 2 (Name + Phone) allows up to 19 total characters, including up to 10 phone digits. The name line is displayed larger. An extra charge applies when using 2 lines (set in product registration).</li>
                          <li><span className="font-medium text-slate-300">Automatic text scaling:</span> Up to 6 letters use the default size; 7 or more letters are automatically scaled down so the text fits on one line. Longer text will appear smaller on the label.</li>
                          <li><span className="font-medium text-slate-300">Screen vs. Print:</span> Actual printed colors, font weight, and overall quality may vary slightly from your screen due to monitor settings and the printing process.</li>
                          <li><span className="font-medium text-slate-300">Holographic effect:</span> The shimmer and light reflection on hologram stickers may differ by lighting and cannot be perfectly shown in a digital preview.</li>
                          <li><span className="font-medium text-slate-300">Korean (한글):</span> If you want Korean text to display correctly in the preview and on your order, your computer must have Korean fonts installed. Without them, characters may not show properly.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}

        {/* SET product action buttons */}
        {displayProduct && displayProduct.subcategory === 'Set' && setItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
            <div className="flex items-center justify-center gap-3 mb-4 max-w-2xl mx-auto">
              <span className="text-sm text-gray-600 font-medium">Quantity</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={orderQuantity <= 1}
                  onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                  className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-semibold tabular-nums">{orderQuantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={orderQuantity >= 999}
                  onClick={() => setOrderQuantity((q) => Math.min(999, q + 1))}
                  className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
              <button
                onClick={handleAddToCartAndCheckout}
                disabled={!displayProduct || isAddingToCart}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Checkout</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleAddToCart}
                disabled={!displayProduct}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-5 h-5" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

